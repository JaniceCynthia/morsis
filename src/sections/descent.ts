// The descent: HUD readout, zone ambience and animal hotspots, all keyed to the
// same act progress the engine uses to scrub the film.
import { mixAmbience, speak, isReady } from "../audio/engine";
import { scriptedReply } from "../decode/scripted";
import type { SpeciesKey } from "../decode/species";
import { $, $$, actProgress, clamp } from "./dom";
import { openInspector } from "./atlas";

// Zone boundaries in act progress. Tuned to the D1–D5 segment boundaries once
// public/assets/video/manifest.json exists (see loadManifest below).
let SKY_END = 0.33;
let LAND_END = 0.66;

const fmt = new Intl.NumberFormat("en-GB");

export function initDescent() {
  const act = $("#descent");
  const alt = $("#hud-alt");
  const medium = $("#hud-medium");
  const speed = $("#hud-speed");
  const dot = $("#hud-dot");
  const route = $$("li[data-zone]", act);
  const spots = $$<HTMLButtonElement>(".spot", act).map((el) => {
    const [a, b] = (el.dataset.window || "0 1").split(" ").map(Number);
    return { el, a, b, k: el.dataset.species as SpeciesKey };
  });
  loadManifest();

  let last = -1;
  let onScreen = false;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (!onScreen) mixAmbience({ sky: 0, land: 0, sea: 0 });
  }).observe(act);

  const frame = () => {
    requestAnimationFrame(frame);
    if (!onScreen) return;
    const p = actProgress(act);
    if (Math.abs(p - last) < 0.0005) return;
    last = p;

    const zone = p < SKY_END ? "sky" : p < LAND_END ? "land" : "sea";
    if (zone === "sky") {
      const m = 1200 * (1 - p / SKY_END);
      alt.textContent = `${fmt.format(Math.round(m / 10) * 10)} m`;
      medium.textContent = "Air";
      speed.textContent = "343 m/s";
    } else if (zone === "land") {
      alt.textContent = "Ground level";
      medium.textContent = "Soil · seismic";
      speed.textContent = "≈ 250 m/s";
    } else {
      const d = 40 * clamp((p - LAND_END) / (1 - LAND_END - 0.04), 0, 1);
      alt.textContent = `−${Math.round(d)} m`;
      medium.textContent = "Seawater";
      speed.textContent = "1,480 m/s";
    }
    dot.style.setProperty("--d", p.toFixed(3));
    route.forEach((li) => li.classList.toggle("is-on", li.dataset.zone === zone));

    // Equal-power crossfade across each zone boundary.
    const band = 0.06;
    const w = (edge: number) => clamp((p - (edge - band)) / (2 * band), 0, 1);
    const toLand = w(SKY_END);
    const toSea = w(LAND_END);
    mixAmbience({ sky: Math.cos((toLand * Math.PI) / 2), land: Math.sin((toLand * Math.PI) / 2) * Math.cos((toSea * Math.PI) / 2), sea: Math.sin((toSea * Math.PI) / 2) });

    for (const s of spots) {
      const on = p >= s.a && p <= s.b;
      s.el.classList.toggle("is-on", on);
      s.el.tabIndex = on ? 0 : -1;
    }
  };
  requestAnimationFrame(frame);

  for (const s of spots) {
    let cool = 0;
    const call = () => {
      if (!isReady() || performance.now() < cool) return;
      const r = scriptedReply(s.k);
      const len = speak(s.k, { ...r, units: Math.min(r.units, 3), durationSec: Math.min(r.durationSec, 2.4) });
      cool = performance.now() + (len + 0.3) * 1000;
    };
    s.el.addEventListener("pointerenter", call);
    s.el.addEventListener("focus", call);
    s.el.addEventListener("click", () => openInspector(s.k));
  }
}

async function loadManifest() {
  try {
    const res = await fetch("/assets/video/manifest.json");
    if (!res.ok) return;
    const m = await res.json();
    const segs: { id: string; start: number; end: number }[] = m?.descent?.segments || [];
    const dur: number = m?.descent?.duration || 0;
    if (segs.length === 5 && dur > 0) {
      // D2 lands on the savanna and D4 reaches the waterline: switch zones halfway through each.
      SKY_END = (segs[1].start + segs[1].end) / 2 / dur;
      LAND_END = (segs[3].start + segs[3].end) / 2 / dur;
    }
  } catch {
    /* keep defaults */
  }
}
