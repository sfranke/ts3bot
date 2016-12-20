var express = require('express')
var router = express.Router()

router.get('/', function (req, res, next) {
  res.render('logout', {title: 'Express', session: req.session})
})

router.post('/', function (req, res, next) {
  // console.log(req.session.user)
  req.session.user = null
  // console.log('session deleted:', req.session)
  res.redirect('/')
})

module.exports = router
