# Space-Colony Building Catalogue — Design Research

**Source access caveat (read first).** Fandom wikis (`*.fandom.com`) now return **HTTP 402** to automated fetches (Cloudflare pay-per-crawl), and `survivingmars.paradoxwikis.com` / `sta.paradoxwikis.com` return a Cloudflare JS wall. I could not read those directly. Everything below comes from fetchable mirrors (wiki.gg, bugbyte.fi, wiki.offworldgame.com, stardeusgame.com, gamepressure, Steam guides, spacecolonyfans.net) plus search-engine synthesis of the blocked wiki pages. Numbers that come only via search synthesis of a blocked page are marked **[via search]**. Numbers marked **[UNVERIFIED]** conflict with another source or come from a site of doubtful provenance.

---

## 1. PER-GAME BUILDING CATALOGUE

### 1.1 Surviving Mars (+ DLC)

Best single stat dump: https://www.gamepressure.com/surviving-mars-guide/list-of-buildings/z5ab99 (pre-Relaunched values; E = energy, W = water, O = oxygen, Wk = workers).

| Category | Building | Cost | Consumes | Output / effect | Maint. |
|---|---|---|---|---|---|
| **Power** | Solar Panel | 1 metal | — | 2 E (day only) | 0.5 metal |
| | Large Solar Panel | 4 metal | — | 5 E | 1 metal |
| | Wind Turbine | 4 concrete, 1 mech | — | 5 E | 0.5 mech |
| | Stirling Generator | 12 polymer, 6 electronics | — | 10 E | 1 polymer |
| | Fusion Reactor | 40 concrete/20 polymer/20 electronics | — | **200 E**, Wk 24 | 3 electronics |
| | Power Accumulator | 3 concrete, 2 polymer | — | stores 200 E | 1 polymer |
| | Atomic Accumulator | 5 concrete, 5 polymer | — | stores **2,000 E** | 2 polymer |
| | Cables / Switch | 1 metal per 5 hexes | — | transmission, grid isolation | — |
| **Air** | MOXIE | 5 metal | 2 E | **2 O**; stops during dust storms | 2 metal |
| | Oxygen Tank | 3 metal | — | stores 100 O | 1 metal |
| **Water** | Water Extractor | 6 concrete, 2 mech | 5 E | 5 W (needs subsurface deposit) | 1 mech |
| | Moisture Vaporator | 2 metal, 5 polymer | 5 E | 1 W (deposit-free, 5× worse) | 2 metal |
| | Water Tower | 3 metal | — | stores 100 W | 1 metal |
| | Water Reclamation Station (spire) | 50 concrete/10 polymer/5 mech | — | **recycles up to 70% of dome water** | 3 mech |
| **Food** | Farm (in-dome) | 8 concrete | 0 E, water by crop | food by crop, Wk 6; crops emit O | — |
| | Hydroponic Farm | 4 metal, 2 polymer | 5 E | food by crop, Wk 3 | 1 metal |
| | Mushroom Farm | 10 concrete/15 metal/5 electronics | 10 E, **2 O**, 0.5 W | 5 food, Wk 6 | 1 metal |
| **Extraction** | Concrete Extractor | 6 metal, 2 mech | 5 E | 20 concrete, **no workers** | 1 mech |
| | Metal Extractor | 20 concrete, 5 mech | 5 E | 20 metal, Wk 12 | 2 mech |
| | Rare Metal Extractor | 20 metal, 5 mech | 5 E | 7 rare metals, Wk 12 (export income) | 2 mech |
| **Refining** | Polymer Factory | 10 concrete/5 metal/5 mech | 2 E, 1 W, 1 fuel | polymer, Wk 18 | 2 mech |
| | Electronics Factory | 10 concrete/5 metal/15 electronics | 8 E, 1 rare metal | 9 electronics, Wk 30 | 3 electronics |
| | Machine Parts Factory | 10 concrete/10 metal/2 electronics | **30 E**, 1 metal | 12 mech parts, Wk 15 | 2 electronics |
| | Fuel Factory | 5 concrete/5 metal/5 mech | 5 E, 1 W | 12 fuel | 1 mech |
| | Drone Assembler | 20 metal, 10 electronics | 10 E | drones, Wk 9 | 1 electronics |
| **Habitation** | Basic / Medium / Mega / Oval Dome | 80–300 concrete + metal + polymer | 15/30/50/40 E; 1/2/4/2 O; 1/2/4/2 W | the buildable interior itself | 1–5 |
| | Living Quarters | 10 concrete | 1 E | 14 residents | 1 concrete |
| | Apartments | 35 concrete, 10 polymer | 12 E | 24 residents | 3 concrete |
| | Smart Home / Smart Complex | 5c+3e / 15c+10e | 2 E / 4 E | 4 / 12 residents | — |
| | Nursery | 10 concrete | 2 E | 8 residents, children only | 1 concrete |
| | Arcology (spire) | 80 concrete, 10 polymer | 20 E | 32 living space (+60 comfort) | 4 polymer |
| **Medical** | Infirmary | 15 concrete | 2 E | Service Comfort 40; **+10 sanity, +20 health** per visit | 1 concrete |
| | Medical Center (spire) | 30c/30m/10p | 20 E | Comfort 70; **+20 sanity, +50 health**, +25 comfort | 3 polymer |
| | Sanatorium (spire) | 50c/20m/10p | 20 E | **removes colonist flaws** | 2 polymer |
| | Clone Vat (spire) | 50m/20p/10e | 30 E | manufactures colonists | 3 polymer |
| **Education** | School | 25 concrete, 10 electronics | — | children acquire traits | 2 electronics |
| | Martian University | 30c/10m/20e | 15 E | retrains colonists into specialists | 3 electronics |
| **Research** | Research Lab | 15 concrete, 8 electronics | 5 E | research, Wk 9 | 1 electronics |
| | Science Institute | 30c/20e/10p | 15 E | research, Wk 24 | 4 electronics |
| | Network Node (spire) | 50c/50m/20e | 20 E | **boosts dome-wide research** | 3 electronics |
| **Recreation** | Spacebar / Diner / Grocery / Casino / Art Workshop / Electronics Store / Open Air Gym / Playground | 8–40 concrete | 0–5 E; Diner 1 food, Grocer 1 food, Art 1 polymer/visit, Store 1 electronics/visit | Service Comfort 60/60/50/70/80/**100**/50/80 | 1–2 |
| | Hanging Gardens (spire) | 40 concrete, 10 polymer | **2 W only** | +100 service comfort, +30 residential comfort | 4 concrete |
| | Decorations (Garden, Lake, Fountain, Statue, Alleys, Stone Garden) | 1–4 concrete | 0 E (Jupiter 0.2 E) | +40 Service Comfort each | — |
| **Storage** | Universal Depot | — | — | 30 of each transportable resource | — |
| | Single-resource Depots (×8) | — | — | **180 units** each | — |
| | Dumping Site / Black Cube Depot | — | — | 70 waste rock / 81 black cubes | — |
| **Logistics** | Drone Hub | 12 metal, 8 electronics | 3 E | drone control radius | 1 electronics |
| | Recharge Station | 1 metal | 0.2 E | extends drone range | — |
| | Shuttle Hub | 10c/15p/10e | 10 E, **1 fuel** | long-range resource/colonist transfer | 1 electronics |
| | Tunnel | 80c/20m/30mech | — | connects separated map regions | — |
| | RC Rover / Transport / Explorer | 20 metal, 10 electronics | — | maintenance / haulage / anomaly scan | — |
| **Defence / hazard** | MDS Laser | 15 metal, 5 electronics | 10 E | shoots down meteors | 1 electronics |
| | Defense Tower / Energy Trap | 10–15 metal etc. | 10 E | anti-rival / anti-anomaly | 1 electronics |
| | Triboelectric Scrubber | 15 metal, 5 electronics | 1.8 E | **cleans dust off neighbouring buildings** | 1 electronics |
| | Subsurface Heater | 15 metal, 5 mech | 1.6 E, 1 W | prevents cold-wave pipe/cable breaks | 2 metal |
| | Sensor Tower | 1 metal, 1 electronics | 2 E | earlier disaster warning | 1 metal |
| | Security Station | 15 concrete, 5 metal | 2 E, Wk 3/shift | cuts crime and sanity loss **[via search]** | 1 concrete |
| **Wonders (one-per-game)** | Artificial Sun | 200c/300m/300p | big water burst | **1,000 E** | 3 polymer |
| | Moho Mine | 400c/100m/300mech | 40 E | 50 metal + 20 mech parts/sol | 3 mech |
| | Excavator | 100c/300m/300mech | 3 E | 50 concrete | 3 mech |
| | Landscape Dome | 400c/200m/300p | 40 E, 10 W | **+25 comfort to every living space** | 3 polymer |
| | Space Elevator / Omega Telescope / Project Morpheus | 400c+ | 40/80/110 E | free cargo launches / 3 breakthroughs / sanity-free sleep | 3 each |

**DLC additions.** *Green Planet* adds seven terraforming buildings — Forestation Plant, GHG Factory, Carbonate Processor, Core Heat Convector, Magnetic Field Generator, Lake beds, Open Farm — plus seven non-building Special Projects (space mirror, magnetic shield, ice-asteroid capture, cloud seeding, GHG import, polar-cap melt, vegetation seeding) **[via search]** (https://survivingmars.paradoxwikis.com/Developer_diaries, https://www.pcgamer.com/surviving-mars-below-and-beyond/). *Below & Beyond* adds underground caves reached by tunnels, an underground dome type and a fungal farm, plus rocket-propelled asteroid-mining buildings **[via search / partly UNVERIFIED]**. *Project Laika* adds ranches/pets. *Space Race* adds rival colonies and sponsors, not new life support. *Relaunched* (2025) reportedly removes dome oxygen consumption and cuts dome power ~50% **[via search]** (https://survivingmars.paradoxwikis.com/Domes).

> **[UNVERIFIED]** A fan site https://survivingmarsrelaunched.wiki/buildings/ gives materially different figures (MOXIE 10 O/sol, Farm 20–25 food/sol with 10 botanists, Micro Dome tier, Research Lab 150–300 research/sol). It conflicts with the Paradox wiki on worker counts and oxygen rates; treat as unreliable and do not mix with the table above.

### 1.2 Aven Colony

All structures come in **explicit Tiers 1–3 upgraded in place on the same footprint**. Sources: https://avencolony.fandom.com/wiki/Electricity_structures, /Farming_structures, /Water_extraction_structures, /Residential_structures, /Services-related_structures, /Mining_and_processing_structures, /Megastructures (all **[via search]**), plus https://steamcommunity.com/sharedfiles/filedetails/?id=1481211174 and https://notesread.com/general-guide-to-aven-colony/.

| Category | Structures | Numbers known |
|---|---|---|
| Power | Geothermal Generator (must sit on a vent), Solar Panel T1–3, Wind Turbine, Zorium Generator, Energy Battery, Lightning Tower, Transceiver | Geothermal T1 **200 power/hr, 10 workers**; T2 **260**. Solar T1/2/3 = **8 / 18 / 26 power/hr**, no workers, **halved in winter**. Wind Turbine **6/hr**, no workers. Transceiver pipes in **400 (winter) / 800 (else)** from an off-map solar farm. Lightning towers charge batteries during storms. |
| Water | Water Pump T1–2 (output depends on tile), Atmospheric Condenser T1–2 (fixed yield **+ air quality**), Water Treatment Plant | Treatment Plant **18 power/hr**, output depends on adjacency |
| Air | Air Filter (removes pollution), Intake Fan / Blower (pushes air, but **lets spores in during spore events**), Wind Turbine "fan mode" (burns power to push toxic gas), Scrubber Drone Hub (clears spores off buildings) | A new filter takes ~1/4–1/5 sol to take effect |
| Food | Farm T1–3, Greenhouse T1–2, Mill (processing), Chemical Plant (food enhancers, vaccines) | Farm **5 power, 5 workers**; Greenhouse **8 power, 6 workers**; Mill **18 power, 18 workers**. Farm T1 costs 9 nanites vs Greenhouse T1 at 21. Farms ≈ greenhouse yield in summer only. |
| Mining | Mine T1–3, Laser Mine (faster, destroys some material), Iron/Copper/Potash/Zorium mines | — |
| Refining | Nanite Processor (Iron + Copper → **Nanites**, the build currency), Mill, Chemical Plant | — |
| Housing | Outpost/Apartments T1–3, Habitat T1–3, Skyscraper T1–2 | Outpost (Apartments 01) = **18 nanites, 8 power/hr, 16 colonists**; Habitat T3 = **66 colonists**; Skyscraper T2 = **94 nanites, 32 power/hr, 120 colonists** |
| Medical | Clinic T1 → Hospital T2 | Hospital T2 = **52 nanites, 18 power/hr, 18 workers, +8 health morale** |
| Recreation | Park, Bar & Grill / Eatery, VR Center, Stimulant Distribution Point, Shopping Center | **VR Center +12 entertainment morale**; Park adds air quality *and* entertainment morale |
| Megastructures | Stadium, Earth History Center, Space Elevator | Stadium and Earth History Center each **+36 entertainment morale**, 4×4 footprint, heavy worker cost. Space Elevator = most expensive building, **brings 23 colonists per trip** + large storage |
| Security | Police Drone Hub T1–3 | crime reduction; crime is a direct morale drain |
| Immigration | Immigration Center | fully staffed = **9 new colonists per trip**; a second one doubles intake; can be switched off or banned by policy |
| Storage | Storage Module (buildable on "deadspace") | water routinely eats ~1/3 of total storage |
| Defence | Plasma Turret / Plasma Gun | holds back creep; buildable on deadspace to extend perimeter |
| Logistics | Construction Drone Hub, Tunnels, Trade Hub, Research Center | tunnels define which tiles are "live"; untunnelled tiles are deadspace usable only by unmanned structures |

Air-pollution ranking (worst → least): Zorium generators > Zorium mines > mills > chemical plants > geothermal plants > ore mines > nanite processing.

### 1.3 Per Aspera

Robot-run Mars terraformer; colonists are passengers, not workers. Sources: https://peraspera.fandom.com/wiki/Building, /Colonies, /Mine, /Worker_Hub, /Research (**[via search]**), https://steamcommunity.com/sharedfiles/filedetails/?id=2307471419, https://steamcommunity.com/sharedfiles/filedetails/?id=2877525501.

| Category | Buildings | Numbers |
|---|---|---|
| Power | Solar Panel Field (~**30 MW**), Wind Turbine / Wind Farm (~**50 MW**), battery storage | Solar releases stored power at night |
| Water | Water Extractor L1–3, Water Treatment Plant, Water Booster Pump, Water Packing Plant (**20 ML water → ice**) | cannot extract from surface oceans; must drill |
| Air/terraform | Oxygen Release Plant, **Oxygen Capture Plant (removes 5 ɥBar O₂/cycle)**, GHG Factory, lichen/cyanobacteria/grass/tree seeding | over-seeding lichen pushes O₂ so high that **buildings catch fire** |
| Food | Food Factory L1–3, Fishery (**1 food/cycle**, must be built in water, ≥10% soil fertility, 30 ML water) | a T3 colony of 500 needs ~10 food; an Open City of 5,000 needs ~30 |
| Mining | Aluminium / Iron / Carbon / Silicon / Rare-earth Mines, tiered | basic Aluminium Mine ≈ **2.8 Al/month at 5 MW**, 10-sol production time, 3 steel to build; **nodes deplete** |
| Refining | Steel Factory (Iron+Carbon), Electronics Factory (Silicon+Aluminium), Parts Factory, Glass Kiln, Polymer Factory, Chemical Plant, **Worker Factory** (builds the drones) | Electronics Factory L1→L3 upgrade costs Al/Steel 3 / 10 / 20 |
| Habitation | Colony (100) → Advanced Colony (**250**, 150 RP) → Superior Colony (**500**, 750 RP) → Dome City (**1,000**, 10,000 RP, needs Water Supply Network) → Tent City / Open City (~5,000) / Metropolis | colonies **produce Research Points** when fed food + water |
| Research | Research Outpost, Research Lab | each fully staffed lab gives a **compounding +5%**; 10 labs ≈ **+62%**, not +50% |
| Logistics | Worker Hub (**2 Al, 2 Steel, 1 Electronics, 2 MW**, houses one worker drone; auto-unlocked by building a Steel Factory), Maintenance Facility (drones repair buildings; **production collapses without them**), Hyperloop, Spaceport, Space Elevator, Lander, Areological Scanner | Maintenance facilities chain when adjacent; spaceports run repeatable Special Projects such as Colonist Migration and GHG import |
| Defence | (Military research tree exists; combat is the game's weakest system per reviews) | — |

### 1.4 Planetbase

Everything indoors is a **room inside a connected dome graph**; oxygen propagates through connections, so layout *is* the life-support mechanic. Sources: https://steamcommunity.com/sharedfiles/filedetails/?id=1206732949, https://steamcommunity.com/sharedfiles/filedetails/?id=884301987, https://planetbase.fandom.com/wiki/Category:Interior_Structures and /Bio-Dome (**[via search]**). Costs are Steel-Bioplastic-Semiconductor by size.

| Category | Structure | Cost by size | Notes |
|---|---|---|---|
| Power | Solar Panel | 2/4/7/10-0-0 | needs regular maintenance; put near airlocks |
| | Wind Turbine | 1/2/4/7-0-0 | as above |
| | Power Collector | 1/2/4/7-0-0 | battery; daisy-chainable |
| Water | Water Extractor | 1/2/4-0-0 | unmanned; place far out |
| | Water Storage Tank | 1/2-0-0 | removes the need to cycle the O₂ generator for Bio-Dome water |
| Air | O₂ Generator | 1-1-0 / 2-2-0 | **consumes water**, unmanned; recommended ≈ one per other structure; **an overtaxed O₂ grid cascades base-wide even when the production readout looks fine** |
| Food | Bio-Dome | 2-2-0 … 10-10-0 | vegetable pads **4 → 24** by size; one dome usually dedicated to Starch for bioplastic; plants rot if not moved to Storage |
| | Canteen (+ Meal Maker, Tables, Drinking Fountain) | 2-2-0 / 4-4-0 | heavy O₂ draw |
| Mining | Mine | 2-0-0 | exterior; airlocks connect straight to it |
| Refining | Processing Plant (Ore Processor, Bio Processor) | 2-2-0 / 4-4-0 | ore → metal; starch → bioplastic |
| | Factory | 2-2-0 / 4-4-0 | semiconductors, spares, arms |
| Housing | Dorm (bunks) / Cabin | 2-2-0 / 4-4-0; 1-1-0 / 2-2-0 | medium Dorm = **6 bunks = 24 colonists**; dorms/cabins/sickbays are dead ends (no further connections) |
| Medical | Sick Bay (+ Medical Cabinet) | 1-1-0 / 2-2-0 | recommended **one per Dorm of equivalent size** |
| | Lab (Med Lab) | 1-1-0 / 2-2-0 | produces **meds and lab-grown meat** |
| Control | Control Center | 2-2-0 / 4-4-0 | hosts Telescope / Security / Radio consoles; sets base-wide **Alert levels** (yellow = storm lockdown) |
| Recreation | Bar, Multi-Dome | 2-2-0 / 4-4-0; 1-1-0 … 4-4-0 | morale |
| Storage | Storage | 2-2-0 … 10-10-0 | preserves food and medicinal plants |
| Robotics | Bot Workshop / Bot Repair | 2-2-0; 1-0-2 | builds carrier + construction bots |
| Defence | Telescope (meteor detection, **5 recommended**), Anti-Meteor Laser (5-2-2, **up to 3**), Lightning Rod, Armory, Security Console | | before lasers exist a single meteor killed **12–19 colonists per hit** in a crowded Bio-Dome |
| Logistics | Airlock (1-1-0), Landing Pad (**5 kW**), Starport (**33 kW**, needs a dedicated jumbo panel + collector), Radio Antenna, Signpost, Connection corridors (each corridor **drains power; longer = worse**) | | |
| Monuments | Pyramid (10-20-0), Monolith (30-10-10) | | pure prestige/score |

### 1.5 Stardeus

Fully fetchable official codex: https://stardeusgame.com/codex/. The complete device index (from https://stardeusgame.com/codex/database/objects/devices/battery/ sidebar) is ~200 entries. Grouped selection:

- **Power:** Solar Panel (3 kW) → Solar Panel Array (15 kW) → Solar Panel Array (50 kW); Matter Reactor (20 kW) → Matter Reactor (150 kW) → Nuclear Reactor (**1 MW**); Battery (50 kW, **1.67 MWh**, 2×1, cost 2 Steel Plate + 1 Microchip + 5 Copper Wire + 1 Battery Cell) → Battery (150 kW) → Nuclear Battery (500 kW); Particle Collector; Switch; Wall/Floor Sockets and Connectors (4-20, 8-12, 16-12) as the grid.
- **Air / life support:** Oxygen Pump (**5 kW**, 2×1, 85% cover, indoors only; research chain Life Support → Atmosphere Control → Improved Oxygen Production; cost 2 Titanium Plate + 1 Glass + 2 Copper Wire + 1 Microchip), Mini Oxygen Pump, **OxyMatic Floor** (oxygen as a floor tile), Atmosphere Generator, Vent / Interior Vent / Armored Vent / Reinforced Vent / Floor Vent, Biosphere Generator, Ocean Generator, Terrain Generator, Terraform Controls.
- **Thermal:** Heater, Mini Heater, Radiator, Heat Sink, **HeatMatic Floor / CoolMatic Floor**, Freezer, Ice Maker.
- **Food:** Mini Planter, Large Planter, Cooking Station, **Auto Kitchen**, Pantry, Large Pantry, Refrigerator, Tube Feeder, Nutrient Extractor (**15 kW**, 2×2, 100% cover, produces heat; research Production → Biochemical Extraction; cost 8 Steel Plate + 4 Gears + 2 Rubber + 3 Transistor + 1 Copper Wire), Beverage Cooler, Coffee Machine, Pet Bowl.
- **Production:** Assembler, Assembly Hub, Fabricator, Crafting Station (5–200 kW), Refinery, Furnace, Centrifuge, Grinder, Shredder, Loom, Replicator, Converter, Disassembler, Recycler, Nanobot Hive, Auto Painter, Autodrill Rig, Beam Drill.
- **Research / computing:** Research Station (**20–150 kW**; produces Biotic/Phyto/Synthetic/Alien Datoids; chain Computing → Basic Research → Research Station), Basic → **Advanced (40–150 kW)** → Quantum Data Harvester, Datoid Loader, Ship Computer → Quantum Ship Computer, CPU Module 1/2 THz, GPU Module 1/2 THz, Memory Module 1/2 EB, Disk Module 8/24 ZB, ML Booth, Telescope, Radar, System Scanner, Xenodetector.
- **Medical / bodies:** AutoDoc, Surgery Hub, Cloning Pod, Mechuary, Morgue, Organ Storage, Stasis Pod, **Stasis Array (5–375 kW, with a built-in switchable oxygen pump)**.
- **Comfort / recreation:** Sleeping Pod, Wooden/Steel Bed, Double Beds, Sofa, Armchair, Arcade Cabinet, Jukebox, **Karaoke Machine**, Treadmill, Shower, Toilet, Wardrobe, Tables/Chairs, Pet Bed, Rubber Duck, Vase, statues, emblems, chess sets (pure decor).
- **Storage / logistics:** Storage Unit (500) → Storage Unit (2000), Part Storage, Bot Dock, Charge Station, Repair Station, Teleporter, Winch Anchor/Hook, Tractor Beam (+Target), Trade Portal, Exit Booth, Airlock, Door / Interior Door.
- **Defence:** Mini Turret, Interceptor Turret, Heavy Laser, Gauss Striker, Shredder Cannon, Fluid Cannon, Shield Emitter, Flux Capacitor, Flux Vent, Battle Station, Bridge Controls, Emergency Siren, **Trap Floor**, Sandbag, Weapons Locker, Firefoam Capsule, Intrusion Suite, Beta Wave Emitter, Sector Nuke, Void Ripper.
- **Propulsion:** Thruster, Fusion Drive, FTL Drive, Local / Horizon Warp Drive, Maneuvering Controller, Rocket Pod (5–50 kW), Shuttle, Return Beacon, Breach Capsule Port.

Stardeus is notable for how many *structural* elements are devices with stats (floors that make oxygen, floors that heat/cool, armored vs reinforced vs interior walls), i.e. the terrain is the building list.

### 1.6 Space Haven

Official wiki (fetchable): https://bugbyte.fi/spacehaven/wiki/index.php/Facilities.

| Category | Facilities |
|---|---|
| Power | Power Generator (core module, burns **Energy Rods**), Power Node (distribution), Power Capacity Node (battery), Solar Panel |
| Air | **Life Support** (makes oxygen, **requires water**), Gas Scrubber (removes CO₂/smoke/toxins, electricity only), Thermal Regulator, Air Vent |
| Water | Water Purifier (**ice → purified water**), Water Collector (**condenses crew-exhaled water vapour back out of the air**), Composter (organic waste → water + materials), Toilet (**waste → water**, crew-operated) |
| Food | Grow Bed (needs water + temperature + light + CO₂), **CO₂ Producer** (burns carbon to feed plants), Kitchen, Algae Dispenser (direct algae meals, mood/health penalty), Autopsy Table (butchers creatures) |
| Industry | Assembler (soft/hull/infra blocks) → Advanced Assembler (tech/energy blocks), Metal Refinery, **Energy Refinery** (energy crystal → energy rods; raw hyperium → hyperfuel), Chemical Refinery, Optronics Fabricator, Micro-Weaver, Recycler, Tools Facility |
| Housing/comfort | Bed, X1 Couch, X1 Table/Chair, Light, Arcade Machine, Jukebox |
| Medical/science | Medical Bed, Research Lab (archived Earth data → tech), Research Workbench (reverse engineering), Hypersleep Chamber (**consumes energy rods**), Enslavement Facility (slave collars) |
| Storage | Large Storage, Body Storage, Robot Storage |
| Ship systems | Hull Stabilizer (stacking hull strength, **gates hyperjumps**), Hyperdrive, Navigations Console, Operations Console, Weapons Console, Shields Console — **each console needs a crew member** |
| Defence | Energy Turret (anti-shield), Missile Turret (useless vs shields), Shield Generator, Scanner, Targeting Jammer, Cover Object |
| Logistics | Shuttle Hangar, Pod Hangar, X1 Airlock, Space Suit Locker, Spacesuit Door, Logistics Robot Station, Salvage Robot Station, Robot Workbench |

Numbers **[via search, Fandom]**: one crew member consumes **180 oxygen/in-game hour (4,320/day)** and exhales ~1,800 water vapour and ~1,800 CO₂ per hour; Oxygen Generator listed at **5.0 power/s, output 60 oxygen**, with comfort penalties of **−10 work / −10 rest / −20 sleep** for being near it. Those units don't reconcile cleanly with the official wiki — **[UNVERIFIED]**. Build guidance: ~one oxygen generator + one gas scrubber + one thermal regulator per **15×15 tiles**.

### 1.7 IXION

One generation ship, six sectors, each 56×30 tiles (≈1,680), each with its own food/water and a local **Stability** score. Sources: https://www.thegamer.com/ixion-best-layouts-sectors/, https://steamcommunity.com/sharedfiles/filedetails/?id=2904770584, https://steamcommunity.com/sharedfiles/filedetails/?id=2900017241, https://ixion.fandom.com/wiki/Buildings (**[via search]**), https://www.gamepressure.com/newsroom/ixion-non-workers-workers-and-colonists-population-explained/z64df8.

| Category | Buildings | Numbers |
|---|---|---|
| Power | Battery (tiered), Nuclear Power Plant (**hydrogen → energy, emits waste**), Solar panels (exterior) | power shortage blocks hull repair *and* food production |
| Water | Fusion Plant (**ice → water**; water cannot be transferred between sectors), Water Treatment Plant (**25 waste/cycle**) | |
| Food | Insect Farm (≥1 per 50 crew early), Crop Farm (weakest), Algae Farm (**8+ food/cycle**, best; fully upgraded feeds ~1,200 crew), **Mushroom Wall** (**14 food / 1.7 cycles from ~3.5 waste/cycle, no water**) | |
| Refining | Steel Mill (→ Alloys), Polymer Refinery, Electronics Factory, Workshop, Waste Treatment Center (waste → resources, counts for *two* specialisations) | ≥2 Steel Mills per industrial sector, always on |
| Housing | Crew Quarter (**30 steel / 2 units**) → Domotic Quarter (**80 steel / 1 unit**) → Optimized Quarter (replaces 2 Crew Quarters), Cell Housing | |
| Population | Cryonic Center (thaws pods into workers/non-workers), Colonist Training Center, Alternative Life Center, Colonization Center | |
| Medical | Infirmary (per-sector Health), Medical Center, Secondary Health Center | |
| Research | Tech Lab, Observatory (**one-off permanent bonus — then scrap it**) | |
| Stability-only | Marduk Memorial, Genetic Conatus Memorial, Lunaclysm Memorial (all upgradeable), Mess Hall, **Exo-Fighting Dome** (ship-wide morale) | Population Tier 2 specialisation gives **+1 stability to buildings** |
| Hull / exterior | **EVA Airlock** (the only hull repair), Probe Launcher, Docking Bay, Science Ship berth | each opened sector = **−8 hull/cycle**; each VOHLE jump = **−20 hull/cycle** **[via search, namu]** |
| Storage / logistics | Storage, Drone Bay, roads (roads don't count toward specialisation) | |

**Sector specialisation** is a second gating layer: meeting a threshold count of same-symbol buildings (reported thresholds 4, 6, 10, 12, 25, 54) grants Tier 1 / Tier 2 bonuses; Tier 2 typically needs **700–800 of 1,680 tiles** dedicated. Buildings count even when switched off. Specialisations: Food, Recycling, Space, Industry, Population.

### 1.8 Oxygen Not Included

Categories per https://oxygennotincluded.wiki.gg/wiki/Buildings: Base, Oxygen, Power, Food, Plumbing, Ventilation, Refinement, Medicine, Furniture, Stations, Utilities, Automation, Shipping, Rocketry, Radiation, Special.

**Oxygen** (https://oxygennotincluded.wiki.gg/wiki/Oxygen):
| Building | Input | Output |
|---|---|---|
| Electrolyzer | 1 kg/s Water | **888 g/s O₂ + 112 g/s Hydrogen** (600 kg water/cycle, 88% eff.) |
| Oxygen Diffuser | 330 kg Algae/cycle | O₂ |
| Algae Terrarium | 180 kg Water + 18 kg Algae/cycle | O₂, **130% eff. (170% lit), zero power** |
| Rust Deoxidizer | 750 g/s Rust + 250 g/s Salt | **570 g/s O₂ + 30 g/s Chlorine + 400 g/s Iron Ore** |
| Deodorizer | Polluted O₂ + Sand/Regolith | O₂ |
| Oxyfern | 19 kg Water + 4 kg Dirt/cycle | O₂, 98% |
| Alveo Vera | 20 kg Ice + 1.2 kg CO₂/cycle | O₂, 90% |

**Power** (https://oxygennotincluded.wiki.gg/wiki/Power, https://oxygennotincluded.wiki.gg/wiki/Coal_Generator): Manual Generator (duplicant labour), **Coal Generator = +600 W, 1,000 g/s coal, 600 kg internal store, +20 g/s CO₂ at 110 °C, +9 kDTU/s, overheats at 75 °C**, Wood Burner, Natural Gas Generator, Hydrogen Generator, Petroleum Generator, Steam Turbine, Solar Panel, Peat Burner. Storage: Battery, Smart Battery **20 kJ**, Jumbo Battery **40 kJ**, Power Bank **120 kJ**, Atomic Power Bank (60 W for 150 cycles = 5.4 MJ). Wires: normal → Conductive (**×2**) → Heavi-Watt (**×20**, big decor penalty, can't go inside tiles) → Insulated Conductive (×2 of conductive) → Heavi-Watt Conductive (**×50**). Transformers protect against overload.

**Food** (https://oxygennotincluded.wiki.gg/wiki/Food): duplicant needs **1,000 kcal/cycle** (1,500 with Bottomless Stomach). Planter Box → Farm Tile → Hydroponic Farm; cooking chain Electric Grill (Meat 3,200 → Barbeque 4,000; Mushroom 2,400 → Fried 2,800) → Gas Range (4,000–6,000 kcal dishes) → Deep Fryer / Smoker / Sushi Bar; Microbe Musher as the water-hungry emergency option (Liceloaf 1,700 kcal/kg); Ration Box holds Nutrient Bars (16,000 kcal).

### 1.9 Surviving the Aftermath (comparison case)

Best dump: https://steamcommunity.com/sharedfiles/filedetails/?id=2662896323 (v1.21.2 — may be stale); also https://sta.paradoxwikis.com/List_of_buildings (blocked, **[via search]**).

- **Shelter:** Tent 3 → Crowded Tent 6 → Emergency Shelter 6 → Crowded Emergency Shelter 9 → Shanty 4 → Improved Shanty 5 → Tenement 8 → Improved Tenement 10 → House 5 → Two-story House 10 (+Heated variants). Capacity-per-tile ranges 0.10–0.30 — housing is explicitly a density puzzle.
- **Water:** Water Well / Drilled Well (2×2, **~4 water per tile, no energy — the best ratio**), Water Collector (1 worker, shore), Bore Well (**25 output**, ~1.67/tile), Water Pump (~2.22/tile), Clean Water Storage 500 / Large 1,200, Water Tower 500 / Large 1,200. Colonists use **1 water each, doubled in a heat wave**. Paradox-wiki output figures: Well 12, Collector 14, Bore Well 25.
- **Food:** Trapper, Fishing Pier/Hut, Aqua Farm, Ranch / Large Ranch (animal water use: chicken 1, sheep/pig 2, cattle 3), Small/Medium/Large Field (+Irrigated variants, 1/2/3 workers), Green House, Insect Farm, Cookhouse, Mess Hall, Mill, Bakery. Yield/tile/day: Potatoes 0.73, Cabbage 0.77, Corn/Carrot/Wheat 0.96, Soybeans 0.95, Flax 0.57, Sunflower 0.48, Greenhouse Herb 1.37, **Greenhouse Peanuts 1.59**.
- **Resources:** Scrapper / Advanced Scrapper, Recycler / Advanced Recycler, Concrete Scavenger, Lumber Yard, Sawmill, Logging Camp, Forester, Concrete/Metal/Plastic Extractors → **Auto-Extractors (no workers)**.
- **Products:** Tailor / Grand Tailor, Toolshop / Grand Toolshop, Mechanic Shop, Maintenance Depot, Environmental Station, Gunsmith / Grand Gunsmith, Refinery, Electronics Factory.
- **Health:** Outhouse, Toilet, Medical Tent, Field Hospital, Medical Lab, Burial Pit, Cemetery, School, Sauna / Steam Sauna, Burner / Boosted Burner, Radiator / Industrial Radiator (heating).
- **Happiness (entertainment points):** Memorial 10, Brawl Pit 10, Shrine 15, Botanical Garden 15, Public House 20, Library 25, Movie Theater 25, **Stormdome 40, Game Arcade 40**. Requirement: **total entertainment ≈ 2× population**.
- **Energy:** Solar Panel (3×3) / Large Solar Panel (7×3), Wind Turbine (3×3, **best per tile**) / Large Wind Turbine, Transformer, Battery Rack 2,000 / Large Battery Rack 6,000, Lightning Rod / Tower. Solar and wind both **stop during magnetic storms**.
- **Exploration/defence:** Gate, Scout Tower, Guard Post, Engineer Depot, Outpost Depot, Trade Center, Garage, Radar, Campsite, Doomsday Bunker (16×16).
- **Storage:** Stockpile 1,500 (94/tile), Food Storage 500, Warehouse 500, General Storage 2,500, Waste Dump 500.

### 1.10 Offworld Trading Company (buildings only)

Official wiki (fetchable): https://wiki.offworldgame.com/index.php/Buildings. No research gate; everything is an economic converter whose value is set by a live commodity market.

| Building | Build cost | Inputs → output |
|---|---|---|
| Solar Panel | 20 Al, 100 Si | — → Power |
| Wind Turbine | 20 Al, 80 C | — → Power |
| Geothermal Plant | 40 Al, 120 Steel | — → Power |
| Nuclear Plant | 20 Al, 80 Steel | Water + Uranium → Power |
| Water Pump | free | Power → Water |
| Solar Condenser (water) | 5 Glass | — → Water |
| Solar Condenser (O₂) | 10 Glass | Power → Oxygen + Carbon |
| Electrolysis Reactor | 40 Steel, 10 C | Power + Water → **Oxygen + Fuel** |
| Greenhouse Farm | 20 Steel, 10 Glass | Power + Water → Food |
| Metal Mine / Elemental Quarry | free | Power → Uranium/Al/Fe, Si/C (by deposit) |
| Steel Mill | 20 Fe | Power + Iron → Steel |
| Glass Kiln | 40 Steel, 20 Si | Power + **Oxygen** + Silicon → Glass |
| Chemicals Refinery / Chemicals Lab | 40 Steel+20 C / 20+20 | Power + Fuel + Carbon → Chemicals |
| Electronics Factory | 20 Al, 40 Steel | Power + Al + C + Si → Electronics |
| Pleasure Dome | — | income scaling with colony population |
| Offworld Market | 100 of a resource + 20 Al + 20 Fuel per launch | sells offworld; **10% faster per adjacent warehouse** |
| Hacker Array | $2,000 first use, exponential after | sabotage |
| Optimization Center | chemicals, rising per tier | **4 tiers, +25% output each** |
| Patent Lab | chemicals | 12 one-per-game global patents (see §5) |

### 1.11 Space Colony (2003) — the needs-appliance model

Full object list at https://spacecolonyfans.net/sc_ref_main.html (fetchable). This is the richest *variety* reference of the lot, because nearly every building services one specific named need.

- **Bridge:** Medi Prep Desk, Oxygen Desk, Power Desk, Cash Machine (pays salaries — money is a *need*).
- **Engineering:** Airlock, Small/Medium/Large Bio Dome, Oxygen Plant, Solar / Iridium / Lava Power Plant, Corridor, Light, Cleaning Post, Maintenance Post, Engineering Repair Facility, Space Bike Post, Warehouse.
- **Food & drink:** Bar, Luxury Bar, Mess Hall, Restaurant.
- **Human resources:** Counseling Robot, Cryogenic Reanimation Unit, Detention Facility, Personal Hygiene Pod, Library, Medi Bay, Meditation Room, Relaxation Pod, Training Pod.
- **Industry:** Bio-Research Lab, Chicken Farmer Unit, Cybernetics Lab, Electronics Fabricator, Argon Gas Rig, Industrial Robotics Factory, Military Robotics Factory, Iron / Silicon / Titanium Extractor, Nutrient Extractor, Pharmaceutical Extractor, Scavenger Bunker, Weeding Post.
- **Military:** Automatic / Manual Laser, Cluster Bomb, Commando Robot, Dogbot, Force Field Post, High-Powered Force Field Post, Hovermine Delivery System, Military Radar, Missile Silo, Sentinel Post + Patrol Markers, Space Defense Shield, Soldier Robot.
- **Recreation:** Combat Arena, Disco, stair climber / rowing machine / running machine, Jacuzzi, Observatory, Piano, Sauna, Virtuality Chair, Zero-Gravity Playroom.
- **Tourism (a whole parallel economy):** Art Exhibits, Garden Dome, Golf Tee, 1/2/3-Room Hotels, Tourist Port, Slot Machine, Viewing Platform, Zoo Exhibits.

Firefly advertised "**more than 100 different buildings**" (https://fireflyworlds.com/press/sheet.php?p=Space+Colony).

### 1.12 Mars Horizon

Largely **not** a colony builder; base buildings are agency facilities with flat modifiers: Mission Control (parallel missions), Vehicle Assembly Building, three sizes of Launch Pad, Research Labs (incl. Robotics Research Lab), Astronaut Training facilities, Neutral Buoyancy Lab. Research is split into missions / buildings / vehicles trees. Reviewers call the base layer vestigial: "*Base building is another disappointment… it seems like there's little need for this part of the game to exist*" (https://thirdcoastreview.com/2020/11/17/game-review-mars-horizon, https://www.space.com/mars-horizon-space-game-review). **Not a useful model for Earth Light.**

---

## 2. LIFE-SUPPORT CHAINS AND FAILURE

Chain depth = number of distinct converters between raw map resource and a satisfied colonist need.

| Game | Power | Water | Oxygen | Food | Depth | Failure behaviour |
|---|---|---|---|---|---|---|
| **Surviving Mars** | Solar/Wind/Stirling → cables → grid; Accumulators buffer night (Solar) | Water Extractor on deposit **or** Moisture Vaporator (1 W for 5 E) → pipes → dome; Water Reclamation Station recovers ≤70% | MOXIE (2 E → 2 O) → pipes; **in-dome crops also emit O**; dome itself consumes 1–4 O | Farm (0 power, in-dome, water by crop) or Hydroponic Farm or Mushroom Farm (eats 2 O + 0.5 W) → dome food store | **2** (very shallow and deliberately so) | Missing oxygen/water/power for ~a sol = randomised **health and sanity** penalties (oxygen can exceed 100 damage); starvation ≈ **−2 health/hour**; 0 health = death (Project Phoenix gives a 50% rebirth). Buildings break down on missed maintenance, cold waves snap pipes/cables, dust storms stop MOXIE and dirty solar panels. https://steamcommunity.com/sharedfiles/filedetails/?id=1748501548 |
| **Aven Colony** | Geothermal on vents / solar / wind / Zorium / Transceiver import; **winter halves solar and food** | Water Pump (tile-dependent) or Atmospheric Condenser → Water Treatment Plant | Not a stock — **air quality** is a per-tile field polluted by industry and cleaned by Air Filters / Condensers / Parks | Farm or Greenhouse → Mill → prepared food; Chemical Plant makes enhancers and vaccines | **2–3** | Food and water shortfalls hit **colony-wide morale**; air and power shortfalls hit only **locally**. Spores enter through Intake Fans and cause fatal blight; cure needs Hospital + vaccine from Chemical Plant. Pre-sol-50, one creep tile reaching the colony = instant loss. |
| **Per Aspera** | Solar Field (~30 MW) / Wind (~50 MW) | Water Extractor L1–3 → Treatment Plant → Booster Pump → Water Supply Network; Water Packing Plant makes ice | **Atmospheric, not per-building**: lichen/plants + Oxygen Release Plant raise global O₂; Oxygen Capture Plant removes it | Food Factory L1–3, Fishery (water-sited) → colonies | **3–4** (deepest of the terraformers) | Mines deplete; **without Maintenance Facilities production collapses**; unfed colonists emigrate to Earth and research output falls; **too much** oxygen sets buildings on fire. |
| **Planetbase** | Solar + Wind → Power Collector; every corridor leaks power | Water Extractor → Storage Tank | **O₂ Generator consumes water** and oxygen diffuses only through connected rooms | Bio-Dome vegetable pads → Storage → Meal Maker in Canteen; Bio-Dome starch → Bio Processor → bioplastic; Lab → meat + meds | **3** (water → O₂ → room; veg → meal) | Night power collapse; **an overtaxed oxygen grid cascades base-wide even when the production readout looks adequate**; crops rot if not stored; a blocked Ore/Bio Processor silently halts the chain; meteor strikes kill 12–19 at once in a crowded dome. |
| **Space Haven** | Energy Crystal → **Energy Refinery → Energy Rods → Power Generator** → Power Nodes | Asteroid ice → Water Purifier; Water Collector reclaims exhaled vapour; Toilet and Composter return waste water | **Life Support burns water → oxygen**; Gas Scrubber removes CO₂ | CO₂ Producer (carbon) + light + Thermal Regulator → Grow Bed → Kitchen; Algae Dispenser as fallback | **4** (deepest in the set: crystal→rod→power→O₂, and ice→water→O₂) | Loss of water stops oxygen, which stops breathing; crew suit up via Airlocks and survive a while; hull breach vents a room's atmosphere; losing Hull Stabilizers blocks hyperjumps. |
| **IXION** | Nuclear Power Plant (hydrogen → energy + waste), batteries | Docking-Bay ice → **Fusion Plant → water**, non-transferable between sectors; Water Treatment Plant eats 25 waste/cycle | Not modelled as a resource | Insect Farm / Crop Farm / Algae Farm (water) **or Mushroom Wall (waste, no water)** | **3** per sector, ×6 sectors in parallel | No power = no hull repair, no food. Hull decays **−8/cycle per open sector, −20/cycle per VOHLE jump**; at 0 the one-shot expanding foam gives 30 cycles to hold ≥10% for 10 straight cycles, else game over. Bad Worker Conditions cause accidents, delays and deaths, then Stability loss; Stability collapse = mutiny ending. |
| **Oxygen Not Included** | Manual → Coal (600 W) → Natural Gas / Hydrogen → Petroleum → Steam Turbine / Solar; everything makes heat | Water is terrain; Pumps, pipes, Water Sieve (polluted→clean), Desalinator (brine→water) | Algae Terrarium → Oxygen Diffuser → **Electrolyzer (water → O₂ + H₂, the H₂ then feeds a Hydrogen Generator)** → Rust Deoxidizer | Muckroot → Microbe Musher → Planter Box/Farm Tile/Hydroponic Farm → Electric Grill → Gas Range → Deep Fryer | **5–7, and cyclic** — heat and byproduct gases close loops back onto themselves | Nothing is instant: oxygen deficit → low-oxygen debuff → suffocation; heat creep kills plants and overheats machines (Coal Gen overheats at 75 °C); germs, flooding, and a wire overload cascade. Every generator's waste heat/CO₂ is itself a new problem. |
| **Surviving the Aftermath** | Solar / Wind (both stop in magnetic storms) → Transformer → Battery Rack | Well/Bore Well/Pump → Clean Water Storage/Tower; **1 water per colonist, 2 in a heat wave** | n/a (Earth) | Field/Ranch/Fishing → Mill/Bakery/Cookhouse/Mess Hall | 2–3 | Shortage → sickness, unhappiness, colonists leaving; weather events (heat wave, magnetic storm, acid rain) hit the generators and water demand at once. |
| **Offworld Trading Company** | Solar/Wind/Geothermal/Nuclear | Water Pump, Solar Condenser | Electrolysis Reactor, Solar Condenser | Greenhouse Farm | 2–3, but **a shortfall is bought on the market**, not a death spiral — the fail state is bankruptcy/hostile takeover | |
| **Space Colony (2003)** | Solar / Iridium / Lava Power Plant + Power Desk | (abstracted) | Oxygen Plant + Oxygen Desk | Bio Dome → Nutrient Extractor → Mess Hall / Restaurant; Chicken Farmer Unit | 2–3 | Oxygen/power are base-wide gauges; the real fail state is **operative mood collapse** — unhappy colonists simply stop working. |

---

## 3. POPULATION / COLONISTS

**Surviving Mars** — the densest model, and the best single reference. Per https://steamcommunity.com/sharedfiles/filedetails/?id=1748501548 and https://survivingmarsrelaunched.wiki/colonists/:
- Four tracked stats: **Comfort, Sanity, Health, Morale**. **High = 70+, Low = ≤29.**
- **Comfort:** +10 per service visit (decorations +5, Medical Center +25), but **only if current comfort is below that building's Service Comfort rating** — which is why service buildings are rated 40–100. Resting at home +4…+6. Losses: −10 missed daily interest, **−20 homelessness**, −3 unprepared meal. High comfort = +5 morale, +5 work performance; low = −10 each. **At 0 comfort an Earthborn becomes "Earthsick", stops working and leaves on the next rocket** (recovers at 70+); Martianborn only take −10 morale. Guide ratio: ~1 Grocer + 1 Diner per 50 colonists.
- **Sanity:** +5 per night's rest; Infirmary +10, Medical Center +20, Playground +10, Temple spire ~+100. Losses: **−10/sol per "sanity-abusing practice"** (Heavy Workload, Night shift, working outside a dome), ~10/sol during cold waves and dust storms, **−15 to everyone in the dome when a colonist dies**. Net: one abuse = −5/sol, two = −15/sol, three = −25/sol; one abuse with no medical care = breakdown in **~20 sols**. At 0: **1% immediate suicide roll**, 30% chance of gaining a new Flaw, then 3 sols "Stressed Out" and +50 sanity. Medic ratios: 1 medic per 40 pop for single abuse, 1 per 13 for double, 1 per 8 for triple; rule of thumb 1 Infirmary/50 pop or 1 Medical Center/150.
- **Health:** +5/night; Infirmary +20, Medical Center +50, Gym/Tai-Chi +10. −10 per Heavy Workload shift; **starving ≈ −2/hour**; Chronic Condition −8/sol. Low health blocks work (unless Fit). **0 = death.**
- **Morale** = randomised base ±: +5 each for high health/comfort/sanity, −10 each for low; **work performance = morale − 50**. **Renegades accumulate when dome average morale < 65** and reverse above it.
- **Specialisations:** 8 including none and Tourist; a non-specialist in a specialist job takes **−50 performance**; retrained at Martian University. Per-building policies: No Restrictions / Specialists Only / Reject Specialists.
- **Traits:** Perks (Survivor, Fit, Workaholic, Celebrity, Genius, Composed — blocks all sanity penalties; Religious — prevents suicide, +10 morale), Flaws (Chronic Condition, Lazy, Renegade), Quirks. Sanatorium removes flaws; School teaches traits to children.
- **Age bands (sols):** Child 0–5 (can't work), Youth 6–10, Adult 11–30, Middle-Aged 31–60 (→80 with tech), Senior 61+ (→81+), seniors can't work or breed without Forever Young. Seniors have a daily death roll.
- **Birth:** per fertile couple per sol = **((Comfort − 30)/10)%**, minimum comfort 30. Homelessness **halves** it; **1/4 of the population homeless stops births entirely**. Equilibrium at average comfort ≈ **66.4**; 70 = slow growth, 100 = rapid, 55 = gradual extinction.
- **Immigration:** applicant pool filtered by trait/specialisation, size set by Sponsor + techs; Tourists return to Earth and recruit more.

**Oxygen Not Included** — Morale vs. **Expectation**, where expectation rises with every skill you train. Stress change per cycle: **−20%** at 2+ morale over, −10% at 1 over, −5% on target, **+2.5% per point under, capped −10 points = +25%/cycle**. Morale sources: meal quality 0…+16 (Grisly/Rehydrated −1), decor **Ugly −1 / Poor 0 / Mediocre +1 / Above Average +3 / Nice +6 / Charming +9 / Gorgeous +12** (at 120 decor), dining room Latrine +1 / Washroom +2 / Mess Hall +3 / Great Hall +4 / **Banquet Hall +6**, sleep Barracks +1 / Luxury Barracks +2 / **Private Bedroom +3**, recreation Beach Chair up to +8 / Nature Reserve +6 / Hot Tub +5 / Arcade +3, downtime 0…+5. Max morale 94–105, min −1. Over +8 above expectation gives rare "Overjoyed" events. Duplicants eat **1,000 kcal/cycle**. https://oxygennotincluded.wiki.gg/wiki/Morale

**Aven Colony** — Morale split into named sub-channels (**Entertainment, Health, Food variety, Air, Power, Shelter, Work, Commute**). Food and water shortages are colony-wide; air and power are local. Crime rises with population and unhappiness and directly depresses morale. **At population 100 a recurring referendum starts; below ~50% approval you lose the game.** Target 80–85% job fill; below 70% needs heavy micromanagement. https://avencolony.fandom.com/wiki/Morale **[via search]**

**IXION** — population is split into **Workers and Non-Workers** (children, elderly, unemployed); Cryonic Pods thaw into a mix skewed roughly 2–3 non-workers per worker; a worker-only awakening policy costs **−1 to −3 Stability** (sources disagree). **Every 250 unopened cryo pods stored in a sector = −1 Stability, up to −4.** Poor Worker Conditions raise accident/death chance and then bleed Stability. Trust/Stability collapse = mutiny ending. https://www.gamepressure.com/newsroom/ixion-non-workers-workers-and-colonists-population-explained/z64df8

**Planetbase** — hard colonist classes with fixed starting allocations (Desert start: 3 Worker / 2 Biologist / 1 Engineer / 1 Medic / 1 Carrier Bot / 1 Construction Bot; Storm Planet: 2/1/1/0/1/0). Guards staff Security Consoles (30–50 recommended in a large base); Engineers staff Telescope Consoles; Biologists work Bio-Domes. Immigration arrives by ship through Landing Pad / Starport.

**Space Haven** — per-character needs and moods: oxygen, food, sleep, hygiene, comfort, recreation; comfort is raised by a bed each, kitchens, arcade machines, jukeboxes and lights, and lowered by noise from adjacent industry — **walls limit how far the discomfort field spreads**. Prisoners have the same needs.

**Per Aspera / Mars Horizon / OTC** — colonists are an aggregate number, not individuals. In Per Aspera, fed+watered colonies *generate research*; unfed colonists emigrate.

**Space Colony (2003)** — the opposite extreme: ~20 named operatives with individual personalities, friendships and dislikes, each with needs for **money (Cash Machine), hygiene (Personal Hygiene Pod), mental health (Counseling Robot, Meditation Room, Relaxation Pod), social (Social Area, Bar, Disco), fitness, sleep, food, health**. Happiness directly sets how long they keep working.

---

## 4. TIERING AND UPGRADE PATHS

| Game | Gate | Example upgrade ladders |
|---|---|---|
| Surviving Mars | **Research only.** 5 fields (Physics, Engineering, Social, Biotech, Robotics) × **19 techs × 4 tiers**, order randomised within tiers each game; finishing a tech unlocks the next in that field; anomalies unlock cross-field techs and **Breakthroughs** (Relaunched: an anomaly offers a choice of three). Wonders sit at the ends of the tree, one each per game. https://www.gamepressure.com/surviving-mars-guide/list-of-technologies/zdab9a | Solar Panel 2 E → Large Solar 5 E; Power Accumulator 200 → Atomic Accumulator 2,000; Living Quarters 14 → Apartments 24 → Arcology spire 32; Smart Home 4 → Smart Complex 12; Research Lab (Wk 9) → Science Institute (Wk 24) → Network Node spire; Infirmary (comfort 40, +10 sanity/+20 health) → Medical Center (comfort 70, +20/+50); Basic → Medium → Oval → Mega Dome; Universal Depot (30 each) → dedicated Depot (180 one resource) |
| Aven Colony | **Research + nanite cost.** Tier upgrade happens **in place on the same footprint**, so you can pre-plan the layout with Tier 1 and upgrade on demand | Solar 8 → 18 → 26; Geothermal 200 → 260; Farm T1→T3; Mine T1→T3; Clinic → Hospital (52 nanites, 18 power, 18 workers); Outpost 16 → Habitat T3 66 → Skyscraper T2 120; Police Drone Hub T1→T3 |
| Planetbase | **Size tiers (small/medium/large/jumbo) plus a "tech required" gate on the largest**, researched in the Lab | Bio-Dome pads 4 → 8 → 16 → 24; Solar Panel 2→4→7→10 steel; Dorm 2-2-0 → 4-4-0; O₂ Generator small → large |
| ONI | **Research tiers** spent with Research Station → Super Computer → higher stations; plus DLC packs | Planter Box → Farm Tile → Hydroponic Farm; Battery → Smart 20 kJ → Jumbo 40 kJ; wire → Conductive (×2) → Heavi-Watt (×20) → Heavi-Watt Conductive (×50); Algae Terrarium → Oxygen Diffuser → Electrolyzer; Microbe Musher → Electric Grill → Gas Range → Deep Fryer |
| IXION | **Chapter progression + tech tree + sector specialisation thresholds** (4/6/10/12/25/54 same-symbol buildings for Tier 1/2) | Crew Quarter (2 units/30 steel) → Domotic Quarter (1 unit/80 steel) → Optimized Quarter (replaces 2 Crew Quarters); Insect Farm → Crop Farm → Algae Farm (fully upgraded feeds ~1,200) → Mushroom Wall; Battery tiers; Memorials upgrade in place |
| Stardeus | **Linear research prerequisite chains named on each device page** (e.g. *Life Support → Atmosphere Control → Improved Oxygen Production* for the Oxygen Pump; *Energy → Basic Reactor → Solar Panels* for the Battery; *Production → Biochemical Extraction* for the Nutrient Extractor) | Solar Panel 3 kW → Array 15 kW → Array 50 kW; Matter Reactor 20 kW → 150 kW → Nuclear Reactor 1 MW; Battery 50 → 150 kW → Nuclear Battery 500 kW; Basic → Advanced → Quantum Data Harvester; Storage Unit 500 → 2000; Mini Planter → Large Planter; Mini Oxygen Pump → Oxygen Pump → Atmosphere Generator |
| Surviving the Aftermath | **Tech branches** (Food branch, etc.) plus **specialist-driven outpost unlocks** | Tent 3 → Crowded Tent 6 → Shanty → Improved Shanty → Tenement 8 → Improved Tenement 10 → House 5 → Two-story 10 → Heated variants; Small/Medium/Large Field + Irrigated variants; Scrapper → Advanced Scrapper; Extractor (1 worker) → **Auto-Extractor (0 workers)**; Solar → Large Solar; Battery Rack 2,000 → 6,000; Water Well → Bore Well → Water Pump |
| Offworld Trading Company | **No research.** Gating is purely **money + market price + adjacency to deposits**; the "tech" layer is the **Optimization Center (4 tiers × +25%)** and one-shot **Patents** | Solar Condenser is split into two different buildings by output; Chemicals Lab vs Chemicals Refinery as scale variants |
| Per Aspera | **Research tree (Biotech / Engineering / Space / Military) + building-level upgrades L1–3** | Colony 100 → Advanced 250 (150 RP) → Superior 500 (750 RP) → Dome City 1,000 (10,000 RP) → Open City ~5,000 → Metropolis; Water Extractor L1–3; Electronics / Parts / Worker Factory L1–3 (upgrade cost 3 → 10 → 20 Al/Steel); Engineering tree also raises the **building cap** |

Two gating ideas worth stealing for a hex SNES game: **Aven Colony's in-place tier upgrade on an unchanged footprint** (lets the player commit to a layout early) and **IXION's specialisation thresholds** (a bonus for building *N of the same category in one region*, which makes zoning a decision rather than a habit).

---

## 5. BUILDINGS WHOSE ONLY JOB IS A STAT

| Game | Building | Cost | Effect size |
|---|---|---|---|
| Surviving Mars | Garden / Small Garden / Alleys / Stone Garden / Lake / Fountain / Statue | 1–4 concrete, **0 power, 0 workers** | **+40 Service Comfort** each (+5 comfort per visit) |
| | Playground | 8 polymer | Service Comfort 80, **+10 sanity** per visit |
| | Open Air Gym | 10 metal, 8 polymer, 0 power | Comfort 50, **+10 health** |
| | Security Station | 15 concrete, 5 metal, 2 E, 3 workers/shift | cuts crime and sanity loss **[via search]** |
| | Network Node (spire) | 50c/50m/20e, 20 E | dome-wide research multiplier |
| | Hanging Gardens (spire) | 40c/10p, **2 water, no power** | **+100 service comfort, +30 residential comfort** |
| | Sanatorium (spire) | 50c/20m/10p, 20 E | removes colonist **Flaws** permanently |
| | Landscape Dome (wonder) | 400c/200m/300p, 40 E, 10 W | **+25 comfort to every living space in the colony** |
| | Omega Telescope (wonder) | 400c/300m/300e, 80 E | unlocks **3 Breakthroughs** |
| Aven Colony | VR Center | — | **+12 Entertainment morale** |
| | Stadium / Earth History Center (megastructures) | 4×4, many workers | **+36 Entertainment morale** each |
| | Park | — | air quality **and** entertainment morale |
| | Police Drone Hub | — | removes the crime morale penalty |
| Surviving the Aftermath | Memorial 10 / Brawl Pit 10 / Shrine 15 / Botanical Garden 15 / Public House 20 / Library 25 / Movie Theater 25 / Stormdome 40 / **Game Arcade 40** | Arcade ≈ 85 components | entertainment points; colony needs **2× population** |
| ONI | Decor items (lamps, flower pots, statues, paintings) | cheap | push the room's decor score across bands worth **−1 → +12 morale** |
| | Arcade Cabinet / Hot Tub / Nature Reserve / Beach Chair / Park | varies | **+3 / +5 / +6 / +8 / +3** morale |
| | Mess Hall → Great Hall → Banquet Hall (room upgrades, not new buildings) | decor + table quality | **+3 / +4 / +6** morale |
| IXION | Marduk / Genetic Conatus / Lunaclysm Memorials | upgradeable | per-sector **Stability** only |
| | Exo-Fighting Dome | poor points-per-tile | **ship-wide** morale |
| | Observatory | — | a **one-off permanent bonus — community guides recommend scrapping it afterwards** |
| OTC | Patent Lab patents (40–80 chemicals, once per game each) | | **Superconductor +100% power near HQ; Perpetual Motion −50% power for all buildings; Virtual Reality +50% Pleasure Dome income; Energy Vault +1 power and stores 100; Nanotechnology refunds scrapped resources; Thinking Machines halves hostile effects adjacent to HQ; Teleportation removes freighters entirely; Slant Drilling mines adjacent tiles** |
| | Optimization Center | chemicals, rising cost | **4 tiers, +25% output each (to +100%)** |
| Space Colony | Counseling Robot, Meditation Room, Relaxation Pod, Personal Hygiene Pod, Library, Training Pod, Cash Machine | | each targets exactly one named need bar |

Observation for design: in Surviving Mars the pure-stat buildings are the *cheapest things in the game* (1–8 units of one resource, zero power, zero workers) and they cap out at +40–100 rating. That's what makes a dome feel decorated rather than optimised. The effect is on a **ceiling** rather than a rate — a colonist only gains comfort from a building whose rating exceeds their current comfort — which stops the player from spamming one cheap decoration.

---

## 6. TWELVE MOST INTERESTING BUILDING DESIGNS

1. **Water Reclamation Station** (Surviving Mars, spire) — produces nothing; **recovers up to 70% of a dome's water consumption**. A building that improves your *efficiency ratio* instead of your supply, which reframes the whole water economy once built.
2. **Mushroom Wall** (IXION) — **14 food per 1.7 cycles from ~3.5 waste, and no water at all**. It turns the pollution sink into the food source, and it simultaneously counts toward *two* different sector specialisations.
3. **Mushroom Farm** (Surviving Mars) — food that **consumes 2 oxygen** plus power and water. A production building with a life-support cost inverts the normal reading of "farm" and forces an oxygen-budget decision.
4. **Electrolyzer** (Oxygen Not Included) — 1 kg/s water → **888 g/s oxygen + 112 g/s hydrogen**, and that hydrogen is itself the cleanest generator fuel. The byproduct starts a second chain; the single best example of "waste is an input".
5. **Algae Terrarium** (ONI) — **zero power**, 130% efficiency, 170% if you light it. The ideal starter building: free, better with care, and doomed by a non-renewable input (algae), so it ages out on its own without a tech gate.
6. **Transceiver** (Aven Colony) — a building that **receives 400–800 power from an off-map solar farm** on the strategic layer. A local building whose output is set by something outside the map is a cheap way to make the world bigger.
7. **Wind Turbine in fan mode** (Aven Colony) — a *generator* that can be flipped to **consume** power in order to push toxic gas away from an area. One footprint, two opposite roles, toggled by the player.
8. **Triboelectric Scrubber** (Surviving Mars) — 1.8 power, no workers, and its only effect is to **clean dust off neighbouring buildings** so they don't need maintenance. A building whose customers are other buildings.
9. **Hanging Gardens** (Surviving Mars, spire) — **+100 service comfort and +30 residential comfort for 2 water and no power**. The best morale building in the game is paid for in a *life-support* currency, not energy, which keeps it a real trade-off.
10. **Patent Lab** (Offworld Trading Company) — a building that sells **one-per-game global rule changes** (Perpetual Motion halves all power use; Teleportation deletes the entire freighter logistics layer). Buildings as permanent rule edits, and only one player per match can hold each.
11. **O₂ Generator** (Planetbase) — oxygen propagates only through the **connected-room graph**, so the building's value is entirely positional; guidance is literally "one per other structure, never more than two rooms away". It makes floor-plan adjacency the mechanic rather than a number.
12. **Sanatorium / Clone Vat** (Surviving Mars, spires) — buildings that **edit the population itself**: one strips Flaws off existing colonists, the other manufactures new ones. Neither produces a resource; both change who your workforce *is*.

Honourable mentions: **Cash Machine** (Space Colony — money is a need, so there's an appliance for it); **Toilet / Composter** (Space Haven — waste → water loop closers); **Water Collector** (Space Haven — reclaims the vapour your own crew exhale); **OxyMatic Floor / HeatMatic Floor** (Stardeus — life support disguised as terrain); **Observatory** (IXION — build it, take the permanent bonus, then demolish it).

---

## 7. KNOWN PLAYER COMPLAINTS AND DESIGN MISTAKES

**Surviving Mars** (https://opencritic.com/game/5735/Surviving-Mars/reviews, https://www.verticalslicegames.com/game/surviving-mars, https://www.metacritic.com/game/surviving-mars/user-reviews/, Steam threads)
- **Per-dome self-sufficiency forces copy-paste.** Every dome needs its own housing, food, medical and entertainment, so players describe building the same dome repeatedly; one called it "completely destroys the colony feeling". Workaround players invent: dedicated residential domes and separate work domes.
- **Micromanagement is the #1 critic complaint** — "descent into micromanagement hell, exacerbated by baffling tutorials and a repetitive late game"; "some areas require too much micromanagement and some critical information is either inaccurate or not presented in a useful way."
- **The late game has no pressure.** "As you reach the mid game it gets easier and easier"; "too easy and there's no end-game." The difficulty is entirely front-loaded into the founder/pre-colonist stage.
- **Information legibility** — players cannot easily see why a colonist is unhappy; the whole comfort/sanity/health/morale system is invisible without a 3rd-party guide.

**Aven Colony** (https://opencritic.com/game/4589/aven-colony/reviews, https://www.metacritic.com/game/aven-colony/, https://wolfsgamingblog.com/2017/08/02/aven-colony-review-seriously-lazy-colonists/, https://www.windowscentral.com/aven-colony-xbox-one-review)
- "Has the trappings of a good city-building game but simply lacks the depth"; Metascore **65**.
- **No meaningful failure pressure:** "what you have to do to succeed is obvious and it takes real inattention to bring a colony to the brink of disaster."
- **Thin late game:** "aven barely has any late game stuff to build or do."
- **Notification spam at scale:** "as your colony gets larger dealing with notifications becomes a real drag."
- **No transport layer** and colonists refuse long commutes, yet there is no tool to fix commute distance — "there is absolutely no personal or public transport, and your people are lazy jerks."
- Snap-to-grid placement removes layout expression.

**Planetbase** (https://www.digitallydownloaded.net/2018/01/review-planetbase-sony-playstation-4.html, https://www.trueachievements.com/n27964/planetbase-review, https://www.windowscentral.com)
- **Buildings cannot be moved or demolished cleanly** — "once you build a building, it's stuck there."
- "The interconnectedness between them, and the impact that buildings have on one another, is more limited than you see in more complex city builders"; bases "look repetitive" over time.
- Only four planets; "addictive in short bursts" but the creative ceiling is low.
- Mechanically: the oxygen grid **cascades** without a readable warning, and blocked processors silently halt chains — both are failures of feedback, not of simulation.

**IXION** (https://www.metacritic.com/game/ixion/user-reviews/, https://kotaku.com/ixion-city-builder-strategy-game-space-pc-impressions-1849891047)
- **Buildings can't be moved, only destroyed**, on a tight grid; "restarting can feel easier than re-optimising". This is the single most-cited complaint.
- **Hull decay is an unavoidable iron tax** that punishes exploring and expanding — the mechanic that is meant to create tension instead creates a chore.
- **Story gates dictate pacing**: long intro, chapter breaks that interrupt the builder loop; several critics wanted either more story or a simpler builder, not both.
- Specialisation thresholds are opaque; community guides had to reverse-engineer them, and some specialisations ("Population") are widely called worthless.

**Space Haven** (https://steamcommunity.com/app/979110/discussions/0/755051236320899776/)
- Players bounce off the **ship-design constraints that are invisible until too late** — e.g. discovering the ship is too heavy to travel after it is built.
- Facility stats are largely undocumented in-game; the official wiki itself gives almost no numbers.

**Per Aspera** (https://www.indiegamewebsite.com/2020/12/08/per-aspera-review/)
- **Story beats trigger at the wrong moment** relative to simulation state.
- Combat is the least developed system and feels bolted on.
- **Endgame grind**: without an early, well-established atmosphere setup, the final terraforming targets become "nearly impossible"; the last stretch is long and uninteractive.
- Dome Cities were shipped bugged.

**Oxygen Not Included** (Steam/Klei forums)
- **Difficulty cliff at the tier-1 → tier-2 oxygen transition**; players report the mistakes that kill them were made "LOOONG before" the failure appears — a feedback-delay problem, not a difficulty problem.
- **Late-game tedium**: "around 100 cycles the game slows down to a crawl"; it "shifts from a fun city builder to micro-manager" because duplicants spend their lives walking.
- **Space pressure**: large late buildings eat the map — "as research advances your available space disappears rapidly."
- Automation only partially rescues this, and the rocketry endgame felt "tacked on".

**Mars Horizon** — base building widely judged pointless: "it seems like there's little need for this part of the game to exist."

**Cross-cutting lessons for Earth Light**
1. Every one of these games is criticised for a **flat or trivial late game**. Difficulty is front-loaded, then the systems stop asking new questions. IXION is the only one that keeps a timer running (hull decay) and it is criticised for making that timer a tax rather than a choice.
2. **Immovable buildings on a tight grid is the most hated single decision** (IXION, Planetbase). If the hex grid is tight, give a move/relocate action.
3. **Per-settlement self-sufficiency requirements cause copy-paste** (Surviving Mars domes). If colonies can specialise and trade, each one is a different puzzle.
4. **Failure that is only visible after it is unrecoverable** (ONI oxygen tier 2, Planetbase O₂ cascade, Space Haven ship mass) reads as unfairness. Show the deficit forming.
5. **Stat systems need an in-game explanation.** Surviving Mars's comfort/sanity/health/morale model is excellent and effectively undocumented; the best reference for it is a Steam guide that Valve subsequently removed.

---

## Appendix: suggested slot budget for ~40 buildings

Drawn from the observed category distributions above (Surviving Mars ships ~85, Aven Colony ~50 incl. tiers, STA ~100, Space Colony 100+):

Power 5 (2 renewable with a weakness, 1 fuel-burning, 1 battery, 1 late high-output) · Water 3 (deposit-bound, deposit-free, recycler) · Air 3 (basic, large, scrubber/filter) · Food 5 (unpowered slow, powered fast, waste-fed, processor, storage) · Extraction 4 · Refining 4 (two-input chains) · Housing 4 (small/large/dense/special) · Medical 2 · Education/Research 3 · Recreation 4 (cheap decorations at the low end, one expensive wonder at the top) · Storage 2 · Logistics 3 · Defence/hazard 3. Keep 4–6 of the total as **loop closers and efficiency buildings** (reclamation, scrubber, waste→food) rather than new production, and 1–2 as **population editors** — those are the designs that players remember.
