# Earthlight Space Colony Rebuild: version 11, roads, monorail lines, eight-level quads, megastructures, bigger wonders

The owner (2026-11-08):
- "can the monorail be automatically built between the shops. Also, make some rules for the roads so that it makes sense to build them, say, connecting perks but not noise, make area effects better, or so. The quad zones should have more levels so it is more fun to see them evolve."
- "when it maxes out with two or four adjacent quads of the same type, it will become something huge."
- "The wonders are not so wonderful. You can make the size bigger and harder to build, but with stronger perks."

No new buildings and no new techs. The rules for roads, monorail lines and megastructures are in a new pure module, `js/colony/network.js`. Like the other version 10 modules, it imports `rules.js` and uses it only inside functions. `rules.js` re-exports what the interface needs. The view draws the lines in the new file `js/colony/view3d/monorail.js`.

## 1. Roads worth building (network.js, rules.covers / parkAt / habitatNeeds, sim.js)

**What counts as a road network:**
- A building **touches a road** when a road tile, or a finished Lift's shaft, is beside its footprint (4-neighbours).
- Road tiles joined side by side form a network.
- Lifts join the networks of the three decks.
- A network that touches the Command Centre or a dock is the **hub**.

The networks are cached per state. They are rebuilt only when the roads, Lifts, Command Centre or docks change, which is checked with a cheap hash once per day or per change of building count.

| Rule | Numbers (`ROAD`, `AREA`, `ROAD_GATE`) |
|---|---|
| **Area effects** reach further, for everything | every service radius (`rules.covers`) and park spread (`parkField`) gets **+1 tile** (`AREA.bonus`) |
| **Along roads**: services (Clinic, School, Canteen, transit, shops, Freight Yard...) and parks reach further to a building on the **same road network** | **+4 tiles** (`ROAD.reach`). `covers(svc, b, state)` takes the state for this; `parkAt` checks the parks on the network |
| Workshop **noise** never travels along roads | `noiseAt` is unchanged |
| **Linked** to the Command Centre or a dock by road | upkeep **×0.9** (`ROAD.upkeep`, sim step 10). A building site gets an extra day's work every **4th** day (`ROAD.buildEvery`, sim step 1), about a quarter faster |
| **Quads** touching a road | grow a day sooner (`ROAD.growFaster`) |
| **Road gate** (`rules.ROAD_GATE`, the need word `road`) | quads need a road to grow into level 4+ (Courtyard Flats, Market Hall, Works), Habitats into Apartments, Tower Blocks into a Spire or more |

The road need only gates growing (`grow: true`). Nothing shrinks for want of a road, so an old save's buildings keep their levels.

**Inspector.** Every building except roads and space buildings has a **Road** line:
- "Linked to the Command Centre", "On a road" or "None";
- a sentence on what the road gives, or would give (`network.roadInfo`), including the level it stays at without one.

**How to play.** The Roads section now says what roads give, and how monorail lines form.

## 2. Monorail lines link themselves (network.monorailNet)

Once **Skyscrapers** is known, these are **stations**:
- every working Monorail Stop;
- every Market Quad from the **Arcade** (level 5) up. A merged Market Quad counts once, at its block's centre.

Each station links to its **2 nearest** stations on its deck within **24 tiles** (`LINE`). No tool is needed and nothing is auto-placed: the Market Quads themselves are the stations.

**What a line gives:**
- A building within **3 tiles** of a line, or **6** of a linked station, counts as **near transit** (`rules.nearTransit`). That covers the `transit` need, and the faster growth of Habitats, Tower Blocks and quads.
- The new need word `monorail` (Exchange, Grand Bazaar, Crown Spire, Megafactory) asks for exactly this.
- A Market Quad station on a line earns **credits ×1.25** (`monorailMarket`, sim step 5).

**3D** (`view3d/monorail.js`):
- an elevated white beam 1.62 tiles up, on pylons every 3 tiles;
- a car on each line (two on lines longer than 12 tiles), gliding to and fro and easing into each station.

It uses four InstancedMeshes, rebuilt only when the lines change. `update(dt)` writes matrices in place with no allocation, scaled by the game speed. Its stats are in `view.debug.monorail.stats()`.

## 3. Eight levels a quad (data/buildings.js)

Level 1 is still the empty lot. Levels 2–9 are grown. Levels 10 and 11 are the merged megastructures (§4).

| | Living (homes) | Market (jobs / credits / shoppers) | Workshop (jobs / parts, alloy) |
|---|---|---|---|
| 2 | Cottages 40 | Stalls 6 / 15 / 150 | Workshops 10 / 3 |
| 3 | Row Houses 100 | Shops 15 / 40 / 400 | Machine Shops 24 / 7 |
| 4 | Courtyard Flats 220 | Market Hall 30 / 90 / 900 | Works 45 / 12, 2 |
| 5 | **Garden Terraces 300** (shops, happiness 50) | Arcade 55 / 180 / 1,800 | **Foundry 60 / 15, 4** |
| 6 | Mid-rise 400 | **Galleria 75 / 260 / 2,600** (800 homes near, happiness 57) | Assembly Plant 80 / 20, 5 |
| 7 | Residential Tower 700 | Trade Tower 100 / 360 / 3,500 | Factory 140 / 35, 10 |
| 8 | **Sky Tower 1,000** (transit, happiness 62, land value 45) | **Exchange 140 / 520 / 5,000** (2,000 homes, monorail, value 45) | **Robotic Works 170 / 50, 15** (transit) |
| 9 | **Crown Spire 1,400** (monorail, coffee and wine, happiness 65, value 55, Arcologies) | **Grand Bazaar 190 / 720 / 7,000** (3,000 homes, monorail, luxuries, value 55, Luxury Goods) | **Megafactory 210 / 70, 22** (freight, monorail, Heavy Works) |

The levels that existed before keep their numbers and needs. Power and upkeep grow with each level, up to −46 power and 22 upkeep for a Crown Spire. Every level has its own kit: the version 7 kits keep their meaning, and the six new levels have new kits (terraced gardens; a slim glass sky tower with sky gardens; a gold-crowned spire; a glass-vaulted galleria with a dome; twin glass exchange towers; a glowing bazaar dome with four towers; a foundry with a crucible; a white robotic hall with arms; a megafactory with five stacks and a cooling tower). Kit heights rise with every level (Living 0.4 → 9.5 tiles).

**Growth days** (`sim.quadDays`):
- levels 2–4 take 2 days, as before;
- levels 5–9 take 3, 3, 4, 4 and 5 days (`SIM.quadGrowLate`);
- a road takes a day off, transit or a monorail line halves the time (rounded up), and the minimum is 1 day.

Measured: a fresh colony's first lot, with a road beside it, reaches Cottages on day 2, Row Houses on day 3 and Courtyard Flats on day 6 (version 7: 3 / 5 / 8).

**Old saves.** The new levels were inserted, so a version 10 save's quad levels are remapped once on load (`rules.QUAD_REMAP`, flag `state.flags.quads11`). A Residential Tower is still a Residential Tower: Living 5→6 and 6→7, Market 6→7, Workshop 5→6 and 6→7.

## 4. Megastructures (network.megaDay, sim step 8)

**How quads merge:**
- Two top-level quads of the same kind side by side merge. They must be aligned on their 2×2 grid and form a 4×2 or 2×4 block.
- Four in a 2×2 square (a 4×4 block) merge too, and four are preferred.
- Two pairs that come to form a square merge again into four.
- Each member's quads must hold their top level's needs.
- Each member moves to the merged level and carries `b.mega = { lead, n, x, y, w, h }`. The lead is the top-left member; the view draws the whole megastructure on it, and the other members draw nothing.

| | 2 merged (each member) | 4 merged (each member) |
|---|---|---|
| Living | **Twin Spires**: 1,750 homes, service 3, radius 12 | **Arcology Crown**: 2,100 homes, service 5, radius 16 |
| Market | **Grand Concourse**: 240 jobs, 900 credits, 8,750 shoppers, shopping radius 20 | **Megamall**: 285 jobs, 1,080 credits, 10,500 shoppers, radius 24 |
| Workshop | **Industrial Complex**: 260 jobs, 88 parts, 28 alloy | **Gigafactory**: 315 jobs, 105 parts, 33 alloy |

That is the top level ×1.25 per member for two, and ×1.5 for four, plus a wider reach. Upkeep stays at the top level's.

**The moment and the fall back:**
- A merge is a loud log line, for example "Four Crown Spires have grown into an Arcology Crown."
- A megastructure splits back into top-level quads if any member's top-level need fails for **30 days** (`MEGA.splitDays`).
- It splits at once if a member is moved or demolished (`megaBreak`).

**Inspector.** It shows a "Megastructure" line (name, members, days failing). A top-level quad shows a "Top level" line that explains merging.

**Kits:**
- twin spires joined by glowing sky bridges;
- a stepped pyramid arcology with hanging gardens and a crown of light;
- a glass-vaulted concourse between two glass towers;
- a glowing megamall dome with four corner towers;
- two long halls with six stacks;
- a gigafactory with a glowing roof, eight stacks and two cooling towers.

A 2×4 block uses the turned kit. Heights run 4–12.7 tiles.

## 5. Wonders: bigger, harder, much stronger (data/buildings.js, wonders.js)

**What changed for every wonder but the Ark:**
- It is two tiles bigger. `kitSize` keeps the size its kit was drawn for, and `kits.js scaleKit` scales the kit up evenly.
- It has a **fourth stage**, and its stages cost roughly 1.5× and take longer.
- The allowed decks are unchanged. Every wonder still fits: the wonders test places all of them.

| Wonder | Size | Perk now (was) |
|---|---|---|
| Concert Hall | 6×6 | **all tourism ×2** (`tourismMul`), +6 happiness everywhere, 10 within 28 tiles, leisure 5, 30 tourism (was 8 within 24) |
| Memorial Garden | 7×7 | **no grief or fear at all** (`noGrief`: negative moods are left out of happiness), +8 happiness, park 14/20, 40 tourism (was +5, fade ×2) |
| Grand Arboretum | 8×8 | **air 5,000 a day**, **land value +25 deck-wide** (radius 260; the wonders' land-value cap raised 25 → 40), +6 happiness, park 16/26, 60 tourism (was 500 air, +15 within 24) |
| Great Library | 7×7 | **all research ×2** (`researchMul`), plus 4 a day per 1,000 colonists (was the 4 only) |
| Starport | 7×7 | transports **×3**, visitors ×5, **800 credits a day** in trade (was ×2, ×4) |
| Zero-G Arena | 8×8 | +6 happiness and **+1 per 2,000 colonists** (up to +16), 300 credits a day **+60 per 1,000 colonists** (`happyPer`, `perPop`, `wonderIncome`), 70 tourism |
| Spin-Gravity Ring | 8×8 | homes for **8,000**, +5 happiness (was 3,000, +3) |
| The Ark | 7×7 | unchanged |

## 6. Tests, numbers, files

**Tests:**
- `tests/colony-quads.mjs`: 170 checks (was 78, then a smaller legacy set). It covers:
  - the 11-level data, names, rising homes and jobs, and the merged ratios;
  - the kits (9 distinct, rising heights, mega kits drawn by the lead only, the turned 2×4);
  - the road rules: the +1 reach, the +4 along roads, park reach, noise not along roads, the road gate, growth days, the upkeep discount, faster linked building and the Road line;
  - the monorail: no lines before Skyscrapers, stops linking, corridor transit, Market Quad stations and their income;
  - megastructures: 4 and 2 merges, the announcements, jobs, save and load, a day of the sim, demolish splitting, a 30-day split, and pairs merging into an Arcology Crown;
  - the version 10 save remap.
- Also updated:
  - `colony-wonders` (sizes, 4 stages, the new perks);
  - `colony-tourism`, `colony-gardens`, `colony-luxuries` (top stage numbers, the Arena's 70, the Starport's ×5, the Arboretum's park 16);
  - `colony-endgame` (its Tower Block gets a road for the Spire);
  - `colony-v2` (triage upkeep allows the road discount).

**Balance run** (240 days): the quad town reaches 1,565 colonists and the Habitat town 1,459. The quad player now lays a road stub beside each lot.

**Speed.** `parkField` is now cached per deck while the parks and chambers are unchanged, which paid for the new rules. The version 2 colony's 500 days take about 0.85–0.9 s, against a limit of 1 s.

**Files:**
- new: `js/colony/network.js`, `js/colony/view3d/monorail.js`;
- changed: `js/colony/rules.js`, `sim.js`, `data/buildings.js`, `wonders.js`, `tourism.js`, `landvalue.js`, `ui.js`, `view3d/kits.js`, `view3d/view.js`.
