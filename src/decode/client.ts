// Browser side of Decode-3: proxy call with a local cache, and a scripted
// fallback so the Console never dies on stage.
import { EXCHANGES, scriptedReply } from "./scripted";
import type { SpeciesKey } from "./species";
import type { DecodeRequest, DecodeResponse } from "./types";

const STORE = "morsis.decode.v2";
const CLIENT_TIMEOUT_MS = 10000;

function load(): Record<string, DecodeResponse> {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}
const mem = load();
function save(k: string, v: DecodeResponse) {
  mem[k] = v;
  try {
    const keys = Object.keys(mem);
    if (keys.length > 120) delete mem[keys[0]];
    localStorage.setItem(STORE, JSON.stringify(mem));
  } catch {
    /* storage unavailable: memory cache only */
  }
}
const keyOf = (r: DecodeRequest) =>
  [r.mode, r.species, r.pair, (r.message || "").trim().toLowerCase(), (r.topic || "").trim().toLowerCase(), r.history?.length || 0].join("|");

export function scripted(req: DecodeRequest): DecodeResponse {
  if (req.mode === "eavesdrop") {
    const ex = EXCHANGES[req.pair || "humpbacks"] || EXCHANGES.humpbacks;
    return { mode: "eavesdrop", source: "scripted", turns: ex.turns, note: ex.note };
  }
  const { note, ...reply } = scriptedReply(req.species as SpeciesKey);
  return { mode: "channel", source: "scripted", reply, note };
}

export async function decode(req: DecodeRequest): Promise<DecodeResponse> {
  const k = keyOf(req);
  if (mem[k]) return mem[k];
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/decode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const out = (await res.json()) as DecodeResponse;
    save(k, out);
    return out;
  } catch {
    return scripted(req);
  } finally {
    clearTimeout(timer);
  }
}
