var database = exports
var mongoClient = require('mongodb').MongoClient
var ObjectID = require('mongodb').ObjectID
var util = require('util')
// var colors = require('colors')
// var logger = require('../ts3bot/logger')

var uri = 'mongodb://localhost:27017/ts3bot'

// function unixTime () {
//   var unixStamp = Math.round((new Date()).getTime() / 1000)
//   return unixStamp
// };

// Expects a user object as argument. Permissions are optional and
// default to 'user' if not set explicitly.
database.saveUser = function (user, callback) {
  // console.log(util.inspect(user));
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('error', 'While connecting to DB during saveUser.')
    var collection = db.collection('users')
    collection.find({'email': user.email}).limit(1).next(function (error, doc) {
      if (error) callback(err, null)
      if (doc === null) {
        collection.update({'email': user.email}, {
          'name': user.name,
          'password': user.password,
          'permission': user.permission || 'user',
          'email': user.email},
          {upsert: true},
          function (error, doc) {
            if (error) callback(err, null)
            collection.find({'email': user.email}).limit(1).next(function (error, user) {
              if (error) callback(err, null)
              callback(null, user)
              db.close()
            })
          })
      } else {
        callback({'error': 'Email already in use.'}, null)
        db.close()
      }
    })
  })
}

/* Delete a single user by its unique ID. */
database.deleteUser = function (userId, callback) {
  // console.log('database.deleteUser userId:', userId);
  /* Convert to ObjectID otherwise this operation fails.*/
  var id = ObjectID(userId)
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('error', 'While connecting to DB during deleteUser.')
    var collection = db.collection('users')
    collection.deleteOne({'_id': id}, function (error, doc) {
      // console.log('findOneAndDelete error:', error);
      // console.log('findOneAndDelete doc:', doc);
      if (error === null) {
        callback(null, doc)
        db.close()
      } else {
        callback({'error': 'Error while deleting user.'}, null)
        db.close()
      }
    })
  })
}

database.updateUserPermission = function (user, permission, callback) {
  console.log('UpdateUserPermission database: ' + util.inspect(user) + ' --> ' + permission)
  var _id = ObjectID(user._id)
  console.log('TEST PERMISSION: ' + permission)
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('error', 'While connecting to DB during updateUser.')
    var collection = db.collection('users')
    collection.find({'_id': _id}).limit(1).next(function (err, doc) {
      if (err) console.log('Error fetching user during updateUser.')
      console.log('Found DOC: ' + util.inspect(doc))
      if (doc !== null) {
        collection.update(
          {
            '_id': doc._id
          },
          {
            'name': doc.name,
            'password': doc.password,
            'permission': permission,
            'email': doc.email
          },
          {
            upsert: true
          })
        callback(null, user)
        db.close()
      } else {
        callback({error: 'Some random error during updateUser -> collection updateUser.'}, null)
        db.close()
      }
    })
  })
}

/* Get user by email. */
database.getUser = function (user, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('error', 'While connecting to DB during getUser.')
    var collection = db.collection('users')
    collection.find({'email': user.email}).limit(1).next(function (error, doc) {
      if (error) callback(err, null)
      if (doc != null) {
        callback(null, doc)
        db.close()
      } else {
        callback({'error': 'User not found'}, null)
        db.close()
      }
    })
  })
}

/* Get all users. */
database.getAllUsers = function (callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('error', 'While connecting to DB during getAllUsers.')
    var collection = db.collection('users')
    collection.find({}).toArray(function (error, users) {
      if (error) callback(err, null)
      if (users != null) {
        callback(null, users)
        db.close()
      } else {
        callback({'error': 'No users found'}, null)
        db.close()
      }
    })
  })
}
