#!/usr/bin/node

var TeamSpeakClient = require('node-teamspeak'),
	config = JSON.parse(require('fs').readFileSync('config.json')),
	util = require('util'),
	https = require('https'),
	sqlite = require('sqlite3').verbose()
	logger = require('./logger'),
	chatMessage = require('./chatMessage');

(function ts3bot() {

	var serverQueryClient = new TeamSpeakClient(config.host, config.port);

	serverQueryClient.send('login', {client_login_name: config.loginName, client_login_password: config.clientPassword}, function(err, response, rawResponse){
		if (err === undefined) {
			logger.log('info', 'Login successful');
		} else {
			serverQueryClient.emit('queryError', err);
		};
			//Select virtual server by virtualServerId.
			serverQueryClient.send('use', {sid: config.virtualServerId}, function(err, response, rawResponse){
				if (err === undefined) {
					logger.log('info', 'Select virtual server successful');
				};
					//Clientupdate to change the name that's presented to the user.
					serverQueryClient.send("clientupdate", {client_nickname: config.clientName}, function(err, response, rawResponse) {
						if (err === undefined) {
							logger.log('info', 'Change client name successful');
						};
							//Register with server to be able to read incoming private messages.
							serverQueryClient.send('servernotifyregister', {event: 'textprivate'}, function(err, response, rawResponse){
								if (err === undefined) {
									logger.log('info', 'Register for private textmessages successful');
								};
									//Register with server to recognize user entering a specific channel.
									serverQueryClient.send('servernotifyregister', {event: 'channel', id: config.entryChannel}, function(err, response, rawResponse){
										if (err === undefined) {
											logger.log('info','Register for channel events successful');
										};
											//Register with server to recognize user entering a specific channel.
											serverQueryClient.send('servernotifyregister', {event: 'textserver'}, function(err, response, rawResponse){
											if (err === undefined) {
												logger.log('info','Register for textserver events successful');
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
			logger.log('info','Checking valid key ==> '+ response.msg);
			serverQueryClient.send('sendtextmessage', {targetmode: '1', target: userId, msg: 'Checking your key via GW2-API, please wait a moment.'});

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
				logger.log('info', 'GW2 API status code: ' + res.statusCode);

				if (res.statusCode === 400) {
					logger.log('info', '[HTTP_error_code]: ' + res.statusCode + ' server not responding [HTTP400]!');
					if (res.text = 'invalid key') {
						logger.log('warning', 'Invalid API key!');
						serverQueryClient.send('sendtextmessage', {targetmode: '1', target: userId, msg: 'Your key is invalid, please generate a new one.'});
					} else {
						this.emit('http400');
					};
				};

				if (res.statusCode === 502) {
					logger.log('info', 'Server not responding ' + res.statusCode);
					this.emit('http502');
				};

				res.on('data', function(d) {
    				if (res.statusCode === 200) {
	    				var httpsRequest = JSON.parse(d);
	    				//Response is a JSON object.
	    				if (httpsRequest.world === config.homeWorld) {
							var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
							databaseConnection.serialize(function() {
								var statement = databaseConnection.prepare('UPDATE clients SET gw2_api_key = ? WHERE client_unique_id = ?');
								statement.run(token, uid, function(response) {
									//If changes have happen permissions are granted otherwise denied.
									if (this.lastID === undefined) {
				    					logger.log('info', 'FAIL, member permissions denied for ' + nick + '\( ' + uid + ' \)');
				    					logger.log('info', 'It\'s used by another account already.');
				    					serverQueryClient.send('sendtextmessage', {targetmode: '1', target: userId, msg: 'This key is already in use thus it can not be associated with your account. Please create a new one and paste it into this chat.'});
									} else {
										serverQueryClient.send('sendtextmessage', {targetmode: '1', target: userId, msg: config.confirmAccessMsg}, function (err, response){
											serverQueryClient.send('clientgetdbidfromuid', {cluid: uid}, function (err, response){
												logger.log('info', 'SUCCESS, member permissions granted for ' + nick + '\( ' + uid + ' \)');
												serverQueryClient.send('servergroupaddclient', {sgid: config.verifiedClientServerGroupId, cldbid: response.cldbid}, function (err, response){
												});
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
								logger.log('info', 'GW2 Worlds-API status code: ', res.statusCode);
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
			logger.log('info', 'API-key not valid (whitespace)..');
			//behavior for not valid key goes here
			serverQueryClient.send('sendtextmessage', {targetmode: '1', target: userId, msg: config.keyNotValid});
		};
		if (response.invokeruid === config.adminClient) {
			var message = new chatMessage();
			serverQueryClient.send('sendtextmessage', message.chatSend('admin', response));
			logger.log('info', 'Received message from admin: ' + response.msg);
		};
	});

	/*listen on entryChannel

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
				console.log('dbstatement response ' + util.inspect(response));
				console.log('error ' + util.inspect(error));

				switch(response) {

					case undefined:
						//console.log('switch-case undefined!');
						
						var databaseConnection2 = new sqlite.Database('ts3bot.sqlitedb');
						databaseConnection2.serialize(function() {
							//Insert client data into our database.
							var statement = databaseConnection2.prepare('INSERT INTO `clients` VALUES (?, ?, ?)');
							statement.run(clientObject.client_unique_identifier, clientObject.client_nickname, null);
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
						break;

					default:
						//If gw2_api_key = null do not hit it against API. This would result in a 403 error
						//due to malformed request.
						if (response.key === null) {
							logger.log('info', 'key = null.');
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

								if (res.statusCode === 400) {
									if (res.text = 'invalid key') {
										logger.log('warning', 'Invalid API key!');
										serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.invokerid, msg: config.keyNotValid400});
									} else {
										logger.log('error', 'Unhandled status code 400 error!')
										//Checking in background disable feedback for now!
										//this.emit('http400');
									};
								};

								if (res.statusCode === 502) {
									logger.log('info', 'Server not responding ' + res.statusCode);
									//Checking in background disable feedback for now!
									//this.emit('http502');
								};

								res.on('data', function(d) {
				    				if (res.statusCode === 200) {
					    				var httpsRequest = JSON.parse(d);
					    				if (httpsRequest.world != config.homeWorld) {
					    					//console.log('Functionality for removing rights!');
					    					//console.log(util.inspect(clientObject));

					    					serverQueryClient.send('servergroupdelclient', {sgid: config.verifiedClientServerGroupId, cldbid: clientObject.client_database_id});
					    					var databaseConnection3 = new sqlite.Database('ts3bot.sqlitedb');
											databaseConnection3.serialize(function() {
												var statement = databaseConnection3.prepare('UPDATE clients SET gw2_api_key = ? WHERE client_unique_id = ?');
												statement.run(null, clientObject.client_unique_identifier);
												statement.finalize();
												logger.log('info', 'gw2_api_key updated.');
											});
											databaseConnection3.close();

					    				} else {
					    					logger.log('info', 'Client API-is still valid. Checked!');
					    				};
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

    serverQueryClient.on('error', function() {});

    serverQueryClient.on('close', function(err, response, rawResponse) {
        //Try to reconnect/restart after 3 seconds
        setTimeout(function() {
            ts3bot();
        }, 3000);
    });
})();

//test-key

//    21C1A9D0-E2F9-5042-90D5-92B2BB5B83BF72BFA0C8-FAAA-4478-B7A6-F05BE9B1A6B6
