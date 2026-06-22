const path = require('path');

module.exports = {
    port: 3000,
    downloadsPath: path.join(__dirname, '../downloads'),
    maxFileSize: '500MB',
    supportedPlatforms: [
        'youtube.com', 'youtu.be',
        'tiktok.com', 'vm.tiktok.com',
        'instagram.com',
        'twitter.com', 'x.com',
        'facebook.com', 'fb.watch'
    ],
    erpPlans: {
        basico: { precio: 29, usuarios: 2, modulos: ['inventario', 'facturacion'] },
        profesional: { precio: 59, usuarios: 5, modulos: ['inventario', 'facturacion', 'crm', 'reportes'] },
        empresa: { precio: 99, usuarios: 'ilimitado', modulos: 'todos' }
    },
    modulosExtra: {
        crm: 10,
        produccion: 15,
        contabilidad: 12,
        nomina: 18,
        ecommerce: 20
    }
};
