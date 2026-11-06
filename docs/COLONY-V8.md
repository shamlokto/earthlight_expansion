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
