// The FT-1 scope: a scrolling spectrogram of everything the engine voices,
// framed as an instrument screen. Log-frequency axis by default, lime for
// energy, so elephant rumbles sit low and dolphin whistles high. Axis labels,
// grid and ticks are DOM so they stay sharp at any pixel density; the canvas
// paints one device pixel per row.
import { fft, sampleRate } from "../audio/engine";
import { $ } from "./dom";

type Scale = "log" | "lin";

const RANGE: Record<Scale, { lo: number; hi: number; marks: number[] }> = {
  log: { lo: 15, hi: 20000, marks: [80, 800, 8000] },
  lin: { lo: 0, hi: 10000, marks: [2500, 5000, 7500] },
};
const WINDOWS = [1, 2, 4, 8];
const BG = [10, 12, 7];

// Energy → colour: deep olive, through Signal Lime, to a hot pale core.
const LUT = (() => {
  const stops: [number, number[]][] = [
    [0, BG],
    [0.18, [38, 52, 10]],
    [0.45, [120, 160, 24]],
    [0.75, [212, 245, 63]],
    [1, [246, 255, 206]],
  ];
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let k = 1;
    while (k < stops.length - 1 && stops[k][0] < v) k++;
    const [a, ca] = stops[k - 1], [b, cb] = stops[k];
    const t = (v - a) / (b - a || 1);
    for (let c = 0; c < 3; c++) out[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * t;
  }
  return out;
})();

const fmt = (f: number) => (f >= 1000 ? `${+(f / 1000).toFixed(1)}k` : `${f}`);

export function initSpectro(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d", { alpha: false });
  if (!ctx) return;
  const freqAxis = $("#scope-freq");
  const ticks = $("#scope-ticks");
  const winVal = $<HTMLOutputElement>("#win-val");
  const winDn = $<HTMLButtonElement>("#win-dn");
  const winUp = $<HTMLButtonElement>("#win-up");
  const meterLo = $("#meter-lo");
  const meterHi = $("#meter-hi");

  let w = 0, h = 0, visible = false;
  let scale: Scale = "log", gain = 1, win = 2;
  let carry = 0, last = 0, lo = 0, hi = 0;
  const dpr = () => Math.min(3, devicePixelRatio || 1);

  // Height fraction (0 at the bottom) of a frequency on the current scale.
  const frac = (f: number) => {
    const r = RANGE[scale];
    return scale === "log" ? Math.log(f / r.lo) / Math.log(r.hi / r.lo) : (f - r.lo) / (r.hi - r.lo);
  };
  const freqAt = (p: number) => {
    const r = RANGE[scale];
    return scale === "log" ? r.lo * Math.pow(r.hi / r.lo, p) : r.lo + (r.hi - r.lo) * p;
  };

  const clear = () => {
    ctx.fillStyle = `rgb(${BG})`;
    ctx.fillRect(0, 0, w, h);
  };
  const size = () => {
    const d = dpr();
    w = Math.max(1, Math.round(cv.clientWidth * d));
    h = Math.max(1, Math.round(cv.clientHeight * d));
    cv.width = w;
    cv.height = h;
    clear();
  };
  const drawAxis = () => {
    freqAxis.innerHTML = RANGE[scale].marks
      .map((f) => `<span style="bottom:${(frac(f) * 100).toFixed(2)}%"><b>${fmt(f)}</b></span>`)
      .join("");
  };
  const drawTicks = () => {
    const n = 8;
    let html = `<span class="is-unit" style="left:0">sec</span>`;
    for (let i = 1; i < n; i++) {
      const t = (win * i) / n;
      const label = win === 1 ? (i === n / 2 ? "0.5" : "") : Number.isInteger(t) ? String(t) : "";
      html += `<span style="left:${(i / n) * 100}%">${label}</span>`;
    }
    ticks.innerHTML = html;
    winVal.value = String(win);
    winDn.disabled = win === WINDOWS[0];
    winUp.disabled = win === WINDOWS[WINDOWS.length - 1];
  };

  const stepWin = (dir: number) => {
    const i = WINDOWS.indexOf(win) + dir;
    if (i < 0 || i >= WINDOWS.length) return;
    win = WINDOWS[i];
    drawTicks();
  };
  winDn.addEventListener("click", () => stepWin(-1));
  winUp.addEventListener("click", () => stepWin(1));

  // Spectrum / Options tabs.
  const tabSpec = $<HTMLButtonElement>("#scope-tab-spec");
  const tabOpt = $<HTMLButtonElement>("#scope-tab-opt");
  const showOpts = (on: boolean) => {
    tabSpec.setAttribute("aria-selected", String(!on));
    tabOpt.setAttribute("aria-selected", String(on));
    tabSpec.tabIndex = on ? -1 : 0;
    tabOpt.tabIndex = on ? 0 : -1;
    $("#scope-opt").hidden = !on;
  };
  tabSpec.addEventListener("click", () => showOpts(false));
  tabOpt.addEventListener("click", () => showOpts(tabOpt.getAttribute("aria-selected") !== "true"));
  $(".scope__tabs").addEventListener("keydown", (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== "ArrowLeft" && k !== "ArrowRight") return;
    const on = tabOpt.getAttribute("aria-selected") !== "true";
    showOpts(on);
    (on ? tabOpt : tabSpec).focus();
  });
  $("#scope-opt").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[role=radio]");
    if (!b) return;
    b.parentElement!.querySelectorAll("[role=radio]").forEach((o) => o.setAttribute("aria-checked", String(o === b)));
    if (b.dataset.gain) gain = Number(b.dataset.gain);
    if (b.dataset.scale && b.dataset.scale !== scale) {
      scale = b.dataset.scale as Scale;
      drawAxis();
      clear();
    }
  });

  new ResizeObserver(size).observe(cv);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(cv);
  drawAxis();
  drawTicks();

  let col: ImageData | null = null;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    if (!visible || !w) return;
    // Scroll at w pixels per window, carrying the fraction between frames.
    carry += (w * dt) / (win * 1000);
    const step = Math.floor(carry);
    if (step < 1) return;
    carry -= step;
    ctx.drawImage(cv, step, 0, w - step, h, 0, 0, w - step, h);
    if (!col || col.width !== step || col.height !== h) col = ctx.createImageData(step, h);
    const px = col.data;
    const data = fft();
    const nyq = sampleRate() / 2;
    const bins = data ? data.length : 0;
    const split = 800;
    let eLo = 0, nLo = 0, eHi = 0, nHi = 0;
    for (let y = 0; y < h; y++) {
      let v = 0;
      if (data) {
        const f = freqAt((h - y - 0.5) / h);
        const x = Math.max(0, Math.min(bins - 1.001, (f / nyq) * bins));
        const i = Math.floor(x);
        // A silent analyser reports -Infinity, which would interpolate to NaN.
        const a = Math.max(-200, data[i]), b = Math.max(-200, data[i + 1]);
        const db = a + (b - a) * (x - i);
        v = Math.max(0, Math.min(1, ((db + 105) / 75) * gain)) || 0;
        if (f < split) (eLo += v), nLo++;
        else (eHi += v), nHi++;
      }
      const c = Math.round(v * v * 255) * 3;
      for (let s = 0; s < step; s++) {
        const o = (y * step + s) * 4;
        px[o] = LUT[c];
        px[o + 1] = LUT[c + 1];
        px[o + 2] = LUT[c + 2];
        px[o + 3] = 255;
      }
    }
    ctx.putImageData(col, w - step, 0);
    // Level meters: fast attack, slow release.
    const tLo = nLo ? Math.min(1, (eLo / nLo) * 1.8) : 0;
    const tHi = nHi ? Math.min(1, (eHi / nHi) * 2.4) : 0;
    lo = tLo > lo ? tLo : lo * 0.92;
    hi = tHi > hi ? tHi : hi * 0.92;
    meterLo.style.transform = `scaleX(${lo.toFixed(3)})`;
    meterHi.style.transform = `scaleX(${hi.toFixed(3)})`;
  };
  requestAnimationFrame(frame);
}
