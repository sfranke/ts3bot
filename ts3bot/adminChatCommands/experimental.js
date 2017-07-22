var experimental = exports
var logger = require('../logger')
var util = require('util')
// var config = JSON.parse(require('fs').readFileSync('config.json'))

experimental.info = function () {
  experimental.issued = '!experimental'
  experimental.description = 'Various experimental stuffz.'
  experimental.message = 'Experimental message.'
  return experimental
}

experimental.command = function (client, serverQueryClient, AdminMessageArray) {
  serverQueryClient.send('channellist', ['secondsempty'], function (error, response) {
    logger.log('debug', 'Error while channellist [\'secondsempty\']\n' + util.inspect(error))
    logger.log('debug', 'Response while channellist [\'secondsempty\']\n' + util.inspect(response))
  })
  // Validate client ID here.
  // var clid = AdminMessageArray[1]
  // serverQueryClient.send('clientmove', {clid: clid, cid: config.afkChannel}, function (error, response) {
  //   if (error !== undefined) {
  //     logger.log('error', 'While \'clientmove\': ' + error.msg)
  //     logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error))
  //   } else {
  //     logger.log('info', 'Sending idle poke.')
  //     serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clid, msg: experimental.info().message})
  //   }
  // })
}
