# QQBot
 
QQ机器人V2.0 版本 接入Chat-GTP

好友对话可直接Chat-GTP回复

群里请@机器人Chat-GTP回复

关键字包含“画”可以让机器人自己画画

支持发当前电脑的截图！！

与他对话中含有表情包3个关键字他将会发出他收集的表情包

V2.0新加功能

## 配置文件说明

```js
{
    "qq": 3568512380, -- 你的机器人QQ号
    "authkey": "123456", -- webscoket通信验证码
    "url": "http://0.0.0.0:8080", --webscoket通信地址
    "openaikey": "xxxxxxxxxxxxxxxxxxx", --openAI的api密钥
    "record": true, -- 是否开启记录群聊
    "ground": [
        767274788     --机器人可以在群聊里接收别人的回复
    ],
    "blacklist": [], --好友黑名单
    "admin": [
        724119519,
        1050603098   -- 指定QQ为可以进行/admin指令的权限
    ],
    "root": 724119519,  --最高权限者可以添加管理员，注意这个不要写机器人的qq，用你们的大号作为最高权限者
    "recordlen": 10,  --群聊每多少条信息保存一下文件
    "showme" : true,  --是否允许查看机器人所在的电脑屏幕截取
    "serverurl" : "http://127.0.0.1:3000/" --服务器地址
}
```

## 管理员权限说明

让机器人在某个群里能够回复别人:  `/admin ground add 群号`

移除机器人在某个群里能够回复别人:`/admin ground remove 群号`

添加/移除好友黑名单，让机器人在私聊中不理/理他: 

`/admin blacklist add QQ号` 

`/admin blacklist remove QQ号`

开启/关闭群聊记录：

`/admin record start` 

`/admin record stop`

手动保存文件：

`/admin save config`  -- 保存配置文件

`/admin save answer`  -- 保存问答文件
 
`/admin save record`  -- 保存记录文件


添加问答功能优先ChatGTP回答，必须全匹配不是关键字匹配:

`/admin answer 问题描述 回答内容` （问题描述和回答内容中不要包含空格！！！）同样的问题描述可以覆盖上一次的内容

`/admin delanswer 问题描述` 删除问答

查看电脑文件目录:

`/admin path show 目录` 比如：`/admin path show E:\\QQBot\\img`

查看当前电脑截图:

`/admin showme`

查看机器人好友列表:

`/admin showlist friend`

查看机器人群列表:

`/admin showlist ground`

查看某个群的所有成员

`/admin showground members qq群号`

制作群成员所有信息：

`/admin make groundinfo qq群号`

保存群所有成员信息

`/admin save groundinfo qq群号`

查看所有群员信息（必须要执行了/admin make groundinfo qq群号）这个才能访问到群信息

`/admin showground memberinfo ,,,`

三个逗号代表条件限制

`名字包含关键字,性别包含关键字,年龄小于这个值,qq等级低于这个值`

如`/admin showground memberinfo ,女,25,` 代表是女生年龄小于25

## root权限

添加管理员:

`/root admin add qq号`

移除

`/root admin remove qq号`

修改配置文件属性

`/root config 配置文件属性名称 配置文件属性值`

比如:

`/root config qq N724119519`  -- 第一个字符中为N代表转换为整型数值

`/root config serverurl http://47.106.254.86` 

开启与关闭屏幕截图发送功能：

`/root showme start`

`/root showme stop`



