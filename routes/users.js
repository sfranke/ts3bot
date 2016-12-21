var express = require('express')
var router = express.Router()
var database = require('./database')
var util = require('util')

router.get('/', function (req, res, next) {
  // console.log(req.session)
  if (!req.session.user) {
      return res.redirect('/register')
  }
  if (req.session.user.permission === 'admin') {
    console.log('Found.. ' + req.session.user.permission)
    database.getAllUsers(function (error, users) {
      if (error) console.log('Error while getAllUsers.')
      res.render('users', {title: 'Users', session: req.session, users: users})
    })
  } else {
    console.log('Found.. ' + req.session.user.permission)
  }
})

// , message: req.flash('deleteUserMessage'?)

router.post('/delete/:id', function (req, res, next) {
  // console.log(req.session)
  // console.log('req.body @users post:', req.params)
  if (!req.session.user) {
    return res.redirect('/register')
  }
  if (req.session.user.permission === 'admin') {
    database.deleteUser(req.params.id, function (error, doc) {
      if (error) console.log('Error while deleteUser.', error)
      // console.log('Route users error:', error)
      // console.log('Route users doc:', doc)
      res.json({message: 'success'})
    })
  }
})

router.post('/updateUser/:id/:permission', function (req, res, next) {
  console.log('Requested session: ', req.session)
  console.log('req.body @updateUser: ', req.params)
  if (!req.session.user) {
    return res.redirect('/register')
  }
  if (req.session.user.permission === 'admin') {
    if (req.params.id !== 'undefined' && req.params.permission !== 'undefined') {
      console.log('Received params --> id: ' + req.params.id + ' permission: ' + req.params.permission)
      var user = {}
      user._id = req.params.id
      user.permission = req.params.permission
      console.log('TESTUSER: ' + util.inspect(user))
      database.updateUserPermission(user, user.permission, function (error, doc) {
        console.log('Error after database.updateUserPermission: ' + util.inspect(error))
        console.log('Response after database.updateUserPermission: ' + util.inspect(doc))
        res.json({message: 'admin'})
      })
    } else {
      console.log('Missing parameters.')
      res.json({message: 'fail'})
    }
  }
})

module.exports = router
