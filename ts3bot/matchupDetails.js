#!/usr/bin/node

var matchupDetails  = exports,
    TeamSpeakClient = require('node-teamspeak'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    util            = require('util'),
    https           = require('https'),
    async           = require('async'),
    logger          = require('./logger');

// Function to receive the current matchup from the GW2 API.
matchupDetails.getCurrentMatchupDetails = function (matchupId, callback) {
    logger.log('debug', 'Current matchupId: ' + matchupId);
    var options = {
                    hostname: 'api.guildwars2.com',
                    path: '/v2/wvw/matches/' + matchupId,
                    method: 'GET'
                };
    https.get(options, function(response) {
        logger.log('info', 'GW2 Match-details-API status code: ' + response.statusCode);
        var statusCode = response.statusCode;
        response.on('data', function(data) {
            switch(statusCode) {
                case 200:
                    // currentMatchupDetails.
                    var currentMatchupDetails = JSON.parse(data);
                    // logger.log('debug', 'Response data: ' + currentMatchupDetails);
                    // logger.log('debug', 'Inspect respnse data: ' + util.inspect(currentMatchupDetails));
                    // logger.log('debug', 'Show worlds on this matchup: ' + util.inspect(currentMatchupDetails.worlds));
                    // logger.log('debug', 'Show all_worlds on this matchup: ' + util.inspect(currentMatchupDetails.all_worlds));
                    // logger.log('debug', 'indexOf(2003) for red: ' + currentMatchupDetails.all_worlds.red.indexOf(2003));
                    // logger.log('debug', 'indexOf(2003) for blue: ' + currentMatchupDetails.all_worlds.blue.indexOf(2003));
                    // logger.log('debug', 'indexOf(2003) for green: ' + currentMatchupDetails.all_worlds.green.indexOf(2003));

                    if(currentMatchupDetails.all_worlds.red.indexOf(2003) !== -1) {
                        logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.red);
                        callback(null, currentMatchupDetails.all_worlds.red);
                    }
                    if(currentMatchupDetails.all_worlds.blue.indexOf(2003) !== -1) {
                        logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.blue);
                        callback(null, currentMatchupDetails.all_worlds.blue);
                    }
                    if(currentMatchupDetails.all_worlds.green.indexOf(2003) !== -1) {
                        logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.green);
                        callback(null, currentMatchupDetails.all_worlds.green);
                    }
                    break;
                case 400:
                    var httpsRequest400 = JSON.parse(data);
                    logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest400));
                    clientObject.apiServerStatus = response.statusCode;
                    callback(clientObject, null);
                    break;
                case 403:
                    var httpsRequest403 = JSON.parse(data);
                    logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest403));
                    clientObject.apiServerStatus = response.statusCode;
                    callback(clientObject, null);
                    break;
                case 502:
                    logger.log('error', 'Server not responding -> ' + statusCode);
                    clientObject.apiServerStatus = statusCode;
                    callback(clientObject, null);
                    break;
                case 503:
                    logger.log('error', 'Server busy -> ' + statusCode);
                    clientObject.apiServerStatus = statusCode;
                    callback(clientObject, null);
                    break;
            }
        });
        response.on('error', function (error) {
            logger.log('error', 'While calling \'api.guildwars.com/v2/matches\'');
        });
    });
};
