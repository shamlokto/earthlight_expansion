# Earth Light remake: handoff for a new chat

Attach this file (and, if you like, `README.md`, `docs/EXPANSION.md` and `docs/FORMATS.md`) to a new
Claude chat to continue. The full project is in the zip next to it; the chat transcripts are in
`transcripts/`.

## What this is

A faithful browser remake of Hudson Soft's Super Famicom strategy game **Earth Light** (Japan, 1992),
plus a fan **expansion** with a new campaign. Everything original (graphics, maps, units, text,
music) is decoded at runtime from the owner's own ROM; no game data is stored in the project.

* ROM: `Earth Light (Japan).zip` (CRC32 727F1593), kept by the owner, never modified or uploaded.
* English: Nezz's fan translation (GPL-3.0, github.com/HoratioVex/Earthlight-1-Translation),
  applied in memory. The website bundles the patch; the local launcher reads it from Downloads.

## Status (2026-10-23)

Done (base game):
* Decoders (asset table, LZSS, bitplane XOR), all 30 maps, 58 unit types, terrain, damage formula.
* English text: intro, briefings, unit info, terrain, results, ending.
* Fight cut-ins hand-rewritten in JS from emulator captures, with the pre-fight info screen and
  15 per-type variants. Unit description art (pixel-exact on the units checked).
* Original sound driver and songs, run in an emulated SPC700 + DSP in the browser.
* Full campaign (`game.html`): objectives, reinforcements from ROM tables, guards, levels,
  Athena/Siren transformation, docks, save/load, hard mode, points and rank screen, ROM title
  and menu screens, map events, the original AI decoded from bank $01.
* Weapon-slot targeting rule from $01:E0F1 (bombs can't hit mecha) for player and AI.

Still open (base game): Babylon's drift on map 30, the Mode 7 map overview, the original menu
font, four songs not tied to a screen.

Expansion (`docs/EXPANSION.md` is the design document):
* Premise: after Babylon, the Union turns corrupt; the player leads Galt remnants (pink, left side).
* Done: mission JSON format and loader, map editor (`editor.html`), battles on custom maps (general
  aboard a ship, escape and destroy-a-type objectives, briefing screen), first cut of the
  intermission (`expansion.html`: roster, production, trade). Mission 1 (Betrayal) rebalanced after
  a playtest, not replayed yet.
* To do: missions 2–10 in the editor, a free Athena from a dock in battle, balance pass.

## How to run

* Mac: double-click `Play Earth Light.command` (starts `serve.py` with the ROM and patch from
  Downloads and opens `game.html`). Expansion: `/expansion.html`; editor: `/editor.html`.
* Website (private claude.ai artifact, owner only): https://claude.ai/artifact/JZbM4gszJjuhuqVgX3rpeo
  It asks for the ROM once per browser and is a snapshot from before the targeting fix and the
  expansion; republish to update it. The ROM is deliberately never uploaded.

## Owner's preferences

* Faithful to the original first; fight animations, unit art and original audio are top priority.
* Save tokens; search the web before deep ROM decoding; stop work at 80% of the 5-hour usage window.
* Keep the ROM out of the project and off the web. Don't access the owner's Google Drive.
* The project is a private local git repo (no remote) in `~/Documents/EarthLight-remake`.

## Layout

See the README's Layout table. Key places: `js/game/` (rules, AI, fights, scripts, events, points),
`js/audio/`, `js/expansion/`, `missions/`, `research/` (Python 65816 emulator and tools),
`docs/notes/` (working notes from each part of the build).
