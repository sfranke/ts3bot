var adminChatCommands = exports
var config = JSON.parse(require('fs').readFileSync('config.json'))
var chatMessage = require('./chatMessage')
var logger = require('./logger')
var util = require('util')

adminChatCommands.execute = function (response, serverQueryClient) {
  console.log('client:', response)
  console.log('serverquery:', serverQueryClient)
  console.log('command:', response.msg)
  var message = new chatMessage()
  serverQueryClient.send('sendtextmessage', message.chatSend('admin', response))
  logger.log('info', 'Received message from admin: ' + '\n' + '\'' + response.msg + '\'')
  logger.log('debug', 'ResponseOnject on AdminMessage: ' + util.inspect(response))
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
        logger.log('debug', 'ClientDBFind error:\n' + util.inspect(error))
        logger.log('debug', 'ClientDBFind response:\n' + util.inspect(response))
        if (response !== undefined) {
          logger.log('debug', 'ClientDBId: ' + util.inspect(response))
          serverQueryClient.send('clientinfo', {clid: response.clid}, function (error, response) {
            logger.log('debug', 'clientinfo error:\n' + util.inspect(error))
            logger.log('debug', 'clientinfo response:\n' + util.inspect(response))
            if (response !== undefined) {
              var userName = response.client_nickname
              var lastSeen = new Date(response.client_lastconnected * 1000)
              var commander = 'No'
              if (response.client_servergroups.indexOf(config.commanderServerGroupId) !== -1) {
                logger.log('debug', 'Found commander: ' + response.client_servergroups.indexOf(config.commanderServerGroupId))
                commander = 'Yes'
              }
              var msg = '\n[B]Username[/B]: ' + userName + '\n[B]Last seen[/B]: ' + lastSeen + '\n[B]Commander[/B]: ' + commander
              serverQueryClient.send('sendtextmessage', {targetmode: '1', target: adminID,
              msg: msg})
            }
          })
        }
      })
    }
  }

}
