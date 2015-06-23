#!/usr/bin/node

var TeamSpeakClient = require("node-teamspeak"),
	config = JSON.parse(require("fs").readFileSync("config.json")),
	util = require("util"),
	https = require('https'),
	sqlite = require('sqlite3').verbose();

function date() {
	var date = new Date();
	return date;
};

(function ts3bot() {

	var serverQueryClient = new TeamSpeakClient(config.host);

	console.log(date() + " [Connect] login to: " + config.host + " as " + config.loginName);
	serverQueryClient.send("login", {client_login_name: config.loginName, client_login_password: config.clientPassword}, function(err, response, rawResponse){
		//select virtual server by virtualServerId
		console.log(date() + " [Connect] using virtual server id: " + config.virtualServerId);
		serverQueryClient.send("use", {sid: config.virtualServerId}, function(err, response, rawResponse){
			//clientupdate to change the name that's presented to the user
			console.log(date() + " [Connect] update client name to: " + config.clientName);
			serverQueryClient.send("clientupdate", {client_nickname: config.clientName}, function(err, response, rawResponse) {
				//register with server to be able to read incoming private messages 
				console.log(date() + " [Connect] register with server for private textmessages..");
				serverQueryClient.send("servernotifyregister", {event: "textprivate"}, function(err, response, rawResponse){
					//register with server to recognize user entering a specific channel
					console.log(date() + " [Connect] register with server for channel events..");
					serverQueryClient.send("servernotifyregister", {event: "channel", id: config.entryChannel}, function(err, response, rawResponse){
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
	serverQueryClient.on("textmessage", function(response){

		var userId = response.invokerid,
			cldbid = response.client_database_id,
			uid    = response.invokeruid,
			nick   = response.invokername;

		if (response.msg.length == 72) {
			console.log(date() + " [Info] checking valid key");
			console.log(date() + " [Info] " + "'" + response.msg + "'");
			serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: 'Your key is now getting validated by AarenaNet, please wait a moment.'}, function (err, response){
			});

			var token = response.msg;
			var options = {
				hostname: "api.guildwars2.com",
				path: "/v2/account",
				method: "GET",
				headers: {
					Authorization: "Bearer " + token
				}
			};
			https.get(options, function(res) {
				console.log(date() + " [Info] gw2 API status code: ", res.statusCode);
				//console.log("headers: ", res.headers);

				if (res.statusCode === 400) {
					console.log('[HTTP_error_code]: ' + res.statusCode + ' server not responding!');
					//Add logic to handle this case!For now restart.
					this.emit("http400");
				};

				if (res.statusCode === 502) {
					console.log('[HTTP_error_code]: ' + res.statusCode + ' server not responding!');
					//Add logic to handle this case! For now restart.
					this.emit("http502");
				};

				res.on('data', function(d) {
    				//process.stdout.write(d);
    				if (res.statusCode === 200) {
	    				var httpsRequest = JSON.parse(d);
	    				//console.log("\n" + date() + " [Debug] worldId: " + httpsRequest.world);
	    				//console.log(date() + " [Debug] clientId: " + response.invokerid);
	    				//console.log(date() + " [Debug] clientUid: " + response.invokeruid)
	    				//check for world id 2003 (Gandara)
	    				if (httpsRequest.world === 2003) {
							var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
							//console.log('[db_statement] conect to database: ' + util.inspect(databaseConnection));


							databaseConnection.serialize(function() {

								var statement = databaseConnection.prepare("UPDATE clients SET gw2_api_key = ? WHERE client_unique_id = ?");
								statement.run(token, uid, function(response) {
									console.log('[==== > RUN]' + util.inspect(this));
									/*If changes have happen permissions are granted otherwise denied.*/
									if (this.lastID === undefined) {
				    					console.log(date() + " [Info] FAIL, member permissions denied for " + nick + "( " + uid + " )");
				    					console.log('[TEST] ' + userId + uid);
				    					serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: 'This key is already in use thus it can not be associated with your account.'}, function (err, response){
				    					});
									} else {
										//console.log("[Debug] sending " + config.confirmAccessMsg);
										serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: config.confirmAccessMsg}, function (err, response){
											//console.log("[Debug] clientdbid: " + response.cldbid);
											serverQueryClient.send("clientgetdbidfromuid", {cluid: uid}, function (err, response){
												console.log(date() + " [Info] SUCCESS, member permissions granted for " + nick + "( " + uid + " )");
												serverQueryClient.send("servergroupaddclient", {sgid: config.memberServerGroupId, cldbid: response.cldbid}, function (err, response){
												});
											});
										});
									};
								});
								console.log(util.inspect(statement));
								statement.finalize();
								//console.log('[db_statement] RUN: ' + util.inspect(statement));

								statement.on("error", function(response) {
									console.log('\n' + '[db_errorEvent] : ' + response);
									//console.log('[Inspection] ' + util.inspect(response));
									if (response.errno === 19) {
										console.log('[Db_Error]: This API key is already in our database!!');
									};
								});
								statement.on('trace', function(response) {
									console.log(response);
								});
								statement.on('profile', function(response) {
									console.log(response);
								});
							});
							databaseConnection.close();
	    				};
	    			};
  				});

			}).on('error', function(e) {
  				console.error(e);
  				console.log('[ERROR] error while http.get. Work out a solution for this case!');
			}).on('http400', function() {
				serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: 'Servers are not responding, please resend me your key.'}, function (err, response){
				});
				console.log('HTTP400 error occured.')
				setTimeout(function() {
            		ts3bot();
        		}, 3000);
			}).on('http502', function() {
				serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: 'Servers are not responding, please resend me your key.'}, function (err, response){
				});
				console.log('http502 error occured.')
				setTimeout(function() {
            		ts3bot();
        		}, 3000);
			});
		}
		if (response.msg.length === 73 || response.msg.length === 74 || response.msg.length === 75 || response.msg.length === 76) {
			console.log(date() + " [Info] key not valid (whitespace)..");
			//behavior for not valid key goes here
			serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: config.keyNotValid}, function (err, response){
			});
		};
	});

	/*listen on entryChannel

	clid -> client id
	client_type -> client type; 0=teamspeakClient 1=serverQuery 
	client_nickname -> client nickname
	client_servergroups -> comma seperated list of server groups
	client_unique_identifier -> a client's unique identifier

	*/
	serverQueryClient.on("cliententerview", function(response){
		/*is a user connecting via the normal teamspeak client proceed*/

		//console.log('\n' + date() + '[cliententerview]: ' + 'Uid: ' + '\'' + response.client_unique_identifier + '\'' + ' Nickname: ' + response.client_nickname);

		var databaseConnection = new sqlite.Database('ts3bot.sqlitedb');
		//console.log('[db_statement] conect to database: ' + util.inspect(databaseConnection));


		databaseConnection.serialize(function() {

			var statement = databaseConnection.prepare("INSERT INTO `clients` VALUES (?, ?, ?)");
			statement.run(response.client_unique_identifier, response.client_nickname, null);
			statement.finalize();

			//console.log('[db_statement] RUN: ' + util.inspect(statement));

			statement.on("error", function(response) {
				//console.log('\n' + '[db_errorEvent] : ' + response);
				//console.log('[Inspection] ' + util.inspect(response));
				if (response.errno === 19) {
					console.log('[Db_Error]: This user already exists in our database.');
				};
			});
			statement.on('trace', function(response) {
				console.log(response);
			});
			statement.on('profile', function(response) {
				console.log(response);
			});
		});
		databaseConnection.close();

		if (response.client_type === 0) {
			//console.log(date() + " [Info] client_type checked for user: \t" + response.client_nickname + " client_type is " + response.client_type);
			/*is a user member of the guest group proceed*/
			if (response.client_servergroups === config.guestServerGroupId) {
				//console.log(date() + "[Debug] serverGroup checked for user: \t" + response.client_nickname);
				// send guest specific welcome message here
				console.log(date() + " [Info] sending " + response.client_nickname + " welcomeMessage");
				serverQueryClient.send("sendtextmessage", {targetmode: "1", target: response.clid, msg: config.welcomeMessage}, function (err, response){
				});
				
			};
		};
	});

    serverQueryClient.on("error", function() {
        //node-teamspeak only emits errors, if the socket emits errors,
        //so send them to the blackhole
    });

    serverQueryClient.on("close", function(err, response, rawResponse) {
        //Try to reconnect/restart after 3 seconds
        setTimeout(function() {
            ts3bot();
        }, 3000);
    });
})();

//test-key

//    21C1A9D0-E2F9-5042-90D5-92B2BB5B83BF72BFA0C8-FAAA-4478-B7A6-F05BE9B1A6B6
