#!/usr/bin/node

var serverGroups = exports
var config = JSON.parse(require('fs').readFileSync('config.json'))
var util = require('util')
var logger = require('./logger')
var api = require('./api')
var database = require('./database')

// This function accepts the serverQueryClient and the clientObject to revalidate the client's currently
// assigned server groups. This function is supposed to be executed everytime a client connects to the server to
// ensure every client has the appropriate permissions/server groups. Tha main factors are the gw2_account_world which
// provides the information about the game sever. And the serverGroupIds provided by the config file.
serverGroups.purgeClient = function (serverQueryClient, clientObject) {
    // logger.log('debug', 'serverQueryClient:\n' + util.inspect(serverQueryClient));
    // logger.log('debug', 'clientObject:\n' + util.inspect(clientObject));
    // Fetch all related servergroup IDs.
  var allServerGroups = []
  var groups = clientObject.client_servergroups.toString()
  var serverGroups = groups.split(',')

  for (var gameWorldId in config.gameWorlds) {
    logger.log('debug', 'gameWorlds: ' + config.gameWorlds[gameWorldId].serverGroupId)
    allServerGroups.push(config.gameWorlds[gameWorldId].serverGroupId)
  }
  logger.log('debug', 'List of all server groups that need to be purged: ' + allServerGroups)
  database.getApiKey(clientObject, function (error, response) {
    if (error) logger.log('debug', 'GET API ERROR' + error)
    logger.log('debug', 'GET API RESPONSE' + util.inspect(response))
    if (response.gw2_api_key !== null) {
      api.account(clientObject, function (error, response) {
        // if (error) logger.log('debug', 'getApiKey error: ' + util.inspect(error));
        // logger.log('debug', 'getApiKey response: ' + util.inspect(response));
        logger.log('debug', '### API RESPONSE ###\n' + util.inspect(response))
        logger.log('debug', '### API ERROR ###\n' + util.inspect(error))
        if (error !== null) {
          // Handle API errors here!
          logger.log('debug', 'API error !== null')
          if (error.apiServerStatus === 400) {
            logger.log('debug', 'Invalid API, confirmed by API. Removing all server groups!')
            stripAllServerGroups(serverQueryClient, serverGroups, allServerGroups, clientObject)
          }
          if (error.apiServerStatus === 403) {
            logger.log('debug', 'API key null, confirmed by API. Removing all server groups!')
            cleanUpServerGroups(serverQueryClient, serverGroups, allServerGroups, clientObject)
          }
        } else {
          // if (error.world === null) {
          //     logger.log('debug', 'error.world === null')
          //     stripAllServerGroups(serverQueryClient, serverGroups, allServerGroups, clientObject)
          // }
          if (response.world !== null) {
            logger.log('debug', 'error.world !== null')
            cleanUpServerGroups(serverQueryClient, serverGroups, allServerGroups, clientObject)
          }
        }
      })
    } else {
      stripAllServerGroups(serverQueryClient, serverGroups, allServerGroups, clientObject)
    }
  })
}

function cleanUpServerGroups (serverQueryClient, serverGroups, allServerGroups, clientObject) {
  logger.log('debug', 'My server group ID: ' + config.gameWorlds[clientObject.world].serverGroupId)
  var myServerGroup = config.gameWorlds[clientObject.world].serverGroupId
  // Remove all server groups except the one that this account is affiliated with.
  serverGroups.forEach(function (serverGroupId) {
    logger.log('debug', 'Clean-up servergroups: ' + serverGroupId)
    if (allServerGroups.indexOf(serverGroupId) !== -1 && serverGroupId !== myServerGroup) {
      logger.log('debug', 'Found server group that needs to be removed: ' + serverGroupId)
      serverQueryClient.send('servergroupdelclient', {sgid: serverGroupId, cldbid: clientObject.invokerdbid})
    }
  })
}

function stripAllServerGroups (serverQueryClient, serverGroups, allServerGroups, clientObject) {
  allServerGroups.push(config.commanderServerGroupId)
  // Remove all server groups!
  serverGroups.forEach(function (serverGroupId) {
    logger.log('debug', 'Stripping all servergroups: ' + serverGroupId)
    if (allServerGroups.indexOf(serverGroupId) !== -1) {
      logger.log('debug', 'Found server group that needs to be removed: ' + serverGroupId)
      serverQueryClient.send('servergroupdelclient', {sgid: serverGroupId, cldbid: clientObject.invokerdbid})
    }
  })
  database.setNewUser(clientObject, function (error, response) {
    logger.log('debug', 'error: ' + error)
    logger.log('debug', 'response: ' + response)
    logger.log('debug', 'Set new user!')
  })
}
