#!/usr/bin/env python3
"""harvest.py RAWDIR SHOTDIR : fetch every finished GLB not yet in RAWDIR from the pod (ComfyUI output/mesh3d),
render the four-view check for each (render.mjs; needs the repo served on :8765) and stack the renders into
contact sheets SHOTDIR/sheet_<n>.jpg (8 models per sheet). Prints the new stems. Needs COMFY_URL.
The list of finished models is read from output/mesh3d/done.txt (one stem per line; see pod `done` loop in README).
"""
import os, sys, subprocess, requests, shutil, time
from PIL import Image, ImageDraw
raw, shots = sys.argv[1:3]
for s in sys.argv[3:]:            # extra args: stems to fetch again (regenerated on the pod)
    for e in ('glb', 'json'):
        if os.path.exists(os.path.join(raw, f'{s}.{e}')): os.remove(os.path.join(raw, f'{s}.{e}'))
U = os.environ['COMFY_URL'].rstrip('/')
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
tmp = os.path.join(ROOT, 'art/farm/models/_tmp'); os.makedirs(tmp, exist_ok=True)
def get(fn):
    r = requests.get(U + '/view', params={'filename': fn, 'subfolder': 'mesh3d', 'type': 'output'}); return r.content if r.ok else None
done = (get('done.txt') or b'').decode().split()
new = [s for s in done if not os.path.exists(os.path.join(raw, s + '.glb'))]
for s in new:
    for e in ('glb', 'json'):
        b = get(f'{s}.{e}')
        if b: open(os.path.join(raw, f'{s}.{e}'), 'wb').write(b)
new = [s for s in new if os.path.exists(os.path.join(raw, s + '.glb'))]
for s in new:
    shutil.copyfile(os.path.join(raw, s + '.glb'), os.path.join(tmp, s + '.glb'))
if new:
    import json, re
    P = json.load(open(os.path.join(HERE, 'prompts.json')))
    chars = [s for s in new if P.get(re.sub(r'e?_s\d+$', '', s), {}).get('kind') == 'char']; rest = [s for s in new if s not in chars]
    for group, extra in ((rest, {}), (chars, {'CHR': '1'})):   # characters get the face close-up framing
        if group: subprocess.run(['node', os.path.join(HERE, 'render.mjs'), shots] + group, env=dict(os.environ, DIR='/art/farm/models/_tmp', **extra), stdout=subprocess.DEVNULL)
    for s in new:
        if os.path.exists(os.path.join(tmp, s + '.glb')): os.remove(os.path.join(tmp, s + '.glb'))
    t = int(time.time())
    for i in range(0, len(new), 8):
        part = new[i:i + 8]; sheet = Image.new('RGB', (1280, 220 * ((len(part) + 1) // 2)), 'white')
        for j, s in enumerate(part):
            im = Image.open(os.path.join(shots, s + '.png')).resize((640, 220)); ImageDraw.Draw(im).text((6, 4), s, fill='yellow')
            sheet.paste(im, ((j % 2) * 640, (j // 2) * 220))
        p = os.path.join(shots, f'sheet_{t}_{i // 8}.jpg'); sheet.save(p, quality=88); print('SHEET', p, ' '.join(part))
print('new:', len(new), 'total done:', len(done))
