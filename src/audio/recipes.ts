// Per-species voice recipes. Tuned by ear from the concept's oscillator voices.
import type { SpeciesKey } from "../decode/species";

export interface Recipe {
  style: "rasp" | "trill" | "rumble" | "chirps" | "moan" | "clicks";
  wave: "sine" | "sawtooth" | "square" | "triangle";
  /** Synth fundamental in Hz at contour 0.5, before Voiceprint and Hearing shift. */
  base: number;
  /** Contour 0..1 spans this many semitones. */
  rangeSemis: number;
  /** Fraction of each unit's slot left silent. */
  gapRatio: number;
  /** Shortest a whole Signal may be, in seconds. */
  minTotal: number;
  /** Lowpass ceiling for the Voiceprint tilt. */
  bright: number;
  band?: number;
  bandQ?: number;
  /** Synth level when no samples are loaded; `layer` is its level over samples. */
  gain: number;
  layer: number;
  vib: number;
  vibMul?: number;
  wet?: boolean;
  chirps?: number;
  /** Shift samples by playback rate (bird calls) rather than granular detune. */
  rateShift?: boolean;
  noiseColor?: "white" | "pink" | "brown";
}

export const RECIPES: Record<SpeciesKey, Recipe> = {
  raven: { style: "rasp", wave: "sawtooth", base: 620, rangeSemis: 9, gapRatio: 0.35, minTotal: 0.5, bright: 5200, band: 1300, bandQ: 2.2, gain: 0.5, layer: 0.25, vib: 40, vibMul: 5, rateShift: true, noiseColor: "pink" },
  starling: { style: "trill", wave: "sine", base: 2800, rangeSemis: 19, gapRatio: 0.15, minTotal: 0.8, bright: 12000, gain: 0.32, layer: 0.2, vib: 60, vibMul: 4, rateShift: true },
  // Rumbles are long and low: a granular shifter only holds a few cycles of a
  // 20–80 Hz wave per grain and warbles, so elephants shift by playback rate,
  // with a quiet sine under the samples for the infrasonic body.
  elephant: { style: "rumble", wave: "sine", base: 18, rangeSemis: 5, gapRatio: 0.2, minTotal: 2.5, bright: 2400, gain: 0.8, layer: 0.14, vib: 10, rateShift: true, noiseColor: "brown" },
  prairie: { style: "chirps", wave: "square", base: 3600, rangeSemis: 6, gapRatio: 0.3, minTotal: 0.5, bright: 9000, band: 4200, bandQ: 3, gain: 0.35, layer: 0.2, vib: 30, vibMul: 6, chirps: 3, rateShift: true },
  humpback: { style: "moan", wave: "sine", base: 240, rangeSemis: 24, gapRatio: 0.18, minTotal: 3, bright: 6000, gain: 0.55, layer: 0.3, vib: 14, wet: true },
  dolphin: { style: "clicks", wave: "sine", base: 7500, rangeSemis: 14, gapRatio: 0.2, minTotal: 0.6, bright: 16000, gain: 0.28, layer: 0.2, vib: 20, wet: true },
};
