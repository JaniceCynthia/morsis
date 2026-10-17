// The Console: Open a channel (visitor ↔ one animal) and Eavesdrop (animal ↔
// animal, with interjection). Every Signal is voiced through the engine with
// the right Individual's Voiceprint, and drawn live on the spectrogram.
import { speak, hash, isReady } from "../audio/engine";
import { decode } from "../decode/client";
import { ORDER, PAIRS, SPECIES, type Pair, type SpeciesKey } from "../decode/species";
import type { DecodeResponse, Signal, Source } from "../decode/types";
import { $, contourSvg, encodeText, esc, sleep } from "./dom";
import { initSpectro } from "./spectro";

type Mode = "channel" | "eaves";

const state = {
  mode: "channel" as Mode,
  sp: "humpback" as SpeciesKey,
  pair: PAIRS[0] as Pair,
  shift: 0,
  busy: false,
  hist: {} as Record<string, { who: string; text: string }[]>,
};

const LED: Record<Source | "idle" | "busy", string> = {
  idle: "Decode-3 standing by",
  busy: "Decoding",
  live: "Decode-3 live",
  lite: "Decode-3 live (lite)",
  scripted: "Decode-3 offline · field archive",
};

export function initConsole() {
  initSpectro($<HTMLCanvasElement>("#spectro"));
  const log = $("#log");
  const msg = $<HTMLInputElement>("#msg");
  const form = $<HTMLFormElement>("#composer");
  const transmit = $<HTMLButtonElement>("#transmit");
  const led = $("#led");
  const shift = $<HTMLInputElement>("#shift");
  const tabs = { channel: $<HTMLButtonElement>("#tab-channel"), eaves: $<HTMLButtonElement>("#tab-eaves") };
  const panels = { channel: $("#panel-channel"), eaves: $("#panel-eaves") };

  const setLed = (s: keyof typeof LED) => {
    led.dataset.state = s;
    led.querySelector("span")!.textContent = LED[s];
  };
  const busy = (b: boolean) => {
    state.busy = b;
    transmit.disabled = b;
    document.querySelectorAll<HTMLButtonElement>("#chips .chip, #topics .chip, #pair-pick .opt").forEach((c) => (c.disabled = b));
    if (b) setLed("busy");
  };

  // ---- pickers --------------------------------------------------------------
  const spPick = $("#species-pick");
  spPick.innerHTML = ORDER.map((k) => `<button class="opt" role="radio" type="button" data-k="${k}" aria-checked="false">${esc(SPECIES[k].short)}<small>${SPECIES[k].zone}</small></button>`).join("");
  const pairPick = $("#pair-pick");
  pairPick.innerHTML = PAIRS.map((p) => `<button class="opt" role="radio" type="button" data-pair="${p.id}" aria-checked="false">${esc(p.title)}<small>${esc(SPECIES[p.a.species].short)}${p.a.species === p.b.species ? " × 2" : ` · ${esc(SPECIES[p.b.species].short)}`}</small></button>`).join("");

  const chips = $("#chips");
  const topics = $("#topics");
  const fmtHz = (f: number) => (f >= 1000 ? `${+(f / 1000).toFixed(f >= 10000 ? 0 : 1)} kHz` : `${f} Hz`);

  function selectSpecies(k: SpeciesKey, announce = false) {
    state.sp = k;
    const s = SPECIES[k];
    spPick.querySelectorAll<HTMLElement>(".opt").forEach((o) => o.setAttribute("aria-checked", String(o.dataset.k === k)));
    chips.innerHTML = s.chips.map((c) => `<button class="chip" type="button">${esc(c)}</button>`).join("");
    $("#ro-band").textContent = `${fmtHz(s.band[0])} to ${fmtHz(s.band[1])}`;
    setShift(s.shift);
    if (state.mode === "channel") msg.placeholder = `Type to the ${s.short.toLowerCase()}…`;
    if (announce) system(`Channel open: ${s.name}. Field station ${s.zone === "Sky" ? "03" : s.zone === "Land" ? "07" : "12"}.`);
  }
  function selectPair(id: string) {
    const p = PAIRS.find((x) => x.id === id) || PAIRS[0];
    state.pair = p;
    pairPick.querySelectorAll<HTMLElement>(".opt").forEach((o) => o.setAttribute("aria-checked", String(o.dataset.pair === p.id)));
    topics.innerHTML = p.topics.map((t) => `<button class="chip" type="button">${esc(t)}</button>`).join("");
    const a = SPECIES[p.a.species];
    $("#ro-band").textContent = `${fmtHz(a.band[0])} to ${fmtHz(a.band[1])}`;
    setShift(a.shift);
  }
  function setShift(v: number) {
    state.shift = v;
    shift.value = String(v);
    $("#ro-shift").textContent = `${v > 0 ? "+" : ""}${v} oct`;
  }
  shift.addEventListener("input", () => setShift(Number(shift.value)));

  spPick.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-k]");
    if (b && !state.busy) selectSpecies(b.dataset.k as SpeciesKey, true);
  });
  pairPick.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pair]");
    if (!b || state.busy) return;
    selectPair(b.dataset.pair!);
    eavesdrop();
  });
  chips.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".chip");
    if (b && !state.busy) channel(b.textContent || "");
  });
  topics.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".chip");
    if (b && !state.busy) eavesdrop(b.textContent || "");
  });

  // ---- tabs -----------------------------------------------------------------
  function setMode(m: Mode) {
    state.mode = m;
    (Object.keys(tabs) as Mode[]).forEach((k) => {
      tabs[k].setAttribute("aria-selected", String(k === m));
      tabs[k].tabIndex = k === m ? 0 : -1;
      panels[k].hidden = k !== m;
    });
    if (m === "channel") selectSpecies(state.sp);
    else {
      selectPair(state.pair.id);
      msg.placeholder = "Interject into the exchange…";
    }
  }
  tabs.channel.addEventListener("click", () => setMode("channel"));
  tabs.eaves.addEventListener("click", () => setMode("eaves"));
  $(".console__tabs").addEventListener("keydown", (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== "ArrowLeft" && k !== "ArrowRight") return;
    const next: Mode = state.mode === "channel" ? "eaves" : "channel";
    setMode(next);
    tabs[next].focus();
  });

  // ---- transcript -----------------------------------------------------------
  function scrollLog() {
    log.scrollTop = log.scrollHeight;
  }
  function system(text: string) {
    const li = document.createElement("li");
    li.className = "msg msg--sys";
    li.innerHTML = `<span class="msg__who">${esc(text)}</span>`;
    log.appendChild(li);
    scrollLog();
  }
  function addMe(text: string, contour: number[], units: number) {
    const li = document.createElement("li");
    li.className = "msg msg--me";
    li.innerHTML = `<span class="msg__who">Researcher</span><div class="msg__bub">${esc(text)}</div><div class="msg__sig">${contourSvg(contour)}<span>Encoded · ${units} units</span></div>`;
    log.appendChild(li);
    scrollLog();
  }
  function addPending(who: string, side = "") {
    const li = document.createElement("li");
    li.className = `msg msg--them ${side}`;
    li.innerHTML = `<span class="msg__who">${esc(who)} · receiving</span><div class="msg__bub"><span class="typing" aria-label="Decoding"><i></i><i></i><i></i></span></div>`;
    log.appendChild(li);
    scrollLog();
    return li;
  }
  function fill(li: HTMLElement, who: string, s: Signal, note?: string) {
    const c = Math.round(s.confidence * 100);
    li.innerHTML = `<span class="msg__who">${esc(who)} · decoded</span><div class="msg__sig">${contourSvg(s.contour)}<span>${esc(s.signal)}</span></div><div class="msg__bub">${esc(s.decoded)}</div><div class="msg__sig"><span class="conf"><i style="width:${c}%"></i></span><span>Confidence ${c}%</span></div>${note ? `<p class="note">${esc(note)}</p>` : ""}`;
    scrollLog();
  }

  // ---- open a channel -------------------------------------------------------
  async function channel(text: string) {
    text = text.trim();
    if (!text || state.busy) return;
    busy(true);
    const k = state.sp;
    const s = SPECIES[k];
    const contour = encodeText(text);
    addMe(text, contour, contour.length);
    // The researcher's sentence, voiced as the species' units by the FT-1.
    const out = isReady() ? speak(k, { units: contour.length, contour, durationSec: contour.length * 0.35, mood: "curious", decoded: text }, { human: true, shift: state.shift }) : 0;
    const pending = addPending(s.short);
    const [res] = await Promise.all([
      decode({ mode: "channel", species: k, message: text, history: state.hist[k] }),
      sleep(Math.max(900, out * 1000 + 300)),
    ]);
    if (res.mode !== "channel") return busy(false);
    fill(pending, s.short, res.reply, res.note);
    (state.hist[k] ||= []).push({ who: "researcher", text }, { who: s.short.toLowerCase(), text: res.reply.decoded });
    const len = isReady() ? speak(k, res.reply, { print: hash(k), shift: state.shift }) : 0;
    await sleep(len * 600);
    setLed(res.source);
    busy(false);
  }

  // ---- eavesdrop ------------------------------------------------------------
  async function eavesdrop(topic?: string, interject?: string) {
    if (state.busy) return;
    busy(true);
    const p = state.pair;
    if (interject) {
      const contour = encodeText(interject);
      addMe(interject, contour, contour.length);
      if (isReady()) speak(p.a.species, { units: contour.length, contour, durationSec: contour.length * 0.35, mood: "curious", decoded: interject }, { human: true, shift: state.shift });
    } else system(`Intercepting: ${p.title}${topic ? ` · ${topic}` : ""}`);
    const key = `pair:${p.id}`;
    const res: DecodeResponse = await decode({ mode: "eavesdrop", species: p.a.species, pair: p.id, topic, message: interject, history: state.hist[key] });
    if (res.mode !== "eavesdrop") return busy(false);
    for (const turn of res.turns) {
      const ind = turn.individual === "A" ? p.a : p.b;
      const who = `${SPECIES[ind.species].short} ${turn.individual} · ${ind.label}`;
      const li = addPending(who, turn.individual === "B" ? "msg--b" : "");
      await sleep(350);
      fill(li, who, turn);
      const len = isReady() ? speak(ind.species, turn, { print: ind.print, shift: state.shift }) : 1.2;
      (state.hist[key] ||= []).push({ who: turn.individual, text: turn.decoded });
      await sleep(Math.max(1100, (len + 0.35) * 1000));
    }
    if (res.note) {
      const li = document.createElement("li");
      li.className = "msg msg--sys";
      li.innerHTML = `<p class="note">${esc(res.note)}</p>`;
      log.appendChild(li);
      scrollLog();
    }
    state.hist[key] = (state.hist[key] || []).slice(-8);
    setLed(res.source);
    busy(false);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = msg.value.trim();
    if (!text || state.busy) return;
    msg.value = "";
    state.mode === "channel" ? channel(text) : eavesdrop(undefined, text);
  });

  // ---- entry points from elsewhere on the page ------------------------------
  document.addEventListener("morsis:channel", (e) => {
    const k = (e as CustomEvent<{ species?: SpeciesKey }>).detail?.species;
    setMode("channel");
    if (k) selectSpecies(k, true);
    $("#channel").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setTimeout(() => msg.focus({ preventScroll: true }), 700);
  });

  setMode("channel");
  selectSpecies("humpback");
  system("FT-1 linked · Decode-3 ready · pick a species and transmit");
}
