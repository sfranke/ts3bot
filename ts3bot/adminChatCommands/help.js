var help = exports
var logger = require('../logger')

help.info = function () {
  help.issued = '!help'
  help.description = 'Provides help on every available command.'
  help.message = 'Enter function to gather all information here..'
  return help
}

help.command = function (client, serverQueryClient) {
  logger.log('debug', 'Help command')
  // Find a way to gather this info from the commands.
  var msgHelpCommand = '\n\nAdmin commands:\n\n!move <clid>' + '\t\t\t' + 'Move <clid> to AFK-channel.' +
                            '\n!kill' + '\t\t\t\t\t\t' + '    Kill the application.' +
                            '\n!showMatchup' + '\t\t' + '   Show current match-up partner.' +
                            '\n!databaseBackup' + ' ' + '     Create a backup of the database.' +
                            '\n!userInfo <uid>' + '\t\t' + 'Get user info.'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: msgHelpCommand})
}
