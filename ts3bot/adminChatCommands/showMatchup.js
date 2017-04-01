var showMatchup = exports
var fs = require('fs')
var path = require('path')
var logger = require('../logger')
var config = JSON.parse(require('fs').readFileSync('config.json'))

showMatchup.info = function () {
  showMatchup.issued = '!showMatchup'
  showMatchup.description = 'Show current matchup partner.'
  showMatchup.message = 'Currently allowed world IDs: ' + config.worldsAllowed
  return showMatchup
}

showMatchup.command = function (client, serverQueryClient) {
  fs.readFile(path.join(__dirname, '../config.json'), 'utf8', function (error, response) {
    if (error) {
      logger.log('debug', 'Error while reading config file.' + error)
    } else {
      logger.log('debug', 'Reading from config file.' + response)
      config = JSON.parse(response)
      serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: showMatchup.info().message})
    }
  })
}
