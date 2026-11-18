#!/usr/bin/env python3
"""Flat procedural layout guides for the ground / material textures.

Qwen-Image will not paint a truly top-down, perspective-free surface from text alone, so each
texture is made with Qwen-Edit from one of these plain guides ("repaint this, keep the layout").
The guides only fix layout and scale (rows, boards, bricks, stones); all the looks come from the model.

  python3 texref.py            -> $FARM_ART_WORK/texref/<slot>.png  (1328 x 1328)
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

N = 1328
WORK = os.environ.get("FARM_ART_WORK", "/tmp/farm-art")


def noise(rng, octaves=(4, 8, 16, 32, 64, 128), amp=None):
    out = np.zeros((N, N))
    for i, o in enumerate(octaves):
        a = rng.random((o, o)).astype(np.float32)
        im = Image.fromarray((a * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)
        out += np.asarray(im, float) / 255 * (amp[i] if amp else 1 / (i + 1))
    out -= out.min(); out /= out.max()
    return out


def colour(t, lo, mid, hi):
    lo, mid, hi = (np.array(c, float) for c in (lo, mid, hi))
    t = t[..., None]
    return np.where(t < 0.5, lo + (mid - lo) * t * 2, mid + (hi - mid) * (t * 2 - 1))


def hexc(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def speck(img, rng, n, cols, r=(1, 4)):
    d = ImageDraw.Draw(img)
    for _ in range(n):
        x, y, s = rng.integers(0, N), rng.integers(0, N), rng.integers(*r)
        d.ellipse((x - s, y - s, x + s, y + s), fill=cols[rng.integers(len(cols))])


def strokes(img, rng, n, cols, ln=(8, 22), ang=(-0.5, 0.5), w=2):
    d = ImageDraw.Draw(img)
    for _ in range(n):
        x, y, L, a = rng.integers(0, N), rng.integers(0, N), rng.integers(*ln), rng.uniform(*ang)
        d.line((x, y, x + L * np.sin(a), y - L * np.cos(a)), fill=cols[rng.integers(len(cols))], width=w)


def base(rng, pal, **kw):
    return Image.fromarray(colour(noise(rng, **kw), *[hexc(p) for p in pal]).astype(np.uint8))


def rows(rng, pal, pitch, vertical=False, depth=0.55, gap=None):
    y = np.arange(N)[:, None] + 10 * (noise(rng, (6, 12)) - 0.5)
    t = 0.5 + 0.5 * np.sin(2 * np.pi * y / pitch)
    t = 0.5 + (t - 0.5) * depth + 0.35 * (noise(rng, (32, 64, 128, 256)) - 0.5)
    a = colour(np.clip(t, 0, 1), *[hexc(p) for p in pal])
    if vertical:
        a = a.transpose(1, 0, 2)
    return Image.fromarray(a.astype(np.uint8))


def boards(rng, pal, pitch, vertical=True, gapc=(60, 45, 35)):
    img = Image.new("RGB", (N, N))
    d = ImageDraw.Draw(img)
    g = noise(rng, (2, 64, 256), amp=(0.2, 0.4, 0.4))
    lo, mid, hi = [np.array(hexc(p), float) for p in pal]
    k = 0
    for x in range(0, N, pitch):
        t = rng.uniform(0.25, 0.75)
        c = lo + (hi - lo) * t
        d.rectangle((x, 0, x + pitch - 1, N), fill=tuple(int(v) for v in c))
        # staggered board ends
        for y in range(int(rng.integers(0, N // 2)), N, int(N * 0.75)):
            d.line((x, y, x + pitch, y), fill=gapc, width=3)
        d.line((x, 0, x, N), fill=gapc, width=4)
    a = np.asarray(img, float)
    grain = np.asarray(Image.fromarray((noise(rng, (4, 8)) * 255).astype(np.uint8)).resize((N // 16, N)).resize((N, N)), float) / 255
    a = np.clip(a * (0.85 + 0.3 * grain[..., None]), 0, 255)
    if not vertical:
        a = a.transpose(1, 0, 2)
    return Image.fromarray(a.astype(np.uint8))


def bricks(rng, pal, bw, bh, mortar=(150, 140, 125), jitter=0.25, round_=0):
    img = Image.new("RGB", (N, N), mortar)
    d = ImageDraw.Draw(img)
    lo, mid, hi = [np.array(hexc(p), float) for p in pal]
    for r, y in enumerate(range(0, N + bh, bh)):
        off = (bw // 2) if r % 2 else 0
        for x in range(-bw, N + bw, bw):
            c = lo + (hi - lo) * rng.uniform(0, 1) ** 1.0
            box = (x + off + 3, y + 3, x + off + bw - 3, y + bh - 3)
            if round_:
                d.rounded_rectangle(box, radius=round_, fill=tuple(int(v) for v in c))
            else:
                d.rectangle(box, fill=tuple(int(v) for v in c))
    a = np.asarray(img, float) * (0.9 + 0.2 * noise(rng, (64, 256))[..., None])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def cobbles(rng, pal, n=150, joint=(88, 78, 62)):
    # jittered grid of rounded stones
    img = Image.new("RGB", (N, N), joint)
    d = ImageDraw.Draw(img)
    lo, mid, hi = [np.array(hexc(p), float) for p in pal]
    s = N // 8
    for gy in range(-1, 9):
        for gx in range(-1, 9):
            cx = gx * s + s // 2 + (s // 2 if gy % 2 else 0) + rng.integers(-s // 8, s // 8)
            cy = gy * s + s // 2 + rng.integers(-s // 8, s // 8)
            rx, ry = s * rng.uniform(0.40, 0.47), s * rng.uniform(0.38, 0.46)
            c = lo + (hi - lo) * rng.uniform(0, 1)
            d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=tuple(int(v) for v in c))
    return img.filter(ImageFilter.GaussianBlur(1.5))


def make(slot, rng):
    P = {
        "grass_spring": ["#5d9a40", "#6fae4c", "#93c96a"], "grass_summer": ["#35792c", "#4f9a3a", "#63ab48"], "grass_autumn": ["#8f7f3a", "#a89a4a", "#c9ad58"],
        "grass_winter": ["#d3dde6", "#e9eff4", "#fbfdff"], "soil_dry": ["#86694a", "#9a7b55", "#b0926a"], "soil_tilled": ["#523822", "#6e4f33", "#8a6644"],
        "soil_wet": ["#24170e", "#3f2c1d", "#55402c"], "path_dirt": ["#b0966d", "#c2a77c", "#d3bb93"], "cobble": ["#7d7d78", "#9a9a96", "#b9a88f"],
        "sand": ["#cbb888", "#d9c79a", "#eadbb2"], "cliff_rock": ["#5f5b55", "#77736d", "#948e85"], "wood_floor": ["#8f6942", "#a37a4f", "#bb9163"],
        "plank_wall": ["#b9ad92", "#cfc4a8", "#e2d8c0"], "barn_red": ["#7f2e22", "#9c3b2e", "#b54a3b"], "plaster_wall": ["#d2c9b5", "#e0d8c6", "#efe9db"],
        "roof_shingle": ["#5d5955", "#757069", "#8e8880"], "roof_red": ["#8e4326", "#a5502f", "#c0683f"], "roof_tin": ["#75828a", "#8d99a0", "#a9b4ba"],
        "metal_hull": ["#5d6a77", "#6e7b88", "#8592a0"], "concrete_ruin": ["#787771", "#8b8a84", "#a09f99"], "brick_ruin": ["#6d4435", "#8a5a48", "#a36f59"],
        "ash_ground": ["#66625b", "#7c776f", "#938d84"], "hay": ["#b99a42", "#d4b45a", "#e6ca78"], "water": ["#1f4a5c", "#2d5f73", "#3d7387"],
        "hull_plate": ["#a9b0b8", "#c3c9cf", "#dde1e5"], "deck_floor": ["#6d7680", "#848d96", "#9aa3ab"], "glass_window": ["#0b1530", "#14224a", "#22356a"],
        "colony_path": ["#cfcac0", "#e0dbd2", "#eeeae3"], "grass_colony": ["#4f9a3a", "#62ad48", "#7cc35a"],
    }[slot]
    cs = [hexc(p) for p in P]
    if slot == "hull_plate":
        im = bricks(rng, P, N // 3, N // 4, mortar=(120, 126, 134))
        d = ImageDraw.Draw(im)
        for y in range(0, N, N // 4):
            for x in range(0, N, N // 24):
                d.ellipse((x + 10, y + 12, x + 18, y + 20), fill=(150, 156, 164))
        return im
    if slot == "deck_floor":
        im = bricks(rng, P, N // 4, N // 4, mortar=(60, 66, 72)).filter(ImageFilter.GaussianBlur(1))
        d = ImageDraw.Draw(im)
        for y in range(8, N, 22):
            for x in range((y // 22 % 2) * 11, N, 22):
                d.line((x, y, x + 8, y + 8), fill=tuple(int(c * 1.12) for c in cs[1]), width=3)
        for x in (N // 8, N * 5 // 8):
            d.line((x, 0, x, N), fill=(90, 210, 220), width=6)
        return im
    if slot == "glass_window":
        im = base(rng, P, octaves=(2, 4, 8))
        speck(im, rng, 700, [(230, 235, 255), (200, 210, 255), (255, 240, 220)], r=(1, 3))
        d = ImageDraw.Draw(im)
        d.ellipse((int(N * 0.55), int(N * 0.72), int(N * 1.25), int(N * 1.42)), fill=(60, 120, 200))
        for x in range(0, N, N // 3):
            d.rectangle((x, 0, x + 26, N), fill=(170, 176, 184))
        d.rectangle((0, 0, N, 40), fill=(170, 176, 184)); d.rectangle((0, N - 40, N, N), fill=(170, 176, 184))
        return im
    if slot == "colony_path":
        im = bricks(rng, P, N // 4, N // 4, mortar=(180, 175, 166), jitter=0)
        d = ImageDraw.Draw(im)
        for y in range(N // 8, N, N // 2):
            d.rectangle((0, y - 5, N, y + 5), fill=(200, 245, 250))
        return im
    if slot == "grass_colony":
        im = base(rng, P, octaves=(8, 32, 128, 256))
        strokes(im, rng, 9000, cs + [cs[2]], ln=(8, 18), w=2)
        d = ImageDraw.Draw(im)
        for y in range(N // 8, N, N // 4):
            for x in range(N // 8, N, N // 4):
                d.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(180, 186, 192))
        return im
    if slot.startswith("grass") and slot != "grass_winter":
        im = base(rng, P, octaves=(8, 32, 128, 256))
        strokes(im, rng, 9000, cs + [cs[2]], ln=(10, 26), w=2)
        if slot == "grass_spring":
            speck(im, rng, 60, [(250, 250, 245)], r=(3, 6))
        if slot == "grass_autumn":
            speck(im, rng, 90, [(190, 90, 40), (160, 70, 30), (215, 150, 50)], r=(5, 10))
    elif slot == "grass_winter":
        im = base(rng, P, octaves=(3, 6, 12))
    elif slot in ("soil_tilled", "soil_wet"):
        im = rows(rng, P, N // 8)
        speck(im, rng, 1500, cs, r=(2, 5))
    elif slot == "roof_tin":
        im = rows(rng, P, N // 16, vertical=True, depth=0.9)
    elif slot == "wood_floor":
        im = boards(rng, P, N // 8, vertical=False)
    elif slot in ("plank_wall", "barn_red"):
        im = boards(rng, P, N // 8, vertical=True, gapc=(70, 50, 40) if slot == "plank_wall" else (50, 20, 15))
    elif slot == "brick_ruin":
        im = bricks(rng, P, N // 4, N // 16)
    elif slot in ("roof_red", "roof_shingle"):
        im = bricks(rng, P, N // 8, N // 8, mortar=tuple(int(c * 0.5) for c in cs[0]), round_=18 if slot == "roof_red" else 4)
    elif slot == "metal_hull":
        im = bricks(rng, P, N // 2, N // 4, mortar=(50, 58, 66))
        speck(im, rng, 300, [(60, 66, 74), (150, 160, 170)], r=(2, 4))
    elif slot == "cobble":
        im = cobbles(rng, P)
    elif slot == "hay":
        im = base(rng, P, octaves=(16, 64, 256))
        strokes(im, rng, 7000, cs, ln=(30, 90), ang=(-3.14, 3.14), w=3)
    elif slot == "water":
        im = base(rng, P, octaves=(3, 6, 12, 24))
    elif slot == "cliff_rock":
        im = base(rng, P, octaves=(3, 8, 24, 64, 200))
        strokes(im, rng, 160, [(60, 56, 52)], ln=(60, 200), ang=(1.2, 1.9), w=3)
    else:  # soil_dry, path_dirt, sand, plaster, concrete, ash
        im = base(rng, P, octaves=(4, 16, 64, 256))
        if slot in ("soil_dry", "path_dirt", "ash_ground", "concrete_ruin"):
            speck(im, rng, 900, cs + [tuple(int(c * 0.8) for c in cs[0])], r=(2, 6))
    return im


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import prompts
    d = os.path.join(WORK, "texref"); os.makedirs(d, exist_ok=True)
    for i, slot in enumerate(prompts.TEXTURES):
        make(slot, np.random.default_rng(100 + i)).save(os.path.join(d, slot + ".png"))
    print("wrote", len(prompts.TEXTURES), "guides to", d)
