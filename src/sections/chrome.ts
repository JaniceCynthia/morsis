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
}
