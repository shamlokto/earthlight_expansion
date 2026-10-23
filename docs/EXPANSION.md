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
* The fight scenes always put army A on the left (`fightscene.js`). Either keep it that way, so the
  player's Galt units are on the right as the original's enemy was, or mirror it so the player is on the left.
* The AI has to play the Union side (army A). Check with whoever owns `ai.js` that it isn't tied to army B.

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

## Open questions

* Can units be captured in battle (beyond neutral docks) to feed the trade?
* Length: around 8–10 missions? Linear, or choose the order (C's structure)?
* Maps: reuse the ROM layouts, author new ones, or a mix?
* Fight-scene sides: keep the player on the right, or mirror?
* Does Ahriman return? Check the ending text and *Luna Strike*'s story.
