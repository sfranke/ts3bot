#!/usr/bin/node

var TeamSpeakClient = require('node-teamspeak'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    fs              = require('fs'),
    util            = require('util'),
    https           = require('https'),
    logger          = require('./logger'),
    chatMessage     = require('./chatMessage'),
    api             = require('./api'),
    database        = require('./database'),
    databasePurge   = require('./databasePurge'),
    clientIdleMove  = require('./clientIdleMove'),
    async           = require('async'),
    colors          = require('colors'),
    matchup         = require('./matchup'),
    serverGroups    = require('./serverGroups');

// Function to create a unix timestamp.
function unixTime() {
    var unixStamp = Math.round((new Date()).getTime() / 1000);
    return unixStamp;
}

// Main function to create an instance of the ts3bot itself.
(function ts3bot() {

    // Configuration of the teamspeak server query client.
    var serverQueryClient = new TeamSpeakClient(config.host, config.port);

    // Start-up routine of the the bot. Connecting  to all services to run properly.
    // All routines that should be run on start-up should be implemented here.
    async.series({

        // Login routine. login name and password are provided via config file.
        login: function (callback) {
            serverQueryClient.send(
                'login',
                {
                    client_login_name: config.loginName,
                    client_login_password: config.clientPassword
                },
            function (error, response, rawResponse){
                if (error !== undefined) logger.log('error', error);
                logger.log('info', 'Login successful.');
                callback();
            });
        },

        // Server selection. Server ID is provided via config file.
        selectServer: function(callback) {
            serverQueryClient.send('use', {sid: config.virtualServerId}, function (error, response, rawResponse){
                if (error !== undefined) logger.log('error', error);
                logger.log('info', 'Virtual server selected successfully.');
                callback();
            });
        },

        // Change client name. This will change the visible client name provided via the config file.
        changeNick: function (callback) {
            serverQueryClient.send(
                'clientupdate',
                {
                    client_nickname: config.clientName
                },
                function (error, response, rawResponse) {
                    if (error !== undefined) logger.log('error', error);
                    logger.log('info', 'Client name changed successfully.');
                    callback();
            });
        },

        // Register to the server for private text messages. This will ensure we can receive private text
        // messages once registered to the server.
        registerForPrivateTextMessages: function (callback) {
            serverQueryClient.send(
                'servernotifyregister',
                {
                    event: 'textprivate'
                },
                function (error, response, rawResponse) {
                    if (error !== undefined) logger.log('error', error);
                    logger.log('info', 'Registered for private textmessages successfully.');
                    callback();
            });
        },

        // Register to the server for server events. This will ensure we can hook into server events
        // like 'onConnect' to get notified when a client connects to the server.
        registerForServerEvents: function (callback) {
            serverQueryClient.send(
                'servernotifyregister',
                {
                    event: 'server'
                },
                function (error, response, rawResponse) {
                    if (error !== undefined) logger.log('error', error);
                    logger.log('info','Registered for server events successfully.');
                    callback();
            });
        },

        // Register to the server for receiving text message within a specified channel (lobby).
        registerForTextServer: function (callback) {
            serverQueryClient.send(
                'servernotifyregister',
                {
                    event: 'textchannel', id: '3'
                },
                function (error, response, rawResponse) {
                    if (error !== undefined) logger.log('error', error);
                    logger.log('info', 'Registered for textchannel events successfully.');
                    callback();
            });
        },

        // Connect to database to ensure the database is installed and available.
        connectDatabase: function (callback) {
            database.createDatabase(function (error, response) {
                if (error !== null) {
                    logger.log('debug', 'Database error: ' + error);
                    logger.log('error', 'Could not connect to database. Aborting.');
                    process.exit();
                } else {
                    logger.log('info', 'Connected to database.');
                    logger.log('info', 'Starting database clean-up routine.');
                    callback();
                }
            });
        },

        // Clean-up routine to delete old/inactive clients from the teamspeak servers SQLite database.
        // Because of the amount of hits to the SQLite database. This function is one of the reasons
        // why the host of this program should be whitelisted for the teamspeak server.
        databasePurge: function (callback) {
            databasePurge.databaseCleanup(serverQueryClient);
            callback();
        },

        // Routine to move idle clients from the lobby to a designated AFK channel. Timer for this routine
        // can be adjusted via the config file.
        clientIdleMove: function (callback) {
            if (config.MoveAfkClientsFromLobby === true) {
                logger.log('info', 'Moving AFK-clients is active and running.');
                clientIdleMove.moveClient(serverQueryClient);
            }
            callback();
        },

        // matchup: function (callback) {
        //     matchup.getMatchups(function (error, response) {
        //         logger.log('debug', 'getMatchup error object: ' + error);
        //         logger.log('debug', 'getMatchup response object: ' + response);
        //         logger.log('debug', 'Type of matchup: ' + typeof(response));
        //
        //         var currentConfig = config;
        //         logger.log('debug', 'Current config.json: ' + util.inspect(currentConfig));
        //         currentConfig.worldsAllowed = response;
        //         fs.writeFile('./config.json', JSON.stringify(currentConfig, null, 4), function(error) {
        //             if (error) logger.log('error','Error while saving config.' + error);
        //             logger.log('info', 'Configuration saved successfully');
        //         });
        //     });
        //     callback();
        // }
    },
    // End of the async series.
    function (error, result) {
        logger.log('info', 'End of start-up routine.');
    });

    // This is all the behavior regarding text messages. This behavior has been tested and has proven to be working as
    // expected. All error handling neccessary is included and can be refined to avoid code duplication.
    // One thing that should be improved:
    // Since we have a comprehensive database of API-keys, we might consider checking for any API-key first in the
    // local storage (mongodB) and secondly validate against the official API.
    serverQueryClient.on('textmessage', function (response) {
        var message = new chatMessage();
        if (response.invokername != config.clientName && response.msg.length === 72) {
            api.account(response, function (error, response) {
                logger.log('debug', 'api.account_callback_err: ' + util.inspect(error));
                logger.log('debug', 'api.account_callback_res:\n' + util.inspect(response));
                var clientObject = response;
                if (error !== null) {
                    logger.log('debug', 'Error while checking API-key.\n' + util.inspect(error));
                    var message = new chatMessage();
                    // Check error cases here.
                    // If error object contains 'accountWorldName' and 'accountWorldId' which only is set if account is associated with foreign world.
                    if (error.accountWorldName !== undefined && error.accountWorldId != config.homeWorld) {
                        logger.log('debug', 'Foreign world on registration.\n' + util.inspect(error));
                        logger.log('info', 'Foreign world on registration.\n' + '(' + error.invokerid + ')' + error.invokername + ': ' + error.invokeruid + ' \'' + error.apiKey + '\' ' + error.accountWorldName);
                        serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', error));
                    }
                    // If server responds with https status code 400 (invalid key).
                    if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'invalid key') {
                        logger.log('debug', 'Invalid key on registration.\n' + util.inspect(error));
                        logger.log('info', 'Invalid key on registration.\n' + '(' + error.invokerid + ')' + error.invokername + ': ' + error.invokeruid + ' \'' + error.apiKey + '\'');
                        serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', error));
                    }
                    // If server responds with http status code 400 (ErrBadData).
                    if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'ErrBadData') {
                        logger.log('debug', 'Server responding with \'ErrBadData\' on registration.\n' + util.inspect(error));
                        logger.log('info', 'Server responding with \'ErrBadData\' on registration.');
                        serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', error));
                    }
                    // If server responds with http status code 503 (Server busy).
                    if (error.apiServerStatus === 503) {
                        logger.log('debug', 'Server responding with \'Server busy\' on registration.' + util.inspect(error));
                        logger.log('info', 'Server responding with \'Server busy\' on registration.');
                        serverQueryClient.send('sendtextmessage', message.chatSend('api503', error));
                    }
                } else {
                    // No error process valid data.
                    // Account and world checked, verified member.
                    database.updateAccountInformation(response, function (error, response) {
                        logger.log('debug', '[TEST RESPONSE] : ' + response);
                        logger.log('debug', 'Error of \'database.updateAccountInformation()\' on registration ' + util.inspect(error));
                        logger.log('debug', 'Response of \'database.updateAccountInformation()\' on registration ' + util.inspect(response));
                        if (error !== null) {
                            var message = new chatMessage();
                            serverQueryClient.send('sendtextmessage', message.chatSend('alreadyInUse', clientObject));
                        } else {
                            logger.log('info', 'Added account information to database.\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                            serverQueryClient.send('clientgetdbidfromuid', {cluid: clientObject.invokeruid}, function (error, response){
                                if (error !== undefined) {
                                    logger.log('error', 'Error while clientgetdbidfromuid: ' + clientObject.invokeruid + util.inspect(error));
                                } else {
                                    logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                                    logger.log('debug' , '[TEST GRANT PERMISSIONS]: ' + util.inspect(clientObject));
                                    if (clientObject.world === "2009") {
                                        serverQueryClient.send('servergroupaddclient', {sgid: 14, cldbid: response.cldbid});
                                        serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.invokerid, msg: config.confirmAccessMsg});
                                    }

                                    if (clientObject.world === undefined || clientObject.world === "2003") {
                                        serverQueryClient.send('servergroupaddclient', {sgid: 9, cldbid: response.cldbid});
                                        serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.invokerid, msg: config.confirmAccessMsg});
                                    }
                                }
                            });
                        }
                    });
                }
            });

        } else if (config.adminReport.indexOf(response.invokeruid) != -1) {
            serverQueryClient.send('sendtextmessage', message.chatSend('admin', response));
            logger.log('info', 'Received message from admin: ' + '\n' + '\'' + response.msg + '\'');
            logger.log('debug', 'ResponseOnject on AdminMessage: ' + util.inspect(response));
            if (response.msg.length > 1) {
                var AdminMessageArray = response.msg.split(' ');
                logger.log('debug', 'AdminMessageArray after split() ' + AdminMessageArray);
                if (AdminMessageArray[0] === '!move') {
                    var clid = AdminMessageArray[1];
                    serverQueryClient.send('clientmove', {clid: clid, cid: config.afkChannel}, function (error, response) {
                        if (error !== undefined) {
                            logger.log('error', 'While \'clientmove\': ' + error.msg);
                            logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error));
                        } else {
                            logger.log('info', 'Sending idle poke.');
                            serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clid, msg: config.idleMove});
                        }
                    });
                }
            }
        } else if (response.invokername != config.clientName && response.msg.length != 72) {
            // No response to an obviously invalid key.
        }
    });

    //Listen on server event 'cliententerview'.
    serverQueryClient.on('cliententerview', function(response){
        var clientObject             = response;
            clientObject.invokername = clientObject.client_nickname;
            clientObject.invokeruid  = clientObject.client_unique_identifier;
            clientObject.invokerdbid = clientObject.client_database_id;
            clientObject.invokerid   = clientObject.clid;
            var serverGroupsArray = [];
        //If a user is connecting via the teamspeak client, ignore server query clients.
        if (clientObject.client_type === 0) {
            //Server groups should always be a string even if it's just a single one.
            var groups = clientObject.client_servergroups.toString();
            logger.log('debug', 'Server groups: ' + clientObject.client_servergroups.toString());
            //if (groups.match(config.verifiedClientServerGroupId) === null) {
            logger.log('debug', 'String of server groups: ' + config.verifiedClientServerGroupId.indexOf(clientObject.client_servergroups.toString()));

            async.series({
                purgeServerGroups: function (callback) {
                    serverGroups.purgeClient(serverQueryClient, clientObject, function (error, response) {
                        if (error) logger.log('debug', 'serverGroups.purgeClient error' + error);
                        logger.log('debug', 'serverGroups.purgeClient response: ' + response);
                    });
                    callback();
                },
                serverGroups: function(callback){
                    var serverGroups = groups.split(',');
                    serverGroups.forEach(function(serverGroup) {
                        logger.log('debug', 'servergroup: ' + serverGroup);
                        logger.log('debug', 'ServerGroup match: ' + config.verifiedClientServerGroupId.indexOf(serverGroup));
                        serverGroupsArray.push(config.verifiedClientServerGroupId.indexOf(serverGroup));
                    });
                    callback(null, serverGroupsArray);
                    console.log('debug', 'CALLBACK serverGroupsArray: ' + serverGroupsArray);
                }
            },
            function (error, result) {
                logger.log('debug', 'error: ' + error);
                logger.log('debug', 'result: ' + util.inspect(result));
                logger.log('debug', 'result.serverGroups.indexOf(0): ' + result.serverGroups.indexOf(0));
                if (result.serverGroups.indexOf(0) != -1 || result.serverGroups.indexOf(1) != -1) {
                    logger.log('debug', 'Recognized a verified user.');
                    logger.log('info', 'Noticed verified client:\n' + '(' + clientObject.clid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                    database.getApiKey(clientObject, function (error, response) {
                        logger.log('debug', 'Database get API key error: ' + util.inspect(error));
                        logger.log('debug', 'Database get API key response: ' + util.inspect(response));
                        if (error !== null) {
                            logger.log('error', 'While receiving API-key from database.\n' + util.inspect(error));
                        } else {
                            logger.log('debug', 'Received API-key from database.\n' + util.inspect(response));
                            logger.log('info', 'Received API-key from database.');
                            if (response !== undefined) {
                                switch(response.gw2_api_key){
                                    case null:
                                        logger.log('info', 'Verified client without API-Key, preparing welcome message.');
                                        //Remove permissions here!
                                        var message = new chatMessage();
                                        serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValidNull', clientObject));
                                        var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n' + '[B]' + 'world: ' + '[/B]' + clientObject.accountWorldName;
                                        config.adminReport.forEach(function (client) {
                                            serverQueryClient.send('messageadd', {cluid: client, subject: 'Revoked client permissions because API-key was NULL', message: report});
                                        });
                                        serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: clientObject.invokerdbid});
                                        var message = new chatMessage();
                                        serverQueryClient.send('sendtextmessage', message.chatSend('welcome', clientObject));
                                        break;
                                    case undefined:
                                        logger.log('debug', 'Undefined API for this user!');
                                        logger.log('debug', 'clientObject: ' + util.inspect(clientObject));
                                        database.setNewUser(clientObject, function(error, response) {
                                            logger.log('debug', 'error: ' + error);
                                            logger.log('debug', 'response: ' + response);
                                            logger.log('debug', 'Set new user!');
                                        });
                                        break;
                                    default:
                                        clientObject.apiKey         = response.gw2_api_key;
                                        clientObject.accountId      = response.gw2_account_id;
                                        clientObject.world          = response.gw2_account_world;
                                        clientObject.accountName    = response.gw2_account_name;
                                        clientObject.guilds         = response.gw2_guilds;
                                        clientObject.accountCreated = response.gw2_account_created;
                                        database.updateLastSeenVerified(clientObject, function (error, response) {
                                            if (error !== null) {
                                                logger.log('error', 'While updating last_seen.\n' + util.inspect(error));
                                            } else {
                                                logger.log('info', 'Updated last_seen.\n' + '(' + clientObject.clid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                                                logger.log('debug', 'clientObject_after_last_seen_update:\n' + util.inspect(clientObject));
                                                //Account validation and error handling.
                                                api.account(clientObject, function (error, response) {
                                                    if (error !== null) {
                                                        logger.log('debug', 'Error while checking API-key.\n' + util.inspect(error));
                                                        //If API-key is invalid.
                                                        if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'invalid key') {
                                                            database.delApiKey(error, function(error, response) {
                                                                logger.log('debug', 'Error object callback after database.delApiKey:\n' + util.inspect(error));
                                                                logger.log('debug', 'Response object callback after database.delApiKey:\n' + util.inspect(response));
                                                                if (error !== null) {
                                                                    logger.log('error', 'while deleting API-Key via database.delApiKey.');
                                                                } else {
                                                                    logger.log('info', 'Removed gw2_api_key from database' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid + ' \'' + clientObject.apiKey + '\'');
                                                                    var message = new chatMessage();
                                                                    serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', clientObject));
                                                                    serverQueryClient.send('clientgetdbidfromuid', {cluid: clientObject.invokeruid}, function (error, response){
                                                                        logger.log('debug', 'error: ' + util.inspect(error));
                                                                        logger.log('debug', 'response: ' + util.inspect(response));
                                                                        if (error !== undefined) {
                                                                            logger.log('error', 'Error while receiving cldbid: ' + error);
                                                                        } else {
                                                                            var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n' + '[B]' + 'api-key: ' + '[/B]' + clientObject.apiKey;
                                                                            config.adminReport.forEach(function (client) {
                                                                                serverQueryClient.send('messageadd', {cluid: client, subject: 'Deleted client because of invalid key', message: report});
                                                                            });
                                                                            logger.log('debug', 'Remove servergroups : ' + clientObject.client_servergroups);
                                                                            async.series({
                                                                                userState: function (callback) {
                                                                                    var userState;
                                                                                    var serverGroups = groups.split(',');
                                                                                    serverGroups.forEach(function(serverGroup) {
                                                                                        if (config.verifiedClientServerGroupId.indexOf(serverGroup) != -1) {
                                                                                            serverQueryClient.send('servergroupdelclient', {sgid: serverGroup, cldbid: clientObject.invokerdbid});
                                                                                        }
                                                                                    });
                                                                                    callback();
                                                                                },
                                                                            },
                                                                            function (error, result) {
                                                                                logger.log('info', 'Removed server groups.');
                                                                            });
                                                                            database.setNewUser(clientObject, function(error, response) {
                                                                                logger.log('debug', 'error: ' + error);
                                                                                logger.log('debug', 'response: ' + response);
                                                                                logger.log('debug', 'Set new user!');
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                        //If worldId is invalid.
                                                        if (error.accountWorldId !== undefined) {
                                                            database.delApiKey(error, function(error, response) {
                                                                logger.log('debug', 'Error object callback after database.delApiKey:\n' + util.inspect(error));
                                                                logger.log('debug', 'Response object callback after database.delApiKey:\n' + util.inspect(response));
                                                                if (error !== null) {
                                                                    logger.log('error', 'dbError: ' + util.inspect(error));
                                                                } else {
                                                                    logger.log('info', 'Removed gw2_api_key from database' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid + ' \'' + clientObject.apiKey + '\'');
                                                                    var message = new chatMessage();
                                                                    serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', clientObject));
                                                                    var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n' + '[B]' + 'world: ' + '[/B]' + clientObject.accountWorldName;
                                                                    config.adminReport.forEach(function (client) {
                                                                        serverQueryClient.send('messageadd', {cluid: client, subject: 'Deleted client because of foreign world', message: report});
                                                                    });
                                                                    logger.log('debug', 'Remove servergroups : ' + clientObject.client_servergroups);
                                                                    async.series({
                                                                        userState: function (callback) {
                                                                            var userState;
                                                                            var serverGroups = groups.split(',');
                                                                            serverGroups.forEach(function(serverGroup) {
                                                                                if (config.verifiedClientServerGroupId.indexOf(serverGroup) != -1) {
                                                                                    serverQueryClient.send('servergroupdelclient', {sgid: serverGroup, cldbid: clientObject.invokerdbid});
                                                                                }
                                                                            });
                                                                            callback();
                                                                        },
                                                                    },
                                                                    function (error, result) {
                                                                        logger.log('info', 'Done purging server groups.');
                                                                    });
                                                                }
                                                            });
                                                        }
                                                        if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'ErrBadData') {
                                                            var message = new chatMessage();
                                                            serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', clientObject));
                                                        }
                                                        if (error.apiServerStatus === 503) {
                                                            var message = new chatMessage();
                                                            serverQueryClient.send('sendtextmessage', message.chatSend('api503', clientObject));
                                                        }
                                                    } else {
                                                        //Client revalidated, update account related information in database.
                                                        logger.log('debug', 'Checked verified user.\n' + util.inspect(response));
                                                        logger.log('info', 'Checked verified user, all good!');
                                                        database.updateAccountInformation(response, function (error, response) {
                                                            if (error !== null) {
                                                                logger.log('error', 'dbError: ' + util.inspect(error));
                                                            } else {
                                                                logger.log('info','Updated API-key related information in database.');
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                        break;
                                }
                            } else {
                                database.setNewUser(clientObject, function(error, response) {
                                    logger.log('debug', 'Error of \'database.setNewUser\' on connect.\n' + util.inspect(error));
                                    logger.log('debug', 'Response of \'database.setNewUser\' on connect.\n' + util.inspect(response));
                                    if (error !== null) {
                                        logger.log(
                                            'info',
                                            'Noticed unregistered user re-visiting on connect.\n'+
                                            '(' + clientObject.invokerid + ')' +
                                            clientObject.invokername +
                                            ' \'' + clientObject.invokeruid + '\''
                                        );
                                    } else {
                                        logger.log(
                                            'info',
                                            'Added new client:\n' +
                                            '(' + clientObject.invokerid + ')' +
                                            clientObject.invokername +
                                            ' \'' + clientObject.invokeruid + '\''
                                        );
                                        logger.log('info', 'Unknown client! Preparing welcome message..');
                                        //Remove permissions here!
                                        var message = new chatMessage();
                                        serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValidNull', clientObject));
                                        var report  = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' +
                                                      '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n' +
                                                      '[B]' + 'world: ' + '[/B]' + clientObject.accountWorldName;
                                        config.adminReport.forEach(function (client) {
                                            serverQueryClient.send('messageadd', {
                                                cluid: client,
                                                subject: 'Revoked client permissions for client without database entry.',
                                                message: report
                                            });
                                        });
                                        config.verifiedClientServerGroupId.forEach(function (serverGroupId) {
                                            serverQueryClient.send('servergroupdelclient', {
                                                sgid: serverGroupId,
                                                cldbid: clientObject.invokerdbid
                                            });
                                        });
                                        var message = new chatMessage();
                                        serverQueryClient.send('sendtextmessage', message.chatSend('welcome', clientObject));
                                    }
                                });
                            }
                        }
                    });
                } else {
                    logger.log('info', 'Recognized an unverified user.');
                    database.setNewUser(clientObject, function(error, response) {
                        logger.log('debug', 'Error of \'database.setNewUser\' on connect.\n' + util.inspect(error));
                        logger.log('debug', 'Response of \'database.setNewUser\' on connect.\n' + util.inspect(response));
                        if (error !== null) {
                            logger.log('info', 'Noticed unregistered user re-visiting on connect.\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ' \'' + clientObject.invokeruid + '\'');
                        } else {
                            logger.log('info', 'Added new client:\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ' \'' + clientObject.invokeruid + '\'');
                        }
                    });
                    var message = new chatMessage();
                    serverQueryClient.send('clientpoke', message.chatSend('welcomePoke', response));
                    serverQueryClient.send('sendtextmessage', message.chatSend('welcome', response));
                }
            });
        }
    });

    serverQueryClient.on('queryError', function (error, response) {
        //Error id for banned status.
        if (error.id === '3329') {
            logger.log('error', 'I am banned');
        }
        //Error id for invalid loginname or password.
        if (error.id === '520') {
            logger.log('error', 'Invalid loginname or password');
        }
    });
    serverQueryClient.on('error', function (error, response, rawResponse) {
        if (error !== undefined) {
            logger.log('error', 'An error occured on close!');
            logger.log('debug', 'An error occured on close: ' + '\n' + util.inspect(error));
        }
        if (response !== undefined) {
            logger.log('info', 'An error occured on close!');
            logger.log('debug', 'Response on close: ' + '\n' + util.inspect(response));
        }
        if (rawResponse !== undefined) {
            logger.log('error', 'An error occured on close!');
            logger.log('debug', 'An error has occured: ' + '\n' + util.inspect(rawResponse));
        }
    });
    serverQueryClient.on('close', function (error, response) {
        if (error !== undefined) {
            logger.log('info', 'Close event has been fired!');
            logger.log('debug', 'Close event has been fired! (err)' + '\n' + util.inspect(error));
        }
        if (response !== undefined) {
            logger.log('info', 'Close event has been fired!');
            logger.log('debug', 'Close event has been fired! (res)' + '\n' + util.inspect(response));
        }
        //Try to reconnect/restart after 3 seconds
        setTimeout(function() {
            ts3bot();
        }, 3000);
    });
})();
