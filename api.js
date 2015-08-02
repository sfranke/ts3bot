#!/usr/bin/node

var api             = exports,
    util            = require('util'),
    https           = require('https'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    sqlite          = require('sqlite3').verbose(),
    chatMessage     = require('./chatMessage'),
    TeamSpeakClient = require('node-teamspeak');

api.account = function(serverQueryClient, userObject) {
    
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
                            statement.run(token, httpsRequest.id, httpsRequest.name, guilds, httpsRequest.created, user.invokeruid, function(response) {
                                //If changes have happen permissions are granted otherwise denied.
                                if (this.lastID === undefined) {
                                    logger.log('info', 'FAIL, member permissions denied for ' + '\n\t' + user.invokername + ' UId: ' + user.invokeruid);
                                    response.invokerid = user.invokerid;
                                    var message = new chatMessage();
                                    serverQueryClient.send('sendtextmessage', message.chatSend('alreadyInUse', response));
                                } else {
                                    serverQueryClient.send('sendtextmessage', {targetmode: '1', target: user.invokerid, msg: config.confirmAccessMsg}, function (err, response){
                                        serverQueryClient.send('clientgetdbidfromuid', {cluid: user.invokeruid}, function (err, response){
                                            logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n\t' + user.invokername + ' UId: ' + user.invokeruid);
                                            serverQueryClient.send('servergroupaddclient', {sgid: config.verifiedClientServerGroupId, cldbid: response.cldbid});
                                        });
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
                        logger.log('info', 'Checking API-key for foreign world.' + '\n\t' + '\'' + token + '\'');

                        var worldId = httpsRequest.world;
                        var options = {
                                        hostname: 'api.guildwars2.com',
                                        path: '/v2/worlds?ids=' + worldId,
                                        method: 'GET'
                                    };
                        https.get(options, function(res) {
                            logger.log('info', 'GW2 Worlds-API status code: ' + res.statusCode);
                            var statusCode = res.statusCode;
                            res.on('data', function(data) {
                                switch(statusCode) {
                                    case 200:
                                        var httpsRequest = JSON.parse(data);
                                        //Response is a list of response objects.
                                        for (var res in httpsRequest) {
                                            var world = httpsRequest[res];
                                            //Add worldname to response-object.
                                            user.worldname = world.name;
                                            var message =  new chatMessage();
                                            serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', user));
                                        };
                                        break;

                                    case 400:
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
                    break;

                case 400:
                    var httpsRequest = JSON.parse(data);
                    switch(httpsRequest.text) {
                        case 'invalid key':
                            logger.log('info', 'Server responding with "Invalid key" -> ' + response.statusCode);
                            var message = new chatMessage();
                            serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', user));
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