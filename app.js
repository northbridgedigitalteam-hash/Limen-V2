// Main Application Logic
class LimenApp {
    constructor() {
        this.currentScreen = 'entry';
        this.currentState = null;
        this.currentIntervention = null;
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.timerTotal = 0;
        this.feedbackGiven = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkFirstTime();
        
        // Request notification permission
        this.requestNotificationPermission();
        
        // Check if we should show state selection or infer
        setTimeout(() => this.checkSessionFlow(), 500);
    }

    bindEvents() {
        // Entry screen
        document.getElementById('btn-continue').addEventListener('click', () => {
            this.showScreen('state');
        });

        // State selection
        document.querySelectorAll('.btn-state').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const state = e.target.dataset.state;
                this.selectState(state);
            });
        });

        // Feedback buttons
        document.querySelectorAll('.btn-feedback').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feedback = e.target.dataset.feedback;
                this.handleFeedback(feedback);
            });
        });
    }

    checkFirstTime() {
        const data = STORAGE.getData();
        const history = data.sessionHistory;
        
        if (history.length === 0) {
            // First time user - show welcome
            console.log('First time user');
        }
    }

    checkSessionFlow() {
        const lastSession = STORAGE.getLastSession();
        const now = new Date();
        
        if (lastSession) {
            const lastSessionTime = new Date(lastSession.timestamp);
            const hoursSinceLast = (now - lastSessionTime) / (1000 * 60 * 60);
            
            // If last session was recent and effective, skip to intervention
            if (hoursSinceLast < 2 && lastSession.feedback === 'yes') {
                const inferred = STATE_ENGINE.inferState(
                    STORAGE.getSessionHistory(),
                    now
                );
                
                if (inferred.confidence > 0.7) {
                    this.currentState = inferred.state;
                    this.showIntervention(this.currentState);
                    return;
                }
            }
        }
        
        // Otherwise show state selection
        this.showScreen('state');
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(`screen-${screenName}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
            
            // Screen-specific initialization
            if (screenName === 'intervention' && this.currentIntervention) {
                this.startTimer();
            }
        }
    }

    selectState(state) {
        this.currentState = state;
        this.showIntervention(state);
    }

    showIntervention(state) {
        this.currentIntervention = getIntervention(state);
        
        // Update UI
        document.getElementById('intervention-text').textContent = this.currentIntervention.text;
        
        // Set timer values
        this.timeRemaining = this.currentIntervention.duration;
        this.timerTotal = this.currentIntervention.duration;
        document.getElementById('timer-text').textContent = this.timeRemaining;
        
        // Reset timer circle
        const timerFill = document.querySelector('.timer-fill');
        const circumference = 2 * Math.PI * 45;
        timerFill.style.strokeDasharray = circumference;
        timerFill.style.strokeDashoffset = circumference;
        
        this.showScreen('intervention');
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        const timerFill = document.querySelector('.timer-fill');
        const circumference = 2 * Math.PI * 45;
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            document.getElementById('timer-text').textContent = this.timeRemaining;
            
            // Update progress circle
            const progress = this.timeRemaining / this.timerTotal;
            const offset = circumference * progress;
            timerFill.style.strokeDashoffset = offset;
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.timerComplete();
            }
        }, 1000);
    }

    timerComplete() {
        // Show feedback screen
        this.showScreen('feedback');
        
        // Save session (without feedback yet)
        this.saveSession();
    }

    handleFeedback(feedback) {
        if (this.feedbackGiven) return;
        this.feedbackGiven = true;
        
        const feedbackMessage = document.getElementById('feedback-message');
        
        switch(feedback) {
            case 'yes':
                feedbackMessage.textContent = 'Good.';
                this.handlePositiveFeedback();
                break;
            case 'little':
                feedbackMessage.textContent = 'Trying alternative...';
                this.handlePartialFeedback();
                break;
            case 'no':
                feedbackMessage.textContent = 'Adjusting...';
                this.handleNegativeFeedback();
                break;
        }
        
        // Update session with feedback
        this.updateSessionFeedback(feedback);
    }

    handlePositiveFeedback() {
        setTimeout(() => {
            // Close app or return to entry
            this.showScreen('entry');
            this.resetSession();
        }, 1000);
    }

    handlePartialFeedback() {
        setTimeout(() => {
            // Show alternative intervention
            const alternative = getAlternativeIntervention(this.currentState);
            this.currentIntervention = alternative;
            document.getElementById('intervention-text').textContent = alternative.text;
            this.timeRemaining = alternative.duration;
            this.timerTotal = alternative.duration;
            document.getElementById('timer-text').textContent = this.timeRemaining;
            
            this.showScreen('intervention');
            this.startTimer();
            this.feedbackGiven = false;
        }, 1500);
    }

    handleNegativeFeedback() {
        setTimeout(() => {
            // Try a different state
            const newState = this.getFallbackState();
            this.selectState(newState);
            this.feedbackGiven = false;
        }, 1500);
    }

    getFallbackState() {
        // Simple fallback logic
        const fallbacks = {
            'CognitiveOverdrive': 'RecoveryDebt',
            'RecoveryDebt': 'ShutdownDrift',
            'AnticipatoryStress': 'SomaticTension',
            'SomaticTension': 'EmotionalLoad',
            'EmotionalLoad': 'Baseline'
        };
        
        return fallbacks[this.currentState] || 'Baseline';
    }

    saveSession() {
        const session = {
            state: this.currentState,
            intervention: this.currentIntervention.title,
            duration: this.currentIntervention.duration,
            feedback: null,
            timestamp: new Date().toISOString()
        };
        
        this.currentSessionId = STORAGE.addSession(session).id;
    }

    updateSessionFeedback(feedback) {
        const data = STORAGE.getData();
        const sessionIndex = data.sessionHistory.findIndex(s => s.id === this.currentSessionId);
        
        if (sessionIndex !== -1) {
            data.sessionHistory[sessionIndex].feedback = feedback;
            data.sessionHistory[sessionIndex].completedAt = new Date().toISOString();
            STORAGE.setData(data);
        }
    }

    resetSession() {
        this.currentState = null;
        this.currentIntervention = null;
        this.currentSessionId = null;
        this.feedbackGiven = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    STORAGE.enableNotifications();
                    console.log('Notifications enabled');
                }
            } catch (error) {
                console.log('Notification permission error:', error);
            }
        }
    }

    showNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/icon-192.png',
                badge: '/icon-72.png',
                ...options
            });
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LimenApp();
});
