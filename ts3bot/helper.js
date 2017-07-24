const helper = exports

// Function to move idle client from cleanChannel(lobby) to config.afkChannel(AFK-Channel).
helper.dateAndTime = function () {
  let now = new Date()
  let yyyy = now.getFullYear()
  let mm = now.getMonth() + 1
  let dd = now.getDate()
  var hours = now.getHours()
  let minutes = now.getMinutes()
  let seconds = now.getSeconds()
  let milliseconds = now.getMilliseconds()
  if (mm < 10) {
    mm = '0' + mm
  }
  if (dd < 10) {
    dd = '0' + dd
  }
  if (hours < 10) {
    hours = '0' + dd
  }
  if (minutes < 10) {
    minutes = '0' + minutes
  }
  if (seconds < 10) {
    seconds = '0' + seconds
  }
  if (milliseconds < 100) {
    milliseconds = '0' + milliseconds
  }
  now = yyyy + mm + dd + '_' + hours + '-' + minutes + '-' + seconds + '-' + milliseconds
  return now
}
