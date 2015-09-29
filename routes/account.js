var express = require('express');
var router  = express.Router();
var util    = require('util');
var sqlite  = require('sqlite3');
var https = require('https');

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('account', {title: 'Ts3Bot', name: undefined});
});

getAccountinformation = function (Uid, callback) {
    var databaseConnectionGet = new sqlite.Database('./ts3bot/ts3bot.sqlitedb');
    databaseConnectionGet.serialize(function() {
        var statement = databaseConnectionGet.prepare('SELECT * FROM `clients` WHERE `client_unique_id` = (?)');
        console.log(statement);
        statement.get(Uid, function(error, response) {
            console.log('error: ' + error);
            console.log('response: ' + util.inspect(response));
            if (error != null) {
                callback(error, null);
            } else {
                callback(null, response);
            };
        });
        statement.finalize();
    });
    databaseConnectionGet.close();
};

getGuilds = function (gw2Guilds, callback) {
        
    var guilds = [];
    var guild = JSON.parse(gw2Guilds);

    for (var i in guild) {
        var options = {
            hostname: 'api.guildwars2.com',
            path: '/v1/guild_details.json?guild_id=' + guild[i],
            method: 'GET'
        };
        https.get(options, function (response) {
            response.on('data', function (data) {
                switch(response.statusCode) {
                    case 200:
                        var guildInfo = JSON.parse(data);
                        var guildName = guildInfo.guild_name;
                        guilds.push(guildName);
                        //console.log(guilds);
                        callback(guilds);
                        break;

                    default:
                        console.log('Error while fetching guilds from API.');
                        break;
                };
            });
        });
    };
};

router.post('/', function (req, res, next) {

    var uid = req.body.accountUid;

    getAccountinformation(uid, function (error, response) {
        if (response != undefined) {
            var time = new Date(response.last_seen * 1000);
            
            // getGuilds(response.gw2_guilds, function (guilds) {
            //     console.log('callback_guilds: ' + guilds);
            // });

            res.render('account', {title: 'Ts3Bot', name: response.client_nickname, time: time, apiKey: response.gw2_api_key, accountId: response.gw2_account_id, accountName: response.gw2_account_name, guilds: response.gw2_guilds, created: response.gw2_account_created});
        } else {
            res.render('account', {title: 'Ts3Bot', name: undefined});
        }
    });
});

module.exports = router;