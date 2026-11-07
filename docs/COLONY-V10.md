# Earthlight Space Colony Rebuild: version 10

The owner chose five features (2026-11-07). Eden ends with a lot of unused space, and these should reward filling it. The game must stay easy to manage, because the owner already struggles to keep up. So every part is optional, gentle and visible in one place:

1. **districts**;
2. **Eden's gardens**, with the Garden of Eden ending;
3. **luxuries**;
4. **neighbours**;
5. **photo mode**.

New data carries `ver: 10`: 3 buildings (the Coffee Terrace, Vineyard Dome and Artisan Workshop) and 1 tech (Luxury Goods). Each of the four new pure modules imports `rules.js` and uses it only inside functions, like `wonders.js`. `rules.js` re-exports what the interface needs.

## 1. Districts (js/colony/districts.js)

In the chamber inspector, an **open** chamber can be declared one of four districts. A chamber has one theme. A change waits **30 days** after the last one (`DISTRICT.cooldown`). The first declaration, and a chamber with no district, can change at once.

**How the bonus grows:**
- **Fill** is the share of the chamber's land covered by finished buildings that fit the theme. Land is buildable floor, with roads and lift shafts left out.
- The bonus comes in **tiers at 25%, 50% and 75%** of fill (`DISTRICT.tiers`). Each tier adds the theme's `per` once more.
- **Homes fit every theme except the Industrial Quarter.**
- For a Garden District, forest tiles count as land that is already green.

| Theme | Fits | Each tier gives |
|---|---|---|
| ❀ Garden District | parks, groves, sky gardens, orchards, the Seed Vault, Plaza, fisheries, vines and coffee, garden landmarks and wonders, homes, galleries, lodges, hotels | +1 happiness for the whole colony, 20 air a day, land value +4 in the chamber, greenery +10 |
| ⚙ Industrial Quarter | the `industry` and `power` categories, plants, stores, yards, the Arsenal, the Scrapyard, the Artisan Workshop | the chamber's fitting buildings make 5% more (sim.js step 5, per building) |
| ✎ University Quarter | labs, schools, galleries, clinics, the Library, Sato's Watch, the Hall of Names, artisans, transit, campus greens, homes | labs in the chamber make 10% more, plus 2 research a day |
| ★ Entertainment District | hotels, the Promenade, Theatre, Casino, Concert Hall and Arena, plazas, galleries, canteens, parks, coffee, artisans, the Lodge, the Arrivals Hall, homes | +6 tourism attraction, +1 happiness |

District happiness from all districts together is capped at **+8** (`DISTRICT.happyMax`).

**Saving.** The district lives on the chamber: `c.district = { theme, since, fill, tier }`, so it is saved with the chamber. Old saves simply have no districts.

**When it runs.** `districtsDay` runs right after the incidents, before labour and production, so a new tier counts the same day. It logs "Riverside Fields is a tier 2 Garden District (52% built to fit): …" when a tier is reached or lost.

**Where the effects plug in:**
- `districtMults` (sim.js `run`, one chamber lookup per building);
- `districtAir` and `districtResearch` (after production);
- `districtHappy` (step 7);
- `districtValue` (landvalue.js, the last stamp; also in `landValueParts` as "A Garden District", and in the cache signature);
- `districtTourism` (tourism.js);
- `districtGreenery` (gardens.js).

**Interface:**
- **The inspector's District section**, on any open chamber's tile, shows:
  - a badge with the theme and its tier;
  - a "Built to fit" bar with tick marks at the three tiers;
  - "n of N tiles of land";
  - the current bonus and the next tier's bonus in words;
  - the days left before the theme can change;
  - four theme buttons, plus × to clear.
- **The minimap** tints a district's chamber 22% toward its theme's colour (`DISTRICT_RGB` in minimap.js; view.js refreshes it when a theme changes).

## 2. Eden's gardens (js/colony/gardens.js)

**Greenery** (`greeneryOf`) adds up:
- the park rating of every working park, grove, sky garden, plaza, garden landmark or finished wonder (Arcologies left out);
- 4 for each Orchard and Vineyard Dome, 3 for each Coffee Terrace, 2 for each Seed Vault;
- 0.25 for each forest tile and 0.1 for each river or lake tile in the open chambers (cached; recounted when a chamber opens or every 10 days);
- 40 more for the finished Grand Arboretum;
- 10 for each Garden District tier.

A new colony on seed 1 scores 8, from its river.

**Wildlife comes back** once each, at most one a day. Each comes with a `wildlife` event: the speaker's line as a quote, **Show me**, and a green window.

| Greenery | Moment | Speaker | Lasting gift |
|---|---|---|---|
| 80 | Bees and butterflies | Ruess | Orchards, Coffee Terraces and Vineyard Domes ×1.1 |
| 160 | Birds in the sky gardens | Sato | +2 happiness ("Wildlife in Eden"), +5 attraction |
| 280 | Fish in the canals | Ruess | Fisheries ×1.25 |
| 420 | Deer in the forests | the General | +2 happiness, +10 attraction |

**The Garden of Eden** is an optional third ending: **greenery 600 and happiness 70 on the same day**.
- `gardensDay` records `state.gardens.eden = { day, pop, greenery, happy, wildlife, parks, restored, difficulty }`, logs it and adds a `garden` pending event. sim.js adds a `garden` event that pauses.
- ui.js shows it in the **victory screen's style** (`renderVictory`, with `GARDEN_ENDING`'s three voices, its numbers, and the art slot `scene/garden`, falling back to the ending's still).
- main.js saves at once when it is answered and plays the victory sting.
- It plays once. It neither needs nor changes `state.victory` or `state.ark`.

**Interface.** The Happiness pop-out gains an **Eden's gardens** section: the greenery bar toward 600, the four wildlife moments (✓ with the day, ○ with the threshold) and the score's parts.

**Saving.** `state.gardens = { score, wildlife: { key: day }, eden }`. `upgradeState` adds it, empty, to an older save.

## 3. Luxuries (js/colony/luxuries.js)

**Who wants them.** The **well-off** live in Tower Blocks at level 3 or 4 (Spires and Skyscrapers), Arcologies, and the finished Spin-Gravity Ring. Their number is those homes' housing, scaled by how full Eden's homes are (`wellOffOf`).

**What they want, a day per 100 of them:** coffee 1, wine 0.8, art 0.5. A full Spire of 450 wants 4.5 coffee, 3.6 wine and 2.25 art.

| Building | Size, where | Cost, days | Makes |
|---|---|---|---|
| **Coffee Terrace** (`coffee`) | 2×2, **hills only**, upper or main deck (the upper deck has hundreds of hill tiles) | 600 cr 30 p, 5 d; 4 jobs, upkeep 3 | 20 coffee from 3 water; park 3 within 3 |
| **Vineyard Dome** (`vineyard`) | 2×2, upper deck | 700 / 40, 5 d; 4 jobs, −4 MW | 16 wine from 4 water; park 2 within 3 |
| **Artisan Workshop** (`artisan`) | 2×2, all decks (category Services, so it is no "industry next door") | 800 / 50, 5 d; 6 jobs, −4 MW | 10 art from 2 parts |

All three need **Luxury Goods** (society, 300 points, after High-rise Homes).

**The day.** `luxuriesDay` runs after production and before the needs:
- the well-off take what they want, as far as the stores reach;
- the share of each want that is met goes into `state.luxuries`.

**What meeting the want does:**
- **Happiness:** +2 for each luxury fully met, so up to +6 ("Luxuries for the well-off"). There is never a negative part.
- **A Skyscraper's `luxuries` need.** A new need word in `rules.habitatNeeds`, added to the Tower Block's 4th level in the data. It is met when coffee and wine each meet 90% of the want:
  - before Luxury Goods is researched it only gates growing, so old saves' Skyscrapers hold;
  - after that it must hold too, or the Skyscraper falls back to a Spire after the usual 10 days.

  Nothing else ever suffers: no shortage, no unrest, no deaths.
- **Tourism:** art on show adds 0.5 attraction per point of art used a day, up to 15 ("Art on show").

**Stores.** The stores hold 600 of each luxury, plus 200 for each Warehouse (`luxCap`). The surplus beyond that is **sold to the traders by itself** at 80% of the market price, so nobody has to sell by hand. The credits count in the day's produce and in `luxuries.exported`.

**Market prices** (`BASE_PRICE`): coffee 4, wine 5, art 9. The luxuries are not in `rules.STORED`: they have their own cap. `summary()` lists them with that cap.

**Interface:**
- **More pop-out:** the three goods as stats, shown only once Luxury Goods is researched, any is stored, or a building makes them (`LATE`).
- **Market:** the same rule for their sell rows, plus a **Luxuries** table: wanted a day, the share had, and the store.
- **Inspector:** a Skyscraper lists "Coffee and wine for the well-off (coffee 0%, wine 0%)".

**Saving.** `state.stock.coffee/wine/art` and `state.luxuries` (yesterday's figures). `upgradeState` adds them.

## 4. Neighbours (js/colony/neighbours.js)

Three settlements, each with a mood from −100 to 100:

| Neighbour | Starts at | Speaker | Its raider den |
|---|---|---|---|
| the Union remnant | 10 | Sato | the deserters' den, when its faction is `union` |
| the Galt remnant | 0 | Ruess | the deserters' den, when its faction is `galt` |
| Moraine's Ashfall Cartel | −20 | the General | the Cartel's den |

**What moves a mood.** `readCounters` reads the colony's own counters each day, so no other module calls in:

| Event | Effect |
|---|---|
| Market sales | Union and Galt +1 per 1,000 credits sold (at most +2 a day; small sales add up) |
| A relief load | Union and Galt +2 |
| A petition granted | Union and Galt +1 |
| A raid beaten off | a Cartel band: the Cartel −6; deserters: their old side +4; the others (not the Cartel) +2 |
| Tribute paid | the raiders' people +3, the others −2 |
| A squadron at an outpost | that side +6 |
| A squadron at a Galt bunker | Galt +4 |
| Clearing a den | the Cartel's den: the Cartel −25; the deserters' den: their old side +6; the others +4 |
| Drift | every 5 days, a point back toward the start |

Each change is logged in `state.neighbours.log` (12 kept) for the tab.

**Offers and requests:**
- They use **their own dice** (`rngFor`, seeded like incidents.js), so the main generator is never touched.
- They need a finished dock. The first comes on **day 50** (Easy **70**) plus up to 20 days, then one every **40–70** days (Easy **55–90**), and only one at a time.
- Seed 1 over 700 days: Normal, 12 offers from day 63; Easy, 9 from day 83.
- Each is a `neighbour` pending event, answered through `rules.answer` → `answerNeighbour`. The window has a **Neighbours** button that opens the tab.
- Quantities scale with the colony, from ×1 to ×5 (one step per 400 colonists).

| Offer | From | Effect |
|---|---|---|
| A trade deal | Union food, Galt parts or alloy, Cartel helium-3 | goods at 70% of the base price; accepting gives +3 |
| A request for aid | Union food or parts, Galt water | only when Eden has twice the amount; send it +10, refuse −4 |
| A warning | Union or Galt (mood 10+), about the Cartel's or the deserters' den | its fleet and whether it knows Eden; marks the den's sector known on the Star chart |
| A gift | any neighbour at Friendly | food, parts or credits |
| "Protection" | the Cartel, from 300 colonists | pay +8, refuse −5 |

**Perks** (`PERKS`; Friendly at 30, Allied at 60):
- the Union: Market sales +10% (`neighbourSell`, in `rules.sell`); once, a wanderer at the Lodge for 40 days;
- Galt: imports 15% cheaper (`neighbourBuy`, in `buyPrice` and `buy`); once, a machine (tier 2, tier 3 with Heavy Works) with 30 free days, through `addGuardian`;
- the Cartel: half tribute (`neighbourTribute`, in `tributeOf`); a **truce**: its den sends no raids while the Cartel is Allied (`neighbourTruce`, in `readyBase`).

**Hostile** (−40 or less): the related den is **bold**. Its fleet regrows twice as fast, and it notices Eden at half its population threshold.

**Settings › Neighbours** (`state.options.neighbours`, `rules.setNeighbours`): off withdraws an open offer, freezes moods and turns the perks and boldness off.

**Interface.** The Defence panel gains a **Neighbours** tab. Each neighbour has a card with:
- its mood bar, with a mark at 0;
- its standing (Allied, Friendly, Neutral, Wary, Hostile);
- its perks, with ✓ when earned;
- its den's state (destroyed, truce, bold, or its fleet);
- its last four mood changes.

**Saving.** `state.neighbours = { moods, perks, next, count, log, seen }`. `upgradeState` adds it to an older save at the starting moods, switched on.

## 5. Photo mode (main.js, view3d/view.js)

Open it with **P** or the **◉** button in the top bar's tools.
- `#sGame.cl-photo` hides the whole interface.
- `view.setPhoto(true, { orbit, fly })` hides the minimap and the camera buttons and frees the camera: down to the horizon (polar 1.48) and in to 2.5 tiles. It starts a slow **orbit** (0.06 radians a second) and, on request, a **fly-through** (3 tiles a second along the deck, turning at its ends).
- `setPhoto(false)` restores the camera.

**The bar** at the bottom has: Orbit, Fly, a **Time** checkbox and slider (`view.setDayTime`, 0 is noon and 0.5 midnight), **Save picture**, Hide bar and Leave.

**Save picture.** `view.snapshot()` renders a frame and calls `canvas.toDataURL` in the same task, so it needs no `preserveDrawingBuffer`. It downloads `eden-day-N.png`.

**Leaving.** Esc or P leaves. So does any event that needs an answer while Pause on events is on. The clock keeps its speed, and the camera keys and drag still work.

`window.__colony.togglePhoto` and `.photo` are there for tests.

## 6. Art

There are 7 new slots in art.js (the SLOTS block only; FILES is the art run's), each with a prompt in `tools/art/colony/prompts/`:
- cards: `coffee`, `vineyard`, `artisan` (`card-<key>.txt`);
- the Garden of Eden: `scene/garden` (`scene-garden.txt`, edited from the title picture like the other endings).

**No images were generated** (no xAI call). The cards fall back to their drawn icons, and the ending to the Eden Restored still.

**3D kits** (kits.js):
- **Coffee Terrace:** three stepped terraces of bushes with red berries, a roastery with a smoking chimney, a café awning;
- **Vineyard Dome:** vine rows with grapes under a ribbed shimmering glass dome with a gold rim, a cellar door and a beacon;
- **Artisan Workshop:** a brick hall with a sawtooth north-light roof, a mural, a glowing kiln, a statue yard.

## 7. Help

How to play gains:
- **Districts**, **Eden's gardens**, **Luxuries** and **Neighbours**, after The Ark;
- **Photo mode**, after Trackpad & keys.

The Tower Block's text names the Skyscraper's luxuries.

## 8. Tests and saves

**New tests:**
- **`tests/colony-districts.mjs`** (38 checks):
  - data, help and the interface;
  - declaring, the cooldown and clearing;
  - roads left out, non-fitting and unfinished buildings ignored;
  - the 25/50/75 tiers, the forest rule and the daily log;
  - every effect measured: Garden happiness, air, land value and greenery; the happiness cap; Industrial ×1.15 for fitting buildings inside only; University labs ×1.2 + 4 research; Entertainment tourism and happiness;
  - saves.
- **`tests/colony-gardens.mjs`** (28 checks):
  - data, help, the interface and the art slot;
  - every part of the score, including a wonder before its last stage;
  - each wildlife moment once, one a day, and their bonuses (bees, birds' happiness and tourism, fish);
  - the Garden of Eden: refused at happiness 60, given at 75, once; Eden Restored and the Ark untouched; saved; a pausing event in a running colony;
  - old saves.
- **`tests/colony-luxuries.mjs`** (33 checks):
  - data, the tech, prices, kits, slots, help and the interface;
  - who is well-off;
  - the day's use, share and happiness, with no penalty when missing;
  - production from inputs, the read-out, Market sales, the store cap, the automatic export and the Warehouse;
  - the Skyscraper's need (it must hold after the tech, only gates growth before it, and falls back without);
  - saves and old saves.
- **`tests/colony-neighbours.mjs`** (41 checks):
  - data, help, the tab and the switch;
  - every cause of mood measured, the drift, and the log;
  - offers on their own dice (the main generator is untouched), the first day and the counts on both difficulties;
  - off, and no dock;
  - answering aid, refusal, trade and warning;
  - every perk, each once-perk given once, and off;
  - hostile boldness;
  - saves and old saves.

**Updated counts:**
- `tests/colony-sim.mjs`: 92 buildings on the menu;
- `tests/colony-v2.mjs`: 51 techs, and 3 more tech-locked buildings.

**Saves.** `upgradeState` adds `state.gardens`, `state.luxuries` with the three stocks, and `state.neighbours`. Districts live on chambers.
