const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

class TournamentSystem {
    constructor(io) {
        this.io = io;
        this.tournaments = new Map();
        this.participants = new Map();
        this.questions = this.generateQuestions();
        
        // BAŞLANGIÇTA TÜM ESKİ TURNUVALARI TEMİZLE
        console.log('🗑️ Sistem başlatılıyor, tüm eski veriler temizleniyor...');
        this.tournaments.clear();
        this.participants.clear();
        
        this.setupScheduledTournaments();
        
        // İLK TURNUVAYI HEMEN OLUŞTUR
        setTimeout(() => {
            console.log('🏆 İlk turnuva oluşturuluyor...');
            this.createTournament('mixed', 'Başlangıç Turnuvası');
        }, 5000); // 5 saniye sonra
        
        console.log('🏆 Tournament System initialized - FRESH START');
    }

    // Soru bankası
    generateQuestions() {
        return [
            {
                id: 1,
                subject: 'matematik',
                question: '2x + 5 = 13 denkleminde x kaçtır?',
                options: ['A) 3', 'B) 4', 'C) 5', 'D) 6'],
                correct: 1,
                difficulty: 'easy',
                timeLimit: 90
            },
            {
                id: 2,
                subject: 'matematik',
                question: 'f(x) = x² + 2x - 3 fonksiyonunun kökleri toplamı kaçtır?',
                options: ['A) -2', 'B) -1', 'C) 1', 'D) 2'],
                correct: 0,
                difficulty: 'medium',
                timeLimit: 90
            },
            {
                id: 3,
                subject: 'turkce',
                question: 'Aşağıdakilerden hangisi mecaz anlamlı kullanılmıştır?',
                options: ['A) Güneş doğdu', 'B) Kalbi taş kesildi', 'C) Kapı açıldı', 'D) Su içti'],
                correct: 1,
                difficulty: 'easy',
                timeLimit: 90
            },
            {
                id: 4,
                subject: 'matematik',
                question: 'Bir üçgenin iç açıları toplamı kaç derecedir?',
                options: ['A) 90°', 'B) 180°', 'C) 270°', 'D) 360°'],
                correct: 1,
                difficulty: 'easy',
                timeLimit: 90
            },
            {
                id: 5,
                subject: 'fen',
                question: 'Fotosentez hangi organellerde gerçekleşir?',
                options: ['A) Mitokondri', 'B) Kloroplast', 'C) Ribozom', 'D) Çekirdek'],
                correct: 1,
                difficulty: 'medium',
                timeLimit: 90
            }
        ];
    }

    setupScheduledTournaments() {
        // TEST İÇİN: Her 2 dakikada bir turnuva kontrolü
        cron.schedule('*/2 * * * *', () => {
            console.log('=== Cron Check ===');
            console.log(`Aktif turnuva sayısı: ${this.tournaments.size}`);
            
            // Eski turnuvaları temizle
            this.cleanupOldTournaments();
            
            // Aktif turnuva yoksa yeni oluştur
            const activeTournaments = Array.from(this.tournaments.values())
                .filter(t => t.status === 'waiting' || t.status === 'active');
                
            console.log(`Aktif/Bekleyen turnuva sayısı: ${activeTournaments.length}`);
            
            if (activeTournaments.length === 0) {
                console.log('🏆 Yeni turnuva oluşturuluyor...');
                this.createTournament('mixed', 'Test Turnuvası');
            }
        });

        console.log('📅 TEST: Her 2 dakikada turnuva kontrolü aktif');
    }

    // Eski turnuvaları temizle
    cleanupOldTournaments() {
        const now = Date.now();
        const toDelete = [];
        
        this.tournaments.forEach((tournament, id) => {
            // 2 dakikadan eski finished turnuvaları sil
            if (tournament.status === 'finished' && tournament.endTime && (now - tournament.endTime) > 2 * 60 * 1000) {
                toDelete.push(id);
            }
            // 5 dakikadan eski active turnuvaları sil (stuck durumlar için)
            else if (tournament.status === 'active' && tournament.startTime && (now - tournament.startTime) > 5 * 60 * 1000) {
                toDelete.push(id);
            }
        });
        
        toDelete.forEach(id => {
            console.log(`🗑️ Eski turnuva temizlendi: ${id}`);
            this.tournaments.delete(id);
        });
    }

    // Turnuva oluştur
    createTournament(subject = 'mixed', name = 'Test Turnuvası') {
        const tournamentId = uuidv4();
        const questions = this.getRandomQuestions(subject, 10);
        
        const tournament = {
            id: tournamentId,
            name: name,
            subject: subject,
            status: 'waiting', // waiting, active, finished
            participants: new Map(),
            questions: questions,
            currentQuestionIndex: 0,
            startTime: null,
            endTime: null,
            leaderboard: [],
            maxParticipants: 100,
            createdAt: Date.now()
        };

        this.tournaments.set(tournamentId, tournament);
        
        console.log(`🏆 Turnuva oluşturuldu: ${name} (${tournamentId})`);
        
        // 1 dakika sonra başlat
        setTimeout(() => {
            this.startTournament(tournamentId);
        }, 1 * 60 * 1000);
        
        // Tüm kullanıcılara bildirim gönder
        this.io.emit('tournament_created', {
            tournament: this.getTournamentInfo(tournament)
        });

        return tournamentId;
    }

    // Rastgele soru seç
    getRandomQuestions(subject, count) {
        let availableQuestions = [...this.questions];
        
        if (subject !== 'mixed') {
            availableQuestions = availableQuestions.filter(q => q.subject === subject);
        }
        
        // Karıştır ve seç
        for (let i = availableQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
        }
        
        return availableQuestions.slice(0, Math.min(count, availableQuestions.length));
    }

    // Turnuva başlat
    startTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'waiting') {
            console.log(`❌ Turnuva başlatılamadı: ${tournamentId}`);
            return;
        }

        tournament.status = 'active';
        tournament.startTime = Date.now();
        tournament.currentQuestionIndex = 0;

        console.log(`🚀 Turnuva başladı: ${tournament.name}`);

        // İlk soruyu gönder
        this.sendCurrentQuestion(tournament);

        // Turnuva başladı bildirimi
        this.io.to(`tournament_${tournamentId}`).emit('tournament_started', {
            tournamentId: tournamentId,
            startTime: tournament.startTime
        });
    }

    // Mevcut soruyu gönder
    sendCurrentQuestion(tournament) {
        if (tournament.currentQuestionIndex >= tournament.questions.length) {
            this.finishTournament(tournament.id);
            return;
        }

        const question = tournament.questions[tournament.currentQuestionIndex];
        const questionData = {
            id: question.id,
            question: question.question,
            options: question.options,
            timeLimit: question.timeLimit,
            questionNumber: tournament.currentQuestionIndex + 1,
            totalQuestions: tournament.questions.length
        };

        // Soruyu katılımcılara gönder
        this.io.to(`tournament_${tournament.id}`).emit('new_question', questionData);

        console.log(`📝 Soru gönderildi: ${tournament.name} - Soru ${tournament.currentQuestionIndex + 1}`);

        // Soru süresini başlat
        setTimeout(() => {
            this.nextQuestion(tournament.id);
        }, question.timeLimit * 1000);
    }

    // Sonraki soruya geç
    nextQuestion(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return;

        tournament.currentQuestionIndex++;
        this.sendCurrentQuestion(tournament);
    }

    // Turnuvaya katıl
    joinTournament(tournamentId, userId, userInfo) {
        console.log(`=== Join Tournament Debug ===`);
        console.log(`Tournament ID: ${tournamentId}`);
        console.log(`User ID: ${userId}`);
        console.log(`User Info:`, userInfo);
        
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) {
            console.log(`ERROR: Tournament not found: ${tournamentId}`);
            console.log(`Available tournaments:`, Array.from(this.tournaments.keys()));
            return { success: false, error: 'Turnuva bulunamadı' };
        }

        console.log(`Tournament status: ${tournament.status}`);
        console.log(`Tournament participants: ${tournament.participants.size}/${tournament.maxParticipants}`);
        
        if (tournament.status !== 'waiting') {
            console.log(`ERROR: Tournament not waiting: ${tournament.status}`);
            return { success: false, error: `Turnuva durumu: ${tournament.status}` };
        }

        if (tournament.participants.size >= tournament.maxParticipants) {
            return { success: false, error: 'Turnuva dolu' };
        }

        if (this.participants.has(userId)) {
            return { success: false, error: 'Zaten bir turnuvada katılımcısınız' };
        }

        // Katılımcıyı ekle
        tournament.participants.set(userId, {
            userId: userId,
            username: userInfo.username || 'Anonim',
            score: 0,
            answers: [],
            joinTime: Date.now()
        });

        this.participants.set(userId, tournamentId);

        console.log(`✅ ${userInfo.username} turnuvaya katıldı: ${tournament.name}`);

        return { 
            success: true, 
            tournament: this.getTournamentInfo(tournament)
        };
    }

    // Cevap gönder
    submitAnswer(tournamentId, userId, questionId, answer, answerTime) {
        console.log(`=== Submit Answer Debug ===`);
        console.log(`Tournament ID: ${tournamentId}`);
        console.log(`User ID: ${userId}`);
        console.log(`Question ID: ${questionId}`);
        console.log(`Answer: ${answer}`);
        
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) {
            console.log(`ERROR: Tournament not found: ${tournamentId}`);
            return { success: false, error: 'Turnuva bulunamadı' };
        }
        
        if (tournament.status !== 'active') {
            console.log(`ERROR: Tournament not active: ${tournament.status}`);
            return { success: false, error: 'Turnuva aktif değil' };
        }

        const participant = tournament.participants.get(userId);
        if (!participant) {
            console.log(`ERROR: Participant not found: ${userId}`);
            return { success: false, error: 'Katılımcı bulunamadı' };
        }

        const currentQuestion = tournament.questions[tournament.currentQuestionIndex];
        if (!currentQuestion || currentQuestion.id !== questionId) {
            console.log(`ERROR: Question ID mismatch. Expected: ${currentQuestion?.id}, Got: ${questionId}`);
            return { success: false, error: 'Soru ID uyuşmuyor' };
        }

        // Cevabı kaydet
        const isCorrect = answer === currentQuestion.correct;
        const scoreEarned = isCorrect ? 10 : 0;

        participant.answers.push({
            questionId: questionId,
            answer: answer,
            isCorrect: isCorrect,
            scoreEarned: scoreEarned,
            answerTime: answerTime
        });

        participant.score += scoreEarned;

        console.log(`✅ Cevap kaydedildi: ${participant.username} - ${isCorrect ? 'Doğru' : 'Yanlış'}`);

        // Liderboard güncelle
        this.updateLeaderboard(tournament);

        return { 
            success: true, 
            isCorrect: isCorrect,
            scoreEarned: scoreEarned,
            totalScore: participant.score
        };
    }

    // Liderboard güncelle
    updateLeaderboard(tournament) {
        tournament.leaderboard = Array.from(tournament.participants.values())
            .sort((a, b) => b.score - a.score)
            .map((participant, index) => ({
                rank: index + 1,
                userId: participant.userId,
                username: participant.username,
                score: participant.score
            }));

        // Liderboard'u gönder
        this.io.to(`tournament_${tournament.id}`).emit('leaderboard_update', {
            leaderboard: tournament.leaderboard
        });
    }

    // Turnuva bitir
    finishTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return;

        tournament.status = 'finished';
        tournament.endTime = Date.now();

        // Final liderboard
        this.updateLeaderboard(tournament);

        // Sonuçları gönder
        this.io.to(`tournament_${tournamentId}`).emit('tournament_finished', {
            leaderboard: tournament.leaderboard
        });

        console.log(`🏁 Turnuva bitti: ${tournament.name}`);

        // Katılımcıları temizle
        tournament.participants.forEach((participant, userId) => {
            this.participants.delete(userId);
        });

        // 30 saniye sonra turnuvayı sil
        setTimeout(() => {
            this.tournaments.delete(tournamentId);
            console.log(`🗑️ Turnuva silindi: ${tournamentId}`);
        }, 30 * 1000);
    }

    // Turnuva bilgisi al
    getTournamentInfo(tournament) {
        return {
            id: tournament.id,
            name: tournament.name,
            subject: tournament.subject,
            status: tournament.status,
            participantCount: tournament.participants.size,
            maxParticipants: tournament.maxParticipants,
            questionCount: tournament.questions.length,
            currentQuestionIndex: tournament.currentQuestionIndex,
            startTime: tournament.startTime,
            endTime: tournament.endTime
        };
    }

    // Aktif turnuvaları getir
    getActiveTournaments() {
        console.log(`=== Get Active Tournaments ===`);
        console.log(`Total tournaments: ${this.tournaments.size}`);
        
        const activeTournaments = Array.from(this.tournaments.values())
            .filter(t => {
                console.log(`Tournament ${t.id}: status=${t.status}, participants=${t.participants.size}`);
                return t.status === 'waiting' || t.status === 'active';
            })
            .map(t => this.getTournamentInfo(t));
            
        console.log(`Active tournaments: ${activeTournaments.length}`);
        console.log(`===============================`);
        
        return activeTournaments;
    }
}

module.exports = TournamentSystem;
