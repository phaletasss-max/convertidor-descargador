const config = require('../../config/config');

class ERPChatbot {
    constructor() {
        this.planes = config.erpPlans;
        this.modulos = config.modulosExtra;
    }

    procesarMensaje(mensaje) {
        const msg = mensaje.toLowerCase().trim();
        
        const patrones = {
            saludo: /hola|buenas|hey|saludos/,
            precioBasico: /plan basico|precio basico|cuanto.*basico/,
            precioPro: /plan profesional|precio profesional|plan pro/,
            precioEmpresa: /plan empresa|precio empresa|plan ilimitado/,
            modulos: /modulos|modulo|extras|adicional/,
            quitarModulo: /no quiero|quitar|remover|sin .*modulo/,
            comparar: /comparar|diferencia|versus|vs/,
            descargar: /descargar|bajar|download|mp4|mp3|video|audio/,
            ayuda: /ayuda|help|como funciona|que haces/
        };

        if (patrones.saludo.test(msg)) {
            return this.respuestaSaludo();
        }
        
        if (patrones.descargar.test(msg)) {
            return this.respuestaDescargar();
        }
        
        if (patrones.precioBasico.test(msg)) {
            return this.respuestaPlan('basico');
        }
        
        if (patrones.precioPro.test(msg)) {
            return this.respuestaPlan('profesional');
        }
        
        if (patrones.precioEmpresa.test(msg)) {
            return this.respuestaPlan('empresa');
        }
        
        if (patrones.modulos.test(msg)) {
            return this.respuestaModulos();
        }
        
        if (patrones.quitarModulo.test(msg)) {
            return this.respuestaQuitarModulo(msg);
        }
        
        if (patrones.comparar.test(msg)) {
            return this.respuestaComparar();
        }
        
        if (patrones.ayuda.test(msg)) {
            return this.respuestaAyuda();
        }

        return this.respuestaDefault();
    }

    respuestaSaludo() {
        return `Hola! Soy el asistente de ERP+Downloader.

Puedo ayudarte con:
Descargar videos (MP4) o audio (MP3) de YouTube, TikTok, Instagram, Twitter/X
Informacion sobre planes ERP
Cotizaciones personalizadas

Que necesitas hoy?`;
    }

    respuestaDescargar() {
        return `Para descargar contenido:

1. Envia el link del video (YouTube, TikTok, Instagram, Twitter/X)
2. Indica si quieres MP4 (video) o MP3 (solo audio)

Ejemplo: "Descarga este video en MP3: https://youtube.com/..."`;
    }

    respuestaPlan(tipo) {
        const plan = this.planes[tipo];
        const nombre = tipo.charAt(0).toUpperCase() + tipo.slice(1);
        
        let modulosTexto = Array.isArray(plan.modulos) 
            ? plan.modulos.join(', ') 
            : plan.modulos;
        
        return `Plan ${nombre}: $${plan.precio}/mes

Incluye:
- ${plan.usuarios} usuario(s)
- Modulos: ${modulosTexto}
- Soporte tecnico
- Actualizaciones gratuitas

Te interesa contratarlo o ver los modulos adicionales?`;
    }

    respuestaModulos() {
        let lista = '';
        for (const [modulo, precio] of Object.entries(this.modulos)) {
            lista += `- ${modulo.charAt(0).toUpperCase() + modulo.slice(1)}: +$${precio}/mes\n`;
        }
        
        return `Modulos Adicionales:\n\n${lista}\nPuedes agregar cualquier modulo a tu plan actual.
Cual te interesa?`;
    }

    respuestaQuitarModulo(msg) {
        const moduloDetectado = Object.keys(this.modulos).find(m => msg.includes(m));
        
        if (moduloDetectado) {
            const precio = this.modulos[moduloDetectado];
            return `Entendido. Si quitas el modulo ${moduloDetectado}, tu plan se reduce -$${precio}/mes.

Confirmas que deseas removerlo? (Responde "si" para confirmar)`;
        }
        
        return `Que modulo deseas quitar? Los disponibles son:\n${Object.keys(this.modulos).join(', ')}`;
    }

    respuestaComparar() {
        return `Comparativa de Planes:

Basico ($29/mes): 2 usuarios, inventario + facturacion
Profesional ($59/mes): 5 usuarios, +CRM +Reportes  
Empresa ($99/mes): Ilimitado, todos los modulos

Quieres que calcule un plan personalizado?`;
    }

    respuestaAyuda() {
        return `Que puedo hacer?

1. Descargar videos/audio de redes sociales
2. Cotizar planes ERP
3. Agregar/quitar modulos
4. Comparar planes
5. Responder dudas frecuentes

Escribe tu consulta naturalmente, por ejemplo:
"Cuanto cuesta el plan basico con CRM"`;
    }

    respuestaDefault() {
        return `No estoy seguro de entender.

Prueba con:
- "Cuanto cuesta el plan basico"
- "Quiero descargar un video"
- "Muestrame los modulos extra"
- "Comparar planes"

En que puedo ayudarte?`;
    }
}

module.exports = ERPChatbot;
