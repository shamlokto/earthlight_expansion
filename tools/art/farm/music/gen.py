#!/usr/bin/env python3
"""Generate the farm music on a ComfyUI server with ACE-Step v1 (3.5B, all-in-one checkpoint).

  COMFY_URL=https://<pod>-8188.proxy.runpod.net python3 gen.py [--only title,spring] [--seeds 1] [--seconds N]

Keeps at most 3 of our jobs pending, queues normally (never at the front), and downloads
each result to $FARM_MUSIC_WORK/raw/<name>__<seed>.flac (default /tmp/farm-music).
"""
import argparse, json, os, re, sys, time, random
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


def group_graph(items, steps):
    """Several tracks in one ComfyUI job (one queue slot): [(name, seed, seconds), ...]."""
    g = {}
    for k, (n, seed, sec) in enumerate(items):
        for nid, node in graph(n, seed, sec, steps).items():
            node = json.loads(json.dumps(node))
            for v in node["inputs"].values():
                if isinstance(v, list) and len(v) == 2 and isinstance(v[0], str):
                    v[0] = "%d_%s" % (k, v[0])
            g["%d_%s" % (k, nid)] = node
    # share the checkpoint loader
    for nid in list(g):
        if nid.endswith("_1") and nid != "0_1":
            del g[nid]
    for node in g.values():
        for v in node["inputs"].values():
            if isinstance(v, list) and len(v) == 2 and isinstance(v[0], str) and v[0].endswith("_1"):
                v[0] = "0_1"
    return g


def adopt(s):
    """Our jobs already waiting in the queue (SaveAudio prefix farm_music/...)."""
    q = s.get(URL + "/queue", timeout=60).json()
    out = {}
    for x in q["queue_pending"] + q["queue_running"]:
        names = [(n["inputs"]["filename_prefix"]) for n in x[2].values() if n["class_type"] == "SaveAudio" and str(n["inputs"].get("filename_prefix", "")).startswith("farm_music/")]
        if names:
            out[x[1]] = names
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--seeds", type=int, default=0, help="candidates per track (default: 2 for title/spring/village, else 1)")
    ap.add_argument("--seconds", type=float, default=0)
    ap.add_argument("--steps", type=int, default=50)
    ap.add_argument("--group", type=int, default=1, help="tracks per ComfyUI job")
    ap.add_argument("--adopt", action="store_true", help="also wait for our jobs already in the queue")
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
    pending = adopt(s) if a.adopt else {}
    print("adopted", pending, flush=True)
    t0 = time.time()
    while jobs or pending:
        while jobs and len(pending) < 3:
            batch = [jobs.pop(0) for _ in range(min(a.group, len(jobs)))]
            items = [(n, seed, a.seconds or SECONDS.get(n, DEFAULT_SECONDS)) for n, seed in batch]
            r = s.post(URL + "/prompt", json={"prompt": group_graph(items, a.steps), "client_id": "farm-music"}, timeout=60)
            r.raise_for_status()
            pending[r.json()["prompt_id"]] = [n for n, _ in batch]
            print("queued", items, flush=True)
        time.sleep(5)
        for pid in list(pending):
            h = s.get(URL + "/history/" + pid, timeout=60).json().get(pid)
            if not h:
                continue
            st = h.get("status", {})
            if not st.get("completed") and st.get("status_str") != "error":
                continue
            what = pending.pop(pid)
            outs = [f for o in h.get("outputs", {}).values() for f in o.get("audio", [])]
            if not outs:
                print("FAILED", what, json.dumps(st)[:600], flush=True)
            for f in outs:
                d = s.get(URL + "/view", params={"filename": f["filename"], "subfolder": f["subfolder"], "type": "output"}, timeout=300)
                base = re.match(r"(.+?__\d+)", os.path.basename(f["filename"])).group(1)   # <name>__<seed>
                p = "%s/raw/%s%s" % (WORK, base, os.path.splitext(f["filename"])[1])
                open(p, "wb").write(d.content)
                print("got", p, len(d.content), "t=%.0fs" % (time.time() - t0), flush=True)


if __name__ == "__main__":
    main()
