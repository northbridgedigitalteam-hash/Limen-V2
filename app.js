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
        const totalSessions = STORAGE.getStats()?.totalSessions || 0;
        
        // More lenient conditions for showing emergency button
        const shouldShow = recentNegativeFeedback >= 1 || 
                          totalSessions >= 2 ||
                          history.length >= 3;
        
        const emergencyReset = document.getElementById('emergency-reset');
        if (emergencyReset) {
            emergencyReset.style.display = 'block'; // Always show
            if (shouldShow) {
                emergencyReset.classList.add('active');
            } else {
                emergencyReset.classList.remove('active');
            }
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

// Ambient Audio Manager
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.currentSound = null;
        this.isEnabled = false;
        this.volume = 0.1;
        
        this.checkPreference();
    }
    
    async init() {
        // Create audio context on user interaction
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('Audio context created');
                
                // Resume context if suspended
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
            } catch (error) {
                console.log('Audio context creation failed:', error);
            }
        }
    }
    
    checkPreference() {
        const data = STORAGE.getData();
        this.isEnabled = data?.userProfile?.preferences?.ambientAudio || false;
    }
    
    // Generate soothing brown noise
    playBrownNoise(duration = 90) {
        if (!this.isEnabled || !this.audioContext) return;
        
        try {
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                const brown = (lastOut + (0.02 * white)) / 1.02;
                lastOut = brown;
                output[i] = brown * 3.5;
            }
            
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Create gain node for fade in/out
            const gainNode = this.audioContext.createGain();
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.volume, now + 1);
            gainNode.gain.linearRampToValueAtTime(0, now + duration - 1);
            
            source.start();
            this.currentSound = source;
            
            // Auto-stop after duration
            source.stop(now + duration);
            
            // Clean up after completion
            source.onended = () => {
                this.currentSound = null;
            };
            
        } catch (error) {
            console.log('Error playing brown noise:', error);
        }
    }
    
    // Gentle frequency sweep for focus
    playFocusTone(duration = 60) {
        if (!this.isEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(432, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(528, this.audioContext.currentTime + duration/2);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
            
            this.currentSound = oscillator;
            
            oscillator.onended = () => {
                this.currentSound = null;
            };
            
        } catch (error) {
            console.log('Error playing focus tone:', error);
        }
    }
    
    stopAll() {
        if (this.currentSound) {
            try {
                this.currentSound.stop();
                this.currentSound = null;
            } catch (error) {
                console.log('Error stopping audio:', error);
            }
        }
    }
    
    toggle(enabled) {
        this.isEnabled = enabled;
        // Use updateProfile instead of updateSetting
        STORAGE.updateProfile('preferences', {
            ...(STORAGE.getData()?.userProfile?.preferences || {}),
            ambientAudio: enabled
        });
        
        if (!enabled) {
            this.stopAll();
        }
        
        return enabled;
    }
    
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
    }
}

// Initialize audio manager
let audioManager = null;

// Initialize on first user interaction
function initAudioOnInteraction() {
    if (!audioManager && (window.AudioContext || window.webkitAudioContext)) {
        audioManager = new AudioManager();
        audioManager.init();
        
        // Remove event listeners
        document.removeEventListener('click', initAudioOnInteraction);
        document.removeEventListener('touchstart', initAudioOnInteraction);
    }
}

// Add event listeners for audio initialization
document.addEventListener('click', initAudioOnInteraction, { once: true });
document.addEventListener('touchstart', initAudioOnInteraction, { once: true });

// Export for app.js
window.audioManager = audioManager;

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
