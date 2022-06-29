const cero = require('./../src/server')

const server = cero({})
server.on('request', (req, res) => {
  res.write('Hello World!')
  res.end()
})

server.listen(3000, () => {
  console.log('Server listening on http://0.0.0.0:3000')
})
