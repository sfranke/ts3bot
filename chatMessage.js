#!/usr/bin/node

var TeamSpeakClient = require('node-teamspeak'),
	config = JSON.parse(require('fs').readFileSync('config.json')),
	util = require('util'),
	https = require('https'),
	sqlite = require('sqlite3').verbose()
	logger = require('./logger'),
	events = require("events");

function chatMessage(response) {

	chatMessage.prototype.chatSend = function(option, response) {

		var opt = option,
		    message = '';

		switch(opt) {
			case 'welcome':
				message = {targetmode: '1', target: response.clid, msg: config.welcomeMessage};
				logger.log('info', 'Sending ' + response.client_nickname + ' welcomeMessage');
				break;

			case 'welcomePoke':
				message = {clid: response.clid, msg: config.welcomePoke};
				logger.log('info', 'Sending ' + response.client_nickname + ' welcomePoke');
				break;

			case 'foreignWorld':
				message = {targetmode: '1', target: response.invokerid, msg: 'This key is not associated with: ' + response.worldname};
	    		logger.log('info', 'API-key is associated with ' + response.worldname);
				break;

			case 'httpError':
				message = {targetmode: '1', target: userId, msg: 'Servers are not responding, please resend me your key.'};
				logger.log('info', 'Restarting in 3 seconds.');
				break;
			
			case 'admin':
				switch(response.msg) {
					case '!bot':
						message = {targetmode: '1', target: response.invokerid, msg: 'At your service oh mighty Admin! *bow'};
						break;

					case '!help':
						message = {targetmode: '1', target: response.invokerid, msg: 'This could be your help command.'};
						break;

					case '!commands':
						message = {targetmode: '1', target: response.invokerid, msg: 'This could be a list of commands.'};
						break;

					case '!awesome':
						message = {targetmode: '1', target: response.invokerid, msg: 'I love you my dear!'};
						break;

					default:
						message = {targetmode: '1', target: response.invokerid, msg: '*Nods condescendingly.'};
						break;
				};

				break;
			
			default:
				break;
		};
		return message;
	};
};

util.inherits(chatMessage, events.EventEmitter);
module.exports = chatMessage;
