const $ = require("jquery");
const fs = require('fs');
const {
    remote
} = window.require('electron');
const path = require('path');
const parseConfigFile = require('./tools').parseConfigFile;
const parseValue = require('./tools').parseValue;
const saveToFile = require('./tools').saveToFile;
let configObject = {};
let currentPath = ['root'];
let PORTABLE_EXECUTABLE_DIR = '';
if (remote.process.env.PORTABLE_EXECUTABLE_DIR == undefined) {
    PORTABLE_EXECUTABLE_DIR = __dirname
} else {
    PORTABLE_EXECUTABLE_DIR = remote.process.env.PORTABLE_EXECUTABLE_DIR
}
let guiCOnfigFilePath = path.join(PORTABLE_EXECUTABLE_DIR, 'guiConfig.json');
let structFilePath = path.join(PORTABLE_EXECUTABLE_DIR, 'struct.json');
const defineObject = parseConfigFile(structFilePath);
let server_index = -1;
let fileName = '';

function init() {
    const get_paras = global.location.search.split('?')[1].split('=');
    if (get_paras[0] != 'x') {
        return;
    }
    server_index = get_paras[1];
    let guiConfig = parseConfigFile(guiCOnfigFilePath);
    if (server_index < 0 || server_index >= guiConfig.servers.length) {
        fileName = "new.json";
    } else {
        fileName = guiConfig.servers[server_index].file;
        configObject = parseConfigFile(path.join(PORTABLE_EXECUTABLE_DIR, fileName));
    }
    $("#filename").val(fileName);
    updatePageText();
    updatePagePath();
}

function saveFile() {
    if (server_index != -1 && fileName != $("#filename").val()) {
        fs.unlinkSync(path.join(PORTABLE_EXECUTABLE_DIR, fileName));
    }
    if (!saveToFile(path.join(PORTABLE_EXECUTABLE_DIR, $("#filename").val()), JSON.stringify(configObject, null, '\t'))) {
        return;
    }
    alert("saved!");
    fileName = $("#filename").val();
    let guiConfig = parseConfigFile(guiCOnfigFilePath);
    let i = server_index;
    if (server_index < 0 || server_index >= guiConfig.servers.length) {
        i = guiConfig.servers.length;
        guiConfig.servers.push({})
    }
    guiConfig.servers[i].file = fileName;
    guiConfig.servers[i].name = fileName.substring(0, fileName.lastIndexOf('.'));
    saveToFile(guiCOnfigFilePath, JSON.stringify(guiConfig, null, '\t'))
}

function getCurrentObject(jsonI) {
    let thisConfigOnject = jsonI;
    for (let i = 1; i < currentPath.length; i++) {
        thisConfigOnject = thisConfigOnject[currentPath[i]];
    }
    return thisConfigOnject;
}

function updatePageText() {
    $("#Textarea").val(JSON.stringify(configObject, null, '\t'));
}

function updatePagePath() {
    let htmlStr = '';
    let i = 0;
    for (; i < currentPath.length - 1; i++) {
        htmlStr += '<li class="breadcrumb-item"><a href="javascript:backPathTo(' + i + ')">' + currentPath[i] + '</a></li>';
    }
    htmlStr += '<li class="breadcrumb-item active" aria-current="page">' + currentPath[i] + '</li>';
    $('#path').html(htmlStr);
    let thisConfigObject = getCurrentObject(configObject);
    let thisStuctObject = {}
    try {
        thisStuctObject = getCurrentObject(defineObject.root);
    } catch {
        thisStuctObject = null
    }

    let currentKeys = Object.keys(thisConfigObject);
    //删除空值key
    for (let i = 0; i < currentKeys.length; i++) {
        if (thisConfigObject[currentKeys[i]] == null) {
            delete thisConfigObject[currentKeys[i]];
            updatePageText();
        }
    }
    currentKeys = Object.keys(thisConfigObject);
    if (thisStuctObject == null) {
        thisStuctObject = {};
    }
    let keys = Object.keys(thisStuctObject);

    $("#aKeys").html("");
    $("#cKeys").html("");
    for (let i = 0; i < currentKeys.length; i++) {
        appendCurrentKeys(currentKeys[i], thisConfigObject[currentKeys[i]])
    }
    for (let i = 0; i < keys.length; i++) {
        if (!currentKeys.includes(keys[i])) {
            switch (typeof thisStuctObject[keys[i]]) {
                case "object":
                    appendAvaliableKeys(keys[i], "object");
                    break;
                case "number":
                    appendAvaliableKeys(keys[i], "number");
                    break;
                case "boolean":
                    appendAvaliableKeys(keys[i], "boolean");
                    break;
                default:
                    appendAvaliableKeys(keys[i], thisStuctObject[keys[i]])
            }

        }
    }
    if (Array.isArray(thisConfigObject)) {
        appendCustom("list");
    } else {
        appendCustom("");
    }

}

function backPathTo(i) {
    currentPath = currentPath.slice(0, i + 1);
    updatePagePath();
}

function appendPath(keyName) {
    currentPath.push(keyName);
    updatePagePath();
}

function appendAvaliableKeys(keyName, valueType) {
    $("#aKeys").append('<div class="pointer" onclick="appendKey(\'' + keyName + '\',\'' + valueType + '\')">' + keyName + '</div>');
}

function appendCustom(value) {
    if (value == "list") {
        $("#aKeys").append('<button type="button" onclick="appendToList(\'object\')" class="pointer btn-sm btn-outline-primary">Add Object</button>');
        $("#aKeys").append('<button type="button" onclick="appendToList(\'string\')" class="pointer btn-sm btn-outline-primary">Add String</button>');
    } else {
        $("#aKeys").append('<div> <input type="text" id="cInput" onblur="customOnblur()" onfocus="customOnfocus();" class="form-control" aria-label="Small" aria-describedby="inputGroup-sizing-sm" value="custom value" />' + '</div>');
        $('#cInput').on('keyup', customKeyup);
    }
}

function appendToList(str) {
    let thisConfigObject = getCurrentObject(configObject);
    if (!Array.isArray(thisConfigObject)) {
        console.error("not list!");
        return;
    }
    switch (str) {
        case "string":
            thisConfigObject.push("");
            break;
        case "object":
            thisConfigObject.push({});
            break;
        default:
            console.error("type error!");
    }
    updatePageText();
    updatePagePath();
}

function appendCurrentKeys(keyName, value) {
    if (typeof value == 'object') {
        $("#cKeys").append('<div class="input-group input-group-sm pointer" onmousedown="deleteKey(event,\'' + keyName + '\')" onclick="appendPath(\'' + keyName + '\')"> \
        <div class="input-group-prepend"> \
            <span class="input-group-text">' + keyName + '</span> \
        </div> \
    </div>');
    } else {
        $("#cKeys").append('<div class="input-group input-group-sm"> \
        <div class="input-group-prepend" onmousedown="deleteKey(event,\'' + keyName + '\')"> \
            <span class="input-group-text">' + keyName + '</span> \
        </div> \
        <input type="text" id="' + keyName + '" onchange="editKeyValue(\'' + keyName + '\')" class="form-control" aria-label="Small" aria-describedby="inputGroup-sizing-sm" value="' + value + '" /> \
    </div>');
    }
}

function customKeyup(e) {
    if (e.which == 13 || e.keyCode == 13) {
        let istr = $('#cInput').val();
        if (istr.split(":").length != 2) {
            return
        }
        let kv = istr.split(":");
        appendKey(kv[0], parseValue(kv[1]));
        $('#cInput').val("");
    }
}

function deleteKey(event, keyName) {
    if (event.button != 2) {
        return;
    }
    let thisConfigObject = getCurrentObject(configObject);
    if (Array.isArray(thisConfigObject)) {
        var index = Number(keyName);
        if (index > -1) {
            thisConfigObject.splice(index, 1);
        }
    } else {
        delete thisConfigObject[keyName];
    }
    updatePagePath();
    updatePageText();
}

function appendKey(keyName, valueType) {
    let thisConfigObject = getCurrentObject(configObject);

    switch (valueType) {
        case "[]":
            thisConfigObject[keyName] = [];
            break;
        case "object":
        case "{}":
            thisConfigObject[keyName] = {};
            break;
        case "number":
            thisConfigObject[keyName] = 0;
            break;
        case "boolean":
            thisConfigObject[keyName] = "true|false";
            break;
        default:
            thisConfigObject[keyName] = valueType;
    }
    updatePagePath();
    updatePageText();
}

function customOnfocus() {
    if ($('#cInput').val() == "custom value") {
        $('#cInput').val("");
    }
}

function customOnblur() {
    if ($('#cInput').val().length == 0) {
        $('#cInput').val("custom value");
    }
}

function editKeyValue(keyName) {
    let thisConfigObject = getCurrentObject(configObject);
    thisConfigObject[keyName] = parseValue($('#' + keyName).val());
    updatePageText();
    updatePagePath();
}

function textAreaInput() {
    let textValue = $("#Textarea").val();
    let jsonObject = {}
    try {
        jsonObject = JSON.parse(textValue);
    } catch {
        return
    }
    configObject = jsonObject
    updatePageText();
    updatePagePath();
}

init();