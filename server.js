const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// 驴桥词库
const LIB = ["宇航员", "灭火器", "仙人掌", "留声机", "降落伞", "马桶刷", "金字塔", "回形针", "指南针", "萨克斯", "不倒翁", "潜水艇", "热气球", "三明治", "兵马俑", "直升机", "望远镜", "万花筒", "程序员", "爆米花", "缝纫机", "大理石", "吸尘器", "萤火虫", "过山车", "旋转木马", "独角兽", "信号灯", "储钱罐", "电吉他", "马戏团", "摄像机", "羽毛球", "保龄球", "碎纸机", "电风扇", "方向盘", "听诊器", "文件夹", "订书机", "橡皮泥", "溜冰鞋", "企鹅", "树懒", "章鱼", "变色龙", "火烈鸟", "北极熊", "巧克力", "冰激凌", "甜甜圈", "麻辣烫", "披萨", "长城", "迪斯尼", "好莱坞", "发财树", "捕梦网", "双节棍", "折叠扇", "无人机", "黑洞", "时光机", "任意门", "隐身斗篷", "激光剑", "南瓜车", "水晶鞋"];

let players = {};
let storyPool = [];
let scores = [];
let gameConfig = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    socket.on('join', (name) => {
        players[socket.id] = { name: name, id: socket.id };
        console.log(`[玩家加入] ${name}`);
    });

    socket.on('startGame', (cfg) => {
        gameConfig = cfg;
        storyPool = [];
        scores = [];
        let pIds = Object.keys(players);
        let deck = [...LIB].sort(() => Math.random() - 0.5);
        pIds.forEach(id => {
            io.to(id).emit('initHand', { hand: deck.splice(0, gameConfig.n) });
        });
        // 初始第一轮，全景故事为空
        io.emit('nextTurn', { name: players[pIds[0]].name, fullStory: [] });
    });

    socket.on('submitStory', (data) => {
        storyPool.push({ player: players[socket.id].name, word: data.word, text: data.story });
        
        let pIds = Object.keys(players);
        if (storyPool.length >= gameConfig.m * gameConfig.p) {
            let allUsedWords = storyPool.map(item => item.word).sort(() => Math.random() - 0.5);
            pIds.forEach((id, index) => {
                const myAidWords = allUsedWords.slice(index * gameConfig.p, (index + 1) * gameConfig.p);
                io.to(id).emit('startRecall', { storyPool, aidWords: myAidWords });
            });
        } else {
            let nextIdx = (pIds.indexOf(socket.id) + 1) % pIds.length;
            // 核心修改：将至今为止的所有故事发送给下一位玩家
            io.emit('nextTurn', { 
                name: players[pIds[nextIdx]].name, 
                fullStory: storyPool 
            });
        }
    });

    socket.on('submitRecall', (data) => {
        scores.push({ name: players[socket.id].name, score: data.score });
        if (scores.length >= Object.keys(players).length) {
            io.emit('finalRank', { scores, storyPool });
        }
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            players = {}; storyPool = []; scores = []; gameConfig = {};
            io.emit('forceReset');
        }
    });
});

const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`驴桥服务器已启动：${port}`));