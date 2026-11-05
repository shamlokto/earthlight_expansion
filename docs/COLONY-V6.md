# Earthlight Space Colony Rebuild: version 6, the big city

The owner's requests (2026-11-05):
- "the new endgame: pressurized all compartments, have a population of 25,000; happiness above 85; Earth convoys are too easy and should be increased in difficulty."
- "there are too few hills and too many restrictions on the top deck. They have fertile land but do not allow farms, have no rivers to pump from, and have no hills."
- "new buildings and techs."

The owner also wants the game easier to run: "I frequently stop the game to catch up, or I starve my colonies to death." So the new content favours a few big buildings over many small ones. Food crises also mostly look after themselves now.

## 1. The endgame: Eden Restored (js/colony/victory.js)

The win now has four parts, the same on Easy and Normal unless noted:

| Part | Before | Now |
|---|---|---|
| Chambers | every chamber on every deck open | unchanged |
| Colonists | 1,500 (Easy) / 2,000 | **25,000** on both |
| Happiness | none | **above 85, held for 30 days**: +1 a day above 85, −3 a day at or below it, capped at 30 |
| Relief | 12 / 20 convoys of 100 | **60 / 90 loads** of 500 food, water or air, or 100 helium-3 |

- **Convoys.** One convoy leaves a day.
  - **From the dock**, a convoy is one load. It costs 350 credits and 35 parts, scaled by difficulty (Easy pays 210 and 21).
  - **A Mass Driver** (new; on the hull, research Mass Driver) turns a convoy into a heavy launch of three loads (1,500, or 300 helium). A heavy launch costs 900 credits and 90 parts.
  - **On Automatic**, a Mass Driver launches a heavy convoy every day by itself. It picks the good Eden can best spare and always keeps ten days of needs at home.
  - Earth pays 40% of the base price.
  - A heavy launch needs storage for 1,500 of the good. That makes Granaries part of the plan.
- **How long the relief takes.** The relief is a long project, but not a daily chore:
  - From the dock alone: 60 or 90 days of clicking.
  - With a Mass Driver: 20 or 30 launches.
  - On Automatic: no clicks at all.
- **What the player sees.**
  - The victory progress (goal and Market) shows all four parts: `62/62 chambers · 25,000/25,000 colonists · happiness 91 (above 85 for 30/30 days) · 60/60 convoy loads`.
  - The Market's convoy section shows loads, both costs and a **Launch 1,500** button beside each **Send 500**.
  - How to play › Winning explains the four parts and names the buildings that get you there.
  - The victory screen adds a Happiness statistic.
- **Old saves.**
  - A version-4 colony's convoys count one load each. This is generous, on purpose.
  - A colony that has already won keeps its victory.

## 2. 25,000 colonists: is it reachable?

**Growth.**
- Transports work as before: 8–20 colonists, plus 1 per 100 already living here, every 7 days on Easy and 10 on Normal.
- Each working **Arrivals Hall** makes a transport half as big again, up to three halls (×2.5).
- Clinic births are unchanged: every 10 days, +1 colonist per 50 living in homes a clinic covers.

**Feasibility check** (`tests/colony-endgame.mjs`). It runs the real `dayTick` and starts where the old win stood: every chamber open, 2,000 colonists, every tech known. A scripted player then:
- builds homes ahead of the population;
- builds big producers when a need runs short;
- builds Sun Mirrors for power;
- covers every home with a Clinic (as a Hospital), Canteen, Safety Post, Civic Plaza and Gallery.

The check is generous in three ways:
- Credits and parts are topped up.
- There are 32 construction crews.
- Raiders are off (a setting since version 5).

Food, water, air, power and every colonist come from the simulation alone.

| Run | 25,000 colonists | Happiness > 85 for 30 days | Deaths | What it took |
|---|---|---|---|---|
| Easy, seed 1, 3 Arrivals Halls | day **399** | day 32 | 0 | 22 Arcologies and 6 Tower Blocks; 35 Vertical Farms, 19 Water Works, 15 Atmosphere Processors, 29 Sun Mirrors; 214 buildings |
| Normal, seed 2, 3 halls | day **500** | day 32 | 0 | 20 Arcologies, 41 Vertical Farms, 22 Water Works, 18 Atmosphere Processors, 28 Sun Mirrors; 232 buildings |
| Easy, no halls (`NOHALLS=1`) | day 672 | | | |
| Normal, no halls | day 780 | | | |

- Each run is about 1 s of compute.
- At 2.5 s a day on ×1, 400–500 days is 17–21 minutes. Add the game up to the old win, and the slower building of a real player. The target is a long game, but a reachable one, so **25,000 stays on Easy too.**
- **Money at 25,000.** Tax at 10% brings 8,700–8,900 credits a day; upkeep is 1,000–2,200. The big city pays for itself.
- **Happiness at full coverage** sums well above 100 even with the −5 for unemployment, which is unavoidable at that size: there are about 7,000 jobs for 25,000 people. So the 85 target is about covering every home, not about micro-management.
- The test also checks each new effect on its own: the reserve, automatic rationing, Tower Block growth, Gallery and Plaza happiness, and Arrivals Halls (2.5 times the transport).

## 3. The upper deck (js/colony/decks.js, data/buildings.js)

**Generation** (new colonies only):
- **Hills.** Noise patches, about 20% of each garden's soft floor and 14% of each habitat ring's, away from the walls and the lift shafts. That is 320–830 hill tiles per upper deck on seeds 1–20. The main deck has 0–70.
- **Irrigation canals** (the RIVER terrain, so River Pumps, Fisheries and the farm bonus beside water all work).
  - A canal is two tiles wide, winding along the chamber's long axis, a tile in from the walls and clear of the shafts.
  - About four in five gardens get one, about a third of the rings, and always the chamber the home shaft opens first.
  - That is 330–600 canal tiles per deck.
- **The rest is unchanged.** The new features come from a generator of their own, seeded from the layout's salt. So every other part of a seed's decks (chambers, shafts, gates, breaches, the lower deck, the secrets) comes out exactly as before.
- **Old saves keep the decks they were saved with.** Decks are generated from the seed only for colonies saved without them, so the change applies to new colonies.

**Placement**: every building's `decks` list was reviewed and widened.

| Building | Was | Now |
|---|---|---|
| Farm Field | main | upper, main (the gardens' soil, +25% beside a canal) |
| River Pump, Fishery | main | upper, main (beside a canal; also on hills) |
| Orchard Terrace, Terrace Homes, Seed Vault | main | upper, main |
| Habitat, Canteen, Clinic, Safety Post | upper, main | all three decks (also on rock and conduit floors) |
| Park | upper, main | all three decks (plating, conduit, rock) |
| Research Lab, Officers' Quarters, Survey Drone Bay | some | all three decks |
| Gallery | upper | upper, main |
| Wanderers' Lodge | main | upper, main |
| Repair Yard, Guardian Barracks, Mushroom Wall | main, lower | all three decks |
| Grove, Sky Garden, Air Plant, Hydroponics | | also on hills / rock |

Some buildings stay where they belong:
- Heavy industry, the Arsenal and the Fusion Reactor stay off the upper deck.
- The Cistern and the Geothermal Tap stay below.
- Pump Stations stay off the upper deck, which has no flooding.

**Fix**: the Gallery's `service` was never counted, because it was missing from `SERVICE_KINDS`. It now gives its 5 happiness to the homes in range.

## 4. New buildings (11) and techs (10)

**Buildings** (base numbers, before difficulty):

| Building | Size, decks | Cost, days | Does | Tech |
|---|---|---|---|---|
| Emergency Stores | 1×1, all | 150 cr 10 p, 2 d | Holds back 200 each of food, water and air (400 with Food Security). Used only when a store runs dry; refills by itself, a tenth a day, from stock above 2 days of need. Tells you when the colony starts living on it. | none (on the menu from the start) |
| Granary | 2×2, all | 300 / 20, 4 d | Stores 2,500 food | Food Security |
| Vertical Farm | 3×3, all | 2,400 / 160, 10 d | 800 food for 120 water, −40 MW, 30 jobs (Agriculture head applies) | Vertical Farms |
| Water Works | 3×3, all | 2,000 / 140, 10 d | 1,800 water, −45 MW, 16 jobs | Water Works |
| Atmosphere Processor | 3×3, all | 2,200 / 150, 10 d | 1,800 air for 150 water, −50 MW, 16 jobs | Atmosphere Processors |
| Sun Mirror | 2×2, space (void, in reach) | 1,600 / 120, 8 d | +350 MW, no fuel, 4 jobs | Sun Mirrors |
| Tower Block | 2×2, all | 700 / 50, 6 d | Homes for 150; grows like a Habitat into a Tower (300: needs met and a park) and a Spire (450: and a clinic) | High-rise Homes |
| Arcology | 3×3, all | 5,000 / 400, 16 d | Homes for 1,500, 250 jobs inside, a park of 8 in radius 5 | Arcologies |
| Arrivals Hall | 2×2, main | 1,200 / 80, 8 d | Each transport ×1.5 per hall, up to 3 | Immigration |
| Civic Plaza | 3×3, all | 1,800 / 100, 8 d | Happiness 8 for homes within 16 tiles, and a park of 6 | Civic Planning |
| Mass Driver | 2×2, hull | 3,000 / 250, 12 d | Heavy relief launches (3 loads); Manual or Automatic | Mass Driver |

**Techs** (each carries `ver: 6`):

| Tech | Branch, cost | Needs | Unlocks / does |
|---|---|---|---|
| Food Security | society, 90 | Canteens | Granary; Emergency Stores ×2; **automatic rationing** (below) |
| Water Works | life, 200 | Water Reclamation | Water Works |
| Atmosphere Processors | life, 240 | Water Works | Atmosphere Processor |
| Vertical Farms | life, 240 | Mushroom Walls | Vertical Farm |
| Sun Mirrors | industry, 220 | Fabrication, Tether Masts | Sun Mirror |
| High-rise Homes | society, 160 | Terrace Homes | Tower Block |
| Civic Planning | society, 220 | High-rise Homes | Civic Plaza |
| Immigration | logistics, 200 | High-rise Homes | Arrivals Hall |
| Arcologies | society, 450 | High-rise Homes, Vertical Farms | Arcology |
| Mass Driver | logistics, 320 | Tether Masts, Fabrication | Mass Driver |

**Fewer starvation crises.**
- **Automatic rationing.** With Food Security, the colony rations itself while two things hold: the food in store plus the Emergency Stores would last under three days, and today's harvest falls short of the need. Rationing means a sixth less food and −3 happiness. It says so once, and stops when the stores recover. A Canteen set to Rationing still takes precedence (a fifth less, −8).
- Emergency Stores carry the colony through the gap before deaths start. They are on the menu from day 1.
- Granaries make the buffer big.

**Sim changes** (sim.js, targeted):
- The new big producers, Tower Blocks and Arcologies are on the life-support power circuit.
- Tower Blocks grow in the Habitat loop (`GROW_KEYS`).
- Tower Blocks and Arcologies count as homes for services (`HOME_KEYS`).
- The reserve and automatic rationing are in the needs step.
- Arrivals Halls are in the transport step.

**rules.js additions**:
- `GROW_KEYS`, `RESERVE_GOODS` and `reserveCap()`.
- `summary().reserve`.
- Gallery and Civic Plaza in `SERVICE_KINDS`.

**Interface**:
- An Emergency Stores panel shows what is held back.
- Tower Blocks show their next-level needs as Habitats do.
- A Mass Driver's panel opens the Market.

**Art and 3D.**
- Each new building has a card slot in `js/colony/art.js` and a prompt in `tools/art/colony/prompts/card-<key>.txt`. **No images were generated**: the cards fall back to their drawn icons until the owner agrees to the xAI run (11 cards).
- Each has a kit in `js/colony/view3d/kits.js`:
  - an armoured bunker;
  - twin silos;
  - a glass tower of lit green floors;
  - condenser towers and settling pools;
  - a stepped air plant with fans and vapour;
  - a foil dish on a gold truss;
  - a high-rise that grows taller per level;
  - a stepped garden pyramid with a spire;
  - a curved-roof terminal;
  - a fountain square with a town hall and clock tower;
  - a sloped ring rail with a cargo pod.

## 5. Tests

- `tests/colony-victory.mjs` (40 checks): convoys, heavy and automatic launches, quotas, the happiness clock, the four-part win, old saves.
- `tests/colony-endgame.mjs` (11 checks): the 25k feasibility runs and the new sim effects.
- `tests/colony-decks.mjs`: the upper deck has hills and canals, and farms and River Pumps are allowed there.
- `tests/colony-v2.mjs` and `tests/colony-sim.mjs`: tech and menu counts.
- `tests/colony-v3.mjs` (not edited here; another stream owns it) hard-codes 30 techs and needs a two-line update. See the hand-off note.
