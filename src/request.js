const { Readable } = require('stream')
const { forEach } = require('./utils/object')
const CLOSE_EVENT = 'close'
let closeHandler = ()=>{}

class HttpRequest extends Readable {
  constructor (uRequest, uResponse) {
    super()

    const oldThisOn = this.on.bind(this)
    const oldThisOnce = this.once.bind(this)

    this.once = function (eventName, listener) {
      return oldThisOnce(eventName, listener)
    }

    this.on = function (eventName, listener) {
      if (eventName === CLOSE_EVENT) {
        closeHandler = listener
        return
      }
      return oldThisOn(eventName, listener)
    }

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

    uResponse.onAborted(() => {
      closeHandler()
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

module.exports = HttpRequest
