# Animal voices are assembled from per-species sample banks, not TTS or video audio

Every Decoded reply must sound like that Species and that Individual, and never the same twice. So each Species gets a bank of 4–6 short generated base calls. In the browser, each Signal is assembled from that bank, steered by the Units, Contour and duration Decode-3 returns: the samples are reordered, pitch-shifted without changing speed (Tone.js `GrainPlayer`), and given a synthesized layer. Every Individual's Voiceprint adds a fixed pitch offset and timbre on top.

## Considered Options

- **Gemini TTS**: it speaks words, not calls, and is capped at about 100 requests a day even on paid tiers. A live demo would burn through that.
- **Audio baked into the Higgsfield videos**: scroll-scrubbed video plays silent and at a varying speed, so that audio is never heard. Turning audio off doesn't lower the cost either.
- **Pure procedural synthesis** (the concept's oscillators): unlimited variety, but it sounds synthetic. Here it is only the extra layer on top of the samples, not the source.

## Consequences

Decode-3's JSON reply must include `units`, `contour` and `durationSec`, because the audio engine depends on them. The English Decoded reply is text only, with no voice.
