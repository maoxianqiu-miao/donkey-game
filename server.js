const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const LIB = ["宇航员", "灭火器", "仙人掌", "留声机", "降落伞", "马桶刷", "金字塔", "回形针", "指南针", "萨克斯", "不倒翁", "潜水艇", "热气球", "三明治", "兵马俑", "直升机", "望远镜", "万花筒", "程序员", "爆米花", "缝纫机", "大理石", "吸尘器", "萤火虫", "过山车", "旋转木马", "独角兽", "信号灯", "储钱罐", "电吉他", "马戏团", "摄像机", "羽毛球", "保龄球", "碎纸机", "电风扇", "方向盘", "听诊器", "文件夹", "订书机", "橡皮泥", "溜冰鞋", "企鹅", "树懒", "章鱼", "变色龙", "火烈鸟", "北极熊", "巧克力", "冰激凌", "甜甜圈", "麻辣烫", "披萨", "长城", "迪斯尼", "好莱坞", "发财树", "捕梦网", "双节棍", "折叠扇", "无人机", "黑洞", "时光机", "任意门", "隐身斗篷", "激光剑", "南瓜车", "水晶鞋"];

let rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', (data) => {
        const { room, name } = data;
        socket.join(room);
        socket.roomID = room;
        socket.userName = name;
        if (!rooms[room]) {
            rooms[room] = { players: [], storyPool: [], curRound: 0, curPlayerIdx: 0, settings: { n: 10, p: 5 } };
        }
        const isOwner = rooms[room].players.length === 0;
        rooms[room].players.push({ id: socket.id, name, isOwner });
        socket.emit('initInfo', { isOwner });
        io.to(room).emit('updatePlayers', rooms[room].players);
    });

    socket.on('startGame', (config) => {
        const room = socket.roomID;
        const r = rooms[room];
        if(!r) return;
        r.settings = config;
        r.storyPool = []; r.curRound = 0; r.curPlayerIdx = 0;
        let deck = [...LIB].sort(() => Math.random() - 0.5);
        r.players.forEach(p => {
            const hand = deck.splice(0, parseInt(config.n));
            io.to(p.id).emit('receiveHand', { hand });
        });
        io.to(room).emit('gameStarted');
        syncTurn(room);
    });

    socket.on('submitStory', (data) => {
        const room = socket.roomID;
        const r = rooms[room];
        if(!r) return;
        r.storyPool.push({ word: data.word, text: data.text, player: socket.userName, id: socket.id });
        io.to(room).emit('syncWall', { storyPool: r.storyPool });
        r.curPlayerIdx++;
        if (r.curPlayerIdx >= r.players.length) { r.curPlayerIdx = 0; r.curRound++; }

        if (r.curRound < parseInt(r.settings.p)) {
            syncTurn(room);
        } else {
            // 核心逻辑：互斥均分提示词
            let allWords = r.storyPool.map(s => s.word).sort(() => Math.random() - 0.5);
            const per = Math.floor(allWords.length / r.players.length);
            r.players.forEach((p, i) => {
                const start = i * per;
                const end = (i === r.players.length - 1) ? allWords.length : start + per;
                io.to(p.id).emit('startRecallPhase', { 
                    storyPool: r.storyPool, 
                    myHints: allWords.slice(start, end) 
                });
            });
        }
    });

    socket.on('protest', () => {
        const room = socket.roomID, r = rooms[room];
        if(!r || r.storyPool.length === 0) return;
        const last = r.storyPool.pop();
        r.curPlayerIdx--;
        if(r.curPlayerIdx < 0) { r.curPlayerIdx = r.players.length - 1; r.curRound--; }
        io.to(room).emit('syncWall', { storyPool: r.storyPool });
        io.to(last.id).emit('timeRewind', { word: last.word, oldText: last.text });
        syncTurn(room); 
    });

    function syncTurn(room) {
        const r = rooms[room];
        const active = r.players[r.curPlayerIdx];
        if(active) io.to(room).emit('nextTurn', { activeID: active.id, activeName: active.name });
    }
});

server.listen(3000, () => console.log("Server running on port 3000"));