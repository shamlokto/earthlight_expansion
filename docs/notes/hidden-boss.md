# The hidden battle: Nineveh (mission 13, secret)

Owner, 2026-10-29: "a hidden boss for the expansion, a grand finale with a major fleet fight, more so
than the final fight; the user should be allowed to use 35 units (or more); a large, complex map and
many enemies."

## How it opens
* `missions/remnant/kessrin.json` carries `secret: { maxTurns: 24, unlocked, teaser }`. Winning the
  finale by turn 24 sets `state.secret` (js/expansion/battle.js finish); the result screen shows
  `unlocked`, or `teaser` when it was too slow.
* `missions/remnant/index-act4.json` (merged into index.json by tools/build-remnant-index.mjs) holds
  the entry `{ no: 13, secret: true, all: true, builds: 40, bonusSupply: 1200 }`: hidden until
  `state.secret`, then the next mission; every machine is buildable, up to 40 builds, and 1200
  supply arrive once. The index's `secretHint` shows on the campaign-complete screen while it is
  still locked.

## The battle (tools/missions/remnant/nineveh.mjs -> missions/remnant/nineveh.json)
59x40 hexes (4x4 screens, the engine's maximum). Sketch (one character per hex column group):

```
 ::  aaaaaa          WWHHHHHHH==HHWW          ppppp
 :  aa####aa       WWHHHHW=N=HHWW  T36        ppppp      Nineveh in her hull (Babylon's hull)
    a#=RY=#a     WWHHHH=HHWWHHHHW             m          T22 T29 T36: cannon towers
    aa####aa   WWHH=YHHT29HHWW                mmm  pp    Y/R: batteries on the railway
     aaaaaa   WHHT22HWWW                           pp    west: battery fort; east: anchorage
  gg gg   ggggggg ggg  ggggggggg   ggg  ggggggg  gg      the gravity veil (mecha can't cross)
       ^gap      |22   ^gap   |29     |36  ^gap          three gaps; three cannon lanes (|)
    ::    aaa    |  p   aa    |    p  |     aaa   ::     islands with bedrock, mines, plasma
   m     a#a     |       #    |       |     a#a      m
 pp  m           |  ::        |       |  ::         m pp magnetic lanes up from the south corners
      m     46 start hexes for the remnant (cap 40)    m
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ atmosphere ~~~~~~~~~~~~~~~~~~
```

* **Cannons**: towers (Cortex, type 56) at (22,12), (29,10), (36,6) on the hull; lanes x 22 from row
  13, x 29 from row 11, x 36 from row 7 to the bottom edge. At every phase change each lane whose
  tower stands destroys everything in it (events.js fireCannons). The AI keeps out of them.
* **The Nineveh** (type 77) on the turret railway in the hull's heart at (30,7), hold 26, carrying
  two Directorate Talos and two Athena Kai. Capital ships can't enter the hull (Babylon Hull class);
  craft can. Her guard: six Directorate Talos at level 8 on the hull, eight batteries on the railway.
* **Enemy at the start**: 97 on the map (+15 aboard carriers) = 112: 4 Nodens, 3 Tiamat, 3 Asura-II,
  2 Asura-II Kai, 2 Artemis + Hastur (with cargo), Siren, 3 Abaddons (held to turn 18), 4 Corvus,
  3 Hannibal, 2 Regulus, 2 Palmyra, 4 Fenrir, 2 Fenrir Kai, 2 Cerberus, 2 Gulon, Kai craft (Athena
  Kai, Lobster, Crane, Mars, Titan, Cyclops Kai), Talos, 14 batteries, 14 mines, 3 towers.
  Holds: the screen of cruisers and craft 3 turns, the battle line 10, Nodens 16, the Nineveh 26.
* **Enemy waves**: turn 6 west (8 + 6 aboard), turn 10 east (8), turn 15 from behind the hull (11),
  turn 20 (8): 41 more, about 150 in all.
* **Allies**: turn 8 a loyal Union fleet from the south-west (10); turn 12 Moraine's cartel on the
  'deal' choice, the Olympos guard on 'refuse' (8 each). Arrivals carry `when: { choice }`, filtered
  in the campaign loader (battle.js).
* Objective: the flagship (type 77) within 40 turns; the general must survive.

## Building it without the ROM
`node tools/build-missions-norom.mjs --dir remnant [--preview DIR] nineveh`. It learns each terrain
class's graphics and their neighbour patterns from the missions already built (missions/*.json,
missions/remnant/*.json) and stamps cells from built missions (`{ mission, from, to, at, classes }`;
here Babylon's hull from remnant/babylon.json, hull classes only). `--check name...` rebuilds an
existing mission and compares: every class matches; 88-95% of the graphics outside open space match
the ROM-built files on most maps (open space draws random starfield tiles either way). The ROM
builder (tools/build-missions.mjs) can't build nineveh (it doesn't know mission stamps); it now
passes `cannons` and `secret` through for other missions.

## Checks
* placement: every unit and arrival on a hex its kind can enter (the builder checks); 40 of a
  44-machine late roster deploy (capital ships included) via campaign.applyRoster.
* `node tests/expansion-norom.mjs missions/remnant/nineveh.json 2`: runs, no ROM reads (the random
  test player loses its general early, as on every remnant map).
* AI turn time with about 150 machines: about 120-160 ms a turn, 260 ms at most.
* the secret: the finale won on turn 20 or 24 opens mission 13; on turn 28 it doesn't.
