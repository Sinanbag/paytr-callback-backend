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
        status: 'Active',
        timestamp: new Date().toISOString(),
        endpoints: {
            'paytr_callback': 'POST /paytr/callback',
            'health': 'GET /health'
        }
    });
});

// PayTR Callback Endpoint - GÜVENLİK İLE
app.post('/paytr/callback', (req, res) => {
    console.log('=== PayTR Callback Received ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    
    // Güvenlik: IP Kontrolü (PayTR IP'leri)
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('Client IP:', clientIP);
    
    // Güvenlik: User-Agent Kontrolü
    const userAgent = req.headers['user-agent'] || '';
    console.log('User-Agent:', userAgent);
    
    // TODO: Canlı modda PayTR hash doğrulaması eklenecek
    // const { merchant_key, merchant_salt } = PayTRConfig;
    // const hash = crypto.createHmac('sha256', merchant_key).update(...).digest('base64');
    
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

// PayTR Success Page
app.get('/success', (req, res) => {
    console.log('=== PayTR Success Page ===');
    console.log('Query params:', req.query);
    console.log('==========================');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Ödeme Başarılı</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; background: #f0f8ff; }
                .success { color: #28a745; font-size: 24px; margin: 20px 0; }
                .info { color: #666; margin: 10px 0; }
                .button { 
                    background: #28a745; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <h1 class="success">✅ Ödeme Başarıyla Tamamlandı!</h1>
            <p class="info">TYT Koçluk uygulamanıza dönebilirsiniz.</p>
            <p class="info">İşlem ID: ${req.query.merchant_oid || 'N/A'}</p>
            <a href="#" class="button" onclick="window.close()">Uygulamaya Dön</a>
        </body>
        </html>
    `);
});

// PayTR Fail Page
app.get('/fail', (req, res) => {
    console.log('=== PayTR Fail Page ===');
    console.log('Query params:', req.query);
    console.log('=========================');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Ödeme Başarısız</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; background: #fff5f5; }
                .error { color: #dc3545; font-size: 24px; margin: 20px 0; }
                .info { color: #666; margin: 10px 0; }
                .button { 
                    background: #dc3545; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <h1 class="error">❌ Ödeme İşlemi Başarısız</h1>
            <p class="info">Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyiniz.</p>
            <p class="info">Hata: ${req.query.failed_reason_msg || 'Bilinmeyen hata'}</p>
            <a href="#" class="button" onclick="window.close()">Uygulamaya Dön</a>
        </body>
        </html>
    `);
});

// Turnuva API'leri
app.get('/api/tournaments', (req, res) => {
    const tournaments = tournamentSystem.getActiveTournaments();
    res.json({
        success: true,
        tournaments: tournaments
    });
});

// Manuel turnuva oluştur (test için)
app.post('/api/tournaments/create', (req, res) => {
    console.log('Manuel turnuva oluşturma isteği');
    const tournamentId = tournamentSystem.createTournament('mixed', 'Manuel Test Turnuvası');
    res.json({
        success: true,
        tournamentId: tournamentId,
        message: 'Turnuva oluşturuldu, 1 dakika sonra başlayacak'
    });
});

// Tüm turnuvaları temizle (test için)
app.post('/api/tournaments/cleanup', (req, res) => {
    console.log('Tüm turnuvalar temizleniyor...');
    tournamentSystem.tournaments.clear();
    res.json({
        success: true,
        message: 'Tüm turnuvalar temizlendi'
    });
});

app.post('/api/tournaments/:tournamentId/join', (req, res) => {
    const { tournamentId } = req.params;
    const { userId, username } = req.body;
    
    if (!userId || !username) {
        return res.json({
            success: false,
            error: 'userId ve username gerekli'
        });
    }
    
    const result = tournamentSystem.joinTournament(tournamentId, userId, { username });
    res.json(result);
});

app.post('/api/tournaments/:tournamentId/answer', (req, res) => {
    const { tournamentId } = req.params;
    const { userId, questionId, answer, answerTime } = req.body;
    
    if (!userId || questionId === undefined || answer === undefined || !answerTime) {
        return res.json({
            success: false,
            error: 'Eksik parametreler'
        });
    }
    
    const result = tournamentSystem.submitAnswer(tournamentId, userId, questionId, answer, answerTime);
    res.json(result);
});

app.get('/api/user/:userId/tournament', (req, res) => {
    const { userId } = req.params;
    const tournament = tournamentSystem.getUserActiveTournament(userId);
    
    res.json({
        success: true,
        tournament: tournament
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'PayTR Callback Backend + Tournament System',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeTournaments: tournamentSystem.getActiveTournaments().length
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

// Keep-Alive Service - Cold Start Önleme
function keepAlive() {
    const url = 'https://paytr-callback-backend.onrender.com/health';
    
    https.get(url, (res) => {
        console.log(`Keep-Alive: ${res.statusCode} - ${new Date().toISOString()}`);
    }).on('error', (err) => {
        console.error('Keep-Alive Error:', err.message);
    });
}

// Her 10 dakikada bir keep-alive
setInterval(keepAlive, 10 * 60 * 1000); // 10 dakika

// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
    console.log(`🔌 Kullanıcı bağlandı: ${socket.id}`);
    
    // Turnuvaya katıl
    socket.on('join_tournament', (data) => {
        const { tournamentId, userId } = data;
        socket.join(`tournament_${tournamentId}`);
        socket.userId = userId;
        socket.tournamentId = tournamentId;
        console.log(`👤 ${userId} turnuva odasına katıldı: ${tournamentId}`);
    });
    
    // Şüpheli aktivite raporu
    socket.on('suspicious_activity', (data) => {
        const { userId, type, details } = data;
        console.log(`⚠️ Şüpheli aktivite raporu: ${userId} - ${type}`, details);
        
        // Turnuva sistemine bildir
        const tournamentId = socket.tournamentId;
        if (tournamentId) {
            const tournament = tournamentSystem.tournaments.get(tournamentId);
            if (tournament) {
                const participant = tournament.participants.get(userId);
                if (participant) {
                    let points = 0;
                    switch (type) {
                        case 'APP_SWITCH': points = 20; break;
                        case 'SCREEN_RECORD': points = 30; break;
                        case 'CAMERA_USAGE': points = 25; break;
                        case 'MULTI_TOUCH': points = 15; break;
                        default: points = 10;
                    }
                    tournamentSystem.addSuspiciousActivity(participant, type, points);
                }
            }
        }
    });
    
    // Bağlantı koptu
    socket.on('disconnect', () => {
        console.log(`🔌 Kullanıcı ayrıldı: ${socket.id}`);
        if (socket.tournamentId) {
            socket.leave(`tournament_${socket.tournamentId}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 PayTR Callback Backend + Tournament System running on port ${PORT}`);
    console.log(`📍 Callback URL: https://paytr-callback-backend.onrender.com/paytr/callback`);
    console.log(`📍 Health Check: https://paytr-callback-backend.onrender.com/health`);
    console.log(`🏆 Tournament API: https://paytr-callback-backend.onrender.com/api/tournaments`);
    console.log(`🔄 Keep-Alive: Her 10 dakikada bir ping`);
    
    // İlk keep-alive
    setTimeout(keepAlive, 30000); // 30 saniye sonra başlat
});
