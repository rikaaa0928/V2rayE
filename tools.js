const fs = require('fs');
const request = require('request');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const AutoLaunch = require('auto-launch');
const path = require('path');
const Winreg = require('winreg');

function local(string, list) {
    return new Promise((yes, no) => {
        try {
            let child = spawn(string, list);
            child.stdout.on("data", function (data) {
                // console.log(data.toString('utf8'));
                yes(data.toString('utf8'));
            });
            child.stderr.on("data", function (data) {
                console.error(data.toString('utf8'));
                no(data.toString('utf8'));
            });
            child.on("error", function (data) {
                console.error(data.toString('utf8'));
                no(data.toString('utf8'));
            });
            child.stdin.end(); //end input
        } catch (e) {
            no(e);
        }
    });
}

module.exports = {
    parseConfigFile: function (name) {
        let err, data = fs.readFileSync(name, 'utf8');
        if (err) throw err;
        return JSON.parse(data);
    },
    parseValue: function (data) {
        if (data == "" || data == " ") {
            return "";
        }
        if (data.charAt(0) == "\"" && data.charAt(data.length - 1) == "\"") {
            return String(data.slice(1, data.length - 1))
        }
        if (data == "true") {
            return true;
        } else if (data == "false") {
            return false;
        }
        let n = Number(data);
        if (!isNaN(n)) {
            return n;
        }
        return String(data)
    },
    saveToFile: function (file, data) {
        try {
            fs.writeFileSync(file, data);
            return true;
        } catch {
            return false;
        }
    },
    localProxy: function () {
        return local("powershell",
            ["-Command",
                "(Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings').proxyServer"
            ]);
    },
    setProxy: function (item, str) {
        let regKey = new Winreg({
            hive: Winreg.HKCU, // open registry hive HKEY_CURRENT_USER
            key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
        });
        if (str == undefined || str.length <= 0) {
            console.log("disable");
            regKey.set("ProxyEnable", Winreg.REG_DWORD, 0, (e) => {
                if (e != undefined) {
                    item.label = e;
                    return
                }
                item.checked = false;
                item.label = 'Set System Proxy';
            });
            return;
        }
        console.log("enable");
        regKey.set("ProxyEnable", Winreg.REG_DWORD, 1, (e) => {
            if (e != undefined) {
                item.label = e;
                return
            }
            item.label = 'Set System Proxy';
        });
        regKey.set("ProxyServer", Winreg.REG_SZ, str, (e) => {
            if (e != undefined) {
                item.label = e;
                return
            }
            item.checked = true;
        });
    },
    getProxy: function (func) {
        let regKey = new Winreg({
            hive: Winreg.HKCU, // open registry hive HKEY_CURRENT_USER
            key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
        });
        regKey.get("ProxyEnable", func);
    },
    openFile: function (path) {
        exec(`start "" "${path}"`);
    },
    localF: local,
    remoteVersion: function (func, firstRun) {
        this.localProxy().then((p) => {
            p = p.replace(/(\r\n|\n|\r)/gm, "");
            let ip = p.split(":")[0];
            let port = p.split(":")[1];
            const options = {
                url: 'https://api.github.com/repos/v2ray/v2ray-core/releases/latest',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                proxy: {
                    host: ip,
                    port: port
                }
            };
            request(options, function (error, response, body) {
                //console.log('error:', error); // Print the error if one occurred
                if (error != null && !firstRun) {
                    alert(error);
                    return;
                }
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                //console.log('body:', body); // Print the HTML for the Google homepage.
                if (func != undefined) {
                    jData = JSON.parse(body);
                    let v = jData.tag_name.substring(1);
                    func(v, jData, options);
                }
            });
        });
    },
    autoStart: function (pathName, set) {
        let fileName = "";
        if (fs.lstatSync(pathName).isDirectory()) {
            let insides = fs.readdirSync(pathName);
            for (let i = 0, item; item = insides[i]; i++) {
                // do stuff with path
                console.log(item);
                if (item.match(/electron.*\.exe/g) != null || item.match(/v2ray.*\.exe/g) != null) {
                    fileName = path.join(pathName, item);
                }
            }
        } else {
            fileName = pathName;
        }
        let veAutoLauncher = new AutoLaunch({
            name: 'v2rayE',
            path: path.join(pathName),
        });
        if (set) {
            veAutoLauncher.isEnabled()
                .then(function (isEnabled) {
                    if (isEnabled) {
                        return;
                    }
                    veAutoLauncher.enable();
                })
                .catch(function (err) {
                    // handle error
                    console.log(err);
                });
        } else {
            veAutoLauncher.isEnabled()
                .then(function (isEnabled) {
                    if (!isEnabled) {
                        return;
                    }
                    veAutoLauncher.disable();
                })
                .catch(function (err) {
                    // handle error
                    console.log(err);
                });
        }
    },
    unzip: function (command, source, options, restartFunc) {
        // exec(`start "" "${options.cwd}"`);
        let child = spawn(`${command} ${source}`, options);
        let str = "";
        child.stdout.on("data", function (data) {
            console.log(data.toString('utf8'));
            str += data.toString('utf8') + "\n";
        });
        child.stderr.on("data", function (data) {
            console.error(data.toString('utf8'));
        });
        child.on("error", function (data) {
            console.error(data.toString('utf8'));
            exec(`start "" "${options.cwd}"`);
        });
        child.on("exit", () => {
            restartFunc();
            alert(str);
        })
        child.stdin.end();
        /*exec(`${command} ${source}`, options, (e, stdo, stde) => {
            restartFunc();
            if (e != undefined) {
                console.error(e);
                alert(e);
                exec(`start "" "${options.cwd}"`);
                return;
            }
            alert(stdo);
        });*/
        /*try {
            fs.createReadStream(source).on("error", (e) => {
                alert(e);
            }).pipe(unzip.Extract({
                path: target
            }).on("error", (e) => {
                alert(e);
            })).on("close", () => {
                alert("unzip done!");
            })
        } catch (e) {
            alert(e);
        }*/

        /*localC("powershell",
            ["-Command",
                "Expand-Archive -Path .\\v2ray-windows-64.zip -DestinationPath .\\"
            ], path).then((info) => {
            alert("unzip done");
        }, (e) => {
            console.error(e);
            alert(`unzip error: ${e}`);
        });*/
        /*yauzl.open(source, {
            lazyEntries: true
        }, function (err, zipfile) {
            if (err) alert(err);
            zipfile.readEntry();
            zipfile.on("entry", function (entry) {
                    let to = path.join(target, entry.fileName);
                    if (/\/$/.test(entry.fileName)) {
                        // Directory file names end with '/'.
                        // Note that entires for directories themselves are optional.
                        // An entry's fileName implicitly requires its parent directories to exist.
                        console.log(path.join(source, entry.fileName));
                        if (!fs.existsSync(to)) {
                            mkdirp(to, (err) => {
                                if (err) {
                                    alert(err);
                                }
                            });
                        }
                        zipfile.readEntry();
                    } else {
                        // file entry
                        console.log(entry.fileName, to);
                        zipfile.readEntry();
                        zipfile.openReadStream(entry, function (err, readStream) {
                            if (err) alert(err);
                            readStream.on("end", function () {
                                zipfile.readEntry();
                            });
                            readStream.pipe(fs.createWriteStream(to));
                        });
                    }
                })
                .once("error", (e) => {
                                alert(e);
                                console.error(e);
                                zipfile.readEntry();
                            })
                .once('close', () => {
                    alert("update done");
                });;
        });*/
    }
};