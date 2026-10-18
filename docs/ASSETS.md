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

**Actual spend (2026-10-18, from `higgsfield account transactions`).** The plan became 1,200 credits after the trial ended, so quality settings were used throughout.

| Model | Used for | Credits |
|---|---|---|
| GPT Image 2.5 (high/2k, plus one medium) | T-01/T-02, K1–K6, S-*, F-01/F-02, TP-01–04, P-* | 67.00 |
| Nano Banana Pro · Soul Location | T-01/T-02 tests | 4.12 |
| Kling 3.0 Pro | D1–D5 first pass, D4 re-roll, V-FT1, L-* | 96.25 |
| Seedance 2.5 1080p | D1, D2, D3, D4 re-rolls, H-01 (one failed D4 job refunded) | 400.00 |
| Seed Audio 1.0 | A-* (30 calls + 4 re-rolls + 1 test) | 50.30 |
| Mirelo SFX | B-* (3 × 22 s) + 1 test | 17.25 |
| Sonilo Music | M-01 | 1.38 |
| Meshy 7 | M-* (6 × 38) | 228.00 |
| Tripo H3.1 | 3D model test (raven) | 18.00 |
| **Total** | | **882.30, leaving 317.70** |

Tier 2 is spent in the order listed. The 3D models come first because the Specimen atlas is the weakest part of the concept.

## Style keys (prepended to every prompt in that family)

- **FIELD** (descent, species, habitats): *Natural-history documentary frame, ARRI Alexa 35 with anamorphic lens, soft blue-hour or overcast light, deep blacks, desaturated greens and blues, fine film grain, quiet and vast. No text, no logos, no visible human faces. 16:9, main subject centred in the middle third so a portrait crop still works.*
- **INSTRUMENT** (FT-1, Field kit): *Industrial-design product photograph of a scientific field instrument, matte graphite anodised aluminium and charcoal rubber, one acid-lime (#D4F53F) accent, soft key light, seamless near-black (#050A06) background, restrained like lab equipment, never a consumer gadget or toy.*
- **SPECIMEN** (3D references): *A single {animal}, full body, three-quarter side view, anatomically accurate, neutral mid-grey seamless background, flat even studio light, no cast shadow, whole body in frame, no props.*
- **Continuity rule:** generate each keyframe K2–K6 with the previous keyframe as a reference image so palette and grade carry through the cut-free descent.
- **Credibility gate:** reject any asset that reads as a pet gadget, toy, collar, cartoon or joke.

## Status log (2026-10-18)

- **09:58: SPENDING FROZEN** at Build's request until Jonathan confirms a new budget. Spend is 882.3 against the plan's ~200, and the balance is 317.7. No generation jobs, re-rolls or uploads; local ffmpeg work only. Files under `public/assets/` must not be moved or renamed.

- **08:30:** the CLI was blocked because the account was still a trial (`only_website_usage_on_trial_is_available`). 0 spent.
- **08:58:** Jonathan ended the trial. The Plus plan now has **1,200 credits**, so Tier 1 and Tier 2 both fit. Quality settings are used throughout (no draft modes).
- **Actual prices:**
  - `gpt_image_2_5`: 1 at medium/2k, 2.75 at high/2k
  - `nano_banana_pro`: 2 at 2k
  - `soul_location`: 0.12
  - `kling3_0` pro: 8.75 for 5 s, 17.5 for 10 s
  - `seedance_2_5` omni_reference: 35 at 720p, 80 at 1080p
  - `seed_audio`: about 1.3–1.8 each (it scales with prompt length)
  - `mirelo_text_to_audio`: 0.25 per second
  - `meshy_v7_image_to_3d`: **38** (not 5–7)
  - `tripo_h3_1_image_to_3d`: 9, or 18 at detailed quality
- **Account limits:** at most 6 concurrent jobs, otherwise `rate_limit_reached`.
- **Meshy quirk:** the CLI only accepts Meshy (for both cost and create) when `--enable_animation false --enable_rigging false` are passed explicitly.
- **Pipeline (scratchpad):**
  - `tools/gen.sh <tag> <promptfile> <model> …` runs a job and downloads the full-res `result_url`.
  - `tools/audio.py` trims calls, high-passes them, normalises to −1 dBFS and encodes Opus and MP3, or with `--loop` makes a seamless loop.
  - `tools/logo.py` builds the logo.

## Tests

| ID | What | Model(s) | Credits | Status |
|---|---|---|---|---|
| T-01 | K1 prompt rendered four ways | gpt_image_2_5 medium/2k · gpt_image_2_5 high/2k · nano_banana_pro 2k · soul_location | 5.87 | ✅ **Winner: `gpt_image_2_5 --quality high --resolution 2k`.** It has the most cinematic cloud sea and the best raven silhouettes. Nano Banana Pro was flat and hazy; Soul Location was grainy. |
| T-02 | Raven SPECIMEN prompt rendered two ways | gpt_image_2_5 high · nano_banana_pro | 4.75 | ✅ **Winner: `gpt_image_2_5 high`.** No cast shadow, the whole body in frame, accurate hackles. Nano Banana Pro added a cast shadow. |

The winning model becomes the default for that family. FIELD, SPECIMEN and INSTRUMENT all use `gpt_image_2_5 --quality high --resolution 2k`.

## The descent (Tier 1)

| ID | Moment | Prompt seed (FIELD +) | Model | Credits | Status |
|---|---|---|---|---|---|
| K1 | 1,200 m: above a sea of cloud at dawn, two ravens gliding | camera high above cloud tops, first light, two ravens in silhouette | gpt_image_2_5 high/2k | 2.75 | ✅ `img/keyframes/K1.webp` (this is T-01's high-quality render) |
| K2 | Through the cloud base into forest canopy, a starling murmuration | breaking under clouds, murmuration over misty temperate forest | gpt_image_2_5 high/2k, K1 ref | 2.75 | ✅ `K2.webp` |
| K3 | Ground level, savanna at dusk, elephant family | low over dry grass, elephant matriarch and calf, dust in low sun | gpt_image_2_5 high/2k, K2 ref | 2.75 | ✅ `K3.webp` |
| K4 | Grassland burrows, prairie dog sentry, horizon opens toward a coastline | sentry prairie dog upright at its burrow, wide plains running to a distant sea | gpt_image_2_5 high/2k, K3 ref | 2.75 | ✅ `K4.webp` |
| K5 | Over/under split at the waterline, a Morsis hydrophone buoy | half above, half below the surface, graphite buoy with a lime band, humpback shape below | gpt_image_2_5 high/2k, K4 ref | 2.75 | ✅ `K5.webp` |
| K6 | 40 m down, blue twilight, dolphins and a humpback | deep blue water column, god-rays, bottlenose pod, distant humpback | gpt_image_2_5 high/2k, K5 ref | 2.75 | ✅ `K6.webp`. Contact sheet: `img/keyframes/_contact-sheet.jpg` |
| D1–D5 | Kn → Kn+1, one continuous downward crane move, no cuts | *"Seamless continuous camera descent from the first frame to the last frame, slow and steady, no cut, documentary realism"*, plus a per-clip action line | `kling3_0 --mode pro --sound off --duration 5`, start/end images; **final: all five on `seedance_2_5 --mode omni_reference --resolution 1080p --generate_audio false`** (80 each) | 43.75 Kling first pass + 320 Seedance | ✅ masters `assets-src/video/D1–D5.mp4` (1912×1080, 24 fps, not deployed), `video/descent.mp4` + `descent-m.mp4`, `video/manifest.json`, `img/posters/descent.webp`. **Quality notes:** D1 is good (it sinks into a cloud bank and breaks out over the murmuration). D5 is excellent (a true descent below the waterline). D2 and D3 bridge their scenes with dissolves rather than camera moves. D4 had a near-hard cut from prairie to sea. **Re-rolls:** D4 was re-rendered on Kling with a stronger motion prompt (8.75; better, but still jumpy) and on Seedance 2.5 1080p (80; the first attempt failed and was refunded). **Seedance won clearly** (one genuine flight from the prairie dog, over the sea, to the buoy, then down to the waterline) and is now `D4.mp4`. D2 on Seedance is also better (the murmuration sweep carries the forest→savanna change) and is now `D2.mp4`. D3 on Seedance glides between the matriarch and calf to reveal the prairie dog. D1 on Seedance sinks through the cloud deck (a full white-out) and breaks out over the forest, replacing Kling's sideways fog wipe. **Final descent: all five clips are Seedance 2.5 1080p**, one continuous camera move. Every swap keeps 121 frames, so `video/manifest.json` timings are unchanged (25.042 s, 601 frames). Overview sheet: `img/keyframes/_descent-sheet.jpg`. The Kling originals are in `scratchpad/out/kling-originals/`. |

**Post-processing (changed 2026-10-18 at Build's request: the scroll-craft engine scrubs a `<video>` directly, so there are no WebP frame sequences):**
1. Keep the raw clips as `assets-src/video/D1.mp4` … `D5.mp4` and `V-FT1.mp4` (masters live outside `public/` so they are versioned but never deployed).
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

> **Superseded 2026-10-18 by the real-time model ([ADR 0003](adr/0003-ft1-as-realtime-exploded-model.md)).** `models/ft1.glb` is `assets-src/ft1/radio-source.glb` (Sketchfab “Grundig Radio FR-250” by Gher, CC BY 4.0) rebranded by `assets-src/ft1/rebrand.py`: the GRUNDIG badge, spec plate, model text, stickers and handwriting are painted out and replaced with a Morsis badge (embossed), rating plate, FT-1 plate, lab stickers and a lime lamp ring; textures are WebP (12 MB → 2.2 MB). `img/posters/ft1.webp` is now a render of that model (the no-WebGL fallback). The F-01/F-02 stills and V-FT1 video below were removed.

| ID | What | Prompt seed (INSTRUMENT +) | Model | Credits | Status |
|---|---|---|---|---|---|
| F-01 | FT-1 assembled, hero angle | handheld field transmitter: transducer head, control face with small display, signal scale, 3/4 view | gpt_image_2_5 high/2k | 2.75 | ✅ `img/ft1/F-01.webp`. Reads as pro field-recording hardware: round perforated transducer head, lime ring, spectrogram display, engraved scale, three buttons. |
| F-02 | Same angle, exploded into 7 layers along one axis | same object exploded: housing, battery, DSP board, Decode-3 core, transducers, signal scale, control face (made by editing F-01) | gpt_image_2_5 high/2k, F-01 as reference | 2.75 | ✅ `img/ft1/F-02.webp`. All seven layers, spread diagonally: rear housing, battery, DSP board, Decode-3 core (lime marking), transducer head, signal-scale strip, control face. |
| V-FT1 | F-01 → F-02 teardown | *"parts separate smoothly along one axis, camera locked, product-film lighting"* | `kling3_0 --mode pro --sound off --duration 10` | 17.5 | ✅ master `assets-src/video/V-FT1.mp4` (raw, not deployed), `video/ft1.mp4` + `ft1-m.mp4` (scrub encodes), `img/posters/ft1.webp`. 10.042 s. A clean progressive separation, with brief part-morphing around 6–7 s that is invisible under scrubbing. |

## Species (Tier 1 references, Tier 2 3D and loops)

| Species | Reference S-* (SPECIMEN) | 3D M-* (Tier 2) | Loop L-* (Tier 2, hero species only) |
|---|---|---|---|
| Raven | S-raven ✅ 2.75 | M-raven ✅ 38 | L-raven ✅ 8.75 |
| Starling | S-starling ✅ 2.75 | M-starling ✅ 38 | L-starling ✅ (2026-10-18) |
| Elephant | S-elephant ✅ 2.75 | M-elephant ✅ 38 | L-elephant ✅ 8.75 |
| Prairie dog | S-prairie ✅ 2.75 | M-prairie ✅ 38 | L-prairie ✅ (2026-10-18) |
| Humpback whale | S-humpback ✅ 2.75 | M-humpback ✅ 38 | L-humpback ✅ 8.75 |
| Bottlenose dolphin | S-dolphin ✅ 2.75 | M-dolphin ✅ 38 | L-dolphin ✅ (2026-10-18) |

- **S-\***: `img/specimens/S-<species>.webp`, made with gpt_image_2_5 high/2k at 1:1 (S-raven is T-02's winner). All six pass the gate.
- **3D test (Tier 2):** raven on Meshy 7 (38) vs Tripo H3.1 detailed (18). **Meshy wins clearly** (crisp beak, feet and feathers; Tripo's head was blobby), so Meshy is used for all six.
- **3D:** run `meshy_v7_image_to_3d` with the S-* image, `enable_pbr=true`, `target_polycount` about 30k, as GLB. Then compress with gltf-transform (Draco + WebP textures, under 3 MB each). **Tier 1 fallback:** the concept's procedural three.js animals. Any bad output is replaced with a CC-BY Sketchfab model, credited in the footer.
- **3D output:** `models/<species>.glb`, each about 30k tris, Draco geometry plus WebP textures (≤1536 px, PBR: base colour, metallic-roughness, normal), 0.7–2.3 MB. The longest axis is about 1.9 units and the origin is **not** centred, so recentre with a Box3 in the viewer. The `gltf-transform optimize --texture-compress webp` step crashes on these textures (a sharp/libvips colourspace bug), so textures are re-encoded with PIL in `scratchpad/tools/tex.mjs`, then `gltf-transform draco` is applied. Geometry is not simplified.
- **Cards (2026-10-18):** every specimen card now shows its habitat plate (`img/cards/C-<species>.webp`, 1280 px) and plays its loop while on screen; L-starling, L-prairie and L-dolphin were added the same way as the first three.
- **Loops:** Kling 3.0 Pro with the same image as start and end frame so they loop seamlessly. They appear in the Specimen atlas header and the zone panels. **Done:** `video/L-{raven,elephant,humpback}.mp4`, made from the P-* habitat cards (start = end), 1920×1080, 120 frames at 24 fps (the duplicate closing frame is dropped), H.264 with faststart and no audio, 0.8–1.8 MB. The seams are near-identical (PSNR 38–43 dB), so play them with `loop muted playsinline`. Motion is subtle: the raven calls, the elephants sway, the whale glides.

## Audio (Tier 1). See [ADR 0001](adr/0001-animal-voices-from-sample-banks.md)

| ID | What | Model | Credits | Status |
|---|---|---|---|---|
| A-raven-1…5 | Dry close calls: knock, kraa, rattle, recruitment yell, soft contact (5 regenerated) | Seed Audio 1.0 (`--format wav --sample_rate 48000`); Mirelo tested and rejected (mostly noise) | ~1.3–1.8 each | ✅ |
| A-starling-1…5 | Whistles, clicks, warble, mimic fragment, chatter | same | | ✅ |
| A-elephant-1…5 | **Regenerated 2026-10-18** (the first bank was broadband noise with no harmonics, and one take carried a steady high whine): contact rumble, trumpet, two-part greeting rumble, trumpet falling into a rumble, matriarch rumble. All five show clear harmonic stacks on a spectrogram. | Seed Audio 1.0, 7 takes for 5 keepers | ~1.5 each | ✅ Played by playback rate, not granular detune, and no longer re-shifted by the elephant's default Hearing shift (the samples are already audible). |
| A-prairie-1…5 | Short alarm chirps at varied pitch, jump-yip, chatter | same | | ✅ |
| A-humpback-1…5 | Moan, upsweep, grunt, cry, song phrase fragment | same | | ✅ (3 regenerated) |
| A-dolphin-1…5 | Signature whistle up, down, warble, click train, burst pulse | same | | ✅ (1 and 5 regenerated; 1 is a steady tonal whistle with little sweep) |
| B-sky / B-land / B-sea | 20 s loopable zone ambience beds (wind and high air · grass, insects, distant herd · underwater pressure and shipping hum) | `mirelo_text_to_audio --duration 22`, looped to 20 s with a 2 s equal-power crossfade | 5.5 each | ✅ `audio/ambience/{sky,land,sea}.{webm,mp3}`. Land (insects and wind) is the best. B-sea has two level steps from the source; it's fine under the mix, but it's the first candidate to re-roll. |
| M-01 (Tier 2) | 20 s ambient score bed, sparse and wondrous, loopable | Sonilo Music, 22 s | 1.38 | ✅ `audio/score/m01.{webm,mp3}`: a 17 s seamless loop taken from the steady middle section (the source fades in and out). |

Each sample was checked on a spectrogram (`scratchpad/A-sheet.jpg`); raven-5 and humpback-3 were regenerated. Calls are 0.5–4.7 s, trimmed to the active span, high-passed per species (raven 180 Hz, starling 500, prairie 350, dolphin 900, elephant and humpback 15). Every sample: mono, trimmed, normalised to −1 dBFS peak, exported as `.webm` (Opus) with an `.mp3` fallback, in `public/assets/audio/{species}/`. UI sounds (transmit, receive, decode tick) are synthesized with Tone.js and cost nothing.

## Identity and Field kit

> **Rebranded 2026-10-18.** The identity is now the supplied MORSIS logo (traced to `brand/logo*.svg`, `mark*.svg`, `logo-sprite.svg`, `favicon.svg`), Neue Montreal + PP Editorial New Italic, and the five-colour palette. TP-01–04 were edited with `gpt_image_2_5` (high/2k) to the new wordmark (TP-01 also carries the new FT-1 in its foam); the model's redrawn logos were then replaced with the exact traced wordmark by `assets-src/touchpoints/fix-logo.py`. TP-05, TP-06 and OG-01 are recomposed by `assets-src/brand/compose.py`. HERO relief: `img/hero/relief-*.webp` from `assets-src/hero/relief-source.png` (`gpt_image_2_5` high/4k, plaster bas-relief of ravens, a starling murmuration and clouds) plus `flat-480.webp`, the same wall with the carving blurred out. H-01 and `posters/hero.webp` were removed.

| ID | What | Tool | Credits | Status |
|---|---|---|---|---|
| LOGO | Morsis wordmark plus a mark where a waveform resolves into a glyph. SVG, with light and dark versions | **Claude (SVG, vector by design, not a fallback)** | 0 | ✅ In `public/assets/brand/`: `logo.svg` (for light backgrounds: forest mark, abyss wordmark), `logo-dark.svg` (for dark backgrounds: lime mark, paper wordmark), `mark.svg` (lime), `mark-ink.svg` (forest), `mark-1024.png` (lime on abyss, the reference image for TP-*), `logo-2048.png`, `logo-dark-2048.png`. The wordmark is Instrument Serif converted to outlines, so no font is needed. The mark is three smooth humps of signal swelling along the baseline that resolve into a crisp M, cut flat at the cap line and baseline like type. |
| TP-01 | FT-1 hard-shell field case (packaging) | gpt_image_2_5 high/2k, refs: mark-1024.png, logo-dark-2048.png, F-01 | 2.75 | ✅ `img/touchpoints/TP-01.webp` |
| TP-02 | Field jacket / lab coat with chest mark | gpt_image_2_5 high/2k, logo refs | 2.75 | ✅ `TP-02.webp`. Forest-green technical shell with a chest mark and a lime collar tab. |
| TP-03 | Hydrophone buoy livery at sea (can reuse the K5 buoy) | gpt_image_2_5 high/2k, logo refs + K5 | 2.75 | ✅ `TP-03.webp`. The K5 buoy with the Morsis logo and FIELD STATION 07 on its hull, humpback below. |
| TP-04 | Field-station ID badge on a lanyard | gpt_image_2_5 high/2k, logo refs | 2.75 | ✅ `TP-04.webp`. Badge: FIELD STATION 07 — BIOACOUSTICS, spectrogram, MRS-0716, lime-striped lanyard. |
| TP-05 | Field Console app icon (1024 px) | **Claude SVG** | 0 | ✅ `img/touchpoints/TP-05.svg` + `.png` (1024): the lime mark on a forest-to-abyss radial gradient with a faint oscilloscope grid and a baseline rule. |
| TP-06 | Social post: "Decoded today", spectrogram plus quote card | **Claude SVG** composited over K6 | 0 | ✅ `img/touchpoints/TP-06.webp` (1080×1350): DECODED TODAY · Field station 07 · dolphin D-14, the real spectrogram of `audio/dolphin/2`, the Decoded reply, Confidence 0.71 and a cited Field note (Janik & Sayigh 2013). |
| OG-01 | Open Graph share image 1200×630 | Claude composite over K1 | 0 | ✅ `img/og/OG-01.jpg` (1200×630): the logo, the tagline in Instrument Serif and the personality line in Geist Mono. |
| H-01 (Tier 2) | Hero loop: slow drift above the cloud sea, ravens crossing (start = end frame K1) | `seedance_2_5 --mode omni_reference --resolution 1080p --duration 5` (1080p for quality) | 80 | ✅ `video/H-01.mp4` (109 frames, 4.54 s, 0.7 MB) + `img/posters/hero.webp`. The raw clip's end frame drifted (seam PSNR 24.6), so the last 0.5 s is crossfaded into the head, giving a seamless loop (41.5 dB). Slow drift above the cloud sea, two ravens gliding. |
| P-* (Tier 2) | Six habitat cards for zone panels (otherwise cropped from keyframes) | gpt_image_2_5 high/2k, zone keyframe as grade ref | 2.75 each | ✅ `img/habitats/P-{raven,starling,elephant,prairie,humpback,dolphin}.webp`: a raven pair calling on a ridge above the cloud sea, a starling on a branch with a murmuration behind, matriarch and calf, a prairie dog greeting 'kiss', a humpback in god-rays, two dolphins. |

## Evidence elephant relief (2026-10-18)

- **Done in Higgsfield:** `gpt_image_2_5`, job `dde07b74-993b-4a5d-81b4-595b82fc9bbf`, requested by the user for the “We didn’t invent animal language” section.
- **Prompt:** Ivory plaster architectural bas-relief, African elephant adult and calf reaching toward one another with their trunks, a third elephant in shallow relief on the right, accurate sculpted anatomy and skin wrinkles, sparse grasses, soft raking light from upper left, quiet negative space on the left for the heading, no text or birds. Full generation parameters are saved beside the original.
- **Source:** `assets-src/evidence/elephant-relief-source.png` (1344 × 752). Browser assets: `public/assets/img/evidence/relief-1440.webp` (native resolution, WebP quality 85) and `flat-480.webp` (480 × 270, plain left-hand plaster softened into a matching base texture). No existing assets were replaced.
- **Use:** One continuous WebGL cursor reveal covers the whole Evidence section, from its heading through all six research findings. It shares the hero's renderer, with its own texture and subject position. It reveals on first view, responds to touch, shows a static relief for reduced motion, and falls back to a still if WebGL is unavailable. Generation credit cost was not returned by the submission tool.
- **Colour and spacing:** The rendered wall now uses the hero's `flat-480.webp` base, with a small RGB lift on the elephant relief to match the hero's whiter plaster. The heading flows directly into the findings with 56 px of spacing above the first rule; there is no viewport-height spacer.

## Regenerate in Higgsfield (filled in when credits run out)

_Nothing._ No 🔁 stand-ins were needed after the trial ended. Optional re-roll candidates if there's time: **B-sea** (`mirelo_text_to_audio --duration 22`, 5.5; the source has two level steps) and **A-dolphin-1** (`seed_audio`, about 1.8; a steady whistle with little frequency sweep). When a 🔁 asset is made, add a row here: ID, what the Claude stand-in is, the exact Higgsfield command to run, and its estimated credits.
