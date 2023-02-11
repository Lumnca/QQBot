const { getRandomFile, readJSON } = require("./tool")

const fs = require('fs');

const dir = 'E:/rpgmaker/Example/js/'


function readFileList(path, filesList) {
    const files = fs.readdirSync(path);
    files.forEach((itm, index) => {
        const stat = fs.statSync(path + itm);
        if (stat.isDirectory()) {
            //递归读取文件
            readFileList(path + itm + "/", filesList)
        } else {
            let obj = {};//定义一个对象存放文件的路径和名字
            obj.path = path;//路径
            obj.filename = itm//名字
            obj.ext = itm.split('.').pop(),
            obj.size = stat.size;
            obj.download = false;
            filesList.push(obj);
        }
    })
}
var list = []
readFileList(dir,list)
console.log(list)
