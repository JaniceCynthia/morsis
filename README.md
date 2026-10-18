# Morsis

*Understanding the oldest conversation on Earth.*

Morsis is a fictional interspecies signal research lab. This repo holds its public identity: a single scroll-driven landing page. It was built for Wonderbuilds26, Track 1 (brief in [TASKS.md](TASKS.md)).

The page descends from 1,200 m above a cloud sea to 40 m under the ocean, through three habitats (Sky, Land and Sea) and six species. Along the way you can inspect each animal in 3D, take apart the FT-1 field transmitter, and open a channel to talk to an animal. **Decode-3**, the lab's translation model, answers in that species' own voice.

## Quick start

You need Node 20.19+ or 22.12+ and pnpm 9 (`corepack enable` installs the version pinned in `package.json`).

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:5173. Click **Begin with sound** on the calibration gate, since browsers only allow audio after a click.

### Live replies (optional)

The console works offline with scripted replies. For live Decode-3 replies, add a free Gemini key from [Google AI Studio](https://aistudio.google.com/apikey):

```bash
cp .env.example .env.local
```

Then set `GEMINI_API_KEY` in `.env.local`. The key is read only on the server and never bundled into the page. `.env*` files are gitignored, except `.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | none | Turns on live replies. Without it, every reply is scripted. |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Primary model |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | Used when the primary model fails or times out |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server, with `/api/decode` mounted as middleware |
| `pnpm build` | Type-check, then build `index.html` into `dist/` |
| `pnpm preview` | Serve the production build locally, including `/api/decode` |
| `pnpm typecheck` | `tsc --noEmit` |

## What's on the page

1. **Calibration gate:** loads the first frames and sound banks, then unlocks audio.
2. **Hero:** a Lab Paper plaster wall. A carving of ravens, a starling murmuration and clouds rises wherever the pointer passes, holds, then sinks back (a ghost pointer drifts on touch screens). Tap the bubble to hear a raven-to-raven exchange.
3. **Manifesto:** the lab's three claims.
4. **The descent:** a scroll-scrubbed camera move through Sky, Land and Sea, with a live altitude, medium and speed-of-sound readout. Hotspots on the animals open the atlas.
5. **Specimen atlas:** six species. **Inspect in 3D** opens a GLB viewer (drag to rotate, scroll to zoom), and **Hear it** plays a signal sample.
6. **FT-1 teardown:** a real-time 3D model of the field transmitter. Scrolling opens it one Layer at a time (Listen, Segment, Map meaning, Emit) and names each part. See [ADR 0003](docs/adr/0003-ft1-as-realtime-exploded-model.md).
7. **Console:** *Open a channel* (you and one animal) or *Eavesdrop* (two animals, and you can interject). Each reply comes with a spectrogram, a decoded English hypothesis, a confidence score and a cited field note.
8. **Evidence:** the published findings the lab builds on.

## How it works

```
index.html                 the page
src/
  main.ts                  boot: mounts the scroll-craft engine and wires each section
  sections/                one module per page section; specimen-viewer.ts is the three.js GLB viewer,
                           ft1/ the FT-1 teardown, relief.ts the hero's WebGL plaster wall, stack.ts the section slide-over
  audio/                   Tone.js voice engine and per-species sound recipes
  decode/                  API client, species facts, scripted offline replies
  styles/main.css          page styles on top of the scroll-craft tokens
server/decode.ts           Decode-3: prompts, Gemini call, fallback chain, cache, rate limit
api/decode.ts              Vercel function wrapping server/decode.ts
vite.config.ts             mounts server/decode.ts at /api/decode for dev and preview
public/vendor/             scroll-craft engine (kept unmodified) and the Draco decoder
public/assets/             images, video, audio banks, GLB models
assets-src/                sources and scripts the public assets are built from (ft1/rebrand.py, brand/compose.py)
experiments/               the original concept, kept as a fallback demo
```

**Decode-3 fallback chain.** Each request tries `GEMINI_MODEL`, then `GEMINI_FALLBACK_MODEL`, then a scripted reply. Each model call times out after 8 s. With no key set, requests skip straight to the scripted reply. The response says which one answered (`source: "live" | "lite" | "scripted"`), and the console's status light shows it. Replies are cached on the server, and requests are rate-limited per IP. The JSON contract is in [PLAN.md §3](PLAN.md#apidecode-contract).

**Voices.** Animal replies aren't text-to-speech. The voice engine chains samples from each species' sound bank, shaped by the reply's units, pitch contour and mood. Each individual animal gets its own fixed voiceprint, so two humpbacks sound different. See [ADR 0001](docs/adr/0001-animal-voices-from-sample-banks.md).

## Deploying

The repo deploys to Vercel as is: Vite builds the static pages, and `api/decode.ts` becomes the serverless function. Set `GEMINI_API_KEY` in the project's environment variables. To demo without Vercel, use `pnpm build && pnpm preview`, which serves the same API locally.

## Docs

- [TASKS.md](TASKS.md): the brief and deliverables
- [PLAN.md](PLAN.md): build plan, section-by-section design and API contract
- [CONTEXT.md](CONTEXT.md): vocabulary (Channel, Eavesdrop, Voiceprint, Zone and others)
- [docs/ASSETS.md](docs/ASSETS.md): every generated asset with its prompt and status
- [docs/adr/](docs/adr/): architecture decisions

## Credits

The FT-1 shell is built on [“Grundig Radio FR-250”](https://sketchfab.com/3d-models/grundig-radio-fr-250-free-am-fm-sw-a8d7fe770fcf40ba8e257f5c73d2d55b) by [Gher](https://sketchfab.com/Gher), licensed [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Its third-party marks were painted out and replaced with Morsis decals (`assets-src/ft1/rebrand.py`); the internal parts are modelled in code. Typefaces: Neue Montreal and PP Editorial New (Pangram Pangram), supplied by the brand.
