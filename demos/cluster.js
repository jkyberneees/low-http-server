/* eslint no-new: 0 */

const cero = require('../src/server')
const { Worker, isMainThread, threadId } = require('worker_threads')
const numCPUs = require('os').cpus().length

if (isMainThread) {
  console.log(`Master ${process.pid} is running`)
  for (let i = 0; i < numCPUs; i++) {
    new Worker(__filename)
  }
} else {
  const server = cero({})
  server.on('request', (req, res) => {
    res.end('Hello World!')
  })

  server.listen(3000, () => {
    console.log(`Server(${threadId}) listening on http://0.0.0.0:3000`)
  })
}
