set -x
mkdir -p /workspace/h3d /root/h3d_tmp /root/h3d_hf; cd /workspace/h3d
M=/root/h3d_models/tencent/Hunyuan3D-2; mkdir -p $M
( cd $M; for f in hunyuan3d-dit-v2-0-turbo/model.fp16.safetensors hunyuan3d-delight-v2-0/unet/diffusion_pytorch_model.safetensors hunyuan3d-paint-v2-0/unet/diffusion_pytorch_model.bin; do
   mkdir -p $(dirname $f); (curl -sL --retry 5 -C - -o $f https://huggingface.co/tencent/Hunyuan3D-2/resolve/main/$f && echo ok $f) & done; wait; echo CURL_DONE ) > curl.log 2>&1 &
python3.12 -m venv venv
. venv/bin/activate
pip install -q -U pip wheel setuptools
pip install -q torch==2.10.0 torchvision==0.25.0 --index-url https://download.pytorch.org/whl/cu128
git clone --depth 1 https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git
cd Hunyuan3D-2
pip install -q 'diffusers==0.31.0' 'transformers==4.46.3' 'huggingface_hub<0.26' accelerate einops omegaconf trimesh pymeshlab pygltflib xatlas opencv-python-headless rembg onnxruntime pybind11 ninja tqdm safetensors 'numpy<2' scipy pillow fast-simplification
pip install -q -e . --no-deps
(apt-get update -q >/dev/null 2>&1; apt-get install -y -q libopengl0 libglx0 libegl1 2>&1 | tail -1)
export CPATH=$(ls -d /workspace/h3d/venv/lib/python3.12/site-packages/nvidia/*/include | tr '\n' ':')
(cd hy3dgen/texgen/custom_rasterizer && python setup.py install > /workspace/h3d/cr.log 2>&1)
(cd hy3dgen/texgen/differentiable_renderer && python setup.py install > /workspace/h3d/dr.log 2>&1)
cd hy3dgen/texgen/utils
sed -i 's/num_inference_steps=50,/num_inference_steps=int(__import__("os").environ.get("H3D_DELIGHT_STEPS", 50)),/' dehighlight_utils.py
sed -i 's/num_inference_steps=30, \*\*kwargs/num_inference_steps=int(__import__("os").environ.get("H3D_MV_STEPS", 30)), **kwargs/' multiview_utils.py
cd /workspace/h3d
python -c 'import torch,custom_rasterizer; print("CR OK")'
HF_HOME=/root/h3d_hf python - <<'PY'
from huggingface_hub import snapshot_download
snapshot_download('tencent/Hunyuan3D-2', local_dir='/root/h3d_models/tencent/Hunyuan3D-2', allow_patterns=['hunyuan3d-dit-v2-0-turbo/config.yaml','hunyuan3d-vae-v2-0-turbo/config.yaml','hunyuan3d-vae-v2-0-turbo/model.fp16.safetensors','hunyuan3d-delight-v2-0/*','hunyuan3d-paint-v2-0/*'], ignore_patterns=['*/unet/diffusion_pytorch_model.*','hunyuan3d-paint-v2-0/vae/diffusion_pytorch_model.bin'], max_workers=8)
print('SNAP_DONE')
PY
echo SETUP_DONE
