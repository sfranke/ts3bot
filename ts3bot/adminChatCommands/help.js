var help = exports
var logger = require('../logger')
var fs = require('fs')
var util = require('util')

// Require all chat commands here, so we have access.
var help = require('./help.js')
var leet = require('./leet.js')
var databaseBackup = require('./databaseBackup.js')
var kill = require('./kill.js')
var showMatchup = require('./showMatchup.js')
var userInfo = require('./userInfo.js')
var move = require('./move.js')

help.info = function () {
  help.issued = '!help'
  help.description = 'Provides help on every available command.'
  help.message = 'Enter function to gather all information here..'
  return help
}

help.command = function (client, serverQueryClient) {
  logger.log('debug', 'Help command')
  var messageText = '\n\nList of admin commands:\n\n'
                     + '[b]' + help.info().issued + '[/b]' + '\n[i]' + help.info().description + '[/i]\n\n'
                    //  + '[b]' + leet.info().issued + '[/b]' + '\n[i]' + leet.info().description + '[/i]\n\n'
                     + '[b]' + databaseBackup.info().issued + '[/b]' + '\n[i]' + databaseBackup.info().description + '[/i]\n\n'
                     + '[b]' + kill.info().issued + '[/b]' + '\n[i]' + kill.info().description + '[/i]\n\n'
                     + '[b]' + showMatchup.info().issued + '[/b]' + '\n[i]' + showMatchup.info().description + '[/i]\n\n'
                     + '[b]' + userInfo.info().issued + '[/b]' + '\n[i]' + userInfo.info().description + '[/i]\n\n'
                     + '[b]' + move.info().issued + '[/b]' + '\n[i]' + move.info().description + '[/i]\n\n'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: messageText})
}
