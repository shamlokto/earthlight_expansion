# Pallas art redone with generated pictures (2026-10-28)

The owner asked for the expansion's new units to be redrawn with xAI's image model, including the
map icons and the fight scenes. This covers the Pallas (types 62-65; `js/art/pallas.js`).

* **Pictures**: jet, spent jet and robot, generated with the old pictures as style references
  (`tools/art/xai-gen.py`), then 96x96 with 32 colours and an outline (`tools/art/kai-convert.py`).
  White armour, deep blue panels, magenta accents, gold V crest. The spent jet is an edit of the jet
  with the torpedo gone (the model left a small pod in its place).
* **Fight poses** (`tools/art/pallas-poses.py`): one side view per moment, all generated from the
  robot's side view so the frames match, turned to face left like the ROM's sheets. Each pose is a
  32x32 sprite in the craft fight rows' colours (classic fights, the modern board's token) and a
  96x96 full-colour picture for the modern fights. The robot frames share one scale (from the rest
  pose's body height, the blade left out) and stand on the same baseline, so the choreography's
  moves don't make the machine jitter. The beam sabre is drawn as a bright line (white core, cyan
  edges) so it survives the 32x32 size.

| set | sheet | tile | moment | source |
|---|---|---|---|---|
| jet (62) | 403 | 0 | flying | jet-side |
| spent jet (63) | 404 | 0 | flying | spent-side |
| | | 64 | firing the nose guns (muzzle flash) | spent-side |
| robot (64/65), slot 0 | 405 | 0 | at rest | robot-side |
| | | 4 | stride (also its fly-in pose) | robot-walkA |
| | | 8 | stride, upright | robot-side |
| | | 12 | stride | robot-walkB |
| | | 64 | firing the railgun (muzzle flash) | robot-side |
| robot, slots 1-3 (sabre sheet; the melee recordings) | 406 | 0, 4, 8 | sabre ready, blade up | robot-sready |
| | | 12 | wind-up, sabre raised behind | robot-sraise |
| | | 64 | low guard, blade level forward | robot-sguard |
| | | 68 | the down-cut | robot-scut |
| | | 72 | the overhead sweep | robot-sover |
| | | 76 | the thrust | robot-sthrust |
| | | 128 | struck, recoiling with sparks | robot-struck |

* **Full-colour sabre poses**: `js/art/own.js` `ownPoseSet` now carries a set's `posesArt2` with its
  `poses2`, so the modern renderer also draws the second sheet's poses in full colour.
* **Map icons**: drawn from shapes in `tools/art/pallas-xai.mjs` (the jet with and without its
  torpedo, the robot with its crest, binder and railgun); generated images can't make clean 24x16.
* **Rebuild**: `python3 tools/art/kai-convert.py tools/art/pallas/<form>-src.jpg tools/art/pallas/<form>.json 96 32`,
  `python3 tools/art/pallas-poses.py`, `node tools/art/pallas-xai.mjs`. Sources and prompts are in
  `tools/art/pallas/`. The old shape tools (`pallas.mjs`, `pallas-pics.mjs`, `pallas-pixels.mjs`) are
  marked superseded.
* 18 images of the 22 budgeted.
