# Azoras Kai art (type 78, 2026-10-30)

The General's last flagship: Ruess's keel-to-crown rebuild of the Azoras, same lineage (needle
prow, forward-swept wings, wingtip engine pods, heavy twin cannons on each wing) but longer, with a
huge needle prow, double flank turret rows, a gold crown on the bridge and glowing cyan muzzles.
Royal pearl-white, gold and deep crimson, cyan glass (no pink or magenta, so own.js ACCENT leaves it
alone).

* `js/art/azoraskai.js` (AZORAS_KAI), written by `python3 tools/art/azoraskai-xai.py && node
  tools/art/azoraskai-xai.mjs`. The Python step reuses the ships fork's helpers
  (`tools/art/ships-xai.py`) and the Azoras's reduction and alignment; sources and prompts in
  `tools/art/azoraskai/`.
* Same keys and sizes as AZORAS: art 96x96, icon, iconArt, token/tokenArt 36x24, hull 64x128,
  hull2 96x128, hullArt/hull2Art at 3x, shots { 0: 'missile', 1: 'redBeam' }.
* Map icon: hand-placed in `tools/art/kai-icons.mjs` (`azorasKai`, the Kai series' set); `iconArt`
  is the same grid in its own colours (region letters mapped to pearl, gold, crimson, gunmetal).
* Alignment (measured, identical to the Azoras's): hull2 cannon muzzles reach box x 89-96 on rows
  5-15 and 104-114; the hull covers x 15-28 on all of rows 22-110.
* own.js: SETS `azorasKai`, SCALE { hullScale: 1.55, hull2Scale: 1.45 } (the Azoras 1.4 / 1.3),
  FX rail gold.
* Images: 5 of 8 (two pictures, one refined picture from the better one, two top views). The
  first pictures came out too close to the Azoras; the refinement asked for four wing cannons,
  layered armour and more turrets.
