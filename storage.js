// Local Storage Management
const STORAGE = {
    KEY: 'limen_v1',
    
    init() {
        if (!this.getData()) {
            this.setData({
                sessionHistory: [],
                userProfile: {
                    joined: new Date().toISOString(),
                    notificationEnabled: false
                },
                settings: {
                    darkMode: true,
                    autoClose: true
                }
            });
        }
    },

    getData() {
        const data = localStorage.getItem(this.KEY);
        return data ? JSON.parse(data) : null;
    },

    setData(data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    },

    addSession(session) {
        const data = this.getData();
        session.id = Date.now();
        session.timestamp = new Date().toISOString();
        
        data.sessionHistory.push(session);
        
        // Keep only last 100 sessions
        if (data.sessionHistory.length > 100) {
            data.sessionHistory = data.sessionHistory.slice(-100);
        }
        
        this.setData(data);
        return session;
    },

    getSessionHistory(days = 7) {
        const data = this.getData();
        if (!data || !data.sessionHistory) return [];
        
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return data.sessionHistory.filter(session => {
            return new Date(session.timestamp) >= cutoff;
        });
    },

    getLastSession() {
        const data = this.getData();
        if (!data || !data.sessionHistory.length) return null;
        
        return data.sessionHistory[data.sessionHistory.length - 1];
    },

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
        
        return {
            totalSessions,
            effectivenessRate,
            avgDuration,
            feedbackCounts,
            last7Days: this.getSessionHistory(7).length
        };
    },

    updateSetting(key, value) {
        const data = this.getData();
        data.settings[key] = value;
        this.setData(data);
    },

    enableNotifications() {
        const data = this.getData();
        data.userProfile.notificationEnabled = true;
        data.userProfile.notificationEnabledAt = new Date().toISOString();
        this.setData(data);
    },

    disableNotifications() {
        const data = this.getData();
        data.userProfile.notificationEnabled = false;
        this.setData(data);
    },

    clearData() {
        localStorage.removeItem(this.KEY);
        this.init();
    }
};

// Initialize storage
STORAGE.init();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STORAGE;
}
