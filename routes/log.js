var express = require('express'),
    router  = express.Router(),
    fs      = require('fs'),
    util    = require('util');

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
                });
            })();
        }
    });
});

module.exports = router;
