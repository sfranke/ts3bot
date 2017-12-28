const helpUser = exports
const logger = require('../logger')

helpUser.info = function () {
  helpUser.issued = '!help'
  helpUser.description = 'Provides help on every available command.'
  helpUser.message = 'Enter function to gather all information here..'
  return helpUser
}

helpUser.command = function (client, serverQueryClient) {
  logger.log('debug', 'Help command')
  var messageText = '\n\nList of user commands:\n\n' +
                    '[b]' + helpUser.info().issued + '[/b]' + '\n[i]' + helpUser.info().description + '[/i]\n\n'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: messageText})
}
