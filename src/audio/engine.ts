// The single place Morsis makes sound (ADR 0001). Every Signal is assembled
// fresh: samples from the species bank, steered by Decode-3's units, contour,
// durationSec and mood, with a synthesized layer on top and the Individual's
// Voiceprint applied last. Works with an empty bank (synth only) so the page
// sounds right before the generated samples land.
import * as Tone from "tone";
import type { SpeciesKey } from "../decode/species";
import type { Mood, Signal } from "../decode/types";
import { RECIPES, type Recipe } from "./recipes";

// ---- graph ------------------------------------------------------------------

let ready = false;
let muted = false;
let master: Tone.Gain;
let bus: Tone.Gain; // everything voiced goes here, then master
let analyser: Tone.Analyser;
let reverb: Tone.Reverb;
let echo: Tone.FeedbackDelay;
const ambience: Partial<Record<"sky" | "land" | "sea", Tone.Player>> = {};
const banks: Partial<Record<SpeciesKey, Tone.ToneAudioBuffer[]>> = {};

function graph() {
  if (master) return;
  master = new Tone.Gain(0.9).toDestination();
  analyser = new Tone.Analyser("fft", 2048);
  analyser.smoothing = 0.2;
  bus = new Tone.Gain(1).connect(master);
  bus.connect(analyser);
  reverb = new Tone.Reverb({ decay: 7, wet: 1 }).connect(bus);
  echo = new Tone.FeedbackDelay({ delayTime: 0.42, feedback: 0.38, wet: 1 }).connect(reverb);
}

/** Must run inside a user gesture (the calibration gate's button). */
export async function unlock(withSound = true) {
  graph();
  await Tone.start();
  ready = true;
  setMuted(!withSound);
}
export const isReady = () => ready;
export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.rampTo(m ? 0 : 0.9, 0.08);
}
export const isMuted = () => muted;
export const fft = () => (analyser ? (analyser.getValue() as Float32Array) : null);
export const sampleRate = () => Tone.getContext().sampleRate;

// ---- banks + ambience -------------------------------------------------------

async function loadBuffer(base: string): Promise<Tone.ToneAudioBuffer | null> {
  for (const ext of ["webm", "mp3"]) {
    try {
      const res = await fetch(`${base}.${ext}`);
      if (!res.ok || !(res.headers.get("content-type") || "").match(/audio|video|octet/)) continue;
      const decoded = await Tone.getContext().decodeAudioData(await res.arrayBuffer());
      return new Tone.ToneAudioBuffer(decoded);
    } catch {
      /* try next format */
    }
  }
  return null;
}

export async function loadBank(k: SpeciesKey) {
  if (banks[k]) return;
  banks[k] = [];
  const got = await Promise.all([1, 2, 3, 4, 5].map((n) => loadBuffer(`/assets/audio/${k}/${n}`)));
  banks[k] = got.filter((b): b is Tone.ToneAudioBuffer => !!b);
}

export async function loadAmbience() {
  graph();
  await Promise.all(
    (["sky", "land", "sea"] as const).map(async (z) => {
      const buf = await loadBuffer(`/assets/audio/ambience/${z}`);
      if (!buf) return;
      const p = new Tone.Player({ url: buf, loop: true, fadeIn: 1, fadeOut: 1 }).connect(master);
      p.volume.value = -Infinity;
      ambience[z] = p;
    }),
  );
}

/** Weights 0..1 per zone; called every frame the descent is on screen. */
export function mixAmbience(w: { sky: number; land: number; sea: number }) {
  if (!ready) return;
  for (const z of ["sky", "land", "sea"] as const) {
    const p = ambience[z];
    if (!p) continue;
    const v = w[z];
    if (v > 0.01 && p.state !== "started") p.start();
    p.volume.rampTo(v > 0.01 ? -14 + 14 * Math.log10(1 + 9 * v) : -Infinity, 0.25);
  }
}

// ---- voiceprints ------------------------------------------------------------

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Print {
  semis: number; // fixed pitch offset
  tilt: number; // lowpass multiplier (darker / brighter throat)
  vibRate: number;
  vibDepth: number;
}
function voiceprint(print: number): Print {
  const r = rng(print * 7919 + 13);
  return { semis: (r() - 0.5) * 6, tilt: 0.7 + r() * 0.6, vibRate: 3 + r() * 5, vibDepth: 0.3 + r() * 0.7 };
}

const MOOD: Record<Mood, { tempo: number; semis: number; amp: number }> = {
  calm: { tempo: 1.12, semis: -1, amp: 0.85 },
  curious: { tempo: 1, semis: 1, amp: 0.95 },
  alarm: { tempo: 0.72, semis: 3, amp: 1.1 },
  affiliative: { tempo: 1.05, semis: 0, amp: 0.8 },
};

// ---- speaking ---------------------------------------------------------------

export interface SpeakOpts {
  print?: number;
  /** The researcher's message, encoded by the FT-1: synthetic, no samples. */
  human?: boolean;
  /** Hearing shift in octaves. */
  shift?: number;
}

const MAX_TOTAL = 6.5;

/** Voice a Signal. Resolves to its length in seconds once scheduled. */
export function speak(k: SpeciesKey, sig: Pick<Signal, "units" | "contour" | "durationSec" | "mood"> & { decoded?: string }, o: SpeakOpts = {}): number {
  if (!ready) return 0;
  const R = RECIPES[k];
  const vp = voiceprint(o.print ?? hash(k));
  const mood = MOOD[sig.mood] || MOOD.curious;
  const r = rng(hash(`${k}|${sig.decoded || ""}|${o.print ?? 0}|${sig.units}`));
  const shift = o.shift ?? 0;
  const units = Math.max(1, Math.min(12, Math.round(sig.units)));
  const total = Math.min(MAX_TOTAL, Math.max(R.minTotal, sig.durationSec)) * mood.tempo;
  const unitDur = (total / units) * (1 - R.gapRatio);
  const gap = (total / units) * R.gapRatio;
  const semisBase = vp.semis + mood.semis + shift * 12;

  // Per-call voice chain: Voiceprint filter + vibrato, then the bus (and echo for water).
  const out = new Tone.Gain(mood.amp * (o.human ? 0.7 : 1));
  const lp = new Tone.Filter({ type: "lowpass", frequency: Math.min(20000, R.bright * vp.tilt * 2 ** shift), Q: 0.7 }).connect(out);
  out.connect(bus);
  if (R.wet) out.connect(echo);

  const bank = o.human ? [] : banks[k] || [];
  const at = Tone.now() + 0.05;
  let t = at;
  for (let i = 0; i < units; i++) {
    const c = sample(sig.contour, units === 1 ? 0.5 : i / (units - 1));
    const c2 = sample(sig.contour, units === 1 ? 0.6 : Math.min(1, (i + 1) / (units - 1)));
    const d = unitDur * (0.8 + r() * 0.4);
    const semis = semisBase + (c - 0.5) * R.rangeSemis;
    const semis2 = semisBase + (c2 - 0.5) * R.rangeSemis;
    if (bank.length) grain(bank[Math.floor(r() * bank.length)], t, d, semis, semis2, r, lp, R);
    synth(R, t, d, semis, semis2, vp, lp, bank.length ? R.layer : 1, o.human, r);
    t += d + gap * (0.7 + r() * 0.6);
  }
  const len = t - at;
  // Free the chain once the tail (reverb/echo) has rung out.
  setTimeout(() => {
    lp.dispose();
    out.dispose();
  }, (len + 1.5) * 1000);
  return len;
}

function sample(contour: number[], x: number) {
  if (!contour.length) return 0.5;
  const p = x * (contour.length - 1);
  const i = Math.floor(p);
  const f = p - i;
  return contour[i] * (1 - f) + (contour[Math.min(contour.length - 1, i + 1)] ?? contour[i]) * f;
}

function grain(buf: Tone.ToneAudioBuffer, t: number, d: number, semis: number, semis2: number, r: () => number, dest: Tone.InputNode, R: Recipe) {
  const env = new Tone.AmplitudeEnvelope({ attack: Math.min(0.04, d * 0.2), decay: 0, sustain: 1, release: Math.min(0.15, d * 0.3) }).connect(dest);
  const offset = Math.max(0, (buf.duration - d) * r());
  if (d < 0.25 || R.rateShift) {
    // Short calls: shift by rate, which also tightens them, as real chirps do.
    const p = new Tone.Player({ url: buf, playbackRate: 2 ** (semis / 12) }).connect(env);
    p.start(t, offset, d * 2 ** (semis / 12));
    env.triggerAttackRelease(d, t);
    setTimeout(() => (p.dispose(), env.dispose()), (t - Tone.now() + d + 0.5) * 1000);
    return;
  }
  const g = new Tone.GrainPlayer({ url: buf, grainSize: 0.09, overlap: 0.06, detune: semis * 100 }).connect(env);
  g.detune = semis * 100;
  g.start(t, offset, d);
  // Glide toward the next contour point across the unit.
  const steps = 6;
  for (let s = 1; s <= steps; s++) {
    const v = (semis + ((semis2 - semis) * s) / steps) * 100;
    setTimeout(() => {
      if (!g.disposed) g.detune = v;
    }, (t - Tone.now() + (d * s) / steps) * 1000);
  }
  env.triggerAttackRelease(d, t);
  setTimeout(() => (g.dispose(), env.dispose()), (t - Tone.now() + d + 0.5) * 1000);
}

function synth(R: Recipe, t: number, d: number, semis: number, semis2: number, vp: Print, dest: Tone.InputNode, level: number, human: boolean | undefined, r: () => number) {
  if (level <= 0) return;
  const f0 = R.base * 2 ** (semis / 12);
  const f1 = R.base * 2 ** (semis2 / 12);
  const parts: Tone.ToneAudioNode[] = [];
  const gain = new Tone.Gain(level * R.gain).connect(dest);
  parts.push(gain);
  let into: Tone.InputNode = gain;
  if (R.band) {
    const bp = new Tone.Filter({ type: "bandpass", frequency: R.band * 2 ** (semis / 24), Q: R.bandQ ?? 2 }).connect(gain);
    parts.push(bp);
    into = bp;
  }

  const voiceOsc = (start: number, dur: number, a: number, b: number, amp = 1) => {
    const osc = human ? new Tone.Oscillator({ type: "triangle", frequency: a }) : new Tone.Oscillator({ type: R.wave, frequency: a });
    const env = new Tone.AmplitudeEnvelope({ attack: Math.min(0.03, dur * 0.25), decay: 0.02, sustain: 0.9, release: Math.min(0.12, dur * 0.3) });
    const vib = new Tone.LFO({ frequency: vp.vibRate * (R.vibMul ?? 1), min: -vp.vibDepth * R.vib, max: vp.vibDepth * R.vib });
    const g = new Tone.Gain(amp);
    vib.connect(osc.detune);
    osc.connect(env);
    env.connect(g);
    g.connect(into);
    osc.frequency.setValueAtTime(a, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(8, b), start + dur);
    osc.start(start).stop(start + dur + 0.2);
    vib.start(start).stop(start + dur + 0.2);
    env.triggerAttackRelease(dur, start);
    parts.push(osc, env, vib, g);
  };
  const burst = (start: number, dur: number, freq: number, q: number, amp: number) => {
    const n = new Tone.Noise(R.noiseColor ?? "white");
    const f = new Tone.Filter({ type: "bandpass", frequency: freq, Q: q });
    const env = new Tone.AmplitudeEnvelope({ attack: 0.002, decay: dur, sustain: 0, release: 0.01 });
    const g = new Tone.Gain(amp);
    n.connect(f);
    f.connect(env);
    env.connect(g);
    g.connect(gain);
    n.start(start).stop(start + dur + 0.05);
    env.triggerAttackRelease(dur, start);
    parts.push(n, f, env, g);
  };

  switch (R.style) {
    case "chirps": {
      // Prairie dog: a unit is a quick run of barks.
      const n = R.chirps ?? 3;
      const each = d / n;
      for (let k = 0; k < n; k++) voiceOsc(t + k * each, each * 0.7, f0 * 0.85, f0 * 1.25);
      break;
    }
    case "trill": {
      // Starling: two fast FM-ish sweeps per unit, sometimes a mimic jump.
      voiceOsc(t, d * 0.55, f0, f1);
      voiceOsc(t + d * 0.55, d * 0.45, f1, f0 * (r() > 0.6 ? 1.9 : 1.3), 0.8);
      break;
    }
    case "clicks": {
      // Dolphin: click train, then the whistle glide.
      const clicks = 6 + Math.floor(r() * 8);
      for (let k = 0; k < clicks; k++) burst(t + k * 0.016, 0.004, 9000, 1, 0.9);
      voiceOsc(t + clicks * 0.016, d, f0, f1);
      break;
    }
    case "rumble": {
      // Elephant: infrasonic fundamental plus an audible harmonic for laptop speakers.
      voiceOsc(t, d, f0, f1);
      voiceOsc(t, d, f0 * 6, f1 * 6, 0.35);
      break;
    }
    case "rasp": {
      // Raven: harsh voiced call with a breathy formant burst.
      voiceOsc(t, d, f0, f0 * 1.06);
      burst(t, d, (R.band ?? 1300) * 1.1, 1.5, 0.6);
      break;
    }
    default:
      // Humpback: long gliding moan into the echo.
      voiceOsc(t, d, f0, f1);
  }
  setTimeout(() => parts.forEach((p) => p.dispose()), (t - Tone.now() + d + 1) * 1000);
}
