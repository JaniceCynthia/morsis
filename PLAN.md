# Morsis: build plan

**Demo day: today, 2026-10-18.** Every phase below ends with a site that can be demoed, so stopping early still leaves something to show.

- What we're building and why: [TASKS.md](TASKS.md)
- Vocabulary: [CONTEXT.md](CONTEXT.md)
- Every asset with its prompt, cost and status: [docs/ASSETS.md](docs/ASSETS.md)
- Hard calls: [docs/adr/](docs/adr/)
- Concept being improved: [experiments/Morsis.html](experiments/Morsis.html) (stays untouched as the last-resort fallback demo)

---

## 1. Settled decisions

| # | Decision |
|---|---|
| Tone | **Precise and warm.** Field-science details (specs, citations, Confidence) delivered cinematically. |
| Audience | **Dreamers first**, with rigour a scientist would respect. |
| Personality line | *"Serious science. Inherently wondrous."* Tagline: *"Understanding the oldest conversation on Earth."* |
| Conversations | **Channel** (visitor ↔ one animal) **and Eavesdrop** (animal ↔ animal; the visitor can interject). Eavesdrop pairs must be animals that could really hear each other. |
| Species | All 6, two per Zone: raven and starling (Sky), elephant and prairie dog (Land), humpback and dolphin (Sea). **Hero species:** raven, elephant, humpback. |
| Spine | **The descent**: one continuous scroll-scrubbed camera move from 1,200 m up to 40 m under the sea. |
| Identity | Keep the lime-on-abyss palette. Swap the commercial fonts for open-licence ones. New SVG logo. Brand board page plus a Field kit strip on the landing page. |
| Stack | Vite + TypeScript, the scroll-craft engine (`public/vendor/scrollcraft.*`, unmodified), three.js, Tone.js. Gemini behind a `/api/decode` proxy. Hosted on Vercel, with a local `vite preview` fallback. |
| Demo conditions | Chrome on a laptop with unreliable Wi-Fi: preload everything, cache replies, scripted fallback. |
| Credits | **Quality first.** Tier 1 (first 100) gives a complete site. Tier 2 is polish after the top-up. Jonathan is told **before** a job that can't be afforded. |
| Video | Kling 3.0 Pro (1080p, sound off, start/end frames) for every chained clip. Seedance 2.5 only for the one hero loop and to test D1. |
| 3D | Higgsfield `meshy_v7_image_to_3d` from SPECIMEN references. The procedural concept animals are the fallback. **Demo-day change:** this replaces the Meshy free plan, which needs a new account and a separate pipeline. |
| FT-1 | Scroll-scrubbed teardown video plus a light procedural 3D model ([ADR 0002](docs/adr/0002-ft1-teardown-as-scrubbed-video.md)). |
| Voices | Per-species sample banks + Voiceprints, steered by Decode-3's Units and Contour ([ADR 0001](docs/adr/0001-animal-voices-from-sample-banks.md)). |
| LLM | `gemini-3.8-flash`, falling back to `gemini-3.5-flash-lite`, then scripted replies. JSON-schema output. One call per Eavesdrop Exchange. |
| Mobile | One set of 16:9 renders with the subject centred, cropped to portrait on phones. Separate mobile layout through the scroll-craft skill. Laptop first. |

## 2. The page, section by section

| # | Section | What the visitor experiences | Built from |
|---|---|---|---|
| 0 | **Calibration gate** | "Calibrating FT-1…" while the first descent frames and audio banks load, then **Begin with sound**. The click unlocks audio, which browsers require before playing sound. | Procedural spectrogram, LOGO |
| 1 | **Hero** | Drifting above the cloud sea (H-01, or a slow parallax of K1 in Tier 1), the wordmark, and the personality line. **Tap the bubble** to hear a scripted raven↔raven Eavesdrop straight away, so there's something to play with in under 20 seconds. | H-01/K1, A-raven, scripted Exchange |
| 2 | **Manifesto** | "The Magic Of" typographic moment, plus the 3 claims: every species already speaks, we build the models between us, under strict protocol. | Type, B-sky |
| 3 | **The descent** | Pinned canvas scrubbing D1→D5. HUD readout: altitude 1,200 m → −40 m, medium (air / soil / water), speed of sound. Zone A/B/C text panels. **Hotspots on the animals**: hover shows the species tag and plays a short call, click opens the Specimen atlas. Zone ambience crossfades as you pass. | K1–K6, D1–D5 frames, B-*, A-* |
| 4 | **Specimen atlas** | Full-screen 3D inspector: orbit, zoom, light toggle, key traits, habitat, a **Signal sample** played through the voice engine, and "Open a channel →". | M-* (or procedural), L-* header loops |
| 5 | **FT-1 teardown** | Scrolling scrubs V-FT1 from assembled to exploded. Layer labels 01 Listen · 02 Segment · 03 Map meaning · 04 Emit appear at fixed progress points. At the end: "Seven layers. Drag to turn it", using the rotatable procedural FT-1. | F-01/F-02, V-FT1, three.js FT-1 |
| 6 | **Console** | Tabs **Open a channel** / **Eavesdrop**. Species picker, suggested prompts, live spectrogram, Hearing shift dial, Transmit. Replies show the Signal description, Decoded reply, Confidence bar and Field note. A sticky "Open a channel" button is reachable from every section. | Voice engine, `/api/decode` |
| 7 | **Field kit** | A strip of 3 touchpoints in use (FT-1 case, buoy livery, field jacket) → "See the full identity" links to `brand.html`. | TP-01/02/03 |
| 8 | **Evidence** | The 6 cited findings plus stats (112k hours · 6 species · 14 Field stations). | Copy from the concept |
| 9 | **Footer** | Ethics statement ("We don't make collars, toys or pet apps"), contact, credits for any CC-BY models or fonts. | — |

**`brand.html` (deliverable 1, its own page, not part of the landing page):** logo and clear-space rules, palette tokens, type specimens, personality line, and all 6 touchpoints (TP-01…06) shown large.

## 3. Architecture

```
morsis/
├─ index.html                landing page
├─ brand.html                brand board
├─ api/decode.ts             Vercel function → server/decode.ts
├─ server/decode.ts          shared handler: prompt, Gemini call, fallback chain, cache, rate limit
├─ src/
│  ├─ main.ts                boot, calibration gate, Lenis + ScrollTrigger
│  ├─ styles/tokens.css      palette, type scale, spacing (concept tokens kept)
│  ├─ scroll/frames.ts       frame-sequence scrubber (canvas, progressive load)
│  ├─ sections/*.ts          one module per section in §2
│  ├─ three/specimen.ts      GLB viewer (Draco, PMREM environment light)
│  ├─ three/ft1.ts           procedural FT-1
│  ├─ audio/engine.ts        Tone.js graph, the single place sound is played
│  ├─ audio/species.ts       per-species recipe: bank, band, unit length, gap, glide/clicks/echo
│  ├─ audio/voiceprint.ts    Individual → pitch offset, filter tilt, vibrato
│  ├─ decode/client.ts       POST /api/decode, client cache, timeout → scripted
│  ├─ decode/species.ts      facts and suggested prompts per species (ported from the concept's `SP`)
│  └─ decode/scripted.ts     offline replies and Exchanges (ported from the concept's `SCRIPT`)
├─ public/assets/{frames,video,img,audio,models}/
├─ vite.config.ts            multi-page build + dev middleware mounting server/decode.ts at /api/decode
└─ .env.local                GEMINI_API_KEY (never committed)
```

**Fonts** (revised 2026-10-18): Neue Montreal for every fact, label and interface; PP Editorial New Italic on one or two alive words per line; Geist Mono only for live numbers.
**Palette** (revised 2026-10-18): Lab Paper `#F1F1EA`, Field Ink `#10110D` (the page base), Signal Lime `#D4F53F`, Olive `#5E7A1C` (Land), Forest `#13240F` (Sea).

### `/api/decode` contract

Request:
```json
{ "mode": "channel" | "eavesdrop",
  "species": "humpback",
  "individuals": ["humpback:A", "humpback:B"],
  "message": "Where are you travelling?",
  "topic": "krill to the south",
  "history": [{ "who": "researcher", "text": "…" }] }
```
Every Signal in a response has:
`{ signal, units (1–12), contour [6–9 numbers 0–1], durationSec, mood ("calm"|"curious"|"alarm"|"affiliative"), decoded, confidence (0.45–0.9) }`.

- **channel** returns one Signal plus a `note` (the Field note).
- **eavesdrop** returns `{ turns: [{ individual, …Signal }], note }` with 4–6 turns, all from **one** Gemini call.

The prompt is the concept's Decode-3 prompt, extended with `units`, `durationSec`, `mood` and the Eavesdrop variant. The Gemini response schema enforces the JSON shape.

**Fallback chain:** `gemini-3.8-flash` → on a 429 or 5xx, `gemini-3.5-flash-lite` → on failure or after 8 s, scripted reply. The response carries `source: "live" | "lite" | "scripted"` and the UI LED shows Live, Lite or Offline.

**Quota protection:**
- In-memory LRU cache keyed on normalised (mode, species, message).
- Per-IP limit of about 10 per minute.
- 600 ms client debounce.
- Client keeps replies in `localStorage`, so repeated demo prompts are instant.
- The suggested-prompt replies are pre-generated once and shipped as JSON, so the planned demo path never touches the API.

**Eavesdrop pairs:**
- humpback A ↔ B (song exchange)
- dolphin A ↔ B (signature-whistle naming)
- elephant matriarch ↔ calf (contact rumbles)
- prairie dog sentry ↔ colony (descriptive alarm)
- raven A ↔ B (recruitment to food)
- starling ↔ raven: the only cross-species pair. Birds really do react to other species' alarm calls, and the Field note cites that.

### Voice engine (per Signal)

1. A seed hashed from the reply text picks samples from the species bank, sets their order and jitters the grains, so the same reply sounds the same each time and different replies sound different.
2. `units` sets how many sample grains are chained. `durationSec` sets the total length. Gaps come from the species recipe.
3. `contour` drives pitch automation across the units (GrainPlayer `detune`, no change in speed).
4. `mood` shapes delivery: alarm is faster, higher and with more units; calm is slower with glides.
5. A synthesized layer per species sits on top:
   - raven: formant noise burst
   - starling: fast FM chirps
   - elephant: sub-bass rumble at about 20–35 Hz with an audible harmonic for laptop speakers
   - prairie dog: chained barks
   - humpback: FM moan plus long reverb
   - dolphin: whistle sweep plus click train
6. The Individual's Voiceprint applies its pitch offset (±3 semitones), filter tilt and vibrato.
7. The Hearing shift dial changes playback pitch by whole octaves. The spectrogram draws the real output.
8. The researcher's transmitted message goes through the same engine (the concept's `encode()`), so it sounds like that species' Units.

### Scroll scrubbing

- The scroll-craft engine scrubs `<video data-sc-scrub>` directly. D1–D5 are concatenated into one `descent.mp4` and encoded with the skill's `encode.sh` (dense GOP so seeking is instant), plus a 720p `-m` variant for phones. The FT-1 teardown is handled the same way as `ft1.mp4`.
- `public/assets/video/manifest.json` gives the segment boundaries, so the HUD zones and hotspots line up with the film.
- `prefers-reduced-motion` replaces the scrubbing with crossfaded keyframe stills.

## 4. Phases for today

Rough timeboxes. **A demo is possible after every phase.** Phases 1 and 2 run **in parallel**, ideally as two sessions. They share no files except `public/assets/`, which Phase 1 writes and Phase 2 only reads.

### Phase 0: Safety net and keys (20 min)
- [ ] **Jonathan:** create a free Gemini API key in Google AI Studio and put it in `.env.local` as `GEMINI_API_KEY`. Note the live free rate limits shown there.
- [ ] Open `experiments/Morsis.html` in the demo Chrome to confirm the scripted fallback works with no network. This is the last-resort demo.
- [ ] Add a `.gitignore` covering `.env*`, `node_modules` and `dist`, then make the first commit.
- **Demoable:** the concept page.

### Phase 1: Generate Tier 1 assets (≈45 min of attention; Higgsfield jobs run in the background)
Work strictly in [docs/ASSETS.md](docs/ASSETS.md) order, run `generate cost` before every job, and update its row as soon as the job finishes.
1. LOGO as SVG (Claude). It's needed as a reference image for the touchpoints.
2. T-01 and T-02 still tests → pick the winning models.
3. K1→K6, each one referencing the one before. Review them in a contact sheet before spending on video.
4. D1 → check its quality (Seedance 2.5 test only if it's poor) → D2–D5.
5. F-01 → F-02 → V-FT1.
6. S-* specimen references, A-* banks, B-* beds, TP-01…04 at draft quality.
7. ffmpeg: frame sequences, audio trimming and normalising, encoding.
- **Credits out?** Stop, tell Jonathan, continue with 🔁 Claude stand-ins (graded crops of existing keyframes, procedural audio, SVG compositions) and list each one under "Regenerate in Higgsfield".
- **Demoable:** concept page plus a contact sheet of the new assets.

### Phase 2: Scaffold and port (75 min)
- [ ] Vite multi-page project, `tokens.css`, fonts, Lenis + ScrollTrigger boot, calibration gate.
- [ ] Port each concept section into `src/sections/` with the new copy order from §2. Visuals are placeholders until the assets land.
- [ ] `server/decode.ts` plus the Vite dev middleware plus `api/decode.ts`, then test the full fallback chain (live, lite, scripted).
- [ ] Port `SP` and `SCRIPT`, extended with Eavesdrop Exchanges for the 6 pairs.
- **Demoable:** a new page with working Channel replies from Gemini and the concept's audio.

### Phase 3: Descent and FT-1 scrubbing (75 min)
- [ ] Frame scrubber, HUD (altitude, medium, speed of sound), Zone panels, crossfading ambience between zones.
- [ ] Animal hotspots placed at scroll progress points, each opening the atlas.
- [ ] FT-1 teardown scrub, layer labels, then hand-off to the rotatable procedural FT-1.
- **Demoable:** the cinematic page, start to finish.

### Phase 4: Voice engine, Channel and Eavesdrop (90 min)
- [ ] `audio/engine.ts`, the species recipes, Voiceprints, Hearing shift, live spectrogram.
- [ ] Console tabs, Eavesdrop playback (turns alternate with Voiceprints and staggered spectrogram traces), interjecting.
- [ ] Pre-generate the suggested-prompt replies into JSON.
- **Demoable:** the full interactive experience.

### Phase 5: Specimen atlas in 3D (45 min, Tier 2 credits)
- [ ] `meshy_v7_image_to_3d` for each S-* reference → gltf-transform compress → GLB viewer. Keep the procedural animal for any model that fails.
- **Demoable:** real 3D animals.

### Phase 6: Identity (45 min)
- [ ] `brand.html`: logo, palette, type, personality line, TP-01…06. Add the Field kit strip on the landing page and the OG image.
- [ ] Tier 2 upgrades (Nano Banana Pro touchpoints, L-* loops, H-01) if there are credits left.
- **Demoable:** all 3 TASKS.md deliverables.

### Phase 7: Deploy and demo hardening (30 min)
- [ ] **Jonathan:** run `pnpm dlx vercel login`. Then deploy with `GEMINI_API_KEY` as an environment variable. If the deploy can't happen, demo from `pnpm run build && pnpm run preview` on the laptop.
- [ ] Run Lighthouse and check the frame-load budget. Demo-run with Wi-Fi off to confirm the scripted fallback. Check reduced motion and the mobile layout.
- [ ] Write a 90-second demo script in `docs/DEMO.md`: hero bubble → descent → click the humpback → atlas → Open a channel → Eavesdrop on the two humpbacks → FT-1 → brand board.
- [ ] Final credibility pass with the TASKS.md demo-day checklist.

### If time runs short, cut in this order
1. Tier 2 loops and the hero loop (keep the K1 parallax).
2. Interjecting in Eavesdrop (keep pre-written Exchanges for the 6 pairs).
3. 3D animals in the Specimen atlas (keep the procedural ones).
4. Mobile layout polish.
5. The descent cut to 3 clips (D1, D3, D5) with crossfades.

**Never cut:** Channel with the fallback chain, distinct species voices, `brand.html` with 5+ touchpoints, the ethics footer.

## 5. Execution

Three sessions, each owning its own files:

| Session | Model | Owns | Files it may touch |
|---|---|---|---|
| **Build** (main) | Opus 5.5 | Phases 0, 2, 3, 4, 7, and the 3D viewer code for Phase 5 | Everything except the paths the other two own. It is the only session that commits. |
| **Assets** | Opus 5.5 | Phase 1, Tier 2 assets, generating the Phase 5 GLBs | `public/assets/**`, `docs/ASSETS.md`, its own scratch directory. Works in the shared checkout with no worktree and makes no commits. |
| **Brand** (starts after LOGO, tokens and TP-01…04 exist) | Sonnet 5.5 | Phase 6, `brand.html` | `brand.html`, `src/brand/**` |

- **Only the Assets session spends Higgsfield credits.** It keeps the one ledger and sends the one "credits are out" message to Jonathan.
- **Handoff:** once K1–K6 and D1 are approved, Assets messages Build so the descent frames can be wired in, then it continues down the manifest.
- **Subagents** run on cheaper models and only for read-only checks: scroll-craft engine conventions, Lighthouse and accessibility passes.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Free Gemini limits are unpublished and may be low | Cache, pre-generated replies for suggested prompts, Flash-Lite fallback, scripted fallback, LED shows which source answered. |
| Higgsfield queue times on video | Start Phase 1 first. Video jobs run while Phase 2 is coded. |
| Keyframes don't match each other | Each keyframe uses the previous one as a reference. Check the contact sheet before spending on video. |
| AI 3D generators mangle animals with legs and feathers | Image-to-3D from clean SPECIMEN references. Procedural or CC-BY Sketchfab fallback. |
| Browser autoplay policy blocks audio | The calibration gate's "Begin with sound" click unlocks the audio context. |
| Frame sequences are heavy | 15 fps, WebP, two sizes, progressive loading, preloading during the gate. |
| Anything reads as a pet gadget | Credibility gate on every asset. Researcher tool framing. Ethics footer. |
| Licensing | Open-licence fonts, credits for CC-BY models, generated media from our own account. |

## 7. Actions only Jonathan can take
- Create the Gemini API key (Phase 0).
- Top up Higgsfield when told the balance can't cover the next job (Phase 1 and later).
- `pnpm dlx vercel login` (Phase 7), or decide to demo locally.
- Tell us the demo time, so the cut lines can be applied early if needed.
