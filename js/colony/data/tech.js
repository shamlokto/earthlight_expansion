// Earthlight Space Colony Rebuild: the tech tree (docs/COLONY.md §12, version 2). Original data.
// Research Labs make research points (state.research.points flow into the focused tech). A tech
// is available when every tech in `needs` is done. On completion it unlocks `unlocks` (building
// keys) and applies `effects`, read by the sim and rules through techEffect():
//   { kind: 'output', key, mult }      a building's makes × mult
//   { kind: 'storage', key, mult }     a building's storage × mult
//   { kind: 'cost', key, mult }        a building's cost × mult
//   { kind: 'pressurise', mult }       air to pressurise a chamber × mult
//   { kind: 'survey', mult, days }     survey cost × mult, survey takes `days`
export const BRANCHES = [
  { key: 'life', name: 'Life Support', text: 'Water, air and health.' },
  { key: 'industry', name: 'Industry', text: 'Ore into alloy into parts; the riches of space.' },
  { key: 'society', name: 'Society', text: 'Food worth eating and a colony worth living in.' },
  { key: 'logistics', name: 'Logistics', text: 'Reach further, survey faster, seal better.' },
];

export const TECHS = [
  // Life Support
  { key: 'reclaim', name: 'Water Reclamation', branch: 'life', cost: 60, needs: [], unlocks: ['reclaimer'], text: 'Recycle the colony\'s water: no river needed.' },
  { key: 'medicine', name: 'Medicine', branch: 'life', cost: 80, needs: [], unlocks: ['clinic'], text: 'Clinics: healthier, happier colonists, children, and Apartments.' },
  { key: 'hydro2', name: 'Better Hydroponics', branch: 'life', cost: 100, needs: ['reclaim'], unlocks: [], effects: [{ kind: 'output', key: 'hydro', mult: 1.25 }], text: 'Hydroponics Bays grow a quarter more.' },
  { key: 'cometice', name: 'Comet Ice', branch: 'life', cost: 100, needs: ['reclaim'], unlocks: ['iceharvester'], text: 'Harvest the comet\'s icy tail for water.' },
  { key: 'gasscoop', name: 'Gas Scooping', branch: 'life', cost: 140, needs: ['cometice', 'tethers'], unlocks: ['gasscoop'], text: 'Skim air from the top of Earth\'s atmosphere.' },
  // Industry
  { key: 'smelting', name: 'Smelting', branch: 'industry', cost: 60, needs: [], unlocks: ['smelter', 'tailings'], text: 'Melt ore into alloy.' },
  { key: 'fabrication', name: 'Fabrication', branch: 'industry', cost: 100, needs: ['smelting'], unlocks: ['fabricator'], text: 'Turn alloy into parts: the colony makes its own.' },
  { key: 'sweeping', name: 'Meteoroid Sweeping', branch: 'industry', cost: 80, needs: ['smelting'], unlocks: ['sweeper'], text: 'Small sweepers gather ore and ice from meteoroid drifts.' },
  { key: 'deepdrill', name: 'Deep Drilling', branch: 'industry', cost: 120, needs: ['smelting'], unlocks: [], effects: [{ kind: 'output', key: 'oremine', mult: 1.25 }], text: 'Ore Mines dig a quarter more.' },
  { key: 'plasma', name: 'Plasma Skimming', branch: 'industry', cost: 150, needs: ['fabrication'], unlocks: ['plasmaskimmer'], text: 'Draw helium-3 from the plasma clouds: precious fuel for Earth.' },
  // Society
  { key: 'canteens', name: 'Canteens', branch: 'society', cost: 50, needs: [], unlocks: ['canteen'], text: 'Hot meals: happiness near the homes.' },
  { key: 'safety', name: 'Safety Posts', branch: 'society', cost: 70, needs: [], unlocks: ['safetypost'], text: 'Wardens and breach crews: calmer homes, faster sealing.' },
  { key: 'orchards', name: 'Orchards and Fisheries', branch: 'society', cost: 80, needs: [], unlocks: ['orchard', 'fishery'], text: 'Fruit on the hills, fish in the river.' },
  { key: 'seeds', name: 'Seed Science', branch: 'society', cost: 100, needs: ['orchards'], unlocks: ['seedvault'], effects: [{ kind: 'output', key: 'farm', mult: 1.1 }], text: 'Seed Vaults mend poor soil; every field grows a tenth more.' },
  { key: 'observation', name: 'Observation Decks', branch: 'society', cost: 90, needs: ['canteens'], unlocks: ['obsdeck'], text: 'A window on Earth: the whole colony takes heart.' },
  // Logistics
  { key: 'tethers', name: 'Tether Masts', branch: 'logistics', cost: 70, needs: [], unlocks: ['tether'], text: 'Masts that carry the dock\'s reach further into space.' },
  { key: 'drones', name: 'Survey Drones', branch: 'logistics', cost: 80, needs: [], unlocks: ['dronebay'], effects: [{ kind: 'survey', mult: 0.5, days: 1 }], text: 'Surveys cost half and take a day; a Drone Bay surveys chambers further away.' },
  { key: 'seals2', name: 'Better Seals', branch: 'logistics', cost: 90, needs: ['drones'], unlocks: [], effects: [{ kind: 'cost', key: 'seal', mult: 0.5 }, { kind: 'pressurise', mult: 0.75 }], text: 'Seals cost half; chambers need a quarter less air.' },
  { key: 'batteries2', name: 'Better Batteries', branch: 'logistics', cost: 100, needs: [], unlocks: [], effects: [{ kind: 'storage', key: 'battery', mult: 2 }], text: 'Battery Banks hold twice as much.' },
];
export const TECH = Object.fromEntries(TECHS.map((t) => [t.key, t]));
// Which tech unlocks a building (version 2 buildings carry `tech` too; this is the reverse index).
export const TECH_OF = Object.fromEntries(TECHS.flatMap((t) => t.unlocks.map((k) => [k, t.key])));
