# The sandbox: a GPU pod that uploads its work and deletes itself

Owner's rule (2026-11-16): never pay for a pod nobody is using. Every art run happens on a
"sandbox" pod that runs `sandbox.sh` from its first minute:

* output files are copied to Google Drive (`sandbox-output/` in the owner's My Drive) every 5 minutes;
* after **15 idle minutes** the pod uploads once more and **deletes itself**;
* after **3 hours** it does the same whatever it is doing (`MAX_HOURS`).

Nothing is lost when the session that started the pod goes away: the work is on Drive, and the
pod is gone. The assistant then takes what it needs from `sandbox-output/` and empties the folder.

## One-time set-up by the owner: a Drive token for the pod

The pod needs its own, narrow access to Drive. `drive.file` lets it see only files it created itself.
On your own computer (https://rclone.org/install/):

```bash
rclone config create sandbox drive scope=drive.file
```

A browser window asks you to allow rclone. Then find the config file:

```bash
rclone config file
```

Upload that `rclone.conf` to your Google Drive, in a folder named `sandbox`. The assistant reads it
once, hands it to the pod as its rclone config, and you can then delete the file from Drive.
To take the access away later: https://myaccount.google.com/permissions → rclone → Remove access.

## Starting a sandbox pod (the assistant does this)

1. Create the pod (ComfyUI image, ports 8188 and 8888) with the environment variable
   `RCLONE_CONFIG_B64` = the base64 of that `rclone.conf`.
2. First command on the pod:
   ```bash
   mkdir -p ~/.config/rclone /workspace/sandbox && echo "$RCLONE_CONFIG_B64" | base64 -d > ~/.config/rclone/rclone.conf
   nohup bash /workspace/sandbox/sandbox.sh > /workspace/sandbox/sandbox.log 2>&1 &
   ```
3. When the models are downloaded: `touch /workspace/sandbox/ready` (idle minutes count from then;
   or from minute 40 at the latest).
4. Workers that use the GPU outside ComfyUI `touch /workspace/sandbox/busy` at least once a minute.

The pod deletes itself with `runpodctl`, which every Runpod pod has, using the pod's own key.

## Hard stops that do not depend on Claude (tested 2026-11-18)

Start every pod with `python3 tools/art/farm/sandbox/launch.py --hours 3` (add `--idle 15`, `--gpu ...`).

1. **On the pod itself.** The launcher creates the pod and, as soon as its Jupyter server answers
   (about a minute), starts `sandbox.sh` on it. That watchdog deletes the pod after 15 idle minutes or
   at the hard stop, with the key Runpod gives every pod. It is a plain process on the pod: it keeps
   going if Claude, the session, this machine or the owner's usage credit stops. Tested: a pod armed
   with a 3-minute stop deleted itself on time with nobody connected.
2. **Fail safe.** If the launcher cannot arm the watchdog, it deletes the pod at once (tested).
3. **On GitHub.** `.github/workflows/sandbox-reaper.yml` runs every 15 minutes on GitHub's servers and
   deletes any pod named `sandbox-u<unix time>` whose deadline has passed. It needs the repository
   secret `RUNPOD_API_KEY` (Settings → Secrets and variables → Actions); without it, it does nothing.

(A timer in the pod's start command does not work with Runpod's ComfyUI image, which passes any start
command to its own /start.sh as arguments; Runpod's GraphQL API cannot override the entrypoint.)
