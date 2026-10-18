---
status: accepted (supersedes ADR 0002)
---

# The FT-1 teardown is a real-time exploded 3D model with hand-built internals

The FT-1 is now drawn from a licensed field-radio model (Sketchfab, CC-BY-4.0, credited in the footer). On scroll, its eight shell pieces move apart and reveal internal parts built in three.js, with worn materials matched to the shell. This replaces the scrubbed teardown video from ADR 0002. We made the change because the brief asks for a model that looks realistic and can be taken apart for real. The source model is shell only, so the parts inside have to be made by us. AI 3D generators were rejected again because they output one fused mesh.

## Consequences

The source textures carry a third-party brand, stickers and handwriting. These must be painted out and replaced with Morsis marks before anything ships. The CC-BY credit must stay on the page. Each Layer label is now attached to its part in 3D, not placed at a fixed point over a video.
