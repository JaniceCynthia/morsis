export type Mood = "calm" | "curious" | "alarm" | "affiliative";

/** One emitted call, as Decode-3 describes it. Drives both the transcript and the voice engine. */
export interface Signal {
  signal: string;
  units: number;
  contour: number[];
  durationSec: number;
  mood: Mood;
  decoded: string;
  confidence: number;
}

export interface Turn extends Signal {
  individual: "A" | "B";
}

export interface DecodeRequest {
  mode: "channel" | "eavesdrop";
  species: string;
  pair?: string;
  message?: string;
  topic?: string;
  history?: { who: string; text: string }[];
}

export type Source = "live" | "lite" | "scripted";

export type DecodeResponse =
  | { mode: "channel"; source: Source; reply: Signal; note: string }
  | { mode: "eavesdrop"; source: Source; turns: Turn[]; note: string };
