// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const $ = require("jquery");
const BrowserWindow = require('electron').remote.BrowserWindow;
const parseConfigFile = require('./tools').parseConfigFile;
const path = require('path');
let guiConfig = {};

function configWindow(action) {
    const modalPath = path.join('file://', __dirname, 'config.html?x=' + action);
    let win = new BrowserWindow({
        frame: true
    });
    win.on('close', function () {
        win = null
    });
    win.loadURL(modalPath);
    win.show()
}

$("#addB").on('click', function () {
    configWindow(-1)
});

function init() {
    //let err, data = fs.readFileSync('guiConfig.json', 'utf8');
    //if (err) throw err;
    //console.log(data);
    //guiConfig = JSON.parse(data);
    guiConfig = parseConfigFile('guiConfig.json')
    //console.log(obj.servers);
    updateList(guiConfig)
}

init();

function updateList(obj) {
    let t = $("tbody");
    let ftr = $("tbody tr:first");
    let tmp = Object.assign({}, ftr);
    t.html("");
    for (let i = 0; i < obj.servers.length; i++) {
        t.append(tmp);
        let c = t.find("tr").last();
        console.log(c.html());
        c.find("th").eq(0)[0].innerText = i + 1;
        let tds = c.find("td");
        tds.eq(0)[0].innerText = obj.servers[i].name;
        let conf = parseConfigFile(obj.servers[i].file);
        console.log(conf.inbound.listen + ":" + conf.inbound.port);
        //console.log(tds.eq(1));
        tds.eq(1)[0].innerText = conf.inbound.listen + ":" + conf.inbound.port;
        //console.log(tds.eq(2)[0]);
        $(tds.eq(3)[0]).find("button:first").on("click", function () {
            configWindow(i)
        });
        //console.log(tds.eq(3));
        $(tds.eq(4)[0]).find("button:first").on("click", function () {

        })
    }
}

/*function parseConfigFile(name) {
    let err, data = fs.readFileSync(name, 'utf8');
    if (err) throw err;
    //console.log(data);
    //console.log(obj.outbound);
    return JSON.parse(data)
}*/