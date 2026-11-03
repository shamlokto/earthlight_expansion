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
  extra epilogue if the final vault was opened. What happens after the ending (the game ends, or the
  colony continues as a sandbox) is an open question for the owner.

## 5. Build order
1. Decks: map generator for three decks, state and save, rules (deck in placement, lifts, per-deck
   chambers and air), view (deck switcher, ghosting, minimap per deck), interface, art (upper and
   lower terrain textures, new building cards).
2. Secrets: sites, the Discoveries journal, logs and the mystery text, vaults and prototype
   machines, survivors, dangers (drones, hazards, the reactor).
3. Expeditions: the sector map, squadrons, events, rewards.
4. The win: relief convoys, the victory check, the ending.
