// Local Storage Management
const STORAGE = {
    KEY: 'limen_v1',
    VERSION: '1.0.1',
    
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
                    lastStateSelection: null
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
                    firstUse: new Date().toISOString(),
                    lastUse: null
                }
            };
            this.setData(data);
        }
        return data;
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
        
        data.sessionHistory.push(session);
        
        // Update app stats
        data.appStats.totalSessions++;
        data.appStats.totalTime += (session.duration || 0);
        data.appStats.lastUse = session.timestamp;
        
        // Keep only last 200 sessions
        if (data.sessionHistory.length > 200) {
            data.sessionHistory = data.sessionHistory.slice(-200);
        }
        
        this.setData(data);
        return session;
    },

    // Get session history
    getSessionHistory(days = 7) {
        const data = this.getData();
        if (!data || !data.sessionHistory) return [];
        
        if (days === 'all') return data.sessionHistory;
        
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return data.sessionHistory.filter(session => {
            return new Date(session.timestamp) >= cutoff;
        });
    },

    // Get last session
    getLastSession() {
        const data = this.getData();
        if (!data || !data.sessionHistory.length) return null;
        
        return data.sessionHistory[data.sessionHistory.length - 1];
    },

    // Get statistics
    getStats() {
        const history = this.getSessionHistory(30);
        if (history.length === 0) return null;
        
        const feedbackCounts = history.reduce((acc, session) => {
            acc[session.feedback] = (acc[session.feedback] || 0) + 1;
            return acc;
        }, {});
        
        const totalSessions = history.length;
        const effectivenessRate = feedbackCounts.yes ? 
            Math.round((feedbackCounts.yes / totalSessions) * 100) : 0;
        
        const avgDuration = Math.round(
            history.reduce((sum, session) => sum + (session.duration || 0), 0) / totalSessions
        );
        
        // Calculate streak (consecutive days with at least one session)
        const daysWithSessions = [...new Set(
            history.map(s => new Date(s.timestamp).toDateString())
        )].length;
        
        return {
            totalSessions,
            effectivenessRate,
            avgDuration,
            feedbackCounts,
            last7Days: this.getSessionHistory(7).length,
            daysWithSessions,
            currentStreak: this.calculateCurrentStreak()
        };
    },

    // Calculate current streak
    calculateCurrentStreak() {
        const history = this.getSessionHistory('all');
        if (history.length === 0) return 0;
        
        const today = new Date().toDateString();
        const dates = [...new Set(
            history.map(s => new Date(s.timestamp).toDateString())
        )].sort();
        
        let streak = 0;
        let currentDate = new Date();
        
        // Check consecutive days backward from today
        while (true) {
            const dateStr = currentDate.toDateString();
            if (dates.includes(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    },

    // Update user setting
    updateSetting(key, value) {
        const data = this.getData();
        if (data && data.settings) {
            data.settings[key] = value;
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
        return this.updateProfile('
