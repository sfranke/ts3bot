#!/usr/bin/node

var databasePurge = exports
var database = require('./database')
var config = JSON.parse(require('fs').readFileSync('config.json'))
var util = require('util')
var async = require('async')
var logger = require('./logger')

// Create a unix timestamp.
function unixTime () {
  var unixStamp = Math.round((new Date()).getTime() / 1000)
  return unixStamp
}

// Checking for 200 clients starting depending from the offset.
function checkClientList (serverQueryClient, offset, callback) {
  serverQueryClient.send('clientdblist', {start: offset, duration: 7200}, function (error, response) {
    if (error === undefined) {
      logger.log('debug', 'got some clients from ts-server.')
      callback(null, response)
    } else {
      logger.log('error', 'received empty list! = No clients in this batch!')
      callback(error, null)
    }
  })
}

// Search for old clients 'last_seen' older than 91 days
// and delete them from the bot's database.
databasePurge.databaseCleanup = function (serverQueryClient) {
  var offset = 0
  serverQueryClient.send('clientdblist', ['count'], function (error, response) {
    if (error) logger.log('debug', 'Error while retrieving clientdblist from TS server. ' + util.inspect(error))
    var totalClientsInDatabase = response[0].count
    while (offset <= totalClientsInDatabase) {
      // Check clientdblist for old clients.
      checkClientList(serverQueryClient, offset, function (error, callback) {
        if (error === null) {
          logger.log('debug', 'Completed collecting clientdblist: ' + util.inspect(callback))
          var timeConstraint = {'ninetyOneDays': '7862400'}
          var timeNow = unixTime()
          var ninetyOneDays = timeNow - timeConstraint.ninetyOneDays
          var clientList = callback
          var oldClients = []
          var completeReport = []
          async.series({
            // Grab clients that are older than 91 days and push them into
            // 'oldClients' an array holding a list of old clients that will
            // be deleted.
            one: function (callback) {
              if (clientList !== undefined) {
                clientList.forEach(function (client) {
                  if (client.client_lastconnected < ninetyOneDays && client.client_nickname !== config.clientName) {
                    var clientToBeDeleted = client
                    oldClients.push(clientToBeDeleted)
                    logger.log('debug', 'Old clients: ' + util.inspect(oldClients))
                  }
                })
                callback()
              } else {
                logger.log('debug', 'clientList is empty!')
              }
            },
            // Delete old clients from TS-server database. If this query client is not whitelisted
            // this action will lead to a temporary ban for flooding.
            two: function (callback) {
              oldClients.forEach(function (client) {
                serverQueryClient.send('clientdbdelete', {cldbid: client.cldbid}, function (error, response) {
                  if (error) {
                    // If there is an error while trying to delete the client. Find the index of
                    // that element and remove it from the list.
                    logger.log('error', 'Deleting from TS database error: ' + util.inspect(error))
                    var indexOfThisElement = oldClients.indexOf(client)
                    oldClients.splice(indexOfThisElement, 1)
                  } else {
                    logger.log('debug', 'Deleting from TS database response: ' + util.inspect(response))
                  }
                })
              })
              callback()
            },
            // Delete old clients from TS3Bot database. For now we don't care whether or not a client
            // is actually present. I should implement a solution to ensure the database gets purged
            // even during faulty routines. Regular purge routine?
            three: function (callback) {
              oldClients.forEach(function (client) {
                database.delClient(client, function (error, cb) {
                  if (error) logger.log('debug', 'database.delClient.cb_error: ' + util.inspect(error))
                  logger.log('debug', 'database.delClient.cb_deletedCount: ' + util.inspect(cb.deletedCount))
                })
              })
              callback()
            },
            // This will be triggered for each set of 200 clients. A report is formulated and stored
            // temporary in a list of reports.
            four: function (callback) {
              oldClients.forEach(function (client) {
                var report = '[B]' + 'cluid: ' + '[/B]' + client.client_unique_identifier + '\n' +
                             '[B]' + 'nick: ' + '[/B]' + client.client_nickname + '\n'
                completeReport.push(report)
                logger.log('debug', 'Complete Report: ' + completeReport)
              })
              callback()
            }
          },
          // If a list of reports is complete and not empty it gets send to the list of admins.
          function (error, result) {
            if (error) logger.log('debug', 'Error while creating a list of old clients. ' + util.inspect(error))
            if (completeReport.length !== 0) {
              config.adminReport.forEach(function (client) {
                serverQueryClient.send(
                  'messageadd',
                  {
                    cluid: client,
                    subject: 'Database-Cleanup - List of deleted clients older than 90 days.',
                    message: completeReport.toString().replace(/,/g, '\n')
                  },
                  function (error, response) {
                    if (error) logger.log('debug', 'Report to admin_error: ' + util.inspect(error))
                    logger.log('debug', 'Report to admin_response: ' + util.inspect(response))
                  })
              })
            }
          })
        }
      })
      offset += 200
    }
  })
}
