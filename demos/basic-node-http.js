const http = require('http')

const server = http.createServer()
server.on('request', (req, res) => {
  setImmediate(() => {
    res.end('Hello World!')
  })
})

server.listen(3000, () => {
  console.log('Server listening on http://0.0.0.0:3000')
})
