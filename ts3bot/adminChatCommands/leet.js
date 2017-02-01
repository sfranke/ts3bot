var leet = exports
var logger = require('../logger')

leet.info = function () {
  leet.issued = '!1337'
  leet.description = 'A placeholder command'
  leet.message = 'What a great day!'
  return leet
}

leet.command = function (client, serverQueryClient) {
  logger.log('deubg', 'Hi leet command')
  var msg1337Command = 'What a great day!'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: msg1337Command})
}
