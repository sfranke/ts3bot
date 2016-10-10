#!/usr/bin/node

var serverGroups = exports
var config = JSON.parse(require('fs').readFileSync('config.json'))
var util = require('util')
var logger = require('./logger')
var api = require('./api')
var database = require('./database')
var async = require('async')

// This function accepts the serverQueryClient and the clientObject to revalidate the client's currently
// assigned server groups. This function is supposed to be executed everytime a client connects to the server to
// ensure every client has the appropriate permissions/server groups. Tha main factors are the gw2_account_world which
// provides the information about the game sever. And the serverGroupIds provided by the config file.
serverGroups.purgeClient = function (serverQueryClient, clientObject) {
    // logger.log('debug', 'serverQueryClient:\n' + util.inspect(serverQueryClient));
    // logger.log('debug', 'clientObject:\n' + util.inspect(clientObject));
    // Fetch all related servergroup IDs.
  var allServerGroups = []
  if (clientObject.client_servergroups !== undefined) {
    var groups = clientObject.client_servergroups.toString()
    var serverGroups = groups.split(',')
  }

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
            clientObject.commander = null
            clientObject.access = null
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
  if (config.gameWorlds[clientObject.world] !== undefined) {
    logger.log('debug', 'My server group ID: ' + config.gameWorlds[clientObject.world].serverGroupId)
    var myServerGroup = config.gameWorlds[clientObject.world].serverGroupId
    serverQueryClient.send('servergroupaddclient', {sgid: myServerGroup, cldbid: clientObject.invokerdbid})
    database.updateExistingAccountInformationByInvokeruid(clientObject, function (err, res) {
      if (err) logger.log('error', 'Error while updating account information. ' + util.inspect(err))
      logger.log('debug', 'Updated account information. ' + util.inspect(res))
    })
    if (config.commanderServerGroup === true) {
      logger.log('debug', 'Assigning commander server group enabled.')
      if (clientObject.commander === true) {
        serverQueryClient.send('servergroupaddclient', {sgid: config.commanderServerGroupId, cldbid: clientObject.invokerdbid}, function (err, res) {
          if (err) logger.log('debug', 'Error while assigning commander server group. ' + util.inspect(err))
          logger.log('debug', 'Found commander status. Assigned server group.')
        })
      }
    }
    if (config.accessServerGroup === true) {
      logger.log('debug', 'Access server group enabled.')
      if (clientObject.access === 'PlayForFree') {
        logger.log('debug', 'Detected "PlayForFree" access.')
        logger.log('debug', 'Server group is: ' + config.access['PlayForFree'].serverGroupId)
        serverQueryClient.send('servergroupaddclient', {sgid: config.access['PlayForFree'].serverGroupId, cldbid: clientObject.invokerdbid})
      }
      if (clientObject.access === 'GuildWars2') {
        logger.log('debug', 'Detected "GuildWars2" access.')
        logger.log('debug', 'Server group is: ' + config.access['GuildWars2'].serverGroupId)
        serverQueryClient.send('servergroupaddclient', {sgid: config.access['GuildWars2'].serverGroupId, cldbid: clientObject.invokerdbid})
      }
      if (clientObject.access === 'HeartOfThorns') {
        logger.log('debug', 'Detected "HeartOfThorns" access.')
        logger.log('debug', 'Server group is: ' + config.access['HeartOfThorns'].serverGroupId)
        serverQueryClient.send('servergroupaddclient', {sgid: config.access['HeartOfThorns'].serverGroupId, cldbid: clientObject.invokerdbid})
      }
    }
    // Remove all server groups except the one that this account is affiliated with.
    serverGroups.forEach(function (serverGroupId) {
      logger.log('debug', 'Clean-up servergroups: ' + serverGroupId)
      if (allServerGroups.indexOf(serverGroupId) !== -1 && serverGroupId !== myServerGroup) {
        logger.log('debug', '(cleanUpServerGroups) Found server group that needs to be removed: ' + serverGroupId)
        serverQueryClient.send('servergroupdelclient', {sgid: serverGroupId, cldbid: clientObject.invokerdbid})
      }
    })
  }
}

function stripAllServerGroups (serverQueryClient, serverGroups, allServerGroups, clientObject) {
  // Remove all server groups!
  async.series({
    strippingGameWorlds: function (callback) {
      serverGroups.forEach(function (serverGroupId) {
        logger.log('debug', 'Stripping all servergroups: ' + serverGroupId)
        if (allServerGroups.indexOf(serverGroupId) !== -1) {
          logger.log('debug', 'Found server group that needs to be removed: ' + serverGroupId)
          serverQueryClient.send('servergroupdelclient', {sgid: serverGroupId, cldbid: clientObject.invokerdbid})
        }
      })
      callback()
    },
    strippingCommanderServerGroup: function (callback) {
      if (config.commanderServerGroup === true) {
        logger.log('debug', 'Assigning commander server group enabled.')
        logger.log('debug', 'clientObject.commander: ' + clientObject.commander)
        if (clientObject.commander !== true) {
          serverQueryClient.send('servergroupdelclient', {sgid: config.commanderServerGroupId, cldbid: clientObject.invokerdbid}, function (err, res) {
            if (err) logger.log('debug', 'Error while deleting server group. ' + util.inspect(err))
            logger.log('debug', 'Revoking commander status.')
          })
        }
      }
      callback()
    },
    strippingAccessServerGroup: function (callback) {
      if (config.accessServerGroup === true) {
        if (clientObject.access !== 'PlayForFree') {
          serverQueryClient.send('servergroupdelclient', {sgid: config.access['PlayForFree'].serverGroupId, cldbid: clientObject.invokerdbid})
        }
        if (clientObject.access !== 'GuildWars2') {
          serverQueryClient.send('servergroupdelclient', {sgid: config.access['GuildWars2'].serverGroupId, cldbid: clientObject.invokerdbid})
        }
        if (clientObject.access !== 'HeartOfThorns') {
          serverQueryClient.send('servergroupdelclient', {sgid: config.access['HeartOfThorns'].serverGroupId, cldbid: clientObject.invokerdbid})
        }
      }
      callback()
    }
  },
  function (err, results) {
    if (err) logger.log('error', 'Error while stripping all server groups. ' + util.inspect(err))
    logger.log('debug', 'Finished stripping all server groups.')
    database.setNewUser(clientObject, function (error, response) {
      logger.log('debug', 'error: ' + error)
      logger.log('debug', 'response: ' + response)
      logger.log('debug', 'Set new user!')
    })
  })
}
