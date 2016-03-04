#!/usr/bin/node

var clientIdleMove  = exports,
    TeamSpeakClient = require('node-teamspeak'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    util            = require('util'),
    logger          = require('./logger');

// Function to move idle client from cleanChannel(lobby) to config.afkChannel(AFK-Channel).
clientIdleMove.moveClient = function (serverQueryClient) {
    serverQueryClient.send('clientlist', ['times'], function (error, response, rawResponse) {
        logger.log('debug', 'clientlist -times _error. ' + util.inspect(error));
        logger.log('debug', 'clientlist -times _response.\n' + util.inspect(response));
        if (error !== undefined) {
            logger.log('error', 'While \'clientlist -times\'. ' + util.inspect(error));
        } else {
            for (var user in response) {
                // Declare server query clients
                var serverQueryClientType = 1;
                // Recognize only clients of client_type(0),
                // clients that are idle for more than idleTimeLimit and
                // clients that are currently in cleanChannel.
                if (response[user].client_type != serverQueryClientType && response[user].client_idle_time >= config.idleTimeLimit && response[user].cid === config.cleanChannel) {
                    logger.log('debug', 'Moving idle user.\n' + util.inspect(response[user]));
                    logger.log('info', 'Moving idle user.\n' + '(' + response[user].clid + ')' + response[user].client_nickname + '(cldbid: ' + response[user].client_database_id + ')');

                    var clientObject = {};
                        clientObject.clid = response[user].clid;

                    serverQueryClient.send('clientmove', {clid: clientObject.clid, cid: config.afkChannel}, function (error, response) {
                        logger.log('debug', 'clientmove_error. ' + util.inspect(error));
                        logger.log('debug', 'clientmove_response. ' + util.inspect(response));
                        if (error !== undefined) {
                            logger.log('error', 'While \'clientmove\'');
                        } else {
                            logger.log('info', 'Sending idle poke.');
                            logger.log('debug', 'Sending idle poke to: ' + util.inspect(clientObject));
                            serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.clid, msg: config.idleMove});
                        }
                    });
                }
            }
        }
        setTimeout(function() {
            clientIdleMove.moveClient(serverQueryClient);
        }, 30000);
    });
};
