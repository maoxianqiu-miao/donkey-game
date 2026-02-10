const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ['websocket'] });

app.use(express.static('public'));

const LIB = ["宇航员", "灭火器", "仙人掌", "留声机", "降落伞", "马桶刷", "金字塔", "回形针", "指南针", "萨克斯", "不倒翁", "潜水艇", "热气球", "三明治", "兵马俑", "直升机", "望远镜", "万花筒", "程序员", "爆米花", "缝纫机", "大理石", "吸尘器", "萤火虫", "过山车", "旋转木马", "独角兽", "信号灯", "储钱罐", "电吉他", "马戏团", "摄像机", "羽毛球", "保龄球", "碎纸机", "电风扇", "方向盘", "听诊器", "文件夹", "订书机", "橡皮泥", "溜冰鞋", "企鹅", "树懒", "章鱼", "变色龙", "火烈鸟", "北极熊", "巧克力", "冰激凌", "甜甜圈", "麻辣烫", "披萨", "长城", "迪斯尼", "好莱坞", "发财树", "捕梦网", "双节棍", "折叠扇", "无人机", "黑洞", "时光机", "任意门", "隐身斗篷", "激光剑", "南瓜车", "水晶鞋","本月最佳员工", "不粘平底锅", "彩色回形针", "大号订书机", "无线充电宝", "防噪耳塞", "伸缩遮阳伞", "加厚洗脸巾", "薄荷味牙膏", "实木衣帽架", "陶瓷咖啡杯", "机械键盘", "多功能军刀", "全自动相机", "折叠平衡车", "感应垃圾桶", "挂脖小风扇", "真皮名片夹", "大功率电吹风", "手持吸尘器", "静音加湿器", "智能运动表", "带盖垃圾袋", "一次性拖鞋", "纯棉白衬衫", "格子野餐垫", "不锈钢吸管", "复古闹钟", "便携急救包", "磨砂玻璃杯", "软毛小牙刷", "透明胶粘带", "黑色签字笔", "激光翻页笔", "舒压指尖陀螺", "迷你投影仪", "发光钥匙扣", "双层保温杯", "运动速干衣", "防晒太阳镜", "无痕挂钩", "强力磁铁", "降噪耳机", "平板电脑", "无线鼠标", "护眼台灯", "立式落地灯", "布艺沙发", "记忆棉枕头", "羊毛地毯", "落地穿衣镜", "陶瓷花瓶", "仙人掌盆栽", "发财树", "多肉植物", "黄金蝴蝶兰", "喷水壶", "园艺剪刀", "塑料脸盆", "硅胶隔热垫", "竹制擀面杖", "陶瓷调味罐", "木质锅铲", "漏勺", "打蛋器", "计时器", "电子秤", "榨汁机", "微波炉", "空气炸锅", "电压力锅", "面包机", "咖啡研磨机", "热水壶", "洗碗机", "扫地机器人", "擦窗机", "空气净化器", "加温足浴盆", "体脂秤", "电动牙刷", "冲牙器", "剃须刀", "脱毛仪", "卷发棒", "按摩椅", "颈椎按摩器", "眼部按摩仪", "跑步机", "动感单车", "哑铃", "瑜伽垫", "跳绳", "羽毛球拍", "乒乓球桌", "篮球", "足球", "排球", "游泳圈", "潜水镜", "滑雪板", "登山杖", "露营帐篷", "睡袋", "指南针", "望远镜", "大容量背包", "行李箱", "护照夹", "登机牌", "酒店房卡", "旋转木马", "摩天轮", "过山车", "电影票根", "爆米花桶", "冰淇淋球", "夹心巧克力", "波板糖", "棉花糖", "薯片礼包", "苏打饼干", "威化饼", "蛋黄派", "红富士苹果", "黄肉猕猴桃", "金枕头榴莲", "无籽西瓜", "巨峰葡萄", "砂糖橘", "水蜜桃", "夏威夷果", "开心果", "碧根果", "腰果", "大杏仁", "核桃仁", "蔓越莓干", "蓝莓果酱", "纯牛奶", "酸奶酪", "冰咖啡", "珍珠奶茶", "柠檬汽水", "矿泉水", "红茶包", "茉莉花茶", "白砂糖", "食盐", "橄榄油", "香油", "陈醋", "生抽", "老抽", "辣椒酱", "番茄酱", "沙拉酱", "方便面", "火腿肠", "午餐肉罐头", "咸鸭蛋", "皮蛋", "八宝粥", "速冻水饺", "汤圆", "包子", "馒头", "花卷", "烧卖", "春卷", "油条", "豆浆", "豆腐脑", "茶叶蛋", "三明治", "热狗", "汉堡包", "萨拉米披萨", "炸薯条", "炸鸡腿", "牛排", "意大利面", "寿司卷", "刺身", "拉面", "火锅底料", "毛肚", "虾滑", "黄喉", "午餐肉", "肥牛卷", "金针菇", "香菇", "生菜", "西兰花", "西红柿", "土豆泥", "洋葱圈", "青椒", "茄子", "胡萝卜", "南瓜", "冬瓜", "苦瓜", "丝瓜", "山药", "玉米棒", "红薯", "芋头", "大蒜", "生姜", "大葱", "香菜", "薄荷叶", "薰衣草", "玫瑰花瓣", "郁金香", "向日葵", "蒲公英", "康乃馨", "百合花", "雏菊", "满天星", "绿萝", "吊兰", "虎皮兰", "龟背竹", "枫叶", "银杏叶", "松果", "橡木子", "贝壳", "海螺", "鹅卵石", "细沙", "浪花", "彩虹", "闪电", "流星", "白云", "夕阳", "晨曦", "满月", "月牙", "北斗星", "太阳穴", "酒窝", "双眼皮", "长睫毛", "高鼻梁", "小虎牙", "马尾辫", "大波浪卷", "寸头", "胡须刀", "领带结", "袖扣", "皮带扣", "蝴蝶结", "发卡", "项链", "耳环", "戒指", "手镯", "脚链", "手表带", "婚纱", "旗袍", "西装革履", "牛仔裤", "卫衣", "连衣裙", "风衣", "羽绒服", "围巾", "手套", "雷锋帽", "棒球帽", "贝雷帽", "草帽", "帆布鞋", "高跟鞋", "运动鞋", "皮鞋", "马丁靴", "人字拖", "雨鞋", "袜子", "雨衣", "雨伞把", "手摇扇", "折扇", "充电线", "转接头", "内存卡", "优盘", "移动硬盘", "路由器", "交换机", "显示器", "投影幕布", "白板笔", "黑板擦", "粉笔盒", "调色盘", "画笔", "油画棒", "水彩纸", "宣纸", "墨汁", "镇纸", "砚台", "毛笔", "印章", "红泥", "剪纸", "中国结", "风筝", "陀螺", "溜溜球", "积木", "拼图", "魔方", "不倒翁", "拨浪鼓", "口琴", "笛子", "小提琴", "吉他", "钢琴键", "架子鼓", "萨克斯", "手风琴", "录音笔", "随身听", "收音机", "电视机", "电唱机", "磁带", "光盘", "胶卷", "相册", "明信片", "信封", "邮票", "纪念币", "奖杯", "奖牌", "证书", "锦旗", "指南针", "地图册", "地球仪", "放大镜", "显微镜", "望远镜", "试管", "烧杯", "天平", "量筒", "酒精灯", "温度计", "血压计", "听诊器", "注射器", "药棉", "纱布", "口罩", "医用手套", "担架", "救护车", "消防车", "警车", "洒水车", "公交车", "出租车", "私家车", "摩托车", "自行车", "电动车", "滑板", "旱冰鞋", "直升机", "喷气式飞机", "热气球", "降落伞", "帆船", "潜水艇", "航空母舰", "宇宙飞船", "卫星", "火箭", "机器人", "无人机", "红绿灯", "斑马线", "停车位", "加油站", "收费站", "桥梁", "隧道", "摩天大楼", "旋转门", "电梯", "扶梯", "安全出口", "消防栓", "灭火器", "垃圾桶", "长椅", "喷泉", "雕塑", "路灯", "邮筒", "电话亭", "报刊亭", "便利店", "超市购物车", "收银台", "自动贩卖机", "储物柜", "试衣间", "更衣室", "游泳池", "电影院", "图书馆", "博物馆", "美术馆", "体育馆", "游乐场", "动物园", "植物园", "公园", "沙滩", "码头", "车站", "机场", "旅馆", "餐厅", "咖啡馆", "酒吧", "书店", "药店", "理发店", "花店", "蛋糕店", "洗衣店", "照相馆", "修理铺", "加油站", "洗车店", "停车场", "建筑工地", "塔吊", "挖掘机", "推土机", "装载机", "压路机", "混凝土车", "脚手架", "安全帽", "工作服", "反光背心", "工具箱", "扳手", "螺丝刀", "老虎钳", "卷尺", "电钻", "电锯", "焊机", "油漆刷", "滚筒刷", "砂纸", "梯子", "麻绳", "铁链", "挂锁", "钥匙", "门铃", "猫眼", "门把手", "窗户闩", "防盗网", "窗帘杆", "百叶窗", "纱窗", "墙纸", "瓷砖", "地板砖", "天花板", "吊灯", "开关面板", "插座", "电线", "水管", "暖气片", "空调挂机", "油烟机", "燃气灶", "热水器", "洗手盆", "马桶盖", "淋浴头", "浴缸", "毛巾架", "肥皂盒", "牙刷缸", "梳妆台", "大衣柜", "书架", "电脑桌", "老板椅", "茶几", "餐桌", "圆凳", "沙发垫", "靠枕", "床单", "被罩", "枕套", "毛毯", "凉席", "蚊帐", "捕蚊灯", "电蚊拍", "苍蝇拍", "蟑螂药", "老鼠夹", "消毒液", "洗洁精", "洗衣粉", "柔顺剂", "漂白水", "洁厕灵", "玻璃水", "抛光蜡", "空气清新剂", "樟脑丸", "干燥剂", "打火机", "火柴盒", "烟灰缸", "香烟", "雪茄", "烟斗", "指甲油", "卸甲水", "口红", "粉底液", "睫毛膏", "眼影盘", "腮红", "香水瓶", "防晒霜", "面霜", "精华液", "面膜", "洗面奶", "沐浴露", "洗发水", "护发素", "发胶", "发蜡", "梳子", "镜子", "剪指甲刀", "挖耳勺", "牙签", "棉签", "湿纸巾", "面巾纸", "卫生纸", "吸油纸", "吸管", "保鲜袋", "铝箔纸"];

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

    function syncTurn(id) {
        const r = rooms[id];
        if(!r) return;
        const active = r.players[r.curPlayerIdx];
        if(active) io.to(id).emit('nextTurn', { activeID: active.id, activeName: active.name });
    }
});

server.listen(process.env.PORT || 3000);