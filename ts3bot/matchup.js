#!/usr/bin/node

var matchup = exports
var util = require('util')
var https = require('https')
var logger = require('./logger')
var config = JSON.parse(require('fs').readFileSync('config.json'))
// var matchupDetails = require('./matchupDetails')

// Function to receive the current matchup from the GW2 API.
matchup.getMatchups = function (callback) {
  logger.log('debug', 'Output config file on matchup.getMatchups: ' + util.inspect(config))
  if (config.homeWorld !== undefined) {
    var options = {
      hostname: 'api.guildwars2.com',
      path: '/v2/wvw/matches?world=' + config.homeWorld,
      method: 'GET'
    }
    https.get(options, function (response) {
      var body = ''
      logger.log('debug', 'GW2 Matches-API status code: ' + response.statusCode)
      var statusCode = response.statusCode
      response.on('data', function (data) {
        logger.log('debug', 'Chunked response from Matchup endpoint(API): ' + data)
        logger.log('debug', 'Chunked response from Matchup endpoint(API): ' + util.inspect(data))
        body += data
        switch (statusCode) {
          case 200:
            logger.log('debug', 'Server responding -> ' + response.statusCode)
            break
          case 400:
            var httpsRequest400 = JSON.parse(data)
            logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest400))
            callback(httpsRequest400, null)
            break
          case 403:
            var httpsRequest403 = JSON.parse(data)
            logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest403))
            callback(httpsRequest403, null)
            break
          case 502:
            logger.log('error', 'Server not responding -> ' + statusCode)
            callback(statusCode, null)
            break
          case 503:
            logger.log('error', 'Server busy -> ' + statusCode)
            callback(statusCode, null)
            break
          default:
            logger.log('error', 'Unknown error occured while searching match-up partner.')
            callback(statusCode, null)
            break
        }
      })
      response.on('end', function () {
        logger.log('debug', 'CURRENT CONFIG: ' + body)
        logger.log('debug', 'CURRENT CONFIG util inspect: ' + util.inspect(body))
        // var currentMatch = JSON.parse(body)
        var currentMatchupDetails = JSON.parse(body)
        logger.log('debug', 'Response data: ' + util.inspect(currentMatchupDetails))
        logger.log('debug', 'Inspect response data: ' + util.inspect(currentMatchupDetails))
        if (currentMatchupDetails.all_worlds.red.indexOf(config.homeWorld) !== -1) {
          logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.red)
          callback(null, currentMatchupDetails.all_worlds.red)
        }
        if (currentMatchupDetails.all_worlds.blue.indexOf(config.homeWorld) !== -1) {
          logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.blue)
          callback(null, currentMatchupDetails.all_worlds.blue)
        }
        if (currentMatchupDetails.all_worlds.green.indexOf(config.homeWorld) !== -1) {
          logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.green)
          callback(null, currentMatchupDetails.all_worlds.green)
        }
      })
      response.on('error', function (error) {
        if (error) logger.log('error', 'While fetching matches')
        logger.log('error', 'While calling \'api.guildwars.com/v2/matches\'')
      })
    })
  }
}
