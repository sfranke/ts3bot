var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var util = require('util');

/* GET home page. */
router.get('/', function (req, res, next) {
    exec('ts3bot/ts3bot_startscript.sh status', function (error, stdout, stderr) {
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (error != null) {
            console.log('exec error: ' + error);
        } else {
            //Remove newlines.
            var status = stdout.replace(/(\r\n|\n|\r)/gm,"");
            //console.log('status after assignment: ' + status);
            res.render('index', { title: 'Ts3Bot', status: stdout });
        }
    });
});

router.post('/', function (req, res, next) {
    exec('ts3bot/ts3bot_startscript.sh status', function (error, stdout, stderr) {
        if (error != null) {
            console.log('exec error: ' + error);
        } else {
            //Remove newlines.
            var status = stdout.replace(/(\r\n|\n|\r)/gm,"");
            
            switch(status) {

                case "Ts3bot is not running (ts3bot.pid is missing)" :
                    console.log('Ts3Bot is not running!');
                    exec('ts3bot/ts3bot_startscript.sh start', function (error, stdout, stderr) {
                        if (error != null) {
                            console.log('exec error: ' + error);
                        } else {
                            status = stdout;
                            res.render('index', { title: 'Ts3Bot' , status: status });
                        }
                    });
                    break;

                case "Ts3bot is running" :
                    console.log('Ts3bot is running.');
                    res.render('index', {title: 'Ts3bot', status: status});
                    break;

                case 'Ts3bot seems to have died' :
                    console.log('Ts3bot seems to have died.');
                    exec('ts3bot/ts3bot_startscript.sh start', function (error, stdout, stderr) {
                        if (error != null) {
                            console.log('exec error: ' + error);
                        } else {
                            status = stdout;
                            res.render('index', { title: 'Ts3Bot' , status: status });
                        }
                    });
                    break;

                default:
                    console.log('Default case! Please handle the mess you made..');
                    console.log('status typeof(): ' + typeof(status));
                    console.log('status raw: ' + status);
                    res.render('index', { title: 'Ts3Bot' , status: status });
                    break;
            };
            // res.render('index', { title: 'Ts3Bot' , status: status });
        };
    });
});

module.exports = router;
