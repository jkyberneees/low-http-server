const { Writable } = require('stream')
const { toString, toLowerCase } = require('./utils/string')
const { forEach } = require('./utils/object')

function writeAllHeaders (res) {
  res.res.writeHeader('Date', res.server._date)

  forEach(res.__headers, ([name, value]) => {
    if (name.toLowerCase() !== 'content-length') res.res.writeHeader(name, value) // 'if' is needed to solve some issues with Content-Length being written twice by some frameworks
  })

  res.headersSent = true
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

    this.on('pipe', (_) => {
      if (this.finished) return

      this.__isWritable = true
      writeAllHeaders(this)
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
    forEach(headers, (value, name) => {
      this.setHeader(name, value)
    })
  }

  end (data) {
    if (this.finished) return

    function doWrite (res) {
      res.res.writeStatus(`${res.statusCode} ${res.statusMessage}`)

      if (!res.__isWritable) {
        writeAllHeaders(res)
      }

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
