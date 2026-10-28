# Leviathan: generated art and the super-cannon (2026-10-28)

**Art** (`js/art/leviathan.js`, written by `tools/art/leviathan-xai.mjs` after
`tools/art/leviathan-xai.py`; sources and prompts in `tools/art/leviathan/`; the old shape tool
`tools/art/leviathan.mjs` is marked superseded). Same keys and sizes as before: picture 96x96,
icon 24x16 (army rows 1-7), iconArt 24x16, tokenArt 40x24, hull 96x128 (ships' fight rows: 2-7 hull,
8-11 red trim, engine glow, muzzle) and hullArt 288x384. A black-and-gunmetal dreadnought with
blood-red trim, four red-burning engines and a spinal super-cannon with a violet muzzle.
* Picture: generated three-quarter view, dark tones lifted before the 32-colour reduction.
* Hull: generated top-down plan (3:4), bow right, fitted to the 96x128 box the Nodens's recorded
  hull settles in (`SHIP_ATTACKS['32/1/s']`: left side x 1-65, y 4-132; the own hull is drawn from
  the box's left edge). The muzzle is moved to hull row 60 and sits at (90.2, 60.6) in the box:
  the recording's beam runs along screen y 60-68 (hull rows 56-64), starting at x 49-73.
* Token: generated side profile, 40x24 full colour. Icons: drawn from shapes after the side view.

**The cannon** (`js/render/fightfx.js` `levCannon`, `levCannonTick`, `drawLevCannon`; visual only).
The Leviathan's weapons all fight with the Nodens's one recording (look slot 1), so the set's
`shots` are 'levCannon' and `gameapp.js` now passes the weapon really used (`ownSlot`):
* slot 1, the missile 255 at 2-5 (the super-cannon): 48 frames before the recorded fire frame a
  violet orb swells at the muzzle with energy streaks drawn in and arcs; at the fire frame a flash
  (whiteout), quake and punch-in, then a thick violet beam (halo, body, white core, throbbing, with
  pulses running down it) to the target's near edge, shock rings and sparks there, until the
  recording's shots are gone; the muzzle glows down afterwards.
* slot 0, the beam 154: a short charge and a thinner lance. Slot 2, the railgun: three red streaks.
* The recorded shot sprites are not drawn; explosions, hits and timing are the recording's. Against
  craft (no recording; the modelled broadside fires at frame 129) the beam aims at the squad.
* Classic renderer (`fightscene.js` `buildSprites`): its effect row turns violet.
