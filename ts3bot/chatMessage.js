#!/usr/bin/node

var config = JSON.parse(require('fs').readFileSync('config.json'))
var util = require('util')
var logger = require('./logger')
var events = require('events')
var exec = require('child_process').exec

function chatMessage (user) {
  chatMessage.prototype.chatSend = function (option, user) {
    var opt = option
    var message = ''
    switch (opt) {
      case 'welcome':
        message = {targetmode: '1', target: user.clid, msg: config.welcomeMessage}
        logger.log('info', 'Sending ' + user.client_nickname + ' welcomeMessage')
        break
      case 'welcomePoke':
        message = {clid: user.clid, msg: config.welcomePoke}
        logger.log('info', 'Sending ' + user.client_nickname + ' welcomePoke')
        break
      case 'checkingKey':
        message = {targetmode: '1', target: user.invokerid, msg: config.checkingKey}
        logger.log('info', 'Checking valid key.. ' + '\n\t' + '\'' + user.msg + '\'')
        break
      case 'foreignWorld':
        message = {
          targetmode: '1',
          target: user.invokerid,
          msg: config.foreignWorld + ' ' + user.accountWorldName
        }
        logger.log('info', 'API-key is associated with ' + user.accountWorldName)
        break
      case 'httpError':
        message = {targetmode: '1', target: user.invokerid, msg: config.serverNotResponding}
        logger.log('info', 'Restarting in 3 seconds.')
        break
      case 'alreadyInUse':
        message = {targetmode: '1', target: user.invokerid, msg: config.alreadyInUse}
        logger.log(
          'info', 'Key used by other client.\n' +
          '(' + user.invokerid + ')' + user.invokername + ': ' +
          user.invokeruid + ' \'' + user.apiKey + '\''
        )
        break
      case 'keyNotValid  ':
        message = {targetmode: '1', target: user.invokerid, msg: config.keyNotValid}
        logger.log(
          'warning', 'Key not valid.\n' +
          '(' + user.invokerid + ')' +
          user.invokername + ': ' + '\'' + user.msg + '\''
        )
        break
      case 'keyNotValidWhitespace':
        message = {targetmode: '1', target: user.invokerid, msg: config.keyNotValid}
        logger.log('info', 'API-key not valid (whitespace)..' + '\n\t' + '\'' + user.msg + '\'')
        break
      case 'keyNotValid400':
        message = {targetmode: '1', target: user.invokerid, msg: config.keyNotValid400}
        logger.log('warning', 'Key not valid, confirmed by API.')
        break
      case 'keyNotValidNull':
        message = {targetmode: '1', target: user.invokerid, msg: config.keyNotValid400}
        logger.log('warning', 'API-key is NULL.')
        break
      case 'apiErrorErrBadData':
        message = {targetmode: '1', target: user.invokerid, msg: config.apiErrorErrBadData}
        logger.log(
          'error',
          'Received - ErrBadData for:\n\tNick: ' + user.invokername +
          ' Uid: ' + user.invokeruid
        )
        break
      case 'api503':
        message = {targetmode: '1', target: user.invokerid, msg: config.api503}
        logger.log('info', 'Service unavailable (503)')
        break
      case 'admin':
        switch (user.msg) {
          case '!bot':
            message = {
              targetmode: '1',
              target: user.invokerid,
              msg: 'At your service oh mighty Admin! *bow'
            }
            break
          case '!kill':
            message = {
              targetmode: '1',
              target: user.invokerid,
              msg: 'Restarting now..'
            }
            setTimeout(function () {
              process.exit()
            }, 3000)
            break
          case '!showMatchup':
            config = JSON.parse(require('fs').readFileSync('config.json'))
            logger.log('debug', 'Current worlds allowed: ' + config.worldsAllowed)
            message = {
              targetmode: '1',
              target: user.invokerid,
              msg: 'Currently allowed world IDs: ' + config.worldsAllowed
            }
            break
          case '!DatabaseBackup':
            logger.log('debug', 'Backing up database.')
            message = {
              targetmode: '1',
              target: user.invokerid,
              msg: 'Backing up database..'
            }
            exec('mongoexport -d ts3bot -c clients -o clients_backup.json', function (error, stdout, stderr) {
              if (error) logger.log('debug', 'Error while creating database dump. ' + util.inspect(error))
              logger.log('debug', 'Creating database dump, stderr: ' + util.inspect(stderr))
              logger.log('debug', 'Creating database dump, stdout: ' + util.inspect(stdout))
            })
            break
          case '!help':
            message = {
              targetmode: '1',
              target: user.invokerid,
              msg: '\nAdmin commands:\n\n!move <clid>' + '\t\t\t' + 'Move <clid> to AFK-channel.' +
                                    '\n!kill' + '\t\t\t\t\t\t' + '    Kill the application.' +
                                    '\n!showMatchup' + '\t\t' + '   Show current match-up partner.'
            }
            break
          case '!commands':
            message = {targetmode: '1', target: user.invokerid, msg: 'This could be a list of commands.'}
            break
          case '!awesome':
            message = {targetmode: '1', target: user.invokerid, msg: 'I love you my dear!'}
            break
          default:
            break
        }
        break
      default:
        break
    }
    return message
  }
}

util.inherits(chatMessage, events.EventEmitter)
module.exports = chatMessage
