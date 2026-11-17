#!/usr/bin/env python3
"""autoq.py (pod): turn every new concept picture into a job for `gen3d.py --watch`.

Watches ComfyUI's output/mesh3d_in/<name>_<seed>_00001_.png; for names found in prompts.json it copies the
picture to $H3D_IN/<name>_s<seed>.png and writes a job `<name>_s<seed>:<tris>:::<name>_s<seed>:<opts>`,
named so that the worker takes them in prompts.json order. Pictures present at start are skipped
unless listed in $AUTOQ_INCLUDE (comma-separated prefixes).
"""
import os, json, time, shutil, re
SRC = '/workspace/runpod-slim/ComfyUI/output/mesh3d_in'
IN = os.environ.get('H3D_IN', '/workspace/h3d/in'); Q = os.environ.get('H3D_QUEUE', '/workspace/h3d/queue')
HERE = os.path.dirname(os.path.abspath(__file__))
inc = [x for x in os.environ.get('AUTOQ_INCLUDE', '').split(',') if x]
seen = set(f for f in os.listdir(SRC) if not any(f.startswith(p) for p in inc))
while True:
    P = json.load(open(os.path.join(HERE, 'prompts.json'))); order = [k for k in P if not k.startswith('_')]
    for f in sorted(os.listdir(SRC)):
        m = re.match(r'(.+)_(\d+)_00001_\.png$', f)
        if f in seen or not m or m.group(1) not in P: continue
        if time.time() - os.path.getmtime(os.path.join(SRC, f)) < 1.5: continue
        seen.add(f); name, seed = m.group(1), m.group(2); stem = f'{name}_s{seed}'
        shutil.copyfile(os.path.join(SRC, f), os.path.join(IN, stem + '.png'))
        yaw = 'none' if P[name].get('kind') == 'char' else ''      # figurines are drawn straight from the front
        spec = f"{stem}:{P[name]['tris']}::{yaw}:{stem}:{P[name].get('opts', '')}"
        open(os.path.join(Q, f'{order.index(name):03d}_{stem}.job'), 'w').write(spec)
        print('queued', spec, flush=True)
    time.sleep(2)
