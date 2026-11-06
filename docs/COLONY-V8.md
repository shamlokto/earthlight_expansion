# Earthlight Space Colony Rebuild: version 8

Each part below is written by the agent that built it.

## Land value, and day and night (owner, 2026-11-06)

### Land value (js/colony/landvalue.js)

Land value is the SimCity way of reading the city: how much homes and shops want each tile, from 0 to 100. Only tiles in open, pressurised chambers have a value. Every other tile has none (−1).

| Term | Amount |
|---|---|
| Base, an open tile | 25 |
| Parks in reach (`rules.parkField`) | +2.5 a point of park rating, up to +20 |
| Services in reach: the best of each kind in `SERVICE_KINDS` (Clinic, Canteen, Safety, Gallery, Plaza, Shopping, School, Transit...) | +2 a point of service, all kinds together up to +24 |
| A Transit Station or Monorail Stop in reach | +6 |
| A river or lake within 4 tiles | +2.5 × (5 − distance), so +10 beside the water |
| The colony's happiness | (happiness − 50) × 0.2, so −10 to +10 |
| Workshop Quad noise: the loudest quad whose noise reaches the tile (the same gap as `noiseAt`) | −5 a tile of noise past the tile |
| Industry next door (a finished building in the `industry` category) | −3 × (4 − gap), the nearest one |
| Exposed hull: the hull rows within 2 tiles of space, the atmosphere or Earth (raiders and meteoroids) | −4 × (4 − distance), so −12 on the edge |
| An unsealed breach in the chamber | −10 |

**The functions:**
- `landValueGrid(state, deck)` builds a whole deck by stamping each source's area. It takes about 10 ms for a 256×160 deck.
- `landValueParts(state, deck, x, y)` explains one tile with the same numbers: `{ value, parts: [{ label, value }], open }`. A test checks that it agrees with the grid.
- `landValue(state, deck)` caches the grid per state in a WeakMap. It rebuilds when a building is placed, finished, levelled, switched or removed, when a chamber opens, or every 3 days (`LV.refreshDays`), so happiness catches up. It never rebuilds per frame, and nothing is saved.
- `valueOf(state, b)` is a building's value: the mean over its footprint.
- `rules.js` re-exports these: `landValue`, `landValueGrid`, `landValueParts`, `landValueOf` and `LV`. The module imports `rules.js` back, but uses those imports only inside functions.

**Growth.** `value:N` is a new need word in `rules.habitatNeeds`. It only gates growth, like happiness. `rules.QUAD_VALUE` adds it to the next level's needs without changing `data/buildings.js`:
- Living Quads need 45 to become Mid-rises and 55 to become Residential Towers.
- Market Quads need 45 to become Arcades and 55 to become Trade Towers.
- Workshop Quads, Habitats and Tower Blocks do not need it.

The inspector's "To grow into …" list shows it as "Land value 45 (now 52)". The balance run in tests/colony-quads.mjs gives the same result as before, because its district has parks, a Clinic, a School and transit.

**Interface:**
- **Overlay.** A **Value** button follows Reach, Parks and Power, through `rules.coverage(state, 'value', deck)`: the value ÷ 100, with a faint low on open tiles worth 0. A legend appears beside the buttons while the overlay is on: Low, then a blue, green and yellow bar, then High.
- **Inspector.** On a tile in an open chamber, a **Land value** section shows a badge (High 65+, Good 45+, Modest 25+, Low) and the four biggest reasons with their signs.
- **How to play.** A new section, **Land value** (`help-landvalue`), follows Zoning and growth.

**Tests.** `tests/colony-landvalue.mjs` has 36 checks:
- what raises the value: a park, a Clinic, transit, happiness and a river bank;
- what lowers it: Workshops, and a Factory more so; an empty lot does not; a Smelter, exposed hull and a breach;
- sealed chambers have none;
- the grid agrees with the reasons;
- the cache refreshes;
- the growth gates;
- the overlay, the upper deck, the timing and the help.

### Day and night (js/colony/view3d/view.js, `stepDayNight`)

- **The cycle.** One full cycle takes 8 game days (`DN.days`). The clock follows the game's day counter but runs smoothly in real time, at the game speed: 2.5 s a day at ×1. It stops when the game is paused and is kept within a day of `state.day`. Phase 0 is noon and 0.5 is midnight. Day and night each fill about 40% of the cycle, with smooth turns between them.
- **Night.** The hemisphere light drops from 2.2 to 1.5 and turns blue. The sun drops from 2.6 to 0.45, swings across the sky and sinks. The earthshine from below rises from 0.9 to 1.6. The background turns deep blue (#030c2c). Night keeps over half the day's light, so the map stays readable, overlays included.
- **The colony's lights.**
  - The buildings' glow material (the kits' GLOW parts: windows, signs, beacons) runs at ×0.82 by day and ×1.22 at night.
  - **Street lamps** now stand on roads: a post and lamp on every fourth tile of a plain stretch, at the kerb, with a soft additive pool of light on the road that shows only at night. They are built in `syncRoads`, with no extra draw calls per lamp: two instanced meshes with shared materials.
- **Dawn and dusk.** The sun turns orange. The atmosphere band and Earth's rim haze and halo glow warm.
- **Earth turns.** Its texture slides slowly along the rim, one texture width every 160 days. Mirrored wrapping means no seam shows, and it works for the drawn texture and the `sky/earth-below` art alike.
- **The switch.** Settings has **Day and night**, on by default and stored with the other UI settings (`el-colony-settings`, `dayNight`). Off restores the old constant light exactly: the sun in its old place, Earth still.
  - `createView(…, { dayNight })` and `view.setDayNight(on)` control it.
  - For screenshots, `view.debug.setDayTime(p)` holds a time of day (null lets it run) and `view.debug.dayNight()` reads the state.
- **Cost.** A few colour copies and lerps a frame, with no allocation. It works in swiftshader.

## Landmarks and incidents (owner, 2026-11-06)

The owner chose two features: **landmarks**, one-of-a-kind buildings that are big projects with a lasting bonus and a moment; and **incidents you can prepare for**, occasional events that always come with a warning and a fix, never as pure bad luck. The owner already finds the game hard to keep up with, so incidents are gentle, rarer on Easy, never in the first 60 days, and can be switched off.

New data carries `ver: 8`: 7 buildings (6 landmarks and the Flare Shelter) and 1 tech.

### Landmarks (js/colony/landmarks.js; data in data/buildings.js `landmark`)

They have their own **Landmarks** tab in the build menu (`CATEGORIES`, gold). Each one:
- is **one of a kind**: a second is refused with "Eden already has The Lantern: a landmark is one of a kind." (moving it is fine);
- waits on a **requirement** that is met once and then kept (`state.landmarks.earned`), so losing colonists later never takes it away. A locked card says what is missing, for example "Needs 10 chambers open (now 3), research Fabrication.";
- carries no top-level `tech`. `placeCheck` and `buildable` ask `landmarkWhy` instead of `state.unlocked`;
- works while it is finished, on and undamaged, like any building;
- has a **moment** when it is finished: a `landmark` event with the speaker's portrait, the effect, their line, and a **Show me** button that flies to it.

| Landmark | Size, where | Cost, days | Requirement | Lasting effect | Speaker |
|---|---|---|---|---|---|
| **Ruess's Workshop** (`workshop`) | 3×3, any deck | 3,000 cr 250 p, 14 d | 10 chambers open, Fabrication | +2 construction crews; every building costs ×0.9 | Ruess |
| **Governor's Garden** (`govgarden`) | 3×3 on soil, upper or main | 2,500 / 150, 12 d | 500 colonists, happiness 70+ for 30 days in a row | +5 happiness colony-wide; park 12 within 12 tiles; 30 air a day | the General |
| **Sato's Watch** (`observatory`) | 3×3, upper or main | 2,400 / 200, 12 d | 300 colonists, Long-range Sensors, Observation Decks | incidents and raids seen 3 days earlier; 4 research a day | Sato |
| **The Lantern** (`lantern`) | 3×3, main deck | 4,000 / 300, 16 d | every main-deck chamber open | transports ×1.25; relief convoys pay ×1.5; +3 happiness | the General |
| **Hall of Names** (`hallofnames`) | 3×3, any deck | 3,000 / 200, 14 d | 1,000 colonists, Civic Planning | +4 happiness (+3 more with the registry); grief and fear (`raid.moods`) fade twice as fast | Ruess |
| **Orbital Elevator** (`elevator`) | 2×2 on the hull | 8,000 / 600, 20 d | 3,000 colonists, Mass Driver | relief convoys cost ×0.5; Earth imports at the Market ×0.75 | Ruess |

**The Hall of Names and the registry.** When the Ninefold vault has been opened (`secrets.finalOpened`), the Hall holds the registry. Its moment shows the full Ninefold registry, the same 171 names as the vault's pages (`REGISTRY` in ui.js), and it gives +3 more happiness. If the vault is opened after the Hall is built, a second moment comes, "The Ninefold registry", with Sato's line.

**Where the effects plug in.** Each is a small multiplier from landmarks.js:
- `rules.crewsOf` and `costOf`: the Workshop;
- `warnLead` and `incidentLead`: Sato's Watch;
- the transport in sim.js step 9: The Lantern;
- `victory.convoyPay(good, heavy, state)` and `convoyCost`: The Lantern and the Elevator;
- `rules.buyPrice`: the Elevator;
- sim.js step 7: the happiness parts (`landmarkHappy`) and the mood fade (`landmarkFade`);
- `landmarksDay(state, { say, ask })` runs after the goals each day. It counts the Garden's happy days, records what is earned (with a log line "A landmark can be built: …"), and plays each moment once (`state.landmarks.done`).

**3D kits** (kits.js) are each a skyline of their own, with a gold trim band on every one:
- the Workshop: a sawtooth hall, a gantry over a half-built machine, a clock tower and a chimney (2.9 tiles tall);
- the Garden: terraces up to a domed pavilion, a lake with a fountain, a glasshouse and flowering trees (2.6);
- Sato's Watch: a split dome with a telescope, a watch tower with a radar dish and beacon (4.2);
- The Lantern: a stepped plinth, a tapering tower, a blazing glass lantern and a see-through beam (5.8, beam aside);
- the Hall of Names: a colonnaded hall, a reflecting pool with candles, an obelisk and cypresses (3.3);
- the Orbital Elevator: an anchor station with blue rings, stay struts and a cable rising 10 tiles with a lit climber.

### Incidents (js/colony/incidents.js)

`incidentsDay(state, { say, ask })` runs in sim.js's day after the expeditions, before labour and power, so a flare or a fever counts the same day. Its state lives in `state.incidents`: `{ next, coming, last, count, flare, sick, log }`.

**Schedule:**
- The first incident comes no earlier than **day 60 on Normal and day 75 on Easy**, plus up to 20 days.
- After that, one comes every **55–85 days on Normal and 90–130 on Easy**. In 700 days of the test colony that is 10 on Normal and 6 on Easy.
- Each is sighted **5 days ahead**. Hazard Forecasting adds 2 days and Sato's Watch 3 more.
- An incident is picked from those that can happen now, never the same kind twice in a row.
- **Their own dice.** A generator seeded from the colony's seed and the day decides them. The sim's main generator is never touched, so switching incidents never shifts raids, transports or wanderers.

**Each incident comes in two steps:**
1. An `incidentwarn` event: Sato or Ruess says exactly what helps, with a **Show me what helps** button (`p.show`).
2. On the day, an `incident` event tells what happened and what would have helped. The window is green when Eden was ready and red when it was not.

| Incident | Can happen when | Without preparation | What helps |
|---|---|---|---|
| **Meteor shower** | something stands on the hull or in space | up to 3 (Easy 2) unshielded hull and space buildings are damaged for 3 (2) days | **Shield Pylons**: nothing in their 8 tiles is hit |
| **Solar flare** | a Solar Array or Sun Mirror exists | for 3 (2) days, solar power ×0.5 (`rules.powerOf` via `flareMult`); happiness −4 | charged **Battery Banks**; a **Flare Shelter**: ×0.75 and no worry |
| **Burst main** | a water plant stands (the biggest is the target, named in the warning) | it is down for 5 (3) days of repairs | a **Safety Post** within reach: 1 day; water in store |
| **Fever** | 150+ colonists | 15% × the uncovered share of colonists off work for 6 days (`sickShare` in sim.js labour); a "Fever" mood of −8 × the uncovered share, fading over 10 days | **Clinics** covering 80% of homes: contained |
| **Trade caravan** (good) | a finished Dock | market prices of ore, food, parts, alloy and helium-3 rise to ×1.5 and settle back; +30 parts | spare goods to sell |
| **Comet pass** (good) | always | 800 water, +400 per working Ice Harvester, up to free storage | Water Cisterns, depots on water, Warehouses |

**Gentle by design:**
- Damage is a few days of repairs. The existing `damaged` field is mended by construction crews.
- No building is lost and nobody dies of an incident. A fed test colony loses no one over 700 days on either difficulty.

**The advisor** (`goals.advise`) lists the incident on its way, using `incidentStatus`:
- unprepared, a warning: "Meteor shower in 3 days: 0 of 4 hull and space buildings under a Shield Pylon. Show me what helps." Its **Fix** goes to the Shield Pylon card, or to Research when the pylon is not unlocked yet;
- prepared, a tip: "…, and Eden is ready: …".
- The good ones are tips as well.

**Settings › Incidents** (`state.options.incidents`, `rules.setIncidents`, like Raiders):
- Off calls off the incident on its way, removes its warning, ends a flare or fever, and schedules nothing more.
- On is the default for new colonies and for old saves.

**New data:**
- **Flare Shelter** (`flareshelter`, Power tab): 2×2, any deck, 400 cr 30 p, 4 days, 1 job, −2 MW. It stores 150 power.
- **Hazard Forecasting** (`forecasting`, Logistics, 80 points, no prerequisites): incidents are seen 2 days earlier, and it unlocks the Flare Shelter.

### Interface and help (ui.js)

- `KIND_LABEL`: Landmark, Incident ahead, Incident. `SPEAKER` gains the General.
- A landmark event's body shows the speaker's line as a quote, and the registry when `p.registry`.
- Event windows use `p.tone` (good, warn or bad) for their colour.
- The **Show me** button (`data-evshow`) works for every event with `p.show`.
- How to play has two new sections, **Landmarks** and **Incidents**, after Decks and lifts.
- Settings has the **Incidents** switch under Raiders.

### Art

There are 7 new card slots in art.js, each with a prompt in `tools/art/colony/prompts/card-<key>.txt`:
- workshop, govgarden, observatory, lantern, hallofnames, elevator, flareshelter.

**No images were generated**: the cards fall back to their drawn icons until the next xAI run.

### Tests and saves

- **`tests/colony-landmarks.mjs`** (46 checks):
  - data, kits (all taller than 2.5 tiles; the Lantern and the Elevator top the skyline), slots, prompts and help;
  - the locked reasons and the requirement kept once met;
  - one of a kind;
  - the moment, played once;
  - each effect, measured, including the Lantern's transports in a fed colony;
  - the registry;
  - save and load, and old saves.
- **`tests/colony-incidents.mjs`** (38 checks):
  - the schedule: never before day 60 or 75, rarer on Easy, always warned 5+ days ahead with a Show me, a mix of kinds, no deaths;
  - incidents off;
  - the advisor;
  - every incident, prepared against unprepared;
  - the good ones;
  - save and load, and old saves.
- **Updated counts:**
  - `tests/colony-sim.mjs`: 80 buildings on the menu;
  - `tests/colony-v2.mjs`: 47 techs, and 1 more tech-locked building (the Flare Shelter).
- **`tests/colony-goals.mjs`**: its goal-following bot turns incidents off. It follows Show me only, never reads a warning, and its seed-8 run is sensitive to any change of course.
- **Saves.** `upgradeState` adds `state.landmarks` and `state.incidents` to an older save, with incidents on.
