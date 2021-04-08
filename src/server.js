const uWS = require('uWebSockets.js')
const EventEmitter = require('events')
require('./utils/os-compat-check')
const REQUEST_EVENT = 'request'
const ArrayBufferDecoder = new TextDecoder('utf-8')

const HttpRequest = require('./request')
const HttpResponse = require('./response')

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

    reqWrapper.res = resWrapper
    resWrapper.req = reqWrapper

    reqWrapper.socket = {
      destroy: function () {
        return resWrapper.res.end()
      },
      get remoteAddress () {
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
    constructor () {
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
      const callbackFunction = function (socket) {
        uServer._socket = socket

        if (cb) cb(socket)
      }
      if (host, port, cb) {
        args = [host, port, callbackFunction]
      }
      if (!cb && (!port || typeof port === 'function')) {
        cb = port
        port = host
        args = [port, callbackFunction]
      }
      return uServer.listen(...args)
    }

    listen (host, port, cb) {
      if (typeof host === 'object') {
        const listenOptions = host
        port = listenOptions.port
        cb = listenOptions.cb
        host = listenOptions.host
        return this.start(host, port, socket => {
          uServer._socket = socket

          if (cb) cb(socket)
        })
      }
      if ((!port || typeof port === 'function') && !cb) {
        cb = port
        port = host
        return this.start(port, cb)
      } else {
        return this.start(host, port, cb)
      }
    }

    get uwsApp () {
      return uServer
    }
  }

  const facade = new Facade()

  facade[Symbol('IncomingMessage')] = HttpRequest
  facade[Symbol('ServerResponse')] = HttpResponse

  return facade
}
