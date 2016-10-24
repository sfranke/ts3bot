#!/usr/bin/node

var fs = require('fs')
var path = require('path')
var util = require('util')
var TeamSpeakClient = require('node-teamspeak')
var async = require('async')
var logger = require('./logger')
var chatMessage = require('./chatMessage')
var api = require('./api')
var database = require('./database')
var databasePurge = require('./databasePurge')
var clientIdleMove = require('./clientIdleMove')
var matchup = require('./matchup')
var serverGroups = require('./serverGroups')
var os = require('os')
var config = JSON.parse(require('fs').readFileSync('config.json'));

// Main function to create an instance of the ts3bot itself.
(function ts3bot () {
  // Configuration of the teamspeak server query client.
  var serverQueryClient = new TeamSpeakClient(config.host, config.port)

  // Start-up routine of the the bot. Connecting  to all services to run properly.
  // All routines that should be run on start-up should be implemented here.
  async.series({

    // Configuration options and falgs should be listed here.
    configurationFlags: function (callback) {
      var tick = '[✔] '
      var xMark = '[✘] '
      logger.log('info', 'Logging level is set to: ' + config.debuglevel)
      logger.log('info', 'Home world is set to: ' + config.homeWorld)
      if (config.MoveAfkClientsFromLobby === true) {
        logger.log('info', tick + 'Moving AFK clients from lobby enabled.')
      } else {
        logger.log('info', xMark + 'Moving AFK clients from lobby disabled.')
      }
      if (config.PurgeClientsFromTS3Database === true) {
        logger.log('info', tick + 'Purge old clients from TS3 database enabled.')
      } else {
        logger.log('info', xMark + 'Purge old clients from TS3 database disabled.')
      }
      if (config.FindMatchupPartner === true) {
        logger.log('info', tick + 'Looking for match-up partner enabled.')
      } else {
        logger.log('info', xMark + 'Looking for match-up partner disabled.')
      }
      if (config.setServerGroupPermissions === true) {
        logger.log('info', tick + 'Resetting server group permissions automatically enabled.')
      } else {
        logger.log('info', xMark + 'Resetting server group permissions automatically disabled.')
      }
      if (config.adjustJoinPower === true) {
        logger.log('info', tick + 'Adjusting \'i_channel_join_power\' enabled.')
      } else {
        logger.log('info', xMark + 'Adjusting \'i_channel_join_power\' disabled.')
      }
      if (config.adjustChannelSubscriptions === true) {
        logger.log('info', tick + 'Adjusting \'i_client_max_channel_subscriptions\' enabled.')
      } else {
        logger.log('info', xMark + 'Adjusting \'i_client_max_channel_subscriptions\' disabled.')
      }
      if (config.adjustSubscribePower === true) {
        logger.log('info', tick + 'Adjusting \'i_channel_subscribe_power\' enabled.')
      } else {
        logger.log('info', xMark + 'Adjusting \'i_channel_subscribe_power\' disabled.')
      }
      if (config.commanderServerGroup === true) {
        logger.log('info', tick + 'Assign commander server group enabled.')
      } else {
        logger.log('info', xMark + 'Assign commander server group disabled.')
      }
      if (config.accessServerGroup === true) {
        logger.log('info', tick + 'Assign access server group enabled.')
      } else {
        logger.log('info', xMark + 'Assign access server group disabled.')
      }
      callback()
    },

    // Creating a backup of the log file if it exists.
    backupLog: function (callback) {
      fs.mkdir(path.join(__dirname, '/logBackup/'), function (err, cb) {
        if (err) logger.log('debug', 'Error while creating direktory: ' + util.inspect(err))
        logger.log('debug', 'Response while creating directory: ' + util.inspect(cb))
      })
      fs.stat(path.join(__dirname, '/log'), function (error, response) {
        if (error) logger.log('debug', 'Error while accessing file: ' + util.inspect(error))
        if (response.size === 0) {
          logger.log('debug', 'No log file found.')
        } else {
          var year = new Date().getFullYear()
          var month = new Date().getMonth()
          var day = new Date().getDate()
          var hours = new Date().getHours()
          var minutes = new Date().getMinutes()
          var seconds = new Date().getSeconds()
          var milliseconds = new Date().getMilliseconds()
          var date = year + (month + 1) + day + '_' + hours + '-' + minutes + '-' + seconds + '-' + milliseconds
          logger.log('info', 'Creating backup of log file.')
          fs.rename(path.join(__dirname, '/log'), path.join(__dirname, '/logBackup/' + date + '.log'), function (err, res) {
            if (err) logger.log('debug', 'Error while renaming log file: ' + util.inspect(err))
            logger.log('debug', 'Renaming log file: ' + util.inspect(res))
          })
        }
      })
      callback()
    },

    // Login routine. login name and password are provided via config file.
    login: function (callback) {
      serverQueryClient.send(
        'login',
        {
          client_login_name: config.loginName,
          client_login_password: config.clientPassword
        },
          function (error, response, rawResponse) {
            if (error !== undefined) {
              logger.log('error', error)
            } else {
              logger.log('info', 'Login successful.')
              callback()
            }
          })
    },

    // Server selection. Server ID is provided via config file.
    selectServer: function (callback) {
      serverQueryClient.send('use', {sid: config.virtualServerId}, function (error, response, rawResponse) {
        if (error !== undefined) {
          logger.log('error', error)
        } else {
          logger.log('info', 'Virtual server selected successfully.')
          callback()
        }
      })
    },

    // Change client name. This will change the visible client name provided via the config file.
    changeNick: function (callback) {
      serverQueryClient.send(
        'clientupdate',
        {
          client_nickname: config.clientName
        },
        function (error, response, rawResponse) {
          if (error !== undefined) {
            logger.log('error', error)
          } else {
            logger.log('info', 'Client name changed successfully.')
            callback()
          }
        })
    },

    // Register to the server for private text messages. This will ensure we can receive private text
    // messages once registered to the server.
    registerForPrivateTextMessages: function (callback) {
      serverQueryClient.send(
        'servernotifyregister',
        {
          event: 'textprivate'
        },
        function (error, response, rawResponse) {
          if (error !== undefined) {
            logger.log('error', error)
          } else {
            logger.log('info', 'Registered for private textmessages successfully.')
            callback()
          }
        })
    },

    // Register to the server for server events. This will ensure we can hook into server events
    // like 'onConnect' to get notified when a client connects to the server.
    registerForServerEvents: function (callback) {
      serverQueryClient.send(
        'servernotifyregister',
        {
          event: 'server'
        },
        function (error, response, rawResponse) {
          if (error !== undefined) {
            logger.log('error', error)
          } else {
            logger.log('info', 'Registered for server events successfully.')
            callback()
          }
        })
    },

    // Register to the server for receiving text message within a specified channel (lobby).
    registerForTextServer: function (callback) {
      serverQueryClient.send(
        'servernotifyregister',
        {
          event: 'textchannel', id: '3'
        },
        function (error, response, rawResponse) {
          if (error !== undefined) {
            logger.log('error', error)
          } else {
            logger.log('info', 'Registered for textchannel events successfully.')
            callback()
          }
        })
    },

    // Connect to database to ensure the database is installed and available.
    connectDatabase: function (callback) {
      database.createDatabase(function (error, response) {
        if (error !== null) {
          logger.log('debug', 'Database error: ' + error)
          logger.log('error', 'Could not connect to database. Aborting.')
          process.exit()
        } else {
          logger.log('info', 'Connected to database.')
          logger.log('info', 'Starting database clean-up routine.')
          callback()
        }
      })
    },

    // Clean-up routine to delete old/inactive clients from the teamspeak servers SQLite database.
    // Because of the amount of hits to the SQLite database. This function is one of the reasons
    // why the host of this program should be whitelisted for the teamspeak server.
    databasePurge: function (callback) {
      if (config.PurgeClientsFromTS3Database === true) {
        databasePurge.databaseCleanup(serverQueryClient)
      } else {
        logger.log('debug', 'Purge old clients from TS3 database disabled.')
      }
      callback()
    },

    // Routine to move idle clients from the lobby to a designated AFK channel. Timer for this routine
    // can be adjusted via the config file.
    clientIdleMove: function (callback) {
      if (config.MoveAfkClientsFromLobby === true) {
        logger.log('info', 'Moving AFK-clients is active and running.')
        clientIdleMove.moveClient(serverQueryClient)
      }
      callback()
    },

    matchup: function (callback) {
      if (config.FindMatchupPartner === true) {
        matchup.getMatchups(function (error, response) {
          logger.log('debug', 'getMatchup error object: ' + error)
          logger.log('debug', 'getMatchup response object: ' + response)
          logger.log('debug', 'Type of matchup: ' + typeof (response))
          var currentConfig = config
          logger.log('debug', 'Current config.json: ' + util.inspect(currentConfig))
          currentConfig.worldsAllowed = response
          fs.writeFile('./config.json', JSON.stringify(currentConfig, null, 4), function (error) {
            if (error) logger.log('error', 'Error while saving config.' + error)
            fs.appendFile('./config.json', os.EOL, function (error) {
              if (error) logger.log('error', 'Error while adding EOL to config.' + error)
              logger.log('info', 'Configuration saved successfully')
              if (config.setServerGroupPermissions === true) {
                async.series({
                  resettingPermissions: function (callback) {
                    for (var gameWorldId in config.gameWorlds) {
                      if (config.adjustJoinPower === true) {
                        logger.log('debug', 'Adjusting \'i_channel_join_power\' enabled.')
                        logger.log('debug', 'List of game world server IDs: ' + config.gameWorlds[gameWorldId].serverGroupId)
                        serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[gameWorldId].serverGroupId, permsid: 'i_channel_join_power', permvalue: config.defaultJoinPower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
                          if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
                          logger.log('debug', 'Response while changing default join power: ' + util.inspect(response))
                          logger.log('debug', 'rawResponse while changing default join power: ' + util.inspect(rawResponse))
                        })
                      } else {
                        logger.log('debug', 'Adjusting \'i_channel_join_power\' disabled.')
                      }
                      if (config.adjustChannelSubscriptions === true) {
                        logger.log('debug', 'Adjusting \'i_client_max_channel_subscriptions\' enabled.')
                        serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[gameWorldId].serverGroupId, permsid: 'i_client_max_channel_subscriptions', permvalue: config.defaultChannelSubscriptions, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
                          if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
                          logger.log('debug', 'Response while changing default max channel subscriptions: ' + util.inspect(response))
                          logger.log('debug', 'rawResponse while changing default max channel subscriptions: ' + util.inspect(rawResponse))
                        })
                      } else {
                        logger.log('debug', 'Adjusting \'i_client_max_channel_subscriptions\' disabled.')
                      }
                      if (config.adjustSubscribePower === true) {
                        logger.log('debug', 'Adjusting \'i_channel_subscribe_power\' enabled.')
                        serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[gameWorldId].serverGroupId, permsid: 'i_channel_subscribe_power', permvalue: config.defaultSubscribePower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
                          if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
                          logger.log('debug', 'Response while changing default channel subscribe power: ' + util.inspect(response))
                          logger.log('debug', 'rawResponse while changing default channel subscribe power: ' + util.inspect(rawResponse))
                        })
                      } else {
                        logger.log('debug', 'Adjusting \'i_channel_subscribe_power\' disabled.')
                      }
                    }
                    callback()
                  },
                  elevatingPermissions: function (callback) {
                    config.worldsAllowed.forEach(function (allowedGameWorld) {
                      if (config.adjustJoinPower === true) {
                        logger.log('debug', 'Adjusting \'i_channel_join_power\' enabled.')
                        logger.log('debug', 'Game worlds with elevated join power: ' + allowedGameWorld)
                        serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[allowedGameWorld].serverGroupId, permsid: 'i_channel_join_power', permvalue: config.elevatedJoinPower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
                          if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
                          logger.log('debug', 'Response while changing elevated join power: ' + util.inspect(response))
                          logger.log('debug', 'rawResponse while changing elevated join power: ' + util.inspect(rawResponse))
                        })
                      } else {
                        logger.log('info', 'Adjusting \'i_channel_join_power\' disabled.')
                      }
                      if (config.adjustChannelSubscriptions === true) {
                        logger.log('debug', 'Adjusting \'i_client_max_channel_subscriptions\' enabled.')
                        serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[allowedGameWorld].serverGroupId, permsid: 'i_client_max_channel_subscriptions', permvalue: config.elevatedChannelSubscriptions, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
                          if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
                          logger.log('debug', 'Response while changing elevated max channel subscriptions: ' + util.inspect(response))
                          logger.log('debug', 'rawResponse while changing elevated max channel subscriptions: ' + util.inspect(rawResponse))
                        })
                      } else {
                        logger.log('debug', 'Adjusting \'i_client_max_channel_subscriptions\' disabled.')
                      }
                      if (config.adjustSubscribePower === true) {
                        logger.log('debug', 'Adjusting \'i_channel_subscribe_power\' enabled.')
                        serverQueryClient.send('servergroupaddperm', {sgid: config.gameWorlds[allowedGameWorld].serverGroupId, permsid: 'i_channel_subscribe_power', permvalue: config.elevatedSubscribePower, permnegated: 0, permskip: 0}, function (error, response, rawResponse) {
                          if (error) logger.log('error', 'Error while changing server group permission. ' + util.inspect(error))
                          logger.log('debug', 'Response while changing default channel subscribe power: ' + util.inspect(response))
                          logger.log('debug', 'rawResponse while changing default channel subscribe power: ' + util.inspect(rawResponse))
                        })
                      } else {
                        logger.log('debug', 'Adjusting \'i_channel_subscribe_power\' disabled.')
                      }
                    })
                    callback()
                  }
                }, function (err, results) {
                  if (err) logger.log('error', 'Error while changin server group permissions. ' + util.inspect(err))
                })
              }
            })
          })
        })
      }
      callback()
    }
  },
  // End of the async series.
  function (error, result) {
    if (error) logger.log('error', 'Error during start-up routine.' + util.inspect(error))
    logger.log('info', 'End of start-up routine.')
  })

  // This is all the behavior regarding text messages. This behavior has been tested and has proven to be working as
  // expected. All error handling necessary is included and can be refined to avoid code duplication.
  // One thing that should be improved:
  // Since we have a comprehensive database of API-keys, we might consider checking for any API-key first in the
  // local storage (mongodB) and secondly validate against the official API.
  serverQueryClient.on('textmessage', function (response) {
    var message = new chatMessage()
    if (response.invokername !== config.clientName && response.msg.length === 72) {
      api.account(response, function (error, response) {
        logger.log('debug', 'api.account_callback_err: ' + util.inspect(error))
        logger.log('debug', 'api.account_callback_res:\n' + util.inspect(response))
        var clientObject = response
        if (error !== null) {
          logger.log('debug', 'Error while checking API-key.\n' + util.inspect(error))
          var message = new chatMessage()
          // Check error cases here.
          // If error object contains 'accountWorldName' and 'accountWorldId' which only is set if account is associated with foreign world.
          if (error.accountWorldName !== undefined && error.accountWorldId !== config.homeWorld) {
            logger.log('debug', 'Foreign world on registration.\n' + util.inspect(error))
            logger.log('info', 'Foreign world on registration.\n' + '(' + error.invokerid + ')' + error.invokername + ': ' + error.invokeruid + ' \'' + error.apiKey + '\' ' + error.accountWorldName)
            serverQueryClient.send('sendtextmessage', message.chatSend('foreignWorld', error))
          }
          // If server responds with https status code 400 (invalid key).
          if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'invalid key') {
            logger.log('debug', 'Invalid key on registration.\n' + util.inspect(error))
            logger.log('info', 'Invalid key on registration.\n' + '(' + error.invokerid + ')' + error.invokername + ': ' + error.invokeruid + ' \'' + error.apiKey + '\'')
            serverQueryClient.send('sendtextmessage', message.chatSend('keyNotValid400', error))
          }
          // If server responds with http status code 400 (ErrBadData).
          if (error.apiServerStatus === 400 && error.apiServerStatusReason === 'ErrBadData') {
            logger.log('debug', 'Server responding with \'ErrBadData\' on registration.\n' + util.inspect(error))
            logger.log('info', 'Server responding with \'ErrBadData\' on registration.')
            serverQueryClient.send('sendtextmessage', message.chatSend('apiErrorErrBadData', error))
          }
          // If server responds with http status code 503 (Server busy).
          if (error.apiServerStatus === 503) {
            logger.log('debug', 'Server responding with \'Server busy\' on registration.' + util.inspect(error))
            logger.log('info', 'Server responding with \'Server busy\' on registration.')
            serverQueryClient.send('sendtextmessage', message.chatSend('api503', error))
          }
        } else {
          // No error process valid data.
          // Account and world checked, verified member.
          database.updateAccountInformation(response, function (error, response) {
            logger.log('debug', '[TEST RESPONSE] : ' + util.inspect(response))
            logger.log('debug', 'Error of \'database.updateAccountInformation()\' on registration ' + util.inspect(error))
            logger.log('debug', 'Response of \'database.updateAccountInformation()\' on registration ' + util.inspect(response))
            if (error !== null) {
              var message = new chatMessage()
              serverQueryClient.send('sendtextmessage', message.chatSend('alreadyInUse', clientObject))
            } else {
              logger.log('info', 'Added account information to database.\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid)
              serverQueryClient.send('clientgetdbidfromuid', {cluid: clientObject.invokeruid}, function (error, response) {
                if (error !== undefined) {
                  logger.log('error', 'Error while clientgetdbidfromuid: ' + clientObject.invokeruid + util.inspect(error))
                } else {
                  logger.log('info', 'SUCCESS, member permissions granted for: ' + '\n' + '(' + clientObject.invokerid + ')' + clientObject.invokername + ': ' + clientObject.invokeruid)
                  logger.log('debug', '[TEST GRANT PERMISSIONS]: ' + util.inspect(clientObject))
                  logger.log('debug', 'Current game world: ' + clientObject.world)
                  logger.log('debug', 'Related server group id: ' + config.gameWorlds[clientObject.world].serverGroupId)
                  if (clientObject.world !== undefined) {
                    serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clientObject.invokerid, msg: config.confirmAccessMsg})
                    serverQueryClient.send('servergroupaddclient', {sgid: config.gameWorlds[clientObject.world].serverGroupId, cldbid: response.cldbid}, function (error, response) {
                      if (error) logger.log('error', 'Error while adding server group. ' + util.inspect(error))
                      logger.log('debug', '#############====>>>> ' + util.inspect(clientObject))
                      serverQueryClient.send('clientinfo', {clid: clientObject.invokerid}, function (error, response) {
                        if (error) logger.log('error', 'Error while retrieving clientinfo. ' + util.inspect(error))
                        logger.log('debug', 'Response from clientinfo: ' + util.inspect(response))
                        clientObject.client_servergroups = response.client_servergroups
                        clientObject.invokerdbid = response.client_database_id
                        serverGroups.purgeClient(serverQueryClient, clientObject, function (error, response) {
                          if (error) logger.log('error', 'Error while purging client. ' + util.inspect(error))
                          logger.log('debug', 'Purging client. ' + util.inspect(response))
                        })
                      })
                    })
                  }
                }
              })
            }
          })
        }
      })
    } else if (config.adminReport.indexOf(response.invokeruid) !== -1) {
      serverQueryClient.send('sendtextmessage', message.chatSend('admin', response))
      logger.log('info', 'Received message from admin: ' + '\n' + '\'' + response.msg + '\'')
      logger.log('debug', 'ResponseOnject on AdminMessage: ' + util.inspect(response))
      if (response.msg.length > 1) {
        var AdminMessageArray = response.msg.split(' ')
        logger.log('debug', 'AdminMessageArray after split() ' + AdminMessageArray)
        if (AdminMessageArray[0] === '!move') {
          var clid = AdminMessageArray[1]
          serverQueryClient.send('clientmove', {clid: clid, cid: config.afkChannel}, function (error, response) {
            if (error !== undefined) {
              logger.log('error', 'While \'clientmove\': ' + error.msg)
              logger.log('debug', 'While \'clientmove\'\n' + util.inspect(error))
            } else {
              logger.log('info', 'Sending idle poke.')
              serverQueryClient.send('sendtextmessage', {targetmode: '1', target: clid, msg: config.idleMove})
            }
          })
        }
      }
    } else if (response.invokername !== config.clientName && response.msg.length !== 72) {
      // No response to an obviously invalid key.
    }
  })

  // Following the business logic for the event of a client entering the server. The clients data in the database is
  // checked and depending on the result, new user or registered user we will have to different strategies. New users
  // will be welcomed and asked to register. While a registered user's data will be revalidated. If the data is still
  // valid that user will be ignored. If changes occured, like a changes in the associated game world the registration
  // system will revoke/permitt server groups accordingly.
  serverQueryClient.on('cliententerview', function (response) {
    var clientObject = response
    clientObject.invokername = clientObject.client_nickname
    clientObject.invokeruid = clientObject.client_unique_identifier
    clientObject.invokerdbid = clientObject.client_database_id
    clientObject.invokerid = clientObject.clid
    if (clientObject.client_type === 0) {
      // Check for known or unknown client.
      database.getApiKey(clientObject, function (error, response) {
        // Error during database request. Data can not be validated also we might not be able to create a new
        // document. Make sure Database is up and running.
        if (error !== null) {
          logger.log('error', 'Error while retrieving API-key from database. ' + error)
        }
        // Existing user. Check for API-key and revalidate then assign server groups accordingly.
        if (response !== null) {
          logger.log('debug', 'Found existing user. ' + util.inspect(response))
          clientObject.apiKey = response.gw2_api_key
          clientObject.accountId = response.gw2_account_id
          clientObject.world = response.gw2_account_world
          clientObject.accountName = response.gw2_account_name
          clientObject.guilds = response.gw2_guilds
          clientObject.accountCreated = response.gw2_account_created
          clientObject.access = response.gw2_access
          clientObject.commander = response.gw2_commander
          logger.log('debug', 'ClientObject for debugging only. ' + util.inspect(clientObject))
          database.updateLastSeen(clientObject, function (error, response) {
            if (error) logger.log('error', 'Error while updating updateLastSeen: ' + util.inspect(error))
            logger.log('info', 'Updated updateLastSeen for existing user ' + clientObject.clid + ' - ' + clientObject.invokername)
            database.getApiKey(clientObject, function (error, response) {
              if (error) logger.log('error', 'Error while retrieving API-key from database. ' + util.inspect(error))
              logger.log('debug', 'API-key only for debugging. ' + util.inspect(response))
              if (response.gw2_api_key !== null) {
                // Existing client with API-key. Revalidate data and update if necessary.
                logger.log('info', 'Found API-key for existing user.')
                logger.log('debug', 'Response for existing user. ' + util.inspect(response))
                logger.log('debug', 'ClientObject for existing user. ' + util.inspect(clientObject))
                serverGroups.purgeClient(serverQueryClient, clientObject, function (err, res) {
                  if (err) logger.log('error', 'Error while puring server groups. ' + util.inspect(err))
                  logger.log('debug', 'Response while purging server groups. ' + util.inspect(res))
                })
              } else {
                // Existing client withou API-key. Ask client to register.
                logger.log('debug', 'API-key value: ' + response.gw2_api_key)
                logger.log('info', 'No API-key for this user in database.')
                logger.log('debug', 'ClientObject for debugging purpose: ' + util.inspect(clientObject))
                database.updateLastSeen(clientObject, function (error, response) {
                  if (error) logger.log('error', 'Error while updating updateLastSeen: ' + util.inspect(error))
                  logger.log('info', 'Updated updateLastSeen for existing user without API-key. ' + clientObject.clid + ' - ' + clientObject.invokername)
                })
                var existingClientWelcomeMessage = new chatMessage()
                serverQueryClient.send('sendtextmessage', existingClientWelcomeMessage.chatSend('welcome', clientObject))
                logger.log('info', 'Sent welcome message to existing user without API-key.')
                serverGroups.purgeClient(serverQueryClient, clientObject, function (error, response) {
                  if (error) logger.log('error', 'Error while purging client. ' + util.inspect(error))
                  logger.log('debug', 'Purging client. ' + util.inspect(response))
                })
              }
            })
          })
        }
        // Completely new user. Create new document in clients collection and start registration process.
        if (response === null) {
          logger.log('info', 'New user entered the server!')
          database.setNewUser(clientObject, function (error, response) {
            logger.log('debug', 'error: ' + util.inspect(error))
            logger.log('debug', 'response: ' + util.inspect(response))
            if (error !== null) {
              logger.log('error', 'error: ' + util.inspect(error))
            } else {
              logger.log('debug', 'ClientObject: ' + util.inspect(clientObject))
              logger.log('info', 'Set new user for: ' + clientObject.client_nickname)
              var newClientWelcomeMessage = new chatMessage()
              serverQueryClient.send('sendtextmessage', newClientWelcomeMessage.chatSend('welcome', clientObject))
              logger.log('info', 'Sent welcome message to new user for the first time.')
            }
          })
        }
      })
    }
  })

  serverQueryClient.on('queryError', function (error, response) {
    // Error id for banned status.
    if (error.id === '3329') {
      logger.log('error', 'I am banned')
    }
    // Error id for invalid loginname or password.
    if (error.id === '520') {
      logger.log('error', 'Invalid loginname or password')
    }
  })
  serverQueryClient.on('error', function (error, response, rawResponse) {
    if (error !== undefined) {
      logger.log('error', 'An error occured on close!')
      logger.log('debug', 'An error occured on close: ' + '\n' + util.inspect(error))
    }
    if (response !== undefined) {
      logger.log('info', 'An error occured on close!')
      logger.log('debug', 'Response on close: ' + '\n' + util.inspect(response))
    }
    if (rawResponse !== undefined) {
      logger.log('error', 'An error occured on close!')
      logger.log('debug', 'An error has occured: ' + '\n' + util.inspect(rawResponse))
    }
  })
  serverQueryClient.on('close', function (error, response) {
    if (error !== undefined) {
      logger.log('info', 'Close event has been fired!')
      logger.log('debug', 'Close event has been fired! (err)' + '\n' + util.inspect(error))
    }
    if (response !== undefined) {
      logger.log('info', 'Close event has been fired!')
      logger.log('debug', 'Close event has been fired! (res)' + '\n' + util.inspect(response))
    }
    // Try to reconnect/restart after 3 seconds
    setTimeout(function () {
      ts3bot()
    }, 3000)
  })
})()
