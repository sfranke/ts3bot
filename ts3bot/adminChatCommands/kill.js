var kill = exports
var logger = require('../logger')
var exec = require('child_process').exec
var util = require('util')

kill.info = function () {
  kill.issued = '!kill'
  kill.description = 'Shutting down the system via chat command.'
  kill.message = 'Shutting down now..'
  return kill
}

kill.command = function (client, serverQueryClient) {
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: kill.info().message})
  setTimeout(function () {
    process.exit()
  }, 1000)
}
