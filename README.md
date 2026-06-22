# Convertidor y Descargador de Multimedia (MP4/MP3)

Una aplicación web desarrollada con Node.js y Express para descargar y convertir archivos multimedia. Este proyecto incluye funcionalidades para descargar videos, convertirlos a formatos populares (MP4/MP3) y cuenta con integraciones para bots (ERP WhatsApp).

## 🚀 Características principales

- **Descargador de Video/Audio:** Módulos dedicados para gestionar las descargas.
- **Conversor a MP4 y MP3:** Convierte tus archivos rápidamente.
- **Interfaz Web:** Interfaz gráfica lista para interactuar con la herramienta.
- **API Backend:** Servidor basado en Express con rutas independientes para descarga y conversión.
- **Integración con Bots (ERP):** Estructura preparada para manejar respuestas automatizadas.

## 🛠️ Tecnologías utilizadas

- **Backend:** Node.js, Express
- **Manejo de archivos:** Multer
- **Herramientas de red:** CORS
- **Utilidades:** UUID, Nodemon (para desarrollo)

## 📂 Estructura del Proyecto

```text
convertidor-descargador/
├── src/
│   ├── bot/               # Lógica para integración del bot
│   ├── converters/        # Módulos para conversión de archivos
│   ├── downloaders/       # Lógica para descargas de medios
│   ├── knowledge/         # Base de respuestas para el ERP
│   └── web/               # Servidor Express y Rutas
├── public/                # Interfaz de usuario (HTML, CSS, JS)
├── config/                # Configuraciones de entorno
└── package.json           # Dependencias y scripts
```

## 💻 Instalación y Uso Local

Sigue estos pasos para probar el proyecto en tu computadora:

1. **Clona este repositorio**
   ```bash
   git clone https://github.com/phaletasss-max/convertidor-descargador.git
   ```

2. **Ingresa a la carpeta**
   *(Nota: si renombraste la carpeta localmente, asegúrate de entrar a esa)*
   ```bash
   cd convertidor-descargador
   ```

3. **Instala las dependencias**
   Asegúrate de tener [Node.js](https://nodejs.org/) instalado.
   ```bash
   npm install
   ```

4. **Inicia el servidor en modo desarrollo**
   ```bash
   npm run dev
   ```
   *Para iniciarlo de forma normal (producción), usa `npm start`.*

## 🤝 Contribución

Siéntete libre de hacer un _fork_ de este proyecto, crear tu propia rama y enviar un _Pull Request_ para cualquier mejora.

---
*Desarrollado con ❤️ por phaletasss-max*
