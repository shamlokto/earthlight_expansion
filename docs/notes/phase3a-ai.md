# Phase 3a: original AI (2026-10-23)

Files (mine): js/game/ai.js (rewritten), README "The original AI" section, FORMATS
"Computer opponent" section. No edits to rules.js. Nothing committed.

Interface unchanged: `aiTurn(battle)` generator. New event kind `{ kind: 'transform', u }`
(both pages just redraw on non-attack events). New per-unit fields, saved with the units:
`aiScripted`, `aiScript` (ROM address of the next order), `aiSeq`, `aiBoarded` (turn).
Uses `inLane` from events.js (map 19 lanes) and `u.burner` (afterburner).

For the other sessions:
- `$02:E631[map]` (Galt key-unit class per map; class -> types at `$02:E52D`) matches every
  mission's objective: very likely the ROM's own victory table (FORMATS "Not yet decoded"
  still lists it as missing). `$02:E64F[map]` is the same for the Union side.
- README "Milestone 6" still says "Not yet: the original AI (the stand-in AI can stall on
  large maps)"; that line is in the campaign section, so I left it.
- rules.js flood: in `$01:B606` an `FF` move cost is charged as the unit's full movement
  (enterable only with full points, i.e. as the first step); the remake treats it as "uses
  what is left". Not changed (rules are not mine).

Testing: AI vs AI on all 30 maps through the browser pane (javascript_tool, scenario +
Battle + aiTurn): no errors; worst turn 129 ms (map 24), map 29 about 20 ms per turn.
- 2026-10-23 follow-up: Abaddon slot 3 now uses events.js blast() (yields {kind:'blast', ...}); afterburner Athena keeps HU form ($01:880D skips the re-form).
