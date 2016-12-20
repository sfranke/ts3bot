var express = require('express')
var router = express.Router()
var database = require('./database')
var bcrypt = require('bcrypt')
var util = require('util')
var colors = require('colors')

router.get('/', function (req, res, next) {
  // console.log('Session:', req.session);
  res.render('login', {title: 'Express', session: req.session})
})

router.post('/', function (req, res, next) {
  var user = {'email': req.body.email, 'password': req.body.password}
  console.log('email' + req.body.email)
  console.log('email' + req.body.password)
  database.getUser(user, function (error, user) {
    if (error) console.log('Error while getting user: ' + util.inspect(error))
    // console.log('error', error)
    // console.log('user', user)

    if (user != null) {
      console.log('Password check: ', bcrypt.compareSync(req.body.password, user.password))
      if (bcrypt.compareSync(req.body.password, user.password) === true) {
        console.log('Password correct!'.green.bold)
        req.session.user = user
        res.redirect('/account')
      } else {
        console.log('Wrong password!'.bold.red)
        return res.redirect('/register')
      }
    } else {
      return res.redirect('/register')
    }
  })
})

module.exports = router
