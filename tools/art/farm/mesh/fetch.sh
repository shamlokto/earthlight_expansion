#!/bin/sh
# fetch.sh DEST name ... : download <name>.glb (+ .json) from the pod's ComfyUI output/mesh3d folder.
# Needs COMFY_URL (https://<pod>-8188.proxy.runpod.net).
D=$1; shift; mkdir -p "$D"
for n in "$@"; do
  for e in glb json; do
    curl -sf -o "$D/$n.$e" "$COMFY_URL/view?filename=$n.$e&subfolder=mesh3d&type=output" || echo "missing $n.$e"
  done
done
