var express = require('express')
var router = express.Router()
var https = require('https')

router.get('/:id', function (req, res, next) {
  var guildId = req.params.id
  var options = {
    hostname: 'api.guildwars2.com',
    path: '/v2/guild/' + guildId,
    method: 'GET'
  }
  // TODO: Chunked data maybe?
  https.get(options, function (response) {
    // console.log('Staus Code:', response.statusCode)
    // console.log('Options:', options)
    var test = ''
    // console.log('http response:', response)
    response.on('data', function (chunk) {
      test += chunk
    })
    response.on('end', function (data) {
      // console.log('end event', test)
      try {
        let parsedData = JSON.parse(test)
        res.json(parsedData)
      } catch (e) {
        console.log('Error while trying to parse guild data.\n', e.message)
      }
    })
    response.on('error', function (error) {
      console.log('error event', error)
    })
  }).on('error', function (error) {
    if (error) console.log('Handling error now!' + error)
  })
})

module.exports = router
