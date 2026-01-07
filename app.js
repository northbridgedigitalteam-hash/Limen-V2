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
        this.pulseElement = null;
        this.pulseInterval = null;
        
        this.init();
    }

    init() {
        console.log('LIMEN App initializing...');
        
        // Apply saved preferences
        this.applyPreferences();
        
        // Bind all events
        this.bindEvents();
        
        // Show entry screen only
        this.showScreen('entry');
        
        // Check if we should show weekly summary (e.g., on Mondays)
        this.checkWeeklySummaryPrompt();
        
        // Setup emergency reset
        this.setupEmergencyReset();
        
        // Check for Zen mode
        this.checkZenMode();
    }

    applyPreferences() {
        const data = STORAGE.getData();
        if (!data || !data.userProfile || !data.userProfile.preferences) return;
        
        const prefs = data.userProfile.preferences;
        
        // Apply Zen mode
        if (prefs.zenMode) {
            document.body.classList.add('zen-mode');
        }
        
        // Apply haptic feedback setting
        if (prefs.hapticFeedback === false) {
            // Will be checked before triggering vibrations
        }
        
        // Apply ambient audio setting
        if (prefs.ambientAudio && window.audioManager) {
            window.audioManager.toggle(true);
        }
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

    setupEmergencyReset() {
        const emergencyBtn = document.getElementById('btn-emergency');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerEmergencyReset();
            });
            
            // Check if we should show emergency button
            this.checkEmergencyButtonVisibility();
        }
    }

    checkEmergencyButtonVisibility() {
        const history = STORAGE.getSessionHistory(1);
        const recentNegativeFeedback = history.filter(s => s.feedback === 'no').length;
        const shouldShow = recentNegativeFeedback >= 2 || 
                          (history.length >= 5 && recentNegativeFeedback >= 1);
        
        const emergencyReset = document.getElementById('emergency-reset');
        if (emergencyReset) {
            emergencyReset.style.display = shouldShow ? 'block' : 'none';
        }
    }

    showScreen(screenName) {
        console.log('Showing screen:', screenName);
        
        // Animate current screen out
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen) {
            currentScreen.classList.remove('active');
            currentScreen.classList.add('fade-out');
            
            setTimeout(() => {
                currentScreen.classList.remove('fade-out');
            }, 300);
        }
        
        // Stop pulse animation when leaving intervention screen
        if (screenName !== 'intervention' && this.pulseInterval) {
            clearInterval(this.pulseInterval);
            this.pulseInterval = null;
            if (this.pulseElement) {
                this.pulseElement.classList.remove('active');
            }
        }
        
        // Show target screen with animation
        const targetScreen = document.getElementById(`screen-${screenName}`);
        if (targetScreen) {
            targetScreen.classList.add('fade-in');
            
            setTimeout(() => {
                targetScreen.classList.add('active');
                targetScreen.classList.remove('fade-in');
            }, 50);
            
            this.currentScreen = screenName;
            
            // Screen-specific initialization
            switch(screenName) {
                case 'intervention':
                    this.startTimer();
                    this.startPulseAnimation();
                    break;
                case 'summary':
                    this.loadWeeklySummary();
                    break;
                case 'state':
                    this.prepareStateScreen();
                    break;
                case 'entry':
                    this.resetSession();
                    break;
            }
        }
    }

    prepareStateScreen() {
        // Add subtle micro-interactions to state buttons
        document.querySelectorAll('.btn-state').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
            });
        });
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
        
        // Get glow and pulse elements
        this.glowElement = document.getElementById('timer-glow');
        this.pulseElement = document.getElementById('timer-pulse');
        
        if (this.glowElement) {
            this.glowElement.classList.remove('amber');
        }
        
        if (this.pulseElement) {
            this.pulseElement.classList.remove('active');
        }
        
        // Add haptic feedback based on state
        if (navigator.vibrate) {
            const data = STORAGE.getData();
            const hapticEnabled = data?.userProfile?.preferences?.hapticFeedback ?? true;
            
            if (hapticEnabled) {
                const patterns = {
                    'CognitiveOverdrive': [100, 50, 100],
                    'SomaticTension': [50, 100, 50],
                    'RecoveryDebt': [200],
                    'Hypervigilance': [30, 30, 30, 100],
                    'EmergencyReset': [150, 50, 150, 50, 150]
                };
                
                if (patterns[state]) {
                    navigator.vibrate(patterns[state]);
                }
            }
        }
        
        // Play ambient audio if enabled
        if (window.audioManager && this.currentIntervention.audio) {
            if (this.currentIntervention.audio === 'brownNoise') {
                window.audioManager.playBrownNoise(this.currentIntervention.duration);
            } else if (this.currentIntervention.audio === 'focusTone') {
                window.audioManager.playFocusTone(this.currentIntervention.duration);
            }
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
                
                // Intensify pulse animation for last 5 seconds
                if (this.pulseElement) {
                    this.pulseElement.style.animation = 'pulseStrong 0.5s infinite';
                }
            }
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.timerComplete();
            }
        }, 1000);
    }

    startPulseAnimation() {
        if (this.pulseInterval) {
            clearInterval(this.pulseInterval);
        }
        
        this.pulseElement = document.getElementById('timer-pulse');
        if (this.pulseElement) {
            this.pulseElement.classList.add('active');
            
            // Randomize pulse timing slightly for organic feel
            this.pulseInterval = setInterval(() => {
                const randomDelay = Math.random() * 500 + 1500; // 1.5-2 seconds
                setTimeout(() => {
                    if (this.pulseElement && this.currentScreen === 'intervention') {
                        this.pulseElement.style.animation = 'none';
                        setTimeout(() => {
                            if (this.pulseElement) {
                                this.pulseElement.style.animation = 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)';
                            }
                        }, 10);
                    }
                }, randomDelay);
            }, 3000);
        }
    }

    timerComplete() {
        console.log('Timer completed for state:', this.currentState);
        
        // Stop pulse animation
        if (this.pulseInterval) {
            clearInterval(this.pulseInterval);
            this.pulseInterval = null;
        }
        
        if (this.pulseElement) {
            this.pulseElement.classList.remove('active');
        }
        
        // Stop audio
        if (window.audioManager) {
            window.audioManager.stopAll();
        }
        
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
        
        // Update emergency button visibility
        setTimeout(() => {
            this.checkEmergencyButtonVisibility();
        }, 1000);
    }

    handlePositiveFeedback() {
        setTimeout(() => {
            // Check if we should show weekly summary (once per week)
            if (this.shouldShowWeeklySummary()) {
                this.showWeeklySummary();
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
            
            // Reset glow and pulse
            if (this.glowElement) {
                this.glowElement.classList.remove('amber');
            }
            
            if (this.pulseElement) {
                this.pulseElement.style.animation = 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)';
            }
            
            this.showScreen('intervention');
            this.startTimer();
            this.startPulseAnimation();
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

    triggerEmergencyReset() {
        // Immediate intervention for acute dysregulation
        const emergencyIntervention = {
            title: "Emergency Reset",
            text: "Place both feet flat on the ground. Press palms together firmly. Breathe: 4 seconds in, 7 seconds hold, 8 seconds out. Repeat 3 times.",
            duration: 90,
            audio: "brownNoise"
        };
        
        this.currentIntervention = emergencyIntervention;
        this.currentState = "EmergencyReset";
        
        // Update UI
        const interventionText = document.getElementById('intervention-text');
        if (interventionText) {
            interventionText.textContent = emergencyIntervention.text;
        }
        
        this.timeRemaining = emergencyIntervention.duration;
        this.timerTotal = emergencyIntervention.duration;
        
        const timerText = document.getElementById('timer-text');
        if (timerText) {
            timerText.textContent = this.timeRemaining;
        }
        
        // Strong haptic feedback
        if (navigator.vibrate) {
            const data = STORAGE.getData();
            const hapticEnabled = data?.userProfile?.preferences?.hapticFeedback ?? true;
            if (hapticEnabled) {
                navigator.vibrate([150, 50, 150, 50, 150]);
            }
        }
        
        // Show intervention screen immediately
        this.showScreen('intervention');
        
        // Log emergency session
        const session = {
            state: "EmergencyReset",
            intervention: "Emergency Reset",
            duration: 90,
            emergency: true,
            timestamp: new Date().toISOString()
        };
        
        STORAGE.addSession(session);
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
        const history = STORAGE.getSessionHistory(7);
        if (history.length === 0) return;
        
        // Count states
        const stateCounts = {};
        history.forEach(session => {
            if (session.state) {
                stateCounts[session.state] = (stateCounts[session.state] || 0) + 1;
            }
        });
        
        // Find max for percentage calculation
        const maxCount = Math.max(...Object.values(stateCounts));
        
        // Create chart
        const chartContainer = document.getElementById('state-chart');
        chartContainer.innerHTML = '';
        
        // Sort states by frequency
        const sortedStates = Object.entries(stateCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6); // Show top 6
        
        sortedStates.forEach(([stateId, count]) => {
            const percentage = Math.round((count / history.length) * 100);
            const displayName = getStateDisplayName(stateId);
            const color = getStateColor(stateId);
            
            const barElement = document.createElement('div');
            barElement.className = 'chart-bar';
            
            barElement.innerHTML = `
                <span class="chart-label">${displayName}</span>
                <div class="chart-bar-container">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                </div>
                <span style="min-width: 40px; text-align: right; color: ${color}; font-weight: 500;">${percentage}%</span>
            `;
            
            chartContainer.appendChild(barElement);
        });
    }

    loadWeeklyInsight() {
        const history = STORAGE.getSessionHistory(7);
        if (history.length === 0) {
            document.getElementById('weekly-insight').textContent = 'Complete your first session to see insights.';
            return;
        }
        
        // Generate insight using state engine
        const insight = STATE_ENGINE.generateInsight(history);
        document.getElementById('weekly-insight').textContent = insight;
    }

    shouldShowWeeklySummary() {
        const data = STORAGE.getData();
        if (!data || !data.userProfile) return false;
        
        const lastSummaryShown = data.userProfile.lastSummaryShown;
        if (!lastSummaryShown) return true;
        
        const lastDate = new Date(lastSummaryShown);
        const today = new Date();
        
        // Show summary once per week or after 5 consecutive successful sessions
        const daysSinceLastSummary = (today - lastDate) / (1000 * 60 * 60 * 24);
        
        // Check for 5 consecutive successful sessions
        const recentSessions = STORAGE.getSessionHistory(5);
        const consecutiveSuccess = recentSessions.length >= 5 && 
                                  recentSessions.every(s => s.feedback === 'yes');
        
        return daysSinceLastSummary >= 7 || consecutiveSuccess;
    }

    showWeeklySummary() {
        this.showScreen('summary');
        
        // Record that summary was shown
        STORAGE.updateProfile('lastSummaryShown', new Date().toISOString());
    }

    checkWeeklySummaryPrompt() {
        // Check on Mondays if we should prompt for weekly summary
        const today = new Date();
        if (today.getDay() === 1) { // Monday
            const data = STORAGE.getData();
            const lastMondayPrompt = data.userProfile.lastMondayPrompt;
            
            if (!lastMondayPrompt || 
                new Date(lastMondayPrompt).toDateString() !== today.toDateString()) {
                
                // Record that we prompted this Monday
                STORAGE.updateProfile('lastMondayPrompt', today.toISOString());
            }
        }
    }

    checkZenMode() {
        const data = STORAGE.getData();
        if (data?.userProfile?.preferences?.zenMode) {
            document.body.classList.add('zen-mode');
        }
    }

    toggleZenMode() {
        const isZen = document.body.classList.toggle('zen-mode');
        STORAGE.updateSetting('zenMode', isZen);
        
        this.showToast(isZen ? 'Zen mode enabled' : 'Zen mode disabled');
        return isZen;
    }

    toggleAudio() {
        if (!window.audioManager) return false;
        const enabled = window.audioManager.toggle(!window.audioManager.isEnabled);
        this.showToast(enabled ? 'Ambient audio enabled' : 'Ambient audio disabled');
        return enabled;
    }

    toggleHaptic() {
        const data = STORAGE.getData();
        const current = data?.userProfile?.preferences?.hapticFeedback ?? true;
        const newValue = !current;
        STORAGE.updateSetting('hapticFeedback', newValue);
        this.showToast(newValue ? 'Haptic feedback enabled' : 'Haptic feedback disabled');
        return newValue;
    }

    showToast(message, duration = 2000) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
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
        
        if (this.pulseInterval) {
            clearInterval(this.pulseInterval);
            this.pulseInterval = null;
        }
        
        if (this.glowElement) {
            this.glowElement.classList.remove('amber');
        }
        
        if (this.pulseElement) {
            this.pulseElement.classList.remove('active');
        }
        
        // Stop audio
        if (window.audioManager) {
            window.audioManager.stopAll();
        }
    }

    cleanup() {
        console.log('Cleaning up app...');
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        if (this.pulseInterval) {
            clearInterval(this.pulseInterval);
        }
        
        if (window.pushManager) {
            window.pushManager.stop();
        }
        
        if (window.audioManager) {
            window.audioManager.stopAll();
        }
    }

    // Debug methods
    showDebugInfo() {
        const stats = STORAGE.getStats();
        console.log('=== LIMEN DEBUG INFO ===');
        console.log('App Stats:', stats);
        console.log('Current State:', this.currentState);
        console.log('Current Session ID:', this.currentSessionId);
        console.log('Screen:', this.currentScreen);
        console.log('Audio Manager:', window.audioManager ? 'Available' : 'Not available');
        console.log('Push Manager:', window.pushManager ? 'Available' : 'Not available');
        console.log('Environment Sensor:', window.environmentSensor ? 'Available' : 'Not available');
        console.log('========================');
        
        this.showToast('Debug info logged to console', 3000);
    }
}

// Initialize app when DOM is loaded
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        app = new LimenApp();
        window.app = app;
        
        // Add debug shortcuts
        window.addEventListener('keydown', (e) => {
            // Ctrl+Shift+S for summary
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                app.showWeeklySummary();
            }
            // Ctrl+Shift+D for debug info
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                app.showDebugInfo();
            }
            // Ctrl+Shift+Z for zen mode toggle
            if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
                e.preventDefault();
                app.toggleZenMode();
            }
            // Ctrl+Shift+A for audio toggle
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                app.toggleAudio();
            }
            // Ctrl+Shift+H for haptic toggle
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                app.toggleHaptic();
            }
        });
        
        console.log('LIMEN App initialized successfully');
        
        // Handle service worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker updated, reloading...');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            });
        }
        
    } catch (error) {
        console.error('Failed to initialize LIMEN App:', error);
        // Show error to user
        alert('Error initializing LIMEN. Please refresh the page.');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.cleanup();
    }
});
