#!/usr/bin/node

var matchup = exports
var util = require('util')
var https = require('https')
var logger = require('./logger')
var matchupDetails = require('./matchupDetails')

// Function to receive the current matchup from the GW2 API.
matchup.getMatchups = function (callback) {
  var options = {
    hostname: 'api.guildwars2.com',
    path: '/v2/wvw/matches',
    method: 'GET'
  }
  https.get(options, function (response) {
    logger.log('debug', 'GW2 Matches-API status code: ' + response.statusCode)
    var statusCode = response.statusCode
    response.on('data', function (data) {
      switch (statusCode) {
        case 200:
          // currentMatches is a list matchup IDs(buffer) that needs to be parsed.
          var currentMatches = JSON.parse(data)
          logger.log('debug', 'Response data: ' + currentMatches)
          logger.log('debug', 'Inspect respnse data: ' + util.inspect(currentMatches))
          currentMatches.forEach(function (matchUp) {
            logger.log('debug', 'Show each matchUp: ' + matchUp)
            matchupDetails.getCurrentMatchupDetails(matchUp, function (error, response) {
              logger.log('error', 'Callback of matchupDetails error: ' + error)
              logger.log('debug', 'Callback of matchupDetails response: ' + response)
              if (error) logger.log('error', 'Error while seraching for matchup: ' + error)
              callback(null, response)
            })
          })
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
    response.on('error', function (error) {
      if (error) logger.log('error', 'While fetching matches')
      logger.log('error', 'While calling \'api.guildwars.com/v2/matches\'')
    })
  })
}
