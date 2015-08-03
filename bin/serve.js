var path = require('path')
var http = require('http')
var getport = require('getport')
var pump = require('pump')
var multicastdns = require('multicast-dns')
var addr = require('network-address')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('serve.txt')
var debug = require('debug')('dat-serve')

var version = require('../package.json').version

module.exports = {
  name: 'serve',
  command: startDatServer,
  options: [
    {
      name: 'port',
      boolean: false,
      abbr: 'p',
      default: process.env.PORT
    }, {
      name: 'readonly',
      boolean: true,
      abbr: 'r'
    }
  ]
}

function startDatServer (args) {
  if (args.help) return usage()
  if (args.port) return serve(parseInt(args.port, 10))

  try {
    var name = require(path.resolve(args.path, 'package.json')).name + '.dat'
  } catch (err) {
    // do nothing
  }

  getport(6442, function (err, port) {
    if (err) abort(err, args)
    return serve(port)
  })

  function serve (port) {
    var mdns = multicastdns()

    mdns.on('error', function () {
      // ignore errors
    })

    mdns.on('query', function (query) {
      var qs = query.questions
      for (var i = 0; i < qs.length; i++) {
        if (qs[i].name.replace('.local', '') !== name) continue
        if (qs[i].type !== 'A' && qs[i].type !== 'AAAA') continue

        mdns.respond({
          answers: [{
            name: qs[i].name,
            type: 'A',
            ttl: 300,
            data: addr.ipv4()
          }],
          additionals: [{
            name: qs[i].name,
            type: 'AAAA',
            ttl: 300,
            data: addr.ipv6()
          }]
        })
        return
      }
    })

    openDat(args, function (err, db) {
      if (err) abort(err, args)
      if (!port) abort(new Error('Invalid port: ' + port), args)

      console.error('Listening on port ' + port + (args.readonly ? ' (readonly)' : ''))
      var server = http.createServer(function (req, res) {
        debug(req.method, req.url, req.connection.remoteAddress)

        if (req.method === 'GET') {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({dat: true, version: version}))
          return
        }

        if (req.method === 'POST') {
          var replicate = args.readonly ? db.push() : db.replicate()

          var start = Date.now()
          replicate.on('finish', function () {
            debug('replication finished in', (Date.now() - start) + 'ms')
          })

          pump(req, replicate, res)
          return
        }

        // if not GET or POST
        res.statusCode = 405
        res.end()
      })
      server.listen(port)
    })
  }
}
