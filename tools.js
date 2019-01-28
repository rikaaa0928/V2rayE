const fs = require('fs');

module.exports = {
    parseConfigFile: function (name) {
        let err, data = fs.readFileSync(name, 'utf8');
        if (err) throw err;
        //console.log(data);
        //console.log(obj.outbound);
        return JSON.parse(data)
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
    }
};