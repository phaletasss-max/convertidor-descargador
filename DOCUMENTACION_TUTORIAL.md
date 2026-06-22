# 🤖 Guía Maestra: Creación y Expansión de Bots Personalizados

Este documento es una guía paso a paso diseñada para **enseñar a otras personas** a entender este proyecto base y utilizarlo como trampolín para crear **bots mucho más avanzados, completos y personalizados**. 

Aquí aprenderás a integrar bases de datos, APIs de Inteligencia Artificial (OpenAI, Claude, Gemini), conectar plataformas de mensajería (WhatsApp, Telegram) y organizar tu código como un profesional.

---

## 🏗️ 1. Entendiendo la Arquitectura Base

Tu proyecto actual funciona bajo **Node.js** con el framework **Express.js**. Esto significa que tienes un servidor web capaz de escuchar peticiones (rutas) y procesarlas.

### ¿Por qué esta estructura?
El proyecto está dividido en carpetas dentro de `src/` para separar responsabilidades (Principio de Responsabilidad Única):
- **`web/`**: Maneja las rutas HTTP (`server.js`, `routes/`). Solo recibe peticiones y devuelve respuestas.
- **`downloaders/` & `converters/`**: Contienen la lógica "pesada" (ej. ejecutar `yt-dlp` mediante subprocesos).
- **`knowledge/`**: Guarda los datos estáticos o la "inteligencia" básica del bot (ej. `erpResponses.js`).
- **`bot/`**: (Actualmente vacía o en desarrollo) El lugar ideal para conectar la lógica de WhatsApp o Telegram.

**💡 Lección:** Si quieres agregar una funcionalidad nueva (por ejemplo, buscar el clima), no lo metas todo en `server.js`. Crea un archivo en una nueva carpeta `src/services/weatherService.js`.

---

## 🔑 2. Manejo de APIs, Keys y Seguridad

Para que un bot sea realmente poderoso, necesita comunicarse con el exterior (OpenAI, Bases de datos, etc.). Para esto necesitas **API Keys**.

### El uso correcto de `.env` (Variables de Entorno)
**¡NUNCA pongas tus claves secretas directamente en el código!** 
1. Instala la librería `dotenv`: `npm install dotenv`
2. Crea un archivo llamado `.env` en la raíz del proyecto.
3. Agrega tus claves allí:
   ```env
   OPENAI_API_KEY=sk-miClaveSecreta123...
   WHATSAPP_TOKEN=token_generado_por_meta...
   DATABASE_URL=postgres://usuario:pass@localhost:5432/mibd
   ```
4. En tu código (`config/config.js`), cárgalas así:
   ```javascript
   require('dotenv').config();
   module.exports = {
       openAiKey: process.env.OPENAI_API_KEY,
       // ...
   };
   ```

---

## 🧠 3. Dotando al Bot de Inteligencia Real (Integrando IA)

Actualmente, tu bot usa un archivo estático (`erpResponses.js`) para responder como un ERP. Para hacerlo dinámico e inteligente, podemos integrarlo con IA.

### Ejemplo de Integración con OpenAI:
1. Instalar SDK: `npm install openai`
2. Crear un servicio en `src/bot/aiService.js`:
   ```javascript
   const { OpenAI } = require('openai');
   const config = require('../../config/config');

   const openai = new OpenAI({ apiKey: config.openAiKey });

   async function getAIResponse(userMessage) {
       const completion = await openai.chat.completions.create({
           messages: [
               { role: 'system', content: 'Eres un asistente ERP de la empresa X. Sé profesional y conciso.' },
               { role: 'user', content: userMessage }
           ],
           model: 'gpt-4o-mini',
       });
       return completion.choices[0].message.content;
   }

   module.exports = { getAIResponse };
   ```

---

## 📱 4. Conectando con Plataformas de Mensajería

Para que el bot no solo viva en una página web, sino en el celular de los usuarios, debes integrarlo en `src/bot/`.

### Opciones populares para WhatsApp:
1. **WhatsApp Cloud API (Oficial de Meta)**: Recomendado para empresas formales (ERP). Se maneja mediante webhooks (rutas Express que reciben peticiones POST de Meta).
2. **`whatsapp-web.js` o `Baileys` (No oficial)**: Ideal para herramientas, descargas y proyectos personales. Funciona escaneando un código QR.

**Ejemplo de arquitectura con `whatsapp-web.js`:**
1. Instalar: `npm install whatsapp-web.js qrcode-terminal`
2. Crear `src/bot/whatsappBot.js`:
   ```javascript
   const { Client, LocalAuth } = require('whatsapp-web.js');
   const qrcode = require('qrcode-terminal');
   const { getAIResponse } = require('./aiService');

   const client = new Client({
       authStrategy: new LocalAuth() // Guarda sesión para no escanear QR siempre
   });

   client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

   client.on('ready', () => console.log('¡Bot de WhatsApp Listo!'));

   client.on('message', async (msg) => {
       if(msg.body.startsWith('!descargar')) {
           // Llamar a tu lógica de src/downloaders/videoDownloader.js
           msg.reply('Descargando tu video, espera un momento...');
       } else {
           // Usar IA para responder preguntas de ERP
           const response = await getAIResponse(msg.body);
           msg.reply(response);
       }
   });

   client.initialize();
   ```
3. Luego, simplemente llamas a este archivo desde tu `server.js` al final: `require('../bot/whatsappBot');`

---

## 🛠️ 5. Ejecutando Tareas Pesadas (Apps y Comandos del Sistema)

Este bot ya usa herramientas como `yt-dlp` (en el descargador). ¿Cómo enseñas a otros a hacer bots que controlen la computadora o usen programas externos?

Se utiliza `child_process` de Node.js. 
Ejemplo de regla de oro a enseñar: **"Nunca confíes en el texto que envía el usuario"**.
Si un usuario manda: `!descargar video.mp4; rm -rf /`, y lo pasas directo a la consola, te borrarán el servidor.

**Forma correcta (Usar arrays, no strings concatenados):**
```javascript
const { spawn } = require('child_process');

// BIEN ✅ (yt-dlp interpreta los argumentos de forma segura)
const child = spawn('yt-dlp', ['-f', 'best', urlDelUsuario]);

// MAL ❌ (Vulnerable a inyección de comandos)
// exec(`yt-dlp -f best ${urlDelUsuario}`);
```

---

## 📈 6. Expandiendo a un ERP Real (Bases de Datos)

Un ERP real necesita leer inventario, clientes y ventas.
1. **Elige una BD**: PostgreSQL (relacional, ideal para ERP) o MongoDB (NoSQL, rápida para datos sueltos).
2. **Usa un ORM**: Por ejemplo, `Prisma` o `Sequelize`.
   - `npm install prisma --save-dev`
   - `npx prisma init`
3. **Flujo del Bot ERP**:
   - Usuario en WhatsApp: *"¿Tienen laptops en stock?"*
   - `whatsappBot.js` lee el mensaje.
   - Pasa el texto a `aiService.js` (OpenAI).
   - OpenAI devuelve una orden estructurada: `{"action": "check_stock", "item": "laptop"}` (usando function calling).
   - El bot consulta la Base de Datos con Prisma.
   - Retorna la respuesta: *"Sí, tenemos 5 laptops disponibles."*

---

## 🎓 Resumen Pedagógico (Para enseñar a tus alumnos)

Si le das este proyecto a alguien para que aprenda, guíalos en este orden:
1. **Explorar las rutas:** Que vean cómo el frontend (HTML/JS) pide datos a `server.js`.
2. **Revisar los módulos:** Que entiendan cómo `server.js` manda el trabajo sucio a `src/downloaders/` o `src/converters/`.
3. **Experimentar:** Que modifiquen `erpResponses.js` para crear sus propias respuestas estáticas.
4. **Evolucionar:** Enséñales a cambiar las respuestas estáticas por una llamada a la API de OpenAI.
5. **Conectar:** Ayúdales a levantar el QR de `whatsapp-web.js` para que el bot hable directamente en sus celulares.

¡Con esta base estructurada, el cielo es el límite!
