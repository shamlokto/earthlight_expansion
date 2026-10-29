# Earth Light expansion: design document

Running record of what the owner and Claude agree on for an expansion built on the browser
remake. The original game stays as it is; the expansion is an add-on on top of it.

## Ground rules

* The original campaign (30 missions, ends with Babylon falling) is not changed.
* The expansion runs on the same engine and the same ROM-decoded data. Nothing from the ROM ships.
* New art can't come from the ROM. Each proposal says whether it needs original assets or can
  reuse, recolour or recombine ROM graphics.
* Keep to the original's balance: the 58 unit types, Beam/Railgun/Missile modes, terrain
  defence per mode, the damage formula, levels up to 9.

## Direction

**Chosen: a new campaign arc after Babylon falls** (decided 2026-10-23). Units, mechanics, map
types and multiplayer stay possible later, as far as the arc needs them.

## Story threads the original leaves open

From the briefings (see the synopsis in `js/wiki.js`):

* Babylon sinks into Earth's sea **without ever firing its main cannon**. The wreck, its cannon
  and its builders are still there.
* Ahriman's fate after Babylon is not shown in the synopsis (check the ending text, label 139).
* F7 Asgard's shipyards built Babylon. They are still Galt-held or contested.
* F5 Atlantis and F2 Eden are hardly a battlefield in the original.
* Quantum Decimators, the Corvus cruisers and the Buccaneer cannon were all Galt super-weapon
  projects, which suggests leftover prototypes.
* Hudson's 1996 sequel *Earth Light: Luna Strike* exists. Check its setting before we lock
  the story, so we either fit it or diverge on purpose.

## Arc options

| | A. Galt remnant | B. Third faction | C. Foundry liberation |
|---|---|---|---|
| Hook | Galt loyalists hold Asgard and try to raise Babylon or finish a sister ship | A Union splinter (or Earth's own forces) turns on Olympos after the victory | The Union frees the Foundries still under Galt garrisons, one at a time |
| Enemy units | Existing Galt roster | Union roster in a third colour | Existing Galt roster |
| New art | None | A palette recolour for a third army (cheap); new portraits for the briefings if any | None |
| New code | Data-driven missions; carry-over | Same, plus a third army in the rules, AI and fight scenes (the engine assumes two armies) | Same as A, plus a campaign map for choosing the order |
| Feel | Familiar, a true epilogue | A fresh twist, mirror matches | Non-linear, more replay |

**Recommendation: A, borrowing C's structure.** About 8–10 missions: liberate F5 Atlantis and
F2 Eden in either order, then Asgard's shipyards, ending at the Babylon wreck before its main
cannon is finally made to fire. No new art, and it uses the whole Galt roster, super-weapons included.

## What the engine supports today vs. what's new

* **Already there**: hex rules, damage, terrain, levels, docks and carriers, transformation,
  fight scenes, info screen, music, and objective types (wipe out, command centres, fortress,
  flagship, all carriers, turn limit), plus guards and turn-keyed reinforcements.
* **New code**: missions defined as data (terrain grid, deployment, reinforcements, objective,
  briefing text) instead of ROM tables; `scenario.js` and `scripts.js` read only ROM maps today.
* **New code**: carry-over of the surviving roster and levels between missions, with a deployment screen.
* **Maps**: either reuse the ROM's 30 terrain layouts with new deployments (no tooling), or
  build new layouts from the ROM's terrain graphics (needs a simple map editor). No new art either way.
* **Text**: briefings in English written for the expansion. They can't come from the ROM, so
  they're original writing, drawn in the game's own font.
* **Music**: reuse the ROM's tracks per mission type.
* **Cut units** (types 28/29, 41, 45–48: in the tables but never placed, and with no map icon of their own)
  could return as "prototypes". They'd need map icons (recombined from ROM icons) and checks of their fight art.

## Premise (owner's pitch, 2026-10-23)

A mix of A and B, with the sides swapped. After Babylon the Union grows corrupt and incompetent,
and the commanding general (the player in the original) is assassinated. A loyal, decent general
fights back at the head of **Galt remnant forces** and revolts against the Union. **The player
plays the Galt side; the Union is the enemy.** Galt reinforcements are scarce, so every unit counts.

Consequences for the engine:

* Player = army B. The ROM has map icons for every type in both army colours, so mixed rosters
  (Galt plus defecting or traded Union types) need no new art.
* **The player stays pink and on the left** (decided), as in the original. The simplest way: the
  player stays army A internally (left in fights, the player's colour) and the enemy Union is army B
  (the original enemy's colour). That avoids mirroring the fight scenes or making the AI play army A.

## Economy draft: carry-over, minimal production, trade

* **Score** after each battle, built from the ROM's own `value` field (points per HP of damage,
  which the original uses for battle statistics): enemy damage dealt × value, plus a bonus for the
  objective and for finishing under par turns, minus the value of units lost.
* **Production: 1–3 new units per mission** (decided). The score buys them, so a good battle means
  real reinforcements; it must matter, not be a token. You choose from a list that the story
  unlocks (whichever shipyards the remnant holds). From mission 8 on (`allFrom` in
  `missions/index.json`, owner 2026-10-24) every machine type can be built.
* **Trade is a core system** (decided). A unit is worth a different amount to different people at
  different times, and that difference is the game:
  * **No trader characters** (decided): trade is an abstract exchange at fixed rates from each
    machine's value. A unit's worth differs because of what the next map needs, not who buys it.
  * The next mission's briefing (map, enemy mix, objective) is shown **before** trading, so you
    trade for what the next map needs: missiles for asteroid fields, carriers for wide maps.
  * Machines are traded, **pilots are not** (decided). The level belongs to the pilot, so a veteran
    pilot keeps their level and moves to the new machine. Prices depend on the machine only.
  * **Supply tops up a trade** (owner, 2026-10-24): a machine worth more than those given can be
    had by paying the difference in supply, so veterans step up to stronger machines and the
    team grows both strong and experienced.
* **Intermission like Super Robot Wars** (decided), but built as a **plain web page**, not
  SFC-style screens: lists, buttons and the next briefing, which keeps it cheap. Sections: roster
  (machines and their pilots' levels), production, trade, deploy, save. None of this happens during a battle.
* **Pilots** (decided): anonymous, no names or personalities, no SRW-style hero pilots. A pilot is
  just the experience a unit carries. Each produced unit comes with a new level-0 pilot. A unit that
  survives keeps its level into the next battle. When you trade a machine away, its pilot (and level)
  goes into a reserve and can fly another machine; a machine you get without a free pilot gets a
  rookie. **A pilot dies with their unit** (decided), so pulling a damaged veteran back to a dock or
  carrier matters more than in the original.
* **Carry-over**: survivors keep their type and level (the 0–9 levels already exist). Losses are
  permanent. **Repair between missions is free** (decided).
* **Stopping a death spiral**: each mission still adds scripted units (turn-keyed reinforcements,
  neutral docks with cargo to capture; both are already in the engine), and a deployment cap per
  map (choose N from the roster) keeps the maps balanced however big the roster grows.
* **New code**: score tally, roster in the save, between-missions screen (roster, production, trade,
  deployment), placing chosen units on the map.

## Mission outline (draft 1, 2026-10-23)

Ten missions, set in the original's places but on **new map layouts** (see Map designs below),
built from the ROM's own terrain graphics. "Unlocks" is what production
gains afterwards; "next map wants" is the hint that makes trading matter.

| # | Title (working) | Setting | Story | Objective | Unlocks |
|---|---|---|---|---|---|
| 1 | Betrayal | Hamilton | The commander is assassinated at Hamilton Command. The general escapes with a few loyal Union units. | Survive N turns or reach the map edge (**new**: escape objective) | — |
| 2 | Old Enemies | Aldiss (asteroids) | Galt remnant fighters find the fugitives. The general proves himself by breaking a Union patrol that hunts them both. | Wipe out the patrol (existing) | Galt fighters |
| 3 | Shipyard | Asgard | The remnant's hidden base at the shipyards that built Babylon. A Union garrison holds the docks. | Capture the neutral docks (existing) | Mecha, carriers |
| 4 | Le Guin Again | Le Guin | Strike the corrupt admiral who ordered the assassination. | Sink the flagship (existing) | — |
| 5 | Foundry | Luggnagg | Free the industrial Foundry dock by dock. Its workers join the revolt. | Destroy the command centres (existing) | Cruisers |
| 6 | Decimators | Verne Docks | The Union plans to use Quantum Decimators on a rebel Foundry. | Destroy them before turn N (turn limit, existing) | — |
| 7 | The Wreck | Babylon (Earth orbit) | The Union is salvaging Babylon's unfired main cannon, guarded by six carriers. Deny it. | Destroy the salvage command centres (existing) | Battleships |
| 8 | Gate | Gate of Eden | Break the blockade on the road to Olympos. | Destroy the fortress (existing) | — |
| 9 | Line | Derleth | An artillery duel against the Union's home fleet. | Sink the flagship Tiamat (existing) | — |
| 10 | Olympos | Hamilton / Nemea layout | Depose the Union leadership. They try to fire the salvaged cannon. | Command centres within 24 turns; **game over if the general dies** | — |

* Next map wants (to show at intermission): 2 asteroids → missiles; 3 docks → mecha and boarding;
  4 flagship → fast strikers; 6 time limit → speed; 7 wide orbit → carriers; 9 artillery → long range.
* New code beyond the economy: the escape objective (mission 1), and the general's flagship-loss rule
  for the player's side. Everything else uses objectives the engine already has.
* The text is original writing: briefings, the intro and the ending.

## Map designs (draft 1, 2026-10-23)

Like the original, maps are named after SF authors and measured in 15×10 screens (about 14×10
playable hexes each). Every unit type exists in both armies in the ROM, so any type can appear on
either side. Terrain facts used below (from the ROM; defence % against Beam / Railgun / Missile):

| Sym | Terrain | B / N / M | Notes |
|---|---|---|---|
| `.` | Void | 0 / 0 / 0 | open space |
| `m` | Magnetic Field | **100** / 0 / 0 | beams can't hurt a unit standing here |
| `:` | Meteoroid Field | 15 / 20 / **40** | capital ships can't enter; missiles weak against units here |
| `a` | Asteroid | 15 / 15 / 15 | capital ships can't enter |
| `p` | Galactic Plasma | 15 / 15 / 15 | |
| `g` | Gravity Flux | 5 / **50** / 25 | some small craft can't enter; railguns weak here |
| `~` | Atmosphere | 25 / 45 / 35 | good cover for everyone |
| `#` | Bedrock | 25 / 25 / 25 | capital ships can't enter |
| `d` | Fortress Deck | 5 / 5 / 5 | almost no cover |
| `=` | Turret Railway | 5 / 5 / 5 | sentinels ride it |
| `W` | Fortress Wall | — | impassable |
| `t` | Comet Tail | 50 / 50 / 50 | best cover, but entering ends movement |
| `E` | Earth / comet body | — | impassable for ships |
| `H` | Babylon Hull | 10 / 10 / 10 | |

Map symbols: `P` player start, `U` Union, `D` dock (grey = neutral, capturable), `C` command
centre (Cortex/Adzam), `F` fortress, `S` sentinel (Dragon/Hydra), `>` exit or arrival edge.
Sketches are coarse (one character ≈ 2 hexes); exact layouts get painted in the map editor.
"Cap" is how many of the player's own units can deploy; scripted joiners come on top.

### 1. Betrayal: ASIMOV (30×10, Hamilton Command, Olympos)

```
WWWWWWWWWWWWWWW
Wdd C   mm   :: .  .  >
WdP d  mmm  :::  U    >
Wdd D   mm   ::    .  >
WWWWWWWWWWWWWWW
```
* **Story**: the commander dies in the command centre. The general runs for the east edge before
  the base locks down.
* **Player** (fixed, no deployment): the general's Athena, Mars ×2, Titan, Crane, Selene.
* **Union**: Mars ×2, Talos ×2 at the base (turn 1). A cruiser screen (Hannibal ×1, Fenrir ×2) waits
  in the east. The gate force (Talos ×2, Medusa) arrives from the west on turn 3.
* **Terrain idea**: the magnetic band in the middle makes the Union's beam mecha (Talos, Mars)
  useless against anyone sheltering there, so the player can stop and fight there briefly.
* **Objective**: get the general plus at least 3 units off the east edge within 12 turns (**new**:
  escape objective). Each unit that escapes carries over.
* **Next map wants**: beam weapons, not missiles (mission 2 is meteoroid fields).

### 2. Old Enemies: LEM (built 45×20 = 3×2 screens, Aldiss asteroids)

Busier than mission 1 (2026-10-24), as built in `tools/missions/lem.mjs`:
* **Terrain**: two north-south asteroid ridges split the belt into three lanes; meteoroid fields
  in the west (the player's cover), around the NE Galt hideout and in scattered pockets; a plasma
  stream across the middle; small magnetic patches.
* **Player**: cap 8 (Athena with the general, Mars ×2, Titan, Crane, Selene, Medusa, Lobster as
  slots). **Galt joiners** (Lobster ×2, Crane ×2) arrive in the NE on turn 2.
* **Union** (10): Cyclops ×2, Medusa ×3, Cerberus ×2, Gulon ×2, Talos. A **grey dock** in the
  southern rocks holds a Mars and a Crane; the Union will race you for it.
* **Objective**: wipe out the patrol. Bot (careful general, 8 machines): about 2 wins in 3;
  with 6 machines it rarely wins.

### 3. Shipyard: HERBERT (built 45×20 = 3×2 screens, the Asgard shipyards)

Busier again (2026-10-24), as built in `tools/missions/herbert.mjs`:
* **Terrain**: the GOTLIEB station (ROM map 21, columns 41–59, rows 1–13) stamped on columns
  25–43; the western approach crosses a plasma river, an asteroid ridge (gap in the south), a
  gravity-flux patch (no mecha) and a two-Wisp minefield; rubble fields south of the station.
* **Player**: cap 10. **Five grey docks**: Mars and Crane near the start, Medusa + Mars and an
  Athena in no-man's land, and a Hannibal deep inside the station.
* **Union** (14): Cortex, Vulcan ×2 guarding it (`guards: 2`), a Hydra and a Dragon turret on the
  railways (the Dragon only hits ships, so small craft can slip past it), Talos ×3, Mars, Medusa,
  Hannibal, Fenrir, Wisp ×2. The Union captures grey docks it reaches first.
* **Objective**: destroy the Cortex. Bot (10 machines): about 3 wins in 5 with a bold general;
  a cautious bot stalls at the guarded core (no turn limit).

### 4. Le Guin Again: GIBSON (built 60×20 = 4×2 screens, the Le Guin sector)

The busiest of the first four (2026-10-24), as built in `tools/missions/gibson.mjs`:
* **Terrain**: the fleet's lane runs through the middle rows; two gravity-flux belts cross the map
  with gaps north and south of the lane for mecha; a plasma river and a magnetic belt between
  them; meteoroid and asteroid fields on both flanks; Wisp minefields beside the lane in the east.
* **Player**: cap 12, including two Brontes bombers as slots (bombs are what sink battleships).
* **Union** (19 + 2): the Nodens with its close escort (Regulus ×2, Hannibal ×2, Fenrir; a tighter
  escort is unbeatable under the encirclement rule), forward screens (Mars ×2, Talos ×2, Cerberus,
  Gulon), Cyclops gunboats in the flank rocks, Medusa ×2, Wisp ×3; Fenrir and Gulon arrive from
  the east on turn 6. The fleet follows route waypoints east.
* **Objective**: sink the Nodens before it reaches the east edge (`destroyType` 32 with `edge`),
  turn limit 22 as a backstop. Bot (bold general): about half its games with 10–12 machines; a
  cautious bot is too slow and the Nodens escapes.

### What the ROM's late maps do (measured, 2026-10-23)

Read from the 30 ROM maps, to set the bar for maps 5–10:

* **Size of the battle**: maps 1–6 have 3–17 units a side. From map 20 on there are 45–60 a side
  (ALFRED 55/53, PANSHIN 61/33, VARAMU 47/61, ASGARDHR 52/49), plus carrier and dock cargo.
* **Terrain is busy**: open space falls from 83% (HAMILTON) to 26–37% late on (VARAMU 14%).
  Features are organic blobs and rivers: plasma lakes, gravity-flux rivers, asteroid ridges,
  diagonal magnetic belts, all mixed together, not straight bands.
* **Several fronts**: both armies start in several separate clusters, not one blob a side.
* **Fortress mazes**: VARAMU is a walled complex of chambers, decks and narrow gates, with units
  inside each chamber.
* **The Earth maps** (CLARKE, BABYLON): a 4–8 row atmosphere band along one edge with Earth
  below, fleets of carriers hugging the atmosphere (ALFRED has 6 Union carriers, BABYLON 3).
* **Mines**: Wisp (SBBW-4) minefields block lanes (VON VOGT, PANDORA).

Extra symbols for the late maps: `K` carrier (with cargo to launch), `*` Wisp mines, `~` atmosphere,
`_` Earth (impassable), `H` Babylon hull. Sketches are 1 character ≈ 2 hexes.

### 5. Foundry: BANKS (45×30, F6 Luggnagg)

```
::aa##.....ppp.....##aa::.....
:aa##WWWWW.ppp.WWWWW##a:..U...
aa#.WdDdUW.pp..WdCdDW#...UU...
P#..W=d=dW..pp.WdUd=W..*.*.*..
P...WWddWW...ppWWddWW.........
P.U....ggg....ppp.....U.....K>
...gggg...ggg.pppp...gggg.....
.ggg..aa.....g.ppp..gg..aa...U
gg...aaa##.WWddWW.ppp....aa...
P...aa##..WdDdCdW..pp...U.....
P..aa#....W=d=dUW...ppp..U..UU
...a::....WWWWWWW....pp.......
.......::::.......:::..pp.....
L::........aa......::::..ppp..
L:.....U..aaa..U.......::..pp.
```
* **Story**: the industrial Foundry: four walled works, each with a dock inside. The workers rise
  on turn 5: the two southern works' docks turn grey (neutral) and launch Hannibal ×2 for the player.
* **Player**: cap 12, in two groups: the main fleet west (`P`), and a raiding party of up to 3
  fighters in the SW asteroids (`L`).
* **Union** (≈30): Adzam + Cortex inside the works, Pergamon docks ×4 (cargo Titan, Cyclops),
  Talos ×4, Titan ×3, Cyclops ×3, Regulus ×2, Cerberus ×3, Hannibal ×2, Artemis carrier `K` (cargo
  Lobster ×3) in the east, Wisp minefield on the east lane.
* **Terrain idea**: the plasma river splits the map, gravity-flux rivers (railguns 50% weak) guard
  the works, and bedrock keeps capital ships out of the corners. The works' gates are 2 hexes wide.
* **Objective**: destroy both command centres. **Bonus score**: capture all four docks.
* **Unlocks**: cruisers. **Next map wants**: speed.

### 6. Decimators: NIVEN (45×20, the Verne Docks)

```
.....aaa......mm.....K.....aaa.
P..aa:::.X.ggggg..mm...U..aa::>
P..a::..XggX...ggg.mm..*.*..a:>
...::..gg..aa....gg..mmm.*.*.:>
.L....gg..aaaa.U..ggg...mm...a>
P....gg..W.aa.....U.ggg...mm..>
..::gg..WdW...::.....gggg..mm.>
.::.g...WDW..::::..U....gggg..>
::..g..........::.......K..ggg>
```
* **Story**: three loaded Crabs (CR-1, `X`) carry Quantum Decimators along a gravity-flux river
  toward a rebel Foundry off the east edge. A grey dock mid-map (`D`) holds an Athena and a Crane.
* **Player**: cap 12. A two-unit ambush group (`L`) starts hidden in the middle asteroids.
* **Union** (≈25): Crab ×3 (loaded), escorts Gulon ×3, Fenrir ×3, Crane ×4, Selene, Iris carriers
  `K` ×2 (cargo Lobster ×3 each, launched on turns 3 and 6), Wisp mines across the east exits.
* **Terrain idea**: the river is a fast lane for the Crabs, and the magnetic belt shields their
  escorts from beams. You must cut across or ride the river yourself.
* **Objective**: destroy all three Crabs before any reaches the east edge (**small new rule**:
  "destroy all units of a type", generalising map 13's "sink every carrier").
  **Bonus**: capture the dock.
* **Next map wants**: carriers and range (Earth orbit).

### 7. The Wreck: SIMAK (60×30, Earth orbit)

```
mm......aaa......ppp.......:::.
.mmm..P.aa..U...pppp..U...::...
..mmm...a.....U..pp......K.....
P..mmm......:::.......U....*.*.
....mmm....::::..mmm.......*.*.
P....mm...U......mmmm..K....U..
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~K~~~~~HHWHHHHWHHHHWHH~~~~K~~
~~~~~~S~~HdC=HHdC=HHdC=H~~S~~~~
~~~~~~~~~HHWHHHHWHHHHWHH~~~~~~~
~~~~~K~~~~~~~~~~~~~~~~~~~~K~~~~
_______________________________
_______________________________
```
* **Story**: Babylon's wreck lies in the atmosphere, half sunk toward the sea. The Union is
  salvaging its unfired main cannon. Six Union carriers hold the atmosphere around it and keep
  launching fighters. This is the "Earth with all these carriers" map.
* **Player**: cap 14, in two groups high in orbit (`P`). From here on, carriers really matter: the
  player can bring their own and launch from them.
* **Union** (≈40): Cortex ×3 in the hull's chambers, Dragon ×2 and Hydra ×2 on the hull's
  railways, carriers `K` ×6 (Artemis ×2, Siren ×2, Selene ×2) with cargo (Lobster, Crane,
  Brontes, 3 each), launched in waves on turns 2, 5 and 8. Corvus ×2, Asura-II, Fenrir ×4 in orbit.
  Wisp mines guard the NE.
* **Terrain idea**: the atmosphere band (25/45/35 cover) is where the Union fleet sits. The
  magnetic belt NW is a beam-proof route down. The hull is broken into chambers by walls (`W`),
  so the command centres must be approached gate by gate.
* **Objective**: destroy the three salvage command centres. **Bonus**: sink every carrier
  (existing objective type, used as a bonus).
* **Unlocks**: battleships. **Next map wants**: beam-proof options (magnetic fields).

### 8. Gate: ZELAZNY (45×30, the Gate of Eden)

```
..mm....ttt....:::.....ttt..mm.
P.mmm..ttt..WWWWWWWWWWW..ttt.mm
..mm..tt...WWdddWdddWWWW..tt.m.
P.mm.......Wd=S=d=S=dDdW......U
...mm..*.*.WddWWWWWWdddW.*.*...
P...mm....WWdW.....WdWWW......U
....mm...UgdddW..F..W=dgU......
P...mm....WWdW.....WdWWW......U
...mm..*.*.WddWWWWWWdddW.*.*...
P.mm.......Wd=S=d=S=dDdW......U
..mm..tt...WWdddWdddWWWW..tt.m.
P.mmm..ttt..WWWWWWWWWWW..ttt.mm
..mm....ttt....:::.....ttt..mm.
```
* **Story**: the blockade fortress, a VARAMU-style maze: an outer wall, a ring of decks and
  railways with sentinels, two docks in the ring, and the Carthago fortress (`F`) in the core.
* **Player**: cap 16, spread along the west edge in three groups. Union reinforcements come from the
  east edge on turns 4 and 9.
* **Union** (≈45): Carthago (20 HP), Dragon ×2 and Hydra ×2 on the railways, Pergamon docks ×2
  (cargo Talos ×3 each), Talos ×6, Vulcan ×4, Hastur ×2, Hannibal ×3, Gulon ×3, Wisp minefields at
  both gates, and the east reinforcements (Regulus ×2, Fenrir ×4, Medusa ×4).
* **Terrain idea**: the magnetic river shelters the west approach from the Talos beams. The comet
  tails (50% cover, but entering ends movement) are stepping stones. The gates are 1–2 hexes wide
  and pass through gravity flux, which is hard on railguns.
* **Objective**: destroy the fortress. **Bonus**: capture both docks.
* **Next map wants**: long range (an artillery duel).

### 9. Line: BUTLER (60×20, the Derleth line)

```
>....aaa::.....gggg.....::::..aaa....K....
P..aa::::..U...ggg..*.*.:::::..aaU..U..U..
P.a:::...U.....gg.......*.*..::..U..U..UU.
P..::....:::...ggg..*.*...::.........K....
.........:::::.gggg.......::::..U..U..UU..
P..aa......::..gg..*.*......::aa.U..U.....
P.aaa::...U....ggg.....::::.....aa..U..U..
>..a:::::......gggg...::::::.......K......
```
* **Story**: the Union home fleet's artillery line. A Galt deserter squadron enters from the north
  edge on turn 6 and joins the player (scripted joiners, kept if they survive).
* **Player**: cap 16 plus the deserters (Corvus ×2, Asura-II, Lobster ×3).
* **Union** (≈50): Phoibos ×4, Vulcan ×4, Cyclops ×4, Hydra ×3 in the line; Asura-II ×3, Tiamat,
  Nodens behind it; carriers `K` ×3 launching fighters each 3 turns; a Wisp minefield lane in
  the centre; Fenrir/Gulon screens ×8.
* **Terrain idea**: a gravity river cuts the west third, meteoroid ridges wall off capital ships
  in several lanes, and the open centre lanes are mined. Long-range railguns (Asura-II, Corvus) and
  artillery mecha win this one.
* **Objective**: sink the Tiamat (the fleet's flagship). **Bonus**: wipe out the artillery line.
* **Next map wants**: everything. It's the finale.

### 10. Olympos: WELLS (60×40, F1 Olympos)

```
P...::aa.....ppppp.....mm.....aa:::...P
....:aa..U...ppp..K.....mm..U...aa::...
.U...a.......*.*.*.*.*.*.*.....U.......
....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....
..ggWdDdd=S=dddWWWWdddd=S=ddDdWgg....
..g.WddWWWWWdddddddddddWWWWWddW..g.U..
.gg.WdW...WWdddWWWWWdddWW...WdW..gg...
.g..WdW.C.WdddW..F..WdddW.C.WdW...g...
.gg.WdW...WWddW..H..WddWW...WdW..gg...
..g.WddWWWWWdddddddddddWWWWWddW..g....
..ggWdDdd=S=dddWWWWdddd=S=ddDdWgg.....
....WWWWWWWWWWWWWW==WWWWWWWWWWWWWW.....
.U....aa:::....ppp....ppp....:::aa..U..
...K....aa......pp.U..pp.....aa....K...
P.....mm.....ppp........ppp.....mm....P
```
* **Story**: the Union leadership's citadel. A walled ring of decks and railways encloses two
  command centres (`C`) and the core: the Goliath fortress (`F`) with the salvaged Babylon cannon
  mounted as a Dragon sentinel (`H`). On turn 8 the Luggnagg workers send Hannibal ×2 and
  Regulus ×2 as joiners.
* **Player**: cap 18, in four corner groups (`P`). They have to converge through mines, a gravity
  ring and the walls.
* **Union** (≈60): Goliath (evasion 83), Adzam ×2, Dragon ×3, Hydra ×4 on the railways,
  Pergamon docks ×4 (cargo Talos/Medusa), carriers ×4 in orbit (cargo Lobster/Crane/Brontes),
  Artemis ×2, Asura-II ×2, Nodens, Hastur, Regulus ×3, Talos ×6, Mars ×6, Lobster ×6,
  Wisp mines on the north approach. Reinforcement waves on turns 6 and 12.
* **Objective**: destroy both command centres within 24 turns. As always, the general's death is
  game over. **Bonus**: destroy the Babylon cannon.

## Build plan (2026-10-23)

The expansion lives in **its own files** so it never collides with the base game's owners:
`editor.html`, `expansion.html`, `intermission` inside it, and `js/expansion/*`. It *imports* the
base engine (`rules.js`, `fightscene.js`, `infoscreen.js`, `ai.js`, `maps.js`, audio) and changes it
only through small hooks agreed with the file's owner.

| Phase | What | Files | Needs from the base engine |
|---|---|---|---|
| 1 | **Mission format + loader**: a mission is JSON (size, terrain cells as ROM (graphic, terrain id) pairs, units, cargo, arrivals, objective, bonus, briefing). The loader builds the 160-byte header and 62×42 grid the engine expects and hands `Battle` a ROM view that serves them. | `js/expansion/mission.js` | none (works through `rom.body`) |
| 2 | **Map editor**: paint with every terrain graphic used in the 30 ROM maps, copy-paste regions from ROM maps (Earth, fortress walls), place units and cargo, set objective and arrivals, export/import JSON. | `editor.html`, `js/expansion/editor.js` | none |
| 3 | **Battle on custom maps**: player = army A (pink, left), Union = army B. Objective rules incl. the new *escape* and *destroy all of a type*; general aboard (+100% evasion capped at 96/128, +100% power, level 9; death = game over); bonus objectives. | `js/expansion/battle.js` | `ai.js`: a generic mode when the map isn't one of the 30 (today it reads ROM scripts by map index); `rules.js`: a hook for the general's evasion/power |
| 4 | **Campaign shell + intermission**: plain web page. Roster (machines, pilot levels), production (1–3 by score), trade at fixed rates from unit value, general boarding, deployment cap, save/load. | `expansion.html`, `js/expansion/campaign.js` | `points.js` score tally (reuse) |
| 5 | **Content**: the ten missions painted in the editor, briefings, intro and ending text. | `missions/*.json` | — |
| 6 | **Balance pass**: playtest, tune unit counts, turn limits, production costs. | — | — |

Status (2026-10-23): **phases 1–3 done, phase 4 first cut**, apart from authoring arrivals and the general in
the editor (those come with phase 3).
* `js/expansion/mission.js`: the mission format and loader. Checked: `Battle` from `rules.js` runs
  unchanged on a custom map (terrain classes, movement and units all correct).
* `editor.html` + `js/expansion/editor.js`: paint with the 252 (graphic, terrain) pairs the ROM
  maps use, fill, pick, copy regions from any ROM map (for example the Earth and its atmosphere
  from CLARKE), place units for either army or neutral docks, load cargo (shift-click), set
  objective, turn limit, cap and briefing, export/import JSON. Work in progress autosaves in the browser.
* **Phase 3 done (first cut)**: `js/expansion/battle.js` (`ExpansionBattle` extends the base
  `Battle`): the general (evasion ×2 capped at 96, power ×2, level 9; death = game over), the escape
  and destroy-a-type objectives, turn limits, and the base objectives mapped onto `scripts.js`.
  `game.html?mission=missions/asimov.json` plays a mission in the real battle screen, with fight
  scenes, music and the AI. Hooks added to base files: `gameapp.js` (custom-mission branch), `ai.js`
  and `events.js` (skip ROM per-map tables on custom maps). `missions/asimov.json` is a rough test
  layout of map 1, still to be painted properly in the editor.
  Phase 3 polish done: "Galt remnant" in the HUD, briefing screen, ★ on the general's unit,
  general status and escaped list in the HUD.
* **Phase 4 done (first cut)**: `expansion.html` + `js/expansion/intermission.js` (the page) and
  `js/expansion/campaign.js` (state). Roster with pilot levels, deploy (up to the mission's cap;
  the mission's own player units are the deployment slots, `joiner` units stay fixed), the general
  (eligible machines only; stays home or boards), production (unlocks per `missions/index.json`,
  max 3 a visit, price = ROM value × HP: Mars 8, Athena 24, Tiamat 48), trade (give machines,
  get one worth up to their total; best pilot moves over), free Athena when none is left, supply
  = 10 + map points / 10, auto-save in the browser. A won campaign battle saves survivors, levels,
  captured or joined units and supply, then returns to the intermission.
  Not done yet: the in-battle free Athena from a dock; tuning the numbers; missions 2–10 (phase 5).
* **Playtest of mission 1 (2026-10-23, test layout)**:
  * Lost: the escape (general + 3) became impossible on turn 6. The Titan, a Mars and the Crane
    died; Fenrirs (move 8) and the Hannibal intercepted at the meteoroid gap. When the real map is
    painted: start out of contact (the base is boxed in by zone of control on turn 1), give the
    gate force more distance, require general + 2, and put the Hannibal further back.
  * The general works as designed: the bomb sank a full Fenrir in one hit, but two Talos or Fenrir
    hits take the Athena from 8 to 2. Boarding the Selene for a full repair saved the general
    once; a damaged carrier carrying the general is a liability.
  * Fixed: winning by a move (escape) never showed the result screen (`gameapp.js` now checks
    after a move). Escape maps now carry over only the units that escaped.
  * The ROM targeting rule ($01:E0F1/$01:85BD) now applies to the player too (earthlight-final's
    change in `rules.js`): bombs only hit ships and structures.
  * Rebalanced after the playtest (`missions/asimov.json`): the Union mecha start 5–6 hexes away,
    the Hannibal and Fenrirs sit further back, the gate force arrives on turn 4, and the general
    plus 2 units must escape. Not replayed yet.
  * To do: the reinforcement alert uses the ROM's "Galt reinforcements" line even when the Union
    reinforces; there's no early defeat once an escape becomes impossible.
* Found while building: the ROM's map grids have no class-10 frame (the game marks the bounds at
  run time), and army A's icons are the pink ones, as the owner remembered.

## Decisions

1. Direction: post-Babylon campaign arc (2026-10-23).
2. Story base: A (Galt remnant) with B's twist. The player leads the Galt remnant against a
   corrupt Union after the original general is assassinated (2026-10-23).
3. Mechanics: carry-over between maps, unit production based on the last battle's score,
   and trading units (2026-10-23).
4. Production: 1–3 units per mission, so it is never irrelevant (2026-10-23).
5. Trade is a central system; a unit's value depends on the next mission (2026-10-23).
6. Free full repair between missions; losses are permanent (2026-10-23).
7. Protagonist: a Union officer loyal to the murdered commander, who defects to the Galt remnant
   (2026-10-23).
8. Intermission between battles like Super Robot Wars: production and trade happen there
   (2026-10-23).
9. Levels belong to pilots, not machines. Trading a machine keeps the pilot and their level
   (2026-10-23).
10. A pilot dies with their unit. Losing a unit loses the machine and the pilot's level
    (2026-10-23).
11. No graphics design for now: pilots and the general are text only (2026-10-23).
12. The general may ride only in a capital ship (or not fight at all). **If the general dies, the
    player loses.** Details of the general come later (2026-10-23).

13. Pilots are anonymous and come automatically, at level 0, with each produced unit; survivors keep
    their level (2026-10-23).
14. The intermission is a simple web page in the spirit of SRW's intermission (2026-10-23).

15. Trade has no characters: an abstract exchange at fixed rates (2026-10-23).

16. The campaign is linear: one mission after another, in a fixed order (2026-10-23).

17. Mission outline draft 1 is accepted as it is (2026-10-23).
18. No capturing units in battle. Docks are captured as in the original (2026-10-23).
19. The player is shown pink and on the left, as in the original; the enemy Union uses the
    enemy's colour (2026-10-23).

20. The general can ride the Athena (early stages), Tiamat, Asura II, Hastur or any carrier. The
    player chooses each mission whether the general boards. If aboard and that unit is destroyed,
    **the game is over** at once (game-over screen; the player continues from their last save)
    (2026-10-23).

21. The general's unit gets +100% evasion, +100% power and counts as level 9 (max) while the
    general is aboard (2026-10-23).

22. The general's boarding is meant as both a risk and an enticement (2026-10-23).
23. The player has an Athena from mission 1 onward, so the general can board from the start
    (2026-10-23).

24. The general's doubled evasion is capped at 96/128 (75%) (2026-10-23).
25. The general boards or leaves units at intermission (2026-10-23).
26. Athena: a free replacement Athena when inside a dock (in battle). Battleships and carriers
    are only recovered or switched at intermission (2026-10-23). Confirmed meaning:
    in a battle the general can take a free Athena from a friendly dock; changing to a capital ship
    happens only at intermission; a lost Athena (without the general) is replaced for free.

27. Ahriman does not return (2026-10-23).

28. Maps: new layouts for all ten missions, designed by Claude (draft 1 above), painted with the
    ROM's terrain graphics. That makes the map editor part of the build plan (2026-10-23).

29. Maps 1–4 stay simple as an easy start; maps 5–10 follow the ROM's late maps in size and
    detail (draft 2) (2026-10-23).

## Open questions

* Map designs: feedback on maps 5–10 (draft 2) after a first playtest.
* Bonus objectives (capture all docks, sink every carrier…) add score. Score is new code anyway.
* New rules the maps need: the escape objective (map 1) and "destroy all units of a type" (map 6).

## Briefings, the villain and the results screens (2026-10-24)

* **Briefing screen** (`js/expansion/briefing.js`, game.html `#sBrief`): chapter header, the story,
  an incoming transmission from the villain, an annotated overview of the map (targets, the
  general, grey docks, reinforcement waves with their turn, the exit edge and the numbered plan)
  and the suggested strategy. Mission spec fields: `chapter`, `transmission`, `strategy` (steps)
  and `plan` (`{ n, path: [[x, y], ...] }` arrows, `{ n, at: [x, y], note }` markers; `n` is the
  step), passed through by `tools/build-missions.mjs`.
* **Villain: Marshal Oren Kessrin**, Director of the Union Security Directorate. He staged the
  commander's assassination and blamed Galt; Admiral Varga only signed the order, and Kessrin is
  glad to see him sunk (mission 4). Cold, courteous, never raises his voice; speaks once per
  mission and waits in the Olympos citadel for the finale. The ROM has no character portraits, so
  his face is original SVG art (`js/expansion/villain.js`).
* **Results**: every results screen opens on the ROM's Earthrise (the opening's BG1, tiles 11 →
  map 12, palette 10; `screens.js` `earthrise`), red-tinted on a defeat. Expansion results add the
  battle in numbers and every machine that flew it, with level gains, kills and an MVP.

## Revived units and the Selene Kai (2026-10-24)

The owner asked for every unit the ROM defines but never uses. The ROM gives them stats, names and
codes but no graphics: their map-icon, unit-picture and fight-sheet table entries all point at the
Mars's. In `js/expansion/data/units.json` each therefore has a `look` (the type whose art, map icon,
board token and fight choreography it borrows), a `tint` (hue shift of its unit picture) and a
`tag` (its model label on the board); `js/look.js` maps them at draw time, and fights and the info
screen keep the unit's own name and code. The base game has no looks and is unchanged.

| Type | Unit | Look | Changes from the ROM | Where |
|---|---|---|---|---|
| 12/13 | Horus FB-33, light bomber | Brontes | missile 77 → 150 (range 1–2) | production from mission 4 |
| 17 | Pandora, armed mine | Wisp | — | Union, missions 5–10 |
| 19 | Remora, decoy drone | Wisp | — | Union, missions 6, 9, 10 |
| 20 | Echidna, beam pod | Vulcan | — | Union, missions 5, 8 |
| 21 | Naga, rail pod | Phoibos (choreography; own art since 2026-10-24) | — | Union, missions 7, 9 |
| 22 | Rockeye, twin rail pod | Titan | — | Union, missions 8, 10 |
| 28/29 | Camelii CR-61II, transport | Crab | carries one small unit, like the Crab | production from mission 4 |
| 41 | Palmyra, missile frigate | Regulus | missile 64 → 115, range 2–4 | production from mission 5 |
| 45/46 | Msnp-II, heavy bomber | Abaddon | — (its missile is not a Decimator) | Union reinforcements, missions 8, 10 |
| 47/48 | Msfb-5, strike bomber | Abaddon | missile 0 → 200 | Union, missions 7–9 |
| 58 | Selene Kai CV-C8K, fast carrier (new) | Selene | HP 20, move 10, evasion 32 (25%), beam 77 at 1–2 | production from mission 6 |

Carriers have no capacity limit in the rules, so the Selene Kai's edge is speed, armour and its
beam turret. Prices are value × HP (Horus 16, Palmyra 10, Selene Kai 40). The Union units replace a
few Wisps and guns on missions 5–10 (`tools/missions/revive.mjs`); missions 1–4 are unchanged.

**The Selene Kai's own art** (owner, 2026-10-24): original pixel art, not from the ROM, drawn by
`tools/art/selene-kai.mjs` (shapes rasterized and shaded by `tools/art/raster.mjs`) into
`js/art/selenekai.js`; the unit data names it with `ownArt` (`js/art/own.js`). It has a unit-info
picture (its own palette), a map icon (the icon rows' colours 1–7, pink or green by army, mirrored
for army B; also the modern board's token and the info screen's icon) and a fight hull (the ships'
fight-palette colours) drawn as one 128 px sprite over the box the Selene's hull would fill, so the
Selene's choreography, shots and timings are unchanged; its launch rails sit where the Selene's
barrels fire from (y 11 and 121 of the hull's box), so the recorded broadsides leave from the rails.
The modern board uses a dedicated 32x21 token (fight-palette colours, `ownToken`), not the icon.
Re-run the tool after changing a shape.

**Azoras** (type 61, owner 2026-10-24; was the Pegasus): the General's flagship, a Tiamat-class
carrier-battlecruiser (category 1, owner) refitted with oversized engines, that the general can ride (`GENERAL_SHIPS`),
`unique` (one at a time outside beta). Rebalanced because the Pegasus was overpowering with the
General aboard: HP 32 and evasion 60 (owner's later call; ×2 with the General → the 96 cap),
move 9 (the fastest capital ship, kept); beam 90 at 1–2 (slot 0, against craft) and beam 120 at 2–4 (slot 1, against
ships). With the General aboard (level 9, power ×2) it deals about 10 HP to a Talos and 19 to a
Tiamat at range 2 and takes about 3-4 per enemy shot; the old Pegasus dealt 16 and 31 and took about
2, and a Tiamat with the General aboard would deal 13 and 25 (node forecasts, open space). Price 72; built from the intermission before mission 9 in both campaigns
(index `unlocks` of mission 8). Fights with the Tiamat's recordings (`look: 30`, `keepSlots` so each
beam keeps its own slot's choreography). Own art, `tools/art/azoras.mjs` → `js/art/azoras.js`: a
hybrid of the old Pegasus and the Tiamat (owner): the Pegasus's needle prow, forward-swept wings,
wingtip engine pods and pearl/gold/pink, around a Tiamat-class armoured drum with gold turret rows
and a three-nozzle engine block with exhaust plumes. Two fight hulls, like the Tiamat's two sheets (own.js `ownHullSet`): `hull` (the
broadside, against craft; ports where the batteries' shots start, box x 15–28, y 22–110) and
`hull2` (top-down, against ships; gun pods whose emitters sit where the beams start, box x 89–96,
y 3–19 and 101–116).

Owner's art guidance (2026-10-24): heavy twin cannons like the Tiamat's on the wings, in every view.
The modern fight renderer draws its hull from full-colour pictures three times the classic size
(`hullArt`, `hull2Art`; fightfx.js `ownHullArt`), and its shots per weapon slot from the set's
`shots`: slot 0 missiles (white body, red nose, flame, smoke trail) in place of the borrowed battery
shots, slot 1 a thick red beam from the wing cannons to the target (fightfx.js `drawRedBeam`,
`drawMissile`). The classic renderer recolours its effect row red when it fires slot 1
(fightscene.js `buildSprites`). Visual only: the recorded timings and hits are unchanged.

**Own colours** (`ownColors: true` in units.json; owner 2026-10-24: the Azoras, the Leviathan and the
Directorate Talos): unique units drawn in their own picture's colours instead of the army palette
rows. Their art sets carry full-colour versions (`iconArt`, `tokenArt`, `hullArt` or `posesArt`, with
the picture's palette); js/art/own.js `ownColors`, `ownIconColors` (an Indexed image with `rgba`,
honoured by gfx.paint and the fight info screen, with a small army-colour corner mark so the side
stays readable on the classic board), `ownTokenColors` (the modern board token; the board's army
rim and glow mark the side). The modern fight renderer draws full-colour hulls and poses
(fightfx.js `fullColour`; the pose tiles carry `posesArt`); the classic fights keep the palette.

**Pallas** (types 62-65, owner 2026-10-24): the Athena's successor, with the same four forms and
rules (62 fighter-bomber CHU-05F, 63 its spent form, 64 hunter CHU-05R, 65 its spent form: units.js
TRANSFORM/SPENT, rules.js REARM, ai.js SPENT_FORMS and `athenaBase`). Galt, `GENERAL_SHIPS`,
`unique` (one at a time outside beta), price 96, built from the intermission before mission 7 in both
campaigns (index `unlocks` of mission 6). Fighter forms: beam 48 at 1 (Mars level), torpedo 255 at 2
on 62, evasion 64 (50%), move 10. Hunter forms: railgun 102 at 1–3 (min 1, so it is the slot-0
counter against adjacent craft), beamsaber 140 at 1 (the slot-2 counter in melee), evasion 90 (70%;
the General aboard caps at 96), move 5. Fights with the Athena's moves (`look` 4-7, `keepSlots` so
each weapon keeps its slot's choreography). Own art, `tools/art/pallas.mjs` → `js/art/pallas.js`:
three sets (jet, spent jet, robot), each with a picture, map icon and fight poses for the Athena
sheet tiles its choreography draws (jet 0; spent jet 0, 64; robot 0/4/8/12/64 on the slot-0 sheet
and, as `poses2`, 0-12/64/68/72/76/128 on the sabre sheet the other slots load). The robot's poses, picture and icon are placed pixel by pixel
(`tools/art/pallas-pixels.mjs`: hand-drawn parts composed per pose, real-robot proportions). The jet's fight poses, both unit pictures
(painted at 48x48, Scale2x to 96; the jet's from its 32x32 sprite, Scale3x) and both map icons are
hand-placed too (`tools/art/pallas-pics.mjs`).

**Leviathan and Directorate Talos** (owner, 2026-10-24; the new campaign's Union units, docs/STORY.md).
Both are `unionOnly` (never in the market) and have their own art, drawn the same way:

| type | unit | look (choreography) | stats | art |
|---|---|---|---|---|
| 59 | Leviathan BB-LV0, Kessrin's flagship | Nodens | HP 60, move 4 (owner: the finale boss; tougher, slower than the Azoras so the General can still run), evasion 64 (50%), start level 4; beam 154 at 1, missile 255 at 2–5, railgun 115 at 1–3 | `tools/art/leviathan.mjs` → `js/art/leviathan.js`: picture, icon, a 96x128 fight hull |
| 60 | Directorate Talos HU-AX5D, Vane's machine and Kessrin's guard | Talos | HP 8, move 5, evasion 83 (65%), start level 6; beam 26 and beamsaber 140 at 1 | `tools/art/directorate-talos.mjs` → `js/art/dirtalos.js`: picture, icon, fight poses |

A small craft's own art has **fight poses** instead of a hull: 32x32 pictures in the craft fight
rows' colours, keyed by the look's sheet tile each one stands in for (the Talos draws poses at tiles
0, 4, 8, 12, 64, 68, 72, 76 and 128). `ownPoseTiles` (js/art/own.js) swaps those 16-tile blocks into
the fight scene's tile cache for 32x32 body sprites only (fightscene.js `drawSprite`), so shots,
flames and explosions still come from the sheet and the choreography is untouched; the modern board's
token takes the rest pose. `fightName` is the name the fight scenes show (up to 9 letters).

**The Naga's own art** (owner, 2026-10-24): the borrowed Phoibos graphics made the two pods look
the same, so the Naga got original art (`tools/art/naga.mjs` → `js/art/naga.js`, `ownArt: "naga"`,
no map tag any more): a gun pod mixing the Phoibos's railgun battery (the three-rail stack on top,
the armoured body with its visor slit) with the Vulcan's beam cannon (a ringed emitter barrel
underneath, fed by blue capacitor orbs on the flank). It keeps the Phoibos's choreography (`look`
15); its poses stand in for the Phoibos sheet's tiles 0 (level), 4 and 8 (barrels rising) and 12
(full elevation, recoil jets firing), the only 32x32 poses that sheet's fights draw. Stats unchanged.

## Kai refits and a larger finale (owner, 2026-10-27)

Late in the campaign supply piles up with nothing worth buying: the strong units are unique and the
deployment cap limits how many machines go to battle. The Kai refits are strong machines that are
**not unique**, so supply turns into a better team rather than a bigger one. Trade the old machine
in and pay the difference; the pilot keeps their level. Unlocked from the intermission before
mission 9 of the Galt remnant (index `unlocks` of mission 8); the Classic campaign has every
machine from mission 8 anyway (`allFrom`).

| type | unit | look | stats (base unit in brackets) | price |
|---|---|---|---|---|
| 66 | Lobster Kai FS-41K, interceptor | Lobster | move 12 (10), evasion 40% (30%); beam 128 (102) at 1; **new** W3 missile 77 at 1, which can hit ships | 32 |
| 67 | Crane Kai FFA-81K, fighter-bomber | Crane | move 10 (9), evasion 60% (50%); railgun 77 (58) at 1; ship missile 128 (77) at **1–2** | 32 |
| 68 | Titan Kai HU-NN7K, long-range mecha | Titan | evasion 40% (30%); railgun 102 (77) at **2–4**; **new** W2 railgun 90 at 2–3 against ships; railgun 64 (45) at 1 | 40 |

Forecasts (pilot level 5, open space, against the finale's level-3 Union and level-6 Directorate
Talos): about 25-40% more damage than the base machine, still well below the Pallas; the Crane
Kai hits a Tiamat for about 7 from two hexes without a counter (the Pallas's torpedo: 13).

**Art**: each has its own unit-info picture, map icon and fight poses (`ownArt`, `js/art/kai.js`,
written by `tools/art/kai-refits.mjs`); fights keep the base unit's choreography (`look`). The
pictures were generated with xAI's image model (`tools/art/xai-gen.py`; prompts and the chosen
sources in `tools/art/kai/`, with the Pallas and Directorate Talos pictures as style references)
and reduced to 96x96 with 32 colours and an outline (`tools/art/kai-convert.py`). The map icons are
drawn from shapes after generated side views, since 24x16 needs every pixel placed.
The fight poses (`tools/art/kai-poses.py`) come from the same side views, for the sheet tiles each
base unit's choreography draws (Lobster 0; Crane 0, 136; Titan 72, 68 with a muzzle flash): 32x32 in
the craft fight rows' colours, which the classic fights and the modern board's token use, and a
96x96 full-colour `posesArt` for the modern fights. (Without poses the modern board drew the base
unit's sprite, since a small craft's token comes from its fight sprite, not its map icon.) 14 of the
owner's 100-image budget used.

**Finale (Kessrin)**: more enemies to match. On the map: two more Directorate Talos pickets, two
Corvus, two Regulus, two Cranes and two Lobsters (32 → 42 units), and each Artemis carries one
more Crane. Reserves: two Lobsters more on turn 6; a new carrier group from the north-east on turn
8 (Hastur with a Lobster and a Crane aboard, two Hannibals, two Fenrirs, a Corvus); a Tiamat and two
Directorate Talos more on turn 11; eight Directorate Talos (was six) escort the Leviathan. 57 → 84
enemy machines in all. `missions/remnant/kessrin.json` was regenerated from
`tools/missions/remnant/kessrin.mjs` with the terrain kept as built (the builder needs the ROM; the
rebuild reproduced the old file byte for byte before the change).

**Finale deployment** (owner, 2026-10-27): the cap goes from 20 to 30 (the owner asked for the
whole roster, or 30 if that is too easy; with a late roster of level-7+ veterans, the Pallas, the
Azoras and the Kai refits, plus the nine garrison joiners, an unlimited cap looked too easy against
84 machines). Nine more open-space start positions (23 → 32), so 30 machines of any kind, capital
ships included, find a place; checked with `campaign.applyRoster` on a 34-machine roster.

## New units redrawn with xAI (owner, 2026-10-28)

Every unit with its own art now has generated pictures, map icons, board tokens and fight art,
replacing the shape-drawn versions (the old tools under `tools/art/` are marked superseded; running
them would bring the old art back). Each unit's generator and sources live in `tools/art/<unit>/`
and `tools/art/<unit>-xai.*`; details in `docs/notes/art-*.md`.

* **Naga**: picture, icon, the four barrel-elevation poses, and full-colour poses (new).
* **Azoras, Selene Kai**: pictures, icons, tokens, fight hulls kept on the recorded alignment points
  (Selene Kai rails at hull y 11/121; Azoras ports and wing-cannon emitters); the Selene Kai gains a
  full-colour hull.
* **Directorate Talos**: all poses on both sheets, including the melee (`poses2`, `posesArt2`), and
  a crimson beam sabre: tile 132 (the slash the melee recordings draw) is a red crescent, and the
  modern renderer adds a glow and a swing trail (`fightfx.js` `drawSabre`). It now has `keepSlots`,
  so its sabre plays the melee recording; before, it played as a ranged beam.
* **Pallas**: the jet, spent jet and robot, every pose including nine sabre frames, all from one
  master design. `own.js ownPoseSet` carries `posesArt2`, so the modern renderer shows the sabre
  sheet in full colour.
* **Leviathan**: a black and red dreadnought with a violet spinal cannon. Its main cannon (slot 1)
  charges a violet orb with lightning, then fires a thick pulsing beam with shock rings and a
  screen shake (`fightfx.js` `levCannon`, `drawLevCannon`); a lance for slot 0 and red streaks for
  slot 2; violet shots in the classic renderer. Visual only: recorded timings and hits unchanged.
  The fight sides carry `ownSlot`, the weapon actually fired (`gameapp.js`).

Images: 58 of the owner's 100 used (14 for the Kai refits, 44 for these).
