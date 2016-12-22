var adminChatCommands = exports
var config = JSON.parse(require('fs').readFileSync('config.json'))
var chatMessage = require('./chatMessage')
var logger = require('./logger')
var util = require('util')
var exec = require('child_process').exec
var database = require('./database')

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
      logger.log('debug', 'arg: ' + AdminMessageArray[1])
      var uid = AdminMessageArray[1].toString()
      serverQueryClient.send('clientgetids', {cluid: uid}, function (error, response) {
        logger.log('debug', 'clientgetids error:\n' + util.inspect(error))
        logger.log('debug', 'clientgetids response:\n' + util.inspect(response))
        if (error !== undefined) {
          serverQueryClient.send('clientgetdbidfromuid', {cluid: uid}, function (error, response) {
            if (error) logger.log('debug', 'Unknown UID: ' + util.inspect(error))
            logger.log('debug', 'clientgetdbidfromuid error:\n' + util.inspect(error))
            logger.log('debug', 'clientgetdbidfromuid response:\n' + util.inspect(response))
            if (!error) {
              serverQueryClient.send('clientdbinfo', {cldbid: response.cldbid}, function (error, response) {
                if (error) logger.log('debug', 'Unknown UID: ' + util.inspect(error))
                logger.log('debug', 'clientdbinfo error:\n' + util.inspect(error))
                logger.log('debug', 'clientdbinfo response:\n' + util.inspect(response))
                var userName = response.client_nickname
                var lastSeen = new Date(response.client_lastconnected * 1000)
                var commander = 'No'
                serverQueryClient.send('servergroupsbyclientid', {cldbid: response.client_database_id}, function (error, response) {
                  if (error) logger.log('debug', 'servergroupsbyclientid error:\n' + util.inspect(error))
                  logger.log('debug', 'servergroupsbyclientid response:\n' + util.inspect(response))
                  response.forEach(function (servergroup) {
                    if (parseInt(servergroup.sgid) === config.commanderServerGroupId) {
                      logger.log('debug', 'Found commander!')
                      commander = 'Yes'
                    } else {
                      logger.log('debug', 'Commander not found!')
                    }
                  })
                  var msg = '\n[B]Username[/B]: ' + userName + '\n[B]Last seen[/B]: ' + lastSeen + '\n[B]Commander[/B]: ' + commander
                  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID, msg: msg})
                })
              })
            }
          })
        }
        if (response !== undefined) {
          serverQueryClient.send('clientinfo', {clid: response.clid}, function (error, response) {
            logger.log('debug', 'clientinfo error:\n' + util.inspect(error))
            logger.log('debug', 'clientinfo response:\n' + util.inspect(response))
            if (response !== undefined) {
              var userName = response.client_nickname
              var lastSeen = new Date(response.client_lastconnected * 1000)
              var commander = 'No'
              logger.log('debug', 'TEST ===> ' + typeof response.client_servergroups)
              if (response.client_servergroups.toString().indexOf(config.commanderServerGroupId) !== -1) {
                logger.log('debug', 'Found commander: ' + response.client_servergroups.indexOf(config.commanderServerGroupId))
                commander = 'Yes'
              }
              var msg = '\n[B]Username[/B]: ' + userName + '\n[B]Last seen[/B]: ' + lastSeen + '\n[B]Commander[/B]: ' + commander
              serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID, msg: msg})
            }
          })
        }
      })
    }
    // Show current matchup utilizing an array config.worldsAllowed from the config file.
    // The config file is read each time when the command is executed to ensure it it reflects the
    // current state. Keep in mind the config file is loaded globally on start of the program.
    if (AdminMessageArray[0] === '!showMatchup') {
      config = JSON.parse(require('fs').readFileSync('config.json'))
      var msg = 'Currently allowed world IDs: ' + config.worldsAllowed
      serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID, msg: msg})
    }
    // Kill switch for the program via chat command. If issued the program is exiting.
    if (AdminMessageArray[0] === '!kill') {
      var msgKill = 'Shutting down now..'
      serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID, msg: msgKill})
      setTimeout(function () {
        process.exit()
      }, 1000)
    }
    if (AdminMessageArray[0] === '!databaseBackup') {
      logger.log('debug', 'Backing up database.')
      var msgDbBackup = 'Backing up database..'
      serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID, msg: msgDbBackup})
      exec('mongoexport -d ts3bot -c clients -o clients_backup.json', function (error, stdout, stderr) {
        if (error) logger.log('debug', 'Error while creating database dump. ' + util.inspect(error))
        logger.log('debug', 'Creating database dump, stderr: ' + util.inspect(stderr))
        logger.log('debug', 'Creating database dump, stdout: ' + util.inspect(stdout))
      })
    }
    if (AdminMessageArray[0] === '!help') {
      logger.log('debug', 'Help command')
      var msgHelpCommand = '\n\nAdmin commands:\n\n!move <clid>' + '\t\t\t' + 'Move <clid> to AFK-channel.' +
                                '\n!kill' + '\t\t\t\t\t\t' + '    Kill the application.' +
                                '\n!showMatchup' + '\t\t' + '   Show current match-up partner.' +
                                '\n!databaseBackup' + ' ' + '     Create a bcakup of the database.' +
                                '\n!userInfo <uid>' + '\t\t' + 'Get user info.'
      serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID, msg: msgHelpCommand})
    }
    if (AdminMessageArray[0] === '!1337') {
      logger.log('deubg', 'Hi leet commadn')
      var msg1337Command = 'What a great day!'
      serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID, msg: msg1337Command})
    }
  }
}
