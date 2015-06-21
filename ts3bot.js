#!/usr/bin/node

var TeamSpeakClient = require("node-teamspeak"),
	config = JSON.parse(require("fs").readFileSync("config.json")),
	util = require("util"),
	https = require('https');

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

				res.on('data', function(d) {
    				//process.stdout.write(d);
    				var httpsRequest = JSON.parse(d);
    				//console.log("\n" + date() + " [Debug] worldId: " + httpsRequest.world);
    				//console.log(date() + " [Debug] clientId: " + response.invokerid);
    				//console.log(date() + " [Debug] clientUid: " + response.invokeruid)
    				//check for world id 2003 (Gandara)
    				if (httpsRequest.world === 2003) {
						//console.log("[Debug] sending " + config.confirmAccessMsg);
    					serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: config.confirmAccessMsg}, function (err, response){
							//console.log("[Debug] clientdbid: " + response.cldbid);
							serverQueryClient.send("clientgetdbidfromuid", {cluid: uid}, function (err, response){
								console.log(date() + " [Info] SUCCESS, member permissions granted for " + nick + "( " + uid + " )");
								serverQueryClient.send("servergroupaddclient", {sgid: config.memberServerGroupId, cldbid: response.cldbid}, function (err, response){
								});
							});
						});
    				} else {
    					console.log(date() + " [Info] FAIL, member permissions denied for " + nick + "( " + uid + " )");
    					serverQueryClient.send("sendtextmessage", {targetmode: "1", target: userId, msg: config.denyAccessMsg}, function (err, response){
    					});
    				};
  				});

			}).on('error', function(e) {
  				console.error(e);
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
