const uWS = require('uWebSockets.js')
const { Writable, Readable } = require('stream')
const { toString, toLowerCase } = require('./utils/string')
const { forEach } = require('./utils/object')
require('./utils/os-compat-check')
const REQUEST_EVENT = 'request'

module.exports = (config = {}) => {
  let appType = 'App'

  if (config.cert_file_name && config.key_file_name) {
    appType = 'SSLApp'
  }

  let handler = (req, res) => {
    res.statusCode = 404
    res.statusMessage = 'Not Found'

    res.end()
  }

  const uServer = uWS[appType](config).any('/*', (res, req) => {
    res.finished = false

    const reqWrapper = new HttpRequest(req)
    const resWrapper = new HttpResponse(res, uServer)

    reqWrapper.socket = {
      destroy: function () {
        return resWrapper.res.end()
      }
    } // needed for some middleware not to panic

    const method = reqWrapper.method
    if (method !== 'HEAD') { // 0http's low checks also that method !== 'GET', but many users would send request body with GET, unfortunately
      res.onData((bytes, isLast) => {
        const chunk = Buffer.from(bytes)
        if (isLast) {
          reqWrapper.push(chunk)
          reqWrapper.push(null)
          if (!res.finished) {
            return handler(reqWrapper, resWrapper)
          }
          return
        }

        return reqWrapper.push(chunk)
      })
    } else if (!res.finished) {
      handler(reqWrapper, resWrapper)
    }
  })

  uServer._date = new Date().toUTCString()
  const timer = setInterval(() => (uServer._date = new Date().toUTCString()), 1000)

  const facade = {
    on (event, cb) {
      if (event !== REQUEST_EVENT) throw new Error(`Given "${event}" event is not supported!`)

      handler = cb
    },

    close (cb) {
      clearInterval(timer)
      uWS.us_listen_socket_close(uServer._socket)
      if (!cb) return
      return cb()
    }
  }
  facade.listen = facade.start = (port, cb) => {
    uServer.listen(port, socket => {
      uServer._socket = socket

      if (cb) cb(socket)
    })
  }

  facade.uwsApp = uServer

  return facade
}

class HttpRequest extends Readable {
  constructor (uRequest) {
    super()

    const q = uRequest.getQuery()
    this.req = uRequest
    this.url = uRequest.getUrl() + (q ? '?' + q : '')
    this.method = uRequest.getMethod().toUpperCase()
    this.statusCode = null
    this.statusMessage = null
    this.body = {}
    this.headers = {}

    uRequest.forEach((header, value) => {
      this.headers[header] = value
    })
  }

  getRawHeaders () {
    const raw = []
    forEach(this.headers, (header, value) => {
      raw.push(header, value)
    })
    return raw
  }

  getRaw () {
    return this.req
  }

  _read (size) {
    return this.slice(0, size)
  }
}

function writeAllHeaders () {
  this.res.writeHeader('Date', this.server._date)

  forEach(this.__headers, ([name, value]) => {
    this.res.writeHeader(name, value)
  })

  this.headersSent = true
}

class HttpResponse extends Writable {
  constructor (uResponse, uServer) {
    super()

    this.res = uResponse
    this.server = uServer

    this.statusCode = 200
    this.statusMessage = 'OK'

    this.__headers = {}
    this.headersSent = false

    this.res.onAborted(() => {
      this.finished = this.res.finished = true
    })

    this.on('pipe', _ => {
      if (this.finished) return

      this.__isWritable = true
      writeAllHeaders.call(this)
    })
  }

  setHeader (name, value) {
    const filterRegEx = new RegExp(`^${name},`, "i")
    let toSet = toString(value)
    toSet = toSet.replace(filterRegEx, '')
    this.__headers[toLowerCase(name)] = [name, toSet]
  }

  getHeaderNames () {
    return Object.keys(this.__headers)
  }

  getHeaders () {
    const headers = {}
    forEach(this.__headers, ([, value], name) => {
      headers[name] = value
    })
    return headers
  }

  getHeader (name) {
    return this.__headers[toLowerCase(name)]
  }

  removeHeader (name) {
    delete this.__headers[toLowerCase(name)]
  }

  write (data) {
    if (this.finished) return

    this.res.write(data)
  }

  writeHead (statusCode) {
    if (this.finished) return

    this.statusCode = statusCode
    let headers
    if (arguments.length === 2) {
      headers = arguments[1]
    } else if (arguments.length === 3) {
      this.statusMessage = arguments[1]
      headers = arguments[2]
    } else {
      headers = {}
    }
    forEach(headers, (value, name) => {
      this.setHeader(name, value)
    })
  }

  end (data = '') {
    if (this.finished) return

    if (typeof data !== 'string' && !Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
      // this is needed to check that we only send strings, buffers or Typed Arrays into uWebSockets.js. Otherwise, the HTTP request will just hang.
      if (process.env.NODE_ENV !== 'production') {
        data = 'Body has to be RecognizedString. Please see: https://unetworking.github.io/uWebSockets.js/generated/index.html#recognizedstring'
      } else {
        data = ''
      }
      this.statusCode = 500
      this.statusMessage = 'Internal Server Error'
    }

    this.res.writeStatus(`${this.statusCode} ${this.statusMessage}`)

    if (!this.__isWritable) {
      writeAllHeaders.call(this)
    }

    this.finished = true
    this.res.end(data)
  }

  getRaw () {
    return this.res
  }
}
