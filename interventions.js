const INTERVENTIONS = {
    "CognitiveOverdrive": {
        title: "Overloaded",
        text: "Let your eyes soften. Notice the edges of the room without focusing. Breathe in through your nose, out slowly for 90 seconds.",
        duration: 90,
        alternative: "Place hands on opposite shoulders. Apply gentle pressure. Alternate sides with each exhale for 60 seconds.",
        thirdOption: "Close your eyes. Count backwards from 100 by 3s. Focus only on the numbers.",
        color: "#6bc5a6",
        audio: "brownNoise",
        category: "sensory_reduction",
        difficulty: 1
    },
    "EmotionalLoad": {
        title: "Emotional Load",
        text: "Apply alternating pressure to hands or thighs for 90 seconds. Left, then right, matching your breath.",
        duration: 90,
        alternative: "Hum quietly on your exhale for 60 seconds. Let the vibration settle in your chest.",
        thirdOption: "Name three emotions you're feeling. Breathe into the space between naming and feeling.",
        color: "#ff6b9d",
        audio: "focusTone",
        category: "somatic_regulation",
        difficulty: 2
    },
    "SomaticTension": {
        title: "Tense",
        text: "Drop your tongue from the roof of your mouth. Roll shoulders back gently. Breathe slowly for 90 seconds.",
        duration: 90,
        alternative: "Press palms together firmly for 5 seconds, release completely. Repeat 3 times.",
        thirdOption: "Scan your body from toes to head. Release tension in each area as you breathe out.",
        color: "#4dabf7",
        audio: "brownNoise",
        category: "body_awareness",
        difficulty: 1
    },
    "Hypervigilance": {
        title: "On Edge",
        text: "Widen your gaze. Identify 5 objects in your periphery. Breathe slowly through your nose.",
        duration: 90,
        alternative: "Place one hand on your sternum. Breathe into that space for 60 seconds.",
        thirdOption: "Name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, 1 you can taste.",
        color: "#ff922b",
        audio: "focusTone",
        category: "grounding",
        difficulty: 2
    },
    "DecisionFatigue": {
        title: "Decision Fatigue",
        text: "Name the next smallest necessary action. Nothing else. Breathe 3 times.",
        duration: 60,
        alternative: "Close your eyes. Count 10 breaths. Nothing else.",
        thirdOption: "Write down the next 3 tasks. Cross off two. Do only the one that remains.",
        color: "#da77f2",
        audio: "brownNoise",
        category: "cognitive_simplification",
        difficulty: 3
    },
    "Understimulated": {
        title: "Flat",
        text: "Stand up. Lean forward slightly. Take 3 sharp nasal inhales. Return.",
        duration: 60,
        alternative: "Splash cold water on your wrists. Breathe deeply 3 times.",
        thirdOption: "Change your environment completely. Move to a different room or position.",
        color: "#51cf66",
        audio: "focusTone",
        category: "activation",
        difficulty: 1
    },
    "FragmentedFocus": {
        title: "Fragmented",
        text: "Close your eyes. Block sound with your hands. Count 90 seconds of breathing.",
        duration: 90,
        alternative: "Focus on a single point in the room. Soften your gaze for 60 seconds.",
        thirdOption: "Use a timer for 5 minutes of single-tasking. No switching allowed.",
        color: "#ffd43b",
        audio: "brownNoise",
        category: "attention_training",
        difficulty: 3
    },
    "RecoveryDebt": {
        title: "Drained",
        text: "Sit or lie down. Close your eyes. Breathe without any task for 90 seconds.",
        duration: 90,
        alternative: "Place hands over your eyes. Breathe into the darkness for 90 seconds.",
        thirdOption: "Set a timer for 5 minutes of complete rest. No screens, no tasks.",
        color: "#3dc9c0",
        audio: "brownNoise",
        category: "restorative",
        difficulty: 1
    },
    "AnticipatoryStress": {
        title: "Anticipatory",
        text: "Focus only on the next 10 minutes. Ignore everything else. Breathe 3 slow breaths.",
        duration: 60,
        alternative: "Write one sentence about what you're carrying. Then close the note.",
        thirdOption: "Identify the 'next right thing' - just one small action. Do only that.",
        color: "#ff8787",
        audio: "focusTone",
        category: "temporal_boundaries",
        difficulty: 2
    },
    "SocialDepletion": {
        title: "Social Depletion",
        text: "Reduce input. Turn away from screens. Be still for 90 seconds.",
        duration: 90,
        alternative: "Put on noise-canceling or earplugs. Breathe for 60 seconds.",
        thirdOption: "Create a 'social buffer' - 15 minutes of alone time with no interaction.",
        color: "#74c0fc",
        audio: "brownNoise",
        category: "sensory_reduction",
        difficulty: 1
    },
    "ShutdownDrift": {
        title: "Shutdown",
        text: "Activate peripheral vision. Make one micro-movement. No breath control.",
        duration: 60,
        alternative: "Change your position completely. Stand if sitting, sit if standing.",
        thirdOption: "Name one sensation in your body. Just notice it without changing it.",
        color: "#b197fc",
        audio: "focusTone",
        category: "somatic_activation",
        difficulty: 3
    },
    "Baseline": {
        title: "Regulated",
        text: "You're at baseline. No intervention needed.",
        duration: 0,
        color: "#51cf66",
        audio: null,
        category: "maintenance",
        difficulty: 0
    },
    "EmergencyReset": {
        title: "Emergency Reset",
        text: "Place both feet flat on the ground. Press palms together firmly. Breathe: 4 seconds in, 7 seconds hold, 8 seconds out. Repeat 3 times.",
        duration: 90,
        color: "#ff6b6b",
        audio: "brownNoise",
        category: "emergency",
        difficulty: 1
    }
};

// Get intelligent intervention for a state
function getIntervention(state, useIntelligence = true) {
    if (!INTERVENTIONS[state]) {
        return INTERVENTIONS["CognitiveOverdrive"];
    }
    
    // If we have intelligence data and user wants intelligent recommendations
    if (useIntelligence && window.STORAGE) {
        const recommendedIntervention = STORAGE.getRecommendedIntervention(state);
        
        if (recommendedIntervention && INTERVENTIONS[recommendedIntervention]) {
            return INTERVENTIONS[recommendedIntervention];
        }
        
        // If no recommendation but we have adaptation level, adjust difficulty
        const data = STORAGE.getData();
        if (data && data.userProfile.adaptationLevel) {
            const adaptationLevel = data.userProfile.adaptationLevel;
            
            // For advanced users, suggest more challenging interventions
            if (adaptationLevel >= 4) {
                const baseIntervention = INTERVENTIONS[state];
                // Return third option for advanced users
                if (baseIntervention.thirdOption) {
                    return {
                        ...baseIntervention,
                        text: baseIntervention.thirdOption,
                        difficulty: Math.min(baseIntervention.difficulty + 1, 5)
                    };
                }
            }
        }
    }
    
    // Default to main intervention
    return INTERVENTIONS[state];
}

// Get alternative intervention based on intelligence
function getAlternativeIntervention(state) {
    const base = INTERVENTIONS[state];
    if (!base) return INTERVENTIONS["CognitiveOverdrive"];
    
    // Check if alternative was recently used
    const data = STORAGE.getData();
    if (data && data.userProfile.interventionHistory) {
        const recentHistory = data.userProfile.interventionHistory.slice(-5);
        const lastUsedAlternative = recentHistory.find(h => 
            h.state === state && h.intervention === `${state}_alternative`
        );
        
        // If alternative was recently used, try third option
        if (lastUsedAlternative && base.thirdOption) {
            return {
                ...base,
                text: base.thirdOption
            };
        }
    }
    
    // Default to alternative
    return {
        ...base,
        text: base.alternative || base.text
    };
}

// Get all available states
function getAllStates() {
    return Object.keys(INTERVENTIONS);
}

// Get state display name
function getStateDisplayName(stateId) {
    const intervention = INTERVENTIONS[stateId];
    return intervention ? intervention.title : stateId;
}

// Get state color
function getStateColor(stateId) {
    const intervention = INTERVENTIONS[stateId];
    return intervention ? intervention.color : "#6bc5a6";
}

// Get display states for selection screen (intelligent ordering)
function getDisplayStates() {
    const allStates = [
        { id: "CognitiveOverdrive", label: "Overloaded" },
        { id: "SomaticTension", label: "Tense" },
        { id: "RecoveryDebt", label: "Drained" },
        { id: "Hypervigilance", label: "On edge" },
        { id: "EmotionalLoad", label: "Emotional" },
        { id: "ShutdownDrift", label: "Shutdown" }
    ];
    
    // If we have intelligence data, reorder based on frequency
    if (window.STORAGE) {
        const stats = STORAGE.getStats();
        if (stats && stats.stateFrequency) {
            // Sort by frequency (most frequent first)
            allStates.sort((a, b) => {
                const freqA = stats.stateFrequency[a.id] || 0;
                const freqB = stats.stateFrequency[b.id] || 0;
                return freqB - freqA;
            });
        }
    }
    
    return allStates;
}

// Get personalized intervention based on time of day
function getTimeBasedIntervention() {
    const hour = new Date().getHours();
    
    // Default morning intervention
    if (hour >= 5 && hour < 12) {
        return "CognitiveOverdrive"; // Morning focus/planning
    }
    // Afternoon slump
    else if (hour >= 14 && hour < 17) {
        return "Understimulated"; // Afternoon energy dip
    }
    // Evening wind down
    else if (hour >= 20) {
        return "RecoveryDebt"; // Evening recovery
    }
    
    return "CognitiveOverdrive";
}

// Export for debugging
window.INTERVENTIONS = INTERVENTIONS;
window.getIntervention = getIntervention;
window.getAlternativeIntervention = getAlternativeIntervention;
window.getTimeBasedIntervention = getTimeBasedIntervention;
