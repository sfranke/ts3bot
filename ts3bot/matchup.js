#!/usr/bin/node

var matchup         = exports,
    TeamSpeakClient = require('node-teamspeak'),
    config          = JSON.parse(require('fs').readFileSync('config.json')),
    util            = require('util'),
    https           = require('https'),
    async           = require('async'),
    logger          = require('./logger'),
    matchupDetails  = require('./matchupDetails');

// Function to receive the current matchup from the GW2 API.
matchup.getMatchups = function (callback) {
    var options = {
                    hostname: 'api.guildwars2.com',
                    path: '/v2/wvw/matches',
                    method: 'GET'
                };
    https.get(options, function(response) {
        logger.log('info', 'GW2 Matches-API status code: ' + response.statusCode);
        var statusCode = response.statusCode;
        response.on('data', function(data) {
            switch(statusCode) {
                case 200:
                    // currentMatches is a list matchup IDs(buffer) that needs to be parsed.
                    var currentMatches = JSON.parse(data);
                    logger.log('debug', 'Response data: ' + currentMatches);
                    logger.log('debug', 'Inspect respnse data: ' + util.inspect(currentMatches));

                    var matchUp = '';
                    currentMatches.forEach(function(matchUp) {
                        logger.log('debug', 'Show each matchUp: ' + matchUp);
                        matchupDetails.getCurrentMatchupDetails(matchUp, function (error, response) {
                            logger.log('error', 'Callback of matchupDetails error: ' + error);
                            logger.log('debug', 'Callback of matchupDetails response: ' + response);
                            if(error) logger.log('error', 'Error while seraching for matchup: ' + error);
                            callback(null, response);
                        });
                    });
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
