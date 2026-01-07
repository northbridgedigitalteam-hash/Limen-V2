// Main Application Logic - ENHANCED
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
        this.showScreen('entry');
        
        // Check emergency button visibility
        setTimeout(() => this.checkEmergencyButtonVisibility(), 1000);
    }

    bindEvents() {
        // Entry screen
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

        // Emergency reset button
        document.getElementById('btn-emergency').addEventListener('click', (e) => {
            e.preventDefault();
            this.triggerEmergencyReset();
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
                    this.loadNeuropsychologicalSummary();
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
                    feedbackMessage.textContent = 'Returning to baseline.';
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
            // Show neuropsychological summary immediately after successful regulation
            this.showNeuropsychologicalSummary();
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

    triggerEmergencyReset() {
        // Add pulse animation to emergency button
        const emergencyBtn = document.getElementById('btn-emergency');
        emergencyBtn.classList.add('pulse');
        
        // Immediate intervention for acute dysregulation
        const emergencyIntervention = {
            title: "Emergency Reset",
            text: "Place both feet flat on the ground. Press palms together firmly. Breathe: 4 seconds in, 7 seconds hold, 8 seconds out. Repeat 3 times.",
            duration: 120,
            color: "#ff4444"
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
        
        // Show intervention screen immediately
        this.showScreen('intervention');
        
        // Log emergency session
        const session = {
            state: "EmergencyReset",
            intervention: "Emergency Reset",
            duration: 120,
            emergency: true,
            timestamp: new Date().toISOString()
        };
        
        STORAGE.addSession(session);
        
        // Remove pulse animation after 2 seconds
        setTimeout(() => {
            emergencyBtn.classList.remove('pulse');
        }, 2000);
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

    // NEUROPSYCHOLOGICAL SUMMARY FUNCTIONS
    showNeuropsychologicalSummary() {
        this.showScreen('summary');
        this.loadNeuropsychologicalSummary();
    }

    loadNeuropsychologicalSummary() {
        const stats = STORAGE.getStats();
        if (!stats) return;
        
        // Update basic stats
        document.getElementById('total-sessions').textContent = stats.totalSessions || 0;
        document.getElementById('effectiveness-rate').textContent = stats.effectivenessRate + '%' || '0%';
        document.getElementById('current-streak').textContent = stats.currentStreak || 0;
        
        // Load pattern insight
        this.loadPatternInsight(stats);
        
        // Load state distribution chart
        this.loadStateDistribution(stats);
        
        // Load psychological tip
        this.loadPsychologicalTip(stats);
    }

    loadPatternInsight(stats) {
        const insightEl = document.getElementById('pattern-insight');
        
        if (stats.totalSessions === 0) {
            insightEl.textContent = 'Complete your first session to see pattern insights.';
            return;
        }
        
        if (stats.patterns) {
            const stateName = getStateDisplayName(stats.patterns.state);
            insightEl.textContent = `You frequently experience ${stateName.toLowerCase()} (${stats.patterns.percentage}% of sessions). This suggests a pattern in your nervous system responses.`;
        } else if (stats.effectivenessTrend) {
            switch(stats.effectivenessTrend) {
                case 'improving':
                    insightEl.textContent = 'Your regulation effectiveness is improving! Your nervous system is becoming more resilient.';
                    break;
                case 'declining':
                    insightEl.textContent = 'Notice any recent changes that might be affecting your regulation?';
                    break;
                default:
                    insightEl.textContent = 'Your regulation patterns are stable. Consistency builds long-term resilience.';
            }
        } else {
            insightEl.textContent = 'Continue tracking to uncover deeper patterns in your nervous system responses.';
        }
    }

    loadStateDistribution(stats) {
        const chartContainer = document.getElementById('state-chart');
        chartContainer.innerHTML = '';
        
        if (!stats.stateFrequency || Object.keys(stats.stateFrequency).length === 0) {
            return;
        }
        
        // Sort states by frequency
        const sortedStates = Object.entries(stats.stateFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 4); // Show top 4
        
        sortedStates.forEach(([stateId, count]) => {
            const percentage = Math.round((count / stats.totalSessions) * 100);
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

    loadPsychologicalTip(stats) {
        const tipEl = document.getElementById('psychological-tip');
        
        if (stats.psychologicalInsight && stats.psychologicalInsight.psychologicalTip) {
            tipEl.textContent = stats.psychologicalInsight.psychologicalTip;
        } else if (stats.patterns) {
            // Generate tip based on dominant pattern
            const tips = {
                'CognitiveOverdrive': 'Try scheduling "cognitive breaks" every 90 minutes to prevent overwhelm.',
                'SomaticTension': 'Daily body awareness practices can help release stored tension.',
                'RecoveryDebt': 'Schedule recovery periods before exhaustion hits.',
                'Hypervigilance': 'Grounding techniques help signal safety to your nervous system.',
                'EmotionalLoad': 'Naming emotions creates space between feeling and reaction.',
                'ShutdownDrift': 'Micro-movements can help maintain connection without overwhelm.'
            };
            
            tipEl.textContent = tips[stats.patterns.state] || 'Regular regulation strengthens your nervous system over time.';
        } else {
            tipEl.textContent = 'The vagus nerve responds to regular practice. Each regulation session builds resilience.';
        }
    }

    checkEmergencyButtonVisibility() {
        const history = STORAGE.getSessionHistory(1); // Last day
        const recentNegativeFeedback = history.filter(s => s.feedback === 'no').length;
        const shouldShow = recentNegativeFeedback >= 2 || 
                          (history.length >= 5 && recentNegativeFeedback >= 1);
        
        const emergencyReset = document.getElementById('emergency-reset');
        if (emergencyReset) {
            emergencyReset.style.display = shouldShow ? 'block' : 'none';
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
        
        if (this.glowElement) {
            this.glowElement.classList.remove('amber');
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

    // Debug methods
    showDebugInfo() {
        const stats = STORAGE.getStats();
        console.log('=== LIMEN DEBUG INFO ===');
        console.log('App Stats:', stats);
        console.log('Current State:', this.currentState);
        console.log('Current Session ID:', this.currentSessionId);
        console.log('Screen:', this.currentScreen);
        console.log('========================');
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
                app.showNeuropsychologicalSummary();
            }
            // Ctrl+Shift+D for debug info
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
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
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    });
}
