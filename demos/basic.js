const cero = require('./../src/server')

const server = cero({})
server.on('request', (req, res) => {
  res.end('Hello World!')
})

server.listen(3000, () => {
  console.log('Server listening on http://0.0.0.0:3000')
})
