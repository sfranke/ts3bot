#!/usr/bin/node

const config = JSON.parse(require('fs').readFileSync('config.json'))
const util = require('util')
const logger = require('./logger')
const events = require('events')

function chatMessage (user) {
  chatMessage.prototype.chatSend = function (option, user) {
    let opt = option
    let message = ''
    switch (opt) {
      case 'welcome':
        message = {targetmode: '1', target: user.clid, msg: config.welcomeMessage}
        logger.log('info', 'Sending ' + user.client_nickname + ' welcomeMessage')
        break
      case 'welcomePokeMsg':
        logger.log('debug', 'userObject: ' + util.inspect(user))
        message = {clid: user.clid, msg: config.welcomePokeMsg}
        logger.log('info', 'Sending ' + user.client_nickname + ' welcomePoke')
        break
      case 'checkingKey':
        message = {targetmode: '1', target: user.invokerid, msg: config.checkingKey}
        logger.log('info', 'Checking valid key.. ' + '\n\t' + '\'' + user.msg + '\'')
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
      default:
        break
    }
    return message
  }
}

util.inherits(chatMessage, events.EventEmitter)
module.exports = chatMessage
