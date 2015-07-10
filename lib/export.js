var pumpify = require('pumpify')
var through = require('through2')
var formatData = require('format-data')
var debug = require('debug')('src/export')

module.exports = function createExportStream (db, opts) {
  var parseOutput = through.obj(function (data, enc, next) {
    debug('exporting through data', data)
    if (opts.full) return next(null, data)
    next(null, data.value)
  })

  var includer
  if (opts.include) {
    var includes = opts.include.split(',')
    includer = through.obj(function (data, enc, next) {
      var ret = {}
      for (var i in includes) {
        var key = includes[i]
        ret[key] = data[key]
      }
      next(null, ret)
    })
  }
  return pumpify(db.createReadStream(opts), parseOutput, includer, formatData(opts.format))
}
