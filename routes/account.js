const express = require('express')
const mongoClient = require('mongodb').MongoClient
const router = express.Router()
// const util = require('util')

/* GET users listing. */
router.get('/', function (req, res, next) {
  // console.log('USERDATA: ' + util.inspect(req.session.user))
  if (!req.session.user) {
    return res.redirect('/')
  }
  // Only render this route if user has valid session and proper permission.
  if (req.session.user.permission === 'admin' || req.session.user.permission === 'user') {
    res.render('account', {title: 'Account Information', name: undefined, session: req.session})
  }
})

var uri = 'mongodb://localhost:27017/ts3bot'

var getAccountinformation = function (Uid, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('Error while connecting to DB during getAccountinformation.')
    var collection = db.collection('clients')
    collection.find({client_unique_id: Uid}).limit(1).next(function (err, doc) {
      if (err) callback(err, null)
      callback(null, doc)
      db.close()
    })
  })
}

var getAccountinformationByName = function (name, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('Error while connecting to DB during getAccountinformationByName.')
    var collection = db.collection('clients')
    collection.find({client_nickname: name}).toArray(function (err, doc) {
      if (err) callback(err, null)
      callback(null, doc)
      db.close()
    })
  })
}

var getAccountinformationByAccountId = function (accountId, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('Error while connecting to DB during getAccountinformationByName.')
    var collection = db.collection('clients')
    collection.find({gw2_account_id: accountId}).toArray(function (err, doc) {
      if (err) callback(err, null)
      callback(null, doc)
      db.close()
    })
  })
}

router.post('/', function (req, res, next) {
  var uid = req.body.accountUid
  getAccountinformation(uid, function (error, response) {
    if (error) console.log('Error while connecting to DB during getAccountinformation.')
    if (response !== null) {
      var time = new Date(response.last_seen * 1000)
      var user = []
      user.push(response)
      if (response.gw2_guilds !== '' && response.gw2_guilds !== undefined) {
        var guilds = JSON.parse(response.gw2_guilds)
        res.render('account', {
          title: 'Account Information',
          name: response.client_nickname,
          time: time,
          apiKey: response.gw2_api_key,
          accountId: response.gw2_account_id,
          accountName: response.gw2_account_name,
          guilds: guilds,
          created: response.gw2_account_created,
          user: user,
          session: req.session
        })
      } else {
        res.render('account', {
          title: 'Account Information',
          name: response.client_nickname,
          time: time,
          user: user,
          session: req.session
        })
      }
    } else {
      getAccountinformationByName(uid, function (error, response) {
        if (error) console.log('Error while connecting to DB during getAccountinformationByName.')
        if (response.length !== 0) {
          var time = new Date(response.last_seen * 1000)
          var user = response
          if (user.gw2_guilds !== '' && user.gw2_guilds !== undefined) {
            var guilds = JSON.parse(response.gw2_guilds)
            res.render('account', {
              title: 'Account Information',
              name: response.client_nickname,
              time: time,
              apiKey: response.gw2_api_key,
              accountId: response.gw2_account_id,
              accountName: response.gw2_account_name,
              guilds: guilds,
              created: response.gw2_account_created,
              user: user,
              session: req.session
            })
          } else {
            res.render('account', {
              title: 'Account Information',
              name: user[0].client_nickname,
              time: time,
              user: user,
              session: req.session
            })
          }
        } else {
          getAccountinformationByAccountId(uid, function (error, response) {
            if (error) console.log('Error while connecting to DB during getAccountinformationByName.')
            if (response.length !== 0) {
              var time = new Date(response.last_seen * 1000)
              var user = response
              if (user.gw2_guilds !== '' && user.gw2_guilds !== undefined) {
                var guilds = JSON.parse(response.gw2_guilds)
                res.render('account', {
                  title: 'Account Information',
                  name: response.client_nickname,
                  time: time,
                  apiKey: response.gw2_api_key,
                  accountId: response.gw2_account_id,
                  accountName: response.gw2_account_name,
                  guilds: guilds,
                  created: response.gw2_account_created,
                  user: user,
                  session: req.session
                })
              } else {
                res.render('account', {
                  title: 'Account Information',
                  name: user[0].client_nickname,
                  time: time,
                  user: user,
                  session: req.session
                })
              }
            } else {
              res.render('account', {title: 'Account Information', name: undefined, session: req.session})
            }
          })
        }
      })
    }
  })
})

module.exports = router
