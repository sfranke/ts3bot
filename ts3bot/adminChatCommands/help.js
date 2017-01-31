var help = exports
var config = JSON.parse(require('fs').readFileSync('config.json'))
var chatMessage = require('../chatMessage')
var logger = require('../logger')
var util = require('util')
var exec = require('child_process').exec
var database = require('../database')


help.command = function (client, serverQueryClient) {
  console.log('TEST')
  console.log('client:', client)
  logger.log('debug', 'Help command')
  var msgHelpCommand = '\n\nAdmin commands:\n\n!move <clid>' + '\t\t\t' + 'Move <clid> to AFK-channel.' +
                            '\n!kill' + '\t\t\t\t\t\t' + '    Kill the application.' +
                            '\n!showMatchup' + '\t\t' + '   Show current match-up partner.' +
                            '\n!databaseBackup' + ' ' + '     Create a backup of the database.' +
                            '\n!userInfo <uid>' + '\t\t' + 'Get user info.'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: msgHelpCommand})
}
