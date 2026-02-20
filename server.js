const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ['websocket'] });

app.use(express.static('public'));

const LIB = require('./words.json');

let rooms = {};

io.on('connection', (socket) => {
  socket.on('joinRoom', (data) => {
        const room = data.room?.trim();
        const name = data.name?.trim();
        if (!room || !name) return;

        if (!rooms[room]) {
            rooms[room] = { players: [], storyPool: [], curRound: 0, curPlayerIdx: 0, settings: { n: 10, p: 5 }, gameStarted: false, results: [] };
        }
        const r = rooms[room];

        // --- 同名强制顶号逻辑 ---
        const existingPlayer = r.players.find(p => p.name === name);

        if (existingPlayer) {
            // 1. 尝试寻找旧的连接并将其踢出
            const oldSocket = io.sockets.sockets.get(existingPlayer.id);
            if (oldSocket && oldSocket.id !== socket.id) {
                // 给旧客户端发个信，告诉它被挤掉了（可选）
                oldSocket.emit('errorMsg', '您的账号在其他地方登录，您已被挤出房间喵~');
                oldSocket.disconnect(); // 强制断开旧连接
            }

            // 2. 将新的 Socket 绑定到原有的玩家对象上
            socket.join(room);
            socket.roomID = room;
            socket.userName = name;
            existingPlayer.id = socket.id; // 更新 ID 为当前最新的
            existingPlayer.offline = false; // 标记为在线

            // 3. 根据游戏状态同步数据
            if (r.gameStarted) {
                // 如果游戏已经开始了，把“现场”发给重连的用户
                socket.emit('reconnectData', {
                    isOwner: existingPlayer.isOwner,
                    hand: existingPlayer.hand,
                    storyPool: r.storyPool,
                    activePlayer: r.players[r.curPlayerIdx]
                });
            } else {
                // 如果游戏还没开始，只是回到房间等待界面
                socket.emit('initInfo', { isOwner: existingPlayer.isOwner });
            }

            // 通知全屋人，名单更新了（状态从离线变回在线）
            io.to(room).emit('updatePlayers', r.players);
            return; // 处理完毕，跳出函数
        }

        // --- 以下是新玩家（从未加入过房间）的逻辑 ---
        if (r.gameStarted) {
            return socket.emit('errorMsg', '该房间的游戏已经开始，请耐心等待下一轮喵~');
        }

        // 普通加入逻辑
        socket.join(room);
        socket.roomID = room;
        socket.userName = name;
        const isOwner = r.players.length === 0;
        r.players.push({ id: socket.id, name, isOwner, offline: false, hand: [] });
        socket.emit('initInfo', { isOwner });
        io.to(room).emit('updatePlayers', r.players);
    });

    socket.on('startGame', (config) => {
        const r = rooms[socket.roomID];
        if(!r) return;
        r.gameStarted = true;
        r.settings = config;
        let deck = [...LIB].sort(() => Math.random() - 0.5);
        r.players.forEach(p => {
            p.hand = deck.splice(0, parseInt(config.n)); // 关键：存入手牌
            p.offline = false;
            io.to(p.id).emit('receiveHand', { hand: p.hand });
        });
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
            // 关键逻辑：所有人写完后，开启10秒复习模式
            io.to(socket.roomID).emit('startReviewTimer', 10);
            setTimeout(() => {
                const finalR = rooms[socket.roomID];
                if(!finalR) return;
                let allWords = finalR.storyPool.map(s => s.word).sort(() => Math.random() - 0.5);
                const p = parseInt(finalR.settings.p);
                finalR.players.forEach((player, index) => {
                    const hints = allWords.slice(index * p, (index + 1) * p);
                    io.to(player.id).emit('startRecallPhase', { stories: finalR.storyPool, myHints: hints });
                });
            }, 10000);
        }
    });

    socket.on('protest', () => {
        const r = rooms[socket.roomID];
        if(!r || r.storyPool.length === 0) return;
        const last = r.storyPool.pop(); // 撤回最后一个故事
        
        // 逻辑回滚
        r.curPlayerIdx--;
        if(r.curPlayerIdx < 0) {
            r.curPlayerIdx = r.players.length - 1;
            r.curRound--;
        }
        
        io.to(socket.roomID).emit('syncWall', { storyPool: r.storyPool });
        // 通知全员回溯，特别是让被抗议的人拿回那个词
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

    socket.on('forceQuit', () => {
        if (rooms[socket.roomID]) {
            io.to(socket.roomID).emit('roomClosed', `${socket.userName} 结束了游戏`);
            delete rooms[socket.roomID];
        }
    });
    socket.on('disconnect', () => {
        const r = rooms[socket.roomID];
        if (r) {
            const p = r.players.find(player => player.id === socket.id);
            if (p) {
                p.offline = true; // 标记离线
                io.to(socket.roomID).emit('updatePlayers', r.players); // 更新列表显示离线状态
            }
        }
    });

    function syncTurn(id) {
        const r = rooms[id];
        if(!r) return;
        const active = r.players[r.curPlayerIdx];
        if(active) io.to(id).emit('nextTurn', { activeID: active.id, activeName: active.name });
    }
});

server.listen(process.env.PORT || 3000);