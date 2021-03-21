# low-http-server
[![Build Status](https://travis-ci.org/jkyberneees/low-http-server.svg?branch=master)](https://travis-ci.org/jkyberneees/low-http-server)
[![NPM version](https://img.shields.io/npm/v/low-http-server.svg?style=flat)](https://www.npmjs.com/package/low-http-server)  
HTTP server implementation for Node.js based on [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js)!
> Formerly part of the [0http](https://github.com/jkyberneees/0http) project!

## Branch notes

This branch hosts the development of new features & capabilities that could become part of the next major version of `low-http-server`. While the builds in this branch are tested, they change rapidly, with internal structures subject to considerable reworking. This means that this branch is inherently unstable and should NOT be used in production. 

Current goals:

* Ensure more Node.js frameworks can work with `low-http-server`
  * Make `low-http-server` compatible with Fastify (Done, but not thoroughly tested)
  * Make server facade inherit from `EventEmitter`, so that frameworks relying on events (such as Fastify) can use `low-http-server` as a backend (Done)
  * Implement more of Node.js HTTP API surface
    * `http.ServerResponse.hasHeader` (Done)
    * `http.ServerResponse.writableEnded` & `http.ServerResponse.writableFinished` (Very likely)
    * `http.ServerResponse.req` (Dubious)
    * `http.ServerResponse.sendDate` (Dubious)
    * `http.ServerResponse.setTimeout` (Maybe)
    * & others

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

Or with SSL:
```javascript
const server = require('low-http-server')({
  cert_file_name: './demos/test.crt',
  key_file_name: './demos/test.key',
  passphrase: 'test'
})

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

- [low-http-server](demos/basic.js): **106630.22 reqs/s**
- [node http cluster](demos/cluster-node-http.js): 87729.42 reqs/s
- [node http](demos/basic-node-http.js): 65807.49 reqs/s

Take note that low-http-server does not clusterize on anything [besides reasonably recent versions of Linux kernel](https://github.com/uNetworking/uWebSockets.js/issues/214#issuecomment-547589050).

## Known limitations
- Limited compatibility with Node.js standard interface. 

## Integrations
### General notes

Low-http-server has become more compatible with Node.js standard interface, but it is not perfect. Despite certain quirks, low-http-server can often replace the usual node `http` module backend and serve as an underlying server for popular node.js frameworks. There are only three known requirements: 

* The framework doesn't rely on deprecated `Object.setPrototypeOf` to add new properties to the `request` and `response` objects. This is because our `request` and `response` provide similar APIs, but are inherently different in their internals. They cannot be replaced with an essentialy incompatible foreign Prototype. This means that Express is currently incompatible (see [Express `init` middleware](https://github.com/expressjs/express/blob/508936853a6e311099c9985d4c11a4b1b8f6af07/lib/middleware/init.js#L35)).
* The HTTP handler function is **NOT** prioritized using `setImmediate` . Otherwise, low-http-server will work, but perforfmance will suffer tremendously. For example, in Restana you are going to need `prioRequestsProcessing` framework option set to `false`

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



### restana framework

```js
const server = require('low-http-server')({})

const service = require('restana')({
	server: server,
	prioRequestsProcessing: false // without this the performance will suffer
})

server.listen(3000, () => {
	console.log('Server listening on http://0.0.0.0:3000')
})

service.get('/', (req,res) => {
	res.send('It works!')
})
```



### Fastify

**NOTE:** Not tested enough

```js
const server = require('./src/server.js')({})

const serverFactory = (handler, opts) => {
	server.on('request', handler)
	return server
}

const fastify = require("fastify");
const app = fastify({
	serverFactory
});

app.get('/', (req, reply) => {
	reply.send('hello')
})

app.listen(3000, (sock) => { // Note: you cannot do server.listen, as Fastify apparently needs to modify things
	if (sock) console.log('listening')
}) 
```



### Other frameworks

Please refer to their documentation on how to use your own server.