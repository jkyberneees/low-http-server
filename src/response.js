const { Writable } = require('stream')
const { toLowerCase } = require('./utils/string')
const HttpResponseSocket = require('./responseSocket')

class HttpResponse extends Writable {
  constructor (uResponse, uServer) {
    super()

    this.res = uResponse
    this.server = uServer

    this.statusCode = 200
    this.statusMessage = 'OK'

    this.__headers = {}
    this.headersSent = false

    this.socket = new HttpResponseSocket(uResponse)

    this.res.onAborted(() => {
      this.finished = this.res.finished = true
    })

    this.on('pipe', (_) => {
      if (this.finished) return
      this.writeAllHeaders()
    })
  }

  writeAllHeaders () {
    if (this.headersSent) return

    this.res.writeHeader('Date', this.server._date)

    Object.keys(this.__headers).forEach(key => {
      if (key.toLowerCase() === 'content-length') return
      return this.res.writeHeader(key, this.__headers[key])
    })

    this.headersSent = true
  }

  setHeader (name, value) {
    this.__headers[toLowerCase(name)] = value
  }

  getHeaderNames () {
    return Object.keys(this.__headers)
  }

  getHeaders () {
    // returns shallow copy
    return Object.assign({}, this.__headers)
  }

  getHeader (name) {
    return this.__headers[toLowerCase(name)]
  }

  hasHeader (name) {
    return !!this.__headers[toLowerCase(name)]
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
    Object.keys(headers).forEach(key => {
      this.setHeader(key, headers[key])
    })
  }

  end (data) {
    if (this.finished) return

    function doWrite (res) {
      res.res.writeStatus(`${res.statusCode} ${res.statusMessage}`)

      res.writeAllHeaders()

      res.finished = true
      res.res.end(data)
    }

    if (!data) {
      data = ''
      return doWrite(this)
    }
    if (
      typeof data !== 'string' &&
      !Buffer.isBuffer(data) &&
      !ArrayBuffer.isView(data)
    ) {
      // this is needed to check that we only send strings, buffers or Typed Arrays into uWebSockets.js. Otherwise, the HTTP request will just hang.
      if (process.env.NODE_ENV !== 'production') {
        data =
          'Body has to be RecognizedString. Please see: https://unetworking.github.io/uWebSockets.js/generated/index.html#recognizedstring'
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

module.exports = HttpResponse
