#!/usr/bin/env python3
"""Runs ON THE POD (in a venv with rembg): writes an alpha matte next to ComfyUI's outputs.
  /workspace/rb/bin/python pod_cut.py <group> [<group> ...]   # farm/<group>/*.png -> farm_cut/<group>/<name>.png (8-bit matte)
Parallel-safe: skips mattes that exist; run several copies with --part i/n."""
import sys, os, glob
from PIL import Image
from rembg import new_session, remove

OUT = "/workspace/runpod-slim/ComfyUI/output"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
part = next((a.split("=")[1] for a in sys.argv[1:] if a.startswith("--part=")), "0/1")
pi, pn = map(int, part.split("/"))
model = next((a.split("=")[1] for a in sys.argv[1:] if a.startswith("--model=")), "birefnet-general")
sess = new_session(model)
for g in args:
    files = sorted(glob.glob(os.path.join(OUT, "farm", g, "*.png")))
    os.makedirs(os.path.join(OUT, "farm_cut", g), exist_ok=True)
    for n, f in enumerate(files):
        if n % pn != pi:
            continue
        d = os.path.join(OUT, "farm_cut", g, os.path.basename(f))
        if os.path.exists(d):
            continue
        m = remove(Image.open(f).convert("RGB"), session=sess, only_mask=True)
        m.save(d + ".tmp.png"); os.replace(d + ".tmp.png", d)
        print("cut", g, os.path.basename(f), flush=True)
print("CUTDONE", flush=True)
