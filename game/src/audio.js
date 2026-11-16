// All sound is synthesized with WebAudio: no audio files, no network, nothing
// borrowed. Every effect is a few oscillators or a short noise burst, and the
// music is a quiet two-oscillator pad that starts on the player's first input.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  unlock() {
    if (this.ensure()) this.startMusic();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  noise(dur, gain, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t0);
    } catch {
      // See tone().
    }
  }

  collect(carried) {
    const base = 620 + carried * 70;
    this.tone(base, 0.12, 'sine', 0.22);
    this.tone(base * 1.5, 0.16, 'sine', 0.16, 0.05);
  }

  deliver() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.22, i * 0.07));
  }

  hit() {
    this.noise(0.22, 0.5, 900);
    this.tone(140, 0.25, 'sawtooth', 0.25, 0, 55);
  }

  dash() {
    this.noise(0.16, 0.28, 3200);
    this.tone(300, 0.14, 'sine', 0.12, 0, 720);
  }

  wispPop() {
    this.tone(880, 0.1, 'square', 0.12, 0, 220);
    this.noise(0.1, 0.18, 2400);
  }

  wardenRoar() {
    this.tone(98, 0.7, 'sawtooth', 0.3, 0, 49);
    this.tone(147, 0.7, 'sawtooth', 0.18, 0.05, 73);
  }

  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.22, i * 0.11));
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.2, i * 0.16));
  }

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    try {
      const pad = this.ctx.createGain();
      pad.gain.value = 0.05;
      pad.connect(this.master);
      const o1 = this.ctx.createOscillator();
      o1.type = 'triangle';
      o1.frequency.value = 110;
      const o2 = this.ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 164.81;
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.08;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(pad.gain);
      o1.connect(pad);
      o2.connect(pad);
      o1.start();
      o2.start();
      lfo.start();
    } catch {
      // See tone().
    }
  }
}
