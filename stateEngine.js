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
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STATE_ENGINE;
}
