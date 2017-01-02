var express = require('express')
var router = express.Router()
var database = require('./database')
var bcrypt = require('bcrypt')

router.get('/', function (req, res, next) {
  if (req.app.locals.registerState === false) {
    res.redirect('/')
  } else {
    res.render('register', {title: 'Register', session: req.session, message: req.flash('signupMessage')})
  }
})

router.post('/', function (req, res, next) {
  if (req.body.email !== '' && req.body.name !== '' && req.body.password !== '') {
    var user = {'name': req.body.name, 'email': req.body.email, 'password': req.body.password}
    generateHashedPassword(req.body.password, function (error, password) {
      if (error) console.log('error', 'Error while saving user.')
      user.password = password
      database.saveUser(user, function (error, user) {
        if (error) console.log('error', 'Error while saving user.')
        if (user != null) {
          req.session.user = user
          res.redirect('/account')
        } else {
          return res.redirect('/register', 422, {message: req.flash('signupMessage', 'That email is already taken')})
        }
      })
    })
  }
})

router.post('/toggle', function (req, res, next) {
  if (!req.session.user) {
    return res.status(401).send({error: 'Unauthorized', response: null})
  }
  if (req.session.user.permission === 'admin') {
    if (req.app.locals.registerState === false) {
      req.app.locals.registerState = true
      io.emit('register-show')
    } else {
      req.app.locals.registerState = false
      io.emit('register-hide')
    }
    return res.status(200).send({error: null, response: 'success'})
  } else {
    return res.status(403).send({error: 'Forbidden', response: null})
  }
})

function generateHashedPassword (password, callback) {
  var hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(9))
  callback(null, hashedPassword)
};

module.exports = router
