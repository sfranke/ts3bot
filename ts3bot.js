#!/usr/bin/node

var TeamSpeakClient = require('node-teamspeak'),
	config = JSON.parse(require('fs').readFileSync('config.json')),
	util = require('util'),
	https = require('https'),
	sqlite = require('sqlite3').verbose()
	logger = require('./logger'),
	chatMessage = require('./chatMessage');

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

	var timeNow = unixTime(),
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
					//console.log('err: ' + util.inspect(err));
					//console.log('response: ' + util.inspect(response));
					logger.log('info', 'Deleting client from TS3-server: ' + '\n\t' + ' UId: ' + response.cluid);
					serverQueryClient.send('clientdbdelete', {cldbid: response.cldbid}, function (err, response) {
						//console.log('cldbdel_err' + util.inspect(err));
						//console.log('cldbdel_response:' + util.inspect(response));
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
							//console.log('err: ' + err + '\n' + 'res: ' + response +'\n' + 'raw: ' + rawResponse);
							//console.log(util.inspect(err));
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

	/*listen on incoming private messages.
	
	msg -> containing the message sent
	invokerid -> containing the client id
	invokername -> containing the client nickname
	invokeruid -> containing the client unique identifier
	
	*/
	serverQueryClient.on('textmessage', function(response){

		var userId = response.invokerid,
			cldbid = response.client_database_id,
			uid    = response.invokeruid,
			nick   = response.invokername;

		if (response.msg.length == 72) {

			var message = new chatMessage();
			serverQueryClient.send('sendtextmessage', message.chatSend('checkingKey', response));

			var token = response.msg;
			var options = {
				hostname: 'api.guildwars2.com',
				path: '/v2/account',
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + token
				}
			};
			https.get(options, function(res) {

				res.on('data', function(d) {
    				var httpsRequest = JSON.parse(d);

					if (res.statusCode === 400) {

						switch(httpsRequest.text) {

							case 'invalid key':
								var message = new chatMessage();
								serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', response));
								break;

							case 'ErrBadData':
								var message = new chatMessage();
								serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', response));
								break;

							default:
								this.emit('http400');
								break;
						};
					};

					if (res.statusCode === 502) {
						logger.log('info', 'Server not responding ' + res.statusCode);
						this.emit('http502');
					};

					if (res.statusCode === 503) {
						logger.log('info', 'Service unavailable');
						this.emit('http400');
					};

    				if (res.statusCode === 200) {
	    				var guilds = JSON.stringify(httpsRequest.guilds);
	    				//Response is a JSON object.
	    				if (httpsRequest.world === config.homeWorld) {
							var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
							databaseConnection.serialize(function() {
								var statement = databaseConnection.prepare('UPDATE clients SET gw2_api_key = ?, gw2_account_id = ?, gw2_account_name = ?, gw2_guilds = ?, gw2_account_created = ? WHERE client_unique_id = ?');
								statement.run(token, httpsRequest.id, httpsRequest.name, guilds, httpsRequest.created, uid, function(response) {
									//If changes have happen permissions are granted otherwise denied.
									if (this.lastID === undefined) {
				    					logger.log('info', 'FAIL, member permissions denied for ' + '\n\t' + nick + ' UId: ' + uid);
				    					response.invokerid = userId;
				    					var message = new chatMessage();
				    					serverQueryClient.send('sendtextmessage', message.chatSend('alreadyInUse', response));
									} else {
										serverQueryClient.send('sendtextmessage', {targetmode: '1', target: userId, msg: config.confirmAccessMsg}, function (err, response){
											serverQueryClient.send('clientgetdbidfromuid', {cluid: uid}, function (err, response){
												logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n\t' + nick + ' UId: ' + uid);
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
	    					logger.log('info', 'Checking API-key for foreign world.');

	    					var worldId = httpsRequest.world;
							var options = {
											hostname: 'api.guildwars2.com',
											path: '/v2/worlds?ids=' + worldId,
											method: 'GET'
										};
							https.get(options, function(res) {
								logger.log('info', 'GW2 Worlds-API status code: ' + res.statusCode);
								res.on('data', function(d) {
									var httpsRequest = JSON.parse(d);
									//Response is a list of response objects.
									for (var res in httpsRequest) {
										var world = httpsRequest[res];
										//Add worldname to response-object.
										response.worldname = world.name;
										var message =  new chatMessage();
										serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', response));
									};
								});
							});
	    				};
	    			};
  				});

			}).on('error', function(e) {
  				console.error(e);
			}).on('http400', function() {
				var message = new chatMessage();
				serverQueryClient.send('sendtextmessage', message.chatSend('httpError', response));
				setTimeout(function() {
            		ts3bot();
        		}, 3000);
			}).on('http502', function() {
				var message = new chatMessage();
				serverQueryClient.send('sendtextmessage', message.chatSend('httpError', response));
				setTimeout(function() {
            		ts3bot();
        		}, 3000);
			});
		};
		if (response.msg.length === 73 || response.msg.length === 74) {

			var message = new chatMessage();
			//behavior for not valid key goes here
			serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValidWhitespace', response));
		};
		if (response.invokeruid === config.adminClient) {
			var message = new chatMessage();
			serverQueryClient.send('sendtextmessage', message.chatSend('admin', response));
			logger.log('info', 'Received message from admin: ' + '\n\t' + '\'' + response.msg + '\'');
		};
	});

	/*Listen on server event 'cliententerview'.

	clid -> client id
	client_type -> client type; 0=teamspeakClient 1=serverQuery 
	client_nickname -> client nickname
	client_servergroups -> comma seperated list of server groups
	client_unique_identifier -> a client's unique identifier

	*/
	serverQueryClient.on('cliententerview', function(response){

		var clientObject = response;
		//console.log(res);

		//If a user is connecting via the teamspeak client, ignore server query clients.
		if (clientObject.client_type === 0) {
			//Server groups should always be a string even if it's just a single one.
			var groups = clientObject.client_servergroups.toString();
			if (groups.match(config.verifiedClientServerGroupId) === null) {
				var message = new chatMessage();
				serverQueryClient.send('clientpoke', message.chatSend('welcomePoke', response));
				serverQueryClient.send('sendtextmessage', message.chatSend('welcome', response));
			} else {
				logger.log('info', 'Noticed verified client ' + 'Uid: ' + response.client_unique_identifier + ' nick: ' + response.client_nickname);
			};
		};

		//When a client connects to the default channel of the server
		//grab Uid and nickname and insert them on to our database.
		var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
		databaseConnection.serialize(function() {

			var stmt = databaseConnection.prepare('SELECT `gw2_api_key` AS key FROM `clients` WHERE `client_unique_id` = (?)');
			stmt.get(clientObject.client_unique_identifier, function(error, response) {
				//console.log('STATEMENT_RES: \n' + util.inspect(response));

				switch(response) {

					case undefined:
						//console.log('switch-case undefined!');
						logger.log('info', 'Adding new client to database.')
						var databaseConnection1 = new sqlite.Database('ts3bot.sqlitedb');
						databaseConnection1.serialize(function() {
							//Insert client data into our database.
							var statement = databaseConnection1.prepare('INSERT INTO `clients` VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
							statement.run(clientObject.client_unique_identifier, clientObject.client_nickname, unixTime(), null, null, null, null, null);
							statement.finalize();

							statement.on('error', function(response) {
								if (response.errno === 19) {
									logger.log('info', 'This user already exists in our database.');
									//If client exists in our database check for existing gw2_api_key and validate that.
								};
							});
							statement.on('trace', function(response) {
								logger.log('error', 'DB error trace\n' + response);
							});
							statement.on('profile', function(response) {
								logger.log('error', 'DB error profile\n' + response);
							});
						});
						databaseConnection1.close();
						break;

					default:
						//If gw2_api_key = null do not hit it against API. This would result in a 403 error
						//due to malformed request.
						if (response.key === null) {
							//Do not make the call but update 'last_seen' in our database.
							var databaseConnection2 = new sqlite.Database('ts3bot.sqlitedb');
							databaseConnection2.serialize(function() {
								var statement = databaseConnection2.prepare('UPDATE clients SET client_nickname = ?, last_seen = ? WHERE client_unique_id = ?');
								statement.run(clientObject.client_nickname, unixTime(), clientObject.client_unique_identifier);
								statement.finalize();
								logger.log('info', 'gw2_api_key still \'null\'.');
							});
							databaseConnection2.close();
							break;
						} else {
							//Check if gw2_api_key is still valid.
							var token = response.key;
							var options = {
								hostname: 'api.guildwars2.com',
								path: '/v2/account',
								method: 'GET',
								headers: {
									Authorization: 'Bearer ' + token
								}
							};
							https.get(options, function(res) {
								logger.log('info', 'GW2 API status code: ' + res.statusCode);

								res.on('data', function(d) {
									
				    				if (res.statusCode === 200) {
					    				var httpsRequest = JSON.parse(d);
					    				var guilds = JSON.stringify(httpsRequest.guilds)
					    				if (httpsRequest.world != config.homeWorld) {
					    					//console.log('Functionality for removing rights!');
					    					//console.log(util.inspect(clientObject));

					    					serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: clientObject.client_database_id});
					    					var databaseConnection4 = new sqlite.Database('ts3bot.sqlitedb');
											databaseConnection4.serialize(function() {
												var statement = databaseConnection4.prepare('UPDATE clients SET gw2_api_key = ?, last_seen = ? WHERE client_unique_id = ?');
												statement.run(null, unixTime(), clientObject.client_unique_identifier);
												statement.finalize();
												logger.log('info', 'gw2_api_key updated.');
											});
											databaseConnection4.close();
					    				} else {
					    					logger.log('info', 'Client API-is still valid. Checked!');

					    					var databaseConnection5 = new sqlite.Database('ts3bot.sqlitedb');
											databaseConnection5.serialize(function() {


												// Update full information here!
												var statement = databaseConnection5.prepare('UPDATE clients SET last_seen = ?, gw2_account_id = ?, gw2_account_name = ?, gw2_guilds = ?, gw2_account_created = ? WHERE client_unique_id = ?');
												statement.run(unixTime(), httpsRequest.id, httpsRequest.name, guilds, httpsRequest.created, clientObject.client_unique_identifier);
												statement.finalize();
												logger.log('info', 'updated data for: ' + clientObject.client_nickname + ' UId: ' + clientObject.client_unique_identifier);
											});
											databaseConnection5.close();
					    				};
					    			};

					    			if (res.statusCode === 400) {
					    				var httpsRequest = JSON.parse(d);
					    				//console.log('DEBUG: ' + util.inspect(httpsRequest));

					    				switch (httpsRequest.text) {

					    					case 'ErrBadData':
					    						if (httpsRequest.text = 'ErrBadData') {
													logger.log('info', 'API error bad request!');
					    						};
					    						break;

					    					case 'invalid key':
						    					response.invokerid = clientObject.clid;
												var message = new chatMessage();
												serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', response));
												//console.log('Functionality for removing rights!');
					    						//console.log(util.inspect(clientObject));
					    						var report = '[B]' + 'cluid: ' + '[/B]' + clientObject.client_unique_identifier + '\n' + '[B]' + 'nick: ' + '[/B]' + clientObject.client_nickname;
					    						serverQueryClient.send('messageadd', {cluid: config.adminClient, subject: 'Deleting client from server group', message: report});
					    						serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: clientObject.client_database_id});
					    						var databaseConnection3 = new sqlite.Database('ts3bot.sqlitedb');
												databaseConnection3.serialize(function() {
													var statement = databaseConnection3.prepare('UPDATE clients SET gw2_api_key = ?, last_seen = ? WHERE client_unique_id = ?');
													statement.run(null, unixTime(), clientObject.client_unique_identifier);
													statement.finalize();
													logger.log('info', 'Removed gw2_api_key from database and revoked server group.');
												});
												databaseConnection3.close();
												break;

											default:
												logger.log('info', 'Please don\'t bother me, I\'m just chilling.')
												break;
					    				};
					    			};

					    			if (res.statusCode === 502) {
										logger.log('info', 'Server not responding ' + res.statusCode);
										//Checking in background disable feedback for now!
										//this.emit('http502');
									};

									if (res.statusCode === 503) {
										logger.log('info', 'Server unavailable');
										this.emit('close');
									};
								});
							});	
						};
						break;
				//End of switch-case.
				};
			//End of stmt.
			});
			stmt.finalize();
		//End of Database connection.
		});
		databaseConnection.close();
	});

	serverQueryClient.on('queryError', function(err, response) {
		//Error id for banned status.
		if (err.id === '3329') {
			logger.log('error', 'I am banned');
		};
		//Error id for invalid loginname or password.
		if (err.id === '520') {
			console.log('error', 'Invalid loginname or password')
		};
	});

    serverQueryClient.on('error', function(err, response, rawResponse) {
    	if (err != undefined) {
    		logger.log('error', 'An error occured on close: ' + '\n' + util.inspect(err));
    	};
    	if (response != undefined) {
    		logger.log('info', 'Response on close: ' + '\n' + util.inspect(response));
    	};
    	if (rawResponse != undefined) {
	    	logger.log('error', 'An error has occured: ' + '\n' + util.inspect(rawResponse));	
    	};
    });

    serverQueryClient.on('close', function(err, response) {
    	if (err != undefined) {
    		logger.log('info', 'Close event has been fired! (err)' + '\n' + util.inspect(err));
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
