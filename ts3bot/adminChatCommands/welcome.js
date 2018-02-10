const welcome = exports
const config = JSON.parse(require('fs').readFileSync('config.json'))

welcome.info = function () {
  welcome.issued = '*perm*'
  welcome.description = 'Initiates a welcome message.'
  welcome.message = config.welcomeMessage
  return welcome
}

welcome.command = function (client, serverQueryClient) {
  serverQueryClient.send('sendtextmessage', {targetmode: '1', target: client.invokerid, msg: welcome.info().message})
}
