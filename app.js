var express = require('express')
var path = require('path')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session')
var flash = require('connect-flash')

const moment = require('moment')
const pm2 = require('pm2')
const util = require('util')
let status = []

var routes = require('./routes/index')
var about = require('./routes/about')
var account = require('./routes/account')
var guild = require('./routes/guild')
var register = require('./routes/register')
var login = require('./routes/login')
var logout = require('./routes/logout')
var users = require('./routes/users')
var log = require('./routes/log')

var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(session({resave: true, saveUninitialized: true, secret: 'ljR4sdf076asdGEewXxklv'}))
app.use(express.static(path.join(__dirname, 'public')))
app.use(flash())

app.use('/', routes)
app.use('/about', about)
app.use('/account', account)
app.use('/guild', guild)
app.use('/register', register)
app.use('/login', login)
app.use('/logout', logout)
app.use('/users', users)
app.use('/log', log)

app.locals.moment = require('moment')
app.locals.registerState = false

serverTime()

function serverTime () {
  setInterval(function () {
    io.emit('serverTime', moment(new Date().getTime()).format('HH:mm:ss'))
  }, 1000)
}

memory()

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

function memory () {
  setInterval(function () {
    getPm2ProcessStatus(function (error, status) {
      if (error !== null) {
        console.log('Error while fetching process status via pm2\n' + util.inspect(error))
      } else {
        io.emit('memory', status)
      }
    })
  }, 1000)
}
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err
    })
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

module.exports = app
