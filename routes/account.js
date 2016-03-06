var express     = require('express'),
    mongoClient = require('mongodb').MongoClient,
    router      = express.Router(),
    util        = require('util'),
    https       = require('https');

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('account', {title: 'Ts3Bot', name: undefined});
});

var uri = 'mongodb://localhost:27017/ts3bot';

getAccountinformation = function(Uid, callback) {
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.find({client_unique_id: Uid}).limit(1).next(function (err, doc) {
            if (err) callback(err, null);
            callback(null, doc);
            db.close();
        });
    });
};

router.post('/', function (req, res, next) {
    var uid = req.body.accountUid;
    getAccountinformation(uid, function (error, response) {
        if (response !== undefined) {
            var time = new Date(response.last_seen * 1000);
            var guilds = JSON.parse(response.gw2_guilds);
            res.render('account', {
                                    title: 'Ts3Bot',
                                    name: response.client_nickname,
                                    time: time,
                                    apiKey: response.gw2_api_key,
                                    accountId: response.gw2_account_id,
                                    accountName: response.gw2_account_name,
                                    guilds: guilds,
                                    created: response.gw2_account_created
                                });
        } else {
            res.render('account', {title: 'Ts3Bot', name: undefined});
        }
    });
});

module.exports = router;
