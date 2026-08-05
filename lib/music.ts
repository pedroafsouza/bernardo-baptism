"use client";

/**
 * An original, procedurally-synthesised chiptune loop for the mini-game.
 *
 * Generating the music with the Web Audio API instead of shipping an audio file
 * keeps the bundle tiny, needs no third-party/licensed asset, and loops
 * seamlessly forever. The tune is a cheerful major-key march in the spirit of a
 * classic platformer: a square-wave lead, a soft triangle bass and a light
 * noise hi-hat.
 */

type Note = [semitoneOrRest: number | null, beats: number];

// Semitones relative to A4 (440 Hz). Cheerful C-major-ish melody, 4 bars.
const LEAD: Note[] = [
  [3, 0.5], [7, 0.5], [10, 0.5], [12, 0.5], [10, 0.5], [7, 0.5], [8, 1],
  [5, 0.5], [8, 0.5], [12, 0.5], [15, 0.5], [12, 0.5], [8, 0.5], [10, 1],
  [3, 0.5], [7, 0.5], [10, 0.5], [15, 0.5], [14, 0.5], [12, 0.5], [10, 1],
  [8, 0.5], [7, 0.5], [5, 0.5], [3, 0.5], [1, 0.5], [3, 0.5], [3, 1],
];

const BASS: Note[] = [
  [-9, 1], [-9, 1], [-2, 1], [-2, 1],
  [-7, 1], [-7, 1], [-4, 1], [-4, 1],
  [-9, 1], [-9, 1], [-2, 1], [-2, 1],
  [-4, 1], [-4, 1], [-9, 1], [-9, 1],
];

const BPM = 132;
const BEAT = 60 / BPM;
const BAR_BEATS = 4;
const LOOP_BEATS = 16;
const LOOP_SECONDS = LOOP_BEATS * BEAT;

const freq = (semitone: number) => 440 * Math.pow(2, semitone / 12);

export class ChiptunePlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private nextLoopAt = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private started = false;
  volume = 0.28;

  get isPlaying() {
    return this.started;
  }

  /** Must be called from a user gesture — browsers block autoplay otherwise. */
  async start() {
    if (this.started) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    if (!this.ctx) {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();

    this.started = true;
    this.master!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master!.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.master!.gain.exponentialRampToValueAtTime(this.volume, this.ctx.currentTime + 1.2);

    this.nextLoopAt = this.ctx.currentTime + 0.1;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  stop() {
    if (!this.ctx || !this.started) return;
    this.started = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    const now = this.ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setValueAtTime(Math.max(this.master!.gain.value, 0.0001), now);
    this.master!.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  }

  toggle() {
    if (this.started) this.stop();
    else void this.start();
    return this.started;
  }

  destroy() {
    this.stop();
    if (this.timer !== null) window.clearInterval(this.timer);
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  // Schedule loops slightly ahead of the audio clock so playback never gaps.
  private tick() {
    if (!this.ctx || !this.started) return;
    while (this.nextLoopAt < this.ctx.currentTime + 1.0) {
      this.scheduleLoop(this.nextLoopAt);
      this.nextLoopAt += LOOP_SECONDS;
    }
  }

  private scheduleLoop(at: number) {
    let t = at;
    for (const [semi, beats] of LEAD) {
      if (semi !== null) this.blip(t, freq(semi), beats * BEAT * 0.92, "square", 0.16);
      t += beats * BEAT;
    }

    t = at;
    for (const [semi, beats] of BASS) {
      if (semi !== null) this.blip(t, freq(semi), beats * BEAT * 0.8, "triangle", 0.3);
      t += beats * BEAT;
    }

    // light hi-hat on the off-beats
    for (let b = 0; b < LOOP_BEATS; b += 0.5) {
      this.hat(at + b * BEAT, b % 1 === 0 ? 0.05 : 0.09);
    }

    // a soft handclap-ish accent on beats 2 and 4 of every bar
    for (let bar = 0; bar < LOOP_BEATS / BAR_BEATS; bar++) {
      this.hat(at + (bar * BAR_BEATS + 1) * BEAT, 0.16, 0.09);
      this.hat(at + (bar * BAR_BEATS + 3) * BEAT, 0.16, 0.09);
    }
  }

  private blip(
    at: number,
    hz: number,
    dur: number,
    type: OscillatorType,
    peak: number
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private hat(at: number, peak: number, dur = 0.045) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(hp).connect(gain).connect(this.master!);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  private makeNoiseBuffer(ctx: AudioContext) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

let singleton: ChiptunePlayer | null = null;

export function getMusic() {
  if (typeof window === "undefined") return null;
  if (!singleton) singleton = new ChiptunePlayer();
  return singleton;
}

const MUTE_KEY = "music_muted";

export function readMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function writeMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}
