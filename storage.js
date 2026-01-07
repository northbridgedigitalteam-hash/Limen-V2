// Local Storage Management
const STORAGE = {
    KEY: 'limen_v1',
    VERSION: '1.2.0',
    
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
                    totalReturnToBaseline: 0,
                    deviceId: this.generateDeviceId(),
                    preferences: {
                        hapticFeedback: true,
                        ambientAudio: false,
                        zenMode: false
                    }
                },
                appStats: {
                    totalSessions: 0,
                    totalTime: 0,
                    totalReturnToBaseline: 0,
                    firstUse: new Date().toISOString(),
                    lastUse: null,
                    currentStreak: 0
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

    // Generate unique device ID
    generateDeviceId() {
        return 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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
        }
        
        // Update streak
        this.updateStreak(data);
        
        // Keep only last 500 sessions
        if (data.sessionHistory.length > 500) {
            data.sessionHistory = data.sessionHistory.slice(-500);
        }
        
        this.setData(data);
        return session;
    },

    // Update streak calculation
    updateStreak(data) {
        if (!data.sessionHistory || data.sessionHistory.length === 0) {
            data.appStats.currentStreak = 0;
            return;
        }
        
        const today = new Date().toDateString();
        const uniqueDates = new Set();
        
        // Get unique dates with sessions
        data.sessionHistory.forEach(session => {
            const sessionDate = new Date(session.timestamp).toDateString();
            uniqueDates.add(sessionDate);
        });
        
        // Sort dates
        const sortedDates = Array.from(uniqueDates).sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        let currentDate = new Date();
        
        // Check consecutive days from today backward
        while (true) {
            const dateStr = currentDate.toDateString();
            if (sortedDates.includes(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        data.appStats.currentStreak = streak;
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
        
        return {
            totalSessions,
            effectivenessRate,
            avgDuration,
            feedbackCounts,
            stateFrequency,
            last7Days: this.getSessionHistory(7).length,
            returnToBaselineCount: yesCount,
            weeklyStats: data.weeklyStats,
            currentStreak: data.appStats.currentStreak,
            preferences: data.userProfile.preferences
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
