// Push Notification Logic
class PushManager {
    constructor() {
        this.notificationCooldown = 2 * 60 * 60 * 1000; // 2 hours
        this.lastNotificationTime = null;
        this.maxDailyNotifications = 2;
    }

    checkNotifications() {
        const now = new Date();
        const data = STORAGE.getData();
        
        if (!data.userProfile.notificationEnabled) return false;
        
        // Check daily limit
        const todayNotifications = data.sessionHistory.filter(session => {
            const sessionDate = new Date(session.timestamp);
            return sessionDate.toDateString() === now.toDateString() && 
                   session.notificationTriggered;
        }).length;
        
        if (todayNotifications >= this.maxDailyNotifications) return false;
        
        // Check cooldown
        if (this.lastNotificationTime && 
            (now - this.lastNotificationTime) < this.notificationCooldown) {
            return false;
        }
        
        // Check if user needs intervention
        const shouldNotify = this.shouldSendNotification();
        
        if (shouldNotify) {
            this.sendNotification();
            this.lastNotificationTime = now;
            return true;
        }
        
        return false;
    }

    shouldSendNotification() {
        const history = STORAGE.getSessionHistory(1);
        const now = new Date();
        const hour = now.getHours();
        
        // No sessions today
        if (history.length === 0 && hour >= 10) {
            return true;
        }
        
        // Multiple sessions recently (stress pattern)
        if (history.length >= 3) {
            const recentSessions = history.slice(-3);
            const timeSpan = (new Date(recentSessions[2].timestamp) - 
                            new Date(recentSessions[0].timestamp)) / (1000 * 60);
            if (timeSpan < 30) {
                return true;
            }
        }
        
        // Late day, no positive sessions
        if (hour >= 20) {
            const positiveSessions = history.filter(s => s.feedback === 'yes');
            if (positiveSessions.length === 0) {
                return true;
            }
        }
        
        return false;
    }

    sendNotification() {
        const messages = [
            "Pause for 60 seconds.",
            "Before you continue — stop.",
            "Reduce load now.",
            "Reset your nervous system.",
            "60 seconds to baseline.",
            "Interrupt the pattern."
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('LIMEN', {
                body: randomMessage,
                icon: '/icon-192.png',
                badge: '/icon-72.png',
                requireInteraction: false,
                silent: true
            });
            
            // Log notification
            const data = STORAGE.getData();
            data.sessionHistory.push({
                type: 'notification',
                message: randomMessage,
                timestamp: new Date().toISOString(),
                notificationTriggered: true
            });
            STORAGE.setData(data);
        }
    }

    schedulePeriodicChecks() {
        // Check every hour
        setInterval(() => {
            this.checkNotifications();
        }, 60 * 60 * 1000);
        
        // Also check when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkNotifications();
            }
        });
    }
}

// Initialize push manager
window.pushManager = new PushManager();

// Schedule checks when app loads
window.addEventListener('load', () => {
    setTimeout(() => {
        window.pushManager.schedulePeriodicChecks();
    }, 5000);
});
