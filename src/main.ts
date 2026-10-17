import { initGate } from "./sections/gate";
import { initHero } from "./sections/hero";
import { initDescent } from "./sections/descent";
import { renderAtlas, initInspector } from "./sections/atlas";
import { initConsole } from "./sections/console";
import { initChrome } from "./sections/chrome";

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
  document.querySelectorAll<HTMLImageElement>("img[data-logo]").forEach((img) => {
    const ok = () => img.closest(".mark")?.classList.add("has-logo");
    if (img.complete && img.naturalWidth > 0) ok();
    img.addEventListener("load", ok, { once: true });
  });
}

// The engine measures the DOM on mount, so render data-driven markup first.
renderAtlas();
guardMedia();
window.ScrollCraft.mount(document.body);

initChrome();
initInspector();
initConsole();
initDescent();
initHero();
initGate();
