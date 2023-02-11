const CONFIG = require('./config.json');
const { createOpenAPI, createWebsocket } = require('qq-guild-bot');
const { ChatGTP } = require("./src/openai");

const testConfig = {
    appID: '102038698', // 申请机器人时获取到的机器人 BotAppID
    token: 'V8p8yb3XA3PXhIHBoVs6AyBo1hgAsPfO', // 申请机器人时获取到的机器人 BotToken
    intents: [], // 事件订阅,用于开启可接收的消息类型
    sandbox: false, // 沙箱支持，可选，默认false. v2.7.0+
};

// 创建 client
const client = createOpenAPI(testConfig);

// 创建 websocket 连接
const ws = createWebsocket(testConfig);

// 创建 chatgtp
const chatGTP = new ChatGTP();

/**
 * 向频道发送消息
 * @param {*} channelID 
 * @param {*} content 
 */
function sendMessageToChannel(channelID,content) {
    client.messageApi
        .postMessage(channelID, {
            content: content,
        })
        .then(res => {
            // 数据存储在data中
            console.log(res.data);
        })
        .catch(err => {
            // err信息错误码请参考API文档错误码描述
            console.log(err);
        });
}

function sendImgToChannel(channelID,content) {
    client.messageApi
        .postMessage(channelID, {
            image : 'https://ibb.co/Gs0stYp'
              
        })
        .then(res => {
            // 数据存储在data中
            console.log(res.data);
        })
        .catch(err => {
            // err信息错误码请参考API文档错误码描述
            console.log(err);
        });
}

async function getMe() {
    let { data } = await client.meApi.me();
    return data;
}

//获取子频道列表，子频道用Channel描述
async function getChannels(guildId) {
    let { data } = await client.channelApi.channels(guildId);
    return data;
}

//获取频道下的成员列表。
async function guildMembers(guildId, queryParams) {
    let { data } = await client.guildApi.guildMembers(guildId, queryParams);
}
  
  

// 消息监听
ws.on('READY', (wsdata) => {
    console.log('[READY] 事件接收 :', wsdata);
});
ws.on('ERROR', (data) => {
    console.log('[ERROR] 事件接收 :', data);
});
ws.on('GUILDS', (data) => {
    console.log('[GUILDS] 事件接收 :', data);
});
ws.on('GUILD_MEMBERS', (data) => {
    console.log('[GUILD_MEMBERS] 事件接收 :', data);
    if(data.eventType=='GUILD_MEMBER_ADD'){
        sendMessageToChannel('106951106',`欢迎${data.msg.nick} 加入本频道，快来和大家打个招呼吧！`)
    }
});
//各个频道信息接收
ws.on('GUILD_MESSAGES', (data) => {
    console.log(data)
    if (data.msg.channel_id == '106951106') {
        let content = data.msg.content
        if(content){
            if(content.indexOf('@!')>-1){
                if(!content){
                    return
                }
                content = content.split('>')[1]
                chatGTP.talk(content).then(v=>{
                    sendMessageToChannel(data.msg.channel_id,v)
                })
            }
        }
       
    }
    
});
ws.on('GUILD_MESSAGE_REACTIONS', (data) => {
    console.log('[GUILD_MESSAGE_REACTIONS] 事件接收 :', data);
});
ws.on('DIRECT_MESSAGE', (data) => {
    console.log('[DIRECT_MESSAGE] 事件接收 :', data);
});
ws.on('INTERACTION', (data) => {
    console.log('[INTERACTION] 事件接收 :', data);
});
ws.on('MESSAGE_AUDIT', (data) => {
    console.log('[MESSAGE_AUDIT] 事件接收 :', data);
});
ws.on('FORUMS_EVENT', (data) => {
    console.log('[FORUMS_EVENT] 事件接收 :', data);
});
ws.on('AUDIO_ACTION', (data) => {
    console.log('[AUDIO_ACTION] 事件接收 :', data);
});
ws.on('PUBLIC_GUILD_MESSAGES', (data) => {
    console.log('[PUBLIC_GUILD_MESSAGES] 事件接收 :', data);
});

