var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var util = require('util');

/* GET home page. */
router.get('/', function (req, res, next) {
    exec('pm2 jlist', function (error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        } else {
            var status = JSON.parse(stdout);
            res.render('index', { title: 'Ts3Bot', status: status });
        }
    });
});

module.exports = router;
