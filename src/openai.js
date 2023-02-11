const { Configuration, OpenAIApi } = require("openai");
const CONFIG = require('../config.json');

class ChatGTP{
    _configuration
    _openai
    _temperature
    _max_tokens
    _top_p
    _frequency_penalty
    _presence_penalty
    constructor(){
        this._configuration = new Configuration({
            apiKey: CONFIG.openaikey,
        });
        this._openai = new OpenAIApi(this._configuration);
        this._max_tokens = 2000
        this._frequency_penalty = 0
        this._presence_penalty = 0
        this._top_p = 1
        this._temperature = 0
    }
    talk(msg){
        console.log("Chat GTP接入中！")
        return new Promise((res, rej) => {
            var completion = this._openai.createCompletion({
                model: "text-davinci-003",
                prompt: msg,
                temperature: this._temperature,
                max_tokens: this._max_tokens,
                top_p: this._top_p,
                frequency_penalty: this._frequency_penalty,
                presence_penalty: this._presence_penalty,
            });
            completion.then(v => {
                res(this.dealStr(v.data.choices[0].text))
            }).catch(err => {
                rej(err)
            })
        })
    }
    dealStr(str) {
        let index = 0
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
}



module.exports = {ChatGTP}