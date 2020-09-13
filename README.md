# low-http-server
[![Build Status](https://travis-ci.org/jkyberneees/low-http-server.svg?branch=master)](https://travis-ci.org/jkyberneees/low-http-server)
[![NPM version](https://img.shields.io/npm/v/low-http-server.svg?style=flat)](https://www.npmjs.com/package/low-http-server)  
HTTP server implementation for Node.js based on [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js)!
> Formerly part of the [0http](https://github.com/jkyberneees/0http) project!

## Introduction
`low-http-server` is a Node.js wrapper around the great [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) library. Here, I/O throughput is maximized at the cost of API compatibility, when we compare it to the standard Node.js HTTP server interface.
> As far as for Node.js stands, `uWebSockets.js` brings the best I/O performance in terms of HTTP servers.

```js
const server = require('low-http-server')({})
server.on('request', (req, res) => {
  res.end('Hello World!')
})

server.listen(3000, () => {
  console.log('Server listening on http://0.0.0.0:3000')
})

```

## Benchmarks
> Machine: MacBook Pro (13-inch, 2020), 1,4 GHz Quad-Core Intel Core i5  
> Node.js version: 12.18.3

```bash
wrk -t8 -c40 -d5s http://127.0.0.1:3000
```
- [low-http-server cluster](demos/cluster.js): **108125.84 reqs/s**
- [low-http-server](demos/basic.js): **106630.22 reqs/s**
- [node http cluster](demos/cluster-node-http.js): 87729.42 reqs/s
- [node http](demos/basic-node-http.js): 65807.49 reqs/s

## Known limitations
- Limited compatibility with Node.js standard interface. 

## Integrations
### 0http framework
```js
const low = require('low-http-server')
const cero = require('0http')

const { router, server } = cero({
  server: low()
})

router.get('/hi', (req, res) => {
  res.end('Hello World!')
})

server.listen(3000, (socket) => {
  if (socket) {
    console.log('HTTP server ready!')
  }
})
```