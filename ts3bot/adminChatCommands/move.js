var move = exports
var logger = require('../logger')
var util = require('util')
var config = JSON.parse(require('fs').readFileSync('config.json'))
var database = require('../database')

move.info = function () {
  move.issued = '!kill'
  move.description = 'Shutting down the system via chat command.'
  move.message = 'Currently allowed world IDs: '
  return move
}

move.command = function (client, serverQueryClient, AdminMessageArray) {
  // Validate client ID here.
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
