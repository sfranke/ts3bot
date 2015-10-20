var express = require('express'),
    router  = express.Router(),
    fs      = require('fs'),
    util    = require('util');

router.get('/', function (req, res, next) {

    (function getLog() {

        var logArray = [];

        var rl = require('readline').createInterface({
            input: require('fs').createReadStream('./ts3bot/log'),
            terminal: false
        });

        rl.on('line', function (line) {
            //logger.log('debug', 'Line from file:' + line);
            logArray.push(line);
        });

        rl.on('close', function () {
            res.render('log', {title: 'Log', log: logArray});
        });

    })();

});

module.exports = router;