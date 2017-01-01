var express = require('express')
var router = express.Router()
var database = require('./database')
var util = require('util')

router.get('/', function (req, res, next) {
  if (!req.session.user) {
    return res.redirect('/register')
  }
  if (req.session.user.permission === 'admin') {
    database.getAllUsers(function (error, users) {
      if (error) console.log('Error while getAllUsers.')
      res.render('users', {title: 'Users', session: req.session, users: users})
    })
  } else {
    return res.redirect('/')
  }
})

router.post('/delete/:id', function (req, res, next) {
  if (!req.session.user) {
    return res.redirect('/register')
  }
  if (req.session.user.permission === 'admin') {
    database.deleteUser(req.params.id, function (error, doc) {
      if (error) console.log('Error while deleteUser.', error)
      res.json({message: 'success'})
    })
  }
})

router.post('/updateUser/:id/:permission', function (req, res, next) {
  if (!req.session.user) {
    return res.redirect('/register')
  }
  if (req.session.user.permission === 'admin') {
    if (req.params.id !== 'undefined' && req.params.permission !== 'undefined') {
      var user = {}
      user._id = req.params.id
      user.permission = req.params.permission
      database.updateUserPermission(user, user.permission, function (error, doc) {
        if (error) console.log('Error after database.updateUserPermission: ' + util.inspect(error))
        res.json({message: 'admin'})
      })
    } else {
      res.json({message: 'fail'})
    }
  }
})

module.exports = router
