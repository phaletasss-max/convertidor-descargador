// VideoDownloader Pro - Frontend
const BASE_URL = `${window.location.protocol}//${window.location.host}`;
const API_URL = `${BASE_URL}/api`;

// DOM Elements
const videoUrl = document.getElementById('videoUrl');
const btnPaste = document.getElementById('btnPaste');
const btnDescargar = document.getElementById('btnDescargar');
const infoPreview = document.getElementById('infoPreview');
const previewImg = document.getElementById('previewImg');
const previewDuration = document.getElementById('previewDuration');
const infoTitulo = document.getElementById('infoTitulo');
const infoAutor = document.getElementById('infoAutor');
const infoPeso = document.getElementById('infoPeso');
const infoPlataforma = document.getElementById('infoPlataforma');
const downloadStatus = document.getElementById('downloadStatus');
const statusText = document.getElementById('statusText');
const downloadResult = document.getElementById('downloadResult');
const formatBtns = document.querySelectorAll('.format-btn');
const selectCalidad = document.getElementById('selectCalidad');
const calidadGroup = document.getElementById('calidadGroup');

const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const btnEnviar = document.getElementById('btnEnviar');
const chatBody = document.getElementById('chatBody');
const chatToggle = document.getElementById('chatToggle');

let currentVideoInfo = null;
let selectedFormat = 'mp4';
let debounceTimer = null;

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ============================================
// FORMATO SELECTOR
// ============================================
formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFormat = btn.dataset.format;
        
        // Ocultar calidad si es MP3
        if (selectedFormat === 'mp3') {
            calidadGroup.style.opacity = '0.3';
            calidadGroup.style.pointerEvents = 'none';
        } else {
            calidadGroup.style.opacity = '1';
            calidadGroup.style.pointerEvents = 'auto';
        }
        
        if (currentVideoInfo) updatePreviewInfo();
    });
});

// ============================================
// PASTE BUTTON
// ============================================
btnPaste.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        videoUrl.value = text;
        videoUrl.dispatchEvent(new Event('input'));
    } catch {
        addBotMessage('No pude acceder al portapapeles. Pega manualmente con Ctrl+V');
    }
});

// ============================================
// AUTO-PREVIEW AL ESCRIBIR URL
// ============================================
videoUrl.addEventListener('input', () => {
    const url = videoUrl.value.trim();
    clearTimeout(debounceTimer);
    hide(infoPreview);
    hide(downloadResult);
    currentVideoInfo = null;
    
    if (!url || !isValidUrl(url)) return;
    debounceTimer = setTimeout(() => fetchVideoInfo(url), 600);
});

function isValidUrl(string) {
    try { new URL(string); return true; } catch { return false; }
}

async function fetchVideoInfo(url) {
    statusText.textContent = 'Analizando video...';
    show(downloadStatus);
    
    try {
        const response = await fetch(`${API_URL}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        currentVideoInfo = data.data;
        updatePreviewInfo();
        
        // Detectar plataforma para icono
        const platform = detectPlatform(url);
        infoPlataforma.textContent = platform.name;
        infoPlataforma.style.background = platform.color;
        
        show(infoPreview);
        hide(downloadStatus);
        
        const min = Math.floor(data.data.duracion / 60);
        const sec = (data.data.duracion % 60).toString().padStart(2, '0');
        addBotMessage(`Encontre: "${data.data.titulo}" (${min}:${sec}) en ${platform.name}. Listo para descargar!`);
        
    } catch (error) {
        hide(downloadStatus);
        console.error('Error:', error);
    }
}

function updatePreviewInfo() {
    if (!currentVideoInfo) return;
    
    previewImg.src = currentVideoInfo.thumbnail || '';
    previewImg.onerror = () => { previewImg.style.display = 'none'; };
    infoTitulo.textContent = currentVideoInfo.titulo || 'Sin titulo';
    infoAutor.innerHTML = `<i class="fas fa-user"></i> ${currentVideoInfo.autor || 'Desconocido'}`;
    
    const min = Math.floor((currentVideoInfo.duracion || 0) / 60);
    const sec = ((currentVideoInfo.duracion || 0) % 60).toString().padStart(2, '0');
    previewDuration.textContent = `${min}:${sec}`;
    
    const peso = selectedFormat === 'mp3' 
        ? ((currentVideoInfo.duracion / 60) * 1).toFixed(1)
        : (currentVideoInfo.pesoEstimadoMB || ((currentVideoInfo.duracion / 60) * 5).toFixed(1));
    infoPeso.innerHTML = `<i class="fas fa-weight-hanging"></i> ~${peso} MB`;
}

function detectPlatform(url) {
    const platforms = {
        'youtube.com': { name: 'YouTube', color: '#ff0000' },
        'youtu.be': { name: 'YouTube', color: '#ff0000' },
        'tiktok.com': { name: 'TikTok', color: '#000000' },
        'instagram.com': { name: 'Instagram', color: '#e4405f' },
        'facebook.com': { name: 'Facebook', color: '#1877f2' },
        'fb.watch': { name: 'Facebook', color: '#1877f2' },
        'twitter.com': { name: 'Twitter/X', color: '#1da1f2' },
        'x.com': { name: 'Twitter/X', color: '#1da1f2' }
    };
    
    for (const [domain, info] of Object.entries(platforms)) {
        if (url.includes(domain)) return info;
    }
    return { name: 'Desconocido', color: '#6366f1' };
}

// ============================================
// DESCARGA
// ============================================
btnDescargar.addEventListener('click', async () => {
    const url = videoUrl.value.trim();
    if (!url) {
        addBotMessage('Pega un link primero!');
        return;
    }

    const formato = selectedFormat;
    const calidad = formato === 'mp4' ? selectCalidad.value : null;
    
    statusText.textContent = `Descargando ${formato.toUpperCase()}... Espera un momento`;
    show(downloadStatus);
    hide(downloadResult);

    try {
        const response = await fetch(`${API_URL}/descargar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, formato, calidad })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error);
        }

        // Obtener nombre del archivo
        const disposition = response.headers.get('Content-Disposition');
        let filename = `video.${formato}`;
        if (disposition) {
            const match = disposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }

        // Descargar blob y guardar en PC del cliente
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        
        hide(downloadStatus);
        show(downloadResult);
        addBotMessage(`Descarga completada: ${filename} (${sizeMB} MB)`);
        
    } catch (error) {
        hide(downloadStatus);
        addBotMessage(`Error: ${error.message}`);
    }
});

// ============================================
// CHAT
// ============================================
function addUserMessage(texto) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = texto;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addBotMessage(texto) {
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.textContent = texto;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function toggleChat() {
    chatBody.classList.toggle('open');
    chatToggle.style.transform = chatBody.classList.contains('open') ? 'rotate(180deg)' : '';
}

async function enviarMensaje() {
    const mensaje = chatInput.value.trim();
    if (!mensaje) return;

    addUserMessage(mensaje);
    chatInput.value = '';

    const urlRegex = /(https?:\/\/[^\s]+)/;
    const urlMatch = mensaje.match(urlRegex);
    
    if (urlMatch) {
        videoUrl.value = urlMatch[1];
        videoUrl.dispatchEvent(new Event('input'));
        return;
    }

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje })
        });
        const data = await response.json();
        if (data.success) addBotMessage(data.respuesta);
    } catch {
        addBotMessage('Error de conexion.');
    }
}

btnEnviar.addEventListener('click', enviarMensaje);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
});

// Health check
fetch(`${BASE_URL}/health`)
    .then(() => console.log('Servidor conectado'))
    .catch(() => addBotMessage('Servidor no disponible'));
// ============================================
// GLOBIN CONVERTER
// ============================================

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const conversionSelector = document.getElementById('conversionSelector');
const convertButtons = document.getElementById('convertButtons');
const convertStatus = document.getElementById('convertStatus');
const convertStatusText = document.getElementById('convertStatusText');
const convertCards = document.querySelectorAll('.convert-card');

let selectedFile = null;

// Click en drop zone
dropZone.addEventListener('click', () => fileInput.click());

// File input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// Click en cards de conversion
convertCards.forEach(card => {
    card.addEventListener('click', () => {
        if (!card.classList.contains('active')) return;
        const type = card.dataset.type;
        // Simular seleccion de archivo si no hay
        if (!selectedFile) {
            fileInput.click();
            // Guardar tipo seleccionado para despues
            fileInput.dataset.preselected = type;
            return;
        }
        convertFile(type);
    });
});

function handleFile(file) {
    selectedFile = file;
    
    // Mostrar info
    fileName.textContent = file.name;
    fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    show(fileInfo);
    
    // Determinar conversiones disponibles
    const ext = file.name.split('.').pop().toLowerCase();
    const availableConversions = getAvailableConversions(ext);
    
    // Generar botones
    convertButtons.innerHTML = '';
    availableConversions.forEach(conv => {
        const btn = document.createElement('button');
        btn.className = 'convert-btn primary';
        btn.innerHTML = `<i class="fas fa-exchange-alt"></i> ${conv.name}`;
        btn.onclick = () => convertFile(conv.id);
        convertButtons.appendChild(btn);
    });
    
    show(conversionSelector);
    
    // Scroll suave a la seccion
    conversionSelector.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getAvailableConversions(ext) {
    const map = {
        'pdf': [{ id: 'pdf-to-word', name: 'Word (DOCX)' }],
        'doc': [{ id: 'word-to-pdf', name: 'PDF' }],
        'docx': [{ id: 'word-to-pdf', name: 'PDF' }],
        'jpg': [{ id: 'jpg-to-png', name: 'PNG' }, { id: 'jpg-to-webp', name: 'WebP' }, { id: 'compress-image', name: 'Comprimir' }],
        'jpeg': [{ id: 'jpg-to-png', name: 'PNG' }, { id: 'jpg-to-webp', name: 'WebP' }, { id: 'compress-image', name: 'Comprimir' }],
        'png': [{ id: 'png-to-jpg', name: 'JPG' }, { id: 'compress-image', name: 'Comprimir' }],
        'webp': [{ id: 'webp-to-jpg', name: 'JPG' }, { id: 'compress-image', name: 'Comprimir' }],
        'mp4': [{ id: 'mp4-to-mp3', name: 'MP3 (Audio)' }]
    };
    return map[ext] || [];
}

async function convertFile(tipo) {
    if (!selectedFile) return;
    
    convertStatusText.textContent = `Convirtiendo ${selectedFile.name}...`;
    show(convertStatus);
    
    const formData = new FormData();
    formData.append('archivo', selectedFile);
    
    try {
        const response = await fetch(`${API_URL}/converter/${tipo}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error);
        }
        
        // Descargar archivo convertido
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Obtener nombre del header o generar uno
        const disposition = response.headers.get('Content-Disposition');
        let filename = `convertido.${tipo.split('-').pop()}`;
        if (disposition) {
            const match = disposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        
        hide(convertStatus);
        addBotMessage(`Conversion completada: ${filename}`);
        
    } catch (error) {
        hide(convertStatus);
        addBotMessage(`Error en conversion: ${error.message}`);
    }
}

// Verificar si hay tipo preseleccionado despues de seleccionar archivo
fileInput.addEventListener('change', (e) => {
    if (e.target.dataset.preselected && selectedFile) {
        convertFile(e.target.dataset.preselected);
        delete e.target.dataset.preselected;
    }
});
