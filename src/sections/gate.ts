// Calibration gate: preloads the first frames and field recordings, then
// unlocks audio inside the visitor's click (browsers require a gesture).
import { loadAmbience, loadBank, loadScore, startScore, unlock } from "../audio/engine";
import { ORDER } from "../decode/species";
import { $ } from "./dom";

const PRELOAD_IMAGES = ["/assets/img/hero/relief-1440.webp", "/assets/img/posters/descent.webp"];

export function initGate() {
  const gate = $("#gate");
  const bar = $("#gate-bar");
  const status = $("#gate-status");
  const btnSound = $<HTMLButtonElement>("#gate-sound");
  const btnQuiet = $<HTMLButtonElement>("#gate-quiet");
  document.documentElement.style.overflow = "hidden";

  let done = 0;
  const total = PRELOAD_IMAGES.length + 1;
  const tick = (msg?: string) => {
    done++;
    bar.style.setProperty("--p", String(Math.min(1, done / total)));
    if (msg) status.textContent = msg;
  };

  PRELOAD_IMAGES.forEach((src) => {
    const i = new Image();
    i.onload = i.onerror = () => tick();
    i.src = src;
  });
  // Decoded audio needs an AudioContext, which exists before the gesture in a
  // suspended state; decoding is allowed, playback is not.
  const audioReady = Promise.all([...ORDER.map((k) => loadBank(k)), loadAmbience(), loadScore()])
    .catch(() => undefined)
    .then(() => tick("Field recordings ready"));

  // Never trap the visitor behind a slow network: the buttons work at once.
  const enter = async (withSound: boolean) => {
    btnSound.disabled = btnQuiet.disabled = true;
    await unlock(withSound);
    gate.classList.add("is-done");
    document.documentElement.style.overflow = "";
    document.dispatchEvent(new CustomEvent("morsis:enter", { detail: { withSound } }));
    audioReady.then(() => {
      startScore();
      document.dispatchEvent(new CustomEvent("morsis:audio"));
    });
    setTimeout(() => gate.remove(), 700);
  };
  btnSound.addEventListener("click", () => enter(true));
  btnQuiet.addEventListener("click", () => enter(false));
  btnSound.focus();
  // Dev only: ?nogate skips straight in, muted, for scripted visual checks.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("nogate")) {
    gate.classList.add("is-done");
    document.documentElement.style.overflow = "";
    document.dispatchEvent(new CustomEvent("morsis:enter", { detail: { withSound: false } }));
    gate.remove();
  }
}
