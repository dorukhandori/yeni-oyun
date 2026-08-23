/**
 * WebAudio one-shots (oscillators / noise) plus two Mixkit music beds.
 * Resumes on first user gesture (browser autoplay policy).
 */

import { AUDIO } from "../constants";
import { assetUrl } from "../assets/paths";

export type MusicBed = "menu" | "play" | "none";

function readStoredMute(): boolean {
  try {
    const raw = window.localStorage.getItem(AUDIO.muteStorageKey);
    // No stored preference yet (first visit) — default to silent; the
    // player opts in via the mute toggle rather than being surprised by
    // audio on load.
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

function writeStoredMute(muted: boolean): void {
  try {
    window.localStorage.setItem(AUDIO.muteStorageKey, muted ? "1" : "0");
  } catch {
    /* Safari private mode / quota — preference lives only for this session. */
  }
}

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private waveGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private started = false;
  private waveNodes: AudioNode[] = [];
  private muted = readStoredMute();
  private wantedBed: MusicBed = "none";
  private musicReady = false;
  private musicLoading = false;
  private musicSlots: {
    menu: { gain: GainNode; src: AudioBufferSourceNode | null };
    play: { gain: GainNode; src: AudioBufferSourceNode | null };
  } | null = null;

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) {
      writeStoredMute(muted);
      return;
    }
    this.muted = muted;
    writeStoredMute(muted);
    this.applyMasterGain(false);
  }

  /** Returns the new muted state. */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Call from a click / key / pointer so the context can unlock. */
  unlock(): void {
    if (this.started) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    // Honour a stored mute immediately — never open at masterGain then slam to 0.
    this.master.gain.value = this.muted ? 0 : AUDIO.masterGain;
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
    this.beginMusicLoad();
  }

  /**
   * Title/Hub = menu theme, island = mystical bed, end-cards = silence.
   * Safe before unlock — the wanted bed is applied once buffers decode.
   */
  setMusicBed(bed: MusicBed): void {
    if (this.wantedBed === bed) return;
    this.wantedBed = bed;
    this.applyMusicBed();
  }

  private applyMasterGain(immediate: boolean): void {
    if (!this.master || !this.ctx) return;
    const t = this.ctx.currentTime;
    const target = this.muted ? 0 : AUDIO.masterGain;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    if (immediate) {
      this.master.gain.setValueAtTime(target, t);
    } else {
      this.master.gain.linearRampToValueAtTime(target, t + AUDIO.muteRamp);
    }
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

  private beginMusicLoad(): void {
    if (this.musicLoading || this.musicReady || !this.ctx || !this.filter) return;
    this.musicLoading = true;
    const ctx = this.ctx;
    const menuGain = ctx.createGain();
    const playGain = ctx.createGain();
    menuGain.gain.value = 0;
    playGain.gain.value = 0;
    menuGain.connect(this.filter);
    playGain.connect(this.filter);
    this.musicSlots = {
      menu: { gain: menuGain, src: null },
      play: { gain: playGain, src: null },
    };
    void Promise.all([
      this.decodeMusic(AUDIO.music.menu),
      this.decodeMusic(AUDIO.music.play),
    ])
      .then(([menuBuf, playBuf]) => {
        if (!this.ctx || !this.musicSlots) return;
        this.musicSlots.menu.src = this.startLoop(menuBuf, this.musicSlots.menu.gain);
        this.musicSlots.play.src = this.startLoop(playBuf, this.musicSlots.play.gain);
        this.musicReady = true;
        this.applyMusicBed();
      })
      .catch((err: unknown) => {
        console.warn("[audio] music beds failed to load", err);
        this.musicLoading = false;
      });
  }

  private async decodeMusic(relativePath: string): Promise<AudioBuffer> {
    if (!this.ctx) throw new Error("no audio context");
    const res = await fetch(assetUrl(relativePath));
    if (!res.ok) throw new Error(`${relativePath} ${res.status}`);
    const raw = await res.arrayBuffer();
    // decodeAudioData detaches the buffer on some engines — copy first.
    return this.ctx.decodeAudioData(raw.slice(0));
  }

  private startLoop(buf: AudioBuffer, dest: AudioNode): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(dest);
    src.start();
    return src;
  }

  private applyMusicBed(): void {
    if (!this.ctx || !this.musicSlots || !this.musicReady) return;
    const t = this.ctx.currentTime;
    const fade = AUDIO.music.fade;
    const menuTarget = this.wantedBed === "menu" ? AUDIO.music.menuGain : 0.0001;
    const playTarget = this.wantedBed === "play" ? AUDIO.music.playGain : 0.0001;
    const ramp = (g: GainNode, target: number) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.exponentialRampToValueAtTime(target, t + fade);
    };
    ramp(this.musicSlots.menu.gain, menuTarget);
    ramp(this.musicSlots.play.gain, playTarget);
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

  /** Soft, non-alarming cue for the wading boundary — a nudge, not a buzzer. */
  boundary(): void {
    this.blip(210, 0.3, "sine", 0.06);
  }

  /** Step onto the hero deck via the causeway (LOT-63). Wood, not a fanfare. */
  board(): void {
    this.blip(165, 0.18, "triangle", 0.11);
    this.blip(98, 0.28, "sine", 0.08, 0.05);
  }

  disembark(): void {
    this.blip(140, 0.16, "sine", 0.07);
  }

  /**
   * Hallucination-figure contact (Lotus Adası only). Deliberately not a
   * "hit"/damage sound — the figure is an information disruption, not an
   * enemy (gdd-lotus-hallucination.md §1). A hollow, receding chime.
   */
  hallucinationTouch(): void {
    this.blip(340, 0.4, "sine", 0.1);
    this.blip(255, 0.5, "sine", 0.07, 0.09);
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
