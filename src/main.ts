import { initGate } from "./sections/gate";
import { initHero } from "./sections/hero";
import { initDescent } from "./sections/descent";
import { renderAtlas, initInspector } from "./sections/atlas";
import { initConsole } from "./sections/console";
import { initChrome, keepAccents } from "./sections/chrome";
import { initStack } from "./sections/stack";
import { initFt1 } from "./sections/ft1";
import { initRelief } from "./sections/relief";
import { $ } from "./sections/dom";

declare global {
  interface Window {
    ScrollCraft: { mount(root: Element | Document, opts?: unknown): unknown; reduce: boolean };
  }
}

// Optional media: generated assets land over the day. A missing file hides
// itself instead of showing a broken image, and the CSS fallback shows through.
function guardMedia() {
  document.querySelectorAll<HTMLImageElement>("img[data-optional]").forEach((img) => {
    const miss = () => img.classList.add("is-missing");
    if (img.complete && img.naturalWidth === 0 && img.src) miss();
    img.addEventListener("error", miss, { once: true });
  });
}

// The engine measures the DOM on mount, so render data-driven markup first.
renderAtlas();
guardMedia();
keepAccents();
window.ScrollCraft.mount(document.body);
initStack();

initChrome();
initInspector();
initConsole();
initDescent();
initFt1();
initHero();
initRelief($("#evidence"), $<HTMLCanvasElement>("#evidence-relief"), {
  image: "/assets/img/evidence/relief-1440.webp",
  flat: "/assets/img/hero/flat-480.webp",
  reliefTint: [0.02, 0.04, 0.055],
  anchorX: 0.66,
  sweepY: 0.62,
});
initGate();
