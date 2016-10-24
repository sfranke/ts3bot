#!/usr/bin/node

var database = exports
var mongoClient = require('mongodb').MongoClient
var util = require('util')
var logger = require('./logger')
var uri = 'mongodb://localhost:27017/ts3bot'

function currentTime () {
  var unixStamp = new Date().toJSON()
  return unixStamp
}

// Creata a new Database, only executes if there is no database yet.
database.createDatabase = function (callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) callback(err, null)
    callback(null, db)
  })
}

// Get GW2-API-Key by client unique identifier.
database.getApiKey = function (clientObject, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) logger.log('error', 'While connecting to DB during getApiKey.')
    var collection = db.collection('clients')
    collection.find({client_unique_id: clientObject.invokeruid}).limit(1).next(function (err, doc) {
      if (err) callback(err, null)
      callback(null, doc)
      db.close()
    })
  })
}

// Update an existing dataset with the data you can fetch from the API.
database.updateAccountInformation = function (clientObject, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) logger.log('error', 'While connecting to DB during updateAccountInformation.')
    var collection = db.collection('clients')
    collection.find({gw2_api_key: clientObject.apiKey}).limit(1).next(function (err, doc) {
      if (err) logger.log('error', 'While fetching for API key during updateAccountInformation.')
      if (doc === null) {
        collection.update(
          {
            client_unique_id: clientObject.invokeruid
          },
          {
            client_unique_id: clientObject.invokeruid,
            client_nickname: clientObject.invokername,
            last_seen: currentTime(),
            gw2_api_key: clientObject.apiKey,
            gw2_account_id: clientObject.accountId,
            gw2_account_world: clientObject.world,
            gw2_account_name: clientObject.accountName,
            gw2_guilds: clientObject.accountGuilds,
            gw2_account_created: clientObject.accountCreated,
            gw2_access: clientObject.access,
            gw2_commander: clientObject.commander
          },
          {
            upsert: true
          })
        callback(null, clientObject)
        db.close()
      } else {
        callback({error: 'API-key already in use.'}, null)
        db.close()
      }
    })
  })
}

// Update an existing dataset or an existing user by its invokeruid.
database.updateExistingAccountInformationByInvokeruid = function (clientObject, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) logger.log('error', 'While connecting to DB during updateExistingAccountInformationByInvokeruid.')
    var collection = db.collection('clients')
    collection.find({client_unique_id: clientObject.invokeruid}).limit(1).next(function (err, doc) {
      if (err) logger.log('error', 'While fetching for API key during updateExistingAccountInformationByInvokeruid.')
      if (doc !== null) {
        collection.update(
          {
            client_unique_id: clientObject.invokeruid
          },
          {
            client_unique_id: clientObject.invokeruid,
            client_nickname: clientObject.invokername,
            last_seen: currentTime(),
            gw2_api_key: clientObject.apiKey,
            gw2_account_id: clientObject.accountId,
            gw2_account_world: clientObject.world,
            gw2_account_name: clientObject.accountName,
            gw2_guilds: clientObject.accountGuilds,
            gw2_account_created: clientObject.accountCreated,
            gw2_access: clientObject.access,
            gw2_commander: clientObject.commander
          },
          {
            upsert: true
          })
        callback(null, clientObject)
        db.close()
      } else {
        callback({error: 'Could not find collection to update.'}, null)
        db.close()
      }
    })
  })
}

// Enter a new dataset for a given unknown client.
database.setNewUser = function (clientObject, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) logger.log('error', 'While connecting to DB during setNewUser.')
    var collection = db.collection('clients')
    collection.update(
      {
        client_unique_id: clientObject.invokeruid
      },
      {
        client_unique_id: clientObject.invokeruid,
        client_nickname: clientObject.invokername,
        last_seen: currentTime(),
        gw2_api_key: null,
        gw2_account_id: null,
        gw2_account_world: null,
        gw2_account_name: null,
        gw2_guilds: null,
        gw2_account_created: null,
        gw2_access: null,
        gw2_commander: null
      },
      {
        upsert: true
      },
      function (err, doc) {
        if (err) callback(err, null)
        callback(null, doc)
        db.close()
      })
  })
}

// Update last_seen and invokername for any given user that connects.
database.updateLastSeen = function (clientObject, callback) {
  mongoClient.connect(uri, function (err, db) {
    if (err) logger.log('error', 'While connecting to DB during updateLastSeen.')
    var collection = db.collection('clients')
    collection.update(
      {
        client_unique_id: clientObject.invokeruid
      },
      {
        client_unique_id: clientObject.invokeruid,
        client_nickname: clientObject.invokername,
        last_seen: currentTime(),
        gw2_api_key: clientObject.apiKey,
        gw2_account_id: clientObject.accountId,
        gw2_account_world: clientObject.world,
        gw2_account_name: clientObject.accountName,
        gw2_guilds: clientObject.guilds,
        gw2_account_created: clientObject.accountCreated,
        gw2_access: clientObject.access,
        gw2_commander: clientObject.commander
      },
      {
        upsert: true
      },
      function (err, doc) {
        if (err) callback(err, null)
        callback(null, doc)
        db.close()
      })
  })
}

// Delete a single client from the database.
database.delClient = function (client, callback) {
  logger.log('debug', 'Database client to be deleted: ' + util.inspect(client.client_unique_identifier))
  mongoClient.connect(uri, function (err, db) {
    if (err) logger.log('error', 'While connecting to DB during delClient.')
    var collection = db.collection('clients')
    collection.deleteOne(
      {
        client_unique_id: client.client_unique_identifier
      },
      function (err, doc) {
        if (err) callback(err, null)
        callback(null, doc)
        db.close()
      })
  })
}
