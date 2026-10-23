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

## Milestone 6: the game (`game.html`)

The pieces now run as a campaign: title screen, the story intro, mission briefings and titles
(English with the patch), all 30 missions in order with saved progress (browser storage),
victory and defeat screens with the game's own lines, and the ending. Each mission starts with
the units the original places, read from the ROM: the deployment, extra units such as command
towers, fortresses, units waiting inside docks and carriers (click a dock or carrier to launch
them), the opening warp-in of maps 1, 6, 12 and 17, and turn-keyed reinforcements. Every
attack plays the fight scene with its info screen.

**Map scripts** (`js/game/scripts.js`): every mission has an objective, shown after the
briefing and in the battle panel. A side is defeated when it has nothing left, loses all of
its command centres (Brain) or loses its fortress; on top of that the Union wins maps 6, 10
and 17 by sinking the flagship (Tiamat, Iris, Hastur) and map 13 by sinking every carrier, and
must finish map 29 (Babylon) within 18 turns. Galt units next to their own command centre or
fortress are guards: they hold their post and only fire at units that come close. The victory
line on the result screen is the one the game uses for that kind of win.

**Rules from the ROM** (`js/game/rules.js`): levels (+1 per fight, +2 for a kill or for coming
through unhurt, up to 9, feeding the level bonus table), neutral docks (grey) that you capture
with everything inside by bringing them to 0 HP, docks repairing themselves 2 HP a turn,
boarding a dock or carrier for a full repair and re-arm (yellow hexes), the Athena and Siren
transformations (button on the unit card), bombers and missile ships switching to their spent
form after the bomb or missile and moving again, and destroyers moving again after firing.
The game has no unit production, and units and levels don't carry over between maps.

**Campaign**: save the battle at any time (Save), load it from the title screen, restart a
mission, and replay any mission you've reached. After clearing the last mission, the title
screen offers hard mode (both sides attack ×2, the original's second-round option).

Not yet: the original AI (the stand-in AI can stall on large maps), the Buccaneer cannon,
comet, afterburner and mine-clearing events of maps 11, 19, 21, 23, 25 and 28, the points and
rank screen, and the original title and menu graphics.

## The original AI (`js/game/ai.js`)

The computer opponent now follows the game's own AI, decoded from bank `$01`. Each turn it
runs the original's phases in order: per-map scripted orders for chosen Galt units (drop
troops, move to a hex, wait N turns), damaged units and spent bombers back to a dock,
attacks, then the rest walk the map's waypoint routes, and docks and carriers put their
cargo out at the end of the turn. Targets go by the game's priority (a per-type value, the
mission's key units, and how much of Galt's force each enemy threatens). An attack is only
made when the damage dealt beats the counter-attack, from the best free hex in range.
Details in [docs/FORMATS.md](docs/FORMATS.md) ("Computer opponent"). AI-vs-AI runs of all 30
maps finish each turn in well under 0.2 s (map 30: about 20 ms).

## Unit description art (`js/unitart.js`, `js/unitinfo.js`)

The large unit pictures from the original's unit info screen are drawn from the ROM: each
unit's tile set and palette, assembled from the game's own sprite frame. Checked pixel for
pixel against the emulator (Mars, Talos and Tiamat: every pixel of the 96×96 picture matches).
The lab's Units tab shows every picture with the English unit info (mount, role, description)
when the patch is loaded, and in `play.html` right-clicking a unit, or the Info button on its
card, opens an info screen laid out like the original's: picture, name and model code, weapon
table, movement / defence / HP, map icon with role, and description.

## Sound and music (`js/audio/`, `soundlab.html`)

The original soundtrack and effects, played the way the SNES does it: the game's own SPC700
sound driver, sequences and BRR samples (assets 822–834) are uploaded from your ROM into an
emulated SNES sound unit (SPC700 CPU, timers and S-DSP with BRR decoding, gaussian
interpolation, ADSR/GAIN envelopes, noise, pitch modulation and echo), written for this
project from the fullsnes hardware reference and run in an AudioWorklet at 32 kHz. No audio
ships with the project.

* **`soundlab.html`** plays the game's own 113-entry sound test and every command of every
  song group, labelled with where the game uses it (map, army phase, fight effect), with
  per-voice level meters, stop, fade-out, mute and volume.
* **`play.html`** plays the map music the way the game picks it (per map and per army phase,
  switching to the tension tracks when one side has twice the other's units) and the
  original effects in fight cut-ins: info-screen ticks, fly-in, each unit type's weapon
  sound and explosions. The game has no separate fight music: the map song keeps playing
  under the cut-in, as in the original. Audio starts on the first click; **Mute** is in the
  header and is remembered.

## Roadmap (owner's priorities)

1. **Battle animations**: the cut-in fight scenes are the most important thing to keep.
2. **Unit description graphics**: done (see above; the art is assets 207–278 assembled from
   sprite frames in bank `$06`).
3. **Sound and music**: done (see above). Title, menu, briefing, interlude and ending songs
   are exported for those screens (`SONGS` in `js/audio/sound.js`). Open: event music from map
   scripts, and four songs not yet tied to a screen (likely mission lost / game over / staff roll).
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
| `game.html`, `js/gameapp.js` | the campaign |
| `js/game/scenario.js` | per-map units: deployment, extras, fortresses, dock cargo, warp-in, reinforcements |
| `js/game/scripts.js` | per-map objectives, guards, turn limits |
| `js/game/savegame.js` | campaign progress and the battle save slot (localStorage) |
| `js/unitart.js`, `js/unitinfo.js` | unit description art and the unit info screen |
| `fightlab.html` | development page: renders a fight at any frame, to compare with emulator captures |
| `js/audio/` | sound: SPC700 + S-DSP emulator (`spc.js`), AudioWorklet (`worklet.js`), API and ROM tables (`sound.js`: `Sound.playSong/playSfx/stop/setMuted`, `soundTest`, `trackTable`, `mapMusic`), fight effects (`fightsfx.js`) |
| `soundlab.html` | sound test: every song and effect from the ROM |
| `research/` | Python tools used to reverse-engineer the game: a 65816 + DMA emulator (`emu.py`), disassembler (`dis65.py`), reference decoder (`decomp.py`), sound upload blocks (`spc_blocks.py`) fight sound capture (`spc_fightsfx.py`) and a boot/song logger (`spc_boot.py`). Set `EARTHLIGHT_ROM` to your ROM path. |
