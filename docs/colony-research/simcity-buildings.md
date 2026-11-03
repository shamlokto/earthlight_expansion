# Building Catalogue & Variety Design — SimCity Lineage and Classic City Builders

Scope: SC2000, SC3000, SC4+Rush Hour, SimCity (2013), Cities: Skylines 1 & 2, Caesar III, Pharaoh, Anno 1800, Tropico 6. Space games excluded (other agent).

**Source access note (flag):** `skylines.paradoxwikis.com` / `cs2.paradoxwikis.com`, Fandom, Simtropolis, StrategyWiki and archive.org all blocked this environment (JS client-challenge / 403 / 402). CS1 numbers below come from the **Chinese mirror of the official Skylines wiki** at `wiki.biligame.com/csl` (it states page-by-page "translated from official Wiki:<page>" and carries the identical stat tables) plus `guidestrats.com`. CS2 numbers come from a **community-compiled Steam guide** (not official). Where I could only reach a figure through a search-engine snippet of a blocked wiki, I say so. Anything I could not verify is marked **[unverified]**.

---

## 1. Building categories across the genre, with concrete mechanical effects

### 1a. Utilities (power / water / sewage / heat)
| Game | Building | Mechanics |
|---|---|---|
| CS1 | Wind Turbine | ₡6,000, ₡80/wk upkeep, **0–8 MW depending on local wind**, noise 75, **needs no road**, 7×7 ([mirror of CS wiki: Electricity](https://wiki.biligame.com/csl/%E7%94%B5%E5%8A%9B)) |
| CS1 | Coal Power Plant | ₡19,000, ₡560/wk, 40 MW, ground pollution 50, 6×5 |
| CS1 | Advanced Coal Plant | ₡35,000, ₡960/wk, 56 MW, pollution 10 — strictly a cleaner/denser tier |
| CS1 | Nuclear Power Plant | ₡200,000, ₡8,000/wk, 640 MW, 1,920 m³/wk water |
| CS1 | Solar Power Plant | ₡80,000, ₡1,200/wk, 160 MW, **70% output at night** |
| CS1 | Geothermal Power Station | ₡65,000, ₡1,040/wk, 80 MW — **placement-gated on hot springs** |
| CS1 | Fusion Power Plant (monument) | ₡1,000,000, ₡8,000/wk, **16,000 MW**; one of these replaces the entire grid, and can be run at 50% budget for 8,000 MW ([number13](https://en.number13.de/cities-skylines-all-8-monuments-and-their-requirements/)) |
| Caesar III | Reservoir / Aqueduct / Fountain / Well | 80 dn / 8 dn per segment / 15 dn (4 workers) / 5 dn. Well = "mildly desirable water", Fountain = "most desirable water"; **water tier gates housing evolution** ([C3 Heaven: Water](https://caesar3.heavengames.com/gameinfo/buildings/water)) |
| Pharaoh | Well / Water Supply | 5 db / 50 db + 5 workers; **must be placed on grassland** — a terrain-gated utility ([Pharaoh Heaven: Health & Sanitation](https://pharaoh.heavengames.com/buildings/health/)) |
| SC2000 | Power plants (12 types) | Coal/oil/gas/nuclear/wind/solar/microwave/fusion; **oil plant output cost fluctuates with petroleum price**, gas is clean but expensive "many cities save their gas plants for reserve power" ([SC2000 object definitions](https://patcoston.com/co/objdef.aspx)) |

### 1b. Garbage / sanitation
| Game | Building | Mechanics |
|---|---|---|
| CS1 | Landfill Site | ₡4,000, ₡160/wk, **capacity 8,000,000 units**, 15 trucks, ground pollution 100, 8×10; **can only be relocated or demolished once emptied** ([mirror: Garbage](https://wiki.biligame.com/csl/%E5%9E%83%E5%9C%BE%E5%A4%84%E7%90%86)) |
| CS1 | Incineration Plant | ₡30,000, ₡1,440/wk, 400,000 store, **48,000/wk throughput**, +12 MW, pollution 100 |
| CS1 | Recycling Center | ₡16,000, ₡240/wk, 200,000 store, 24,000/wk, pollution 25, **outputs raw materials for industry/export** |
| CS1 | Waste Processing Complex | ₡100,000, ₡5,400/wk, 10,000,000 store, 192,000/wk, +40 MW — **cannot collect from buildings directly**, only from landfills/transfer facilities |
| CS1 | Ultimate Recycling Plant (monument) | ₡750,000, ₡8,000/wk, 480,000/wk throughput, +60 MW, 100 trucks |
| Pharaoh | Mortuary | 100 db, 8 workers, desirability −, **needs linen deliveries to function** |

### 1c. Health
| Game | Building | Mechanics |
|---|---|---|
| CS1 | Medical Clinic | ₡10,000, ₡400/wk, **100 patients, 8 ambulances**, 4×4, unlock Little Hamlet |
| CS1 | Hospital | ₡65,000, ₡2,400/wk, **500 patients, 30 ambulances**, 10×8, unlock Busy Town; has a helipad |
| CS1 | High-Capacity Hospital (Plazas & Promenades) | ₡95,000, ₡4,000/wk, **800 patients, 40 ambulances**, 14×8 |
| CS1 | Medical Center (monument) | ₡650,000, ₡14,400/wk, **1,000 patients, 50 ambulances**, helipad; replaces all healthcare ([guidestrats](https://guidestrats.com/cities-skylines-medical-center/)) |
| CS1 | Child Health Center | ₡18,000, ₡500/wk, **raises birth rate in range**; sick children/teens have a **50% chance** to use it instead of a hospital; 50 visitors |
| CS1 | Eldercare | ₡22,000, ₡600/wk, **extends elderly lifespan in range**, same 50% diversion rule for seniors, 100 visitors |
| CS1 | Medical Laboratory (High-Tech CCP) | ₡42,000, ₡1,280/wk, **20 patients, no ambulances** — walk-in/helicopter only |
| CS1 | Sauna (Snowfall) / Community Pool (Green Cities) | ₡25,000/₡400 (60 visitors) and ₡75,000/₡1,200 (120 visitors) — **health-boosting amenities that treat no one** |
| CS1 | Cemetery / Crematorium | ₡8,000/₡160, 3,000 bodies, 10 hearses, **only removable when empty** / ₡25,000/₡720, 105 holding, 7 hearses (no capacity limit on throughput) |
| CS2 | Small Medical Clinic → Medical Clinic → Hospital | 30k/10–24.5k upkeep, 25 patients, 3 ambulances → 60k/20–78k, 100 patients, 5 ambulances → ~1.1–1.88m, 300–500 patients, 20–24 ambulances ([Steam: Service Buildings Cost, Upkeep, Footprint](https://steamcommunity.com/sharedfiles/filedetails/?id=3525176513)) |
| CS2 | Hospital modules | Extension Wing 225k/50k upkeep **+200 patients**; Research Center 225k/50k **+100 patients**; Helipad 200k/17.5k **+1 helicopter** |
| SC4 | Medical Clinic / Large Medical Center | §400 plop, 500 patients, §0.80 per-patient capacity cost / §1,100, 3,000 patients, §0.40 per patient (snippet of blocked [StrategyWiki: Health](https://strategywiki.org/wiki/SimCity_4/Health)) |
| SC4 | Disease Research Center (reward) | §26,000 plop, §180/mo, **60,000 patient capacity at §0.003/patient**, but **emits radiation**; requires 56,000 pop + mayor rating 45 + 3 hospitals ([SC4D Encyclopaedia](https://wiki.sc4devotion.com/index.php?title=Disease_Research_Center), via snippet — site blocked) |
| Caesar III | Barber 25 dn/2 workers; Bath-house 50 dn/10 workers (**needs reservoir pipes**); Doctor's Clinic 30 dn/5; Hospital 300 dn/30 | Hospital desirability is **slightly negative** — a service you want near but not adjacent ([C3 Heaven: Health](https://caesar3.heavengames.com/gameinfo/buildings/health)) |
| Pharaoh | Apothecary 30 db/5; Physician 50 db/8; Dentist 50 db/2 (**no health effect at all — pure culture/desirability**); Mortuary 100 db/8 | |
| Tropico 6 | Clinic → Hospital | Clinic $1,500 blueprint/$3,000 build, 2 workers, **service quality 60 (80 at max budget, 91 with upgrade), 12 visitors (16 upgraded)**; Hospital $3,900/$7,800, 4 workers, **SQ 80 (100 at max budget), 24 visitors (32 upgraded)**, requires visitors **well-off or better** unless the constitution says otherwise ([Steam: Tropico 6 Happiness Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3317408271)) |
| Anno 1800 | Hospital | Fights illness in its **road-propagated influence radius**; higher cost/upkeep than Fire Station but larger radius ([Anno Union DevBlog: City Incidents](https://www.anno-union.com/beware-incidents-are-coming/)) |

### 1d. Education
| Game | Building | Mechanics |
|---|---|---|
| CS1 | Elementary School | ₡10,000, ₡160/wk, **300 students**, 6×4 → **12.5 students/tile**, unlock Little Hamlet |
| CS1 | High School | ₡24,000, ₡560/wk, **1,000 students**, 6×5 → 33.3/tile, unlock Tiny Town |
| CS1 | University | ₡75,000, ₡1,920/wk, **4,500 students**, 14×8 → 40.2/tile, unlock Big Town |
| CS1 | High-Capacity variants (P&P) | Elementary ₡26,000/₡416, **800** students (28.6/tile); High School ₡58,000/₡928, **2,400** (53.3/tile); University ₡165,000/₡2,640, **10,000** (104.2/tile) — the tier axis is *density per tile*, not just raw capacity ([mirror: Education](https://wiki.biligame.com/csl/%E6%95%99%E8%82%B2)) |
| CS1 | Community School / Institute of Creative Arts / Modern Technology Institute (Green Cities) | Lower capacity, bigger footprint, **larger coverage radius**, lower water/power — explicitly "better for less dense areas" |
| CS1 | Public Library | ₡22,000, ₡400/wk, 100 users, **entertainment 100**, tiny chance a visitor's education level rises (chance shrinks as level rises); **5 libraries are a prerequisite for the Academic Library unique building** |
| CS1 | Hadron Collider (monument) | ₡800,000, ₡9,600/wk, noise 100, **provides 1,000,000 capacity at every education level — makes all schools redundant** (and breaks Campus DLC universities, which then can't get students) |
| CS2 | Small Elementary → Elementary | 40k/5k upkeep, **400 students**, 9×6 → 100k/12.5k, **1,000 students**, 18×8; Extension Wing 22.5k/5k **+500 students**; Gymnasium module 12k/2k gives **+1 attractiveness, +1% well-being within 200 m, +1 outdoor recreation** |
| CS2 | Small High School → High School | 150k/11.25k, 400 students → 300k/22.5k, 800 students; Extension Wing 130k/10k **+400**; Library module 85k/10k = *"students have better chances of graduating"*; High School Sports Park 25k/1.5k = **10 attractiveness, 3 well-being within 300 m, 10 outdoor rec** |
| CS2 | Technical University / Medical University (signature) | 1.6m/80k → **+10% industrial efficiency and +10% office efficiency city-wide**; Medical University 2.4m/120k → **−25% recovery failures and +10% hospital efficiency city-wide** |
| CS2 | Radio Telescope / Large Hadron Collider | 3.2m/160k → **+5% university graduation chance, +15% interest in university education city-wide**; LHC 4m/200k → **+15% interest in university education, +20% demand for software, +20% for electronics, +5% software and electronics production efficiency, all city-wide** |
| SC4 | Elementary School | §300 plop, **§400/mo max (building + coverage)**, **500 students**, 2×3, **education coverage radius 384 m (≈24 tiles)** ([SC4D Encyclopaedia: Elementary School](https://wiki.sc4devotion.com/index.php?title=Elementary_School), via snippet) |
| SC4 | Large Elementary School (Rush Hour) | §2,100 plop, **§2,000/mo max (§1,500 building + §500 coverage)**, **3,000 students**, **radius 680 m (≈42 tiles)** |
| SC4 | High School | §1,050 plop, **750 students** |
| SC2000 | School $250 / College $1,000 / Library $500 / Museum $1,000 | School raises EQ of ages 5–20; College ages 15–25 (plus older, less); Library and Museum raise EQ for all ages — in the N64/SNES lineage libraries & museums **stop EQ decay rather than raising it**, and **Museum is twice as effective as Library at twice the upkeep** ([SC2000 object definitions](https://patcoston.com/co/objdef.aspx); costs via snippet of blocked [List of SimCity 2000 buildings](https://simcity.fandom.com/wiki/List_of_SimCity_2000_buildings_and_icons)) |
| Caesar III | School 50 dn/10 workers; Library 75 dn/20; Academy 100 dn/30 | All three feed one **city-wide Culture rating**; School+Library (and later both together) **gate housing evolution** |
| Pharaoh | Scribal School 150 db/10 (**needs papyrus to function**); Library 450 db + **500 papyrus**, 30 workers | A building with a *goods* input, not just money |

### 1e. Safety (police / fire / prisons)
| Game | Building | Mechanics |
|---|---|---|
| CS1 | Police Station | ₡12,000, ₡480/wk, **jail 20, 10 patrol cars**, 4×3, unlock Worthy Village |
| CS1 | Police Kiosk (ROJ) | **₡1,000, ₡16/wk, jail 2, 0 cars, 1×1** — the micro-tier that fits anywhere |
| CS1 | Police Headquarters → Large Police HQ | ₡60,000/₡1,600, jail 60, 25 cars → ₡95,000/₡2,400, **jail 80, 40 cars** |
| CS1 | Prison | ₡120,000, ₡2,400/wk, **500 prisoners, 5 prison vans, noise 100**; without transfer to a prison a sentence is only one in-game week ([mirror: Police](https://wiki.biligame.com/csl/%E8%AD%A6%E5%AF%9F%E6%9C%8D%E5%8A%A1)) |
| CS1 | Banks (Financial Districts) | Small ₡12,000/₡192 (4 vans) → Large ₡30,000/₡480 (10) → Bank Skyscraper ₡60,000/₡960 (20); collect cash from commercial zones, **lowering commercial crime**; gated on **Stock Exchange level 2/3/4**, not population |
| CS1 | Fire House → Fire Station → Large Fire Station | ₡12,000/₡560 (6 engines) → ₡60,000/₡1,440 (25) → ₡95,000/₡1,920 (**40 engines**) ([mirror: Fire](https://wiki.biligame.com/csl/%E6%B6%88%E9%98%B2%E6%9C%8D%E5%8A%A1)) |
| CS1 | Fire Watch Tower | ₡9,000, ₡96/wk, 2×2, **36 m tall, needs no road**, detects forest fires early — a pure-information building |
| CS2 | Police Station → Police HQ → Central Intelligence Bureau | 160k/19k (jail 25, 6 cars, 18 staff) → **2.1m/155k (jail 100, 20 cars, 120 staff)** → **3.2m/180k, 34×34, −8% crime rate city-wide** |
| CS2 | Prison | 650k/100k, **jail 500, 10 prison vans, −5% crime rate within 800 m**; Prison Wing module 96k/40k **+50 capacity**; Prison Library & Rec Center 75k/60k = prisoner well-being |
| CS2 | Fire House → Fire Station | ~115–120k/4–20k, 1–3 engines → 450k–1.5m/10.5–60k, 4 engines + up to 120 staff; modules: Garage Extension 10k/2k **+2 engines**, Training Facility 200k/8.5k **+2 engines**, Firefighter's Dormitory 10k/11k = *"enhances response time"* |
| SC4 | Small / Large Police Station / City Jail | §250 build, §125/mo, **25 inmates** / §800, §250/mo, **50 inmates** / §2,500, §450/mo, **1,000 inmates**; Deluxe Police Station (Rush Hour) §1,200, §300/mo, 3×4, **6 cars, 1 helicopter, 75 cells** ([SC4D: Deluxe Police Station](https://wiki.sc4devotion.com/index.php?title=Deluxe_Police_Station) + [StrategyWiki: Crime and Policing](https://strategywiki.org/wiki/SimCity_4/Crime_and_Policing), both via snippet). Arrests only happen where **police protection value > 20**, roughly the inner 80% of the radius. **Jail overflow causes prison breaks.** |
| SC4 | Fire stations | **All in-game fire stations have a dispatch radius of 128 m (8 tiles)** — the distance a truck will travel, separate from the coverage aura |
| SC2000 | Police Department / Fire Station | **$500 build, $100/yr at 100% funding**; 100% funding = **200 officers per station**; stations suppress crime only within a **20-block radius**; practical rule ≈ **1 station per 5,000 Sims for low crime, 1 per 7,500 for average** ([Inside SimCity 2000: Police Stations](https://patcoston.com/co/inside1.aspx)) |
| SC2000 | Police / Fire HQ | Requires 10 departments of that type; stronger coverage in the immediate area at **$100/yr — i.e. 1/5 the running cost** of the equivalent stations ([SC2000 advice](https://patcoston.com/co/advice.aspx)) |
| SC2000 | Prison | $3,000; **improves police performance only if crime is already high** |
| SimCity 2013 | Fire Station | $15,000, **$200/hour**, 1 fire truck, **up to 4 extra fire-truck bays as modules** (snippet of blocked [GameRevolution Fire Dept guide](https://www.gamerevolution.com/guides/59385-simcity-2013-city-buildings-fire-department-reference-guide)) |
| SimCity 2013 | Police Station → Police Precinct | Station 10 jail cells, 2 patrol cars; Precinct adds cells, cars and **advanced crime-fighting modules**; the **City Hall Department of Safety** unlocks the advanced medical/police/fire buildings |
| Caesar III | **Prefecture** | **30 dn, 6 workers — police AND firefighting in one building**, desirability slightly negative ([C3 Heaven: Security](https://caesar3.heavengames.com/gameinfo/buildings/security)) |
| Pharaoh | Firehouse 30 db/6; Police Station 30 db/6; **Architect's Post 30 db/5** (prevents collapse) | Three cheap, identical-cost, identical-footprint "risk suppressors", each against a different hazard ([Pharaoh Heaven: Municipal](https://pharaoh.heavengames.com/buildings/municipal/)) |
| Anno 1800 | Fire Station / Police Station | Fire Station **500 credits + 4 timber, −25/min upkeep, 3×5**; Police Station **2,500 credits + 8 timber + 10 bricks, −50 upkeep**; both act only inside a **road-propagated influence area**, and a fire station **takes one minute after placement to become operational** ([Anno wiki: Emergency services](https://anno1800.fandom.com/wiki/Emergency_services), via snippet; costs corroborated by [gamepressure: All buildings](https://www.gamepressure.com/anno-1800/list-of-buildings/z1b4fe)) |
| Tropico 6 | Police Station / Prison | Crime safety is **coverage-based** — cover the island with stations and keep enough prison capacity for inmates. Church/Chapel give **+20 crime safety under a Theocracy**; Cathedral gives **+35 (+15 with the upgrade alone)**; Security Checkpoint **+5** |

### 1f. Parks, recreation, leisure
| Game | Building | Mechanics |
|---|---|---|
| CS1 | Small Park | ₡1,000, ₡8/wk, **entertainment 100, radius 400 m, 75 visitors**, 9×8 |
| CS1 | Botanical Garden | ₡15,000, ₡240/wk, **entertainment 150, radius 500 m, 225 visitors** |
| CS1 | Dog Park / Carousel Park / Bouncy Castle Park | ₡3,000–4,000, ₡40–64/wk, entertainment 125–150, radius 400 m, 150 visitors — deliberately interchangeable cosmetic variants at the same stat point |
| CS1 | Fishing Island / Floating Cafe | ₡8,000/₡128 and ₡22,000/₡352; **must be built on water; the entertainment radius is measured from the 4×6 land portion** — radius 150 m / 200 m only, i.e. terrain-gated and weaker ([mirror: Parks and Plazas](https://wiki.biligame.com/csl/%E5%85%AC%E5%9B%AD%E5%92%8C%E5%B9%BF%E5%9C%BA)) |
| CS1 | Plazas (Plazas & Promenades) | Each states an explicit **land-value bonus per cell of pedestrian area**: Flower Plaza ₡2,500/₡40 → **300₡/cell**; Large Fountain Plaza ₡3,000/₡48 → **380₡/cell**; Large Glass Roof Plaza ₡5,000/₡80 → **450₡/cell** |
| CS1 | Park areas (Parklife) | Paintable districts that **level 1→5** on visitor numbers; higher level = more happiness and income; park gates, paths and maintenance buildings feed the level |
| CS2 | Parks | Give flat **attractiveness**, **well-being % within a stated radius (200/300/500 m / 1 km)** and **indoor/outdoor recreation points** — all three are separate currencies |
| Caesar III | Gardens 12 dn, Plaza 15 dn | Zero workers, zero upkeep, **"everyone wants a garden next door"**; Plaza is laid *on top of* existing road |
| Pharaoh | Garden 12, Plaza 15, Statue small/medium/large 12/60/150 | A **pure desirability ladder** at +/++/+++ with no staff and no upkeep |
| Tropico 6 | 26 entertainment buildings | Each has Service Quality / Max-Budget SQ / +Upgrade SQ / +Workmode SQ and Max Visitors, e.g. one tier reads **SQ 80, MB 100, +U 105, 60 visitors**, another **SQ 95, MB 119, +W 129, only 8 visitors** — i.e. *broad-but-mediocre* vs *narrow-but-superb* |
| Anno 1800 | Pub 500 credits + 10 timber, −20 upkeep, 4×6 | Satisfies the Workers' luxury need inside its road range |

### 1g. Civic / administration
| Game | Building | Mechanics |
|---|---|---|
| CS2 | City Hall | 1.6m/80k; **upgrade slots are the policy system**: Urban Planning Office 160k/10k = **−5% building level-up cost city-wide**; Municipal Court 160k/10k = **−5% crime rate city-wide**; base hall = **−1% loan interest, −2% import costs city-wide**; variants go to −2% loan interest, −5% import costs, **+5% export profits** |
| CS2 | Welfare Office / Citizens Service Center | 110k/22.5k, 15×16, "increases well-being in area" / 90k/35k |
| CS1 | City Hall (unique landmark) | ₡20,000, ₡320/wk, entertainment 50, noise 10, 150 visitors; **unlocked by 3,000 weekly public-transport passengers** ([guidestrats](https://guidestrats.com/cities-skylines-city-hall/)) |
| Caesar III | Forum 75 dn/6 workers; Senate 400 dn/30 | Forums **employ the tax collectors** — your tax revenue is a *coverage* problem, not a slider. Senate also stores the treasury |
| Pharaoh | Village/Town/City Palace 900/1,000/1,200 db; Tax Collector 75 db/6; Courthouse 150 db/10 | **Tax Collector does not function until a palace exists**; Courthouse and Palace **physically store part of the treasury and can be robbed by thieves** |
| Pharaoh | Mansion, Personal/Family/Dynasty 150/400/700 db | **Stores your personal savings**, desirability ++/+++/++++, must be partly on grassland |

### 1h. Religion / faith (Caesar/Pharaoh/Tropico)
| Game | Building | Mechanics |
|---|---|---|
| Pharaoh | Shrine 100 db (no workers); Temple 150 db/8; **Temple Complex 2,000 db/50 workers, desirability ++++**, plus **Altars/Oracles to minor gods at 900 db each**; Festival Square 500 db, **must sit on a crossroads, required to hold festivals** ([Pharaoh Heaven: Religion](https://pharaoh.heavengames.com/buildings/religion/)) |
| Tropico 6 | Chapel → Church → Cathedral | **SQ 45 / max-budget 56, 8 visitors (Colonial)** → **SQ 60 / 75, 18 visitors (World Wars)** → **SQ 80 / 100, 32 visitors (Cold War)**; faith also drives **birth rate and immigration rate** |
| Caesar III | — | Gods are satisfied by temples; housing evolution needs "1 god", then "2 gods" |

### 1i. Transport (brief — adjacent to the brief)
- CS1 Bus/metro/tram/monorail/ferry/blimp/cable car, each with depot + stop + line costs; **Transport Tower unique building unlocks at 1,000 weekly passengers**.
- Caesar III Low Bridge 40 dn/tile vs **Ship Bridge 100 dn/tile (lets ships pass underneath)**; Dock 100 dn/12 workers but **stores nothing — needs an adjacent warehouse**.
- Pharaoh **Ferry Landing 40 db/5 workers, must be placed in pairs on opposite banks; with no employees only immigrants and emigrants can cross**.
- CS2 Airport 750k/50k, 5 gates, **+5% attractiveness and +3% office efficiency city-wide**; International Airport 4m/200k, 18 gates, **+10% attractiveness, +10% interest in university education, +10% software demand, city-wide**.

### 1j. Industry / agriculture
- **Anno 1800** is the richest here: every chain building is cheap (100–500 credits + planks) but has a **named goods input/output and a worker-class demand**: Timber Yard 100$/10 upkeep/**5 farmers**; Sawmill 100$/10/**10 farmers**; Potato Farm 100$/10/10 farmers → Schnapps Distillery 100$/**30 upkeep/40 farmers**; Grain Farm → Flour Mill (50$/10 workers) → Bakery (**60$ upkeep/100 workers**); Iron Mine (50$/50 workers) + Charcoal Kiln (**attractiveness −25, the first polluting building**) → Furnace (**attractiveness −15**) → Steelworks; Hop Farm → Malthouse (150$ upkeep) → Brewery (**200$ upkeep/75 workers**). Note **"building houses around the Timber Yard decreases its productivity"** — a spatial anti-synergy ([gamepressure](https://www.gamepressure.com/anno-1800/list-of-buildings/z1b4fe)).
- **CS1 Industry DLC**: four paintable industry area types (farm, forestry, ore, oil) built from **ploppable** extraction/processing buildings that level the area up, plus **nine unique factories**.
- **CS1 Farming/Forestry** specialisation districts require the right **natural resource layer** under them.
- **SC4** agriculture is a separate zone type that **grows regardless of high land value** so long as agricultural demand exists ([Wikipedia: SimCity 4](https://en.wikipedia.org/wiki/SimCity_4)).

### 1k. Reward / unique / landmark buildings (the densest design space — see §2)
Full CS1 unique-building table (cost / upkeep / tourism / attractiveness / entertainment / noise / footprint / unlock) is on the mirror at [Unique Buildings](https://wiki.biligame.com/csl/%E7%8B%AC%E7%89%B9%E5%BB%BA%E7%AD%91) and [Monuments](https://wiki.biligame.com/csl/%E5%A5%87%E8%A7%82). Highlights:

| CS1 unique building | Lvl | Cost / upkeep | Unlock condition |
|---|---|---|---|
| Statue of Industry | 1 | ₡20,000 / ₡320 | Zone and fill 10,000 squares of industry |
| Statue of Shopping | 1 | ₡10,000 / ₡16 | **Have a bank balance of −₡1** |
| Lazaret Plaza | 1 | ₡17,500 / ₡192 | **Average citizen health below 20% for 3 weeks** |
| Plaza of the Dead | 1 | ₡17,500 / ₡80 | **Fill 3 cemeteries** |
| Meteorite Park | 1 | ₡10,000 / ₡16 | **Experience a meteor strike** |
| Posh Mall | 2 | ₡45,000 / ₡960 | **All taxes under 4% for 20 weeks** |
| Mall of Moderation | 2 | ₡19,900 / ₡320 | **Average 25+ units of garbage piled per building** |
| Disaster Memorial | 2 | ₡22,000 / ₡320 | **Experience all 7 disaster types** |
| Court House | 3 | ₡55,000 / ₡960 | **Crime rate over 50% for 5 weeks** |
| Colossal Order Offices | 3 | ₡70,000 / ₡1,200 | **Education spending over ₡20,000/wk for 10 weeks** |
| Tax Office | 3 | ₡18,000 / ₡320 | **Produce 1,000 MW** (+ build a water treatment plant) |
| Grand Library | 4 | ₡90,000 / ₡1,360 | **Have 7 universities for 10 weeks** |
| Observatory | 4 | ₡85,000 / ₡1,600 | **Have 1,000 abandoned buildings for 5 weeks** |
| Oppression Office | 4 | ₡80,000 / ₡880 | **Employment below 50% for 5 weeks** |
| Pyramid of Safety | 4 | ₡120,000 / ₡800 | **Survive a disaster with zero casualties** |
| Aquarium | 5 | ₡20,000 / ₡320 | **5,000 children in elementary school simultaneously** |
| Science Center | 5 | ₡20,000 / ₡320 | **5,000 citizens have lived full lifespans** |
| High Interest Tower | 5 | ₡125,000 / ₡1,600 | **Hold ₡2,000 of debt** |
| Academic Library | 5 | ₡80,000 / ₡1,000 | 25% of pop highly educated **+ 5 public libraries + 300 library users** |
| Cathedral of Plenitude | 6 | ₡130,000 / ₡1,440 | **Build every city service** |
| Statue of Colossalus | 6 | ₡200,000 / ₡2,000 | **Level-5 City Park + Amusement Park + Zoo + Nature Reserve areas** |
| Eiffel Tower (landmark) | — | ₡180,000 / ₡1,440 | Zone and build 30,000 squares of industry |
| The Gherkin (landmark) | — | **₡600,000 / ₡4,800** | Build 2 harbours and 2 cargo harbours |

| CS1 monument | Cost / upkeep | Effect |
|---|---|---|
| Medical Center | ₡650,000 / ₡14,400 | 1,000 patients, 50 ambulances, helipad |
| Hadron Collider | ₡800,000 / ₡9,600 | **All education, all levels, 1,000,000 capacity each** |
| Eden Project | ₡850,000 / ₡6,400 | **Raises land value city-wide to >₡120/m² and removes essentially all air/water/ground pollution** |
| Fusion Power Plant | ₡1,000,000 / ₡8,000 | **16,000 MW** |
| Space Elevator | ₡1,500,000 / ₡16,000 | Large tourist influx |
| Doomsday Vault | ₡1,600,000 / ₡17,600 | **City-wide shelter capacity + shelter food/water storage up** |
| Ultimate Recycling Plant | ₡750,000 / ₡8,000 | **480,000 garbage/wk + 60 MW + exportable goods** |
| Castle of Lord Chirpwick | — | **+25% attractiveness to every other unique building** |

**SC3000 rewards** (population-gated, each with an explicit **population-cap relief** number) — ([somacon: SC3000 Rewards and Opportunities](https://www.somacon.com/p613.php)):
Mayor's House (pop 5,000, +6,000 cap) · Lighthouse (15,000, §5,000 cost, **raises seaport demand**, +6,000 cap) · City Hall (20,000, +9,000) · County Courthouse (25,000, +9,000) · National Park (**requires >35 park tiles**, §10,000, lowers pollution, +25,000) · Statue (35,000, +10,000) · **Military Base (80,000; raises commercial AND industrial demand significantly but raises crime and pollution and significantly lowers land value — no cap relief)** · Theme Park (80,000, §250,000, **+200,000 cap**) · Medical Institute (80,000 + year ≥1999, §75,000, raises EQ) · Performing Arts Center (100,000, +85,000) · University (**EQ > 105**) · Science Center (**EQ > 135**, §75,000) · Defense Contractor (**requires Military Base**, §75,000) · Country Club (125,000, §25,000, +37,500) · Stock Exchange (200,000 + §50,000 in bank) · **Spaceport (airport at 50 developed tiles + date > 2500, §250,000, +750,000 cap)**.

**SC4 rewards** are gated on population **and Mayor Rating and prerequisite buildings**: Mayor's House (500 pop, rating 20) · City Hall (12,500 pop, rating 20) · Courthouse (40,000 pop, rating 33, **requires City Hall**) · Disease Research Center (56,000 pop, rating 45, **requires 3 hospitals**) · Opera House (48,000 middle+high-wealth pop, rating 52, **requires Major Art Museum**) · Stock Exchange (**>25,000 commercial office jobs, average mayor rating >45**) · Space Port (**requires Advanced Research Center**). Rush Hour additionally lets **U-Drive-It missions unlock rewards early** (e.g. the "Shady Ambulance Driver" ambulance mission unlocks the Courthouse at a cost of 60 Mayor Rating) ([StrategyWiki: Reward Buildings](https://strategywiki.org/wiki/SimCity_4/Reward_Buildings), [Rush Hour rewards](https://strategywiki.org/wiki/SimCity_4:_Rush_Hour/New_Rewards_and_Business_Deals), [List of U-Drive It missions](https://simcity.fandom.com/wiki/List_of_U-Drive_It_missions) — all via snippet).

**SC2000 Arcologies** are the lineage's best "late-game megastructure": Plymouth Arco **$100,000 / 55,000 residents, supports heavy industry, polluting**; Forest Arco **$120,000 / 30,000, recycling/eco**; Darco **$150,000 / 45,000**; Launch Arco **$200,000 / 65,000** ([SC2000 object definitions](https://patcoston.com/co/objdef.aspx)).

**Anno 1800 World's Fair**: a monument giving **+150 island attractiveness while it has electricity**, with rotating exhibitions for temporary extra attractiveness — and it **permanently requires a nearby warehouse to keep feeding goods to exhibits** ([Anno wiki: World's Fair](https://anno1800.fandom.com/wiki/World's_Fair), via snippet).

---

## 2. How these games get variety without bloat

**(a) Same function, three capacities — and the real axis is capacity *per tile*.**
CS1's education line is the cleanest published example: Elementary 300 students on 6×4 = **12.5/tile**; High-Capacity Elementary 800 on 7×4 = **28.6/tile**; High-Capacity University 10,000 on 12×8 = **104.2/tile**. The wiki prints the students-per-tile column itself, because the real trade is *land* against *money* ([mirror: Education](https://wiki.biligame.com/csl/%E6%95%99%E8%82%B2)). The same pattern runs through fire (6 → 25 → 40 engines), police (jail 2 → 20 → 60 → 80), hospitals (100 → 500 → 800 → 1,000 patients).

**(b) Deliberate inverse tiers for low density.** CS1's Green Cities schools (Community School, Institute of Creative Arts, Modern Technology Institute) have **higher cost, bigger footprint, *lower* capacity, lower utility draw and a *larger* coverage radius** — explicitly "better suited to less densely populated areas". That's one new stat axis producing a genuinely different building rather than a bigger one.

**(c) Progression by era, not by size (Tropico).** Chapel (Colonial, SQ 45, 8 visitors) → Church (World Wars, SQ 60, 18) → Cathedral (Cold War, SQ 80, 32). The old building stays legal and cheap; the new one is simply better and arrives when you cross an era. Same for Clinic (World Wars) → Hospital (Cold War).

**(d) Rewards gated on milestones — and some gated on *failure*.** CS1 has 6 unique-building tiers tied to population milestones (Worthy Village 240–950 pop … Small City 2,600–11,000, then Megalopolis 20,000–90,000 for monuments; the exact thresholds vary by map's buildable area). But the *second* gate is a behavioural condition, and several reward bad play: **Lazaret Plaza wants average health under 20%, the Observatory wants 1,000 abandoned buildings for 5 weeks, the Court House wants >50% crime for 5 weeks, Oppression Office wants >50% unemployment, Statue of Shopping wants a bank balance of exactly −₡1, High Interest Tower wants ₡2,000 of debt**. The wiki says this outright: most unlocks "encourage good governance and positive growth, but a few require the city to suffer". Players respond by **save-scumming** — guidestrats' Observatory page literally tells you to make a restore point, trash your city, then reload.

**(e) Chained unlocks: every monument needs one unique building from each of the six tiers.** This forces you across the whole catalogue instead of letting you specialise. Fusion Power Plant needs Plaza of the Dead + Fountain of Life and Death + Tax Office + Observatory + Science Center + Modern Art Museum; Doomsday Vault needs Meteorite Park + Disaster Memorial + Helicopter Park + Pyramid of Safety + Sphinx of Scenarios + Sparkly Unicorn Rainbow Park ([number13](https://en.number13.de/cities-skylines-all-8-monuments-and-their-requirements/)). Three of the eight chains are themselves made of DLC-only buildings, which is also how CS1 keeps DLC content from feeling bolted on.

**(f) Unlocks hung off *systems* rather than population.** Tax Office = produce 1,000 MW + build a water treatment plant. Aquarium = 5,000 simultaneous elementary pupils. City Hall = 3,000 weekly transit passengers. Grand Mall = build an airport. Zoo = build a Fishing Pier *and* a Riding Stable. Academic Library = 5 public libraries + 300 library users + 25% highly-educated. Banks are gated on **Stock Exchange level**, which is earned by playing the Investments minigame. SC3000 does the same with **EQ > 105 for University, EQ > 135 for Science Center, >35 park tiles for the National Park, Military Base built for Defense Contractor**. SC4 adds **Mayor Rating** and prerequisite buildings (Courthouse needs City Hall; Disease Research Center needs 3 hospitals; Opera House needs the Major Art Museum).

**(g) Mutually exclusive / tradeoff choices.**
- SC3000's **Military Base**: large commercial + industrial demand boost against significant crime, pollution and land-value loss. The fan guide's verdict — "This is a very hard decision. I am half and half on this one" — is the sign of a working choice. It also **unlocks the Defense Contractor**, so refusing it closes a branch.
- SC4's **Disease Research Center**: best-in-class healthcare capacity (60,000 patients at §0.003/patient) that **emits radiation**.
- CS1 **Hadron Collider** makes all schools redundant *but* starves Campus DLC universities of students so they can never level up — the reward that breaks a subsystem.
- **Tropico work modes** are explicit either/or switches on one building: Clinic "Quack-Salver" drops the staff requirement from College to High School but **−30 service quality**; Chapel "Help First – Preach Later" gives visitors with health under 25 a quality-25 healthcare service but **−10 faith quality**; Cathedral "Biblia e Bibelots" turns it into a tourist attraction for **−10 service quality** and sets a $4 fee; "Confessional à la Presidente" gives a 5% chance to detect visitors' hidden roles for **−15 quality** ([Tropico 6 Happiness Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3317408271)).
- CS1 policies act as cross-building modifiers: **For-Profit Education cuts education upkeep 50% but every student pays tuition and happiness drops**; **Schools Out** means only a fraction of eligible citizens attend university. Players also deliberately under-provide education so there are workers for low-skill jobs — the wiki names this as a legitimate strategy.

**(h) Buildings that only matter on certain terrain.** CS1: Geothermal Power Station (hot springs), Wave/Offshore Wind (water, output scales with local wind), Fishing Island / Floating Cafe (shoreline, and the radius is measured from the small land portion), Ocean Thermal Energy Conversion (coastline), Fire Watch Tower (needs no road, so it goes on wilderness ridges), Floating Garbage Collector (must be in polluted water). Pharaoh: Well and Water Supply **must be on grassland**; Mansions and Palaces **must be partly on grassland**; Festival Square and Bandstand/Booth/Pavilion **must straddle a crossroads**; Ferry Landings **in pairs on opposite banks**. SC2000: Marina can only be placed on water. CS1 Snowfall adds a whole parallel heating network (Boiler/Geothermal Heating Stations + heating pipes) that only exists on winter maps.

**(i) Cosmetic variants with identical stats, so the catalogue looks big without being big.** CS1 ships "vanilla" and "European" versions of most service buildings that "function in exactly the same way; the difference is purely aesthetic" ([guidestrats: growables vs ploppables](https://guidestrats.com/cities-skylines-growables-vs-ploppables/)); CS2 goes further with regional sets (EE/JP/CN/FR/UK/USA-NE/USA-SW hospitals, fire houses, police stations) that differ only slightly in cost, footprint and vehicle count. SC4 ships four architectural *styles* for growables.

**(j) One building, several services.** Caesar III's **Prefecture is police + fire for 30 dn and 6 workers**. Pharaoh splits that into three 30-db buildings (Firehouse / Police Station / Architect's Post) — same cost, same staffing, different hazard, which is bloat traded for legibility.

---

## 3. Specific mechanics

### Coverage radius vs. city-wide effect
- **SC2000**: pure radius, no vehicles. Police suppress crime "only within a 20-block radius"; fire coverage "gradually diminishes with distance" and is viewed as a heatmap in the City Map window. Education/health are effectively city-wide pools fed by building count.
- **SC3000**: a hybrid — "**each reward and opportunity has a city-wide effect on land value**", while "many other buildings also have local land value and aura effects, which apply to a radius around the structure"; fan estimate for most buildings is **8–16 tiles**. Education, health, fire coverage and police protection all feed one **global land value** figure; "aura" is a separate quantity from land value ([SC3000 fan guides / Simtropolis ordinance material](https://www.somacon.com/p603.php)).
- **SC4** is the pivot: *"Educational and medical facilities, which previously provided citywide coverage, were modified to provide more limited coverage, similar to police and fire stations in earlier games"* ([Wikipedia: SimCity 4](https://en.wikipedia.org/wiki/SimCity_4)). Radii are stored **in metres at 16 m/tile** (Elementary 384 m ≈ 24 tiles, Large Elementary 680 m ≈ 42 tiles). Police has a **strength gradient** inside the radius — ~300–350 at the centre, and arrests only occur where protection > 20, roughly the inner 80%. Fire has a **separate 128 m (8-tile) dispatch radius** for the trucks.
- **CS1** is deliberately confusing and players argue about it: the green overlay shown when placing a service building is the **happiness/land-value range, not the service range**; the actual service reach is handled by **vehicles dispatched over the road network** (ambulances, hearses, fire engines, garbage trucks), with citizens walking to the nearest clinic if no ambulance is free. The info-view colours *roads* green where a service reaches ([Steam discussion](https://steamcommunity.com/app/255710/discussions/0/523890681410776922)). Parks are the exception and publish a real radius: **entertainment value + radius in metres + visitor capacity**, and "many building level-ups require effective coverage by these assets".
- **CS2** runs both explicitly and prints the numbers on the building: **radius effects** ("1% well-being within 200 m", "3 well-being within 300 m", "4% well-being within 500 m", "5 well-being within 1 km", "−5% crime rate within 800 m") and **city-wide percentage modifiers** ("−8% crime rate city-wide", "−25% disease infection risk city-wide", "+10% industrial efficiency city-wide", "−5% building level cost city-wide", "−1% loan interest city-wide"). The city-wide modifiers live almost entirely on **upgrade modules and signature buildings**, which is a neat separation: *base buildings serve an area, upgrades tune the whole city.*
- **Caesar III / Pharaoh**: no radius at all. Coverage is **walkers** — a house receives a service when a walker from a linked building passes **within two tiles** of it. City-wide ratings (Culture) are computed as **venues per head**: "perfect" entertainment coverage is roughly **one theatre per 400 people, one amphitheatre per 800, one colosseum per 1,500** ([Caesar 3 Heaven forum](https://caesar3.heavengames.com/cgi-bin/caeforumscgi/display.cgi?action=st&fn=2&tn=2859)). Entertainment also deposits points per visit — ~25 for a colosseum, 15 amphitheatre, 10 theatre. School walkers cover less ground than others, so schools need doubling up.
- **Anno 1800**: radius is measured **along roads with a per-segment cost**, so paving extends reach. Police Station is quoted at **48 tiles on dirt roads, 71 on paved streets** ([Anno wiki: Police Station](https://anno1800.fandom.com/wiki/Police_Station), via snippet); an older community tool lists paved distances of **Marketplace 49, Pub 41, Police 32, Church 56, School 49, Fire Station 48** ([AnnoDesigner issue #3](https://github.com/AnnoDesigner/anno-designer/issues/3)) — **these two sets conflict and the GitHub figures are ~7 years old; treat both as [unverified]**. A few buildings (Town Hall, Trade Union) use a true circular radius instead.
- **Tropico 6**: coverage-based for crime safety and liberty; a few buildings publish a grid radius, e.g. **Fire Station at base efficiency raises Housing Quality of residences within 14 grid cells by 5 points**; **Fast Food Joint in Metro Station work mode raises Housing Quality within 15 cells by 5** ([Tropico wiki: Housing Quality](https://tropico.fandom.com/wiki/Housing_Quality), via snippet).

### Funding sliders per building
- **SC2000**: one annual funding slider per *department*; **100% funding = 200 officers per police station at $100/station/year**. Under-funding "downgrades their ability to work".
- **SC3000**: per-department funding; cutting police/fire too far means "they will not work as effectively as they could". Separately, **ordinances** are per-city toggles that mostly cost money monthly, several scaling with population.
- **SC4** is the most granular: funding is set **per individual building** so spending can match the local population, and the **Query Panel of each civic building has its own vehicle-funding slider that widens or narrows the coverage radius** until free capacity runs out. Monthly cost is explicitly split into **building cost + coverage cost** (Large Elementary School = §1,500 building + §500 coverage = §2,000 max).
- **CS1** publishes the whole curve: budget ranges **50%–150%**, 100% is optimal, **at 50% budget effectiveness falls to 25%**, at 150% it rises only to **125%** — i.e. under-funding is punished super-linearly and over-funding is nearly worthless. The documented exception is vehicle-based services, where **101% is worth setting** to squeeze out an extra vehicle. Low budget can also shrink the coverage area and so block nearby building level-ups ([mirror: Services](https://wiki.biligame.com/csl/%E5%B8%82%E6%94%BF%E6%9C%8D%E5%8A%A1)).
- **CS1 Natural Disasters** is the best-documented slider-to-radius mapping in the genre, all on the Emergency Services budget:
 - Earthquake Sensor (₡3,500 / ₡43): detection **500 m at 50% → 2,000 m at 100% → 2,500 m at 150%**
 - Weather Radar (₡25,000 / ₡720): warning **4 days at 50% → 14 days at 100% → 18 days at 150%**
 - Deep Space Radar (₡25,000 / ₡720): detection **25% at 50% budget, 100% at ≥100%**
 - Tsunami Warning Buoy (₡4,000 / ₡48): sensitivity **40 m at 50%, 10 m at ≥100%**
 - Short Radio Mast (₡10,000 / ₡208): **100 kW / 400 kW / 500 kW** at 50/100/150%; Tall Radio Mast (₡25,000 / ₡432): **156 / 600 / 756 kW**
- **CS2** keeps the 50–150% slider but it drives **Efficiency** (green/yellow/red) rather than radius — a frequently-cited player complaint is exactly that "reducing funding does not decrease radius or capacity — it decreases efficiency".
- **Tropico 6** has a **per-building budget** with published quality at each level (the "SQ / Max Budget" pairs above, e.g. Hospital SQ 80 → 100 at max budget), plus **1 worker = +2 service quality**, plus per-building **upgrades** and **work modes**. Four independent knobs on a single building.

### Capacity vs. demand
- **CS1 education**: "if city-wide capacity at each level meets or exceeds the number of eligible students, citizens have the best chance of being well educated". Education is strictly age-gated and **non-catch-up**: a teen who missed elementary cannot attend high school; an adult cannot get elementary education at a university. So a capacity shortfall at one tier permanently caps the tiers above it.
- **CS1 demand bars** drive growables; buildings only appear in a zone if demand exists. Jobs each carry an education level, and **a business that can't find educated workers complains and eventually moves out**.
- **Caesar III / Pharaoh**: labour is the binding constraint — every building lists "laborers employed" (Prefecture 6, Hospital 30, Colosseum 25, Temple Complex 50) and runs at reduced efficiency when understaffed.
- **Anno 1800**: residences only upgrade tier (Farmer → Worker → Artisan → Engineer → Investor) when their **needs** are met, and needs are met only by public buildings in road range plus goods in the marketplace. Workforce by class is itself a consumed resource (Bakery needs 100 workers, Brewery 75).
- **SC3000** uses an unusual mechanic: **population caps** relieved by reward buildings, parks and museums (Theme Park +200,000, Spaceport +750,000). Growth is literally gated on building a catalogue.
- **SC4** capacity is priced: schools and hospitals quote a **per-student / per-patient capacity cost** (Medical Clinic §0.80/patient vs Large Medical Center §0.40/patient vs Disease Research Center §0.003/patient), so bigger is cheaper per head — the standard economy-of-scale incentive.

### "Ploppables" vs. zoned growth
- **SimCity lineage & CS1**: you paint R/C/I zones and buildings **grow** from them according to demand, density, land value and wealth level; everything else (services, parks, uniques, monuments) is **plopped**. Growables pay tax and are the income; ploppables cost upkeep ([guidestrats](https://guidestrats.com/cities-skylines-growables-vs-ploppables/)). CS1 growable appearance is picked at random from the asset pool for that zone+density+wealth, which is why Workshop assets slot in seamlessly.
- CS1 **Industries, Parklife and Campus DLCs blur the line**: you paint an *area* and then plop functional buildings inside it that level the area up — so ploppables acquire growth-like progression.
- **SC4** auto-creates streets when you zone large tracts, and **most buildings must touch a road to function**; civic buildings notably **do not need road access in SC2000**, which players exploited by hiding police/fire/hospital/school inside 9-tile-wide blocks.
- **Caesar III / Pharaoh / Anno / Tropico** are 100% ploppable: housing is a plopped lot that then evolves, so there is no demand bar at all — immigration and evolution replace it.

### Building decay / abandonment
- **SC4** simulates **urban decay and gentrification** directly: buildings deteriorate and are refurbished; a building built for wealthy tenants can be re-occupied by lower-wealth tenants when conditions push the original tenants out. Utility and civic buildings **age**: maintenance cost rises and maximum output falls with age, and "the rate at which facilities age depends on how much of their capacity is used and how much funding they receive" — i.e. running a plant hot and underfunded wears it out faster.
- **CS1** has no decay curve but a hard **abandonment** state. Documented causes: not enough workers, not enough *educated* workers, not enough goods, not enough raw materials, not enough buyers, insufficient water, insufficient sewage, sewage backflow, insufficient power, garbage piling up, excessive crime, high taxes, heavy pollution, excessive noise, uncollected bodies, prolonged flooding, burnt down, collapsed, and — for high-level buildings — **land value too low**. Abandoned buildings never reactivate, lower surrounding land value, and demolishing them makes neighbours happier. Critically: **player-plopped buildings never abandon** — they merely complain, and some keep working anyway (a bus depot still dispatches buses with no power) ([mirror: Abandoned buildings](https://wiki.biligame.com/csl/%E5%BA%9F%E5%BC%83%E5%BB%BA%E7%AD%91)).
- **Pharaoh/Caesar III** have **collapse** and **fire** as per-building risk flags; the Architect's Post / Engineer's Post exists solely to have a walker pass by and reset the collapse timer, and the Firehouse/Prefecture does the same for fire. Each building in the Pharaoh tables carries a "Risk of fire" and "Risk of collapse" yes/no. Houses also **devolve** down the ladder when a service lapses (the Augustus table lists a devolve and an evolve desirability threshold per level, e.g. Small Casa devolves at 10, evolves at 16).

### Land value
- **SC2000**: parks raise local land value; land value drives whether a 3×3 zone develops into a large building at all ("most zones will not develop into large buildings because land values will be too low — put lots of big parks or areas with trees or water").
- **SC3000**: a **global** land value fed by education, health, fire coverage, police protection and other ratings, plus **local aura/land-value fields** around individual buildings, plus **city-wide land value jumps from every reward**.
- **SC4**: desirability per wealth level per tile; **agriculture is the exception that grows regardless of high land value**.
- **CS1**: land value drives building level-ups; parks and plazas raise it locally (Plazas & Promenades plazas state a flat **₡/cell** bonus — 300, 380, 450), and the **Eden Project monument raises it map-wide to >₡120/m²**, which "skyrockets your income". High-level buildings abandon if land value falls too far — a built-in gentrification failure mode.
- **Caesar III / Pharaoh**: no land value; **desirability** does the same job, as a signed field per building (Garden +, Statue +/++/+++, Governor's Palace ++++, Hospital slightly −, Gladiator School −, Tower very −, **Fort extremely −**). Housing level is a function of desirability plus the service checklist.
- **Anno 1800**: **island Attractiveness** from six factors, three positive (Culture, Nature, Festivity) and three negative; Charcoal Kiln is −25, Furnace −15; ornaments add small amounts and **generate no upkeep**; World's Fair +150 while powered ([Anno wiki: Attractiveness](https://anno1800.fandom.com/wiki/Attractiveness), [Anno Union DevBlog: City Attractiveness](https://www.anno-union.com/devblog-beauty-building-part-1-city-attractiveness/)).
- **Tropico 6**: **Beauty** is the land-value analogue — it raises housing quality and raises efficiency on some buildings by **up to 25%**, and is lowered by pollution and shacks.

---

## 4. Services that affect happiness/approval, with numbers where published

**Tropico 6 is the only game in this set that publishes per-building happiness numbers.** Overall happiness is the **mean of eight factors**, and approval = happiness + island economy + election promises ([gamepressure: Happiness and approval](https://www.gamepressure.com/tropico-6/happiness-and-approval/zbc04d)):
1. **Food** — from *variety* (11 food types: banana, pineapple, coconut, juice, fish, cheese, corn, canned goods, shellfish, meat, milk) plus coverage. Grocery with all goods: **SQ 87, max budget 100**; food-producing building set to "supply citizens" gives **45 food quality**; "supply local market" work mode adds food quality and **+10% efficiency capped at 30**.
2. **Health care** — spots available × availability × work mode × constitution. Clinic SQ 60/80/91; Hospital SQ 80/100. Constitution: **Paid Healthcare = +20% efficiency; Single-payer = free but no revenue, +2% efficiency; Hybrid = broke/poor don't pay but only get 75% of the healthcare happiness.**
3. **Entertainment/Fun** — service quality of entertainment buildings, split by wealth (Entertainment for the poor, Luxury Entertainment for the rich). Published values span **SQ 20 (6 visitors)** to **SQ 95/129 (8 visitors)** and **SQ 80/105 (60 visitors)**.
4. **Faith** — spots × quality: Chapel 45/56 (8 visitors), Church 60/75 (18), Cathedral 80/100 (32). Faith also drives **birth rate and immigration**.
5. **Housing** — per-building Housing Quality, with four stacking modifiers: base → max budget → +electricity → +work mode. E.g. one tier reads **48 → 60 → 72 → 90**; another **32 → 40 → 48 → 36**; shacks are the floor, luxury mansions reach **90 → ~115**. "More than 22 homeless can be concerning."
6. **Job quality** — **Space Program 95 at max budget is the ceiling, Tavern 45 the floor**; the **Early Retirement** constitution gives **+5 job quality globally**; the **Mandatory Siesta** edict gives **+15/17/20% job quality, −12/10/8% efficiency, −10% pollution on all workplaces**.
7. **Liberty** — coverage-based; published building values are low (**SQ 15/18, SQ 20/25**); the "Music all day" work mode gives **+5 service quality to all fun buildings, non-stacking**.
8. **Safety / crime** — coverage-based. **Church/Chapel +20 crime safety under Theocracy; Cathedral +35 (+15 with the Dunning Confessional upgrade alone, net +10); Security Checkpoint +5.** Unhappy citizens protest, then rebel.

**CS2** publishes happiness-adjacent numbers as module effects: well-being **+1% within 200 m** (school Gymnasium), **+3 within 300 m** (High School Sports Park, which also gives +10 attractiveness and +10 outdoor recreation), **+4% within 500 m**, **+5 within 1 km** (City Library, plus +10 attractiveness and +5 indoor recreation), **+5% well-being within 500 m and +25 attractiveness** (Community Kindergarten). Crime: **−5% within 800 m** (Prison), **−8% city-wide** (CIB), **−5% city-wide** (Municipal Court module), **−2% city-wide** (a smaller court variant).

**CS1 does not publish happiness weights.** The wiki is explicit that happiness has four sub-pools (residential/commercial/industrial/office), that global happiness is a **population-weighted average of the four**, and that the levers are "schools, hospitals, police stations, fire stations and parks", taxes and policies — but gives no coefficients. Two useful qualitative findings: **commercial happiness is widely held to be unable to exceed ~85% even at 1% tax**, partly because shopping competes with parks for the same "leisure" need; and **some policies labelled as happiness-negative (No Pets, Smoking Ban) net positive** because the garbage reduction or health gain outweighs the stated penalty ([mirror: Happiness](https://wiki.biligame.com/csl/%E5%B9%B8%E7%A6%8F%E5%BA%A6)). Achievements anchor the scale: 15% = "Unpopular Mayor", 95% held for 5 years = "Happy Town".

**SC4** uses **Mayor Rating** as the approval metric, and it is a *gate on content* — reward buildings require specific rating thresholds (20 for Mayor's House and City Hall, 33 Courthouse, 45 Disease Research Center and Stock Exchange, 52 Opera House), and Rush Hour missions can **spend** rating to unlock rewards early (Courthouse for 60 rating).

**SC2000/3000** express approval through **advisors** rather than numbers — the police chief reports one of three states (crime out of control / about average / at an all-time low) against a hidden "x" value; the measured relationship was x=18 at 5,000 Sims/station, x=26 at 6,000, x=35 at 8,500.

**Caesar III** converts services into a **housing ladder** instead of a happiness score — see §2.

---

## 5. Disasters and emergency-response buildings

**CS1 + Natural Disasters DLC** is the most fully worked system in the genre ([mirror: Disasters](https://wiki.biligame.com/csl/%E7%81%BE%E9%9A%BE), [mirror: Disaster Response](https://wiki.biligame.com/csl/%E7%81%BE%E9%9A%BE%E6%95%91%E6%8F%B4%E6%9C%8D%E5%8A%A1)):

| Disaster | Behaviour | Detector |
|---|---|---|
| Tornado | Knocks down trees, destroys buildings, floods its path | Weather Radar |
| Thunderstorm | Lightning damages power lines and pylons, can start forest or building fires (**Lightning Rods policy reduces ignition chance**) | Weather Radar |
| Earthquake | Shakes ground, **changes terrain elevation**, destroys roads and buildings and **underground pipes, metro/rail/road tunnels**; can start fires; distant buildings can still collapse | Earthquake Sensor |
| Sinkhole | Opens a void, collapses buildings and underground infrastructure | Earthquake Sensor |
| Tsunami | Wall of water; washes vehicles off roads; **underground metro stations are especially vulnerable**; **prolonged flooding abandons buildings**; floods block roads and rail, which then starves healthcare/deathcare/police/fire/garbage of access; sewage washed inland causes **permanent pollution in low-lying pools** | Tsunami Warning Buoy |
| Meteor strike | Destroys a wide area, starts multiple fires, wrecks underground infrastructure; **can land in water and cause a tsunami (chained disaster)** | Deep Space Radar |
| Forest fire | Starts from one self-igniting tree and spreads; **no announcement until citizens can see it**; bulldoze unburnt trees to firebreak, burning trees can't be bulldozed; trees regrow | Fire Watch Tower |
| Structure collapse / Structure fire | Local; people can be trapped inside | — |

Response buildings: **Disaster Response Unit** ₡15,000 / ₡640, 10 rescue trucks + 3 rescue helicopters, 14×21; **Disaster Response Airbase** ₡40,000 / ₡1,600, 10 rescue helicopters; **Small Emergency Shelter** ₡24,000 / ₡480, **1,000 capacity, 5 evacuation buses**; **Large Emergency Shelter** ₡74,000 / ₡1,600, **10,000 capacity, 10 buses**; **Fire Helicopter Depot** ₡55,000 / ₡1,400, 3 helicopters (**each must dip its bucket in a river/lake/sea before flying to the fire**); **Pumping Service** trucks vacuum standing water and dump it to the sewer, so a tsunami-wrecked sewer system cripples flood recovery; **Doomsday Vault** monument raises shelter capacity and shelter food/water storage city-wide. CS2 has an equivalent with **"360 disaster alert time city-wide, −20% disaster damage city-wide"** on one signature building.

Design notes worth copying: every detector's range/lead-time is a **function of the Emergency Services budget slider** (numbers in §3); **one Weather Radar and one Deep Space Radar cover the whole city, but Earthquake Sensors need several**, which makes two detector types feel different; disasters **chain**; and there is a **"Fire doesn't spread" accessibility toggle** that is force-disabled when random disasters or a scenario are active.

**SC2000** has the genre's original emergency system and it is *interactive*: the **Dispatch** tool only appears during an emergency and lets you direct **police** (riots, floods), **firefighters** (fire, floods, toxic clouds) and **military units** (available only if the military has built a base; "highly trained and effective against a variety of disasters") onto the map ([SC2000 object definitions](https://patcoston.com/co/objdef.aspx)).

**SC3000/SC4** keep disasters (fire, tornado, riots, UFO, etc.) but as events rather than a subsystem with its own building family. **Pharaoh/Caesar III** embed the hazard in the building itself (per-building fire and collapse risk suppressed by Firehouse/Prefecture and Architect's/Engineer's Post), plus plague (Doctor/Hospital/Apothecary/Physician), plus military invasion (Wall 12 dn/segment, Tower 150 dn, Gatehouse 100 dn, **Fort 1,000 dn with extremely negative desirability**, Military Academy 1,000 dn). **Anno 1800** runs city *incidents* — fire, riot, illness — each suppressed by its own emergency building's road-range influence area.

---

## 6. Ten most fun / most imitated building designs in the genre

1. **Caesar III Prefecture** (30 dn, 6 workers) — one cheap building that is simultaneously police and fire, with slightly negative desirability. Teaches the whole walker system in a single object and is the cheapest unit of "coverage" any builder has shipped.
2. **Caesar III Reservoir → Aqueduct → Fountain chain** (80 dn / 8 dn per tile / 15 dn) — a utility you *draw* rather than place, where the terminal node (Fountain) is itself the desirability object and the water tier gates housing evolution. The direct ancestor of every network-utility puzzle since.
3. **SC2000 Arcology** (Plymouth $100k/55k residents … Launch Arco $200k/65k) — a single building that is a city. Hard money sink, flavoured per archetype (industrial / eco / weird / spacefaring), and tied to a meta-reward. The purest "end-game megastructure" design in the lineage.
4. **SC3000 Military Base** (pop 80,000; big commercial+industrial demand boost; raises crime and pollution, significantly lowers land value; unlocks the Defense Contractor) — a reward you can genuinely refuse, that opens a branch if you take it. Almost no modern builder offers a reward with real downside.
5. **CS1 Lazaret Plaza** (₡17,500; unlock: average health below 20% for 3 weeks) — the reward-for-failure. It inverts the whole progression grammar, generates stories, and costs almost nothing to implement.
6. **CS1 Hadron Collider** (₡800,000 / ₡9,600/wk; 1,000,000 capacity at every education tier) — a monument whose *function* is to delete a management system you have been doing for forty hours. The catch (Campus universities starve and can't level) keeps it from being free.
7. **CS1 Eden Project** (₡850,000 / ₡6,400/wk; raises land value map-wide above ₡120/m², removes nearly all pollution) — the same trick applied to *two* systems at once, and the reason the industrial-pollution puzzle has an endgame answer rather than a permanent tax.
8. **CS1 Landfill Site** (₡4,000 / ₡160; 8,000,000 capacity; pollution 100; **can only be relocated or demolished once emptied**) — a building with a lifecycle. It fills, it poisons its surroundings, and you must build its successor and pump it out before you can be rid of it. Same design on the Cemetery (3,000 bodies, empty before removal).
9. **CS2 Extension Wing** (school: 22.5k build, 5k upkeep, +500 students; hospital: 225k, 50k, +200 patients) — modular capacity that costs a fraction of a second building and no extra land, with a sibling module (Gymnasium, Research Lab, Library) that buys *quality or area effect* instead of capacity. The cleanest answer anyone has found to "do I build another school or a bigger school".
10. **Tropico 6 work modes** — e.g. Clinic "Quack-Salver" (staff requirement drops College→High School, **−30 service quality**), Chapel "Help First – Preach Later" (**visitors below 25 health get quality-25 healthcare, −10 faith quality**), Cathedral "Biblia e Bibelots" (becomes a tourist attraction, −10 quality, $4 fee). One asset, several mutually exclusive behaviours, zero new art. The highest variety-per-byte in the genre.

*Honourable mentions:* **Pharaoh's Road Block** (4 db — a building whose only job is to constrain the pathing of other buildings' walkers); **CS1 Fire Watch Tower** (₡9,000, 2×2, 36 m, no road needed — a pure-information building that only makes sense on terrain); **Pharaoh's Dentist** (50 db, explicitly **no effect on city health**, exists only for culture rating and desirability — an honest luxury); **Anno 1800's Pub** (500 credits, 10 timber — satisfies a named need of a named class inside a road-propagated range, and nothing else).

---

## 7. What these games got wrong

**Too many knobs (SC4).** The most consistent complaint is budget micromanagement: "constant micromanagement of city buildings in order to keep a positive cash flow, adjusting the funding of individual fire departments, prisons, schools and more" — the per-building funding slider that makes SC4 deep is also what makes it feel like work ([loosewireblog column](https://www.loosewireblog.com/?p=2396)). Players also report education being "such a pain to get up to decent levels", and the game described as "more of an assembly line / database management program than its predecessors". Counter-voices exist ("I like SC4 *because* of the micromanagement"), so this is a tuning complaint, not a design refutation ([anandtech threads](https://forums.anandtech.com/threads/favorite-simcity.1787689/page-2)).

**Opaque coverage (CS1).** The green circle shown while placing a service building is the happiness/land-value range, not the service range, and players argue about this constantly on the forums — the service itself reaches wherever vehicles can drive. Any mechanic where the UI affordance and the simulation disagree is a bug in presentation even when the simulation is fine.

**Rewards that require wrecking your city (CS1).** Observatory (1,000 abandoned buildings for 5 weeks), Court House (>50% crime for 5 weeks), Oppression Office (>50% unemployment for 5 weeks), Lazaret Plaza (health <20%) are fun *once*. In practice guides tell you to **save, trash the city, unlock, then reload** ([guidestrats: Observatory](https://guidestrats.com/cities-skylines-observatory/)). The achievement is real but the gameplay it produces is save-scumming, and since the unlock is **account-wide once earned** the designers effectively conceded this.

**Monuments that delete the game (CS1).** Hadron Collider removes education, Medical Center removes healthcare, Fusion Plant removes the entire power grid (and can be run at **50% budget for 8,000 MW**, still more than enough), Eden Project removes pollution and maxes land value, Ultimate Recycling Plant removes garbage. Stacking them leaves a city with no systems left to manage. The Hadron Collider additionally **breaks Campus DLC** by starving university areas of students.

**Over-simplification and cost inflation (CS2).** Launch-era reaction: service radii are now so large that "fewer buildings are needed"; the game "is on automode and you cannot fail"; "a simulation as arcade as possible". Against that, **"Tier 2/3 service buildings are wildly expensive to maintain"** (a Police HQ at 155k/mo upkeep, Prison at 100k, CIB at 180k), and **"reducing funding does not decrease radius or capacity — it decreases efficiency"**, which players read as the slider having lost its spatial meaning. Reviews were dominated by performance, not design ([GamesRadar review](https://gamesradar.com/cities-skylines-2-review), [GameSkinny review](https://www.gameskinny.com/reviews/cities-skylines-2-review-little-big-town/) — "graduation rates are abysmally slow").

**Walkers (Caesar III / Pharaoh).** The single most-cited flaw in the Impressions lineage: services are delivered by pedestrians on semi-random paths, so "it forced you to make completely inefficient, unrealistic city plans" and players built formulaic closed-loop "housing blocks" to corral them. In Caesar III **you cannot control walker flow at all because there are no roadblocks** — Pharaoh added the 4-db Road Block specifically to fix this, and Caesar IV removed walkers entirely, which reviewers treated as the headline improvement. The adjacent complaint is the arithmetic of coverage: "building the right number of schools, theaters, libraries, bathhouses" is a spreadsheet exercise, and reaching the top housing tier is "a pain" ([Wikipedia: Caesar III](https://en.wikipedia.org/wiki/Caesar_III), [quartertothree: Pharaoh](https://forum.quartertothree.com/t/pharaoh-i-want-to-play-this-again/74005?page=4)).

**Agent simulation that could not scale (SimCity 2013).** The famous failure. Critics tied the tiny maps ("less than one square mile") directly to the agent system — agents "simply pick a destination, calculate the shortest path to it", so service vehicles moved "in vast herds" and "the more intersections you have in your city the worse it will be for you". Maxis spent months on larger cities including "changing the routing algorithms of our agent-based system" and then announced it would not ship bigger maps ([gamewatcher](https://www.gamewatcher.com/2013-04-10-maxis-team-specifically-focused-on-exploring-simcity-offline-no-bigger-cities), [Fox News](https://www.foxnews.com/tech/simcity-pr-nightmare-escalates), [The Drive](https://www.thedrive.com/news/cities-skylines-ii-is-secretly-a-car-game-and-it-doesnt-suck-anymore)). **Lesson for a constrained SNES-era engine: do not model individual agents for a service you could model as a field.**

**Useless or near-useless buildings.** Three honest categories: (a) *pure decoration sold as a system* — SC3000's real-world landmarks (CN Tower, Notre Dame, Empire State) were "strictly for aesthetic purposes only"; (b) *buildings whose stats are dominated* — CS1's Public Library at ₡22,000 / ₡400 with a capacity of 100 and a "very small" chance to raise a visitor's education level "cannot satisfy even a starting town's education needs", and exists mainly as a prerequisite for the Academic Library; (c) *modules the community can't tell apart* — CS2's "Modern Student Plaza" (30k build, 5k/mo upkeep) is catalogued by players as **"seems to be decorative only"**. Anno 1800's ornaments were considered so under-powered that a popular mod **multiplies ornament attractiveness by four** ([Spice it Up](https://www.nexusmods.com/anno1800/mods/5)).

**Ordinances/policies as flat taxes.** SC3000's ordinances mostly cost money every month and several scale with population; many players treat the whole screen as "turn on the obviously-good ones, ignore the rest". CS1's policy list has the same problem, with the interesting exception noted above (No Pets / Smoking Ban being net-positive despite their stated penalty) — the lesson being that **a policy is only interesting if its stated effect and its real effect differ**.

---

### Concrete recommendations for a hex space-colony builder on a SNES-era engine
Pulled from the above, ranked by payoff-per-byte:
1. **Coverage as a decaying field on hex distance, not agents** (SC2000's 20-tile police radius, not SC2013's pathing agents). One number per building, cheap to evaluate, legible as a heatmap overlay.
2. **Three tiers per service, and make the axis capacity-per-hex** rather than raw capacity, so land scarcity does the balancing (CS1's 12.5 → 28.6 → 104.2 students/tile).
3. **One funding slider per service with a published, non-linear curve** — CS1's 50% → 25% effectiveness / 150% → 125% is a good shape, and tying *detector range* to the slider (earthquake sensor 500/2,000/2,500 m) is the single best use of a slider in the genre.
4. **Modular upgrades instead of bigger buildings** (CS2 Extension Wing): +capacity module, +quality module, +vehicles module. Three small sprites give you nine effective buildings, and the toggle-off-to-stop-upkeep behaviour is free design.
5. **Rewards gated on two axes: a milestone plus a behavioural condition**, and include 2–3 rewards for *failure*. But make them account-wide-once-earned so players don't save-scum.
6. **Chain the capstones**: each megastructure needs one unique from each tier, so the player must tour the whole catalogue.
7. **Give at least three buildings a terrain-only reason to exist** (geothermal vents, shoreline, ridge-top sensor), and at least one with an anti-synergy (Anno's Timber Yard losing productivity when housing crowds it).
8. **Buildings with lifecycles**: a landfill/tailings dump that fills, poisons, and must be emptied before removal, is more memorable than five more parks.
9. **Housing evolution as the happiness readout** (Caesar III's 13-step ladder with an explicit service checklist per step) — it makes every service legible without a single happiness coefficient, which is ideal for a low-UI-bandwidth engine.
10. **One building, several work modes** (Tropico) before you draw a single new sprite.
