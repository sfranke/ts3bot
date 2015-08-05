#!/usr/bin/node

var TeamSpeakClient = require('node-teamspeak'),
	config          = JSON.parse(require('fs').readFileSync('config.json')),
	util            = require('util'),
	https           = require('https'),
	sqlite          = require('sqlite3').verbose(),
	logger          = require('./logger'),
	chatMessage     = require('./chatMessage')
	api             = require('./api'),
	database        = require('./database');

function unixTime() {
	var unixStamp = Math.round((new Date()).getTime() / 1000);
	return unixStamp;
};

function databaseCleanup(serverQueryClient) {

	//console.log(serverQueryClient);

	//constant as typeof String for comparison in SQL statement.
	var constant = {
		'ninetyOneDays': '7862400'
	};

	var timeNow          = unixTime(),
	    ninetyOneDaysOld = timeNow - constant.ninetyOneDays;

	//Query database for old users.
	var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
	databaseConnection.serialize(function() {

		databaseConnection.each('SELECT * FROM `clients` WHERE `last_seen` <= (?)',ninetyOneDaysOld, function(err, response) {

			var cluid     = response.client_unique_id
			, nickname    = response.client_nickname
			, accountname = response.gw2_account_name;

			if (err != undefined) {
				console.log('error: ' + '\n' + util.inspect(err));
			} else {
				//Send offline message to admin
				logger.log('info', 'Found old client! ');

				serverQueryClient.send('clientgetdbidfromuid', {cluid: response.client_unique_id}, function (err, response){
					logger.log('info', 'Deleting client from TS3-server: ' + '\n\t' + ' UId: ' + response.cluid);
					serverQueryClient.send('clientdbdelete', {cldbid: response.cldbid}, function (err, response) {
						var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
						databaseConnection.serialize(function() {
							var statement = databaseConnection.prepare('UPDATE clients SET last_seen = ? WHERE client_unique_id = ?');
							statement.run(9999999999, cluid);
							statement.finalize();
							logger.log('info', 'Marked deleted clients in database.');
						});
						databaseConnection.close();
						
						var report = '[B]' + 'cluid: ' + '[/B]' + cluid + '\n' + '[B]' + 'nick: ' + '[/B]' + nickname + '\n' + '[B]' + 'account name: ' + '[/B]' + '\t' + accountname;
						serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Found old client', message: report}, function(err, response,rawResponse) {
						});
					});
				});
			};
		}, function(err, response) {
			if (response != 0) {
				logger.log('info', 'Found ' + response + ' old client(s).. ready for deletion.'); 
			} else {
				logger.log('info','All clients are up to date.')
			};
		});
	});
	databaseConnection.close();
};

(function ts3bot() {

	var serverQueryClient = new TeamSpeakClient(config.host, config.port);

	serverQueryClient.send('login', {client_login_name: config.loginName, client_login_password: config.clientPassword}, function(err, response, rawResponse){
		if (err === undefined) {
			logger.log('info', 'Login successful.');
		} else {
			logger.log('error', err);
		};
			//Select virtual server by virtualServerId.
			serverQueryClient.send('use', {sid: config.virtualServerId}, function(err, response, rawResponse){
				if (err === undefined) {
					logger.log('info', 'Virtual server selected successfully.');
				} else {
					logger.log('error', err);
				};
					//Clientupdate to change the name that's presented to the user.
					serverQueryClient.send("clientupdate", {client_nickname: config.clientName}, function(err, response, rawResponse) {
						if (err === undefined) {
							logger.log('info', 'Client name changed successfully.');
						} else {
							logger.log('error', err);
						};
							//Register with server to be able to read incoming private messages.
							serverQueryClient.send('servernotifyregister', {event: 'textprivate'}, function(err, response, rawResponse){
								if (err === undefined) {
									logger.log('info', 'Registered for private textmessages successfully.');
								} else {
									logger.log('error', err);
								};
									//Register with server to recognize user entering the server.
									serverQueryClient.send('servernotifyregister', {event: 'server'}, function(err, response, rawResponse){
										if (err === undefined) {
											logger.log('info','Registered for server events successfully.');
										} else {
											logger.log('error', err);
										};
											//Register with server to recognize user entering a specific channel.
											serverQueryClient.send('servernotifyregister', {event: 'textserver'}, function(err, response, rawResponse){
											if (err === undefined) {
												logger.log('info','Registered for textserver events successfully.');
												logger.log('info', 'Starting database clean-up routine.')
												databaseCleanup(serverQueryClient);
											} else {
												logger.log('error', err);
											};

											});
									});
							});
					});
			});
	});

	//listen on incoming private messages.
	serverQueryClient.on('textmessage', function (response) {

		if (response.invokername != config.clientName && response.msg.length === 72) {
			
			api.account(response, function (error, response) {

				logger.log('debug', 'api.account_callback_err: ' + util.inspect(error));
				logger.log('debug', 'api.account_callback_res:\n' + util.inspect(response));
				var clientObject = response;

				if (error != null && error.accountWorldName != undefined) {
					logger.log('debug', 'While checking account API:\n' + util.inspect(error));
					logger.log('info', 'Sending client textmessage - foreignWorld.');
					var message = new chatMessage();
					serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', error));
				} else {
					//Account and world checked, verified Gandaran!
					database.updateAccountInformation(response, function (error, response) {
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
							logger.log('info', 'Added new user to database.\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid);
							serverQueryClient.send('clientgetdbidfromuid', {cluid: clientObject.invokeruid}, function (error, response){
                                if (error != undefined) {
                                    logger.log('error', 'Error while clientgetdbidfromuid: ' + clientObject.invokeruid + util.inspect(error));
                                } else {
                                    logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid + ' \'' + clientObject.apiKey + '\'');
                                    serverQueryClient.send('servergroupaddclient', {sgid: config.verifiedClientServerGroupId, cldbid: response.cldbid});
                					serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.invokerid, msg: config.confirmAccessMsg});
                                };
                            });
						};
					});
				};
			});
		} else if (response.invokeruid === config.adminClient) {
			var message = new chatMessage();
			serverQueryClient.send('sendtextmessage', message.chatSend('admin', response));
			logger.log('info', 'Received message from admin: ' + '\n\t' + '\'' + response.msg + '\'');
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
					if (error != null) {
						logger.log('debug', 'Error while adding new client: ' + error);
						logger.log('info', 'Noticed unregistered user re-visiting:\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ' \'' + clientObject.invokeruid + '\'');
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
						logger.log('info', 'Received API-key from database.\n' + util.inspect(response));
						clientObject.apiKey = response.key; 

						switch(response){
							case null:
								logger.log('info', 'API-key still \'NULL\', preparing welcome message.');
								var message = new chatMessage();
								serverQueryClient.send('sendtextmessage', message.chatSend('welcome', clientObject));
								break;

							default:
								database.updateLastSeen(clientObject, function (error, response) {
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
						                                            var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername;
						                                            serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Deleted client because of invalid key', message: report});
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
				                                            serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Deleted client because of foreign world', message: report});
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
								                    serverQueryClient.send('sendtextmessage', message.chatSend('api503', user));
												} else {
													logger.log('debug', 'Error while re-validating user:\n' + util.inspect(error));
													logger.log('error', 'While re-validating user.');
												};

											} else {
												logger.log('debug', 'Checked verified user.\n' + util.inspect(response));
												logger.log('info', 'Checked verified user, all good!\n' + util.inspect(response));
											};
										});
									};
								});
								break;
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
    		logger.log('error', 'An error occured on close: ' + '\n' + util.inspect(error));
    	};
    	if (response != undefined) {
    		logger.log('info', 'Response on close: ' + '\n' + util.inspect(response));
    	};
    	if (rawResponse != undefined) {
	    	logger.log('error', 'An error has occured: ' + '\n' + util.inspect(rawResponse));	
    	};
    });

    serverQueryClient.on('close', function (error, response) {
    	if (error != undefined) {
    		logger.log('info', 'Close event has been fired! (err)' + '\n' + util.inspect(error));
    	};
    	if (response != undefined) {
    		logger.log('info', 'Close event has been fired! (res)' + '\n' + util.inspect(response));
    	};
        //Try to reconnect/restart after 3 seconds
        setTimeout(function() {
            ts3bot();
        }, 3000);
    });
})();

//test-key

//    21C1A9D0-E2F9-5042-90D5-92B2BB5B83BF72BFA0C8-FAAA-4478-B7A6-F05BE9B1A6B6
