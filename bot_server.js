const { Bot, Message, Middleware } = require('mirai-js');
const { writeFile } = require('fs');
const CONFIG = require('./config.json');
const { Configuration, OpenAIApi } = require("openai");
const axios = require('axios');
const { MESSAGE, isAtBot, isHaveImage, getGroudQQ, getSenderName, getSenderQQ, getMesage, isContainGroup, getImgae, downloadImg, readdir, getRandomFile, screenR, readJSON, getRandomArrayElements } = require('./tool')
const fs = require('fs');
const ANSWER = require('./data/answer.json')
const RECORD = require('./data/record.json')
const path = require('path');

const bot = new Bot();


// 连接到一个 mirai-api-http 服务
bot.open({
    baseUrl: CONFIG.url,
    verifyKey: CONFIG.authkey,
    // 要绑定的 qq，须确保该用户已在 mirai-console 登录
    qq: CONFIG.qq,
});


/**
 * 保存到配置文件
 * @param {*} data 
 */
function saveJsonToConfig(data) {
    return new Promise((res, rej) => {
        fs.writeFile('config.json', JSON.stringify(data), (err) => {
            if (err) {
                console.error(err);
                rej('写入失败! 请检查相关问题')
                return;
            }
            res("写入成功!")
        });
    })
}


function saveJsonFile(name, data) {
    return new Promise((res, rej) => {
        fs.writeFile(name, JSON.stringify(data), (err) => {
            if (err) {
                console.error(err);
                rej('写入失败! 请检查相关问题')
                return;
            }
            res("写入成功!")
        });
    })
}

/**
 * GTP接入
 * @param {*} msg 
 * @returns 
 */
function gtpTalk(msg) {
    console.log("GTP开始接入!")
    var configuration = new Configuration({
        apiKey: CONFIG.openaikey,
    });
    var openai = new OpenAIApi(configuration);
    return new Promise((res, rej) => {
        var completion = openai.createCompletion({
            model: "text-davinci-003",
            prompt: msg,
            temperature: 0,
            max_tokens: 2000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });
        completion.then(v => {
            console.log(v.data)
            res(dealStr(v.data.choices[0].text))
        }).catch(err => {
            console.log(err)
            rej(err)
        })
    })
}
/**
 * AI绘画
 * @param {*} msg 
 * @returns 
 */
function draw(msg) {
    return new Promise((res, rej) => {
        console.log("GTP开始接入!")
        const configuration = new Configuration({
            apiKey: CONFIG.openaikey,
        });
        const openai = new OpenAIApi(configuration);
        const response = openai.createImage({
            prompt: msg,
            n: 1,
            size: "256x256",
        });

        response.then(v => {
            console.log(v.data)
            res(v.data.data[0]['url'])
        }).catch(err => {
            console.log(err)
        })
    })
}

/**
 * ChatGtp消息处理
 * @param {*} str 
 * @returns 
 */
function dealStr(str) {
    index = 0
    for (let i = 0; i < str.length; i++) {
        if (str[i] == '\n') {
            index++;
            if (index == 2) {
                index = i + 1
                break;
            }
        }
    }
    return str.substr(index)
}

/**
 * 发送网络图片
 * @param {*} gid 群号
 * @param {*} imgurl 图片网络路径
 */
function sendImg(id, gid, imgurl) {
    //发送给好友
    if (!gid) {
        bot.sendMessage({
            friend: id,
            message: [
                { type: 'Image', url: imgurl },
            ],
        });
    }
    //发送到群组
    else {
        bot.sendMessage({
            // 群号
            group: gid,
            // 是 http server 接口所需的原始格式，若提供则优先使用
            message: [
                { type: 'Image', url: imgurl },
            ],
        });
    }

}
/**
 * 发送本地图片
 * @param {*} id 
 * @param {*} gid 
 * @param {*} imgurl 
 */
function sendLocalImg(id, gid, imgurl) {
    imgurl = imgurl.split("\\")[1]
    console.log(imgurl)
    //发送给好友
    if (!gid) {
        bot.sendMessage({
            friend: id,
            message: new Message().addImageId(imgurl)
        });
    }
    //发送到群组
    else {
        bot.sendMessage({
            // 群号
            group: gid,
            // 是 http server 接口所需的原始格式，若提供则优先使用
            message: new Message().addImageId(imgurl)
        });
    }
}

/**
 * 对话平台接入(停用)
 * @param {*} data 
 * @returns 
 */
function talk(data) {
    return new Promise((res, rej) => {
        axios.post('https://api.mlyai.com/reply', JSON.stringify(data),
            {
                headers: {  //头部参数
                    'Content-Type': 'application/json',
                    'Api-Key': '1cjkqm5i3h230w3f',
                    'Api-Secret': 'xxs8p9nx',
                }
            }
        )
            .then(function (response) { //请求成功
                console.log(response.data)
                res(response.data.data[0].content)
            })
            .catch(function (error) { //请求失败
                rej(error)
            });
    })

}



/**
 * 发送信息给OpenAI
 */
function sendOpenAI(content, id, gid) {
    if (content == '') {
        return;
    }
    gtpTalk(content).then(v => {
        sendToQQ(id, gid, v)
    }).catch(err => {
        sendToQQ(id, gid, '网络出错了')
    })
}

/**
 * 发送文本消息到QQ信息中
 */
function sendToQQ(id, gid, content) {
    //发送给好友
    if (!gid) {
        bot.sendMessage({
            friend: id,
            message: new Message().addText(content),
        });
    }
    //发送到群组
    else {
        bot.sendMessage({
            group: gid,
            message: new Message().addText(content),
        });
    }
}



// 监听好友消息事件
bot.on('FriendMessage', data => {
    content = data.messageChain[1].text
    key = content
    id = data.sender.id
    name = getSenderName(data)
    let groudId = null
    //console.log(data.messageChain)
    recordTalk(id,name,groudId,data.messageChain)

    if (CONFIG.blacklist.indexOf(id) > -1) {
        console.log("已过滤黑名单成员信息！")
    }
    else {
        if (isHaveImage(data.messageChain)) {
            let img = getImgae(data.messageChain)
            if (img) {
                downloadImg(img.imageId, img.url)
            }
            return;
        }
        if (ANSWER[key]) {
            sendToQQ(id, groudId, ANSWER[key])
        }
        else if (key[0] == '/') {
            let cmd = key.split(' ')
            if (cmd.length < 3) return;
            if (cmd[0] == '/root') {
                rootDeal(cmd[1], cmd[2], cmd[3], id, null)
            }
            else if (cmd[0] == '/admin') {
                adminDeal(cmd[1], cmd[2], cmd[3], id, null, key)
            }
            else {
                console.log("无效命令！")
            }
        }
        else {
            if (key.indexOf('画') > -1) {
                console.log("@me 要求绘画")
                draw(key).then(img => {
                    sendImg(id, groudId, img)
                })
            }
            else if (key.indexOf('表情包') > -1) {
                let img = getRandomFile("./img")
                console.log(img)
                sendLocalImg(id, groudId, img)
            }
            else {
                console.log("@me 要求回答")
                sendOpenAI(key, id, groudId)
            }
        }
    }



});

// 入群通知
bot.on('MemberJoinEvent', data => {
    let member = data.member
    bot.sendMessage({
        group: member.group.id,
        message: new Message().addText(`欢迎${member.memberName}加入本群！`)
    })
})

// 搓一搓
bot.on('NudgeEvent', member => {

})


//获取机器人好友列表
function getFriendList(length) {
    return new Promise((res, rej) => {
        bot.getFriendList().then(list => {
            let data = list
            console.log(data)
            data = getRandomArrayElements(data,data.length-length+1)
            let str = '==我的好友列表==\n'
            list.forEach(m => {
                str += `QQ:${m.id}\n名称:${m.name}\n=============\n`
            })
            res(str)
        }).catch(e => {
            rej(e)
        });
    })
}

//获取机器人群列表
function getGroupList(length) {
    return new Promise((res, rej) => {
        bot.getGroupList().then(v => {
            let data = v.data
            data = getRandomArrayElements(data,data.length-length+1)
            let str = '==我的群列表==\n';
            data.forEach(m => {
                str += `QQ群:${m.id}\n群名称:${m.name}\n=============\n`
            })
            res(str)
        }).catch(e => {
            rej(e)
        });
    })
}

const sf = {
    "OWNER": "群主",
    "ADMINISTRATOR": "管理员",
    "MEMBER": "成员"
}

/**
 * 获取群成员消息
 * @param {*} gid 
 */
async function getMemberList(gid) {
    const memberList = await bot.getMemberList({ group: gid });
    let str = '==群列表成员==\n';
    memberList.forEach(m => {
        str += `QQ:${m.id}\n名称:${m.name}\n身份:${sf[m.permission]}\n入群时间:${new Date(m.joinTimestamp * 1000)}\n=============\n`
    })
    return str
}
const sex = {
    'UNKNOWN': '未识别',
    'MALE': '男',
    'FEMALE': '女'
}


/**
 * 获取用户信息
 * @param {*} id 
 * @returns 
 */
async function getUserProfile(id) {
    const profile = await bot.getUserProfile({ qq: id });
    let str = `====QQ:${id}====\n`;
    str = `用户名:${profile.nickname}\n性别:${sex[profile.sex]}\n等级:${profile.level}\n邮箱:${profile.email}\n个性签名:${profile.sign}`
    return str;
}

var GROUNDMEMBERS = []
/**
 * 获取群聊所有信息
 * @param {*} id 
 */
async function getGroudAllMemberInfo(id) {
    const memberList = await bot.getMemberList({ group: id });
    GROUNDMEMBERS = memberList;
    memberList.forEach(m => {
        bot.getUserProfile({ qq: m.id }).then(v => {
            m.age = v.age
            m.level = v.level
            m.sex = sex[v.sex]
            m.sign = v.sign
        });
    })
}

/**
 * 保存记录的群聊信息
 * @param {*} id 
 */
function saveGroundInfo(id) {
    saveJsonFile('./data/' + id + ".json", GROUNDMEMBERS);
}

function getMemberData(id) {
    readJSON(String(id)).then(v => {
        GROUNDMEMBERS = v
        console.log('读取成功！')
    })
}

function getMemberBy(name, sex, age, level) {
    let data = GROUNDMEMBERS
    if (name) {
        data = data.filter(e => { return e.name.indexOf(name) > -1 })
    }
    if (sex) {
        data = data.filter(e => { return e.sex.indexOf(sex) > -1 })
    }
    if (age) {
        data = data.filter(e => { return e.age <= age })
    }
    if (level) {
        data = data.filter(e => { return e.level <= level })
    }
    return data
}

function formatDataOutput(data) {
    let str = `=====获取结果=====\n`;
    data.forEach(profile => {
        str += `QQ:${profile.id}\n用户名:${profile.name}\n性别:${profile.sex}\n年龄:${profile.age}\n等级:${profile.level}\n个性签名:${profile.sign}\n身份:${sf[profile.permission]}\n入群时间:${new Date(profile.joinTimestamp * 1000)}\n`
        str += "==========================\n"
    })
    return str
}

//记录聊天记录的次数
let count = 0;
function recordTalk(id,name,gid,messageChain) {
    //是否记录
    if (CONFIG.record) {
        count += 1
        let msg = {
            date: Math.floor(new Date().getTime() / 1000),
            content: getMesage(messageChain),
            gid : gid
        }
        if(isHaveImage(messageChain)){
            let img = getImgae(messageChain)
            msg.img = img
        }
        if (RECORD[id]) {
            if (!RECORD[id].name) {
                RECORD[id].name = name
            }
            RECORD[id].records.push(msg)
        }
        else {
            RECORD[id] = {
                name: name,
                records: [msg]
            }
        }
        if (count > CONFIG.recordlen) {
            count = 0
            saveJsonFile('./data/record.json', RECORD).then(v => {
                console.log(v)
            })
        }
    }
}

//
/**
 * 
 */
function getMemberTalkInfo(id,gid,date,length){
    if(RECORD[id]){
        let records = RECORD[id].records
        let msgs = []
        if(gid){
            msgs = records.filter(e => { return e.gid == gid })
        }
        if(date){
            msgs = records.filter(e => { return e.gid == gid })
        }
    }
}

//=========================================
// 监听群消息事件
bot.on('GroupMessage', data => {

    let id = getSenderQQ(data);
    let key = getMesage(data.messageChain);
    let groudId = getGroudQQ(data);
    let name = getSenderName(data);

    console.log(id, key, groudId);

    if (CONFIG.blacklist.indexOf(id) > -1) {
        console.log("已过滤黑名单成员信息！")
        return;
    }
    //记录聊天信息
    recordTalk(id,name,groudId,data.messageChain)


    if (isHaveImage(data.messageChain)) {
        let img = getImgae(data.messageChain)
        if (img) {
            downloadImg(img.imageId, img.url)
        }
        return;
    }

    //只回答root用户或者开放的QQ群组
    if (CONFIG.ground.indexOf(groudId) > -1 || CONFIG.root == id) {

        //@机器人
        if (isAtBot(data.messageChain)) {
            if (ANSWER[key]) {
                sendToQQ(id, groudId, ANSWER[key])
            }
            else {
                if (key.indexOf('画') > -1) {
                    console.log("@me 要求绘画")
                    draw(key).then(img => {
                        sendImg(id, groudId, img)
                    })
                }
                else if (key.indexOf('表情包') > -1) {
                    let img = getRandomFile("./img")
                    sendLocalImg(id, groudId, img)
                }
                else {
                    console.log("@me 要求回答")
                    sendOpenAI(key, id, groudId)
                }
            }
        }
        //命令操作
        else if (key[0] == '/') {
            let cmd = key.split(' ')
            if (cmd.length < 3) return;
            if (cmd[0] == '/root') {
                rootDeal(cmd[1], cmd[2], cmd[3], id, groudId)
            }
            else if (cmd[0] == '/admin') {
                adminDeal(cmd[1], cmd[2], cmd[3], id, groudId, key)
            }
            else {
                console.log("无效命令！")
            }
        }
        //配置的自定义回答
        else {
            if (ANSWER[key]) {
                sendToQQ(id, groudId, ANSWER[key]);
            }
        }
    }
    else {
        //.....
    }
});


//////////////////////////////////////////////////////////////////////////////////////
//配置管理

function adminDeal(key, option, data, id, gid, others) {
    if (CONFIG.admin.indexOf(id) == -1) {
        sendToQQ(id, gid, "你没有该命令使用权限！")
        return;
    }
    key = key.toLocaleLowerCase()
    option = option.toLocaleLowerCase()
    console.log(key, option, data, id, gid)
    if (key == 'ground' || key == 'blacklist') {
        data = Number(data)
        if (option == 'add') {
            if (CONFIG[key].indexOf(data) == -1) {
                CONFIG[key].push(data)
            }
        }
        else if (option == 'remove') {
            let index = CONFIG[key].indexOf(data)
            if (index > -1) {
                CONFIG[key].splice(index, 1)
            }

        }
        else {
            console.log('无效data!')
        }
    }
    else if (key == 'record') {
        if (option == 'start') {
            CONFIG[key] = true
        }
        else if (option == 'stop') {
            CONFIG[key] = false
        }
    }
    else if (key == 'show') {
        if (option == "answer") {
            sendToQQ(id, gid, JSON.stringify(ANSWER))
        }
        else if (option == "record") {
            sendToQQ(id, gid, JSON.stringify(RECORD))
        }
        else {
            sendToQQ(id, gid, JSON.stringify(CONFIG[option]))
        }

    }
    else if (key == "answer") {
        ANSWER[option] = data
    }
    else if (key == "delanswer") {
        delete ANSWER[option]
    }
    else if (key == "save") {
        if (option == "answer") {
            saveJsonFile('./data/answer.json', ANSWER).then(v => {
                sendToQQ(id, gid, '文件保存成功!')
            }).catch(e => {
                sendToQQ(id, gid, '文件保存失败!')
            })
        }
        else if (option == "config") {
            saveJsonToConfig(CONFIG).then(v => {
                sendToQQ(id, gid, '配置文件保存成功!')
            }).catch(e => {
                sendToQQ(id, gid, '配置文件保存失败!')
            })
        }
        else if (option == "groundinfo") {
            saveGroundInfo(Number(data))
        }
    }
    else if (key == "eval") {
        try {
            let code = others.split('/admin eval ')

            if (code.length > 1) {
                let e = eval(code[1])
                if (e != undefined) {
                    sendToQQ(id, gid, String(e))
                }

            }
        }
        catch (err) {
            sendToQQ(id, gid, String(err))
        }
    }
    else if (key == "path") {
        if (option == "show") {
            sendToQQ(id, gid, readdir(data))
        }
    }
    else if (key == "showme") {
        screenR().then(v => {
            sendImg(id, gid, CONFIG.serverurl + "screenshot.png")
        })
    }
    else if (key == "showlist") {
        if (option == "friend") {
            getFriendList(Number(data)).then(list => {
                sendToQQ(id, gid, list)
            })
        }
        else if (option == "ground") {
            getGroupList(Number(data)).then(list => {
                sendToQQ(id, gid, list)
            })
        }
    }
    else if (key == "showground") {
        if (option == "members") {
            getMemberList(Number(data)).then(msg => {
                sendToQQ(id, gid, msg)
            })
        }
        else if (option == "memberinfo") {
            let lt = data.split(',')
            let limit = Number(lt[0] || 0);
            let members = getMemberBy(lt[1], lt[2], lt[3], lt[4]);
            console.log(limit, members.length)
            if (limit) {
                sendToQQ(id, gid, formatDataOutput(getRandomArrayElements(members, members.length - limit + 1)))
            }
            else {
                sendToQQ(id, gid, formatDataOutput(members))
            }

        }

    }
    else if (key == "make") {
        if (option == "groundinfo") {
            getGroudAllMemberInfo(Number(data));
        }
    }

}


function rootDeal(key, option, data, id, gid) {
    key = key.toLocaleLowerCase()
    option = option.toLocaleLowerCase()
    if (id != CONFIG.root) {
        sendToQQ(id, gid, "你没有该命令使用权限！")
        return;
    }
    console.log(key, option, data, id, gid)
    if (key == 'admin') {
        data = Number(data)
        if (option == 'add') {
            if (CONFIG[key].indexOf(data) == -1) {
                CONFIG[key].push(data)
            }
        }
        else if (option == 'remove') {
            let e = CONFIG[key].splice(CONFIG.admin.indexOf(data), 1)
        }
        else {
            console.log('无效data!')
        }
    }
    else if (key == 'show') {
        sendToQQ(id, gid, JSON.stringify(CONFIG[option]))
    }
    else if (key == 'config') {
        if (data[0] == "N") {
            data = Number(data.substr(1))
        }
        CONFIG[option] = data
        sendToQQ(id, gid, CONFIG[option] + " " + typeof data)
    }
    else if (key == 'showme') {
        if (option == "start") {
            CONFIG.showme = true
        }
        else {
            CONFIG.showme = false
        }
        sendToQQ(id, gid, !CONFIG.showme ? '截图功能已关闭' : '截图功能已开启')
    }
}



