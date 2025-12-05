const express = require('express');
const cors = require('cors');

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
        status: 'Active',
        timestamp: new Date().toISOString(),
        endpoints: {
            'paytr_callback': 'POST /paytr/callback',
            'health': 'GET /health'
        }
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

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'PayTR Callback Backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Endpoint not found',
        method: req.method,
        path: req.originalUrl,
        available_endpoints: [
            'POST /paytr/callback',
            'GET /paytr/callback', 
            'GET /health',
            'GET /'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`🚀 PayTR Callback Backend running on port ${PORT}`);
    console.log(`📍 Callback URL: https://your-app-name.onrender.com/paytr/callback`);
    console.log(`📍 Health Check: https://your-app-name.onrender.com/health`);
});
