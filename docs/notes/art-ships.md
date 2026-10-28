# Azoras and Selene Kai: xAI art (2026-10-28)

Owner's request: redo the new units' art with xAI, including the map icons and the fight scenes.

* **Generator**: `python3 tools/art/ships-xai.py && node tools/art/ships-xai.mjs` writes
  `js/art/azoras.js` and `js/art/selenekai.js`. `tools/art/azoras.mjs` and `tools/art/selene-kai.mjs`
  (the old shape-drawn art) are superseded and marked so at the top.
* **Sources** (`tools/art/azoras/`, `tools/art/selenekai/`): `picture-src.jpg` (three-quarter view,
  the unit-info picture) and `top-src.jpg` (the same ship from directly above, bow right, generated
  with the picture as its reference so both are one design), with their prompts (`p-*.txt`).
  The Azoras picture used the Lobster Kai picture as a style reference; the Selene Kai's was made
  without one, because the reference pushed the Lobster's twin prongs onto it.
* **Pictures**: 96x96, 32 colours plus backdrop and outline (`tools/art/kai-convert.py`).
* **Fight hulls**: built at 3x in full colour (`hullArt`, `hull2Art`, the modern renderer) and
  shrunk to the classic hulls in the ships' fight-row colour numbers (2-7 hull light to dark, 8-11
  metal, outline 7), so both show the same ship. The Selene Kai gains a `hullArt` (192x384), so the
  modern fights draw it in full colour too (js/render/fightfx.js `ownHullArt` reads any set's
  `hullArt`). Alignment kept, measured on the output:
  * Selene Kai `hull` 64x128, bow right: the rails span y 6-15 and 117-124 at the bow end (centres
    10.5 and 120.5; the Selene's barrels fire from y 11 and 121).
  * Azoras `hull2` 96x128, bow right: the wing cannons' twin barrels reach the box edge at y 7-8,
    11-12 and 104-110 (emitters x 89-96, y 3-19 and 101-116). The generated top view had the
    cannons' muzzles level with the middle of the hull, so their barrels are drawn out to x 95.
  * Azoras `hull` 64x128, the top view turned bow up: body under box x 15-28 on all of y 22-110
    (the battery ports).
* **Board tokens**: from the top view, bow right: Selene Kai `token` 32x21 (fight-row numbers),
  Azoras `token` and `tokenArt` 36x24.
* **Map icons**: drawn from shapes in `ships-xai.mjs` after the top views (24x16, icon rows 1-7;
  the Azoras's also in its own colours for `iconArt`); thin parts (rails, barrels) are thick shapes
  with a light centre line, so they keep an outline.
* **Images**: 10 of the ships fork's 20 (2 Azoras pictures, 4 Selene Kai pictures, 2 top views each).
* Not checked in the browser (no ROM here); the classic palette previews use an approximate
  fight palette.
