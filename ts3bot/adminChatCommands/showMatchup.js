var showMatchup = exports
var logger = require('../logger')
var exec = require('child_process').exec
var util = require('util')
var config = JSON.parse(require('fs').readFileSync('config.json'))

showMatchup.info = function () {
  config = JSON.parse(require('fs').readFileSync('config.json'))
  showMatchup.issued = '!showMatchup'
  showMatchup.description = 'Show current matchup partner(s).'
  showMatchup.message = 'Currently allowed world IDs: ' + config.worldsAllowed
  return showMatchup
}

showMatchup.command = function (client, serverQueryClient) {
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: showMatchup.info().message})
}
