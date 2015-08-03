#!/usr/bin/node

var api             = exports,
    util            = require('util'),
    https           = require('https'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    sqlite          = require('sqlite3').verbose(),
    chatMessage     = require('./chatMessage'),
    TeamSpeakClient = require('node-teamspeak');

api.account = function(serverQueryClient, userObject, callback) {
    
    var token = userObject.msg,
        user = userObject;

    var options = {
        hostname: 'api.guildwars2.com',
        path: '/v2/account',
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + token
        }
    };

    https.get(options, function(response) {
        response.on('data', function(data) {
            switch(response.statusCode) {
                case 200:
                    var httpsRequest = JSON.parse(data);
                    var guilds = JSON.stringify(httpsRequest.guilds);

                    if (httpsRequest.world === config.homeWorld) {
                        var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
                        databaseConnection.serialize(function() {
                            var statement = databaseConnection.prepare('UPDATE clients SET gw2_api_key = ?, gw2_account_id = ?, gw2_account_name = ?, gw2_guilds = ?, gw2_account_created = ? WHERE client_unique_id = ?');
                            statement.run(token, httpsRequest.id, httpsRequest.name, guilds, httpsRequest.created, user.invokeruid, function(error, response) {
                                //If changes have happen permissions are granted otherwise denied.
                                if (error != null) {
                                    logger.log('info', 'FAIL, member permissions denied for ' + '\n' + '(' + user.invokerid + ')' + user.invokername + ': ' + user.invokeruid + ' \'' + token + '\'');
                                    var message = new chatMessage();
                                    serverQueryClient.send('sendtextmessage', message.chatSend('alreadyInUse', user));
                                } else if (response === undefined) {
                                    serverQueryClient.send('clientgetdbidfromuid', {cluid: user.invokeruid}, function (err, response){
                                        if (error != null) {
                                            logger.log('error', 'Error while clientgetdbidfromuid: ' + user.invokeruid);
                                        } else {
                                            logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n' + '(' + user.invokerid + ')' + user.invokername + ': ' + user.invokeruid + ' \'' + token + '\'');
                                            serverQueryClient.send('servergroupaddclient', {sgid: config.verifiedClientServerGroupId, cldbid: response.cldbid});
                                        };
                                    });
                                };
                            });
                            statement.finalize();

                            statement.on('error', function(response) {
                                if (response.errno === 19) {
                                    logger.log('info', 'This API key is already in our database!!');
                                };
                            });
                            statement.on('trace', function(response) {
                                logger.log('error', 'DB error trace\n' + response);
                            });
                            statement.on('profile', function(response) {
                                logger.log('error', 'DB error profile\n' + response);
                            });
                        });
                        databaseConnection.close();
                    } else {
                        api.world(serverQueryClient, user, httpsRequest, function(error, worldId) {
                            logger.log('info', 'Current world name is: ' + user.worldName);
                            if (error != null) {
                                logger.log('error', 'Error while receiving worldId: ' + error);
                                if (user.invokerdbid == undefined) {
                                    serverQueryClient.send('clientgetdbidfromuid', {cluid: user.invokeruid}, function(error, response) {
                                        console.log('err: ' + error);
                                        console.log('res: ' + response);
                                        if (error != null) {
                                            logger.log('error', 'Error while receiving cldbid' + error);
                                        } else {
                                            user.invokerdbid = response;
                                        };
                                    });
                                };
                                console.log(util.inspect(user));
                                serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: user.invokerdbid}, function(error, response) {
                                    if (error != null) {
                                        logger.log('error', 'Error while deleting server group:\n' + util.inspect(error));
                                    } else {
                                        var report = '[B]' + 'cluid: ' + '[/B]' + user.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + user.invokername;
                                        serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Deleted client because of invalid world', message: report}, function(error, response) {
                                            if (error != null) {
                                                logger.log('error', 'Error while sending admin message\n' + error);
                                            } else {
                                                database.delApiKey(user, function(error, response) {
                                                    if (error != null) {
                                                        logger.log('error', 'Error while deleting API-key from database\n' + error);
                                                    } else {
                                                        logger.log('info', 'Deleted API-key from databse.\n' + '(' + user.invokerid + ')' + user.invokername + ' \'' + user.invokeruid + '\'');
                                                    };
                                                });
                                            };
                                        });
                                    };
                                });
                            } else {
                                logger.log('info', 'World checked and verified.')
                            };
                        });
                    };
                    callback(null, serverQueryClient, user);
                    break;

                case 400:
                    var httpsRequest = JSON.parse(data);
                    switch(httpsRequest.text) {
                        case 'invalid key':
                            logger.log('info', 'Server responding with "Invalid key" -> ' + response.statusCode);
                            
                            database.delApiKey(user, function(error, response) {
                                console.log('user: \n' + util.inspect(user));
                                if (error != null) {
                                    logger.log('dbError: ' + error);
                                } else {
                                    logger.log('info', 'Removed gw2_api_key from database' + '\n' + '(' + user.invokerid + ')' + user.invokername + ': ' + user.invokeruid + ' \'' + token + '\'');
                                    var message = new chatMessage();
                                    serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', user));
                                    serverQueryClient.send('clientgetdbidfromuid', {cluid: user.invokeruid}, function (error, response){
                                        if (error != null) {
                                            logger.log('error', 'Error while receiving cldbid: ' + error);
                                        } else {
                                            var report = '[B]' + 'cluid: ' + '[/B]' + user.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + user.invokername;
                                            serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Deleted client because of invalid key', message: report});
                                            serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: response.cldbid});
                                        };
                                    });
                                };
                            });
                            break;

                        case 'ErrBadData':
                            logger.log('info', 'Server responding with "ErrBadData" -> ' + response.statusCode);
                            var message = new chatMessage();
                            serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', user));
                            break;

                        default:
                            logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                            break;

                    };
                    break;

                case 403:
                    var httpsRequest = JSON.parse(data);
                    logger.log('info', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                    break;

                case 502:
                    logger.log('info', 'Server not responding -> ' + response.statusCode);
                    break;

                case 503:
                    //logger.log('info', 'Service unavailable -> ' + response.statusCode);
                    var message = new chatMessage();
                    serverQueryClient.send('sendtextmessage', message.chatSend('api503', user));
                    break;
            };
        });
    });
};

api.world = function(serverQueryClient, userObject, httpsRequest, callback) {
    
    var user    = userObject,
        token   = userObject.msg,
        worldId = httpsRequest.world;
    
    logger.log('info', 'Checking API-key for foreign world.' + '\n' + '(' + user.invokerid + ')' + user.invokername + ': ' + user.invokeruid + ' \'' + token + '\'');

    var options = {
                    hostname: 'api.guildwars2.com',
                    path: '/v2/worlds?ids=' + worldId,
                    method: 'GET'
                };
    https.get(options, function(response) {
        logger.log('info', 'GW2 Worlds-API status code: ' + response.statusCode);
        var statusCode = response.statusCode;
        response.on('data', function(data) {
            switch(statusCode) {
                case 200:
                    var httpsRequest = JSON.parse(data);
                    //Response is a list of response objects.
                    for (var response in httpsRequest) {
                        var world = httpsRequest[response];
                        //Add worldname to response-object.
                        user.worldName = world.name;
                        var message =  new chatMessage();
                        serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', user));
                    };
                    if (worldId != config.homeWorld) {
                        callback(new Error(worldId));
                    } else {
                        callback(null, worldId);
                    };
                    break;

                case 400:
                    var httpsRequest = JSON.parse(data);
                    logger.log('info', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                    break;

                case 403:
                    var httpsRequest = JSON.parse(data);
                    logger.log('info', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                    break;

                case 502:
                    logger.log('info', 'Server not responding -> ' + statusCode);
                    break;

                case 503:
                    var message = new chatMessage();
                    serverQueryClient.send('sendtextmessage', message.chatSend('api503', user));
                    break;
            };
        });
    });
};