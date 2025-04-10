const express = require('express');
const multer = require('multer');
const path = require('path');
const { importCSV, addLote } = require('./controllers/boletosController');
const { splitPdf, showPdfList } = require('./controllers/pdfController');


const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../uploads') });


router.post('/importarPdf', upload.single('file'), splitPdf);


router.post('/importarCsv', upload.single('file'), importCSV);


router.post('/Addlote', upload.single('file'), addLote);

router.get('/boletos', showPdfList);

module.exports = router;
