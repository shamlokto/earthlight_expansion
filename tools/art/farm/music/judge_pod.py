# runs on the pod: per file, demucs vocal-stem share + CLAP similarity to a few descriptions
import sys, os, subprocess, json, glob, numpy as np, torch
from demucs.pretrained import get_model
from demucs.apply import apply_model
from transformers import ClapModel, ClapProcessor
P = '/workspace/music_helper/hfcache/hub/models--laion--clap-htsat-unfused/snapshots/'
P = P + os.listdir(P)[0]
clap = ClapModel.from_pretrained(P).cuda().eval(); proc = ClapProcessor.from_pretrained(P)
dm = get_model('htdemucs'); dm.eval().cuda()
LAB = ["a person singing, vocals, voice", "humming or choir voices", "calm cosy acoustic instrumental music", "gentle solo piano",
       "acoustic guitar", "accordion and ukulele folk", "taiko drums and bamboo flute", "music box lullaby", "ambient synthesizer pads",
       "harsh noisy distorted audio", "loud electronic dance music", "heavy rock with electric guitar", "scary horror music"]
desc = json.loads(sys.argv[1]); files = sys.argv[2:]
with torch.no_grad():
    t = proc(text=LAB + list(desc.values()), return_tensors='pt', padding=True)
    te = clap.get_text_features(**{k: v.cuda() for k, v in t.items()}); te = getattr(te, 'pooler_output', te); te = te / te.norm(dim=-1, keepdim=True)
def load(f, sr):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '2', '-ar', str(sr), '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.copy()
for f in sorted(files):
    name = os.path.basename(f).split('__')[0]
    w = torch.from_numpy(load(f, dm.samplerate))
    with torch.no_grad(): out = apply_model(dm, w[None].cuda(), device='cuda', split=True, overlap=0.1)[0]
    v = out[dm.sources.index('vocals')]; tot = out.sum(0); e = lambda x: float((x ** 2).mean())
    fr = dm.samplerate; n = v.shape[-1] // fr
    hot = sum(1 for k in range(n) if e(v[:, k*fr:(k+1)*fr]) > 0.15 * e(tot[:, k*fr:(k+1)*fr]) + 1e-9)
    m = load(f, 48000).mean(0); seg = [m[i:i + 480000] for i in range(0, max(1, len(m) - 240000), 480000)]
    with torch.no_grad():
        a = proc(audio=seg, sampling_rate=48000, return_tensors='pt')
        ae = clap.get_audio_features(**{k: v2.cuda() for k, v2 in a.items()}); ae = getattr(ae, 'pooler_output', ae); ae = ae / ae.norm(dim=-1, keepdim=True)
        sim = (ae @ te.T).mean(0).cpu().numpy()
    names = LAB + list(desc)
    own = sim[len(LAB) + list(desc).index(name)] if name in desc else float('nan')
    top = sorted(zip(sim[:len(LAB)], LAB), reverse=True)[:3]
    print(json.dumps({'file': os.path.basename(f), 'vocal': round(e(v) / (e(tot) + 1e-12), 3), 'vocal_hot_s': hot, 'secs': n,
                      'sing': round(float(sim[0]), 3), 'hum': round(float(sim[1]), 3), 'cosy': round(float(sim[2]), 3), 'own': round(float(own), 3),
                      'noise': round(float(sim[9]), 3), 'top': [[round(float(s), 3), l] for s, l in top]}), flush=True)
