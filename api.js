#!/usr/bin/node

var api             = exports,
    util            = require('util'),
    https           = require('https'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    sqlite          = require('sqlite3').verbose(),
    chatMessage     = require('./chatMessage'),
    TeamSpeakClient = require('node-teamspeak');

api.account = function(userObject, callback) {
    
    var token        = userObject.msg,
        clientObject = userObject;

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
                    console.log('httpsRequest: \n' + util.inspect(httpsRequest));
                    var guilds = JSON.stringify(httpsRequest.guilds);

                    if (httpsRequest.world === config.homeWorld) {
                        //Add information gathered with api call to clientObject.
                        clientObject.apiKey         = token;
                        clientObject.accountId      = httpsRequest.id;
                        clientObject.accountName    = httpsRequest.name;
                        clientObject.accountGuilds  = guilds;
                        clientObject.accountCreated = httpsRequest.created;

                        callback(null, clientObject);
                        // var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
                        // databaseConnection.serialize(function() {
                        //     var statement = databaseConnection.prepare('UPDATE clients SET gw2_api_key = ?, gw2_account_id = ?, gw2_account_name = ?, gw2_guilds = ?, gw2_account_created = ? WHERE client_unique_id = ?');
                        //     statement.run(token, httpsRequest.id, httpsRequest.name, guilds, httpsRequest.created, user.invokeruid, function(error, response) {
                        //         //If changes have happen permissions are granted otherwise denied.
                        //         if (error != null) {
                        //             logger.log('info', 'FAIL, member permissions denied for ' + '\n' + '(' + user.invokerid + ')' + user.invokername + ': ' + user.invokeruid + ' \'' + token + '\'');
                        //             var message = new chatMessage();
                        //             serverQueryClient.send('sendtextmessage', message.chatSend('alreadyInUse', user));
                        //         } else if (response === undefined) {
                        //             serverQueryClient.send('clientgetdbidfromuid', {cluid: user.invokeruid}, function (err, response){
                        //                 if (error != null) {
                        //                     logger.log('error', 'Error while clientgetdbidfromuid: ' + user.invokeruid);
                        //                 } else {
                        //                     logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n' + '(' + user.invokerid + ')' + user.invokername + ': ' + user.invokeruid + ' \'' + token + '\'');
                        //                     serverQueryClient.send('servergroupaddclient', {sgid: config.verifiedClientServerGroupId, cldbid: response.cldbid});
                        //                 };
                        //             });
                        //         };
                        //     });
                        //     statement.finalize();

                        //     statement.on('error', function(response) {
                        //         if (response.errno === 19) {
                        //             logger.log('info', 'This API key is already in our database!!');
                        //         };
                        //     });
                        //     statement.on('trace', function(response) {
                        //         logger.log('error', 'DB error trace\n' + response);
                        //     });
                        //     statement.on('profile', function(response) {
                        //         logger.log('error', 'DB error profile\n' + response);
                        //     });
                        // });
                        // databaseConnection.close();
                    } else {
                        
                        clientObject.accountWorldId = httpsRequest.world;
                        clientObject.apiKey = clientObject.msg;
                        console.log('clientObject_before_calling_api.world:\n' + util.inspect(clientObject));
                        
                        api.world(clientObject, function(error, response) {
                            console.log('api.world_callback_err:\n' + util.inspect(error));
                            console.log('api.world_callback_res:\n' + util.inspect(response));
                            if (error != null) {
                                console.log('api.world_error_callback_err:\n' + util.inspect(error));
                                callback(error, null);
                            } else {
                                callback(null, clientObject);
                            }
                        });
                    //     api.world(serverQueryClient, user, httpsRequest, function(error, worldId) {
                    //         logger.log('info', 'Current world name is: ' + user.worldName);
                    //         if (error != null) {
                    //             logger.log('error', 'Error while receiving worldId: ' + error);
                    //             if (user.invokerdbid == undefined) {
                    //                 serverQueryClient.send('clientgetdbidfromuid', {cluid: user.invokeruid}, function(error, response) {
                    //                     console.log('err: ' + error);
                    //                     console.log('res: ' + response);
                    //                     if (error != null) {
                    //                         logger.log('error', 'Error while receiving cldbid' + error);
                    //                     } else {
                    //                         user.invokerdbid = response;
                    //                     };
                    //                 });
                    //             };
                    //             console.log(util.inspect(user));
                    //             serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: user.invokerdbid}, function(error, response) {
                    //                 if (error != null) {
                    //                     logger.log('error', 'Error while deleting server group:\n' + util.inspect(error));
                    //                 } else {
                    //                     var report = '[B]' + 'cluid: ' + '[/B]' + user.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + user.invokername;
                    //                     serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Deleted client because of invalid world', message: report}, function(error, response) {
                    //                         if (error != null) {
                    //                             logger.log('error', 'Error while sending admin message\n' + error);
                    //                         } else {
                    //                             database.delApiKey(user, function(error, response) {
                    //                                 if (error != null) {
                    //                                     logger.log('error', 'Error while deleting API-key from database\n' + error);
                    //                                 } else {
                    //                                     logger.log('info', 'Deleted API-key from databse.\n' + '(' + user.invokerid + ')' + user.invokername + ' \'' + user.invokeruid + '\'');
                    //                                 };
                    //                             });
                    //                         };
                    //                     });
                    //                 };
                    //             });
                    //         } else {
                    //             logger.log('info', 'World checked and verified.')
                    //         };
                    //     });
                    };
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
                            // var message = new chatMessage();
                            // serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', user));
                            break;

                        default:
                            logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                            clientObject.apiServerStatus = response.statusCode;
                            callback(clientObject, null);
                            break;

                    };
                    break;

                case 403:
                    var httpsRequest = JSON.parse(data);
                    logger.log('info', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                    clientObject.apiServerStatus = response.statusCode;
                    callback(clientObject, null);
                    break;

                case 502:
                    logger.log('info', 'Server not responding -> ' + response.statusCode);
                    clientObject.apiServerStatus = response.statusCode;
                    callback(clientObject, null);
                    break;

                case 503:
                    logger.log('info', 'Server busy -> ' + response.statusCode);
                    clientObject.apiServerStatus = response.statusCode;
                    callback(clientObject, null);
                    // var message = new chatMessage();
                    // serverQueryClient.send('sendtextmessage', message.chatSend('api503', user));
                    break;
            };
        });
    });
};

//World gets only checked if a foreign world is already detected.
api.world = function(clientObject, callback) {

    console.log('api.world_clientObject:\n' + util.inspect(clientObject));
    
    logger.log('info', 'Checking API-key for foreign world.' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid + ' \'' + clientObject.apiKey + '\'');

    var options = {
                    hostname: 'api.guildwars2.com',
                    path: '/v2/worlds?ids=' + clientObject.accountWorldId,
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
                        clientObject.accountWorldName = world.name;
                    };
                    if (clientObject.accountWorldId != config.homeWorld) {
                        callback(clientObject, null);
                    } else {
                        callback(null, clientObject);
                    };
                    break;

                case 400:
                    var httpsRequest = JSON.parse(data);
                    logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                    clientObject.apiServerStatus = response.statusCode;
                    callback(clientObject, null);
                    break;

                case 403:
                    var httpsRequest = JSON.parse(data);
                    logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + httpsRequest);
                    clientObject.apiServerStatus = response.statusCode;
                    callback(clientObject, null);
                    break;

                case 502:
                    logger.log('error', 'Server not responding -> ' + statusCode);
                    clientObject.apiServerStatus = statusCode;
                    callback(clientObject, null);
                    break;

                case 503:
                    logger.log('error', 'Server busy -> ' + statusCode);
                    clientObject.apiServerStatus = statusCode;
                    callback(clientObject, null);
                    // var message = new chatMessage();
                    // serverQueryClient.send('sendtextmessage', message.chatSend('api503', user));
                    break;
            };
        });
    });
};