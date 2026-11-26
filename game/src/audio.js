// Alpine Courier — all sound is synthesised with WebAudio, no audio files.
// One clear job: engine hum that follows the throttle, a chime when a ring
// is flown, a thud on a hard landing, and a short fanfare on mission success.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.muted = false;
    this.started = false;
  }

  // Browsers only let audio start after a user gesture; call from one.
  ensure() {
    if (this.started) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.started = true;
    } catch (err) {
      this.ctx = null; // no audio on this browser; the game plays silent
    }
  }

  setEngine(throttle, speed01, airborne) {
    if (!this.ctx || this.muted) return;
    const target = airborne ? 0.028 + throttle * 0.05 : 0.0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(
      48 + throttle * 55 + speed01 * 22,
      this.ctx.currentTime,
      0.15,
    );
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  ringChime() {
    this.blip(880, 0.35, 'sine', 0.16);
    setTimeout(() => this.blip(1318, 0.5, 'sine', 0.14), 90);
  }

  thud() {
    this.blip(70, 0.3, 'triangle', 0.25);
    this.blip(45, 0.45, 'sine', 0.22);
  }

  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.4, 'triangle', 0.15), i * 130);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.engineGain) this.engineGain.gain.value = 0;
    return this.muted;
  }
}
