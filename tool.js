

const CONFIG = require('./config.json');
const request = require('request');
const fs = require('fs');
const path = require('path');

var random = function (array) {
    return array[Math.floor(Math.random() * array.length)];
}

const isHaveImage = function (messageChain) {
    for (let i = 0; i < messageChain.length; i++) {
        const msg = messageChain[i];
        if (msg.type == 'Image' || msg.type.toLocaleLowerCase() == 'image') {
            return true;
        }
    }
    return false;
}

const isAtBot = function (messageChain) {
    for (let i = 0; i < messageChain.length; i++) {
        const msg = messageChain[i];
        if ((msg.type == 'At' || msg.type.toLocaleLowerCase() == 'at') && msg.target.toString() == CONFIG.qq) {
            return true;
        }
    }
    return false;
}

const getMesage = function (messageChain) {
    for (let i = 0; i < messageChain.length; i++) {
        const msg = messageChain[i];
        if (msg.type == 'Plain' || msg.type.toLocaleLowerCase() == 'plain') {
            return msg.text;
        }
    }
    return '';
}

const getImgae = function(messageChain){
    for (let i = 0; i < messageChain.length; i++) {
        const msg = messageChain[i];
        if (msg.type == 'Image' || msg.type.toLocaleLowerCase() == 'image') {
            return msg;
        }
    }
    return null;
}

const getSenderName = function (data) {
    return data.sender.memberName
}

const getSenderQQ = function (data) {
    return data.sender.id
}

const getGroudQQ = function (data) {
    return data.sender.group.id
}


// 获取文件夹下的所有文件
var getFiles = function (dir) {
    return fs.readdirSync(dir).reduce((files, file) => {
        const name = path.join(dir, file);
        const isDirectory = fs.statSync(name).isDirectory();
        return isDirectory ? [...files, ...getFiles(name)] : [...files, name];
    }, []);
}

// 随机获取一个文件
var getRandomFile = function (dir) {
    const files = getFiles(dir);
    const randomIndex = Math.floor(Math.random() * files.length);
    return files[randomIndex];
}

var downloadImg = function (name, url) {
    // 使用request模块的get方法来获取图片
    request.get(url)
        // 设置编码
        .on('response', (response) => {
            response.setEncoding('binary');
        })
        // 将图片写入文件
        .on('data', (chunk) => {
            fs.appendFileSync("./img/"+name, chunk, 'binary');
        })
        // 打印信息
        .on('end', () => {
            console.log('Image downloaded!');
        });
}



var readdir = function(path){
    let files = fs.readdirSync(path);
    let fileInfo = [];
    
    files.forEach(file => {
      let stats = fs.statSync(`${path}/${file}`);
      fileInfo.push({
        name: file,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime
      });
    });
    let str = path + ' 文件目录显示 '
    fileInfo.forEach(file=>{
        str +="\n==================\n"
        str += `文件名:${file.name}\n文件类型:${file.type=='file'?'文件':'文件夹'}\n文件类型大小:${file.type=='file'?Math.ceil(file.size/1000)+'KB':'--'}\n创建时间:${file.created.toString()}`
    })

    return str;
}

var screenshot = require('desktop-screenshot');

var screenR = function(){
    return new Promise((res,rej)=>{
        screenshot("screenshot.png", function(error, complete) {
            if(error){
                rej(error)
                console.log("Screenshot failed", error);
            }
            else
                console.log("Screenshot secuess!")
                res(complete)
        });
    })
}

var readJSON = async function(name){
    var json = await require('./data/'+name+'.json')
    return json;
}






module.exports = { random, isHaveImage, getGroudQQ, getMesage, getSenderName, isAtBot, isHaveImage, getSenderQQ,downloadImg,getImgae, readdir, getRandomFile,screenR,readJSON}