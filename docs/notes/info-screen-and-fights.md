# Info screen + fight variants session (2026-10-23)

Step 1 done: `js/game/infoscreen.js` (new), wired into `FightScene` (opts.info/textRom/names),
`Battle.fightInfo()` + `hexRing()` in rules.js, `play.js` passes `e.info` and the patched ROM.
Details in docs/FORMATS.md ("Pre-fight info screen"). Also fixed support in rules.js
(scans the opponent's neighbours). Dev page: `fightlab.html?fr=N&en=1&ally=1&lv=1&at=T&dt=T`.
fight3.py gained --move/--pre/--post/--dump/--rom and calls $02:9157.
Emulator states/dumps: old session scratchpad out/ (rf_end.pkl, inf_stNNN.pkl, sup_stNNN.pkl).

Step 2 done: VARIANT table in js/game/fightscene.js (shot tiles/speeds, lob/home/drop paths,
flames, poses, turrets in place), from captures v<type> (types 1-5,8-11,14,16,23-25,27) in the
old scratchpad out/. Tools: research/proj.py (projectile tracks), research/flame.py.
Follow-ups: capture CUN-42 (type 15) with slot 1; Dragon muzzle-flash tile; capital-ship and
structure variants per type; exact per-machine fire stagger; 240-360 background hold before fly-in.

Ship/structure pass: HULLS / SHIP_SHOTS / STRUCT_SHOTS in fightscene.js from captures v15, v30-v55, d56
(research/hull.py). CUN-42 crashes the emulator (BRK $03:FA7A) mid-fight; fight3.py now keeps frames
recorded before a crash. Open: structure-attacker background layer (fortress/dock body is BG, starfield
backdrop), CV-MN2 enters from the right, carrier launch effects (CV-B44/CV-MN2 tiles 65/66, 133/134).

Game assembled: game.html + js/gameapp.js (title, intro, briefings, 30 missions, saved progress,
results, ending). js/game/scenario.js decodes all per-map unit sources (deployment, extras $01:E7C4,
fortresses $01:B52E, dock cargo $02:9523, warp-in $02:CEAC/CF31/CF45, reinforcements $02:9E96);
rules.js has carriers/launch/arrivals/tower-loss. Headless AI-vs-AI run: no errors on all 30 maps;
maps 9, 12, 15, 23, 24, 29 stall by turn 40 (stand-in AI). Open: per-mission win conditions, real AI.

Unit description art (phase 1a): js/unitart.js (assets $04:F172/F1E6 + sprite frames $06:E0AB via
$04:F25A), js/unitinfo.js (info overlay), lab Units tab "Description art", play.js right-click / Info
button (small edit). Pixel-exact vs emulator for Mars/Talos/Tiamat. Capture tool research/info3.py;
real-game battle state g4.pkl in the old scratchpad out/ (HAMILTON, player control, dispatcher polling).
$02:E26B was a wrong lead (map icon copy).
