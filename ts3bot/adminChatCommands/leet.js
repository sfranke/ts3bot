var leet = exports
var logger = require('../logger')

leet.info = function () {
  leet.issued = '!1337'
  leet.description = 'A placeholder command'
  leet.message = 'You are AWESOME!'
  return leet
}

leet.command = function (client, serverQueryClient) {
  logger.log('deubg', 'Hi leet command')
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: leet.info().message})
}
