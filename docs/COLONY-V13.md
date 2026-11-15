# Earthlight Space Colony Rebuild — version 13: story arc 2, "The Hope"

Owner, 2026-11-15: "expand to Earth after launching Arks. Eden becomes the source for building an area on Earth called
THE HOPE. Earth's conditions are so bad it is impossible to live there unless huge resources are invested. The Hope is
a locked deck; all its buildings are newly designed and very expensive; the terrain is very rough, with radiation and
toxic gases everywhere. Eden supports the Earth recovery process; The Hope is the beginning of Earth's recovery."
"Yes, the Ark can come and go, transporting people and materials to Earth."

Builds after COLONY-V9.md (the Ark, Beyond Eden) and COLONY-V4.md (decks). Story arc 1 ("The Reckoning") is separate.

## 1. Unlock and the Ark shuttle

* The day after the Ark is finished (`state.ark`, the Beyond Eden ending, unchanged) the Hope opens: `unlockHope`
  generates the Earth deck from the seed, places the Landing Field, and a `hope` event (the General) tells the story:
  before the long voyage the Ark carries Eden down to Earth. The Ark's dock at Eden shows her hull again (`b.ship`).
* **The Ark comes and goes** (`state.hope.ark`): `eden` (in her dock, loadable) → `out` (6 days, 5 on Easy) → `earth`
  (2 days on the landing field, drawn there) → `back` (6 days) → `eden`. A trip carries up to **80 colonists** and
  **2,000 units** of food, water, air, parts and alloy, as the player's **manifest** (Ark panel). Launch takes what
  Eden has of it (Eden keeps at least 10 colonists). Colonists with no home on Earth and goods with no room in the
  Hope's stores stay aboard and come back. **Auto** sends her again with the same manifest whenever she is home.
* **Goods only** can also go down by a working **Mass Driver** (500 a shot) or **Orbital Elevator** (800), arriving in
  2 days, every 4 days. Nobody reaches Earth any other way (no transports, no wanderers).

## 2. The Hope deck (`js/colony/hope.js` `generateHope`, pure, deterministic from the seed)

`state.decks.earth = { w, h, t, r, ch, sv, box, landing, sea }`, the same W × H grid as the other decks, covering
Eden's footprint (160 × 80 = 12,800 tiles); OUTSIDE elsewhere. No chambers (`ch` all 255). Saved like the other decks.

| Terrain (new, ver 13) | Share at start | Buildable | Treated by → becomes |
|---|---|---|---|
| Dead ground `ash` | ~35% | yes | Soil Reactor → plain |
| City ruins `ruins` | 5–7 cities | no | Soil Reactor → dead ground (+4 parts a tile) |
| Toxic gas `toxic` | ~25% of land | no, harmful | Air Scrubber Tower → dead ground |
| Radiation zone `radzone` | 3–4 craters | no, harmful | Decontamination Plant → dead ground |
| Flooded lowland `mire` | coast band | no | Tide Wall → dead ground |
| Poisoned sea `deadsea` | one side, ~13–25% deep | no | Sea Purifier → clean sea |
| Clean sea `sea` | 0 | no | (recovered) |
| Landing field `landing` | 10 × 10, inland, clean ground 9 tiles around | yes | (recovered) |

Then plain → fertile (Seed Bank) → forest (Reforestation Station). **Recovered** = plain, fertile, forest, clean sea,
landing field. **Earth recovery %** = recovered tiles / all Hope tiles (starts at 0.8%).

## 3. The Hope's own colony (`state.hope`)

`{ day, buildings: [{ id, key, x, y, deck: 'earth', level, build, off, work, ship? }], pop, stock: { food, water, air,
parts, alloy }, ark, drops, dropReady, milestones, recovery, peak, stats, earthlight }`

* Each Earth colonist needs 1 food, 1 water, 1 air a day from the Hope's stores. Short: 3% are lost a day (at least 1).
* Jobs are filled from the Earth population (staffing = pop / jobs, at most 1); upkeep is paid from Eden's credits
  (short of credits: Earth buildings work at half rate).
* Building: credits from Eden, **parts and alloy from the Hope's stores**. Crews: one at 10 colonists, one more per 50,
  at most 4; each builds one thing a day at a time.
* Homes, fields and stores only on Earth; Eden's buildings cannot stand on Earth and Earth's not in Eden.

## 4. Earth buildings (`js/colony/data/hope.js`; in `BUILDING`, never in `BUILDINGS`)

| Building | Size | Cost (cr / parts / alloy) | Days | Jobs | Effect |
|---|---|---|---|---|---|
| Landing Field | 4×4 | fixed, free | – | – | 20 homes (tents); stores 1,500 food/water/air/parts, 1,000 alloy; the Ark lands here |
| Sealed Dome | 3×3 | 6,000 / 300 / 150 | 12 | 0 | 40 homes, +20 air, −10 water, small stores; no toxic/radiation within 2 |
| Air Scrubber Tower | 2×2 | 8,000 / 400 / 200 | 14 | 8 | toxic → dead ground, 3 tiles/day in radius 10; +30 air |
| Decontamination Plant | 3×3 | 10,000 / 500 / 300 | 16 | 10 | radiation → dead ground, 2/day, radius 9 |
| Soil Reactor | 3×3 | 9,000 / 450 / 250 | 14 | 8 | ruins → dead ground 1/day (+4 parts each); dead ground → plain 3/day; radius 8 |
| Sea Purifier | 3×3, on the shore | 12,000 / 600 / 300 | 18 | 10 | poisoned sea → clean sea 4/day, radius 12; +80 water |
| Tide Wall | 1×1 | 1,500 / 60 / 40 | 4 | 0 | flooded lowland → dead ground 1/day, radius 5 |
| Seed Bank | 2×2 | 7,000 / 300 / 100 | 10 | 6 | plain → fertile 2/day, radius 8; fields need one |
| First Fields | 3×3, plain/fertile | 3,000 / 120 / 20 | 8 | 6 | 40 food × soil (plain 1.1, fertile 1.8); clean air 3 around |
| Reforestation Station | 2×2 | 8,000 / 300 / 120 | 12 | 6 | fertile → forest 1/day, radius 8; +20 air |

Treatment: each day a treating building accumulates `rate × staffing` and turns the nearest matching tile in its radius
(Euclidean from its centre, ties by index, never under a building) for every whole unit. Upkeep 5–60 cr a day.

## 5. Story beats and the ending

Once each, one a day, a `hope` event with a speaker and a line: wheels down (Sato), the first dome (Ruess), the first
clean ground (the General), 10% (Ruess), the first harvest (Sato), 100 on Earth (the General), clean water: 100 sea
tiles (Ruess), the first forest (the General), 25% (Sato), 40% (Ruess).

**Earthlight**: Earth recovery ≥ 50% and ≥ 500 colonists on Earth (300 on Easy). An `earthlight` event in the victory
screen's style (Ruess, Sato, the General; scene/earthlight), saved at once, remembered in `state.hope.earthlight`
(`{ day, pop, recovery, trips, buildings, edenPop, since, treated, difficulty }`); never blocks Eden Restored, Beyond
Eden or the Garden of Eden.

## 6. View (three.js)

* `view.setDeck('earth')`: the Hope's map and `state.hope.buildings`; no Earth sphere or stars, a dusty brown sky.
* Terrain shapes: rough dead ground, jagged ruins, low gas pools, the sea as water (sickly green-black, or blue once
  clean); radiation zones unlit and flickering violet; a translucent yellow-green haze over toxic gas and a violet one
  over hot zones (one instanced plane layer, breathing). The Earth deck's terrain rebuilds at most every 1.5 s.
* Kits for the ten buildings. The Ark's hull shows in her dock at Eden while she is home and on the Landing Field
  while she is down (`b.ship`, in the building signature), so she visibly leaves and arrives.

## 7. Interface

* The deck switcher gains **Hope** (recovery %) and **⇅ Ark** (home / days left) once unlocked; PageUp / PageDown from
  the Hope go back to Eden's main deck.
* On the Hope deck the build menu shows the Hope's buildings only (parts and alloy read from the Hope's stores); the
  inspector shows the tile (harmful / recovered), the building (switch off, take down), the recovery bar, the Hope's
  population and stores, and the Ark; the Landing Field opens the Ark panel.
* **Ark panel**: recovery, Earth pop and stores, the Ark's state, the manifest, Launch, Auto, the Mass Driver /
  Elevator drop buttons, milestones.
* How to play: "The Hope".

## 8. Art (prompts written; no pictures yet)

Cards: `landingfield`, `sealeddome`, `airscrubber`, `deconplant`, `soilreactor`, `seapurifier`, `tidewall`, `seedbank`,
`firstfields`, `reforest`. Terrain: `ash`, `ruins`, `toxic`, `radzone`, `mire`, `deadsea`, `sea`, `landing`. Scenes:
`hope` (the Ark landing on the poisoned coast), `earthlight` (the ending's still).

## 9. Files

`js/colony/hope.js` (new), `js/colony/data/hope.js` (new), `js/colony/hopeui.js` (new), `data/terrain.js` (8
terrains), `data/buildings.js` (BUILDING lookup), `rules.js` (re-exports; canBuild / build / tileInfo / demolish on
'earth'; ensureHope), `sim.js` (hopeDay), `state.js` (save the Earth deck), `main.js` (the 'earth' deck, the ending's
save and sting), `ui.js` (switcher, menu, inspector, victory screen, help), `view3d/view.js`, `view3d/kits.js`,
`art.js`, `css/colony.css`, prompts in `tools/art/colony/prompts/`, `tests/colony-hope.mjs`.
