const express = require('express')
const router = express.Router()
const fs = require('fs')

let tempLogArray = []

router.get('/', function (req, res, next) {
  if (!req.session.user) {
    return res.redirect('/')
  }
  // TODO: This should check if this user is known from wihtin our own database.
  if (req.session !== undefined && req.session.user !== undefined) {
    // return res.redirect('/')
    fs.access('./ts3bot/log', function (error, response) {
      if (error) {
        console.log(error)
        res.render('log', {title: 'Log', log: ['No log file found!'], session: req.session})
      } else {
        (function getLog () {
          let logArray = []
          let rl = require('readline').createInterface({
            input: require('fs').createReadStream('./ts3bot/log'),
            terminal: false
          })
          rl.on('line', function (line) {
            if (/\[Chat/.test(line)) {
              logArray.push(line)
            }
          })
          rl.on('close', function () {
            res.render('log', {title: 'Log', log: logArray, session: req.session})
            tempLogArray = logArray
            updateLog()
          })
        })()
      }
    })
  } else {
    return res.redirect('/')
  }
})

function updateLog () {
  let fileWatcher = fs.watch('./ts3bot/log', function (event, file) {
    if (event === 'error') {
      console.log('Error while accessing the logfile. ' + event)
    }
    if (event === 'change') {
      let rl = require('readline').createInterface({
        input: require('fs').createReadStream('./ts3bot/log'),
        terminal: false
      })
      rl.on('line', function (line) {
        if (/\[Chat/.test(line)) {
          if (tempLogArray.indexOf(line) === -1) {
            io.emit('newLine', line)
            tempLogArray.push(line)
          }
        }
      })
    }
  })
}

module.exports = router
