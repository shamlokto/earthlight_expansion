// Earthlight Space Colony Rebuild: the tech tree (docs/COLONY.md §12, version 2). Original data.
// Research Labs make research points (state.research.points flow into the focused tech). A tech
// is available when every tech in `needs` is done. On completion it unlocks `unlocks` (building
// keys) and applies `effects`, read by the sim and rules through techEffect():
//   { kind: 'output', key, mult }      a building's makes × mult
//   { kind: 'storage', key, mult }     a building's storage × mult
//   { kind: 'cost', key, mult }        a building's cost × mult
//   { kind: 'pressurise', mult }       air to pressurise a chamber × mult
//   { kind: 'survey', mult, days }     survey cost × mult, survey takes `days`
//   { kind: 'machines', tier }         Earth Light machines of this tier can be built (data/machines.js)
export const BRANCHES = [
  { key: 'life', name: 'Life Support', text: 'Water, air and health.' },
  { key: 'industry', name: 'Industry', text: 'Ore into alloy into parts; the riches of space.' },
  { key: 'society', name: 'Society', text: 'Food worth eating and a colony worth living in.' },
  { key: 'logistics', name: 'Logistics', text: 'Reach further, survey faster, seal better.' },
  { key: 'defence', name: 'Defence', text: 'Guardians, shipyards, sensors and shields (version 3).' },
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
  // ---- version 3 (docs/COLONY-V3.md)
  { key: 'fungi', name: 'Mushroom Walls', branch: 'life', cost: 90, needs: ['hydro2'], unlocks: ['mushroom'], text: 'Grow food on the colony\'s waste, with no water at all.' },
  { key: 'fusion', name: 'Fusion Power', branch: 'industry', cost: 200, needs: ['plasma'], unlocks: ['fusion'], text: 'A reactor that burns helium-3: power for a city.' },
  { key: 'terraces', name: 'Terrace Homes', branch: 'society', cost: 110, needs: ['orchards'], unlocks: ['terrace'], text: 'Roomy homes on the hills: fewer neighbours, happier families.' },
  { key: 'leadership', name: 'Leadership', branch: 'society', cost: 120, needs: ['safety'], unlocks: ['lodge', 'quarters'], text: 'Wanderers come to Eden; invite the best as commanders.' },
  { key: 'sensors', name: 'Long-range Sensors', branch: 'defence', cost: 60, needs: [], unlocks: ['sensormast'], text: 'Sensor Masts see raiders coming days earlier.' },
  { key: 'machineworks', name: 'Machine Works', branch: 'defence', cost: 100, needs: [], unlocks: [], effects: [{ kind: 'machines', tier: 2 }], text: 'The Arsenal can build stronger machines: Talos-class HU, bombers and gunboats.' },
  { key: 'shields', name: 'Shield Pylons', branch: 'defence', cost: 120, needs: ['sensors'], unlocks: ['shieldpylon'], text: 'Shields keep raiders\' fire off the buildings in range.' },
  { key: 'jamming', name: 'Jamming', branch: 'defence', cost: 120, needs: ['sensors'], unlocks: ['jammer'], text: 'Jammer Arrays hide Eden: less heat, fewer raids.' },
  { key: 'shipyard', name: 'Shipyard', branch: 'defence', cost: 150, needs: ['machineworks'], unlocks: ['shipyard'], text: 'A Shipyard on the hull builds capital ships: carriers, cruisers, battleships.' },
  { key: 'heavyworks', name: 'Heavy Works', branch: 'defence', cost: 180, needs: ['machineworks'], unlocks: [], effects: [{ kind: 'machines', tier: 3 }], text: 'The heaviest machines of the war: Athena, Medusa-class and the great ships.' },
  { key: 'kai', name: 'Kai Refits', branch: 'defence', cost: 300, needs: ['heavyworks', 'shipyard'], unlocks: [], effects: [{ kind: 'machines', tier: 4 }], text: 'Ruess\'s refits of the expansion war: the Kai series, up to the Azoras Kai.' },
  // ---- version 6 (docs/COLONY-V6.md): the big city. 'reserve' multiplies Emergency Stores' reserve; Food
  // Security also turns on automatic rationing (sim.js needs) when the food would last under three days.
  { key: 'foodsec', name: 'Food Security', ver: 6, branch: 'society', cost: 90, needs: ['canteens'], unlocks: [], effects: [{ kind: 'reserve', mult: 2 }], text: 'Emergency Stores that hold twice as much, and automatic rationing whenever the food would last less than three days.' },
  { key: 'waterworks', name: 'Water Works', ver: 6, branch: 'life', cost: 200, needs: ['reclaim'], unlocks: ['waterworks'], text: 'A whole water plant in one building: water for a city.' },
  { key: 'atmoproc', name: 'Atmosphere Processors', ver: 6, branch: 'life', cost: 240, needs: ['waterworks'], unlocks: ['atmoproc'], text: 'Air for a city and all its chambers from one great plant.' },
  { key: 'vertfarm', name: 'Vertical Farms', ver: 6, branch: 'life', cost: 240, needs: ['fungi'], unlocks: ['vertfarm'], text: 'Farms forty storeys tall: 800 food a day on any floor.' },
  { key: 'mirrors', name: 'Sun Mirrors', ver: 6, branch: 'industry', cost: 220, needs: ['fabrication', 'tethers'], unlocks: ['sunmirror'], text: 'Great mirrors in space that focus sunlight into power, with no fuel at all.' },
  { key: 'highrise', name: 'High-rise Homes', ver: 6, branch: 'society', cost: 160, needs: ['terraces'], unlocks: ['towerblock'], text: 'Tower Blocks for 150 that grow into Spires for 450.' },
  { key: 'civics', name: 'Civic Planning', ver: 6, branch: 'society', cost: 220, needs: ['highrise'], unlocks: ['plaza'], text: 'Civic Plazas: town hall, school and market, happiness over a whole district.' },
  { key: 'immigration', name: 'Immigration', ver: 6, branch: 'logistics', cost: 200, needs: ['highrise'], unlocks: ['arrivals'], text: 'Arrivals Halls by the dock: every transport brings more colonists.' },
  { key: 'arcology', name: 'Arcologies', ver: 6, branch: 'society', cost: 450, needs: ['highrise', 'vertfarm'], unlocks: ['arcology'], text: 'A city in one building: homes for 1,500 with jobs and gardens inside.' },
  { key: 'massdriver', name: 'Mass Driver', ver: 6, branch: 'logistics', cost: 320, needs: ['tethers', 'fabrication'], unlocks: ['massdriver'], text: 'A rail on the hull that throws heavy relief convoys to Earth, three loads at a time, even by itself.' },
  // ---- version 7 (docs/COLONY-V7.md): zoning and growth. The quads themselves are on the menu from the start; these
  // techs open their upper levels (a level need 'tech:<key>' in data/buildings.js) and the buildings that support them.
  { key: 'schooling', name: 'Schools', ver: 7, branch: 'society', cost: 90, needs: [], unlocks: ['school'], text: 'Schools: happier homes, a little research, and Living Quads in range can grow into Mid-rises.' },
  { key: 'commerce', name: 'Commerce', ver: 7, branch: 'society', cost: 100, needs: [], unlocks: [], effects: [{ kind: 'output', key: 'marketquad', mult: 1.2 }], text: 'Market Quads can grow into Market Halls, and every Market Quad earns a fifth more.' },
  { key: 'lightindustry', name: 'Light Industry', ver: 7, branch: 'industry', cost: 110, needs: ['smelting'], unlocks: ['freightyard'], text: 'Workshop Quads can grow into Works that make alloy too; Freight Yards help them grow further.' },
  { key: 'urbanplan', name: 'Urban Planning', ver: 7, branch: 'society', cost: 200, needs: ['schooling', 'commerce'], unlocks: ['transit'], text: 'Quads can reach level 4: Mid-rises, Arcades and Assembly Plants. Transit Stations make a district grow twice as fast.' },
  { key: 'skyscrapers', name: 'Skyscrapers', ver: 7, branch: 'society', cost: 380, needs: ['urbanplan', 'highrise'], unlocks: ['monorail'], text: 'The top of the zoning ladder: Residential Towers for 700 and Trade Towers. Monorail Stops carry transit 16 tiles.' },
  { key: 'automation', name: 'Automation', ver: 7, branch: 'industry', cost: 300, needs: ['lightindustry', 'urbanplan', 'fabrication'], unlocks: [], effects: [{ kind: 'output', key: 'fabricator', mult: 1.2 }], text: 'Workshop Quads can grow into Factories, and Fabricators make a fifth more.' },
  // ---- version 8 (docs/COLONY-V8.md): incidents you can prepare for (js/colony/incidents.js reads 'forecasting' too)
  { key: 'forecasting', name: 'Hazard Forecasting', ver: 8, branch: 'logistics', cost: 80, needs: [], unlocks: ['flareshelter'], text: 'Incidents are seen 2 days earlier, and Flare Shelters keep the power on through a solar flare.' },
];
export const TECH = Object.fromEntries(TECHS.map((t) => [t.key, t]));
// Which tech unlocks a building (version 2 buildings carry `tech` too; this is the reverse index).
export const TECH_OF = Object.fromEntries(TECHS.flatMap((t) => t.unlocks.map((k) => [k, t.key])));
