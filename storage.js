// Local Storage Management
const STORAGE = {
    KEY: 'limen_v1',
    VERSION: '1.1.0',
    
    // Initialize storage
    init() {
        let data = this.getData();
        if (!data || data.version !== this.VERSION) {
            // Initialize or migrate
            data = {
                version: this.VERSION,
                sessionHistory: [],
                userProfile: {
                    joined: new Date().toISOString(),
                    notificationEnabled: false,
                    lastStateSelection: null,
                    lastSelectedState: null,
                    lastSummaryShown: null,
                    lastMondayPrompt: null,
                    totalReturnToBaseline: 0
                },
                settings: {
                    darkMode: true,
                    autoClose: true,
                    hapticFeedback: true,
                    soundEnabled: false
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
                }
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
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
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
        session.week = this.getWeekStartDate(); // Track which week
        
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
        }
        
        // Keep only last 500 sessions
        if (data.sessionHistory.length > 500) {
            data.sessionHistory = data.sessionHistory.slice(-500);
        }
        
        this.setData(data);
        return session;
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

    // Get statistics
    getStats() {
        const history = this.getSessionHistory(30);
        if (history.length === 0) return null;
        
        const feedbackCounts = history.reduce((acc, session) => {
            const feedback = session.feedback || 'none';
            acc[feedback] = (acc[feedback] || 0) + 1;
            return acc;
        }, {});
        
        const totalSessions = history.length;
        const yesCount = feedbackCounts.yes || 0;
        const effectivenessRate = Math.round((yesCount / totalSessions) * 100);
        
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
        
        return {
            totalSessions,
            effectivenessRate,
            avgDuration,
            feedbackCounts,
            stateFrequency,
            last7Days: this.getSessionHistory(7).length,
            returnToBaselineCount: yesCount,
            weeklyStats: this.getData()?.weeklyStats || {}
        };
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
    }
};

// Initialize storage on load
STORAGE.init();
