const express = require('express');
const app = express();
const { Configuration, OpenAIApi } = require("openai");
const axios = require('axios');
const CONFIG = require('./config.json');


function gtpTalk(msg,temperature,top_p, frequency_penalty,presence_penalty) {
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
            res(v.data.choices[0].text)
        }).catch(err => {
            console.log(err)
            rej(err)
        })
    })
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE')
    res.header('Allow', 'GET, POST, PATCH, OPTIONS, PUT, DELETE')
    next();
});

app.use(express.static("./"))
app.use(express.json())

app.post('/chat', (req, res) => {
    if(req.body){
        if(req.body.msg){
            gtpTalk(req.body.msg).then(v=>{
                res.send(v);
            })
        }
        else{
            res.send('NO MESSAGE')
        }
    }
    else{
        res.send('ERROR')
    }
});

app.listen(3000, () => {
    console.log('示例应用正在监听 3000 端口 !');
});
