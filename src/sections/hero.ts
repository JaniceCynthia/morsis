// Hero: a living signal field over the cloud plate, and the bubble that plays
// the first intercepted exchange instantly (scripted, so it never waits).
import { speak, isReady, fft } from "../audio/engine";
import { EXCHANGES } from "../decode/scripted";
import { PAIRS } from "../decode/species";
import { $, esc, reduceMotion, sleep } from "./dom";

export function initHero() {
  heroLoop();
  field();
  const bubble = $<HTMLButtonElement>("#bubble");
  const out = $("#bubble-hint");
  let playing = false;
  bubble.addEventListener("click", async () => {
    if (playing || !isReady()) return;
    playing = true;
    bubble.classList.add("is-playing");
    const pair = PAIRS.find((p) => p.id === "ravens")!;
    const ex = EXCHANGES.ravens;
    for (const turn of ex.turns.slice(0, 3)) {
      const who = turn.individual === "A" ? pair.a : pair.b;
      out.innerHTML = `<b>${esc(who.label)}</b> · ${esc(turn.signal)}<br>${esc(turn.decoded)}`;
      const len = speak(who.species, turn, { print: who.print });
      await sleep((len + 0.5) * 1000);
    }
    out.innerHTML = `Intercepted at Field station 07. <a class="link" href="#channel" data-open-hero>Open a channel</a> to answer.`;
    out.querySelector("[data-open-hero]")?.addEventListener("click", (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("morsis:channel", { detail: { species: "raven" } }));
    });
    bubble.classList.remove("is-playing");
    playing = false;
  });
}

function heroLoop() {
  const v = document.querySelector<HTMLVideoElement>(".hero__loop");
  const src = v?.dataset.optionalVideo;
  if (!v || !src || reduceMotion()) return;
  fetch(src, { method: "HEAD" })
    .then((r) => {
      if (!r.ok || !(r.headers.get("content-type") || "").includes("video")) return;
      v.src = src;
      v.addEventListener("playing", () => v.classList.add("is-playing"), { once: true });
      v.play().catch(() => undefined);
    })
    .catch(() => undefined);
}

// Lime signal traces drifting across the sky; they swell with live audio.
function field() {
  const cv = $<HTMLCanvasElement>("#field");
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  let w = 0, h = 0, dpr = 1, visible = true;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = cv.clientWidth;
    h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
  };
  size();
  addEventListener("resize", size);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(cv);
  const lines = 7;
  const t0 = performance.now();
  const still = reduceMotion();
  const draw = (now: number) => {
    requestAnimationFrame(draw);
    if (!visible) return;
    const t = still ? 0 : (now - t0) / 1000;
    let energy = 0;
    const f = fft();
    if (f) {
      let s = 0;
      for (let i = 4; i < 200; i++) s += Math.max(0, (f[i] + 100) / 100);
      energy = Math.min(1, s / 60);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (let l = 0; l < lines; l++) {
      const y0 = h * (0.28 + l * 0.055);
      const amp = 8 + l * 2 + energy * 38;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const k = x / w;
        const y = y0 + Math.sin(k * (5 + l) + t * (0.35 + l * 0.07)) * amp * Math.sin(k * Math.PI) + Math.sin(k * 23 + t * 1.3 + l) * (2 + energy * 10);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(212, 245, 63, ${0.05 + 0.03 * (lines - l) / lines + energy * 0.18})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  requestAnimationFrame(draw);
}
