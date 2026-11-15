# Earthlight Space Colony Rebuild — version 12: The Reckoning

The owner's design (2026-11-15), with the clarification that **nothing starts until the General decides
to broadcast the truth**:

- once the Ninefold vault is open, Ruess offers to broadcast the truth: the player chooses when;
- the broadcast names everyone behind Protocol Ash (Major Hesk and his circle) and orders their arrest;
- they are rich: they gather a fleet in secret, buy back part of the General's old (sold) fleet and bribe the traders;
  over the next 100 days clues arrive and the player prepares;
- day 100 after the broadcast: **the Siege of Eden**, a hand-designed battle played on the map (no auto-resolve, no tribute);
- won: the hiding place is revealed; lost: heavy damage, and they come again after a recovery period;
- **the counterattack**: Hesk's asteroid stronghold, up to 40 of Eden's machines against 100+ in waves, Hesk's capital ship last;
- winning it: the ending **Justice for Eden** (victory style, the registry read aloud, remembered in the save, blocks nothing).

## 1. The arc (`js/colony/reckoning.js`, pure; `sim.js` calls `reckoningDay` each day)

`state.reckoning = { stage, offered, broadcast, siegeDay, clues, fighting, sieges, strikes, nextStrike, justice, lastRemind }`

| Stage | When | What happens |
|---|---|---|
| `locked` | the Ninefold vault is shut | nothing |
| `ready` | `secrets.finalOpened` | Ruess offers the broadcast **once** (event: *Broadcast now* / *Not yet*). Afterwards it stays on offer in **Defence › Raids** (a "The Reckoning" card with *Broadcast the truth*). Nothing else happens, however long the player waits. |
| `gathering` | the broadcast, day B | the four are named, arrest ordered (Galt +15, Union +5, happiness +8 for a while). 8 clues (below). Siege on B + 100. |
| `siege` | day B + 100 | the *Siege of Eden* event (Sato): **Command the siege** (the hex map) or *Not yet: hold the gates*. Until it is fought, a blockade holds every Market price at ≥ ×1.2, with a reminder every 7 days. No auto-resolve, no tribute. |
| `regroup` | a lost siege | stores carried off (30–45% of food, parts, alloy, credits), 4–7 buildings knocked out for 10–20 days (the dock for certain if it was taken), happiness −15 for a while. A warning 10 days before the next siege, 60 days later. |
| `strike` | a won siege | the hiding place (event, Sato): **Strike the stronghold** is available (Defence › Raids, and on the event). A failed strike can be tried again 30 days later. |
| `done` | the Verdict sunk | **Justice for Eden** |

Salvage for a won battle: 40 credits and 4 parts per enemy machine destroyed. Guardians come back as from a raid: HP kept, levels +1 (+2 led by a fit commander), lost ones removed (their commander injured 20–40 days).

### The broadcast's names (`CONSPIRATORS`)
- **Major Aurel Hesk** — Directorate, commanding Site Ninefold: invoked Protocol Ash.
- **Commodore Anselm Varr** — Union fleet: flew the evacuation and logged it as a Galt attack (flies a Tiamat in both battles).
- **Deputy Director Corva Quill** — Directorate finance: paid for the rig, then for the silence.
- **Captain Renn Osk** — Ninefold security: sealed the lift locks on day 211 (flies a Nodens).

### The clues (days after the broadcast)

| Day | Who | Clue | Effect |
|---|---|---|---|
| 9 | Ruess | *Silence on the wire*: none of the four found; accounts emptied | — |
| 21 | Sato | *Traders gone missing* | prices ≥ ×1.12 |
| 34 | Sato | *A warning from the Union*: Directorate transponders towards the far belt | Union +4 |
| 46 | General | *One of ours, for sale*: a trader caught selling an Athena Kai in Eden's old colours | choice: **seize** (an Athena Kai, level 5, joins; Cartel −8) or **let him go** (Cartel +3) |
| 58 | Ruess | *Prices climbing*: alloy, helium and parts bought up by the shipload | prices ≥ ×1.12 |
| 70 | Sato | *The Galt remember*: the scapegoats warn Eden | Galt +4 |
| 82 | Marrow (Ruess if she does not serve) | *Hesk's voice*: "I will come and collect it." | — |
| 92 | Sato | *The dens go quiet*: everyone else has got out of the way | — |

## 2. The battles (hand-made maps, filled in at launch)

The maps are written by `tools/colony-reckoning-maps.mjs` (region paints and hand-placed units) into
`missions/colony/siege.json` and `missions/colony/stronghold.json` (mission JSON, `js/expansion/mission.js`).
At launch `js/colony/battle.js` `siegeMission` / `strongholdMission` add Eden's side, `commandReckoning(state, which, save)`
stores the mission in the raid's localStorage slot and opens `game.html?colony=1`; the result comes back through
`main.js` to `R.resolveReckoningBattle` (the result carries `battle: 'siege' | 'stronghold'`, so the handoff knows which).

**Eden's side** (`reckoningCrew`): the crewed guardians at home, at most **40**, the General's machine first (on the
map's `generalAt` hex), then the strongest (price × (1 + level/5)). Ships only on hexes ships may stand on (`home`
entries `[x, y, ships]`); rail guns on the railway. The siege adds **a hull gun per working Battery Emplacement**
(Dragon or Hydra by its mode, level 4, on the lift shafts and the hull's gun points; 12 mounts, shared with rail-gun
guardians). The stronghold takes no rail guns (no railway at the staging area).

**Engine rules added** (`js/expansion/battle.js`): objective `{ kind: 'hold', turns }` (win when turn `turns` is over);
`awaitArrivals` (wiping out what is on the map wins nothing while enemy waves are still to come); `noFlee` (no
breaking off: Hesk's people never run; Eden's Retreat is still physical and a loss); named machines (`name` on units
and arrivals, shown in the unit panel); Eden's own machines are marked at the start (`u.eden`), so a guardian lost
inside a captured dock counts as lost. `colonyResult` adds `{ battle, reason, enemies, enemiesDestroyed, cortexLost,
dockLost, gunsLost, flagshipSunk }`; hull guns are not guardians.

### 2a. The Siege of Eden (4 × 3 screens, 59 × 30 playable)

Eden hangs above Earth: the atmosphere band (rows 25–30) carries Earth's terrain id, an unenterable edge (as on
the raid maps). The station: a hull of Babylon-hull terrain (craft and mecha walk on it, ships cannot), the
**dock** open to the north (deck: ships may enter), the **main deck** with the **Command Centre**, bulkheads (walls)
either side with one door each at row 16, the **upper deck** (west, the Lantern Ring) and **lower deck** (east, the
gardens), two **lift shafts** (turret railway: anyone passes, rail guns stand), six gun points on the hull's top, and
the **east breach** of day 211 (bedrock and debris).

Objective: **hold to the end of turn 15** (the Command Centre stands, the General lives), or destroy every wave.
Lost if the Command Centre (a CT-TYX6 "Cortex" on Eden's side) falls, the General's machine falls, Eden is wiped
out, or Eden retreats off the map.

Legend: `H` hull, `D` deck, `R` lift shaft (railway), `W` wall, `B` bedrock, `M` meteoroids, `A` asteroid,
`P` plasma, `G` gravity flux, `~` the atmosphere, `C` Command Centre, `K` Eden's dock, `g` gun mounts,
`o` Eden's first 40 start hexes (the General at 30,14), `e` Hesk's fleet at turn 1, `3` `5` `7` `X` the waves
of turns 3, 5, 7 and 10.

```
 1 .....X..........7...7...7....7....7...7....7.........X.....
 2 .........e...........e.......e.......e.......e...X.........
 3 X....X.......e...........e..PPP..e...............e.X......X
 4 ..........AAA....e.e...e....PPP....e...e.e....AAA..........
 5 ..........AAA.............e..e..e.............AAA..........
 6 3..X.......A...e...........................e...A.....X..X..
 7 ......................................................M....
 8 ..3.........................ooo......................MMM...
 9 .........HHgHHgHHgHHHHgHDDoDoooDDDDHgHHHHgHHgHHgHH...MMM...
10 .3.......HHHHHHHHHHHHHRHDDoooKoooDDHRHHHHHHHHHHHHH......5..
11 .........HHHHHHHHHHHHHgHDDoooooooDDHgHHHHHHHHHHHHH.........
12 ..3.M....HHHDDDDDDDDDHRHDDoooooooDDHRHDDDDDDDDDHHH........5
13 ...MMM...HHHDDDDDDDDDHRWDDoooooooDDWRHDDDDDDDDDHHH.........
14 .3.MMM...HHHDDDDDDDDDHRWDDDoooooDDDWRHDDDDDDDDDHH........5.
15 .........HHHDDDDDDDDDHRWDDDDDoDDDDDWRHDDDDDDDDDHH.....PPP..
16 3........HHHDDDDDDDDDHRHDDDDDCDDDDDHRHDDDDDDDDDHH.....PPP.5
17 .........HHHDDDDDDDDDHRWDDDDDDDDDDDWRHDDDDDDBM.BM......P...
18 .3.......HHHHHHHHHHHHHRWDDDDDDDDDDDWRHHHHHHHM.BM.........5.
19 .........HHHHHHHHHHHHHRWDDDDDDDDDDDWRHHHHHHH.BM............
20 .3.......HHHHHHHHHHHHHgHHHHHHHHHHHHHgHHHHHHHBM.B.........5.
21 ......G..HHHHHHHHHHHHHRHHHHHHHHHHHHHRHHHHHHHM.BM...........
22 3.3..GGG.................................................5.
23 .X...GGG................................................5X.
24 .........................................................X5
25 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
26 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
27 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
28 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
29 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
30 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

| Wave | Turn | From | Machines (full) | Always (`core`) |
|---|---|---|---|---|
| start | 1 | the north | 22: Tiamat *Commodore Varr*, Directorate Talos ×2, Hannibal, Lobsters, Cranes, Asura-II, Athena Kai, Mars Kai ×2, Brontes ×2, Corvus, Hastur (+2), Cerberus, Fenrir, Talos ×2 | 6 |
| west | 3 | along the west hull | 12: Selene (+2), Phoibos ×2, Cyclops Kai ×2, Horus ×2, Gulon, Medusa ×2 | 3 |
| east | 5 | through the breach | 9: Directorate Medusa ×3, Titan Kai ×2, Lobster Kai ×2, Palmyra, Fenrir Kai | 3 |
| old | 7 | the north | 7, **the General's old machines**: Azoras *the General's old flagship*, Selene Kai *Sato's old command*, Athena Kai *Arkin's old wing* ×2, Pallas *ex-Eden* ×2, Asura-II Kai | 3 |
| last | 10 | NW, NE, and under the hull from the east | 15: Nodens *Captain Osk*, Directorate Talos ×3, Tiamat, Regulus ×2, Crane Kai ×3, Iris (+2), Horus ×2 | 4 |

**Scaling**: against a full guard (40) Hesk brings all **65**. Each group keeps its `core` units and a share of the
rest: share = clamp((n + 4) / 44, 0.2, 1) for n guardians fielded → 31 machines at n ≤ 5, 36 at 10, 41 at 15,
45 at 20, 58 at 30, 65 at 40. Easy: every enemy two levels lower. Enemy levels 3–6.

### 2b. Hesk's Stronghold (4 × 4 screens, 59 × 40 playable: the size of the expansion's finale, Kessrin / Nineveh)

A nameless rock beyond the far belt: an asteroid fortress in the north-east (asteroid body, a wall ring, an inner
deck court), its **harbour mouth** opening south-west (ships can sail in), a **west gate** (craft, through the
meteoroid belt) and a **south gate** under the **fortress cannon** (fires straight down column 54 from row 19 at
every phase change while its tower stands, as the Nineveh's). Eight turrets on the court's mounts. Three approach
lanes from Eden's staging corner (south-west): the **meteoroid belt** in the north (craft only, slow, three narrow
gaps), **the Gullet** between two asteroid ridges (fast, mined at its head, with plasma clouds), and the open
**south lane** under the cannon.

Objective: **sink the Verdict** (Major Hesk's Leviathan, level 9) within **30 turns**. She arrives **last, on turn
15**, in the court. Before that, wiping out what is on the map wins nothing (`awaitArrivals`). Lost if the General's
machine falls, the turn limit passes, Eden is wiped out, or retreats.

Legend as above, plus `g` turrets (Dragon/Hydra), `m` mines (Pandora/Wisp), `T` the cannon's tower (Adzam),
`e` the garrison (holding until turns 6–12), `z` **the ambush** (asleep until turn 6 or until shot at),
`3` turn-3 wave behind the General, `6` turn 6 (north), `9` turn 9 (east), `c` turn 12 (behind again),
`V` the Verdict and `f` her escort (turn 15), `o` Eden's first 40 start hexes (the General at 7,35).

```
 1 ...6.......6...6...6.......6.....6.....6...AAAAAAAAAAAe....
 2 .......6.................6................AAAAAAAWAAAAA....
 3 ..........MMMMMMM.MMMMM.M...............AAAAeAWWWWWWWAAAA..
 4 .........MMMMMMMM.MMMMM.MMMMM.MMMMMMM..AAAAAWWWWWgWWWWWeAA.
 5 .........MMMMMMMM.MMMMM.MMMMM.MMMMMMMM.AAAAWWWgDDDDfgWWWAA.
 6 .........MMMMMMMM..MMMM..MMMM..MMMMMMMADDeAWWDDfDDDeDDWWAAA
 7 ...........MMMMMMM.MMMMM.MMMMM.MMMMMMMAAeADmDDDDeDVDDfWWAAA
 8 .......................M.MMMMM.MMMMM..AAAAWWDgfDDeDDDgDWWAA
 9 .....................................AAAAAAWWDeDfDDffDWWAAA
10 .6....................................AAAAAWWDDDDfDDeDWWAAA
11 ......AAA.............................AAAAAWWDDgDDDgDWWWAAA
12 ......AAA.............................AAAAAADDDDWgWWWWWAAAA
13 .c.....A...............................AAAAAeDeeWWWDWAAAAA.
14 ..............................AAAAA....AAA...eAAAWAeAAAAAA.
15 ..........................AAAAAAzAA.....AAe..DAAAAAADAAAA..
16 c.....................AAAAAzAAAAAA...........AAAAAAAmAA....
17 ................AAAAAzAAzAAAAAAA.........m..AAAAAAAADD.....
18 c...........AAAzAAzAAAAAAAAA............m.......A....T....9
19 .3......AAAAAAAAAAAAAA............M........................
20 c.......AAAAAAAAAA.................M..m..................9.
21 .........AAA..........PPz...........M......................
22 3.3...................zzP..........m.M....................9
23 ..MMM..................P......z.........AAA................
24 c.MMM........................PzP....AAzAAAA..............9.
25 3..M.........................PPzAzAAAAAAAA.................
26 ............................AAzAAAAAAAAA................9.9
27 3.......................AAAzAAAAAAAA....................M..
28 ....................AzAAzAAAAAAA.......................MMM.
29 ................AAAAAAAAAAAA...........................MMM.
30 ................AAAAAAAA.................................9.
31 ......o..........AAA.......................................
32 ....ooo.....................................GGG...........9
33 ....ooooo...................................GGG............
34 ...ooooooo...................................G............9
35 ...ooooooo..................GGG............................
36 ...ooooooo..................GGG.........................9..
37 ...ooooooo...................G......AAA....................
38 .....ooo............................AAA....................
39 .................3...................A.....................
40 ...............c...3c.3.c3.3.c..c..........................
```

| Group | Turn | Machines (cargo counted) |
|---|---|---|
| garrison | on the map | 31: 4 Dragon + 4 Hydra turrets, 6 mines, the gun tower, Tiamat *Commodore Varr*, Asura-II, Hannibal, Corvus, Directorate Talos ×4, Talos ×2, Cyclops Kai ×2, Fenrir Kai ×2, Crane Kai ×2 |
| ambush | asleep until 6 | 18 on the ridges and in the plasma: Directorate Medusa ×4, Mars Kai ×4, Cyclops ×2, Phoibos ×2, Titan Kai ×2, Athena Kai ×2, Lobster Kai ×2 |
| trap | 3 | 12, from the west and south edges behind the staging area: Selene (+2 Cranes), Lobster ×3, Crane ×2, Brontes ×2, Horus ×2 |
| north | 6 | 12, the bribed cartel: Hastur (+2), Asura-II ×2, Cerberus ×2, Gulon ×2, Palmyra, Lobster Kai ×2 |
| east | 9 | 10: Nodens *Captain Osk*, Regulus ×2, Directorate Talos ×3, Pallas *ex-Eden* ×2, Medusa ×2 |
| trap 2 | 12 | 12, behind again: Iris (+2 Horus), Mars ×3, Talos ×2, Phoibos ×2, Cyclops Kai ×2 |
| Hesk | 15 | 13: **the Verdict** (+2 Athena Kai), Azoras *the General's old flagship*, Selene Kai *Sato's old command* (+2), Asura-II Kai ×2, Fenrir Kai ×2, Athena Kai ×2 |

**108 enemy machines in all**, never more than about 60 on the map at once. Not scaled (strong and desperate);
Easy: two levels lower. Levels 5–7, the Verdict 9.

## 3. The ending: Justice for Eden

A `justice` event, shown once in the victory style (`ui.js renderJustice`): the clip `video/justice` if one is
made, else its still `scene/justice` (prompt `tools/art/colony/prompts/scene-justice.txt`, clip prompt
`video-justice.txt`; neither made yet), else the vault's still or the title art; the numbers (day, colonists,
broadcast day, sieges, strikes, enemy machines destroyed, guardians lost); **Eden's registry read aloud**; closing
lines from the General, Sato, Ruess (and Marrow if she serves). `state.reckoning.justice` keeps it in the save. It
sets nothing that other endings read: Eden Restored, Beyond Eden, the Garden and the Hope's ending are unaffected.

## 4. Interface

- Events: kind `reckoning` (the offer, the broadcast, clues, warnings, the siege, the hiding place, results) with
  the speaker's portrait and line; the siege and hiding-place events carry *Command the siege* / *Strike the
  stronghold* (disabled, with the reason, without the Earth Light pack).
- Defence › Raids: "The Reckoning" card: the broadcast button, the countdown, the battle buttons.
- How to play: a spoiler-light section "The Reckoning".
- The battle page: named machines, "Hold to the end of turn 15", "More of them are coming", own result screens
  (*Eden holds* / *Eden has fallen*, *Justice for Eden* / *The General withdraws*), *Attack* on the stronghold's briefing.

## 5. Limits found

- Engine: no per-army unit cap (Nineveh already fields 144 + 61); grids ≤ 62 × 42 (4 × 4 screens, 59 × 40 playable);
  ≤ 80 terrain pairs (these maps use 28); arrivals spawn on the turn after their `turn` field at the nearest free
  legal hex. The stronghold fits in one battle: no two stages needed.
- Base rules: a side loses with its last command centre (CT-TYX6) or fortress: used for Eden's Command Centre;
  Hesk has neither, so only the flagship ends the stronghold. `turnLimit` is a loss for the player, hence the new
  `hold` objective for the siege.
- The AI (both sides in tests) does not defend: in AI-against-AI games a strong guard holds the siege about half the
  time (the AI Eden wanders off and leaves the Command Centre open); a weak one loses. With the General kept back,
  the strike was won in some games, always by sinking the Verdict.
- Not checked in a browser (needs a ROM): the look of the maps (the graphics are the ROM's own pairs for each
  terrain, chosen from the expansion's maps; walls and hull-top rails may not join up perfectly).

## 6. Files

`js/colony/reckoning.js` (new), `js/colony/battle.js` (siegeMission, strongholdMission, commandReckoning, reckoningCrew),
`js/colony/rules.js` (re-exports, the answer hook), `js/colony/sim.js` (the day), `js/colony/main.js` (the result),
`js/colony/ui.js` (events, the Raids card, the ending, How to play), `js/colony/art.js` (scene/justice slot),
`js/expansion/battle.js`, `js/expansion/mission.js`, `js/game/rules.js` (names on arrivals), `js/gameapp.js`,
`missions/colony/*.json`, `tools/colony-reckoning-maps.mjs`, `tests/colony-reckoning.mjs`.
