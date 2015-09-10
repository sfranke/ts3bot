var express = require('express');
var router  = express.Router();
var util    = require('util');
var sqlite  = require('sqlite3');

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

router.post('/', function (req, res, next) {

    console.log('accountUid: ' + util.inspect(req.body.accountUid));
    var uid = req.body.accountUid;
    console.log('variable_uid: ' + uid);

    getAccountinformation(uid, function (error, response) {
        if (response != undefined) {
            res.render('account', {title: 'Ts3Bot', name: response.client_nickname, time: response.last_seen, apiKey: response.gw2_api_key, accountId: response.gw2_account_id, accountName: response.gw2_account_name, guilds: response.gw2_guilds, created: response.gw2_account_created});
        } else {
            res.render('account', {title: 'Ts3Bot', name: undefined});
        }
    })

});

module.exports = router;