#!/usr/bin/node
const matchup = exports
const util = require('util')
const https = require('https')
const logger = require('./logger')
const config = JSON.parse(require('fs').readFileSync('config.json'))

// Function to receive the current matchup from the GW2 API.
matchup.getMatchups = function (callback) {
  if (config.homeWorld) {
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
                logger.log('warning', 'Server respondes with: ' + response.statusCode)
            }
        })
        response.on('end', function () {
            let currentMatchupDetails
            logger.log('debug', 'Response data: ' + util.inspect(currentMatchupDetails))
            // TODO: Have only one thing in here that could fail to avoid confusion.
            try {
                currentMatchupDetails = JSON.parse(body)
                const borderColors = ['red', 'blue', 'green']
                const matchupPartner = borderColors.filter((borderColor) => {
                    return currentMatchupDetails.all_worlds[borderColor].indexOf(config.homeWorld) !== -1
                })
                logger.log('debug', 'matchup partner ' + util.inspect(matchupPartner))
                if (matchupPartner.length > 0) {
                    logger.log('debug', 'Found matchup: ' + currentMatchupDetails.all_worlds[matchupPartner[0]])
                    callback(null, currentMatchupDetails.all_worlds[matchupPartner[0]])
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
    }).on('error', function (res) {
      logger.log('debug', 'HTTPS request failed during Match-Up routine. API could not be reached!\n' + util.inspect(res))
    })
  } else {
     logger.log('debug', 'Config.homeWorld not set in config file!')
  }
}
