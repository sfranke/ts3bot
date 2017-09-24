const logger = exports
const helper = require('./helper.js')
const config = helper.getConfig()
const path = require('path')
const fs = require('fs')

logger.debuglevel = config.debuglevel
fs.openSync(path.join(__dirname, '/log'), 'a')

function date () {
  var date = new Date()
  return date
}

logger.log = function (level, message) {
  var levels = ['error', 'warning', 'info', 'debug']
  if (levels.indexOf(level) <= levels.indexOf(logger.debuglevel)) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message)
    }
    console.log(date() + ' ' + level + ': ' + message)
    fs.appendFile(path.join(__dirname, '/log'), date() + ' ' + level + ': ' + message + '\n', function (err) {
      if (err) {
        logger.log('error', 'Failed to write to log file!')
      }
    })
  }
}
