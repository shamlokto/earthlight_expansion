# Earthlight Space Colony Rebuild — version 4 design ("Depths"): decks, secrets, expeditions, the win

Owner, 2026-11-03: "the colony is 3D, so there are upper and lower decks… the map becomes much
larger"; "secrets within the deserted colony"; "exploration of the surroundings by the stationed
fleet"; "how to define a win". Decisions D21–D24 in COLONY.md. This is the design; the build contract
is written when version 3 has landed. Builds after COLONY-V3.md.

## 1. Three decks (D21)

| Deck | Character | Terrains | Good for |
|---|---|---|---|
| **Upper** | Habitat rings under the sky panels: galleries, sky gardens, observation domes | deck, garden soil, glass (no building, lets light through), hull | Homes, parks, sky gardens, research, observatories |
| **Main** | Today's map: fields, the river, industry, the docks to space | as now | Farms, industry, everything outside the hull |
| **Lower** | Machinery halls, flooded tunnels, catacombs, the old reactor | deck, rock, rubble, flooded tunnels, conduits, catacombs | Heavy industry, power, water cisterns, storage, **most secrets** |

* **Same footprint as Eden's interior** (160 × 80 tiles), each deck with its own ~16–24 chambers. Space
  around the hull belongs to the Main deck. The playable map triples inside the hull.
* **Lift shafts** sit at fixed sites through all three decks (6–8 of them). A shaft is repaired like a
  chamber (parts and days) and then links the decks at that spot. A chamber on another deck can be
  surveyed only through a working shaft from an open chamber.
* **Air** is per deck: an open upper or lower chamber needs air like any other. Lower chambers often
  have hazards instead of hull breaches (flooding, toxic air, rogue drones); upper ones have breached
  sky panels.
* **Coverage** stays on its deck; lifts carry roads, people and rovers between decks.
* **Data**: `map.decks = [upper, main, lower]`, each `{ t, r, ch, sv }`; chambers and buildings gain
  `deck: 0 | 1 | 2`. Old saves become the Main deck, with the other two decks generated from the seed.
* **View**: one deck in full at a time; the deck above fades to a faint outline, the deck below
  shows dimly through glass and shafts. A deck switcher (buttons and PageUp / PageDown, also on the
  navigation pad), and the minimap shows the current deck. Moving between decks animates the camera
  up or down the shaft.
* **New buildings** (about 8): Lift (on a shaft), Sky Garden (upper: happiness and air), Gallery
  (upper: entertainment), Water Cistern (lower: big water storage), Geothermal Tap (lower: power from
  the old core), Conduit Junction (lower: carries power between decks), Pump Station (drains flooded
  tunnels), Vault Door (seals a cleared vault as storage).

## 2. Secrets (D22)

Revealed when a chamber is surveyed or opened, mostly on the Lower deck. Each is a **site** in a
chamber, shown on the map and listed in a **Discoveries** journal.

* **Story logs**: terminals, recorders and wall messages that tell, in pieces, what happened to Eden.
  The mystery (draft): Eden was hardly a battlefield, yet it is half dead. In the last months of the
  war the Directorate (Kessrin's security service) turned Eden's lower decks into a black site; a
  Quantum Decimator test went wrong below the fields and gutted the lower decks; the colonists were
  told it was a Galt attack and evacuated, and the survivors who knew the truth hid in the catacombs.
  About 20 logs, each short and voiced by a character (the old warden, a Directorate engineer, a
  child's diary, Galt prisoners…), building to the **final vault**.
* **Hidden vaults and blueprints**: sealed rooms behind puzzles of access (find the key log, power
  the door, drain the tunnel). Rewards: stockpiles, rare techs, and **prototype machines**: the
  original game's cut units (types 28/29, 41, 45–48, never placed in Earth Light) return as
  Directorate prototypes, one each.
* **Survivors in hiding**: pockets of people in the catacombs and galleries who join as colonists
  (tens at a time), and a few unique commanders (the old warden of Eden, a defecting Directorate
  engineer).
* **Dangers**: rogue Directorate defence drones guarding a chamber (cleared by sending guardians: an
  auto-resolved fight like a raid), sealed hazards (toxic air, radiation from the test site:
  decontaminate first), flooding, and the **old reactor**, which, once found, must be made safe within
  a time limit or it damages its deck. Dangers guard the best rewards.
* **The final vault** (the mystery's end): its opening reveals the truth, gives a unique reward, and
  counts toward the win's story epilogue (not required for the win itself).

## 3. Expeditions (D23)

* A **sector map** (a star chart) of about 20 sectors in rings around Eden, opened from the Defence
  panel or a Chart Room building. Sectors start unknown; scouting reveals them.
* Site types: asteroid belts (ore and ice), derelict warships (salvage, a machine), the **Babylon
  wreck** (deep salvage, story), a **Galt bunker** (survivors, Galt blueprints), **pirate dens** (clear
  them: fewer raids), Union and Galt outposts (trade, wanderers), the **Directorate listening post**
  (story, intelligence), a comet (water), Earth relief stations (where relief convoys go).
* **An expedition**: a squadron of up to 6 crewed guardians, optionally led by a commander, sent to a
  sector. Travel days by distance; each event on the way is auto-resolved (fights by guardian power
  as in raids, hazards by commander skills); results come back as a report with loot. Guardians away
  don't defend Eden.
* Rewards: goods, parts, salvage credits, blueprints and techs, unique machines, survivors and
  wanderers, map knowledge, lower heat (pirate dens cleared), and later **new map regions** attached
  to Eden's map (D8).
* Beta testers' big fleets make expeditions quick and safe, as their raids are.

## 4. The win: Eden Restored (D24)

* **Every chamber on every deck pressurised** (Upper, Main and Lower),
* **2,000 colonists** (Easy 1,500),
* **An Earth relief quota shipped**: food, air and helium-3 sent to Earth by **relief convoys** from the
  dock (or a Mass Driver), e.g. 20 convoys of 100 units.
* A **Victory** screen with an ending (Ruess, Sato and the General), the colony's statistics, and an
  extra epilogue if the final vault was opened. **Afterwards the player saves and keeps playing** (D25):
  the colony continues as a sandbox, with the victory remembered in the save.
* **Videos** (D26): a few short xAI clips for the big moments, the ending first (then candidates: the
  opening landfall, the first raid, the final vault), made image-to-video from the game's own art so
  they match; small files, each with a still-picture fallback, skippable.

## 5. Build order
1. Decks: map generator for three decks, state and save, rules (deck in placement, lifts, per-deck
   chambers and air), view (deck switcher, ghosting, minimap per deck), interface, art (upper and
   lower terrain textures, new building cards).
2. Secrets: sites, the Discoveries journal, logs and the mystery text, vaults and prototype
   machines, survivors, dangers (drones, hazards, the reactor).
3. Expeditions: the sector map, squadrons, events, rewards.
4. The win: relief convoys, the victory check, the ending.

---

## Stage 1 build contract: the three decks

The owner has authorised merging finished work without asking (2026-11-03).

### Data (written)
* `data/terrain.js`: GLASS (sky panel, upper), CONDUIT (lower machinery floor, buildable), CATACOMB
  (lower tunnels, not buildable until stage 2's secrets), SHAFT (lift shaft site, buildable only by a
  Lift), OUTSIDE (no floor: everything beyond the hull on the upper and lower decks; not drawn).
  Flooded tunnels use the existing MARSH ("Flooded ground").
* `data/buildings.js`: `decks` field (absent = main deck only); six deck buildings: Lift (on shafts,
  any deck), Sky Garden and Gallery (upper), Water Cistern and Geothermal Tap (lower), Pump Station
  (main and lower: drains flooded ground in range, a tile every 5 days).

### State (state.js; old saves get the decks generated from their seed on load)
```js
state.map                     // the MAIN deck, unchanged (so every version 1-3 path keeps working)
state.decks = { upper: { t, r, ch, sv }, lower: { t, r, ch, sv } }   // same 256 × 160 size and indexing
chambers[i].deck              // 'upper' | 'lower'; absent = 'main'. Ids stay unique across decks.
buildings[i].deck             // 'upper' | 'lower'; absent = 'main'
```
* `mapOf(state, deck)` → the deck's `{ w, h, t, r, ch, sv }` (main = state.map).
* Saving stores the two extra decks' arrays like the main one.

### Map generation (`js/colony/decks.js`, new; pure, deterministic from the seed and the main map)
`generateDecks(seed, main, mainChambers, startId)` → `{ upper, lower, chambers, shafts }`:
* Both decks cover Eden's footprint only (the main map's hull box); everything outside is OUTSIDE;
  the hull ring is HULL. Each deck has 16–22 chambers separated by bulkheads with gates (the same
  grammar as the main deck, chambers named for their deck: "Skyward Gallery", "Lantern Ring",
  "Old Cistern", "Pump Hall", "Ossuary"…), every chamber `sealed` at the start.
* **Upper**: galleries and habitat rings on deck plating, sky-garden soil (plain / fertile), rows of
  GLASS sky panels over the main deck's fields, a few breaches in the panels and the hull.
* **Lower**: CONDUIT halls, ROCK, RUBBLE, flooded tunnels (MARSH), CATACOMB passages (not buildable
  yet), breaches as cracked bulkheads.
* **6–8 lift shafts**: 2 × 2 SHAFT sites at the same (x, y) on all three decks (also stamped into the
  main deck's map), spread across Eden; one shaft lies in the main deck's landing chamber, so the
  first Lift can be built at home.
* Every upper and lower chamber is reachable from some shaft through gates on its own deck.

### Rules
* Placement and every tile function take an optional deck: `canBuild(state, key, x, y, deck = 'main')`,
  `build(state, key, x, y, deck)`, `tileInfo(state, x, y, deck)`, `coverage(state, kind, deck)`,
  `planRoad / buildRoad(..., deck)`, `findSpot(state, key, { deck, ... })`. A building's `decks` must
  include the deck. Space and the hull's outside exist only on the main deck.
* **Lifts**: a finished Lift on a shaft (any deck, inside an open chamber) makes the chambers that the
  shaft passes through on the other decks **surveyable** (in addition to the usual "next to an open
  chamber on the same deck"). Roads may run onto a finished Lift's tiles, and people and rovers use it.
* Chambers work as before on each deck (survey → seal breaches → pressurise → open); open upper and
  lower chambers need air like any other. Coverage (parks, services) stays on its own deck.
* Pump Station: every 5 days turns one MARSH tile in its radius into DECK (lower) or PLAIN (main).

### Simulation: buildings work the same on every deck (staff, power, makes, uses are colony-wide).

### Goals (the lead): after the version 3 goals: repair a Lift, open an upper chamber, open a lower chamber.

### View
* `view.setDeck('upper' | 'main' | 'lower')` and `view.deck` (default 'main'): the terrain, chambers,
  buildings, movers and overlays of that deck. The deck above is not drawn; the deck below is not
  drawn either, except that on the **upper** deck the GLASS panels show the main deck's fields dimly
  beneath (a texture or a dark-green tint is enough). On the upper and lower decks space, Earth and
  the starfield stay as the backdrop but OUTSIDE tiles are not drawn.
* A smooth camera move (rise or sink) when the deck changes; the deck name shown briefly.
* Picking returns tiles of the current deck; ghosts and overlays use it. The minimap shows the
  current deck and marks the shafts (gold squares) and the lifts that work.
* Kits for the six buildings (the Lift a frame tower with a cage), and the SHAFT tiles as a dark pit
  with a gold rim.
* The navigation pad gains deck buttons (▲ ▼) and keys PageUp / PageDown move between decks (tilt
  moves to Alt + scroll and the pad's tilt buttons only).

### Interface
* A deck switcher (three buttons: Upper / Main / Lower, with each deck's open / total chambers) near
  the overlay bar; the current deck in the top bar; the build menu greys buildings that cannot stand
  on the current deck ("Upper deck only"); the inspector shows the deck; Show me switches decks when
  the target is on another; How to play: a "Decks and lifts" section.

---

## Stage 2 build contract: the secrets

### Data (written): `js/colony/data/secrets.js`
`LOGS` (20 story logs; five carry `key` 1–5, the final vault's code), `VAULTS` (7, with `requires` and
`reward`; the two prototypes are the original game's never-fielded MSNP-II (type 46) and MSFB-5 (type 48)),
`SURVIVORS` (5 groups; two bring unique commanders `SURVIVOR_COMMANDERS`: Warden Ilse Marrow and Tobias
Venn), `DANGERS` (drones, toxic, radiation, flooded, reactor).

### Placement (`js/colony/secrets.js`, new; pure, deterministic from the seed)
`placeSecrets(state)` puts every log, vault and survivor group into a chamber (their preferred deck; most on
the lower deck), and dangers into chambers: drones in 3–4 lower chambers (guarding the prototype hangars
and the final vault), radiation around the old core (the lower chamber of kind `core`), the reactor in that
core chamber, toxic air in 2–3 others, flooding wherever a chamber has many MARSH tiles. Never in the
landing chamber; at most one danger per chamber; vaults behind dangers per their `requires`. Each site has a
tile (a free floor tile of its chamber). Old saves get secrets on load.

```js
state.secrets = {
  sites: [{ id, kind: 'log' | 'vault' | 'survivors', ref, chamber, x, y, deck, found: false, done: false }],
  dangers: [{ chamber, kind, strength?, work: 0, deadline?: day, done: false }],
  read: [logIds], journal: [{ day, kind, ref }], finalOpened: false,
}
```

### Rules and sim
* A chamber's sites and danger are **found** when it is surveyed (pending event kind `discovery`, speaker
  `ruess` or `sato`, listing what was found; logs found are readable at once in the journal).
* **A danger blocks pressurising** its chamber until `done` (except the reactor): `clearDanger(state,
  chamberId)` → for drones, an auto-resolved fight using the guardians (crewed, at home, like a raid:
  win chance shown by `dangerPreview(state, chamberId)`; losses possible; on a win, salvage); for toxic and
  radiation, pays the cost and starts crew work (days; a Shield Pylon on that deck halves radiation work);
  flooded clears itself when the chamber has no MARSH left (Pump Stations). The reactor: when found,
  `deadline = day + 60`; `clearDanger` pays and starts crew work; if the deadline passes undone, 1–4
  buildings on its deck are damaged and two sealed-off-but-not-open chambers there go back to sealed (event).
* **Vaults**: `openVault(state, siteId)` when the site's chamber is open and `requires` are met (`key`: that
  log read; `drained`, `cleared`, `power: n` spare power, `code`: all five key logs read). Rewards: goods,
  research points, a tech finished, a machine added to the guardians (the prototypes), poor soil made
  fertile in its chamber, and for the final vault `secrets.finalOpened = true` (pending event kind
  `finalvault`: the revelation, with the registry: Ruess, Sato and Marrow speak).
* **Survivors** join when their chamber is opened (and `requires` met): pop added, the commander (if any)
  joins the commanders (beyond the cap: they wait at Officers' Quarters / count as one extra each).
* `secretStatus(state)` → `{ logs: { read, total }, vaults: { opened, total }, survivors: { joined, total },
  dangers: [...], keys: n, finalOpened }` for the journal.
* Goals (the lead): read five logs; clear a danger; open a vault; open the final vault (optional story goal).

### View
Site markers on found sites (a log terminal glowing cyan, a vault door, a survivors' lantern), drones as
small red-eyed sentries patrolling their chamber until cleared, toxic chambers with a green haze, radiation
with a faint violet shimmer and flickering lights, the reactor chamber with a pulsing red core, flooded
tiles already render as marsh. A brief skirmish when drones are cleared (reuse the raid effects).

### Interface
A **Discoveries** journal (button and key J): logs in story order (unread ones locked as "not found yet"),
the five code fragments as a row of slots, vaults with their requirements and Open buttons, survivors,
dangers with Clear buttons and previews; the inspector shows a chamber's sites and danger; event windows
for `discovery`, `finalvault` (a large, special window: the revelation text and Marrow reading the
registry), drone fights and the reactor's deadline; the top bar shows a reactor countdown while one is
pending. How to play: "Secrets of Eden".

---

## Stage 3 build contract: expeditions (lean)

One agent, game side and interface; unit tests plus one browser check (owner: be efficient).

* **Sectors** (`js/colony/expeditions.js`, pure, deterministic from the seed): about 20 sectors in three
  rings around Eden (distance 1–3), each `{ id, name, ring, angle, site, known, visited, cleared }`.
  Sites: `belt` (ore, ice), `derelict` (salvage: parts, credits, sometimes a machine), `babylon` (the
  Babylon wreck: deep salvage and a story log), `bunker` (a Galt bunker: survivors and a Galt blueprint,
  i.e. research points or a tech), `den` (a pirate den: a fight; cleared → heat −20 and fewer raids),
  `outpost` (Union or Galt traders: a wanderer joins the Lodge's list, trade goods), `listening`
  (the Directorate listening post: story and a large research reward), `comet` (water and ice),
  `relief` (an Earth relief station: needed for stage 4's relief convoys). Ring 1 known at the start.
* **An expedition**: `launchExpedition(state, sectorId, guardianIds, commanderKey?)` — up to 6 crewed,
  undamaged guardians at home (they don't defend Eden while away; the raid code must skip them),
  optionally led by a commander. Travel days = 4 × ring each way. On arrival one event per site,
  auto-resolved: fights use guardian power (the version 3 formula) against the site's strength (dens,
  derelict drones, the listening post's guard); hazards (debris, radiation) cost HP unless the
  commander's wits beat a threshold. Results come home with the squadron: goods, parts, credits,
  research, machines (one each from a derelict, the Babylon wreck), survivors (as pop), a wanderer,
  new sectors made known (the next ring's neighbours), a log (`babylon` adds a short story entry to the
  journal as kind `expedition`). `expeditionPreview(state, sectorId, guardianIds)` gives the win chance,
  days and expected loot. `recallExpedition(state, id)` turns it around.
* **State**: `state.expeditions = { sectors: [...], away: [{ id, sector, guardians, commander, leave, arrive, back, report }], log: [] }`; old saves get it on load.
* **Interface**: a **Star chart** panel (top-bar button, key X): a 2-D drawing of the rings around Eden
  with the sectors as icons by site type (unknown ones as "?"), Earth below; click a sector for its
  card (what's known, distance, preview) and a squadron picker (guardians with power and HP, a
  commander), Launch; squadrons in flight drawn on the chart with days left; reports as event windows.
  How to play: an "Expeditions" section. Goals (the lead): scout a sector; clear a pirate den.
