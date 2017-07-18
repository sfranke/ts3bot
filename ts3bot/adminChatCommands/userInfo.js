var userInfo = exports
var logger = require('../logger')
var util = require('util')
var config = JSON.parse(require('fs').readFileSync('config.json'))
var database = require('../database')

userInfo.info = function () {
  userInfo.issued = '!userInfo <Uid>'
  userInfo.description = 'Basic information about a client by its Uid.'
  userInfo.message = 'Currently allowed world IDs: '
  return userInfo
}

userInfo.command = function (client, serverQueryClient, AdminMessageArray) {
  logger.log('debug', 'arg: ' + AdminMessageArray[1])
  var uid = AdminMessageArray[1].toString()
  var gw2Commander = 'No'
  database.getClientByUid(uid, function (error, response) {
    console.log('TEST-1\n' + util.inspect(error))
    console.log('TEST-2\n' + util.inspect(response))
    if (error) logger.log('debug', 'Error during !userInfo database.getClientByUid: ' + util.inspect(error))
    logger.log('debug', 'Client found during !userInfo database.getClientByUid: ' + util.inspect(response))
    if (response === null) {
      logger.log('info', 'This is not a valid uid.')
    }
    if (response !== null) {
      if (response.gw2_commander === null) {
        gw2Commander = 'Unknown'
      }
      if (response.gw2_commander === false) {
        gw2Commander = 'No'
      }
      if (response.gw2_commander === true) {
        gw2Commander = 'Yes'
      }
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
                  logger.log('debug', '====================>>> response object: ' + util.inspect(response))
                  logger.log('debug', '====================>>> response object: ' + response.length)
                  if (response.length === undefined) {
                    console.log('debug', 'Offline client with only one servergroup')
                  } else {
                    response.forEach(function (servergroup) {
                      if (parseInt(servergroup.sgid) === config.commanderServerGroupId) {
                        logger.log('debug', 'Found commander!')
                        commander = 'Yes'
                      } else {
                        logger.log('debug', 'Commander not found!')
                      }
                    })
                  }
                  var msg = '\n[B]Username[/B]: ' + userName + '\n[B]Last seen[/B]: ' + lastSeen + '\n[B]Member of commander server group[/B]: ' + commander + '\n[B]Ingame commander tag[/B]: ' + gw2Commander
                  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: msg})
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
              var msg = '\n[B]Username[/B]: ' + userName + '\n' +
              '[B]Last seen[/B]: ' + lastSeen + '\n' +
              '[B]Member of commander server group[/B]: ' + commander + '\n' +
              '[B]Ingame commander tag[/B]: ' + gw2Commander
              serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: msg})
            }
          })
        }
      })
    }
  })
}
