#!/usr/bin/env python3
"""items.py id ... : concept pictures for small 3D item models, made with Qwen-Image-Edit from the item's own
icon (art/farm/icons/<id>.webp) so the model matches the icon. Output: ComfyUI output/mesh3d_in/<id>_<seed>_00001_.png
(seed 1 unless --seed N). Needs COMFY_URL; COMFY_FRONT=1 puts the jobs at the front of the queue."""
import io, os, sys, json, time, requests
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concept import edit_graph
URL = os.environ['COMFY_URL'].rstrip('/')
ICONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'art', 'farm', 'icons')
TEXT = ("Turn this illustration into a smooth stylised 3D render of exactly the same single object, like a cute hand-painted anime collectible figurine: "
        "the same shape, colours and details, chunky simplified forms, smooth matte painted surfaces, soft cel shading. Only the object itself, nothing else, no hands, no face, no eyes. "
        "Seen from the front and slightly above, the whole object visible and centred. Soft even studio lighting, no cast shadow, isolated on a plain pure white background, no text.")
a = sys.argv[1:]; seed = 1
if a and a[0] == '--seed': seed = int(a[1]); a = a[2:]
ids = []
for n in a:
    im = Image.open(os.path.join(ICONS, n + '.webp')).convert('RGBA')
    bg = Image.new('RGB', (1024, 1024), 'white'); s = 800 / max(im.size); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    bg.paste(im, ((1024 - im.width) // 2, (1024 - im.height) // 2), im); b = io.BytesIO(); bg.save(b, 'PNG'); b.seek(0)
    up = requests.post(URL + '/upload/image', files={'image': ('item_' + n + '.png', b)}, data={'overwrite': 'true'}).json()['name']
    r = requests.post(URL + '/prompt', json={"prompt": edit_graph(TEXT, seed, f"mesh3d_in/{n}_{seed}", up), **({"front": True} if os.environ.get('COMFY_FRONT') else {})})
    r.raise_for_status(); ids.append(n)
print('queued', len(ids))
