const ipc = require('electron').ipcRenderer;
const $ = require("jquery");

ipc.send('allLog', "all");

ipc.on('initLog', (event, arg) => {
    if (!Array.isArray(arg)) {
        appendInitLog(arg);
        return
    }
    for (let i = 0; i < arg.length; i++) {
        appendInitLog(arg[i]);
    }
    let card = $(".card")[0];
    card.scrollTop = card.scrollHeight - card.clientHeight;
});

ipc.on('newLog', (event, arg) => {
    appendLog(arg);
});

$(".card-body").html("");

function appendInitLog(log) {
    let h = $(".card-body").html();
    let card = $(".card")[0];
    $(".card-body").html(h + `<p>${log}</p>`);
}

function appendLog(log) {
    let h = $(".card-body").html();
    let card = $(".card")[0];
    let b = card.clientHeight + card.scrollTop >= card.scrollHeight - 2;
    $(".card-body").html(h + `<p>${log}</p>`);
    if (b) {
        card.scrollTop = card.scrollHeight - card.clientHeight;
    }
}