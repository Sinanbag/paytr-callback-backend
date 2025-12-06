const express = require('express');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');
const axios = require('axios'); // For keep-alive

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ana sayfa
app.get('/', (req, res) => {
    res.json({
        message: 'PayTR Callback Backend',
        status: 'active',
        timestamp: new Date().toISOString(),
        service: 'PayTR Callback Backend',
        version: '1.0.0'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        service: 'PayTR Callback Backend'
    });
});

// PayTR Callback Endpoint - SADECE "OK" DÖNDÜR
app.post('/paytr/callback', (req, res) => {
    console.log('=== PayTR Callback Received ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('================================');

    // PayTR'nin beklediği basit "OK" cevabı
    res.status(200).send('OK');
});

// GET callback için de aynı response
app.get('/paytr/callback', (req, res) => {
    console.log('=== PayTR GET Callback ===');
    console.log('Query params:', req.query);
    console.log('==========================');
    res.status(200).send('OK');
});

// PayTR Token Endpoint - Android uygulaması için
app.post('/paytr/get-token', (req, res) => {
    console.log('=== PayTR Token Request ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('==========================');

    // Şimdilik mock response döndür - gerçek PayTR entegrasyonu için
    // PayTR API'sine istek atılacak
    res.json({
        success: false,
        error: 'PayTR token endpoint henüz aktif değil. Canlı mod onayı bekleniyor.',
        message: 'Bu endpoint PayTR canlı mod onayından sonra aktif olacak.'
    });
});

// Success Page for PayTR redirect
app.get('/success', (req, res) => {
    const merchantOid = req.query.merchant_oid || 'N/A';
    res.send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ödeme Başarılı</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f0f8f0; color: #333; text-align: center; padding: 20px; }
                .container { background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; max-width: 400px; margin: 50px auto; }
                h1 { color: #28a745; }
                p { font-size: 1.1em; }
                .button { background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 1em; margin-top: 20px; display: inline-block; }
                .button:hover { background-color: #218838; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Ödeme Başarılı!</h1>
                <p>İşlem ID'niz: <strong>${merchantOid}</strong></p>
                <p>Ödemeniz başarıyla tamamlandı. Uygulamaya geri dönebilirsiniz.</p>
                <a href="tytkocluk://payment/success?merchant_oid=${merchantOid}" class="button">Uygulamaya Dön</a>
            </div>
        </body>
        </html>
    `);
});

// Fail Page for PayTR redirect
app.get('/fail', (req, res) => {
    const merchantOid = req.query.merchant_oid || 'N/A';
    res.send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ödeme Başarısız</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #fff0f0; color: #333; text-align: center; padding: 20px; }
                .container { background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; max-width: 400px; margin: 50px auto; }
                h1 { color: #dc3545; }
                p { font-size: 1.1em; }
                .button { background-color: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 1em; margin-top: 20px; display: inline-block; }
                .button:hover { background-color: #c82333; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>❌ Ödeme Başarısız!</h1>
                <p>İşlem ID'niz: <strong>${merchantOid}</strong></p>
                <p>Ödeme işleminiz tamamlanamadı. Lütfen tekrar deneyin veya destek ile iletişime geçin.</p>
                <a href="tytkocluk://payment/fail?merchant_oid=${merchantOid}" class="button">Uygulamaya Dön</a>
            </div>
        </body>
        </html>
    `);
});

// Keep-alive function to prevent Render.com cold starts
const keepAlive = () => {
    const backendUrl = `https://paytr-callback-backend.onrender.com/health`;
    setInterval(async () => {
        try {
            await axios.get(backendUrl);
            console.log(`[${new Date().toISOString()}] Keep-alive ping successful.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Keep-alive ping failed: ${error.message}`);
        }
    }, 10 * 60 * 1000); // Every 10 minutes
};

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 PayTR Callback Backend running on port ${PORT}`);
    console.log(`📍 Callback URL: https://paytr-callback-backend.onrender.com/paytr/callback`);
    console.log(`📍 Health Check: https://paytr-callback-backend.onrender.com/health`);
    keepAlive(); // Start the keep-alive pinger
});
