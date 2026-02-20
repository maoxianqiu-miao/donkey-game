const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ['websocket'] });

app.use(express.static('public'));

const LIB = require('./words.json');

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

let rooms = {};

io.on('connection', (socket) => {
  socket.on('joinRoom', (data) => {
        const room = data.room?.trim();
        const name = data.name?.trim();
        if (!room || !name) return;

        // 目标房间已存在的处理逻辑
        let r = rooms[room];
        if (r) {
            const existingPlayer = r.players.find(p => p.name === name);
            if (existingPlayer) {
                // 同名进入：无论原玩家是否在线，都强制顶号（在同房间内）
                const oldSocket = io.sockets.sockets.get(existingPlayer.id);
                if (oldSocket && oldSocket.id !== socket.id) {
                    oldSocket.emit('errorMsg', '您的账号在其他地方登录，您已被挤出房间喵~');
                    oldSocket.disconnect();
                }

                socket.join(room);
                socket.roomID = room;
                socket.userName = name;
                existingPlayer.id = socket.id;
                existingPlayer.offline = false;

                if (r.gameStarted) {
                    socket.emit('reconnectData', {
                        isOwner: existingPlayer.isOwner,
                        hand: existingPlayer.hand,
                        storyPool: r.storyPool,
                        activePlayer: r.players[r.curPlayerIdx]
                    });
                } else {
                    socket.emit('initInfo', { isOwner: existingPlayer.isOwner });
                }

                io.to(room).emit('updatePlayers', r.players);
                return;
            }

            // 房间正在游戏中且不是同名用户，拒绝加入
            if (r.gameStarted) {
                return socket.emit('errorMsg', '该房间的游戏已经开始，请耐心等待下一轮喵~');
            }

            // 房间未开始：允许作为新玩家加入（下面的普通加入逻辑）
        } else {
            // 房间不存在：直接创建新房间（不要跨房间搜索同名），然后作为房主加入
            rooms[room] = { players: [], storyPool: [], curRound: 0, curPlayerIdx: 0, settings: { n: 10, p: 5 }, gameStarted: false, results: [] };
            r = rooms[room];
        }

        // 普通加入逻辑（房主或房间内新玩家）
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
        let deck = [...LIB];
        shuffle(deck);
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
                let allWords = finalR.storyPool.map(s => s.word);
                shuffle(allWords);
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