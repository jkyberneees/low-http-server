class HttpResponseSocket {
  constructor(uResponse) {
    this.uResponse = uResponse;
  }
  get remoteAddress() {
    return Buffer.from(this.uResponse.getRemoteAddressAsText()).toString();
  }
  destroy() {
    return this.uResponse.end();
  }
}

module.exports = HttpResponseSocket