# Earth Light remake lab

A faithful remake of Hudson Soft's *Earth Light* (Super Famicom, 1992), built by
reading the original data straight from your own ROM. No game data ships with
this project: graphics, maps and units are decoded in the browser from the ROM
you load.

## Milestone 1: extractor and map viewer

* **Maps**: all 30 battle maps rendered from the ROM, with starting units for both
  armies, a hex-grid overlay, per-cell inspection and PNG export. Map 1 (HAMILTON) was
  checked against the running game: 99.4% of pixels identical (the rest is one animated
  base cell).
* **Unit icons**: all 40 map icons for each army, with both animation frames.
* **Assets**: browser for all 835 entries in the game's asset table, with tile, palette,
  tilemap and hex views.

## Milestone 2: unit and terrain rules

**Units** and **Terrain** tabs: all 58 unit types (HP, movement, evasion, 4 weapon slots
with mode/range/power), the damage formula, terrain defence per weapon mode, and the
movement-cost matrix, all read from the game's own tables.

## Milestone 3: text

**Text** tab: intro, all 30 mission briefings, unit info for 39 units, terrain names and
descriptions, win/loss/alert messages, map titles and the ending, in English. English names
also appear in the Units, Terrain and Maps views.

The English comes from Nezz's fan translation (GPL-3.0,
[HoratioVex/Earthlight-1-Translation](https://github.com/HoratioVex/Earthlight-1-Translation)):
load its `.bps` (or `.zip`) in the Text tab. It's applied to your ROM in memory and only read
for text. Neither the ROM nor the patch is included here.

## Milestone 4: battle prototype (`play.html`)

Pick any of the 30 maps and play Army A against a simple computer opponent (or a second
human). The rules come from the decoded tables: hex movement with terrain costs and zone of
control, weapon ranges and targeting, the damage formula with support, terrain defence and
simultaneous counter-attacks. Not done yet: map scripts (reinforcements, objectives),
transformation, levels, the original AI, and battle animations.

## Milestone 5: fight scenes (in progress)

Every attack in `play.html` now plays a fight cut-in (`js/game/fightscene.js`). It's a
hand-written JavaScript rewrite modelled on fights recorded from the original in the
emulator, using the ROM's own background, sprite and effect graphics. Small craft (mecha,
fighters) look right, and 15 unit types have their own measured variant: projectile tiles and
speeds, lobbed artillery shells (Titan, Gunner), curving missiles (CUM-7), diving missiles
(Hydra), thruster flames and fly-in poses for fighters and transforming units, and turrets
that start in place. Capital ships use per-type hull layouts and their own weapon patterns
(fanned shots, curving shots or broadsides).

Each fight now opens with the original's **info screen** (`js/game/infoscreen.js`): names
and model codes, 機数, 攻撃力/防御力 as the game computes them, the 包囲効果 and
支援効果 hex diagrams with the neighbouring units, and the 地形効果 panel with weapon mode,
terrain % and level emblem. It's drawn from the ROM's own tiles, tilemap and palette, in
English when the patch is loaded. `fightlab.html` replays the captured test fight at any frame
(start `serve.py` with `--rom`/`--patch`).

## Roadmap (owner's priorities)

1. **Battle animations**: the cut-in fight scenes are the most important thing to keep.
2. **Unit description graphics** (large unit art on the info/dock screens: assets 483/484
   plus bank `$04`/`$05` art, routine `$02:E26B`): keep as-is.
3. **Sound and music**: keep the originals (SPC700 driver and songs, assets 822–833).
   This needs SPC700 emulation or an offline render.
4. Map scripts, transformation, levels, then the original AI. Check the web first for
   documented mechanics before decoding them from the ROM.

Formats and addresses are documented in [docs/FORMATS.md](docs/FORMATS.md).

## Run it

```bash
python3 serve.py
```

Then open http://localhost:8765 and choose `Earth Light (Japan).sfc` (or the
`.zip` it came in). The ROM is remembered in that browser only; **Forget ROM**
clears it.

## Layout

| path | what |
|---|---|
| `js/rom.js` | LoROM access, asset table, LZSS / bitplane-xor decoders |
| `js/maps.js` | hex map composition, deployments, unit icons |
| `js/gfx.js` | SNES tile/palette helpers |
| `js/app.js` | viewer UI |
| `js/game/` | battle rules, AI, fight scene and its info screen |
| `fightlab.html` | development page: renders a fight at any frame, to compare with emulator captures |
| `research/` | Python tools used to reverse-engineer the game: a 65816 + DMA emulator (`emu.py`), disassembler (`dis65.py`), reference decoder (`decomp.py`). Set `EARTHLIGHT_ROM` to your ROM path. |
