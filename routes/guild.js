var express = require('express')
var router = express.Router()
var https = require('https')

router.get('/:id', function (req, res, next) {
  var guildJson = {}
  var guildId = req.params.id
  var options = {
    hostname: 'api.guildwars2.com',
    path: '/v1/guild_details.json?guild_id=' + guildId,
    method: 'GET'
  }
  https.get(options, function (response) {
    response.on('data', function (data) {
      switch (response.statusCode) {
        case 200:
          guildJson = JSON.parse(data)
          res.json(guildJson)
          break
        default:
          console.log('Error while fetching guilds from API.')
          res.json({error: 'error'})
          break
      };
    })
  })
})

module.exports = router
