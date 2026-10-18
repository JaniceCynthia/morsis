"""Compose the drawn brand touchpoints in the current identity.

Writes public/assets/img/touchpoints/TP-05.svg + .png (Field Console icon),
TP-06.webp (social post) and public/assets/img/og/OG-01.jpg (share image).
Type is Neue Montreal with PP Editorial New Italic on the one or two words
that should feel alive; the mark and wordmark come from the supplied logo PNGs.

    python -I assets-src/brand/compose.py   (needs numpy, pillow; ffmpeg on PATH)
"""
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "public/assets"
SANS = str(ROOT / "assets-src/fonts/NeueMontreal-Regular.otf")
ITAL = str(ROOT / "assets-src/fonts/PPEditorialNew-Italic.otf")
INK, PAPER, LIME, FOREST = (16, 17, 13), (241, 241, 234), (212, 245, 63), (19, 36, 15)


def logo(name, height):
    """The supplied logo PNG as a smooth alpha mask at the requested height."""
    im = Image.open(ROOT / f"assets-src/brand/morsis-{name}@300x.png").convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    g = ImageOps.invert(bg.convert("L"))
    g = g.resize((g.width * 4, g.height * 4), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(3.2))
    g = g.point(lambda v: 0 if v < 110 else (255 if v > 146 else (v - 110) * 7))
    g = g.crop(g.getbbox())
    return g.resize((round(g.width * height / g.height), height), Image.Resampling.LANCZOS)


def stamp(img, mask, xy, color):
    img.paste(Image.new("RGB", mask.size, color), xy, mask)


def rich(draw, xy, parts, size, fill, line_h=None):
    """Draw [(text, italic)] runs on one baseline; returns the end x."""
    x, y = xy
    for text, italic in parts:
        f = ImageFont.truetype(ITAL if italic else SANS, round(size * (1.04 if italic else 1)))
        draw.text((x, y), text, font=f, fill=fill, anchor="ls")
        x += draw.textlength(text, font=f)
    return x


def caps(draw, xy, text, size, fill, track=0.08, anchor="ls"):
    f = ImageFont.truetype(SANS, size)
    if anchor != "ls":
        draw.text(xy, text, font=f, fill=fill, anchor=anchor)
        return
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill, anchor="ls")
        x += draw.textlength(ch, font=f) + size * track


def cover(img, w, h, ax=0.5, ay=0.5):
    s = max(w / img.width, h / img.height)
    im = img.resize((round(img.width * s), round(img.height * s)), Image.Resampling.LANCZOS)
    x = round((im.width - w) * ax)
    y = round((im.height - h) * ay)
    return im.crop((x, y, x + w, y + h))


# ------------------------------------------------------------------ TP-05 icon
def icon():
    mark_svg = (PUB / "brand/mark.svg").read_text()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', mark_svg).group(1).split()]
    d = re.search(r' d="([^"]+)"', mark_svg).group(1)
    w = 560
    s = w / vb[2]
    h = vb[3] * s
    tx, ty = (1024 - w) / 2, (1024 - h) / 2 - 10
    grid = "".join(
        f'<line x1="{k}" y1="0" x2="{k}" y2="1024"/><line x1="0" y1="{k}" x2="1024" y2="{k}"/>' for k in range(128, 1024, 128)
    )
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="Morsis Field Console">'
        "<title>Morsis Field Console</title>"
        '<defs><radialGradient id="bg" cx="50%" cy="36%" r="78%"><stop offset="0" stop-color="#1E2A15"/><stop offset="0.6" stop-color="#14160F"/><stop offset="1" stop-color="#10110D"/></radialGradient></defs>'
        '<rect width="1024" height="1024" fill="url(#bg)"/>'
        f'<g stroke="#D4F53F" stroke-opacity="0.06" stroke-width="2">{grid}</g>'
        f'<line x1="232" y1="{ty + h + 70:.0f}" x2="792" y2="{ty + h + 70:.0f}" stroke="#D4F53F" stroke-opacity="0.35" stroke-width="3"/>'
        f'<path transform="translate({tx:.1f} {ty:.1f}) scale({s:.4f})" fill="#D4F53F" fill-rule="evenodd" d="{d}"/>'
        "</svg>\n"
    )
    (PUB / "img/touchpoints/TP-05.svg").write_text(svg)
    # Raster twin for places that need a bitmap.
    im = Image.new("RGB", (1024, 1024), INK)
    glow = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(glow).ellipse((112, 0, 912, 760), fill=60)
    im.paste(Image.new("RGB", im.size, (30, 42, 21)), (0, 0), glow.filter(ImageFilter.GaussianBlur(160)))
    dr = ImageDraw.Draw(im)
    for k in range(128, 1024, 128):
        dr.line((k, 0, k, 1024), fill=(26, 30, 20), width=2)
        dr.line((0, k, 1024, k), fill=(26, 30, 20), width=2)
    m = logo("mark", round(h))
    stamp(im, m, (round(tx), round(ty)), LIME)
    dr.line((232, ty + h + 70, 792, ty + h + 70), fill=(86, 100, 40), width=3)
    im.save(PUB / "img/touchpoints/TP-05.png")


# ---------------------------------------------------------------- TP-06 post
def spectrogram(path, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    n, hop = 1024, 128
    frames = [x[i : i + n] * np.hanning(n) for i in range(0, len(x) - n, hop)]
    S = np.abs(np.fft.rfft(np.array(frames), axis=1)).T[: n // 2 // 1]
    S = 20 * np.log10(S + 1e-6)
    S = np.clip((S - (S.max() - 52)) / 52, 0, 1)[::-1]
    img = Image.fromarray((S * 255).astype(np.uint8)).resize((w, h), Image.Resampling.BILINEAR)
    a = np.asarray(img, np.float32)[..., None] / 255
    base = np.array(FOREST, np.float32) * 0.55
    col = base * (1 - a) + np.array(LIME, np.float32) * (a**1.15)
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))


def post():
    W, H = 1080, 1350
    bg = cover(Image.open(PUB / "img/keyframes/K6.webp").convert("RGB"), W, H, 0.5, 0.4)
    shade = Image.linear_gradient("L").resize((W, H))
    im = Image.composite(Image.new("RGB", (W, H), INK), bg, shade.point(lambda v: min(255, int(max(0, v - 70) * 1.9))))
    d = ImageDraw.Draw(im)
    stamp(im, logo("wordmark", 30), (64, 64), PAPER)
    caps(d, (W - 64, 88), "DECODED TODAY", 18, LIME, anchor="rs")
    caps(d, (64, 840), "FIELD STATION 07 · 40 M · BOTTLENOSE DOLPHIN D-14", 17, (167, 168, 157))
    sp = spectrogram(PUB / "audio/dolphin/2.mp3", W - 128, 110)
    im.paste(sp, (64, 864))
    caps(d, (64, 1004), "SIGNATURE WHISTLE · 1.7 S · 1 UNIT", 15, (130, 132, 122))
    rich(d, (64, 1080), [("“This is ", False), ("me,", True), (" D-14.", False)], 52, PAPER)
    rich(d, (64, 1140), [("Where is the rest of the pod?”", False)], 52, PAPER)
    caps(d, (64, 1208), "CONFIDENCE", 15, (130, 132, 122))
    d.rounded_rectangle((210, 1199, 700, 1204), radius=3, fill=(48, 50, 42))
    d.rounded_rectangle((210, 1199, 210 + int(490 * 0.71), 1204), radius=3, fill=LIME)
    caps(d, (730, 1208), "0.71", 15, LIME)
    f = ImageFont.truetype(SANS, 19)
    d.text((64, 1262), "Decode-3 output is a hypothesis, never a quotation. Field note: bottlenose dolphins", font=f, fill=(167, 168, 157))
    rich(d, (64, 1312), [("use individually distinctive signature whistles as names (", False), ("Janik & Sayigh", True), (", 2013).", False)], 19, (167, 168, 157))
    im.save(PUB / "img/touchpoints/TP-06.webp", quality=86)


# ------------------------------------------------------------------- OG-01
def og():
    W, H = 1200, 630
    bg = cover(Image.open(PUB / "img/hero/relief-2560.webp").convert("RGB"), W, H, 0.85, 0.35)
    # Keep the carving on the right; let the left fall to plain plaster for type.
    fade = Image.linear_gradient("L").rotate(90, expand=True).resize((W, H))
    plain = Image.new("RGB", (W, H), (236, 235, 227))
    im = Image.composite(bg, plain, fade.point(lambda v: min(255, int(max(0, v - 60) * 1.6))))
    d = ImageDraw.Draw(im)
    stamp(im, logo("wordmark", 30), (64, 60), INK)
    rich(d, (64, 330), [("Understanding the", False)], 74, INK)
    rich(d, (64, 410), [("oldest conversation", True)], 74, INK)
    rich(d, (64, 490), [("on Earth.", False)], 74, INK)
    caps(d, (64, 572), "INTERSPECIES SIGNAL LAB", 16, (85, 87, 77))
    d.rounded_rectangle((W - 64 - 210, 538, W - 64, 586), radius=24, fill=LIME)
    d.text((W - 64 - 105, 562), "Open a channel", font=ImageFont.truetype(SANS, 20), fill=INK, anchor="mm")
    im.save(PUB / "img/og/OG-01.jpg", quality=88)


if __name__ == "__main__":
    icon()
    post()
    og()
    print("wrote TP-05, TP-06, OG-01")
