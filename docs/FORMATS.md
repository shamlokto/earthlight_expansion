# Earth Light (Japan, Hudson Soft 1992) — data formats

Everything here was found by tracing the game in a small 65816 emulator
(`research/emu.py`) and reading the routines involved. Formats marked
**verified** were compared byte-for-byte or pixel-for-pixel with the running game.

ROM: 1 MB (8 Mbit) LoROM with battery-backed SRAM, internal title `EARTH LIGHT`.
Addresses below are SNES addresses (`$bank:addr`); `lorom()` converts them to
file offsets.

## Asset table — `$00:AEF5` (verified)

835 entries of 10 bytes. The game selects one by writing its index to `$0FD7`
and calling the loader at `$00:CFDE`.

| offset | size | meaning |
|---|---|---|
| 0 | 1 | high nibble: kind; low nibble: compression type |
| 1 | 2 | *lead*: zero bytes before the data (in practice, a VRAM offset) |
| 3 | 2 | *data*: decoded size in bytes |
| 5 | 2 | *trail*: zero bytes after the data |
| 7 | 3 | 24-bit pointer to the encoded data |

Kinds: 0/1/2 = tiles, 4 = 8bpp tiles, 5 = palette (BGR555), 6 = 32×28
tilemap, 7 = other data (maps, unit icons, sound driver/music at 822–833).

### Compression types

* **0 raw**: copy bytes.
* **1 bitplane-xor** (`$00:D280`): per 16 bytes (an 8×8 tile with 2 planes), read two
  mask bytes. For each of the 8 rows and each plane, a set mask bit (MSB first) means
  "read a byte". That byte is XORed into the plane's running row value, and the
  running value is emitted.
* **2 lzss** (`$00:9C55`): a 256-byte ring buffer starting zeroed, with the write position at `$EF`.
  Each flag byte supplies 8 bits, MSB first. A 1 bit means a literal byte (stored in the ring).
  A 0 bit means a copy from an absolute ring position (1 byte). Copy lengths are 4-bit
  nibbles, one length byte shared by two consecutive copies (low nibble first); the
  length is nibble + 2. A read past `$xx:FFFF` continues at `$(xx+1):8000`.
* **3 lzss+xor**: LZSS output fed through the bitplane-xor coder.

## Battle maps (verified on map 1)

30 maps. Names: 30 × 8 ASCII bytes at `$01:DB3A`.

| table | per map |
|---|---|
| `$01:D13E` | word: asset id of the 160-byte map header (732 + 3n) |
| `$01:D102` | word: asset id of the grid (733 + 3n) |
| header id + 2 | starting deployment (734 + 3n) |
| `$01:D19E` | byte: size in screens; low nibble = width, high = height. One screen = 15×10 cells |

* **Grid**: 62×42 bytes (RAM copy at `$7E:2352` uses a 64-byte stride). The playfield
  starts at cell (1,1); row/column 0 and the last row/column are borders.
* **Header**: byte `v` (0–79) is the terrain graphic used for map value `v`. Its graphic
  is asset **485 + header[v]**. The global terrain id also indexes `$01:CE7E` and `$01:CECE`
  (terrain class and attributes, not yet decoded).
* **Hex layout**: flat-top hexes in a 24×16 box with vertices (8,0) (16,0) (24,8) (16,16)
  (8,16) (0,8). Column `x` sits at pixel `16x`; odd columns are shifted down 8 px. The game
  ORs overlapping cell graphics together into an 8bpp BG1 "framebuffer" (mode 4).
* **Cell graphic** (288 bytes): 6 tiles in a 3×2 grid. Each tile is 48 bytes: 32 bytes of
  4bpp, then 8 bytes for bitplane 5 and 8 bytes for bitplane 6 (palette row select).
* **Palette** on the battle screen: CGRAM row 0 = asset 110, rows 1–7 = asset 193
  (terrain), rows 8–15 = asset 192 (units).
* **Deployment**: `count`, then `count` × (`army<<7 | unit type`, `x`, `y`).

## Unit map icons (verified)

* Army A icons: asset 0 (raw, bank `$04`). Army B icons: asset 1 (raw, bank `$05`).
* 40 icons × 240 bytes, plus a second animation frame at +`$2580`.
* An icon is 6 tiles (3×2, 24×16 px) of 40 bytes each: 32 bytes 4bpp + 8-byte mask.
* Drawn pixels are `4bpp | $80` (army A, palette row 8) or `| $A0` (army B, row 10).
* Unit type → icon: `$01:EE2C[type]`. Further per-type tables at `$01:F206` and `$01:F676`
  are not yet decoded.

## Unit types — bank `$01` (milestone 2, read from the game code)

58 types. Byte tables are indexed by type `t`; `[4]` tables by `t*4 + slot`.

| table | meaning | evidence |
|---|---|---|
| `EE2C` | map icon index | spawn `$01:E98D` |
| `EE66` | name, 8 bytes half-width katakana (JIS X 0201) | — |
| `F036` | model code, 8 bytes ASCII ("HUB-01") | — |
| `F206` | high nibble category (→ unit `$1B5B`), low nibble starting level | movement/damage code |
| `F240` | movement points | `$01:B609`, transform `$01:A01D` |
| `F27A` | points per HP of damage taken (battle statistics) | `$01:9FB8` |
| `F2B4[4]` | weapon attack mode + 1 (0 = empty slot) | `$01:853A` |
| `F39C[4]` / `F484[4]` | weapon min / max range (min ≥ 2 = indirect, no counter) | `$01:856F` |
| `F56C` | move-or-fire: indirect fire forbids moving that turn | `$01:85E7` |
| `F676` | max HP (8 for small craft, 10–30 for capital ships) | `$01:ABEE` |
| `F6B0[4]` | weapon power | `$01:A982` |
| `F798` | evasion (damage reduction /128) | `$01:A98A` |
| `AC3D` | level bonus ×n/16 for levels 0–9 | `$01:AC20` |

Consecutive types with the same name are the two forms of a transforming unit;
the game transforms by incrementing the type. Categories 1–6 are capital ships
and structures, 7 is the dock, and 8 and up are small craft (mecha, fighters,
artillery…). Counter-attack: slot 0 against small craft, slot 1 against capital
ships, slot 2 against slot 2. Slot 3 and indirect fire get no counter.

### Damage (`$01:A976–AC3C`)

```
P  = F6B0[atk*4+slot]
P *= (128 - min(128, F798[def] + defender's adjacent-ally support)) / 128
P *= (128 - D042[targetClass*4 + mode]) / 128          ; D042 = D002 * 1.28
P *= HP (small craft)  |  HP*8 / F676[atk] (capital ships)
P += attacker's adjacent-ally support (power/4)
P *= AC3D[level] / 16 ; x2 if $06E9 ; + random ($00:CF93)
defender HP -= P / 128
```

## Terrain (milestone 2, verified on map 1 against RAM `$7E:2DD2`/`$7E:3852`)

`id = header[80+v]` → `type = $01:CE7E[id]` (0–$21) → `class = $01:CECE[type]` (0–15).
`CE7E` deliberately runs into `CECE`, since ids reach 99.

| table | meaning |
|---|---|
| `CF12[(cat-1)*16 + class]` | movement cost (0 = impassable, `FF` = ends movement); flood fill `$01:B605` |
| `D002[class*4 + mode]` | defence % per weapon mode (printed in the terrain window, `$01:D4C2`) |
| `D042` | the same, scaled to /128 for the damage formula |
| `D0C2[class*4 + mode]` | 1 = a target on this class can be attacked with this mode |
| `D082[class*4 + mode]` | second targeting/visibility flag (`$01:E1DB`), purpose not confirmed |

Class 10 is impassable and is also written as the frame around every map. A
1-screen map's playable area is columns 1–14 and rows 1–10.

## Weapon modes and line of fire (from the in-game terrain screen)

* Attack modes M1/M2/M3 = **B ビーム兵器 Beam / N レールガン Railgun / M ミサイル Missile**.
* `D082[class*4+mode]` = 射線通過, whether a shot of that mode passes through the terrain.
* Surrounded: `$06CF` is set when all 6 hexes around the defender are occupied (`$01:A91A`),
  which halves its evasion.

## Scenes (milestone 5, in progress)

The game runs scenes as *tasks*: a routine stores an entry pointer in `$95/$96` and calls
`$00:D95F` with a priority, and the scheduler in the main loop (`$00:9E48`) runs it each frame.

* **Mission event cut-in + victory conditions**: `JSL $08:B5D6` (task `$08:B5E7`), e.g.
  "司令塔破壊!" followed by the 勝利条件 screen (UNION: 敵の部隊を全滅させよ /
  GALT: 敵の司令塔を破壊せよ). Uses scene assets 279–286 (table at `$01:DA9A`, 10×8 IDs).
* **Fight scene**: called once, from `$01:B3ED`: `JSR $B45D` (setup), then
  `JSL $03:88B3`, which starts task `$03:88CB`. The engine is in bank `$03`, with data in bank
  `$04`. Battle graphics come from the table at `$04:CCE0`, indexed by `$062B` (IDs 286–306,
  451–482). One Mars-vs-Mars run loaded 286/287, 451, 393–395 and 441 for each side.
  It opens with an info screen (described below), then the battlefield where each side's
  machines fly in.
* **Scene requests:** `$06EE` is polled by a dispatcher task (`$01:B1B1`). `$80` = fight
  (`$01:B3ED`), `$81` = `$01:B42B`, `$82` = next map (`INC $06E4`), `$8C` = `$01:B041`.
  After a player attack (`$01:9C51`) the game runs the damage routine `$01:A871`, sets
  `$06EE = $80` and ends the command task.
* **Full fight capture works:** `research/fight3.py <state> <att> <def> <slot> <frames>
  <prefix>` runs the game's own damage routine (with DB = `$01`), the fight setup
  `$01:B45D`, and the task `$03:88B3`, then records PPU state every frame. Example: Mars vs
  Mars, 339/128 HP dealt and 134/128 countered (8 → 5, 8 → 6). Options: `--atype/--dtype N`
  (unit types), `--move "u,x,y;..."` (reposition units), `--pre/--post addr=val,...` (hex
  pokes before the damage routine / after the fight block), `--dump f,f,...` (save the full
  emulator state at those frames as `<prefix>_stNNN.pkl`), `--rom file.sfc` (run the same
  state on another ROM image, e.g. the English patch). It also runs `$02:9157` first, as
  the game does, so the info screen shows real numbers. The info screen shows
  包囲効果 (encirclement) and 支援効果 (support) hex diagrams, then the battlefield, where
  the 4-machine pink squad destroys one of the 2 green machines.
* **How the animation works:** each machine is an *actor task* running its own bank-`$03`
  65816 code. It yields every frame (`JSL $00:DA21`), uses metasprite/motion helpers
  (`$03:A057`, `$04:DA0B`) with data pointers in `$2D`, and reports completion through
  `$0621`/`$0623`. It is code, not a compact script format.
* **Missing piece for a complete fight:** after the damage routine the attack path runs
  `JSR $01:A163`, which fills the fight block per side: `$059F` type, `$05A3` HP before,
  `$05A7` HP lost, `$05B0` (from `$06CA`), `$05B2` level. Without it the expected actor count
  `$0623` stays 0 and the scene stalls. With it the whole fight plays (`fight3.py` calls it).
* **Captured Mars vs Mars timeline** (60 fps, `research/fsum.py`): 30–240 info screen;
  240–360 background; 360–420 fly-in (8 + 8 machines = HP, 32×32, 1 px/frame into a fixed
  8-slot formation); 440–472 advance and fire (8×8 shots at 3 px/frame, both sides);
  462–512 explosions (32×32 tiles 192/196/200) and losses; then idle.
* **Fight graphics, by side:**
  * Background is the attacker's terrain class `c`: tiles `$04:CCE0[c]`, palette
    `$04:CD78[c]`, tilemap `$04:CD2C[c]`.
  * Machine sheet is `393 + $04:D038[type]`, plus effects asset 441. Sprite palettes are
    394 (left, OBJ rows 0–2) and 395 (right, rows 3–5).
  * `$04:D0AC[type]` points to that type's actor routine in bank `$03`, so choreography
    differs per type.
* **JavaScript rewrite:** `js/game/fightscene.js` reproduces the small-craft fight: ROM
  graphics, captured formation, timeline, shots and explosions, real machine counts and
  losses. Capital ships (built from multi-part hull sheets) and per-type choreography
  variants still need their own captures. The info screen and fades are simplified.
* **Capital-ship fights** (captured Tiamat vs Mars with `fight3.py ... --atype 30`):
  * **Hull:** one hull of 2×4 sprites of 32×32. Left column tiles 4/12/12/12, right column
    0/8/64/64 (last v-flipped), glides in at 1 px/frame to x = 4.
  * **Firing:** 6 ports flash at x+28 (tile 68), then tile-70 shells fly at ~14 px/frame.
    Hits show as debris (tiles 204/220/221) then 32×32 explosions (tile 192).
  * **Sprite palette by class** (`$03:942D`; per-side values set at `$04:D40D`/`$04:D443`):
    types < 30 use 394/395 (left/right), 30–51 use 363/364, 52+ use 443/444 (+445/446).
  * The same hull layout renders other ships correctly (checked Hannibal, mirrored on the
    right side).
* **Structures and variants** (captured with `--atype`/`--dtype`, analyzed with
  `research/anl.py`):
  * **Structures:** docks (52), fortresses (53–55) and command towers (56–57) are one static
    64×32 object of two 32×32 sprites, captured on the right at (184,33) for the dock (tiles
    8/12) and (184,39) for fortresses and (176,39) for towers (tiles 0/4), h-flipped.
  * **Stay-gun turrets (Dragon/Hydra/Rahab):** staggered 2-column grid (x 7/47, y every 32,
    columns offset 8), standing pose only, missiles (tiles 4/5/20/21) with smoke.
* **Per-type variants** (captures `v<type>`: each type attacking a Mars, `fight3.py rf_end.pkl
  0 6 0 720 v<t> --atype <t>`, analysed with `research/proj.py` and `research/flame.py`):

  | type | shot tile | path / speed (px/frame) | poses (fly / act) | extras |
  |---|---|---|---|---|
  | 0 Mars, 6/7 CHU-03R | 68 | straight 3 | 4 / walk 4-8-12, fire 64 | |
  | 1 Titan HU-NN7 | 128 | lob: pairs climb at (2,−1), re-enter at (4,−2) onto targets ~56 f later, hits ~88 f after firing | 72 / 72, fire 68 | |
  | 2 Talos | 72 | straight 3 | Mars-like | |
  | 3 HU-M34 | 72 | straight 4 | 4 / 0, fire 68 | |
  | 4 / 5 CHU-03F | 161 / 77 | straight 3 | 0 / 0 | flames 130+146 / 76+92 at rear, dy 8/16, 3 frames of 4 |
  | 8 FS-41 | 77 (+93 muzzle) | straight 3 | 0 / 0 | flames 76+92 |
  | 9 FFA-81 | 140 | straight 3 | 136 on 3 frames of 4, else 0 | |
  | 10 / 11 FB-97 | 158 / 69 | straight 3 | 0 / 0 | flame 143 at (0,11) / 68 at (4,11), every other frame |
  | 14 CUB-6 Gunner | 64 | lob, as Titan | 0 / 8, fire 12 | |
  | 16 CUM-7 | 12 | missiles fan out (initial (4,0)), curve onto the targets, hits ~75 f | 8 / 0 | |
  | 23 Dragon | 12/13 | straight, 2 then 4 | turret, 8 until ~70, then 0 | big muzzle flash (tile not identified) |
  | 24 Hydra | 4/20 (8×16; 5/21 alternate) | level at 3–4 to x = 123, then dive at (3,2) onto targets | turret 0 | smoke squiggle is part of the missile tiles |
  | 25 Rahab | 72 | straight 4 | turret 0 | |
  | 27 CR-1 | 128 | straight 3 | 4 / walk 0-4-8-12, fire 72 | |
  | 15 CUN-42 (slot 1) | 65 (+ muzzle 64/80) | lob, pairs climb at (2,−1) | 0 / walk 4-8-12-8 | the emulator hits BRK at `$03:FA7A` ~frame 463, so the incoming half is not captured |

  Turrets are already in place when the battle starts (no fly-in). Transforming units (4/5,
  10/11, 12/13) fight as their current form; no transformation is shown in the fight.
  Not captured: 18 SBBW-4 (no weapons), types with sheet 0 (12/13, 17, 19–22, 28/29, 41,
  45–48: probably unused).
* **Capital ships and structures as attackers** (captures `v30`–`v55`, `research/hull.py` for
  the settled layout):
  * Hulls wait ~66 px left of their resting x, then glide in at 1 px/frame and settle at
    frame ~96. Layouts per type are in `HULLS` (2×4 for most battleships/cruisers, 3×4 for
    CV-MN2/CV-CHX, 2×2 or 3×2 for destroyers, staggered for MSP-21). Resting x: 4, except
    CV-MN2 24, CV-CHX −12, MSP-21 (form 2) 20, DDG-MN6 −20.
  * Weapons fire ~136 frames in: MSP/DDG classes fan 4–5 shots out of the hull centre at
    7 px/frame with vertical steps of −2…2 px/frame (tiles 12, 76, 94, 68, 12/13); CV-C8
    fans tile 67 at 6 px/frame upwards from the lower hull; SCG-MB1/BM fire curving tiles
    128/130. The others look like Tiamat's port broadside (not separately verified).
  * Ships take no counter-fire from a Mars (its slot 1 is empty).
  * Docks and fortresses attacking: the structure body is a full **background layer** (with
    a starfield instead of the terrain backdrop); only the gun is a sprite at (8, 42–44).
    Shots: dock tile 64 at 8 px/frame, fortresses tile 67 at 6 px/frame, ~52 frames after
    the small-craft fire time. The remake draws the gun and shots but not that background.
* **Pre-fight info screen** (`js/game/infoscreen.js`, frames 30 to ~228 of a fight):
  * One BG3 layer (mode 1 + BG3 priority, 2bpp). Tiles: assets 105 ∪ 106 ∪ 112 (one 4 KB
    block, overlaid at their lead offsets) at char base `$6000`, asset 113 at `$7000`; tilemap
    asset 114 (frame, divider, 攻撃力/防御力 labels; every entry gets the priority bit);
    palette asset 110 (BG3 palettes 0–3). Verified byte-for-byte against VRAM. The two upper
    panels stay empty in every capture (no unit art is loaded for this screen).
  * Font: A–Z = 1–26, half-width katakana `$A7–$DF` = code − `$8C` (so `$01:EE66` names print
    directly), `-` = `$24`, digits `$54–$5D`, `%` = `$5E`.
  * Layout: names row 19 and model codes (`$01:F036`) row 20 at column 2 (left) / 23 (right);
    機数 at row 19, columns 11 / 20 (HP, ×2 for categories < 8, i.e. ships and structures);
    攻撃力 row 22 and 防御力 row 25, right-aligned to columns 8 / 30. Army A is on the left.
  * Phases: 30 screen on, brightness 0→15 in steps of 4 every 2 frames; 58 包囲効果 panel
    (one hex, centre = defender, around it the attacker's army); 128+ 支援効果 (two hexes:
    each side's unit with the *opposing* units around it); ~38 frames after the last icon
    地形効果 (weapon-mode pill B/N/M at tiles `$16C + 4·mode`, terrain % =
    `$01:D002[class*4 + attacker mode]` for both sides, EXP frame with the level emblem from
    `$04:CE0E`: 10 levels × two rows of 3 (tile, attr) pairs, `$0A`/`$00` row terminators).
    Icons are the map icons (assets 0/1) as sprites, OBJ palette 0 (army A) / 2 (army B)
    from asset 192, one every ~8–10 frames, neighbours in the scan order of `$01:AC47`
    (SW, NW, N, NE, SE, S). Panel tiles lack the priority bit, so the icons show over them.
    About 16 frames into 地形効果 the battle graphics (assets 300/301) overwrite the BG3
    tiles and the battlefield takes over.
  * **Numbers** (`$02:9157`, called from `$01:9C54` before the damage routine) fill
    `$0683/$068B` (attacker attack/defence) and `$0693/$069B` (defender), 4 stages each:
    * attack (`$02:9269`) = HP·8·`$01:F7D2[type*4+slot]` / max HP, × `AC3D[level]`/16
      unless `F206[type] = $70`; ×2 if `$06E9`. Counter slot `$06B9` = slot if ≥ 2, else 1
      when the attacker is a capital ship (category < 7), else 0.
    * defence (`$02:92E2`) = `$01:F8BA[type]` × `AC3D[level]`/16, capped at 128.
    * stage 1: defender defence halved when surrounded (`$06CF`).
    * stage 2: attacker attack += Σ attack of attacker-army units next to the defender / 4;
      defender attack += Σ of defender-army units next to the attacker / 16 (`$02:931D`; units
      need a direct weapon in that slot; skipped when `$06CE` ≠ 0).
    * stage 3: defence combined with terrain, 100 − (100−d)(100−`D002`)/100 (never shown).
    The screen prints stage 0 on open, 1 when 支援効果 opens, 2 when 地形効果 opens.
    Checked: Mars L3 vs Mars L0 = 380/47 vs 320/40, +80 for an ally next to the defender,
    +5 for an enemy next to the attacker.
  * **Support correction:** the damage routine also scans the *opponent's* neighbours
    (`$01:A8E0` around the defender with `$01:AAF6`, `$01:A929` around the attacker with
    `$01:AB18`). An ally next to the defender raised the damage from 339 to 502; one next to
    the attacker changed nothing. `rules.js` now does the same.
  * `$06CA/$06CB` (→ fight block `$05B0/$05B1`) are the two units' levels (`$1B5B & $0F`).
  * The English patch redraws this screen's label tiles ("Flank Bonus", "Support Bonus",
    "Attack", "Defense", "SQ"), so the remake takes assets 105–114 from the patched ROM and
    prints the English name in capitals from column 1.
* Python screenshot renderer bug fixed: the second sprite name table is at base + (N+1)×8 KB,
  not base + N×8 KB, so right-side sprites (tiles 256+) were garbled in earlier screenshots.
  The recorded OAM data was always correct.
* Emulator bug fixed along the way: the hardware multiply/divide read the wrong I/O
  registers (`io[2]` instead of `io[0x202]`), so every product was 0. Earlier captures
  that depended on multiplication (e.g. the idle squads) were affected.
* Large battle part graphics: kind-0 bitplane-xor assets ~290–440 (mecha bodies, ship
  hulls, emblems).

## Key RAM (battle)

| address | meaning |
|---|---|
| `$06E4` | current map number |
| `$083D` | copy of the 160-byte map header |
| `$082D/$082E` | map width/height in screens |
| `$19BD,x` … `$1D83,x` | unit table (0x8A slots): type `$19BD`, icon `$1A47`, flags `$1AD1` (bit 7 = army B), x `$1C6F`, y `$1CF9` |
| `$7E:2352` | map grid (64-byte stride) |
| `$7E:42D2` | unit-id-per-cell grid |
| `$7F:8000` | per-map cache of 8bpp cell graphics (384 bytes each) |

## Text (milestone 3)

Much of this comes from Nezz's English translation project (GPL-3.0,
[HoratioVex/Earthlight-1-Translation](https://github.com/HoratioVex/Earthlight-1-Translation)),
whose notes and script dumps document the original blocks.

* Unit names: plain JIS X 0201 half-width katakana at `$01:EE66`. Map names: ASCII at `$01:DB3A`.
* Status-bar labels (BG2, 2bpp): font tile = `ASCII + $40` for Latin letters, `$A5 + gojūon
  index` for katakana. The bar itself is built at `$01:BE9B` from streamed data.
* The script is three blocks, each a table of 16-bit pointers within its bank:

  | block | original (JP) | strings | contents |
  |---|---|---|---|
  | main | `$07:A800` | 198 | 0–4 alerts · 5–12 intro · `0x0D`–`0x81` unit info (3 per unit: mount, stats, flavour; 39 units) · 130–144 terrain descriptions · 145–159 terrain names · 160–170 % numbers · 171+ demo blurb |
  | labels | `$07:E64A` | 145 | 0–8 mission won · 9–13 after loss · 14–67 points screen · 68–86 mission lost · 87–96 alerts · 97–138 map titles · 139–144 ending |
  | brief | `$07:C5CF` | 143 | 0–22 short unit roles (dock screen) · 23–142 briefings, 4 pages × 30 maps |

* **Original Japanese encoding:** each string is a series of 8-character groups. A control
  byte comes first, and its set bits add 256 to the matching character. Characters are
  **glyph indices in order of first use** across the block (main string 0 移動範囲外です =
  `01`–`07`, string 1 射程外です = `08 09 05 06 07`). `$22` is a space, `$FF` is a line break,
  `$00` ends the string. Glyphs are pre-rendered 12×12, 1bpp, 24 bytes each (12 bytes for
  the left 8 columns, then 12 for the right 4), in banks `$19`/`$1A`. The intro's "2" is
  at `$19:FB50`. The exact index→glyph base per block isn't pinned down yet.
* **Terrain names:** `$01:CEF0[terrain type]` gives the name/description index (0–14 are in
  the text; 15–17 are facilities).
* **English** (from the patch, expanded 1.5 MB ROM): pointer tables at file offsets
  `0x108000` (main), `0x110000` (labels) and `0x118000` (brief), with the same counts and
  order as the originals. `$FF` ends a string, `$FE` is a line break, and characters are
  `code + $20` plus ligatures `$60`–`$6B`. English unit names have pointers at `$01:F8F6`
  (ASCII, `$00`-terminated).
* Unit type → unit-info entry and → short role are fixed lists, given in `js/text.js` (`LAYOUT`).

## Not yet decoded

* Text encoding for Japanese unit names, descriptions and dialogue.
* The random term's exact range, the `$06E9` doubling flag, and what `D082` controls.
* Tables from `$01:F7D2` on: `F7D2[4]` (display attack per slot) and `F8BA` (display
  defence) are decoded (info screen); the rest are read only by bank `$02`/`$04` code.
* Rendering the original Japanese glyph strings (the index→glyph base per text block).
* Which weapon mount (Rapid/Pierce/Bomb/Melee) maps to which attack mode or slot.
* Full-screen composition for title/menu screens (which tileset, palette and tilemap
  combine for each screen).
* Map scripts: enemy reinforcements, production and victory conditions.
* Sound driver and music (assets 822–833, SPC700 code).
