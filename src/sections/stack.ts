// Sections stack like cards: as one ends, it holds still and dims while the
// next slides up over it, instead of both scrolling away at a hard seam.
//
// The hold is a `translate` on the section's children, never on the section.
// The engine measures each act's own box to compute scroll progress, so moving
// the box would shift every scrub and cue; moving its contents changes nothing
// it reads. `translate` also composes with any transform the engine writes.
import { $$, clamp, reduceMotion } from "./dom";

export function initStack() {
  const secs = $$<HTMLElement>("main > section");
  secs.forEach((s, i) => {
    s.classList.add("stack");
    s.style.zIndex = String(i + 1);
  });
  if (reduceMotion()) return;

  let bottoms: number[] = [];
  let vh = innerHeight;
  const docTop = (el: HTMLElement) => {
    let y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
    return y;
  };
  const measure = () => {
    vh = innerHeight;
    bottoms = secs.map((s) => docTop(s) + s.offsetHeight);
  };

  const frame = () => {
    const y = scrollY;
    // The last section has nothing sliding over it.
    for (let i = 0; i < secs.length - 1; i++) {
      const hold = clamp(y - (bottoms[i] - vh), 0, vh);
      const s = secs[i];
      if (hold > 0 && hold < vh) {
        s.style.setProperty("--hold", `${hold.toFixed(1)}px`);
        s.style.setProperty("--cover", (hold / vh).toFixed(3));
        s.classList.add("is-held");
      } else if (s.classList.contains("is-held")) {
        s.style.removeProperty("--hold");
        s.style.removeProperty("--cover");
        s.classList.remove("is-held");
      }
    }
  };

  // Pinned acts get their height from the engine on mount and resize, so
  // measure after it has laid out, and again whenever the document grows.
  const remeasure = () => {
    measure();
    frame();
  };
  addEventListener("scroll", frame, { passive: true });
  addEventListener("resize", () => requestAnimationFrame(remeasure));
  new ResizeObserver(() => requestAnimationFrame(remeasure)).observe(document.body);
  document.fonts?.ready.then(remeasure);
  requestAnimationFrame(remeasure);
}
