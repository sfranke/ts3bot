const helpCommander = exports
const logger = require('../logger')
const purgeOnMe = require('./purgeOnMe.js')

helpCommander.info = function () {
  helpCommander.issued = '!help'
  helpCommander.description = 'Provides help on every available command.'
  helpCommander.message = 'Enter function to gather all information here..'
  return helpCommander
}

helpCommander.command = function (client, serverQueryClient) {
  logger.log('debug', 'Help command')
  var messageText = '\n\nList of commander commands:\n\n' +
                    '[b]' + helpCommander.info().issued + '[/b]' + '\n[i]' + helpCommander.info().description + '[/i]\n\n' +
                    '[b]' + purgeOnMe.info().issued + '[/b]' + '\n[i]' + purgeOnMe.info().description + '[/i]\n\n'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: messageText})
}
