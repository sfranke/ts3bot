var purgeOnMe = exports
var logger = require('../logger')
var util = require('util')
var config = JSON.parse(require('fs').readFileSync('config.json'))

purgeOnMe.info = function () {
  purgeOnMe.issued = '!purgeOnMe [time]'
  purgeOnMe.description = 'Clears your current channel from idle clients. Where \'time\' is given in minutes and is optional.'
  purgeOnMe.message = 'Uppon commander\'s request.. Moving you to AFK-channel. Reason: idle'
  return purgeOnMe
}

purgeOnMe.command = function (client, serverQueryClient, AdminMessageArray) {
  // TODO: This should be moved to the config file.
  let idleTime = 600000
  // This part ensures that idle time can't be negative which will affect active clients as well. Please consider
  // to use a more appropriate (min/max) value. Defaults to 10 minutes.
  if (AdminMessageArray[1] < 0) {
    idleTime = (AdminMessageArray[1] * -1) * 60000 || 600000
  } else {
    idleTime = AdminMessageArray[1] * 60000 || 600000
  }
  logger.log('debug', 'IdleTime: ' + idleTime)
  logger.log('debug', 'Show client object:\n' + util.inspect(client))
  // Client ID of the client that issues the command.
  let currentInvokerId = client.invokerid
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
          // channel. Clients that have not the invoker's client ID and exceed the idle time given (or fall back to
          // default value).
          response.map(function (user) {
            if (user.cid === currentChannel && user.clid !== currentInvokerId && user.client_idle_time >= idleTime) {
              logger.log('debug', 'Found user in current channel:\n' + util.inspect(user))
              // Moving clients that match all our criteria.
              serverQueryClient.send('clientmove', {clid: user.clid, cid: config.afkChannel}, function (error, response) {
                if (error !== undefined) {
                  logger.log('error', 'While \'clientmove\': ' + error.msg)
                  logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error))
                } else {
                  logger.log('info', 'Sending idle message.')
                  // Then send them a private message explaining what happened.
                  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: user.clid, msg: purgeOnMe.info().message + ' > ' + (idleTime / 60000) + ' mins.'})
                }
              })
            }
          })
        }
      })
    }
  })
}
