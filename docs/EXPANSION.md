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
  unlocks (whichever shipyards the remnant holds).
* **Trade is a core system** (decided). A unit is worth a different amount to different people at
  different times, and that difference is the game:
  * **No trader characters** (decided): trade is an abstract exchange at fixed rates from each
    machine's value. A unit's worth differs because of what the next map needs, not who buys it.
  * The next mission's briefing (map, enemy mix, objective) is shown **before** trading, so you
    trade for what the next map needs: missiles for asteroid fields, carriers for wide maps.
  * Machines are traded, **pilots are not** (decided). The level belongs to the pilot, so a veteran
    pilot keeps their level and moves to the new machine. Prices depend on the machine only.
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

### 2. Old Enemies: LEM (30×20, Aldiss asteroids)

```
::::  aa   ::::  aa
:P:   a  .  :: U  a:
::  .  aa  U  :: (G):
 a  ::   U    aa ::::
::::  aa  ::  .  ::
```
* **Story**: a Union patrol hunts a Galt remnant band hiding in the NE meteoroids (`G`).
* **Player**: cap 6. **Galt joiners** (Lobster ×2, Crane ×2) become player units on turn 2.
* **Union**: Cyclops ×2, Medusa ×2, Cerberus ×2, Gulon. They're missile-heavy, but against targets
  in meteoroids missiles lose 40%.
* **Objective**: wipe out the patrol. Bonus score if no joiner is lost.
* **Unlocks**: Galt fighters (Lobster, Crane). **Next map wants**: mecha and railguns (fortress deck).

### 3. Shipyard: HERBERT (30×20, the Asgard shipyards)

```
WWWWWWWWWWWWWWWWWWW
W d D d = = = d D d W
W d d d d C d d d d W
W = S = = = = S = = W
>P  .  D  .  .  D  . W
```
* **Story**: the remnant's hidden base, held by a Union garrison. Four grey docks hold cargo.
* **Player**: cap 8. **Union**: Vulcan ×2, Phoibos ×2 (artillery), Talos ×2, Hydra ×2 on the
  railways, Cortex ×1, Pergamon docks.
* **Terrain idea**: the deck gives almost no cover (5%). The docks are the only safe hexes, so
  capturing a dock (bring it to 0 HP, as in the original) is both cover and loot.
* **Dock cargo** (carries over if captured): Mars ×2, Athena, Selene.
* **Objective**: destroy the Cortex (existing).
* **Unlocks**: mecha, carriers. **Next map wants**: fast strikers (a fleeing flagship).

### 4. Le Guin Again: GIBSON (45×20, the Le Guin sector)

```
P .  .  ggg  .  U  ggg  .   .  N>
P .  .  ggg  U  .  ggg  U   .  .>
. :: .  ggg  .  U  ggg  .  ::  .>
```
* **Story**: the admiral who ordered the killing flies a captured Nodens (BB-MM4, 30 HP, Missile 255
  at range 2–4): a Galt super-battleship now in Union colours.
* **Player**: cap 8. **Union**: Nodens `N`, Regulus ×2, Hannibal ×2, Fenrir (built: one Fenrir and no Cranes, after the encirclement rule made the full escort unbeatable for a six-machine force; bot: 6 machines win 1 in 3, 8 machines always).
* **Terrain idea**: two gravity-flux belts give 50% against railguns. The escorts sit in them, so
  beams and missiles go through while railgun players get stuck.
* **Objective**: sink the Nodens (existing flagship objective). It runs for the east edge;
  if it escapes by turn 14, the mission fails (turn limit, existing).
* **Next map wants**: cruisers and the strength to take docks (an industrial Foundry).

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
