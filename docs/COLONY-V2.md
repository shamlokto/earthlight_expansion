# Earthlight Space Colony Rebuild — version 2 ("Reclamation") build contract

Owner, 2026-11-03: "the next batch of buildings and tech tree", plus "a mini map, as I use a
laptop trackpad, no mouse, hard to navigate". Builds on `docs/COLONY-V1.md` (still authoritative
for everything not changed here). Keep the early game as simple as it is now: version 2 content
opens with research after 80 colonists.

## Data (written; the sim owns the numbers)
* `js/colony/data/buildings.js`: 18 new buildings (Research Lab at 80 colonists; the other 17 each
  carry `tech`), a `services` category, `service` (happiness for habitats in radius), new goods
  in `BASE_PRICE`, the Command Centre's storage and the depot's modes.
* `js/colony/data/tech.js`: `BRANCHES`, 19 `TECHS` ({ key, name, branch, cost, needs, unlocks,
  effects, text }), `TECH`, `TECH_OF`.
* `js/colony/data/terrain.js`: meteoroid, comet, plasma and atmosphere are buildable now.

## New goods
`alloy` and `helium` (helium-3) join the stored goods (`rules.STORED`, sellable at the market).
`research` is not a stored good: Research Labs' `makes.research` flows into the tech being studied.

## State additions (state.js; old saves get the defaults on load)
```js
state.research = { points: 0,        // banked when nothing is focused
                   focus: null,      // tech key being studied
                   progress: {},     // tech key -> points so far
                   done: [] };       // finished tech keys
state.unlocked                       // also gains a tech's `unlocks` when it is finished
buildings[i].fill                    // Tailings Dump: 0..100
```

## Rules (rules.js), new and changed
* `techStatus(state)` → `[{ key, name, branch, cost, progress, done, available, focus, needs, unlocks, text }]`
* `research(state, techKey)` → `{ ok, msg }`: set the focus (must be available, not done).
* `techEffect(state, kind, key)` → the product of `mult` over finished techs' effects of that kind
  and key (1 if none); `survey` returns `{ mult, days }`.
* `buildable()`: a version 2 building is locked with why `Research <tech name>.` until its tech is done.
* Reach: a finished **Tether Mast** extends space reach by its radius (16) around it, and masts
  chain (a mast must itself stand in reach). Space buildings and `atmosphere` tiles (zone `atmo`)
  are buildable within reach; `zone: 'space'` buildings accept atmosphere tiles when `on` lists them.
* **Observation Deck**: on hull tiles of the bottom hull wall (facing Earth) only.
* **Survey**: `techEffect(state, 'survey')` scales cost and days; a finished **Drone Bay** allows
  surveying any sealed chamber whose box lies within its radius (40), not only neighbours.
* **Tailings Dump**: `chamberAction`-style order `emptyTailings(state, id)` costs 50 credits and
  sets fill to 0.

## Simulation (sim.js)
* Labs: research points × staffing × power go to `research.focus` (else banked into `points`,
  which flow into the next focus). On completion: unlock, apply effects, a pending event
  (kind `tech`, speaker `ruess`), log.
* Chains: Smelter uses 20 ore → 10 alloy; Fabricator 10 alloy → 15 parts (inputs short = output scaled).
* `service` buildings: each habitat gets the best `service` value of each kind (clinic, canteen,
  safety post) covering it; added to happiness as itemised lines ("Clinic", "Canteen",
  "Safety"). Clinic mode triage = half service, half upkeep. Canteen uses 4 food; its
  `ration` mode cuts all colonists' food use by 20% and costs 8 happiness colony-wide.
* **Clinic**: natural growth: each 10 days, +1 colonist per 50 covered by a clinic (needs free
  housing). Habitats in range can grow to level 3 (Apartments, 70 homes).
* **Safety Post**: Bulkhead Seals in range build twice as fast.
* **Observation Deck**: +3 happiness colony-wide (only the first deck counts).
* **Seed Vault**: every 10 days turns one `poor` tile in its radius into `plain`.
* **Meteoroid Sweeper**: each day a 2% chance of a strike: off for 5 days (a log line).
* **Tailings Dump**: every finished Ore Mine adds 1 fill a day spread over the dumps; more than
  4 Ore Mines without enough dumps (one per 4 mines beyond the first 4) run at half output; a
  full dump (100) stops taking waste.
* Techs' `output` effects multiply makes; `storage` effects multiply storage; `cost` effects
  apply in `costOf`; `pressurise` in `pressuriseAir`.

## Goals (goals.js, the lead)
New goals after "Four chambers breathing": build a Research Lab, finish a first tech, make
alloy, open a Clinic, see a home grow into Apartments.

## View (view3d/)
* Kits for the 18 new buildings, readable from above, Earth Light flavour.
* **Minimap** (`view3d/minimap.js`, created by `createView`, toggled by `view.setMinimap(on)`):
  a corner canvas of the whole map (terrain colours, chamber status, buildings as dots, the
  dock reach faintly), the camera's view as an outline; **click or drag on it to move the
  camera** there. Redrawn cheaply (terrain once, dots on refresh).
* **On-screen navigation** for trackpads (`view.setNavButtons(on)`): zoom in / out, rotate left /
  right, tilt up / down, and "home" (back to the Command Centre), as buttons over the map.
  Keyboard already pans (WASD / arrows); Q / E rotate.
* Textures for new terrains via art slots when present.

## Interface (ui.js, main.js, colony.html, colony.css)
* A **Research** panel (top-bar button "Research" and key T): the four branches as columns,
  each tech a card (name, cost, progress bar, what it unlocks with card art, needs), the focus
  highlighted, click an available tech to study it. Labs' total research a day shown.
* HUD: alloy and helium in the resources bar (only once the colony has any, or the tech for
  them); research a day next to them once a lab exists.
* Inspector: the Tailings Dump's fill and an "Empty" order; Clinic levels; Lab output.
* Market: sell alloy and helium too.
* How to play: a section on research and the new buildings; settings toggles for the minimap
  and the navigation buttons (both on by default).

## Art
Cards for the 18 new buildings and terrain textures for forest, hills, rock, meteoroid, comet,
plasma and gravity flux; at most 28 images (36 of 100 used so far).
