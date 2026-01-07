// State Engine - Deterministic Inference
const STATE_ENGINE = {
    // Core states
    states: [
        "CognitiveOverdrive",
        "EmotionalLoad", 
        "SomaticTension",
        "Hypervigilance",
        "DecisionFatigue",
        "Understimulated",
        "FragmentedFocus",
        "RecoveryDebt",
        "AnticipatoryStress",
        "SocialDepletion",
        "ShutdownDrift",
        "Baseline"
    ],

    // Infer state based on session history and current time
    inferState(sessionHistory, currentTime = new Date()) {
        // Default probabilities
        const probabilities = {};
        this.states.forEach(state => probabilities[state] = 0);

        // If no history, use time-based defaults
        if (!sessionHistory || sessionHistory.length === 0) {
            return this.getDefaultStateByTime(currentTime);
        }

        const lastSession = sessionHistory[sessionHistory.length - 1];
        const lastSessionTime = new Date(lastSession.timestamp);
        const timeSinceLastSession = (currentTime - lastSessionTime) / (1000 * 60); // minutes

        // Rule 1: Multiple sessions in short time = Cognitive Overdrive
        if (sessionHistory.length >= 3) {
            const recentSessions = sessionHistory.slice(-3);
            const timeSpan = (new Date(recentSessions[2].timestamp) - new Date(recentSessions[0].timestamp)) / (1000 * 60);
            if (timeSpan < 45) {
                probabilities["CognitiveOverdrive"] += 0.8;
            }
        }

        // Rule 2: Late night sessions = Recovery Debt
        if (currentTime.getHours() >= 22 || currentTime.getHours() <= 4) {
            probabilities["RecoveryDebt"] += 0.7;
        }

        // Rule 3: Morning sessions after low effectiveness = Anticipatory Stress
        if (currentTime.getHours() >= 7 && currentTime.getHours() <= 9) {
            const yesterdaySessions = sessionHistory.filter(s => {
                const sessionDate = new Date(s.timestamp);
                return sessionDate.getDate() === currentTime.getDate() - 1;
            });
            const lowEffectiveness = yesterdaySessions.filter(s => s.feedback === "no").length;
            if (lowEffectiveness > 0) {
                probabilities["AnticipatoryStress"] += 0.6;
            }
        }

        // Rule 4: Short sessions with "no" feedback = Shutdown Drift
        if (lastSession.duration < 120 && lastSession.feedback === "no") {
            probabilities["ShutdownDrift"] += 0.5;
        }

        // Rule 5: Consistent "yes" feedback = Baseline
        const recentFeedback = sessionHistory.slice(-5).map(s => s.feedback);
        const yesCount = recentFeedback.filter(f => f === "yes").length;
        if (yesCount >= 4) {
            probabilities["Baseline"] += 0.7;
        }

        // Rule 6: Mid-afternoon slump = Understimulated
        if (currentTime.getHours() >= 14 && currentTime.getHours() <= 16) {
            probabilities["Understimulated"] += 0.4;
        }

        // Rule 7: After many decisions = Decision Fatigue
        const todaySessions = sessionHistory.filter(s => {
            const sessionDate = new Date(s.timestamp);
            return sessionDate.toDateString() === currentTime.toDateString();
        });
        if (todaySessions.length >= 5) {
            probabilities["DecisionFatigue"] += 0.5;
        }

        // Rule 8: Recent social depletion detection
        if (lastSession.state === "SocialDepletion") {
            probabilities["SocialDepletion"] += 0.6;
        }

        // Rule 9: Physical tension patterns
        const recentSomaticSessions = sessionHistory.slice(-3).filter(s => s.state === "SomaticTension").length;
        if (recentSomaticSessions >= 2) {
            probabilities["SomaticTension"] += 0.5;
        }

        // Find highest probability state
        let maxProb = 0;
        let inferredState = "CognitiveOverdrive";
        
        for (const state in probabilities) {
            if (probabilities[state] > maxProb) {
                maxProb = probabilities[state];
                inferredState = state;
            }
        }

        // Return state and confidence
        return {
            state: inferredState,
            confidence: maxProb
        };
    },

    getDefaultStateByTime(currentTime) {
        const hour = currentTime.getHours();
        
        if (hour >= 22 || hour <= 4) return { state: "RecoveryDebt", confidence: 0.5 };
        if (hour >= 7 && hour <= 9) return { state: "AnticipatoryStress", confidence: 0.5 };
        if (hour >= 14 && hour <= 16) return { state: "Understimulated", confidence: 0.5 };
        
        return { state: "CognitiveOverdrive", confidence: 0.3 };
    },

    getDisplayStates() {
        // Return 4 states for user selection
        return [
            { id: "CognitiveOverdrive", label: "Overloaded" },
            { id: "SomaticTension", label: "Tense" },
            { id: "RecoveryDebt", label: "Drained" },
            { id: "AnticipatoryStress", label: "On edge" }
        ];
    },

    // Predict next state based on patterns
    predictNextState(sessionHistory) {
        if (sessionHistory.length < 5) return null;
        
        const recent = sessionHistory.slice(-5);
        
        // Simple Markov-like prediction
        const transitions = {};
        
        for (let i = 0; i < recent.length - 1; i++) {
            const from = recent[i].state;
            const to = recent[i + 1].state;
            
            if (!transitions[from]) transitions[from] = {};
            transitions[from][to] = (transitions[from][to] || 0) + 1;
        }
        
        const lastState = recent[recent.length - 1].state;
        const possibleNext = transitions[lastState];
        
        if (possibleNext) {
            // Find most common transition
            let maxCount = 0;
            let predictedState = null;
            
            for (const [state, count] of Object.entries(possibleNext)) {
                if (count > maxCount) {
                    maxCount = count;
                    predictedState = state;
                }
            }
            
            return predictedState;
        }
        
        return null;
    },

    // Get personalized insight
    generateInsight(sessionHistory) {
        if (sessionHistory.length < 10) return "Continue using LIMEN to unlock personalized insights.";
        
        const lastWeek = sessionHistory.slice(-7);
        const weekBefore = sessionHistory.slice(-14, -7);
        
        if (lastWeek.length === 0) return "Complete your first session this week to see insights.";
        
        // Calculate improvement
        const recentEffectiveness = this.calculateEffectiveness(lastWeek);
        const previousEffectiveness = this.calculateEffectiveness(weekBefore);
        
        const improvement = recentEffectiveness - previousEffectiveness;
        
        if (improvement > 10) {
            return "You're regulating more effectively than last week. Keep it up.";
        } else if (improvement < -10) {
            return "Notice any patterns making regulation harder this week?";
        }
        
        // Check time patterns
        const morningSessions = lastWeek.filter(s => {
            const hour = new Date(s.timestamp).getHours();
            return hour >= 5 && hour < 12;
        }).length;
        
        if (morningSessions > lastWeek.length * 0.6) {
            return "Your regulation patterns are strongest in the morning.";
        }
        
        return "Consistency builds resilience. You're on track.";
    },

    calculateEffectiveness(sessions) {
        if (sessions.length === 0) return 0;
        const effective = sessions.filter(s => s.feedback === 'yes').length;
        return Math.round((effective / sessions.length) * 100) || 0;
    },

    // Check if we should show state selection
    shouldShowStateSelection(confidence, lastUserSelectionHours = 24) {
        return confidence < 0.7 || lastUserSelectionHours > 24;
    }
};

// Export for debugging
window.STATE_ENGINE = STATE_ENGINE;
