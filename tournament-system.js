const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

class TournamentSystem {
    constructor(io) {
        this.io = io;
        this.tournaments = new Map();
        this.participants = new Map();
        this.questions = this.generateQuestions();
        this.setupScheduledTournaments();
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
                question: 'Suyun kaynama noktası kaç santigrat derecedir?',
                options: ['A) 0°C', 'B) 50°C', 'C) 100°C', 'D) 150°C'],
                correct: 2,
                difficulty: 'easy',
                timeLimit: 90
            },
            {
                id: 6,
                subject: 'matematik',
                question: 'log₂(8) değeri kaçtır?',
                options: ['A) 2', 'B) 3', 'C) 4', 'D) 8'],
                correct: 1,
                difficulty: 'medium',
                timeLimit: 90
            },
            {
                id: 7,
                subject: 'turkce',
                question: '"Sessizlik" kelimesinin eş anlamlısı hangisidir?',
                options: ['A) Gürültü', 'B) Sükûnet', 'C) Hareket', 'D) Çığlık'],
                correct: 1,
                difficulty: 'easy',
                timeLimit: 90
            },
            {
                id: 8,
                subject: 'matematik',
                question: '5! (5 faktöriyel) kaçtır?',
                options: ['A) 25', 'B) 60', 'C) 120', 'D) 150'],
                correct: 2,
                difficulty: 'medium',
                timeLimit: 90
            },
            {
                id: 9,
                subject: 'fen',
                question: 'Işık hızı yaklaşık kaç km/s dir?',
                options: ['A) 100.000 km/s', 'B) 200.000 km/s', 'C) 300.000 km/s', 'D) 400.000 km/s'],
                correct: 2,
                difficulty: 'medium',
                timeLimit: 90
            },
            {
                id: 10,
                subject: 'matematik',
                question: 'Bir dairenin çevresi formülü hangisidir?',
                options: ['A) πr²', 'B) 2πr', 'C) πr', 'D) 4πr'],
                correct: 1,
                difficulty: 'easy',
                timeLimit: 90
            }
        ];
    }

    // Otomatik turnuva programı
    setupScheduledTournaments() {
        // Her gün 09:00 - Matematik
        cron.schedule('0 9 * * *', () => {
            this.createTournament('matematik', 'Sabah Matematik Turnuvası');
        });

        // Her gün 14:00 - Türkçe
        cron.schedule('0 14 * * *', () => {
            this.createTournament('turkce', 'Öğlen Türkçe Turnuvası');
        });

        // Her gün 19:00 - Fen
        cron.schedule('0 19 * * *', () => {
            this.createTournament('fen', 'Akşam Fen Turnuvası');
        });

        // Her gün 21:00 - Karışık
        cron.schedule('0 21 * * *', () => {
            this.createTournament('mixed', 'Gece Karışık Turnuvası');
        });

        // Test için her 2 dakika (geliştirme aşamasında)
        cron.schedule('*/2 * * * *', () => {
            console.log(`=== Cron Check ===`);
            console.log(`Active tournaments: ${this.tournaments.size}`);
            
            // Aktif veya bekleyen turnuva var mı kontrol et
            const activeTournaments = Array.from(this.tournaments.values())
                .filter(t => t.status === 'waiting' || t.status === 'active');
            
            console.log(`Active/Waiting tournaments: ${activeTournaments.length}`);
            
            if (activeTournaments.length === 0) {
                console.log('Creating new tournament...');
                this.createTournament('mixed', 'Test Turnuvası');
            }
        });
    }

    // Turnuva oluştur
    createTournament(subject, name) {
        const tournamentId = uuidv4();
        const tournament = {
            id: tournamentId,
            name: name,
            subject: subject,
            status: 'waiting', // waiting, active, finished
            participants: new Map(),
            questions: this.getQuestionsBySubject(subject),
            currentQuestion: 0,
            startTime: null,
            endTime: null,
            maxParticipants: 100,
            duration: 15 * 60 * 1000, // 15 dakika
            questionDuration: 90 * 1000, // 90 saniye
            leaderboard: [],
            createdAt: Date.now()
        };

        this.tournaments.set(tournamentId, tournament);
        
        // 2 dakika sonra başlat (test için kısaltıldı)
        setTimeout(() => {
            this.startTournament(tournamentId);
        }, 2 * 60 * 1000);

        // Tüm kullanıcılara bildirim gönder
        this.io.emit('tournament_created', {
            tournament: this.getTournamentInfo(tournament)
        });

        console.log(`🏆 Yeni turnuva oluşturuldu: ${name} (${tournamentId})`);
        return tournamentId;
    }

    // Konuya göre soru getir
    getQuestionsBySubject(subject) {
        if (subject === 'mixed') {
            return this.shuffleArray([...this.questions]).slice(0, 10);
        }
        
        const filtered = this.questions.filter(q => q.subject === subject);
        const mixed = this.questions.filter(q => q.subject !== subject);
        
        // Konu sorularını karıştır ve 7 tane al, 3 tane de diğer konulardan
        const subjectQuestions = this.shuffleArray(filtered).slice(0, 7);
        const mixedQuestions = this.shuffleArray(mixed).slice(0, 3);
        
        return this.shuffleArray([...subjectQuestions, ...mixedQuestions]);
    }

    // Array karıştır
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
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

        if (tournament.participants.has(userId)) {
            return { success: false, error: 'Zaten katıldınız' };
        }

        const participant = {
            userId: userId,
            username: userInfo.username || `User_${userId.substring(0, 8)}`,
            score: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            answers: [],
            joinTime: Date.now(),
            suspiciousActivity: {
                points: 0,
                activities: []
            },
            isActive: true,
            lastActivity: Date.now()
        };

        tournament.participants.set(userId, participant);
        this.participants.set(userId, tournamentId);

        // Katılımcılara güncelleme gönder
        this.io.to(`tournament_${tournamentId}`).emit('participant_joined', {
            participant: {
                username: participant.username,
                userId: userId
            },
            totalParticipants: tournament.participants.size
        });

        console.log(`👤 ${participant.username} turnuvaya katıldı: ${tournament.name}`);
        
        return { 
            success: true, 
            tournament: this.getTournamentInfo(tournament),
            participant: participant
        };
    }

    // Turnuva başlat
    startTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'waiting') return;

        if (tournament.participants.size === 0) {
            console.log(`❌ Turnuva iptal edildi (katılımcı yok): ${tournament.name}`);
            this.tournaments.delete(tournamentId);
            return;
        }

        tournament.status = 'active';
        tournament.startTime = Date.now();
        tournament.currentQuestion = 0;

        // Tüm katılımcılara turnuva başladı mesajı
        this.io.to(`tournament_${tournamentId}`).emit('tournament_started', {
            tournament: this.getTournamentInfo(tournament),
            firstQuestion: this.getCurrentQuestion(tournament)
        });

        console.log(`🚀 Turnuva başladı: ${tournament.name} (${tournament.participants.size} katılımcı)`);

        // İlk soruyu başlat
        this.startQuestion(tournamentId);
    }

    // Soru başlat
    startQuestion(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'active') return;

        const question = this.getCurrentQuestion(tournament);
        if (!question) {
            this.finishTournament(tournamentId);
            return;
        }

        // Soru gönder
        this.io.to(`tournament_${tournamentId}`).emit('question_started', {
            questionNumber: tournament.currentQuestion + 1,
            totalQuestions: tournament.questions.length,
            question: {
                id: question.id,
                question: question.question,
                options: question.options,
                timeLimit: question.timeLimit
            },
            timeRemaining: question.timeLimit
        });

        console.log(`❓ Soru ${tournament.currentQuestion + 1} başladı: ${tournament.name}`);

        // Süre bitince sonraki soruya geç
        setTimeout(() => {
            this.nextQuestion(tournamentId);
        }, question.timeLimit * 1000);

        // Geri sayım gönder
        this.startQuestionCountdown(tournamentId, question.timeLimit);
    }

    // Geri sayım
    startQuestionCountdown(tournamentId, timeLimit) {
        let remaining = timeLimit;
        
        const countdown = setInterval(() => {
            remaining--;
            
            if (remaining <= 0) {
                clearInterval(countdown);
                return;
            }

            // Her 10 saniyede bir güncelleme gönder
            if (remaining % 10 === 0 || remaining <= 10) {
                this.io.to(`tournament_${tournamentId}`).emit('time_update', {
                    timeRemaining: remaining
                });
            }
        }, 1000);
    }

    // Cevap al
    submitAnswer(tournamentId, userId, questionId, answer, answerTime) {
        console.log(`=== Submit Answer Debug ===`);
        console.log(`Tournament ID: ${tournamentId}`);
        console.log(`User ID: ${userId}`);
        console.log(`Question ID: ${questionId}`);
        console.log(`Answer: ${answer}`);
        console.log(`Answer Time: ${answerTime}`);
        
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
        
        if (!participant.isActive) {
            console.log(`ERROR: Participant not active: ${userId}`);
            return { success: false, error: 'Katılımcı aktif değil' };
        }

        const currentQuestion = this.getCurrentQuestion(tournament);
        if (!currentQuestion) {
            console.log(`ERROR: No current question`);
            return { success: false, error: 'Aktif soru yok' };
        }
        
        if (currentQuestion.id !== questionId) {
            console.log(`ERROR: Question ID mismatch. Expected: ${currentQuestion.id}, Got: ${questionId}`);
            return { success: false, error: 'Soru ID uyuşmuyor' };
        }

        // Zaten cevapladı mı kontrol et
        const existingAnswer = participant.answers.find(a => a.questionId === questionId);
        if (existingAnswer) {
            return { success: false, error: 'Bu soruyu zaten cevapladınız' };
        }

        // Cevap kaydet
        const isCorrect = answer === currentQuestion.correct;
        const answerData = {
            questionId: questionId,
            answer: answer,
            isCorrect: isCorrect,
            answerTime: answerTime,
            timestamp: Date.now()
        };

        participant.answers.push(answerData);
        participant.lastActivity = Date.now();

        // Puan hesapla
        if (isCorrect) {
            participant.correctAnswers++;
            let points = 10; // Temel puan

            // Hız bonusu
            if (answerTime <= 30) points += 5;
            else if (answerTime <= 60) points += 3;
            else if (answerTime <= 90) points += 1;

            // Zorluk bonusu
            if (currentQuestion.difficulty === 'medium') points = Math.floor(points * 1.5);
            else if (currentQuestion.difficulty === 'hard') points = Math.floor(points * 2);

            participant.score += points;
        } else {
            participant.wrongAnswers++;
        }

        // Şüpheli aktivite kontrolü
        this.checkSuspiciousActivity(participant, answerTime, isCorrect);

        // Liderboard güncelle
        this.updateLeaderboard(tournament);

        // Cevap sonucunu gönder
        this.io.to(userId).emit('answer_result', {
            isCorrect: isCorrect,
            correctAnswer: currentQuestion.correct,
            explanation: currentQuestion.explanation || '',
            points: isCorrect ? (participant.score - (participant.answers.length - 1) * 10) : 0,
            totalScore: participant.score,
            rank: this.getUserRank(tournament, userId)
        });

        console.log(`📝 ${participant.username} cevap verdi: ${isCorrect ? 'Doğru' : 'Yanlış'} (${answerTime}s)`);

        return { success: true };
    }

    // Şüpheli aktivite kontrolü
    checkSuspiciousActivity(participant, answerTime, isCorrect) {
        // Çok hızlı cevap
        if (answerTime < 3) {
            this.addSuspiciousActivity(participant, 'VERY_FAST_ANSWER', 15);
        }

        // Robot benzeri pattern
        if (participant.answers.length >= 3) {
            const lastThreeTimes = participant.answers.slice(-3).map(a => a.answerTime);
            const avgTime = lastThreeTimes.reduce((a, b) => a + b) / 3;
            const variance = lastThreeTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / 3;
            
            if (variance < 1 && avgTime < 10) { // Çok düşük varyans + hızlı
                this.addSuspiciousActivity(participant, 'ROBOTIC_PATTERN', 25);
            }
        }

        // Anormal yüksek başarı
        if (participant.answers.length >= 5) {
            const recentCorrect = participant.answers.slice(-5).filter(a => a.isCorrect).length;
            const avgTime = participant.answers.slice(-5).reduce((sum, a) => sum + a.answerTime, 0) / 5;
            
            if (recentCorrect >= 4 && avgTime < 15) {
                this.addSuspiciousActivity(participant, 'SUSPICIOUS_ACCURACY', 20);
            }
        }
    }

    // Şüpheli aktivite ekle
    addSuspiciousActivity(participant, type, points) {
        participant.suspiciousActivity.points += points;
        participant.suspiciousActivity.activities.push({
            type: type,
            points: points,
            timestamp: Date.now()
        });

        console.log(`⚠️ Şüpheli aktivite: ${participant.username} - ${type} (+${points} puan)`);

        // Diskalifiye kontrolü
        if (participant.suspiciousActivity.points >= 50) {
            this.disqualifyParticipant(participant);
        }
    }

    // Katılımcıyı diskalifiye et
    disqualifyParticipant(participant) {
        participant.isActive = false;
        participant.disqualified = true;
        participant.disqualifyReason = 'Şüpheli aktivite tespit edildi';

        console.log(`❌ Diskalifiye: ${participant.username}`);

        // Kullanıcıya bildirim gönder
        this.io.to(participant.userId).emit('disqualified', {
            reason: participant.disqualifyReason,
            suspiciousActivities: participant.suspiciousActivity.activities
        });
    }

    // Sonraki soru
    nextQuestion(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'active') return;

        tournament.currentQuestion++;
        
        if (tournament.currentQuestion >= tournament.questions.length) {
            this.finishTournament(tournamentId);
        } else {
            this.startQuestion(tournamentId);
        }
    }

    // Turnuva bitir
    finishTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return;

        tournament.status = 'finished';
        tournament.endTime = Date.now();

        // Final liderboard
        this.updateLeaderboard(tournament);

        // Ödülleri dağıt
        this.distributeRewards(tournament);

        // Sonuçları gönder
        this.io.to(`tournament_${tournamentId}`).emit('tournament_finished', {
            leaderboard: tournament.leaderboard,
            statistics: this.getTournamentStatistics(tournament)
        });

        console.log(`🏁 Turnuva bitti: ${tournament.name}`);

        // Katılımcıları temizle
        tournament.participants.forEach((participant, userId) => {
            this.participants.delete(userId);
        });

        // 1 saat sonra turnuvayı sil
        setTimeout(() => {
            this.tournaments.delete(tournamentId);
        }, 60 * 60 * 1000);
    }

    // Liderboard güncelle
    updateLeaderboard(tournament) {
        const leaderboard = Array.from(tournament.participants.values())
            .filter(p => p.isActive)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
                return a.answers.reduce((sum, ans) => sum + ans.answerTime, 0) - 
                       b.answers.reduce((sum, ans) => sum + ans.answerTime, 0);
            })
            .map((participant, index) => ({
                rank: index + 1,
                userId: participant.userId,
                username: participant.username,
                score: participant.score,
                correctAnswers: participant.correctAnswers,
                wrongAnswers: participant.wrongAnswers,
                totalAnswers: participant.answers.length,
                accuracy: participant.answers.length > 0 ? 
                    Math.round((participant.correctAnswers / participant.answers.length) * 100) : 0
            }));

        tournament.leaderboard = leaderboard;

        // Canlı liderboard gönder
        this.io.to(`tournament_${tournamentId}`).emit('leaderboard_update', {
            leaderboard: leaderboard.slice(0, 10) // İlk 10'u gönder
        });
    }

    // Ödül dağıt
    distributeRewards(tournament) {
        const leaderboard = tournament.leaderboard;
        
        leaderboard.forEach((participant, index) => {
            let reward = { points: 10, badges: [] }; // Temel katılım ödülü

            if (index === 0) { // 1. sıra
                reward.points = 100;
                reward.badges.push('GOLD_MEDAL');
                reward.premiumDays = 1;
            } else if (index === 1) { // 2. sıra
                reward.points = 75;
                reward.badges.push('SILVER_MEDAL');
            } else if (index === 2) { // 3. sıra
                reward.points = 50;
                reward.badges.push('BRONZE_MEDAL');
            } else if (index < 10) { // İlk 10
                reward.points = 25;
                reward.badges.push('TOP_10');
            }

            // Özel rozetler
            if (participant.accuracy === 100 && participant.totalAnswers >= 5) {
                reward.badges.push('PERFECT_SCORE');
                reward.points += 20;
            }

            // Ödülü gönder
            this.io.to(participant.userId).emit('tournament_reward', reward);
        });
    }

    // Mevcut soru getir
    getCurrentQuestion(tournament) {
        if (tournament.currentQuestion >= tournament.questions.length) return null;
        return tournament.questions[tournament.currentQuestion];
    }

    // Kullanıcı sıralaması
    getUserRank(tournament, userId) {
        const participant = tournament.participants.get(userId);
        if (!participant) return null;

        const sorted = Array.from(tournament.participants.values())
            .filter(p => p.isActive)
            .sort((a, b) => b.score - a.score);

        return sorted.findIndex(p => p.userId === userId) + 1;
    }

    // Turnuva bilgisi
    getTournamentInfo(tournament) {
        return {
            id: tournament.id,
            name: tournament.name,
            subject: tournament.subject,
            status: tournament.status,
            participantCount: tournament.participants.size,
            maxParticipants: tournament.maxParticipants,
            currentQuestion: tournament.currentQuestion,
            totalQuestions: tournament.questions.length,
            startTime: tournament.startTime,
            createdAt: tournament.createdAt
        };
    }

    // Turnuva istatistikleri
    getTournamentStatistics(tournament) {
        const participants = Array.from(tournament.participants.values());
        const activeParticipants = participants.filter(p => p.isActive);

        return {
            totalParticipants: participants.length,
            activeParticipants: activeParticipants.length,
            disqualified: participants.length - activeParticipants.length,
            averageScore: activeParticipants.length > 0 ? 
                Math.round(activeParticipants.reduce((sum, p) => sum + p.score, 0) / activeParticipants.length) : 0,
            averageAccuracy: activeParticipants.length > 0 ?
                Math.round(activeParticipants.reduce((sum, p) => sum + (p.correctAnswers / Math.max(p.answers.length, 1)), 0) / activeParticipants.length * 100) : 0
        };
    }

    // Aktif turnuvaları getir
    getActiveTournaments() {
        return Array.from(this.tournaments.values())
            .filter(t => t.status === 'waiting' || t.status === 'active')
            .map(t => this.getTournamentInfo(t));
    }

    // Kullanıcının aktif turnuvası
    getUserActiveTournament(userId) {
        const tournamentId = this.participants.get(userId);
        if (!tournamentId) return null;

        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status === 'finished') {
            this.participants.delete(userId);
            return null;
        }

        return {
            tournament: this.getTournamentInfo(tournament),
            participant: tournament.participants.get(userId),
            currentQuestion: tournament.status === 'active' ? this.getCurrentQuestion(tournament) : null,
            leaderboard: tournament.leaderboard.slice(0, 10)
        };
    }
}

module.exports = TournamentSystem;
