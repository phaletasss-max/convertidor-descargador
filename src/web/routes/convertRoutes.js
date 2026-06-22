const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileConverter = require('../../converters/fileConverter');

const converter = new FileConverter();

// Configurar multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '../../temp/uploads');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});

function log(level, msg, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [CONVERT_ROUTES][${level.toUpperCase()}]`;
    if (data) {
        console.log(`${prefix} ${msg}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
        console.log(`${prefix} ${msg}`);
    }
}

// ============================================
// CONVERSIONES DISPONIBLES
// ============================================
const CONVERSIONES = {
    'pdf-to-word': { name: 'PDF a Word', input: ['pdf'], output: 'docx', handler: 'pdfToWord' },
    'word-to-pdf': { name: 'Word a PDF', input: ['doc', 'docx'], output: 'pdf', handler: 'wordToPdf' },
    'jpg-to-png': { name: 'JPG a PNG', input: ['jpg', 'jpeg'], output: 'png', handler: 'jpgToPng' },
    'png-to-jpg': { name: 'PNG a JPG', input: ['png'], output: 'jpg', handler: 'pngToJpg' },
    'webp-to-jpg': { name: 'WebP a JPG', input: ['webp'], output: 'jpg', handler: 'webpToJpg' },
    'jpg-to-webp': { name: 'JPG a WebP', input: ['jpg', 'jpeg'], output: 'webp', handler: 'jpgToWebp' },
    'mp4-to-mp3': { name: 'MP4 a MP3', input: ['mp4'], output: 'mp3', handler: 'mp4ToMp3' },
    'compress-image': { name: 'Comprimir Imagen', input: ['jpg', 'jpeg', 'png', 'webp'], output: 'zip', handler: 'compressImage' }
};

// GET /api/converter/list
router.get('/list', (req, res) => {
    res.json({
        success: true,
        conversiones: Object.entries(CONVERSIONES).map(([key, val]) => ({
            id: key,
            name: val.name,
            input: val.input,
            output: val.output
        }))
    });
});

// POST /api/converter/:tipo
router.post('/:tipo', upload.single('archivo'), async (req, res) => {
    const tipo = req.params.tipo;
    const config = CONVERSIONES[tipo];
    
    log('REQUEST', `Conversion: ${tipo}`);
    
    if (!config) {
        return res.status(400).json({ success: false, error: 'Tipo no soportado' });
    }
    
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Archivo requerido' });
    }

    const inputPath = req.file.path;
    const originalName = req.file.originalname;
    const inputExt = path.extname(originalName).toLowerCase().slice(1);
    
    log('REQUEST', `Archivo: ${originalName}`);

    if (!config.input.includes(inputExt)) {
        fs.unlinkSync(inputPath);
        return res.status(400).json({ 
            success: false, 
            error: `Extension .${inputExt} no valida. Use: ${config.input.join(', ')}` 
        });
    }

    try {
        const handler = converter[config.handler];
        const result = await handler(inputPath);
        
        res.download(result.path, result.filename, (err) => {
            if (err) log('ERROR', `Error enviando: ${err.message}`);
            setTimeout(() => {
                result.cleanup();
                fs.unlinkSync(inputPath);
            }, 5000);
        });

    } catch (error) {
        log('ERROR', `Fallo: ${error.message}`);
        fs.unlinkSync(inputPath);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
