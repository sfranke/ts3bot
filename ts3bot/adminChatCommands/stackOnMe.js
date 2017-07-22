const stackOnMe = exports
const logger = require('../logger')
const util = require('util')
// const config = JSON.parse(require('fs').readFileSync('config.json'))

stackOnMe.info = function () {
  stackOnMe.issued = '!stackOnMe'
  stackOnMe.description = 'Moves all clients on the server to your channel.'
  stackOnMe.message = 'You have been stacked! GET ON THE TAG!!!'
  return stackOnMe
}

stackOnMe.command = function (client, serverQueryClient, AdminMessageArray) {
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
            if (user.cid !== currentChannel && user.clid !== currentInvokerId && user.client_type === 0) {
              logger.log('debug', 'Found user in current channel:\n' + util.inspect(user))
              // Moving clients that match all our criteria.
              serverQueryClient.send('clientmove', {clid: user.clid, cid: currentChannel}, function (error, response) {
                if (error !== undefined) {
                  logger.log('error', 'While \'clientmove\': ' + error.msg)
                  logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error))
                } else {
                  logger.log('info', 'Sending idle message.')
                  // Then send them a private message explaining what happened.
                  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: user.clid, msg: stackOnMe.info().message})
                }
              })
            }
          })
        }
      })
    }
  })
}
