#!/usr/bin/env python3
"""Local (CPU) fallback for pod_cut.py: alpha mattes for raws that have none yet.
  python3 local_cut.py <group> [model]      model: isnet-general-use (fast, default) | birefnet-general (best, slow)
Writes $FARM_ART_WORK/mask/<group>/<raw name>.png, the same place `post.py masks` downloads to."""
import glob, os, sys
from PIL import Image
from rembg import new_session, remove

WORK = os.environ.get("FARM_ART_WORK", "/tmp/farm-art")
group = sys.argv[1]
sess = new_session(sys.argv[2] if len(sys.argv) > 2 else "isnet-general-use")
os.makedirs(os.path.join(WORK, "mask", group), exist_ok=True)
for f in sorted(glob.glob(os.path.join(WORK, "raw", group, "*.png"))):
    d = os.path.join(WORK, "mask", group, os.path.basename(f))
    if os.path.exists(d):
        continue
    remove(Image.open(f).convert("RGB"), session=sess, only_mask=True).save(d)
    print("cut", os.path.basename(f), flush=True)
