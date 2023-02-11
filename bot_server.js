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
            if (key.indexOf('画') == 0) {
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
            data.forEach(m => {
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
function getMemberTalkInfo(id,gid,startdate,enddate,length){
    if(RECORD[id]){
        let records = RECORD[id].records
        let msgs = [...records];
        if(gid!='null' && gid){
            msgs = msgs.filter(e => { return e.gid == gid })
        }
        else{
            msgs = msgs.filter(e => { return e.gid == null })
        }
        if(startdate){
            let d = new Date(startdate).getTime()
            msgs = msgs.filter(e => { return Number(e.date)*1000>d })
        }
        if(enddate){
            let d = new Date(enddate).getTime()
            msgs = msgs.filter(e => { return Number(e.date)*1000<d })
        }
        if(length){
            msgs = msgs.slice(0,length)
        }
        let str = `====${RECORD[id].name}的聊天记录====\n`
        let no = 1;
        msgs.forEach(e => {
            let time = new Date(Number(e.date)*1000);
            str+=`${no}.日期:${time.toLocaleDateString('zh-CN')} ${time.toLocaleTimeString()}\n`
            str+=`内容:${e.content}\n`
            str+=`图片:${e.img? e.img.url:'无'}\n`
            str+="----------------------\n"
            no++;
        });
        return str;
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
                if (key.indexOf('画')>=0&&key.indexOf('画')<=5) {
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
        else if (option == 'search') {
            let o = others.split('/admin record search ')[1]
            let dd = o.split(" ");
            sendToQQ(id, gid, getMemberTalkInfo(dd[0],dd[1],dd[2],dd[3],dd[4]))
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
    else if(key=='help'){
        if(option=="admin"){
            sendToQQ(id,gid,helpinfp);
        }
        else if(option=="cmd"){
            sendToQQ(id,gid,cmdHelp);
        }
    }
    else if(key=='console'){
        if(option=='input'){
            let cmdx = others.split('/admin console input ')
            bot.sendCommand({
                command: cmdx[1].split(" "),
            }).then(v=>{
                sendToQQ(id,gid,v.message);
            }).catch(e=>{
                sendToQQ(id,gid,e.message);
            });
            
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
    else if(key=='help'){
        if(option=="admin"){
            sendToQQ(id,gid,helpinfp);
        }
        else if(option=="cmd"){
            sendToQQ(id,gid,cmdHelp);
        }
    }


}





var helpinfp = `QQ智能机器人V2.0版本
## 管理员权限说明
让机器人在某个群里能够回复别人:    /admin ground add 群号
移除机器人在某个群里能够回复别人: /admin ground remove 群号
添加/移除好友黑名单，让机器人在私聊中不理/理他: 
/admin blacklist add QQ号
/admin blacklist remove QQ号
开启/关闭群聊记录：
/admin record start
/admin record stop
手动保存文件：
/admin save config  -- 保存配置文件
/admin save answer  -- 保存问答文件
/admin save record  -- 保存记录文件
添加问答功能优先ChatGTP回答，必须全匹配不是关键字匹配:
/admin answer 问题描述 回答内容 （问题描述和回答内容中不要包含空格！！！）同样的问题描述可以覆盖上一次的内容
/admin delanswer 问题描述 删除问答
查看电脑文件目录:
/admin path show 目录 
比如：/admin path show E:\\QQBot\\img
查看当前电脑截图:
/admin showme now
查看机器人好友列表:
/admin showlist friend N 显示N个机器人的QQ好友
查看机器人群列表:
/admin showlist ground N 显示N个机器人所加的群
查看某个群的所有成员
/admin showground members qq群号
制作群成员所有信息：
/admin make groundinfo qq群号
保存群所有成员信息
/admin save groundinfo qq群号
查看所有群员信息（必须要执行了/admin make groundinfo qq群号）这个才能访问到群信息
/admin showground memberinfo ,,,,
4个逗号代表条件限制
输出多少条数据, 名字包含关键字,性别包含关键字,年龄小于这个值,qq等级低于这个值
如 /admin showground memberinfo 5,女,25,, 代表是输出5条女生年龄小于25
注意如果数据过多会导致QQ发不出来，所以要限制输出个数建议不超过20个。
查询记录的好友QQ的聊天记录
/admin record search QQ号 群号 起始日期 不超过的日期 最大个数
比如:
/admin record search 55555 123456 2022/2/1 2022/2/9 5
表示查询qq群号为123456中的qq号为55555的聊天记录从2022/2/1~2022/2/9中取5条
若要查询QQ好友记录只需要把群号设置为null即可:
/admin record search 55555 null 2022/2/1 2022/2/9 5
执行JS脚本
/admin eval 你的js代码
查看帮助,admin指令相关信息
/admin help admin
查看帮助,miral控制台指令相关信息
/admin help cmd
向miral控制台发出指令（可以重新登录QQ）
/admin console input 指令（用空格分开）

## root权限
添加管理员:
/root admin add qq号
移除
/root admin remove qq号
修改配置文件属性
/root config 配置文件属性名称 配置文件属性值
比如:
/root config qq N724119519  -- 第一个字符中为N代表转换为整型数值
/root config serverurl http://127.0.0.1 
开启与关闭屏幕截图发送功能：
/root showme start
/root showme stop`


var cmdHelp = `
  /autoLogin add <account> <password> [passwordKind]    # 添加自动登录, passwordKind 可选 PLAIN 或 MD5
  /autoLogin clear    # 清除所有配置
  /autoLogin list    # 查看自动登录账号列表
  /autoLogin remove <account>    # 删除一个账号
  /autoLogin removeConfig <account> <configKey>    # 删除一个账号的一个配置项
  /autoLogin setConfig <account> <configKey> <value>    # 设置一个账号的一个配置项
  /help     # 查看指令帮助
  /login <qq> [password] [protocol]    # 登录一个账号
  /logout <qq>    # 登出一个账号 
  /permission cancel <被许可人 ID> <权限 ID>    # 撤销一个权限
  /permission deny <被许可人 ID> <权限 ID>    # 撤销一个权限
  /permission remove <被许可人 ID> <权限 ID>    # 撤销一个权限
  /permission cancelAll <被许可人 ID> <权限 ID>    # 撤销一个权限及其所有子权限
  /permission denyAll <被许可人 ID> <权限 ID>    # 撤销一个权限及其所有子权限
  /permission removeAll <被许可人 ID> <权限 ID>    # 撤销一个权限及其所有子权限
  /permission listPermissions    # 查看所有权限列表
  /permission lp    # 查看所有权限列表
  /permission permit <被许可人 ID> <权限 ID>    # 授权一个权限
  /permission grant <被许可人 ID> <权限 ID>    # 授权一个权限
  /permission add <被许可人 ID> <权限 ID>    # 授权一个权限
  /permission permittedPermissions <被许可人 ID> [显示全部]    # 查看被授权权限列表
  /permission pp <被许可人 ID> [显示全部]    # 查看被授权权限列表
  /permission grantedPermissions <被许可人 ID> [显示全部]    # 查看被授权权限列表
  /permission gp <被许可人 ID> [显示全部]    # 查看被授权权限列表
  /status     # 获取 Mirai Console 运行状态
  /stop     # 关闭 Mirai Console
  /mcl <MCL命令行参数>
  /mclx info <package>    # 获取包信息
  /mclx install <package> [channel] [type] [version] [lock or unlock]    # 安装包
  /mclx list    # 列出已安装的包
  /mclx remove <package>    # 移除包
  /mclx run <script>    # 执行模块load阶段
  /mclx update    # 执行updater模块`
