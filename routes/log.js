var express = require('express'),
    router  = express.Router(),
    fs      = require('fs'),
    util    = require('util');

var tempLogArray = [];

router.get('/', function (req, res, next) {
    fs.access('./ts3bot/log', function (error, response) {
        if (error) {
            console.log(error);
            res.render('log', {title: 'Log', log: ['No log file found!']});
        } else {
            (function getLog() {
                var logArray = [];
                var rl = require('readline').createInterface({
                    input: require('fs').createReadStream('./ts3bot/log'),
                    terminal: false
                });
                rl.on('line', function (line) {
                    logArray.push(line);
                });
                rl.on('close', function () {
                    res.render('log', {title: 'Log', log: logArray});
                    tempLogArray = logArray;
                    updateLog();
                });
            })();
        }
    });
});

function updateLog() {
    var fileWatcher = fs.watch('./ts3bot/log', function (event, file) {
        if (event === 'change') {
            var rl = require('readline').createInterface({
                input: require('fs').createReadStream('./ts3bot/log'),
                terminal: false
            });
            rl.on('line', function (line) {
                if (tempLogArray.indexOf(line) == -1) {
                    io.emit('newLine', line);
                    tempLogArray.push(line);
                }
            });
        }
    });
}

module.exports = router;
