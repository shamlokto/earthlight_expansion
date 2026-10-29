# Naga art redone with xAI (2026-10-28)

The owner asked for the new units' art to be redone with xAI's image model, map icons and fight
scenes included. The Naga (type 21, Union rail pod) keeps its design idea (the Phoibos's rail stack
on top, the Vulcan's ringed beam cannon below, blue capacitor orbs, a hover skid) and its Union
colours (gunmetal green, cyan optics).

* **Unit-info picture**: generated (`tools/art/naga/picture-src.jpg`, with the old shape-drawn
  picture as the style reference), reduced to 96x96 with 32 colours and an outline by
  `tools/art/kai-convert.py` (backdrop `#4a5a6b`, as before).
* **Fight poses** (`tools/art/naga-poses.py`): from one generated side view
  (`tools/art/naga/side-src.jpg`, guns level, facing left like the ROM's sheets). The Naga keeps
  the Phoibos's choreography, which draws poses 0 (level), 4 and 8 (guns rising) and 12 (full
  elevation, recoil jets firing). As in the shape-drawn version the whole pod turns about a pivot
  in its body (0°, 9°, 20°, 27°) and lifts a little; one scale for all four so the most raised
  pose fits. Each pose comes as 32x32 in the craft fight rows' colours (classic fights and the
  modern board's token; gun metal in the dark army tones, armour in the light ones) and as a
  96x96 full-colour `posesArt` for the modern fights (new: the Naga had none).
* **Map icon**: drawn from shapes (`tools/art/naga-xai.mjs`), after the side view.
* `node tools/art/naga-xai.mjs` writes `js/art/naga.js`; `tools/art/naga.mjs` is superseded.

Four of the owner's image budget used (two pictures, two side views).
