# Fenrir Kai and Asura-II Kai: xAI art (2026-10-29)

Owner's request: the new Kai units drawn with xAI, beautiful on the map and in the fights.

* **Generator**: `python3 tools/art/kai3-xai.py && node tools/art/kai3-xai.mjs` writes
  `js/art/kai3.js` (`FENRIR_KAI`, `ASURA_KAI`). The Python step reuses tools/art/ships-xai.py's
  helpers (that file now runs its own build only as a script).
* **Sources** (`tools/art/kai3/`): `<unit>-picture-src.jpg` (three-quarter view, the Azoras's
  picture as the style reference) and `<unit>-top-src.jpg` (the same ship from directly above, bow
  right, generated with the picture as its reference), with their prompts (`p-*.txt`). Kai-series
  colours: pearl-white armour, magenta-pink stripes, gold trim, cyan lights.
* **Pictures**: 96x96, 32 colours plus the Kai series' backdrop `#6b6b9c` and outline.
* **Fight hulls**: built at 3x in full colour (`hullArt`, `hull2Art`, the modern renderer) and shrunk
  to the classic hulls in the ships' fight-row colour numbers. Each stands in the box of its look's
  recorded hull (js/game/fightscene.js drawOwnHull), aligned to where the recordings' shots start
  (js/game/fightdata.js SHIP_ATTACKS, measured at the fire frame):
  * Fenrir Kai `hull` 64x64 (the Fenrir's top-down hull, box y 40-104, bow right; shots leave box
    x 62-70, y 19-39): the spine railgun's muzzle on the right edge at y 29.5, stern at x 1.
  * Asura-II Kai `hull` 64x128 (the Asura-II's hull against craft, slots 0 and 1/c; shots leave the
    right edge x 63 at y 68-116): the top view turned bow up, flanks out to x 1 and 63, length
    drawn out 1.25x to fill y 17-127.
  * Asura-II Kai `hull2` 96x128 (its top-down hull against ships, second sheet, recording 31/1/s;
    shots leave x 92-108, y 45-77): the rail battery's muzzles at x 95 on y 61.
  The Asura-II Kai's slot 0 (missiles) only hits small craft and its slot 1 (railgun) only ships, so
  `hull` is what craft see and `hull2` what ships see (own.js ownHullSet).
* **Board tokens**: from the top views, bow right, in the ships' fight rows: Fenrir Kai 32x16,
  Asura-II Kai 36x24.
* **Map icons**: drawn from shapes in kai3-xai.mjs after the top views (24x16, icon rows 1-7); the
  barrels are one-pixel lines drawn last.
* **Images**: 8 of this fork's 14 (2 pictures and 2 top views per unit).
* No code changes were needed: own hulls of any size up to 128x128 already work
  (own.js ownHullTiles, fightfx.js ownHullArt), and `hull2` is chosen per sheet.
* Not checked in the browser (no ROM here); the classic previews use an approximate fight palette.
