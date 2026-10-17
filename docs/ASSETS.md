# Morsis asset manifest

Every generated asset, which tool made it, its prompt seed, what it costs and where it stands. Update this file **as each job finishes**. Terms follow [CONTEXT.md](../CONTEXT.md).

**Status key:** ⬜ planned · 🟨 generating · ✅ done (Higgsfield) · 🔁 **made with Claude because credits ran out, regenerate in Higgsfield** · ❌ cut

**Tier 1** builds a complete demo inside the first 100 credits. **Tier 2** is polish paid for by the Plus top-up. Before every job, run `higgsfield generate cost …` and compare the estimate with `higgsfield account status`. If the balance can't cover the next job: **stop, tell Jonathan, and use the Claude fallback in the meantime (🔁).**

## Credit ledger

| Bucket | Tier | Est. credits |
|---|---|---|
| Still-image model test (T-*) | 1 | 5 |
| Descent keyframes K1–K6 | 1 | 12 |
| Descent clips D1–D5 | 1 | 43.75 |
| FT-1 stills F-01/F-02 + teardown clip V-FT1 | 1 | 21.5 |
| Specimen reference stills S-* | 1 | 1.5 |
| Touchpoints TP-* (draft quality) | 1 | 1.5 |
| Species base calls A-* + zone ambience beds B-* | 1 | ~10 |
| **Tier 1 total** | | **~95 / 100** |
| Specimen 3D models M-* (Meshy 7 via Higgsfield, cost checked per job) | 2 | ~30–45 |
| Touchpoint upgrades TP-* at Nano Banana Pro | 2 | 12 |
| Hero species loops L-* | 2 | 26.25 |
| Hero loop H-01 (Seedance 2.5) | 2 | 35 |
| Habitat cards P-*, score M-01, retries | 2 | ~25 |

Tier 2 is spent in the order listed. The 3D models come first because the Specimen atlas is the weakest part of the concept.

## Style keys (prepended to every prompt in that family)

- **FIELD** (descent, species, habitats): *Natural-history documentary frame, ARRI Alexa 35 with anamorphic lens, soft blue-hour or overcast light, deep blacks, desaturated greens and blues, fine film grain, quiet and vast. No text, no logos, no visible human faces. 16:9, main subject centred in the middle third so a portrait crop still works.*
- **INSTRUMENT** (FT-1, Field kit): *Industrial-design product photograph of a scientific field instrument, matte graphite anodised aluminium and charcoal rubber, one acid-lime (#D4F53F) accent, soft key light, seamless near-black (#050A06) background, restrained like lab equipment, never a consumer gadget or toy.*
- **SPECIMEN** (3D references): *A single {animal}, full body, three-quarter side view, anatomically accurate, neutral mid-grey seamless background, flat even studio light, no cast shadow, whole body in frame, no props.*
- **Continuity rule:** generate each keyframe K2–K6 with the previous keyframe as a reference image so palette and grade carry through the cut-free descent.
- **Credibility gate:** reject any asset that reads as a pet gadget, toy, collar, cartoon or joke.

## Status: Higgsfield CLI blocked (2026-10-18, 08:30)

Every `higgsfield generate create` call (tried gpt_image_2_5, nano_banana_pro, soul_location, z_image, seed_audio) fails with `{"error_type":"only_website_usage_on_trial_is_available"}`. `higgsfield account status` shows the Plus plan with 100 credits, but the account is still treated as a **trial**, and a trial can only generate on the higgsfield.ai website. **0 credits spent.** Jonathan needs to end the trial on higgsfield.ai (start the paid Plus plan). After that, the CLI pipeline restarts at T-01 with no other changes. Other notes from the cost checks: `soul_location` costs 0.12 per image; `gpt_image_2_5` costs 1 at medium/2k and 2.75 at high/2k; `nano_banana_pro` costs 2 at 2k.

## Tests

| ID | What | Model(s) | Credits | Status |
|---|---|---|---|---|
| T-01 | K1 prompt rendered three ways | gpt_image_2_5 · nano_banana_pro · Soul Location | ~3 | ⬜ |
| T-02 | Raven SPECIMEN prompt rendered two ways | gpt_image_2_5 · nano_banana_pro | ~2.25 | ⬜ |

The winning model becomes the default for that family. Record which won here.

## The descent (Tier 1)

| ID | Moment | Prompt seed (FIELD +) | Model | Credits | Status |
|---|---|---|---|---|---|
| K1 | 1,200 m: above a sea of cloud at dawn, two ravens gliding | camera high above cloud tops, first light, two ravens in silhouette | test winner | 2 | ⬜ |
| K2 | Through the cloud base into forest canopy, a starling murmuration | breaking under clouds, murmuration over misty temperate forest | test winner | 2 | ⬜ |
| K3 | Ground level, savanna at dusk, elephant family | low over dry grass, elephant matriarch and calf, dust in low sun | test winner | 2 | ⬜ |
| K4 | Grassland burrows, prairie dog sentry, horizon opens toward a coastline | sentry prairie dog upright at its burrow, wide plains running to a distant sea | test winner | 2 | ⬜ |
| K5 | Over/under split at the waterline, a Morsis hydrophone buoy | half above, half below the surface, graphite buoy with a lime band, humpback shape below | test winner | 2 | ⬜ |
| K6 | 40 m down, blue twilight, dolphins and a humpback | deep blue water column, god-rays, bottlenose pod, distant humpback | test winner | 2 | ⬜ |
| D1–D5 | Kn → Kn+1, one continuous downward crane move, no cuts | *"Seamless continuous camera descent from the first frame to the last frame, slow and steady, no cut, documentary realism"* | `kling3_0 --mode pro --sound off --duration 5`, start/end images | 8.75 each | ⬜ |

**Post-processing (changed 2026-10-18 at Build's request: the scroll-craft engine scrubs a `<video>` directly, so there are no WebP frame sequences):**
1. Keep the raw clips as `public/assets/video/D1.mp4` … `D5.mp4` and `V-FT1.mp4`.
2. Concatenate D1–D5 in order into `scratchpad/descent-raw.mp4`.
3. Encode for scrubbing from the project root:
   - `bash ~/.claude/skills/scroll-craft/scripts/encode.sh <raw> public/assets/video/descent.mp4`
   - the same with `mobile` → `descent-m.mp4`
   - add CRF 22 as the 4th argument if the clips are grainy
   - the FT-1 teardown gets the same treatment → `ft1.mp4` / `ft1-m.mp4`
4. Posters (first frame): `public/assets/img/posters/{descent,ft1}.webp`.
5. Write `public/assets/video/manifest.json`: `{ "descent": { "segments": [{ "id": "D1", "start": 0, "end": 5.0 }, …], "duration": N }, "ft1": { "duration": N } }`.
6. Message Build once `descent.mp4` exists. If D1 at Kling Pro isn't good enough, re-render D1 only on `seedance_2_5 --mode omni_reference --resolution 720p` (35) and compare before switching models.

## FT-1 (Tier 1)

| ID | What | Prompt seed (INSTRUMENT +) | Model | Credits | Status |
|---|---|---|---|---|---|
| F-01 | FT-1 assembled, hero angle | handheld field transmitter: transducer head, control face with small display, signal scale, 3/4 view | test winner | 2 | ⬜ |
| F-02 | Same angle, exploded into 7 layers along one axis | same object exploded: housing, battery, DSP board, Decode-3 core, transducers, signal scale, control face (made by editing F-01) | test winner (edit mode, F-01 as reference) | 2 | ⬜ |
| V-FT1 | F-01 → F-02 teardown | *"parts separate smoothly along one axis, camera locked, product-film lighting"* | `kling3_0 --mode pro --sound off --duration 10` | 17.5 | ⬜ |

## Species (Tier 1 references, Tier 2 3D and loops)

| Species | Reference S-* (SPECIMEN) | 3D M-* (Tier 2) | Loop L-* (Tier 2, hero species only) |
|---|---|---|---|
| Raven | S-raven ⬜ 0.25 | M-raven ⬜ | L-raven ⬜ 8.75 |
| Starling | S-starling ⬜ 0.25 | M-starling ⬜ | — |
| Elephant | S-elephant ⬜ 0.25 | M-elephant ⬜ | L-elephant ⬜ 8.75 |
| Prairie dog | S-prairie ⬜ 0.25 | M-prairie ⬜ | — |
| Humpback whale | S-humpback ⬜ 0.25 | M-humpback ⬜ | L-humpback ⬜ 8.75 |
| Bottlenose dolphin | S-dolphin ⬜ 0.25 | M-dolphin ⬜ | — |

- **3D:** run `meshy_v7_image_to_3d` with the S-* image, `enable_pbr=true`, `target_polycount` about 30k, as GLB. Then compress with gltf-transform (Draco + WebP textures, under 3 MB each). **Tier 1 fallback:** the concept's procedural three.js animals. Any bad output is replaced with a CC-BY Sketchfab model, credited in the footer.
- **Loops:** Kling 3.0 Pro with the same image as start and end frame so they loop seamlessly. They appear in the Specimen atlas header and the zone panels.

## Audio (Tier 1). See [ADR 0001](adr/0001-animal-voices-from-sample-banks.md)

| ID | What | Model | Credits | Status |
|---|---|---|---|---|
| A-raven-1…5 | Dry close calls: knock, kraa, rattle, recruitment yell, soft contact | Seed Audio 1.0 (Mirelo SFX if poor) | 0.2–1.25 each | ⬜ |
| A-starling-1…5 | Whistles, clicks, warble, mimic fragment, chatter | same | | ⬜ |
| A-elephant-1…5 | Rumble (recorded audible), trumpet, contact rumble, roar, ear-flap/breath | same | | ⬜ |
| A-prairie-1…5 | Short alarm chirps at varied pitch, jump-yip, chatter | same | | ⬜ |
| A-humpback-1…5 | Moan, upsweep, grunt, cry, song phrase fragment | same | | ⬜ |
| A-dolphin-1…5 | Signature whistle up, down, warble, click train, burst pulse | same | | ⬜ |
| B-sky / B-land / B-sea | 20 s loopable zone ambience beds (wind and high air · grass, insects, distant herd · underwater pressure and shipping hum) | Mirelo SFX / Sonilo | 1.25 each | ⬜ |
| M-01 (Tier 2) | 20 s ambient score bed, sparse and wondrous, loopable | Sonilo Music | 1.25 | ⬜ |

Every sample: mono, trimmed, normalised to −1 dBFS peak, exported as `.webm` (Opus) with an `.mp3` fallback, in `public/assets/audio/{species}/`. UI sounds (transmit, receive, decode tick) are synthesized with Tone.js and cost nothing.

## Identity and Field kit

| ID | What | Tool | Credits | Status |
|---|---|---|---|---|
| LOGO | Morsis wordmark plus a mark where a waveform resolves into a glyph. SVG, with light and dark versions | **Claude (SVG, vector by design, not a fallback)** | 0 | ✅ In `public/assets/brand/`: `logo.svg` (for light backgrounds: forest mark, abyss wordmark), `logo-dark.svg` (for dark backgrounds: lime mark, paper wordmark), `mark.svg` (lime), `mark-ink.svg` (forest), `mark-1024.png` (lime on abyss, the reference image for TP-*), `logo-2048.png`, `logo-dark-2048.png`. The wordmark is Instrument Serif converted to outlines, so no font is needed. The mark is three smooth humps of signal swelling along the baseline that resolve into a crisp M, cut flat at the cap line and baseline like type. |
| TP-01 | FT-1 hard-shell field case (packaging) | INSTRUMENT, LOGO as reference | 0.25 → 2 | ⬜ |
| TP-02 | Field jacket / lab coat with chest mark | INSTRUMENT lighting, on a hanger, no face | 0.25 → 2 | ⬜ |
| TP-03 | Hydrophone buoy livery at sea (can reuse the K5 buoy) | FIELD | 0.25 → 2 | ⬜ |
| TP-04 | Field-station ID badge on a lanyard | INSTRUMENT | 0.25 → 2 | ⬜ |
| TP-05 | Field Console app icon (1024 px) | **Claude SVG**, Higgsfield render optional | 0 | ⬜ |
| TP-06 | Social post: "Decoded today", spectrogram plus quote card | **Claude HTML/SVG** composited over a FIELD still | 0 | ⬜ |
| OG-01 | Open Graph share image 1200×630 | Claude composite | 0 | ⬜ |
| H-01 (Tier 2) | Hero loop: slow drift above the cloud sea, ravens crossing (start = end frame K1) | `seedance_2_5 --mode omni_reference --resolution 720p --duration 5` | 35 | ⬜ |
| P-* (Tier 2) | Six habitat cards for zone panels (otherwise cropped from keyframes) | test winner | 2 each | ⬜ |

## Regenerate in Higgsfield (filled in when credits run out)

_Nothing yet._ When a 🔁 asset is made, add a row here: ID, what the Claude stand-in is, the exact Higgsfield command to run, and its estimated credits.
