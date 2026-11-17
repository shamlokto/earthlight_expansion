#!/bin/bash
# The sandbox watchdog. Runs ON the rented GPU pod, so the pod looks after itself:
#   * every SYNC_MINUTES it copies new output files to Google Drive (rclone remote "sandbox");
#   * when the pod has been idle for IDLE_MINUTES (default 15) it uploads everything one last
#     time and DELETES the pod, so nothing is billed for a machine nobody is using;
#   * MAX_HOURS (default 3) is a hard limit with the same ending, whatever the pod is doing.
# "Idle" = GPU below 10% and nothing running or waiting in ComfyUI and no fresh busy marker.
# Workers that use the GPU outside ComfyUI can `touch /workspace/sandbox/busy` while they work.
# Idle time is not counted until /workspace/sandbox/ready exists (models still downloading),
# or GRACE_MINUTES (default 40) have passed.
#   nohup bash sandbox.sh > /workspace/sandbox/sandbox.log 2>&1 &
IDLE_MINUTES=${IDLE_MINUTES:-15}; MAX_HOURS=${MAX_HOURS:-3}; SYNC_MINUTES=${SYNC_MINUTES:-5}; GRACE_MINUTES=${GRACE_MINUTES:-40}
OUT=${SANDBOX_OUT:-/workspace/runpod-slim/ComfyUI/output}
REMOTE=${SANDBOX_REMOTE:-sandbox:sandbox-output}
DIR=/workspace/sandbox; mkdir -p "$DIR"
log() { echo "$(date -u +%FT%TZ) $*"; }

command -v rclone >/dev/null || { log "installing rclone"; curl -fsSL https://rclone.org/install.sh | bash >/dev/null 2>&1; }
have_drive() { rclone listremotes 2>/dev/null | grep -q '^sandbox:'; }
upload() {
  have_drive || { log "no Drive remote configured: nothing uploaded"; return 1; }
  cp "$DIR/sandbox.log" "$OUT/_sandbox.log" 2>/dev/null
  for try in 1 2 3; do
    rclone copy "$OUT" "$REMOTE" --exclude '*.tmp' --exclude '_output_images_will_be_put_here' --transfers 8 --drive-chunk-size 64M --retries 3 -q && { log "uploaded to $REMOTE"; return 0; }
    log "upload try $try failed"; sleep 20
  done
  return 1
}
finish() {
  log "ending: $1"; echo "$1" > "$OUT/_sandbox_ended.txt"
  upload && log "final upload done" || log "FINAL UPLOAD FAILED (the pod is deleted all the same: an idle pod is not kept)"
  id=${RUNPOD_POD_ID:-$(hostname)}
  log "deleting pod $id"
  runpodctl remove pod "$id" 2>&1 || runpodctl pod remove "$id" 2>&1 || \
    curl -sS -m 30 -X DELETE "https://rest.runpod.io/v1/pods/$id" -H "Authorization: Bearer $RUNPOD_API_KEY" || runpodctl stop pod "$id"
  sleep 120; log "still alive after the delete request; trying a stop"; runpodctl stop pod "$id" 2>&1
  exit 0
}

start=$(date +%s); idle=0; since_sync=0
log "sandbox watchdog started: idle limit ${IDLE_MINUTES} min, hard limit ${MAX_HOURS} h, Drive remote: $(have_drive && echo yes || echo NO)"
while true; do
  sleep 60
  now=$(date +%s); up=$(( (now - start) / 60 ))
  util=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | sort -n | tail -1); util=${util:-0}
  q=$(curl -s -m 5 http://127.0.0.1:8188/queue | python3 -c "import json,sys; q=json.load(sys.stdin); print(len(q['queue_running'])+len(q['queue_pending']))" 2>/dev/null); q=${q:-0}
  marker=0; [ -n "$(find "$DIR/busy" -mmin -2 2>/dev/null)" ] && marker=1
  counting=0; { [ -e "$DIR/ready" ] || [ "$up" -ge "$GRACE_MINUTES" ]; } && counting=1
  if [ "$util" -ge 10 ] || [ "$q" -gt 0 ] || [ "$marker" = 1 ] || [ "$counting" = 0 ]; then idle=0; else idle=$((idle + 1)); fi
  echo "$idle" > "$DIR/idle_minutes"
  since_sync=$((since_sync + 1))
  if [ "$since_sync" -ge "$SYNC_MINUTES" ]; then since_sync=0; upload; log "up ${up} min, gpu ${util}%, queue ${q}, idle ${idle} min"; fi
  [ "$up" -ge $((MAX_HOURS * 60)) ] && finish "hard limit of ${MAX_HOURS} hours reached"
  [ "$idle" -ge "$IDLE_MINUTES" ] && finish "idle for ${IDLE_MINUTES} minutes"
done
