/**
 * Lightweight WebAudio bed + one-shots. No asset files — oscillators / noise.
 * Resumes on first user gesture (browser autoplay policy).
 */

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private waveGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private started = false;
  private waveNodes: AudioNode[] = [];

  /** Call from a click / key / pointer so the context can unlock. */
  unlock(): void {
    if (this.started) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 14000;
    this.filter.connect(this.master);

    this.waveGain = this.ctx.createGain();
    this.waveGain.gain.value = 0.12;
    this.waveGain.connect(this.filter);

    this.startWaves();
    this.started = true;
    void this.ctx.resume();
  }

  private startWaves(): void {
    if (!this.ctx || !this.waveGain) return;
    // Soft brownish noise via filtered buffer loop.
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 680;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 80;
    src.connect(hp);
    hp.connect(lp);
    lp.connect(this.waveGain);
    src.start();
    this.waveNodes.push(src, lp, hp);

    // Slow swell LFO on wave gain.
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.045;
    lfo.connect(lfoGain);
    lfoGain.connect(this.waveGain.gain);
    lfo.start();
    this.waveNodes.push(lfo, lfoGain);
  }

  /** Distance to shore / sea — louder near water. */
  setWaveProximity(nearSea: number, dusk: number): void {
    if (!this.waveGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 0.06 + nearSea * 0.14 + dusk * 0.08;
    this.waveGain.gain.setTargetAtTime(base, t, 0.35);
  }

  /** Memory haze muffles highs; waves stay audible (design: exempt). */
  setHaze(amount: number): void {
    if (!this.filter || !this.ctx) return;
    const hz = 14000 - amount * 9000;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.4);
  }

  pick(): void {
    this.blip(520, 0.09, "triangle", 0.18);
    this.blip(780, 0.06, "sine", 0.1, 0.04);
  }

  deliver(): void {
    this.blip(220, 0.14, "sine", 0.22);
    this.blip(330, 0.1, "triangle", 0.12, 0.08);
  }

  gift(): void {
    this.blip(400, 0.16, "sine", 0.16);
    this.blip(600, 0.12, "sine", 0.1, 0.1);
  }

  warn(): void {
    this.blip(180, 0.22, "sawtooth", 0.08);
  }

  win(): void {
    this.blip(392, 0.2, "sine", 0.14);
    this.blip(523, 0.22, "sine", 0.12, 0.12);
    this.blip(659, 0.28, "triangle", 0.1, 0.26);
  }

  lose(): void {
    this.blip(160, 0.35, "sine", 0.14);
    this.blip(110, 0.4, "triangle", 0.1, 0.15);
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}
