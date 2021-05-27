const multer = require('multer');
const { router, server } = require('0http')({
    server: require('../src/server')()
});

const upload = multer({ 
    storage: multer.diskStorage({
        destination: __dirname,
        filename: (req, file, cb) => cb(null, file.originalname)
    })
});

router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.statusCode = 400;
        res.end('Failed to upload');
    }
    res.end('Success upload ' + req.file.originalname);
})

server.listen(3000, () => { })
