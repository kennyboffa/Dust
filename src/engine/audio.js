// ============================================
// Dustwalker - Audio Manager (Web Audio API)
// ============================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    // Generate a simple tone-based sound effect
    playSfx(type) {
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        switch (type) {
            case 'click':
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'hit':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
                gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'miss':
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
                gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'death':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
                gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'levelup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(500, now + 0.1);
                osc.frequency.setValueAtTime(600, now + 0.2);
                osc.frequency.setValueAtTime(800, now + 0.3);
                gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'pickup':
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
                gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'door':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.setValueAtTime(200, now + 0.1);
                gain.gain.setValueAtTime(this.sfxVolume * 0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'step':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100 + Math.random() * 50, now);
                gain.gain.setValueAtTime(this.sfxVolume * 0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
        }
    }
}
