# Earth Light: *Landfall* — colony-building game (design plan, draft 2)

Working title: **Earth Light: Landfall** (alternatives: *Second Light*, *Homeport*, *Reconstruction*).

A third mode beside the original campaign and the expansion: a **space colony builder** in the
SimCity / Lanternfall tradition, set after the expansion's final battle. Nothing is built yet;
this document is the plan we agree on first.

## 0. Decisions so far (owner, 2026-11-03)

| # | Decision |
|---|---|
| D1 | **Time is hybrid**: days tick live (pause, ×1, ×2, ×4); decisions pause the clock until answered. |
| D2 | **The colony map is not hex.** A square-tile map, designed from scratch, **3D and rotatable**. Hex maps are for battles only. |
| D3 | **Only battles come from the ROM.** Map, tiles, buildings, UI, portraits, art and sound of the colony are original. |
| D4 | **Raids are auto-resolved by default**; the player may choose to command one, which loads an **expansion hex map picked by the direction of the attack**. Fighting is not a major element. |
| D5 | **Units, production and trading of machines are copied from the expansion** as they are. |
| D6 | **Commanders** lead units. The General is the strongest (the same ×2 power, ×2 evasion, level 9); the others are weaker specialists and never stronger than the General. They are recruited from **Wanderers**, as in Lanternfall. |
| D7 | **Non-beta start**: the original fleet was **sold to pay for the rebuild**. **Beta**: import the expansion save and the fleet comes along (overpowered, on purpose). |
| D8 | **The starter colony map is very large and expandable**, both in play and in future updates. |
| D9 | **Setting**: the remnant of a badly damaged space colony. **Lanternfall terrains inside** (fertile soil, artificial rivers, forests, hills), **Earthlight terrains outside** (magnetic fields give power, asteroid fields are best for ore). Some parts have no air and must be repaired. |
| D10 | **Building variety is the heart of the game**: deep research into SimCity, space colony and space mining games for reference (§11). |
| D11 | **Designed to be beautified with xAI later**: every visual is a named art slot with a procedural fallback (§7). |

## 1. Ground rules

* **Original content.** Nothing in the colony mode comes from the ROM. Battle rules, machines
  and the battle screen do, and they are only loaded when the player chooses to command a raid.
  A player who auto-resolves every raid never needs a ROM at all.
* **Same project conventions.** Plain ES modules, no build step, served by `serve.py`. Data in
  JSON. State in `localStorage` under `el-colony`, so **Export / Import save already includes it**
  (`js/savefile.js` takes every `el-*` key).
* **The simulation is pure.** Like Lanternfall's `js/land/land.js`, every rule module is free of
  the DOM and runs in node. The 3D view only reads state and sends orders. This is what lets us
  test 500 days headless, balance with a model script, and change the renderer without touching
  the game.
* **One vendored library**: three.js, pinned and copied into `js/vendor/three/` (no CDN, so the
  offline launcher keeps working).

---

## 2. Survey: what the genre does, and what we take

First pass (draft 1); the deep research behind §11 and §13 adds to it.

| Game | Mechanic worth stealing | Verdict |
|---|---|---|
| **Surviving Mars** | Separate chains for power, water, oxygen, food; buffer tanks; finite deposits; low comfort makes colonists leave. | **Take** layered utilities and buffers. **Drop** cable-and-pipe routing. |
| **IXION** | A decaying hull and scripted crises; first runs end in starvation because nothing explains farming. | **Take** scheduled crises. **Avoid** unexplained systems: every number has a breakdown. |
| **Aven Colony** | Twelve overlays; click to hear complaints; rationing saves food, costs morale. | **Take** overlays, an itemised happiness list, rationing as an emergency lever. |
| **Frostpunk** | Hope and discontent, laws, problems escalating to protests and riots. | **Take** the escalation ladder and a few edicts with real trade-offs. **Avoid** events that drain the meter regardless of play. |
| **SimCity 4** | Tax rates, demand caps raised by civic buildings, land value, slow recovery. | **Take** the tax slider, demand caps, the slow lag. |
| **They Are Billions** | A visible wave timer: economy against defence. | **Take** the raid clock, always on screen. |
| **Offworld Trading Company** | Everything sells into a market. | **Take** selling (§13). |
| **Lanternfall** (owner's own, `gemfire_remake`) | A land grid per province: soil multipliers, resources, adjacency bonuses (farm +25% by a river, +20% next to a mill), labour shortfall scaling all output, diminishing returns, projects (clear forest, drain marsh, excavate ruins), construction time, the Wanderers. | **Take the whole model** as the base of the colony's land rules, scaled up and moved to space. |
| **"How to tune a simulation game"** | Map chains as a graph; a stationary spreadsheet model; aim for net ≈ 0; ramp difficulty with sinks. | **Take as process**: `tools/colony-model.mjs` and `tests/colony-sim.mjs`. |

Genre lessons that shape everything: **shallow chains, legible numbers**, and **difficulty from
sinks** (upkeep, wages, repairs, growth), never from nerfed production.

---

## 3. Story and place

Straight on from `docs/STORY.md` (after the finale and the hidden Nineveh battle).

Earth's seas are poisoned and most colonies are dead hulks. The fleet that beat Kessrin has
nothing left to fight. **The General is made Governor** of the first reconstruction site, and
that is who the player is now: the same person, a different job.

**The site: F2 Eden**, a colony cylinder the war wrecked rather than destroyed. Half its hull is
holed, whole districts are airless, rivers are dry or flooded, but its fields still hold soil,
and it is near Earth. (`docs/EXPANSION.md` notes Eden was hardly a battlefield in the original,
so its fate is ours to write.)

**The price of starting**: Eden needs air plants, seed stock and parts nobody gives away. The
General **sold the fleet** to buy them (non-beta start): the machines that won the war are now
habitat blocks and seed vaults. What is left is the General, a handful of loyal officers, and
the credits. Beta testers keep the fleet (§14).

| Character | Role | System |
|---|---|---|
| **The General** (player) | Governor; still the best pilot alive | Commander, ×2 / ×2 / level 9 (§13) |
| **Prof. Hal Ruess** | Chief engineer | Tech tree, repairs, sealing breaches |
| **Capt. Mira Sato** | Commander of the Colony Guardians | Army, the raid clock |
| **Queen Moraine** (Ashfall Cartel) | Trader **or** chief raider | Market, tribute |
| **Lt. Dov Arkin** | Guardian wing leader, if he lived | — |

**Carry-over hook**: the expansion save stores `state.choice`. **Deal**: the cartel trades with
you and raiders are scavengers and deserters. **Refuse**: the cartel is the main pirate threat
and trade costs more.

---

## 4. Time (D1)

A tick is **one day**. Days run live at ×1 (one per second), ×2, ×4 or paused. The simulation is
integer-stepped, so the headless test runs 500 days in milliseconds.

**Decisions pause the clock** until answered: a raid at the gates (auto-resolve / command /
tribute), a wanderer at the dock, a finished research project, a crisis event, a sector repair
complete. The player chooses which kinds pause in Settings (default: all). Frostpunk's tension,
without missing an event at ×4.

```
day tick (pure, js/colony/sim.js)
  1 labour      colonists fill job slots; a building short of staff works at that fraction
  2 production  staffed buildings produce, consuming inputs (adjacency and terrain applied)
  3 utilities   power and air are instantaneous: demand > supply throttles buildings
  4 stores      food, water, ore, alloy, parts, credits move in and out of buffers
  5 needs       food / water / air / power / housing per colonist: met or unmet
  6 happiness   recompute from needs, tax, services, entertainment, crowding, fear
  7 population  immigration / growth / emigration / deaths (slow, lagged)
  8 money       taxes in, upkeep and wages out
  9 research    labs add research points; milestones add upgrade points
 10 sectors     repair, pressurising and projects advance
 11 threat      heat, the raid clock, warnings
 12 people      wanderers arrive or leave; commanders recover; loyalty drifts
 13 events      crises, convoys, tribute demands -> may pause (D1)
```

---

## 5. The map (D2, D8, D9)

### 5.1 Shape: an unrolled cylinder

Eden is a cylinder; the map is the cylinder **unrolled into a long rectangle**. The middle band
is the **interior** (the land); along both long edges runs the **hull**; beyond it is **space**;
at the two short ends are the **end caps**, where the spaceports and docks are.

```
  space   . . : a a . m m . . t t . : a . . p p . . g g . ~ ~ ~ ~ ~ ~ ~   (Earthlight terrains)
  hull    ===#####=======######===========####======######=========###
  land    rubble  fields  river  forest  [LANDING]  hills  lake  ruins      (Lanternfall terrains)
  land    breach  fields  river  marsh    district  rock   lake  breach
  hull    ===#####=======######===========####======######=========###
  space   . a a . . m . . : : . . t t . . a a . . . p . . . . . . ~ ~ ~
         ^ end cap (dock)                                         end cap ^
```

### 5.2 Size and sectors

* Tiles are square. A **sector** is **16 × 16 tiles**, the unit of expansion, rendering and saving.
* The **starter colony** is charted at **16 × 10 sectors = 256 × 160 tiles (40 960 tiles)**:
  6 sector rows of interior, 2 rows of space on each side.
* The player starts with **2 × 2 interior sectors** pressurised around the landing district,
  plus the nearer end-cap dock. Everything else must be won back.
* Sectors are stored by key (`"sx,sy"`), so the map can grow in **any direction** in later
  updates without redrawing anything: new hull sections, a second cylinder towed alongside, an
  asteroid outpost as its own map. The save format never assumes a fixed size.

### 5.3 Sector states (how the colony grows)

**Interior**: `sealed` (dark, unknown) → `surveyed` (terrain, artifacts and damage visible; costs a
survey drone trip) → `repaired` (hull breach sealed; parts and days) → `pressurised` (air pumped in;
needs spare air capacity) → **buildable**.

**Space**: `surveyed` → `claimed` (needs a dock or a tether mast within reach, and the right tech).

Damage varies by sector: a light breach is a week of work, a district open to space is a
season. Every claimed sector also raises **heat** and may open a new **raid approach** (§13),
so growth is never free. This is the expansion mechanic in story form: you are not buying
land, you are giving a dead place air again.

### 5.4 Terrain

**Interior (Lanternfall, owner's D9)** — soil multipliers as in Lanternfall's `land.js`:

| Terrain | Use | Notes |
|---|---|---|
| **Fertile soil** | Farms ×1.8 | Rare; along the old river beds |
| **Plain soil** | Farms ×1.1, anything | The default |
| **Poor soil** | Farms ×0.55 | Most of it, after the war |
| **Artificial river / lake** | Water, fisheries, +25% to farms next to it | Some are dry: restore the pumps |
| **Forest** | Air (+O₂ to the sector), timber, parks | Clear for soil, or keep for air |
| **Hills** | Orchards, terraces, reservoirs | Good sites for mines into the hull |
| **Rock** | Heavy buildings, quarries | |
| **Marsh / flooded district** | Nothing until drained | Drain: fertile next to water |
| **Rubble district** | Nothing until cleared | Clear for salvage (parts) |
| **Breached deck** | Nothing; airless | Seal the hull first |
| **Contaminated ground** | Nothing; slow sickness nearby | Decontaminate (research) |

**Space (Earthlight, owner's D9)** — same names as the battle game, original art:

| Terrain | Use |
|---|---|
| **Magnetic field** | **Power**: induction collectors harvest it |
| **Asteroid field** | **Best ore mining** |
| **Meteoroid field** | Light ore and ice sweeps; meteor strikes on nearby buildings |
| **Comet tail** | **Ice → water** |
| **Galactic plasma** | Helium-3 for fusion |
| **Gravity flux** | Heavy industry (gravity foundry); slows haulers |
| **Atmosphere** (Earth's edge) | Gas scooping (air, nitrogen), relief drops to Earth |
| **Void** | Light orbital modules; the lanes raiders come in by |
| **Hull** | Shipyards, docks, turret mounts; breach points |

### 5.5 Artifacts (Lanternfall's resources and ruins)

One per tile at most, revealed by survey: **ore seam**, **ice vein**, **helium-3 pocket**, **old
spring** (water; habitats here +happiness), **seed vault** (a farm here starts at fertile),
**derelict wreck** (salvage once: parts, a machine, or a blueprint), **Galt data core**
(research once, or a lab here +50%), **memorial grove** (a park here +happiness), **sealed
bunker** (a wanderer may be hiding in it), **abandoned dock** (repair it for a free dock),
**Decimator crater** (contaminated; rich ore once cleaned).

### 5.6 Projects (Lanternfall's, extended)

Clear rubble (gives parts) · drain flood · seal breach · restore river pumps · decontaminate ·
salvage wreck · excavate data core · tow asteroid (moves an asteroid tile into reach of a dock).

---

## 6. The 3D view (D2)

* **three.js**, rendered from the pure state. Free orbit (rotate, tilt, zoom, pan), with an
  optional SimCity-style **90° snap**. A minimap of the whole cylinder; click to jump.
* **Chunked by sector**: each sector is one group of instanced meshes, built when first seen and
  rebuilt when it changes; off-screen sectors are culled. 40 960 tiles is light work for
  instancing; the design holds to several times that.
* **Tiles** have height (hills, river beds, rubble heaps), so the land reads in 3D. Water is a
  plane; space sectors are dark with drifting asteroid and plasma meshes; the hull is a wall
  you can see through when the camera tilts.
* **Buildings are parametric kits**: each building in data lists parts (box, cylinder, dome,
  cone, torus, truss) with sizes, colours and **texture slot names**. Procedural now; textured by
  xAI later; a hand-made glTF model can replace any kit later without changing the data around it.
* **Overlays** (Aven Colony): power, water, air, happiness, jobs, service coverage, heat, raid lanes.
* **Airless sectors** render dim and blue-grey, with breach markers; pressurising one floods
  it with colour.
* **Stretch** (later): curve the land up the cylinder wall so the far side hangs overhead.
* A plain 2D top-down canvas renderer reads the same state, for tests and very old machines.

---

## 7. Art pipeline: built to be beautified with xAI (D11)

xAI's image model makes **flat images** (`tools/art/xai-gen.py`: text-to-image, and edits
that follow reference pictures for style). So the 3D world is designed around **image slots**:

| Slot kind | Example slots | Used as |
|---|---|---|
| **Terrain texture** (seamless, top-down) | `terrain/fertile`, `terrain/rubble`, `terrain/asteroid` | Tile tops |
| **Material texture** (seamless) | `mat/hab-facade`, `mat/greenhouse-glass`, `mat/hull-plate` | Building kit surfaces |
| **Building card** | `card/hydroponics` | Build menu, info panel, wiki |
| **Portrait** | `portrait/ruess`, `portrait/wanderer-07` | Commanders, wanderers, comms |
| **Skybox / panorama** | `sky/earth-rise`, `sky/cylinder-far-side` | Backdrop |
| **Decal** (alpha) | `decal/breach`, `decal/scorch`, `decal/crater` | Damage, raids |
| **Illustration** | `event/first-harvest`, `title/landfall` | Events, title, endings |

* **One manifest**, `js/colony/art/manifest.json`: each slot has a kind, size, `seamless`
  flag, a **prompt file**, optional **reference images**, and a **procedural fallback**. The
  game asks for a slot by name and gets the picture if it exists, the fallback if not (the same
  pattern as Lanternfall's `art.js` `hasArt` / `art`).
* **One style bible**, `tools/art/colony/style.txt`, prefixed to every prompt, plus a few
  approved reference images passed to the edits endpoint, so a set made over months matches.
* **One script**, `tools/art/colony-xai.mjs`: generate missing slots in batches through
  `xai-gen.py`, then post-process (make seamless, resize, cut alpha, write to `art/colony/`).
  It respects the existing `XAI_QUOTA` budget. Note HANDOFF.md: from 2026-11-02 the old model
  name is served by `grok-imagine-image-2.0`; test our prompts on it first.
* **Beautifying never needs code**: add a picture to a slot, and the game uses it.
* Order of value when we start: building cards and portraits (cheap, seen constantly) →
  terrain textures → skyboxes → material textures → decals and illustrations.

---

## 8. Resources

| Resource | Source | Sink | Buffer |
|---|---|---|---|
| **Power** | Solar, magnetic induction, fusion (He-3) | Every building | Batteries only |
| **Water** | Rivers, springs, comet ice, reclaimers | Farms, air plants, colonists | Tanks |
| **Air** | Forest, electrolysis, gas scoops | Colonists; **every pressurised sector** | Small tanks: a power cut is a crisis |
| **Food** | Farms (by soil), hydroponics, fisheries, orchards | Colonists, guardian crews | Granaries |
| **Parts** | Ore → smelter (alloy) → fabricator (parts); salvage | Building, repairs, sealing sectors | Warehouses |
| **Credits** | Taxes, market sales, relief contracts, selling machines | Building, upkeep, wages, tribute | — |
| **Supply** | Arsenal (parts → supply) | Building and repairing machines | — |

* **Supply is the expansion's own currency**, unchanged, and machine prices stay as
  `campaign.js` sets them (`price = value × hp`). It is where colony and army compete head-on.
* **Air scales with territory**: each pressurised sector needs air to stay pressurised. Growth
  is paid for in air plants, which is what makes "some parts lack oxygen" a system, not a label.
* Progression currencies: **research points** (labs) and **upgrade points** (milestones, raids
  repelled, relief contracts).

### 8.1 Mining, selling and trade

From the mining and markets research (`docs/colony-research/mining-markets.md`; Offworld Trading
Company, Hardspace: Shipbreaker, Anno 1800, Per Aspera, Dyson Sphere Program, X4, EVE):

* **A market, not a long chain** (research pitfall 8: the two don't mix). Chains stop at **3 tiers**
  (ore → alloy → parts) and **3 inputs per recipe** at most.
* **Your sale moves the price**: each lot sold pushes that good's price down, recovering over days,
  with a flattening curve so nobody can corner a market with pocket change. A fixed price is a
  button; a price you move is a decision.
* **Waiting pays sometimes**: what Earth needs (food, air, medicine) drifts **up** in price over
  time. Holding stock is a position, and it also raises heat (§13.4), which is the counterweight.
* **Several buyers, different appetites**: **Earth relief** (food, air, water; pays in credits and
  upgrade points), **Moraine's cartel** (alloy, parts, machines; pays well, and if you dealt with her
  sells unique machines and blueprints), **Union and Galt remnant traders** (supply, ships). The
  same good has more than one price, and routing is the decision.
* **Relief convoys are prepared events** (Offworld's export launch): one convoy ships 100 units of a
  good and **costs fuel and parts to launch**; an adjacent warehouse speeds loading. Selling becomes
  something you build toward.
* **Raw or refined**: selling ore now, or refining it first for more, is a decision at every tier.
* **Salvage has condition** (Hardspace): a wreck stripped carefully (slower, a commander with the
  Mechanic perk) is worth much more than one broken up fast.
* **Selling machines** (owner): the expansion's full-price sell stays, so scrapping the war fleet
  to fund the rebuild works exactly as the story says it did.
* **Depletion fades instead of nagging** (Dyson Sphere Program): ore seams on asteroids deplete;
  research (deep drilling) stretches them until they effectively last; mines are cheap to move.
* **Upkeep shows on the map** (Per Aspera): a building short of maintenance parts looks broken
  and slows down, so a shortfall has a place, not only a number.
* **Automate the arithmetic, never the judgment** (Offworld): a profit-per-day overlay for every
  building, auto-sell above a set stock level, "idle unprofitable buildings". Which buyer, when
  to ship and what to refine stay manual.
* **Moraine's tribute** (Anno 1800's pirates): she demands payment from time to time. Pay, refuse,
  or make it pointless with defences. **Wiping out the cartel costs you its unique goods**, which
  is what makes refusing a real decision rather than an obvious one.

---

## 9. Population

* **Classes**: Workers → Technicians → Scientists (school, academy). Buildings demand classes by slot.
* **Housing** sets the cap; over it = crowding.
* **Immigration** is the main growth: a transport every ~10 days if happiness ≥ 55, housing is
  free and food has a surplus (8–20 people). Below 40, nobody comes.
* **Natural growth** is slow and needs a clinic. **Emigration** below 25. **Deaths** from
  starvation, suffocation, raids.
* **Recovery is slow, on purpose** (owner): a bad month costs a season.
* **Labour shortfall** (Lanternfall): short of hands, output drops in proportion.

### Happiness (0–100), itemised in the UI

```
  base 50
+ necessities met      +6 each: food, water, air, power, housing          (max +30)
- necessity unmet      -20 each, -5 more per further day short
- tax                  0% +8 · 10% 0 · 20% -14 · 30% -32                    (non-linear)
+ services             clinic, school, security: 0..+8 each by coverage
+ entertainment        canteen, park, arena, broadcast: 0..+6 each          (later)
- crowding             -1 per 2% over housing
- fear                 recent raid -10 (decays over 15 days); enemies visible -15
+ guardian cover       0..+10 by guardian strength against the threat
+ welfare head         a commander heading Welfare: + charm / 20             (§13)
+/- edicts
```

Bands: **≥ 70** immigration and tax-tolerance bonus · **40–69** steady · **25–39** unrest,
−20% production · **< 25** protests, emigration · **< 10 for 5 days** the Council recalls the
Governor: **you lose**.

**Taxation**: one slider, 0–30% (`revenue = population × wealth × rate`); per-class rates
unlock later.

---

## 10. Buildings, tiers and adjacency (rules)

* Most buildings take **1 tile**; large ones **2 × 2** or **3 × 3** (arcology, spaceport, fusion).
* **Terrain and artifacts decide where** (Lanternfall): farms by soil, mines on seams, induction
  collectors only on magnetic fields.
* **Adjacency, not pipes**: utilities reach by coverage radius; neighbours give bonuses
  (Lanternfall: farm +25% by a river, +20% next to a mill; market +1 per neighbouring housing).
* **Diminishing returns** (Lanternfall): beyond three markets, half yield; stacking bonuses cap.
* **Construction takes days** and needs workers; nothing works while building or damaged.
* **Upgrade paths**: many buildings have levels (clinic → hospital) instead of separate entries.

## 11. Building catalogue

*Pending the deep research (owner's D10: SimCity, space colony and space mining references).
Draft 1's tier-0 set stays as the baseline below.*

| Building | Cost (parts) | Jobs | Produces /day | Consumes /day |
|---|---|---|---|---|
| Landing Pad | start | — | — | — |
| Habitat Block | 20 | — | 40 housing | 4 power, 2 air |
| Solar Array | 15 | 1 W | 25 power | — |
| Ice Mine (space, comet tail) | 25 | 3 W | 30 water | 8 power |
| Water Reclaimer | 20 | 2 W | 60% of water used returns | 6 power |
| Hydroponics Bay | 30 | 4 W | 24 food | 10 water, 6 power |
| Electrolysis Plant | 25 | 2 T | 40 air | 8 water, 12 power |
| Granary / Tank / Air Tank / Battery | 10 each | — | buffers | 1 power |
| Ore Mine (asteroid) | 30 | 4 W | 20 ore | 10 power |

Per colonist per day: **1 food, 1.2 water, 1 air, 0.15 power**.

---

## 12. Tech tree and upgrade points

Four branches, six nodes each, paid in research points and gated by milestones:
**Life Support**, **Industry**, **Society**, **Defence** (ending in the Kai refits). Node lists
are revised with the catalogue (§11).

**Upgrade points** buy ~20 permanent perks (+10% farm yield, −15% build cost, +1 wanderer a
season, −20% machine upkeep…). Research *unlocks*, UP *improves*.

---

## 13. Military: machines, commanders, wanderers, raids

### 13.1 Machines (D5)

Copied from the expansion as they are: the same unit data (`js/expansion/data/units.json`),
the same anonymous pilots with levels 0–9, the same **production** (Arsenal: supply → machine),
**trade** (machine for machine plus supply), **sell** (full price back) and roster format
(`js/expansion/campaign.js`). Upkeep is the colony's addition: each machine costs supply and
food per day and one worker as crew.

### 13.2 Commanders (D6)

Research behind this (SRW, Advance Wars, Heroes III, Darkest Dungeon, Koei, JA2, Fire Emblem)
pointed to a few rules that keep a strongest character strongest without making the rest pointless:

* **The General is a flat ceiling**: ×2 power, ×2 evasion (capped at 96/128), level 9, in any
  machine, exactly as in the expansion (`js/expansion/battle.js`). No growth, no specialty,
  and only one body: the General can be in one place.
* **Specialists are strong on one axis and weak on another** (Advance Wars' paired bonus and
  penalty), so nobody is a weaker copy of anyone.
* **Commander numbers are capped below the General's**: power at most ×1.6, evasion at most
  ×1.5, and only in their best class.

**Stats** (Lanternfall's three, so a commander also matters in peacetime):

| Stat | In battle | In the colony |
|---|---|---|
| **Might** | Scales the power bonus | Security head: fear and crime down |
| **Wits** | Evasion bonus, auto-resolve tactics | Industry / Research / Agriculture head: + wits/10 % output |
| **Charm** | — | Welfare / Trade head: happiness, prices; inviting wanderers |

**Class grades** (SRW's letter ranks, one per Earthlight unit class):

| Class | Earthlight categories | Example machines |
|---|---|---|
| **HU** | 8 | Mars, Titan, Talos, Medusa, Athena (HU form), Pallas |
| **Planes** | 9, 10 | Lobster, Crane, Horus, Brontes, Athena (fighter form) |
| **Armour** | 11, 12 | Vulcan, Phoibos, Cyclops, Echidna, Naga, Rockeye |
| **Ships** | 1–4 | carriers, battleships, cruisers, Azoras |
| **Support** | 13, 14 | Crab, Camelii, Dragon, Hydra batteries |

Grade → power multiplier in that class: **S ×1.6 · A ×1.4 · B ×1.2 · C ×1.0 · D ×0.85**
(scaled by might). Evasion: up to ×1.5 at S (scaled by wits). Each commander also has one
**style**: Melee (range-1 weapons +15%), Gunner (range 2+ +15%), or a weapon mode
(Beam, Railgun or Missile +15%), and one **perk** that is conditional, not raw power
(e.g. *Ace*: planes +1 move; *Bulwark*: counter-attacks against the unit −25%;
*Mechanic*: repairs cost half; *Quartermaster*: the unit's upkeep halved).

Examples (placeholders for the cast we write later):

| Commander | Might / Wits / Charm | Grades (HU / Planes / Armour / Ships / Support) | Style · perk |
|---|---|---|---|
| **The General** | 100 / 90 / 80 | always ×2 / ×2 | — |
| A former Union ace | 78 / 60 / 50 | B / **S** / C / D / C | Gunner · Ace |
| A Galt brawler | 84 / 40 / 44 | **S** / D / B / D / C | Melee · Bulwark |
| A cruiser captain | 60 / 74 / 62 | C / C / C / **S** / B | Missile · Quartermaster |
| A dockyard engineer | 40 / 86 / 58 | C / D / B / C / **A** | — · Mechanic |

**Commanders fight and govern.** Any commander can **lead a machine** and/or **head a
department** (Agriculture, Industry, Research, Security, Trade, Welfare), Koei-style. With
fighting a minor part of the game, a commander's peacetime job is what makes recruiting one matter.

**Pay and loyalty** (Lanternfall and Koei): each commander has a daily **wage** in credits and a
**loyalty** that drifts toward a target set by colony happiness and their pay; low loyalty means
they may leave with the next transport.

**Losing a commander is not permanent** (research pitfall: named characters lost for good with
a thin recruit stream make players stop playing). A commander whose unit is destroyed is
**injured** for 20–40 days; one who leaves turns up again as a wanderer later.

### 13.3 Wanderers (Lanternfall)

* Wanderers arrive with transports and sit in the **Wanderers' Lodge**; each stays a few weeks,
  then moves on (and may come back).
* **Invitation** uses Lanternfall's formula: chance = 0.3 + (envoy's charm / 220) − (colony size
  penalty) + (100 − the wanderer's loyalty) / 400, plus a credits gift; each refusal makes the
  next offer likelier.
* **Two upgrades, kept separate** (Darkest Dungeon's stagecoach): the Lodge's level raises how
  many wanderers arrive; Officers' Quarters raise how many commanders you can keep.
* **Veterans come with baggage** (Darkest Dungeon): a wanderer with better grades also has a
  worse flaw (expensive, disloyal, a bad grade elsewhere), so the best-looking recruit is not
  automatically the right one.
* A small **try-out** fee reveals a wanderer's perk and flaw before hiring (Battle Brothers).
* Some wanderers are **story characters**: Arkin (if he lived), Galt deserters with a past,
  cartel defectors (deal or refuse changes who comes).

### 13.4 Raids (D4)

**Heat** (0–100) rises with what makes Eden worth robbing: population, stored food and parts,
market traffic, claimed sectors. It falls with time and with Jammer Arrays. Heat sets how often
raids come and how strong. **It ignores the player's fleet**, so a beta import never makes the
game harder.

| Days | Raid | Strength | Who |
|---|---|---|---|
| 1–24 | none | — | nobody has found Eden yet |
| 25 | first **warning**, 5 days out | — | a sensor contact |
| 30 | **Scavengers** | 1–3 machines, level 0, primitive | leaderless scrap crews |
| 50+ | **Pirate bands** | 4–8, level 0–2 | the cartel, if you refused Moraine |
| 90+ | **Deserter warbands** | 8–14, level 2–4, trained | Union and Galt deserters after food |
| 160+ | **Directorate remnant** | 15+, level 4–6, a capital ship | Kessrin's last people |

Each raid comes from a **direction** (an end cap, or a hull side), shown on the raid clock.
When it arrives the clock pauses (D1) and the player picks:

1. **Auto-resolve** (default): the guardians, their commanders and the colony's turrets
   against the raiders, computed from the Earthlight unit stats with the commander multipliers.
   The **predicted outcome and expected losses are shown before you commit**.
2. **Command the battle**: loads an **expansion hex map chosen for that direction**
   (`js/colony/data/raidmaps.json`: direction → mission file) in the battle engine, with your
   guardians and commanders deployed. Needs the ROM, like any battle. Results come back to the colony.
3. **Pay tribute**: food, parts or credits to be left alone. Cheap now, raises heat, small
   happiness hit.

A lost raid damages buildings in the attacked sectors and steals stores; a won raid pays
salvage and upgrade points.

---

## 14. Starting: non-beta and beta (D7)

**Non-beta**: the fleet was sold. Starting credits = the sale value of the expansion's starting
fleet; the General and 2–3 story officers are the only commanders; **no machines**, or one
old machine for the General (open decision). The first scavengers come around day 30, so there
is time to build an Arsenal and a couple of turrets.

**Beta**: **Import save** reads the expansion roster from the uploaded file
(`el-expansion-campaign-remnant`, through `js/savefile.js`'s parser) and turns it into
guardians, levels and all: the Azoras Kai, the Kai refits, the General's ship. `state.choice`
sets Moraine's side. **Upkeep on imported machines is waived for 60 days**, then charged, so a
beta tester gets the easy, overpowered ride first and then a fitting problem: a war fleet eats
a colony's food. Selling ships you no longer need is a good answer.

---

## 15. Phases of play

| Phase | Days | Doing | Pressure |
|---|---|---|---|
| **I Landfall** | 1–30 | Power, water, air, food, first habitats, first surveys | Thin buffers |
| **II Reclamation** | 30–90 | Sealing breaches, ore → parts, taxes, first guardians and commanders | First raids; parts torn between air, homes and the Arsenal |
| **III Society** | 90–180 | Schools, labs, entertainment, immigration, space sectors | Warbands; happiness is now a real system |
| **IV Reconstruction** | 180+ | Fusion, arcologies, Earth relief convoys | Directorate remnant; Earth's quota is a hard sink |

**Win**: every interior sector pressurised, Earth relief quota met, 5 000 happy colonists.
**Lose**: recalled by the Council (happiness), or the colony's command centre falls in a raid.

---

## 16. Build plan (step by step)

| Step | What | Main files |
|---|---|---|
| 1 | **Sim core**: day tick, resources, tier-0 buildings, sector map data, a plain 2D view | `colony.html`, `js/colony/{state,sim,map,buildings}.js`, `js/colony/data/*.json` |
| 2 | **The 3D view**: three.js, sectors as chunks, orbit camera, kits, overlays, minimap | `js/colony/view3d/*`, `js/vendor/three/` |
| 3 | **Sectors**: survey, repair, pressurise, projects, artifacts | `js/colony/sectors.js` |
| 4 | **People**: classes, housing, immigration, happiness, tax | `js/colony/population.js` |
| 5 | **The catalogue** (§11) and adjacency rules | `data/buildings.json` |
| 6 | **Progress**: tech tree, research, upgrade points | `js/colony/tech.js` |
| 7 | **Military**: machines from the expansion, upkeep, Arsenal and Scrapyard | `js/colony/army.js` |
| 8 | **Commanders and wanderers** | `js/colony/commanders.js` |
| 9 | **Raids**: heat, clock, auto-resolve, tribute, command on a hex map | `js/colony/raid.js` |
| 10 | **Carry-over**: import save, beta | `js/colony/import.js` |
| 11 | **Story**: intro, comms, events, endings | `js/colony/story.js` |
| 12 | **Art slots** and the xAI script | `js/colony/art/`, `tools/art/colony-xai.mjs` |
| 13 | **Balance**: model and 500-day headless run | `tools/colony-model.mjs`, `tests/colony-sim.mjs` |

## 17. Open decisions

1. Title: *Landfall*, *Second Light*, *Homeport*, *Reconstruction*?
2. Does the General keep one old machine in the non-beta start?
3. Army upkeep in food as well as supply, or supply only?
4. Free orbit, 90° snaps, or both?

## Sources

Survey (draft 1): [Surviving Mars primer](https://admin-forum.paradoxplaza.com/forum/threads/surviving-mars-a-primer.1083069) ·
[IXION review (PC Gamer)](https://www.pcgamer.com/ixion-review/) ·
[Aven Colony wiki](https://avencolony.fandom.com/wiki/How_to_Play_Guide_for_Aven_Colony) ·
[Frostpunk developers on hope and laws (PC Gamer)](https://www.pcgamer.com/au/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws) ·
[SimCity zoning (Prima)](https://primagames.com/eguides/simcity-eguide/essentials/zoning) ·
[They Are Billions preview](https://bit-tech.net/previews/they-are-billions-preview/1/) ·
[How to tune a simulation game](https://www.gamedeveloper.com/design/how-to-tune-a-simulation-game).
Commanders: [SRW Z formulas](https://lparchive.org/Super-Robot-Wars-Z/Update%2035/) ·
[SRW pilot abilities](https://akurasu.net/wiki/Super_Robot_Wars/Z2.2/Pilot_Abilities) ·
[Advance Wars CO Power](https://warswiki.org/wiki/CO_Power) ·
[Heroes III specialties](https://heroes.thelazy.net/index.php/Hero_specialty) ·
[Darkest Dungeon stagecoach](https://darkestdungeon.wiki.gg/wiki/Stage_Coach) ·
[Fire Emblem affinity](https://fireemblemwiki.org/wiki/Affinity) ·
[JA2 merc stats](https://fadden.com/gaming/ja2/stats.html).
Full research reports: `docs/colony-research/` (commanders, mining and markets; buildings to follow).
Lanternfall: `shamlokto/gemfire_remake`, `docs/LAND.md`, `js/land/land.js`, `js/data/vassals.js`.
