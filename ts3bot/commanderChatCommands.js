const commanderChatCommands = exports
const ChatMessage = require('./chatMessage')
const logger = require('./logger')
const util = require('util')
const helpCommander = require('./adminChatCommands/helpCommander.js')
const purgeOnMe = require('./adminChatCommands/purgeOnMe.js')

commanderChatCommands.execute = function (client, serverQueryClient) {
  // logger.log('debug', 'client:\n' + util.inspect(client))
  logger.log('debug', 'serverquery:\n' + util.inspect(serverQueryClient))
  logger.log('debug', 'command: ' + client.msg)
  logger.log('info', '[Chat command Commander]\n' + util.inspect(client))
  let message = new ChatMessage()
  serverQueryClient.send('sendtextmessage', message.chatSend('admin', client))
  logger.log('info', 'Received message from commander: ' + '\n' + '\'' + client.msg + '\'')
  logger.log('debug', 'ResponseObject on CommanderMessage: ' + util.inspect(client))
  if (client.msg.length > 1) {
    let AdminMessageArray = client.msg.split(' ')
    // Displays a chat response provding an overview of all available chat commands.
    if (AdminMessageArray[0] === '!help') {
      helpCommander.command(client, serverQueryClient)
    }
    // Chat command to purge a certain channel from idle clients.
    if (AdminMessageArray[0] === '!purgeOnMe') {
      purgeOnMe.command(client, serverQueryClient, AdminMessageArray)
    }
  }
}
