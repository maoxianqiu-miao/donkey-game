const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ['websocket'] });

app.use(express.static('public'));

const LIB = ["宇航员", "灭火器", "仙人掌", "留声机", "降落伞", "马桶刷", "金字塔", "回形针", "指南针", "萨克斯", "不倒翁", "潜水艇", "热气球", "三明治", "兵马俑", "直升机", "望远镜", "万花筒", "程序员", "爆米花", "缝纫机", "大理石", "吸尘器", "萤火虫", "过山车", "旋转木马", "独角兽", "信号灯", "储钱罐", "电吉他", "马戏团", "摄像机", "羽毛球", "保龄球", "碎纸机", "电风扇", "方向盘", "听诊器", "文件夹", "订书机", "橡皮泥", "溜冰鞋", "企鹅", "树懒", "章鱼", "变色龙", "火烈鸟", "北极熊", "巧克力", "冰激凌", "甜甜圈", "麻辣烫", "披萨", "长城", "迪斯尼", "好莱坞", "发财树", "捕梦网", "双节棍", "折叠扇", "无人机", "黑洞", "时光机", "任意门", "隐身斗篷", "激光剑", "南瓜车", "水晶鞋"];

let rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', (data) => {
        const room = data.room?.trim();
        const name = data.name?.trim();
        if (!room || !name) return;
        socket.join(room);
        socket.roomID = room;
        socket.userName = name;
        if (!rooms[room]) {
            rooms[room] = { players: [], storyPool: [], curRound: 0, curPlayerIdx: 0, settings: { n: 10, p: 5 }, gameStarted: false, results: [] };
        }
        const r = rooms[room];
        if (r.gameStarted) return socket.emit('errorMsg', '游戏已开始');
        const isOwner = r.players.length === 0;
        r.players.push({ id: socket.id, name, isOwner });
        socket.emit('initInfo', { isOwner });
        io.to(room).emit('updatePlayers', r.players);
    });

    socket.on('startGame', (config) => {
        const r = rooms[socket.roomID];
        if(!r) return;
        if(parseInt(config.n) < parseInt(config.p)) return socket.emit('errorMsg', '手牌数(n)不能小于轮数(p)！');
        r.gameStarted = true;
        r.settings = config;
        let deck = [...LIB].sort(() => Math.random() - 0.5);
        r.players.forEach(p => io.to(p.id).emit('receiveHand', { hand: deck.splice(0, parseInt(config.n)) }));
        io.to(socket.roomID).emit('gameStarted');
        syncTurn(socket.roomID);
    });

    socket.on('submitStory', (data) => {
        const r = rooms[socket.roomID];
        if(!r) return;
        r.storyPool.push({ word: data.word, text: data.text, player: socket.userName, id: socket.id });
        io.to(socket.roomID).emit('syncWall', { storyPool: r.storyPool });
        r.curPlayerIdx++;
        if (r.curPlayerIdx >= r.players.length) { r.curPlayerIdx = 0; r.curRound++; }
        
        if (r.curRound < parseInt(r.settings.p)) {
            syncTurn(socket.roomID);
        } else {
            // 每人随机分到 p 个提示词的逻辑
            let allWords = r.storyPool.map(s => s.word).sort(() => Math.random() - 0.5);
            const p = parseInt(r.settings.p);
            r.players.forEach((player, index) => {
                // 每个人分到数组中对应的 p 个词
                const hints = allWords.slice(index * p, (index + 1) * p);
                io.to(player.id).emit('startRecallPhase', { stories: r.storyPool, myHints: hints });
            });
        }
    });

    socket.on('protest', () => {
        const r = rooms[socket.roomID];
        if(!r || r.storyPool.length === 0) return;
        const last = r.storyPool.pop();
        r.curPlayerIdx--;
        if(r.curPlayerIdx < 0) { r.curPlayerIdx = r.players.length - 1; r.curRound--; }
        io.to(socket.roomID).emit('syncWall', { storyPool: r.storyPool });
        io.to(last.id).emit('timeRewind', { word: last.word, oldText: last.text });
        syncTurn(socket.roomID); 
    });

    socket.on('submitScore', (score) => {
        const r = rooms[socket.roomID];
        if(!r) return;
        r.results.push({ name: socket.userName, score });
        if(r.results.length === r.players.length) {
            const sorted = r.results.sort((a, b) => b.score - a.score);
            io.to(socket.roomID).emit('finalResults', { leaderboard: sorted, stories: r.storyPool });
            delete rooms[socket.roomID];
        }
    });
// 强制关闭房间逻辑
socket.on('forceQuit', () => {
    if (rooms[socket.roomID]) {
        io.to(socket.roomID).emit('roomClosed', `${socket.userName} 结束了游戏`);
        delete rooms[socket.roomID];
    }
});
    socket.on('disconnect', () => {
    });

    function syncTurn(id) {
        const r = rooms[id];
        if(!r) return; // 关键：加上这一句保护，防止房间不存在时报错
        const active = r.players[r.curPlayerIdx];
        if(active) io.to(id).emit('nextTurn', { activeID: active.id, activeName: active.name });
    }
}); // 确保这里有这个闭合的大括号

server.listen(process.env.PORT || 3000);