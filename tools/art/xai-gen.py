# Generates pictures with xAI's image model (XAI_API_KEY in the environment) for the expansion's
# own art (tools/art/kai-refits.mjs). With reference pictures it uses the edits endpoint, so the
# results follow the style of the expansion's existing pictures.
#   python3 tools/art/xai-gen.py OUTPREFIX N PROMPTFILE [REF.png ...]
# Every image counts against a budget of 100 kept in $XAI_QUOTA (a small counter file), if set.
import sys, json, base64, subprocess, os
out, n, pf, refs = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4:]
cnt = os.environ.get('XAI_QUOTA')
used = int(open(cnt).read()) if cnt and os.path.exists(cnt) else 0
if used + n > 100: sys.exit(f'quota: {used} used, {n} more would exceed 100')
prompt = open(pf).read().strip()
body = {"model": os.environ.get('XMODEL', 'grok-imagine-image-quality'), "prompt": prompt, "n": n, "response_format": "b64_json"}
if os.environ.get('XASPECT'): body["aspect_ratio"] = os.environ['XASPECT']   # e.g. 3:4 for a fight hull
url = 'https://api.x.ai/v1/images/generations'
if refs:
    url = 'https://api.x.ai/v1/images/edits'
    imgs = [{"url": "data:image/png;base64," + base64.b64encode(open(r, 'rb').read()).decode(), "type": "image_url"} for r in refs]
    body["image"] = imgs[0] if len(imgs) == 1 else None
    if len(imgs) > 1: body.pop("image"); body["images"] = imgs
jf = out + '.req.json'; json.dump(body, open(jf, 'w'))
r = subprocess.run(['curl', '-sS', url, '-H', 'Authorization: Bearer ' + os.environ['XAI_API_KEY'], '-H', 'Content-Type: application/json', '--data-binary', '@' + jf], capture_output=True, text=True)
os.remove(jf)
try: d = json.loads(r.stdout)
except Exception: sys.exit('bad response: ' + r.stdout[:500] + r.stderr[:500])
if 'data' not in d: sys.exit('error: ' + r.stdout[:800])
for i, im in enumerate(d['data']):
    p = f'{out}-{i}.png' if not im.get('b64_json', '').startswith('/9j') else f'{out}-{i}.jpg'
    open(p, 'wb').write(base64.b64decode(im['b64_json'])); print(p)
used += len(d['data']); print('images used', used)
if cnt: open(cnt, 'w').write(str(used))
