# Mars Kai and Cyclops Kai: xAI art (2026-10-29)

Own art for the Mars Kai (type 69, `ownArt: "marsKai"`, look 0) and the Cyclops Kai (type 70,
`ownArt: "cyclopsKai"`, look 16), in `js/art/kai2.js` (`MARS_KAI`, `CYCLOPS_KAI`). The Mars Kai is
in the Kai series' Galt-remnant style (white armour, magenta-pink stripes, gold trim, cyan glass;
js/art/own.js recolours its accents at load). The Cyclops Kai was redrawn on 2026-10-29 after the
owner's feedback ("doesn't capture the missile boat") as a missile boat in its own colours:
charcoal-gunmetal hull, hazard-yellow stripes, launcher racks of red-tipped missiles, a block of
launch cells on the spine, a small amber-lit bridge, a cyan sensor eye at the bow, two engines.

## Sources and build

`tools/art/kai2/`: prompts (`p-*.txt`) and the chosen generations: `mars-src.jpg`,
`cyclops-src.jpg` (pictures; the boat's from text alone, so it takes none of the white-and-pink
style), `sheet-mars-move.jpg`, `sheet-mars-melee.jpg` (3x3 pose sheets facing left, the pictures and
the move sheet as references), `sheet-mars-walk.jpg` (a strip of three walk poses from the move
sheet's ready pose; its drawn ground line is cut off), `sheet-cyclops-idle.jpg` and
`sheet-cyclops-fly.jpg` (side views facing left from the boat's picture; the flight from the idle
view, so the two match). 7 images for the first cut, 8 for the boat and the Mars Kai's walk.

    python3 tools/art/kai-convert.py tools/art/kai2/mars-src.jpg tools/art/kai2/mars.json 96 32
    python3 tools/art/kai-convert.py tools/art/kai2/cyclops-src.jpg tools/art/kai2/cyclops.json 96 32
    python3 tools/art/kai2-poses.py     # -> tools/art/kai2/<unit>-fight.json
    node tools/art/kai2.mjs             # icons from shapes; -> js/art/kai2.js

Poses share one scale per unit and one ground line: the Mars Kai's ready pose's body is 26 px of 32,
and the walk strip is scaled so its passing pose stands as tall (`MATCH` in kai2-poses.py). The boat
is scaled by its hull's length (30 px of 32) and centred on the frame's middle. Each
pose is 32x32 in the craft fight rows' colours (classic fights and the modern board's token) and
96x96 full colour (`posesArt`, `posesArt2`) for the modern fights. In the classic poses the armour is
five army bands, cyan glass and the bayonet 12-14, thrust and flashes white-hot (14-15; 8-11 would
turn blue for army A). The boat's classic poses keep its hull in the three darkest army tones, its
hazard stripes in the lightest and its missile tips between, so the dark boat doesn't wash out.

## Which tiles the fights draw

| unit | sheet | tile | moment | cell |
|---|---|---|---|---|
| Mars Kai | 1 (slot 0, beam rifle) | 0 | ready | move 1,1 |
| | | 4 | walk contact: left foot planted ahead (also the flight in) | walk 1 |
| | | 8 | walk passing: the right knee swinging through, body highest | walk 2 |
| | | 12 | walk contact the other way | walk 3 |
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
| Cyclops Kai | both (no melee) | 0 | idle: hatches shut, engines cold | cyclops-idle |
| | | 8 | flight: engines blazing, launch hatches open | cyclops-fly |

The boat's map icon (kai2.mjs `ICONS.cyclops`, facing right): a long low hull with a pointed bow,
the launch-cell block on the spine with its hatches, the flank rack with its tubes and missile tips,
the bridge window, a dark keel line and the engines' glow.

## Wiring (js/art/own.js, by the parent)

    import { MARS_KAI, CYCLOPS_KAI } from './kai2.js';
    SETS: marsKai: MARS_KAI, cyclopsKai: CYCLOPS_KAI
    FX: marsKai: { beam: [90, 220, 255], rail: [140, 230, 255] }  (Cyclops Kai fires missiles only)
