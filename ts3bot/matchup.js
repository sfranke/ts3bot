#!/usr/bin/node
const matchup = exports
const util = require('util')
const https = require('https')
const logger = require('./logger')
const config = JSON.parse(require('fs').readFileSync('config.json'))

// Function to receive the current matchup from the GW2 API.
matchup.getMatchups = function (callback) {
  logger.log('debug', 'Output config file on matchup.getMatchups: ' + util.inspect(config))
  if (config.homeWorld !== undefined) {
    let options = {
      hostname: 'api.guildwars2.com',
      path: '/v2/wvw/matches?world=' + config.homeWorld,
      method: 'GET'
    }
    https.get(options, function (response) {
      let body = ''
      response.on('data', function (data) {
        logger.log('debug', 'Chunked response from Matchup endpoint(API): ' + data)
        logger.log('debug', 'Chunked response from Matchup endpoint(API): ' + util.inspect(data))
        if (response.statusCode && response.statusCode === 200) {
          logger.log('debug', 'GW2 Matches-API status code: ' + response.statusCode)
          body += data
        } else { // other as ok
          logger.log('warning', 'Sever respondes with: ' + response.statusCode)
        }
      })
      response.on('end', function () {
        logger.log('debug', 'CURRENT CONFIG: ' + body)
        logger.log('debug', 'CURRENT CONFIG util inspect: ' + util.inspect(body))
        let currentMatchupDetails
        logger.log('debug', 'Response data: ' + util.inspect(currentMatchupDetails))
        logger.log('debug', 'Inspect response data: ' + util.inspect(currentMatchupDetails))
        try {
          currentMatchupDetails = JSON.parse(body)
          if (currentMatchupDetails.all_worlds.red.indexOf(config.homeWorld) !== -1) {
            console.log('red')
            logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.red)
            callback(null, currentMatchupDetails.all_worlds.red)
          }
          if (currentMatchupDetails.all_worlds.blue.indexOf(config.homeWorld) !== -1) {
            console.log('blue')
            logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.blue)
            callback(null, currentMatchupDetails.all_worlds.blue)
          }
          if (currentMatchupDetails.all_worlds.green.indexOf(config.homeWorld) !== -1) {
            console.log('green')
            logger.log('debug', 'Found Matchup: ' + currentMatchupDetails.all_worlds.green)
            callback(null, currentMatchupDetails.all_worlds.green)
          }
        } catch (e) {
          logger.log('debug', 'Matchup data not valid json!')
          logger.log('error', 'Matchup data not valid json!\n' + util.inspect(e))
          callback({'error': 'Matchup data not valid json!'}, null)
        }
      })
      response.on('error', function (error) {
        if (error) logger.log('error', 'While fetching matches' + util.inspect(error))
        logger.log('error', 'While calling \'api.guildwars.com/v2/matches\'' + util.inspect(error))
      })
    })
  }
}
