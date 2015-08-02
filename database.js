#!/usr/bin/node

var database = exports,
    sqlite   = require('sqlite3').verbose(),
    util     = require('util'),
    logger   = require('./logger');

function unixTime() {
    var unixStamp = Math.round((new Date()).getTime() / 1000);
    return unixStamp;
};

//Get GW2-API-Key by client unique identifier.
database.getApiKey = function(clientObject, callback) {
    var databaseConnectionGet = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionGet.serialize(function() {
        var statement = databaseConnectionGet.prepare('SELECT `gw2_api_key` AS key FROM `clients` WHERE `client_unique_id` = (?)');
        statement.get(clientObject.client_unique_identifier, function(error, response) {
            if (error != null) {
                callback(new Error(error));
            } else {
                callback(null, response);
            };
        });
        statement.finalize();
    });
};

database.setNewUser = function(clientObject, callback) {
    var databaseConnectionSetNewUser = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionSetNewUser.serialize(function() {
        var statement = databaseConnectionSetNewUser.prepare('INSERT INTO `clients` VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        statement.run(clientObject.client_unique_identifier, clientObject.client_nickname, unixTime(), null, null, null, null, null, function(error, response) {
            if (error != null) {
                callback(new Error(error));
            } else {
                callback(null, response);
            };
        });
        statement.finalize();
    });
};

database.updateLastSeen = function(clientObject, callback) {
    var databaseConnectionUpdateLastSeen = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionUpdateLastSeen.serialize(function() {
        var statement = databaseConnectionUpdateLastSeen.prepare('UPDATE clients SET client_nickname = ?, last_seen = ? WHERE client_unique_id = ?');
        statement.run(clientObject.client_nickname, unixTime(), clientObject.client_unique_identifier, function(error, response) {
            if (error != null) {
                callback(new Error(error));
            } else {
                callback(null, response);
            };
        });
        statement.finalize();
    });
};