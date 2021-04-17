'use strict'

/* global describe, it */
const request = require('supertest')
const { createReadStream, readFileSync } = require('fs')
const path = require('path')
const stream = require('stream')

const fastify = require('fastify')

describe('Fastify - Low HTTP Server Integration', () => {
  const baseUrl = 'http://localhost:' + process.env.PORT
  const server = require('../src/server')()
  const serverFactory = (handler, opts) => {
    server.on('request', handler)
    return server
  }
  const app = fastify({
    serverFactory,
    //logger: true
  })

  app.get('/hi', (req, reply) => {
    reply.headers({
      'x-foo': 'bar',
      'x-foo-2': 'bar',
      'content-length': 18
    }).send(reply.getHeaders())
  })

  it('should start service', (done) => {
    app.listen(parseInt(process.env.PORT), '0.0.0.0', (sock) => {
      if (sock) done()
    })
  })

  it('should GET 200 and string content on /hi', (done) => {
    request(baseUrl)
      .get('/hi')
      .expect(200)
      .expect('content-length', '51')
      .expect('x-foo', 'bar')
      .expect('{"x-foo":"bar","x-foo-2":"bar","content-length":18}', done)
  })

  it('should successfully terminate the service', async () => {
    await app.close()
  })
})
