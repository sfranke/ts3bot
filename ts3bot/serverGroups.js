#!/usr/bin/node

var serverGroups    = exports,
    TeamSpeakClient = require('node-teamspeak'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    util            = require('util'),
    https           = require('https'),
    async           = require('async'),
    logger          = require('./logger'),
    database        = require('./database');

// This function accepts the serverQueryClient and the clientObject to revalidate the client's currently
// assigned server groups. This function is supposed to be executed everytime a client connects to the server to
// ensure every client has the appropriate permissions/server groups. Tha main factors are the gw2_account_world which
// provides the information about the game sever. And the serverGroupIds provided by the config file.
serverGroups.purgeClient = function (serverQueryClient, clientObject) {
    logger.log('debug', 'serverQueryClient:\n' + util.inspect(serverQueryClient));
    logger.log('debug', 'clientObject:\n' + util.inspect(clientObject));
    // Fetch all related servergroup IDs.
    var allServerGroups = [];
    for (var gameWorldId in config.gameWorlds) {
        logger.log('debug', 'gameWorlds: ' + config.gameWorlds[gameWorldId].serverGroupId);
        allServerGroups.push(config.gameWorlds[gameWorldId].serverGroupId);
    }
    logger.log('debug', 'List of all server groups that need to be purged: ' + allServerGroups);
    database.getApiKey(clientObject, function (error, response) {
        if (error) logger.log('debug', 'getApiKey error: ' + error);
        logger.log('debug', 'getApiKey response: ' + util.inspect(response));
        var groups = clientObject.client_servergroups.toString();
        var serverGroups = groups.split(',');
        if (response.gw2_account_world === null) {
            allServerGroups.push(config.commanderServerGroupId);
            // Remove all server groups!
            serverGroups.forEach(function(serverGroupId) {
                logger.log('debug', '----> servergroup: ' + serverGroupId);
                if (allServerGroups.indexOf(serverGroupId) !== -1) {
                    logger.log('debug', 'Found server group that needs to be removed: ' + serverGroupId);
                    serverQueryClient.send('servergroupdelclient', {sgid: serverGroupId, cldbid: clientObject.invokerdbid});
                }
            });
            database.setNewUser(clientObject, function(error, response) {
                logger.log('debug', 'error: ' + error);
                logger.log('debug', 'response: ' + response);
                logger.log('debug', 'Set new user!');
            });
        }
        if (response.gw2_account_world !== null) {
            logger.log('debug', 'My server group ID: ' + config.gameWorlds[response.gw2_account_world].serverGroupId);
            var myServerGroup = config.gameWorlds[response.gw2_account_world].serverGroupId;
            // Remove all server groups except the one that this account is affiliated with.
            serverGroups.forEach(function(serverGroupId) {
                logger.log('debug', '====> servergroup: ' + serverGroupId);
                if (allServerGroups.indexOf(serverGroupId) !== -1 && serverGroupId !== myServerGroup) {
                    logger.log('debug', 'Found server group that needs to be removed: ' + serverGroupId);
                    serverQueryClient.send('servergroupdelclient', {sgid: serverGroupId, cldbid: clientObject.invokerdbid});
                }
            });
        }
    });
};
