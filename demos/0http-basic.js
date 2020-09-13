const { router, server } = require('0http')({
  server: require('../src/server')()
})

router.get('/hi', (req, res) => {
  res.end('GET /hi')
})

server.listen(3000, () => {})
