// Push Notification Manager
class PushManager {
    constructor() {
        this.notificationCooldown = 2 * 60 * 60 * 1000; // 2 hours
        this.lastNotificationTime = null;
        this.maxDailyNotifications = 3;
        this.notificationCheckInterval = null;
        this.environmentCheckInterval = null;
        
        this.init();
    }

    async init() {
        // Check for notification permission
        await this.checkPermission();
        
        // Start periodic checks
        this.startPeriodicChecks();
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => this.checkNotifications(), 5000);
            }
        });
    }

    // Check and request notification permission
    async checkPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            STORAGE.enableNotifications();
            return true;
        }
        
        if (Notification.permission === 'default') {
            try {
                // Request permission on user interaction
                const requestPermission = () => {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            STORAGE.enableNotifications();
                            console.log('Notification permission granted');
                        }
                    });
                };
                
                // Request on first button click
                document.addEventListener('click', function onClick() {
                    requestPermission();
                    document.removeEventListener('click', onClick);
                }, { once: true });
                
            } catch (error) {
                console.log('Error requesting notification permission:', error);
            }
        }
        
        return false;
    }

    // Start periodic notification checks
    startPeriodicChecks() {
        if (this.notificationCheckInterval) {
            clearInterval(this.notificationCheckInterval);
        }
        
        // Check every 30 minutes
        this.notificationCheckInterval = setInterval(() => {
            this.checkNotifications();
        }, 30 * 60 * 1000);
        
        // Initial check after 2 minutes
        setTimeout(() => this.checkNotifications(), 120000);
    }

    // Check if we should send a notification
    async checkNotifications() {
        const data = STORAGE.getData();
        if (!data || !data.userProfile.notificationEnabled) {
            return false;
        }
        
        // Check daily limit
        const todayNotifications = this.getTodayNotificationCount();
        if (todayNotifications >= this.maxDailyNotifications) {
            return false;
        }
        
        // Check cooldown
        if (this.lastNotificationTime && 
            (Date.now() - this.lastNotificationTime) < this.notificationCooldown) {
            return false;
        }
        
        // Check if user needs intervention
        const shouldNotify = await this.shouldSendNotification();
        
        if (shouldNotify) {
            this.sendNotification();
            this.lastNotificationTime = Date.now();
            this.recordNotification();
            return true;
        }
        
        return false;
    }

    // Get today's notification count
    getTodayNotificationCount() {
        const history = STORAGE.getSessionHistory(1);
        const today = new Date().toDateString();
        
        return history.filter(session => 
            session.type === 'notification' && 
            new Date(session.timestamp).toDateString() === today
        ).length;
    }

    // Determine if we should send a notification
    async shouldSendNotification() {
        const history = STORAGE.getSessionHistory(1);
        const now = new Date();
        const hour = now.getHours();
        
        // Rule 1: No sessions today and it's past morning
        if (history.length === 0 && hour >= 10 && hour <= 20) {
            return true;
        }
        
        // Rule 2: Multiple sessions recently (stress pattern)
        if (history.length >= 3) {
            const recentSessions = history.slice(-3);
            const timeSpan = (new Date(recentSessions[2].timestamp) - 
                            new Date(recentSessions[0].timestamp)) / (1000 * 60);
            if (timeSpan < 30) {
                return true;
            }
        }
        
        // Rule 3: Late day, no positive sessions
        if (hour >= 20) {
            const positiveSessions = history.filter(s => s.feedback === 'yes');
            if (positiveSessions.length === 0) {
                return true;
            }
        }
        
        // Rule 4: User has been inactive for a while
        const lastSession = STORAGE.getLastSession();
        if (lastSession) {
            const lastSessionTime = new Date(lastSession.timestamp);
            const hoursSinceLast = (now - lastSessionTime) / (1000 * 60 * 60);
            
            if (hoursSinceLast >= 6 && hour >= 9 && hour <= 21) {
                return true;
            }
        }
        
        // Rule 5: Check environment patterns
        if (window.environmentSensor) {
            const loadEstimate = window.environmentSensor.estimateCognitiveLoad();
            if (loadEstimate && loadEstimate.confidence > 0.5) {
                return true;
            }
        }
        
        return false;
    }

    // Send a notification
    sendNotification() {
        const messages = [
            "Pause for 60 seconds.",
            "Before you continue — stop.",
            "Reduce load now.",
            "Reset your nervous system.",
            "60 seconds to baseline.",
            "Interrupt the pattern.",
            "Your nervous system needs a break.",
            "Regulate before continuing."
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notification = new Notification('LIMEN', {
                    body: randomMessage,
                    icon: 'icon-192.png',
                    badge: 'icon-192.png',
                    requireInteraction: false,
                    silent: true,
                    tag: 'limen-regulation',
                    renotify: false,
                    data: {
                        url: window.location.origin,
                        timestamp: Date.now()
                    }
                });
                
                // Handle notification click
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                    
                    // Could trigger app to open intervention
                    if (window.app) {
                        window.app.showScreen('state');
                    }
                };
                
                // Auto-close after 10 seconds
                setTimeout(() => {
                    notification.close();
                }, 10000);
                
                return true;
            } catch (error) {
                console.log('Error sending notification:', error);
                return false;
            }
        }
        
        return false;
    }

    // Record notification in history
    recordNotification() {
        const notification = {
            type: 'notification',
            timestamp: new Date().toISOString(),
            notificationTriggered: true
        };
        
        STORAGE.addSession(notification);
    }

    // Send a test notification (for debugging)
    sendTestNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('LIMEN Test', {
                body: 'This is a test notification.',
                icon: 'icon-192.png',
                badge: 'icon-192.png',
                silent: true
            });
            return true;
        }
        return false;
    }

    // Stop all notifications
    stop() {
        if (this.notificationCheckInterval) {
            clearInterval(this.notificationCheckInterval);
            this.notificationCheckInterval = null;
        }
        
        if (this.environmentCheckInterval) {
            clearInterval(this.environmentCheckInterval);
            this.environmentCheckInterval = null;
        }
    }
}

// Initialize push manager
let pushManager = null;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        pushManager = new PushManager();
        window.pushManager = pushManager;
    }, 3000);
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (pushManager) {
        pushManager.stop();
    }
});
