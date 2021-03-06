var fs = require('fs')
var path = require('path')
var abort = require('./abort.js')

var CONFIG_FILE = 'package.json'

module.exports = function (dir) {
  if (!dir) dir = process.cwd()
  var configPath = path.join(dir, CONFIG_FILE)
  var config

  if (fs.existsSync(configPath)) {
    try {
      var contents = fs.readFileSync(configPath)
      config = JSON.parse(contents)
    } catch (err) {
      console.error('Your package.json file is malformed.')
      abort(err)
    }
  } else {
    config = {}
  }

  if (typeof config.dat === 'undefined') config.dat = {}

  return config
}
