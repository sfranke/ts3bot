var express = require('express')
var router = express.Router()
var exec = require('child_process').exec
var moment = require('moment')

/* GET home page. */
router.get('/', function (req, res, next) {
  console.log('Session:', req.session)
  exec('pm2 jlist', function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error)
    } else {
      var status = JSON.parse(stdout)
      serverTime()
      res.render('index', {title: 'Status', status: status, session: req.session})
    }
  })
})

function serverTime () {
  setInterval(function () {
    io.emit('serverTime', moment(new Date().getTime()).format('HH:mm:ss'))
  }, 1000)
}

module.exports = router
