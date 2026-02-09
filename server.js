const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const LIB = ["宇航员", "灭火器", "仙人掌", "留声机", "降落伞", "马桶刷", "金字塔", "回形针", "指南针", "萨克斯", "不倒翁", "潜水艇", "热气球", "三明治", "兵马俑", "直升机", "望远镜", "万花筒", "程序员", "爆米花", "缝纫机", "大理石", "吸尘器", "萤火虫", "过山车", "旋转木马", "独角兽", "信号灯", "储钱罐", "电吉他", "马戏团", "摄像机", "羽毛球", "保龄球", "碎纸机", "电风扇", "方向盘", "听诊器", "文件夹", "订书机", "橡皮泥", "溜冰鞋", "企鹅", "树懒", "章鱼", "变色龙", "火烈鸟", "北极熊", "巧克力", "冰激凌", "甜甜圈", "麻辣烫", "披萨", "长城", "迪斯尼", "好莱坞", "发财树", "捕梦网", "双节棍", "折叠扇", "无人机", "黑洞", "时光机", "任意门", "隐身斗篷", "激光剑", "南瓜车", "水晶鞋"];

// 存储所有房间的状态
let rooms = {}; 

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    socket.on('joinRoom', (data) => {
        const { nick, room } = data;
        socket.join(room);
        
        if (!rooms[room]) {
            rooms[room] = {
                players: [],
                storyPool: [],
                scores: [],
                config: {},
                isStarted: false
            };
        }

        const isHost = rooms[room].players.length === 0;
        const playerInfo = { id: socket.id, name: nick, isHost: isHost };
        rooms[room].players.push(playerInfo);

        // 告知客户端加入成功
        socket.emit('joined', { isHost, room });
        // 通知房间内所有人更新等待列表
        io.to(room).emit('updatePlayerList', rooms[room].players);
    });

    socket.on('startGame', (cfg) => {
        const roomName = Array.from(socket.rooms)[1]; 
        const room = rooms[roomName];
        if (!room) return;

        room.config = cfg;
        room.isStarted = true;
        room.storyPool = [];
        
        let deck = [...LIB].sort(() => Math.random() - 0.5);
        room.players.forEach(p => {
            io.to(p.id).emit('initHand', { hand: deck.splice(0, cfg.n) });
        });
        io.to(roomName).emit('nextTurn', { name: room.players[0].name, fullStory: [] });
    });

    socket.on('submitStory', (data) => {
        const roomName = Array.from(socket.rooms)[1];
        const room = rooms[roomName];
        room.storyPool.push({ player: data.myName, word: data.word, text: data.story });
        
        if (room.storyPool.length >= room.config.m * room.config.p) {
            let allUsedWords = room.storyPool.map(item => item.word).sort(() => Math.random() - 0.5);
            room.players.forEach((p, index) => {
                const myAidWords = allUsedWords.slice(index * room.config.p, (index + 1) * room.config.p);
                io.to(p.id).emit('startRecall', { storyPool: room.storyPool, aidWords: myAidWords });
            });
        } else {
            let pIds = room.players.map(p => p.id);
            let nextIdx = (pIds.indexOf(socket.id) + 1) % pIds.length;
            io.to(roomName).emit('nextTurn', { 
                name: room.players[nextIdx].name, 
                fullStory: room.storyPool 
            });
        }
    });

    socket.on('submitRecall', (data) => {
        const roomName = Array.from(socket.rooms)[1];
        const room = rooms[roomName];
        room.scores.push({ name: data.name, score: data.score });
        if (room.scores.length >= room.players.length) {
            io.to(roomName).emit('finalRank', { scores: room.scores, storyPool: room.storyPool });
        }
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(room => {
            if (rooms[room]) {
                rooms[room].players = rooms[room].players.filter(p => p.id !== socket.id);
                if (rooms[room].players.length === 0) {
                    delete rooms[room];
                } else {
                    io.to(room).emit('updatePlayerList', rooms[room].players);
                }
            }
        });
    });
});

http.listen(process.env.PORT || 3000, () => console.log('多房间版驴桥已启动'));