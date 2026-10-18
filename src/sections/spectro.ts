// Scrolling spectrogram of everything the engine voices. Log-frequency axis,
// lime for energy, so elephant rumbles sit low and dolphin whistles high.
import { fft, sampleRate } from "../audio/engine";

export function initSpectro(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d", { alpha: false });
  if (!ctx) return;
  let w = 0, h = 0, visible = false;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => {
    w = Math.max(1, Math.round(cv.clientWidth * dpr));
    h = Math.max(1, Math.round(cv.clientHeight * dpr));
    cv.width = w;
    cv.height = h;
    ctx.fillStyle = "#0B0C09";
    ctx.fillRect(0, 0, w, h);
    grid();
  };
  const grid = () => {
    ctx.fillStyle = "rgba(238,240,228,0.35)";
    ctx.font = `${10 * dpr}px "Geist Mono", monospace`;
    for (const f of [50, 500, 5000]) ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, 4 * dpr, yOf(f) - 3 * dpr);
  };
  const LO = 15, HI = 20000;
  const yOf = (f: number) => h - (Math.log(f / LO) / Math.log(HI / LO)) * h;
  new ResizeObserver(size).observe(cv);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(cv);

  const step = 2 * dpr;
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible || !w) return;
    const data = fft();
    // Shift the existing image left, then paint the newest column on the right.
    ctx.drawImage(cv, step, 0, w - step, h, 0, 0, w - step, h);
    ctx.fillStyle = "#0B0C09";
    ctx.fillRect(w - step, 0, step, h);
    if (!data) return;
    const nyq = sampleRate() / 2;
    const bins = data.length;
    for (let y = 0; y < h; y += dpr) {
      const f = LO * Math.pow(HI / LO, (h - y) / h);
      const i = Math.min(bins - 1, Math.round((f / nyq) * bins));
      const db = data[i];
      const v = Math.max(0, Math.min(1, (db + 105) / 75));
      if (v < 0.04) continue;
      ctx.fillStyle = `rgba(212,245,63,${(v * v).toFixed(3)})`;
      ctx.fillRect(w - step, y, step, dpr);
    }
  };
  requestAnimationFrame(frame);
}
