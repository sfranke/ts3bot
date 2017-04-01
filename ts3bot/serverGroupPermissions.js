var serverGroupPermissions = exports
var logger = require('./logger')
var util = require('util')

serverGroupPermissions.resettingPermissions = function (config, serverQueryClient, callback) {
  if (config.adjustJoinPower === true) {
    for (var gameWorldIdAdjustJoinPower in config.gameWorlds) {
      logger.log('debug', 'Resetting \'i_channel_join_power\' enabled.')
      logger.log('debug', 'List of game world server IDs: ' + config.gameWorlds[gameWorldIdAdjustJoinPower].serverGroupId)
      serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[gameWorldIdAdjustJoinPower].serverGroupId, permsid: 'i_channel_join_power', permvalue: config.defaultJoinPower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
        if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
        logger.log('debug', 'Response while changing default join power: ' + util.inspect(response))
        logger.log('debug', 'rawResponse while changing default join power: ' + util.inspect(rawResponse))
      })
    }
  } else {
    logger.log('debug', 'Resetting \'i_channel_join_power\' disabled.')
  }
  if (config.adjustChannelSubscriptions === true) {
    for (var gameWorldIdAdjustChannelSubscriptions in config.gameWorlds) {
      logger.log('debug', 'Resetting \'i_client_max_channel_subscriptions\' enabled.')
      serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[gameWorldIdAdjustChannelSubscriptions].serverGroupId, permsid: 'i_client_max_channel_subscriptions', permvalue: config.defaultChannelSubscriptions, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
        if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
        logger.log('debug', 'Response while changing default max channel subscriptions: ' + util.inspect(response))
        logger.log('debug', 'rawResponse while changing default max channel subscriptions: ' + util.inspect(rawResponse))
      })
    }
  } else {
    logger.log('debug', 'Resetting \'i_client_max_channel_subscriptions\' disabled.')
  }
  if (config.adjustSubscribePower === true) {
    for (var gameWorldIdAdjustSubscribePower in config.gameWorlds) {
      logger.log('debug', 'Resetting \'i_channel_subscribe_power\' enabled.')
      serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[gameWorldIdAdjustSubscribePower].serverGroupId, permsid: 'i_channel_subscribe_power', permvalue: config.defaultSubscribePower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
        if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
        logger.log('debug', 'Response while changing default channel subscribe power: ' + util.inspect(response))
        logger.log('debug', 'rawResponse while changing default channel subscribe power: ' + util.inspect(rawResponse))
      })
    }
  } else {
    logger.log('debug', 'Resetting \'i_channel_subscribe_power\' disabled.')
  }
  callback()
}

serverGroupPermissions.elevatingPermissins = function (config, serverQueryClient, callback) {
  config.worldsAllowed.forEach(function (allowedGameWorld) {
    if (config.adjustJoinPower === true) {
      logger.log('debug', 'Elevating \'i_channel_join_power\' enabled.')
      logger.log('debug', 'Game worlds with elevated join power: ' + allowedGameWorld)
      serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[allowedGameWorld].serverGroupId, permsid: 'i_channel_join_power', permvalue: config.elevatedJoinPower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
        if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
        logger.log('debug', 'Response while changing elevated join power: ' + util.inspect(response))
        logger.log('debug', 'rawResponse while changing elevated join power: ' + util.inspect(rawResponse))
      })
    } else {
      logger.log('info', 'Elevating \'i_channel_join_power\' disabled.')
    }
    if (config.adjustChannelSubscriptions === true) {
      logger.log('debug', 'Elevating \'i_client_max_channel_subscriptions\' enabled.')
      serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[allowedGameWorld].serverGroupId, permsid: 'i_client_max_channel_subscriptions', permvalue: config.elevatedChannelSubscriptions, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
        if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
        logger.log('debug', 'Response while changing elevated max channel subscriptions: ' + util.inspect(response))
        logger.log('debug', 'rawResponse while changing elevated max channel subscriptions: ' + util.inspect(rawResponse))
      })
    } else {
      logger.log('debug', 'Elevating \'i_client_max_channel_subscriptions\' disabled.')
    }
    if (config.adjustSubscribePower === true) {
      logger.log('debug', 'Elevating \'i_channel_subscribe_power\' enabled.')
      serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[allowedGameWorld].serverGroupId, permsid: 'i_channel_subscribe_power', permvalue: config.elevatedSubscribePower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
        if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
        logger.log('debug', 'Response while changing default channel subscribe power: ' + util.inspect(response))
        logger.log('debug', 'rawResponse while changing default channel subscribe power: ' + util.inspect(rawResponse))
      })
    } else {
      logger.log('debug', 'Elevating \'i_channel_subscribe_power\' disabled.')
    }
  })
  callback()
}
