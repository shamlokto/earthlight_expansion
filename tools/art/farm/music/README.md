# Farm music (Sato's Harvest)

Background music for the farm game, made with **ACE-Step v1 3.5B** (Apache-2.0) on a rented GPU running
ComfyUI, then finished here with ffmpeg. Instrumental only (`[instrumental]` lyric, "no vocals" tags).
No composer, game, film or artist is named or imitated in any prompt.

| file | what |
|---|---|
| `prompts.py` | one tag prompt per track (`TRACKS`), shared tags (`COMMON`), lengths |
| `gen.py` | ComfyUI client: queues ACE-Step jobs (several tracks per job with `--group`, at most 3 jobs pending, never at the front), downloads FLACs to `$FARM_MUSIC_WORK/raw` |
| `judge_pod.py` | runs on the GPU machine: per file, the vocal share of a Demucs (htdemucs) separation and CLAP (laion/clap-htsat-unfused) similarity to a few descriptions ("a person singing", "calm cosy acoustic instrumental music", "scary horror music", the track's own prompt). Used to pick candidates and to reject anything with singing |
| `post.py` | `check`: duration / loudness / peak / silences of the raw files. `make name=file …`: trims silence, picks a quiet cut point near the end, fades 0.3 s in / 1.5 s out, two-pass loudnorm to -18 LUFS (TP -1.5), encodes OGG Vorbis 80 kb/s + MP3 96 kb/s to `art/farm/music/`, adds `music/<name>` to `art/farm/manifest.json` (read fresh, only its own keys changed) |
| `check_music.cjs` | Playwright check: serve the repo root on :8769, `node check_music.cjs` (add `NOMUSIC=1` to block the files and test the generated fallback) |

## Rerun

ComfyUI model: `models/checkpoints/ace_step_v1_3.5b.safetensors`
(`hf download Comfy-Org/ACE-Step_ComfyUI_repackaged all_in_one/ace_step_v1_3.5b.safetensors`).
Graph: CheckpointLoaderSimple → ModelSamplingSD3 (shift 5) → LatentApplyOperationCFG (TonemapReinhard 1.0) →
KSampler (50 steps, cfg 5, euler/simple), TextEncodeAceStepAudio (tags, `[instrumental]`, 0.99) with a
ConditioningZeroOut negative, EmptyAceStepLatentAudio, VAEDecodeAudio, SaveAudio. About 6-10 s of GPU per 95 s track on an L40S.

```sh
export COMFY_URL=https://<pod>-8188.proxy.runpod.net     # temporary; never commit it
export FARM_MUSIC_WORK=/tmp/farm-music
python3 gen.py --group 4                       # all tracks (2 candidates for title, spring, village)
python3 gen.py --only title,title --group 2    # more candidates
python3 post.py check
python3 post.py make title=title__1283458114.flac spring=spring__616079578.flac …
```

## The picks (2026-11-18)

title `title__1283458114` · spring `spring__616079578` · summer `summer__1313593150` · autumn `autumn__344630495` ·
winter `winter__1499151026` · night `night__1675831722` · village `village__853721459` · central `central__2006568500` ·
ruins `ruins__15835880` · festival `festival__1706954080` · lantern `lantern__2080519183` · wedding `wedding__1614028200`
belt `belt__543612052` (without a belt file the game plays `night` there).

## In the game

`js/farm/sfx.js` picks the track from the mood `main.js` gives `setMood({ season, night, ruins, belt, map, festival, title })`:
title screen → `title`; wedding / Lantern Night / other festivals → `wedding` / `lantern` / `festival`; belt → `belt`;
Old World → `ruins`; after 19:30 → `night`; village → `village`; Eden Central → `central`; otherwise the season.
Tracks are decoded into Web Audio buffers and looped sample-exactly; a change crossfades over 2 s. A track with no
file (or a failed fetch/decode) falls back to the old generated tune. On/off and volume (menu, Game tab) are kept in
localStorage `satoHarvest.music`. Playback starts on the first click or key press (browsers block autoplay).
