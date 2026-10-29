# Mars Kai and Cyclops Kai: xAI art (2026-10-29)

Own art for the Mars Kai (type 69, `ownArt: "marsKai"`, look 0) and the Cyclops Kai (type 70,
`ownArt: "cyclopsKai"`, look 16), in `js/art/kai2.js` (`MARS_KAI`, `CYCLOPS_KAI`), in the Kai
series' Galt-remnant style (white armour, magenta-pink stripes, gold trim, cyan glass).

## Sources and build

`tools/art/kai2/`: prompts (`p-*.txt`) and the chosen generations: `mars-src.jpg`,
`cyclops-src.jpg` (pictures, the Titan Kai's as style reference), `sheet-mars-move.jpg`,
`sheet-mars-melee.jpg`, `sheet-cyclops-move.jpg` (3x3 pose sheets facing left, the pictures and the
move sheet as references). 7 images used of the 12 budgeted.

    python3 tools/art/kai-convert.py tools/art/kai2/mars-src.jpg tools/art/kai2/mars.json 96 32
    python3 tools/art/kai-convert.py tools/art/kai2/cyclops-src.jpg tools/art/kai2/cyclops.json 96 32
    python3 tools/art/kai2-poses.py     # -> tools/art/kai2/<unit>-fight.json
    node tools/art/kai2.mjs             # icons from shapes; -> js/art/kai2.js

Poses share one scale per unit (the ready pose's body is 26 px of 32) and one ground line. Each
pose is 32x32 in the craft fight rows' colours (classic fights and the modern board's token) and
96x96 full colour (`posesArt`, `posesArt2`) for the modern fights. In the classic poses the armour is
five army bands, cyan glass and the bayonet 12-14, thrust and flashes white-hot (14-15; 8-11 would
turn blue for army A).

## Which tiles the fights draw

| unit | sheet | tile | moment | cell |
|---|---|---|---|---|
| Mars Kai | 1 (slot 0, beam rifle) | 0 | ready | move 1,1 |
| | | 4 | walk step (also the flight in) | move 1,2 |
| | | 8 | walk, legs passing (a pixel higher: the bob) | move 1,3 |
| | | 12 | walk step | move 2,1 |
| | | 64 | firing, cyan muzzle flash | move 2,2 |
| | 2 (slot 2, the melee: fightdata.js MELEE) | 4 | dash in on thrusters | melee 2,3 |
| | | 0 | ready | move 1,1 |
| | | 72 | wind-up, rifle drawn back | melee 1,1 |
| | | 68 | bayonet lunge (first cut) | melee 1,2 |
| | | 128 | pulled back for the second strike | melee 1,3 |
| | | 76 | rising bayonet slash (second cut) | melee 2,1 |
| | | 8 | backing off | move 3,1 |
| | | 12, 64 | hovering, blocking (mutual melees) | melee 2,3, 2,2 |
| | | 132 | the strike effect over the cuts: a cyan crescent | melee 3,1 |
| Cyclops Kai | both (no melee) | 0 | ready | move 1,1 |
| | | 8 | hovering on its thrusters (its flight) | move 1,2 |

## Wiring (js/art/own.js, by the parent)

    import { MARS_KAI, CYCLOPS_KAI } from './kai2.js';
    SETS: marsKai: MARS_KAI, cyclopsKai: CYCLOPS_KAI
    FX: marsKai: { beam: [90, 220, 255], rail: [140, 230, 255] }  (Cyclops Kai fires missiles only)
