/**
 * Soft office sounds, made on the fly with the Web Audio API (no audio files).
 * Off until someone turns them on; the choice is remembered in this browser.
 */

export type SoundName = "step" | "sit" | "stand" | "coffee" | "water" | "wave" | "marker" | "on";

const STORAGE_KEY = "pookies-sound";
const MASTER_VOLUME = 0.5;

let enabled: boolean | null = null;
let context: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let stepFlip = false;
const listeners = new Set<() => void>();

function readSaved(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function soundEnabled(): boolean {
  if (enabled === null) enabled = readSaved();
  return enabled;
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Must be called from a click or key press: browsers only start audio after one. */
export function setSoundEnabled(next: boolean): void {
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // Private windows may refuse storage; the setting just won't stick.
  }
  for (const listener of listeners) listener();
  if (next) playSound("on");
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return { ctx: context, out: master! };
}

function noise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

interface Tone {
  from: number;
  to?: number;
  at?: number;
  length: number;
  volume: number;
  wave?: OscillatorType;
}

function tone(ctx: AudioContext, out: AudioNode, { from, to, at = 0, length, volume, wave = "sine" }: Tone) {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, start);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.02, length / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

interface Hiss {
  at?: number;
  length: number;
  volume: number;
  filter: BiquadFilterType;
  frequency: number;
  /** Seconds to fade in, for sounds that swell (a steaming coffee machine). */
  swell?: number;
}

function hiss(ctx: AudioContext, out: AudioNode, { at = 0, length, volume, filter, frequency, swell = 0.01 }: Hiss) {
  const start = ctx.currentTime + at;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + swell);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(shape).connect(gain).connect(out);
  source.start(start, Math.random() * 0.5);
  source.stop(start + length + 0.02);
}

export function playSound(name: SoundName): void {
  if (!soundEnabled()) return;
  const sound = audio();
  if (!sound) return;
  const { ctx, out } = sound;

  switch (name) {
    case "step":
      stepFlip = !stepFlip;
      hiss(ctx, out, { length: 0.07, volume: 0.09, filter: "lowpass", frequency: stepFlip ? 520 : 680 });
      break;
    case "sit":
      tone(ctx, out, { from: 190, to: 120, length: 0.16, volume: 0.14 });
      hiss(ctx, out, { length: 0.1, volume: 0.06, filter: "lowpass", frequency: 400 });
      break;
    case "stand":
      tone(ctx, out, { from: 130, to: 210, length: 0.12, volume: 0.1 });
      break;
    case "coffee":
      hiss(ctx, out, { length: 1.3, volume: 0.06, filter: "bandpass", frequency: 2400, swell: 0.4 });
      tone(ctx, out, { from: 880, at: 1.35, length: 0.25, volume: 0.08, wave: "triangle" });
      tone(ctx, out, { from: 1320, at: 1.5, length: 0.3, volume: 0.06, wave: "triangle" });
      break;
    case "water":
      for (let i = 0; i < 5; i += 1) {
        const from = 420 + Math.random() * 260;
        tone(ctx, out, { from, to: from * 1.6, at: i * 0.08, length: 0.07, volume: 0.07 });
      }
      break;
    case "wave":
      tone(ctx, out, { from: 660, length: 0.14, volume: 0.07, wave: "triangle" });
      tone(ctx, out, { from: 990, at: 0.1, length: 0.18, volume: 0.06, wave: "triangle" });
      break;
    case "marker":
      hiss(ctx, out, { length: 0.18, volume: 0.04, filter: "highpass", frequency: 3200 });
      hiss(ctx, out, { at: 0.22, length: 0.14, volume: 0.035, filter: "highpass", frequency: 3600 });
      break;
    case "on":
      tone(ctx, out, { from: 520, length: 0.1, volume: 0.08 });
      tone(ctx, out, { from: 780, at: 0.08, length: 0.14, volume: 0.07 });
      break;
  }
}
