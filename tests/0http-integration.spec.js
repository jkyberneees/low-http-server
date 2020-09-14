/* global describe, it */
const expect = require('chai').expect
const request = require('supertest')
const { createReadStream } = require('fs')
const jsonParser = require('body-parser').json

describe('0http Web Framework - Low HTTP Server Integration', () => {
  const baseUrl = 'http://localhost:' + process.env.PORT

  const { router, server } = require('0http')({
    server: require('../src/server')()
  })

  it('should successfully register service routes', (done) => {
    router.use((req, res, next) => next())
    router.use('/', (req, res, next) => next())

    router.get('/pets/:id', function (req, res) {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({
        name: 'Happy Cat'
      }))
    })

    router.get('/middlewares/:name', (req, res, next) => {
      req.params.name = req.params.name.toUpperCase()
      next()
    }, (req, res, next) => {
      res.end(req.params.name)
      next()
    })

    router.post('/echo2', (req, res) => {
      const stringified = JSON.stringify(req.body)
      res.end(stringified)
    })

    router.use(jsonParser())

    router.post('/echo', (req, res) => {
      const stringified = JSON.stringify(req.body)
      res.end(stringified)
    })

    router.get('/qs', (req, res) => {
      res.end(JSON.stringify(req.query))
    })

    router.use('/headers', (req, res, next) => {
      res.setHeader('x-header', '1')
      next()
    })

    router.get('/headers', (req, res) => {
      res.end(JSON.stringify(res.getHeaders()))
    })

    router.get('/pipe', (req, res) => {
      res.setHeader('Content-Type', 'text/js')
      const readStream = createReadStream(__filename)

      readStream.pipe(res)
    })

    router.get('/remove-header', (req, res) => {
      res.setHeader('X-Header-Upper', 'test')
      res.removeHeader('x-header-upper')
      res.end(JSON.stringify(res.getHeaders()))
    })

    router.get('/redirect', (req, res) => {
      res.writeHead(301,
        { Location: '/redirect2' }
      )
      res.end()
    })

    router.get('/querystring', (req, res) => {
      res.end(JSON.stringify(req.query))
    })

    router.all('/sheet.css', (req, res) => res.end())

    const nested = require('0http/lib/router/sequential')()
    nested.get('/info', (req, res, next) => {
      req.stepUrl = req.url
      next()
    })
    router.use('/nested', nested)
    router.get('/nested/*', (req, res, next) => {
      res.end(`${req.stepUrl} - ${req.url}`)
    })

    server.start(~~process.env.PORT, serverSocket => {
      if (serverSocket) {
        done()
      }
    })
  })

  it('should 404 if route handler does not exist', async () => {
    await request(baseUrl)
      .get('/404')
      .expect(404)
  })

  it('should GET JSON response /pets/:id', async () => {
    await request(baseUrl)
      .get('/pets/0?var=value')
      .expect(200)
      .then((response) => {
        expect(response.body.name).to.equal('Happy Cat')
      })
  })

  it('should GET plain/text response /middlewares/:name - (route middlewares)', async () => {
    await request(baseUrl)
      .get('/middlewares/rolando')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal('ROLANDO')
      })
  })

  it('should parse request data on POST /echo', async () => {
    await request(baseUrl)
      .post('/echo')
      .send({ name: 'john' })
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({ name: 'john' }))
      })
  })

  it('should NOT parse request data on POST /echo2', async () => {
    await request(baseUrl)
      .post('/echo2')
      .send({ name: 'john' })
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({}))
      })
  })

  it('should retrieve headers', async () => {
    await request(baseUrl)
      .get('/headers')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({ 'x-header': '1' }))
      })
  })

  it('should parse querystring', async () => {
    await request(baseUrl)
      .get('/qs?name=0http&dep[]=a&dep[]=b')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({ name: '0http', dep: ['a', 'b'] }))
      })
  })

  it('should retrieve file using pipe', async () => {
    await request(baseUrl)
      .get('/pipe')
      .expect(200)
      .then((response) => {
        expect(response.headers['content-type']).to.equal('text/js')
        expect(response.text.indexOf('should retrieve file using pipe') > 0).to.equal(true)
      })
  })

  it('should remove header', async () => {
    await request(baseUrl)
      .get('/remove-header')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal('{}')
      })
  })

  it('should retrieve redirect', async () => {
    await request(baseUrl)
      .get('/redirect')
      .expect(301)
      .expect('Location', '/redirect2')
  })

  it('should not retrieve querystring', async () => {
    await request(baseUrl)
      .get('/querystring')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal('{}')
      })
  })

  it('should retrieve querystring', async () => {
    await request(baseUrl)
      .get('/querystring?id=1')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({ id: '1' }))
      })
  })

  it('should retrieve querystring array', async () => {
    await request(baseUrl)
      .get('/querystring?id[]=1&id[]=2&name=a&name=b&tag=hello')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({
          id: ['1', '2'],
          name: ['a', 'b'],
          tag: 'hello'
        }))
      })
  })

  it('should receive 200 on /sheet.css using .all registration', async () => {
    await request(baseUrl)
      .get('/sheet.css')
      .expect(200)
    await request(baseUrl)
      .post('/sheet.css')
      .expect(200)
    await request(baseUrl)
      .put('/sheet.css')
      .expect(200)
  })

  it('should hit GET /nested/info on nested router', async () => {
    await request(baseUrl)
      .get('/nested/info')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal('/info - /nested/info')
      })
  })

  it('should successfully terminate the service', async () => {
    server.close()
  })
})
