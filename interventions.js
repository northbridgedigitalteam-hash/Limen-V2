const INTERVENTIONS = {
    "CognitiveOverdrive": {
        title: "Overloaded",
        text: "Let your eyes soften. Notice the edges of the room without focusing. Breathe in through your nose, out slowly for 60 seconds.",
        duration: 90,
        alternative: "Place hands on opposite shoulders. Apply gentle pressure. Alternate sides with each exhale for 60 seconds.",
        color: "#6bc5a6"
    },
    "EmotionalLoad": {
        title: "Emotional Load",
        text: "Apply alternating pressure to hands or thighs for 60 seconds. Left, then right, matching your breath.",
        duration: 90,
        alternative: "Hum quietly on your exhale for 60 seconds. Let the vibration settle in your chest.",
        color: "#ff6b9d"
    },
    "SomaticTension": {
        title: "Tense",
        text: "Drop your tongue from the roof of your mouth. Roll shoulders back gently. Breathe slowly for 60 seconds.",
        duration: 90,
        alternative: "Press palms together firmly for 5 seconds, release completely. Repeat 3 times.",
        color: "#4dabf7"
    },
    "Hypervigilance": {
        title: "On Edge",
        text: "Widen your gaze. Identify 5 objects in your periphery. Breathe slowly through your nose.",
        duration: 90,
        alternative: "Place one hand on your sternum. Breathe into that space for 60 seconds.",
        color: "#ff922b"
    },
    "DecisionFatigue": {
        title: "Decision Fatigue",
        text: "Name the next smallest necessary action. Nothing else. Breathe 3 times.",
        duration: 60,
        alternative: "Close your eyes. Count 10 breaths. Nothing else.",
        color: "#da77f2"
    },
    "Understimulated": {
        title: "Flat",
        text: "Stand up. Lean forward slightly. Take 3 sharp nasal inhales. Return.",
        duration: 60,
        alternative: "Splash cold water on your wrists. Breathe deeply 3 times.",
        color: "#51cf66"
    },
    "FragmentedFocus": {
        title: "Fragmented",
        text: "Close your eyes. Block sound with your hands. Count 60 seconds of breathing.",
        duration: 90,
        alternative: "Focus on a single point in the room. Soften your gaze for 60 seconds.",
        color: "#ffd43b"
    },
    "RecoveryDebt": {
        title: "Drained",
        text: "Sit or lie down. Close your eyes. Breathe without any task for 90 seconds.",
        duration: 90,
        alternative: "Place hands over your eyes. Breathe into the darkness for 60 seconds.",
        color: "#3dc9c0"
    },
    "AnticipatoryStress": {
        title: "Anticipatory",
        text: "Focus only on the next 10 minutes. Ignore everything else. Breathe 3 slow breaths.",
        duration: 60,
        alternative: "Write one sentence about what you're carrying. Then close the note.",
        color: "#ff8787"
    },
    "SocialDepletion": {
        title: "Social Depletion",
        text: "Reduce input. Turn away from screens. Be still for 90 seconds.",
        duration: 90,
        alternative: "Put on noise-canceling or earplugs. Breathe for 60 seconds.",
        color: "#74c0fc"
    },
    "ShutdownDrift": {
        title: "Shutdown",
        text: "Activate peripheral vision. Make one micro-movement. No breath control.",
        duration: 60,
        alternative: "Change your position completely. Stand if sitting, sit if standing.",
        color: "#b197fc"
    },
    "Baseline": {
        title: "Regulated",
        text: "You're at baseline. No intervention needed.",
        duration: 0,
        color: "#51cf66"
    }
};

// Get intervention for a state
function getIntervention(state) {
    return INTERVENTIONS[state] || INTERVENTIONS["CognitiveOverdrive"];
}

// Get alternative intervention for a state
function getAlternativeIntervention(state) {
    const intervention = INTERVENTIONS[state];
    if (intervention && intervention.alternative) {
        return {
            ...intervention,
            text: intervention.alternative
        };
    }
    return intervention || INTERVENTIONS["CognitiveOverdrive"];
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

// Get display states for selection screen
function getDisplayStates() {
    return [
        { id: "CognitiveOverdrive", label: "Overloaded" },
        { id: "SomaticTension", label: "Tense" },
        { id: "RecoveryDebt", label: "Drained" },
        { id: "Hypervigilance", label: "On edge" },
        { id: "EmotionalLoad", label: "Emotional" },
        { id: "ShutdownDrift", label: "Shutdown" }
    ];
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        INTERVENTIONS,
        getIntervention,
        getAlternativeIntervention,
        getAllStates,
        getStateDisplayName,
        getStateColor,
        getDisplayStates
    };
}
