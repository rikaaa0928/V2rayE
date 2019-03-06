const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const MenuItem = electron.MenuItem;
const Menu = electron.Menu;
const Tray = electron.Tray;
const path = require('path');
const url = require('url');
const tools = require('./tools');
const parseConfigFile = tools.parseConfigFile;
const autoStart = tools.autoStart;
const saveToFile = tools.saveToFile;
const ipc = require('electron').ipcMain;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;
let tray = null;
let logWindow = null;
let isQuiting = false;

let logs = [];

app.on('before-quit', function () {
    isQuiting = true;
});

ipc.on("allLog", (event, arg) => {
    if (logWindow !== null) {
        logWindow.webContents.send('initLog', logs);
    }
});

ipc.on("vclog", (event, arg) => {
    if (logs.length >= 1000) {
        logs = logs.slice(100, logs.length);
    }
    logs.push(arg);
    if (logWindow === null) {
        return;
    }
    logWindow.webContents.send('newLog', arg);
});

/*let hPort = null;
let setProxy = new MenuItem({
    label: 'SetProxy: NA',
    click: function () {
        if (Number.isInteger(hPort) && mainWindow != null) {
            mainWindow.webContents.send('setProxy', hPort);
        }
    }
});*/

function createLogWindow() {
    logWindow = new BrowserWindow({
        width: 600,
        height: 600,
        transparent: false,
        frame: false,
        minWidth: 300
    });
    logWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'log.html'),
        protocol: 'file:',
        slashes: true
    }));
    //logWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    logWindow.on('closed', function () {
        logWindow = null;
    })
}

function createWindow() {
    tray = new Tray(path.join(__dirname, 'logo.ico'));

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        transparent: false,
        frame: false,
        minWidth: 400
    });

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    let EXE_LOC = process.execPath;
    if (process.env.PORTABLE_EXECUTABLE_FILE != undefined) {
        EXE_LOC = process.env.PORTABLE_EXECUTABLE_FILE;
    }

    let REAL_DIR = '';
    if (process.env.PORTABLE_EXECUTABLE_DIR == undefined) {
        REAL_DIR = __dirname;
    } else {
        REAL_DIR = process.env.PORTABLE_EXECUTABLE_DIR;
    }

    let guiConfigFilePath = path.join(REAL_DIR, 'guiConfig.json');
    let guiConfig = parseConfigFile(guiConfigFilePath);

    let checkBox = new MenuItem({
        label: 'AutoStart',
        type: 'checkbox',
        checked: false,
        click: () => {
            this.checked = !this.checked;
            autoStart(EXE_LOC, this.checked);
            guiConfig.startup = this.checked;
            saveToFile(guiConfigFilePath, JSON.stringify(guiConfig, null, '\t'));
            mainWindow.webContents.send('guiChange', "");
        }
    });

    if (guiConfig.startup) {
        checkBox.checked = true;
    }
    autoStart(EXE_LOC, checkBox.checked);

    const contextMenu = Menu.buildFromTemplate([{
            label: 'Show App',
            click: function () {
                mainWindow.show()
            }
        },
        //setProxy,
        {
            label: 'Log',
            click: function () {
                if (logWindow === null) {
                    createLogWindow();
                } else {
                    logWindow.show();
                }
            }
        },
        {
            label: 'Update/Install Core',
            click: function () {
                mainWindow.webContents.send('update', 'update');
            }
        },
        {
            label: 'DevTools',
            click: function () {
                mainWindow.webContents.openDevTools();
            }
        },
        checkBox,
        {
            label: 'Quit',
            click: function () {
                isQuiting = true
                app.quit()
            }
        }
    ]);
    tray.on('double-click', () => {
        mainWindow.show()
    });
    tray.setToolTip('V2ray Electron');
    tray.setContextMenu(contextMenu);

    mainWindow.on('resize', updateReply);
    mainWindow.on('move', updateReply);

    function updateReply() {

    }
    mainWindow.on('close', function (event) {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        if (!isQuiting) {
            event.preventDefault();
            mainWindow.hide();
            event.returnValue = false;
        }
    })
    // Open the DevTools.
    //mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    if (guiConfig.min) {
        mainWindow.hide();
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.