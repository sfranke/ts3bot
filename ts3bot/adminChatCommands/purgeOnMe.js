const purgeOnMe = exports
const logger = require('../logger')
const util = require('util')
const config = JSON.parse(require('fs').readFileSync('config.json'))

purgeOnMe.info = function () {
  purgeOnMe.issued = '!purgeOnMe [time]'
  purgeOnMe.description = 'Clears your current channel from idle clients. Where \'time\' is given in minutes and is optional.'
  purgeOnMe.notice = 'The purge has been started.. you have 30 seconds to respond in this private chat or you are going to be moved to AFK for idling.'
  purgeOnMe.message = 'Uppon commander\'s request.. Moving you to AFK-channel. Reason: idle'
  return purgeOnMe
}

purgeOnMe.command = function (client, serverQueryClient, AdminMessageArray) {
  // TODO: This should be moved to the config file.
  let idleTime = 1800000
  let customTimer = 0
  // This part ensures that idle time can't be negative which will affect active clients as well. Please consider
  // to use a more appropriate (min/max) value. Defaults to 10 minutes.
  try {
    customTimer = parseInt(AdminMessageArray[1], 10)
  } catch (e) {
    logger.log('Error while trying to parse idle time. ' + util.inspect(e))
  } finally {
    // If the custom timer is NaN after parsing use the default value.
    if (isNaN(customTimer)) {
      logger.log('Custom timer set to: ' + customTimer)
    // If the custom timer is negative make it positive.
    } else if (customTimer < 0) {
      idleTime = (customTimer * -1) * 60000
    // In any other case assume it's a valid integer and use it instead of the default timer.
    } else {
      idleTime = customTimer * 60000
    }
  }
  logger.log('debug', 'IdleTime: ' + idleTime)
  logger.log('debug', 'Show client object:\n' + util.inspect(client))
  // Client ID of the client that issues the command.
  let currentInvokerId = client.invokerid
  let commanderMessage = 'Purging - Idle timer set to: ' + idleTime / 60000 + ' mins.'
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: commanderMessage})
  // Check the clients info. Need this clients channel ID to be able to only move clients
  // within that specific channel.
  serverQueryClient.send('clientinfo', {clid: client.invokerid}, function (error, response) {
    if (error !== undefined) {
      logger.log('debug', 'Error while getting clientinfo: ' + util.inspect(error))
      logger.log('error', 'Error while getting clientinfo: ' + util.inspect(error))
    } else {
      logger.log('debug', 'Response while getting clientinfo: ' + util.inspect(response))
      logger.log('debug', 'Channel ID: ' + response.cid)
      // Invoker's channel ID.
      let currentChannel = response.cid
      // Since we can only check for all the clients on the server. We fetch a list of all clients Connected
      // to the server.
      serverQueryClient.send('clientlist', ['times'], function (error, response, rawResponse) {
        if (error !== undefined) {
          logger.log('debug', 'Error while getting clientlist: ' + util.inspect(error))
          logger.log('error', 'Error while getting clientlist: ' + util.inspect(error))
        } else {
          logger.log('debug', 'Response while getting clientlist: ' + util.inspect(response))
          // On the list of all clients currently connected to the server, we check for clients within the specified
          // channel and if they exceeded the given idle time.
          response.map(function (user) {
            if (user.cid === currentChannel && user.clid !== currentInvokerId && user.client_idle_time >= idleTime) {
              logger.log('debug', 'Found user in current channel:\n' + util.inspect(user))
              // Those clients will receive a private message to reset their idle timer.
              serverQueryClient.send('sendtextmessage', {targetmode: '1', target: user.clid, msg: purgeOnMe.info().notice}, function (error, response) {
                if (error !== undefined) {
                  logger.log('debug', 'Error while sending textmessage: ' + util.inspect(error))
                  logger.log('error', 'Error while sending textmessage: ' + util.inspect(error))
                } else {
                  logger.log('debug', 'Response while sending textmessage: ' + util.inspect(response))
                // logger.log('debug', 'Function call after message sent.')
                  // The time a client is given to reset the idle time.
                  // TODO: This timer is currently hardcoded and should be configurable within the config file.
                  // Please change this in the future.
                  let timeout = 30000
                  setTimeout(function () {
                    // Once the timeout has run out check the idle timer again to make sure we notice the change
                    serverQueryClient.send('clientinfo', {clid: user.clid}, function (error, response) {
                      if (error !== undefined) {
                        logger.log('debug', 'Error while getting clientinfo: ' + util.inspect(error))
                        logger.log('error', 'Error while getting clientinfo: ' + util.inspect(error))
                      } else {
                        logger.log('debug', 'Response while getting clientinfo: ' + util.inspect(response))
                        // Also once the timeout has run out check if that client is still in the corresponding channel
                        // and the idle timer is still above the given idle time.
                        if (response.cid === currentChannel && response.client_idle_time >= idleTime + timeout) {
                          // Moving clients that match all our criteria.
                          serverQueryClient.send('clientmove', {clid: user.clid, cid: config.afkChannel}, function (error, response) {
                            if (error !== undefined) {
                              logger.log('error', 'While \'clientmove\': ' + error.msg)
                              logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error))
                            } else {
                              logger.log('info', 'Sending idle message during \'purgeOnMe\'.' + '[' + user.client_database_id + ']' + ' ' + user.client_nickname)
                              // Then send them a private message explaining why they got moved.
                              serverQueryClient.send('sendtextmessage', {targetmode: '1', target: user.clid, msg: purgeOnMe.info().message + ' > ' + (idleTime / 60000) + ' mins.'})
                            }
                          })
                        }
                      }
                    })
                  }, timeout)
                }
              })
            }
          })
        }
      })
    }
  })
}
