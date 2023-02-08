const { Readable } = require('stream')
const { forEach } = require('./utils/object')
const CLOSE_EVENT = 'close'

class HttpRequest extends Readable {
  constructor (uRequest) {
    super()

    const oldThisOn = this.on.bind(this)
    const oldThisOnce = this.once.bind(this)

    this.closeHandler = []

    this.once = (eventName, listener)=>{
      if (eventName === CLOSE_EVENT) {
        this.closeHandler.push(listener)
        return
      }
      return oldThisOnce(eventName, listener)
    }

    this.on =  (eventName, listener)=>{
      if (eventName === CLOSE_EVENT) {
        this.closeHandler.push(listener)
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
