# Earthlight: Sato's Harvest — farming game (design and module contract)

Owner's request (2026-11-16): a farming and life game in the tradition of the classic 2003 handheld
farm sims, set in the Earthlight universe, **in 3D** (first asked for with realistic graphics; then, the same day: beautiful and cute, in a Japanese anime style). Captain Mira Sato, the
General's second, always dreamed of farming once the war ended; she buys a neglected field and
starts from there.

**Nothing is copied** from any existing game: no names, characters, maps, text, art or music. Only
the genre's mechanics are used (seasons, crops, watering, shipping, animals, friendship, a mine).

Page: `farm.html`. Code: `js/farm/`. Art: `art/farm/` (generated; every slot has a procedural
fallback, so the game runs with no art at all). Tests: `node tests/farm-sim.mjs`.

## 1. Story

After Kessrin's fall and the last battle at the Nineveh, the General sold the fleet to rebuild
**Eden**, the broken colony above a poisoned Earth (the colony game). When the river chamber was
sealed and its air came back, Mira Sato handed in her captain's bars. She spent her whole discharge
pay on the **old Hollin field**, a farm abandoned since the war in the river chamber, beside the
village of **Willowfall**. She has never grown anything. The game is her first years as a farmer.

Tone: warm, quiet, dry humour (Sato is calm and dry). The war is over; people are healing.
The colony's "sky" is the far side of the chamber, with the long sun-line down the middle and
Earth showing through the great window at dusk.

Cast (all canon to this project; portraits in `art/colony/portrait/`):

| id | Who | In Willowfall | Portrait |
|---|---|---|---|
| `sato` | Mira Sato, the player. Short navy-black bob, brown eyes. | Farmer | `sato.webp` |
| `general` | The General, governor of Eden; Sato's old commander. Never named: always "the General". Dark hair, kind eyes, tired. | Visits at weekends (Sat in the village, Sun at the farm) | `general.webp` |
| `ruess` | Prof. Hal Ruess, chief engineer; grey, goggles, gruff and fond of Sato. | Runs the **Workshop** (tool upgrades, greenhouse repair) | `ruess.webp` |
| `marrow` | Warden Ilse Marrow, the old village warden; silver hair, sharp, kind. | **Village Hall**; festivals; greets Sato on day 1 | `marrow.webp` |
| `seln` | Ama Seln, hydroponics steward; warm, green apron. | **Seln's Seed & Sundry** (seeds, bread, rucksacks, fishing rod) | `w_seln.webp` |
| `corran` | Abel Corran, retired gunnery chief; bald, white moustache, loud, soft-hearted. | **Corran's Ranch** (chickens, cows, feed, milker, brush) | `w_corran.webp` |
| `oduya` | Tem Oduya, dockyard engineer turned cook; headlamp, orange overalls. | **The Hangar** café (meals) | `w_oduya.webp` |
| `maris` | Juno Maris, courier pilot; orange headband, cheerful. | Collects the shipping bin at 17:00; wanders the village | `w_maris.webp` |
| `vashti` | Nell Vashti, salvage hunter; red bandana, braid, few words. | Her hangar, up the orbital elevator (belt trips start there) | `w_vashti.webp` |
| `moraine` | Queen Moraine of the Ashfall Cartel; trader now, still a queen. | Trades from her ship at Eden Central's space dock on **Saturdays** (rare seeds, tonic) | `svg:moraine` (js/expansion/portraits.js) |
| `calloway` | Pastor Ines Calloway, once a field chaplain on the gates; silvering bun, round glasses, teal stole. Gentle, wry. | **Second Dawn Church**, Eden Central (§10) | `art/farm/people/calloway_front.webp` |
| `fenn` | Constable Aldo Fenn, a siege cadet turned peacetime constable; navy uniform, peaked cap, badge. Dutiful, stiff, soft-hearted. | **Safety depot**, Eden Central (§10) | `art/farm/people/fenn_front.webp` |
| `venn` | Tobias Venn, the Directorate engineer who stayed to seal what he built; oil-dark coat, goggles, greying early. Gruff, decent. | **Restoration terminal** at the Lower deck lift landing; Venn's bench (§12) | built figure (`art/farm/people/venn_front.webp` when rendered) |
| `thorne` | Agnes Thorne, once Eden's cistern supervisor; white bun, glasses, plum cardigan. Keeps the enclave's rota. | The Survivors' Enclave; after the rehousing, the school's teacher (§12) | built figure |
| `moth` | Moth Thorne, eight, Agnes's granddaughter; mustard raincoat, overalls, a little lantern. Collects lamps and diary pages. | The catacombs and the enclave; after the rehousing, the school's first pupil (§12) | built figure |
| `wick` | Ansel Wick, keeper of the pump halls; oilskin, cap, white moustache. Knows every fish by name. | The pump halls and the Sump (§12) | built figure |
| `pia` | Pia Varga, tailor and dressmaker; once ran the siege parachute loft. Plum side braid, teal waistcoat, tape measure. Brisk, exacting, secretly sentimental. | **Varga's Mend & Make**, Market Lane (§13) | drawn (`look:pia`) |
| `lark` | Lark Penhallow, baker; fed the shelters from a field oven in the siege. Honey-blonde ponytail, red kerchief, freckles. Loud, warm, up at four. **Romance.** | **The Sunrise Oven**, Market Lane (§13) | drawn (`look:lark`) |
| `noor` | Noor Asante, seed botanist; revives the founders' Earth seeds. Lilac hair in two buns, sage coat, a flower pin. Blunt, absorbed, kind by accident. | **The Seedhouse**, Market Lane (§13) | drawn (`look:noor`) |
| `tika` | Tika Brandt, Ruess's apprentice mechanic; fixed rescue drones in a cupboard at fourteen. Red-orange crop, teal coveralls, goggles, grease on her cheek. | Mornings at the Workshop; **Brandt's Garage**, Market Lane (§13) | drawn (`look:tika`) |
| `vesna` | Vesna Kade, voice of Radio Willowfall; read the siege lists and then the all-clear. Rose twin tails, headphones, dark top. Wry, teasing, a night owl. **Romance.** | **Radio Willowfall**, Market Lane; plays the Hangar Fri and Sat (§13) | drawn (`look:vesna`) |

Do not use Lt. Arkin (he may have died in the player's campaign) or name the General.

## 2. Rules (the sim)

* **Calendar**: 4 seasons (Spring, Summer, Autumn, Winter) × 30 days; week Mon–Sun, Spring 1 of
  year 1 is a Monday. A day runs 06:00–24:00; one game minute is 0.6 s of real time (stopped in
  dialogs and menus). At 24:00 Sato collapses and wakes at 06:00 with half stamina.
* **Stamina** 100. Tools cost 2 each use, the watering can 1 (a fishing cast 2; nothing when a tool does nothing). At 0 she
  faints: next day, half stamina. Food restores stamina. Sleeping in bed restores all.
* **Weather**, rolled a day ahead (the radio tells): sun, rain (waters every outdoor tile), storm
  (summer; rain, and shops shut), snow (winter).
* **Fields**: `farm` 16×18 and `greenhouse` 10×6 (locked until repaired; ignores season and
  weather; never rained on). A tile: tilled?, wet?, a crop, or debris (`weed`, `rock`, `branch`,
  `stump`, `boulder`). The farm field starts about 55% covered in debris.
* **Tools** (levels 1–3: Field, Alloy, Starsteel): hoe tills; watering can wets (holds 20/40/80,
  refilled at water); sickle cuts weeds, dead crops and pasture grass; hammer breaks rocks (boulder
  needs level 2, 3 hits) and flattens empty tilled soil; axe chops branches (1 hit, 1 lumber) and
  stumps (3 hits, 6 lumber; level 1 allowed). Area: level 1 one tile, level 2 three tiles in a line
  ahead, level 3 a 3×3 block ahead (hoe, can, sickle only). Fishing rod, milker and brush have no levels.
* **Crops**: a seed bag sows the 3×3 block centred on the target tile (tilled, empty tiles only).
  A crop grows one day for each night it was wet. Some regrow after harvest. At a change of
  season, outdoor crops that are out of season die (cut them with the sickle).

  | Season | Crop (days, regrow, sale) | bag price |
  |---|---|---|
  | Spring | turnip (4, –, 60) · potato (7, –, 100) · cucumber (9, 5, 60) · strawberry (8, 2, 30) | 120 · 150 · 200 · 150 |
  | Summer | tomato (9, 3, 60) · corn (13, 4, 100) · onion (7, –, 100) · pumpkin (14, –, 250) | 200 · 300 · 150 · 500 |
  | Autumn | carrot (7, –, 120) · eggplant (9, 3, 80) · sweetpotato (6, 3, 60) · spinach (5, –, 80) | 300 · 120 · 300 · 200 |
  | Any but winter outdoors | moonflower (18, –, 420), Moraine only | 1000 |

* **Pasture** 12×7: grass seed (500) sows 3×3; grass grows in 3 stages over 9 days (not in
  winter); the sickle cuts ripe grass to fodder (1 each, regrows from stage 1).
* **Animals**: coop holds 6 chickens (1500 each), barn 4 cows (5000 each); delivered next morning.
  Each needs 1 feed (chicken) or 1 fodder (cow) a day from the stock (bought: feed 10, fodder 20):
  "fill the troughs" feeds all. A fed chicken lays an egg (50) next morning. A fed cow can be
  milked once a day with the milker: small/medium/large milk (100/150/200) by affection
  (<34, <67, ≥67). Affection 0–100: +2 fed, +3 brushed (cows), +1 talked to; −5 unfed.
* **Shipping bin**: put items in; Maris collects at 17:00 (flavour); paid at dawn. A ledger
  counts everything ever shipped.
* **The Old World** (owner, 2026-11-16: no mine; since §9 a shuttle trip, and since §16 one big roaming
  city map a trip instead of levels). Sato walks her **custom Pallas** round the ruins of a city on Earth's
  surface, fighting the creatures the war's radiation and gas left behind and searching for old-world
  finds: scrap, batteries, credits, the ten **relics** for the **Memory Room** in the Village Hall, and
  the city's own valuables. See §16.
* **Fishing**, her other great love: the rod (600; Ruess upgrades it) at any water. Cast, wait for
  the float to dip, pull. Silverfin, river trout, chamber carp (35/75/130), a special fish for
  each season, and the legendary **Old Hollin** in the hill lake. Rain and the lake are best.
* **Forage** on the hill, new each day: herb (spring, summer; 40), berry (summer; 30, edible),
  mushroom (autumn; 70), frostcap (winter; 60).
* **Upgrades**: Ruess upgrades a tool overnight (level 2: 800 + 5 scrap; level 3: 2500 + 5 alloy
  + 1 crystal) and repairs the greenhouse (4000 + 120 lumber). Seln sells bigger rucksacks
  (10 → 15 slots 1500, → 20 slots 4000).
* **Friendship** 0–100 per villager (10 points a heart): first talk of the day +2; gifts (the first of the day to each person in full, later ones that day a quarter, rounded, a non-neutral gift never to nothing):
  loved +8, liked +4, neutral +1, disliked −4; ×3 on their birthday. Events at heart thresholds.
* **Money**: starts at 500 credits ("cr").

## 3. Module contract

All modules are ES modules that run in the browser **and in Node** (no DOM in `data.js`, `sim.js`,
`story.js`).

### 3.1 `js/farm/data.js` and `js/farm/sim.js` (pure rules)

`data.js` exports:

```js
export const SEASONS = ['Spring','Summer','Autumn','Winter'], WEEKDAYS = ['Mon',…,'Sun'];
export const DAYS_PER_SEASON = 30, DAY_START = 360, DAY_END = 1440;   // minutes
export const ITEMS = { [id]: { id, name, kind, sell?, stamina?, crop?, desc } };
//   kind: 'tool' | 'seed' | 'crop' | 'animal' (egg, milk_s, milk_m, milk_l) | 'fish' (fish_s, fish_m, fish_l)
//       | 'forage' (herb, berry, mushroom, frostcap) | 'ore' (scrap, alloy, crystal) | 'relic' (medal, datachip) | 'food'
//   tools: hoe, can, sickle, hammer, axe, rod, milker, brush. (As built, sim.js also has the ruins, donate, monsters and the fish log; its header comment is the reference.)  seeds: 'seed_<crop>', 'seed_grass'.
//   food: bread (+20), soup (+40), pie (+70), tea (+10), tonic (+100); berry is edible (+5).
export const CROPS = { [id]: { id, name, seasons: [0..3], days, regrow, sell } };   // crop item id === crop id
export const TOOL_LEVELS = ['', 'Field', 'Alloy', 'Starsteel'];
export const FIELD_SIZES = { farm: [16, 18], greenhouse: [10, 6] }, PASTURE_SIZE = [12, 7];
```

`sim.js` exports (every action returns `{ ok, msg?, … }`; `msg` is a short readable sentence when
`ok` is false or when there is something to say; actions never throw on bad input):

```js
newGame({ seed? }) -> state                // JSON-serialisable; state.v = 1
saveState(state) -> string;  loadState(string) -> state | null

// state shape (fields the UI reads)
state.cal = { year, season, day, minute }            // minute: 360..1440
state.weather, state.weatherTomorrow                 // 'sun' | 'rain' | 'storm' | 'snow'
state.player = { stamina, maxStamina, money, slots, inv: [ {id, n} | null, … ], sel, toolLevel: {hoe:1,…}, water, map, x, y, dir }
//   inv has `slots` entries; tools sit in inv like any item (n = 1). The UI owns map/x/y/dir.
state.fields = { farm: { w, h, tiles: [ { till, wet, crop: null | { id, age, dead }, obj: null | 'weed'|'rock'|'branch'|'stump'|'boulder', hp } ] }, greenhouse: {…} }
state.pasture = { w, h, grass: [0..3] }              // 0 none, 1..3 growth, 3 = ripe
state.stock = { lumber, fodder, feed }
state.animals = [ { kind: 'chicken'|'cow', name, love, fed, milked, brushed, talked } ]
state.eggs                                            // eggs waiting in the coop
state.bin = [ { id, n } ]
state.ledger = { shipped: { [id]: n }, earned }
state.npc = { [npcId]: { love, talked, gifted, met } }
state.flags = { greenhouse: false, … }                // also event ids seen, set by the UI through setFlag
state.pending = { upgrade: null | { tool, level }, animals: [kind…] }
state.mine = null | { floor, w, h, cells: [ 0 empty | 1 rock | 2 hatch(revealed) ] }
state.forage = [ { spot: 0..7, id } ]                 // today's forage on the hill

// calendar helpers
weekday(state) -> 0..6 (0 = Monday);  absDay(state);  dateLabel(state) -> 'Spring 3 (Wed), Year 1';  timeLabel(state) -> '9:40 AM'
hearts(state, npcId) -> 0..10;  cropStage(crop) -> 0..3 (3 = ripe; visual stage);  stageOf(tile)
tick(state, minutes) -> { collapsed: bool }           // advances the clock; collapsed at 24:00 (the UI then calls sleep(state,{collapsed:true}))

// inventory
addItem(state, id, n=1) -> { ok, msg }                // fails when the rucksack is full
removeItem(state, id, n=1) -> bool;  countItem(state, id) -> n;  selected(state) -> {id, n} | null

// the field. dir: 0 south(+y), 1 north(−y), 2 west(−x), 3 east(+x). (x, y) is the tile Sato faces.
useTool(state, fieldId, x, y, dir) -> { ok, msg?, cost, changed: [ {x, y} ], gained: [ {id, n} ], fx: 'till'|'water'|'cut'|'smash'|'chop'|'sow'|null }
//   uses the selected item: a tool, or a seed bag (sows 3×3). Lumber goes to stock, not the rucksack.
harvest(state, fieldId, x, y) -> { ok, msg?, gained }  // ripe crop into the rucksack
refillCan(state) -> { ok, msg }
usePasture(state, x, y, dir) -> same shape as useTool   // sickle cuts ripe grass, seed_grass sows
// animals
feedAll(state, kind) -> { ok, msg };  milk(state, index);  brush(state, index);  petAnimal(state, index);  collectEggs(state) -> { ok, msg, gained }
// economy
ship(state, slot, n?) -> { ok, msg }                   // n default: the whole stack; tools cannot be shipped
eat(state, slot) -> { ok, msg }
SHOPS = { store, ranch, workshop, cafe, barge }        // exported from sim.js
shopStock(state, shopId) -> [ { key, label, desc, price, needs?: 'text', can: bool, why?: 'text' } ]
buy(state, shopId, key, n=1) -> { ok, msg }
// people (rules only; text lives in story.js). tier: 'loved' | 'liked' | 'neutral' | 'disliked'
talk(state, npcId) -> { first: bool }                  // first talk of the day: +2
gift(state, npcId, slot, tier, isBirthday) -> { ok, msg, delta }
addLove(state, npcId, n);  setFlag(state, key, value=true)
// the wreck and the lake
enterMine(state, floor=1) -> state.mine;  hitRock(state, x, y) -> { ok, msg?, broke, gained, hatch: bool };  leaveMine(state)
fish(state, place /* 'farm' | 'village' | 'hill' */) -> { ok, msg, gained }   // called when the player hooks a bite
pickForage(state, spot) -> { ok, msg, gained }
// the night
sleep(state, { collapsed = false } = {}) -> { earned, shipped: [ {id, n, value} ], notes: [ 'text', … ], seasonChanged: bool, newYear: bool }
// goals: a short guided start
GOALS = [ { id, title, hint, reward } ];  goalState(state) -> [ { id, done, claimed } ];  claimGoals(state) -> [ { id, title, reward } ] newly completed, rewards paid
```

Randomness comes from a seeded generator stored in the state (same seed, same game).

### 3.2 `js/farm/story.js` (all the words)

```js
export const NPCS = { [id]: { id, name, short, title, portrait, look: { skin, hair, top, bottom, style }, birthday: { season, day },
                              loves: [itemId…], likes: […], dislikes: […], shop?: shopId } };
//   look.style: 'bob' | 'short' | 'long' | 'bald' | 'bun' | 'bandana' | 'cap'; colours are CSS hex. Sato's look is NPCS.sato.
export function whereIs(npcId, ctx) -> { spot, facing? } | null
//   ctx = { season, day, weekday (0 = Mon), minute, weather, festival: id | null }.  null = not in the valley now.
//   A keeper standing on a '<shop>.counter' spot means that shop is open.
export function talkLines(npcId, ctx) -> [ 'line', … ]   // ctx adds { hearts, met, year, isBirthday, flags }. One short conversation (1–3 lines).
export function giftLine(npcId, tier, isBirthday) -> 'line'
export function giftTier(npcId, itemId) -> 'loved' | 'liked' | 'neutral' | 'disliked'
export const EVENTS = [ { id, npc, hearts, map, from?, to?, season?, weekday?, lines: [ { who, text } ], reward?: { love?: n, item?: [id, n], money?: n } } ];
//   Shown once when Sato enters `map` with `npc` there and hearts ≥ `hearts`. who: an npc id, 'sato' or 'narrator'.
export const FESTIVALS = [ { id, name, season, day, from, to, spot, blurb, lines: [ { who, text } ], reward? } ];
export const INTRO = [ { who, text, art? } ];            // the opening; art names a scene slot: 'intro1' … 'intro5'
export const DAY1 = [ { who, text } ];                   // Marrow greets Sato at the gate on Spring 1
export const RADIO = { sun, rain, storm, snow };         // forecast sentences
export const SIGNS = { [spot]: 'text' };                 // notice boards and signposts
export const HELP = [ { title, body } ];                 // the How to play pages
```

Spots (the UI resolves them to map positions): `farm.porch`, `farm.bin`, `farm.gate`, `farm.pond`,
`farm.field` · `village.square`, `village.memorial`, `village.bridge`,
`village.bench`, `village.storefront`, `village.cafefront`, `village.hallfront`,
`village.workshopfront`, `village.ranchyard`, `village.river` · `hill.wreck`, `hill.lake`,
`hill.overlook` · `store.counter`, `store.floor`, `ranch.counter`, `workshop.counter`,
`workshop.bench`, `cafe.counter`, `cafe.table1`, `cafe.table2`, `cafe.table3`, `hall.desk`, `hall.floor`.

Festivals (all in the village square unless said): **Planting Day** (Spring 18), **Lantern Night**
(Summer 24, evening at the bridge: lanterns on the river for the fallen), **Harvest Fair**
(Autumn 9), **Year's End** (Winter 30, evening).

### 3.3 The 3D game (`js/farm/world.js`, `models.js`, `maps.js`, `ui.js`, `main.js`)

three.js (vendored). A third-person camera over tile maps (farm, village, hill, interiors, the
Old World); shadows, a day and night sky, weather. Every visual is an art slot (`js/farm/art.js`):
a 3D model from `art/farm/models/`, else a picture from `art/farm/manifest.json`, else a built
stand-in, so the game runs with no art at all.

## 4. Art (owner, 2026-11-16)

**Beautiful and cute, in a Japanese anime style**; Sato's avatar is the most polished thing in the
game. Made with Qwen-Image / Qwen-Image-Edit (pictures) and WAN 2.2 (film clips and walk cycles)
on a rented GPU; scripts and every prompt are in `tools/art/farm/`. No ROM and nothing from any
existing game is used.

## 5. Upper deck, love and favours (owner, 2026-11-16, later the same day)

* **Setting**: Eden's **Upper deck**, on the Lantern Ring, **after Major Hesk's defeat** (the colony
  game's Reckoning). Willowfall, the Hollin field on its terrace, and Terrace Hill (with the Descent, now the orbital elevator, §10).
* **Three more villagers**: Commander Rell Kestrel (Guardians' wing), Dr. Haruto Mori (the
  **clinic**: a check-up restores stamina for 150 cr, once a day) and Yui Hoshino (the **library**: the shelves
  hold the how-to pages as books).
* **Favours** (`story.QUESTS`, 66 of them): on some days the first talk with a villager ends in a
  request ("four herbs for the clinic"). One favour at a time; bringing it gives +6 friendship and
  pays one and a half times the goods' worth. The same favour is not asked again for 20 days.
* **Love** (`story.ROMANCE`): six people — the General, Prof. Ruess, Commander Kestrel, Dr. Mori,
  Oduya the canteen chef and Yui the librarian. As in the genre, it is built from friendship
  (talk, gifts, favours) and **events**: the confession plays after a conversation once that
  person's earlier heart events have been seen, **two favours** are done for them and they are at
  **8 hearts**; one sweetheart at a time. At **10 hearts** the **Earthlight pendant** (3,000 cr on
  Moraine's barge) asks the question; the wedding follows in the square. A partner is at the farm
  at dawn and in the evening and waters up to 12 plants before Sato wakes.
* State: `flags.sweet`, `flags.partner`, `flags.quest`, `flags.favours_<id>`, `flags.confess_<id>`.

## 6. The colony look, the bigger town and the map (owner, 2026-11-18)

* **Willowfall** (`maps.js`, 64×52; 96×52 since Market Lane, §13): Market Street with stalls, Lantern Square, the hydroponics
  garden, the lift kiosk plaza (sign `village.lift`, kept in `maps.js`), the river with the road
  bridge and a footbridge, the ranch/clinic/library lane, Willow Lane's cottages, Fountain
  Park and a solar yard. Ground code `d` is deck plating. `map.areas` names districts for the map;
  `map.bots` are the maintenance bots' routes (cosmetic).
* **The cylinder** (`colony.js`): the land curves up and over (procedural patchwork, haze shared
  with the fog), the sun-line on the axis, hull ribs, ring walls at the end of the terraces, and a
  window band (stars and the Earth after dusk). The colony schedules its light: up from 6:00, down
  from 18:30. The axis paintings `sky/sky_colony_*` close the far ends of the tunnel.
* **Colony props** (built stand-ins until models arrive under the same names): `airlock_door`,
  `solar_panel`, `hydro_tower`, `colony_lamp`, `pipe_run`, `vent`, `maint_bot`, `cargo_crate`,
  `lift_kiosk`, `water_tank`, `wind_turbine_small`, `noticeboard`, `fountain`, `fan_tower`,
  `market_stall`; buildings `cottage_c`, `cottage_d`, `pumphouse`, `post_office` (kind `post`),
  `guard_post` (kind `guard`).
* **Map** (`minimap.js`): M or the map button opens the town map (a tab for each outdoor
  map: the farm, Willowfall, Terrace Hill, Eden Central, the Undercroft); a north-up minimap with a view cone sits under the clock outdoors. Music is in the menu.

## 7. More things to own and do (owner, 2026-11-18: "more items are needed in the end to make the game fun")

All rules are in `sim.js` (pure, deterministic, every action returns `{ ok, msg?, … }`); the words for
the robots' moods and every item's long text are in `data.js`. Old saves load: `sim.ensure(state)`
(called by `loadState`) adds every new field empty.

* **Bigger rucksack**: Seln's tiers are now 15 (1,500) → 20 (4,000) → 25 (8,000) → 30 (15,000)
  (`sim.RUCKSACK_TIERS`). The HUD bar becomes a grid: two even rows on a wide screen, rows of ten on a
  phone, the slots shrinking to fit; the prompt and held-item label sit above it (`--barH`).
* **Basket** (`basket`, Seln, 800, once; kind `tool`): while it is the selected slot, `harvest`,
  `pickForage`, `pickBush` and `pickFruit` put produce (kinds crop, forage, fruit, animal) in
  `state.player.basket = [ { id, n } ]` (30 in all, one line a kind; when full, the rucksack takes it).
  `shipBasket(state)` (E at the bin with the basket held) ships it all; `basketTake(state, i, n?)`
  (the rucksack menu) takes a line out. `basketTotal`, `basketHeld`, `BASKET_CAP`.
* **Field chests** (`field_chest`, Ruess, 1,200 + 20 lumber, any number; kind `placeable`): Space
  with it held on free ground on the farm or the hill (`placeItem(state, map, x, y)`; the UI checks the
  ground: not the field, pasture, a doorway, a prop or a forage spot). `state.chests = [ { map, x, y,
  items: [ {id,n}|null × 20 ] } ]`. E opens `ui.boxWindow(state, 'chest:<i>', onChange, title)` (the
  storage box window, generalised; `sim.boxOf(state, where)` resolves 'storage', 'fridge', 'chest:i';
  `storeItem`/`takeItem` accept all three). The axe on an empty chest picks it up (`pickUpPlaced`).
  Drawn with model `field_chest` (built stand-in: a hull-plate chest).
* **Field-units** (Ruess builds up to 7 (`MAX_ROBOTS`), 1,000 cr each, paid once with no upkeep; units bought earlier are kept; the Batteries job and the journal's Robots tab are in §11; `state.robots = [ { name, job, days, charge,
  mood, done } ]`): jobs `water` (24 dry crop tiles), `harvest` (12 ripe crops into the bin; regrowing
  plants stay), `animals` (feeds every animal from the stock, eggs into the bin), `rest`. Skill level
  `robotLevel(r) = min(5, 1 + days worked / 5)`; each level adds 4 tiles (`robotReach`). The work runs
  in `sleep()` after the rain and the deliveries; `sleep()` returns `robots: [ { name, job, done, used,
  charge, short, levelUp } ]` and a note for each. **Batteries**: charge 0–100; a full day costs
  25–40 (`robotCost`: water 25, harvest/animals 30, +2 a level), less when there is less to do; with
  too little charge the robot does part of the job and the note says so; at 0 it does nothing.
  Items `battery` (empty; Ruess 200 cr; also a ruins find) and `battery_full`. `chargeRobot(state, i)`
  (E with a charged battery): +60, the empty one comes back. **Solar chargers** (`solar_panel`, Ruess,
  1,500 + 10 lumber; placed on the farm like chests): `state.panels = [ { map, x, y, slots: [ 'battery'
  | 'battery_full' | null × 2 ] } ]`; `useCharger(state, i)` takes charged ones out or puts empty ones
  in; overnight a sunny day charges 2, rain or snow 1, a storm 0. Talking to a robot (E) shows its
  skill, charge and mood line (`robotMood`) in a speech bubble and lets you set the job, give a battery
  or rename it (`setRobotJob`, `renameRobot`). In the world they are cosmetic movers (model `farm_bot`,
  built stand-in: a round robot with a face screen).
* **The Terrace Onsen** (Terrace Hill, north-west: prop `onsen_pool` 4×3 with act `onsen`, steam, a
  stone deck, the bathhouse building `onsen_house` (no interior), sign `hill.onsen`). Open 06:00–23:00
  for a soak (`soak(state)`): 100 cr (free on Sato's birthday, `SATO_BIRTHDAY`), +1 hour, stamina
  full, and `state.flags.onsenDay = absDay`: until the day ends every tool costs 1 stamina less, never
  below 1 (`onsenBuff`, `toolCost`). Spot `hill.onsen`: Corran soaks on Sunday evenings, Marrow on
  Sunday evenings after the square.
* **Mountain food**: 14 forage spots on the hill (`maps.FORAGE_SPOTS`, `sim.FORAGE_SPOT_COUNT`), 3–6
  things a day, weighted (`sim.FORAGE`): spring herb, bamboo_shoot, wild_mint, fiddlehead; summer herb,
  berry, wild_grape, honeycomb; autumn mushroom, chestnut, wild_apple, matsutake (rare, 400 cr); winter
  frostcap, pine_nut, winter_root. `state.foraged` counts finds. Drawn as `icons/<id>` billboards, else
  coloured shapes.
* **Fruit trees**: saplings `sapling_apple|peach|cherry|persimmon` (Seln, 2,500, not in winter; kind
  `sapling`). Space on free farm grass: `plantTree(state, map, x, y)`; `state.fruitTrees = [ { map, x,
  y, kind, planted, picked } ]`. Stage (`treeStage`): sapling < 10 days, young < 28, grown from 28
  (`TREE_DAYS`); then one fruit a day in its season (`pickFruit`; apple and persimmon autumn, peach
  summer, cherry spring). The axe digs out a sapling or young tree (`removeTree`, no refund). Models
  `sapling`, `fruit_tree_<kind>` (built stand-in: a ball tree with blossom or fruit).
* **Cooking**: 14 new recipes (mint tea, grape juice, bamboo stir-fry, honey toast, fiddlehead tempura,
  fruit tart, fruit salad, persimmon jam, roast chestnuts, mushroom soup, root stew, honeyed nuts,
  grilled matsutake, forest bento), each worth more than its dearest ingredients. The kitchen takes the cheapest ingredient that fits each slot (`planRecipe`); a duck egg
  does wherever an egg does, and a seeded loaf wherever bread does. `RECIPE_GROUPS`
  groups the kitchen window; `recipeBook` adds `group`, `needs` and `cooked`; `state.cooked = { id: n }`.
* **Farm journal** (P or the ⏸ button; the clock stops while it is open; P or Esc closes it):
  **Today** (date, weather and forecast, money, stamina, the onsen glow, field and greenhouse summary,
  pasture, animals, robots with their charge, chargers, fruit trees, the tool at Ruess's, the favour,
  festivals and birthdays this season), **Items** (everything Sato owns, wherever it is; clicking one
  shows it turning in a small separate three.js viewer, draggable, using its model by id, `crop_<id>`,
  a few sensible mappings, a built shape for tools, else its icon on a card, with the item's `detail`
  text and facts: price, stamina, season, recipes, who loves it) and **Collections** (shipped, fish,
  Memory Room, recipes cooked, forage found). Every item in `data.js` has a `detail` text.

Art slots (all optional): models `onsen_pool`, `onsen_house`, `field_chest`, `farm_bot`,
`solar_charger` (falls back to `solar_panel`), `sapling`, `fruit_tree_apple`, `fruit_tree_peach`,
`fruit_tree_cherry`, `fruit_tree_persimmon`; facade `buildings/onsen_house`; icons `icons/<id>` for
every new item id.

## 8. Star-plums, Eden Central, the silo and the village gardens (owner, 2026-11-18, later)

* **Star-plums** (`star_plum`, kind fruit, cannot be shipped): eating one raises `player.maxStamina` by
  10, to `MAX_STAMINA_CAP` 200 (`stats.starPlums` counts them). Ten one-time sources, each a flag
  `plum_<id>` (`STAR_PLUM_SOURCES`, `grantPlum(state, src, { storage })`, `starPlumsFound`):
  `hill` (a glowing spot at `maps.STAR_SPOT_XY` shows on one day a season, `starPlumDay`, until found;
  forage spot id `STAR_SPOT` 99), `ruins10` and `ruins20` (the Old World pile farthest from the landing
  at depth 10 and 20, `mine.star`), `harvest` and `lantern` (festival prizes), `seln7` and `marrow7`
  (their 7-heart events), `moraine` (her barge/Exchange sells one a year, 8,000 cr, flag
  `plum_moraine_y<year>`), `mori` (after 5 favours: doctor's orders) and `collector` (shipping
  `COLLECTOR_KINDS` = 75 different kinds; there are only about 85 shippable kinds, so 100 could never
  be reached). Two dishes add 5 max stamina the first time each is eaten (`flags.ate_<id>`):
  `colony_feast` (fish + fruit + vegetable + egg) and `founders_cake` (honeycomb + chestnut + milk +
  egg). `eat()` returns `celebrate: true, maxUp` for a celebration toast. The journal's Today tab shows
  max stamina and star-plums found x/10.
* **Eden Central** (map `central`, 70×56, `covered`: no rain under the glass roof): the Main deck city,
  reached by the **lift** in Willowfall's lift plaza (act `liftdown`, 20 minutes; back up with
  `liftup` at the avenue's south end). The avenue runs north to the **viewing gallery** at the great
  hull window (benches, act `gallery`: after 19:00, +20 stamina once a day, `gallerySit`); the plaza
  holds the **Governor's office** (interior `office`, spot `central.office`: the General, weekdays
  9–17) and **the Ashfall Exchange** (interior `exchange`, spot `central.exchange`: Moraine, 10–18 every
  day but Saturday; `central.plaza` 9–10). The **space dock** (north-west): a docking bay at the hull
  with a pressure window (`bay_window`), landing pads, Moraine's cartel trader (`trader_ship`, her
  Saturday shop at `central.dock`), Maris's courier shuttle and its gate (act `shuttle`), cranes, crates,
  fuel lines and hazard paint. The **Arrivals hall** (spot `central.arrivals`: Maris on Tuesday and
  Friday mornings), the **Grand Market** (vending terminals, act `counter` with `shop: 'grandmarket'`,
  no keeper: imported seeds of the season at +25%, every sapling in any season, batteries, honeycomb,
  chestnut, tonic; `marketPrice`/`sellToMarket`: it buys cooked food and produce worth 300+ at +20%),
  side streets of flats and townhouses, a canal with bridges, lamps, planters and maintenance-bot
  traffic (`map.bots`). **Sato's Watch** (building `observatory`, model slot `observatory`: a split dome
  with a telescope, a watch tower with a turning radar dish and a blinking beacon): E at its door after
  19:00 (`stargaze`): a narrator scene by season (`story.WATCH`), +20 stamina once a night, the plaque
  on the first visit, and one visit from the General once he is her sweetheart or partner.
  Willowfall has no dock any more: the old basin is the riverside walk (`village.riverside`).
* **Empty houses** in Eden Central (locked; E reads a line, `maps.CENTRAL_HOUSES`): `central.house_1`
  … `central.house_6`. The enclave's families move into houses 1, 2, 5 and 6 after the rehousing (§12, `sim.FAMILIES`);
  houses 3 and 4 stay locked.
* **Silo and feed mill** (farm): E at the silo's hatch (`feed_sacks`, act `silo`) opens a window:
  vegetables in for fodder (`siloAdd`: 1 crop = 3 fodder). Ruess builds the **feed mill** (`feed_mill`,
  1,500 cr + 40 lumber, once, `flags.feed_mill`; drawn beside the silo at `farm.millAt`, model slot
  `feed_mill`): up to 20 crops a day in the hopper (`millAdd`, `state.mill`), ground overnight into hen
  feed (corn 1 → 10; any other vegetable, chestnut or pine nut 1 → 4).
* **Solar yard** (village, act `solaryard`): leave empty batteries, 30 cr each, up to 6
  (`state.solarYard.slots`, `yardDeposit`/`yardCollect`); by morning: sun all, rain or snow half, storm
  none.
* **Hydroponic towers** (village garden, act `hydro`, `tower` 0–7): Seln rents them (`hydro_tower`,
  300 cr, up to 4, `state.hydro = [{ tower, crop, planted, season }]`); E with a seed bag plants any
  crop in any season (`hydroPlant`), it grows a day each night without watering, E harvests
  (`hydroHarvest`, three a pick; regrowing crops regrow). Rentals end at the change of season.

## 9. The Old World (owner, 2026-11-18, later; the belt is in §11, the orbital elevator in §10)

* **The Old World** on Earth: Maris's courier shuttle from the space dock in Eden Central (act
  `shuttle`, `takeShuttle(state)`: 200 cr, free once Maris is at 5 hearts). Since §16 it lands on the
  edge of one big ruined city a trip; the levels, the way down and the stamina haze are gone. The Pallas
  **air filters** (`up_filters`: 2,000 cr + 3 alloy + 1 star-metal, `flags.filters`) now keep the gas off
  the hull and stiffen it (hull 130 instead of 100). A saved trip is not resumed: `loadState` clears `state.mine`.

Art slots added: models `observatory`, `gov_office`, `exchange`, `arrivals`, `apartment`, `townhouse`,
`vending`, `feed_sacks`, `feed_mill`, `charge_terminal`, `dock_crane`, `cartel_ship`, `shuttle`,
`launch_cradle`, `asteroid`, `asteroid_big`, `jump_buoy` (sector buoys); facades `buildings/<kind>`
for those buildings; icons `icons/star_plum`, `icons/colony_feast`, `icons/founders_cake`,
`icons/comet_ice`, `icons/star_metal`; music `music/belt`.

## 10. Eden Central's school, church and safety depot; belt ores; the orbital elevator (owner, 2026-11-19)

* **Arrivals hall** (interior `arrivals`, deck floor, `colonyRoom`): a window band onto the stars (`star_window`, the
  `earthBand()` texture), a glowing departures screen on a stand (`departures_board`, act `sign` 'central.arrivals'),
  a dock information kiosk (`info_kiosk`, sign 'central.dock'), rows of metal-and-teal seats (`transit_seats`), white
  planters (`colony_planter`) and the sleek white courier desk with a screen (`courier_desk`, act `shuttle`: books
  Maris's shuttle to Earth). The building's footprint is now 12×5 (its model is long and thin).
* **Three new buildings** in Eden Central (`maps.js` central(); building kinds and model slots `school`, `church`,
  `safety_depot`; models keep their proportions, `BUILDING[kind].uniform`; built stand-ins in `World.buildCivic`):
  * **The school** (north-west, by the gardens; interior `school`): small desks, a blackboard ('school.board'), cubbies
    with empty name cards ('school.cubbies'), a teacher's desk. It stands empty until the Lower deck's families move up
    (§12: Agnes teaches, Moth and five more pupils fill the desks on school days). Pastor Ines sits in it on Wednesdays
    planning the first assembly; Constable Fenn checks its locks at eight every morning (spot `school.floor`).
  * **Second Dawn Church** (north, off the avenue; interior `church`: pews, the altar, two memorial candle stands with
    act `candles` for the 312 lost in the siege (`story.CHURCH.candles`), a stained-glass window, a lectern) and the
    pastor's garden (`central.churchgarden`). **Pastor Ines Calloway** (`calloway`): Tue–Sat altar 9–12 and 15–18,
    garden 8–9 and 13–15, the empty school Wed 12–13, evensong in the pews 18–19:30; Sunday service 8–12; Mondays off in
    Willowfall (memorial, river, library). Birthday Spring 14. Loves tomato, teacup, herb, soup. Events `calloway3`
    (the candles; tomato seed) and `calloway7` (the tomato in the rubble; her mother's teacup). Six favours. She
    blesses every wedding (a line in each `ROMANCE.people[id].wedding`) and speaks at Lantern Night and Year's End.
  * **The safety depot** (east, beside the arrivals apron; interior `depot`: front desk, lockers, rescue drones on
    pads, the deck map screen 'depot.map'). **Constable Aldo Fenn** (`fenn`): 7–8 outside, 8–8:30 the school's locks,
    desk 8:30–12 and 15–17, a beat 13–15, the drones 17–18; Sunday evensong at the back of the church; Thursdays off
    (stray hens home to Willowfall, fishing at the hill lake). Birthday Autumn 26. Loves pie, toy, sweet potato, frost
    char. Events `fenn3` (Corran's hen in the evidence crate; finder's fee) and `fenn7` (the box for the first pupil).
    Six favours. Speaks at Planting Day and the Harvest Fair.
  * Both are full villagers (`story.VILLAGERS`, `sim.NPC_IDS`; `ensure()` gives old saves their records), not
    romance candidates. Their built figures: `LOOKS` in main.js (`collar`, `stole`, `badge`, `capBadge`, `belt`,
    drawn in actors.js). Portraits: renders of the figures in `art/farm/people/<id>_front.webp`.
* **Belt ores** (`sim.BELT_ORES`, `sim.beltOdds(sector)`: one roll a plain rock, odds by sector to 20; §11 has the open map): scrap (15),
  nickel-iron (25), silica (30), comet ice (60) from sector 1; copper ore (45) from 2; star-metal (500) from 3, a little
  more often further out; titanium ore (90) from 4; alloy (40) from 5; platinum nugget (260) from 8; crystal (150)
  from 10. Ruess's ore jobs: **smelt alloy** (4 nickel-iron + 100 cr), **wind a battery** (2 copper + 80 cr), **solar
  yard racks** (4 silica + 2 copper + 1,200 cr: 10 racks, `flags.yard_big`, `yardSlots`), **titanium mill rollers**
  (2 titanium + 800 cr: the mill grinds 40 a night, `flags.mill_rollers`, `millCap`), **rock-splitter hammer head** (was the Pallas drill
  head; 3 titanium + 2 copper + 1 platinum + 2,500 cr: a 30% chance of a second ore per rock, `flags.drill`). The Old World keeps its
  scrap and relics.
* **The orbital elevator** replaces the Descent on Terrace Hill (building kind and model slot `orbital_elevator`, 4×4,
  height 9; built stand-in `World.buildElevator`: a base station, a lattice tower, the waiting car; `elevatorCable`
  adds the cable rising out of sight with a second car riding it, model or not). Its door goes to Vashti's hangar at
  the axis; the prompt reads "Ride the orbital elevator up to the hangar" (`story.ELEVATOR.up` / `.down` toasts). The
  spot and sign id stay `hill.wreck` (save compatible).

## 11. The open belt, the mining unit, the battery job and the Robots tab (owner, 2026-11-19)

Owner: "The asteroid belt should not be layered, but a big map. I like sectors. The farther it is from the starting point
(probably move north), the better. The robots can help each other to change and charge batteries as an assigned job, so
we can make the most use of the seven. The pause screen can also allow me to assign jobs, rather than catching them one by
one." Then: no Pallas in the belt (no monsters there): a space suit and the hammer, a mining robot on F that runs on
batteries, air as the cost of distance; a start at sector 1, 5, 10, 15 or 20 once reached; a shuttle home in every sector.

* **One big map** (`sim.beltLayout(seed)`, pure and cached; `state.belt = { seed, gone, reached }`): `BELT_W` 34 ×
  `BELT_H` 286 cells: the launch apron (6 rows, the pad at `BELT_PAD`) at the south edge, then `BELT_SECTORS` 20 bands of
  `SECTOR_H` 14 rows, sector 1 just north of the apron, sector 20 at the far north (`beltSector(y)`, `sectorTop(s)`).
  Cells: 0 open, 1 small rock, 2 medium boulder, 3 great asteroid (never breaks), 4 comet ice, 5 large boulder, 6 pickup
  pod, 7 landmark, 8 huge boulder. Per sector: 1 + s/4 great-asteroid clumps, 4–6 rock fields with gaps (about 70 rocks),
  scattered singles, 1–2 comet-ice clusters (from sector 2), one pickup pod, and landmarks
  (`BELT_LANDMARKS`: a derelict nav buoy in 3, a sleeping comet with an ice field in 8, the wreck of the Hesper in 13, the far
  marker in 20; their words in `story.BELT.marks`). Nothing is walled off from the pad (the generator carves through
  great asteroids). About 1,400 breakable rocks and 370 great asteroids in all. The rocks of a sector are sized by chance,
  bigger further north: medium 12% + 1.2% a sector, large 0.8% (2% + 0.8% a sector from sector 3), huge 0.4% (1% + 0.7% a
  sector from sector 6), the rest small. On average a sector holds small / medium / large / huge: sector 1 61/10/1.4/0.2,
  10 41/16/3.6/3.2, 20 22/25/11/6.4. `BELT_GOALS` puts a large boulder in sector 1, a large and a huge in 2 and a huge in 3:
  goals for a better hammer.
* **Trips**: `enterBelt(state, start)` builds `state.mine` (mode `belt`) from the layout minus the rocks still drifting
  back; `start` is 1 or a milestone she has reached (`beltStarts`: 5, 10, 15, 20 ≤ `belt.reached`), beside that sector's
  pod. `enterMine(state, n, 'belt')` is the same call. The UI reports her position (`beltMove(state, x, y)`, at most 3
  tiles a call): air falls `AIR_PER_TILE` 0.3 a tile from `AIR_TANK` 100 (`AIR_TANK_BIG` 150 with Ruess's big tank,
  `up_tank`: 2 titanium + 2 silica + 1,800 cr, `flags.tank`); sector 1 to 20 is about 280 tiles, 84 air. A new sector
  updates `belt.reached` and `stats.deepestBelt` (old layered saves turn their record into milestones). `beltHome(state,
  how)`: `pad` (the launch pad, 10 min), `pod` (within 2.6 tiles of a pod, 15 min) or `tow` (air at 0: Vashti reels her
  in, 60 min and −20 stamina). There is no fly-home-from-anywhere: the pods are the way back.
* **The hammer and rock sizes** (owner: "Upgrading the hammer should make more sense. You can have bigger rocks with better
  chance for good ore that requires higher levels hammer."). Space or E facing a rock (`hitRock` → the belt branch), 1
  stamina a hit. `ROCK_SIZES[cell] = { name, tier, hits }`; `rockHits(kind, level)` (0: too soft, refused with a message
  naming the hammer needed and the one she has; the prompt shows the size and the hits or the tier):

  | Size | Hammer | Hits (Field / Alloy / Starsteel) | Ore (`rockOdds(kind, sector)`) |
  |---|---|---|---|
  | small rock, comet ice | any | 1 / 1 / 1 | small: scrap 18%, nickel-iron 26%, silica 16%, ice 8%, copper 4% from sector 2; ice: comet ice 72%, silica 14% |
  | medium boulder | any | 3 / 2 / 1 | the sector's odds (`beltOdds`, below) |
  | large boulder (gold flecks) | Alloy | – / 3 / 2 | always one: titanium, alloy, copper, platinum, crystal, star-metal (sector 3: 30/30/12/14/10/4%; sector 20: 20/20/8/25/19/8%) |
  | huge boulder (warm, four glints) | Starsteel | – / – / 3 | two, or three (35%), of platinum, crystal, star-metal, titanium (sector 20: 31/31/28/10%) |

  For 400 rocks in sector 16 (tested): small about 8,000 cr, medium 31,000, large 63,000; a huge boulder averages about 640
  cr. The rock-splitter head adds a 30% chance of one more roll. A broken rock is in `belt.gone` until a day
  2–5 days later (hash of the seed, cell and day), then a new rock drifts in.
* **Ore odds of a medium boulder** (`beltOdds`, sector 1 / 5 / 10 / 15 / 20): scrap 14/12/9/6/3%, nickel-iron 20/18/16/14/12%, silica
  12/11/10/9/8%, comet ice 16/15/14/13/12%, copper –/10/11/11/12%, titanium –/7/8/9/10%, alloy –/10/11/12/13%, platinum
  –/–/4/5/6%, crystal –/–/6/8/9%, star-metal –/3/4/4/5% (the rest is bare rock).
* **The mining unit** (`state.miner = { name, charge }`, Ruess, `MINER_PRICE` 1,200 cr, once): F in the belt sets it down
  on open ground beside her (`minerDeploy`; at under `MINER_RUN` charge it takes a charged battery from her rucksack, the
  flat one back; with none it will not go). Every 4.5 s of play it breaks the nearest small rock, ice or medium boulder
  within `MINER_REACH` 4 tiles (`minerWork`, `MINER_RUN` 10 charge a small rock, 20 a medium one: ten small rocks a battery, swapping in another charged battery
  when flat), into its hopper (`MINER_HOLD` 12); walking up empties it (`minerCollect`), F again recalls it (`minerRecall`).
  It never breaks large or huge boulders and costs Sato no stamina. At home `chargeMiner` gives it a battery; the battery keeper tops it up.
* **Drawing**: Sato is the built figure in a suit (`look.suit`: white suit, orange trim, a glass helmet, a pack) holding the
  hammer. world.js `BeltRocks` draws the rocks as one `InstancedMesh` per kind (models `asteroid`, `asteroid_big`,
  `comet_ice`, procedural fallback), only within 21 tiles of Sato, rebuilt when she has moved 3 tiles or a rock breaks,
  scaled by size (small 0.62, medium 0.95, large 1.28, huge 1.75), the large ones gold-flecked with two glints and the
  huge ones warm with four; the great asteroids are darker and use the `asteroid_big` model. Props: `sector_buoy` (model `jump_buoy`) at both ends of every sector line,
  `sector_sign` (floating "▲ SECTOR n", facing the camera), `pickup_pod` (lit pad, capsule, blinking mast), the four
  landmarks, `mining_bot` (model slot, built stand-in: an orange unit on treads with a drill arm). `spaceBackdrop` tints
  each sector's dust (blue-grey near home, through green, to gold far out) with a glowing line between sectors; Earth
  lies far north, Eden's drum behind the apron. In headless Chromium (SwiftShader, 1280×800) a belt frame took about 0.5 s
  against 1.1 s on the farm.
* **Map**: the minimap shows the belt (sectors numbered down the side, pods pulsing green, rocks sized and coloured by size (large gold, huge orange), landmarks ✦,
  the mining unit); M opens the belt chart, the whole map with the cradle's milestones. The HUD place reads
  "The belt, sector 7 · air 63/100"; a new sector, a first visit and a milestone each get a toast; the suit chimes at 30
  and 10 air.
* **The Batteries job** (`ROBOT_JOBS.batteries`): the keepers work first each morning (`keeperWork`). If its own charge is
  ≤ `KEEP_BELOW` 60 it swaps a charged battery into itself (free of its count); then, lowest first, every unit at ≤ 60
  (and the mining unit) up to `robotReach` = 2 + skill level (3 at skill 1, 7 at skill 5), +60 each. Charged batteries
  come from the farm's solar chargers, then the storage box; each flat one goes where the charged one was (a charger slot
  charges it again that night), then flat batteries in the storage box go into empty charger slots. Cost 15 + 2 a level,
  scaled to the work done. Notes say who got a battery, or that there were none. `crewBatteries(state)` sums the crew:
  units, average, low, flat, charged / flat / charging batteries, how many a keeper can reach, keepers and their cover.
  In the world the keeper drives between a charger and the lowest units with a battery on its head.
* **The Robots tab** in the farm journal (P): the crew line, then every unit with its skill, job note, mood, battery bar,
  five job buttons (`setRobotJob`), Give battery (`chargeRobot`) and Rename (`renameRobot`); the mining unit with its own
  Give battery (`chargeMiner`). Changes apply at once and the HUD refreshes; talking to a unit on the farm still works.
  The Today tab has the crew line too.
* Old saves: `ensure` adds `miner: null`; `state.belt` is made on first use, with `reached` from `stats.deepestBelt`.

## 12. The Lower deck, "the Undercroft" (owner, 2026-11-19): release 1

Background (docs/COLONY.md D21–D22, COLONY-V4 §2): in the war's last months the Directorate took Eden's Lower deck as a black
site ("Site Ninefold") under a "quarantine"; a Quantum Decimator test went wrong and gutted it. The colony was told it was a
Galt attack and evacuated; Warden Marrow kept sixty-one survivors alive in the crypts, and Tobias Venn sealed the core. Some
families never came up. Tone: cozy and mysterious, never grim; **no combat on the Lower deck**.

**Release 1 (built):**

* **The lift's third stop.** Every lift kiosk (act `liftdown` in Willowfall, `liftup` in Eden Central, `lift` on the Lower deck
  landing: `rideLift(map.id)`, `LIFT_STOPS` in main.js) offers the two other stops; 15 minutes a deck, plus 5. The first arrival
  plays `story.LOWER.arrive` (`flags.ld_visited`). Map `lower` (maps.js `lower()`, 56×44, `under: true`, walls are rock tiles
  drawn as hull-plate walls only where they face a room; no sky, no weather, no surroundings: `World.setTime` has an `under`
  branch, and `lightUnder()` moves five real point lights to the nearest lit lamps, with a soft one on Sato).
* **Restoration projects** (`sim.LOWER_PROJECTS`, funded at the **restoration terminal** on the landing (29,36, with sign `lower.terminal` beside it, clear of Venn's bench at 33,37), act `restore`, window
  `ui.projectWindow`; one at a time, `state.lower.pending`, finished overnight in `sleep()` → `flags.ld_<id>` and a note):
  1. **Work lights at the landing**: 1,200 cr, 8 scrap, 2 lamp kits. Clears the barrier; the gallery's lamps.
  2. **The Pump Halls**: 3,500 cr, 2 pump parts, 3 copper ore, 4 nickel-iron, 20 lumber. Drains the west tunnel; pump one runs.
  3. **The Mushroom Catacombs**: 6,000 cr, 4 lamp kits, 3 silica, 40 lumber. Opens the crypt door; the beds can be planted.
  4. **The Survivors' Enclave**: 8,000 cr, 3 lamp kits, 4 copper ore, 2 alloy, 60 lumber. Opens the tarpaulined north arch.
  5. **Homes on the Main deck**: 15,000 cr, 4 alloy, 2 titanium ore, 120 lumber, and the families' trust (`enclaveTrust`: 4 favours
     done for Agnes, Moth and Wick together, 5 hearts with Agnes). Sets `ld_rehoused` (the payoff, below).
  **Venn's bench** (shop `undercroft`, keeper `venn` at `undercroft.counter`): lamp kit (4 scrap, 1 copper, 120 cr), pump part
  (3 nickel-iron, 1 copper, 180 cr), spore bags (240 cr) once the catacombs open; Seln sells spore bags too (260).
* **The map changes with the state** (`maps.lowerState(m, flags)`, called by main.js `go()` and the minimap): `m.floods`
  (tunnels that are water until their pump runs), `m.gates` (blocked until the project), props with `unless: flag` (the barrier,
  the bulkheads, the tarpaulins) drawn until then, `glow_lamp` props with a `zone` lit once `ld_<zone>` is set (`landing`
  always). Pump parts at the silent pumps drain more at once (`sim.PUMP_REPAIRS`, `repairPump`): **the north pump** (3 parts,
  `ld_pump2`: the tunnel to the Sump) and **the cistern pump** (5 parts, `ld_pump3`: the way to the old pump room and its log).
* **Fishing** (`sim.fish(state, 'lower' | 'sump')`, the water body from `maps.waterPlace`): no weather; cave fish (45 cr,
  common), glowfish (100, uncommon, more in the Sump), pipe eel (140, mostly after 18:00), a pump part now and then in the basins,
  and the legendary **abyss koi** (1,800): only in the Sump, after 20:00, Alloy rod or better, about 0.8% a cast (1.5% Starsteel).
* **Mushrooms** (`data.MUSHROOMS`, `state.lower.beds`, `plantBed` / `harvestBed`, 8 beds, act `bed`): a spore bag rolls the kind
  (shiitake 36, pale oyster 36, glowcap 22, deep truffle 6). No watering, no seasons, a day a night.
  | Mushroom | first flush | then every | flushes | per flush | sells |
  |---|---|---|---|---|---|
  | shiitake | 6 | 3 | 4 | 2 | 90 |
  | pale oyster | 4 | 2 | 4 | 2 | 60 |
  | glowcap | 8 | 4 | 3 | 2 | 160 |
  | deep truffle | 12 | – | 1 | 1 | 900 |
  Recipes (group "From the Undercroft"): shiitake skewer, oyster fry, glowcap broth, Undercroft stew, truffle omelette. Cave fish
  count as fish in the old recipes.
* **The people below** (story.js `UNDERFOLK`, full villagers, not romance candidates; first meetings `story.MEETINGS` play
  instead of TALK.first; talk can vary with progress, `TALK[id].flag`; heart events at 3 and 7, some needing a flag, `e.flag`;
  favours; their whereIs ignores weather and festivals while below decks): Tobias Venn (terminal, pumps, the gallery at night,
  Friday evenings at Ruess's door), Agnes Thorne, Moth (first seen in the catacombs, before the enclave opens), Ansel Wick.
  Built figures: `LOOKS` in main.js, with `goggles` and `lantern` drawn in actors.js.
* **The rehousing**: `sim.FAMILIES` (the Thornes, Okafors, Linds and Barroses) take `central.house_1`, `_2`, `_5`, `_6` (new door
  texts `story.LOWER.houses`). **The school** (`sim.schoolDay`: weekdays 8:30–15:00, not festival days) fills: Agnes at
  `school.teacher`, Moth at `school.pupil`, five more pupils (`sim.PUPILS`) at the other desks (main.js `spawnPupils`, E says
  hello); the blackboard lists their names. `story.LOWER_SCENES`: Fenn's box of crayons finds its first child (`fenn_pupils`, 8:00
  at the school), Pastor Ines's first assembly on a Wednesday (`calloway_pupils`), and Marrow hears about Agnes (`marrow_under`).
* **Logs** (`data.LOWER_LOGS`, texts `story.LOGS`, `recoverLog`, `state.lower.logs`): 11 in this release: the quarantine
  notice, two of Warden Marrow's logs, a Directorate memo, a Galt prisoner's words on a crypt wall, Venn's sixty per cent test,
  the stencil on the sealed round door, three of Pim's war diary pages and one of Moth's own (`diaryPage`: Moth gives the next
  page on a first talk, one a day, by hearts 0/2/4/6). Terminals give a `log_tape`, pages a `diary_page`. Read in the farm
  journal's new **Logs** tab, with the restoration's progress.
* **The vault door** stands in the gallery's north wall, sealed (act `vault`); it opens in release 2 (§14).
* Music `music/undercroft` (sfx.js `trackFor`, day and night); minimap tab "The Undercroft"; wiki section; How to play page.
* Art slots used (docs/LOWER-DECK-ART.md): items and icons for all thirteen ids; props `lower_lift`, `pump_station`,
  `mushroom_bed`, `catacomb_arch`, `shelter`, `glow_lamp`, `terminal`, `vault_door` (and the `works_hall` slot), each with a
  built stand-in in `js/farm/lowerworld.js` (plus `work_barrier`, `bulkhead`, `tarp`, `crypt_wall`, `stove`, `shrooms`).
* Old saves: `state.lower` is made on first use; the four newcomers get their records from `ensure`.
* Tests: `node tests/farm-lower.mjs`.

**Release 2** is built: see §14.

## 13. Market Lane, the fold and the hives (owner, 2026-11-19: "additional content ... new items, farm animals, larger maps, new buildings and characters ... more young ladies")

* **Five young women** (`story.js`, block "Market Lane"; `VILLAGERS`, `sim.NPC_IDS`, `ensure()` gives old saves their records): Pia
  Varga (`pia`, the tailor's, closed Sun), Lark Penhallow (`lark`, the bakery: counter 7-15, back 16:30-18, in bed by 19:30, closed
  Mon), Noor Asante (`noor`, the Seedhouse 9-17, closed Tue: the hill terraces, the library, then she looks in at the farm's East
  Terrace), Tika Brandt (`tika`, Ruess's bench 8-12, her garage 13-18; Wed up the hill with Ruess; Sun off) and Vesna Kade (`vesna`,
  the radio: morning show 7-9, asleep till noon, the booth 13:30-17, night show 19-22 or the Hangar stage `cafe.stage` on Fri and
  Sat; Sun off). Each has ~27 conversations, gifts and gift lines, 6-7 favours, events at 3 and 7 hearts (`pia3`, `pia7`, `noor3`,
  `noor7`, `tika3`, `tika7`), festival places and a birthday (Pia Autumn 23, Lark Spring 4, Noor Spring 27, Tika Winter 24, Vesna
  Summer 19). **Lark and Vesna are romance candidates** (`ROMANCE.candidates` now eight): a third event at 5 hearts (`lark5`,
  `vesna5`), the confession, the pendant, the wedding (Pastor Ines blesses it; the Lane speaks), partner, morning and sweetheart lines.
* **Their look**: new hair styles in actors.js (`braid`, `ponytail`, `odango`, `twintails`, ties in `look.ribbon`) and accessories
  (`kerchief`, `headphones`, `flowerPin`, `skirt`, `measure`, face `freckles` and `smudge`; Tika uses the engineer's `goggles`). With no
  portrait picture yet, `portrait: 'look:<id>'` draws an SVG bust from the look (`js/farm/lookportrait.js`, used by ui.js and the wiki).
* **Willowfall grows east** (64×52 → 96×52; `MapDef.grow` keeps every old tile, prop index, door and spot; `clearProps` turns the props
  in a gap into `'nothing'` so prop indices, and the saves that use them, keep their meaning). **Market Lane** north of the river:
  the Sunrise Oven, Varga's Mend & Make, the Seedhouse (a glasshouse shop), Brandt's Garage, Radio Willowfall with its mast, and Lane
  Square (noticeboard `village.lane`, flower stalls). The river runs on east under the **Mill Bridge** to the **Lane cottages** (homes;
  E at the door reads a note, `CENTRAL_HOUSES.home_<id>`) and Noor's trial beds. Interiors `bakery`, `tailor`, `florist`, `garage`,
  `radio`. Built stand-ins: `js/farm/laneworld.js` (model slots in `LANE_PROPS` / `LANE_BUILDINGS`).
* **The farm grows east** (44×34 → 64×34, old coordinates unchanged; a gap in the old tree line just south of the hill road; the
  hill road now runs on to the farm's new east edge, where the exit to Terrace Hill is, at x 63, y 8–9, with sign `farm.hill`): the
  **East Terrace** field (`state.fields.east`, 12×10 at `FIELD_ORIGINS.east` [48, 13], rubble until Ruess clears it: 3,000 cr + 40
  lumber, `flags.eastfield`; the robots work it too), the old **fold** (Ruess: 5,000 cr + 60 lumber, `flags.fold`; interior `fold`,
  trough act `feedfold`) and the **duck house** by the new east pond (2,000 cr + 30 lumber, `flags.duckhouse`; interior `duckhouse`,
  nest act `duckeggs`, feeder `feedduck`), with a meadow for hives. Locked doors say why.
* **Animals** (`HOUSING`, Corran sells them once there is a home): goats (4,000; 4 in the fold; fodder; the milker gives goat milk,
  rich goat milk at affection ≥ 67; the brush works on them), sheep (4,500; 4; fodder; a fleece every three fed nights, `a.fleece`;
  `shear()` with **clippers** (900) gives wool, fine wool when fond), ducks (1,800; 6; feed; a duck egg each morning in
  `state.duckNest`, now and then a feather when fond; they swim on the east pond on fair days 8-17 for +1 affection, `swimDay`).
* **Machines** (kind `placeable`, set down on the farm like chests; `state.machines`, `MACHINES`, `useMachine`, `machineLabel`, the
  axe picks an empty one up): the **cheese press** (Tika, 2,000 + 20 lumber: milk → farm cheese, goat milk → goat cheese), the
  **spinning wheel** (2,400 + 30 lumber: wool → yarn, fine wool → 2 yarn) and **beehives** (the Seedhouse, 1,800: honey every 3 days,
  every 2 with ≥ 3 flower crops within 6 tiles, `hiveFlowers`; none in winter; up to 3 jars wait). Honey also stands in for honeycomb.
* **Crops**: 12 Earth crops from the Seedhouse only (`CROPS[id].shop = 'florist'`): spring cabbage, snap pea (regrows), tulip;
  summer bell pepper (regrows), melon, sunflower; autumn beet, cranberry (regrows), cosmos; winter kale, frost leek (regrows),
  snowbell: the first outdoor winter crops. Flowers (`FLOWER_CROPS`) feed the hives and draw as flowers. **Forage**: wild violet,
  elderflower, rosehip, snowdrop (one a season).
* **Shops**: the bakery (bread, sunrise bun, seeded loaf, honey cake), the tailor's (Pia spins a fleece into yarn, knits three
  skeins into a **yarn scarf**, sells yarn), the Seedhouse (seeds, beehives, **bouquets**, or a bouquet tied from three of your
  flowers), the garage (machines, batteries), the radio (a salvaged **record**; a **song request** once a week: +1 friendship with
  everyone next morning). **Eleven recipes** (`LANE_RECIPES`, kitchen group "From the fold and the hives"): goat cheese salad, cheese
  omelette, duck egg custard, honey cake, blossom tea, cheese toast, stuffed peppers, cabbage rolls, honeyed melon, ruby beet soup,
  green frittata.
* **The Bloom Fair** (Summer 10, Lane Square, 10-16; `FESTIVAL_DAYS` has it, so it is always fair): Noor judges the flowers, Pia
  the wool and cheese, Lark bakes, Tika runs Vesna's broadcast cable, the Constable guards the cake. 500 cr.
* Art slots (all optional): models `goat`, `sheep`, `duck`, `cheese_press`, `spinning_wheel`, `beehive`, `bakery_oven`,
  `bread_shelf`, `flour_sacks`, `dress_form`, `bolt_shelf`, `sewing_table`, `flower_bed`, `seed_drawers`, `tool_wall`,
  `engine_block`, `radio_desk`, `record_shelf`, `speaker`, `sofa`, `mic_stand`, `radio_mast`; buildings `bakery`, `tailor`,
  `seedhouse`, `garage`, `radio_station`, `fold`, `duckhouse`; people `people/<id>_front` for the five; icons `icons/<id>` for every
  new item.

## 14. The Undercroft, release 2: the Works, the Vents, the Arena and the vault (owner, 2026-11-19)

* **The map grew south** (`lower` 56×44 → 56×62; nothing above row 43 moved). A shutter south of the landing (gate `ld_works`)
  opens on a cross passage: the **Works** to the west, the **Zero-G Arena** in the middle (gate `ld_arena`), the **Thermal Vents**
  to the east (bulkhead, gate `ld_vents`). The **vault** is north of the round door (gate `ld_vault` on the door's row; the door
  prop is not solid, the gate is). New lamp zones `works`, `arena`, `vents`, `vault`; minimap areas; signs `lower.works`,
  `lower.vents`, `lower.arena`, `lower.worksdoor`, `lower.ventdoor`, `lower.arenadoor`. The gallery's dead pump is now **the
  gallery pump** (`pump4`, 6 parts, after the cistern pump): it drains the vault's sill.
* **Three more projects** (`LOWER_PROJECTS`, still in rising price): **The Works** (after the enclave) 10,000 cr, 20 scrap, 4 copper,
  3 alloy, 60 lumber · **The Zero-G Arena** (after the Works) 12,000 cr, 4 alloy, 2 titanium, 4 lamp kits, 40 lumber · **The Thermal
  Vents** (after the Works; listed last) 20,000 cr, 4 pump parts, 4 alloy, 4 silica, 80 lumber.
* **The Works** (shop `works`, keeper Venn, act `works` at the press; `sim.WORKS_RECIPES`, all `once` entries made at once):
  | Group | Recipe | Needs | cr |
  |---|---|---|---|
  | Parts | five lamp kits · five pump parts · a robot battery · a bar of alloy | 16 scrap 4 copper · 12 nickel-iron 4 copper · 3 scrap 1 copper · 6 scrap 2 nickel-iron | 450 · 700 · 40 · 60 |
  | Robots | quick-step motors (`works_fast`: +6 tiles water/harvest, +1 battery round) · deep-cell packs (`works_cell`: +80 a charge) · sturdy chassis (`works_sturdy`: −6 charge a morning) | 10 scrap 4 copper 1 titanium · 6 copper 3 silica 4 nickel-iron · 4 alloy 12 scrap | 2,400 · 2,800 · 2,200 |
  | Tools | balanced grips (`works_grips`: a swing of 4+ stamina costs 1 less) | 2 titanium 2 alloy 6 scrap | 3,000 |
  | Farmhouse | glowcap lamp, pump-gauge clock, model of Eden, pipe-and-crate shelf (`decor_<id>`, house props with `when`) | scrap, copper, silica, nickel-iron (shelf: 10 lumber) | 600 · 800 · 1,500 · 500 |
  | Gifts | tin lantern, gear brooch, pipe whistle (kind `craft`; liked or loved below decks, Marrow loves the lantern) | scrap, copper, nickel-iron | 120 · 200 · 80 |
  | The door | a feed to the round door (`vault_power`; shown once `venn_key` is found) | 6 copper 2 alloy 4 charged batteries | 1,500 |
  Crew upgrades fit every unit, old and new (`ensure()` sets `r.fast`, `r.cell`, `r.sturdy`). **Recycling** (act `recycle`, the bin;
  `sim.RECYCLE`, `recycle(state, id)`): ten scrap +220 cr, a flat battery +20 cr and a copper ore, a spare log tape +30 (one is kept),
  five comet ice +360.
* **The Thermal Vents** (act `vents`, `sim.ventSoak`): an hour in the bath, 6:00 to 23:00, 60 cr: stamina full and the onsen's buff.
* **The reactor chain** (act `reactor`, `REACTOR_STEPS`, `reactorStep`, one job a day, `flags.reactor` = jobs done): new gauges (3
  silica, 2 copper; log `day211`) · the coolant valves (4 pump parts, 6 nickel-iron) · Ruess's titanium jacket (4 titanium, 3 alloy;
  log `galt_door`) · the damping rods (1 platinum, 4 comet ice) · cold shutdown (3 charged batteries; log `venn_key`). Scenes
  `story.REACTOR`. Done: `ld_reactor`: the bath is free and the catacomb beds grow two days a night.
* **The Hub Cup** (`FESTIVALS` id `hubcup`, Autumn 19, 10–16, spot `lower.arena`, `flag: 'ld_arena'`: `festivalToday` skips it until
  the arena is restored; `FESTIVAL_DAYS` has the day, so it is fair). Everyone comes down (`FESTIVAL_SPOTS['lower.arena']`: the
  stands and the gate; the Undercroft folk too). **The minigame** (`sim.hubCupThrow`, `hubCupSpeed`, `hubCupPlace`, `playHubCup`,
  pure): five throws; a ball sweeps a bar (a little faster each throw), the hoop is at 0.5; within 0.06 scores 3, 0.15 scores 2,
  0.28 scores 1. Tika, Kestrel and Wick throw 5–10 from the seed; a tie goes to Sato. Prizes 1,500 / 700 / 300 / 100 cr; first place
  also wins the **Hub Cup** keepsake. Once a year (`hubcup_y<year>`). Main.js draws the bar (`hubCupThrows`); music `festival`.
* **Logs**: ten more (21 in all): the Works' fabrication ledger, the unsent "Galt attack" bulletin, Agnes's wash-hall rota, Marrow's
  chalk on the tiles (terminals and walls in the new halls), three from the reactor console (day 211, the Galt prisoners' note
  inside the shielding, Venn's sealing log with the code), and three in the vault (the Marshal's final report, the roll, Agnes's
  finished letter).
* **The vault** (act `vault`, `vaultReady`: Venn's key log, the feed from the Works, the gallery pump; `openVault`): a quiet scene
  (`story.VAULT.open`): Venn, Agnes and Marrow at the door, the rota said aloud, the dead ring, the report, the names; Agnes and
  Marrow make it up. Reward: a **slice of ring three** (keepsake), max stamina +10, `ld_vault`. Afterwards Marrow's scene at the hall
  (`marrow_vault`: the names go on the memorial), the Governor's board and the gallery sign change (`story.SIGNS_VAULT`), Vesna's
  radio has new lines on alternate days (`story.RADIO_VAULT`), and the people below talk about it (`TALK[id].flag`).
* **Schedules**: Hana (below); Venn at the Works after lunch, the reactor console at three, the open vault at night, the arena gate on Sundays;
  Wick soaks on Sundays and eats lunch in the stands; Moth plays in the drum on Saturday afternoons.
* **Art slots** (built stand-ins in `lowerworld.js`): `works_hall` (now `fit: 'box'`, stretched along Z to its 8×6 footprint),
  `fabricator`, `scrap_bin`, `vent_bath`, `reactor_console`, `zero_g_arena`, `decimator_ring`, `vault_door_open`, `decor_lantern`,
  `decor_clock`, `decor_model`, `decor_shelf`; icons for `tin_lantern`, `gear_brooch`, `pipe_whistle`, `ring_shard`, `hub_cup`.
* Old saves: nothing new is needed; `flags.reactor` defaults to 0. Tests: `node tests/farm-lower.mjs` (release 2 blocks).
* **Hana Corvel** (`hana`, story.js block at the end; in `UNDERFOLK`, `VILLAGERS`, `sim.NPC_IDS`; not a romance candidate): Venn's
  apprentice, about twenty, who hid in the ducts above the Works for three years and drops out of a ceiling hatch the day the press
  wakes. Appears once `ld_works` is set: the press (`lower.press`) 7:30-17, lunch at the kettle, the vent bath after work, the
  landing in the evening; Sundays in the drum and on the warm tiles. Birthday Winter 19; loves copper, honey toast, strawberries,
  glowcaps (and the gear brooch). First meeting, ~25 conversations, gift lines, six favours, events `hana3` (the Works, she gives
  you a gear brooch) and `hana7` (the vent bath). Look: navy odango buns tied with red cloth, rust overalls, freckles, a soot smudge
  (`portrait: 'look:hana'`, LOOKS in main.js); a portrait `people/hana_front` can replace it.
* The status board in the Governor's office follows the deck: UNDERCROFT SEALED, then RESTORING (work lights), then OPEN (`ld_vault`).


## 15. People walk, and everybody has a home (owner, 2026-11-19: "People should walk to their next destination instead of just magically appearing ... every main character has a home ... when the relationship is good, you can visit")

* **Walking** (`js/farm/paths.js`, pure, tested in node): a walk grid per map that mirrors Sato's collision (solid ground, buildings,
  solid props, posts with her clearance; people also keep off soil, `f`, and round chests, machines and trees Sato sets down:
  `setBlockers`), 8-way distance fields to any point (Dijkstra, cached per map and target tile), walks pulled straight where the way
  is clear (`walkPath`), and **portals** between maps: exits, doors, back doors into shop quarters, room exits (`outsideOf`), the
  orbital elevator (6 min) and the spoke lift between any two stops (`LIFT_AT`, 15 min a deck + 5). `route()` is a Dijkstra over
  portals (cached). People walk at 2.3 tiles a second (Sato 3.9), 1.38 tiles a game minute.
* **The day plan** (`planDay(ids, sched)`): main.js samples each person's place every 10 minutes from 6:00 to midnight (`whereIs`,
  else their home), with the old offsets for shared spots, and plans every move: leaving a post (`DUTY`: counters, desks, the altar,
  the classroom, the stage, the office, the Exchange, the press, the dock, the hangar) at the end of its hours, otherwise setting off
  early so as to arrive on time; chained when a walk runs into the next. `locate(plan, id, t)` gives where anybody is at any
  fractional minute (standing, walking with a direction, or out of sight between maps), so entering a map mid-walk shows them
  part-way along, and off-screen they are simply where the plan says. Replanned when the day, weather, festival, partner,
  sweetheart, Lower deck progress or Sato's set-down things change (about 200 ms cold, 3 ms warm; `locate` is ~0.1 µs).
  No way there: they simply arrive, as before. Shop counters only open once the keeper is standing at them (`shopOf`).
* **Talking**: a walker near a Sato who is standing still stops (up to 5 game minutes, facing her) so she can talk; dialogs stop the
  clock as always. Walkers do not block Sato, and nobody standing can trap her (she can always step away).
* **Homes** (`maps.HOMES`, rooms `home_<key>` built by `homeRooms` after every map, so no old tile, spot, door or prop index moves;
  `story.HOMES`, `homeKey`, `homeSpot`; spot `home_<key>.<npc>`):
  Lark, Vesna, Pia, Tika, Noor: their Lane cottages · Marrow, Dr. Mori, Yui, Oduya: the four Willow Lane cottages · Maris: the flat
  over the Courier Post · Kestrel: quarters at the Guardians' Post · Seln, Corran, Ruess, Pastor Ines, Vashti: rooms behind or above
  the store, the ranch, the Workshop, the church and the hangar (a door at the back of each; `backTo`) · the General: central house 3
  (the piano under dust sheets) · Moraine: house 4 (the reserved corner house) · Constable Fenn: a flat on the canal · Agnes and
  Moth: the Thornes' shelter in the enclave, then house 1 once rehoused (houses 2, 5 and 6 stay the other families') · Venn: a cabin
  by the lift landing · Wick: a hut in the pump hall · Hana: a loft over the Works (hatches in the rock, prop `home_door`).
  Built props (`homeworld.js`, model slots `HOME_PROPS`): `quilt_bed`, `bunk`, `armchair`, `tea_table`, `bookstack`, `wall_frames`,
  `piano`, `fish_tank`, `home_door`, tinted in each owner's colour.
* **Schedules**: `whereIs` fills free time between waking and bed (`HOMES[id].wake/bed`, Vesna's lie-ins `nap`) with home; nights
  stay null (asleep at home); a storm keeps the null (in at home, out of sight); a partner's home is the farm porch.
  `story.presence(id, ctx)`: `home` · `out` · `asleep` · `away`.
* **Visiting** (`sim.visitRule`): the door opens if they are home and awake, it is before 21:00 and Sato has 4 hearts, or 3 with the
  open-house sort (`VISIT_FRIENDLY`: Marrow, Seln, Corran, Oduya, Lark, Pastor Ines, Agnes, Moth). A sweetheart is always let in;
  a partner has moved to the farm (`HOME_NOTES.moved`). Otherwise `story.HOME_LINES[id]`: a note on the door (out), a sleepy voice
  (asleep), a kind refusal in their voice (shy), or "it is late". Inside: a first look (`in`, once, `flags.seen_home_<key>`), and
  talking gives 2-3 home lines (`visit`); the first chat at home each day is +2 (`sim.homeVisit`, `state.visits`).
* Map: building labels (`homeLabel` under shops and posts), lower-deck hatches labelled; walkers drawn on every tab. Help page
  "People walk, and visiting homes"; wiki people cards list each home.
* Old saves: `ensure()` adds `state.visits`. Tests: farm-maps (every spot pair, spot to every portal, a full day planned for
  everybody each weekday, early and late in the story, counters on time), farm-story (homes in every schedule, lines, presence),
  farm-sim (door rules, the daily bonus, old saves).
* **Opening-hours signs and mailboxes** (owner, 2026-11-20). An `hours_sign` prop (act `hours`, `place`) stands beside the door of
  every public place in `story.PLACES` (shops, the clinic, the library, the Hangar, the Hall, the Guardians' Post, the office, the
  Exchange, the church, the depot, Arrivals, the Grand Market, Venn's bench). E reads the place's name and its hours by day, closed
  days included: `story.hoursSign` reads them off `whereIs` (a fine ordinary day with the current flags), so they cannot drift and
  follow the story. It does not say who runs the place. A `mailbox` (act `mail`, `home`) stands by every home's door (by the back
  door for rooms behind a shop); E shows whose it is, or with something giftable in hand leaves it as a gift (`sim.mailGift`): 80%
  of handing it over (`MAIL_SHARE`, tiers and birthdays included), counted as that day's gift. They mention it next time they
  talk (`story.MAIL_LINES` by tier). A partner's old mailbox carries the moved card. Both props are placed last, on free ground
  beside the door, and never where they would block the way in (`maps.signsAndMail`, `HOURS_SIGNS`, `MAILBOXES`).
* **Gifts later in the day** (owner, 2026-11-20): the first gift of the day to a person counts in full; any more that day count a
  quarter each (`LATER_GIFT_SHARE`, gains and losses alike; a loved, liked or disliked gift never rounds to nothing; the birthday
  words only for the first). There is no weekly limit. A mailbox gift is the day's first gift like any other: later mailbox gifts
  are 80% of a quarter. Old saves: any old weekly gift count is dropped by `ensure()`.
* **Walking, tidied** (owner, 2026-11-20: "fix the rough spots"): `planDay` works deadlines backwards, so everybody reaches every
  post (`DUTY`, now with the school floor) on the hour, shop or not; to other places they set off when the hour comes, or sooner
  if a later post needs it. Slots too short to walk were fixed in the schedules: Fenn checks the school locks from the schoolyard
  and opens the depot desk at 9:30; Hana lunches on the Works steps; Pastor Ines leaves the altar at 11:10 on Wednesdays for the
  assembly; Tika shuts the garage at 17:20 on Fridays before the Hangar stage; Vashti's Friday at Ruess's bench is 15:10-17:30 and
  then the overlook; Venn's Friday visit up top is 15:10-17:30, back at the landing for the evening bench; Noor's evenings off are by
  the river, not up the hill; Venn's reactor rounds start at 14:30. People sharing a spot stand on open ground at least 0.75 apart;
  `central.homes` moved off the Thornes' doorway. A shop opens exactly on the hour and only with the keeper at the counter
  (`onDuty`). A guest still in a home at the host's bedtime, at 21:00 (bar a sweetheart), or when the host goes out, gets a
  goodnight line (`HOME_NOTES.goodnight` / `byeOut`) and is shown out of the door. The town map names Eden Central's housing rows
  once and labels only the houses that are somebody's home. Tests (farm-maps): on time to every post every weekday, early, middle
  and late in the story; nobody in a wall, on soil or through a post; nobody standing inside anybody else.

## 16. The Old World as one big city (owner, 2026-11-20: "we shouldn't go down to mine city ruins (it's not a mine or anything). The city ruins should be a big map (similar but not equal to the asteroid mines). Sato's pallas can roam around, fighting monsters (from radiation and toxic gases from the previous war) and searching for treasures (old-world stuff, credits, valuables, and rare items).")

* **The trip.** Maris's shuttle (the space dock gate, or the Arrivals desk; act `shuttle`) lands on a pad at the
  south edge of a ruined city. Sato is in her Pallas (actor `pallas: true`, tall 2.5) and can walk it anywhere.
  The trip ends when she walks back to the shuttle (E by the pad or the shuttle: "Board the shuttle home",
  `cityHome(state, 'pad')`, 20 minutes up), or when the Pallas's **hull** gives out and Maris tows her home
  (`cityHome(state, 'tow')`: an hour, 20 stamina, never below 1, and a **tow fee** of `TOW_FEE` = 150 cr, never
  more than she has) — the belt's air and tow, in Earth's terms. Overnight the trip ends anyway (`sleep` clears
  `state.mine`).
* **The map** (`sim.cityLayout(seed)`, pure and cached; a new seed every trip from the save's seed and
  `state.city.trips`): `CITY_W` × `CITY_H` = 96 × 72 cells. Cells: 0 street, 1 lot, 2 tower (solid footprint), 3 car,
  4 bus (1 × 3, north-south), 5 rubble pile, 6 **toxic pool** (walkable, 3 hull a second), 7 overgrowth, 8 billboard,
  9 landing pad, 10 locker, 11 safe, 12 shop counter, 13 sealed vault, 14 debris (`CITY_SOLID`: 2–5, 8, 10–14).
  `haz[i]` = 1 marks **gas pockets** (1 hull a second, nothing with the filters). Avenues run north–south three
  wide, streets east–west two wide, the boulevard straight north from the pad; blocks fill by zone: little houses
  in overgrown yards in the **suburbs**, big broken towers (or a collapsed one, or a park gone wild) **downtown** and
  in the industrial **core**. Craters with toxic pools (more in the core), weeds, cars, buses, billboards, rubble,
  shop counters by downtown towers, lockers, safes beside the tall ones, gas over downtown and the core.
  `cityZone(x, y)`: by distance from the pad (stretched north–south): 0 under 30, 1 under 58, 2 beyond — the core
  is the far north. A pass carves a way from any cut-off pocket to the pad, so every spot and creature can be
  reached (tests/farm-maps.mjs walks it for 8 seeds and checks the zones get further away in that order).
* **Creatures** (`CITY_MONSTERS`; `cityMonster(kind, zone)` scales hp +50% and damage +35% a zone):
  `rad_hound` (fast, weak), `glow_slime` (slow; a big one splits into two small ones), `rust_crawler` (armoured:
  bolts glance off for half, the sabre bites), `smog_wraith` (floats up close and drains the hull instead of
  biting), `spore_brute` (the mini-boss: one guards the vault, sometimes a second roams the core). `CITY_MIX` and
  `CITY_MONSTER_COUNT` (10 / 16 / 18) set who lives where. They wander near home, chase when she comes within sight,
  wind up and lunge (`monsterHit(state, kind, zone)` takes their damage off the hull). Beaten, they flee or fizzle
  (no gore): credits by zone and sometimes scrap, a battery, alloy, copper, silica, comet ice or crystal
  (`defeatMonster`). The Pallas fights as before: **Space** fires (gentle aim at the nearest creature ahead), up close
  it swings the beam sabre (2 damage, a wide arc), **F** sets down the Hydra autoturret, **Shift** boosts. Only the
  creatures within 26 tiles of her think.
* **Treasures** (`searchSpot(state, x, y)`, also `hitRock` in the city; 1 stamina; each spot once): rubble piles,
  car (and bus) trunks, shop counters, lockers, safes and the **sealed vault** (one, beside the core tower farthest
  from the pad; its spore-brute must be beaten first). `cityLoot(state, kind, zone)` → `{ items, credits }`;
  credits go straight to the purse and count in the trip's tally (`mine.credits`, shown on the HUD). Old-world
  finds come from `OLD_FINDS` (the ten relics plus the new valuables, rarer ones further in and from lockers and
  safes). The vault: a data core, a ring or music box, two credit chips, a seed tin, about 390–590 cr (280–420 × 1.4 in the core), and a
  star-plum the first two times ever (`flags.plum_ruins10`, `plum_ruins20`, as the old levels 10 and 20 had).
* **New items** (kind `valuable`, sell): `old_coin` 50, `teddy_bear` 90, `film_camera` 240,
  `credit_chip` 80, `data_core` 800. Gifts: Ruess loves the data core (the pocket watch is now a like) and likes the camera;
  Yui and Maris love old records (the existing `record`, now also a city find); Fenn loves teddy bears; Moraine and Marrow like old coins. Reused: `record` (the salvaged vinyl record), `photo`, `teacup`, `book`, `watch`, `toy`, `medal`, `seedtin`,
  `musicbox`, `datachip`, `ring`, `scrap`, `battery`.
* **Economy.** A city trip on 60 stamina (the 60 spots nearest the pad and the creatures outside the core) is worth
  about 2,200 cr (2.3–2.5×, owner 2026-11-21: "the Earth trip should earn more"; most of it old-world finds: rubble 9%, cars 11%,
  counters 35%, lockers 50% and safes two rarer finds each, the vault also a film camera and coins) against about 935 cr for 60 Field-hammer blows in belt sector 5 (tests/farm-sim.mjs measures both):
  more, with more risk (the hull, the tow fee, the shuttle fare). A full clear including the core and the vault is
  worth several thousand.
* **Safe spots and camps** (owner, 2026-11-20, later). `cityLayout` places three safe spots a trip, one per zone
  (`camps: [{ x, y, kind, zone }]`): a cleared **plaza** 12–22 tiles from the pad, a **rooftop** downtown and a shielded
  **bunker** entrance in the core. Each is cleared ground (radius 2) with no gas within 3, on reachable ground; no
  creature starts within 4, and in main.js no creature ever steps inside `CAMP_R` = 3 of one. E at a safe spot builds a
  **camp** (`buildCamp`: `CAMP_COST` = 3 scrap and 100 cr; once a trip; a tent, a scrap windbreak and a campfire). At a
  built camp E offers: **Sleep** (`campSleep`: the full night as in the farmhouse bed — `sim.sleep`, so crops, animals,
  robots and deliveries all tick, then the morning report — and she wakes at the camp with the hull mended; the trip
  goes on, and it saves there); **Save the game** (`campSave` marks `mine.saveCamp`, and main.js `save(true)` writes
  `player.map = 'ruins'` at the camp; `loadState` keeps a city trip only for such a save, otherwise it drops the trip and
  puts Sato at the space dock); and **Fly home** (`cityHome(state, 'fly')`, only at a built camp: 30 minutes, no
  penalty, the loot kept). Flying home plays the Pallas's transformation (main.js `flyHome`, about 3.6 s, E, Space or a
  tap skips it): the Pallas's own parts fold (cityworld.js `pallasFold` cuts the one-mesh `pallas` model by bounds into a body,
  legs and arms on joint pivots: the legs fold up behind, the arms sweep back, the body tilts forward to level and wings
  slide out from the back), a brief flash hands over to its flight form (the `pallas_jet` model, or a procedural jet) that lifts off, banks and climbs north with the camera following, then the screen fades and she lands
  at Eden Central's space dock.
* **Finding treasure** (owner 2026-11-21: "I don't know what is searchable and what isn't"). Every car, bus and remaining
  rubble pile is a spot (plain debris slabs look different and are never searchable). An unsearched spot has a bobbing
  sparkle with a soft halo and a faint light column over it (`spot_glint`; gold over safes and the vault); a searched one
  loses it, gets a small green ring and its prop goes grey and dim. The minimap shows unsearched spots within 20 tiles as
  pale dots (gold for safes and the vault). **R** (when not holding food) scans: columns of light over every unsearched
  spot within 16 tiles and a count, 8 s cooldown.
* **The HUD** shows the zone, the hull and the credits found (`The core · hull 72/100 · found 340 cr`) and a hull bar
  under it. The minimap works on the city (streets dark, toxic pools lime, tower footprints pale); the map screen (M)
  says there is no chart of a city that shifts every trip.
* **Rendering.** The towers are props stretched to their footprints (height `hgt`); the small things (cars, buses,
  rubble, lockers, safes, counters, billboards, debris, pool bubbles, gas) are placed only within 19 tiles of Sato and
  taken away behind her (main.js `cityStream`). Ground: asphalt `m`, ash lots `a`, overgrowth `g`, toxic pools `t`
  (a glowing lime surface, world.js).
* **Saves.** `ensure()` drops any old levels-style trip (`state.mine` with mode `earth`, or anything else that is not
  `belt` or `city`) and puts Sato back at the space dock. `state.city = { trips, best }`; `stats.deepest` is no longer
  used.

Art slots added (models; each has a procedural stand-in in js/farm/cityworld.js): `camp_spot` (procedural), `camp`, `pallas_jet` (models from the art pack, procedural fallbacks), `ruin_tower`, `ruin_car`,
`ruin_bus`, `ruin_rubble`, `ruin_billboard`, `ruin_locker`, `ruin_vault` (also the safes, smaller), `shop_counter`,
`toxic_pool`, `shuttle_pad` (as before), and the creatures `rad_hound`, `glow_slime`, `rust_crawler`, `smog_wraith`,
`spore_brute`. Icons `icons/old_coin`, `icons/teddy_bear`, `icons/film_camera`,
`icons/credit_chip`, `icons/data_core`. Texture `textures/asphalt` (optional).
* **Expression portraits** (owner, 2026-11-20). Bust cut-outs at `art/farm/people/portraits/<id>_<expression>.webp`, listed in
  `portraits/index.json` (`{ id: { expression: file } }`). `js/farm/expressions.js`: the names (main cast: neutral, joyful,
  enjoying, shy, embarrassed, loved, sad, tearful, angry, surprised, worried, disgusted, teasing; others: neutral, happy, sad,
  angry, surprised, worried), the nearest faces to fall back on (`CLOSEST`, happy and joyful stand in for each other), then
  neutral, then the full-body front picture. The index loads in the background at boot and pictures on demand (cached; a
  speaker's other faces are fetched when they start talking). The dialogue shows the bust beside the box (`#dStand.bust`; Moth
  smaller). A line can carry `ex` (`L(who, text, ex)`); scenes fill the rest (`story.moodLines`, `SCENE_MOOD`): confessions and
  proposals shy, weddings loved, declines worried, partners loved, sweethearts shy, birthdays joyful; gifts by tier
  (`GIFT_FACE`: loved, happy, neutral, disgusted). Hand-picked faces for the key lines of all eight love stories (`EX_PICKS`),
  Sato's closing lines in them, and plain cues in heart events (tears, a laugh, a gasp, a sorry); a heart event's last line is
  loved (love stories, 7+) or joyful. The wiki's people cards use the neutral bust and show a strip of faces when there are some.
  Tests (farm-story): every tag is a known name, every speaker has some face, fallbacks, and index.json's files exist (skipped
  while there is no index).
