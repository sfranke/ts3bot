const databaseBackup = exports
const logger = require('../logger')
const exec = require('child_process').exec
const util = require('util')
const helper = require('../helper')

databaseBackup.info = function () {
  databaseBackup.issued = '!databaseBackup'
  databaseBackup.description = 'Create a backup of your this system\'s database.'
  databaseBackup.message = 'Creating a database backup.'
  return databaseBackup
}

databaseBackup.command = function (client, serverQueryClient) {
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: databaseBackup.info().message})
  exec('mongoexport -d ts3bot -c clients -o ' + helper.dateAndTime() + '_clients_backup.json', function (error, stdout, stderr) {
    if (error) logger.log('debug', 'Error while creating database dump. ' + util.inspect(error))
    serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: 'Done.'})
    logger.log('debug', 'Creating database dump, stderr: ' + util.inspect(stderr))
    logger.log('debug', 'Creating database dump, stdout: ' + util.inspect(stdout))
  })
}
