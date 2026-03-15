// ============================================
// Dustwalker - Audio Manager (Web Audio API)
// Moody ambient music + improved sound effects
// ============================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicVolume = 0.25;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.musicNodes = [];
        this.ambientArea = null;
        this._windNode = null;
        this._windGain = null;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Master compressor to prevent clipping
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.knee.value = 10;
            this.compressor.ratio.value = 4;
            this.compressor.connect(this.ctx.destination);

            // Music bus
            this.musicBus = this.ctx.createGain();
            this.musicBus.gain.value = this.musicVolume;
            this.musicBus.connect(this.compressor);

            // SFX bus
            this.sfxBus = this.ctx.createGain();
            this.sfxBus.gain.value = this.sfxVolume;
            this.sfxBus.connect(this.compressor);

            // Reverb for atmospheric depth
            this.reverb = this._createReverb(2.0, 0.3);
            this.reverbBus = this.ctx.createGain();
            this.reverbBus.gain.value = 0.15;
            this.reverbBus.connect(this.reverb);
            this.reverb.connect(this.compressor);
        } catch (e) {
            this.enabled = false;
        }
    }

    _createReverb(duration, decay) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay * 10);
            }
        }
        const conv = this.ctx.createConvolver();
        conv.buffer = impulse;
        return conv;
    }

    // ---- NOISE GENERATOR (for wind, ambience) ----
    _createNoise(duration) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const buf = this.ctx.createBuffer(1, length, rate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buf;
    }

    // ---- AMBIENT MUSIC ----
    // Dark, droning ambient music that shifts based on area

    startMusic(areaId) {
        if (!this.enabled || !this.ctx) return;
        // Resume AudioContext if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') this.ctx.resume();

        if (this.ambientArea === areaId) return;
        this.stopMusic();
        this.ambientArea = areaId;

        const now = this.ctx.currentTime;

        // Base drone frequencies per area mood
        const moods = {
            'village': { baseFreq: 55, chordFreqs: [55, 82.4, 110], tempo: 0.02, brightness: 0.3, windVol: 0.04 },
            'wasteland': { baseFreq: 41.2, chordFreqs: [41.2, 61.7, 82.4], tempo: 0.015, brightness: 0.15, windVol: 0.08 },
            'cave': { baseFreq: 36.7, chordFreqs: [36.7, 55, 73.4], tempo: 0.01, brightness: 0.1, windVol: 0.02 },
            'encounter': { baseFreq: 41.2, chordFreqs: [41.2, 55, 73.4], tempo: 0.018, brightness: 0.2, windVol: 0.06 },
        };
        const mood = moods[areaId] || moods['wasteland'];

        // Layer 1: Deep bass drone (sine + sub-sine)
        const drone1 = this.ctx.createOscillator();
        drone1.type = 'sine';
        drone1.frequency.value = mood.baseFreq;
        const drone1Gain = this.ctx.createGain();
        drone1Gain.gain.value = 0;
        drone1Gain.gain.linearRampToValueAtTime(0.25, now + 4);
        drone1.connect(drone1Gain);
        drone1Gain.connect(this.musicBus);
        drone1.start(now);

        // Sub-bass
        const subDrone = this.ctx.createOscillator();
        subDrone.type = 'sine';
        subDrone.frequency.value = mood.baseFreq / 2;
        const subGain = this.ctx.createGain();
        subGain.gain.value = 0;
        subGain.gain.linearRampToValueAtTime(0.12, now + 3);
        subDrone.connect(subGain);
        subGain.connect(this.musicBus);
        subDrone.start(now);

        // Layer 2: Slow-modulated pad chord (triangle waves for warmth)
        const padNodes = [];
        for (let i = 0; i < mood.chordFreqs.length; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = mood.chordFreqs[i] * 2;
            // Slow vibrato
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.1 + i * 0.05;
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = mood.chordFreqs[i] * 0.01;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now);

            const padGain = this.ctx.createGain();
            padGain.gain.value = 0;
            padGain.gain.linearRampToValueAtTime(0.06 * mood.brightness, now + 5 + i);
            osc.connect(padGain);
            padGain.connect(this.musicBus);
            padGain.connect(this.reverbBus);
            osc.start(now);
            padNodes.push({ osc, lfo, gain: padGain });
        }

        // Layer 3: Filtered noise (wind/atmosphere)
        const noiseBuf = this._createNoise(4);
        const windSrc = this.ctx.createBufferSource();
        windSrc.buffer = noiseBuf;
        windSrc.loop = true;
        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 400;
        windFilter.Q.value = 1;
        // Modulate wind filter slowly
        const windLfo = this.ctx.createOscillator();
        windLfo.type = 'sine';
        windLfo.frequency.value = 0.08;
        const windLfoGain = this.ctx.createGain();
        windLfoGain.gain.value = 200;
        windLfo.connect(windLfoGain);
        windLfoGain.connect(windFilter.frequency);
        windLfo.start(now);

        this._windGain = this.ctx.createGain();
        this._windGain.gain.value = 0;
        this._windGain.gain.linearRampToValueAtTime(mood.windVol, now + 3);
        windSrc.connect(windFilter);
        windFilter.connect(this._windGain);
        this._windGain.connect(this.musicBus);
        this._windGain.connect(this.reverbBus);
        windSrc.start(now);
        this._windNode = windSrc;

        // Layer 4: Occasional distant metallic pings (interval-based)
        this._pingInterval = setInterval(() => {
            if (!this.enabled || !this.ctx) return;
            if (Math.random() > 0.3) return; // Only 30% chance each tick
            const t = this.ctx.currentTime;
            const pingOsc = this.ctx.createOscillator();
            pingOsc.type = 'sine';
            const pingFreq = 800 + Math.random() * 1200;
            pingOsc.frequency.setValueAtTime(pingFreq, t);
            pingOsc.frequency.exponentialRampToValueAtTime(pingFreq * 0.7, t + 1.5);
            const pingGain = this.ctx.createGain();
            pingGain.gain.setValueAtTime(0.015 * mood.brightness, t);
            pingGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            pingOsc.connect(pingGain);
            pingGain.connect(this.musicBus);
            pingGain.connect(this.reverbBus);
            pingOsc.start(t);
            pingOsc.stop(t + 1.5);
        }, 4000 + Math.random() * 6000);

        this.musicNodes = [
            { osc: drone1, gain: drone1Gain },
            { osc: subDrone, gain: subGain },
            ...padNodes.map(p => ({ osc: p.osc, gain: p.gain, lfo: p.lfo })),
            { src: windSrc, gain: this._windGain, lfo: windLfo }
        ];
    }

    stopMusic() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
            this._pingInterval = null;
        }
        const now = this.ctx ? this.ctx.currentTime : 0;
        for (const node of this.musicNodes) {
            try {
                if (node.gain) node.gain.gain.linearRampToValueAtTime(0.001, now + 1);
                if (node.osc) { node.osc.stop(now + 1.2); }
                if (node.lfo) { node.lfo.stop(now + 1.2); }
                if (node.src) { node.src.stop(now + 1.2); }
            } catch (e) { /* already stopped */ }
        }
        this.musicNodes = [];
        this.ambientArea = null;
        this._windNode = null;
        this._windGain = null;
    }

    // ---- SOUND EFFECTS ----

    _playTone(options) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = options.type || 'sine';
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxBus);
        if (options.reverb) gain.connect(this.reverbBus);

        if (options.freq) osc.frequency.setValueAtTime(options.freq, now);
        if (options.freqEnd) osc.frequency.exponentialRampToValueAtTime(options.freqEnd, now + options.duration);
        if (options.freqSteps) {
            for (const [t, f] of options.freqSteps) {
                osc.frequency.setValueAtTime(f, now + t);
            }
        }
        gain.gain.setValueAtTime(options.vol || 0.3, now);
        if (options.attack) {
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(options.vol || 0.3, now + options.attack);
        }
        gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);
        osc.start(now);
        osc.stop(now + options.duration + 0.01);
        return osc;
    }

    _playNoise(options) {
        const now = this.ctx.currentTime;
        const buf = this._createNoise(options.duration);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = options.filterType || 'lowpass';
        filter.frequency.value = options.filterFreq || 2000;
        const gain = this.ctx.createGain();
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        if (options.reverb) gain.connect(this.reverbBus);
        gain.gain.setValueAtTime(options.vol || 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);
        src.start(now);
        src.stop(now + options.duration + 0.01);
    }

    playSfx(type) {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        switch (type) {
            case 'click':
                this._playTone({ freq: 1200, freqEnd: 600, duration: 0.06, vol: 0.15, type: 'sine' });
                break;

            case 'hit': {
                // Meaty impact: low thud + crunch noise
                this._playTone({ freq: 120, freqEnd: 40, duration: 0.15, vol: 0.35, type: 'sawtooth' });
                this._playNoise({ duration: 0.1, filterFreq: 800, vol: 0.15 });
                break;
            }

            case 'miss': {
                // Whoosh: filtered noise sweep
                this._playNoise({ duration: 0.25, filterType: 'bandpass', filterFreq: 1500, vol: 0.12 });
                this._playTone({ freq: 250, freqEnd: 80, duration: 0.2, vol: 0.08, type: 'sine' });
                break;
            }

            case 'death': {
                // Dramatic death: descending tone + noise burst
                this._playTone({ freq: 300, freqEnd: 25, duration: 0.6, vol: 0.3, type: 'sawtooth', reverb: true });
                this._playTone({ freq: 200, freqEnd: 20, duration: 0.8, vol: 0.15, type: 'sine', reverb: true });
                this._playNoise({ duration: 0.3, filterFreq: 600, vol: 0.12 });
                break;
            }

            case 'levelup': {
                // Triumphant ascending tones
                this._playTone({ freqSteps: [[0, 400], [0.12, 500], [0.24, 600], [0.36, 800]], duration: 0.6, vol: 0.2, type: 'sine', reverb: true });
                this._playTone({ freqSteps: [[0.05, 200], [0.17, 250], [0.29, 300], [0.41, 400]], duration: 0.65, vol: 0.1, type: 'triangle', reverb: true });
                break;
            }

            case 'pickup': {
                // Quick upward blip
                this._playTone({ freq: 700, freqEnd: 1100, duration: 0.08, vol: 0.15, type: 'sine' });
                this._playTone({ freq: 350, freqEnd: 550, duration: 0.06, vol: 0.08, type: 'triangle' });
                break;
            }

            case 'door': {
                // Heavy door creak + thud (area transition)
                this._playTone({ freq: 80, freqEnd: 60, duration: 0.3, vol: 0.2, type: 'square' });
                this._playNoise({ duration: 0.15, filterFreq: 400, vol: 0.08 });
                this._playTone({ freq: 150, freqEnd: 200, duration: 0.2, vol: 0.1, type: 'sawtooth', reverb: true });
                break;
            }

            case 'door_open': {
                // Creaky door opening - lighter than transition door
                this._playTone({ freq: 200, freqEnd: 350, duration: 0.2, vol: 0.08, type: 'sawtooth' });
                this._playNoise({ duration: 0.1, filterFreq: 1200, vol: 0.04 });
                break;
            }

            case 'step': {
                // Soft footstep with slight crunch
                const f = 80 + Math.random() * 40;
                this._playTone({ freq: f, freqEnd: f * 0.7, duration: 0.04, vol: 0.04, type: 'triangle' });
                this._playNoise({ duration: 0.03, filterFreq: 2000, vol: 0.02 });
                break;
            }

            case 'locked': {
                // Rattling lock - can't open
                this._playTone({ freq: 300, freqEnd: 250, duration: 0.08, vol: 0.15, type: 'square' });
                setTimeout(() => {
                    this._playTone({ freq: 280, freqEnd: 230, duration: 0.08, vol: 0.12, type: 'square' });
                }, 100);
                setTimeout(() => {
                    this._playTone({ freq: 200, freqEnd: 150, duration: 0.1, vol: 0.1, type: 'square' });
                }, 200);
                break;
            }

            case 'unlock': {
                // Satisfying lock click-open
                this._playTone({ freq: 1500, freqEnd: 800, duration: 0.05, vol: 0.12, type: 'sine' });
                setTimeout(() => {
                    this._playTone({ freq: 2000, freqEnd: 1200, duration: 0.04, vol: 0.1, type: 'sine' });
                }, 60);
                this._playNoise({ duration: 0.08, filterFreq: 3000, vol: 0.06 });
                break;
            }

            case 'combat_start': {
                // Tense combat initiation
                this._playTone({ freq: 100, freqEnd: 60, duration: 0.4, vol: 0.2, type: 'sawtooth', reverb: true });
                this._playTone({ freq: 200, freqEnd: 300, duration: 0.3, vol: 0.1, type: 'triangle', reverb: true });
                break;
            }

            case 'heal': {
                // Soft healing sound
                this._playTone({ freq: 500, freqEnd: 700, duration: 0.3, vol: 0.12, type: 'sine', reverb: true });
                this._playTone({ freq: 250, freqEnd: 350, duration: 0.25, vol: 0.06, type: 'triangle', reverb: true });
                break;
            }

            case 'critical': {
                // Devastating critical hit
                this._playTone({ freq: 150, freqEnd: 30, duration: 0.3, vol: 0.4, type: 'sawtooth' });
                this._playNoise({ duration: 0.2, filterFreq: 1200, vol: 0.2 });
                this._playTone({ freq: 60, freqEnd: 20, duration: 0.4, vol: 0.2, type: 'sine', reverb: true });
                break;
            }

            case 'gunshot': {
                // Sharp gunshot crack
                this._playNoise({ duration: 0.08, filterFreq: 4000, vol: 0.3 });
                this._playTone({ freq: 400, freqEnd: 100, duration: 0.12, vol: 0.25, type: 'sawtooth' });
                this._playNoise({ duration: 0.3, filterFreq: 800, vol: 0.05, reverb: true });
                break;
            }

            case 'error': {
                // UI error buzz
                this._playTone({ freq: 200, freqEnd: 150, duration: 0.15, vol: 0.12, type: 'square' });
                break;
            }
        }
    }
}
