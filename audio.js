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
        STORAGE.updateSetting('ambientAudio', enabled);
        
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
