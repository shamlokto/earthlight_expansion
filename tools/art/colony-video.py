# Makes a short clip for one of the colony's big moments (docs/COLONY-V4.md §4, D26) with xAI's
# image-to-video model, from the moment's still (so the clip matches the game's art), then compacts it
# with ffmpeg: H.264, no audio (the game plays its own music), web fast-start.
#   python3 tools/art/colony-video.py STILL PROMPTFILE OUT.mp4 [--seconds 8] [--model grok-imagine-video-1.5]
# Needs XAI_API_KEY. Each clip is counted in tools/art/colony/videos.txt (the owner allowed "a few").
import sys, json, base64, subprocess, os, time, argparse, tempfile

ap = argparse.ArgumentParser()
ap.add_argument('still'); ap.add_argument('prompt'); ap.add_argument('out')
ap.add_argument('--seconds', type=int, default=8)
ap.add_argument('--model', default='grok-imagine-video-1.5')
ap.add_argument('--resolution', default='720p')
ap.add_argument('--crf', default='27')
a = ap.parse_args()

COUNT = os.path.join(os.path.dirname(__file__), 'colony', 'videos.txt')
used = int(open(COUNT).read()) if os.path.exists(COUNT) else 0
if used >= 5: sys.exit(f'videos: {used} made already; the owner allowed a few, ask before more')

KEY = os.environ['XAI_API_KEY']
def api(method, url, body=None):
    args = ['curl', '-sS', '-X', method, url, '-H', 'Authorization: Bearer ' + KEY]
    if body is not None:
        jf = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(body, jf); jf.close()
        args += ['-H', 'Content-Type: application/json', '--data-binary', '@' + jf.name]
    r = subprocess.run(args, capture_output=True, text=True)
    if body is not None: os.remove(jf.name)
    try: return json.loads(r.stdout)
    except Exception: sys.exit('bad response: ' + r.stdout[:600] + r.stderr[:300])

ext = os.path.splitext(a.still)[1].lower().lstrip('.')
mime = {'jpg': 'jpeg', 'jpeg': 'jpeg', 'png': 'png', 'webp': 'webp'}[ext]
image = f'data:image/{mime};base64,' + base64.b64encode(open(a.still, 'rb').read()).decode()
body = {'model': a.model, 'prompt': open(a.prompt).read().strip(), 'image': {'url': image},
        'duration': a.seconds, 'resolution': a.resolution, 'generate_audio': False}
d = api('POST', 'https://api.x.ai/v1/videos/generations', body)
rid = d.get('request_id')
if not rid: sys.exit('no request id: ' + json.dumps(d)[:800])
print('request', rid, flush=True)
open(COUNT, 'w').write(str(used + 1))   # counted once submitted
for _ in range(120):
    time.sleep(8)
    d = api('GET', f'https://api.x.ai/v1/videos/{rid}')
    st = d.get('status')
    if st == 'done': break
    if st == 'failed' or d.get('error'): sys.exit('failed: ' + json.dumps(d)[:800])
else: sys.exit('timed out waiting for ' + rid)
url = d['video']['url']
raw = a.out + '.raw.mp4'
subprocess.run(['curl', '-sS', '-o', raw, url], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', a.crf,
                '-pix_fmt', 'yuv420p', '-vf', 'scale=-2:720', '-movflags', '+faststart', a.out], check=True)
print(a.out, os.path.getsize(a.out) // 1024, 'KB; raw kept at', raw, f'({os.path.getsize(raw) // 1024} KB)')
