# Earth Light: *Landfall* — colony-building game (design plan, draft 1)

Working title: **Earth Light: Landfall**. Alternatives: *Second Light*, *Homeport*, *Reconstruction*.

A third mode beside the original campaign and the expansion: a **space colony builder** in the
SimCity tradition, set after the expansion's final battle, running on the same engine, the same
ROM-decoded graphics and the same save file. Owner's pitch, 2026-11-03. Nothing here is built
yet; this document is the plan to agree on first.

---

## 1. Survey: what the genre does, and what we take

Read before designing (sources at the end). One line each: the mechanic, and our verdict.

| Game | Mechanic worth stealing | Verdict for *Landfall* |
|---|---|---|
| **Surviving Mars** | Hard life support: power, water, oxygen and food are separate chains; domes are containers; deposits are finite; low comfort makes colonists *leave*. One meteor strike on a generator cascades through everything. | **Take** the layered utilities and the buffer tanks (a shortage should be survivable for a few days, not instant death). **Drop** the cable-and-pipe routing: on a hex board it is pure tedium. Utilities are area-of-effect instead. |
| **IXION** | A decaying hull plus scripted narrative crises; many players' first run ended in starvation because nothing told them to farm. | **Take** the scheduled crises. **Avoid its worst review**: systems the game never explains. Every number in *Landfall* is visible in a breakdown panel. |
| **Aven Colony** | Twelve map overlays (crops, happiness, crime, air, power, employment, commute…); click a colonist to hear the complaint; rationing saves food but costs morale. | **Take** overlays and a "why is happiness 42?" itemised list. **Take** rationing as an emergency lever. |
| **Frostpunk** | Two meters (hope, discontent) and a Book of Laws; problems escalate to protests and then riots if ignored; lose if a meter stays bad too long. | **Take** the escalation ladder and a small set of **edicts** with real trade-offs. **Avoid** the common complaint: events that drain the meter no matter how well you play. |
| **SimCity 4** | Tax rate per class; demand caps that only civic buildings raise; land value decides what gets built; the mayor rating. Growth and recovery are *slow* — that lag is the genre's signature. | **Take** the tax slider, the demand cap as the growth gate, and the slow recovery the owner asked for. |
| **They Are Billions / Age of Darkness** | A visible wave timer. The whole game is economy against defence, and the clock is always on screen. | **Take** the raid clock. This is exactly the owner's "pirates take a long time to find the outpost": the clock is long and visible, so non-beta players can prepare. |
| **Offworld Trading Company** | Everything is sellable into a market whose prices move. | **Take** selling, in the simple form the expansion already has: machines and goods go back for credits at a fixed rate. |
| **"How to tune a simulation game"** (Game Developer) | Map every resource chain as a graph; build a per-tick spreadsheet model; aim for net ≈ 0 and flag big imbalances; ramp difficulty by raising **sinks**, not by nerfing production. | **Take all of it as process**: `tools/colony-model.mjs` prints the stationary table, `tests/colony-sim.mjs` runs 500 days headless. We tune the sheet, not the game. |

Two genre lessons shape the whole design:

1. **Shallow chains, legible numbers.** Three steps maximum from raw to useful (ore → alloy →
   parts). Deep chains are where city builders lose people.
2. **Difficulty comes from sinks.** Upkeep, army wages, repairs and population growth rise over
   time. Production buildings stay honest.

---

## 2. Story and place

Follows `docs/STORY.md` straight on from the finale (and the hidden Nineveh battle).

Earth's seas are poisoned and most colonies are dead hulks. The fleet that beat Kessrin has
nothing left to fight. **The General — the expansion's player character — is made Governor** of
the first reconstruction site, and that is who the player is now: the same person, a different
job.

Site: **F2 Eden**, the Foundry the war barely touched (`docs/EXPANSION.md` lists Eden and
Atlantis as "hardly a battlefield in the original" — it is the one honest "less affected area
near Earth" the lore gives us). Earth is overhead the whole game; late on you ship food *down*
to it.

Returning cast, each tied to a system:

| Character | Role in the colony | System they front |
|---|---|---|
| **Prof. Hal Ruess** | Chief engineer | Tech tree, utilities, repairs |
| **Capt. Mira Sato** | Commander of the Colony Guardians | Army, raids, the raid clock |
| **Queen Moraine** (Ashfall Cartel) | Trader **or** chief raider | Market, tribute demands |
| **Lt. Dov Arkin** | Guardian wing leader, if he lived | Raid flavour |

**Carry-over hook**: the expansion save stores `state.choice` (`deal` / `refuse`). If you dealt
with Moraine, the cartel is your trade partner and the raiders are leaderless scavengers and
Union deserters. If you refused her, **the cartel is the main pirate threat** and trade costs
more. One stored byte, two campaigns.

---

## 3. The core loop

A tick is **one day**. Press ▶ and days run at 1/sec (pause, ×2, ×4) — SimCity's feel, but every
tick is an integer step, so a headless test can simulate 500 days in milliseconds.

```
day tick
  1. labour      assign colonists to job slots (buildings idle without staff)
  2. production  each staffed building produces, consuming its inputs
  3. utilities   power and air are instantaneous: demand > supply = brownout, buildings throttle
  4. stores      food, water, ore, alloy, parts, credits move in and out of buffers
  5. needs       food/water/air/power/housing per colonist -> met or unmet
  6. happiness   recompute from needs, tax, services, entertainment, crowding, fear
  7. population  immigration ship / natural growth / emigration / deaths  (slow, lagged)
  8. money       taxes in, upkeep and wages out
  9. research    labs add research points; milestones add upgrade points
 10. threat      heat rises, the raid clock advances, warnings fire
 11. events      crises, convoys, tribute demands
```

Steps 1–4 are a function of the build grid alone, so they are testable in isolation. Steps 5–9
are the SimCity half. Steps 10–11 are the Earth Light half.

---

## 4. Resources

Seven, which is as many as stays legible.

| Resource | Source | Sink | Buffer |
|---|---|---|---|
| **Power** (MW) | Solar arrays, fusion (T2) | Every building | Battery banks only |
| **Water** (m³) | Ice mines, reclaimers | Farms, air plants, colonists | Water tanks |
| **Air** (units) | Electrolysis (water + power) | Colonists, sealed buildings | Air tanks — small, so a power cut is a *crisis* |
| **Food** | Hydroponics, algae vats, soy domes | Colonists, guardian crews | Granaries |
| **Parts** | Ore mine → smelter (alloy) → fabricator (parts) | Construction, repairs, the Arsenal | Warehouses |
| **Credits** | Taxes, market sales, Earth relief contracts | Construction, upkeep, wages, tribute | — |
| **Supply** | Arsenal converts parts → supply | Building and repairing machines | — |

**Supply is the expansion's own currency**, kept deliberately: it is the one place the colony and
the army compete head-on. Parts spent on supply are parts not spent on housing, and the player
feels it. Machine prices stay exactly as `js/expansion/campaign.js` sets them
(`price = value × hp`, so a Mars is 8, an Athena 24, a Nodens 60, an Azoras Kai 352).

Plus two progression currencies:

* **Research points** — produced by labs staffed with scientists; spent on the tech tree.
* **Upgrade points (UP)** — 1 per milestone, 1–3 per repelled raid, 1 per Earth relief contract;
  spent on permanent percentage upgrades. Research *unlocks* buildings, UP *improves* them. Keeping
  them separate means a player who fights well is rewarded differently from one who builds well.

---

## 5. Population

Colonists are a number with a composition, not a crowd of simulated people (Aven Colony's
per-person sim is charming and expensive; the owner asked for SimCity, not Dwarf Fortress).

* **Classes**: Workers → Technicians → Scientists. Schools promote workers to technicians,
  the Academy promotes technicians to scientists, both slowly. Buildings demand classes by slot:
  a fabricator wants technicians, a lab wants scientists.
* **Housing** decides the cap. Over cap = crowding, a happiness penalty, no immigration.
* **Immigration** is the main growth: a transport arrives every ~10 days if happiness ≥ 55,
  housing is free and food has a surplus; it brings 8–20 people. Below 40 happiness, nobody comes.
* **Natural growth** is slow and needs a clinic.
* **Emigration** at happiness < 25, **deaths** from starvation, suffocation or raids.
* **Recovery is slow, on purpose** (owner's requirement): a dead colonist is gone, and the
  transports only trickle back once the colony is pleasant again. A bad month costs a season.

### Happiness (0–100), fully itemised in the UI

```
  base                     50
+ necessities met          +6 each for food, water, air, power, housing   (max +30)
- necessity unmet          -20 each, growing -5 per further day short
- tax penalty              0% -> +8, 10% -> 0, 20% -> -14, 30% -> -32     (non-linear)
+ services                 clinic, school, security: +0..8 each by coverage
+ entertainment            canteen, park, arena, broadcast: +0..6 each    (unlocks later)
- crowding                 -1 per 2% over housing capacity
- fear                     recent raid -10, decaying over 15 days; enemies visible -15
+ guardian cover           +0..10 by guardian strength against current threat level
+/- edicts                 as passed
```

Bands: **≥ 70** immigration bonus and a tax-tolerance bonus · **40–69** steady ·
**25–39** unrest, −20% production, no immigration · **< 25** protests, emigration ·
**< 10 for 5 days** the Council recalls the Governor — **you lose**. Frostpunk's ladder, with
the production penalty attached so unrest is felt before it is fatal.

### Taxation

One slider, 0–30%, the SimCity knob: `revenue = population × wealth × rate`, where wealth rises
with class composition and land value. The happiness curve above means 10% is free, 20% hurts,
30% is an emergency measure. Later, **per-class rates** (workers / technicians / scientists)
unlock, which is where the SimCity tax game actually lives.

---

## 6. Buildings

~34 in all, four tiers. First-pass numbers below — these are the sheet we tune, not gospel.
(Costs in parts, upkeep in credits/day.)

### Tier 0 — Landfall (available on day 1)

| Building | Cost | Jobs | Produces /day | Consumes /day |
|---|---|---|---|---|
| **Landing Pad** | — (start) | — | — | — |
| **Habitat Block** | 20 | — | 40 housing | 4 power, 2 air |
| **Solar Array** | 15 | 1 W | 25 power | — |
| **Ice Mine** | 25 | 3 W | 30 water | 8 power |
| **Water Reclaimer** | 20 | 2 W | 60% of water used returns | 6 power |
| **Hydroponics Bay** | 30 | 4 W | 24 food | 10 water, 6 power |
| **Electrolysis Plant** | 25 | 2 T | 40 air | 8 water, 12 power |
| **Granary / Water Tank / Air Tank / Battery Bank** | 10 each | — | +300 / +400 / +80 / +60 buffer | 1 power |
| **Ore Mine** | 30 | 4 W | 20 ore | 10 power |

Consumption per colonist per day: **1 food, 1.2 water, 1 air, 0.15 power**.

### Tier 1 — Industry (early research)

Smelter (ore → alloy), Fabricator (alloy → parts), Warehouse, Clinic, Canteen, Market,
Sensor Mast, Watchtower, **Repair Dock** (reuses the ROM's dock structure — repairs machines and
re-arms them, exactly as docks do in battle).

### Tier 2 — Society and defence (mid research)

School, Research Lab, Dome Park, Fusion Reactor, Soy Dome (big food, big water),
**Arsenal** (parts → supply, builds machines), **Scrapyard** (sells machines for credits + alloy),
**Guardian Barracks**, **Turret Emplacement**, Shield Pylon, Jammer Array (lowers heat).

### Tier 3 — Reconstruction (late research)

Academy, Arena, Broadcast Tower, Arcology (housing 200), Orbital Elevator (Earth relief
contracts), Fabrication Complex, Fortress Wall segments, Orbital Defence Battery.

**Defences are real Earth Light units.** The ROM already has immobile battery units — Dragon
(type 23) and Hydra (24) — and structures for docks, fortresses and command centres (types
52–57). A Turret Emplacement *is* a Dragon on a hex; a Watchtower *is* a command tower. So when
a raid comes, the colony needs no separate combat model: the colony map is already a legal
Earth Light battle map.

---

## 7. The map

The colony is built on a **hex grid rendered by the existing board**
(`js/render/board.js`, `js/maps.js`), on terrain painted from the ROM's own graphics with the
existing editor (`editor.html`). Eden is bedrock and crater floor with ice veins, ore seams and
a few magnetic-field hexes.

* Each building occupies 1 hex (large ones 1 hex with a visibly bigger sprite; no multi-hex
  footprints in v1).
* **Terrain matters**: ice veins boost ice mines, ore seams are required for ore mines, bedrock
  is needed for heavy buildings, open void hexes are where raiders come in.
* **Adjacency, not pipes**: a building must be within N hexes of a powered hex to be on the grid.
  Habitats want to be near services, mines near their seams. Surviving Mars's spatial puzzle,
  without its logistics chores.
* **Overlays** (Aven Colony's lesson): power, water, air, happiness, jobs, coverage, threat lanes.

This is the single most important architectural decision in the plan: **one map, two modes.**
Build on it in peacetime, fight on it when raiders arrive.

---

## 8. Tech tree and upgrade points

Four branches, six nodes each, unlocked with research points and gated behind milestones so the
story paces them.

* **Life Support** — Reclaimer II → Soy Dome → Sealed Habitats → Air Scrubbers → Arcology → Terrace Farms
* **Industry** — Smelter → Fabricator → Deep Drilling → Fusion → Fabrication Complex → Orbital Elevator
* **Society** — Clinic → School → Dome Park → Research Lab → Academy → Broadcast
* **Defence** — Watchtower → Turret Emplacement → Arsenal → Shield Pylon → Fortress Walls → Orbital Battery
  (and the **Kai refits** at the end: the Kai series machines from the expansion become buildable)

**Upgrade points** buy permanent perks, ~20 of them: +10% farm yield, −15% build cost, +1 turret
range, +2 immigration per ship, −20% machine upkeep, tribute talks cost 25% less, and so on.
UP are also the beta-tester's reward: a carried-over fleet wins raids, raids pay UP.

---

## 9. Threat, raids and the army

### Heat and the raid clock

**Heat** (0–100) rises with what makes you worth robbing: population, stored food and parts,
market traffic, and bright infrastructure. It falls over time and with Jammer Arrays.

Heat sets how often raids come and how strong they are — nothing else. A player who hoards is
raided; a player who sells and spends is not. **Heat does not count the player's fleet**, so
importing an overpowering roster never makes the game harder.

The clock is always on screen: `Next raid: ~day 34 (scouts, 3 machines)`. The owner's pacing:

| Days | Raid | Strength | Who |
|---|---|---|---|
| 1–24 | none | — | nobody has found Eden yet |
| 25 | first **warning**, 5 days out | — | Sensor Mast picks up a contact |
| 30 | **Scavengers** | 1–3 machines, level 0, primitive (Mars, Rockeye, salvage) | leaderless scrap crews |
| 50+ | **Pirate bands** | 4–8 machines, level 0–2 | Ashfall Cartel, if you refused Moraine |
| 90+ | **Deserter warbands** | 8–14 machines, level 2–4, trained (Talos, Hunters, a carrier) | Union and Galt deserters after food |
| 160+ | **Directorate remnant** | 15+ machines, level 4–6, a capital ship | the last of Kessrin's people |

### Three ways to answer a raid

1. **Fight it** — the colony map loads in the battle engine (`game.html`) with your guardians,
   your turrets and your buildings on it. Buildings have HP; a destroyed one costs parts to
   rebuild and the colonists inside die. This is the Earth Light game, played on your own town.
2. **Auto-resolve** — "let the Guardians handle it": the predicted outcome from the strength
   ratio is shown *before* you commit, with expected losses. Keeps the builder loop fast for
   players who are here for the city.
3. **Pay tribute** — food, parts or credits to be left alone. Cheap now, raises heat, and the
   colonists' happiness drops a little for the humiliation. An honest third option.

### The Colony Guardians

* Guardians are **expansion roster entries**: a machine type plus an anonymous pilot level 0–9,
  exactly the format `campaign.js` already uses. Levels carry between raids; a dead pilot is dead.
* **Upkeep is the point.** Each machine costs supply and food per day and occupies one worker as
  crew. A standing army is a tax on the colony, so the minimum viable force is the correct answer
  until the warband era. Sato argues for more; the Council argues for less.
* **Build** at the Arsenal (parts → supply → machine). **Sell** at the Scrapyard for credits and
  alloy — `sell()` and `price()` already exist and need no change.
* Damaged machines go to the Repair Dock, which costs parts. Earth Light's docks, doing their job.

---

## 10. Beta testing: importing the expansion fleet

The owner's beta mode, built on what exists: `js/savefile.js` already parses an exported save,
and the expansion roster already lives in it under `el-expansion-campaign-remnant`.

* **Import save** on the colony's title screen reads that key and turns the surviving roster into
  Guardians, levels and all — the Azoras Kai, the Kai refits, the General's own ship.
* The General's machine becomes the **Governor's flagship**: parked, a morale bonus, and it fights.
* `state.choice` decides whether Moraine trades with you or raids you (§2).
* **Upkeep on imported machines is waived for the first 60 days**, then charged. Beta testers get
  the easy, overpowering ride the owner wants, and then an interesting problem: a war fleet eats a
  colony's food. Scrapping ships you no longer need for a pile of credits is a legitimate and very
  fitting answer.
* Expect it to be trivially easy by design: early scavengers in primitive machines against an
  Azoras Kai is not a fight, it is a demonstration. The game being played is still the rebuild.

---

## 11. Phases of play (the pacing contract)

| Phase | Days | What the player is doing | Pressure |
|---|---|---|---|
| **I Landfall** | 1–30 | Power, water, air, food, first habitats | Nothing can fail twice; buffers are thin |
| **II Industry** | 30–80 | Ore → alloy → parts, taxation, first guardians | First raids; parts torn between housing and the Arsenal |
| **III Society** | 80–160 | Schools, labs, entertainment, immigration waves | Warbands; happiness is now a real system |
| **IV Reconstruction** | 160+ | Fusion, arcologies, Earth relief convoys | Directorate remnant; Earth's quota is a hard sink |

**Win**: Earth relief quota met and 5 000 colonists, happy, defended — "the lights are on at
Eden, and Earth can see them." **Lose**: recalled by the Council (happiness), or the colony's
command centre falls in a raid.

---

## 12. How it gets built (step by step, owner's request)

Each step is playable on its own and ends with a commit.

| Step | What | New code |
|---|---|---|
| 1 | **Sim core**: day tick, 7 resources, 10 tier-0 buildings, plain HTML lists like the intermission | `colony.html`, `js/colony/{state,sim,buildings}.js`, `js/colony/data/buildings.json` |
| 2 | **The map**: hex placement on ROM terrain, overlays, the Eden layout in the editor | `js/colony/map.js`, `missions/colony/eden.json` |
| 3 | **People**: classes, housing, immigration, happiness breakdown, tax slider | `js/colony/population.js` |
| 4 | **Progress**: tech tree, research, upgrade points, milestones | `js/colony/tech.js`, `data/tech.json` |
| 5 | **Threat**: heat, raid clock, warnings, tribute, auto-resolve | `js/colony/threat.js` |
| 6 | **Raid battles**: colony map → battle engine → results back into the colony | `js/colony/raid.js` (bridges `js/game/`) |
| 7 | **Army**: guardians, Arsenal, Scrapyard, upkeep, Repair Dock | `js/colony/army.js` (reuses `campaign.js`) |
| 8 | **Carry-over**: import an expansion save, beta mode, Moraine's branch | `js/colony/import.js` |
| 9 | **Story**: intro, Ruess/Sato/Moraine comms with portraits, events, endings | `js/colony/story.js`, `data/events.json` |
| 10 | **Balance**: the stationary model, a 500-day headless run, tuning pass | `tools/colony-model.mjs`, `tests/colony-sim.mjs` |

**Conventions kept**: plain ES modules, no build step, served by `serve.py`; data in JSON under
`js/colony/data/`; state in `localStorage` under `el-colony`, so **Export save picks it up with no
change at all** (`js/savefile.js` takes every `el-*` key); nothing from the ROM ships; new art is
original or recombined ROM graphics.

**Reused as-is**: `js/render/board.js`, `js/maps.js`, `js/gfx.js`, `js/expansion/pack.js`,
`js/game/*` (battles, AI, fight scenes), `js/savefile.js`, and `campaign.js`'s `price`, `sell`,
`build`, `trade` and roster format.

---

## 13. Open decisions

1. **Time model** — days ticking under a ▶ button (recommended) or discrete turns you end?
2. **One map or two** — build and fight on the same hex map (recommended), or an abstract colony
   screen with battles on separate maps?
3. **Raid resolution** — always a full tactical battle, always auto-resolve, or the player's
   choice each time (recommended)?
4. **What to take from Lanternfall's SimCity mode** — not in this repo, so it needs describing:
   zoning and demand? the budget panel? disasters? the advisors?
5. Title: *Landfall*, *Second Light*, *Homeport*, *Reconstruction*?
6. Army upkeep in food as well as supply, or supply only (simpler)?

---

## Sources

Survey, 2026-11-03:
[Surviving Mars primer](https://admin-forum.paradoxplaza.com/forum/threads/surviving-mars-a-primer.1083069) ·
[Surviving Mars beginnings](https://www.gamepressure.com/surviving-mars-guide/on-the-beginning/zcab81) ·
[IXION review (PC Gamer)](https://www.pcgamer.com/ixion-review/) ·
[IXION review (Netto's Game Room)](https://www.nettosgameroom.com/2025/05/ixion-review.html) ·
[Aven Colony how-to-play wiki](https://avencolony.fandom.com/wiki/How_to_Play_Guide_for_Aven_Colony) ·
[Aven Colony beginner's guide (Xbox Wire)](https://news.xbox.com/en-us/2017/07/25/beginners-guide-aven-colony-xbox-one/) ·
[Frostpunk's hope and discontent (PC Gamer interview)](https://www.pcgamer.com/au/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws) ·
[Frostpunk laws and hope](https://macmyths.com/how-frostpunks-laws-and-hope-system-work/) ·
[SimCity zoning and demand (Prima)](https://primagames.com/eguides/simcity-eguide/essentials/zoning) ·
[They Are Billions preview](https://bit-tech.net/previews/they-are-billions-preview/1/) ·
[Age of Darkness tips](https://www.gameskinny.com/tips/age-of-darkness-final-stand-tips-and-tricks-guide/) ·
[How to tune a simulation game (Game Developer)](https://www.gamedeveloper.com/design/how-to-tune-a-simulation-game) ·
[Best space colony sims 2026](https://colonysimgames.com/article/best-colony-sim-games-2026/)
