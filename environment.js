// Simple environmental awareness
class EnvironmentSensor {
    constructor() {
        this.lastInteractionTime = Date.now();
        this.activityPattern = [];
        this.inactivityTimer = null;
        
        this.init();
    }
    
    init() {
        // Track screen time indirectly
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.recordInactivity();
            } else {
                this.recordActivity();
                this.checkInactivityNotification();
            }
        });
        
        // Track interaction frequency
        document.addEventListener('click', this.recordActivity.bind(this));
        document.addEventListener('touchstart', this.recordActivity.bind(this));
        
        // Start inactivity monitor
        this.startInactivityMonitor();
    }
    
    recordActivity() {
        const now = Date.now();
        const timeSinceLast = now - this.lastInteractionTime;
        
        this.activityPattern.push({
            time: now,
            duration: timeSinceLast
        });
        
        // Keep only last 100 interactions
        if (this.activityPattern.length > 100) {
            this.activityPattern.shift();
        }
        
        this.lastInteractionTime = now;
        
        // Reset inactivity timer
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        this.startInactivityMonitor();
    }
    
    recordInactivity() {
        // Could log inactivity for patterns
        console.log('User inactive, screen hidden');
    }
    
    startInactivityMonitor() {
        this.inactivityTimer = setTimeout(() => {
            this.checkInactivityNotification();
        }, 30 * 60 * 1000); // Check every 30 minutes
    }
    
    checkInactivityNotification() {
        const data = STORAGE.getData();
        if (!data?.userProfile?.notificationEnabled) return;
        
        const now = Date.now();
        const inactiveTime = now - this.lastInteractionTime;
        
        // Only suggest if truly inactive for a while
        if (inactiveTime > 45 * 60 * 1000) { // 45 minutes
            this.suggestMicroBreak();
        }
    }
    
    suggestMicroBreak() {
        const data = STORAGE.getData();
        if (!data?.userProfile?.notificationEnabled) return;
        
        // Check if we've suggested recently
        const lastSuggestion = data.userProfile.lastMicroBreakSuggestion;
        if (lastSuggestion) {
            const lastTime = new Date(lastSuggestion);
            const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
            if (hoursSince < 2) return; // Don't suggest more than every 2 hours
        }
        
        const messages = [
            "Your attention has been sustained. A 60-second reset would help.",
            "Time for a nervous system refresh.",
            "Pause. Reset. Continue.",
            "Your focus has been steady. A brief reset will enhance clarity."
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // Show notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('LIMEN', {
                body: randomMessage,
                icon: 'icon-192.png',
                silent: true
            });
            
            // Record the suggestion
            STORAGE.updateProfile('lastMicroBreakSuggestion', new Date().toISOString());
        }
    }
    
    getActivityPattern() {
        const recent = this.activityPattern.slice(-10);
        const avgInterval = recent.length > 0 
            ? recent.reduce((sum, a) => sum + a.duration, 0) / recent.length
            : 0;
        
        return {
            avgInterval,
            isHighFrequency: avgInterval < 5000, // Less than 5 seconds between interactions
            lastActive: this.lastInteractionTime,
            totalInteractions: this.activityPattern.length
        };
    }
    
    // Estimate cognitive load based on interaction patterns
    estimateCognitiveLoad() {
        const pattern = this.getActivityPattern();
        
        if (pattern.isHighFrequency && pattern.totalInteractions > 20) {
            return { state: 'CognitiveOverdrive', confidence: 0.6 };
        }
        
        const inactiveHours = (Date.now() - pattern.lastActive) / (1000 * 60 * 60);
        if (inactiveHours > 3) {
            return { state: 'Understimulated', confidence: 0.5 };
        }
        
        return null;
    }
}

// Initialize environment sensor
const environmentSensor = new EnvironmentSensor();
window.environmentSensor = environmentSensor;
