# Earthlight Space Colony Rebuild: version 7, zoning and growth

The owner's request (2026-11-06): "new tech and buildings, I like growable buildings like towers and living quads, like SimCity."

Version 7 adds SimCity-style zoning. The player zones cheap 2×2 lots, called **quads**, and they develop by themselves:
- **Living Quads** for homes;
- **Market Quads** for shops;
- **Workshop Quads** for industry.

Quads use the Habitat's existing level mechanism, extended rather than duplicated. A quad grows a level when its conditions have held for some days, and falls back when they fail. **RCI demand** decides when growth is wanted. Four supporting buildings and six techs open the upper levels.

The early game stays simple:
- all three quads are on the menu from day 1, with no research;
- the first levels need little more than demand;
- Habitats and Tower Blocks work exactly as before.

## 1. The quads (js/colony/data/buildings.js, `ver: 7`, `quad: 'R' | 'C' | 'I'`)

Every quad is 2×2 and stands on any deck: on plating, soil, rock, conduit and hills. It is placed as an **empty lot**, which is its level 1:
- a Living Quad costs 120 credits and 5 parts;
- a Market or Workshop Quad costs 150 credits and 10 parts;
- each takes 2 days to build, and the lot's upkeep is 1 a day.

Each level's fields override the table's through `rules.spec`. Upkeep now comes from `spec(b).upkeep`, so it follows the level. No older building defines upkeep per level, so nothing else changes.

### The five levels of each quad

**Living Quad**

| Level | Name | Homes | Power | Upkeep | To grow into it |
|---|---|---|---|---|---|
| 1 | Zoned lot | 0 | 0 | 1 | |
| 2 | Cottages | 40 | −2 | 2 | residential demand |
| 3 | Row Houses | 100 | −4 | 3 | + every need met, a park, no workshop noise |
| 4 | Courtyard Flats | 220 | −8 | 5 | + shops in reach, happiness 55 |
| 5 | Mid-rise | 400 | −14 | 8 | + a Clinic, a School, happiness 60, **Urban Planning** |
| 6 | Residential Tower | 700 | −24 | 12 | + transit in reach, happiness 65, **Skyscrapers** |

**Market Quad**

| Level | Name | Jobs | Credits a day | Shoppers | Shopping (range) | To grow into it |
|---|---|---|---|---|---|---|
| 1 | Market lot | 0 | 0 | 0 | | |
| 2 | Stalls | 6 | 15 | 150 | +2 (8) | commercial demand, homes for 40 within 12 tiles |
| 3 | Shops | 15 | 40 | 400 | +3 (9) | homes for 150, every need met |
| 4 | Market Hall | 30 | 90 | 900 | +4 (10) | homes for 400, happiness 55, **Commerce** |
| 5 | Arcade | 55 | 180 | 1,800 | +5 (12) | homes for 900, happiness 60, **Urban Planning** |
| 6 | Trade Tower | 100 | 360 | 3,500 | +6 (14) | homes for 1,800, transit, happiness 65, **Skyscrapers** |

Power at levels 2–6 is −2, −4, −8, −14 and −24. Upkeep is 1, 2, 4, 7 and 12. Commerce raises the credits by a fifth (a tech `output` effect).

**Workshop Quad**

| Level | Name | Jobs | Makes a day | Noise | To grow into it |
|---|---|---|---|---|---|
| 1 | Industrial lot | 0 | | | |
| 2 | Workshops | 10 | 3 parts | 2 | industrial demand |
| 3 | Machine Shops | 24 | 7 parts | 3 | + every need met |
| 4 | Works | 45 | 12 parts, 2 alloy | 4 | + **Light Industry** |
| 5 | Assembly Plant | 80 | 20 parts, 5 alloy | 5 | + a Freight Yard in reach, **Urban Planning** |
| 6 | Factory | 140 | 35 parts, 10 alloy | 6 | + **Automation** |

Power at levels 2–6 is −3, −6, −12, −22 and −40. Upkeep is 1, 2, 4, 7 and 12.

**Noise.** A Living Quad cannot hold Row Houses or more while a working Workshop Quad is closer than its noise. The noise is the gap in tiles between the two footprints. So Workshops need a 2-tile gap and a Factory a 6-tile gap. The inspector names the culprit, for example "No workshop noise: a Workshops is 1 tile away (it carries 2)".

### Growth (sim.js step 8)

- **Counting days.** A quad counts a day for each day all of its next level's conditions are met. At **4 days** it grows. In range of a Transit Station or Monorail Stop it grows at **2 days**. That range applies to Habitats and Tower Blocks too.
- **Shrinking.** If a condition of its *current* level fails, it counts down instead. After **10 days** it falls back a level (`SIM.shrinkDays`, as for Habitats).
- **Conditions that only gate growth.** Demand, happiness and research never push a quad back; they are flagged `grow: true`. Every other condition must hold: needs met, park, Clinic, School, shops, transit, Freight Yard, quiet, and residents nearby.
- **Growth spends demand.** Each quad that grows uses up its zone's demand by what it adds: homes for R, shoppers for C, jobs for I. If today's demand is already spent, a ready quad waits a day with its count full. So a town fills in a few lots at a time, not all at once.
- **Messages.** Growth is reported in one line a day, for example "Zoning: Living Quad → Cottages, Market Quad → Stalls."
- **Homes and services.** Living Quads count as homes for services, Clinic births and the life-support power circuit. An empty lot (0 homes) is left out of service averages.

### The need words (rules.habitatNeeds; data comment in buildings.js)

The old words are unchanged: `allNeeds`, `park` and `clinic`. Version 7 adds:
- `school`, `transit` (a Transit Station or Monorail Stop), `freight` (a Freight Yard), `shops` (a Market Quad at Stalls or above) and `quiet`;
- `demand:R|C|I`, `happy:N`, `residents:N` (homes within 12 tiles) and `tech:<key>`.
- Version 8 adds `value:N`: the quad's land value (the mean over its footprint, `js/colony/landvalue.js`) is at least N. It only gates growth. `rules.QUAD_VALUE` adds it to Living and Market Quads' levels 5 and 6 (45 and 55) without touching the data table. See docs/COLONY-V8.md.

`habitatLevelReachable` accepts all of these. A level waiting on a tech is offered, and its panel says "Research Skyscrapers".

## 2. RCI demand (rules.demandOf)

Each zone's demand is counted in units: homes for R, shoppers for C, jobs for I. Each also has a bar value from −1 to 1, which is the units ÷ max(40, 10% of the colonists).

| Zone | Units |
|---|---|
| **R** | (20 + 1 per 100 colonists) × (1 + ½ per working Arrivals Hall, up to 3), which is the next transport's likely size, + free jobs − free homes |
| **C** | colonists − the shoppers all Market Quads serve |
| **I** | colonists without work + a pull for parts: 40 × (½ − the parts store's fill), so +20 when it is empty and −20 when it is full |

How it plays:
- **A new colony.** 40 colonists and homes for 60: R is 0, because the free homes take the next transport. C is +40 and I is about +17.
- **After the first transport.** R turns positive and the first Cottages go up.
- **Unemployment.** It does not lower R. It only raises I, and costs −5 happiness, as before.

**The interface:**
- **Demand bars.** Three small bars (R green, C blue, I gold) sit in the build menu's header, above the category tabs, and are visible on every tab. A bar rises above its centre line for demand and sinks red below it for a surplus.
- **Bar tooltips.** Each tooltip gives the parts of its sum, for example "Residential demand +38: about 20 arriving on the next transport, 0 free jobs, −18 free homes."
- **Card order.** The quads lead the Homes & parks tab. Each card reads "2×2 · lot, grows to 700 homes".

## 3. Supporting buildings (4) and techs (6)

| Building | Size, decks | Cost, days | Does | Tech |
|---|---|---|---|---|
| School | 2×2, all | 500 cr 30 p, 5 d | 8 jobs, 2 research a day, happiness 3 within 10 tiles; Living Quads in range can grow into Mid-rises | Schools |
| Transit Station | 2×2, all | 900 / 60, 6 d | 10 jobs, happiness 2 within 10; anything that grows in range does so in 2 days; quads in range can reach their top level | Urban Planning |
| Monorail Stop | 1×1, all (hills too) | 800 / 60, 5 d | a Transit Station on one tile, range 16 | Skyscrapers |
| Freight Yard | 2×2, all | 600 / 40, 5 d | 8 jobs, stores 300 parts and 200 alloy; Workshop Quads in range make a quarter more and can grow into Assembly Plants and Factories | Light Industry |

Shopping, School, Transit and Monorail are new service kinds (`SERVICE_KINDS`), so they appear in the happiness breakdown.

| Tech (`ver: 7`) | Branch, cost | Needs | Unlocks / does |
|---|---|---|---|
| Schools | society, 90 | | School |
| Commerce | society, 100 | | Market Halls; Market Quads earn ×1.2 |
| Light Industry | industry, 110 | Smelting | Works; Freight Yard |
| Urban Planning | society, 200 | Schools, Commerce | level 4 of every quad; Transit Station |
| Skyscrapers | society, 380 | Urban Planning, High-rise Homes | Residential and Trade Towers; Monorail Stop |
| Automation | industry, 300 | Light Industry, Urban Planning, Fabrication | Factories; Fabricators ×1.2 |

## 4. Balance: a quad town against a Habitat town (tests/colony-quads.mjs)

**The setup.** Both towns start from the same generous mid-game state:
- 300 colonists, Easy, seed 1;
- every chamber open and every tech known;
- credits topped up and raids off.

Each town runs the real `dayTick` for 240 days, and each player builds producers when a need runs short.

**The two players:**
- The **quad player** keeps two empty lots of each zone that has demand. It adds parks, Clinics, Schools, Transit and Canteens where its quads ask for them.
- The **Habitat player** places Habitats, then Tower Blocks, ahead of the population, each with a park and a Clinic.

| Town | Colonists | Homes | Jobs | Happiness | Credits on homes and lots | Buildings |
|---|---|---|---|---|---|---|
| Quads | 1,546 | 1,560 | 1,482 | 100 | 3,168 | 93 |
| Habitats | 1,465 | 1,940 | 189 | 87 | 1,680 | 65 |

**What the run shows:**
- **Population.** Growth is limited by transports and births in both towns, so they end within 6% of each other. Quads are an alternative, not a shortcut to more people.
- **Jobs and happiness.** A quad town has far more jobs, so no unemployment penalty, and more happiness from shopping. That comes from many more buildings and services, and growth is gated by demand and conditions.
- **Homes ahead of need.** A Habitat player can place homes ahead of need at once. Quads only grow toward demand. That makes them slower to absorb a big transport, and their upper levels wait on research.
- **Economy.** Per worker, quads produce modestly: Workshops make 0.25–0.3 parts a job, against a Fabricator's 3.75. Market Quads earn about 2.5–3.6 credits a job. They are job sinks and a steady income, not a money machine.
- **Runtime.** The run takes about 0.7 s.

## 5. Interface, art, help

**Inspector:**
- A quad's panel shows its level name, homes or jobs, shoppers served and noise.
- It shows its zone's demand, and "Growing: 2 days so far" or "Declining: 3 of 10 days".
- It lists **To grow into Courtyard Flats** with ✓ or ✗ for each condition. Examples: "Happiness 55 (now 41)", "Homes for 150 within 12 tiles (now 80)", "Research Urban Planning", "Residential demand (+38)".

**Help.** How to play has a new section, **Zoning and growth** (`help-zoning`), after Homes & happiness.

**Advisor.** The "Every home is full" advice now also suggests zoning Living Quads.

**3D kits** (js/colony/view3d/kits.js, `quadKit`). Every level is different and the kits get taller level by level:

| Level | Living | Market | Workshop |
|---|---|---|---|
| 1, the lot | corner stakes, a dashed outline and a zoning sign (all quads) | | |
| 2 | four cottages with red and slate roofs | six striped stalls | two sawtooth sheds and crates |
| 3 | two terraced rows | a row of shopfronts with awnings and lit signs | a machine hall with a chimney and a crane |
| 4 | a courtyard ring with a fountain | a glass barrel-roofed market hall | the works, with two hot stacks and tanks |
| 5 | two slabs with balconies on a podium | twin blocks under a glowing glass roof | an assembly plant with three stacks |
| 6 | a stepped tower with a beacon (5.1 tiles tall) | a blue glass Trade Tower with a gold crown (5.6) | a factory with four stacks and a cooling tower (3.1) |

The supporting buildings also have kits: a schoolhouse with a cupola and a playing field; a tram stop with a glass canopy and a tram; a monorail pylon with a station pod; a container yard with a gantry crane.

**Art.** There are card slots in `js/colony/art.js` with prompts `tools/art/colony/prompts/card-<key>.txt` for livingquad, marketquad, workshopquad, school, transit, monorail and freightyard (7 cards). **No images were generated**: the cards fall back to their drawn icons until the xAI run.

## 6. Tests and saves

- **`tests/colony-quads.mjs`** (78 checks):
  - data, kits, art slots and help;
  - each RCI demand term;
  - growth up and down, with the noise, park and demand-only rules;
  - demand spent as quads grow;
  - Market and Workshop Quads: credits, shopping, parts, the Freight Yard bonus and upkeep by level;
  - the tech ladder, the School and transit growth;
  - save and load, and an old save getting the quads;
  - the balance run.
- **Updated counts:**
  - `tests/colony-sim.mjs`: 73 buildings on the menu, 66 + 7 with `ver: 7`;
  - `tests/colony-v2.mjs`: 46 techs, and 4 more tech-locked buildings.
- **Saves.** Nothing new is stored. A quad's `level` and `grow` save like a Habitat's. An older save gets the quads on its menu, through `upgradeState`'s "deck buildings with no tech are open" rule.
