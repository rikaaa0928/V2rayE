// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const $ = require("jquery");
const fs = require('fs');
const {
    remote
} = window.require('electron');
const request = require('request');
const BrowserWindow = require('electron').remote.BrowserWindow;
const tools = require('./tools');
const parseConfigFile = tools.parseConfigFile;
const saveToFile = tools.saveToFile;
const path = require('path');
let REAL_DIR = '';
if (remote.process.env.PORTABLE_EXECUTABLE_DIR == undefined) {
    REAL_DIR = __dirname;
} else {
    REAL_DIR = remote.process.env.PORTABLE_EXECUTABLE_DIR;
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

function init() {
    guiConfig = parseConfigFile(guiConfigFilePath);
    updateList();
}

init();
//alert(__dirname + "\n" + remote.process.env.PORTABLE_EXECUTABLE_DIR + "\n" + remote.app.getAppPath()+ "\n" + remote.app.getAppPath("exe"))
//console.log(remote.process.env.PORTABLE_EXECUTABLE_APP_FILENAME);
//console.log(remote.process.env.PORTABLE_EXECUTABLE_FILE);

function checkUpdate(downFunc) {
    tools.remoteVersion((rv, jData, options) => {
        tools.localF(path.join(REAL_DIR, "core", "v2ray.exe"), ['-version']).then((d) => {
            let v = d.match(/([0-9]+\.)+[0-9]+/)[0];
            if (v != rv && downFunc == undefined) {
                alert(`update available! ${v} to ${rv}`);
                return;
            }
            if (v == rv && downFunc != undefined) {
                alert(`no need to update!\n ${v} & ${rv}`);
                return;
            }
            if (downFunc == undefined) {
                return;
            }
            downFunc(jData, options);
        }, (e) => {
            if (downFunc == undefined) {
                alert(`core error: ${e}`);
                return;
            }
            downFunc(jData, options);
        });
    }, downFunc == undefined);
}

checkUpdate()

function unpackCore() {
    let list = runningProcess.slice();
    console.log(runningProcess);
    for (let i = 0; i < list.length; i++) {
        stopServer(list[i]);
    }
    let sTime = Date.now() / 1000;
    console.log(remote.process.env.ComSpec);
    setTimeout(() => {
        while (runningProcess.length > 0) {
            console.log(runningProcess.length, Date.now() / 1000 - sTime);
            if (Date.now() / 1000 - sTime > 5) {
                alert(`kill process time out! ${sTime} ${Date.now() / 1000 - sTime}`);
                return;
            }
        }
        tools.unzip(`"${guiConfig.unzip.exe}" ${guiConfig.unzip.arg}`, path.join(REAL_DIR, "core", "v2ray-windows-64.zip"), {
            "cwd": path.join(REAL_DIR, "core"),
            "shell": "C:\\Windows\\system32\\cmd.exe"
        }, () => {
            for (let i = 0; i < list.length; i++) {
                startServer(list[i]);
            }
        });
    }, 100);
}

ipc.on("update", (event, arg) => {
    /*unpackCore();
    return;*/
    checkUpdate((jData, options) => {
        let old_url = options.url;
        console.log(JSON.stringify(options));
        for (let i = 0; i < jData.assets.length; i++) {
            if (jData.assets[i].name == "v2ray-windows-64.zip") {
                options.url = jData.assets[i].browser_download_url;
                break;
            }
        }
        if (old_url == options.url) {
            alert("get download url error!");
        }
        request(options).on("error", (e) => {
            alert(`error download with ${JSON.stringify(options)}`);
        }).on("end", () => {
            unpackCore();
            console.log(runningProcess);
        }).pipe(fs.createWriteStream(path.join(REAL_DIR, "core", "v2ray-windows-64.zip")))
    });
});

ipc.on("guiChange", (event, arg) => {
    guiConfig = parseConfigFile(guiConfigFilePath);
});

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

if (guiConfig.auto != undefined && guiConfig.auto >= 0) {
    let i = guiConfig.auto;
    let fileName = guiConfig.servers[i].file;
    startServer(i);
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

function updateList() {
    //let ftr = $("tbody tr:first");
    tbody.html("");
    for (let i = 0; i < guiConfig.servers.length; i++) {
        tbody.append(tmp);
        let c = tbody.find("tr").last();
        c.find("th").eq(0)[0].innerText = i + 1;
        let tds = c.find("td");
        tds.eq(0)[0].innerText = guiConfig.servers[i].name;
        let conf = parseConfigFile(path.join(REAL_DIR, guiConfig.servers[i].file));
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
            if (childProcess[guiConfig.servers[i].file] == undefined) {
                startServer(i);
            } else {
                stopServer(i);
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

function startServer(i) {
    let fileName = guiConfig.servers[i].file;
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
        console.error(`stderr: ${data}`);
        ipc.send("vclog", `${fileName.substring(0, fileName.lastIndexOf('.'))} : ${data}`);
    });
    childProcess[fileName].on('error', (code) => {
        runningProcess.splice(runningProcess.indexOf(i)[0], 1);
        console.error(`child process ${i} exited with code ${code}; left ${runningProcess}`);
        $("#status" + i).html("Not Running");
        delete childProcess[fileName]
    });
    childProcess[fileName].on('close', (code) => {
        runningProcess.splice(runningProcess.indexOf(i)[0], 1);
        console.log(`child process ${i} exited with code ${code}; left ${runningProcess}`);
        $("#status" + i).html("Not Running");
        delete childProcess[fileName]
    });
    guiConfig.auto = i;
    saveToFile(guiConfigFilePath, JSON.stringify(guiConfig, null, '\t'));
}

function stopServer(i) {
    let fileName = guiConfig.servers[i].file;
    childProcess[fileName].kill();
}