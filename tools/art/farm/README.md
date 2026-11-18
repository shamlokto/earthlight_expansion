# Farm art pipeline (Earthlight: Sato's Harvest)

Everything under `art/farm/` is generated with open models on a rented GPU running ComfyUI
(Qwen-Image, Qwen-Image-Edit 2509, WAN 2.2 I2V) and finished here. All of it is original;
no existing game, film, studio or artist is named or imitated in any prompt.

| file | what |
|---|---|
| `prompts.py` | every prompt, keyed by slot, plus the shared style paragraphs (`STYLE`, `CHARA`, `COLONY`) and `jobs(group)` |
| `comfy.py` | ComfyUI client: `g_t2i` (Qwen + 8-step Lightning), `g_edit` (Qwen-Edit 2509, 1-3 reference images), `g_i2v` (WAN 2.2 high+low, 4 steps), queue / poll / download |
| `post.py` | picks, seamless tiling, panorama wrap, cut-outs, sprite sheets, video encoding, `manifest.json` |
| `pod_cut.py` | runs on the GPU machine: BiRefNet (rembg) alpha mattes for everything that becomes a cut-out |
| `picks.json` | which seed was chosen per slot (`null` = rejected, the game uses its procedural fallback) |
| `tile_modes.json` | optional per-texture override of the tiling method (`quilt`, `period`, `mirror`) |
| `meta.json` | extras that go into the manifest (anchors, sheet layouts) - written by `post.py` |

## Rerun

Models (ComfyUI `models/`): `diffusion_models/qwen_image_fp8_e4m3fn.safetensors`,
`diffusion_models/qwen_image_edit_2509_fp8_e4m3fn.safetensors`, `text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors`,
`vae/qwen_image_vae.safetensors`, `loras/Qwen-Image-Lightning-8steps-V2.0.safetensors`,
`loras/Qwen-Image-Edit-2509-Lightning-8steps-V1.0-bf16.safetensors`, the two `wan2.2_i2v_*_14B_fp8_scaled` models with
their `lightx2v_4steps` LoRAs, `text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors`, `vae/wan_2.1_vae.safetensors`.
(Download with plain `curl -L -C -` from the Hugging Face `resolve/main` URLs; the xet-based `hf download` stalled.)

```sh
export COMFY_URL=https://<pod>-8188.proxy.runpod.net     # temporary; never commit it
export FARM_ART_WORK=/tmp/farm-art                         # raw PNGs, mattes, review sheets (not in the repo)
cd tools/art/farm

python3 comfy.py run people --only sato_front --seeds 6    # 1. Sato first; look, then set picks.json
python3 post.py sel people                                 #    picked raws become references
python3 comfy.py run sato_portraits --only sato_portrait --seeds 3 ; python3 post.py sel sato_portraits
python3 comfy.py run sato_portraits                        #    happy / tired from the picked portrait
python3 comfy.py run people --seeds 2                      # 2. villagers (Qwen-Edit from art/colony/portrait;
python3 post.py sel people                                 #    the ones with no portrait use vashti_front as style reference)
python3 texref.py ; TEX_DENOISE=0.6 python3 comfy.py run textures   # 3. textures: Qwen-Image img2img over flat procedural layout guides
#    (0.5 keeps the layout but looks flat, 0.78 brings perspective back; regular grids tile with mode "edge")
python3 comfy.py run sky --seeds 2
python3 comfy.py run scenes --seeds 2                      # 4.
python3 comfy.py run icons                                 # 5.
python3 local_cut.py people birefnet-general               #    mattes on this machine (people: BiRefNet; isnet loses white clothes)
python3 local_cut.py icons                                 #    icons: isnet-general-use is fine and fast
#    or on the GPU machine, ONE niced process:  nice -n 19 python pod_cut.py people icons ; then  post.py masks <group>
python3 post.py cut people ; python3 post.py cut icons
python3 post.py textures ; python3 post.py sky ; python3 post.py scenes ; python3 post.py portraits
python3 post.py sel scenes ; python3 comfy.py run video ; python3 post.py video   # 6. WAN clips from the stills (~1 min each on an L40S)
python3 post.py manifest
```

`post.py sheet <group>` writes contact sheets to `$FARM_ART_WORK/review/` - look at them before picking.
On a shared queue use `--back --batch 6` (never more than six of ours pending, behind everyone else).
If `/upload/image` fails on the server, put the reference files into ComfyUI's `input/` by hand under the
name `farm_<group>_<basename>` and set `COMFY_NO_UPLOAD=1`.

What we learned about prompting Qwen-Image (all reflected in `prompts.py`):
* negations backfire ("not pixel art" gave pixel art, "no naval guns" gave battleships): describe only what you want;
* it will not paint a flat top-down surface from text: textures are repainted (img2img, denoise ~0.6) over `texref.py` guides;
* the `sky_colony_*` panoramas are one look along the cylinder axis; post.py mirrors the centre part (forward + backward view) so the 360 wraps;
* "space colony" draws a metal ring: the colony sky is described as an upside-down far land plus a horizontal line of light;
* "ship / warship / tug" in space draws sea ships: describe modules, tanks and truss girders instead;
* "game item icon" can give app-style tiles, hands or kawaii faces: say "illustration of an object", then reject the odd ones.

Groups that exist in `prompts.py` but are not used by the current game (the world became 3D models):
`sprites`, `pallas`, `buildings`, `people_views`, `walk`, `action`, `sato_poses`.

## Manifest

`art/farm/manifest.json`: `{ "version": 1, "files": { "<folder>/<name>": { "file", "w", "h", ... } } }`.
Keys are the path without extension (`textures/grass_spring`, `people/sato_front`, `video/title`).
Cut-outs carry `anchor: [x, y]` (ground contact, pixels); textures carry `tile` (method used); videos `fps`, `frames`.
