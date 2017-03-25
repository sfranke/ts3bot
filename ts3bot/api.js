#!/usr/bin/node

var api = exports
var util = require('util')
var https = require('https')
var logger = require('./logger')

api.account = function (userObject, callback) {
  var token = userObject.msg || userObject.apiKey
  var clientObject = userObject
  var options = {
    hostname: 'api.guildwars2.com',
    path: '/v2/account',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token
    }
  }
  https.get(options, function (response) {
    response.on('data', function (data) {
      switch (response.statusCode) {
        case 200:
          var httpsRequest = JSON.parse(data)
          var guilds = JSON.stringify(httpsRequest.guilds)
          // Add information gathered with api call to clientObject.
          clientObject.apiKey = token
          clientObject.accountId = httpsRequest.id
          clientObject.accountName = httpsRequest.name
          clientObject.accountGuilds = guilds
          clientObject.accountCreated = httpsRequest.created
          clientObject.world = httpsRequest.world.toString()
          clientObject.access = httpsRequest.access
          clientObject.commander = httpsRequest.commander
          callback(null, clientObject)
          break
        case 400:
          var httpsRequest400 = JSON.parse(data)
          switch (httpsRequest400.text) {
            case 'invalid key':
              logger.log('info', 'Server responding with "Invalid key" -> ' + response.statusCode)
              if (clientObject.apiKey === undefined) {
                clientObject.apiKey = clientObject.msg
              }
              clientObject.apiServerStatus = response.statusCode
              clientObject.apiServerStatusReason = httpsRequest400.text
              callback(clientObject, null)
              break
            case 'ErrBadData':
              logger.log('info', 'Server responding with "ErrBadData" -> ' + response.statusCode)
              if (clientObject.apiKey === undefined) {
                clientObject.apiKey = clientObject.msg
              }
              clientObject.apiServerStatus = response.statusCode
              clientObject.apiServerStatusReason = httpsRequest400.text
              callback(clientObject, null)
              break
            default:
              logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest400))
              if (clientObject.apiKey === undefined) {
                clientObject.apiKey = clientObject.msg
              }
              clientObject.apiServerStatus = response.statusCode
              callback(clientObject, null)
              break
          }
          break
        case 403:
          var httpsRequest403 = JSON.parse(data)
          logger.log('info', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest403))
          if (clientObject.apiKey === undefined) {
            clientObject.apiKey = clientObject.msg
          }
          clientObject.apiServerStatus = response.statusCode
          callback(clientObject, null)
          break
        case 502:
          logger.log('info', 'Server not responding -> ' + response.statusCode)
          if (clientObject.apiKey === undefined) {
            clientObject.apiKey = clientObject.msg
          }
          clientObject.apiServerStatus = response.statusCode
          callback(clientObject, null)
          break
        case 503:
          logger.log('info', 'Server busy -> ' + response.statusCode)
          if (clientObject.apiKey === undefined) {
            clientObject.apiKey = clientObject.msg
          }
          clientObject.apiServerStatus = response.statusCode
          callback(clientObject, null)
          break
      }
    })
    response.on('error', function (error) {
      if (error) logger.log('error', 'Error on HTTPS request to API. ' + error)
      logger.log('error', 'While calling \'api.guildwars.com/v2/account\'.' + ' token: \'' + token + '\'')
    })
  }).on('error', function (res) {
    logger.log('debug', 'HTTP request failed during API-key validation.' + res)
  })
}
