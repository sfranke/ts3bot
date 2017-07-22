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
  logger.log('info', '[Chat command]\n' + util.inspect(client))
  let message = new ChatMessage()
  serverQueryClient.send('sendtextmessage', message.chatSend('admin', client))
  logger.log('info', 'Received message from admin: ' + '\n' + '\'' + client.msg + '\'')
  logger.log('debug', 'ResponseObject on AdminMessage: ' + util.inspect(client))
  if (client.msg.length > 1) {
    let AdminMessageArray = client.msg.split(' ')
    logger.log('debug', 'AdminMessageArray after split() ' + AdminMessageArray)
    // Move any client to predefined AFK channel. AFK channel can be found in config file.
    if (AdminMessageArray[0] === '!move') {
      move.command(client, serverQueryClient, AdminMessageArray)
    }
    // Chat command to find general information about a client and whether or not (s)he
    // belongs to the commander server group. Also show the ingame commander status.
    if (AdminMessageArray[0] === '!userInfo') {
      userInfo.command(client, serverQueryClient, AdminMessageArray)
    }
    // Show current matchup utilizing an array config.worldsAllowed from the config file.
    // The config file is read each time when the command is executed to ensure it it reflects the
    // current state. Keep in mind the config file is loaded globally on start of the program.
    if (AdminMessageArray[0] === '!showMatchup') {
      showMatchup.command(client, serverQueryClient)
    }
    // Kill the current running process.
    if (AdminMessageArray[0] === '!kill') {
      kill.command(client, serverQueryClient)
    }
    // Creates a backup of the clients collection in form of a json formatted file.
    if (AdminMessageArray[0] === '!databaseBackup') {
      databaseBackup.command(client, serverQueryClient)
    }
    // Displays a chat response provding an overview of all available chat commands.
    if (AdminMessageArray[0] === '!help') {
      help.command(client, serverQueryClient)
    }
    // Chat command responding with a simple text message.
    if (AdminMessageArray[0] === '!1337') {
      leet.command(client, serverQueryClient)
    }
    // Chat command to purge a certain channel from idle clients.
    if (AdminMessageArray[0] === '!purgeOnMe') {
      purgeOnMe.command(client, serverQueryClient, AdminMessageArray)
    }
    if (AdminMessageArray[0] === '!stackOnMe') {
      stackOnMe.command(client, serverQueryClient, AdminMessageArray)
    }
    // Experimental chat command.
    if (AdminMessageArray[0] === '!experimental') {
      experimental.command(client, serverQueryClient, AdminMessageArray)
    }
  }
}
