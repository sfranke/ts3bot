const help = exports
const logger = require('../logger')
// const fs = require('fs')
// const util = require('util')

// Require all chat commands here, so we have access.
// const help = require('./help.js')
// const leet = require('./leet.js')
const databaseBackup = require('./databaseBackup.js')
const kill = require('./kill.js')
const showMatchup = require('./showMatchup.js')
const userInfo = require('./userInfo.js')
const move = require('./move.js')
const purgeOnMe = require('./purgeOnMe.js')
const stackOnMe = require('./stackOnMe.js')
const experimental = require('./experimental.js')

help.info = function () {
  help.issued = '!help'
  help.description = 'Provides help on every available command.'
  help.message = 'Enter function to gather all information here..'
  return help
}

help.command = function (client, serverQueryClient) {
  logger.log('debug', 'Help command')
  var messageText = '\n\nList of admin commands:\n\n' +
                    '[b]' + help.info().issued + '[/b]' + '\n[i]' + help.info().description + '[/i]\n\n' +
                    //  + '[b]' + leet.info().issued + '[/b]' + '\n[i]' + leet.info().description + '[/i]\n\n'
                    '[b]' + databaseBackup.info().issued + '[/b]' + '\n[i]' + databaseBackup.info().description + '[/i]\n\n' +
                    '[b]' + kill.info().issued + '[/b]' + '\n[i]' + kill.info().description + '[/i]\n\n' +
                    '[b]' + showMatchup.info().issued + '[/b]' + '\n[i]' + showMatchup.info().description + '[/i]\n\n' +
                    '[b]' + userInfo.info().issued + '[/b]' + '\n[i]' + userInfo.info().description + '[/i]\n\n' +
                    '[b]' + purgeOnMe.info().issued + '[/b]' + '\n[i]' + purgeOnMe.info().description + '[/i]\n\n' +
                    '[b]' + stackOnMe.info().issued + '[/b]' + '\n[i]' + stackOnMe.info().description + '[/i]\n\n' +
                    '[b]' + experimental.info().issued + '[/b]' + '\n[i]' + experimental.info().description + '[/i]\n\n' +
                    '[b]' + move.info().issued + '[/b]' + '\n[i]' + move.info().description + '[/i]\n\n'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: messageText})
}
