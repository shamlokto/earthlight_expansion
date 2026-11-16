# Farm-genre pacing research: HM Friends of Mineral Town (GBA, 2003)

Mechanics and numbers only, for tuning our own systems. No names, text, maps or story collected.

**Confidence tags:** [A] two or more fan sources agree for the GBA game · [B] one GBA source ·
[R] taken from documentation of the 2019 remake or the DS sequel (same engine lineage; probably
close, not verified for GBA) · [?] uncertain / from memory / not found.

Sources: fogu.com `/hm4/` (GBA guide: stamina, tools, plant_list, moo/*, mine, fishing, fish_list,
upgradeg, pberry, mtown), tartarus.rpgclassics.com `/hmfomt/` (tools, animals, crops, mining,
fishing, upgrade, festivals, walk), a GameFAQs "Year One Spring" guide (mirror), fogu `/sos3/`
health + friendship (remake), fogu `/hm6/` friendship (DS), stratswiki stamina page (remake).
Fandom wiki, GameFAQs, StrategyWiki and the ranchstory wiki all refused automated fetches.

---

## 1. Time

| Item | Value | Conf. |
|---|---|---|
| Clock speed outdoors | ~0.5 real s per game minute (10 game min = ~5 s; 24 h = ~12 real min) | B (one GBA source says "day = about 12 min"; one forum post gives 5 s/10 min, may be remake) |
| Usable day | Wake 06:00; shops mostly 09:00-17:00; realistic outdoor day 06:00-24:00 = ~9 real min | A |
| Indoors | Clock stops inside buildings | A |
| Mines | Clock reportedly also stops in mines | ? |
| Menus / dialogue | Paused | R |
| Day end | Sleep any time; forced end at 05:59 (teleported home at 06:00) | B |
| Staying up | No hard curfew. Fatigue rises after 22:00 and faster after 00:00; less sleep = less recovery; can oversleep | A |
| Calendar | 4 seasons x 30 days = 120-day year; 7-day week; shops have weekly closing days | A |
| Bath / hot spring | Soaking passes game time (people soak ~1 game hour) | B |

- Shop hours are short (typically 10:00-16:00) with one closed weekday each, so "town time" competes with "field time".
- **Takeaway for our game:** ~0.5 s/game-minute with time frozen indoors gives a 9-12 minute day that never feels rushed inside shops; keep outdoor time as the only scarce clock.

## 2. Stamina and fatigue

Two hidden meters (no HUD bar; only animations/face cues).

| Meter | Start | Max | Conf. |
|---|---|---|---|
| Stamina (strength) | 150 | 250 (10 berries x +10) | A |
| Fatigue | 0 each morning if fully rested; pass out at 100 | 100 | A |

Stamina cost per tool swing by tool tier (remake table; GBA believed same, not verified) [R]:

| Tool | L1 | L2 copper | L3 silver | L4 gold | L5 | L6 cursed/blessed | L7 |
|---|---|---|---|---|---|---|---|
| Hoe | 2 | 3 | 4 | 5 | 7 | 15 | 40 |
| Watering can | 2 | 4 | 6 | 8 | 10 | 15 | 20 |
| Sickle | 2 | 3 | 5 | 7 | 10 | 15 | 20 |
| Axe | 2 | 4 | 5 | 8 | 10 | 20 | 10 |
| Hammer | 2 | 4 | 5 | 8 | 10 | 15 | 20 |
| Fishing rod | 2 | 2 | 2 | 2 | 2 | 2 | 2 |

- Cost scales with the **charge level used**, not the tool owned; an uncharged tap costs the L1 price [R]. So base budget = ~75 uncharged swings per day at 150 stamina.
- Cursed (un-blessed) L6 tools: huge stamina drain (~5 uses to exhaustion) and +10 fatigue per swing [A].
- Fatigue gains [R, consistent with GBA text]: tool use in rain/snow +1 per swing; tool use after 22:00 +1, after 00:00 +2; swinging at 0 stamina +2 per swing (you do not faint at 0 stamina, fatigue climbs instead); awake at 00:00 +3, 02:00 +4, 04:00 +4, still up at 06:00 +10.
- GBA anecdote [B]: working at 02:00 in rain, a player "went blue" after 21 swings.
- Sleep recovery [R]: stamina +50 +7/hour slept; fatigue -5 -2/hour. Bed 22:00 = +106 / -21; bed 00:00 = +92 / -17; bed 04:00 = +64 / -9. A full night does **not** refill 150+ stamina from zero, so chronic overwork carries over.
- Hot spring [R]: +1 stamina and -1 fatigue per game minute soaked (1 game hour = +60 / -60, costs ~30 real s).
- Food restores instantly; best crafted food ~+100 stamina / -50 fatigue [R]. Shop tonics 500-2,000 G [B].
- Bedside flower vase (5,000 G): chosen flower adds a small nightly bonus (+10 stamina or -5..-10 fatigue) [A].
- Warning signs: farmer comments/animations at 50%, 20%, 5%, 0% stamina [B]; fatigue face states 0 / 1-49 / 50-79 / 80-100 [R]; turns blue then collapses at fatigue 100 and loses the rest of the day in the clinic [A].
- A late-game item removes the rain penalty / halves fatigue gain [A].
- **Takeaway for our game:** budget ~75 basic actions/day, make charged actions cost about 1 stamina per tile affected (cheaper per tile at higher tiers), and use a second slow "overwork" meter so one bad night is recoverable but habitual late nights are not.

## 3. Tools

Tiers: L1 basic, L2 copper, L3 silver, L4 gold, L5 mystrile, L6 cursed/blessed (found deep in second mine), L7 mythic [A].

| Upgrade to | Ore needed | Fee | Conf. |
|---|---|---|---|
| L2 | 1 copper | 1,000 G | A |
| L3 | 1 silver | 2,000 G | A |
| L4 | 1 gold | 3,000 G | A |
| L5 | 1 mystrile | 5,000 G | A |
| L7 | 1 mythic stone | 50,000 G | A |

Area per full charge [A]:

| Tool | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|---|---|---|---|---|---|---|---|
| Hoe (line ahead) | 1x1 | 2x1 | 3x1 | 4x1 | 6x1 | 12x3 | 18x5 |
| Watering can | 1x1 | 1x3 | 2x3 | 3x3 | 3x5 | 6x13 | 12x21 |
| Sickle | 1x1 | 1x3 | 2x3 | 3x3 (centred) | 5x5 | 9x9 | 15x15 |
| Axe (stump hits) | branch only | 6 hits | 3 | 2 | 1 | all on screen | all, half energy |
| Hammer | small stones | big stone 3 hits | big 2, boulder 6 | big 1, boulder 3 | boulder 2 | large boulder 1 | everything on screen |

- Experience: each tool has a 0-100% meter per tier; every use adds a little, the meter resets after an upgrade; an ore icon appears when the tool qualifies [A]. Exact uses per tier not found [?]. Lower tiers earn less per use; you can skip tiers, waiting 1 day at the smith per tier jumped [B]. Anecdote: one long day of chopping took an axe from L1 to silver-eligible; gold-eligible by day 3, mystrile-eligible by ~day 5 [B].
- Upgrade takes the tool away for 1-3 days (sources disagree) [?].
- Un-cursing L6: use 255 times (axe, rod), keep equipped 10 days (sickle, hammer), or pay 10 x 1,000 G blessings (hoe, can) [A].
- Watering-can capacity per tier: not found in any GBA source [?]. The can must be refilled at ponds.
- Branch = 1 lumber, stump = 6 lumber; hill stumps respawn daily [B].
- **Takeaway for our game:** gate tiers by a cheap fee + one ore + usage XP so upgrading is earned by doing the chore; make L4 can = 3x3 so it exactly matches one seed bag.

## 4. Crops

One bag sows a 3x3 block (9 plants) around the player [A]. Crops need watering once per day to advance; rain waters for you [A/B]. Prices are per item; "9-tile net/day" is derived by us (plant day 1 of a 30-day season, all 9 tiles harvested).

| Season | Crop | Seed bag | Grow days | Regrow | Sells | 9-tile net G/day (derived) |
|---|---|---|---|---|---|---|
| Spring | Turnip | 120 | 5 | - | 60 | 84 |
| Spring | Potato | 150 | 8 | - | 80 | 71 |
| Spring | Cucumber | 200 | 10 | 5 | 60 | 65 |
| Spring | Strawberry (unlock) | 150 | 9 | 2 | 30 | 94 |
| Spring | Cabbage (special vendor) | 500 | 15 | - | 250 | 117 |
| Summer | Tomato | 200 | 10 | 3 | 60 | 119 |
| Summer | Corn | 300 | 15 | 3 | 100 | 140 |
| Summer | Onion | 150 | 8 | - | 80 | 71 |
| Summer | Pumpkin (unlock) | 500 | 15 | - | 250 | 117 |
| Summer | Pineapple (special vendor) | 1,000 | 21 | 5 | 500 | 267 |
| Fall | Eggplant | 120 | 10 | 3 | 80 | 164 |
| Fall | Carrot | 300 | 8 | - | 120 | 98 |
| Fall | Sweet potato | 300 | 6 | 2 | 120 | 422 |
| Fall | Green pepper (special vendor) | 150 | 8 | 2 | 40 | 127 |
| Fall | Spinach (unlock) | 200 | 6 | - | 80 | 87 |
| Sp/Su/Fa | Pasture grass | 500 | 11 | 11 | fodder | - |

- All crop data [A] (two sources identical). Flowers (6-12 days, 300-600 G bags) are gifts/vase items, not sellable.
- Unlock crops appear after shipping 100 each of that season's three basic crops [A].
- Nothing grows outdoors in winter; season change kills out-of-season crops (so "last sowing day" matters: a 15-day crop must be in by day 15) [A]. Unwatered crops stall rather than die [?]. Storms can damage crops/fences [?].
- A greenhouse (late, expensive) allows any-season growing [?, not in sources fetched].
- 3x3 access problem: the farmer cannot walk through growing crops, so the centre tile of a full 3x3 cannot be watered or picked with basic tools [A]. Player layouts: sow a "C"/"U" of 8 tiles leaving one edge tile untilled (lose 1/9 yield), or leave 1-tile lanes between blocks; once the L4 can waters 3x3 the centre only needs harvest access, so root crops go in full blocks and regrow crops in C-shapes. Guides warn against 9x9 slabs and 3x1 strips [B].
- Helper NPCs (unlock at 3 hearts, hire for a few days) can water or harvest whole fields [B].
- Example scale [B]: an optimising player sold 7,720 G of turnips from one harvest (~14 bags) in the first spring.
- **Takeaway for our game:** keep single-harvest crops at ~70-120 G/day per 9-tile block and regrow crops at 120-270, with exactly one outlier per year (the 422) as a discoverable "best crop".

## 5. Animals

| Animal | Price | Daily food | Product cycle | Capacity (base / upgraded) |
|---|---|---|---|---|
| Chicken | 1,500 G | 1 feed (10 G) | 1 egg/day | 4 / 8 |
| Cow | 5,000 G | 1 fodder (20 G) or 1 grass tile outside | milk daily; bought cows wait 7 days | 8 / 16 shared with sheep |
| Sheep | 4,000 G | same as cow | wool regrows ~7 days | shared |

Product grade by hearts (0-10 hearts) and sale price [A]:

| Grade | Requirement | Egg | Milk | Wool | Mayo | Cheese | Yarn |
|---|---|---|---|---|---|---|---|
| S | 0-3 hearts | 50 | 100 | 100 | 100 | 300 | 300 |
| M | 4-7 | 60 | 150 | 400 | 150 | 400 | 700 |
| L | 8-10 | 80 | 200 | 500 | 200 | 500 | 800 |
| G | 8-10 + won that species' festival | 100 | 300 | 600 | 300 | 600 | 1,000 |
| P | G + 600 outdoor hours | 180 | 500 | 1,000 | 450 | 750 | 1,500 |
| X | 1/255 daily chance from a P animal | 350 | 800 | 2,000 | 800 | 1,500 | 4,000 |

- Affection scale: 0-255 points, ~25 per heart [R]. Per-action points for GBA not found [?]. Related titles: talk +1/day, brush +1 to +3/day, milk/shear +1 to +2, outside 5+ hours +1/day (DS: 1,000 scale with 100/heart and a daily cap of ~3 per action) [R]. Chickens gain by being picked up and put down [B].
- Penalties: unfed, or left out in rain all day = "..." mood and no product that day; hitting with a tool makes them unhappy; wild dogs at ~20:00 scare animals left outside unfenced [A]. Exact point losses not found [?].
- Feeding: one fodder item per animal per day placed in any feed bin (position irrelevant); fodder is drawn from a dispenser stocked by cut grass or purchase; 1 corn milled = 30 chicken feed [A]. Animals outside on sunny days feed themselves (chickens free, cows/sheep need mature grass) [A].
- Incubator: 1 egg (2 after coop upgrade), hatches in 3 days, chick matures in 7 days and needs no feed [A]. Coop must have a free slot [?].
- Breeding: potion 3,000 G, pregnancy 20 days, newborn starts 0-4 hearts; calf 14 days to juvenile + 7 to adult; lamb 14 days to adult [A].
- Sickness: skull icon, cure 1,000 G, dies if untreated (days not stated) [A]. Old-age death: chickens 3-4 years, cows/sheep 5-6 years [B].
- Tools: brush 800, milker 2,000, shears 1,800, bell 500; maker machines 20,000 G each + rare ore + upgraded building [A].
- Festivals: one judged contest per species per year; winner permanently unlocks G/P grade for that animal [A].
- **Takeaway for our game:** a chicken pays back in ~30 days and a cow in ~35-50, far slower than crops but zero stamina, which is exactly why players add animals in summer of year 1; keep that crossover.

## 6. Friendship and romance

| Item | Value | Conf. |
|---|---|---|
| Friendship (all villagers) | 0-255 points | R (DS/remake; GBA believed same) |
| Romance (candidates) | 0-65,535; heart colour changes every 10,000 | A |
| Heart colours | black 0 / purple 10k / blue 20k / green 30k / yellow 40k / orange 50k / red 60k | A |
| Talk | +1 friendship, +200 romance, first talk of the day only | R (remake) |
| Gift: favourite / loved / liked / neutral | romance +800 / +500 / +300 / +100; friendship +9 / +9 / +3 / +1 | R |
| Gift: disliked / hated | romance -500 / -800 (special "horror" item -5,000); friendship -3 / -9 (-20) | R |
| Gift limit | Full value for first gift per person per day; romance only once/day; later gifts give reduced friendship (+3/+1/0) | R (DS) |
| Birthday | x5 on gift points (favourite on birthday = +4,000 romance, +45 friendship) | R |
| Showing pet | +1 friendship, repeatable | R (DS) |
| Heart events | 4 per candidate, one per colour band, need location/time/day; good answer ~+2,000-3,000, bad ~-2,000 | R |
| Decay | Remake: 10% daily chance of -1 / -200 if not spoken to. GBA decay unknown | ? |
| Marriage gate | Red heart + biggest house + all heart events + proposal item | ? (from memory) |

- Rough pace: talk + liked gift daily = ~500/day = one heart colour per 20 days; talk + favourite + birthday = red heart in ~2 seasons; talk only = ~300 days.
- GBA quirk: littering or harming animals in view lowers affection [R mention].
- **Takeaway for our game:** make "talk daily" worth ~40% of "talk + good gift" so attention matters more than spending, and give one x5 birthday spike per person per year.

## 7. Shipping

- Shipping bin emptied at 17:00 daily; money is paid at pickup [B].
- No pickup on festival days; items wait and are collected the next day [B].
- Extra bins inside coop and barn [?, from memory]; adult horse carries a mobile bin on the farm [A].
- Items shipped after 17:00 count for the next day. No price fluctuation; all prices fixed [A by absence].
- Basket (5,000 G) holds 30 items and can be dumped into the bin in one action [B].
- **Takeaway for our game:** a fixed 17:00 cutoff with same-day payout creates a daily mini-deadline without a market sim.

## 8. Mine

- Two mines, each 255 floors; mine 1 always open (ores), mine 2 winter-only until a late item (gems, L6 tools) [A].
- Each floor: rocks (hammer; sometimes drop an item) and dirt tiles (hoe). The down-stair is hidden under a dirt tile, never adjacent to the entry stair and never against a wall; some floors have none (dead end) [B]. Hoe on dirt can also turn up items/coins [?].
- No floor checkpointing: every trip starts at floor 1 (players abuse save/reload to map stairs) [B]. Remake adds pitfalls that drop 1-5 floors for -20..-70 stamina [R].
- Mine 1 ore bands and sale prices [B]: junk ore all floors 1 G; copper all 15 G; silver all 20 G; gold floor 3+ 25 G; mystrile 5+ 40 G; two rare ores 10+ 50 G (makers/accessories); mythic stone 60+ 20,000 G (only after all L6 tools blessed); stamina berry at 100; reward at 255.
- Mine 2 [B]: common gems any floor 55-75 G; "floor ends in 0/5/8/9" gems 55-100 G; two 10,000 G gems on ~8 specific deep floors each; L6 tools on floors 29, 39, 49, 59, 69, 79; stamina berry at 19.
- Ore is nearly worthless to sell; its value is unlocking tool tiers. Early mining income ~1,000 G/day with a basket [B].
- **Takeaway for our game:** make ore a key not a currency, and let depth be limited purely by stamina/food so the mine doubles as the stamina-economy endgame.

## 9. Fishing

- Rod is a free early gift; same L1-L7 tiers as tools [A].
- Cast: hold to charge to a tier, release; a "!" appears after a random wait; press in time to land it. Each cast 2 stamina [A/R]. Bite wait times not found [?].
- Charge tier selects size class: L1 small; L2-3 small+medium; L4 medium+large; L5 large + two one-off treasures; L6-7 large, "king" fish, 5,000 G and 10,000 G treasures [A].
- Sale price by size only: small (<=24 cm) 50 G, medium (25-49 cm) 120 G, large (50+ cm) 200 G [B]. Junk catches are unsellable.
- 45 ordinary species + 6 kings = 51; by season 30 / 29 / 32 / 25; by spot: sea 25, lower river 14, upper river 7, lake 6, pond 8; lake frozen in winter [B].
- Legendary pattern: each of 6 kings needs top rod plus one odd condition (night hours only, 200 fish shipped, owning certain recipes, throwing bait fish in first, winter-only hot pool, final one requires the other five + deep-mine pond) [B].
- **Takeaway for our game:** flat size-based prices keep fishing a ~120-200 G/cast side income; put the depth into six condition-gated legendaries instead of a price ladder.

## 10. Other pacing systems

Buildings (carpenter, 3 days each) [A]:

| Upgrade | Gold | Lumber |
|---|---|---|
| House 1 (kitchen) | 3,000 | 200 |
| House 2 (needed for marriage) | 10,000 | 700 |
| Coop 4 -> 8 | 5,000 | 420 |
| Barn 8 -> 16 | 6,800 | 500 |
| Bathroom | 30,000 | 580 |
| Cosmetic remodels | 10,000-30,000 | 200-500 |
| Vanity house | 100,000,000 | 999 |

- Lumber: 50 G each to buy, or free from axe (branch 1, stump 6); storage cap 999 [A].
- Rucksack: start = 2 item slots + 1 in hands (and 2 tool slots?); upgrades to 4 then 8 slots [B, inferred from guide text]. Prices believed 3,000 G and 5,000 G [?]. Carrying a held item blocks tool use [B].
- Power berries: 10, each +10 max stamina (150 -> 250) [A]. Sources: hoe a field tile, 10 daily offerings, 900 race medals, win horse race, win dog contest, top-rod winter sea fishing, mine floor 100, 10,000 G TV purchase, hidden winter spot, mine-2 floor 19 [B].
- TV: one channel gives tomorrow's weather (guaranteed accurate; players save-scum it); others give tips, a shopping channel on one weekday, and a New-Year guessing mini-game (5 plays/day for 5 days, 1,000 G prize items) [B]. Festival days are always sunny [B].
- Festivals: ~20/year (spring 4, summer 4, fall 7, winter 5). Types: animal contests, races with betting, cooking contest, evening "date" festivals gated by heart level (18:00-24:00), gift-exchange days. Contest days typically 10:00-18:00 and suspend shops and shipping [B].
- Start: 500 G, basic tools, a dog; a foal is gifted in spring 1 [B]. Foraging early spring ~500-1,000 G/day [B].
- Year-1 income curve: optimised/exploit play reaches ~140,000 G gross in spring alone (78,000 G of it from one betting day) [B]. Our estimate for a normal non-exploit player [?, derived]: spring 15-30k, summer 40-80k, fall 80-150k (sweet potato), winter 10-30k (mine/animals) -> roughly 150-300k for the year, against ~25k of "must-buy" upgrades (rucksack, basket, house 1, coop/barn, tool fees).
- **Takeaway for our game:** price the first-year essentials at ~10-15% of expected year-1 income and reserve the big sinks (30k+ luxuries) for year 2, so year 1 feels generous once the first harvest lands around day 6-9.

---

## Gaps (not found / needs in-game or ROM verification)

- Exact real-time clock rate on GBA hardware, and whether the mine freezes time.
- GBA per-swing stamina table (used remake values) and watering-can capacity per tier.
- Tool XP per use / uses per tier.
- GBA animal affection points per action and penalties; GBA talk/gift values (used DS/remake).
- Rucksack prices; greenhouse cost; crop death rules for missed watering and storms.
