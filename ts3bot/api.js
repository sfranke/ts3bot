#!/usr/bin/node

var api = exports
var util = require('util')
var https = require('https')
var config = JSON.parse(require('fs').readFileSync('config.json'))
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
          // if (httpsRequest.world === config.homeWorld) {
          if (config.worldsAllowed.indexOf(httpsRequest.world) !== -1) {
            logger.log('debug', '[API WORLD TEST] - ' + httpsRequest.world)
            // Add information gathered with api call to clientObject.
            clientObject.apiKey = token
            clientObject.accountId = httpsRequest.id
            clientObject.accountName = httpsRequest.name
            clientObject.accountGuilds = guilds
            clientObject.accountCreated = httpsRequest.created
            clientObject.world = httpsRequest.world.toString()
            callback(null, clientObject)
          } else {
            clientObject.accountWorldId = httpsRequest.world
            if (clientObject.apiKey === undefined) {
              clientObject.apiKey = clientObject.msg
            }
            api.world(clientObject, function (error, response) {
              if (error !== null) {
                callback(error, null)
              } else {
                callback(null, clientObject)
              }
            })
          }
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
  })
}

// World gets only checked if a foreign world is already detected.
api.world = function (clientObject, callback) {
  logger.log(
    'info',
    'Checking API-key for foreign world.' + '\n' +
    '(' + clientObject.invokerid + ')' +
    clientObject.invokername + ': ' + clientObject.invokeruid +
    ' \'' + clientObject.apiKey + '\''
  )
  var options = {
    hostname: 'api.guildwars2.com',
    path: '/v2/worlds?ids=' + clientObject.accountWorldId,
    method: 'GET'
  }
  https.get(options, function (response) {
    logger.log('info', 'GW2 Worlds-API status code: ' + response.statusCode)
    var statusCode = response.statusCode
    response.on('data', function (data) {
      switch (statusCode) {
        case 200:
          var httpsRequest = JSON.parse(data)
          // Response is a list of response objects.
          for (var response in httpsRequest) {
            var world = httpsRequest[response]
            // Add worldname to response-object.
            clientObject.accountWorldName = world.name
          }
          if (clientObject.accountWorldId !== config.homeWorld) {
            callback(clientObject, null)
          } else {
            callback(null, clientObject)
          }
          break
        case 400:
          httpsRequest = JSON.parse(data)
          logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest))
          clientObject.apiServerStatus = response.statusCode
          callback(clientObject, null)
          break
        case 403:
          httpsRequest = JSON.parse(data)
          logger.log('error', 'Server responding -> ' + response.statusCode + ': ' + util.inspect(httpsRequest))
          clientObject.apiServerStatus = response.statusCode
          callback(clientObject, null)
          break
        case 502:
          logger.log('error', 'Server not responding -> ' + statusCode)
          clientObject.apiServerStatus = statusCode
          callback(clientObject, null)
          break
        case 503:
          logger.log('error', 'Server busy -> ' + statusCode)
          clientObject.apiServerStatus = statusCode
          callback(clientObject, null)
          // var message = new chatMessage();
          // serverQueryClient.send('sendtextmessage', message.chatSend('api503', user));
          break
      }
    })
    response.on('error', function (error) {
      if (error) logger.log('error', 'Error on HTTPS request to API. ' + error)
      logger.log('error', 'While calling \'api.guildwars.com/v2/worlds?ids=' + clientObject.accountWorldId + '\'.')
    })
  })
}
