# Phase 2: map scripts, rules, campaign (2026-10-23)

Files (mine): js/game/scripts.js (new), js/game/savegame.js (new), js/game/rules.js, js/game/ai.js,
js/gameapp.js + game.html (took over the existing campaign page), README "Milestone 6" + layout rows,
FORMATS "Levels, docks, transformation" section + "Not yet decoded" bullets. Added launch config
`earthlight-campaign` (port 8769) in ../.claude/launch.json. Nothing committed.

Battle API changes (play.js keeps working unchanged): `new Battle(rom, info, types, deploy, arrivals, { script, hard })`,
script defaults to scripts.js by map index; `winner()` uses the script, reason in `battle.result`.
Neutral docks are army 2 (`NEUTRAL`); use `battle.hostiles(u)` instead of `alive(1 - army)`.
New: movePoints, flood, canBoard/boardable/board, canTransform/transform, afterFight (levels,
capture), repairDocks, reMove after firing.

ROM findings (details in FORMATS): levels $01:9EA9, boarding $01:A5F2, capture $01:A626,
dock repair $02:94DD, spent forms $01:A00A, transform inside weapon select $01:84E0, AI dock
return $01:8C10. Japanese Wikipedia (via weblio.jp/content/earthlight) confirms: no production,
no carry-over between maps, hard mode = attack x2.

Open: per-map ROM victory table not found (objectives hand-written); map events (Buccaneer,
comet, afterburner, mines); points/rank screen; play.html blurb still says "Not yet: map scripts…".
