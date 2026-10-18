// Site bar: sound toggle and the one CTA label, "Open a channel".
import { isMuted, isReady, setMuted } from "../audio/engine";
import { $, $$ } from "./dom";

export function initChrome() {
  const btn = $<HTMLButtonElement>("#sound-toggle");
  const sync = () => btn.setAttribute("aria-pressed", String(!isMuted()));
  btn.addEventListener("click", () => {
    if (!isReady()) return;
    setMuted(!isMuted());
    sync();
  });
  document.addEventListener("morsis:enter", sync);

  $$<HTMLAnchorElement>("[data-open-channel]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("morsis:channel", { detail: {} }));
    }),
  );
  barTone();
  const mark = document.querySelector(".close__mark");
  if (mark) new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    mark.classList.add("is-in");
    io.disconnect();
  }, { threshold: 0.3 }).observe(mark);
}

// The bar takes the tone of whatever section is under it. Sections slide over
// each other, so ask the page what is actually painted there, not what is in flow.
function barTone() {
  const bar = $("#bar");
  let queued = false;
  const check = () => {
    queued = false;
    const y = bar.offsetHeight / 2;
    // Skip fixed overlays (grain, progress) and find the first painted section content.
    const hit = document.elementsFromPoint(innerWidth / 2, y).find((el) => el.closest("main"));
    const light = hit?.closest("[data-tone]")?.getAttribute("data-tone") === "light";
    bar.classList.toggle("is-light", light);
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(check);
  };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  check();
}

// The engine's kinetic split rebuilds a line from its textContent, which drops
// the <em> on the accent words. Remember them first, then put the accent face
// back on the matching units once the split lands.
export function keepAccents() {
  $$<HTMLElement>("[data-sc-kinetic]").forEach((el) => {
    const words = $$("em", el).flatMap((em) => (em.textContent || "").split(/\s+/).filter(Boolean));
    if (!words.length) return;
    const apply = () => {
      if (!el.classList.contains("sc-is-split")) return false;
      $$(".sc-split__i", el).forEach((u) => {
        if (words.includes((u.textContent || "").trim())) u.classList.add("accent");
      });
      return true;
    };
    if (apply()) return;
    const mo = new MutationObserver(() => apply() && mo.disconnect());
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  });
}
