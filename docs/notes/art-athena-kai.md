# Athena Kai art (2026-10-29)

The owner asked for the new Kai units drawn with xAI, map and fight scenes included. This covers
the Athena Kai (types 73-76; `js/art/athenakai.js`, sets `ATHENA_KAI_JET`, `ATHENA_KAI_JET_SPENT`,
`ATHENA_KAI_ROBOT` for the units.json `ownArt` names `athenaKaiJet`, `athenaKaiJetSpent`,
`athenaKaiRobot`). The pipeline is the Pallas's (tools/art/pallas-*), adapted.

* **Design**: a refit of the Athena in the Kai style (white armour, magenta-pink stripes, gold trim,
  cyan glass), unlike the Pallas (deep blue panels, gold V crest): twin swept-back antennae, a jet
  nose chest, intake shoulders, tall twin tail fins on its back, and a long railgun with a hot-pink
  energy bayonet under the muzzle (its melee weapon, the slot-2 railgun at range 1).
* **Pictures**: jet, spent jet and robot, 96x96 with 32 colours and an outline
  (`tools/art/kai-convert.py`). The robot was generated with the Titan Kai picture as a style
  reference; the jet from the robot, the spent jet as an edit of the jet.
* **Fight poses** (`tools/art/athenakai-poses.py`): side views facing right, turned to face left,
  32x32 in the craft fight rows' colours and 96x96 full colour. The robot frames share one scale
  (76 px body in the 96 frame, smaller than the Pallas's so the fins and rifle fit) and one
  baseline. The bayonet is drawn in fixed glows (hot pink, light pink, white core) at both sizes.

| set | sheet | tile | moment | source |
|---|---|---|---|---|
| jet (73) | slot 0 | 0 | flying | jet-side |
| spent jet (74) | slot 0 | 0 | flying | spent-side |
| | | 64 | firing (muzzle flash) | spent-side |
| robot (75/76) | slot 0 | 0 | at rest | robot-side |
| | | 4, 12 | the stride (4 is also the fly-in) | robot-walkA, robot-walkB |
| | | 8 | stride, upright | robot-side |
| | | 64 | firing the railgun (muzzle flash) | robot-side |
| robot | melee sheet (slots 1-3) | 4 | the dash in | robot-walkA |
| | | 0, 8, 12, 64 | ready, backing off, hovering, guard | robot-sready |
| | | 68 | first cut: a down-slash with the bayonet | robot-scut |
| | | 72, 128 | winding up | robot-sraise |
| | | 76 | second cut: the bayonet thrust | robot-sthrust |
| | | 132 | the slash effect: a hot-pink crescent with a white-hot edge | drawn |

The melee tiles follow the Directorate Talos fork's reading of the recordings
(docs/notes/art-directorate-talos.md). `robot-struck.jpg` was generated but isn't used.

* **Modern melee**: the robot set carries `sabre: { col: [255, 64, 200], cuts: [68, 76], slash: 132 }`,
  so fightfx.js `drawSabre` gives the bayonet a pink glow and swing trail and blazes the slash.
* **Map icons**: drawn from shapes in `tools/art/athenakai-xai.mjs` (the jet with its torpedo, the
  spent jet, the robot with fins, antennae and rifle).
* **Rebuild**: `python3 tools/art/kai-convert.py tools/art/athenakai/<form>-src.jpg tools/art/athenakai/<form>.json 96 32`,
  `python3 tools/art/athenakai-poses.py`, `node tools/art/athenakai-xai.mjs`.
* **Wiring** (js/art/own.js): `import { ATHENA_KAI_JET, ATHENA_KAI_JET_SPENT, ATHENA_KAI_ROBOT } from './athenakai.js';`
  and SETS `athenaKaiJet: ATHENA_KAI_JET, athenaKaiJetSpent: ATHENA_KAI_JET_SPENT, athenaKaiRobot: ATHENA_KAI_ROBOT`.
* 14 of the 16 images budgeted.
