#!/usr/bin/env python3
"""Queue Qwen-Image concept pictures (one object on white) on the pod's ComfyUI.

  COMFY_URL=https://<pod>-8188.proxy.runpod.net python3 concept.py [--seed N] [--out DIR] name ...

Prompts come from prompts.json. Images are saved by ComfyUI under output/mesh3d_in/<name>_<seed>_*.png
and downloaded to DIR (default ./concepts). Jobs go through the normal queue (never cleared);
COMFY_FRONT=1 puts them at the front of the queue (use sparingly on a shared pod).
"""
import os, sys, json, time, requests
URL = os.environ['COMFY_URL'].rstrip('/')
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, 'prompts.json')))
NEG = "face on an object, mascot, photograph, photorealistic, realistic, gritty, dirty, scary, blurry, cropped, cut off, multiple objects, people, ground, floor, shadow, landscape, text, watermark"

def graph(text, seed, prefix, w=1024, h=1024):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_fp8_e4m3fn.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "4": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "Qwen-Image-Lightning-8steps-V2.0.safetensors", "strength_model": 1.0}},
        "5": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["4", 0], "shift": 3.0}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": text}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": NEG}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["5", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0],
                                                    "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["3", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": prefix}},
    }

def edit_graph(text, seed, prefix, image, w=1024, h=1024):
    """Qwen-Image-Edit 2509: restyle/re-pose the uploaded picture `image` following `text`."""
    g = graph(text, seed, prefix, w, h)
    g["1"]["inputs"]["unet_name"] = "qwen_image_edit_2509_fp8_e4m3fn.safetensors"
    g["4"]["inputs"]["lora_name"] = "Qwen-Image-Edit-2509-Lightning-8steps-V1.0-bf16.safetensors"
    g["20"] = {"class_type": "LoadImage", "inputs": {"image": image}}
    g["6"] = {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {"clip": ["2", 0], "vae": ["3", 0], "image1": ["20", 0], "prompt": text}}
    g["7"] = {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {"clip": ["2", 0], "vae": ["3", 0], "image1": ["20", 0], "prompt": ""}}
    return g

def main():
    a = sys.argv[1:]; seed = 1; edit = None; out = os.path.join(HERE, 'concepts')
    while a and a[0].startswith('--'):
        k = a.pop(0); v = a.pop(0)
        if k == '--seed': seed = int(v)
        if k == '--out': out = v
        if k == '--edit': edit = v      # --edit PICTURE: name must have an '_edit_<name>' prompt; output is <name>e_<seed>
    os.makedirs(out, exist_ok=True)
    jobs = {}
    if edit:
        up = requests.post(URL + '/upload/image', files={'image': (os.path.basename(edit), open(edit, 'rb'))}, data={'overwrite': 'true'}).json()['name']
    for name in a:
        if edit:
            r = requests.post(URL + '/prompt', json={"prompt": edit_graph(P['_edit_' + name], seed, f"mesh3d_in/{name}e_{seed}", up), **({"front": True} if os.environ.get('COMFY_FRONT') else {})})
            r.raise_for_status(); jobs[r.json()['prompt_id']] = name + 'e'; continue
        text = P[{'creature': '_style', 'char': '_style_char', 'plant': '_style_plant'}.get(P[name].get('kind'), '_style_obj')].replace('{x}', P[name]['x'])
        r = requests.post(URL + '/prompt', json={"prompt": graph(text, seed, f"mesh3d_in/{name}_{seed}"), **({"front": True} if os.environ.get('COMFY_FRONT') else {})})
        r.raise_for_status(); jobs[r.json()['prompt_id']] = name
    while jobs:
        time.sleep(4)
        for pid, name in list(jobs.items()):
            h = requests.get(f"{URL}/history/{pid}").json().get(pid)
            if not h: continue
            st = h.get('status', {})
            if st.get('status_str') == 'error':
                print('ERROR', name, json.dumps(st)[:400]); del jobs[pid]; continue
            for o in h.get('outputs', {}).values():
                for im in o.get('images', []):
                    b = requests.get(URL + '/view', params={'filename': im['filename'], 'subfolder': im['subfolder'], 'type': 'output'}).content
                    p = os.path.join(out, f"{name}_{seed}.png"); open(p, 'wb').write(b); print('saved', p, im['filename'], flush=True)
                    del jobs[pid]
if __name__ == '__main__': main()
