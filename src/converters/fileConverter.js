const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function log(level, msg, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [CONVERTER][${level.toUpperCase()}]`;
    if (data) {
        console.log(`${prefix} ${msg}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
        console.log(`${prefix} ${msg}`);
    }
}

class FileConverter {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        this.ensureTempDir();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
            log('INIT', `Carpeta temp creada: ${this.tempDir}`);
        }
    }

    // ============================================
    // CONVERSIONES SOPORTADAS
    // ============================================
    
    // 1. PDF a Word (docx)
    async pdfToWord(inputPath) {
        return this.libreofficeConvert(inputPath, 'docx', 'writer_pdf_Export');
    }

    // 2. Word a PDF
    async wordToPdf(inputPath) {
        return this.libreofficeConvert(inputPath, 'pdf', 'writer_pdf_Export');
    }

    // 3. JPG a PNG
    async jpgToPng(inputPath) {
        return this.imageConvert(inputPath, 'png');
    }

    // 4. PNG a JPG
    async pngToJpg(inputPath) {
        return this.imageConvert(inputPath, 'jpg');
    }

    // 5. WebP a JPG
    async webpToJpg(inputPath) {
        return this.imageConvert(inputPath, 'jpg');
    }

    // 6. JPG a WebP
    async jpgToWebp(inputPath) {
        return this.imageConvert(inputPath, 'webp');
    }

    // 7. MP4 a MP3 (extraer audio)
    async mp4ToMp3(inputPath) {
        return this.ffmpegConvert(inputPath, 'mp3', ['-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k']);
    }

    // 8. Comprimir imagen
    async compressImage(inputPath, quality = 85) {
        return this.imageConvert(inputPath, path.extname(inputPath).slice(1), `-quality ${quality}`);
    }

    // ============================================
    // MOTORES DE CONVERSION
    // ============================================

    // LibreOffice (PDF <-> Word)
    async libreofficeConvert(inputPath, outputExt, filter) {
        const id = uuidv4();
        const outputDir = path.join(this.tempDir, id);
        fs.mkdirSync(outputDir, { recursive: true });

        const args = [
            '--headless',
            '--convert-to', outputExt,
            '--outdir', outputDir,
            inputPath
        ];

        log('LIBREOFFICE', `Convirtiendo: ${path.basename(inputPath)} -> ${outputExt}`);
        log('LIBREOFFICE', `Comando: soffice ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const process = spawn('soffice', args);
            let stderr = '';

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    log('ERROR', `LibreOffice fallo: ${stderr}`);
                    reject(new Error('Error en conversion LibreOffice'));
                    return;
                }

                // Buscar archivo output
                const files = fs.readdirSync(outputDir);
                const outputFile = files.find(f => f.endsWith(`.${outputExt}`));
                
                if (!outputFile) {
                    reject(new Error('Archivo de salida no encontrado'));
                    return;
                }

                const outputPath = path.join(outputDir, outputFile);
                log('SUCCESS', `Conversion exitosa: ${outputFile}`);
                
                resolve({
                    path: outputPath,
                    filename: outputFile,
                    cleanup: () => this.cleanup(outputDir)
                });
            });
        });
    }

    // ImageMagick (imagenes)
    async imageConvert(inputPath, outputExt, extraArgs = '') {
        const id = uuidv4();
        const outputFilename = `${id}.${outputExt}`;
        const outputPath = path.join(this.tempDir, outputFilename);

        const args = [inputPath];
        if (extraArgs) args.push(...extraArgs.split(' '));
        args.push(outputPath);

        log('IMAGEMAGICK', `Convirtiendo: ${path.basename(inputPath)} -> ${outputExt}`);
        log('IMAGEMAGICK', `Comando: convert ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const process = spawn('convert', args);
            let stderr = '';

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    log('ERROR', `ImageMagick fallo: ${stderr}`);
                    reject(new Error('Error en conversion de imagen'));
                    return;
                }

                log('SUCCESS', `Conversion exitosa: ${outputFilename}`);
                
                resolve({
                    path: outputPath,
                    filename: outputFilename,
                    cleanup: () => this.cleanup(outputPath)
                });
            });
        });
    }

    // FFmpeg (video/audio)
    async ffmpegConvert(inputPath, outputExt, extraArgs = []) {
        const id = uuidv4();
        const outputFilename = `${id}.${outputExt}`;
        const outputPath = path.join(this.tempDir, outputFilename);

        const args = ['-i', inputPath, ...extraArgs, '-y', outputPath];

        log('FFMPEG', `Convirtiendo: ${path.basename(inputPath)} -> ${outputExt}`);
        log('FFMPEG', `Comando: ffmpeg ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const process = spawn('ffmpeg', args);
            let stderr = '';

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    log('ERROR', `FFmpeg fallo: ${stderr.substring(0, 500)}`);
                    reject(new Error('Error en conversion FFmpeg'));
                    return;
                }

                log('SUCCESS', `Conversion exitosa: ${outputFilename}`);
                
                resolve({
                    path: outputPath,
                    filename: outputFilename,
                    cleanup: () => this.cleanup(outputPath)
                });
            });
        });
    }

    // ============================================
    // LIMPIEZA
    // ============================================
    cleanup(target) {
        try {
            if (fs.existsSync(target)) {
                const stats = fs.statSync(target);
                if (stats.isDirectory()) {
                    fs.rmSync(target, { recursive: true });
                } else {
                    fs.unlinkSync(target);
                }
                log('CLEANUP', `Eliminado: ${target}`);
            }
        } catch (err) {
            log('ERROR', `Error limpiando: ${err.message}`);
        }
    }

    // Limpiar archivos viejos (cron job)
    cleanupOld(maxAgeMinutes = 30) {
        try {
            const files = fs.readdirSync(this.tempDir);
            const now = Date.now();
            
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = fs.statSync(filePath);
                const ageMin = (now - stats.mtime.getTime()) / (1000 * 60);
                
                if (ageMin > maxAgeMinutes) {
                    this.cleanup(filePath);
                }
            }
        } catch (err) {
            log('ERROR', `Error cleanup general: ${err.message}`);
        }
    }
}

module.exports = FileConverter;
