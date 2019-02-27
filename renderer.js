// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const $ = require("jquery");
const fs = require('fs');
const {
    remote
} = window.require('electron');
const BrowserWindow = require('electron').remote.BrowserWindow;
const parseConfigFile = require('./tools').parseConfigFile;
const saveToFile = require('./tools').saveToFile;
const path = require('path');
let REAL_DIR = '';
if (remote.process.env.PORTABLE_EXECUTABLE_DIR == undefined) {
    REAL_DIR = __dirname
} else {
    REAL_DIR = remote.process.env.PORTABLE_EXECUTABLE_DIR
}
let guiConfigFilePath = path.join(REAL_DIR, 'guiConfig.json');
let guiConfig = null;
const tbody = $("tbody");
let runningProcess = [];
const tmp = tbody.html();
const {
    spawn
} = require('child_process');
const ipc = require('electron').ipcRenderer;
let childProcess = {};
let penddinDelete = [];

//alert(__dirname + "\n" + remote.process.env.PORTABLE_EXECUTABLE_DIR + "\n" + remote.app.getAppPath()+ "\n" + remote.app.getAppPath("exe"))

function configWindow(action) {
    const modalPath = path.join('file://', __dirname, 'config.html?x=' + action);
    let win = new BrowserWindow({
        frame: false
    });
    win.on('close', function () {
        win = null;
        init();
    });
    win.loadURL(modalPath);
    win.show();
    //win.webContents.openDevTools()
}

$("#addB").on('click', function () {
    configWindow(-1);
});

$("body").on("click", function () {
    while (penddinDelete.length >= 1) {
        let id = penddinDelete.pop();
        $(id).html("Delete");
    }
});

function init() {
    guiConfig = parseConfigFile(guiConfigFilePath);
    updateList(guiConfig);
}

init();

if (guiConfig.auto != undefined && guiConfig.auto >= 0) {
    let i = guiConfig.auto;
    let fileName = guiConfig.servers[i].file;
    startServer(fileName, i);
}

function getPorts(conf) {
    if (conf.inbound != undefined) {
        return conf.inbound.listen + ":" + conf.inbound.port;
    } else if (conf.inbounds != undefined) {
        let str = "";
        for (let i = 0; i < conf.inbounds.length; i++) {
            switch (conf.inbounds[i].protocol) {
                case "http":
                    str += "H:" + conf.inbounds[i].port + ";";
                    break;
                case "socks":
                    str += "S:" + conf.inbounds[i].port + ";";
                    break;
                default:
                    str += "?:" + conf.inbounds[i].port + ";";
            }
        }
        if (str.length > 0) {
            str = str.substring(0, str.length - 1);
        }
        if (str.length <= 0) {
            str = "undefined";
        }
        return str;
    }
    return "undefined";
}

function updateList(obj) {
    //let ftr = $("tbody tr:first");
    tbody.html("");
    for (let i = 0; i < obj.servers.length; i++) {
        tbody.append(tmp);
        let c = tbody.find("tr").last();
        c.find("th").eq(0)[0].innerText = i + 1;
        let tds = c.find("td");
        tds.eq(0)[0].innerText = obj.servers[i].name;
        let conf = parseConfigFile(path.join(REAL_DIR, obj.servers[i].file));
        try {
            tds.eq(1)[0].innerText = getPorts(conf);
        } catch {
            tds.eq(1)[0].innerText = "undefined";
        }
        $(tds.eq(1)[0]).attr("id", "server" + i);
        $(tds.eq(2)[0]).attr("id", "status" + i);
        if (runningProcess.includes(i)) {
            $("#status" + i).html("Running");
        }
        $(tds.eq(2)[0]).on("click", function () {
            if (childProcess[obj.servers[i].file] == undefined) {
                startServer(obj.servers[i].file, i);
            } else {
                stopServer(obj.servers[i].file);
            }
        });
        $(tds.eq(3)[0]).find("button:first").on("click", function () {
            configWindow(i);
        });
        $(tds.eq(4)[0]).find("button:first").attr("id", "delete" + i);
        $(tds.eq(4)[0]).find("button:first").on("click", function (e) {
            e.stopPropagation();
            if ($("#delete" + i).html() != "Really?") {
                penddinDelete.push("#delete" + i);
                $("#delete" + i).html("Really?");
            } else {
                deleteConfig(i);
            }
        });
    }
}

function deleteConfig(i) {
    fs.unlinkSync(path.join(REAL_DIR, guiConfig.servers[i].file));
    guiConfig.servers.splice(i, 1);
    saveToFile(guiConfigFilePath, JSON.stringify(guiConfig, null, '\t'));
    init();
}

function startServer(fileName, i) {
    let exePath = path.join(REAL_DIR, 'core/v2ray');
    let confPath = path.join(REAL_DIR, fileName);
    $("#status" + i).html("Running");
    runningProcess.push(i);
    childProcess[fileName] = spawn(exePath, ['-config', confPath]);
    childProcess[fileName].stdout.on('data', (data) => {
        //console.log(`stdout: ${data}`);
        ipc.send("vclog", `${fileName.substring(0, fileName.lastIndexOf('.'))} : ${data}`);
    });

    childProcess[fileName].stderr.on('data', (data) => {
        //console.log(`stderr: ${data}`);
        ipc.send("vclog", `${fileName.substring(0, fileName.lastIndexOf('.'))} : ${data}`);
    });

    childProcess[fileName].on('close', (code) => {
        runningProcess.splice(runningProcess.indexOf(i)[0], 1);
        console.log(`child process exited with code ${code}`);
        $("#status" + i).html("Not Running");
        delete childProcess[fileName]
    });
    guiConfig.auto = i;
    saveToFile(guiConfigFilePath, JSON.stringify(guiConfig, null, '\t'));
}

function stopServer(fileName) {
    childProcess[fileName].kill();
}