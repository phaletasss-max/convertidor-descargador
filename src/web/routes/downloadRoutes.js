const express = require('express');
const router = express.Router();
const VideoDownloader = require('../../downloaders/videoDownloader');

const downloader = new VideoDownloader();

function log(level, msg, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ROUTES][${level.toUpperCase()}]`;
    if (data) {
        console.log(`${prefix} ${msg}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
        console.log(`${prefix} ${msg}`);
    }
}

// POST /api/descargar - STREAMING
router.post('/descargar', async (req, res) => {
    log('REQUEST', '/api/descargar', req.body);
    
    try {
        const { url, formato, calidad } = req.body;
        if (!url) return res.status(400).json({ error: 'URL requerida' });

        await downloader.streamDownload(url, formato || 'mp4', calidad || 'best', res);
    } catch (error) {
        log('ERROR', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

// POST /api/info
router.post('/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL requerida' });

        const info = await downloader.getInfo(url);
        res.json({ success: true, data: info });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/calidades - NUEVO: listar calidades disponibles
router.post('/calidades', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL requerida' });

        const qualities = await downloader.getQualities(url);
        res.json({ success: true, calidades: qualities });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/chat - Simple placeholder
router.post('/chat', (req, res) => {
    const { mensaje } = req.body;
    const msg = (mensaje || '').toLowerCase();
    
    let respuesta = 'Hola! Pega un link de YouTube, TikTok, Instagram o Facebook para descargar.';
    if (msg.includes('hola') || msg.includes('ayuda')) {
        respuesta = '👋 Bienvenido! Soporto: YouTube, TikTok, Instagram, Facebook, Twitter/X. Pega el link arriba y selecciona formato.';
    }
    
    res.json({ success: true, respuesta });
});

module.exports = router;
