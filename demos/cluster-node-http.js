const http = require('http')
const cluster = require('cluster')
const numCPUs = require('os').cpus().length

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`)
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`)
  })
} else {
  const server = http.createServer()
  server.on('request', (req, res) => {
    setImmediate(() => {
      res.end('Hello World!')
    })
  })

  server.listen(3000, () => {
    console.log('Server listening on http://0.0.0.0:3000')
  })
}
