const fs = require('fs');
const request = require('request');

function local(string, list) {
    return new Promise((yes, no) => {
        let spawn = require("child_process").spawn;
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
    localF: local,
    remoteVersion: function (func) {
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
                if (error != null && func != undefined) {
                    alert(error);
                }
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                //console.log('body:', body); // Print the HTML for the Google homepage.
                jData = JSON.parse(body);
                let v = jData.tag_name.substring(1);
                if (func != undefined) {
                    func(v, jData, options);
                }
            });
        });
    },
    unzip: function (source, target) {
        require('child_process').exec(`start "" "${target}"`);
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