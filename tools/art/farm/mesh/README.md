# Farm 3D models (image → textured GLB)

The models in `art/farm/models/` were made in two steps on a rented GPU pod (one L40S, shared):

1. **Concept picture** — Qwen-Image (8-step Lightning LoRA) through the pod's ComfyUI queue:
   one object, whole, front-right 3/4 view from slightly above, white background.
   Style: cute Japanese-anime figurine look (see `_style` in `prompts.json`; one entry per object).
2. **Image → 3D** — Tencent **Hunyuan3D-2** (shape: `hunyuan3d-dit-v2-0-turbo` + FlashVDM, 8 steps,
   octree 380; texture: `hunyuan3d-delight-v2-0` + `hunyuan3d-paint-v2-0`), run as a standalone
   script beside ComfyUI (about 15.5 GB VRAM peak, 35–60 s per object).
   The mesh is decimated **before** painting, so the baked texture fits the final triangles.

Nothing here is taken from an existing game; every picture and mesh is generated from our own prompts.
Note the Hunyuan3D-2 weights are under Tencent's community licence (non-commercial terms): check it
before selling anything that ships these meshes.

## Files

| file | where it runs | what it does |
|---|---|---|
| `prompts.json` | – | `_style` template and, per object, the description `x` and triangle budget `tris` |
| `concept.py` | this machine | queues Qwen-Image jobs on ComfyUI, downloads the PNGs |
| `gen3d.py` | pod | image → cut-out (rembg) → shape → clean → decimate → paint → normalised GLB |
| `fetch.sh` | this machine | downloads finished GLBs from ComfyUI's `output/mesh3d/` |
| `view.html`, `render.mjs` | this machine | four-view check render with the game's own three.js + GLTFLoader (Playwright) |
| `accept.py` | this machine | validates a GLB, copies it to `art/farm/models/`, updates `manifest.json` |

## Output contract (`art/farm/models/<name>.glb`)

* glTF 2.0 binary, **no extensions** (no Draco / KTX2 / meshopt), one mesh, one material.
* Y up, standing on `y = 0`, centred on x/z, **front faces +Z**, longest side = 1 unit
  (`manifest.json` gives the bounding box `size`; the game scales by the real-world size it wants).
* ≤ 20 000 triangles (props 4–12 k), smooth vertex normals included.
* One 1024² base-colour JPEG. Material: metallic 0, roughness 0.9. The texture already holds soft
  painted shading, so light it gently (hemisphere + one sun) or it will look double-shaded.

## Reproduce

Pod set-up (once; Python 3.12, CUDA 12.8 toolkit with `nvcc`):

```sh
python3.12 -m venv /workspace/h3d/venv && . /workspace/h3d/venv/bin/activate
pip install torch==2.10.0 torchvision==0.25.0 --index-url https://download.pytorch.org/whl/cu128
git clone --depth 1 https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git /workspace/h3d/Hunyuan3D-2 && cd /workspace/h3d/Hunyuan3D-2
pip install diffusers==0.31.0 transformers==4.46.3 'huggingface_hub<0.26' accelerate einops omegaconf trimesh pymeshlab \
    pygltflib xatlas opencv-python-headless rembg onnxruntime pybind11 ninja 'numpy<2' scipy pillow fast-simplification
pip install -e . --no-deps
apt-get update && apt-get install -y libopengl0 libglx0 libegl1        # pymeshlab's I/O plugins need libOpenGL
# the CUDA toolkit image lacked cusparse.h etc.: take the headers from the pip nvidia packages
export CPATH=$(ls -d /workspace/h3d/venv/lib/python3.12/site-packages/nvidia/*/include | tr '\n' ':')
(cd hy3dgen/texgen/custom_rasterizer && python setup.py install)
(cd hy3dgen/texgen/differentiable_renderer && python setup.py install)
```

Two one-line patches make the paint step counts adjustable (gen3d.py uses 20/16 steps for props, 50/30 for characters):

```sh
cd hy3dgen/texgen/utils
sed -i 's/num_inference_steps=50,/num_inference_steps=int(__import__("os").environ.get("H3D_DELIGHT_STEPS", 50)),/' dehighlight_utils.py
sed -i 's/num_inference_steps=30, \*\*kwargs/num_inference_steps=int(__import__("os").environ.get("H3D_MV_STEPS", 30)), **kwargs/' multiview_utils.py
```

Weights (about 18 GB) go to `$HY3DGEN_MODELS/tencent/Hunyuan3D-2/<subfolder>/` — from
`huggingface.co/tencent/Hunyuan3D-2`: `hunyuan3d-dit-v2-0-turbo/{config.yaml,model.fp16.safetensors}`,
`hunyuan3d-vae-v2-0-turbo/*`, `hunyuan3d-delight-v2-0/*`, `hunyuan3d-paint-v2-0/*`
(the paint UNet is loaded from `unet/diffusion_pytorch_model.bin`). Plain `curl -L -C -` was reliable;
the Python hub downloader stalled on this pod.

Then:

```sh
export COMFY_URL=https://<pod-id>-8188.proxy.runpod.net        # no secrets are needed
python3 concept.py --seed 2 farmhouse barn cow                  # pictures → ./concepts and the pod's output/mesh3d_in/
# on the pod: copy output/mesh3d_in/<name>_<seed>_00001_.png to /workspace/h3d/in/<name>.png, then
#   cd /workspace/h3d/Hunyuan3D-2 && HY3DGEN_MODELS=/root/h3d_models python ../gen3d.py farmhouse:20000 cow:12000
#   (or `gen3d.py --watch` and drop specs into /workspace/h3d/queue/*.job)
sh fetch.sh /tmp/raw farmhouse cow                              # GLBs come back through ComfyUI's /view
python3 -m http.server 8765 --directory ../../../..  &          # repo root
DIR=/path/under/repo node render.mjs /tmp/shots farmhouse cow   # LOOK at the PNGs
python3 accept.py /tmp/raw "farmhouse=porch on +Z" cow          # into art/farm/models + manifest.json
```

A spec is `NAME[:TRIS[:SEED[:YAW[:SRC]]]]`. Hunyuan3D returns the object upright and axis-aligned
with its front on +Z even from a 3/4 picture; `YAW=auto` only removes a small residual twist
(±12°), `none` leaves it, a number rotates by that many degrees (use 180 if a model comes out backwards).
