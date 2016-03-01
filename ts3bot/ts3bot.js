#!/usr/bin/node

var TeamSpeakClient = require('node-teamspeak'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    util            = require('util'),
    https           = require('https'),
    logger          = require('./logger'),
    chatMessage     = require('./chatMessage')
    api             = require('./api'),
    database        = require('./database'),
    async           = require('async'),
    colors          = require('colors');

function unixTime() {
    var unixStamp = Math.round((new Date()).getTime() / 1000);
    return unixStamp;
};

function deleteClientFromTsDatabase (serverQueryClient, client, callback) {
    serverQueryClient.send('clientdbdelete', {'cldbid': client.cldbid},
        function (error, response) {
            //console.log('error: ', error);
            //console.log('response: ', response);
            if(error) callback(error, null);
            callback(null, client);
    });
};


function checkClientList (serverQueryClient, offset, callback) {
    console.log('offset: ' + offset);
    // var allClients  = clientList;
    // var clientCount = 0;
    serverQueryClient.send('clientdblist', {start: offset, duration: 7200},
        function (error, response) {
            // console.log(colors.bold('error: ' + error));
            // console.log(colors.bold('response: ' + util.inspect(response)));
            // console.log(colors.green('TEST: ' + response.length));
            // console.log(colors.green('TEST_clientCount: ' + clientCount));
            if (error === undefined) {
                console.log('got some clients from ts-server.');
                // clientCount = response.length;
                // allClients.push(response);
                // checkClientList(serverQueryClient, (offset += 200), allClients);
                callback(null, response);
            } else {
                console.log('received empty list! = No clients in this batch!');
                callback(error, null);
            };
    });
};

//Search for old clients 'last_seen' older than 91 days
//and delete them from the bot's database.
function databaseCleanup(serverQueryClient) {

    var deletedClients = [];
    var clientList     = [];
    var offset         = 0;

    serverQueryClient.send('clientdblist', ['count'], function (error, response) {
        console.log(colors.red('error: ' + util.inspect(error)));
        console.log(colors.bold(util.inspect(response[0].count)));

        var totalClientsInDatabase = response[0].count;

        while (offset <= totalClientsInDatabase) {

            checkClientList(serverQueryClient, offset, function (error, callback) {

                console.log(colors.yellow('WOOHA ERROR: ' + util.inspect(error)));
                console.log(colors.blue('WOOHA: ' + util.inspect(callback)));

                if (error === null) {

                    console.log('Completed collecting clientdblist: ' + util.inspect(clientList));

                    var timeConstraint = {'ninetyOneDays': '7862400'}
                    ,   timeNow        = unixTime()
                    ,   ninetyOneDays  = timeNow - timeConstraint.ninetyOneDays
                    ,   clientList     = callback
                    ,   deletedClients = []
                    ,   oldClients     = []
                    ,   completeReport = []
                    ,   report         = '';

                    async.series({

                        one: function (callback) {

                            if(clientList != undefined){
                                clientList.forEach(function (client) {
                                    if (client.client_lastconnected < ninetyOneDays) {
                                        var clientToBeDeleted = client;
                                        oldClients.push(clientToBeDeleted);
                                        logger.log('debug', 'Old clients: ' + util.inspect(oldClients));
                                    }
                                });
                                callback();
                            } else {
                                console.log('clientList is empty!');
                            }
                        },

                        /* Delete old clients from TS-server database. */
                        two: function (callback) {
                            console.log(colors.dim('debug', 'Old clients: ' + util.inspect(oldClients)));
                            oldClients.forEach(function (client) {
                                serverQueryClient.send('clientdbdelete', {cldbid: client.cldbid}, function (error, response) {
                                    if(error) console.log('error', 'Deleting from TS database error: ' + util.inspect(error));
                                    console.log('debug', 'Deleting from TS database response: ' + util.inspect(response));
                                });
                            });
                            callback();
                        },

                        /* Delete old clients from TS3Bot database. */
                        three: function (callback) {
                            console.log(colors.dim('debug', 'Old clients: ' + util.inspect(oldClients)));
                            oldClients.forEach(function (client) {
                                console.log('debug', 'Client to delete from mongodb:' + util.inspect(client));
                                database.delClient(client, function (error, cb) {
                                    if(error) console.log('database.delClient.cb_error: ' + error);
                                    console.log('database.delClient.cb_deletedCount: ' + util.inspect(cb.deletedCount));
                                });
                            });
                            callback();
                        },

                        /* Prepare report for admins. */
                        four:  function (callback) {
                            oldClients.forEach(function (client) {
                                var report = '[B]' + 'cluid: ' + '[/B]' + client.client_unique_identifier + '\n' + '[B]' + 'nick: ' + '[/B]' + client.client_nickname + '\n';
                                completeReport.push(report);
                                console.log('debug', 'Complete Report: ' + completeReport);
                            });
                            callback();
                        }
                    },

                    /* Send message to all admin clients. */
                    function (error, result) {
                        if (completeReport.length != 0) {
                            config.adminReport.forEach(function (client) {
                                //console.log(colors.bold('TEST:' + client));
                                /* Send reports here -> query TS command to send prepared report for every admin client. */
                                serverQueryClient.send('messageadd', {cluid: client
                                                                    , subject: 'Database-Cleanup - List of deleted clients older than 90 days.'
                                                                    , message: completeReport.toString().replace(/,/g, '\n')}
                                                                    , function (error, response) {
                                     if(error) console.log('Report to admin_error: ' + util.inspect(error));
                                     console.log('Report to admin_response: ' + util.inspect(response));
                                });
                            });
                        }
                    });
                }
            });
            offset += 200;
        }
    });

};

//Function to move idle client from cleanChannel(lobby) to config.afkChannel(AFK-Channel).
function moveClient(serverQueryClient) {
    serverQueryClient.send('clientlist', ['times'], function (error, response, rawResponse) {
        logger.log('debug', 'clientlist -times _error.\n' + util.inspect(error));
        logger.log('debug', 'clientlist -times _response.\n' + util.inspect(response));
        if (error != null) {
            logger.log('error', 'While \'clientlist -times\'.\n' + util.inspect(error));
            serverQueryClient.emit('close');
        } else {
            for (user in response) {
                //Declare server query clients
                var serverQueryClientType = 1;
                /*recognize only clients of client_type(0),
                  clients that are idle for more than idleTimeLimit and
                  clients that are currently in cleanChannel.*/
                if (response[user].client_type != serverQueryClientType && response[user].client_idle_time >= config.idleTimeLimit && response[user].cid === config.cleanChannel) {
                    logger.log('debug', 'Moving idle user.\n' + util.inspect(response[user]));
                    logger.log('info', 'Moving idle user.\n' + '(' + response[user].clid + ')' + response[user].client_nickname + '(cldbid: ' + response[user].client_database_id + ')');

                    var clientObject = {};
                        clientObject.clid = response[user].clid;

                    serverQueryClient.send('clientmove', {clid: clientObject.clid, cid: config.afkChannel}, function (error, response) {
                        logger.log('debug', 'clientmove_error.\n' + util.inspect(error));
                        //logger.log('debug', 'clientmove_response.\n' + util.inspect(response));
                        if (error != undefined) {
                            logger.log('error', 'While \'clientmove\'');
                            logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error));
                        } else {
                            logger.log('info', 'Sending idle poke.');
                            logger.log('debug', 'Sending idle poke.\n' + util.inspect(clientObject));
                            serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.clid, msg: config.idleMove});
                        };
                    });
                };
            };
        };
        setTimeout(function() {
            moveClient(serverQueryClient);
        }, 30000);
    });
};

(function ts3bot() {

    var serverQueryClient = new TeamSpeakClient(config.host, config.port);

    serverQueryClient.send('login', {client_login_name: config.loginName, client_login_password: config.clientPassword}, function (error, response, rawResponse){
        if (error != undefined) {
            logger.log('error', error);
        } else {
            logger.log('info', 'Login successful.');
            //Select virtual server by virtualServerId.
            serverQueryClient.send('use', {sid: config.virtualServerId}, function (error, response, rawResponse){
                if (error != undefined) {
                    logger.log('error', error);
                } else {
                    logger.log('info', 'Virtual server selected successfully.');
                    //Clientupdate to change the name that's presented to the user.
                    serverQueryClient.send("clientupdate", {client_nickname: config.clientName}, function (error, response, rawResponse) {
                        if (error != undefined) {
                            logger.log('error', error);
                        } else {
                            logger.log('info', 'Client name changed successfully.');
                            //Register with server to be able to read incoming private messages.
                            serverQueryClient.send('servernotifyregister', {event: 'textprivate'}, function (error, response, rawResponse) {
                                if (error != undefined) {
                                    logger.log('error', error);
                                } else {
                                    logger.log('info', 'Registered for private textmessages successfully.');
                                    //Register with server to recognize user entering the server.
                                    serverQueryClient.send('servernotifyregister', {event: 'server'}, function (error, response, rawResponse) {
                                        if (error != undefined) {
                                            logger.log('error', error);
                                        } else {
                                            logger.log('info','Registered for server events successfully.');
                                            //Register for channel messages.
                                            serverQueryClient.send('servernotifyregister', {event: 'textchannel', id: '3'}, function (error, response, rawResponse) {
                                                if (error != undefined) {
                                                    logger.log('error', error);
                                                } else {
                                                    logger.log('info', 'Registered for textchannel events successfully.');
                                                    //Register with server to recognize user entering a specific channel.
                                                    serverQueryClient.send('servernotifyregister', {event: 'textserver'}, function (error, response, rawResponse) {
                                                        if (error != undefined) {
                                                            logger.log('error', error);
                                                        } else {
                                                            logger.log('info', 'Registered for textserver events successfully.');
                                                            logger.log('info', 'Checking for database.');
                                                            database.createDatabase(function (error, response) {
                                                                if (error != null) {
                                                                    if (error.errno === 1) {
                                                                        logger.log('info', 'Using existing database.');
                                                                        logger.log('info', 'Starting database clean-up routine.');
                                                                        databaseCleanup(serverQueryClient);
                                                                        if (config.MoveAfkClientsFromLobby === true) {
                                                                            logger.log('info', 'Moving AFK-clients is active and running.');
                                                                            moveClient(serverQueryClient);
                                                                        };
                                                                    } else {
                                                                        logger.log('error', 'Unhandled error while creating database.');
                                                                    };
                                                                } else {
                                                                    logger.log('info', 'Creating new database and \'clients\' table.');
                                                                    if (config.MoveAfkClientsFromLobby === true) {
                                                                        logger.log('info', 'Moving AFK-clients is active and running.');
                                                                        moveClient(serverQueryClient);
                                                                    };
                                                                };
                                                            });
                                                        };
                                                    });
                                                };
                                            });
                                        };
                                    });
                                };
                            });
                        };
                    });
                };
            });
        };
    });


    //listen on incoming private messages.
    serverQueryClient.on('textmessage', function (response) {
        if (response.invokername != config.clientName && response.msg.length === 72) {
            api.account(response, function (error, response) {
                logger.log('debug', 'api.account_callback_err: ' + util.inspect(error));
                logger.log('debug', 'api.account_callback_res:\n' + util.inspect(response));
                var clientObject = response;
                if (error != null) {
                    logger.log('debug', 'Error while checking API-key.\n' + util.inspect(error));
                    //check error cases here!
                    //If error object contains 'accountWorldName' and 'accountWorldId' which only is set if account is associated with foreign world.
                    if (error.accountWorldName != undefined && error.accountWorldId != config.homeWorld) {
                        logger.log('debug', 'Foreign world on registration.\n' + util.inspect(error));
                        logger.log('info', 'Foreign world on registration.\n' + '(' + error.invokerid + ')' + error.invokername + ': ' + error.invokeruid + ' \'' + error.apiKey + '\' ' + error.accountWorldName);
                        var message = new chatMessage();
                        serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', error));
                    };
                    //If server responds with https status code 400 (invalid key).
                    if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'invalid key') {
                        logger.log('debug', 'Invalid key on registration.\n' + util.inspect(error));
                        logger.log('info', 'Invalid key on registration.\n' + '(' + error.invokerid + ')' + error.invokername + ': ' + error.invokeruid + ' \'' + error.apiKey + '\'');
                        var message = new chatMessage();
                        serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', error));
                    };
                    //If server responds with http status code 400 (ErrBadData).
                    if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'ErrBadData') {
                        logger.log('debug', 'Server responding with \'ErrBadData\' on registration.\n' + util.inspect(error));
                        logger.log('info', 'Server responding with \'ErrBadData\' on registration.');
                        var message = new chatMessage();
                        serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', error));
                    };
                    //If server responds with http status code 503 (Server busy).
                    if (error.apiServerStatus === 503) {
                        logger.log('debug', 'Server responding with \'Server busy\' on registration.' + util.inspect(error));
                        logger.log('info', 'Server responding with \'Server busy\' on registration.');
                        var message = new chatMessage();
                        serverQueryClient.send('sendtextmessage', message.chatSend('api503', error));
                    };
                } else {
                    //no error process valid data.
                    //Account and world checked, verified Gandaran!
                    database.updateAccountInformation(response, function (error, response) {
                        logger.log('debug', 'Error of \'database.updateAccountInformation()\' on registration' + util.inspect(error));
                        logger.log('debug', 'Response of \'database.updateAccountInformation()\' on registration' + util.inspect(response));
                        if (error != null) {
                            switch(error.errno) {
                                case 19:
                                    var message = new chatMessage();
                                    serverQueryClient.send('sendtextmessage', message.chatSend('alreadyInUse', clientObject));
                                    break;

                                default:
                                    logger.log('error', 'While updating database.\n' + util.inspect(error));
                                    break;
                            };
                        } else {
                            logger.log('info', 'Added account information to database.\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                            serverQueryClient.send('clientgetdbidfromuid', {cluid: clientObject.invokeruid}, function (error, response){
                                if (error != undefined) {
                                    logger.log('error', 'Error while clientgetdbidfromuid: ' + clientObject.invokeruid + util.inspect(error));
                                } else {
                                    logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                                    logger.log('debug', 'SUCCESS, member permissions granted for: ' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid + ' \'' + clientObject.apiKey + '\'');
                                    serverQueryClient.send('servergroupaddclient', {sgid: config.verifiedClientServerGroupId, cldbid: response.cldbid});
                                    serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.invokerid, msg: config.confirmAccessMsg});
                                };
                            });
                        };
                    });
                };
            });

        } else if (config.adminReport.indexOf(response.invokeruid) != -1) {
            var message = new chatMessage();
            serverQueryClient.send('sendtextmessage', message.chatSend('admin', response));
            logger.log('info', 'Received message from admin: ' + '\n' + '\'' + response.msg + '\'');
            logger.log('debug', 'ResponseOnject on AdminMessage: ' + util.inspect(response));
            if (response.msg.length > 1) {
                var AdminMessageArray = response.msg.split(' ');
                logger.log('debug', 'AdminMessageArray after split() ' + AdminMessageArray);
                if (AdminMessageArray[0] === '!move') {
                    var clid = AdminMessageArray[1];
                    serverQueryClient.send('clientmove', {clid: clid, cid: config.afkChannel}, function (error, response) {
                        if (error != undefined) {
                            logger.log('error', 'While \'clientmove\': ' + error.msg);
                            logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error));
                        } else {
                            logger.log('info', 'Sending idle poke.');
                            serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clid, msg: config.idleMove});
                        };
                    });
                }
            }
        } else if (response.invokername != config.clientName && response.msg.length != 72) {
            var message = new chatMessage();
            serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid', response));
        };
    });

    //Listen on server event 'cliententerview'.
    serverQueryClient.on('cliententerview', function(response){
        var clientObject             = response;
            clientObject.invokername = clientObject.client_nickname;
            clientObject.invokeruid  = clientObject.client_unique_identifier;
            clientObject.invokerdbid = clientObject.client_database_id;
            clientObject.invokerid   = clientObject.clid;
        //If a user is connecting via the teamspeak client, ignore server query clients.
        if (clientObject.client_type === 0) {
            //Server groups should always be a string even if it's just a single one.
            var groups = clientObject.client_servergroups.toString();
            if (groups.match(config.verifiedClientServerGroupId) === null) {
                database.setNewUser(clientObject, function(error, response) {
                    logger.log('debug', 'Error of \'database.setNewUser\' on connect.\n' + util.inspect(error));
                    logger.log('debug', 'Response of \'database.setNewUser\' on connect.\n' + util.inspect(response));
                    if (error != null) {
                        logger.log('info', 'Noticed unregistered user re-visiting on connect.\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ' \'' + clientObject.invokeruid + '\'');
                    } else {
                        logger.log('info', 'Added new client:\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ' \'' + clientObject.invokeruid + '\'');
                    };
                });
                var message = new chatMessage();
                serverQueryClient.send('clientpoke', message.chatSend('welcomePoke', response));
                serverQueryClient.send('sendtextmessage', message.chatSend('welcome', response));
            } else {
                logger.log('info', 'Noticed verified client:\n' + '(' + clientObject.clid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                database.getApiKey(clientObject, function (error, response) {
                    if (error != null) {
                        logger.log('error', 'While receiving API-key from database.\n' + util.inspect(error));
                    } else {
                        logger.log('debug', 'Received API-key from database.\n' + util.inspect(response))
                        logger.log('info', 'Received API-key from database.');
                        if (response != undefined) {
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
                                default:
                                    clientObject.apiKey         = response.gw2_api_key;
                                    clientObject.accountId      = response.gw2_account_id;
                                    clientObject.accountName    = response.gw2_account_name;
                                    clientObject.guilds         = response.gw2_guilds;
                                    clientObject.accountCreated = response.gw2_account_created;
                                    database.updateLastSeenVerified(clientObject, function (error, response) {
                                        if (error != null) {
                                            logger.log('error', 'While updating last_seen.\n' + util.inspect(error));
                                        } else {
                                            logger.log('info', 'Updated last_seen.\n' + '(' + clientObject.clid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
                                            logger.log('debug', 'clientObject_after_last_seen_update:\n' + util.inspect(clientObject));
                                            //Account validation and error handling.
                                            api.account(clientObject, function (error, response) {
                                                if (error != null) {
                                                    logger.log('debug', 'Error while checking API-key.\n' + util.inspect(error));
                                                    //If API-key is invalid.
                                                    if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'invalid key') {
                                                        database.delApiKey(error, function(error, response) {
                                                            logger.log('debug', 'Error object callback after database.delApiKey:\n' + util.inspect(error));
                                                            logger.log('debug', 'Response object callback after database.delApiKey:\n' + util.inspect(response));
                                                            if (error != null) {
                                                                logger.log('error', 'while deleting API-Key via database.delApiKey.');
                                                            } else {
                                                                logger.log('info', 'Removed gw2_api_key from database' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid + ' \'' + clientObject.apiKey + '\'');
                                                                var message = new chatMessage();
                                                                serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', clientObject));
                                                                serverQueryClient.send('clientgetdbidfromuid', {cluid: clientObject.invokeruid}, function (error, response){
                                                                    if (error != null) {
                                                                        logger.log('error', 'Error while receiving cldbid: ' + error);
                                                                    } else {
                                                                        var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n' + '[B]' + 'api-key: ' + '[/B]' + clientObject.apiKey;
                                                                        config.adminReport.forEach(function (client) {
                                                                            serverQueryClient.send('messageadd', {cluid: client, subject: 'Deleted client because of invalid key', message: report});
                                                                        });
                                                                        serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: clientObject.invokerdbid});
                                                                    };
                                                                });
                                                            };
                                                        });
                                                    };
                                                    //If worldId is invalid.
                                                    if (error.accountWorldId != undefined && error.accountWorldId != config.homeWorld) {
                                                        database.delApiKey(error, function(error, response) {
                                                            logger.log('debug', 'Error object callback after database.delApiKey:\n' + util.inspect(error));
                                                            logger.log('debug', 'Response object callback after database.delApiKey:\n' + util.inspect(response));
                                                            if (error != null) {
                                                                logger.log('error', 'dbError: ' + util.inspect(error));
                                                            } else {
                                                                logger.log('info', 'Removed gw2_api_key from database' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid + ' \'' + clientObject.apiKey + '\'');
                                                                var message = new chatMessage();
                                                                serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', clientObject));
                                                                var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n' + '[B]' + 'world: ' + '[/B]' + clientObject.accountWorldName;
                                                                config.adminReport.forEach(function (client) {
                                                                    serverQueryClient.send('messageadd', {cluid: client, subject: 'Deleted client because of foreign world', message: report});
                                                                });
                                                                serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: clientObject.invokerdbid});
                                                            };
                                                        });
                                                    };
                                                    if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'ErrBadData') {
                                                        var message = new chatMessage();
                                                        serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', clientObject));
                                                    };
                                                    if (error.apiServerStatus === 503) {
                                                        var message = new chatMessage();
                                                        serverQueryClient.send('sendtextmessage', message.chatSend('api503', clientObject));
                                                    };
                                                } else {
                                                    //Client revalidated, update account related information in database.
                                                    logger.log('debug', 'Checked verified user.\n' + util.inspect(response));
                                                    logger.log('info', 'Checked verified user, all good!');
                                                    database.updateAccountInformation(response, function (error, response) {
                                                        if (error != null) {
                                                            logger.log('error', 'dbError: ' + util.inspect(error));
                                                        } else {
                                                            logger.log('info','Updated API-key related information in database.');
                                                        };
                                                    });
                                                };
                                            });
                                        };
                                    });
                                    break;
                            };
                        } else {
                            database.setNewUser(clientObject, function(error, response) {
                                logger.log('debug', 'Error of \'database.setNewUser\' on connect.\n' + util.inspect(error));
                                logger.log('debug', 'Response of \'database.setNewUser\' on connect.\n' + util.inspect(response));
                                if (error != null) {
                                    logger.log('info', 'Noticed unregistered user re-visiting on connect.\n'
                                                        + '(' + clientObject.invokerid + ')'
                                                        + clientObject.invokername + ' \''
                                                        + clientObject.invokeruid + '\'');
                                } else {
                                    logger.log('info', 'Added new client:\n'
                                                        + '(' + clientObject.invokerid + ')'
                                                        + clientObject.invokername
                                                        + ' \'' + clientObject.invokeruid + '\'');
                                    logger.log('info', 'Unknown client! Preparing welcome message..');
                                    //Remove permissions here!
                                    var message = new chatMessage();
                                    serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValidNull', clientObject));
                                    var report  = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n'
                                                + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n'
                                                + '[B]' + 'world: ' + '[/B]' + clientObject.accountWorldName;
                                    config.adminReport.forEach(function (client) {
                                        serverQueryClient.send('messageadd', {
                                            cluid: client,
                                            subject: 'Revoked client permissions for client without database entry.',
                                            message: report
                                        });
                                    });
                                    serverQueryClient.send('servergroupdelclient', {
                                        sgid: config.verifiedClientServerGroupId,
                                        cldbid: clientObject.invokerdbid
                                    });
                                    var message = new chatMessage();
                                    serverQueryClient.send('sendtextmessage', message.chatSend('welcome', clientObject));
                                };
                            });
                        };
                    };
                });
            };
        };
    });
    serverQueryClient.on('queryError', function (error, response) {
        //Error id for banned status.
        if (error.id === '3329') {
            logger.log('error', 'I am banned');
        };
        //Error id for invalid loginname or password.
        if (error.id === '520') {
            console.log('error', 'Invalid loginname or password')
        };
    });
    serverQueryClient.on('error', function (error, response, rawResponse) {
        if (error != undefined) {
            logger.log('error', 'An error occured on close!');
            logger.log('debug', 'An error occured on close: ' + '\n' + util.inspect(error));
        };
        if (response != undefined) {
            logger.log('info', 'An error occured on close!');
            logger.log('debug', 'Response on close: ' + '\n' + util.inspect(response));
        };
        if (rawResponse != undefined) {
            logger.log('error', 'An error occured on close!');
            logger.log('debug', 'An error has occured: ' + '\n' + util.inspect(rawResponse));
        };
    });
    serverQueryClient.on('close', function (error, response) {
        if (error != undefined) {
            logger.log('info', 'Close event has been fired!');
            logger.log('debug', 'Close event has been fired! (err)' + '\n' + util.inspect(error));
        };
        if (response != undefined) {
            logger.log('info', 'Close event has been fired!');
            logger.log('debug', 'Close event has been fired! (res)' + '\n' + util.inspect(response));
        };
        //Try to reconnect/restart after 3 seconds
        setTimeout(function() {
            ts3bot();
        }, 3000);
    });
})();
