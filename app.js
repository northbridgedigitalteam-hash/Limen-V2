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
        this.currentSessionId = null;
        
        this.init();
    }

    init() {
        console.log('LIMEN App initializing...');
        
        // Initialize components
        this.bindEvents();
        this.checkFirstTime();
        
        // Check PWA installation
        this.checkPWAInstallation();
        
        // Set up beforeunload handler
        window.addEventListener('beforeunload', () => this.cleanup());
        
        // Initialize after a short delay
        setTimeout(() => {
            this.checkSessionFlow();
        }, 800);
    }

    bindEvents() {
        // Entry screen
        const btnContinue = document.getElementById('btn-continue');
        if (btnContinue) {
            btnContinue.addEventListener('click', () => {
                this.showScreen('state');
            });
        }

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
        if (!data || data.sessionHistory.length === 0) {
            console.log('First time user detected');
            this.showFirstTimeTips();
        }
    }

    showFirstTimeTips() {
        // Could show a brief tutorial here
        console.log('First time tips would show here');
    }

    checkPWAInstallation() {
        // Check if app is running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('Running as PWA');
            document.body.classList.add('pwa-mode');
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
                const history = STORAGE.getSessionHistory();
                const inferred = STATE_ENGINE.inferState(history, now);
                
                if (inferred.confidence > 0.7) {
                    this.currentState = inferred.state;
                    this.showIntervention(this.currentState);
                    return;
                }
            }
            
            // Check last state selection time
            const profile = STORAGE.getData()?.userProfile;
            if (profile?.lastStateSelection) {
                const lastSelectionTime = new Date(profile.lastStateSelection);
                const hoursSinceSelection = (now - lastSelectionTime) / (1000 * 60 * 60);
                
                if (hoursSinceSelection < 24) {
                    // Skip state selection if user selected recently
                    const history = STORAGE.getSessionHistory();
                    const inferred = STATE_ENGINE.inferState(history, now);
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
        console.log('Showing screen:', screenName);
        
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
            
            if (screenName === 'state') {
                // Record that user is seeing state selection
                STORAGE.recordStateSelection();
            }
        }
    }

    selectState(state) {
        console.log('User selected state:', state);
        this.currentState = state;
        STORAGE.updateProfile('lastSelectedState', state);
        this.showIntervention(state);
    }

    showIntervention(state) {
        this.currentIntervention = getIntervention(state);
        
        if (!this.currentIntervention) {
            console.error('No intervention found for state:', state);
            this.currentIntervention = getIntervention("CognitiveOverdrive");
        }
        
        // Update UI
        const interventionText = document.getElementById('intervention-text');
        if (interventionText) {
            interventionText.textContent = this.currentIntervention.text;
        }
        
        // Set timer values
        this.timeRemaining = this.currentIntervention.duration;
        this.timerTotal = this.currentIntervention.duration;
        
        const timerText = document.getElementById('timer-text');
        if (timerText) {
            timerText.textContent = this.timeRemaining;
        }
        
        // Reset timer circle
        const timerFill = document.querySelector('.timer-fill');
        if (timerFill) {
            const circumference = 2 * Math.PI * 45;
            timerFill.style.strokeDasharray = circumference;
            timerFill.style.strokeDashoffset = circumference;
        }
        
        this.showScreen('intervention');
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        const timerFill = document.querySelector('.timer-fill');
        const timerText = document.getElementById('timer-text');
        const circumference = 2 * Math.PI * 45;
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            
            if (timerText) {
                timerText.textContent = this.timeRemaining;
            }
            
            // Update progress circle
            if (timerFill && this.timerTotal > 0) {
                const progress = this.timeRemaining / this.timerTotal;
                const offset = circumference * progress;
                timerFill.style.strokeDashoffset = offset;
            }
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.timerComplete();
            }
        }, 1000);
    }

    timerComplete() {
        console.log('Timer completed for state:', this.currentState);
        
        // Save session before feedback
        this.saveSession();
        
        // Show feedback screen
        this.showScreen('feedback');
    }

    handleFeedback(feedback) {
        if (this.feedbackGiven) return;
        
        this.feedbackGiven = true;
        console.log('User feedback:', feedback);
        
        const feedbackMessage = document.getElementById('feedback-message');
        
        switch(feedback) {
            case 'yes':
                if (feedbackMessage) {
                    feedbackMessage.textContent = 'Good.';
                }
                this.handlePositiveFeedback();
                break;
                
            case 'little':
                if (feedbackMessage) {
                    feedbackMessage.textContent = 'Trying alternative...';
                }
                this.handlePartialFeedback();
                break;
                
            case 'no':
                if (feedbackMessage) {
                    feedbackMessage.textContent = 'Adjusting...';
                }
                this.handleNegativeFeedback();
                break;
        }
        
        // Update session with feedback
        this.updateSessionFeedback(feedback);
    }

    handlePositiveFeedback() {
        setTimeout(() => {
            // Return to entry screen
            this.showScreen('entry');
            this.resetSession();
        }, 1200);
    }

    handlePartialFeedback() {
        setTimeout(() => {
            // Show alternative intervention
            const alternative = getAlternativeIntervention(this.currentState);
            this.currentIntervention = alternative;
            
            const interventionText = document.getElementById('intervention-text');
            if (interventionText) {
                interventionText.textContent = alternative.text;
            }
            
            this.timeRemaining = alternative.duration;
            this.timerTotal = alternative.duration;
            
            const timerText = document.getElementById('timer-text');
            if (timerText) {
                timerText.textContent = this.timeRemaining;
            }
            
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
        // Simple fallback logic based on current state
        const fallbacks = {
            'CognitiveOverdrive': 'RecoveryDebt',
            'RecoveryDebt': 'ShutdownDrift',
            'AnticipatoryStress': 'SomaticTension',
            'SomaticTension': 'EmotionalLoad',
            'EmotionalLoad': 'Baseline',
            'Hypervigilance': 'RecoveryDebt',
            'DecisionFatigue': 'Baseline',
            'Understimulated': 'CognitiveOverdrive',
            'FragmentedFocus': 'RecoveryDebt',
            'SocialDepletion': 'ShutdownDrift',
            'ShutdownDrift': 'Baseline',
            'Baseline': 'CognitiveOverdrive'
        };
        
        return fallbacks[this.currentState] || 'Baseline';
    }

    saveSession() {
        if (!this.currentState || !this.currentIntervention) return;
        
        const session = {
            state: this.currentState,
            intervention: this.currentIntervention.title || this.currentState,
            duration: this.currentIntervention.duration || 90,
            feedback: null,
            timestamp: new Date().toISOString()
        };
        
        const savedSession = STORAGE.addSession(session);
        if (savedSession) {
            this.currentSessionId = savedSession.id;
        }
    }

    updateSessionFeedback(feedback) {
        if (!this.currentSessionId) return;
        
        const data = STORAGE.getData();
        if (!data || !data.sessionHistory) return;
        
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
        this.timeRemaining = 0;
        this.timerTotal = 0;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    cleanup() {
        console.log('Cleaning up app...');
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        if (window.pushManager) {
            window.pushManager.stop();
        }
    }

    // Utility method for debugging
    showDebugInfo() {
        const stats = STORAGE.getStats();
        console.log('App Stats:', stats);
        console.log('Current State:', this.currentState);
        console.log('Current Session ID:', this.currentSessionId);
    }
}

// Initialize app when DOM is loaded
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        app = new LimenApp();
        window.app = app;
        
        // Add debug shortcut (remove in production)
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                app.showDebugInfo();
            }
        });
        
        console.log('LIMEN App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize LIMEN App:', error);
    }
});

// Handle service worker updates
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker updated, reloading...');
        window.location.reload();
    });
}
