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

			case 'checkingKey':
				message = {targetmode: '1', target: response.invokerid, msg: config.checkingKey};
				logger.log('info', 'Checking valid key.. ' + '\n\t' + '\'' + response.msg + '\'');
				break;

			case 'foreignWorld':
				message = {targetmode: '1', target: response.invokerid, msg: config.foreignWorld + ' -> ' + response.worldname};
	    		logger.log('info', 'API-key is associated with ' + response.worldname);
				break;

			case 'httpError':
				message = {targetmode: '1', target: userId, msg: config.serverNotResponding};
				logger.log('info', 'Restarting in 3 seconds.');
				break;

			case 'alreadyInUse':
				message = {targetmode: '1', target: response.invokerid, msg: config.alreadyInUse};
				logger.log('info','Key used by other client.');
				break;

			case 'keyNotValid':
				message = {targetmode: '1', target: response.invokerid, msg: config.keyNotValid};
				logger.log('warning', 'Key not valid.');
				break;

			case 'keyNotValidWhitespace':
				message = {targetmode: '1', target: response.invokerid, msg: config.keyNotValid};
				logger.log('info', 'API-key not valid (whitespace)..' + '\n\t' + '\'' + response.msg + '\'');
				break;

			case 'keyNotValid400':
				message = {targetmode: '1', target: response.invokerid, msg: config.keyNotValid400};
				logger.log('warning', 'Key not valid, confirmed by API.');
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
