#!/usr/bin/node

var database = exports,
    sqlite   = require('sqlite3').verbose(),
    util     = require('util'),
    logger   = require('./logger');

function unixTime() {
    var unixStamp = Math.round((new Date()).getTime() / 1000);
    return unixStamp;
};

database.createDatabase = function (callback) {
    var createDatabase = new sqlite.Database('ts3bot.sqlitedb');
    createDatabase.serialize(function() {
        createDatabase.run('CREATE TABLE clients (client_unique_id TEXT UNIQUE, client_nickname TEXT, last_seen INTEGER, gw2_api_key TEXT UNIQUE, gw2_account_id TEXT, gw2_account_name TEXT, gw2_guilds TEXT, gw2_account_created TEXT, PRIMARY KEY(client_unique_id))', function (error, response) {
            if (error != null) {
                callback(error, null);
            } else {
                callback(null, response);
            };
        });
    });
    createDatabase.close();
};

//Get GW2-API-Key by client unique identifier.
database.getApiKey = function(clientObject, callback) {
    var databaseConnectionGet = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionGet.serialize(function() {
        var statement = databaseConnectionGet.prepare('SELECT `gw2_api_key` AS key FROM `clients` WHERE `client_unique_id` = (?)');
        statement.get(clientObject.client_unique_identifier, function(error, response) {
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

database.updateAccountInformation = function(clientObject, callback) {
    var databaseConnectionUpdateAccountInformation = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionUpdateAccountInformation.serialize(function() {
        var statement = databaseConnectionUpdateAccountInformation.prepare('UPDATE `clients` SET gw2_api_key = ?, gw2_account_id = ?, gw2_account_name = ?, gw2_guilds = ?, gw2_account_created = ? WHERE client_unique_id = ?')
        statement.run(clientObject.apiKey, clientObject.accountId, clientObject.accountName, clientObject.accountGuilds, clientObject.accountCreated, clientObject.invokeruid, function(error, response) {
            if (error != null) {
                callback(error, null);
            } else {
                callback(null, response);
            };
        });
        statement.finalize();
    });
    databaseConnectionUpdateAccountInformation.close();
};

database.setNewUser = function(clientObject, callback) {
    var databaseConnectionSetNewUser = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionSetNewUser.serialize(function() {
        var statement = databaseConnectionSetNewUser.prepare('INSERT INTO `clients` VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        statement.run(clientObject.invokeruid, clientObject.invokername, unixTime(), null, null, null, null, null, function(error, response) {
            if (error != null) {
                callback(error, null);
            } else {
                callback(null, response);
            };
        });
        statement.finalize();
    });
    databaseConnectionSetNewUser.close();
};

database.updateLastSeen = function(clientObject, callback) {
    var databaseConnectionUpdateLastSeen = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionUpdateLastSeen.serialize(function() {
        var statement = databaseConnectionUpdateLastSeen.prepare('UPDATE clients SET client_nickname = ?, last_seen = ? WHERE client_unique_id = ?');
        statement.run(clientObject.client_nickname, unixTime(), clientObject.client_unique_identifier, function(error, response) {
            if (error != null) {
                callback(error, null);
            } else {
                callback(null, response);
            };
        });
        statement.finalize();
    });
    databaseConnectionUpdateLastSeen.close();
};

database.delApiKey = function(clientObject, callback) {
    var databaseConnectionDelApiKey = new sqlite.Database('ts3bot.sqlitedb');
    databaseConnectionDelApiKey.serialize(function() {
        var statement = databaseConnectionDelApiKey.prepare('UPDATE clients SET gw2_api_key = ?, last_seen = ? WHERE client_unique_id = ?');
        statement.run(null, unixTime(), clientObject.client_unique_identifier, function(error, response) {
            if (error != null) {
                callback(error, null);
            } else {
                callback(null, response);
            }
        });
        statement.finalize();
    });
    databaseConnectionDelApiKey.close();
};
