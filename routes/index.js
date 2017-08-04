const express = require('express')
const router = express.Router()
const database = require('./database')
const util = require('util')
const bcrypt = require('bcrypt')
const pm2 = require('pm2')
const moment = require('moment')

let status = []

/* GET home page. */
router.get('/', function (req, res, next) {
  // console.log('Session:', req.session)
  let adminUser = {
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
    }
  })

  getPm2ProcessStatus(function (error, status) {
    if (error !== null) {
      console.log('Error while fetching process status via pm2\n' + util.inspect(error))
      res.render('index', {title: 'Status', status: status, session: req.session})
    } else {
      res.render('index', {title: 'Status', status: status, session: req.session})
    }
  })
})

function getPm2ProcessStatus (callback) {
  pm2.describe('ts3bot', function (error, response) {
    if (error) {
      console.log('Error while fetching pm2 status.' + util.inspect(error))
      callback(error, null)
    }
    if (response.length === 0) {
      callback(null, status)
    }
    if (response.length !== 0) {
      status = response
      callback(null, status)
    }
  })
}

function generateHashedPassword (password, callback) {
  let hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(9))
  // console.log('Hashed password:', hashedPassword)
  callback(null, hashedPassword)
}

module.exports = router
