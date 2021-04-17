const server = require('./src/server.js')({})

const serverFactory = (handler, opts) => {
  server.on('request', handler)
  return server
}

const fastify = require('fastify')
const app = fastify({
  serverFactory,
  logger: true
})

app.get('/404', (req, reply) => {
  reply.callNotFound()
})

app.get('/hi', (req, reply) => {
  return reply.send('hi')
})

 app.listen(3000, '0.0.0.0', (sock) => {
	if (sock) console.log('listening')
 })
