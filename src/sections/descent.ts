// The descent: HUD readout, zone ambience and animal hotspots, all keyed to the
// film's own playhead (the engine scrubs the <video>), so they stay locked to
// what is on screen whatever the scroll mapping does. Before the clip loads,
// act progress stands in for it.
import { mixAmbience, speak, isReady } from "../audio/engine";
import { scriptedReply } from "../decode/scripted";
import type { SpeciesKey } from "../decode/species";
import { $, $$, actProgress, clamp } from "./dom";
import { openInspector } from "./atlas";

// Film timeline in seconds (public/assets/video/manifest.json). Zone changes sit
// where the picture actually changes medium: the savanna arrives at ~7.8 s, the
// buoy at the waterline at ~17.6 s, and the camera goes under at ~19 s.
let DUR = 25.042;
const SKY_END = 7.8;
const SEA_START = 17.6;
const UNDER = 19;
const DEPTH_END = 24.6;
const FRAME_ASPECT = 16 / 9;

const fmt = new Intl.NumberFormat("en-GB");

export function initDescent() {
  const act = $("#descent");
  const stage = $("[data-sc-stage]", act);
  const video = act.querySelector<HTMLVideoElement>("video[data-sc-scrub]");
  const alt = $("#hud-alt");
  const medium = $("#hud-medium");
  const speed = $("#hud-speed");
  const dot = $("#hud-dot");
  const route = $$("li[data-zone]", act);
  // data-path is "t:fx,fy t:fx,fy …": the animal's position in the frame at
  // film times, so a marker can follow a bird across the sky.
  const spots = $$<HTMLButtonElement>(".spot", act).map((el) => {
    const [a, b] = (el.dataset.t || "0 0").split(" ").map(Number);
    const path = (el.dataset.path || "").trim().split(/\s+/).map((kf) => {
      const [t, xy] = kf.split(":");
      const [x, y] = xy.split(",").map(Number);
      return { t: Number(t), x, y };
    });
    return { el, a, b, path, k: el.dataset.species as SpeciesKey };
  });
  const at = (path: { t: number; x: number; y: number }[], t: number) => {
    if (t <= path[0].t) return path[0];
    for (let i = 1; i < path.length; i++) {
      if (t <= path[i].t) {
        const p0 = path[i - 1], p1 = path[i];
        const f = (t - p0.t) / (p1.t - p0.t || 1);
        return { t, x: p0.x + (p1.x - p0.x) * f, y: p0.y + (p1.y - p0.y) * f };
      }
    }
    return path[path.length - 1];
  };
  loadManifest();

  // Hotspots are authored in frame coordinates; map them through object-fit: cover.
  const cover = { ox: 0, oy: 0, w: 1, h: 1 };
  const measure = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
    const s = Math.max(W / FRAME_ASPECT, H);
    cover.w = s * FRAME_ASPECT;
    cover.h = s;
    cover.ox = (W - cover.w) / 2;
    cover.oy = (H - cover.h) / 2;
    last = -1;
  };

  const filmTime = () => {
    if (video && video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) return video.currentTime;
    return actProgress(act) * DUR;
  };

  let last = -1;
  let onScreen = false;
  measure();
  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (!onScreen) mixAmbience({ sky: 0, land: 0, sea: 0 });
  }).observe(act);

  const frame = () => {
    requestAnimationFrame(frame);
    if (!onScreen) return;
    const t = filmTime();
    if (Math.abs(t - last) < 0.01) return;
    last = t;

    const zone = t < SKY_END ? "sky" : t < SEA_START ? "land" : "sea";
    if (zone === "sky") {
      const m = 1200 * (1 - t / SKY_END);
      alt.textContent = `${fmt.format(Math.max(0, Math.round(m / 10) * 10))} m`;
      medium.textContent = "Air";
      speed.textContent = "343 m/s";
    } else if (zone === "land") {
      alt.textContent = "Ground level";
      medium.textContent = "Soil · seismic";
      speed.textContent = "≈ 250 m/s";
    } else {
      const d = 40 * clamp((t - UNDER) / (DEPTH_END - UNDER), 0, 1);
      alt.textContent = t < UNDER ? "Waterline" : `−${Math.max(1, Math.round(d))} m`;
      medium.textContent = "Seawater";
      speed.textContent = "1,480 m/s";
    }
    dot.style.setProperty("--d", (t / DUR).toFixed(3));
    route.forEach((li) => li.classList.toggle("is-on", li.dataset.zone === zone));

    // Equal-power crossfades: a slow blend into land, a short one at the sea cut.
    const w = (edge: number, band: number) => clamp((t - (edge - band)) / (2 * band), 0, 1);
    const toLand = w(SKY_END, 1.6);
    const toSea = w(SEA_START, 0.5);
    mixAmbience({
      sky: Math.cos((toLand * Math.PI) / 2),
      land: Math.sin((toLand * Math.PI) / 2) * Math.cos((toSea * Math.PI) / 2),
      sea: Math.sin((toSea * Math.PI) / 2),
    });

    for (const s of spots) {
      const on = t >= s.a && t <= s.b;
      s.el.classList.toggle("is-on", on);
      s.el.tabIndex = on ? 0 : -1;
      if (!on || !s.path.length) continue;
      const pos = at(s.path, t);
      s.el.style.translate = `${Math.round(cover.ox + pos.x * cover.w)}px ${Math.round(cover.oy + pos.y * cover.h)}px`;
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
    if (m?.descent?.duration > 0) DUR = m.descent.duration;
  } catch {
    /* keep default */
  }
}
