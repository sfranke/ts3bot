const userChatCommands = exports
const ChatMessage = require('./chatMessage')
const logger = require('./logger')
const util = require('util')
const helpUser = require('./adminChatCommands/helpUser.js')
const welcome = require('./adminChatCommands/welcome.js')

userChatCommands.execute = function (client, serverQueryClient) {
  logger.log('debug', 'serverquery:\n' + util.inspect(serverQueryClient))
  logger.log('debug', 'client:\n' + util.inspect(client))
  logger.log('debug', 'command: ' + client.msg)
  logger.log('info', '[Chat command User] ' + client.invokeruid + ' ' + client.invokername + ' ' + client.msg.replace(/[^a-zA-Z0-9 !]/g, ''))
  let message = new ChatMessage()
  serverQueryClient.send('sendtextmessage', message.chatSend('admin', client))
  logger.log('info', 'Received message from user: ' + '\'' + client.msg + '\'')
  logger.log('debug', 'ResponseObject on userMessage: ' + util.inspect(client))
  if (client.msg.length > 1) {
    let userMessageArray = client.msg.split(' ')
    // Displays a chat response provding an overview of all available chat commands.
    if (userMessageArray[0] === '!help') {
      helpUser.command(client, serverQueryClient)
    }

    // Looking for something matching '/.*perm.*/' to have maximum flexibility when recognizing
    // a user asking to get permissions in chat.
    const permStringIndexList = userMessageArray
      .filter(function (string) { return string.toLowerCase().trim() })
      .map(function (string, index) { return /.*perm.*/g.test(string.toLowerCase()) ? index : undefined })
      .filter(function (index) { return index !== undefined })

    // Initiates a welcome message.
    if (!!permStringIndexList.length) {
      welcome.command(client, serverQueryClient, userMessageArray)
    }
  }
}
