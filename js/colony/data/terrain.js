// Earthlight Space Colony Rebuild: terrain types of the colony map (docs/COLONY.md §5, docs/COLONY-V1.md).
// Original data (no ROM). The id is what map.t stores per tile; never renumber, only append.
//   zone   'space' | 'atmo' | 'earth' | 'wall' | 'interior'
//   soil   farm multiplier (interior soils only)
//   build  can a building stand here at all (each building narrows it further with `on`)
//   height 3D height of the tile top in tile units (the view may add noise)
//   color  procedural fallback colour (art slot terrain/<key> replaces it, js/colony/art.js)
export const T = {
  VOID: 0, ASTEROID: 1, MAGNETIC: 2, METEOROID: 3, COMET: 4, PLASMA: 5, GRAVITY: 6,
  ATMOSPHERE: 7, EARTH: 8, HULL: 9, BULKHEAD: 10, GATE: 11, DECK: 12,
  PLAIN: 13, FERTILE: 14, POOR: 15, RIVER: 16, LAKE: 17, FOREST: 18, HILLS: 19, ROCK: 20,
  MARSH: 21, RUBBLE: 22, BREACH: 23,
};

export const TERRAIN = [
  { id: 0,  key: 'void',       name: 'Void',            zone: 'space',    build: true,  height: 0,    color: '#0b0f1e', ver: 1, text: 'Open space. Light orbital modules and solar arrays.' },
  { id: 1,  key: 'asteroid',   name: 'Asteroid field',  zone: 'space',    build: true,  height: 0.9,  color: '#6b5a4a', ver: 1, text: 'The best ore in the sky. Ore mines stand only here.' },
  { id: 2,  key: 'magnetic',   name: 'Magnetic field',  zone: 'space',    build: true,  height: 0.05, color: '#3a3f9e', ver: 1, text: 'A diagonal belt of charged fields. Induction collectors harvest it for power; beams do nothing here.' },
  { id: 3,  key: 'meteoroid',  name: 'Meteoroid field', zone: 'space',    build: false, height: 0.3,  color: '#4a4440', ver: 2, text: 'Drifting stones: light ore and ice, and strikes on anything built nearby.' },
  { id: 4,  key: 'comet',      name: 'Comet tail',      zone: 'space',    build: false, height: 0.1,  color: '#9fd6e8', ver: 2, text: 'Ice in the comet\'s wake: water, once harvesters can follow it.' },
  { id: 5,  key: 'plasma',     name: 'Galactic plasma', zone: 'space',    build: false, height: 0.05, color: '#a8327a', ver: 2, text: 'Plasma lakes rich in helium-3, fuel for fusion.' },
  { id: 6,  key: 'gravity',    name: 'Gravity flux',    zone: 'space',    build: false, height: -0.2, color: '#2b5b4a', ver: 4, text: 'A river of bent gravity. Heavy foundries, later.' },
  { id: 7,  key: 'atmosphere', name: 'Atmosphere',      zone: 'atmo',     build: false, height: 0,    color: '#4f8fd6', ver: 1, text: 'The top of Earth\'s air. Gas scoops, later; raiders can climb out of it.' },
  { id: 8,  key: 'earth',      name: 'Earth',           zone: 'earth',    build: false, height: -1,   color: '#1d4e7a', ver: 1, text: 'Home, poisoned and far below.' },
  { id: 9,  key: 'hull',       name: 'Hull',            zone: 'wall',     build: true,  height: 2.5,  color: '#8a929c', ver: 1, text: 'Eden\'s outer wall. Docks and solar arrays sit on it.' },
  { id: 10, key: 'bulkhead',   name: 'Bulkhead',        zone: 'wall',     build: false, height: 2.0,  color: '#6f7780', ver: 1, text: 'An inner wall between chambers.' },
  { id: 11, key: 'gate',       name: 'Gate',            zone: 'wall',     build: false, height: 0.3,  color: '#c9a640', ver: 1, text: 'A gate in a bulkhead. Coverage passes through it when both chambers are open.' },
  { id: 12, key: 'deck',       name: 'Deck',            zone: 'interior', build: true,  height: 0.1,  color: '#7c7f86', ver: 1, text: 'Plated floor of an industrial chamber. No soil.' },
  { id: 13, key: 'plain',      name: 'Plain soil',      zone: 'interior', build: true,  height: 0.15, soil: 1.1,  color: '#7a8a3c', ver: 1, text: 'Ordinary colony soil. Farms ×1.1.' },
  { id: 14, key: 'fertile',    name: 'Fertile soil',    zone: 'interior', build: true,  height: 0.15, soil: 1.8,  color: '#4f7a2a', ver: 1, text: 'The old river fields. Farms ×1.8.' },
  { id: 15, key: 'poor',       name: 'Poor soil',       zone: 'interior', build: true,  height: 0.15, soil: 0.55, color: '#9a8a5a', ver: 1, text: 'Scorched and thin. Farms ×0.55; leave a field fallow to mend it.' },
  { id: 16, key: 'river',      name: 'Artificial river', zone: 'interior', build: false, height: -0.1, color: '#3f7fbf', ver: 1, text: 'Eden\'s river. Pumps beside it give water; farms beside it +25%.' },
  { id: 17, key: 'lake',       name: 'Lake',            zone: 'interior', build: false, height: -0.1, color: '#2f6faf', ver: 2, text: 'A reservoir.' },
  { id: 18, key: 'forest',     name: 'Forest',          zone: 'interior', build: false, height: 0.6,  color: '#2f5a28', ver: 2, text: 'Old trees: air and timber.' },
  { id: 19, key: 'hills',      name: 'Hills',           zone: 'interior', build: true,  height: 0.8,  color: '#8a7a4a', ver: 2, text: 'Terraces and orchards.' },
  { id: 20, key: 'rock',       name: 'Rock',            zone: 'interior', build: true,  height: 0.5,  color: '#6a6460', ver: 2, text: 'Bare rock: foundations.' },
  { id: 21, key: 'marsh',      name: 'Flooded ground',  zone: 'interior', build: false, height: 0,    color: '#4a6a5a', ver: 2, text: 'Flooded by a burst main. Drain it first.' },
  { id: 22, key: 'rubble',     name: 'Rubble',          zone: 'interior', build: false, height: 0.4,  color: '#5a524a', ver: 1, text: 'A wrecked district. A salvage yard turns it into parts and clears it.' },
  { id: 23, key: 'breach',     name: 'Breach',          zone: 'wall',     build: true,  height: 0.2,  color: '#ff5a3a', ver: 1, text: 'A hole in a wall. Air escapes; a Bulkhead Seal closes it.' },
];

// Artifacts (map.r): one per tile at most, revealed when the chamber is surveyed (space: always visible).
export const R = { NONE: 0, ORE_SEAM: 1, WRECK: 2 };
export const ARTIFACT = [
  { id: 0, key: 'none', name: '' },
  { id: 1, key: 'oreseam', name: 'Ore seam', ver: 1, text: 'A rich vein: an ore mine covering it yields double.' },
  { id: 2, key: 'wreck',   name: 'Wreck',    ver: 1, text: 'A wreck from the war: 120 salvage for a salvage yard in range.' },
];

export const isSoil = (t) => TERRAIN[t]?.soil !== undefined;
export const zoneOf = (t) => TERRAIN[t]?.zone;
