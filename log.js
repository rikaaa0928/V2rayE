const ipc = require('electron').ipcRenderer;
const $ = require("jquery");

ipc.send('allLog', "all");

ipc.on('initLog', (event, arg) => {
    if (!Array.isArray(arg)) {
        appendLog(arg);
        return
    }
    for (let i = 0; i < arg.length; i++) {
        appendLog(arg[i]);
    }
});

ipc.on('newLog', (event, arg) => {
    appendLog(arg);
});

$(".card-body").html("");

function appendLog(log) {
    let h = $(".card-body").html();
    $(".card-body").html(h + `<p>${log}</p>`);
}