// NEXORA PLAY — Universal Web Audio Sound Engine
// Zero external audio files required. Uses Web Audio API synthesizers for 60fps low-latency sound.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Load persisted volume settings
    this.settings = JSON.parse(localStorage.getItem('nexora_sound_settings') || JSON.stringify({
      master: 0.8,
      sfx: 0.9,
      music: 0.5,
      muted: false
    }));

    this.unlocked = false;
    this.musicLoop = null;
    this.initAudioContext();
  }

  initAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.applySettings();

    // Unlock audio on first user gesture
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.unlocked = true;
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  applySettings() {
    if (!this.masterGain) return;
    const isMuted = this.settings.muted;
    this.masterGain.gain.setValueAtTime(isMuted ? 0 : this.settings.master, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(this.settings.sfx, this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.settings.music, this.ctx.currentTime);
    localStorage.setItem('nexora_sound_settings', JSON.stringify(this.settings));
  }

  setMaster(val) {
    this.settings.master = Math.max(0, Math.min(1, val));
    this.applySettings();
  }

  setSfx(val) {
    this.settings.sfx = Math.max(0, Math.min(1, val));
    this.applySettings();
  }

  setMusic(val) {
    this.settings.music = Math.max(0, Math.min(1, val));
    this.applySettings();
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.applySettings();
    return this.settings.muted;
  }

  // --- Sound Effects Synthesizers ---
  playClick() {
    if (!this.ctx || this.settings.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playCollect() {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playJump() {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playHit() {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playExplosion() {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    // White noise explosion
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  playPowerup() {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const freqs = [330, 392, 493.88, 587.33, 783.99]; // E, G, B, D, G
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  playWin() {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A, C#, E, A
    notes.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  playGameOver() {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const notes = [400, 350, 300, 220];
    notes.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.12;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
    });
  }
}

// Global Singleton
window.NexoraSound = new SoundEngine();
