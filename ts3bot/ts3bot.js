#!/usr/bin/node

var TeamSpeakClient = require('node-teamspeak'),
	config          = JSON.parse(require('fs').readFileSync('config.json')),
	util            = require('util'),
	https           = require('https'),
	sqlite          = require('sqlite3'),
	logger          = require('./logger'),
	chatMessage     = require('./chatMessage')
	api             = require('./api'),
	database        = require('./database');

function unixTime() {
	var unixStamp = Math.round((new Date()).getTime() / 1000);
	return unixStamp;
};

//Search for 'old clients' that got deleted from the bot's database.
//If these exist, delete them from the teamspeak server's database as well.
//Also notify an admin via offline message.
function purgeTsDatabase(serverQueryClient){
	logger.log('debug', 'PurgeTsDatabase serverQueryClient: ' + util.inspect(serverQueryClient.oldClient));

	serverQueryClient.send('clientgetdbidfromuid', {cluid: serverQueryClient.oldClient}, function (error, response){
		logger.log('debug', 'Get clientDBidFromUid_error: ' + util.inspect(error));
		logger.log('debug', 'Get clientDBidFromUid_response: ' + util.inspect(response));

		if (error != undefined) {
			logger.log('debug', 'Error while fetching DBid from teamspeak server.');
			if (error.id === 512) {
				logger.log('info', 'Client could not be found in teamspeak server database.\n' + serverQueryClient.oldClient);
			};
		} else  {
			logger.log('debug', 'Client found in teamspeak database.\n' + util.inspect(response));
			
			var cluid = response.cluid,
			   cldbid = response.cldbid;

			serverQueryClient.send('clientdbdelete', {cldbid: response.cldbid}, function (error, response) {
				logger.log('debug', 'Deleting client from teamspeak server_error\n' + util.inspect(error));
				logger.log('debug', 'Deleting client from teamspeak server_response\n' + util.inspect(response));

				if (error != undefined) {
					logger.log('debug', 'Error while deleting user from teamspeak server database.');
				} else {
					//logger.log('info', 'Sending report to admin..');
					// var report = '[B]' + 'cluid: ' + '[/B]' + cluid + '\n' + '[B]' + 'cldbid: ' + '[/B]' + cldbid;
					// serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Deleted old client', message: report}, function (error, response) {
					// 	logger.log('debug', 'Report to admin_error: ' + util.inspect(error));
					// 	logger.log('debug', 'Report to admin_response: ' + util.inspect(response));
					// });
				};
			});
		};
	});
};

var CleanupCount = 0;

//Search for old clients 'last_seen' older than 91 days
//and delete them from the bot's database.
function databaseCleanup(serverQueryClient) {


	database.getOldClients(function (error, response) {
		logger.log('debug', 'GetOldClients callback error:\n' + util.inspect(error));
		logger.log('debug', 'GetOldClients callback response:\n' + util.inspect(response));

		CleanupCount++;	

		// serverQueryClient.oldClients = response;
		// purgeTsDatabase(serverQueryClient);

		if (response.length != 0) {
			response.forEach(function (client) {

				if (CleanupCount === 1) {
					var report = '[B]' + 'cluid: ' + '[/B]' + client.cluid + '\n' + '[B]' + 'nick: ' + '[/B]' + client.name;
					serverQueryClient.send('messageadd', {cluid: config.adminReport, subject: 'Deleted old client', message: report}, function (error, response) {
						logger.log('debug', 'Report to admin_error: ' + util.inspect(error));
						logger.log('debug', 'Report to admin_response: ' + util.inspect(response));
					});
				}

				logger.log('debug', 'Cluid to delete: ' + client.cluid);
				database.delClient(client.cluid, function (error, response) {
					logger.log('debug', 'DelClient callback error:\n' + util.inspect(error));
					logger.log('debug', 'DelClient callback response:\n' + util.inspect(response));

					if (error != null) {
						logger.log('debug', 'Failed on client: ' + error.client);
						if (error.errno === 5) {
							setTimeout(function() {
								databaseCleanup(serverQueryClient);
							}, 20000);
						};
					} else {
						logger.log('info', 'Old client got deleted from database!\ncluid: ' + response);
						serverQueryClient.oldClient = response;
						purgeTsDatabase(serverQueryClient);
					};
				});
			});
		} else {
			logger.log('info', 'No old clients found!');
		};
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
        }, 4000);
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

		} else if (config.adminClient.indexOf(response.invokeruid) != -1) {
			var message = new chatMessage();
			serverQueryClient.send('sendtextmessage', message.chatSend('admin', response));
			logger.log('info', 'Received message from admin: ' + '\n' + '\'' + response.msg + '\'');

			logger.log('debug', 'ResponseOnject on AdminMessage: ' + util.inspect(response));
			var AdminMessageArray = response.msg.split(' ');
			logger.log('debug', 'AdminMessageArray after split() ' + AdminMessageArray);

			if (AdminMessageArray[0] === '!move') {

				var clid = AdminMessageArray[1],
				    cid   = AdminMessageArray[2];

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

						switch(response){
							case null:
								logger.log('info', 'API-key still \'NULL\', preparing welcome message.');
								var message = new chatMessage();
								serverQueryClient.send('sendtextmessage', message.chatSend('welcome', clientObject));
								break;

							case undefined:
								logger.log('error', 'Verified client without API-Key!');
								break;

							default:
								clientObject.apiKey = response.key;
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
						                                            var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.invokeruid + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.invokername + '\n' + '[B]' + 'api-key: ' + '[/B]' + clientObject.apiKey;
						                                            serverQueryClient.send('messageadd', {cluid: config.adminReport, subject: 'Deleted client because of invalid key', message: report});
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
				                                            serverQueryClient.send('messageadd', {cluid: config.adminReport, subject: 'Deleted client because of foreign world', message: report});
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
												logger.log('debug', 'Checked verified user.\n' + util.inspect(response));
												logger.log('info', 'Checked verified user, all good!');
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
