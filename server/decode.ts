// Decode-3 proxy: the only place the Gemini key is read. Shared by the Vercel
// function (api/decode.ts) and the Vite dev/preview middleware (vite.config.ts).
import { GoogleGenAI } from "@google/genai";
import { SPECIES, PAIRS, type SpeciesKey } from "../src/decode/species.js";
import type { DecodeRequest, DecodeResponse } from "../src/decode/types.js";

const PRIMARY = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
const TIMEOUT_MS = 8000;

// ---- schema -----------------------------------------------------------------

const signalProps = {
  signal: { type: "string", description: "Short technical description of the call, e.g. '3-unit descending moan, 9 s'" },
  units: { type: "integer", minimum: 1, maximum: 12 },
  contour: { type: "array", items: { type: "number", minimum: 0, maximum: 1 }, minItems: 6, maxItems: 9 },
  durationSec: { type: "number", minimum: 0.3, maximum: 14 },
  mood: { type: "string", enum: ["calm", "curious", "alarm", "affiliative"] },
  decoded: { type: "string" },
  confidence: { type: "number", minimum: 0.45, maximum: 0.9 },
};
const signalRequired = ["signal", "units", "contour", "durationSec", "mood", "decoded", "confidence"];

const channelSchema = {
  type: "object",
  properties: { ...signalProps, note: { type: "string" } },
  required: [...signalRequired, "note"],
};

const eavesdropSchema = {
  type: "object",
  properties: {
    turns: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: { individual: { type: "string", enum: ["A", "B"] }, ...signalProps },
        required: ["individual", ...signalRequired],
      },
    },
    note: { type: "string" },
  },
  required: ["turns", "note"],
};

// ---- prompts ----------------------------------------------------------------

const VOICE = `Voice: the animal speaking for itself, rendered by a careful translator into plain, natural English: complete sentences, normal grammar, sentence case. Concrete and sensory (distance, pressure, smell, light, kin, food, danger, routes), with the animal's own concerns rather than human ones. Simple everyday words; no clipped telegraphic fragments, no scientific jargon (signature, sentinel, conspecific, infrasonic). Wondrous but believable. Never open with the word Strange, and do not dwell on a sound being strange, foreign or new. No human pop culture, no jokes about pets, no emoji, no quotation marks, no em dashes.`;

const SYSTEM = `You are Decode-3, the interspecies translation model of Morsis, a bioacoustics research lab. You render animal signals as English hypotheses grounded in published behavioural research. You never break character and never mention being an AI. Output only the requested JSON.`;

function channelPrompt(req: DecodeRequest): string {
  const sp = SPECIES[req.species as SpeciesKey];
  const hist = (req.history || []).slice(-6).map((h) => `${h.who}: ${h.text}`).join("\n");
  return `A field researcher has transmitted a message to a ${sp.name}, encoded into that species' own call units. Write the animal's plausible reply.

Ground the reply in real ${sp.name} biology and behaviour: ${sp.facts}
${VOICE}
The reply must respond directly to what the researcher said or asked, as this animal would understand it; someone reading only the message and the reply should see the connection. Treat the biology above as background: use at most one detail of it, and only where it answers the message, never as a recited fact. If the message names something the animal has no concept of (a backflip, a favourite colour, love), it answers through the nearest thing it does know. If it is gibberish, the animal answers with brief, in-character confusion or caution.
At most 2 sentences and 32 words.
${hist ? `Earlier on this channel:\n${hist}\n` : ""}Researcher's message: ${JSON.stringify(req.message || "")}

Fields: signal (call actually produced, using this species' real call types), units (how many call units), contour (pitch shape, 0 low to 1 high), durationSec (realistic for this species; elephant rumbles and humpback units are long, prairie dog chirps and dolphin whistles short), mood, decoded (the English reply), confidence, note (one true, specific, citable field fact behind the reply, under 22 words).`;
}

function eavesdropPrompt(req: DecodeRequest): string {
  const pair = PAIRS.find((p) => p.id === req.pair) || PAIRS[0];
  const a = SPECIES[pair.a.species];
  const b = SPECIES[pair.b.species];
  const hist = (req.history || []).slice(-6).map((h) => `${h.who}: ${h.text}`).join("\n");
  return `The FT-1 has intercepted an exchange between two animals that can hear each other. Write it as 4 to 6 alternating turns, starting with A.

Individual A: ${pair.a.label} (${a.name}). ${a.facts}
Individual B: ${pair.b.label} (${b.name}). ${b.facts}
Situation: ${pair.situation}
${req.topic ? `The exchange is about: ${JSON.stringify(req.topic)}\n` : ""}${req.message ? `A researcher has just interjected, encoded into their calls: ${JSON.stringify(req.message)}. Both react to what it says, in character.\n` : ""}${hist ? `Earlier in this exchange:\n${hist}\n` : ""}
${VOICE}
Each decoded turn at most 18 words. Each turn's signal, units, contour and durationSec must match that individual's species. Give a single note: one true, specific, citable field fact about this kind of exchange, under 22 words.`;
}

// ---- cache + rate limit (best effort; per warm instance) ------------------------

const cache = new Map<string, DecodeResponse>();
const CACHE_MAX = 300;
function cacheKey(req: DecodeRequest) {
  const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return [req.mode, req.species, req.pair, norm(req.message), norm(req.topic), (req.history || []).length].join("|");
}
function remember(k: string, v: DecodeResponse) {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 12;
}

// ---- gemini -----------------------------------------------------------------

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return (client ??= new GoogleGenAI({ apiKey: key }));
}

async function callModel(model: string, prompt: string, schema: object): Promise<unknown> {
  const g = ai();
  if (!g) throw Object.assign(new Error("no key"), { status: 0 });
  const run = (thinking?: string) =>
    Promise.race([
      g.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          temperature: 1,
          maxOutputTokens: 900,
          ...(thinking ? { thinkingConfig: { thinkingLevel: thinking as never } } : {}),
        },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { status: 504 })), TIMEOUT_MS)),
    ]);
  // Not every model accepts every thinking level (gemini-3.8-flash rejects
  // MINIMAL); step down on a 400 so the reply stays fast.
  let res;
  for (const level of ["MINIMAL", "LOW", undefined]) {
    try {
      res = await run(level);
      break;
    } catch (e: any) {
      if (e?.status !== 400 || !level) throw e;
    }
  }
  if (!res) throw Object.assign(new Error("empty"), { status: 502 });
  const text = res.text;
  if (!text) throw Object.assign(new Error("empty"), { status: 502 });
  return JSON.parse(text);
}

// ---- validation -------------------------------------------------------------

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
function cleanSignal(s: any) {
  const contour = (Array.isArray(s?.contour) ? s.contour : []).map(Number).filter(Number.isFinite).map((v: number) => clamp(v, 0, 1));
  return {
    signal: String(s?.signal || "call").slice(0, 80),
    units: clamp(Math.round(Number(s?.units) || 3), 1, 12),
    contour: contour.length >= 3 ? contour.slice(0, 9) : [0.5, 0.6, 0.4, 0.55, 0.45, 0.5],
    durationSec: clamp(Number(s?.durationSec) || 2, 0.3, 14),
    mood: ["calm", "curious", "alarm", "affiliative"].includes(s?.mood) ? s.mood : "curious",
    decoded: String(s?.decoded || "")
      .replace(/—/g, ", ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (c) => c.toUpperCase())
      .slice(0, 280),
    confidence: clamp(Number(s?.confidence) || 0.6, 0.45, 0.9),
  };
}

function shape(req: DecodeRequest, raw: any, source: DecodeResponse["source"]): DecodeResponse {
  if (req.mode === "eavesdrop") {
    const turns = (raw?.turns || []).slice(0, 6).map((t: any) => ({ individual: t?.individual === "B" ? "B" : "A", ...cleanSignal(t) }));
    if (turns.length < 2) throw new Error("bad shape");
    return { mode: "eavesdrop", source, turns, note: String(raw?.note || "") };
  }
  const s = cleanSignal(raw);
  if (!s.decoded) throw new Error("bad shape");
  return { mode: "channel", source, reply: s, note: String(raw?.note || "") };
}

// ---- entry ------------------------------------------------------------------

export type DecodeResult = { status: number; body: DecodeResponse | { error: string; fallback: true } };

export async function handleDecode(input: unknown, ip = "local"): Promise<DecodeResult> {
  const req = input as DecodeRequest;
  if (!req || (req.mode !== "channel" && req.mode !== "eavesdrop")) return { status: 400, body: { error: "bad mode", fallback: true } };
  if (req.mode === "channel" && !(req.species in SPECIES)) return { status: 400, body: { error: "bad species", fallback: true } };
  if (req.mode === "eavesdrop" && !PAIRS.some((p) => p.id === req.pair)) return { status: 400, body: { error: "bad pair", fallback: true } };
  if ((req.message || "").length > 240 || (req.topic || "").length > 120) return { status: 400, body: { error: "too long", fallback: true } };

  const key = cacheKey(req);
  const hit = cache.get(key);
  if (hit) return { status: 200, body: hit };
  if (limited(ip)) return { status: 429, body: { error: "slow down", fallback: true } };

  const prompt = req.mode === "eavesdrop" ? eavesdropPrompt(req) : channelPrompt(req);
  const schema = req.mode === "eavesdrop" ? eavesdropSchema : channelSchema;

  for (const [model, source] of [[PRIMARY, "live"], [FALLBACK, "lite"]] as const) {
    try {
      const out = shape(req, await callModel(model, prompt, schema), source);
      remember(key, out);
      return { status: 200, body: out };
    } catch (e: any) {
      if (e?.status === 0) break; // no key configured: go straight to scripted
      console.warn(`[decode] ${model} failed:`, e?.status ?? "", e?.message ?? e);
    }
  }
  return { status: 503, body: { error: "decoder unavailable", fallback: true } };
}
