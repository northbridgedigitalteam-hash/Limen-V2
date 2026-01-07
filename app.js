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
        this.glowElement = null;
        
        this.init();
    }

    init() {
        console.log('LIMEN App initializing...');
        
        // Bind all events
        this.bindEvents();
        
        // Don't auto-navigate - wait for user to click Continue
        // Show entry screen only
        this.showScreen('entry');
        
        // Check if we should show weekly summary (e.g., on Mondays)
        this.checkWeeklySummaryPrompt();
    }

    bindEvents() {
        // Entry screen - only button
        document.getElementById('btn-continue').addEventListener('click', () => {
            this.showScreen('state');
        });

        // State selection buttons
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

        // Weekly summary back button
        document.getElementById('btn-back-to-entry').addEventListener('click', () => {
            this.showScreen('entry');
        });
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
            switch(screenName) {
                case 'intervention':
                    this.startTimer();
                    break;
                case 'summary':
                    this.loadWeeklySummary();
                    break;
            }
        }
    }

    selectState(state) {
        console.log('User selected state:', state);
        this.currentState = state;
        
        // Record state selection
        STORAGE.updateProfile('lastSelectedState', state);
        STORAGE.updateProfile('lastStateSelection', new Date().toISOString());
        
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
        
        // Get glow element
        this.glowElement = document.getElementById('timer-glow');
        if (this.glowElement) {
            this.glowElement.classList.remove('amber');
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
            
            // Change glow color when 5 seconds remain
            if (this.timeRemaining <= 5 && this.glowElement) {
                this.glowElement.classList.add('amber');
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
                    feedbackMessage.textContent = 'Returning to baseline. Good.';
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
                    feedbackMessage.textContent = 'Adjusting approach...';
                }
                this.handleNegativeFeedback();
                break;
        }
        
        // Update session with feedback
        this.updateSessionFeedback(feedback);
    }

    handlePositiveFeedback() {
        setTimeout(() => {
            // Check if we should show weekly summary (once per week)
            if (this.shouldShowWeeklySummary()) {
                this.showScreen('summary');
            } else {
                // Return to entry screen
                this.showScreen('entry');
            }
            this.resetSession();
        }, 1500);
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
            
            // Reset glow
            if (this.glowElement) {
                this.glowElement.classList.remove('amber');
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
        // Fallback logic based on current state
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
            timestamp: new Date().toISOString(),
            returnedToBaseline: false
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
            data.sessionHistory[sessionIndex].returnedToBaseline = (feedback === 'yes');
            STORAGE.setData(data);
        }
    }

    // WEEKLY SUMMARY FUNCTIONS
    loadWeeklySummary() {
        const stats = STORAGE.getStats();
        if (!stats) return;
        
        // Update basic stats
        document.getElementById('total-sessions').textContent = stats.totalSessions || 0;
        document.getElementById('effectiveness-rate').textContent = stats.effectivenessRate + '%' || '0%';
        document.getElementById('avg-time').textContent = (stats.avgDuration || 0) + 's';
        
        // Load state distribution chart
        this.loadStateDistribution();
        
        // Load insight
        this.loadWeeklyInsight();
    }

    loadStateDistribution() {
        const history = STORAGE.getSessionHistory
