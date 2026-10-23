# Expansion data

The expansion's own game data. Expansion battles read their rules from these files, never
from the ROM (`tests/expansion-norom.mjs` checks this); the ROM is only used for graphics and
sound.

They were seeded from Earth Light (Japan) by `tools/extract-expansion-data.mjs`, with every
value copied unchanged, so the expansion plays by the original's rules. From here on they are
the expansion's design and may diverge. Re-running the extractor overwrites hand edits.

| file | contents |
|---|---|
| `units.json` | the 58 unit types: stats, weapons per slot (mode 0 Beam, 1 Railgun, 2 Missile), forms (transform / spent / loaded links), AI target value, info-screen display values, graphics references |
| `terrain.json` | terrain id -> type -> class; per class: combat defence /128 and displayed % per weapon mode, targetable per mode, movement cost per unit category (0 blocked, "stop" ends movement) |
| `rules.json` | level bonus table (damage x bonus/16), max level |
| `text.json` | English lines the battle pages show (labels, messages), unit names, unit info texts per type, army names. English text from Nezz's fan translation (GPL-3.0) |

`js/expansion/data.js` loads them (browser and Node) and builds the `types` list and the rule
`tables` (`js/game/tables.js`) that `ExpansionBattle` uses.
