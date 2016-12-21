var express = require('express')
var router = express.Router()
var database = require('./database')

router.get('/', function (req, res, next) {
  // console.log(req.session)
  if (req.session.user.permission === 'admin') {
    if (!req.session.user) {
      return res.redirect('/register')
    }
    database.getAllUsers(function (error, users) {
      if (error) console.log('Error while getAllUsers.')
      res.render('users', {title: 'Users', session: req.session, users: users})
    })
  }
})

// , message: req.flash('deleteUserMessage'?)

router.post('/delete/:id', function (req, res, next) {
  // console.log(req.session)
  // console.log('req.body @users post:', req.params)
  if (req.session.user.permission === 'admin') {
    if (!req.session.user) {
      return res.redirect('/register')
    }
    database.deleteUser(req.params.id, function (error, doc) {
      if (error) console.log('Error while deleteUser.', error)
      // console.log('Route users error:', error)
      // console.log('Route users doc:', doc)
      res.json({message: 'success'})
    })
  }
})

module.exports = router
