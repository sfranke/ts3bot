var express = require('express')
var router = express.Router()
var exec = require('child_process').exec
var moment = require('moment')
var database = require('./database')
var util = require('util')
var bcrypt = require('bcrypt')

/* GET home page. */
router.get('/', function (req, res, next) {
  // console.log('Session:', req.session)
  var adminUser = {
    'name': 'admin',
    'email': 'admin@localhost.com',
    'password': null,
    'permission': 'admin'
  }
  database.getUser(adminUser, function (error, response) {
    if (error) {
      console.log('Error while looking for admin user.\n' + util.inspect(error))
      // Create admin user here!
      adminUser.password = Math.random().toString(32).slice(2)
      console.log('ADMIN PASSWORD: ' + adminUser.password)
      generateHashedPassword(adminUser.password, function (error, password) {
        if (error) console.log('error', 'Error while saving user.')
        adminUser.password = password
        database.saveUser(adminUser, function (error, user) {
          if (error) console.log('error', 'Error while saving user.' + util.inspect(error))
          if (user != null) {
            console.log('Admin user created and saved!' + util.inspect(user))
          }
        })
      })
    } else {
      console.log('Admin user already exists.')
    }
  })

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

function generateHashedPassword (password, callback) {
  var hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(9))
  // console.log('Hashed password:', hashedPassword)
  callback(null, hashedPassword)
};

module.exports = router
