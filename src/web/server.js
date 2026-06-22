const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');
const downloadRoutes = require('./routes/downloadRoutes');
const convertRoutes = require('./routes/convertRoutes');

const app = express();

// ============================================
// LOGGER ULTRA DETALLADO
// ============================================
function log(level, msg, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (data) {
        console.log(`${prefix} ${msg}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
        console.log(`${prefix} ${msg}`);
    }
}

// Log cada peticion que entra
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    log('REQUEST', `${req.method} ${req.url} | IP: ${ip}`);
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estaticos
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/descargas', express.static(config.downloadsPath));

// Rutas API
app.use('/api', downloadRoutes);
app.use('/api/converter', convertRoutes);

// Ruta principal
app.get('/', (req, res) => {
    log('ROUTE', 'Sirviendo index.html');
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Health check mejorado
app.get('/health', (req, res) => {
    const downloadsExists = fs.existsSync(config.downloadsPath);
    const downloadsWritable = (() => {
        try { fs.accessSync(config.downloadsPath, fs.constants.W_OK); return true; } catch { return false; }
    })();
    
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        downloads: {
            path: config.downloadsPath,
            exists: downloadsExists,
            writable: downloadsWritable
        }
    };
    log('HEALTH', 'Check solicitado', health);
    res.json(health);
});

// Verificar yt-dlp al inicio
app.get('/api/system-check', (req, res) => {
    const { spawn } = require('child_process');
    const check = spawn('yt-dlp', ['--version']);
    let version = '';
    let error = '';
    
    check.stdout.on('data', d => version += d);
    check.stderr.on('data', d => error += d);
    
    check.on('close', code => {
        const result = {
            yt_dlp_installed: code === 0,
            version: version.trim(),
            error: error.trim() || null,
            node_version: process.version,
            platform: process.platform,
            arch: process.arch
        };
        log('SYSTEM', 'Verificacion de sistema', result);
        res.json(result);
    });
});

// 404
app.use((req, res) => {
    log('404', `Ruta no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
    log('ERROR', `Excepcion no controlada: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = config.port;
const server = app.listen(PORT, '0.0.0.0', () => {
    const address = server.address();
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let ipRed = 'NO_DETECTADA';
    
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ipRed = iface.address;
                break;
            }
        }
    }
    
    console.log('');
    console.log('=================================');
    console.log('     BOT ERP + DOWNLOADER v1.0     ');
    console.log('=================================');
    console.log(`  Red:      http://${ipRed}:${PORT}`);
    console.log(`  Local:    http://localhost:${PORT}`);
    console.log(`  Descargas: ${config.downloadsPath}`);
    console.log('  Endpoints:');
    console.log('     GET  /health          -> Estado del sistema');
    console.log('     GET  /api/system-check-> Verifica yt-dlp');
    console.log('     POST /api/descargar   -> Descargar video/audio');
    console.log('     POST /api/info        -> Info del video');
    console.log('     POST /api/chat        -> Chatbot ERP');
    console.log('=================================');
    console.log('');
    
    log('STARTUP', `Servidor iniciado en puerto ${PORT}`);
    log('STARTUP', `Carpeta de descargas: ${config.downloadsPath}`);
    log('STARTUP', `Carpeta existe? ${fs.existsSync(config.downloadsPath)}`);
    log('STARTUP', `Carpeta escribible? ${(() => { try { fs.accessSync(config.downloadsPath, fs.constants.W_OK); return 'SI'; } catch { return 'NO'; } })()}`);
});

module.exports = app;
