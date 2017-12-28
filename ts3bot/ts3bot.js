#!/usr/local/bin/node

// Copyright (C) 2016  sfr4nke
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const fs = require('fs')
const path = require('path')
const util = require('util')
const TeamSpeakClient = require('node-teamspeak')
const async = require('async')
const logger = require('./logger')
const ChatMessage = require('./chatMessage')
const api = require('./api')
const database = require('./database')
const databasePurge = require('./databasePurge')
const clientIdleMove = require('./clientIdleMove')
const matchup = require('./matchup')
const serverGroups = require('./serverGroups')
const adminChatCommands = require('./adminChatCommands')
const userChatCommands = require('./userChatCommands')
const commanderChatCommands = require('./commanderChatCommands')
const serverGroupPermissions = require('./serverGroupPermissions')
const os = require('os')
const config = JSON.parse(require('fs').readFileSync('config.json'))
const helper = require('./helper');

// Main function to create an instance of the ts3bot itself.
(function ts3bot () {
  // process.on('SIGINT', function () {
  //   console.log('Received SIGINT.  Control-C pressed.')
  // })
  // Configuration of the teamspeak server query client.
  let serverQueryClient = new TeamSpeakClient(config.host, config.port)

  // Start-up routine of the the bot. Connecting  to all services to run properly.
  // All routines that should be run on start-up should be implemented here.
  async.series({

    // Configuration options and falgs should be listed here.
    configurationFlags: function (callback) {
      const tick = '[✔] '
      const xMark = '[✘] '
      // List of all features and their status at startup.
      const features = [
        'debuglevel',
        'homeWorld',
        'MoveAfkClientsFromLobby',
        'PurgeClientsFromTS3Database',
        'FindMatchupPartner',
        'MoveAfkClientsFromLobby',
        'PurgeClientsFromTS3Database',
        'FindMatchupPartner',
        'setServerGroupPermissions',
        'adjustJoinPower',
        'adjustChannelSubscriptions',
        'adjustSubscribePower',
        'welcomePoke',
        'commanderServerGroup',
        'accessServerGroup'
      ]
      // Output feature status to the console at startup.
      features.map(function (feature) {
        if (typeof config[feature] === 'boolean') {
          if (config[feature] === true) {
            logger.log('info', tick + config['_' + feature + '_comment'])
          } else {
            logger.log('info', xMark + config['_' + feature + '_comment'])
          }
        } else {
          logger.log('info', config['_' + feature + '_comment'] + ' ' + config[feature])
        }
      })
      callback()
    },

    // Creating a backup of the log file if it exists.
    // TODO: Need to encapsulate this!
    backupLog: function (callback) {
      // Checking if a file called 'logBackup' exists.
      fs.stat('logBackup', function (err, stat) {
        logger.log('debug', 'fs.stat error:\n' + util.inspect(err))
        // If the file exists this function will return the stats of that file.
        logger.log('debug', 'fs.stat stat:\n' + util.inspect(stat))
        // If this file does not exist..
        if (err !== null) {
          // we create it.
          fs.mkdir(path.join(__dirname, '/logBackup/'), function (err, cb) {
            if (err) logger.log('debug', 'Error while creating directory: ' + util.inspect(err))
            logger.log('debug', 'Response while creating directory: ' + util.inspect(cb))
          })
        // Else it is already there and we don't need to create it.
        } else {
          logger.log('debug', 'Backup folder for old logs already exists.')
        }
      })
      // Checking if a file called 'log' exists.
      fs.stat(path.join(__dirname, '/log'), function (error, response) {
        if (error) logger.log('debug', 'Error while accessing file: ' + util.inspect(error))
        // The file could be there but empty.
        if (response.size === 0) {
          logger.log('debug', 'No log file found.')
        // If this file exists and its size is NOT 0, then prepare for rename.
        } else {
          logger.log('info', 'Creating backup of log file.')
          // Renames a file, moving it between directories if required.
          fs.rename(path.join(__dirname, '/log'), path.join(__dirname, '/logBackup/' + helper.dateAndTime() + '.log'), function (err) {
            if (err) logger.log('debug', 'Error while renaming log file: ' + util.inspect(err))
            logger.log('debug', 'Log file renamed.')
            callback()
          })
        }
      })
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
            logger.log('error', 'Error during login. ' + util.inspect(error))
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
          logger.log('error', 'Error during server selection. ' + util.inspect(error))
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
            logger.log('error', 'Error during nick change. ' + util.inspect(error))
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
            logger.log('error', 'Error during registration for private text messages. ' + util.inspect(error))
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
            logger.log('error', 'Error during registration for server events. ' + util.inspect(error))
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
            logger.log('error', 'Error during registration for text server. ' + util.inspect(error))
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
          logger.log('debug', 'Database error: ' + util.inspect(error))
          logger.log('error', 'Could not connect to database. Aborting.' + util.inspect(error))
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
        setInterval(() => {
          databasePurge.databaseCleanup(serverQueryClient)
        }
        , config.dbCleanupInterval)
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

    // This is fetching the current matchup from the API and then adjusting server group permissions on the teamspeak
    // server, so you don't have to do that manually. This process is done in three steps. 1. Fetch the current matchup
    // from the API. 2. Reset all server group permission to the default values defined in the config file. And 3.
    // elevating server group permissions for your server and your matchup partners.
    matchup: function (callback) {
      let currentConfig
      if (config.FindMatchupPartner === true) {
        matchup.getMatchups(function (error, response) {
          logger.log('debug', 'getMatchup error object: ' + error)
          logger.log('debug', 'getMatchup response object: ' + response)
          currentConfig = config
          if (response !== null) {
            currentConfig.worldsAllowed = response
            fs.open(path.join(__dirname, './config.json'), 'w+', function (error, fd) {
              logger.log('debug', 'File descriptor error: ' + util.inspect(error))
              logger.log('debug', 'File descriptor: ' + fd)
              // TODO: Get size here maybe? Might look into more specific information.
              if (error) logger.log('debug', 'Error while opening config file. ' + error)
              // This is where I might loose my config file!! Try/Catch this thing please to ensure this can NOT fail at all!
              // TODO: Refactor so this part can not fail! Try/Catch the JSON parsing before even considering to
              // write to a file on the hard drive.
              try {
                const conf = JSON.stringify(currentConfig, null, 4)
                fs.writeFile('./config.json', conf, function (error) {
                  if (error) logger.log('error', 'Error while saving config.' + error)
                  fs.appendFile('./config.json', os.EOL, function (error) {
                    if (error) logger.log('error', 'Error while adding EOL to config.' + error)
                    logger.log('info', 'Configuration saved successfully')
                    if (config.setServerGroupPermissions === true) {
                      async.series({
                        resettingPermissions: function (callback) {
                          serverGroupPermissions.resettingPermissions(config, serverQueryClient, function (callback) {
                          })
                          callback()
                        },
                        elevatingPermissions: function (callback) {
                          serverGroupPermissions.elevatingPermissins(config, serverQueryClient, function (callback) {
                          })
                          callback()
                        }
                      }, function (err, results) {
                        if (err) logger.log('error', 'Error while changin server group permissions. ' + util.inspect(err))
                      })
                    }
                  })
                })
              } catch (e) {
                logger.log('debug', 'No valid JSON in matchup routine. ' + util.inspect(e))
              }
            })
          }
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
    if (response.invokername !== config.clientName && response.msg.length === 72) {
      api.account(response, function (error, response) {
        logger.log('debug', 'api.account_callback_err: ' + util.inspect(error))
        logger.log('debug', 'api.account_callback_res:\n' + util.inspect(response))
        let clientObject = response
        if (error !== null) {
          logger.log('debug', 'Error while checking API-key.\n' + util.inspect(error))
          let message = new ChatMessage()
          // TODO: Check error cases here!
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
          // TODO: Need to clean this up!
          // No error process valid data.
          // Account and world checked, verified member.
          database.updateAccountInformation(response, function (error, response) {
            logger.log('debug', '[TEST RESPONSE] : ' + util.inspect(response))
            logger.log('debug', 'Error of \'database.updateAccountInformation()\' on registration ' + util.inspect(error))
            logger.log('debug', 'Response of \'database.updateAccountInformation()\' on registration ' + util.inspect(response))
            if (error !== null) {
              let message = new ChatMessage()
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
      adminChatCommands.execute(response, serverQueryClient)
    // Since we are introducing chat commands for commanders as well, we need to check for whether or not
    // the text message is sent by a member of the commander server group. Which is defined in the config file.
    } else if (response.invokername !== config.clientName && response.msg.length !== 72) {
      let commander = response
      // To find out which server groups a client is a member of we need to utilize 'clientinfo'.
      serverQueryClient.send('clientinfo', {clid: response.invokerid}, function (error, response) {
        if (error !== undefined) {
          logger.log('debug', 'Error while getting clientinfo: ' + util.inspect(error))
          logger.log('error', 'Error while getting clientinfo: ' + util.inspect(error))
        } else {
          logger.log('debug', 'Response while getting clientinfo: ' + util.inspect(response))
          logger.log('debug', 'Channel ID: ' + response.cid)
          logger.log('debug', 'Server groups of current client\n' + util.inspect(response.client_servergroups))
          // For now it is safe to assume that a commander is at least member of two (2) server groups. Firstly
          // the server group related to the game world and secondly the commander server group. It is possible
          // though that clients with less than two server groups try to 'chat' with the system, so we need to handle
          // that case as well.
          try {
            // The list of server groups on the Teamspeak3 server is a string.
            let stringServerGroups = response.client_servergroups.split(',')
            let intServerGroups = stringServerGroups.map(function (serverGroupId) { return parseInt(serverGroupId, 10) })
            logger.log('debug', 'Server groups array: ' + util.inspect(intServerGroups))
            logger.log('debug', 'Commander server group? ' + intServerGroups.indexOf(config.commanderServerGroupId))
            if (intServerGroups.indexOf(config.commanderServerGroupId) !== -1) {
              logger.log('debug', 'Commander issueing a chat command. ' + response.client_unique_identifier + ' - ' + response.client_nickname + ' - ' + response.connection_client_ip)
              commanderChatCommands.execute(commander, serverQueryClient)
            } else {
              logger.log('debug', 'Not a commander. ' + response.client_unique_identifier + ' - ' + response.client_nickname + ' - ' + response.connection_client_ip)
            }
          } catch (e) {
            logger.log('debug', 'Resolving error within try/catch block. ' + e)
            logger.log('debug', 'Client with less than two server groups. ' + response.client_unique_identifier + ' - ' + response.client_nickname + ' - ' + response.connection_client_ip)
            // User chat command.
            userChatCommands.execute(commander, serverQueryClient)
          }
        }
      })
    }
  })

  // TODO: I lost permissions when the system was offline and unable to check my data. I might be wrong and the
  // account I used was a blank one. please doule check!
  // Following the business logic for the event of a client entering the server. The clients data in the database is
  // checked and depending on the result, new user or registered user we will have two different strategies. New users
  // will be welcomed and asked to register. While a registered user's data will be revalidated. If the data is still
  // valid that user will be ignored. If changes occured, like a changes in the associated game world the registration
  // system will revoke/permitt server groups accordingly.
  serverQueryClient.on('cliententerview', function (response) {
    let clientObject = response
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
                if (config.welcomePoke === true) {
                  logger.log('debug', 'Sending welcome poke.')
                  let existingWelcomePoke = new ChatMessage()
                  serverQueryClient.send('clientpoke', existingWelcomePoke.chatSend('welcomePokeMsg', clientObject))
                }
                let existingClientWelcomeMessage = new ChatMessage()
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
              if (config.welcomePoke === true) {
                logger.log('debug', 'Sending welcome poke.')
                let newUserWelcomePoke = new ChatMessage()
                serverQueryClient.send('clientpoke', newUserWelcomePoke.chatSend('welcomePokeMsg', clientObject))
              }
              let newClientWelcomeMessage = new ChatMessage()
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
