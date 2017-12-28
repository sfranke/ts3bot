const showMatchup = exports
const fs = require('fs')
const path = require('path')
const logger = require('../logger')
let config = JSON.parse(require('fs').readFileSync('config.json'))

showMatchup.info = function () {
  let serverNames = config.worldsAllowed.map(function (element) { return config.gameWorlds[element].serverName + ' (' + element + ')' })
  showMatchup.issued = '!showMatchup'
  showMatchup.description = 'Show current matchup partner.'
  showMatchup.message = 'Currently allowed worlds: ' + serverNames.toString().replace(',', ', ')
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
