// Local Storage Management - ENHANCED
const STORAGE = {
    KEY: 'limen_v1',
    VERSION: '1.2.0',
    
    // Initialize storage
    init() {
        let data = this.getData();
        if (!data || data.version !== this.VERSION) {
            // Initialize with psychological tracking
            data = {
                version: this.VERSION,
                sessionHistory: [],
                userProfile: {
                    joined: new Date().toISOString(),
                    notificationEnabled: false,
                    lastStateSelection: null,
                    lastSelectedState: null,
                    lastSummaryShown: null,
                    totalReturnToBaseline: 0,
                    psychologicalPatterns: [],
                    currentStreak: 0,
                    bestStreak: 0
                },
                appStats: {
                    totalSessions: 0,
                    totalTime: 0,
                    totalReturnToBaseline: 0,
                    firstUse: new Date().toISOString(),
                    lastUse: null
                },
                weeklyStats: {
                    currentWeekStart: this.getWeekStartDate(),
                    sessionsThisWeek: 0,
                    returnToBaselineThisWeek: 0
                },
                patternInsights: []
            };
            this.setData(data);
        }
        
        // Update week tracking if needed
        this.updateWeekTracking();
        return data;
    },

    // Get week start date (Monday)
    getWeekStartDate() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString();
    },

    // Check and update week tracking
    updateWeekTracking() {
        const data = this.getData();
        if (!data) return;
        
        const currentWeekStart = this.getWeekStartDate();
        const storedWeekStart = data.weeklyStats.currentWeekStart;
        
        if (storedWeekStart !== currentWeekStart) {
            // New week, reset weekly stats
            data.weeklyStats = {
                currentWeekStart: currentWeekStart,
                sessionsThisWeek: 0,
                returnToBaselineThisWeek: 0
            };
            this.setData(data);
        }
    },

    // Get all data
    getData() {
        try {
            const data = localStorage.getItem(this.KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading storage:', error);
            return null;
        }
    },

    // Save all data
    setData(data) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving storage:', error);
            return false;
        }
    },

    // Add a new session
    addSession(session) {
        const data = this.getData();
        if (!data) return null;
        
        session.id = Date.now() + Math.random().toString(36).substr(2, 9);
        session.timestamp = new Date().toISOString();
        session.week = this.getWeekStartDate();
        
        data.sessionHistory.push(session);
        
        // Update app stats
        data.appStats.totalSessions++;
        data.appStats.totalTime += (session.duration || 0);
        data.appStats.lastUse = session.timestamp;
        
        // Update weekly stats
        data.weeklyStats.sessionsThisWeek++;
        
        // Track return to baseline
        if (session.returnedToBaseline) {
            data.appStats.totalReturnToBaseline++;
            data.userProfile.totalReturnToBaseline++;
            data.weeklyStats.returnToBaselineThisWeek++;
            
            // Update streak
            this.updateStreak(data, true);
        } else {
            // Break streak on unsuccessful regulation
            this.updateStreak(data, false);
        }
        
        // Generate psychological insight if returned to baseline
        if (session.returnedToBaseline) {
            this.generatePsychologicalInsight(data, session);
        }
        
        // Keep only last 500 sessions
        if (data.sessionHistory.length > 500) {
            data.sessionHistory = data.sessionHistory.slice(-500);
        }
        
        this.setData(data);
        return session;
    },

    // Update streak
    updateStreak(data, success) {
        if (success) {
            data.userProfile.currentStreak++;
            if (data.userProfile.currentStreak > data.userProfile.bestStreak) {
                data.userProfile.bestStreak = data.userProfile.currentStreak;
            }
        } else {
            data.userProfile.currentStreak = 0;
        }
    },

    // Generate psychological insight
    generatePsychologicalInsight(data, session) {
        if (data.sessionHistory.length < 3) return;
        
        const recentSessions = data.sessionHistory.slice(-10);
        
        // Pattern recognition
        const insight = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            dominantPattern: this.identifyDominantPattern(recentSessions),
            effectivenessTrend: this.calculateEffectivenessTrend(recentSessions),
            timePattern: this.identifyTimePattern(recentSessions),
            stateFrequency: this.calculateStateFrequency(recentSessions),
            psychologicalTip: this.generatePsychologicalTip(recentSessions)
        };
        
        data.patternInsights.push(insight);
        
        // Keep only last 10 insights
        if (data.patternInsights.length > 10) {
            data.patternInsights = data.patternInsights.slice(-10);
        }
        
        this.setData(data);
        return insight;
    },

    // Identify dominant pattern
    identifyDominantPattern(sessions) {
        if (sessions.length < 3) return null;
        
        const stateCount = {};
        sessions.forEach(s => {
            if (s.state) {
                stateCount[s.state] = (stateCount[s.state] || 0) + 1;
            }
        });
        
        const mostFrequent = Object.entries(stateCount)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (mostFrequent && mostFrequent[1] >= sessions.length * 0.4) {
            return {
                state: mostFrequent[0],
                frequency: mostFrequent[1],
                percentage: Math.round((mostFrequent[1] / sessions.length) * 100)
            };
        }
        
        return null;
    },

    // Calculate effectiveness trend
    calculateEffectivenessTrend(sessions) {
        if (sessions.length < 4) return 'insufficient_data';
        
        const half = Math.floor(sessions.length / 2);
        const firstHalf = sessions.slice(0, half);
        const secondHalf = sessions.slice(half);
        
        const effectiveness1 = firstHalf.filter(s => s.feedback === 'yes').length / firstHalf.length;
        const effectiveness2 = secondHalf.filter(s => s.feedback === 'yes').length / secondHalf.length;
        
        if (effectiveness2 > effectiveness1 + 0.15) return 'improving';
        if (effectiveness2 < effectiveness1 - 0.15) return 'declining';
        return 'stable';
    },

    // Identify time pattern
    identifyTimePattern(sessions) {
        const times = sessions.map(s => {
            const hour = new Date(s.timestamp).getHours();
            if (hour < 12) return 'morning';
            if (hour < 17) return 'afternoon';
            return 'evening';
        });
        
        const timeCount = { morning: 0, afternoon: 0, evening: 0 };
        times.forEach(time => timeCount[time]++);
        
        const mostCommon = Object.entries(timeCount)
            .sort((a, b) => b[1] - a[1])[0];
        
        return mostCommon[0];
    },

    // Calculate state frequency
    calculateStateFrequency(sessions) {
        const stateCount = {};
        sessions.forEach(s => {
            if (s.state) {
                stateCount[s.state] = (stateCount[s.state] || 0) + 1;
            }
        });
        
        return Object.entries(stateCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4); // Top 4 states
    },

    // Generate psychological tip based on patterns
    generatePsychologicalTip(sessions) {
        const patterns = this.identifyDominantPattern(sessions);
        const trend = this.calculateEffectivenessTrend(sessions);
        
        if (patterns && patterns.percentage > 50) {
            const state = patterns.state;
            const tips = {
                'CognitiveOverdrive': 'Your brain is showing a pattern of cognitive overload. Try scheduling "thinking breaks" before overwhelm sets in.',
                'SomaticTension': 'Your body is holding tension consistently. Consider a daily 5-minute body scan to release stored stress.',
                'RecoveryDebt': 'You\'re accumulating recovery debt. Schedule intentional rest before exhaustion hits.',
                'Hypervigilance': 'Your nervous system is often on high alert. Practice grounding techniques throughout the day.',
                'EmotionalLoad': 'You experience frequent emotional waves. Try naming emotions as they arise to create distance.',
                'ShutdownDrift': 'You tend toward shutdown when overwhelmed. Set micro-reminders to stay present.'
            };
            return tips[state] || 'Consistent regulation builds nervous system resilience.';
        }
        
        if (trend === 'improving') {
            return 'Your regulation effectiveness is improving! This shows your nervous system is learning to self-regulate.';
        }
        
        return 'Regular regulation strengthens the vagus nerve, improving your stress response over time.';
    },

    // Get session history
    getSessionHistory(days = 7) {
        const data = this.getData();
        if (!data || !data.sessionHistory) return [];
        
        if (days === 'all') return data.sessionHistory;
        if (days === 'week') {
            const weekStart = this.getWeekStartDate();
            return data.sessionHistory.filter(session => 
                session.week === weekStart
            );
        }
        
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return data.sessionHistory.filter(session => {
            return new Date(session.timestamp) >= cutoff;
        });
    },

    // Get statistics with psychological insights
    getStats() {
        const history = this.getSessionHistory(30);
        const weeklyHistory = this.getSessionHistory('week');
        const data = this.getData();
        
        if (!data) return null;
        
        const feedbackCounts = history.reduce((acc, session) => {
            const feedback = session.feedback || 'none';
            acc[feedback] = (acc[feedback] || 0) + 1;
            return acc;
        }, {});
        
        const totalSessions = history.length;
        const yesCount = feedbackCounts.yes || 0;
        const effectivenessRate = totalSessions > 0 ? Math.round((yesCount / totalSessions) * 100) : 0;
        
        const durations = history.map(s => s.duration || 0).filter(d => d > 0);
        const avgDuration = durations.length > 0 
            ? Math.round(durations.reduce((a, b) => a + b) / durations.length)
            : 0;
        
        // Calculate state distribution
        const stateFrequency = {};
        history.forEach(session => {
            if (session.state) {
                stateFrequency[session.state] = (stateFrequency[session.state] || 0) + 1;
            }
        });
        
        // Get latest psychological insight
        const latestInsight = data.patternInsights.slice(-1)[0];
        
        return {
            totalSessions,
            effectivenessRate,
            avgDuration,
            feedbackCounts,
            stateFrequency,
            last7Days: this.getSessionHistory(7).length,
            returnToBaselineCount: yesCount,
            weeklyStats: data.weeklyStats,
            currentStreak: data.userProfile.currentStreak || 0,
            bestStreak: data.userProfile.bestStreak || 0,
            psychologicalInsight: latestInsight,
            patterns: this.identifyDominantPattern(history)
        };
    },

    // Update user setting
    updateSetting(key, value) {
        const data = this.getData();
        if (data && data.userProfile && data.userProfile.preferences) {
            data.userProfile.preferences[key] = value;
            this.setData(data);
            return true;
        }
        return false;
    },

    // Update user profile
    updateProfile(key, value) {
        const data = this.getData();
        if (data && data.userProfile) {
            data.userProfile[key] = value;
            this.setData(data);
            return true;
        }
        return false;
    },

    // Enable notifications
    enableNotifications() {
        return this.updateProfile('notificationEnabled', true);
    },

    // Disable notifications
    disableNotifications() {
        return this.updateProfile('notificationEnabled', false);
    },

    // Record state selection
    recordStateSelection() {
        return this.updateProfile('lastStateSelection', new Date().toISOString());
    },

    // Clear all data
    clearData() {
        try {
            localStorage.removeItem(this.KEY);
            this.init();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },

    // Export data as JSON
    exportData() {
        return JSON.stringify(this.getData(), null, 2);
    },

    // Import data from JSON
    importData(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            const currentData = this.getData();
            
            // Merge data carefully
            const mergedData = {
                ...currentData,
                ...importedData,
                version: this.VERSION,
                sessionHistory: [...(currentData?.sessionHistory || []), ...(importedData.sessionHistory || [])],
                userProfile: {
                    ...currentData?.userProfile,
                    ...importedData.userProfile
                },
                settings: {
                    ...currentData?.settings,
                    ...importedData.settings
                }
            };
            
            this.setData(mergedData);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
};

// Initialize storage on load
STORAGE.init();

// Export for debugging
window.STORAGE = STORAGE;
