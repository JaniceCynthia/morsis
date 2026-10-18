// Canvas-painted surfaces for the FT-1's internals. Everything inside the radio
// is drawn here rather than shipped as images: boards, labels and lids are
// mostly flat print, and drawing them keeps the teardown to one model download.
import * as THREE from "three";

const FONT = '"Neue Montreal", "Helvetica Neue", Arial, sans-serif';
const MONO = '"Geist Mono", ui-monospace, monospace';

/** Seeded so every visit gets the same board, not a fresh random layout. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, color: boolean) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Fine grain over a fill, so no surface is flat digital colour. */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, r: () => number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export interface Pbr { map: THREE.Texture; rough: THREE.Texture; }

export interface Footprint { x: number; y: number; w: number; h: number; ref: string; }

/**
 * A printed circuit board. Board space is millimetres with the origin at the
 * centre, +y up. `foot` outlines are silk-screened where parts will sit, so the
 * meshes placed on top line up with their own markings.
 */
export function boardTexture(opts: {
  w: number; h: number; ppm: number; seed: number;
  mask: string; trace: string; title: string[]; foot: Footprint[];
}): Pbr {
  const { w, h, ppm } = opts;
  const W = Math.round(w * ppm), H = Math.round(h * ppm);
  const [c, x] = canvas(W, H);
  const [rc, rx] = canvas(W, H);
  const r = rng(opts.seed);
  const X = (mm: number) => (mm + w / 2) * ppm;
  const Y = (mm: number) => (h / 2 - mm) * ppm;

  x.fillStyle = opts.mask;
  x.fillRect(0, 0, W, H);
  // Roughness/metalness map: G = roughness, B = metalness. Solder mask is a
  // satin lacquer; exposed pads are bare, bright metal.
  rx.fillStyle = "rgb(0, 105, 0)";
  rx.fillRect(0, 0, W, H);

  // Copper under the mask reads as slightly lighter, raised traces.
  x.strokeStyle = opts.trace;
  x.lineCap = "round";
  x.lineJoin = "round";
  for (let i = 0; i < 90; i++) {
    x.lineWidth = (0.25 + r() * 0.45) * ppm;
    let px = X((r() - 0.5) * w * 0.94), py = Y((r() - 0.5) * h * 0.94);
    x.beginPath();
    x.moveTo(px, py);
    for (let k = 0; k < 3 + r() * 4; k++) {
      const len = (4 + r() * 22) * ppm;
      const dir = Math.floor(r() * 8) * (Math.PI / 4);
      px = Math.max(4, Math.min(W - 4, px + Math.cos(dir) * len));
      py = Math.max(4, Math.min(H - 4, py + Math.sin(dir) * len));
      x.lineTo(px, py);
    }
    x.stroke();
  }
  // Vias.
  for (let i = 0; i < 160; i++) {
    const vx = r() * W, vy = r() * H, rr = (0.35 + r() * 0.2) * ppm;
    x.fillStyle = "#C9A54A";
    x.beginPath(); x.arc(vx, vy, rr, 0, 7); x.fill();
    x.fillStyle = "#14140F";
    x.beginPath(); x.arc(vx, vy, rr * 0.45, 0, 7); x.fill();
    rx.fillStyle = "rgb(0, 60, 255)";
    rx.beginPath(); rx.arc(vx, vy, rr, 0, 7); rx.fill();
  }
  // Silkscreen outlines, pads and reference designators.
  x.font = `${1.6 * ppm}px ${MONO}`;
  for (const f of opts.foot) {
    const fx = X(f.x - f.w / 2), fy = Y(f.y + f.h / 2), fw = f.w * ppm, fh = f.h * ppm;
    x.strokeStyle = "rgba(236, 236, 226, 0.88)";
    x.lineWidth = 0.18 * ppm;
    x.strokeRect(fx - 0.8 * ppm, fy - 0.8 * ppm, fw + 1.6 * ppm, fh + 1.6 * ppm);
    // Pad rows along the long edges.
    const pads = Math.max(2, Math.round(Math.max(f.w, f.h) / 1.3));
    for (let k = 0; k < pads; k++) {
      const t = (k + 0.5) / pads;
      const horizontal = f.w >= f.h;
      for (const side of [-1, 1]) {
        const px = horizontal ? fx + t * fw : side < 0 ? fx - 0.7 * ppm : fx + fw + 0.1 * ppm;
        const py = horizontal ? (side < 0 ? fy - 0.7 * ppm : fy + fh + 0.1 * ppm) : fy + t * fh;
        const pw = horizontal ? 0.5 * ppm : 0.6 * ppm, ph = horizontal ? 0.6 * ppm : 0.5 * ppm;
        x.fillStyle = "#D2AE52";
        x.fillRect(px, py, pw, ph);
        rx.fillStyle = "rgb(0, 50, 255)";
        rx.fillRect(px, py, pw, ph);
      }
    }
    x.fillStyle = "rgba(236, 236, 226, 0.9)";
    x.fillText(f.ref, fx, fy - 1.4 * ppm);
  }
  // Scattered passives: the 0402s and 0603s that make a board look real.
  for (let i = 0; i < 140; i++) {
    const px = r() * W, py = r() * H, vertical = r() > 0.5;
    const pw = (vertical ? 0.6 : 1.2) * ppm, ph = (vertical ? 1.2 : 0.6) * ppm;
    x.fillStyle = r() > 0.5 ? "#2A2622" : "#B9A890";
    x.fillRect(px, py, pw, ph);
    x.fillStyle = "#CDB070";
    if (vertical) { x.fillRect(px, py, pw, ph * 0.22); x.fillRect(px, py + ph * 0.78, pw, ph * 0.22); }
    else { x.fillRect(px, py, pw * 0.22, ph); x.fillRect(px + pw * 0.78, py, pw * 0.22, ph); }
  }
  // Mounting holes.
  for (const [mx, my] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = X(mx * (w / 2 - 4)), cy = Y(my * (h / 2 - 4));
    x.fillStyle = "#C9A54A";
    x.beginPath(); x.arc(cx, cy, 2.6 * ppm, 0, 7); x.fill();
    x.fillStyle = "#0B0B09";
    x.beginPath(); x.arc(cx, cy, 1.6 * ppm, 0, 7); x.fill();
    rx.fillStyle = "rgb(0, 50, 255)";
    rx.beginPath(); rx.arc(cx, cy, 2.6 * ppm, 0, 7); rx.fill();
  }
  // Board title block.
  x.fillStyle = "rgba(236, 236, 226, 0.92)";
  opts.title.forEach((line, i) => {
    x.font = `${(i === 0 ? 2.6 : 1.7) * ppm}px ${i === 0 ? FONT : MONO}`;
    x.fillText(line, X(-w / 2 + 6), Y(-h / 2 + 6) - (opts.title.length - 1 - i) * 2.6 * ppm);
  });
  grain(x, W, H, 10, r);
  return { map: tex(c, true), rough: tex(rc, false) };
}

/** Top marking of a packaged chip: laser-etched, low contrast, pin-1 dot. */
export function chipTop(lines: string[], seed: number, lime = false) {
  const [c, x] = canvas(256, 256);
  const r = rng(seed);
  x.fillStyle = "#151513";
  x.fillRect(0, 0, 256, 256);
  grain(x, 256, 256, 14, r);
  x.fillStyle = "rgba(170, 170, 160, 0.55)";
  x.textAlign = "center";
  lines.forEach((l, i) => {
    x.font = `${i === 0 ? 34 : 22}px ${i === 0 ? FONT : MONO}`;
    x.fillText(l, 128, 112 + i * 34);
  });
  x.fillStyle = lime ? "#D4F53F" : "rgba(170,170,160,0.5)";
  x.beginPath(); x.arc(34, 34, 10, 0, 7); x.fill();
  return tex(c, true);
}

/** A machined lid: brushed metal, etched lettering, one lime fiducial. */
export function brushedLid(lines: string[], seed: number) {
  const [c, x] = canvas(512, 512);
  const [rc, rx] = canvas(512, 512);
  const r = rng(seed);
  x.fillStyle = "#9A9B95";
  x.fillRect(0, 0, 512, 512);
  rx.fillStyle = "rgb(0, 95, 255)";
  rx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    const y = r() * 512, a = 0.04 + r() * 0.08;
    x.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    x.lineWidth = 0.5 + r();
    x.beginPath(); x.moveTo(0, y); x.lineTo(512, y + (r() - 0.5) * 2); x.stroke();
  }
  x.fillStyle = "rgba(40, 40, 36, 0.78)";
  rx.fillStyle = "rgb(0, 200, 120)";
  x.textAlign = rx.textAlign = "center";
  lines.forEach((l, i) => {
    const f = `${i === 0 ? 62 : 26}px ${i === 0 ? FONT : MONO}`;
    x.font = rx.font = f;
    x.fillText(l, 256, 236 + i * 46);
    rx.fillText(l, 256, 236 + i * 46);
  });
  x.fillStyle = "#D4F53F";
  x.beginPath(); x.arc(452, 452, 16, 0, 7); x.fill();
  return { map: tex(c, true), rough: tex(rc, false) };
}

/** Shrink-wrap on a cell: Field Ink with a lime band and the rating print. */
export function cellWrap(seed: number) {
  const [c, x] = canvas(1024, 256);
  const r = rng(seed);
  x.fillStyle = "#1A1B16";
  x.fillRect(0, 0, 1024, 256);
  x.fillStyle = "#D4F53F";
  x.fillRect(0, 0, 1024, 26);
  x.fillStyle = "rgba(241,241,234,0.86)";
  x.font = `64px ${FONT}`;
  x.fillText("MORSIS", 60, 130);
  x.font = `28px ${MONO}`;
  x.fillText("18650 · 3.6 V · 3400 mAh · FIELD CELL", 60, 186);
  x.fillText("CHARGE FROM CRANK OR DC IN ONLY", 60, 226);
  grain(x, 1024, 256, 12, r);
  return tex(c, true);
}

/** The removable field log card. */
export function cardLabel() {
  const [c, x] = canvas(256, 340);
  x.fillStyle = "#121310";
  x.fillRect(0, 0, 256, 340);
  x.fillStyle = "#D4F53F";
  x.fillRect(0, 0, 256, 70);
  x.fillStyle = "#10110D";
  x.font = `30px ${FONT}`;
  x.fillText("FIELD LOG", 18, 46);
  x.fillStyle = "rgba(241,241,234,0.9)";
  x.font = `74px ${FONT}`;
  x.fillText("512", 18, 168);
  x.font = `30px ${MONO}`;
  x.fillText("GB · FS-07", 18, 212);
  x.fillText("WORM · SEALED", 18, 300);
  return tex(c, true);
}

/** Speaker cone paper: fibrous, matte, slightly uneven. */
export function conePaper(seed: number) {
  const [c, x] = canvas(512, 512);
  const r = rng(seed);
  x.fillStyle = "#26251F";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    x.strokeStyle = `rgba(${r() > 0.5 ? "255,255,240" : "0,0,0"},${0.03 + r() * 0.05})`;
    x.lineWidth = 0.6;
    const px = r() * 512, py = r() * 512, a = r() * Math.PI;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); x.stroke();
  }
  return tex(c, true);
}
