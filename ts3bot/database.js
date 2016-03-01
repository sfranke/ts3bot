#!/usr/bin/node

var database    = exports,
    mongoClient = require('mongodb').MongoClient,
    util        = require('util'),
    logger      = require('./logger');

var uri = 'mongodb://localhost:27017/ts3bot';

function unixTime() {
    var unixStamp = Math.round((new Date()).getTime() / 1000);
    return unixStamp;
};

//Creata a new Database, only executes if there is no database yet.
database.createDatabase = function (callback) {
    callback({errno: 1},null);
};

//Get GW2-API-Key by client unique identifier.
database.getApiKey = function(clientObject, callback) {
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.find({client_unique_id: clientObject.invokeruid}).limit(1).next(function (err, doc) {
            if (err) callback(err, null);
            callback(null, doc);
            db.close();
        });
    });
};

//Update an existing dataset with the data you can fetch from the API.
database.updateAccountInformation = function(clientObject, callback) {
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.find({gw2_api_key: clientObject.apiKey}).limit(1).next(function (err, doc) {
            if (doc === null) {
                collection.update({client_unique_id: clientObject.invokeruid}, {client_unique_id: clientObject.invokeruid, client_nickname: clientObject.invokername, last_seen: unixTime(), gw2_api_key: clientObject.apiKey, gw2_account_id: clientObject.accountId, gw2_account_name: clientObject.accountName, gw2_guilds: clientObject.accountGuilds, gw2_account_created: clientObject.accountCreated}, {upsert: true});
                callback(null, clientObject);
                db.close();
            } else {
                callback({errno: 19}, null);
                db.close();
            }
        });
    });
};

//Enter a new dataset for a given unknown client.
database.setNewUser = function(clientObject, callback) {
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.update({client_unique_id: clientObject.invokeruid}, {client_unique_id: clientObject.invokeruid, client_nickname: clientObject.invokername, last_seen: unixTime()}, {upsert: true});
        db.close();
    });
};

//Update last_seen and invokername for any given user that connects.
database.updateLastSeen = function(clientObject, callback) {
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.update({client_unique_id: clientObject.invokeruid}, {client_unique_id: clientObject.invokeruid, client_nickname: clientObject.invokername, last_seen: unixTime()}, {upsert: true}, function (err, doc) {
            if (err) callback(err, null);
            callback(null, doc);
            db.close();
        });
    });
};

//Update last_seen and invokername for any given user that connects.
database.updateLastSeenVerified = function(clientObject, callback) {
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.update({client_unique_id: clientObject.invokeruid}, {client_unique_id: clientObject.invokeruid, client_nickname: clientObject.invokername, last_seen: unixTime(), gw2_api_key: clientObject.apiKey, gw2_account_id: clientObject.accountId, gw2_account_name: clientObject.accountName, gw2_guilds: clientObject.guilds, gw2_account_created: clientObject.accountCreated}, {upsert: true}, function (err, doc) {
            if (err) callback(err, null);
            callback(null, doc);
            db.close();
        });
    });
};

//Delete only the API-key from a given data set to reset a client
//to 'new client status'. Ready to register again.
database.delApiKey = function(clientObject, callback) {
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.update({client_unique_id: clientObject.invokeruid}, {client_unique_id: clientObject.invokeruid, client_nickname: clientObject.invokername, last_seen: unixTime()}, {upsert: true}, function (err, doc) {
            if (err) callback(err, null);
            callback(null, doc);
            db.close();
        });
    });
};

//Delete a single client from the database.
database.delClient = function (client, callback) {
    logger.log('debug', 'Database client to be deleted: ' + util.inspect(client.client_unique_identifier));
    mongoClient.connect(uri, function (err, db) {
        var collection = db.collection('clients');
        collection.deleteOne({client_unique_id: client.client_unique_identifier}, function (err, doc) {
            if (err) callback(err, null);
            callback(null, doc);
            db.close();
        });
    });
};
