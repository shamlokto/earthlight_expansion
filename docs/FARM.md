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
| `vashti` | Nell Vashti, salvage hunter; red bandana, braid, few words. | At the **Wreck** on the hill (the mine) | `w_vashti.webp` |
| `moraine` | Queen Moraine of the Ashfall Cartel; trader now, still a queen. | Her barge is at the village dock on **Saturdays** (rare seeds, tonic) | `svg:moraine` (js/expansion/portraits.js) |

Do not use Lt. Arkin (he may have died in the player's campaign) or name the General.

## 2. Rules (the sim)

* **Calendar**: 4 seasons (Spring, Summer, Autumn, Winter) × 30 days; week Mon–Sun, Spring 1 of
  year 1 is a Monday. A day runs 06:00–24:00; one game minute is 0.6 s of real time (stopped in
  dialogs and menus). At 24:00 Sato collapses and wakes at 06:00 with half stamina.
* **Stamina** 100. Tools cost 2 each use (fishing 1, nothing when a tool does nothing). At 0 she
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
  | Spring | turnip (4, –, 60) · potato (7, –, 80) · cucumber (9, 5, 60) · strawberry (8, 2, 30) | 120 · 150 · 200 · 150 |
  | Summer | tomato (9, 3, 60) · corn (13, 4, 100) · onion (7, –, 80) · pumpkin (14, –, 250) | 200 · 300 · 150 · 500 |
  | Autumn | carrot (7, –, 120) · eggplant (9, 3, 80) · sweetpotato (6, 2, 60) · spinach (5, –, 80) | 300 · 120 · 300 · 200 |
  | Any but winter outdoors | moonflower (18, –, 500), Moraine only | 1000 |

* **Pasture** 12×7: grass seed (500) sows 3×3; grass grows in 3 stages over 9 days (not in
  winter); the sickle cuts ripe grass to fodder (1 each, regrows from stage 1).
* **Animals**: coop holds 6 chickens (1500 each), barn 4 cows (5000 each); delivered next morning.
  Each needs 1 feed (chicken) or 1 fodder (cow) a day from the stock (bought: feed 10, fodder 20):
  "fill the troughs" feeds all. A fed chicken lays an egg (50) next morning. A fed cow can be
  milked once a day with the milker: small/medium/large milk (100/150/200) by affection
  (<34, <67, ≥67). Affection 0–100: +2 fed, +3 brushed (cows), +1 talked to; −5 unfed.
* **Shipping bin**: put items in; Maris collects at 17:00 (flavour); paid at dawn. A ledger
  counts everything ever shipped.
* **The Descent and the Old World** (owner, 2026-11-16: no mine; a peaceful search of the ruins).
  On the hill, Vashti's cargo lift takes Sato, in her **custom Pallas** (guns swapped for a salvage
  arm), down to the ruins of human civilisation on Earth's surface: sites of 14×12 with walls and
  rubble piles. Searching a pile (1 stamina) may give scrap (15), alloy (40; from level 5), crystal
  (150; from level 10) or a **relic** (photograph, porcelain cup, book, pocket watch, tin robot,
  medal, seed tin, music box, data chip, gold ring; rarer ones lie deeper). One pile hides the way
  down. Crawlers and stray drones live there; the Pallas and a **Hydra autoturret** she sets down
  deal with them easily (a creature that reaches her costs 5 stamina, never more). Relics can be
  sold, given, or donated to the **Memory Room** in the Village Hall (10 kinds to collect).
* **Fishing**, her other great love: the rod (600; Ruess upgrades it) at any water. Cast, wait for
  the float to dip, pull. Silverfin, river trout, chamber carp (50/120/200), a special fish for
  each season, and the legendary **Old Hollin** in the hill lake. Rain and the lake are best.
* **Forage** on the hill, new each day: herb (spring, summer; 40), berry (summer; 30, edible),
  mushroom (autumn; 70), frostcap (winter; 60).
* **Upgrades**: Ruess upgrades a tool overnight (level 2: 800 + 5 scrap; level 3: 2500 + 5 alloy
  + 1 crystal) and repairs the greenhouse (4000 + 120 lumber). Seln sells bigger rucksacks
  (10 → 15 slots 1500, → 20 slots 4000).
* **Friendship** 0–100 per villager (10 points a heart): first talk of the day +2; one gift a day:
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
`farm.field` · `village.square`, `village.memorial`, `village.bridge`, `village.dock`,
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
  game's Reckoning). Willowfall, the Hollin field on its terrace, and Terrace Hill with the Descent.
* **Three more villagers**: Commander Rell Kestrel (Guardians' wing), Dr. Haruto Mori (the
  **clinic**: a check-up restores stamina for 150 cr) and Yui Hoshino (the **library**: the shelves
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
