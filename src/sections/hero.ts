// Hero: the carved plaster wall, and the bubble that plays the first
// intercepted exchange instantly (scripted, so it never waits).
import { speak, isReady } from "../audio/engine";
import { EXCHANGES } from "../decode/scripted";
import { PAIRS } from "../decode/species";
import { $, esc, sleep } from "./dom";
import { initRelief } from "./relief";

export function initHero() {
  initRelief($(".hero"), $<HTMLCanvasElement>("#relief"));
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
