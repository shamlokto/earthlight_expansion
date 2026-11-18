#!/usr/bin/env python3
"""Generate the farm music on a ComfyUI server with ACE-Step v1 (3.5B, all-in-one checkpoint).

  COMFY_URL=https://<pod>-8188.proxy.runpod.net python3 gen.py [--only title,spring] [--seeds 1] [--seconds N]

Keeps at most 3 of our jobs pending, queues normally (never at the front), and downloads
each result to $FARM_MUSIC_WORK/raw/<name>__<seed>.flac (default /tmp/farm-music).
"""
import argparse, json, os, sys, time, random
import requests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prompts import TRACKS, SECONDS, DEFAULT_SECONDS, TWO, tags, LYRICS

URL = (os.environ.get("COMFY_URL") or "").rstrip("/")
WORK = os.environ.get("FARM_MUSIC_WORK", "/tmp/farm-music")
CKPT = "ace_step_v1_3.5b.safetensors"


def graph(name, seed, seconds, steps=50):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "2": {"class_type": "ModelSamplingSD3", "inputs": {"model": ["1", 0], "shift": 5.0}},
        "3": {"class_type": "LatentOperationTonemapReinhard", "inputs": {"multiplier": 1.0}},
        "4": {"class_type": "LatentApplyOperationCFG", "inputs": {"model": ["2", 0], "operation": ["3", 0]}},
        "5": {"class_type": "TextEncodeAceStepAudio", "inputs": {"clip": ["1", 1], "tags": tags(name), "lyrics": LYRICS, "lyrics_strength": 0.99}},
        "6": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["5", 0]}},
        "7": {"class_type": "EmptyAceStepLatentAudio", "inputs": {"seconds": float(seconds), "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "seed": seed, "steps": steps, "cfg": 5.0, "sampler_name": "euler",
                                                    "scheduler": "simple", "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0], "denoise": 1.0}},
        "9": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["8", 0], "vae": ["1", 2]}},
        "10": {"class_type": "SaveAudio", "inputs": {"audio": ["9", 0], "filename_prefix": "farm_music/%s__%d" % (name, seed)}},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--seeds", type=int, default=0, help="candidates per track (default: 2 for title/spring/village, else 1)")
    ap.add_argument("--seconds", type=float, default=0)
    ap.add_argument("--steps", type=int, default=50)
    a = ap.parse_args()
    if not URL:
        sys.exit("set COMFY_URL")
    s = requests.Session()
    names = [n for n in (a.only.split(",") if a.only else TRACKS)]
    jobs = []
    for n in names:
        k = a.seeds or (2 if n in TWO else 1)
        for _ in range(k):
            jobs.append((n, random.randint(1, 2**31)))
    os.makedirs(WORK + "/raw", exist_ok=True)
    pending = {}
    t0 = time.time()
    while jobs or pending:
        while jobs and len(pending) < 3:
            n, seed = jobs.pop(0)
            sec = a.seconds or SECONDS.get(n, DEFAULT_SECONDS)
            r = s.post(URL + "/prompt", json={"prompt": graph(n, seed, sec, a.steps), "client_id": "farm-music"}, timeout=60)
            r.raise_for_status()
            pending[r.json()["prompt_id"]] = (n, seed)
            print("queued", n, seed, sec, flush=True)
        time.sleep(5)
        for pid in list(pending):
            h = s.get(URL + "/history/" + pid, timeout=60).json().get(pid)
            if not h:
                continue
            n, seed = pending.pop(pid)
            outs = [f for o in h.get("outputs", {}).values() for f in o.get("audio", [])]
            if not outs:
                print("FAILED", n, seed, json.dumps(h.get("status"))[:600], flush=True)
                continue
            f = outs[0]
            d = s.get(URL + "/view", params={"filename": f["filename"], "subfolder": f["subfolder"], "type": "output"}, timeout=300)
            ext = os.path.splitext(f["filename"])[1]
            p = "%s/raw/%s__%d%s" % (WORK, n, seed, ext)
            open(p, "wb").write(d.content)
            print("got", p, len(d.content), "t=%.0fs" % (time.time() - t0), flush=True)


if __name__ == "__main__":
    main()
