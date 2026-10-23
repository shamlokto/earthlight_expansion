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

## Mission setup and reinforcements (`js/game/scenario.js`)

All units are created by `$01:E98D` (type `$21`, flags `$25`, x `$23`, y `$24`, carrier `$26`).
At map start (`$01:E88D` and following, skipped when `$06F0` is set):

| source | table | format |
|---|---|---|
| deployment | asset `$02:E47D[map]` | count, (army<<7 \| type, x, y)* |
| extras (command towers…) | `$01:E7C4[map]` → bank `$01` | (army<<7 \| type, x, y)*, 0 |
| fortresses | `$01:B52E + map*6` | 2 × (army<<7 \| type, x, y); 0 = none |
| dock cargo (`$02:93C1`) | `$02:9523[map]` → bank `$02` | until 0: `flags\|x, y, types…, FF` spawns a dock (type 52) with that cargo; `$C0\|x, y, types…, FF` loads the unit already at (x, y). Cargo gets flag `$20` and `$1BE5` = carrier id + 1 |
| warp-in event | `$02:CEAC[map]` (FF = none) | set → types `$02:CF31 + set*4`, 8 object scripts `$02:CF45 + set*16` (interpreter `$02:C9A7`): first byte army<<7 \| type index; `10 n` wait, `20 x y` place, `30–35` one hex step SW/NW/N/NE/SE/S, `40–47`, `50–54` no operand, `60–6D n`, `70` spawn here, `E0 n`/`F0`/`80` end. Maps 0, 5, 11, 16. Checked on HAMILTON against the emulator: Mars (10,2), Mars (9,1), Talos (11,3). |
| reinforcements (`$02:9B70`) | `$02:9E96[map]` → bank `$02` | until FF: key (turn \| `$80` for army B; fires when `$06E5` turn + `$06E6` army equals it, turn counter 0 on the first turn), screen (x \| y<<4), then (flags \| type, x, y [, cargo…, FF for category-1 carriers])*, FF. Units go to the nearest free passable hex (`$02:9D40`). Maps 12, 18, 20, 24, 27, 28. |

`$02:9523` was first taken for AI grouping; it is the dock cargo. Map titles are English
labels 97 + map, briefings `brief` 23 + 4·map. HAMILTON (map 0) is mission 1
("Hamilton Must Stand Fast"); its enemies come only from the warp-in.

## Levels, docks, transformation (phase 2, read from the game code)

Unit flags `$1AD1` bits 6–7: `$00` army A, `$80` army B, `$40` **neutral** (the dock-cargo
flag bit 6; `$01:A67C` counts only `$00`/`$80` units per army). The ROM has no unit production
(confirmed by the Japanese Wikipedia article): docks and carriers only hold, repair and re-arm.

* **Levels** (`$01:9EA9`, after every fight): attacker level + 1, or + 2 if the defender was
  destroyed; defender + 1, or + 2 if it lost no HP. Capped at 9 (`$01:9F29`), stored in the low
  nibble of `$1B5B`. Docks (category 7) use those bits as a repair pause instead: set to 2 when
  a dock loses HP (`$01:9F0E`).
* **Dock self-repair** (`$02:94DD`): every dock with pause 0 gains 2 HP (up to `F676`);
  otherwise the pause counts down.
* **Dock capture** (`$01:A626`, reached from `$01:A087` when a category-7 defender drops to 0
  HP): the dock and every unit inside take the attacker's army, the dock returns to full HP.
  Category 5 (fortress, `$01:A819`) and 6 (command centre, `$01:A81E`) have their own defeat
  handlers.
* **Boarding** (`$01:A5F2`): sets `$1BE5` = host + 1 and flags `| $30`, restores full HP, and
  types 5, 7, 11 and 44 (spent forms) go back one type (re-armed). Boarding a CR-1 (type 26)
  makes it type 27 (`$01:A5AF`). Hosts (`$01:A554`): docks reject categories 0–2, carriers
  take small craft.
* **Spent forms** (`$01:A00A`): after the bomb/missile attack the unit's type + 1 and its
  remaining movement grows by `F240[new] − F240[old]` (Brontes 7 → 12, Abaddon 3 → 5), so it
  can move again. Pairs: 4→5 (Athena bomber), 10→11 (FB-97), 12→13, 43→44 (MSP-21), 45→46,
  47→48. The AI (`$01:8C10`) sends spent forms and units at ≤ ¼ HP back to a dock.
* **Transformation** is folded into weapon selection (`$01:84E0`): Athena types 4/5 become
  6/7 (HU form) for slot 0/2, type 6 becomes 4 again; Siren 36 becomes 37 (battleship) when
  it picks a weapon only that form has (`$01:F348`). The remake offers both as a Transform
  button before moving.
* **Map objectives** are hand-written in `js/game/scripts.js` from the briefings and victory
  lines (labels 0–8: command centre, annihilation, fortress, fleet, battleship, carrier, all
  carriers, flagship, all command centres; 68–86 are the defeat texts per operation, 87/88 the
  reinforcement alerts, 94 the Babylon countdown). The ROM's own per-map table wasn't found.

## Unit info screen and description art (`js/unitart.js`, verified)

The battle dispatcher task (`$01:B163`) polls `$06EE`; request `$0A` runs `$01:B342`, which
calls `$04:E4E0` for the unit in slot `$06DE` − 1 (type into `$1022`). The screen: BG text from
assets 124 (tiles) and 125 (tilemap, "0d8aca tilemaps unit info" in the translation notes), the
name/model code (`$01:EE66`/`$01:F036`), weapon table, movement, defence, map icon and role, and
the description (main text block, 3 strings per unit). The picture is a sprite object:

| table (bank `$04`) | per type | meaning |
|---|---|---|
| `F172` | word | asset with the picture tiles (207, 209 … 277), lead `$1000`, loaded at VRAM `$E000` so the art starts at sprite tile 384 |
| `F1E6` | word | its palette asset (208, 210 … 278), to CGRAM `$90` (OBJ palette 1) |
| `F25A` | byte | frame id; frame pointer = word at `$06:E0AB` + (id − 1)·2, data in bank `$06` |

Frame format (sprite builder `$00:AB2B`): count, then per sprite 4 bytes: flags, x, y, tile.
Flags: bit 0 = tile + 256, bit 3 = 16×16 (OBSEL `$03`: 8/16), bit 4 = x negative, bit 5 =
y negative, bit 6/7 = h/v flip, bit 1 picks how the object palette is applied. Sprite tile n
is asset offset (n − 256)·32. The first sprites use tile 384, a solid tile in the unit's
backdrop colour, which paints the 96×96 box. Types without their own art reuse type 0's (Mars).
`$02:E26B`, previously listed for this art, only copies a 240-byte map icon from bank `$04`.

Capture: `research/info3.py <battle state> <unit slot> <frames> <prefix> [--type N]` sets the
request from a state where the battle has finished starting (the dispatcher is polling).
Mars, Talos and Tiamat match the emulator 9216/9216 pixels.

## Sound (verified by playing the driver in `js/audio/spc.js`)

**Upload ($00:A799, A = song group).** Each group names two upload slots (table `$00:A839`,
2 bytes per group, `$FF` = none); a slot value indexes the asset list at `$00:A851`
(822, 823, 833, 832, 829, 830, 826, 827, 828, 825, 831, 824, 834). Slots already in place
(`$0A4F/$0A50`) are skipped. Before the first upload it writes `$FF` to port 0 and waits for
`$AA/$BB` (`$00:A86B`, the IPL ROM signature), then sends each asset with the standard IPL
protocol (`$00:A89F`, bytes from the asset stream `$00:D385`). An asset is a stream of
`[len16][addr16][len bytes]` blocks; `len = 0` ends it and its address is the entry point
(always `$0800`). `$00:A883` jumps there, then port 0 gets 1. `research/spc_blocks.py` lists them.

| group | assets | contents |
|---|---|---|
| 0 | 822 | driver code `$0800` (+`$F800`), tables `$4E00/$5000/$5080` (uploaded once at boot) |
| 1, 3–10 | 823, 829, 830, 826, 827, 828, 825, 831, 824 + 833 | command table and sequences at `$1400`; 833 = shared sample directory `$4C00` + BRR samples `$5100–$D62F` |
| 2, 11 | 832, 834 | self-contained sets with their own samples (12 and 4 commands) |

**Commands.** `$0A51` = command, `$0A52` = parameter; once a frame `$00:A817` writes
`$2140 = cmd | toggle`, `$2141 = param` and flips toggle bit 7 (`$0A53`), so repeating a command
is seen as new. `$00:A80C` = fade out (`$FE`, param `$32`). The driver clears its input
ports (`$F1 = $F0`) ~27 ms into its init and misses any command sent before that; the
worklet holds commands until it has done so.

**Command table** (`$1400` of each group): one pointer per command, command 1 first. Each
entry is a voice mask (bits 0–5 = music, 6–7 = effects) and 8 track pointers (voices 0–7).
1 = stop all, 2 = stop music, 3 = stop effects; `$04–$42` are effects on voices 6–7 (same
in every group that uses 833); `$43` and up are music on voices 0–5. Groups 3–8 share
`$43–$4C`; `$4D–$4F` are each group's own songs.

**Sound test** (`$02:D4C6`): 113 entries of `[cmd, group]` at `$02:D500` (`$FF` = keep the
current group); `soundlab.html` lists them.

**Map music** (`$02:DD2A`): group `$02:DE32[x]`, command `$02:DE6E[x]` with
`x = map + 30` during army B's phase (`$06E6`). Maps whose group is 4 or 7 (10, 20, 29, 30)
always keep their song. Otherwise `$02:DDE3` compares the unit counts `$1E0D/$1E0E`
(armies A/B): A ≥ 2×B sets `$06EA`, B ≥ 2×A sets `$06EB`, and the phase plays
group 5 (army A) or 8 (army B), cmd `$4D/$4E` (A ahead: A `$4D`, B `$4E`; B ahead:
A `$4E`, B `$4D`). `$06EC/$06ED`, set by map scripts (`$02:9B70`), select cmd `$4F` of
group 5/8 (event music, not wired yet).

**Fights** keep the map song. Their effects come from the object scripts (`$03:A374`: a
script byte → `$0A51`, skipped when `$0643` ≠ 0). Captured with `research/spc_fightsfx.py`
(fight3.py + a `$0A51` write log; every type attacking a Mars, slot 1), frames counted from
the fight's start: `$15` at 31/128/213 (info panels open), `$14` per info icon, `$39` at
fly-in (`$3C` too with a capital ship), `$03` when the fly-in ends, the weapon sound when
the attacker fires (~416; ships ~475), `$3F` per explosion, `$03` at the end. Weapon sound
per type (default `$22`) is `FIRE_SFX` in `js/audio/fightsfx.js`: `$23` types
1, 4, 5, 9, 15, 26, 27; `$24` 16, 24; `$2B` 23; `$2E` 14, 30, 34, 40, 52; `$28` 38;
`$2F` 3, 12, 13, 17, 19–22, 28, 29, 31, 35, 51; `$30` 33, 36, 37, 39, 42–44, 49, 50. Types 32, 41,
45–48 and 53–57 fire nothing at a Mars. Other weapon slots were not captured.

**Emulator notes** (`js/audio/spc.js`): SPC700 with the standard cycle table (taken branches
+2), timers at 8 kHz/8 kHz/64 kHz, one DSP sample per 32 cycles; the DSP is per sample
(not per cycle): KON/KOFF act on the next sample with a 5-sample key-on delay; the IPL ROM is
not emulated (the upload writes RAM directly).

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
* The random term's exact range and what `D082` controls. (`$06E9`, the ×2 attack flag, is
  most likely the second-round hard mode, where both sides attack ×2; the remake treats it so.)
* Tables from `$01:F7D2` on: `F7D2[4]` (display attack per slot) and `F8BA` (display
  defence) are decoded (info screen); the rest are read only by bank `$02`/`$04` code.
* Rendering the original Japanese glyph strings (the index→glyph base per text block).
* Which weapon mount (Rapid/Pierce/Bomb/Melee) maps to which attack mode or slot.
* Full-screen composition for title/menu screens (which tileset, palette and tilemap
  combine for each screen).
* The ROM's per-mission victory table (the remake defines objectives by hand), and flag bit 6
  on reinforcement entries (on docks it means neutral).
* Map events: the Buccaneer cannon (labels 90/91), the comet (92/93), afterburner modules (89).
* Sound: the driver's sequence format (not needed to play it), event music (`$06EC/$06ED`).
