const { router, server } = require('0http')({
  server: require('../src/server')({
    cert_file_name: './demos/test.crt',
    key_file_name: './demos/test.key',
    passphrase: 'test'
  })
})

router.get('/hi', (req, res) => {
  res.end('GET /hi')
})

server.listen(3000, () => {})
