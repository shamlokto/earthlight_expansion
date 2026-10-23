# Sound and music session (2026-10-23)

Done: original audio from the ROM, no audio files shipped.
- `js/audio/spc.js` own SPC700 + S-DSP emulator (fullsnes reference; gauss table copied from it).
  `worklet.js` AudioWorklet at 32 kHz; `sound.js` API (`Sound.start/loadGroup/playSong/playSfx/stop/fadeOut/setMuted`)
  + ROM tables (`soundTest`, `trackTable`, `mapMusic`); `fightsfx.js` per-type weapon SFX.
- `soundlab.html`: game's 113-entry sound test + every command per song group, meters, mute.
- `play.html`/`js/play.js`: `music()` in `draw()` (map BGM per phase + 2x-units tension tracks),
  audio starts on first pointerdown, Mute checkbox (localStorage `earthlight-mute`), fight SFX via
  `FightScene.sounds()` in runFight. `js/game/fightscene.js`: import + `sounds()` method only.
- Docs: FORMATS.md "Sound" section; README "Sound and music" section, roadmap item 3, layout rows.

Findings: the game has NO fight music (map song continues). Upload protocol $00:A799/A89F, command
port $0A51 via $00:A817 with toggle bit. Driver ignores commands for ~27 ms after start (ports cleared).
Captures: research/spc_fightsfx.py (wraps fight3.py), outputs in my scratchpad out/sfx/t<type>.txt.

Open: `game.html` (campaign) has no audio hook yet — same 3 pieces as play.js would work there.
Event music ($06EC/$06ED from map scripts), other weapon slots' SFX, title/briefing/ending songs.

## Update (new folder /Users/shamlokto/Documents/EarthLight-remake)
- sound.js: SONGS {title, menu, interlude, overview, ending}, briefingSong(map), eventSong(side), PHASE; sent to earthlight-final.
- fightsfx.js: FIRE_SFX_SLOT per weapon slot; fireSfx(type, slot). fightscene.sounds() reads side.slot;
  play.js passes e.w/e.cw slot. Asked earthlight-campaign to do the same one-liner in gameapp.js sideOf.
- Unidentified songs: 1/$44, 10/$50, 10/$4F, group 11 cmd 4 (likely lost/game over/staff roll).
- research/spc_boot.py: boot or saved-state song logger (--poke addr=val).
Changed files (uncommitted): js/audio/sound.js, js/audio/fightsfx.js, js/game/fightscene.js (1 line), js/play.js (2 lines),
docs/FORMATS.md, README.md (2 lines), research/spc_boot.py.
