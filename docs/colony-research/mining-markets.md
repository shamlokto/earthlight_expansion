# Design research: space mining, refining, markets & selling

Scope note on sourcing: Fandom wikis (offworldtradingcompany, survivingmars, hardspaceshipbreaker, anno1800, elite-dangerous, peraspera, x4-foundations, dyson-sphere-program) were **unreachable from this environment** (HTTP 402 via the fetch tool, Cloudflare 403 via curl; web.archive.org also blocked). Where a figure comes only from a search-engine snippet of a Fandom page rather than a page I read directly, I mark it **[snippet]**. Figures from Steam guides and fan calculators are patch-dependent and marked where they conflict.

---

## 1. MINING AND EXTRACTION BUILDINGS

### Offworld Trading Company (the closest analogue to your design)

Extraction buildings are deliberately few and cheap — they are **free to build** and their only running cost is Power:

| Building | Needs | Produces |
|---|---|---|
| Metal Mine | Power + an Aluminum / Iron / Uranium deposit on the tile | that deposit's metal |
| Elemental Quarry | Power + a Carbon or Silicon deposit | Carbon or Silicon |
| Water Pump | Power + a water deposit | Water |
| Ice Condenser / Solar Condenser | no Power (condenser variants) | Water, or Oxygen+Carbon from ice/atmosphere |
| Geothermal Plant | a **Geothermal Source** tile feature | Power |
| Solar Panel | height/elevation of tile sets output; **day/night cycle affects it** | Power |
| Wind Turbine | wind level of tile; **unaffected by time of day** | Power |

Sources: https://wiki.offworldgame.com/index.php/Buildings and the original ruleset, https://www.designer-notes.com/offworld-rules-circa-june-2014/

**Deposit quality tiers** are the whole spatial puzzle. Four tiers — Trace / Low / Medium / High — read off the map as 1–3 stacked coloured cubes. 2014 rules give the modifiers as Trace −75%, Low (baseline), Medium +50%, High +100% (https://mohawkgames.com/2014/06/16/offworld-rules/). The current wiki gives per-tier rates of roughly 2 / 1.5 / 1 / 0.25 units/sec for High / Medium / Low / Trace **[snippet]** — the 0.25 for Trace lines up with the −75% modifier, so the two sources are broadly consistent. A player guide independently reports "a mine on a level-3 resource produces about 2 units/second" (https://steamcommunity.com/sharedfiles/filedetails/?id=1146344676).

**Depletion: OTC deposits never deplete.** This is important and counterintuitive. The existence of a mod specifically to add depletion confirms it — "in the base game, the resources you are mining never run out" (https://github.com/TC01/ExhaustibleResources). Instead OTC gets its scarcity pressure from:
- **Claims.** Tiles are claimed permanently and exclusively; you start with ~3 claims on standard difficulty and gain more from HQ upgrades (the biggest source), buyouts, tile auctions, and black-market "bribe a claim" **[snippet]**.
- **Deposit creation and destruction as weapons.** The black-market **Core Sample** spawns a new deposit on a tile of your choosing (random type/quality, weighted by terrain); the **Underground Nuke** *lowers a deposit by two tiers* **[snippet]**. So the resource map is mutable mid-game — a mining economy where the map itself is a battlefield.
- **Hidden information.** Only some deposit pips are revealed at start; scanning reveals more. Community advice is to deliberately scan *away* from the revealed pips because everyone else crowds them **[snippet]** — a nice emergent spatial tension.
- **HQ placement on a deposit.** Founding your HQ on a resource tile gives +20 / +15 / +10 for High / Medium / Low, doubled for the Robotic HQ **[snippet]**. Your very first decision is a map-reading decision.

**Adjacency is the real placement puzzle.** Two identical adjacent structures: ~33% lower input cost and ~50% more output than two isolated ones. Three in a triangle: ~43% cheaper, +75% output. Four in a diamond: ~44.5% cheaper, +80% output (https://steamcommunity.com/sharedfiles/filedetails/?id=1146344676). This is the single most portable mechanic for a hex builder — it turns "where do I put the third mine" into a genuine geometry problem, and it rewards clustering against the counter-pressure that deposits are scattered.

### Satisfactory — the cleanest "node purity × miner tier" model

Nodes have three purities. Miner output at 100% clock (impure / normal / pure):
- Miner Mk.1 — 30 / 60 / 120 items per minute, 5 MW
- Miner Mk.2 — 60 / 120 / 240, 15 MW
- Miner Mk.3 — 120 / 240 / 480

Overclocking goes to 250% with superlinear power cost; a Mk.2 at 100% matches a Mk.1 at 200% but burns 15 MW vs 12.5 MW. Nodes are **infinite** — the constraint is throughput, not stock, and the belt tier becomes the binding limit (a Mk.3 on a pure node outruns conveyor Mk.5). https://satisfactory.wiki.gg/wiki/Miner, https://www.satisfactorytools.com/codex/buildings/miner-mk-2. (Sources disagree on the exact Mk.3-on-pure cap because of belt clamping — listed variously as 780 or 1,200/min; flagging as unresolved.)

The design lesson: **"infinite node, limited throughput, power cost curve"** gives you a mine-upgrade economy with no bookkeeping about remaining ore at all.

### Dyson Sphere Program — area coverage as the yield mechanic

- **Mining Machine**: base 30 ore/min **per vein it covers**. Covering more veins = faster. https://dsp-wiki.com/Buildings
- **Advanced Mining Machine**: a laser that sweeps veins along a path; "the more veins covered, the faster the mining speed," but several machines on the same vein just consume it faster (https://dyson-sphere-planner.com/).
- **Oil Extractor** on crude oil seeps; extraction rate **halves after ~12 hours** at 1× resource multiplier.
- **Water Pump** (300 kW) draws from oceans, including sulfuric-acid oceans on some worlds.
- **Orbital Collector** on gas giants — effectively unlimited hydrogen/deuterium, no vein bookkeeping.

**Depletion in DSP is solved by research, not by abandonment.** The *Vein Utilization* tech line raises output per unit consumed: at VU 10 a miner consumes ~32.3 node units/min while outputting 60 usable; at VU 20 it consumes ~26.1 while outputting 90. Late-game levels push depletion to effectively zero (https://steamcommunity.com/app/1366540/discussions/0/3711558744933258836/). This is a smart pattern: early game *feels* finite and forces expansion; late game removes the chore without a patch note.

The spatial puzzle in DSP is **footprint overlap** — a miner's circular/path coverage over a scattered vein cluster. On a hex grid the direct analogue is "a mine works the deposit on its hex plus all adjacent hexes containing that deposit type," which immediately makes mine siting a tiling problem.

### Surviving Mars — the only one on this list where depletion is the central mechanic

- **Metals Extractor / Rare Metal Extractor / Concrete Extractor** — sited on surface deposits; the extractor must be inside dome *worker* range because it's crewed by colonists (geologist shifts cost −10 Health per shift). Rare Metals occur only at underground deposit sites and need Rare Metal Extractors. https://survivingmars.paradoxwikis.com/Exterior_buildings
- Deposits have a finite stock; **extractors simply stop when the deposit is exhausted**, which players complain about ("Mines deplete too fast", https://steamcommunity.com/app/464920/discussions/0/2949168687321608434/).
- Two escape valves: the **Nano Refinement** breakthrough makes all extractors keep producing a trickle from depleted deposits, and the late-game **Mohole Mine** wonder gives near-endless output.
- **Automated Metals Extractor** removes the worker requirement (Japan sponsor or a Global Support breakthrough).
- Buildings also take **maintenance** (drones + spare parts) and suffer **dust contamination**, so an extractor is an ongoing cost even when idle — several players report maintenance continues when a building is switched off.

**Design read: depletion is only fun if it drives relocation, and relocation is only fun if moving is cheap.** Surviving Mars gets complaints precisely because rebuilding an extractor + the dome/drone infrastructure around it is expensive. For a hex colony builder, make the mine itself cheap and movable and let the *infrastructure* be the sunk cost.

### Per Aspera

Named mines per resource — **Aluminum Mine**, Iron Mine, Silicon Mine, Carbon Mine, plus water and chemical extraction — six raw resources (aluminium, iron, silicon, carbon, water, chemicals). Mines sit on surface deposits and must be connected by a **drone-serviced road/supply network**; the real constraint is drone throughput, not ore ("the solution to most problems is build more worker drones", https://steamah.com/per-aspera-logistics-system-guide/). PC Gamer calls scarcity "concern number one" (https://www.pcgamer.com/per-aspera-review/). Verified mine page: https://peraspera.fandom.com/wiki/Aluminum_Mine **[snippet]**.

### Elite Dangerous — mining as a minigame, not a building

Worth noting because it is the only entry where extraction is a *skill* activity:
- **Mining Lasers** for surface deposits, **Prospector Limpets** (prospecting an asteroid before mining *doubles* yield), **Collector Limpets**, **Abrasion Blaster** for surface deposits, **Sub-surface Displacement Missile** which "digs into the rock at the point of impact," **Seismic Charge Launcher** + **Pulse Wave Analyser** for core mining, and a **Refinery** module aboard ship that converts fragments to tonnes.
- **Hotspots** in planetary rings don't add more cores; they raise the *probability* that a given core contains the hotspot's mineral (https://edmining.com/core-mining/, https://edmining.com/laser-mining/).

### Astroneer

Handheld **Terrain Tool** + **Drill Heads** for digging; **Soil Centrifuge** converts canistered soil into base resources; **Smelting Furnace** / **Portable Smelting Furnace** (2 U/s vs 5 U/s power) smelt ore to metal; **Atmospheric Condenser** pulls gases from the air per-planet. Resource nodes are physically dug out of terrain and genuinely exhausted locally, which is the depletion mechanic — you move. https://astroneer.wiki.gg/wiki/Scrap

---

## 2. REFINING / PRODUCTION CHAINS

### Offworld Trading Company — 13 resources, chain depth 3. This is your template.

Full chain, with real building names (https://www.designer-notes.com/offworld-rules-circa-june-2014/, https://wiki.offworldgame.com/index.php?title=Resources):

```
Tier 0 (mined):   Water, Carbon, Silicon, Aluminum, Iron    + Power (generated)
Tier 1 (1 step):  Water  --Electrolysis Reactor-->  Oxygen + Fuel
                  Water  --Hydroponic/Greenhouse Farm-->  Food
                  Iron   --Steel Mill-->  Steel
Tier 2 (2 steps): Fuel + Carbon      --Chemicals Refinery/Lab-->  Chemicals
                  Silicon + Oxygen   --Glass Furnace/Kiln-->      Glass
                  Al + Carbon + Si   --Electronics Factory-->     Electronics
```
Every refining building also consumes **Power**. Build costs are paid in **resources, not money** — e.g. Electronics Factory = 20 Aluminum + 40 Steel; Glass Kiln = 40 Steel + 20 Silicon; Chemicals Refinery = 40 Steel + 20 Carbon; Geothermal Plant = 40 Aluminum + 120 Steel (https://wiki.offworldgame.com/index.php/Buildings). Steel is the universal construction material — **except for the Scavenger HQ, which builds with Carbon instead**, which re-prices the entire map for that faction. That faction-rewrites-the-demand-curve trick is excellent and cheap to implement.

Three tiers maximum, 13 resources, and **nothing has more than three inputs**. That is the ceiling a strategy audience tolerates.

### X4: Foundations — chain depth ~4, and the modules are named station parts

`Ore --(Refinery module)--> Refined Metals --(Hull Parts module)--> Hull Parts --(Wharf/Shipyard)--> ships`, with parallel lines for Silicon → Silicon Wafers → Microchips, Energy Cells, Graphene, Advanced Composites, Claytronics. Real module IDs from a community economy primer: `module_gen_prod_refinedmetals_01`, `module_gen_prod_hullparts_01`, `module_gen_prod_energycells_01`, `module_gen_prod_graphene_01`, plus `module_arg_stor_container_s_01` (storage) and `module_arg_dock_m_01` (docks). https://steamcommunity.com/sharedfiles/filedetails/?id=2968249103

Two X4 ideas worth stealing for a colony builder:
1. **Modules are the building blocks and they bolt onto one station**, so expansion is "add a wing", not "found a new base". A single production module runs 800k+ credits, so each one is a real decision.
2. **Habitat modules + workforce.** Habitats hold population that gives a *production bonus* (not a requirement — zero workforce still produces), and population grows only while **Food and Medical Supplies** are supplied. Food is species-specific, medical supplies are universal. Reported bonus magnitude varies wildly by patch (players cite anywhere from +30% to +43%, with ~1.2× at realistic workforce levels) — **the exact number is unverified and version-dependent** (https://x4playershandbook.com/index.php/index-stations/habitats-and-workforce/, https://steamcommunity.com/app/392160/discussions/0/3016815718832304872/). The *shape* is great for your game: people are an optional multiplier you pay for in life-support goods, rather than a hard gate.

### Dyson Sphere Program — ~15 steps deep. **Too deep for a city-builder audience.**

`Iron Ore → (Arc Smelter) Iron Ingot → (Assembler) Magnet → Magnetic Coil → Electric Motor → Electromagnetic Turbine → Super-Magnetic Ring → ...` and separately `Crude Oil → (Oil Refinery) Refined Oil + Hydrogen → (Chemical Plant) Plastic / Graphene → ...` up to Processors, Quantum Chips and the science matrices. An unofficial calculator lists the Electromagnetic Matrix line alone as a six-step build (https://smart-calculators.net/en-US/tools/dyson-sphere-program-production-calculator). **DSP has no money and no market at all** — the terminal sink is the Dyson Sphere itself. Buildings: Arc Smelter, Plane Smelter, Assembling Machine Mk.I–III, Chemical Plant, Quantum Chemical Plant, Oil Refinery, Fractionator, Miniature Particle Collider, Matrix Lab. Why it's wrong for you: the player's primary activity becomes *ratio arithmetic and belt routing*, and there is no selling decision to make.

### Factorio — **too deep, and deliberately so.**

Base-game rocket part = 10× Processing Unit + 10× Low Density Structure + 10× Rocket Fuel, ×100 parts per rocket (Space Age cut this to 1+1+1 ×50). Low Density Structure = 2 Steel + 20 Copper + 5 Plastic, each of which has its own 2–4 step chain beneath it; Rocket Fuel = Solid Fuel + Light Oil out of Oil Refinery + Chemical Plant cracking; Processing Units need Advanced Circuits plus sulfuric acid, and cannot be hand-crafted at all. https://wiki.factorio.com/Rocket_silo, https://wiki.factorio.com/Low_density_structure

The one transferable lesson, and it is the important one: **Factorio's depth is tolerable only because the player's verb is "build the machine that solves the ratio," not "do the ratio."** A city-builder audience has no belt-building verb to absorb the complexity into, so the same depth lands as a spreadsheet. **Cap at 3 tiers.**

### Satisfactory — depth ~5–8, borderline

`Iron Ore → (Smelter) Iron Ingot → (Constructor) Iron Plate / Iron Rod → (Assembler) Reinforced Iron Plate → (Manufacturer) Modular Frame → Heavy Modular Frame → ...`. Building names are generic by input count — **Smelter** (1 in), **Constructor** (1 in), **Assembler** (2 in), **Manufacturer** (4 in), **Refinery** (fluids), **Blender**, **Packager**, **Particle Accelerator**. That naming scheme is itself a good UX idea: the building tells you its arity. Also **alternate recipes** unlocked from Hard Drives give multiple valid paths to the same part — a real decision layer on top of a fixed chain. https://satisfactory.wiki.gg/wiki/AWESOME_Sink

### Per Aspera — depth 2, well-tuned for a builder

Six raw (aluminium, iron, silicon, carbon, water, chemicals) → six processed (**electronics, parts, food, glass, steel, polymers**) via named facilities (Glass Kiln, Steel Mill, Electronics Factory, Parts Factory, Polymer Plant, Farm). Nothing goes to tier 3. Critically, **buildings consume processed goods as upkeep** — repair drones and factory maintenance eat Electronics, so an electronics shortfall stalls the whole colony (https://www.pcgamer.com/per-aspera-review/). Two tiers plus consumption-as-upkeep is enough to feel industrial.

### Astroneer — depth 3, and the shortest good one

`Ore (Laterite/Malachite/Hematite/Wolframite) → Smelting Furnace → metal (Aluminum/Copper/Iron/Tungsten) → Chemistry Lab → composites (Aluminum Alloy, Steel, Rubber, Plastic, Silicone) → Printer → buildings`. Three named buildings cover the whole economy. https://astroneer.wiki.gg/wiki/Trade_Platform

### EVE Online — depth 4–6, player-run, and the chain is the *content*

`Ore (asteroid/moon) → Reprocessing (an Athanor/Tatara Refinery, or NPC station) → Minerals (Tritanium, Pyerite, Mexallon, Isogen, Nocxium, Zydrine, Megacyte) → Components/Reaction products → Blueprint + Industry job → ships/modules`. Moon mining is uniquely staged: you cannot mine a moon directly — a corp anchors a **Refinery** with a **Moon Drill** service module, runs an extraction cycle, then **detonates the chunk**, creating a *temporary asteroid field* that is mined conventionally. Athanor = medium, 3 service slots, +2% refine yield; Tatara = large, 5 slots, +5.5%. https://wiki.eveuniversity.org/Upwell_structures

**Verdict on depth for a city-builder audience:** DSP and Factorio are categorically too deep — their complexity is absorbed by a logistics-construction verb your genre doesn't have. Satisfactory is borderline and survives on alternate recipes + a physical first-person verb. EVE is too deep but for a different reason: the depth is *social* (different players own different steps), which you cannot replicate single-player. **OTC (3 tiers, 13 resources), Per Aspera (2 tiers), and Astroneer (3 named buildings) are the right band.**

---

## 3. MARKET AND SELLING MECHANICS

### Offworld Trading Company's dynamic market — in detail

This is the best-designed selling system on the list and the one to copy.

**Two markets.** A **local market** on the colony where everything is traded continuously against every other player, and an **Offworld Market** that is a one-shot high-value export.

**Price movement from trade.** Prices are set purely by supply and demand. The rough rule is **~10 units bought moves the price $1**, and each click trades 10 units (https://steamcommunity.com/sharedfiles/filedetails/?id=1146344676). The wiki refines this: the number of units required per $1 depends on the current **price band** and the **player count**, but it **never takes more than 100 units bought to move the price $1** **[snippet]** — i.e. the curve flattens at high prices so a monopolist can't ramp a price to infinity with pocket change. Selling lowers the price; buying raises it; **buying on debt still raises the price** (https://steamcommunity.com/sharedfiles/filedetails/?id=1661490975).

**Passive demand.** The Mars colony is an infinitely-funded consumer that buys constantly and produces nothing, so prices drift *upward* over time absent player supply. A colony buying 1 unit/sec raises a price by roughly **$15 per game day** (a day = 148 seconds). Every player's HQ upgrades also create lumpy demand spikes for the upgrade materials — early game, Aluminum and Steel (or Carbon for Scavengers) plus the Iron feeding steel mills are the hottest goods.

**Passive drift.** Separately, **every 15 seconds every resource has a chance of its Offworld price rising by $10**, with the probability varying by resource — about **0.2 for metals like Iron, up to 0.5 for Food and Oxygen** **[snippet]**. So time pressure runs in the seller's favour, which is a lovely inversion: *waiting is a legitimate strategy, and so is not waiting.*

**Volatility is tiered by production rate.** A mine/quarry/pump on a good deposit makes ~2 units/sec; a tier-2 factory makes ~0.5/sec and the Electronics Factory only ~0.25/sec, while consuming ~1/sec of each input. So base resources swing violently and advanced goods barely move — it takes many factories to shift the Electronics price. **Power is the most volatile of all because it cannot be stockpiled**: surpluses auto-sell and deficits auto-buy every tick, so its price never settles.

**Shortages and surpluses** are timed events that inject extra demand or supply *per second* for a duration. They can be rolled randomly, and the **Hacker Array** lets a player *manufacture* them to order (and the Hacker Array's own cost escalates per use, starting around $2,000).

**Monopoly play, and why it's good design.** The guides converge on a genuinely interesting piece of strategy: **when you monopolise an input, do not build the factory that consumes it.** Let rivals build the glass kilns, then raise the silicon price and bleed them. Conversely a "soft monopoly" is holding a resource at a *reasonable* price so no rival bothers entering — transport costs do the deterring for you. And the counter-play to a monopoly is to *stimulate downstream demand*: trigger a Glass shortage to pull Silicon demand up (https://steamcommunity.com/sharedfiles/filedetails/?id=1146344676).

**The Offworld Market — a discrete, lumpy, high-ceiling sell button.** Each launch ships exactly **100 units of one chosen resource and additionally consumes 20 Aluminum + 20 Fuel**. The payout is 100 × the current offworld price, which was randomised at game start and climbs over the session — a $500 Food price means $50,000 for one launch (https://wiki.offworldgame.com/index.php/Buildings, https://www.designer-notes.com/offworld-rules-circa-june-2014/). **Adjacent warehouses speed up launches.** This is the single most copyable selling mechanic on the list: a *quantised* sale with a *fixed overhead in other goods*, against a price you cannot control but can wait on.

**Automation that preserves the decision.** `Auto-Supply` buys a building's inputs automatically; `Turn Off Unprofitable` idles negative-income buildings; Ctrl+Shift+click sets a resource to auto-sell; holding X shows **profit per second for every building**. Note what this does: it automates the *arithmetic* while leaving the *strategy* (what to monopolise, when to launch, who to squeeze) to the player.

### Fixed-rate and semi-fixed selling elsewhere

- **Satisfactory — the AWESOME Sink.** Items are converted to abstract **points**, shared across all Sinks, spent on **FICSIT Coupons** in the AWESOME Shop. Values scale with chain depth, not mass: an Iron Plate = 6 points, a Ballistic Warp Drive = 2,895,334 points. The sell decision is *how far up the chain to refine before sinking*: sinking 30 Iron Ore/min raw yields 30 points/min, whereas processing the same ore into plates yields ~4× the points. Coupon cost escalates — the first three cost 500 points each, then the price grows by formula. In practice most players use the Sink as an **overflow valve** so a backed-up line doesn't stall and power draw stays flat. https://satisfactory.wiki.gg/wiki/AWESOME_Sink, https://satisfactory-planner.net/en/articles/awesome-sink-points/
- **Astroneer — barter, not currency.** The **Trade Platform** takes **Scrap** (from shredding objects) and **Astronium** and returns resources at fixed per-resource ratios: ~1:2 for Organic, 3:2 for Hematite, 8 Astronium for a Portable Smelting Furnace. Shredding values are per-object (Smelting Furnace 0.75 scrap, Chemistry Lab 2.5, Trade Platform 6). The clever bit: **the Trade Platform roughly halves an item's scrap value while the Smelting Furnace doubles it**, so trading *for a smeltable ore* and then smelting it is value-neutral, while trading for anything else is a loss — an arbitrage you can discover (https://atenfyr.com/calculators/extras/scrapguide). The Chemistry Lab notably does *not* follow consistent rules; wiki tables disagree on Lithium, Dynamite and Carbon values — **flagging as unverified**.
- **Elite Dangerous — per-station commodity prices with real spread.** Every station sets its own buy/sell price with supply/demand modifiers; the whole trading game is finding the spread. Mining payouts (Steam guide, March 2025): Void Opals ~161,927 cr/t, Low-Temperature Diamonds ~146,798 cr/t, Platinum ~78,941 cr/t, Painite ~65,162 cr/t (https://steamcommunity.com/sharedfiles/filedetails/?id=3579503571). Historically Void Opals could hit **over 500 million credits per unit** at specific markets under specific conditions before being nerfed hard in 2020 **[snippet]** — a cautionary tale about letting a single sell location run away. **Community Goals** temporarily inflate demand at a named station, which is a designed, announced, time-boxed demand spike: good pattern.
- **X4 — colour-coded relative pricing.** Every ware has an average price and a min/max band; actual station prices move within it on stock level, and the UI colours the price so "darker green = better deal for you," which removes arithmetic without removing the choice. Mine output has a *single legitimate buyer type*: Ore sells only to **Ore Refineries**, and over-supplying one refinery means it buys "only small amounts at very low prices" — so route planning *is* price management. NPC miners now feed NPC refineries directly, so player mining needs a station **Manager** and an assigned **Trader** ship to actually convert ore into money. https://steamcommunity.com/sharedfiles/filedetails/?id=2968249103
- **EVE Online — a real limit-order book.** Players post buy and sell orders; everything is player-made. Fees: **sales tax base 7.5%**, reducible to **3.3%** with Accounting V; **broker fee from 3%** at NPC stations, reduced by Broker Relations skill and faction/corp standing, and set arbitrarily by the owner in player structures; broker fee is paid on order *creation* and is **not refunded** if the order is cancelled or expires; NPC-station reprocessing takes ~5% of material value, removable with ~6.7 corp standing or a 0%-tax player structure. https://wiki.eveuniversity.org/Tax, https://wiki.eveuniversity.org/Trading, https://iskscout.com/blog/eve-reprocessing-guide. **Each region has its own order book**, so hauling one region over is itself the profit (https://steamcommunity.com/app/8500/discussions/0/1742229167221221340). The pathology: in high-traffic hubs the dominant behaviour is relisting **0.01 ISK** under the leader, with increments down to a tenth of an ISK; CCP reports **94% of listings are never altered** and responded by raising order-modification fees and adding a **Relist Charge** (https://tagn.wordpress.com/2020/02/25/ccp-takes-aim-at-undercutters-and-market-bots-in-new-eden/). Lesson: a continuous order book invites a degenerate micro-optimisation, and you fix it with a friction cost.
- **Deep Rock Galactic — flavour only, but the flavour is the point.** Credits are the sole currency, spent only at the Space Rig and useless during a mission. Gold = **2 credits/unit**; Nitra converts to credits at mission end but its real use is calling a **Resupply Pod for 80 Nitra**; **Morkite** is the quota resource for Mining Expeditions and must be deposited in the **M.U.L.E.** to count. Payout is based on what you *picked up*, not what you still hold, so spending Nitra mid-mission costs you nothing. Excess Morkite/Nitra mostly become XP via the "Minerals Mined" bonus. https://deeprockgalactic.wiki.gg/wiki/Credits. The lesson for a colony builder: a company that *tells you its quota in corporate-cheerful language*, pays per *delivered* unit, and lets you spend the ore on tactical consumables mid-run, makes the mining feel like a job you're beating rather than a graph you're filling.

### Scrapping and salvaging economics — Hardspace: Shipbreaker

The most interesting sell system on the list because **the sale is a physical sorting decision**, not a menu.

Three destinations, each paying differently, and putting an item in the wrong one costs you money:
- **The Furnace** — bulk metals, paid by mass. From a 1.0-revised Steam guide: Aluminum panels and structure ~71.5/kg, Mounting Plate ~71.5/kg, Canopy ~71.8/kg, Electric Cables ~394/kg, Glass ~3,292/kg, raw Scrap ~10/kg, Asteroid Shard 9/kg.
- **The Processor** — compound/titanium/nanocarbon structure, also by mass: Titanium panels/structure/keel ~97.5/kg, Nanocarbon panels 97.5/kg, Doors ~150/kg, Thruster Cap ~715/kg.
- **The Salvage Barge** — intact complex components, paid **per item**: Class I Reactor 1,218,750; Class II Reactor 4,062,500; Power Generator 1,137,500; Thruster Class II 812,500; Quasar Thruster 325,000; ECU 585,000; Radiation Filter 487,500; down to a Gorrman Chair at 15,600 and a Handle at 2,925.

https://steamcommunity.com/sharedfiles/filedetails/?id=2136065231 (**caveat: this guide has since been removed from Steam and values shifted between patches**; a Nov-2025 list gives Nanocarbon and Titanium structure at **45/kg** and aluminium at **12/kg**, https://qnnit.com/hardspace-shipbreaker-material-value-list/, while the Fandom wiki's older figure was $35/kg and explicitly notes a 2021-05-13 patch changed Nanocarbon and Titanium **[snippet]**. Treat the *ratios* as the finding, not the absolute numbers.)

**Why it's a great design:**
1. **Nanocarbon pays 72.1/kg at the Furnace but 97.5/kg at the Processor** — the same material has two prices and you must route it correctly. That one asymmetry generates all the decision-making.
2. **Intact components are worth 10–100× their material value**, so *how carefully you cut* determines the payout. A reactor cut out cleanly is 1.2M; the same reactor punctured is scrap.
3. **Running costs are debited against the sale at end of shift**: bay lease, equipment rentals, interest, and a charge every time you die and respawn a cloned body (https://hardspaceshipbreaker.fandom.com/wiki/Campaign **[snippet]**).
4. The frame: you start **$1,252,594,441.92** in debt to LYNX Corp **[snippet]**, and the wiki states it is **not possible to fully clear the debt under normal circumstances**. Reception is split — some call the debt "largely a facade" with no real failure penalty, others find paying it down the whole joy of the game (https://twincitiesgeek.com/2020/07/in-hardspace-shipbreaker-paying-off-massive-debt-is-brilliant-fun/, https://gideonsgaming.com/hardspace-shipbreaker-review/). One player report puts break-even at >550k per shift; **unverified**. The lesson is sharp: **an unpayable debt is a tone device, not an economy.** If you want debt to be a mechanic, it must be beatable.

### Buyout / stock mechanics — Offworld Trading Company

OTC's win condition is **acquisition, not combat**, and the entire economy feeds one number.

- Each company issues **10,000 shares in lots of 1,000** (i.e. 10 buyable blocks), starting at **$5/share** in the 2014 rules; $10 by later balance.
- **Share price tracks total company value**: `TV = assets − (debt × multiplier)`, where assets = HQ value + cash + resource stockpiles + structure value, and target value/share ≈ TV / 100,000 with diminishing returns at the top end.
- A **stock-bought modifier** escalates the cost of consolidating: each block bought above the starting minimum adds **+5%**, so the first block someone buys takes a $10.00 share to $10.50, and owning all 10 blocks puts the multiplier at **+50%**. Buying a block another *player* already holds **costs double**. In majority-buyout mode, buying into a company you own **zero** stock in costs **3× list**, with the premium shrinking as your holding grows **[snippet]**.
- **Debt is punished through the share price** — on Manager difficulty each $1 of debt removes about $5 from Total Value, so leverage makes you cheap to eat.
- When one company owns all of another's shares, the target is **removed and its buildings, colonies and patents transfer to the buyer**. Last company standing wins.

Sources: https://www.designer-notes.com/offworld-rules-circa-june-2014/, https://forums.offworldgame.com/474117/a-look-at-debt-share-prices-and-bond-ratings, https://steamcommunity.com/sharedfiles/filedetails/?id=1661490975. Note: community sources disagree on whether the per-share bought modifier is +5% or +10%; **flagging as unresolved.**

Player strategy that falls out of this and shows the design works: buy **your own** stock early (five blocks by HQ4 is the stated benchmark) to make yourself expensive, watch for anyone holding >50% of the money on the map, and target the *strongest* rival rather than the weakest because it costs barely more and removes the most competition.

### What makes selling a *fun decision* rather than a button

Distilled from the above:
1. **Your sale moves the price.** OTC's "10 units ≈ $1" means dumping a stockpile visibly tanks the market — so quantity and timing are both real choices. A fixed buy-price is a button; a downward-sloping demand curve is a decision.
2. **Waiting has a modelled payoff.** OTC's offworld prices tick upward every 15 seconds at per-resource probabilities. Holding inventory is a position, not procrastination.
3. **Sales are quantised with an overhead in other goods.** The 100-units + 20 Al + 20 Fuel launch means a sale is an *event you prepare for*, and the overhead itself consumes two tradeable goods.
4. **The same item has more than one price.** Hardspace's Nanocarbon (72.1 vs 97.5/kg) and Satisfactory's sink-raw-vs-sink-refined. Routing is the decision.
5. **Condition and care affect value.** Hardspace pays 10–100× for an intact component. A mining colony analogue: ore quality grades, or breakage during transport.
6. **Someone else wants the same thing.** OTC's monopoly/counter-monopoly play only exists because rival buyers exist. A single-player version needs *AI competitors or factions with their own production*, not just an abstract buyer.
7. **Selling the input vs. selling the product.** OTC's "don't build the factory you monopolise the input for" and Satisfactory's 4× points-from-refining are the same decision in two games. This is the richest single axis available to you.
8. **Announced, time-boxed demand spikes.** Elite's Community Goals, OTC's shortage/surplus events.
9. **Automate the arithmetic, not the judgment.** OTC's Auto-Supply, auto-sell, Turn Off Unprofitable, and the per-building profit/sec readout.
10. **The money must be *for* something immediate.** DRG's 80-Nitra resupply pod converts ore into tactical relief mid-mission; OTC's money buys black-market sabotage and rival shares. Money that only accumulates is a score.

---

## 4. MONEY, UPKEEP AND DEBT

### Offworld Trading Company — the most developed debt model, and directly usable

**Debt is automatic and incurred by consumption, not borrowing.** When your HQ needs life support (Food/Oxygen/Water, required at HQ level 2+; the Robotic HQ needs none) and you have neither stockpile nor cash, it **buys on debt automatically**. Likewise:
- **Power is always paid for with debt, never cash**, and has no stockpile at all.
- Shipping resources over long distances **burns Fuel and generates debt**.
- Losing an auction costs nothing; **winning one takes on debt equal to the bid** (bids escalate in $500 increments).
- If you hold stockpiles, the HQ draws those before taking on debt.

**Bond ratings set the interest rate on a debt-to-total-value ratio** (from the dev-forum XML dump, https://forums.offworldgame.com/474117/a-look-at-debt-share-prices-and-bond-ratings):

| Rating | Interest | Debt as % of total value |
|---|---|---|
| AAA | 5% | 1% |
| AA | 6% | 2% |
| A | 7% | 3% |
| BBB | 10% | 5% |
| BB | 12% | 6% |
| B | 14% | 7% |
| C | 20% | 10% |
| D | 30% | 20% |

Thresholds scale with player count (reportedly D at 5% of assets in 2-player, 6.67% in 3-player games; the scaling of the other bands is a forum guess and **unverified**).

**Debt has three distinct teeth, which is why it works:**
1. Interest compounds at a rate that worsens as you sink.
2. Debt directly lowers your **share price** (~$5 of Total Value lost per $1 of debt on Manager), making you cheap to buy out — so debt is literally an attack surface.
3. A **|D| rating locks you out of most black-market items**, removing your tools exactly when you need them.

Player heuristics that emerge: don't build power plants until HQ3; start worrying at **|B|**; don't pay debt down from cash unless it's to climb out of |D| into |C|; don't bid in auctions while leveraged. And once debt is clear, power plants flip to being a profit centre — players call it "power money." That arc — **a liability that becomes an asset once you're solvent** — is a very satisfying shape for a colony economy.

Note also that in OTC **buildings cost resources, not money**. Money is almost purely for buying resources, black-market items, auctions and shares; the guides state "resources and money are treated as nearly equivalent" and recommend buying cheap inputs rather than producing them. This cleanly separates "can I build it" (industrial) from "can I win" (financial).

### Elsewhere

- **Hardspace: Shipbreaker** — a $1.25bn debt with per-shift deductions for bay lease, equipment rental, interest and respawn clone fees. Narratively superb, mechanically inert because it is unpayable.
- **Surviving Mars** — **Funding** from your sponsor arrives on a schedule; money is spent almost entirely on **rocket launches and Earth imports**, and **exporting Rare Metals back to Earth** is the player-side income. Buildings also demand ongoing **maintenance in spare parts delivered by drones** plus power/water, and dust contamination raises that cost — so upkeep is in *goods*, not cash. https://survivingmars.paradoxwikis.com/Exterior_buildings, https://survivingmars.fandom.com/wiki/Rare_Metals **[snippet]**
- **Per Aspera** — no money at all; upkeep is denominated in **Electronics and Parts** consumed by maintenance and drones. This is the purest "upkeep = goods" model and the easiest to read on a hex map.
- **X4** — station modules cost credits outright (800k+ for one production module); upkeep is the *input wares* plus Food/Medical Supplies for habitat workforce. No debt mechanic.
- **Anno 1800** — balance per minute, with every building carrying an upkeep cost in coins and workforce; this is the classic city-builder treatment and the baseline your audience already knows.
- **DSP, Factorio, Satisfactory** — **no money and no upkeep at all.** Power is the only running cost. Worth noting as a deliberate choice: these games removed currency so that the only question is throughput.

---

## 5. TRADE WITH EXTERNAL FACTIONS

### Convoys and trade routes

- **Anno 1800** is the reference implementation and the right comparison for a colony builder. Three distinct layers:
  - **Internal trade routes** between your own islands move goods and **generate no income at all** — their entire value is logistics (https://steamcommunity.com/app/916440/discussions/0/3803904095520440745/).
  - **Passive trade**: you flag goods for sale at your **Trading Post** at a set price and quantity, and any passing faction may buy them. Lower return, zero micromanagement. The **Harbourmaster's Office** augments this — reportedly adding a chance to collect a 500-coin tax each time passive trade occurs at a trading post **[snippet]**.
  - **Active trade routes**: you assign named ships with cargo slots to a multi-stop route touching other factions' harbours, and you must first have negotiated **trade rights** with the island's owner. Ships can be intercepted by pirates and hostile AI.
  - Plus **selling ships themselves** to AI traders as a lump-sum income (sail to a harbour, use the sell option). https://anno1800.fandom.com/wiki/Trade **[snippet]**, https://gamerant.com/anno-1800-how-set-up-trade-routes/
  The key design point: **the ship is a visible object with finite cargo slots that can be sunk.** That is what makes a trade route a decision rather than a config screen.
- **X4** — trade is executed by **subordinate ships with pilots**. A trader needs a **1-star pilot** (trainable with a basic piloting seminar from the Trade Corner) before it can use **Repeat Order**; you then set it to "Buy In" or "Sell In" a sector or a specific station with a price limit. A player-built **Trade Station** acts as central storage that buys low and sells high while assigned traders deliver into it. Station **Managers** handle buy/sell pricing automatically within a band you set.
- **Astroneer** — the **Trade Platform** launches a small rocket that physically leaves and returns after **45 seconds** with the goods. Even a pure barter menu gains a lot from being a thing that visibly departs and comes back.
- **OTC** — the **Offworld Market** is the convoy: a launch that consumes Fuel + Aluminum as the shipping overhead.

### Trade partners with changing demand

- **X4** is the best example: faction demand is driven by **actual consumption**, principally **ships lost in ongoing wars**. Wharfs build S/M hulls, Shipyards build L/XL, and both consume Hull Parts — so Hull Parts is the perennial early bottleneck and Weapon Components the next one. Patch 8.0 explicitly enabled "maximum people at war for maximum ship demand," and factions start fighting as relations shift. Meanwhile Food/Medical/Energy Cell demand is usually already satisfied by AI factories, so the player has to *watch for* a shortage rather than assume one. https://steamcommunity.com/sharedfiles/filedetails/?id=2968249103
- **Elite Dangerous — Community Goals**: a named station publishes a temporary, escalating-reward demand for a specific commodity, with a public leaderboard. A clean, legible way to create a demand spike without simulating an economy.
- **Anno 1800** — each AI/NPC partner has a fixed shopping list and offer list, and your **reputation** with them gates trade rights and prices.
- **OTC** — the colony's demand shifts as it grows and as rival HQs upgrade (each upgrade creates a lumpy demand spike for the specific upgrade materials).

### Embargoes, reputation gates, smuggling

- **Anno 1800** — hostility/war closes a partner's harbour to you and your trade routes through the region get raided; reputation thresholds unlock trade rights. https://anno1800.fandom.com/wiki/War **[snippet]**
- **Elite Dangerous** — the fullest smuggling loop found: illegal/stolen cargo is fine as long as you are not **scanned to completion** by System Authority. "Ship Scan Detected" is a warning, not a conviction, so you can run, hide behind a planet, or use **Silent Running** (though police can tag you before you engage it). Getting caught = a fine plus a reputation drop with the controlling faction; **unpaid fines escalate into bounties**, and enough reputation loss makes the faction attack on sight regardless of cargo. Jettisoning is unreliable — players report being fined anyway after dumping. Illegal goods sell at a **premium** via a station's **Black Market** option. Delivery missions don't fine you for *delivering* contraband, only for being scanned with it aboard. https://elite-dangerous.fandom.com/wiki/Smuggler **[snippet]**, https://steamcommunity.com/app/359320/discussions/0/343788552550536138/, https://roguey.co.uk/elite-dangerous/help/smuggling-goods/
- **X4** illegal-wares/police-scan specifics: **I could not verify these** — searches returned no usable source. The game does have contraband and police scanning, but I have no citable detail.
- **EVE** — no embargo system per se; the analogous friction is **regional market segmentation** (each region its own order book, hauling between them is the arbitrage) plus NPC-standing effects on broker fees and reprocessing tax.

### Tribute / protection money

Only one game on the list has it, and it has it well:

**Anno 1800 — the pirates Anne Harlow (Old World) and Jean La Fortune (New World) "demand tribute (threatening war) from time to time, even when the player has great reputation with them."** The wiki also notes she "can still risk turning back to hostile if relations drop low enough **or she thinks you can be bullied for money**." Paying buys a ceasefire (community reports ~2 hours of game time, then renewable — **unverified**). The upside of a good pirate relationship is access to **Gold Bars** and to **special ships "that cannot be found anywhere else, for blood or money"**. And there's a nasty diplomatic knock-on: allying with an AI that is at war with the pirates can crater your pirate reputation to 0 when that AI's ceasefire lapses. https://anno1800.fandom.com/wiki/Anne_Harlow **[snippet]**, https://evagamestation.com/2025/10/11/anno-1800-anne-harlow/

This is directly on-target for your "small defence force" premise: **a recurring extortion demand that you can pay, refuse, or make unnecessary by building defences** gives the defence budget a real opponent and converts your military spend into an explicit economic trade-off. Note that the hostile faction also *sells you things you can't get elsewhere*, so wiping them out has a cost. That asymmetry is what makes the decision interesting rather than a tax.

Nothing in OTC, X4, EVE, Elite, DSP, Satisfactory, Factorio, Astroneer, Surviving Mars or Per Aspera implements tribute/protection money; OTC's nearest equivalent is **hiring "Filthy Pirates" / mercenaries via black-market auction** to raid a rival, i.e. you pay protection money *offensively*.

---

## 6. THE 10 MOST INTERESTING MECHANICS FOR A MINING/SELLING ECONOMY

1. **OTC adjacency bonuses (2 adjacent ≈ −33% inputs / +50% output; triangle −43% / +75%; diamond −44.5% / +80%)** — turns hex placement into a geometry puzzle that fights directly against the scatter of deposits, with zero new UI.
2. **OTC's quantised export launch (100 units + 20 Aluminum + 20 Fuel per shipment, adjacent warehouses speed it up)** — makes selling a prepared event with its own supply chain instead of a button, and gives warehouses a reason to exist.
3. **OTC's upward price drift (every 15s each resource has a 0.2–0.5 chance of +$10 offworld)** — makes *holding inventory* a legitimate strategy, so the player is choosing when as well as what.
4. **Power that cannot be stockpiled and is bought on debt (OTC)** — one resource with no buffer and automatic settlement creates constant, self-inflicted price volatility and makes the power grid a financial decision.
5. **Hardspace's dual-destination pricing (Nanocarbon 72.1/kg at the Furnace vs 97.5/kg at the Processor; intact components worth 10–100× their mass value)** — the same object has multiple prices depending on how you handled it, so care and routing *are* the economy.
6. **Bond ratings that gate your options, not just your wallet (OTC: 5%→30% interest on a debt/value ratio, and |D| locks you out of the black market)** — debt that removes your tools exactly when you need them, rather than merely subtracting money.
7. **Debt that lowers your share price and makes you cheap to acquire (~$5 of value lost per $1 of debt)** — leverage becomes an attack surface, which is the only version of "debt" that creates tension in a builder.
8. **Monopolise the input, don't build the product (OTC) / refine-before-sinking pays 4× (Satisfactory)** — the single richest decision axis available: at every tier, sell now or add a step.
9. **Anno's pirate tribute demands, backed by pirates who also sell unique ships** — recurring extortion you can pay, refuse, or defend against, where exterminating the extortionist costs you a supplier.
10. **Vein Utilization research that makes depletion fade out (DSP: 32.3 consumed/60 output at VU10 → 26.1/90 at VU20)** — depletion drives expansion in the early game and then quietly stops being a chore, with no design dishonesty.

Honourable mentions: Satisfactory's **alternate recipes** (multiple valid paths to the same part, as unlockable loot); X4's **habitat workforce as an optional multiplier paid for in Food + Medical Supplies**; DRG's **80 Nitra = a resupply pod** (ore spent on immediate tactical relief); Elite's **Community Goals** (announced, time-boxed demand spikes); OTC's **faction that builds with Carbon instead of Steel** (one line of data that re-prices the whole map).

---

## 7. PITFALLS: WHERE THESE ECONOMIES BECOME SPREADSHEETS

**Pitfall 1 — ratio arithmetic becomes the game.** Factorio and DSP both externalised their maths to third-party tools: factoriocodex, satisfactorytools, dyson-sphere-planner, dyson-calculator, smart-calculators. Players report planning in calculators and then building to the plan. Neither game *stopped* it; they absorbed it by making the construction act (belt routing, spaghetti untangling, blueprints) pleasurable in its own right. **You have no such verb.** Mitigation: cap the chain at 3 tiers and ≤3 inputs per recipe, as OTC does.

**Pitfall 2 — the optimal play is micro-optimisation at the margin.** EVE's order book collapsed into relisting 0.01 ISK under the leader, with price increments down to a tenth of an ISK, to the point that bots and humans were indistinguishable and **94% of listings were never altered**. CCP's fix was pure friction: higher order-modification fees plus a Relist Charge. Mitigation for you: **no continuous order book, and a price-change granularity coarse enough that micro-adjustment is pointless** (OTC's ~10-units-per-$1 with a flattening curve does exactly this).

**Pitfall 3 — one runaway sell location breaks everything.** Elite's Void Opals reached a reported 500M+ credits per unit at specific markets under specific conditions, which collapsed all other play into a single loop; Frontier nerfed opals and Low-Temperature Diamonds hard in 2020, and community guides now report core and laser mining as roughly comparable. Mitigation: a **concave payoff** — OTC's hard rule that it never takes more than 100 units bought to move a price $1 caps how far one player can push a single good.

**Pitfall 4 — unbeatable numbers make the economy decorative.** Hardspace's $1.25bn debt is explicitly not clearable "under normal circumstances," and a substantial slice of reviewers concluded "credits are pretty much an irrelevance" and the debt is "largely a facade." The salvage *sorting* carries the game; the economy is set dressing. Mitigation: if you ship a debt mechanic, make it payable, and make failure do something.

**Pitfall 5 — depletion that punishes without offering a move.** Surviving Mars gets steady "mines deplete too fast" complaints because relocating an extractor means relocating the dome, worker shifts and drone coverage around it. Paradox's answers were a breakthrough (Nano Refinement: depleted deposits still trickle) and a wonder (Mohole: near-infinite) — i.e. they patched *around* depletion rather than fixing the relocation cost. Mitigation: make the mine cheap and movable; put the sunk cost in roads/power/storage so relocating is a *routing* puzzle you want to solve.

**Pitfall 6 — automation that eats the decision.** X4 lets Managers and Traders run the whole economy on auto with price bands, after which the player is reading reports. OTC's line is drawn much better: it automates the *bookkeeping* — Auto-Supply for inputs, Ctrl+Shift auto-sell, Turn Off Unprofitable, and a hold-X overlay showing **profit per second for every building** — while leaving monopoly choice, launch timing, sabotage and share purchases entirely manual. **Automate arithmetic; never automate judgment.**

**Pitfall 7 — upkeep that you can't see on the map.** Per Aspera denominates upkeep in Electronics and Parts consumed by maintenance drones, so a shortfall appears as *visibly broken buildings and idle drones* rather than as a negative number. Anno's coins-per-minute balance is legible but abstract. On a hex grid, goods-denominated upkeep is strictly better: the shortage has a location.

**Pitfall 8 — too many resources.** OTC's 13 is near the practical ceiling for a market where the player is expected to track every price simultaneously; Per Aspera's 6+6 is comfortable. Factorio and DSP have hundreds of intermediates and no market, which is the only reason they get away with it. A market and a long chain are mutually exclusive — **pick one.** OTC picked the market, and that is the correct precedent for your game.

---

## Flagged as unverified or unresolved

- All Fandom-hosted wikis were unreachable (HTTP 402 / Cloudflare 403; web.archive.org also blocked), so items marked **[snippet]** rest on search-engine excerpts of those pages rather than a direct read. Chiefly affected: OTC Market/Offworld Market/Stock/Resource/Black Market pages, Surviving Mars Rare Metals, Hardspace Currency/Campaign/Salvage, Anno 1800 Trade/Anne Harlow/War, Elite Dangerous Smuggler/Void Opals, Per Aspera Aluminum Mine, X4 Modules.
- **OTC exact price-impact formula.** The "~10 units per $1" is a player approximation; the wiki's band- and player-count-dependent formula and the "never more than 100 units per $1" cap are from snippets. The per-tier deposit rates (2 / 1.5 / 1 / 0.25 per sec) come from a garbled snippet and conflict in units with the 2014 percentage modifiers, though they reconcile numerically.
- **OTC share-price bought-modifier**: +5% per block (dev forum) vs +10% (player analysis). Unresolved.
- **OTC black market item prices**: no base prices found for any item; the "price doubles per purchase" claim in one Steam guide is **not** supported by the wiki, which says only that the price of that specific item rises for all players, with a 60-second base cooldown. The 2014 ruleset *does* say "each purchase doubles the price for all players" with a 60-turn lockout for the buyer, so this may simply have been rebalanced.
- **Hardspace material values** differ by a factor of ~2 between the 1.0-era Steam guide (Nanocarbon 72.1 Furnace / 97.5 Processor per kg) and a Nov-2025 list (45/kg). The *ratio* between destinations is the reliable finding. The 550k/shift break-even figure is a single unverified player report.
- **X4 workforce production bonus**: reported between +30% and +43%, with ~1.2× typical; all figures predate recent patches. **X4 illegal-wares / police-scan mechanics: could not verify at all.**
- **Satisfactory Miner Mk.3 on a pure node at 250%**: sources give 780/min (belt-clamped) vs 1,200/min. Unresolved.
- **Astroneer Trade Platform ratios and Chemistry Lab scrap values** disagree across wiki versions (Lithium, Dynamite, Carbon).
- **Anno 1800 pirate ceasefire duration** (~2 hours game time) and **Harbourmaster's 500-coin passive-trade tax** are community figures without an official source. Sources also directly contradict each other on whether trade routes generate income; the correct reading is that *internal* routes don't and the profit is in the goods, while routes to AI harbours do.
- **EVE fee rates** (7.5% base sales tax → 3.3% with Accounting V; 3% base broker fee; ~5% NPC reprocessing tax) are from the EVE University wiki but one supporting source is ~2 years old and CCP has changed these caps before (2021 raised max sales tax 2.5%→8% and max broker fee 2.5%→3%).
- **Deep Rock Galactic**: the wiki's claim that surplus Morkite pays credits conflicts with a 2018 forum thread saying only Gold did; likely changed since.

## Sources

Offworld Trading Company: https://www.designer-notes.com/offworld-rules-circa-june-2014/ · https://mohawkgames.com/2014/06/16/offworld-rules/ · https://wiki.offworldgame.com/index.php/Buildings · https://wiki.offworldgame.com/index.php?title=Resources · https://forums.offworldgame.com/474117/a-look-at-debt-share-prices-and-bond-ratings · https://steamcommunity.com/sharedfiles/filedetails/?id=1146344676 · https://steamcommunity.com/sharedfiles/filedetails/?id=1661490975 · https://www.stardock.com/games/article/463724/offworld-trading-company-campaign-rules · https://github.com/TC01/ExhaustibleResources · https://offworldtradingcompany.fandom.com/wiki/Market · https://offworldtradingcompany.fandom.com/wiki/Offworld_Market · https://offworldtradingcompany.fandom.com/wiki/Black_Market · https://offworldtradingcompany.fandom.com/wiki/Resource · https://offworldtradingcompany.fandom.com/wiki/Stock · https://en.wikipedia.org/wiki/Offworld_Trading_Company

Dyson Sphere Program: https://dsp-wiki.com/Buildings · https://dyson-sphere-planner.com/ · https://steamcommunity.com/app/1366540/discussions/0/3711558744933258836/ · https://smart-calculators.net/en-US/tools/dyson-sphere-program-production-calculator

Factorio: https://wiki.factorio.com/Rocket_silo · https://wiki.factorio.com/Low_density_structure

Satisfactory: https://satisfactory.wiki.gg/wiki/Miner · https://satisfactory.wiki.gg/wiki/AWESOME_Sink · https://www.satisfactorytools.com/codex/buildings/miner-mk-2 · https://www.satisfactorytools.com/codex/buildings/miner-mk-3 · https://satisfactory-planner.net/en/articles/awesome-sink-points/

Astroneer: https://astroneer.wiki.gg/wiki/Trade_Platform · https://astroneer.wiki.gg/wiki/Scrap · https://atenfyr.com/calculators/extras/scrapguide · https://astroneer.gamecore.wiki/en/buildings/portable-smelting-furnace/

X4: Foundations: https://steamcommunity.com/sharedfiles/filedetails/?id=2968249103 · https://x4playershandbook.com/index.php/index-stations/habitats-and-workforce/ · https://steamcommunity.com/app/392160/discussions/0/3016815718832304872/ · https://x4-foundations-wiki.fandom.com/wiki/Wares · https://x4-foundations-wiki.fandom.com/wiki/Modules

EVE Online: https://wiki.eveuniversity.org/Tax · https://wiki.eveuniversity.org/Trading · https://wiki.eveuniversity.org/Upwell_structures · https://iskscout.com/blog/eve-reprocessing-guide · https://tagn.wordpress.com/2020/02/25/ccp-takes-aim-at-undercutters-and-market-bots-in-new-eden/ · https://steamcommunity.com/app/8500/discussions/0/1742229167221221340

Deep Rock Galactic: https://deeprockgalactic.wiki.gg/wiki/Credits · https://steamcommunity.com/sharedfiles/filedetails/?id=1318185247

Hardspace: Shipbreaker: https://steamcommunity.com/sharedfiles/filedetails/?id=2136065231 · https://qnnit.com/hardspace-shipbreaker-material-value-list/ · https://www.neoseeker.com/hardspace-shipbreaker/Salvage · https://hardspaceshipbreaker.fandom.com/wiki/Currency · https://hardspaceshipbreaker.fandom.com/wiki/Campaign · https://twincitiesgeek.com/2020/07/in-hardspace-shipbreaker-paying-off-massive-debt-is-brilliant-fun/ · https://gideonsgaming.com/hardspace-shipbreaker-review/

Elite Dangerous: https://edmining.com/core-mining/ · https://edmining.com/laser-mining/ · https://steamcommunity.com/sharedfiles/filedetails/?id=3579503571 · https://roguey.co.uk/elite-dangerous/help/smuggling-goods/ · https://elite-dangerous.fandom.com/wiki/Smuggler · https://elite-dangerous.fandom.com/wiki/Void_Opals · https://ricardosgaming.com/blog/elite-dangerous-laser-mining-guide-2026-best-ships-hotspots-and-credits-per-hour/

Anno 1800: https://anno1800.fandom.com/wiki/Trade · https://anno1800.fandom.com/wiki/Trading_Post · https://anno1800.fandom.com/wiki/Anne_Harlow · https://anno1800.fandom.com/wiki/War · https://steamcommunity.com/app/916440/discussions/0/3803904095520440745/ · https://gamerant.com/anno-1800-how-set-up-trade-routes/ · https://evagamestation.com/2025/10/11/anno-1800-anne-harlow/

Surviving Mars / Per Aspera: https://survivingmars.paradoxwikis.com/Exterior_buildings · https://survivingmars.fandom.com/wiki/Rare_Metals · https://steamcommunity.com/app/464920/discussions/0/2949168687321608434/ · https://guides.gamepressure.com/surviving_mars_guide/guide.asp?ID=43924 · https://peraspera.fandom.com/wiki/Aluminum_Mine · https://www.pcgamer.com/per-aspera-review/ · https://steamah.com/per-aspera-logistics-system-guide/ · https://www.pcgamesn.com/per-aspera/review
