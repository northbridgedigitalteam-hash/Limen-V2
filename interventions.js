const INTERVENTIONS = {
    "CognitiveOverdrive": {
        title: "Overloaded",
        text: "Let your eyes soften. Notice the edges of the room without focusing. Breathe in through your nose, out slowly for 90 seconds.",
        duration: 90,
        alternative: "Place hands on opposite shoulders. Apply gentle pressure. Alternate sides with each exhale for 90 seconds."
    },
    "EmotionalLoad": {
        title: "Emotional Load",
        text: "Apply alternating pressure to hands or thighs for 90 seconds. Left, then right, matching your breath.",
        duration: 90,
        alternative: "Hum quietly on your exhale for 90 seconds. Let the vibration settle in your chest."
    },
    "SomaticTension": {
        title: "Tense",
        text: "Drop your tongue from the roof of your mouth. Roll shoulders back gently. Breathe slowly for 90 seconds.",
        duration: 90,
        alternative: "Press palms together firmly for 5 seconds, release completely. Repeat 3 times."
    },
    "Hypervigilance": {
        title: "On Edge",
        text: "Widen your gaze. Identify 5 objects in your periphery. Breathe slowly through your nose.",
        duration: 90,
        alternative: "Place one hand on your sternum. Breathe into that space for 90 seconds."
    },
    "DecisionFatigue": {
        title: "Decision Fatigue",
        text: "Name the next smallest necessary action. Nothing else. Breathe 3 times.",
        duration: 60,
        alternative: "Close your eyes. Count 10 breaths. Nothing else."
    },
    "Understimulated": {
        title: "Flat",
        text: "Stand up. Lean forward slightly. Take 3 sharp nasal inhales. Return.",
        duration: 60,
        alternative: "Splash cold water on your wrists. Breathe deeply 3 times."
    },
    "FragmentedFocus": {
        title: "Fragmented",
        text: "Close your eyes. Block sound with your hands. Count 90 seconds of breathing.",
        duration: 90,
        alternative: "Focus on a single point in the room. Soften your gaze for 90 seconds."
    },
    "RecoveryDebt": {
        title: "Drained",
        text: "Sit or lie down. Close your eyes. Breathe without any task for 90 seconds.",
        duration: 90,
        alternative: "Place hands over your eyes. Breathe into the darkness for 90 seconds."
    },
    "AnticipatoryStress": {
        title: "Anticipatory",
        text: "Name only the next 10 minutes. Ignore everything else. Breathe 3 slow breaths.",
        duration: 60,
        alternative: "Write one sentence about what you're carrying. Then close the note."
    },
    "SocialDepletion": {
        title: "Social Depletion",
        text: "Reduce input. Turn away from screens. Be still for 90 seconds.",
        duration: 90,
        alternative: "Put on noise-canceling or earplugs. Breathe for 90 seconds."
    },
    "ShutdownDrift": {
        title: "Drifting",
        text: "Activate peripheral vision. Make one micro-movement. No breath control.",
        duration: 60,
        alternative: "Change your position completely. Stand if sitting, sit if standing."
    },
    "Baseline": {
        title: "Regulated",
        text: "You're at baseline. No intervention needed.",
        duration: 0
    }
};

function getIntervention(state) {
    return INTERVENTIONS[state] || INTERVENTIONS["CognitiveOverdrive"];
}

function getAlternativeIntervention(state) {
    const intervention = INTERVENTIONS[state];
    return intervention.alternative ? {
        ...intervention,
        text: intervention.alternative
    } : intervention;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { INTERVENTIONS, getIntervention, getAlternativeIntervention };
}
