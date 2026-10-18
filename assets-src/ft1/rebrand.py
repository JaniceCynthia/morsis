"""Rebrand the source field-radio model into the Morsis FT-1.

The source (radio-source.glb, Sketchfab "Grundig Radio FR-250" by Gher,
CC BY 4.0) carries a third-party brand, stickers and handwriting in its
textures. This paints all of it out and prints Morsis decals in its place,
then writes public/assets/models/ft1.glb with WebP textures.

Each decal region was located in the 2048 px texture atlas, and its on-model
orientation was solved from the mesh UVs: on every region here, "screen up"
and "screen right" map onto image axes as noted, so text is drawn upright on a
small canvas and then rotated into the atlas.

    python -I assets-src/ft1/rebrand.py   (needs numpy, pillow, opencv-python-headless)
"""
import io
import json
import struct
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets-src/ft1/radio-source.glb"
OUT = ROOT / "public/assets/models/ft1.glb"
SANS = str(ROOT / "assets-src/fonts/NeueMontreal-Regular.otf")
WORDMARK = ROOT / "assets-src/brand/morsis-wordmark@300x.png"
MARK = ROOT / "assets-src/brand/morsis-mark@300x.png"

LIME = (212, 245, 63)
INK = (16, 17, 13)
PAPER = (241, 241, 234)
rng = np.random.default_rng(7)


# --------------------------------------------------------------------- glb io
def read_glb(path):
    b = path.read_bytes()
    n = struct.unpack("<I", b[12:16])[0]
    j = json.loads(b[20 : 20 + n])
    bin0 = 20 + n + 8
    blen = struct.unpack("<I", b[20 + n : 24 + n])[0]
    return j, b[bin0 : bin0 + blen]


def view_bytes(j, binary, i):
    bv = j["bufferViews"][i]
    o = bv.get("byteOffset", 0)
    return binary[o : o + bv["byteLength"]]


def write_glb(j, chunks, path):
    """chunks: list of bytes, one per bufferView, in bufferView order."""
    out = bytearray()
    for i, data in enumerate(chunks):
        while len(out) % 4:
            out.append(0)
        j["bufferViews"][i]["byteOffset"] = len(out)
        j["bufferViews"][i]["byteLength"] = len(data)
        out += data
    while len(out) % 4:
        out.append(0)
    j["buffers"] = [{"byteLength": len(out)}]
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(out)
    blob = struct.pack("<III", 0x46546C67, 2, total)
    blob += struct.pack("<II", len(js), 0x4E4F534A) + js
    blob += struct.pack("<II", len(out), 0x004E4942) + bytes(out)
    path.write_bytes(blob)


# ------------------------------------------------------------------- helpers
def font(px):
    return ImageFont.truetype(SANS, px)


def to_atlas(canvas, orient):
    """Rotate an upright canvas into atlas orientation.
    'T'  : screen right -> image +y, screen up -> image -x  (transpose)
    'TV' : screen right -> image -y, screen up -> image +x  (transverse)
    """
    if orient == "T":
        return canvas.transpose(Image.Transpose.TRANSPOSE)
    if orient == "TV":
        return canvas.transpose(Image.Transpose.TRANSVERSE)
    return canvas


def logo_mask(path, height):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    g = bg.convert("L").point(lambda v: 255 - v)
    g = g.crop(g.getbbox())
    return g.resize((max(1, round(g.width * height / g.height)), height), Image.Resampling.LANCZOS)


def inpaint(arr, mask, radius=6):
    """Telea inpaint on an RGB uint8 array; mask is bool."""
    m = (mask.astype(np.uint8)) * 255
    return cv2.inpaint(np.ascontiguousarray(arr), m, radius, cv2.INPAINT_TELEA)


def regrain(arr, box, ref_box, mask=None, amount=1.0):
    """Inpainting leaves a smooth smear. Put the surface grain back by adding the
    high-frequency layer of a clean reference patch of the same material."""
    x0, y0, x1, y1 = box
    rx, ry = ref_box[:2]
    w, h = x1 - x0, y1 - y0
    ref = arr[ry : ry + h, rx : rx + w].astype(np.float32)
    hi = ref - cv2.GaussianBlur(ref, (0, 0), 3)
    region = arr[y0:y1, x0:x1].astype(np.float32)
    add = hi * amount
    if mask is not None:
        add *= mask[y0:y1, x0:x1, None]
    arr[y0:y1, x0:x1] = np.clip(region + add, 0, 255).astype(np.uint8)


def wear(alpha, strength=0.35, scale=3.0):
    """Scuff a decal alpha: speckled loss plus softer loss toward the edges."""
    a = np.asarray(alpha, np.float32) / 255
    n = rng.random(a.shape).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), scale)
    n = (n - n.min()) / (n.max() - n.min() + 1e-6)
    speck = (rng.random(a.shape) > 0.012).astype(np.float32)
    a = a * np.clip(1 - strength * (n > 0.62) * (n - 0.62) / 0.38 * 2.2, 0, 1) * speck
    return Image.fromarray((a * 255).astype(np.uint8))


def paste_decal(base, orm, layer_rgb, layer_a, xy, rough=0.62, metal=0.0):
    """Composite a printed decal onto base colour, and make it non-metallic
    satin print in the ORM map so it does not inherit the plastic's sheen."""
    x, y = xy
    w, h = layer_a.size
    a = np.asarray(layer_a, np.float32)[..., None] / 255
    rgb = np.asarray(layer_rgb, np.float32)
    region = base[y : y + h, x : x + w, :3].astype(np.float32)
    base[y : y + h, x : x + w, :3] = (region * (1 - a) + rgb * a).astype(np.uint8)
    o = orm[y : y + h, x : x + w].astype(np.float32)
    o[..., 1:2] = o[..., 1:2] * (1 - a) + rough * 255 * a
    o[..., 2:3] = o[..., 2:3] * (1 - a) + metal * 255 * a
    orm[y : y + h, x : x + w] = o.astype(np.uint8)


def flatten_normal(nrm, mask):
    nrm[mask] = (128, 128, 255)


def emboss(nrm, height, xy, fit):
    """Add raised relief from a height mask using the gradient-to-normal
    relation measured on the original embossed lettering (fit)."""
    x, y = xy
    h = cv2.GaussianBlur(np.asarray(height, np.float32) / 255, (0, 0), 1.2)
    gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3)
    hh, ww = h.shape
    n = nrm[y : y + hh, x : x + ww].astype(np.float32)
    n[..., 0] = np.clip(128 + fit[0] * gx, 0, 255)
    n[..., 1] = np.clip(128 + fit[1] * gy, 0, 255)
    nrm[y : y + hh, x : x + ww] = n.astype(np.uint8)


# ---------------------------------------------------------------------- main
def main():
    j, binary = read_glb(SRC)
    mat = j["materials"][0]
    ti = lambda key, sub=None: j["textures"][(mat[key] if sub is None else mat[key][sub])["index"]]["source"]
    i_base = ti("pbrMetallicRoughness", "baseColorTexture")
    i_orm = ti("pbrMetallicRoughness", "metallicRoughnessTexture")
    i_nrm = ti("normalTexture")
    i_emi = ti("emissiveTexture")
    img = lambda i: Image.open(io.BytesIO(view_bytes(j, binary, j["images"][i]["bufferView"])))

    base = np.array(img(i_base).convert("RGBA"))
    orm = np.array(img(i_orm).convert("RGB"))
    nrm = np.array(img(i_nrm).convert("RGB"))
    rgb = np.ascontiguousarray(base[..., :3])

    # -- 1. Front badge (Cube mesh): the GRUNDIG plate becomes a Morsis plate.
    bx0, by0, bx1, by1 = 1946, 18, 2030, 472
    badge = rgb[by0:by1, bx0:bx1]
    letters = (badge.astype(int).sum(2) > 3 * 95)
    letters = cv2.dilate(letters.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    # Measure how this atlas encodes relief before erasing it.
    hgt = cv2.GaussianBlur(letters.astype(np.float32), (0, 0), 1.2)
    gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=3).ravel()
    gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=3).ravel()
    nb = nrm[by0:by1, bx0:bx1].astype(np.float32)
    sel = (np.abs(gx) + np.abs(gy)) > 0.2
    fit = (
        float(np.dot(gx[sel], nb[..., 0].ravel()[sel] - 128) / max(np.dot(gx[sel], gx[sel]), 1e-6)),
        float(np.dot(gy[sel], nb[..., 1].ravel()[sel] - 128) / max(np.dot(gy[sel], gy[sel]), 1e-6)),
    )
    full = np.zeros(rgb.shape[:2], bool)
    full[by0:by1, bx0:bx1] = letters
    rgb = inpaint(rgb, full, 7)
    noise = rng.normal(0, 6, (by1 - by0, bx1 - bx0, 1))
    rgb[by0:by1, bx0:bx1] = np.clip(rgb[by0:by1, bx0:bx1].astype(float) + noise * full[by0:by1, bx0:bx1, None], 0, 255).astype(np.uint8)
    o = orm[by0:by1, bx0:bx1]
    o[letters] = np.median(o[~letters], axis=0)
    flatten_normal(nrm[by0:by1, bx0:bx1], letters)
    # Upright canvas is (badge height in the atlas) x (badge width in the atlas).
    cw, ch = by1 - by0, bx1 - bx0
    wm = logo_mask(WORDMARK, round(ch * 0.46))
    canvas_a = Image.new("L", (cw, ch), 0)
    canvas_a.paste(wm, ((cw - wm.width) // 2, (ch - wm.height) // 2))
    printed = wear(canvas_a, 0.45)
    layer_a = to_atlas(printed, "T")
    layer_rgb = Image.new("RGB", layer_a.size, (206, 196, 172))
    base[..., :3] = rgb
    paste_decal(base, orm, layer_rgb, layer_a, (bx0, by0), rough=0.55, metal=0.0)
    emboss(nrm, to_atlas(canvas_a, "T"), (bx0, by0), fit)
    rgb = np.ascontiguousarray(base[..., :3])

    # -- 2. Back spec plate: new rating plate text.
    px0, py0, px1, py1 = 62, 1522, 178, 1700
    plate = rgb[py0:py1, px0:px1]
    txt = plate.astype(int).sum(2) > 3 * 105
    txt = cv2.dilate(txt.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    full = np.zeros(rgb.shape[:2], bool)
    full[py0:py1, px0:px1] = txt
    rgb = inpaint(rgb, full, 5)
    noise = rng.normal(0, 5, (py1 - py0, px1 - px0, 1))
    rgb[py0:py1, px0:px1] = np.clip(rgb[py0:py1, px0:px1].astype(float) + noise * txt[..., None], 0, 255).astype(np.uint8)
    o = orm[py0:py1, px0:px1]
    o[txt] = np.median(o[~txt], axis=0)
    cw, ch = py1 - py0, px1 - px0
    can = Image.new("L", (cw, ch), 0)
    d = ImageDraw.Draw(can)
    wm = logo_mask(WORDMARK, 13)
    can.paste(wm, (8, 8))
    lines = ["FT-1 FIELD TRANSMITTER", "LISTEN 1 Hz - 150 kHz", "EMIT UNDER PERMIT ONLY", "UNIT 03 / FIELD STATION 07", "INTERSPECIES SIGNAL LAB"]
    f = font(9)
    for k, line in enumerate(lines):
        d.text((8, 30 + k * 15), line, fill=255, font=f)
    d.line((8, 25, cw - 8, 25), fill=200, width=1)
    printed = wear(can, 0.3, 2)
    layer_a = to_atlas(printed, "T")
    base[..., :3] = rgb
    paste_decal(base, orm, Image.new("RGB", layer_a.size, (214, 214, 206)), layer_a, (px0, py0), rough=0.5)
    rgb = np.ascontiguousarray(base[..., :3])

    # -- 3. Front model text (FR-250 / RECYCLE POWER) -> FT-1. The box hugs the
    # printed text only: the island edge beside it is stretched texels that an
    # inpaint would smear across the face.
    fx0, fy0, fx1, fy1 = 986, 24, 1019, 106
    reg = rgb[fy0:fy1, fx0:fx1].astype(int)
    local = cv2.GaussianBlur(reg.astype(np.float32), (0, 0), 6).sum(2)
    txt = (local - reg.sum(2)) > 60
    full = np.zeros(rgb.shape[:2], bool)
    full[fy0:fy1, fx0:fx1] = cv2.dilate(txt.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    rgb = inpaint(rgb, full, 3)
    regrain(rgb, (fx0, fy0, fx1, fy1), (905, 300), full, 1.0)
    cw, ch = fy1 - fy0, fx1 - fx0
    can = Image.new("L", (cw, ch), 0)
    d = ImageDraw.Draw(can)
    d.text((cw // 2, ch // 2 - 5), "FT-1", fill=255, font=font(19), anchor="mm")
    d.text((cw // 2, ch // 2 + 11), "FIELD TRANSMITTER", fill=255, font=font(7), anchor="mm")
    layer_a = to_atlas(wear(can, 0.25, 1.5), "TV")
    base[..., :3] = rgb
    paste_decal(base, orm, Image.new("RGB", layer_a.size, (40, 40, 36)), layer_a, (fx0, fy0), rough=0.6)
    rgb = np.ascontiguousarray(base[..., :3])

    # -- 4. Handwriting under the base. The panel is plain moulded plastic, so
    # refill its interior with the same plastic tiled from a clean patch (mirror
    # tiling hides the seams in a noise texture) and feather it in.
    hx0, hy0, hx1, hy1 = 252, 1562, 800, 1688
    clean = (566, 300, 716, 420)  # clean beige panel on the back, same material
    def refill(arr, src_box, dst_box, feather=8):
        sx0, sy0, sx1, sy1 = src_box
        dx0, dy0, dx1, dy1 = dst_box
        patch = arr[sy0:sy1, sx0:sx1].astype(np.float32)
        h, w = dy1 - dy0, dx1 - dx0
        reps = (h // patch.shape[0] + 2, w // patch.shape[1] + 2)
        row = np.concatenate([patch if k % 2 == 0 else patch[:, ::-1] for k in range(reps[1])], 1)
        tile = np.concatenate([row if k % 2 == 0 else row[::-1] for k in range(reps[0])], 0)[:h, :w]
        # Match the destination's average tone so lighting stays continuous.
        tile += arr[dy0:dy1, dx0:dx1].astype(np.float32).reshape(-1, arr.shape[2]).mean(0) - tile.reshape(-1, arr.shape[2]).mean(0)
        m = np.ones((h, w), np.float32)
        m = cv2.erode(m, np.ones((3, 3), np.uint8), borderType=cv2.BORDER_CONSTANT, borderValue=0)
        m = cv2.GaussianBlur(m, (0, 0), feather / 2)[..., None]
        cur = arr[dy0:dy1, dx0:dx1].astype(np.float32)
        arr[dy0:dy1, dx0:dx1] = np.clip(cur * (1 - m) + tile * m, 0, 255).astype(np.uint8)
    refill(rgb, clean, (hx0, hy0, hx1, hy1))
    refill(orm, clean, (hx0, hy0, hx1, hy1))
    nrm[hy0 + 4 : hy1 - 4, hx0 + 4 : hx1 - 4] = (128, 128, 255)
    # Stray marker flicks that ran past the panel edge.
    wx0, wy0, wx1, wy1 = 226, 1536, 824, 1714
    reg = rgb[wy0:wy1, wx0:wx1].astype(int)
    flick = (reg[..., 2] - (reg[..., 0] + reg[..., 1]) / 2) > 14
    full = np.zeros(rgb.shape[:2], bool)
    full[wy0:wy1, wx0:wx1] = cv2.dilate(flick.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    rgb = inpaint(rgb, full, 3)

    # -- 5. Stickers: the three third-party stickers become worn lab stickers.
    base[..., :3] = rgb

    def lab_sticker(size, kind):
        w, h = size
        a = Image.new("L", size, 0)
        col = Image.new("RGB", size, PAPER)
        d = ImageDraw.Draw(a)
        dc = ImageDraw.Draw(col)
        if kind == "station":  # lime roundel, the mark, the station number
            d.ellipse((1, 1, w - 2, h - 2), fill=255)
            dc.rectangle((0, 0, w, h), fill=LIME)
            m = logo_mask(MARK, round(h * 0.34))
            col.paste(Image.new("RGB", m.size, INK), ((w - m.width) // 2, round(h * 0.2)), m)
            dc.text((w // 2, round(h * 0.72)), "FS-07", fill=INK, font=font(round(h * 0.15)), anchor="mm")
        elif kind == "permit":  # paper tag with a lime band
            d.rounded_rectangle((1, 1, w - 2, h - 2), radius=4, fill=255)
            dc.rectangle((0, 0, w, h), fill=PAPER)
            dc.rectangle((0, 0, w, round(h * 0.3)), fill=LIME)
            dc.text((6, round(h * 0.15)), "PERMIT", fill=INK, font=font(round(h * 0.17)), anchor="lm")
            dc.text((6, round(h * 0.52)), "24-117", fill=INK, font=font(round(h * 0.2)), anchor="lm")
            dc.text((6, round(h * 0.8)), "WELFARE REVIEWED", fill=INK, font=font(max(6, round(h * 0.1))), anchor="lm")
        else:  # lab: ink label with the lime wordmark
            d.rounded_rectangle((1, 1, w - 2, h - 2), radius=6, fill=255)
            dc.rectangle((0, 0, w, h), fill=INK)
            m = logo_mask(WORDMARK, round(h * 0.2))
            col.paste(Image.new("RGB", m.size, LIME), ((w - m.width) // 2, round(h * 0.26)), m)
            dc.text((w // 2, round(h * 0.68)), "INTERSPECIES", fill=PAPER, font=font(round(h * 0.11)), anchor="mm")
            dc.text((w // 2, round(h * 0.82)), "SIGNAL LAB", fill=PAPER, font=font(round(h * 0.11)), anchor="mm")
        # Age it: grime toward the edges, slight fade.
        arr = np.asarray(col, np.float32)
        yy, xx = np.mgrid[0:h, 0:w]
        edge = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)) / (min(w, h) / 2)
        grime = 1 - 0.18 * np.clip(1 - edge * 3, 0, 1) - 0.06 * rng.random((h, w))
        arr = arr * grime[..., None] * 0.94
        return Image.fromarray(arr.clip(0, 255).astype(np.uint8)), wear(a, 0.3, 2)

    for box, kind, orient in [
        ((580, 616, 676, 712), "station", "T"),   # was the Ghostbusters sticker (back)
        ((610, 198, 702, 286), "permit", "T"),    # was the pixel-character sticker (back)
        ((1088, 1352, 1252, 1516), "lab", "TV"),  # was "I love 80s" (right side)
    ]:
        x0, y0, x1, y1 = box
        cw, ch = (y1 - y0, x1 - x0)  # rotated 90 degrees either way
        col, a = lab_sticker((cw, ch), kind)
        col, a = to_atlas(col, orient), to_atlas(a, orient)
        paste_decal(base, orm, col, a, (x0, y0), rough=0.48)

    # -- 6. The lamp ring takes the one lime accent.
    cx, cy = 243, 375
    yy, xx = np.mgrid[0:2048, 0:2048]
    r = np.hypot(xx - cx, yy - cy)
    lum = base[..., :3].astype(np.float32).mean(2)
    ring = (r > 138) & (r < 182) & (lum > 140)
    k = (lum[ring] / 235.0)[:, None]
    base[ring, :3] = np.clip(np.array(LIME, np.float32) * k, 0, 255).astype(np.uint8)

    # ------------------------------------------------------------------ write
    def webp(im, q, lossless=False):
        b = io.BytesIO()
        im.save(b, "WEBP", quality=q, method=6, lossless=lossless)
        return b.getvalue()

    new_imgs = {
        i_base: webp(Image.fromarray(base, "RGBA"), 90),
        i_orm: webp(Image.fromarray(orm, "RGB").resize((1024, 1024), Image.Resampling.LANCZOS), 88),
        i_nrm: webp(Image.fromarray(nrm, "RGB"), 94),
        i_emi: webp(img(i_emi).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), 90),
    }
    chunks = [view_bytes(j, binary, i) for i in range(len(j["bufferViews"]))]
    for ii, data in new_imgs.items():
        im = j["images"][ii]
        chunks[im["bufferView"]] = data
        im["mimeType"] = "image/webp"
    for t in j["textures"]:
        t["extensions"] = {"EXT_texture_webp": {"source": t.pop("source")}}
    j["extensionsUsed"] = sorted(set(j.get("extensionsUsed", [])) | {"EXT_texture_webp"})
    j["extensionsRequired"] = sorted(set(j.get("extensionsRequired", [])) | {"EXT_texture_webp"})
    j["asset"]["extras"]["title"] = "Morsis FT-1 (after Grundig Radio FR-250 by Gher, CC BY 4.0)"
    j["asset"]["generator"] = "Morsis rebrand.py over " + j["asset"].get("generator", "")
    write_glb(j, chunks, OUT)
    print("relief fit", [round(v, 2) for v in fit])
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB")
    Image.fromarray(base, "RGBA").convert("RGB").resize((1024, 1024)).save(ROOT / "assets-src/ft1/basecolor-preview.jpg", quality=85)


if __name__ == "__main__":
    main()
