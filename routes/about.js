var express = require('express')
var router = express.Router()

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.render('about', {title: 'Ts3Bot', session: req.session})
})

module.exports = router
