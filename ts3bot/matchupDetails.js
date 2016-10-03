#!/usr/bin/node

var matchupDetails = exports
var util = require('util')
var https = require('https')
var logger = require('./logger')
var config = JSON.parse(require('fs').readFileSync('config.json'))

// Function to receive the current matchup from the GW2 API.
matchupDetails.getCurrentMatchupDetails = function (matchupId, callback) {
  logger.log('debug', 'Current matchupId: ' + matchupId)
  var options = {
    hostname: 'api.guildwars2.com',
    path: '/v2/wvw/matches/' + matchupId,
    method: 'GET'
  }
  https.get(options, function (response) {
    logger.log('info', 'GW2 Match-details-API status code: ' + response.statusCode)
    var statusCode = response.statusCode
    response.on('data', function (data) {
      switch (statusCode) {
        case 200:
          // currentMatchupDetails.
          var currentMatchupDetails = JSON.parse(data)
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
      }
    })
    response.on('error', function (error) {
      if (error) logger.log('error', 'Fetching current Match-up details failed.')
      logger.log('error', 'While calling \'api.guildwars.com/v2/matches\'' + matchupId)
    })
  })
}
