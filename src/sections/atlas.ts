// Specimen atlas: the pan rail of six species and the 3D inspector dialog.
// three.js is loaded only when the inspector first opens.
import { speak, isReady } from "../audio/engine";
import { scriptedReply } from "../decode/scripted";
import { ORDER, SPECIES, type SpeciesKey } from "../decode/species";
import { $, esc } from "./dom";

const img = (k: SpeciesKey) => `/assets/img/specimens/S-${k}.webp`;
const glb = (k: SpeciesKey) => `/assets/models/${k}.glb`;
const habitat = (k: SpeciesKey) => `/assets/img/habitats/P-${k}.webp`;
/** Hero species have a seamless 5 s field loop. */
const LOOPS: Partial<Record<SpeciesKey, string>> = {
  raven: "/assets/video/L-raven.mp4",
  elephant: "/assets/video/L-elephant.mp4",
  humpback: "/assets/video/L-humpback.mp4",
};

export function renderAtlas() {
  const rail = $("#rail");
  rail.insertAdjacentHTML(
    "beforeend",
    ORDER.map((k) => {
      const s = SPECIES[k];
      return `<article class="specimen" data-species="${k}">
        <div class="specimen__media" data-sc-tilt="5">
          <span class="specimen__ph" aria-hidden="true">${esc(s.short[0])}</span>
          <img src="${img(k)}" width="800" height="1000" alt="${esc(s.name)}, full body" loading="lazy" data-optional>
          ${LOOPS[k] ? `<video class="specimen__loop" muted loop playsinline preload="none" data-src="${LOOPS[k]}" aria-hidden="true"></video>` : ""}
          <span class="label specimen__zone">${s.zone}</span>
        </div>
        <h3>${esc(s.name)}</h3>
        <p class="latin">${esc(s.latin)}</p>
        <p class="body">${esc(s.line)}</p>
        <div class="specimen__actions">
          <button class="btn btn--ghost btn--sm" type="button" data-inspect="${k}">Inspect in 3D</button>
          <button class="btn btn--ghost btn--sm" type="button" data-hear="${k}" aria-label="Hear the ${esc(s.short)}">Hear it</button>
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
