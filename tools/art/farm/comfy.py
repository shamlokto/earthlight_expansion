#!/usr/bin/env python3
"""Small ComfyUI client for the farm art set (Earthlight: Sato's Harvest).

  t2i  : Qwen-Image + Lightning 8-step LoRA
  edit : Qwen-Image-Edit 2509 + Lightning 8-step LoRA (1-3 reference images)
  i2v  : WAN 2.2 I2V 14B, high+low noise with the lightx2v 4-step LoRAs

The server URL is read from $COMFY_URL (or --url). Nothing here is secret.

  COMFY_URL=https://<pod>-8188.proxy.runpod.net \
  python3 tools/art/farm/comfy.py run textures [--only grass_spring,hay] [--seeds 2] [--work DIR]

Raw results land in <work>/raw/<group>/<slot>__<seed>.png (or .mp4); post.py turns
them into the files under art/farm/.
"""
import argparse, json, os, sys, time, random
import requests

WORK = os.environ.get("FARM_ART_WORK", "/tmp/farm-art")
NEG = "text, watermark, logo, signature, caption, letters, blurry, lowres, photograph, 3d render, deformed"
NEG_VID = ("overexposed, static, blurry details, subtitles, text, watermark, still picture, photorealistic, 3d, "
           "overall grey, worst quality, low quality, JPEG artefacts, ugly, incomplete, extra fingers, badly drawn hands, badly drawn face, "
           "deformed, disfigured, malformed limbs, fused fingers, motionless frame, cluttered background, three legs, walking backwards, camera shake")


class Comfy:
    def __init__(self, url=None):
        self.url = (url or os.environ.get("COMFY_URL") or "").rstrip("/")
        if not self.url:
            sys.exit("set COMFY_URL or pass --url")
        self.s = requests.Session()
        self.client = "farm-art"
        self.front = bool(os.environ.get("COMFY_FRONT"))   # queue ahead of pending jobs

    def _req(self, method, path, **kw):
        for i in range(6):
            try:
                r = self.s.request(method, self.url + path, timeout=kw.pop("timeout", 120), **kw)
                if r.status_code >= 500:
                    raise IOError("http %d" % r.status_code)
                return r
            except Exception as e:  # proxy hiccups: retry
                if i == 5:
                    raise
                time.sleep(2 + 2 * i)

    def info(self, node):
        return self._req("GET", "/object_info/" + node).json().get(node)

    def upload(self, path, name=None):
        name = name or os.path.basename(path)
        with open(path, "rb") as f:
            r = self._req("POST", "/upload/image", files={"image": (name, f, "image/png")}, data={"overwrite": "true"})
        return r.json()["name"]

    def queue(self, graph):
        r = self._req("POST", "/prompt", json={"prompt": graph, "client_id": self.client, **({"front": True} if self.front else {})})
        j = r.json()
        if "prompt_id" not in j:
            raise RuntimeError("queue failed: " + json.dumps(j)[:1500])
        return j["prompt_id"]

    def history(self, pid):
        return self._req("GET", "/history/" + pid).json().get(pid)

    def pending(self):
        q = self._req("GET", "/queue").json()
        return len(q["queue_running"]) + len(q["queue_pending"])

    def fetch(self, item, dest):
        r = self._req("GET", "/view", params={"filename": item["filename"], "subfolder": item.get("subfolder", ""), "type": item.get("type", "output")}, timeout=300)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest + ".part", "wb") as f:
            f.write(r.content)
        os.replace(dest + ".part", dest)

    def fetch_file(self, filename, subfolder, dest):
        self.fetch({"filename": filename, "subfolder": subfolder, "type": "output"}, dest)

    def collect(self, jobs, poll=3.0, log=print, graphs=None, bump=0):
        """jobs: list of (prompt_id, dest_without_ext). Blocks until all are downloaded.
        bump > 0 (with graphs: prompt_id -> graph): on a shared LIFO front queue our jobs can be buried by
        newer ones; if nothing of ours finished for `bump` seconds, our still-pending jobs are deleted
        and queued again at the front."""
        left = dict(jobs)
        t0 = last = time.time()
        while left:
            for pid in list(left):
                h = self.history(pid)
                if not h:
                    continue
                st = h.get("status", {})
                if st.get("status_str") == "error":
                    log("ERROR", left.pop(pid), json.dumps(st.get("messages", []))[-600:])
                    continue
                outs = []
                for o in h.get("outputs", {}).values():
                    for k in ("images", "gifs", "videos"):
                        outs += o.get(k, [])
                if not outs and not st.get("completed"):
                    continue
                dest = left.pop(pid)
                for n, it in enumerate(outs):
                    ext = os.path.splitext(it["filename"])[1]
                    self.fetch(it, dest + ("" if n == 0 else "_%d" % n) + ext)
                last = time.time()
                log("%5.0fs done %s (%d left)" % (time.time() - t0, os.path.basename(dest), len(left)))
            if left and bump and graphs and time.time() - last > bump:
                q = self._req("GET", "/queue").json()
                pend = {r[1] for r in q["queue_pending"]}
                mine = [p for p in left if p in pend]
                if mine and len(mine) == len(left):      # none of ours is running
                    self._req("POST", "/queue", json={"delete": mine})
                    for p in mine:
                        g = graphs.pop(p)
                        n = self.queue(g)
                        graphs[n] = g
                        left[n] = left.pop(p)
                    log("bumped %d to the front" % len(mine))
                last = time.time()
            if left:
                time.sleep(poll)


# ---------------------------------------------------------------- graphs
def g_t2i(prompt, w=1024, h=1024, seed=0, prefix="farm/t2i", neg=NEG, steps=8, shift=3.1, batch=1):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_fp8_e4m3fn.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "Qwen-Image-Lightning-8steps-V2.0.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": shift}},
        "4": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}},
        "5": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": prompt}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": neg}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": batch}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["3", 0], "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple",
                                                   "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0], "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["5", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": prefix}},
    }


def g_edit(prompt, images, w=1024, h=1024, seed=0, prefix="farm/edit", steps=8, shift=3.0):
    """images: 1-3 names already uploaded to the server's input folder."""
    g = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_edit_2509_fp8_e4m3fn.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "Qwen-Image-Edit-2509-Lightning-8steps-V1.0-bf16.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": shift}},
        "3b": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1.0}},
        "4": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}},
        "5": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "6": {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {"clip": ["4", 0], "vae": ["5", 0], "prompt": prompt}},
        "7": {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {"clip": ["4", 0], "vae": ["5", 0], "prompt": ""}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["3b", 0], "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple",
                                                   "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0], "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["5", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": prefix}},
    }
    for i, name in enumerate(images[:3]):
        g["L%d" % i] = {"class_type": "LoadImage", "inputs": {"image": name}}
        g["6"]["inputs"]["image%d" % (i + 1)] = ["L%d" % i, 0]
        g["7"]["inputs"]["image%d" % (i + 1)] = ["L%d" % i, 0]
    return g


def g_i2v(prompt, image, w=832, h=480, length=81, seed=0, prefix="farm/vid", neg=NEG_VID, fps=16, shift=5.0):
    def branch(k, unet, lora):
        return {
            k + "u": {"class_type": "UNETLoader", "inputs": {"unet_name": unet, "weight_dtype": "default"}},
            k + "l": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": [k + "u", 0], "lora_name": lora, "strength_model": 1.0}},
            k + "s": {"class_type": "ModelSamplingSD3", "inputs": {"model": [k + "l", 0], "shift": shift}},
        }
    g = {}
    g.update(branch("H", "wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors", "wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors"))
    g.update(branch("W", "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors", "wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors"))
    g.update({
        "4": {"class_type": "CLIPLoader", "inputs": {"clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan", "device": "default"}},
        "5": {"class_type": "VAELoader", "inputs": {"vae_name": "wan_2.1_vae.safetensors"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": prompt}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": neg}},
        "L": {"class_type": "LoadImage", "inputs": {"image": image}},
        "8": {"class_type": "WanImageToVideo", "inputs": {"positive": ["6", 0], "negative": ["7", 0], "vae": ["5", 0], "width": w, "height": h,
                                                           "length": length, "batch_size": 1, "start_image": ["L", 0]}},
        "9": {"class_type": "KSamplerAdvanced", "inputs": {"model": ["Hs", 0], "add_noise": "enable", "noise_seed": seed, "steps": 4, "cfg": 1.0,
                                                           "sampler_name": "euler", "scheduler": "simple", "positive": ["8", 0], "negative": ["8", 1],
                                                           "latent_image": ["8", 2], "start_at_step": 0, "end_at_step": 2, "return_with_leftover_noise": "enable"}},
        "9b": {"class_type": "KSamplerAdvanced", "inputs": {"model": ["Ws", 0], "add_noise": "disable", "noise_seed": seed, "steps": 4, "cfg": 1.0,
                                                            "sampler_name": "euler", "scheduler": "simple", "positive": ["8", 0], "negative": ["8", 1],
                                                            "latent_image": ["9", 0], "start_at_step": 2, "end_at_step": 4, "return_with_leftover_noise": "disable"}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9b", 0], "vae": ["5", 0]}},
        "11": {"class_type": "CreateVideo", "inputs": {"images": ["10", 0], "fps": float(fps)}},
        "12": {"class_type": "SaveVideo", "inputs": {"video": ["11", 0], "filename_prefix": prefix, "format": "mp4", "codec": "h264"}},
    })
    return g


# ---------------------------------------------------------------- runner
def run_jobs(c, jobs, work=WORK, seeds=1, force=False, base_seed=None, log=print, batch=0, gap=0.0, bump=75):
    """jobs: dicts from prompts.jobs(): {group, slot, kind, prompt, w, h, refs?, length?, seed?}.
    refs are local file paths; they are uploaded under group-derived names.
    batch > 0: polite mode for a shared queue - queue `batch` jobs at the FRONT, wait for them,
    then sleep gap x (time they took) before the next batch."""
    todo, uploaded = [], {}
    for j in jobs:
        for n in range(seeds):
            seed = j.get("seed", base_seed if base_seed is not None else 1000) + n
            dest = os.path.join(work, "raw", j["group"], "%s__%d" % (j["slot"], seed))
            if not force and any(os.path.exists(dest + e) for e in (".png", ".mp4")):
                continue
            todo.append((j, seed, dest))

    def graph(j, seed):
        prefix = "farm/%s/%s__%d" % (j["group"], j["slot"], seed)
        if j["kind"] == "t2i":
            return g_t2i(j["prompt"], j["w"], j["h"], seed, prefix, **({"neg": j["neg"]} if "neg" in j else {}))
        names = []
        for p in j["refs"]:
            if not os.path.exists(p):
                log("missing ref", p, "- skip", j["slot"])
                return None
            key = (p, os.path.getmtime(p))
            if key not in uploaded:
                uploaded[key] = c.upload(p, "farm_%s_%s" % (j["group"], os.path.basename(p)))
            names.append(uploaded[key])
        if j["kind"] == "edit":
            return g_edit(j["prompt"], names, j["w"], j["h"], seed, prefix)
        return g_i2v(j["prompt"], names[0], j["w"], j["h"], j.get("length", 81), seed, prefix)

    log("to do: %d" % len(todo))
    step = batch or len(todo) or 1
    if batch:
        c.front = True
    for i in range(0, len(todo), step):
        t0 = time.time()
        queued, graphs = [], {}
        for j, seed, dest in reversed(todo[i:i + step]) if c.front else todo[i:i + step]:
            g = graph(j, seed)
            if g:
                pid = c.queue(g)
                queued.append((pid, dest)); graphs[pid] = g
        c.collect(queued, log=log, graphs=graphs, bump=bump if c.front else 0)
        if batch and gap and i + step < len(todo):
            time.sleep(min(120, gap * (time.time() - t0)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["run", "list"])
    ap.add_argument("group")
    ap.add_argument("--only", default="")
    ap.add_argument("--seeds", type=int, default=1)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--batch", type=int, default=0, help="polite mode: queue this many at the front, wait, pause")
    ap.add_argument("--gap", type=float, default=1.0, help="pause after a batch, as a multiple of the time it took")
    ap.add_argument("--url", default=None)
    ap.add_argument("--work", default=WORK)
    a = ap.parse_args()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import prompts
    jobs = prompts.jobs(a.group, work=a.work)
    if a.only:
        only = set(a.only.split(","))
        jobs = [j for j in jobs if j["slot"] in only]
    if a.cmd == "list":
        for j in jobs:
            print(j["slot"], "|", j["kind"], j["w"], j["h"], "|", j["prompt"][:160])
        return
    run_jobs(Comfy(a.url), jobs, a.work, a.seeds, a.force, a.seed, batch=a.batch, gap=a.gap)


if __name__ == "__main__":
    main()
