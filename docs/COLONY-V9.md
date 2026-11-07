# Earthlight Space Colony Rebuild: version 9

The owner (2026-11-07): "More landmarks and wonders, please. Eden has so much space, and the game ends with so much of it unused." Then, the same day: "The simcity style pods of land don't work... remove them unfortunately they took a long time to develop and i went back to the traditional habitat".

Version 9 adds three things that use space: **wonders** (a grander tier above the landmarks, 4×4 to 6×6, built in stages), **tourism** (a reason to fill the streets round a wonder with parks, leisure and hotels) and **the Ark** (a 7×7 megaproject in space, the second ending). It also **retires the growable quads**.

New data carries `ver: 9`: 12 buildings (8 wonders including the Ark, the Hotel, Promenade, Theatre and Casino) and 3 techs.

## 1. Wonders (js/colony/wonders.js; data in data/buildings.js `wonder`)

They have their own **Wonders** tab in the build menu (`CATEGORIES`, teal). A wonder is a landmark's big sibling:
- **One of a kind**, and waits on a **requirement met once and kept** (`state.landmarks.earned`). `landmarks.js` reads `wonder` exactly as it reads `landmark`, and adds one requirement word, `built: [keys]`: those landmarks or wonders must stand finished. A locked card says what is missing, for example "Needs Governor's Garden finished."
- **Built in stages.** Placing it orders stage 1 (`cost`, `days`). Each later stage is a level (`levels[i]` with its own `name`, `cost` and `days`), ordered from the wonder's panel ("Next stage: Glasshouses") through `rules.upgrade`, once the stage before is done. A stage's cost may include **alloy, helium-3, food, water or air** (`rules.EXTRA_COST`; `costOf`, `afford` and `pay` handle them, and a refusal says how much is missing and what the stores hold).
- **Works only when finished:** the last level's fields (jobs, upkeep, power, makes, park, service, housing) are the working wonder's; earlier stages cost a little upkeep and do nothing. `wonderWorks(b)`: last stage, finished, on, undamaged.
- **A moment** when the last stage is done: a `wonder` event with the speaker's line and **Show me** (`WLINES`).
- The log says what comes next after each stage: "Grand Arboretum: Terraces finished (stage 1 of 3). Order the next stage, Glasshouses, from its panel."

| Wonder | Size, where | Stages (base cost, days) | Requirement | Lasting effect | Tourism |
|---|---|---|---|---|---|
| **Concert Hall** (`concerthall`) | 4×4, upper or main | Foundations 3,000 cr 200 p, 8 d → Shell 4,000/300/80 alloy, 10 d → Concert Hall 5,000/400/120 alloy, 12 d | 2,500 colonists, Monumental Engineering | happiness 8 for every home within 24 tiles (a service kind), land value +10 within 20, leisure 3 | 25 |
| **Memorial Garden** (`memorial`) | 5×5, main deck (soil) | Grounds 3,000/150, 8 d → Walls of Names 4,000/250, 10 d → Memorial Garden 5,000/300/60 alloy, 10 d | 2,500, Hall of Names, Monumental | +5 happiness; grief and fear fade ×2 again (on top of the Hall of Names); park 12 within 16; land value +10 within 16 | 30 |
| **Grand Arboretum** (`arboretum`) | 6×6, upper deck gardens | Terraces 6,000/400, 12 d → Glasshouses 8,000/600/150 alloy, 14 d → Grand Arboretum 10,000/800/250 alloy, 16 d | 5,000, Governor's Garden, Monumental | +4 happiness; park 14 within 20; land value +15 within 24; 500 air a day (uses 150 water) | 40 |
| **Great Library** (`library`) | 5×5, upper or main | Foundations 5,000/400, 10 d → Stacks 7,000/500/100 alloy, 12 d → Great Library 9,000/700/200 alloy, 14 d | 5,000, Hall of Names, Monumental | **4 research a day per 1,000 colonists** (100 at 25,000); land value +8 within 16 | 25 |
| **Starport** (`starport`) | 5×5, in space by the hull | Moorings 8,000/600/200 alloy, 12 d → Piers 10,000/800/300, 14 d → Starport 12,000/1,000/400, 16 d | 5,000, Orbital Elevator, Monumental | **transports ×2**; **visitors who can arrive ×4** (tourist liners) | 20 |
| **Zero-G Arena** (`arena`) | 6×6, lower deck | Excavation 8,000/600, 12 d → Frame 10,000/800/300 alloy, 14 d → Zero-G Arena 12,000/1,000/400 alloy, 16 d | 10,000, Monumental | +6 happiness; 300 credits a day in tickets | 50 |
| **Spin-Gravity Ring** (`spinring`) | 6×6, in space | Hub 12,000/1,000/400 alloy, 14 d → Spokes 15,000/1,200/600, 16 d → Ring 18,000/1,500/800 alloy/100 helium-3, 18 d | 10,000, Starport, Monumental | **homes for 3,000**; +3 happiness | 20 |
| **The Ark** (`ark`) | 7×7, in space | see §3 | 15,000, Starport, Generation Ships | the second ending; then +5 happiness | 30 |

Costs scale with difficulty and Ruess's Workshop like any building. The space wonders (`zone: 'any'`, on void, hull, asteroid or magnetic tiles) stand within a dock's or Tether Mast's reach. Totals: a 2,500-colonist wonder costs about 12,000 credits and 650–750 parts; a 10,000-colonist one 30,000–45,000 credits, 2,400–3,700 parts and 700–1,800 alloy.

**How they change play:**
- The **Starport** is the growth wonder: transports twice as big, and it lifts the tourism arrivals cap from 300 to 1,200 a day.
- The **Great Library** makes research scale with the city, so the late tree (Monumental Engineering, Generation Ships) comes in reach.
- The **Spin-Gravity Ring** is a 3,000-home building in space, freeing deck room.
- The **Arboretum, Concert Hall, Memorial Garden and Library** raise **land value** around them (`landvalue.js`: "A wonder nearby", all together up to +25), which is where Grand Hotels (value 55) and fast-growing homes (value 60) want to be. Their footprints, the parks and the radius make the space round them worth filling.

**Where the effects plug in** (wonders.js): `wonderHappy` (sim.js step 7), `wonderFade` (mood fade), `wonderTransport` (sim.js step 9), `wonderResearch` (sim.js 5b, at the Library's working rate), `wonderVisitors` (tourism.js), `wonderValues` (landvalue.js). `wondersDay(state, { say, ask })` runs after the petitions: requirements earned (log line "A wonder can be built: …"), the moment, and the Ark's ending; it returns true on the day the Ark is finished, and sim.js adds an `ark` event that pauses.

**3D kits** (kits.js `wonderKit`): every wonder has a finished kit, a skyline of its own with a teal and gold trim. Below the last stage the view shows the finished kit cut off at `stage / stages` of its height, greyed toward concrete (stage 1) or steel (later), inside corner scaffolding with two tower cranes; tilted parts are shortened along their own axis, so a Concert Hall's shells rise stage by stage. While a stage is being built, view.js draws the stage it has in solid and the new stage as the usual construction ghost around it. The finished kits are 2.9 (Concert Hall) to 4.6 tiles tall. The Ark's dock is drawn empty once she has flown (`b.launched`, in the view's signature).

## 2. Tourism (js/colony/tourism.js)

Visitors come to see Eden, stay in its hotels and pay credits every day; nothing else about them is simulated.

| Part | Amount |
|---|---|
| **Attraction** | each finished wonder's `tourism` (20–50) + 8 a working landmark + 0.25 a point of park rating of every park, grove and garden (up to 30) + 2 a point of leisure (up to 30) + (happiness − 50) × 0.5 (up to 25) + (land value at the hotels − 30) × 0.5 (up to 20) |
| **Want** | attraction × 8 visitors a day |
| **Beds** | the hotels' `beds` |
| **Arrivals** | 300 a day through a finished dock; ×4 with the Starport |
| **Visitors** | the least of want, beds and arrivals |
| **Spending** | 1 credit a visitor a day + 0.2 a point of leisure, up to 3; Commerce ×1.2 |

`tourismOf(state)` returns all of it with the parts and what limits it (`limit`: dock, beds, arrivals or attraction; `tourismLimitText` words it). `tourismDay` runs in sim.js step 10 beside tax: the credits are made, and `state.tourism = { day, visitors, credits, score }` and `stats.last.tourism` keep the day's figures.

**Buildings** (research **Tourism**, society, 260 points, needs Civic Planning):

| Building | Size, decks | Cost, days | Does |
|---|---|---|---|
| **Hotel** | 2×2, all | 900 cr 60 p, 6 d | a Guest House (80 beds) that grows by itself, like a Habitat (`GROW_KEYS`), into a **Hotel** (200; every need met, a park, leisure within 16 tiles) and a **Grand Hotel** (400; + land value 55). Upkeep 4 / 8 / 14 |
| **Promenade** | 2×2, all | 700 / 40, 5 d | 6 jobs; happiness 3 within 10 tiles (service kind); leisure 1 |
| **Theatre** | 2×2, all | 1,200 / 80, 6 d | 14 jobs; happiness 4 within 12; leisure 2 |
| **Casino** | 3×3, main or lower | 2,500 / 150, 8 d | 40 jobs; 100 credits a day; leisure 3 |

The new need word `leisure` (rules.habitatNeeds, `leisureNear`, `LEISURE_REACH` 16) is met by a working building with `leisure` on the hotel's deck within 16 tiles; the Concert Hall counts.

**Numbers.** In the browser check, a finished Concert Hall, one landmark, and two Guest Houses beside a Promenade and a park: attraction 62 (496 would come), 160 visitors (every bed full), 2.16 credits each, 346 credits a day. Five Grand Hotels with the Starport, two wonders and a Casino: 1,200 visitors at 3 credits, about 3,600–4,300 credits a day, against 8,700 a day of tax at 25,000 colonists.

**Interface:**
- **More pop-out** (top bar): a **Tourism** stat ("160 visitors +346 cr/d"), shown once Tourism is researched or visitors have come; its tooltip lists the attraction parts, beds, arrivals and what holds tourism back; a click opens the Market.
- **Market panel**: a **Tourism** section with three bars (want to come, beds, arrivals), the limiting factor in words, and the attraction parts as a table.
- **Inspector**: a Hotel's beds, a leisure building's leisure.

## 3. The Ark (megaproject)

A generation ship in a 7×7 dock in space beside the hull, in five stages, each a big bill:

| Stage | Base cost | Days |
|---|---|---|
| Keel | 20,000 cr, 2,000 parts, 1,500 alloy | 20 |
| Hull | 25,000 cr, 3,000 parts, 3,000 alloy | 24 |
| Drive | 30,000 cr, 2,500 parts, 2,000 alloy, 800 helium-3 | 28 |
| Habitat Decks | 30,000 cr, 4,000 parts, 2,000 alloy | 24 |
| The Ark (provisions) | 40,000 cr, 2,000 parts, 600 helium-3, 8,000 food, 8,000 water | 20 |

That is 145,000 credits, 13,500 parts, 8,500 alloy, 1,400 helium-3 and 116 days of a crew, and the stores to hold each bill (3,000 alloy is eight Warehouses' worth). Requirement: 15,000 colonists, the Starport finished, **Generation Ships** (logistics, 1,200 points; needs Monumental Engineering, Fusion Power, Arcologies).

**The second ending, Beyond Eden.** When the last stage is done, `wondersDay` records `state.ark = { day, pop, wonders, landmarks, buildings, visitors, restored, difficulty }`, marks the building `launched`, logs it and adds an `ark` pending event. ui.js shows it in the **victory screen's style** (`renderVictory`, with `ARK_ENDING`'s three voices, the Ark's numbers and the art slot `scene/ark`, falling back to the ending's still; no video). main.js saves at once when it is answered and plays the victory sting. It plays once. It is **optional**: it neither needs nor changes `state.victory`, so Eden Restored is untouched. Afterwards the Ark gives +5 happiness.

## 4. The quads retired (owner, 2026-11-07)

- `livingquad`, `marketquad`, `workshopquad` carry `retired: true`. They are off `buildable` and the build menu, never unlocked (`newGame` skips them; `upgradeState` removes them from an old save's `unlocked`), and `placeCheck` refuses a new one: "Living Quads are no longer built: zoned lots are retired. Build Habitats and Tower Blocks instead (those already standing keep working)." Moving an old one is allowed.
- **Old saves' quads keep working exactly as before**: homes, jobs, credits, parts, shopping, noise, their level logic and the demand that paces it. `rules.QUAD_VALUE` is now empty: their land-value gates are dropped.
- **Gone from the interface**: the R/C/I demand bars (`renderRci` hides its element), the "Zoning and growth" help section, the quads' card sort, and the advisor's "or zone Living Quads".
- **Kept and re-pointed**: School, Transit Station and Monorail Stop (they speed Habitats and Tower Blocks); the Freight Yard (stores, and now **Smelters and Fabricators** in range make a quarter more); Commerce (+20% on Market sales and on visitors' spending; legacy Market Quads keep their +20%); Urban Planning (Transit); **Skyscrapers** (Monorail Stop, and Tower Blocks grow into a 4th level, a **Skyscraper for 600**, with transit in reach); Automation (+20% Fabricators); Light Industry (Freight Yard).
- **Land value** now gives Habitats and Tower Blocks a gentle bonus: on land worth 60 or more they grow a day sooner (`rules.VALUE_GROW`, sim.js step 8). A Grand Hotel needs 55.
- **Petitions**: the dock traders now ask for a Warehouse near the dock, the old market traders for a Granary.
- docs/COLONY-V7.md carries a "Retired (2026-11-07)" note.

## 5. Art

13 new slots in art.js, each with a prompt in `tools/art/colony/prompts/`:
- cards: `arboretum`, `library`, `concerthall`, `memorial`, `arena`, `starport`, `spinring`, `ark`, `hotel`, `promenade`, `theatre`, `casino` (`card-<key>.txt`);
- the Ark's ending: `scene/ark` (`scene-ark.txt`, edited from the title picture like the ending).

**No images were generated** (no xAI call): the cards fall back to their drawn icons, the Ark's ending to the Eden Restored still.

## 6. Help

How to play gains **Wonders**, **Tourism** and **The Ark** after Landmarks, loses **Zoning and growth**; Homes & happiness says how Tower Blocks, Schools, transit and land value speed homes; Land value names the wonders and the new thresholds.

## 7. Tests and saves

- **`tests/colony-wonders.mjs`** (91 checks): data (sizes, stages, requirements, decks and space), kits that change at every stage with cranes, slots, prompts and help; the locked reasons, the requirement kept once met, one of a kind; the stage flow (each stage waits for the last, pays alloy, takes its own days, says what is next; no effect and no moment before the last stage; the moment once); every effect measured (happiness, park, land value, Library research, Concert Hall service, Starport ×2 transports in a running colony, Ring housing, Memorial fade); the Ark (requirement, five stages, provisions, the ending once, `state.ark` saved, Eden Restored untouched); saves mid-stage and old saves.
- **`tests/colony-tourism.mjs`** (35 checks): data and help, the read-out in ui.js, every part of the formula (beds, arrivals, landmarks, wonders, greenery cap, happiness, leisure spending cap, Commerce, Starport ×4, no dock), a Guest House placed through the rules growing into a Hotel with a park and a Promenade in reach, the Grand Hotel's land value, the day's credits, save and load.
- **`tests/colony-quads.mjs`** is now a legacy test (24 checks): retired, refused, never unlocked (an old save's `unlocked` is cleaned), no zoning help or RCI bars; an old save's quads still grow, earn, make parts, save, move and demolish; the supporting buildings and techs re-pointed (Skyscraper level, Commerce on sales, Freight Yard on Fabricators).
- **Updated**: `tests/colony-sim.mjs` (89 buildings on the menu: +12 of version 9, −3 retired), `tests/colony-v2.mjs` (50 techs; 4 more tech-locked buildings), `tests/colony-landvalue.mjs` (the growth section: a Grand Hotel's value need, quads' gates gone, the value-60 bonus), `tests/colony-petitions.mjs` (the traders' Warehouse).
- **Saves.** `upgradeState` adds `state.wonders = { done }` and `state.ark = null` to an older save. Nothing else is new in the save: a wonder's stage is its `level` and `build`.

**Checked in the browser** (Playwright, chromium with SwiftShader): a Concert Hall at stage 1 (shells half up, scaffolding and cranes), stage 2 under construction (stage 1 solid inside the ghost), stage 2 done, finished with its moment; the Tourism stat in the More pop-out and the Market's Tourism section; the Wonders tab; no console errors (only the existing `__test_rom` / `__test_patch` probes answer 404).
