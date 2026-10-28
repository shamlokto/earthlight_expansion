# Directorate Talos: xAI art and the crimson sabre (2026-10-28)

New art for type 60 (`js/art/dirtalos.js`), generated with xAI's image model and reduced to the
game's formats; replaces the shape-drawn art (`tools/art/directorate-talos.mjs`, kept for reference).

## Sources and build

`tools/art/dirtalos/`: the prompts (`p-*.txt`) and the chosen generations: `picture-src.jpg` (the
old picture as style reference), `sheet-move.jpg` (a 3x3 pose sheet with the new picture as
reference), `sheet-melee-a.jpg` and `sheet-melee-b.jpg` (3x3 sabre sheets with the move sheet as
reference). 6 images used.

    python3 tools/art/kai-convert.py tools/art/dirtalos/picture-src.jpg tools/art/dirtalos/picture.json 96 32 '#6b5a7b'
    python3 tools/art/dirtalos-xai.py      # poses for both sheets -> fight.json
    python3 tools/art/dirtalos-icons.py    # map icon, iconArt, tokenArt -> icons.json
    node tools/art/dirtalos-xai.mjs        # -> js/art/dirtalos.js

The poses share one scale (the ready pose's body is 26 px of 32) and stand on one ground line, so
the machine keeps its size from frame to frame. Classic poses are in the craft fight rows' colours:
the armour in the army colour's darker half (it reads dark green for the Union), the blade 9 with a
white core (15), the Directorate marks 8-9.

## Which tiles the fights draw

* First sheet (weapon slot 0, the wrist beam; `fightscene.js` BASE): 0 ready, 4/8/12 the walk (4 is
  also the flight in), 64 firing. `poses` also keeps 68/72/76/128, as the old set had.
* Second sheet (slot 2, the beam sabre: `fightdata.js` MELEE, $04:D072): bodies 4 (the dash in),
  0, 68 (first cut), 72 (wind-up), 128 (sabre cocked), 76 (second cut), 8 (backing off); mutual
  melees also hold 12 (hovering) and 64 (guard) for 25-30 frames. 32x32 tile 132 is the slash
  itself: the recordings draw it as an effect over the cuts (from frame ~128 and ~144, the moments
  of 68 and 76) in the body's palette row, and briefly as a body in some mutual slots. These are
  `poses2` / `posesArt2`; `own.js` `ownPoseSet` now hands the second sheet's full-colour poses
  (`posesArt2`) to the modern renderer too.

## Bug fixed: the sabre never played its melee

Type 60 borrows the Talos's choreography (`look` 2). `lookSlot` mapped its sabre (slot 2, beam) to
the Talos's first beam weapon (slot 0), so a sabre attack played as a ranged beam fight. It now has
`keepSlots: true` (units.json), like the Pallas: slot 2 stays slot 2 and the melee recording plays.

## The crimson sabre

* Classic renderer: the slash (tile 132) is a crimson crescent with a white-hot edge, so every cut
  leaves a red arc instead of the Talos sheet's slash; the blade is red with a white core in every pose.
* Modern renderer (`fightfx.js` `sabreOf`, `drawSabre`, keyed by the set's `sabre`): the slash
  blazes (an additive copy and a crimson bloom, no shadow) and lights the machines around it; on
  the cuts (68, 76) the blade's tip glows and lights the scene; the tip leaves a fading crimson
  swing trail over the last 7 frames. Visual only: the recorded poses, timings and hits are unchanged.
