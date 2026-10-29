# Galt remnant: new campaign (story bible)

Approved by the owner on 2026-10-24. All game mechanics stay exactly as they are; only story,
maps, unit placement and art are new. The previous 10 missions stay playable as the
**Classic campaign** (missions/index.json); the new one lives in `missions/remnant/`.

## Cast
- **The General** (the player): led the Union to victory over Galt; now a loyalist commander.
  The general's unit rules are unchanged (evasion ×2, power ×2, level 9, game over if lost).
- **Captain Mira Sato**: carrier commander, the General's second; later flies the Selene Kai.
  Calm, dry humour, speaks in briefings.
- **Lt. Dov Arkin**: Athena ace, hothead, loyal. Story only: he can die at the choice point in
  the story text (no extra game rule).
- **Prof. Hal Ruess**: engineer; runs the Crabs, the Dragon/Hydra batteries and captured docks.
- **Marshal Oren Kessrin**: Director of the Union Security Directorate; stages the coup at
  the victory parade; mastermind. Flagship in the finale: the **Leviathan** (new unit).
- **Commander Lysa Vane**: Kessrin's ace in a Directorate Talos (a high-level Talos placed as
  a named boss unit); recurring, taunts in briefings, killed in mission 9.
- **Queen Moraine of the Ashfall Cartel**: pirates selling to both sides; scrapyards and
  stolen carriers; ally or enemy depending on the choice.

Speakers in briefings are shown with portraits (incoming-transmission panel for enemies,
a comms panel for allies).

## Structure: 12 missions, one choice
Act I, The Coup
1. **Night of Knives** — Kessrin seizes Olympos during the victory parade; break out with the
   crews that follow you. Objective: escape (east edge). Small, tense, pursuit.
2. **Salvage Rights** — cartel scrapyard; capture its grey docks for repairs while Moraine's
   raiders and a Directorate patrol close in. Objective: annihilate; docks give units.
3. **The Shepherd** — escort Ruess's Crab convoy (Crabs carrying Dragons/Hydras) through an
   asteroid belt; Vane's hunters chase the Crabs (`chase: 'carriers'`-style). Objective: escape
   with N units.
4. **Iron Garden** — set Dragons and Hydras on bedrock to hold a mining moon against Union waves.
   Objective: destroyType with edge (stop the marked units reaching your edge).
Act II, The Fork
5. **Vane's Gambit** — Vane ambushes you in a magnetic field. Objective: destroyType (her Talos).
6. **Choice before mission 6** (intermission decision, remembered as `choice: 'deal'|'refuse'`):
   - **6a Moraine's Price** (deal): fight beside cartel units against a Directorate depot;
     objective command. Cartel carriers join afterwards.
   - **6b The Ashfall Raid** (refuse): hit the cartel fleet; objective carriers (sink them).
     Story: Arkin falls in the raid (story text only).
7. **7a Babylon Run** (deal): assault the Babylon wreck with cartel carriers at your side.
   **7b Burning Yards** (refuse): cartel and Union both against you; take the yards (fortress).
Act III, Earth Orbit
8. **The Gate** — break the Directorate fortress line. Objective: fortress.
9. **Vane's Last Stand** — boss duel in the comet field; her flagship escort arrives turn 6.
   Objective: destroyType (Vane's Talos).
10. **Atmosphere** — edge of Earth orbit; beams can't reach units in the atmosphere.
    Objective: carriers.
11. **Olympos Again** — retake the base where it began. Objective: command.
12. **Kessrin** — finale; sink the Leviathan. Objective: flagship. Two epilogues by `choice`.

The Abaddon's Quantum Decimator (the ROM's "nuke") is a story weapon: Kessrin uses Abaddons to
blast paths (missions 8, 11); the remnant captures one late (an Abaddon joiner in mission 10).

## New units (owner approved)
- **Leviathan** (type 59): Kessrin's flagship, battleship, new original art, stronger specs
  than the Nodens (HP 40 class). Union only.
- **Directorate Talos** (type 60): Vane's machine and Kessrin's guard; new original art, an
  elite Talos. Union only.
Until they land, mission specs use stand-ins: Nodens (32) for the Leviathan and Talos (2) for
the Directorate Talos, each marked `// standin: 59` / `// standin: 60` for a later swap.

## Data formats shared by the subagents
- Campaign index `missions/remnant/index.json`:
  `{ "campaign": "remnant", "title": "Galt remnant", "start": [...], "allFrom": n, "missions": [entry...] }`
  where an entry is `{ "no", "title", "file", "unlocks", "hint" }`, optionally
  `"choice": { "prompt", "options": [{ "id", "label", "text" }] }` (asked at the intermission
  before this mission; stored as `state.choice`) and `"when": { "choice": "deal" }` (entry used only for
  that choice; entries with the same `no` are alternatives). A choice may also carry `title` and
  `speakers` (portraits shown on the decision panel).
- Mission JSON additions: `comms: [{ "speaker": "sato|arkin|ruess|kessrin|vane|moraine", "text" }]`
  (briefing dialogue, shown with portraits; `transmission` stays for compatibility),
  `endings: { "deal": "...", "refuse": "..." }` on the finale (falls back to `ending`).
- Speaker portraits: `js/expansion/portraits.js` exports `portrait(speaker)` (SVG strings, same
  style as villain.js) and `SPEAKERS[speaker] = { name, rank, side }`.

## Where it is implemented
- `js/expansion/campaign.js`: `CAMPAIGNS` (remnant / classic: index URL, save key, mid-battle
  slot; Classic keeps the old keys, so earlier saves are the Classic campaign), `use()`,
  `missionList()` (alternatives by `when`), `pendingChoice()`.
- `expansion.html` / `js/expansion/intermission.js`: campaign select (`?select=1`), `?c=<id>`,
  the decision panel, comms in the hero briefing. `game.html?...&campaign=1&c=<id>`.
- `js/expansion/briefing.js` `commsHtml` and `js/expansion/portraits.js` (`portrait`, `SPEAKERS`).
- `tools/build-missions.mjs --dir remnant` builds `tools/missions/remnant/*.mjs` into
  `missions/remnant/`, passing `comms` and `endings` through.

## The hidden battle: Nineveh (owner, 2026-10-29)
A secret Chapter 13 after the finale, opened only if the Leviathan is sunk by turn 24 (the result
screen says so; otherwise it hints at "an old Galt beacon still calling").
- **Story**: Asgard's yards laid down two hulls eleven years ago. One became Babylon; the other was
  never finished, never named in any Union record and never found. She is the **Nineveh**, hidden in
  Earth's shadow. **Ahriman**, the Galt leader whose fate the original game never shows, survived;
  while the remnant fought Kessrin he salvaged the main cannon Babylon never fired and fitted it to
  her sister. Everything Galt still has is drawn up in front of her.
- **Cast**: Ahriman speaks (new portrait: white hair and beard, a green cybernetic eye, the Galt coat
  in black, green and gold); Ruess, Sato and Moraine answer.
- **Battle**: the remnant brings up to forty machines (every machine buildable, 1200 supply, up to
  40 builds at that intermission). Three towers on the Nineveh's hull feed her cannon, which fires
  down three lanes at every phase change; a gravity veil, minefields, a battery fort and a carrier
  anchorage guard her; about 150 Galt machines in all, in four waves. A loyal Union fleet joins on
  turn 8, and on turn 12 Moraine's cartel (deal) or the Olympos guard (refuse).
- **Ending**: the Nineveh breaks along the seams the Asgard welders left; Ahriman never begs; the
  fleets drift and nobody fires; someone reads out the names of ships. "The war is over. This time,
  all of it."
- Details: docs/notes/hidden-boss.md.
