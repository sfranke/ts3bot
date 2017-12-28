const adminChatCommands = exports
// const config = JSON.parse(require('fs').readFileSync('config.json'))
const ChatMessage = require('./chatMessage')
const logger = require('./logger')
const util = require('util')
// const exec = require('child_process').exec
// const database = require('./database')
const help = require('./adminChatCommands/help.js')
const leet = require('./adminChatCommands/leet.js')
const databaseBackup = require('./adminChatCommands/databaseBackup.js')
const kill = require('./adminChatCommands/kill.js')
const showMatchup = require('./adminChatCommands/showMatchup.js')
const userInfo = require('./adminChatCommands/userInfo.js')
const move = require('./adminChatCommands/move.js')
const purgeOnMe = require('./adminChatCommands/purgeOnMe.js')
const experimental = require('./adminChatCommands/experimental.js')
const stackOnMe = require('./adminChatCommands/stackOnMe.js')

adminChatCommands.execute = function (client, serverQueryClient) {
  logger.log('debug', 'client:\n' + util.inspect(client))
  logger.log('debug', 'serverquery:\n' + util.inspect(serverQueryClient))
  logger.log('debug', 'command: ' + client.msg)
  logger.log('info', '[Chat command] ' + client.invokeruid + ' ' + client.invokername + ' ' + client.msg.replace(/[^a-zA-Z0-9 !]/g, ''))
  let message = new ChatMessage()
  serverQueryClient.send('sendtextmessage', message.chatSend('admin', client))
  logger.log('info', 'Received message from admin: ' + '\'' + client.msg + '\'')
  logger.log('debug', 'ResponseObject on AdminMessage: ' + util.inspect(client))
  if (client.msg.length > 1) {
    let AdminMessageArray = client.msg.split(' ')
    logger.log('debug', 'AdminMessageArray after split() ' + AdminMessageArray)
    switch (AdminMessageArray[0]) {
      case '!move':
        // Move any client to predefined AFK channel. AFK channel can be found in config file.
        move.command(client, serverQueryClient, AdminMessageArray)
        break
      case '!userInfo':
        // Chat command to find general information about a client and whether or not (s)he
        // belongs to the commander server group. Also show the ingame commander status.
        userInfo.command(client, serverQueryClient, AdminMessageArray)
        break
      case '!showMatchup':
        // Show current matchup utilizing an array config.worldsAllowed from the config file.
        // The config file is read each time when the command is executed to ensure it it reflects the
        // current state. Keep in mind the config file is loaded globally on start of the program.
        showMatchup.command(client, serverQueryClient)
        break
      case '!kill':
        // Kill the current running process.
        kill.command(client, serverQueryClient)
        break
      case '!databaseBackup':
        // Creates a backup of the clients collection in form of a json formatted file.
        databaseBackup.command(client, serverQueryClient)
        break
      case '!help':
        // Displays a chat response provding an overview of all available chat commands.
        help.command(client, serverQueryClient)
        break
      case '!1337':
        // Chat command responding with a simple text message.
        leet.command(client, serverQueryClient)
        break
      case '!experimental':
        // Experimental chat command.
        experimental.command(client, serverQueryClient, AdminMessageArray)
        break
    }
    if (/^!purg/.test(AdminMessageArray[0].toLowerCase())) {
      purgeOnMe.command(client, serverQueryClient, AdminMessageArray)
    }
    if (/^!stack/.test(AdminMessageArray[0].toLowerCase())) {
      stackOnMe.command(client, serverQueryClient, AdminMessageArray)
    }
  }
}
