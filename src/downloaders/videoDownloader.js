const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');

function log(level, msg, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [DOWNLOADER][${level.toUpperCase()}]`;
    if (data) {
        console.log(`${prefix} ${msg}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
        console.log(`${prefix} ${msg}`);
    }
}

class VideoDownloader {
    constructor() {
        log('INIT', 'VideoDownloader inicializado');
    }

    validateUrl(url) {
        log('VALIDATE', `Validando URL: ${url}`);
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.replace('www.', '');
            const isValid = config.supportedPlatforms.some(platform => hostname.includes(platform));
            log('VALIDATE', `Hostname: ${hostname} | Valida: ${isValid}`);
            return isValid;
        } catch (err) {
            log('VALIDATE', `URL invalida: ${err.message}`);
            return false;
        }
    }

    // ============================================
    // OBTENER CALIDADES DISPONIBLES (YouTube, FB, IG)
    // ============================================
    async getQualities(url) {
        log('QUALITY', `Obteniendo calidades de: ${url}`);
        
        if (!this.validateUrl(url)) {
            throw new Error('URL no soportada');
        }

        return new Promise((resolve, reject) => {
            const process = spawn('yt-dlp', [
                '--no-playlist',
                '-F',  // Listar formatos disponibles
                url
            ]);
            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Error listando calidades: ${errorOutput}`));
                    return;
                }

                // Parsear formatos
                const lines = output.split('\n');
                const qualities = [];
                const audioFormats = [];
                
                for (const line of lines) {
                    // Formatos de video
                    const videoMatch = line.match(/^(\d+)\s+(\w+)\s+(\d+x\d+|\d+p)?\s+(\d+)?\s*(.*?)\s*(video only|audio only)?/);
                    if (videoMatch && !line.includes('audio only')) {
                        const [, id, ext, res, fps, codec, type] = videoMatch;
                        if (res && ext === 'mp4') {
                            qualities.push({
                                id: id.trim(),
                                resolution: res.trim(),
                                fps: fps ? `${fps}fps` : '',
                                codec: codec.trim(),
                                type: type || 'video+audio'
                            });
                        }
                    }
                }

                // Filtrar duplicados y ordenar
                const unique = [];
                const seen = new Set();
                for (const q of qualities) {
                    const key = q.resolution;
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push(q);
                    }
                }

                // Ordenar de mayor a menor calidad
                unique.sort((a, b) => {
                    const getNum = (s) => parseInt(s.replace(/\D/g, '')) || 0;
                    return getNum(b.resolution) - getNum(a.resolution);
                });

                log('QUALITY', `Calidades encontradas: ${unique.length}`);
                resolve(unique);
            });
        });
    }

    // ============================================
    // STREAMING DIRECTO AL CLIENTE
    // ============================================
    async streamDownload(url, format = 'mp4', quality = 'best', res) {
        log('STREAM', '========== INICIANDO STREAMING ==========');
        log('STREAM', `URL: ${url} | Formato: ${format} | Calidad: ${quality}`);

        if (!this.validateUrl(url)) {
            throw new Error('URL no soportada');
        }

        const info = await this.getInfo(url);
        const safeTitle = (info.titulo || 'video').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const extension = format === 'mp3' ? 'mp3' : 'mp4';
        const filename = `${safeTitle}.${extension}`;

        log('STREAM', `Filename: ${filename}`);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Construir args según formato y calidad
        let args = ['--no-playlist'];
        
        if (format === 'mp3') {
            args = args.concat(['-x', '--audio-format', 'mp3', '--audio-quality', '0']);
        } else {
            // FIX TIKTOK HEVC: Forzar H.264 para compatibilidad
            if (url.includes('tiktok.com')) {
                args = args.concat([
                    '-f', 'best[ext=mp4][vcodec~="^((?!hevc).)*$"]/best[ext=mp4]/best',
                    '--merge-output-format', 'mp4',
                    '--postprocessor-args', 'ffmpeg:-c:v libx264 -preset fast -crf 23'
                ]);
            } else if (quality && quality !== 'best') {
                // Selector de calidad para YouTube/FB/IG
                args = args.concat([
                    '-f', `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`,
                    '--merge-output-format', 'mp4'
                ]);
            } else {
                args = args.concat([
                    '-f', 'best[ext=mp4]/best',
                    '--merge-output-format', 'mp4'
                ]);
            }
        }

        args = args.concat(['-o', '-', url]);

        log('STREAM', `Comando: yt-dlp ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const process = spawn('yt-dlp', args);
            let stderrLogs = '';
            let bytesSent = 0;

            process.stdout.pipe(res);

            process.stdout.on('data', (data) => {
                bytesSent += data.length;
            });

            process.stderr.on('data', (data) => {
                const line = data.toString();
                stderrLogs += line;
                if (line.includes('%') || line.includes('download')) {
                    log('PROGRESS', line.trim());
                }
            });

            process.on('error', (err) => {
                log('ERROR', `Error spawn: ${err.message}`);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'yt-dlp no disponible' });
                }
                reject(err);
            });

            process.on('close', (code) => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                
                if (code !== 0) {
                    log('ERROR', `yt-dlp fallo codigo ${code}`);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Error en descarga' });
                    }
                    reject(new Error(`Codigo ${code}`));
                    return;
                }

                log('SUCCESS', `Streaming completado: ${(bytesSent/1024/1024).toFixed(2)} MB en ${duration}s`);
                resolve({ filename, size: bytesSent, duration: parseFloat(duration), format });
            });

            res.on('close', () => {
                if (!process.killed) {
                    log('STREAM', 'Cliente cerro conexion');
                    process.kill();
                }
            });
        });
    }

    async getInfo(url) {
        log('INFO', `Obteniendo info: ${url}`);
        
        if (!this.validateUrl(url)) throw new Error('URL no soportada');

        return new Promise((resolve, reject) => {
            const process = spawn('yt-dlp', ['--no-playlist', '--dump-json', '--no-download', url]);
            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => { output += data.toString(); });
            process.stderr.on('data', (data) => { errorOutput += data.toString(); });

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Error: ${errorOutput}`));
                    return;
                }

                try {
                    const info = JSON.parse(output);
                    const duracionMin = (info.duration || 0) / 60;
                    const pesoMB = info.filesize_approx 
                        ? (info.filesize_approx / 1024 / 1024).toFixed(1)
                        : (duracionMin * 5).toFixed(1);
                    
                    resolve({
                        titulo: info.title,
                        autor: info.uploader,
                        duracion: info.duration,
                        thumbnail: info.thumbnail,
                        plataforma: info.extractor,
                        pesoEstimadoMB: pesoMB,
                        esLive: info.is_live || false,
                        url: url
                    });
                } catch (err) {
                    reject(new Error('Error parseando info'));
                }
            });
        });
    }
}

module.exports = VideoDownloader;
