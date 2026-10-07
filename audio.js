// Atari 2600 TIA Sound Synthesizer Emulation using Web Audio API
class AtariAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.engineOscP1 = null;
    this.engineOscP2 = null;
    this.engineGainP1 = null;
    this.engineGainP2 = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.setupEngineSounds();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSounds() {
    if (!this.ctx) return;

    // P1 Engine rumble
    this.engineOscP1 = this.ctx.createOscillator();
    this.engineGainP1 = this.ctx.createGain();
    this.engineOscP1.type = 'sawtooth';
    this.engineOscP1.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineGainP1.gain.setValueAtTime(0, this.ctx.currentTime);
    this.engineOscP1.connect(this.engineGainP1);
    this.engineGainP1.connect(this.ctx.destination);
    this.engineOscP1.start();

    // P2 Engine rumble
    this.engineOscP2 = this.ctx.createOscillator();
    this.engineGainP2 = this.ctx.createGain();
    this.engineOscP2.type = 'sawtooth';
    this.engineOscP2.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineGainP2.gain.setValueAtTime(0, this.ctx.currentTime);
    this.engineOscP2.connect(this.engineGainP2);
    this.engineGainP2.connect(this.ctx.destination);
    this.engineOscP2.start();
  }

  updateEngine(p1Moving, p2Moving) {
    if (!this.ctx || !this.enabled || !this.engineGainP1 || !this.engineGainP2) return;
    const t = this.ctx.currentTime;
    
    // Smooth gain ramp for engine rumble
    const targetGainP1 = p1Moving ? 0.04 : 0;
    const targetGainP2 = p2Moving ? 0.04 : 0;
    this.engineGainP1.gain.setTargetAtTime(targetGainP1, t, 0.05);
    this.engineGainP2.gain.setTargetAtTime(targetGainP2, t, 0.05);
  }

  // Classic Atari 2600 cannon shot: short square wave frequency drop
  playFire() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Dual blast sound for diagonal / two-sided cannons
  playDualFire() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(420, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.14);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(260, t);
    osc2.frequency.exponentialRampToValueAtTime(50, t + 0.14);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.15);
    osc2.stop(t + 0.15);
  }

  // Guided missile rocket launch / thruster screech
  playMissileLaunch() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.22);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Shell bounce / ricochet blip
  playBounce() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.05);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Atari 2600 crunchy white noise explosion
  playExplosion() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.45);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // End of match buzzer
  playBuzzer() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.engineGainP1 && this.engineGainP2) {
      this.engineGainP1.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineGainP2.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.enabled;
  }
}

window.atariAudio = new AtariAudio();
