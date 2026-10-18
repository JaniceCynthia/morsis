// Specimen atlas: the pan rail of six species and the 3D inspector dialog.
// three.js is loaded only when the inspector first opens.
import { speak, isReady } from "../audio/engine";
import { scriptedReply } from "../decode/scripted";
import { ORDER, SPECIES, type SpeciesKey } from "../decode/species";
import { $, esc } from "./dom";

const img = (k: SpeciesKey) => `/assets/img/specimens/S-${k}.webp`;
const glb = (k: SpeciesKey) => `/assets/models/${k}.glb`;
const habitat = (k: SpeciesKey) => `/assets/img/habitats/P-${k}.webp`;
/** Every card plays a seamless 5 s field loop, made from its habitat plate (first
 *  frame = last frame), so the card still is that plate at card size. */
const still = (k: SpeciesKey) => `/assets/img/cards/C-${k}.webp`;
const loop = (k: SpeciesKey) => `/assets/video/L-${k}.mp4`;

/** Card dressing: one trait chip, and the tint the photo blurs into behind the
 *  text, picked from what is at the bottom of each card's still or field loop. */
const CARD: Record<SpeciesKey, { chip: string; tint: string }> = {
  raven: { chip: "Recruitment calls", tint: "#1E2730" },
  starling: { chip: "Mimicry", tint: "#232E33" },
  elephant: { chip: "Infrasound", tint: "#3B2D22" },
  prairie: { chip: "Descriptive alarms", tint: "#3A3228" },
  humpback: { chip: "Song", tint: "#0F2430" },
  dolphin: { chip: "Signature whistle", tint: "#0F2532" },
};

export function renderAtlas() {
  const rail = $("#rail");
  rail.insertAdjacentHTML(
    "beforeend",
    ORDER.map((k) => {
      const s = SPECIES[k];
      const c = CARD[k];
      return `<article class="specimen" data-species="${k}" style="--tint: ${c.tint}">
        <div class="specimen__card" data-sc-tilt="4">
          <div class="specimen__media">
            <span class="specimen__ph" aria-hidden="true">${esc(s.short[0])}</span>
            <img src="${still(k)}" width="1280" height="724" alt="${esc(s.name)} in its habitat" loading="lazy" data-optional>
            <video class="specimen__loop" muted loop playsinline preload="none" data-src="${loop(k)}" aria-hidden="true"></video>
          </div>
          <button class="specimen__hear" type="button" data-hear="${k}" aria-label="Hear the ${esc(s.short)}">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          </button>
          <div class="specimen__glass">
            <ul class="specimen__chips" aria-label="Zone and signal">
              <li>${s.zone}</li><li>${esc(c.chip)}</li>
            </ul>
            <h3>${esc(s.name)}</h3>
            <p class="latin">${esc(s.latin)}</p>
            <p class="specimen__line">${esc(s.line)}</p>
            <button class="btn specimen__inspect" type="button" data-inspect="${k}">Inspect in 3D</button>
          </div>
        </div>
      </article>`;
    }).join(""),
  );
  rail.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const ins = t.closest<HTMLElement>("[data-inspect]");
    const hear = t.closest<HTMLElement>("[data-hear]");
    if (ins) openInspector(ins.dataset.inspect as SpeciesKey);
    if (hear) sample(hear.dataset.hear as SpeciesKey);
  });
  focusRail(rail);
  rail.querySelectorAll<HTMLImageElement>("img[data-optional]").forEach((i) =>
    i.addEventListener("load", () => i.previousElementSibling?.remove(), { once: true }),
  );
  // Field loops play only while their card is on screen; the still holds otherwise.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src!;
        v.play().then(() => v.classList.add("is-playing")).catch(() => undefined);
      } else v.pause();
    }
  }, { threshold: 0.35 });
  rail.querySelectorAll<HTMLVideoElement>(".specimen__loop").forEach((v) => io.observe(v));
}

// As the rail pans, the card passing the middle of the screen swells and its
// neighbours settle back, so there is always one specimen in focus. The scale
// rides on the article; the card inside keeps its pointer tilt.
function focusRail(rail: HTMLElement) {
  const cards = [...rail.querySelectorAll<HTMLElement>(".specimen")];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let on = false;
  const frame = () => {
    if (!on) return;
    requestAnimationFrame(frame);
    const mid = innerWidth / 2;
    // How far a card centre can be from the middle before it is fully "away".
    const reach = Math.max(260, innerWidth * 0.32);
    for (const c of cards) {
      // The scale is centred, so it never moves a card's centre: no feedback.
      const r = c.getBoundingClientRect();
      const centre = r.left + r.width / 2;
      const t = Math.min(1, Math.abs(centre - mid) / reach);
      const focus = 1 - t * t * (3 - 2 * t);
      c.style.setProperty("--focus", focus.toFixed(3));
    }
  };
  new IntersectionObserver(([e]) => {
    const was = on;
    on = e.isIntersecting;
    if (on && !was) requestAnimationFrame(frame);
  }).observe(rail);
}

function sample(k: SpeciesKey) {
  if (!isReady()) return;
  speak(k, scriptedReply(k));
}

// ---- inspector --------------------------------------------------------------

let current: SpeciesKey = "humpback";
let viewer: Promise<Viewer | null> | null = null;

export function initInspector() {
  const dlg = $<HTMLDialogElement>("#inspector");
  $("#insp-close").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener("close", () => viewer?.then((v) => v?.pause()));
  $("#insp-play").addEventListener("click", () => sample(current));
  $("#insp-open").addEventListener("click", () => {
    dlg.close();
    document.dispatchEvent(new CustomEvent("morsis:channel", { detail: { species: current } }));
  });
}

export async function openInspector(k: SpeciesKey) {
  current = k;
  const s = SPECIES[k];
  const dlg = $<HTMLDialogElement>("#inspector");
  $("#insp-zone").textContent = `Zone · ${s.zone}`;
  $("#insp-name").textContent = s.name;
  $("#insp-latin").textContent = s.latin;
  $("#insp-line").textContent = s.line;
  $("#insp-traits").innerHTML = s.traits.map((t) => `<li>${esc(t)}</li>`).join("");
  const still = $<HTMLImageElement>("#insp-img");
  const cv = $<HTMLCanvasElement>("#insp-gl");
  $(".inspector__view").style.setProperty("--habitat", `url("${habitat(k)}")`);
  dlg.showModal();

  const has3d = await exists(glb(k));
  if (!has3d) {
    // No scan yet: show the reference plate instead of an empty canvas.
    cv.hidden = true;
    still.hidden = false;
    still.src = img(k);
    still.alt = `${s.name}, reference plate`;
    $(".inspector__hint").textContent = "3D scan in progress";
    return;
  }
  still.hidden = true;
  cv.hidden = false;
  $(".inspector__hint").textContent = "Drag to rotate · scroll to zoom";
  viewer ??= import("./specimen-viewer").then((m) => m.createViewer(cv)).catch(() => null);
  const v = await viewer;
  v?.show(glb(k));
}

async function exists(url: string) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const type = r.headers.get("content-type") || "";
    return r.ok && !type.includes("text/html");
  } catch {
    return false;
  }
}

export interface Viewer {
  show(url: string): Promise<void>;
  pause(): void;
}
