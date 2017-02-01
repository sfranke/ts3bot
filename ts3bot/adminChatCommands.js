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

adminChatCommands.execute = function (response, serverQueryClient) {
  console.log('client:', response)
  console.log('serverquery:', serverQueryClient)
  console.log('command:', response.msg)
  var message = new chatMessage()
  serverQueryClient.send('sendtextmessage', message.chatSend('admin', response))
  logger.log('info', 'Received message from admin: ' + '\n' + '\'' + response.msg + '\'')
  logger.log('debug', 'ResponseObject on AdminMessage: ' + util.inspect(response))
  var adminID = response.invokerid
  if (response.msg.length > 1) {
    var AdminMessageArray = response.msg.split(' ')
    logger.log('debug', 'AdminMessageArray after split() ' + AdminMessageArray)
    if (AdminMessageArray[0] === '!move') {
      var clid = AdminMessageArray[1]
      serverQueryClient.send('clientmove', {clid: clid, cid: config.afkChannel}, function (error, response) {
        if (error !== undefined) {
          logger.log('error', 'While \'clientmove\': ' + error.msg)
          logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error))
        } else {
          logger.log('info', 'Sending idle poke.')
          serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clid, msg: config.idleMove})
        }
      })
    }
    // Chat command to find general information a client and whether or not she belongs to
    // the commander server group.
    if (AdminMessageArray[0] === '!userInfo') {
      userInfo.command(response, serverQueryClient, AdminMessageArray)
    }
    // Show current matchup utilizing an array config.worldsAllowed from the config file.
    // The config file is read each time when the command is executed to ensure it it reflects the
    // current state. Keep in mind the config file is loaded globally on start of the program.
    if (AdminMessageArray[0] === '!showMatchup') {
      showMatchup.command(response, serverQueryClient)
    }
    if (AdminMessageArray[0] === '!kill') {
      kill.command(response, serverQueryClient)
    }
    if (AdminMessageArray[0] === '!databaseBackup') {
      databaseBackup.command(response, serverQueryClient)
    }
    if (AdminMessageArray[0] === '!help') {
      help.command(response, serverQueryClient)
    }
    if (AdminMessageArray[0] === '!1337') {
      leet.command(response, serverQueryClient)
    }
  }
}
