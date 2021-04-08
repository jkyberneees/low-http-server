const uWS = require('uWebSockets.js')
const { Writable, Readable } = require('stream')
const { toString, toLowerCase } = require('./utils/string')
const { forEach } = require('./utils/object')
const EventEmitter = require('events')
require('./utils/os-compat-check')
const REQUEST_EVENT = 'request'
const ArrayBufferDecoder = new TextDecoder("utf-8");

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
      },
      get remoteAddress() { 
        /* 
          required by fastify and other frameworks to get client IP. 
          Returns either IPv4 or IPv6
        */
        let remote = resWrapper.res.getRemoteAddressAsText()
        remote = ArrayBufferDecoder.decode(remote)
        return remote
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


  class Facade extends EventEmitter {
    constructor() {
      super()

      const oldThisOn = this.on.bind(this)
      const oldThisOnce = this.once.bind(this)

      this.once = function (eventName, listener) {
        return oldThisOnce(eventName, listener)    
      }

      this.on = function (eventName, listener) {
        if (eventName === REQUEST_EVENT) {
          handler = listener
          return
        }
        return oldThisOn(eventName, listener)    
      }
    }
    close (cb) {
      clearInterval(timer)
      uWS.us_listen_socket_close(uServer._socket)
      if (!cb) return
      return cb()
    }
    start (host, port, cb) {
      let args
      const callbackFunction = function(socket) {
        uServer._socket = socket
  
        if (cb) cb(socket)
      }
      if (host, port, cb) {
        args = [host,port,callbackFunction]
      }
      if (!cb && (!port || typeof port === 'function')) {
        cb = port;
        port = host;
        args = [port,callbackFunction]
      }
      return uServer.listen(...args)
    }
    listen (host, port, cb) {
      if (typeof host === 'object') {
        const listenOptions = host;
        port = listenOptions.port
        cb = listenOptions.cb
        host = listenOptions.host
        return this.start(host, port, socket => {
          uServer._socket = socket
    
          if (cb) cb(socket)
        })
      }
      if ((!port || typeof port === 'function') && !cb) {
        cb = port;
        port = host;
        return this.start(port, cb)
      }
      else {
        return this.start(host, port, cb)
      }
      
    }
    get uwsApp() {
      return uServer
    }
    
  }

  const facade = new Facade()

  facade[Symbol('IncomingMessage')] = HttpRequest
  facade[Symbol('ServerResponse')] = HttpResponse

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
    this.socket = {}

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
    if (name.toLowerCase() !== 'content-length') this.res.writeHeader(name, value) // 'if' isneeded to solve some issues with Content-Length being written twice by some frameworks
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
    const filterRegEx = new RegExp(`^${name},`, 'i')
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

  hasHeader(name) {
    return this.__headers[toLowerCase(name)] ? true : false
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

  end (data) {
    if (this.finished) return

    function doWrite(res) {
      res.res.writeStatus(`${res.statusCode} ${res.statusMessage}`)

      if (!res.__isWritable) {
       writeAllHeaders.call(res)
      }

      res.finished = true
      res.res.end(data)
    }

    if (!data) {
      data = ''
      return doWrite(this)
    }
    if (typeof data !== 'string' && !Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
      // this is needed to check that we only send strings, buffers or Typed Arrays into uWebSockets.js. Otherwise, the HTTP request will just hang.
      if (process.env.NODE_ENV !== 'production') {
        data = 'Body has to be RecognizedString. Please see: https://unetworking.github.io/uWebSockets.js/generated/index.html#recognizedstring'
      } else {
        data = ''
      }
      this.statusCode = 500
      this.statusMessage = 'Internal Server Error'
      return doWrite(this)
    }
    return doWrite(this)
    
  }

  getRaw () {
    return this.res
  }
}
