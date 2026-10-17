export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Progress of a pinned act, 0..1, matching the engine's definition. */
export function actProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const travel = r.height - innerHeight;
  return travel > 0 ? clamp(-r.top / travel, 0, 1) : 0;
}

/** Tiny SVG of a pitch contour, used in the transcript. */
export function contourSvg(c: number[]) {
  if (!c.length) return "";
  const pts = c.map((v, i) => `${((i / Math.max(1, c.length - 1)) * 80 + 2).toFixed(1)},${(20 - v * 18).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 84 22" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** Encode a researcher's sentence into a contour (one unit per word). */
export function encodeText(text: string) {
  const words = text.toLowerCase().match(/[a-z0-9’']+/g) || ["…"];
  return words.slice(0, 10).map((w) => {
    let h = 7;
    for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return +(0.15 + (h % 70) / 100).toFixed(2);
  });
}
