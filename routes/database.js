var database = exports
var mongoClient = require('mongodb').MongoClient
var ObjectID = require('mongodb').ObjectID
// var util = require('util')
// var colors = require('colors')
// var logger = require('../ts3bot/logger')

var uri = 'mongodb://localhost:27017/ts3bot'

// function unixTime () {
//   var unixStamp = Math.round((new Date()).getTime() / 1000)
//   return unixStamp
// };

database.saveUser = function (user, callback) {
  // console.log(util.inspect(user));
  mongoClient.connect(uri, function (err, db) {
    if (err) console.log('error', 'While connecting to DB during saveUser.')
    var collection = db.collection('users')
    collection.find({'email': user.email}).limit(1).next(function (error, doc) {
      if (error) callback(err, null)
      if (doc === null) {
        collection.update({'email': user.email}, {'name': user.name, 'password': user.password, 'email': user.email}, {upsert: true}, function (error, doc) {
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

// database.getTicketCount = function (callback) {
//     mongoClient.connect(uri, function (err, db) {
//         var collection = db.collection('tickets');
//         collection.count(function (error, count) {
//
//             // console.log('error', error);
//             // console.log('count', count);
//
//             if (error) callback(error, null);
//             callback(null, count);
//         });
//     });
// };
//
// database.saveTicket = function (ticket, callback) {
//     mongoClient.connect(uri, function (err, db) {
//         var collection = db.collection('tickets');
//         collection.insertOne(ticket, function (error, doc) {
//
//             // console.log('error', error);
//             // console.log('count', doc);
//
//             if (error) callback(error, null);
//             callback(null, doc);
//         });
//     });
// };
//
// database.completeTicket = function (ticketId, callback) {
//
//     // console.log('database.completeTicket tickedId:', ticketId);
//
//     /* Convert to ObjectID otherwise this operation fails.*/
//     var id = ObjectID(ticketId);
//     // console.log('ObjectID typecast:', id);
//
//     mongoClient.connect(uri, function (err, db) {
//         var collection = db.collection('tickets');
//         collection.updateOne({'_id': id}, {$set: {status: 'complete'}}).then(function (record) {
//
//             // console.log('completeTicket updateOne record:', record);
//
//             if (record.result.ok === 1) {
//                 callback(null, {'update': 'success'});
//                 db.close();
//             } else {
//                 callback({'error': 'Error while completing ticket.'}, null);
//                 db.close();
//             }
//         });
//     });
// };
//
// database.reopenTicket = function (ticketId, callback) {
//
//     // console.log('database.reopenTicket tickedId:', ticketId);
//
//     /* Convert to ObjectID otherwise this operation fails.*/
//     var id = ObjectID(ticketId);
//     // console.log('ObjectID typecast:', id);
//
//     mongoClient.connect(uri, function (err, db) {
//         var collection = db.collection('tickets');
//         collection.updateOne({'_id': id}, {$set: {status: 'open'}}).then(function (record) {
//
//             // console.log('reopenTicket updateOne record:', record);
//
//             if (record.result.ok === 1) {
//                 callback(null, {'update': 'success'});
//                 db.close();
//             } else {
//                 callback({'error': 'Error while reopening ticket.'}, null);
//                 db.close();
//             }
//         });
//     });
// };
//
// database.closeTicket = function (ticketId, callback) {
//
//     // console.log('database.reopenTicket tickedId:', ticketId);
//
//     /* Convert to ObjectID otherwise this operation fails.*/
//     var id = ObjectID(ticketId);
//     // console.log('ObjectID typecast:', id);
//
//     mongoClient.connect(uri, function (err, db) {
//         var collection = db.collection('tickets');
//         collection.updateOne({'_id': id}, {$set: {status: 'closed'}}).then(function (record) {
//
//             // console.log('closeTicket updateOne record:', record);
//
//             if (record.result.ok === 1) {
//                 callback(null, {'update': 'success'});
//                 db.close();
//             } else {
//                 callback({'error': 'Error while closing ticket.'}, null);
//                 db.close();
//             }
//         });
//     });
// };
//
// database.getAllTickets = function (callback) {
//     mongoClient.connect(uri, function (err, db) {
//         var collection = db.collection('tickets');
//         collection.find({}).toArray(function (error, tickets) {
//
//             // console.log('getAllTickets error:', error);
//             // console.log('getAllTickets tickets:', tickets);
//
//             if (tickets != null) {
//                 callback(null, tickets);
//                 db.close();
//             } else {
//                 callback({'error': 'No tickets found'}, null);
//                 db.close();
//             }
//         });
//     });
// };
//
// database.getTickedByTicketNumber = function (ticketNumber, callback) {
//
// };
//
// database.addComment = function (username, ticketId, comment, callback) {
//     var id = ObjectID(ticketId);
//     var now = unixTime();
//     mongoClient.connect(uri, function (err, db) {
//         var collection = db.collection('tickets');
//         var entry = {timestamp: unixTime(), username: username, comment: comment}
//         collection.find({'_id': id}).limit(1).next(function (error, doc) {
//             if (error) console.log(colors.red(error));
//             doc.comments.push(entry);
//             collection.findOneAndReplace({'_id': id}, doc, function (error, record) {
//                 if (error) callback(error, null);
//                 callback(null, record);
//             });
//         });
//     });
// };
