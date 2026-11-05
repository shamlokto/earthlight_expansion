# Earthlight Space Colony Rebuild — version 5: raiders with bases, battles you command

These are the owner's words (2026-11-05):
- "the player [should] be able to toggle raiders on and off in the settings";
- "the top status bar becomes crowded";
- "the raiders have a base too, which can be destroyed to reduce raid chance … they still keep coming despite all enemy bases being gone, which doesn't make sense";
- "when the population is below 500, nobody cares about Eden";
- "the raid will start coming gradually";
- "toggle auto-fighting or fight using a turn-based Earthlight-style map";
- "raiders start running in manual fight when the player's strength (unit number) is double the raiders";
- "if the player is able to kill them all (or most of them), they will take longer to rebuild … their bases are limited in resources";
- "Other enemies will get Eden's attention when the number of colonists increases, or through exploration of their bases".

## 1. Raider bases (rules.js, owned by the lead)

Every raid comes from a **base**. The bases are star-chart sectors:

| Base | Sector | Faction | Raid tier | Notices Eden at | Fleet max | Regrows |
|---|---|---|---|---|---|---|
| Scavenger den | the ring-1 den | scavengers | scavengers | 500 colonists | 5 | 1 machine / 8 days |
| Cartel den | the ring-2 den | cartel | pirates | 800 | 9 | 1 / 7 days |
| Deserter den | the ring-3 den | union or galt | warbands | 1,200 | 14 | 1 / 6 days |
| Directorate remnant | the listening post | remnant | remnant | 1,800 | 18 | 1 / 6 days |

- **Below 500 colonists there are no raids at all.** That holds on every difficulty, and even if a base has already noticed Eden.
- **A base notices Eden** (`aware`) in either of two ways:
  - Eden reaches the base's population threshold.
  - A squadron visits the base, whether it wins or loses.
- **Base state**: `state.raid.bases = [{ id, sector, faction, tier, fleet, max, regen, aware, destroyed, last }]`.
- **When a raid can come.**
  - A raid can only come from a base that is aware, not destroyed, and has at least 60% of its fleet ready.
  - The next raid also waits for the raid clock: `raidInterval` (heat still shortens it).
  - A base that has just noticed Eden waits 20–30 days before its first raid.
  - When several bases are ready, the one with the fullest fleet comes. Only one raid is ever coming at a time.
- **Fleets regrow by themselves.** A raid sends 50–80% of the base's fleet. Raiders killed are taken off the base's fleet; survivors go home.
  - **Killing most of them** means the base takes longer to be ready again ("limited resources").
- **Clearing a den** (a won expedition) destroys its base. Clearing the listening post does the same for the remnant's base.
  - A base's expedition strength scales with its fleet: × (0.4 + 0.6 × fleet / max).
- **No base left** (all destroyed, or none aware yet): no raids. A raid already on its way still arrives.
- **Raiders off** (`state.options.raids === false`, in Settings): no raid warnings and no raids. Bases keep regrowing, so turning raiders back on is honest. Sentries inside Eden are not raiders and are unaffected.
- **Auto fights** keep the win chance formula.
  - On a win, a share of the raiders is killed: n × (0.5 + 0.4 × winChance), rounded, at least 1.
  - On a loss, n × 0.15 × winChance (rounded) are killed.
  - Paying tribute kills none.
- **Goal change**: the guided goal "Weather the first raid" becomes "A guard for Eden": two crewed guardians at home. Its text says the raiders will notice Eden at 500 colonists.

## 2. Battles you command (owned by the battle agent)

A raid at the gates offers three answers:
- **Fight** (auto-resolved, as now);
- **Command the battle** (the hex map);
- **Pay tribute**.

"Command the battle" needs the Earth Light pack (`js/expansion/pack.js`, built from the player's own ROM). Without the pack, the button is disabled and its tooltip says why.

**What the agent writes:**
- `js/colony/battle.js` (pure where it can be):
  - `raidMission(state, raid)` builds an expansion mission JSON (missions/README format, js/expansion/mission.js).
    - **Map**: a space map per attack direction (`raid.from`: north, east, west, earth), either taken from the existing expansion maps or made for the colony under `missions/colony/`.
    - **The player's side** (army 0): the crewed guardians at home (`homeCrew`), each with its `type` and `level`, its HP scaled from `g.hp / maxHp(state, g)`, and `rosterId = g.id`. A guardian the General commands carries the general (the expansion's ×2 rules).
    - **The raiders** (army 1): `raid.units`, each with its `type` and `level`.
  - `commandBattle(state)` stores the mission in localStorage (`el-colony-raid`), marks `state.raid.coming.battle = true`, saves the colony and opens `game.html?colony=1`.
- **The battle page** (`js/gameapp.js`, `js/expansion/battle.js`): in colony mode the mission comes from localStorage.
  - **Flee rule**: when the player's living units are at least twice the raiders' living units, the raiders break off and flee. They leave the map, and the battle ends as a win with `fled: true`.
  - **Retreat** (or the general's unit lost) is a defeat.
  - **When the battle ends**, the page writes `el-colony-raid-result` and returns to `colony.html`:
    ```
    { day, won, fled, turns,
      killed: [indices into raid.units destroyed],
      guardians: [{ id, hp: fraction 0..1, lost }] }
    ```
- **`main.js`**: on load, if a result is waiting and `state.raid.coming?.battle`, it calls `R.resolveRaidBattle(state, result)` (written by the lead), clears the key, saves, and shows the after-the-raid report.
- **The raid event window** (`ui.js`, the raid body) gets the "Command the battle" button. The sim's "unanswered raid is fought" step skips a raid with `battle: true`; the lead does that in sim.js.

**`resolveRaidBattle(state, result)`** (rules.js, the lead) applies the battle's outcome:
- each guardian's HP; lost guardians are removed and their commanders injured, as in `fight`;
- the kills are taken off the base's fleet;
- a win pays salvage for the kills;
- a loss means stores stolen and buildings knocked out, as in `fight`;
- the same raid report and bookkeeping as `answerRaid`.

## 3. The top bar (the lead)

The 11 readouts are too many for a laptop width. They are regrouped as follows:
- **Always shown**: day and speed; colonists and happiness; credits; parts; power.
- **Life**: food, water and air, with a warning colour when one is running out.
- **"More"** (a panel): ore, alloy, helium, tax, research and heat.

## As built (2026-11-05)

**Raids** (`rules.js` BASE_RAIDS, BASES, ensureBases, basesDay, readyBase, noticeEden, setRaids, resolveRaidBattle; `sim.js` guardTick):
- Raids follow §1.
- Expeditions:
  - A lost visit to a base gets it to notice Eden.
  - A won visit destroys the base.
  - A base's strength scales with its fleet.
- The Raids tab lists the four bases, with their fleets and the population at which each notices Eden.
- Settings has a "Raiders" switch. Turning raiders off while a band is only sighted sends it home.

**Battles you command** (`js/colony/battle.js`, the colony mode of `js/expansion/battle.js` and `js/gameapp.js`, `tests/colony-battle.mjs`):
- Each raid gets a 2×2-screen map generated for its direction, with Eden's dock in the middle and railway hexes for the railgun guardians.
- **Flee rule**: raiders flee once Eden's living units are at least twice theirs, but never before their first full turn (turn 2).
- Retreat, the turn limit (20), losing every unit or losing the General's machine is a defeat.
- The result is applied by `resolveRaidBattle` when the colony page loads.
- Untested in a browser without a ROM: the battle itself.

**Top bar**: colonists, happiness, credits, parts and power; a life-support block (food, water, air); then a More pop-out with ore, alloy, helium-3, research, heat and the tax. More shows a red dot when something inside it is falling.

**Music** (owner: "the laternfall music suits better"):
- Lanternfall's own soundtrack is copied into `js/colony/lanternfall/` and is now the default. It needs no ROM.
  - Colony: the realm's seasons and the waltz, rotating every 4 minutes.
  - Raids: the defenders' theme.
  - Stings: the victory fanfare and the raid won/lost stings.
- Earth Light's music stays as a choice in Settings.

**The day** is 2.5 s at ×1 (it was 1 s).
