# Earthlight Space Colony Rebuild — version 1 build contract

Version 1 ("Landfall") of the colony game in `docs/COLONY.md` (§16). This file is the contract
the modules are built against; change it only together with the code on both sides.

**Keep it simple** (owner): Lanternfall's land view is the model. No raids, commanders, research
or industry chain in version 1. Plain ES modules, no build step, no ROM.

## Files and owners

| Area | Files | Notes |
|---|---|---|
| Data (shared) | `js/colony/data/terrain.js`, `js/colony/data/buildings.js` | Tables. The sim owns the numbers; others read only |
| Map generator | `js/colony/mapgen.js`, `tests/colony-mapgen.mjs` | Pure; node-testable |
| Simulation & rules | `js/colony/state.js`, `js/colony/rules.js`, `js/colony/sim.js`, `tests/colony-sim.mjs` | Pure; node-testable |
| 3D view | `js/colony/view3d/*.js` | three.js from `js/vendor/three/` |
| Interface | `colony.html`, `css/colony.css`, `js/colony/ui.js`, `js/colony/main.js` | |
| Art | `js/colony/art.js`, `art/colony/`, `tools/art/colony/`, `tools/art/colony-xai.mjs` | Slots with procedural fallbacks |

three.js: `js/vendor/three/three.module.min.js` and `js/vendor/three/addons/OrbitControls.js`;
pages map it with `<script type="importmap">{"imports":{"three":"./js/vendor/three/three.module.min.js"}}</script>`.

## The map

`256 × 160` square tiles, `i = y * w + x`. World coordinates in 3D: tile (x, y) is centred at
(x + 0.5, height, y + 0.5); +y on the map is +z in the world; one tile = one world unit.

```
rows   0– 31  deep space (Earth Light grammar: organic blobs, asteroid ridges, diagonal magnetic belts,
              meteoroid drifts, a comet with its tail, plasma lakes, gravity rivers; ~65% void near Eden)
rows  32–111  columns 48–207: EDEN. Hull wall 2 tiles thick around it; inside, ~24 chambers split by
              1-tile bulkheads with 1–2 gates each; the artificial river meanders east–west across it
              (it crosses bulkheads through gate tiles); fertile soil along the river
rows 112–143  near space (more of the same; the Earth-facing dock sits on the bottom hull, centre)
rows 144–153  atmosphere
rows 154–159  Earth (unbuildable; the view draws Earth's curve beneath)
columns 0–47 and 208–255 beside Eden: space
```

**Playability guarantees**: within 24 tiles of the starting dock there is at least one asteroid
cluster of 12+ tiles holding 2+ ore seams, and one magnetic belt with room for two 2×2 collectors.
The landing chamber (bottom centre, beside the dock) is open from the start, has no breaches, has
deck and plain soil, borders the river, and has room for the 3×3 Command Centre (pre-placed) and
~20 more buildings. Its neighbours are `sealed` with 1–4 breaches each. Chambers touching the hull
have 2–6 breaches (on hull or bulkhead tiles), inner ones 0–3.

## State (owned by state.js; JSON-serialisable)

```js
state = {
  v: 1, seed, title: 'Earthlight Space Colony Rebuild',
  day: 0,                       // days since landfall
  speed: 1,                     // 0 paused, 1, 2, 4 (days per second at x1 = 1)
  tax: 0.10,                    // 0 .. 0.30
  map: { w: 256, h: 160,
         t: Uint8Array,         // terrain id per tile (terrain.js T)
         r: Uint8Array,         // artifact id per tile (terrain.js R)
         ch: Uint8Array,        // chamber id per tile, 255 = not in a chamber (walls, space)
         sv: Uint8Array },      // salvage left per tile (rubble 40, wreck 120), decremented by salvage yards
  chambers: [{ id, name, kind,  // kind: 'landing' | 'fields' | 'river' | 'rubble' | 'deck'
               x0, y0, x1, y1,  // bounding box (inclusive)
               tiles,           // floor tile count
               status,          // 'sealed' | 'surveying' | 'surveyed' | 'pressurising' | 'open'
               breaches: [i],   // tile indices of BREACH tiles in its walls (shared walls list it in both)
               work }],         // days left on a survey or pressurising, else 0
  buildings: [{ id, key, x, y, level: 1, mode: null|key, build: daysLeft (0 = working), off: false }],
  nextId,
  stock: { food, water, air, parts, ore, credits },
  battery: 0,                   // stored power
  pop: 40, housing: 0,          // housing recomputed each tick
  happy: 50, happyParts: [{ label, value }],
  market: { ore: 1, food: 1, parts: 1, water: 1, air: 1 },   // price factor, 1 = base (buildings.js BASE_PRICE)
  unlocked: [keys],
  log: [{ day, text }],         // last ~200 lines
  pending: [{ id, kind, title, text, choices: [{ key, label }] }],   // events that pause the clock (D1)
  stats: { last: { produced: {}, consumed: {} } },                  // last tick's flows, for the HUD
  imported: null | { credits, beta, units },                        // from an expansion save
  guardians: [{ id, type, level }],  // beta: the original army (expansion roster); sold at the dock
  flags: {},
};
```

## APIs

### mapgen.js
`generateMap(seed) → { map, chambers, start: { command: { x, y }, dock: { x, y }, landing } }`
(`map` as above; chambers with status set: landing `open`, all others `sealed`.)

### state.js
* `newGame({ seed = 1, importSave = null, beta = false }) → state`: generates the map, places the
  Command Centre and the dock, two Habitats and a River Pump, starting stock. `importSave` is the
  parsed `data` of an Earth Light save file (`js/savefile.js` `parseSave(text).data`): the expansion
  roster lives under the key `el-expansion-campaign-remnant` (else `el-expansion-campaign`), a JSON
  string with `roster: [{ id, type, level }]`. **Non-beta**: starting credits rise by the value of the
  army that was sold (sum of the expansion's `price = value × hp` over the roster, × 10 credits; the
  sim reads `js/expansion/data/units.json` through a `types` argument or a small built-in table).
  **Beta**: `guardians` = the roster exactly (owner: the guardian is exactly the original army);
  no extra credits. Without a save: the base start.
* `saveState(state) → string` / `loadState(string) → state` (typed arrays as base64);
  `localStorage` key **`el-colony`** (so Export / Import save in `js/savefile.js` includes it).

### rules.js (pure; every call returns `{ ok, msg }` unless noted)
* `canBuild(state, key, x, y) → null | reason` and `build(state, key, x, y)`
* `demolish(state, id)` (refunds half), `move(state, id, x, y)` (costs 20% of the build cost),
  `setMode(state, id, mode)`, `upgrade(state, id)`, `toggle(state, id)` (switch off/on)
* `buildable(state) → [{ key, name, cat, cost, unlocked, why }]`
* `chamberAction(state, chamberId, 'survey' | 'pressurise')`: survey costs 100 credits and 2 days
  (needs the chamber to touch an open chamber); a chamber with all breaches sealed can be
  pressurised: it needs air in stock ≥ tiles / 4, spends it, takes 5 days, then opens
* `sell(state, good, qty)`, `price(state, good) → number`; selling 10 units lowers that price 2%;
  prices recover 5% of the gap each day. Guardians: `sellGuardian(state, id)` (credits = expansion
  price × 10, parts = price)
* `setTax(state, rate)`, `answer(state, pendingId, choiceKey)`
* `tileInfo(state, x, y) → { terrain, artifact, chamber, building, reach, coverage }`
* `summary(state) → { stock: { good: { have, cap, delta } }, power: { supply, demand, battery, cap },
  pop, housing, jobs, workers, happy, happyParts, nextArrival }`
* `inReach(state, x, y) → boolean` (space buildability), `coverage(state, kind) → Float32Array`
  (per tile, for overlays: 'park', 'reach', 'power'...)

### sim.js
`dayTick(state, rng) → { events: [ { kind, text, pause } ] }`, pure apart from `rng()`
(a seeded generator passed in). Order (docs/COLONY.md §4, version 1 subset): construction and
crews (a building under construction needs a free Repair Yard crew, except at the start; the
Command Centre's own crew counts as one) → chamber work → labour (workers = pop; staffing =
min(1, workers / jobs) applied to every staffed building, Lanternfall's rule) → power (supply
incl. battery vs demand; a shortfall throttles powered buildings in proportion) → production and
use (terrain multipliers, river adjacency, ore seams, salvage) → colonists' needs → happiness →
habitat levels → population (a transport every 10 days if happiness ≥ 55, free housing and a food
surplus: 8–20 arrive; emigration below 25; deaths after 3 days without food, water or air) →
money (tax = pop × 0.3 × tax / 0.10 credits a day; upkeep) → market recovery → milestones and
unlocks (at 80 colonists: Induction Collector, Battery Bank, Ore Mine, Salvage Yard) → events.

**Happiness** (shown item by item): base 50; +6 per need met (food, water, air, power, housing),
−20 per need short; tax: 0% +8, 10% 0, 20% −14, 30% −32 (interpolate); parks: the best park
rating covering a habitat, averaged over habitats (0..+8); crowding −1 per 2% over housing;
unemployment over 20%: −5.

### view3d/view.js
```js
const view = createView(container, { onTileClick(x, y, button), onTileHover(x, y) });
view.setState(state);            // build everything
view.refresh(state);             // after a change or a tick: rebuild what changed (cheap to call every tick)
view.setOverlay(name | null);    // 'park' | 'reach' | 'power' | 'happiness' | null
view.setGhost(key | null, x, y, ok);   // placement preview, green if ok, red if not
view.focus(x, y);                // fly the camera to a tile
view.setSnap(on);                // 90° rotation steps vs free orbit
view.setSpeed(s);                // 0 paused, 1, 2, 4: movers freeze or hurry with the clock
view.destroy();
```
Terrain by InstancedMesh (one per terrain, coloured; heights from terrain.js); chambers that are
`sealed` render dark, `surveyed` blue-grey with breach markers, `open` in full colour. Buildings
from parametric kits in `view3d/kits.js` (boxes, cylinders, domes, cones; colours; art slot names).
Earth: a large sphere below the bottom edge with an atmosphere glow; a starfield.

**Movers** (`view3d/movers.js`, owner's D16): visual only, driven by the state; they never change it.
Barges on open river stretches (1, +1 per 2 riverside farms, max 8); haulers between ore mines and the
dock (2 on an ore seam); drones at induction collectors; a transport flies in when
`state.flags.arrival` = `{ day, n }` is new. **People and rovers only on roads**: people
≈ min(pop / 4, road tiles / 2, 300) between road-connected homes and destinations; rovers ≈
connected producers / 2 (max 60); a repair crew drives to connected building sites. Roads are
buildings with key `road` (`rules.planRoad` / `rules.buildRoad` lay an L-shaped line); a new colony
starts with a road from the Command Centre to the dock and every starting building.

### art.js
`art(slot) → URL | null`, `hasArt(slot)`, `MANIFEST` (slot → { kind, size, seamless, prompt, refs,
file }). Slots for version 1: `terrain/<key>` (seamless top-down textures), `card/<building key>`
(build-menu pictures), `portrait/<speaker>`, `sky/earth-below`, `title/rebuild`. The view and UI use
the picture if present, else their procedural drawing.

## Starting numbers (first guesses; the sim tunes them)

Stock: food 300, water 300, air 200, parts 150, ore 0, credits 3000 (+ import bonus). Pop 40.
Pre-built: Command Centre, Dock (finished), two Habitats, one River Pump, one Farm Field.
