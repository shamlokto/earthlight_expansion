# Nineveh: generated art and Babylon's cannon (2026-10-29)

The hidden boss (type 77, Ahriman's fortress ship, Babylon's sister).

**Art** (`js/art/nineveh.js`, written by `tools/art/nineveh-xai.mjs` after
`tools/art/nineveh-xai.py`; sources and prompts in `tools/art/nineveh/`). Same keys and sizes as the
Leviathan's set: picture 96x96, icon 24x16 (army rows 1-7), iconArt 24x16, tokenArt 40x24, hull
96x128 (ships' fight rows: 2-7 hull, 8-11 the gold trim, engines and muzzle) and hullArt 288x384,
`muzzle`, `shots`. A flying citadel of obsidian and emerald with gold battlements, a crowned spire,
four gold-white engines and Babylon's main cannon in the bow, its muzzle a white-gold sun; crescent
armour wings in the top view.
* Picture: generated three-quarter view (text only, so it doesn't borrow the Leviathan's look); dark
  tones lifted (gamma 0.82) before the 32-colour reduction.
* Hull: generated top-down plan (3:4), bow right, fitted to the 96x128 box the Nodens's recorded hull
  settles in, as the Leviathan's (docs/notes/art-leviathan.md). The muzzle is found as the white-gold
  glow in the bow third (the stern engines glow too) and moved to hull row 60: it sits at
  (87.7, 60.6) in the box, on the recorded beam's line (screen y 60-68, hull rows 56-64).
* Token: generated side profile, 40x24 full colour.
* Icons: placed pixel by pixel (shapes blurred at 24x16): stepped terraces, a crowned spire, gun
  ports, stern engines and the cannon with its muzzle; the army-row icon and the full-colour one.
* Images: 5 (two pictures, two top views, one side view).

**Shots** (`js/render/fightfx.js`, visual only; recorded timings and hits unchanged). The Nineveh
fights with the Nodens's one recording, so its `shots` go by the weapon really fired (`ownSlot`;
`shotKind` and `levCannon` now prefer it over the look's slot):
* slot 1 'nvCannon', Babylon's cannon (`drawNvCannon`, `nvCannonTick`): an 80-frame charge while the
  ship arrives (a white-gold sun swelling at the bow, twelve rays turning, energy pouring in, the
  screen darkening), then at the recorded fire frame a near white-out, a long quake and a punch-in,
  a colossal throbbing beam (five layers to a white core) with pulses running down it, shock rings
  where it lands, scorch decals, and a scorched path and cooling muzzle for 70 frames after.
* slot 0 'nvCannon', the batteries: a short charge and a fan of gold beams, one to each machine on
  the other side (up to six), flickering, with sparks where they land.
* slot 2 'missile': the recorded shots as homing missiles (the Azoras's missiles).
* Classic renderer (`fightscene.js`): its effect row turns white-gold for 'nvCannon'.

**Cannon lanes on the board** (`js/render/board.js` `laneBlast`, `js/gameapp.js` `phaseEvents`; any
map with cannons, the Buccaneer's and the expansion's): on the modern board each cannon's white-gold
beam sweeps down its column from the cannon to the edge (~0.45 s), its head flaring, each hex
flashing as it is crossed and throwing burning debris, then it cools; cannons fire 110 ms apart and
the board shakes; about 1.5 s in all. Reduced motion: a still beam, no debris or shake (0.7 s). The
classic board keeps the hex flash.
