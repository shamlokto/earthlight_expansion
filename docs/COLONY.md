# Earthlight Space Colony Rebuild — colony-building game (design plan, draft 3)

Title: **Earthlight Space Colony Rebuild** (owner, 2026-11-03).

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
| D12 | **The map's shape**: a large, partly broken colony lying in Earthlight-style space terrain; once repaired its interior is huge (farms, homes, more); buildings extend into the space terrain for mining and power; **Earth's atmosphere runs along the bottom of the map**. The map is expanded later with more elements. |
| D13 | **Start simple**: a small first version, advanced parts later; landscapes that look like Earth Light's (§5.3, §16). |
| D14 | **Answers** (owner, 2026-11-03): title *Earthlight Space Colony Rebuild*; the General **sold his ships and disbanded his army**, so a non-beta start has no machines; **importing a save raises a non-beta player's starting funds**, while a **beta tester's guardians are exactly the original army** (sell it again for money and resources, or keep it and be invincible); **the army eats no food** (its crews count as citizens and are too few to matter). |
| D15 | **Build now**: version 1 with several agents in parallel; the owner provides **100 xAI images**; keep the early game as simple as Lanternfall's land view, and let depth grow with the tech tree and population. |
| D16 | **Movement like SimCity** (owner, 2026-11-03): boats on the river, haulers in space and arriving transports move from the start; **people and cars stay inside until there are roads**. Movement is visual and driven by the real numbers; it never decides the economy (SimCity 2013's agent simulation is the cautionary tale). Roads are cheap, instant and only visual in version 1; version 2 can give them a delivery bonus. |

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

**The site: F2 Eden**, a colony the war wrecked rather than destroyed, hanging just above Earth's atmosphere. Half its hull is
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

### 5.1 Shape: a broken colony in Earthlight space (owner, D12)

The map is a stretch of **space with Earthlight landscapes**: asteroid belts, magnetic fields,
meteoroid drifts, comet tails, plasma clouds. In the middle lies **Eden itself**: a huge,
partly broken colony, its hull a wall around a vast interior of Lanternfall land. **Along the
bottom of the map is Earth's atmosphere**, with Earth filling the view below.

* **Inside the hull**, once repaired, there is room for everything a city needs: farms on the old
  fields, living quarters, rivers, forests, industry. This is where most of the city goes.
* **Outside the hull**, buildings **reach into the space terrain** on docks, tethers and
  platforms: mines on asteroids, induction collectors on magnetic fields, ice harvesters on
  comet tails, helium-3 skimmers in plasma.
* **The atmosphere band** at the bottom: gas scoops for air, relief drops down to Earth, and a
  descent lane raiders can climb up from.

```
  row 0-1   . . a a a . . m m m . . . : : . . t t t t . . . p p . . . a a .   deep space
  row 2     a a . ┌──────────────────────────────────────────────────┐ . m m
  row 3     a a . │ rubble  breach  fields  river   forest   ruins   │ D m m
  row 4     . . D │ fields  river  [LANDING]  hills  lake   breach   │ . m .   Eden
  row 5     : : . │ marsh   forest  district  rock   lake   fields   │ . . .   (Lanternfall
  row 6     : : . │ breach  fields  river     hills  rubble breach   │ . p p    terrain inside)
  row 7     . . . └────────────────── D ───────────────────────────────┘ . p p
  row 8     . t t . . . . : : . . . . . . . . a a . . . . . . . t t . . . .   near space
  row 9     ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~   Earth's atmosphere
                                                                          D = dock on the hull
```

### 5.2 Size and sectors

* Tiles are square. A **sector** is **16 × 16 tiles**, the unit of expansion, rendering and saving.
* The **starter map** is **16 × 10 sectors = 256 × 160 tiles (40 960 tiles)**. Eden's hull
  encloses about **10 × 5 sectors (160 × 80 tiles, 12 800 tiles of land)**. Space surrounds it on
  three sides, and the bottom sector row is atmosphere.
* The player starts with **2 × 2 interior sectors** pressurised around the landing district,
  plus the **Earth-facing dock**. The rest of the interior must be repaired, and the space around
  it claimed.
* Sectors are stored by key (`"sx,sy"`), so the map can **grow in any direction** in later
  updates without redrawing anything: more space to the sides and above, wrecks and smaller
  colony fragments drifting in, a second colony towed alongside, new elements and events. The save
  format never assumes a fixed size. (Owner: "later we can expand the map and add elements to
  make it even more fun.")

### 5.3 It looks like Earth Light (owner, 2026-11-03)

The colony art is original (D3), but the **landscape grammar is Earth Light's**, taken from what
was measured on the original's 30 maps (`docs/EXPANSION.md`, "What the ROM's late maps do"):

* **Space features are organic**: plasma lakes, gravity-flux rivers, asteroid ridges, **diagonal
  magnetic belts**, meteoroid drifts, a comet with its tail, all mixed together, never straight
  bands. Near Eden space is fairly open (about 65% void, like the early maps); further out it gets
  as busy as the late maps (26–37% void).
* **The Earth edge** is drawn as in CLARKE and BABYLON: an **atmosphere band along the bottom**
  (8 tiles here) with **Earth's body below it**, which cannot be built on.
* **Eden is an Earth Light fortress grown into a city.** The original's stations (GOTLIEB) and
  fortress mazes (VARAMU) are walled complexes of **chambers, decks and narrow gates**, with
  **turret railways** along the walls, **docks** at the gates and a **command centre** in the
  heart. Eden keeps that shape: an outer **hull wall**, inner **bulkheads** dividing it into
  **chambers**, **gates** between them, railways along the hull, docks where the hull opens to
  space, and the Command Centre in the middle. Only now the chamber floors are fields, rivers
  and forests.
* **Leftovers of the war**: Wisp minefields still drift in the lanes (a hazard to clear, and
  salvage once cleared), wrecks of both navies, Decimator craters.

### 5.4 Chambers (how the colony grows)

The interior is split by bulkheads into about **24 chambers** of different sizes (roughly
24 × 24 to 48 × 40 tiles), each with its own character: a field chamber on the old river, a
forest chamber, a hill chamber, an industrial deck chamber, a rubble district. **The chamber is
the unit you repair**, which makes growth a sequence of real decisions (which chamber next?)
rather than painting squares.

**A chamber's states**: `sealed` (dark, unknown) → `surveyed` (terrain, artifacts and breaches
visible) → `sealed off` (every breach in its walls patched: parts and crew days per breach) →
`pressurised` (air pumped in; needs spare air capacity) → **open**.

A light chamber is a week's work; a district open to space is a season. Gates connect open
chambers: a building's coverage passes through an open gate, not through a bulkhead.

**Space** is claimed by sector (16 × 16 tiles): `surveyed` → `claimed` (within reach of a dock
or tether mast, with the right tech).

Every open chamber and claimed sector raises **heat** and may open a new **raid approach**
(§13), so growth is never free. In story terms, you are not buying land; you are giving a dead
place air again.

### 5.5 Terrain

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

### 5.6 Artifacts (Lanternfall's resources and ruins)

One per tile at most, revealed by survey: **ore seam**, **ice vein**, **helium-3 pocket**, **old
spring** (water; habitats here +happiness), **seed vault** (a farm here starts at fertile),
**derelict wreck** (salvage once: parts, a machine, or a blueprint), **Galt data core**
(research once, or a lab here +50%), **memorial grove** (a park here +happiness), **sealed
bunker** (a wanderer may be hiding in it), **abandoned dock** (repair it for a free dock),
**Decimator crater** (contaminated; rich ore once cleaned).

### 5.7 Projects (Lanternfall's, extended)

Clear rubble (gives parts) · drain flood · seal breach · restore river pumps · decontaminate ·
salvage wreck · excavate data core · tow asteroid (moves an asteroid tile into reach of a dock).

---

## 6. The 3D view (D2)

* **three.js**, rendered from the pure state. Free orbit (rotate, tilt, zoom, pan), with an
  optional SimCity-style **90° snap**. A minimap of the whole map; click to jump.
* **Chunked by sector**: each sector is one group of instanced meshes, built when first seen and
  rebuilt when it changes; off-screen sectors are culled. 40 960 tiles is light work for
  instancing; the design holds to several times that.
* **Tiles** have height (hills, river beds, rubble heaps), so the land reads in 3D. Water is a
  plane; space sectors are dark with drifting asteroid and plasma meshes; the atmosphere band
  glows blue over Earth's curve below; the hull is a wall
  you can see through when the camera tilts.
* **Buildings are parametric kits**: each building in data lists parts (box, cylinder, dome,
  cone, torus, truss) with sizes, colours and **texture slot names**. Procedural now; textured by
  xAI later; a hand-made glTF model can replace any kit later without changing the data around it.
* **Overlays** (Aven Colony): power, water, air, happiness, jobs, service coverage, heat, raid lanes.
* **Airless sectors** render dim and blue-grey, with breach markers; pressurising one floods
  it with colour.
* **The roof**: the interior sits under hull and glass panels, faded out when the camera looks
  in, so the land inside and the space outside are seen in one view.
* **Stretch** (later): Earth's day and night sweeping across the atmosphere band.
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
| **Skybox / panorama** | `sky/earth-below`, `sky/starfield`, `sky/atmosphere-glow` | Backdrop |
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

## 10. Buildings: the rules (from the research)

Building variety is the heart of the game (D10). Four research reports sit behind this
(`docs/colony-research/`: SimCity lineage, space colony games, mining and markets, commanders).
These are the rules the catalogue follows, each with the game it comes from:

1. **Coverage is a field, not walkers or pipes.** Each service building has one radius number,
   shown as an overlay (SimCity 2000). Coverage passes through open gates, not bulkheads. The
   overlay shows the *real* reach (Cities: Skylines showed something else, and players argued for years).
2. **Upgrade in place, on the same tiles** (Aven Colony): most buildings have **levels 1–3**, so
   a layout made early still works late. What improves is **output per tile**, so space inside the
   hull does the balancing (Cities: Skylines schools: 12.5 → 28.6 → 104 students a tile).
3. **Modules instead of bigger buildings** (Cities: Skylines 2's extension wings): some
   buildings take one module: **+capacity**, **+quality** or **+range**.
4. **Work modes** (Tropico): one building, two or three behaviours with trade-offs, switched any
   time. The most variety for the least art.
5. **Terrain decides where** (Lanternfall, Pharaoh): many buildings only work on one terrain,
   and Earth Light's terrains give the space buildings their reasons to exist.
6. **Clusters pay** (IXION's specialisation, made visible): **four or more buildings of one kind
   in one chamber** give that chamber a named bonus (a *Farm Belt*, an *Industrial Deck*). The
   threshold is shown on screen.
7. **Loop closers** (Surviving Mars, Oxygen Not Included): buildings that turn waste into
   input: reclaimed water, hydrogen from the air plants as fuel, waste to mushrooms.
8. **Decorations are cheap and raise a ceiling** (Surviving Mars): parks cost little, use **water,
   not power**, and lift happiness only up to their rating, so spamming them doesn't pay.
9. **Lifecycles** (Cities: Skylines' landfill): a tailings dump fills, spoils its neighbours, and
   must be emptied before it can be removed.
10. **Housing evolves to show what's missing** (Caesar III): a habitat grows through levels as its
    needs are met, and its panel lists what the next level needs. That *is* the happiness readout.
11. **Patents change the rules** (Offworld Trading Company): one-off purchases that edit a rule
    for the whole colony.
12. **Landmarks have two gates** (Cities: Skylines): a milestone **and** a behaviour; a couple
    reward surviving a disaster. Once earned they stay unlocked, so nobody wrecks a colony to farm them.
13. **Megastructures are chained** (Cities: Skylines' monuments): each needs landmarks from
    different branches. **None deletes a system**; they make one cheaper. (Monuments that
    delete a whole system, like the Hadron Collider, were the late-game complaint.)
14. **Everything can be moved** for a fee. Buildings that can't be moved were the most hated
    single decision in IXION and Planetbase.
15. **Show the deficit forming**, not after it's fatal (Oxygen Not Included, Planetbase).

**Sizes**: 1 × 1, 2 × 2, 3 × 3. **Construction** takes days and crew; nothing works while being
built or damaged. **Upkeep** is paid in credits and, for machinery, in parts. A building short of
parts looks broken and slows down, so the shortfall shows on the map (Per Aspera).

## 11. Building catalogue

**Version** says when it arrives (§16): **1** is the first playable game; later versions add the
rest. Where = where it can stand (I = interior, S = space, H = hull, A = atmosphere band).

### Command and logistics

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Command Centre** | 1 | I · 3×3, start | The Governor's seat (Lanternfall's keep). Surveys chambers; small storage; admin coverage | Its level is the colony's **charter**, which unlocks tiers. Lose it in a raid and the game is over |
| **Dock** | 1 | H · 2×2, at a hull gate | Joins inside and outside: space buildings must be within its reach; transports land here | Levels add berths. In version 3 it also repairs machines, as docks do in Earth Light |
| **Repair Yard** | 1 | I · 2×2 | Ruess's crews: seal breaches, clear rubble, run projects | Levels: more crews at once |
| **Road** | 1 | I · 1×1, and gates between open chambers | Laid in lines (click start, click end); colonists walk and rovers drive only on roads | Visual in version 1 (D16); a delivery bonus later |
| **Storage Depot** | 1 | I or S · 1×1 | Stores 300 of one good | **Mode**: food / water / air / parts / ore |
| **Tether Mast** | 2 | S · 1×1 | Extends a dock's reach into space | A chain of masts is the space "road" |
| **Survey Drone Bay** | 2 | I · 1×1 | Deep survey: reveals artifacts further away | **Module**: +range |
| **Mass Driver** | 4 | H · 3×3 | Launches relief convoys to Earth cheaply | A convoy is 100 units plus fuel, a prepared event (§8.1) |

### Power

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Solar Array** | 1 | H or S · 1×1 | Power, levels 12 / 20 / 30 | In Earth's shadow it drops (later: day and night) |
| **Induction Collector** | 1 | S · 2×2, **magnetic field only** | Steady power by field tiles covered (strong) | Raiders' beams can't touch it (beams do nothing in a magnetic field, as in battle) |
| **Battery Bank** | 1 | anywhere · 1×1 | Stores power | Power is otherwise the one good with no buffer |
| **Plasma Skimmer** | 2 | S · 2×2, **plasma only** | Helium-3 | |
| **Fusion Reactor** | 3 | I · 3×3 | Burns He-3: huge power | **Mode**: normal / overdrive (+50%, chance of shutdown) |

### Water

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **River Pump** | 1 | I · 1×1, beside river or lake | Water | Dry rivers must be restored first (project); a restored river feeds every farm along it |
| **Water Reclaimer** | 2 | I · 1×1 | Recovers 50 / 60 / 70% of the water used in its chamber | Loop closer: improves the ratio instead of the supply |
| **Ice Harvester** | 2 | S · 2×2, **comet tail only** | Lots of water | The tail drifts over the seasons, so harvesters must follow it (moving is cheap) |

### Air

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Air Plant** | 1 | I · 2×2 | Water + power → air | Gives off hydrogen: version 2 turns it into fuel |
| **Forest Grove** | 1 | I · 1×1, soil | Air with no power, slowly; counts as a park | Lanternfall's forest, kept for its air |
| **Gas Scoop** | 2 | A · 2×2, **atmosphere only** | Air and nitrogen (nitrogen: farms in range +10%) | Sits on the raiders' climb lane from Earth |
| **Bulkhead Seal** | 1 | wall · 1 tile | Patches one breach | Several per chamber; a damaged seal leaks air |

### Food

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Farm Field** | 1 | I · 2×2, soil | Food × soil (fertile 1.8, plain 1.1, poor 0.55); +25% beside a river (Lanternfall) | **Mode**: grain / cash crop (credits, less food) / fallow (restores poor soil to plain) |
| **Hydroponics Bay** | 1 | I or deck · 1×1 | Steady food from power and water; ignores soil | Dull and reliable, the fallback |
| **Orchard Terrace** | 2 | I · 2×2, hills | Food and a little credits; luxury food (+happiness) | Lanternfall's orchard |
| **Fishery** | 2 | I · 1×1, river or lake | Food | More on a fish stock artifact |
| **Canteen** | 2 | I · 1×1 | Food quality → happiness in range | **Mode**: rationing (−20% food used, −happiness) |
| **Seed Vault** | 2 | I · 1×1, on the artifact | Turns one poor tile in range to plain each season | Only where a vault is found |
| **Mushroom Wall** | 3 | I · 1×1 | Food from habitat waste, no water | Loop closer |

### Mining and industry

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Ore Mine** | 1 | S · 2×2, **asteroid only** | Ore (version 1 sells it; version 2 refines it) | ×2 on an ore seam; seams deplete, research slows that until they last (Dyson Sphere Program) |
| **Salvage Yard** | 1 | I or S · 2×2 | Turns rubble and wrecks in range into parts | **Mode**: careful (slow, double value) / fast (Hardspace: Shipbreaker) |
| **Meteoroid Sweeper** | 2 | S · 1×1, **meteoroid field** | A little ore and ice | Meteor strikes damage it now and then |
| **Smelter** | 2 | I · 2×2 | Ore → alloy | |
| **Fabricator** | 2 | I · 2×2 | Alloy → parts | **Module**: +capacity, or precision (machine parts for the Arsenal) |
| **Tailings Dump** | 2 | S · 2×2 | Needed once you run more than four mines | Fills up and spoils nearby output; empty it (project) before removing it |
| **Gravity Foundry** | 4 | S · 3×3, **gravity flux only** | Ore → alloy at double rate | Earth Light's gravity flux, put to work |

### Homes and people

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Habitat** | 1 | I · 1×1 | Housing that **evolves**: shelter 20 → quarters 40 → apartments 70 as needs are met | Its panel lists what the next level needs (Caesar III) |
| **Terrace Homes** | 3 | I · 2×2, hills | Low density, high happiness | Trades space for contentment |
| **Wanderers' Lodge** | 3 | I · 2×2 | Wanderers stay here (§13.3) | Levels: more arrivals |
| **Officers' Quarters** | 3 | I · 1×1 | Raises how many commanders you can keep | |
| **Arcology** | 5 | I · 3×3 | 500 people with part of their services built in | A megastructure (see the end of this section) |

### Services (coverage)

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Clinic → Medical Centre → Hospital** | 2 | I · 1×1 → 2×2 | Health in range; natural growth needs it | **Mode**: triage (cheaper, lower quality) |
| **Safety Post** | 2 | I · 1×1 | Security **and** breach response in one (Caesar III's prefecture) | Fewer buildings, two services |
| **Research Lab** | 2 | I · 2×2 | Research points | +50% on a Galt data core |
| **School → Academy** | 3 | I · 2×2 | Workers → technicians → scientists | |

### Leisure (happiness ceilings)

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Park** | 1 | I · 1×1 | Raises the happiness ceiling in range; uses water | +more on a memorial grove |
| **Observation Deck** | 2 | H · 2×2, facing Earth | Happiness: the view of home | Only on the hull above the atmosphere band |
| **Arena** | 4 | I · 3×3 | Big entertainment | **Mode**: machine exhibition, which displays one guardian machine: +happiness, but that machine sits out raids |
| **Broadcast Tower** | 4 | I · 1×1 | Colony-wide; cuts fear after raids | **Mode**: news / morale (more happiness, lower wanderer loyalty) |

### Defence (version 3)

| Building | Ver | Where · size | What it does | Twist |
|---|---|---|---|---|
| **Sensor Mast** | 3 | H or S · 1×1 | Raid warnings come earlier | Levels: more warning days |
| **Battery Emplacement** | 3 | H · 1×1 | A Dragon or Hydra battery, as in Earth Light, for raids | +range on a turret railway |
| **Shield Pylon** | 3 | I or H · 1×1 | Protects buildings in range during raids | |
| **Jammer Array** | 3 | S · 1×1 | Lowers heat | |
| **Guardian Barracks** | 3 | I · 2×2 | Crews for the machines | One per few machines |
| **Arsenal** | 3 | I · 3×3 | Parts → supply; builds machines (the expansion's list) | |
| **Scrapyard** | 3 | I · 2×2 | Sells machines for credits and alloy | The fleet the General sold went through one |

### Patents (version 4): rule changes, bought once

Research plus credits, one-off, each edits one rule for the whole colony: **Closed Loop**
(reclaimers +20%), **Silent Running** (heat −30%), **Soil Bank** (farms never wear the soil),
**Union Charter** (tax tolerance +5), **Perpetual Grid** (all power use −20%), **Galt Doctrine**
(machine upkeep −25%). Six to start; more later.

### Landmarks (version 4): a milestone and a behaviour

| Landmark | Gate | Gives |
|---|---|---|
| **Governor's Garden** | 500 colonists **and** happiness ≥ 70 for 30 days | Happiness ceiling +10 colony-wide |
| **Ruess's Workshop** | 10 chambers open **and** no breach reopened for 60 days | Repairs −30% |
| **Sato's Watch** | 5 raids repelled **and** no tribute ever paid | Raid warnings +5 days |
| **Moraine's Bazaar** | You dealt with Moraine **and** traded 10 000 credits with the cartel | Unique cartel goods in the market |
| **Hall of Names** | Survived a raid that destroyed 5+ buildings | Fear decays twice as fast (a reward for surviving a disaster) |
| **The Lantern** | Every chamber open | A light Earth can see: relief contracts pay +25% (and the title's promise kept) |

### Megastructures (version 5): chained, and none deletes a system

| Megastructure | Needs | Gives |
|---|---|---|
| **Arcology** | Governor's Garden + Ruess's Workshop | 500 homes on 3×3 |
| **Orbital Elevator** | Ruess's Workshop + The Lantern | Relief contracts at a fraction of the cost; Earth trade opens |
| **Eden Restored** | Governor's Garden + Hall of Names + The Lantern | Air use −30% colony-wide (cheaper, never free); the ending |

That is **54 buildings, 6 patents, 6 landmarks and 3 megastructures**, with **18 in version 1** (the Road added later)
(version 2: 18, version 3: 13, version 4: 4, version 5: 1).
More come with each map expansion.

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

## 16. Build plan: start simple, add the advanced parts later (owner)

Each version is a complete, playable game, and ends with a commit. Version 1 is deliberately small.

### Version 1: Landfall (the first playable game)

**Built 2026-11-03** (`colony.html`): map generator, simulation, 3D view, interface and the first
36 xAI images; 123 simulation checks and 20 map seeds pass. Playable in the browser without a ROM.

* **Map**: the full starter map, but only the landing chamber and its dock open. Interior
  terrains: plain and fertile soil, river, rubble, breached deck. Space: void, asteroid field,
  magnetic field, atmosphere band and Earth.
* **17 buildings**: Command Centre, Dock, Repair Yard, Storage Depot, Solar Array, Induction
  Collector, Battery Bank, River Pump, Air Plant, Forest Grove, Bulkhead Seal, Farm Field,
  Hydroponics Bay, Ore Mine, Salvage Yard, Habitat, Park.
* **6 resources**: power, water, air, food, parts, credits. Ore is sold directly.
* **People**: one class; housing, immigration, the happiness list (needs and tax only).
* **Growth**: survey, seal and pressurise chambers; claim space sectors near the dock.
* **Time**: live days with pause and speeds; events pause the clock.
* **View**: the 3D rotatable map with procedural art (every art slot falls back to drawing).
* **No** raids, commanders, research or industry chain yet.
* Files: `colony.html`, `js/colony/{state,sim,map,chambers,buildings,population}.js`,
  `js/colony/view3d/`, `js/colony/data/{buildings,terrain,map}.json`, `js/vendor/three/`,
  `tests/colony-sim.mjs`.

### Version 2: Reclamation
More terrains (forest, hills, lake, marsh, comet tail, plasma, meteoroid field), the industry
chain (smelter, fabricator, tailings), services (clinic, safety post, lab), the tech tree and
upgrade points, clusters, the market with its buyers (§8.1), and edicts.

### Version 3: Guardians
Machines from the expansion with upkeep, the Arsenal and Scrapyard, defences, heat and the raid
clock, **auto-resolved raids** and tribute, **commanders and wanderers**, worker classes and
schools, and the **beta save import** (the fleet arrives).

### Version 4: Society
Entertainment, patents, landmarks, Moraine's branch, the mass driver and relief convoys,
gravity flux, commanding a raid on the expansion hex map (ROM needed for that only).

### Version 5: Reconstruction
Megastructures, the endgame and endings, the full story and comms, a balance pass with the model
script and 500-day headless runs, and the art slots filled by xAI.

### Later
Map expansions: more space, drifting wrecks and colony fragments, a second colony, new terrains,
artifacts and events (owner: "later we can expand the map and add elements to make it even more
fun").

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
Full research reports: `docs/colony-research/` (SimCity buildings, space colony buildings, mining and markets, commanders).
Lanternfall: `shamlokto/gemfire_remake`, `docs/LAND.md`, `js/land/land.js`, `js/data/vassals.js`.
