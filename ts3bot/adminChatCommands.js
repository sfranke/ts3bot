var adminChatCommands = exports
var config = JSON.parse(require('fs').readFileSync('config.json'))
var chatMessage = require('./chatMessage')
var logger = require('./logger')
var util = require('util')
var exec = require('child_process').exec
var database = require('./database')
var help = require('./adminChatCommands/help.js')
var leet = require('./adminChatCommands/leet.js')
var databaseBackup = require('./adminChatCommands/databaseBackup.js')
var kill = require('./adminChatCommands/kill.js')
var showMatchup = require('./adminChatCommands/showMatchup.js')
var userInfo = require('./adminChatCommands/userInfo.js')
var move = require('./adminChatCommands/move.js')

adminChatCommands.execute = function (client, serverQueryClient) {
  console.log('client:', client)
  console.log('serverquery:', serverQueryClient)
  console.log('command:', client.msg)
  var message = new chatMessage()
  serverQueryClient.send('sendtextmessage', message.chatSend('admin', client))
  logger.log('info', 'Received message from admin: ' + '\n' + '\'' + client.msg + '\'')
  logger.log('debug', 'ResponseObject on AdminMessage: ' + util.inspect(client))
  if (client.msg.length > 1) {
    var AdminMessageArray = client.msg.split(' ')
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
  }
}
