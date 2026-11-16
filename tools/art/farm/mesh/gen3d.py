#!/usr/bin/env python3
"""Image -> textured, web-sized GLB with Hunyuan3D-2 (shape turbo + paint). Runs on the GPU pod.

  python gen3d.py NAME[:TRIS[:SEED[:YAW[:SRC[:OPTS]]]]] ...   (YAW: auto | none | degrees; SRC: input file stem, default NAME;
                                            OPTS: 'h' = normalise by height, 't2048' or 't512' = texture size (default 1024),
                                            'v768' = paint views at 768 px (default 512))
  python gen3d.py --watch                    worker: takes the same specs from $H3D_QUEUE/*.job
                                            reads  $H3D_IN/NAME.png   (one object on white)
                                            writes $H3D_OUT/NAME.glb  (+ NAME_cut.png, the cut-out fed to the model)

Output GLB: Y up, standing on y=0, centred on x/z, front +Z, longest side 1 unit,
<= TRIS triangles, one 1024x1024 JPEG base-colour texture, no extensions.
"""
import os, sys, io, time, json, re
os.environ.setdefault('HF_HOME', '/root/h3d_hf')
import numpy as np, torch, trimesh
from PIL import Image

IN = os.environ.get('H3D_IN', '/workspace/h3d/in')
OUT = os.environ.get('H3D_OUT', '/workspace/runpod-slim/ComfyUI/output/mesh3d')
TEX = int(os.environ.get('H3D_TEX', '1024'))
os.makedirs(OUT, exist_ok=True)

from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline, FaceReducer, FloaterRemover, DegenerateFaceRemover
from hy3dgen.texgen import Hunyuan3DPaintPipeline
from hy3dgen.rembg import BackgroundRemover

t0 = time.time()
shape = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
    'tencent/Hunyuan3D-2', subfolder='hunyuan3d-dit-v2-0-turbo', variant='fp16', use_safetensors=True)
shape.enable_flashvdm()
paint = Hunyuan3DPaintPipeline.from_pretrained('tencent/Hunyuan3D-2', subfolder='hunyuan3d-paint-v2-0')
rembg = BackgroundRemover()
print('models loaded in %.0fs, vram %.1f GB' % (time.time() - t0, torch.cuda.memory_allocated() / 1e9), flush=True)


def cutout(img):
    """White-background picture -> RGBA cut-out.

    rembg alone sometimes drops pale parts (a straw hat on white), so the mask is the union of rembg and a
    flood fill of the smooth backdrop from the picture's border (floating range, stops at the object's edge).
    """
    import cv2
    rgb = np.array(img.convert('RGB'))
    a_rembg = np.array(rembg(img.convert('RGB')))[:, :, 3] > 100
    blur = cv2.GaussianBlur(rgb, (5, 5), 0)
    h, w = blur.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    seeds = [(x, y) for x in range(0, w, 8) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 8) for x in (0, w - 1)]
    for s in seeds:
        if mask[s[1] + 1, s[0] + 1] == 0:
            cv2.floodFill(blur, mask, s, 0, (2, 2, 2), (2, 2, 2), 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    fg = mask[1:-1, 1:-1] == 0
    fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
    if fg.mean() > 0.75 or fg.sum() < 0.5 * a_rembg.sum():      # flood fill failed (busy backdrop / leak): trust rembg
        fg = a_rembg
    else:
        n, lab, stats, _ = cv2.connectedComponentsWithStats((fg | a_rembg).astype(np.uint8), 8)
        keep = np.zeros_like(fg)
        for i in range(1, n):                                    # keep blobs that rembg also believes in, drop specks
            m = lab == i
            if stats[i, cv2.CC_STAT_AREA] > 400 and (a_rembg & m).sum() > 0.15 * m.sum(): keep |= m
        fg = keep if keep.any() else a_rembg
        fg &= ~((rgb.min(2) > 226) & ~a_rembg)                    # near-white bits rembg calls backdrop (gap between the legs)
    alpha = cv2.GaussianBlur(fg.astype(np.uint8) * 255, (3, 3), 0)
    return Image.fromarray(np.dstack([rgb, alpha]))


def align_yaw(mesh):
    """Rotate about Y by the smallest angle that makes the footprint axis-aligned (min-area box)."""
    v = mesh.vertices[:, [0, 2]]
    best = (1e9, 0.0)
    for deg in np.arange(-12, 12.01, 0.5):
        r = np.radians(deg); c, s = np.cos(r), np.sin(r)
        x = v[:, 0] * c - v[:, 1] * s; z = v[:, 0] * s + v[:, 1] * c
        area = (np.percentile(x, 99.5) - np.percentile(x, 0.5)) * (np.percentile(z, 99.5) - np.percentile(z, 0.5))
        if area < best[0] - 1e-9: best = (area, deg)
    return best[1]


def finish(mesh, name, yaw_mode, opts=''):
    tex_size = 2048 if 't2048' in opts else 512 if 't512' in opts else TEX
    tex = mesh.visual.material
    img = getattr(tex, 'image', None) or getattr(tex, 'baseColorTexture', None)
    img = img.convert('RGB').resize((tex_size, tex_size), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, 'JPEG', quality=86, optimize=True); buf.seek(0)
    jpg = Image.open(buf); jpg.load()
    uv = np.asarray(mesh.visual.uv)
    v = np.asarray(mesh.vertices, dtype=np.float64).copy()
    m = trimesh.Trimesh(vertices=v, faces=np.asarray(mesh.faces), process=False)
    deg = 0.0
    if yaw_mode == 'auto':
        deg = align_yaw(m)
    elif yaw_mode not in ('none', ''):
        deg = float(yaw_mode)
    if deg:
        r = np.radians(deg); c, s = np.cos(r), np.sin(r)
        x = v[:, 0] * c - v[:, 2] * s; z = v[:, 0] * s + v[:, 2] * c
        v[:, 0], v[:, 2] = x, z
    lo, hi = v.min(0), v.max(0)
    scale = 1.0 / ((hi - lo)[1] if 'h' in opts else (hi - lo).max())   # 'h': characters are normalised by height
    v[:, 0] -= (lo[0] + hi[0]) / 2; v[:, 2] -= (lo[2] + hi[2]) / 2; v[:, 1] -= lo[1]
    v *= scale
    mat = trimesh.visual.material.PBRMaterial(baseColorTexture=jpg, metallicFactor=0.0, roughnessFactor=0.9,
                                              baseColorFactor=[255, 255, 255, 255], name=name)
    out = trimesh.Trimesh(vertices=v.astype(np.float32), faces=np.asarray(mesh.faces), process=False,
                          visual=trimesh.visual.TextureVisuals(uv=uv, material=mat))
    out.vertex_normals  # compute smooth normals so three.js does not have to
    p = os.path.join(OUT, name + '.glb')
    scene = trimesh.Scene(); scene.add_geometry(out, geom_name=name, node_name=name)
    data = scene.export(file_type='glb', include_normals=True)
    open(p, 'wb').write(data)
    size = (v.max(0) - v.min(0)).round(4).tolist()
    return dict(file=name + '.glb', tris=int(len(out.faces)), size=size, bytes=len(data), yaw=deg)


def run(spec):
    parts = spec.split(':')
    name = parts[0]
    tris = int(parts[1]) if len(parts) > 1 and parts[1] else 20000
    seed = int(parts[2]) if len(parts) > 2 and parts[2] else 12345
    yaw = parts[3] if len(parts) > 3 and parts[3] else 'auto'
    srcname = parts[4] if len(parts) > 4 and parts[4] else name
    opts = parts[5] if len(parts) > 5 else ''
    try:
        t = time.time()
        src = Image.open(os.path.join(IN, srcname + '.png'))
        img = cutout(src) if src.mode != 'RGBA' else src
        img.save(os.path.join(OUT, name + '_cut.png'))
        mesh = shape(image=img, num_inference_steps=8, octree_resolution=380, num_chunks=20000,
                     generator=torch.manual_seed(seed), output_type='trimesh')[0]
        t1 = time.time()
        for f in (FloaterRemover(), DegenerateFaceRemover()):
            mesh = f(mesh)
        mesh = FaceReducer()(mesh, max_facenum=tris)
        m = re.search(r'v(\d+)', opts)   # 'v768': paint views at 768 px instead of 512 (sharper faces, slower)
        paint.models['multiview_model'].view_size = int(m.group(1)) if m else 512
        mesh = paint(mesh, image=img)
        t2 = time.time()
        info = finish(mesh, name, yaw, opts)
        info.update(shape_s=round(t1 - t, 1), paint_s=round(t2 - t1, 1), seed=seed,
                    vram_peak_gb=round(torch.cuda.max_memory_allocated() / 1e9, 1))
        json.dump(info, open(os.path.join(OUT, name + '.json'), 'w'))
        print('DONE', name, json.dumps(info), flush=True)
    except Exception as e:
        import traceback; traceback.print_exc()
        print('FAIL', name, e, flush=True)


if sys.argv[1:] == ['--watch']:
    # worker mode: every file $H3D_QUEUE/*.job holds one spec; processed in name order, then removed
    Q = os.environ.get('H3D_QUEUE', '/workspace/h3d/queue'); os.makedirs(Q, exist_ok=True)
    print('watching', Q, flush=True)
    while not os.path.exists(os.path.join(Q, 'STOP')):
        jobs = sorted(f for f in os.listdir(Q) if f.endswith('.job'))
        if not jobs:
            time.sleep(2); continue
        p = os.path.join(Q, jobs[0]); spec = open(p).read().strip(); os.remove(p)
        run(spec)
else:
    for spec in sys.argv[1:]:
        run(spec)
