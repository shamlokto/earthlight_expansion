#!/usr/bin/env python3
"""Post-processing for the farm art set: picks, tiling, panoramas, cut-outs, sprite sheets,
video encoding and the manifest.  Raw material is in $FARM_ART_WORK (default /tmp/farm-art),
finished files go to art/farm/.

  post.py sheet <group>            contact sheets of the raw images -> <work>/review/
  post.py textures|sky|scenes      finish those groups
  post.py masks <group>            fetch the alpha mattes made on the pod by pod_cut.py (needs COMFY_URL)
  post.py cut sprites|buildings|people|icons
  post.py sel <group>              copy picked raws to <work>/sel/<group>/<slot>.png (references for edit / i2v)
  post.py walkref                  build the 480x832 start frames for the walk clips
  post.py video                    encode cut-scene clips
  post.py walk <name>              frames + mattes -> looping sprite sheet
  post.py manifest                 rebuild art/farm/manifest.json from the files that exist

picks.json: {"<group>/<slot>": seed}  chooses a seed;  {"<group>/<slot>": null} rejects the slot.
"""
import glob, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ART = os.path.join(REPO, "art", "farm")
WORK = os.environ.get("FARM_ART_WORK", "/tmp/farm-art")
PICKS = os.path.join(HERE, "picks.json")
META = os.path.join(HERE, "meta.json")
sys.path.insert(0, HERE)
import prompts as P


def jload(p):
    return json.load(open(p)) if os.path.exists(p) else {}


def raws(group):
    out = {}
    for f in sorted(glob.glob(os.path.join(WORK, "raw", group, "*__*.*"))):
        slot, seed = os.path.splitext(os.path.basename(f))[0].rsplit("__", 1)
        out.setdefault(slot, {})[int(seed)] = f
    return out


def picked(group):
    """slot -> raw path, honouring picks.json (null = rejected)."""
    picks, out = jload(PICKS), {}
    for slot, seeds in raws(group).items():
        k = "%s/%s" % (group, slot)
        if k in picks:
            if picks[k] is None or picks[k] not in seeds:
                continue
            out[slot] = seeds[picks[k]]
        else:
            out[slot] = seeds[min(seeds)]
    return out


def meta_set(key, **kw):
    m = jload(META)
    m[key] = kw
    json.dump(m, open(META, "w"), indent=0, sort_keys=True)


def save_webp(im, rel, q=82):
    dest = os.path.join(ART, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if im.mode == "RGBA":
        im.save(dest, "WEBP", quality=q + 4, alpha_quality=92, method=6, exact=False)
    else:
        im.convert("RGB").save(dest, "WEBP", quality=q, method=6)
    return dest


# ------------------------------------------------------------------ review sheets
def sheet(group, cols=6, cell=320, files=None, name=None, bg=(90, 110, 90)):
    items = files or [(("%s %d" % (s, sd)), f) for s, d in raws(group).items() for sd, f in sorted(d.items()) if f.endswith(".png")]
    os.makedirs(os.path.join(WORK, "review"), exist_ok=True)
    per = cols * 4
    outs = []
    for n in range(0, len(items), per):
        part = items[n:n + per]
        rows = (len(part) + cols - 1) // cols
        sh = Image.new("RGB", (cols * cell, rows * (cell + 16)), bg)
        d = ImageDraw.Draw(sh)
        for i, (label, f) in enumerate(part):
            im = Image.open(f) if isinstance(f, str) else f
            if im.mode == "RGBA":
                b = Image.new("RGBA", im.size, bg + (255,)); b.alpha_composite(im); im = b
            im = im.convert("RGB"); im.thumbnail((cell, cell))
            x, y = (i % cols) * cell, (i // cols) * (cell + 16)
            sh.paste(im, (x + (cell - im.width) // 2, y + 16 + (cell - im.height) // 2))
            d.text((x + 3, y + 2), label, fill=(255, 255, 255))
        o = os.path.join(WORK, "review", "%s_%d.jpg" % (name or group, n // per))
        sh.save(o, quality=80); outs.append(o)
    print("\n".join(outs))


# ------------------------------------------------------------------ tiling
def _seam_blend(a, b, feather=10):
    """a, b: float arrays (H, O, 3) covering the same strip. Returns a strip that equals b at its
    left edge and a at its right edge, switching along a minimum-error vertical seam."""
    H, O, _ = a.shape
    cost = ((a - b) ** 2).sum(2)
    k = np.ones(5) / 5
    cost = np.apply_along_axis(lambda r: np.convolve(r, k, 'same'), 1, cost)
    cost = np.apply_along_axis(lambda r: np.convolve(r, k, 'same'), 0, cost)
    acc = cost.copy()
    for y in range(1, H):
        p = acc[y - 1]
        m = np.minimum(p, np.minimum(np.r_[p[1:], np.inf], np.r_[np.inf, p[:-1]]))
        acc[y] += m
    lo, hi = feather, O - feather
    seam = np.zeros(H, int)
    seam[-1] = lo + int(np.argmin(acc[-1, lo:hi]))
    for y in range(H - 2, -1, -1):
        x = seam[y + 1]
        x0, x1 = max(lo, x - 1), min(hi, x + 2)
        seam[y] = x0 + int(np.argmin(acc[y, x0:x1]))
    xs = np.arange(O)[None, :]
    w = np.clip((xs - seam[:, None]) / feather * 0.5 + 0.5, 0, 1)[..., None]   # 0 -> b, 1 -> a
    w = w * w * (3 - 2 * w)
    return b * (1 - w) + a * w


def _best_period(img, lo, hi):
    """period T (lo..hi) along axis 1 whose wrap overlap matches best (for bricks, boards, furrows)."""
    g = np.asarray(Image.fromarray(img.astype(np.uint8)).convert("L").resize((img.shape[1] // 2, img.shape[0] // 4)), float)
    W = g.shape[1]
    best = None
    for T in range(lo // 2, hi // 2 + 1):
        O = W - T
        e = np.abs(g[:, :O] - g[:, T:T + O]).mean()
        if best is None or e < best[0]:
            best = (e, T * 2)
    return best[1]


def _wrap_x(img, T):
    O = img.shape[1] - T
    strip = _seam_blend(img[:, :O], img[:, T:T + O], feather=max(6, min(14, O // 6)))
    return np.concatenate([strip, img[:, O:T]], 1)


def make_tile(im, mode="quilt", size=1024, flatten=0.85):
    a = np.asarray(im.convert("RGB"), float)
    if flatten:   # take out the low-frequency lighting so the repeat does not show
        low = np.asarray(im.convert("RGB").filter(ImageFilter.GaussianBlur(im.width // 6)), float)
        a = np.clip(a - flatten * (low - low.mean((0, 1), keepdims=True)), 0, 255)
    if mode == "mirror":
        c = a[: a.shape[0] // 2 * 2, : a.shape[1] // 2 * 2]
        c = np.concatenate([c, c[:, ::-1]], 1)
        c = np.concatenate([c, c[::-1]], 0)
        return Image.fromarray(c.astype(np.uint8)).resize((size, size), Image.LANCZOS)
    n = a.shape[1]
    lo, hi = int(n * 0.70), int(n * 0.86)
    if mode == "quilt":
        tx = ty = int(n * 0.78)
    else:  # "period": search the repeat distance of a regular pattern
        tx = _best_period(a, lo, hi)
        ty = _best_period(a.transpose(1, 0, 2), lo, hi)
    a = _wrap_x(a, tx)
    a = _wrap_x(a.transpose(1, 0, 2), ty).transpose(1, 0, 2)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)


def textures(only=None):
    modes = jload(os.path.join(HERE, "tile_modes.json"))
    prev = []
    for slot, f in picked("textures").items():
        if only and slot not in only:
            continue
        mode = modes.get(slot, P.TEXTURES[slot][1])
        t = make_tile(Image.open(f), mode)
        save_webp(t, "textures/%s.webp" % slot, 80)
        meta_set("textures/" + slot, tile=mode)
        t2 = Image.new("RGB", (2048, 2048))
        for x in (0, 1024):
            for y in (0, 1024):
                t2.paste(t, (x, y))
        prev.append((slot + " " + mode, t2.resize((640, 640), Image.LANCZOS)))
    sheet("textures", cols=3, cell=640, files=prev, name="tiles" + ("_" + "_".join(only) if only else ""))


def sky():
    prev = []
    for slot, f in picked("sky").items():
        im = Image.open(f).convert("RGB")
        if slot == "sky_storm":   # the model keeps blue gaps in a "storm": grade it to a grey rain haze
            from PIL import ImageEnhance
            im = ImageEnhance.Brightness(ImageEnhance.Color(im).enhance(0.22)).enhance(0.74)
            im = Image.blend(im, Image.new("RGB", im.size, (96, 104, 116)), 0.18)
        a = np.asarray(im, float)
        O = im.width // 8
        T = im.width - O
        w = np.linspace(0, 1, O)[None, :, None]
        w = w * w * (3 - 2 * w)
        strip = a[:, T:] * (1 - w) + a[:, :O] * w
        a = np.concatenate([strip, a[:, O:T]], 1)
        out = Image.fromarray(a.astype(np.uint8)).resize((2048, 1024), Image.LANCZOS)
        save_webp(out, "sky/%s.webp" % slot, 84)
        r = Image.new("RGB", (2048, 1024)); r.paste(out, (-1024, 0)); r.paste(out, (1024, 0))   # seam in the middle
        prev.append((slot + " (seam centred)", r.resize((960, 480))))
    sheet("sky", cols=2, cell=960, files=prev, name="sky_wrap")


def scenes():
    for slot, f in picked("scenes").items():
        save_webp(Image.open(f).convert("RGB").resize((1344, 768), Image.LANCZOS), "scenes/%s.webp" % slot, 82)


def portraits():
    for slot, f in picked("sato_portraits").items():
        save_webp(Image.open(f).convert("RGB").resize((512, 640), Image.LANCZOS), "people/%s.webp" % slot, 88)


def sel(group):
    d = os.path.join(WORK, "sel", group)
    os.makedirs(d, exist_ok=True)
    for slot, f in picked(group).items():
        Image.open(f).save(os.path.join(d, slot + ".png"))


# ------------------------------------------------------------------ cut-outs
def masks(group):
    from comfy import Comfy
    c = Comfy()
    n = 0
    for slot, seeds in raws(group).items():
        for seed, f in seeds.items():
            if not f.endswith(".png"):
                continue
            d = os.path.join(WORK, "mask", group, os.path.basename(f))
            if os.path.exists(d):
                continue
            # ComfyUI names its files <prefix>_00001_.png
            try:
                c.fetch_file("%s__%d_00001_.png" % (slot, seed), "farm_cut/" + group, d)
                Image.open(d).verify(); n += 1
            except Exception:
                if os.path.exists(d):
                    os.remove(d)
    print("fetched", n, "mattes for", group)


def cutout(rgb, matte, shrink=1):
    """RGB on a plain background + matte -> clean RGBA (background colour unmixed from soft edges)."""
    a = np.asarray(matte.convert("L").resize(rgb.size), float) / 255.0
    if shrink:
        a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)), float) / 255.0
        a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), float) / 255.0
    a[a < 0.04] = 0
    c = np.asarray(rgb.convert("RGB"), float)
    bgm = a == 0
    bg = np.median(c[bgm], 0) if bgm.sum() > 100 else np.array([200.0] * 3)
    aa = np.clip(a, 0.12, 1)[..., None]
    soft = (a < 0.98)[..., None]
    fg = np.where(soft, (c - (1 - aa) * bg) / aa, c)
    out = np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def crop_fit(im, long_side, pad=2):
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 20)
    if not len(xs):
        return None, None
    x0, x1, y0, y1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, im.width), max(ys.min() - pad, 0), min(ys.max() + pad + 1, im.height)
    touch = xs.min() <= 1 or ys.min() <= 1 or xs.max() >= im.width - 2 or ys.max() >= im.height - 2
    im = im.crop((x0, y0, x1, y1))
    s = long_side / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    return im, touch


def anchor_of(im):
    a = np.asarray(im)[..., 3] > 60
    ys = np.where(a.any(1))[0]
    y = int(ys.max())
    band = a[max(0, y - max(3, im.height // 14)): y + 1]
    xs = np.where(band.any(0))[0]
    return [int(round((xs.min() + xs.max()) / 2)), y]


CENTRE_ONLY = {"crystal", "milk_m"}
CUT_SPEC = {"sprites": ("sprites", 512), "pallas": ("sprites", 512), "buildings": ("buildings", 1024), "people": ("people", 768), "people_views": ("people", 768), "icons": ("icons", 256)}


def cut(group, only=None):
    folder, long_side = CUT_SPEC[group]
    prev = []
    for slot, f in picked(group).items():
        if only and slot not in only:
            continue
        m = os.path.join(WORK, "mask", group, os.path.basename(f))
        if not os.path.exists(m):
            print("no matte yet:", slot); continue
        im = cutout(Image.open(f), Image.open(m))
        if group == "icons" and slot in CENTRE_ONLY:   # the model drew a rounded frame round the object: keep the middle piece
            from scipy import ndimage
            a = np.asarray(im).copy()
            lab, n = ndimage.label(a[..., 3] > 40)
            h, w = lab.shape
            keep = set(np.unique(lab[h * 3 // 8: h * 5 // 8, w * 3 // 8: w * 5 // 8])) - {0}
            a[..., 3][~np.isin(lab, list(keep))] = 0
            im = Image.fromarray(a, "RGBA")
        if group == "icons":
            im, touch = crop_fit(im, 236)
            if im is None:
                continue
            sq = Image.new("RGBA", (256, 256), (0, 0, 0, 0)); sq.alpha_composite(im, ((256 - im.width) // 2, (256 - im.height) // 2)); im = sq
            extra = {}
        elif group == "buildings":
            im, touch = crop_fit(im, 10 ** 6)
            s = 1024 / im.width
            im = im.resize((1024, round(im.height * s)), Image.LANCZOS)
            extra = {"anchor": [512, im.height - 1]}
        else:
            im, touch = crop_fit(im, 1024 if slot.startswith("sato") else long_side)
            if im is None:
                continue
            extra = {"anchor": anchor_of(im)}
        if touch:
            print("WARNING subject touches the frame edge:", slot)
        save_webp(im, "%s/%s.webp" % (folder, slot))
        meta_set("%s/%s" % (folder, slot), **extra)
        prev.append((slot + (" EDGE" if touch else ""), im))
    if prev:
        sheet(group, cols=6, cell=320, files=prev, name="cut_" + group + ("_" + "_".join(sorted(only))[:40] if only else ""))


# ------------------------------------------------------------------ video
def ffmpeg(*a):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)


def video():
    os.makedirs(os.path.join(ART, "video"), exist_ok=True)
    for slot, f in picked("video").items():
        dest = os.path.join(ART, "video", slot + ".mp4")
        ffmpeg("-i", f, "-vf", "scale=832:480:flags=lanczos,fps=16", "-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-crf", "26",
               "-movflags", "+faststart", "-an", dest)
        meta_set("video/" + slot, fps=16, frames=81, loop=False)
        d = os.path.join(WORK, "review", "vid_" + slot); os.makedirs(d, exist_ok=True)
        ffmpeg("-i", dest, "-vf", "select='eq(n,0)+eq(n,40)+eq(n,80)',scale=416:240,tile=3x1", "-vsync", "0", "-frames:v", "1", os.path.join(d, "strip.jpg"))
        print(os.path.join(d, "strip.jpg"))


def walkref():
    """Start frames for the walk clips: the cut-out person on flat grey, 480x832, feet on a fixed baseline."""
    d = os.path.join(WORK, "walkref"); os.makedirs(d, exist_ok=True)
    for v in ("front", "back", "side"):
        src = os.path.join(ART, "people", "sato_%s.webp" % v)
        if not os.path.exists(src):
            continue
        im = Image.open(src).convert("RGBA")
        s = 640 / im.height
        im = im.resize((round(im.width * s), 640), Image.LANCZOS)
        bg = Image.new("RGBA", (480, 832), (150, 150, 150, 255))
        bg.alpha_composite(im, ((480 - im.width) // 2, 760 - im.height))
        bg.convert("RGB").save(os.path.join(d, "sato_%s.png" % v))


def walk_frames(name):
    """extract the frames of the picked raw clip -> <work>/walk/<name>/f_###.png ; returns the list"""
    f = picked("walk").get(name) or picked("action").get(name)
    d = os.path.join(WORK, "walk", name); os.makedirs(d, exist_ok=True)
    if not glob.glob(os.path.join(d, "f_*.png")):
        ffmpeg("-i", f, os.path.join(d, "f_%03d.png"))
    return sorted(glob.glob(os.path.join(d, "f_*.png")))


def walk(name, nframes=14, fh=384, fps=None, span=None):
    """frames + mattes (<work>/walk/<name>/m_###.png) -> a looping sprite sheet in art/farm/people/."""
    fr = walk_frames(name)
    d = os.path.dirname(fr[0])
    cut = []
    for f in fr:
        m = f.replace("f_", "m_")
        if not os.path.exists(m):
            sys.exit("missing matte " + m)
        cut.append(cutout(Image.open(f), Image.open(m)))
    # silhouettes at low resolution, aligned on feet baseline and body centre
    def norm(im):
        a = np.asarray(im)[..., 3] > 80
        ys = np.where(a.any(1))[0]; xs = np.where(a.any(0))[0]
        top = a[ys.min(): ys.min() + (ys.max() - ys.min()) // 2]
        cx = np.where(top.any(0))[0]
        return int(round(np.average(np.arange(a.shape[1]), weights=top.sum(0)))), int(ys.max()), int(ys.min())
    info = [norm(c) for c in cut]
    H = max(b - t for _, b, t in info) + 4
    Wd = 0
    for c, (cx, b, t) in zip(cut, info):
        xs = np.where((np.asarray(c)[..., 3] > 80).any(0))[0]
        Wd = max(Wd, cx - xs.min(), xs.max() - cx)
    W = 2 * Wd + 6
    al = []
    for c, (cx, b, t) in zip(cut, info):
        fr_ = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        fr_.alpha_composite(c, (W // 2 - cx, H - 2 - b)) if (W // 2 - cx) >= 0 and (H - 2 - b) >= 0 else fr_.paste(c, (W // 2 - cx, H - 2 - b))
        al.append(fr_)
    small = [np.asarray(f.resize((48, 96)).convert("RGBA"), float) / 255 for f in al]
    small = [s[..., :3] * s[..., 3:] for s in small]
    if span:
        i0, j0 = span
    else:
        best = None
        for i in range(4, len(al) - 12):
            for j in range(i + 12, min(len(al) - 1, i + 44)):
                e = np.abs(small[i] - small[j]).mean() + np.abs(small[i + 1] - small[j + 1]).mean() + 0.5 * np.abs(small[i - 1] - small[j - 1]).mean()
                e *= 1 + 0.004 * abs((j - i) - 20)
                if best is None or e < best[0]:
                    best = (e, i, j)
        _, i0, j0 = best
    L = j0 - i0
    n = min(nframes, L)
    idx = [i0 + int(round(k * L / n)) for k in range(n)]
    s = fh / H
    fw = int(round(W * s)); fw += fw % 2
    if fw > 256:
        s = 256 / W; fw = 256; fh = int(round(H * s))
    sheet_im = Image.new("RGBA", (fw * n, fh), (0, 0, 0, 0))
    for k, i in enumerate(idx):
        f = al[i].resize((fw, fh), Image.LANCZOS)
        sheet_im.alpha_composite(f, (k * fw, 0))
    save_webp(sheet_im, "people/%s.webp" % name)
    clip_fps = 16.0
    out_fps = fps or round(n / (L / clip_fps), 2)
    meta_set("people/" + name, frames=n, cols=n, fw=fw, fh=fh, fps=out_fps, anchor=[fw // 2, fh - 1 - int(round(2 * s))], loop=[i0, j0])
    print(name, "loop", i0, j0, "frames", n, "fw", fw, "fh", fh, "fps", out_fps)
    # review: the sheet on a checker colour plus an animated gif
    os.makedirs(os.path.join(WORK, "review"), exist_ok=True)
    bg = Image.new("RGBA", sheet_im.size, (90, 110, 90, 255)); bg.alpha_composite(sheet_im)
    o = os.path.join(WORK, "review", name + "_sheet.jpg"); bg.convert("RGB").save(o, quality=85); print(o)


# ------------------------------------------------------------------ manifest
def manifest():
    meta = jload(META)
    files = {}
    for f in sorted(glob.glob(os.path.join(ART, "*", "*.webp")) + glob.glob(os.path.join(ART, "video", "*.mp4"))):
        rel = os.path.relpath(f, ART).replace(os.sep, "/")
        if rel.startswith("models/"):
            continue
        key = os.path.splitext(rel)[0]
        e = {"file": rel}
        if f.endswith(".webp"):
            with Image.open(f) as im:
                e["w"], e["h"] = im.size
        else:
            e["w"], e["h"] = 832, 480
        e.update({k: v for k, v in meta.get(key, {}).items() if v is not None})
        files[key] = e
    json.dump({"version": 1, "files": files}, open(os.path.join(ART, "manifest.json"), "w"), indent=1)
    tot = sum(os.path.getsize(os.path.join(ART, e["file"])) for e in files.values())
    print("manifest: %d files, %.1f MB" % (len(files), tot / 1e6))


if __name__ == "__main__":
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "sheet":
        sheet(args[0], cols=int(args[1]) if len(args) > 1 else 6, cell=int(args[2]) if len(args) > 2 else 320)
    elif cmd == "textures":
        textures(set(args) or None)
    elif cmd in ("sky", "scenes", "video", "walkref", "manifest", "portraits"):
        globals()[cmd]()
    elif cmd in ("sel", "masks"):
        globals()[cmd](args[0])
    elif cmd == "cut":
        cut(args[0], set(args[1:]) or None)
    elif cmd == "walk":
        walk(args[0], **{k: (tuple(map(int, v.split("-"))) if k == "span" else int(v)) for k, v in (a.split("=") for a in args[1:])})
    else:
        sys.exit(__doc__)
