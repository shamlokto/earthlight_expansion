// Earthlight Space Colony Rebuild: the buildings of version 1 (docs/COLONY.md §11, contract in
// docs/COLONY-V1.md). Original data. Numbers are per day at full staff and power, level 1, and are
// first guesses for the balance pass (tests/colony-sim.mjs). Later versions append entries.
//
//   key, name, cat           id and build-menu group (CATEGORIES)
//   size                     footprint N×N tiles; (x, y) of a building is its top-left tile
//   on                       terrain keys every tile of the footprint must have
//   zone                     'interior' (inside an open chamber) | 'space' (within a dock's reach) | 'hull' | 'any'
//                            | 'road' (interior floor, or a gate whose chambers are all open)
//   adj                      optional: terrain key one 4-neighbour of the footprint must have
//   cost                     { credits, parts }   days: construction time
//   jobs                     workers needed; output scales with min(1, staffing)
//   upkeep                   credits per day
//   power                    + produces / − draws (MW); others in makes / uses (units per day)
//   makes, uses              { food, water, air, parts, ore, credits }
//   housing, storage         capacity added ({ food: 200, ... } for storage)
//   radius                   coverage radius in tiles (parks, salvage, docks' reach)
//   modes                    [{ key, name, text }]; the first is the default
//   levels                   per-level overrides (index 0 = level 1), when the building upgrades in place
//   unlock                   { pop } colonists needed before it appears in the menu
//   tech                     the tech (data/tech.js) that unlocks it (version 2)
//   service                  happiness for habitats in its radius (clinic, canteen, safety post)
//   builds                   'arsenal' | 'shipyard': builds the machines of data/machines.js with that `at`
//   crews                    machines this building crews (version 3)
//   fixed                    cannot be built, moved or demolished by the player
//   text                     one line for the build menu
export const CATEGORIES = [
  { key: 'core', name: 'Command' },
  { key: 'power', name: 'Power' },
  { key: 'life', name: 'Water & air' },
  { key: 'food', name: 'Food' },
  { key: 'industry', name: 'Industry' },
  { key: 'homes', name: 'Homes & parks' },
  { key: 'services', name: 'Services' },
  { key: 'defence', name: 'Defence' },
];

// What one colonist needs a day.
export const NEEDS = { food: 1, water: 1, air: 1, power: 0.1 };
// Air an open chamber needs a day to stay pressurised, per 100 of its floor tiles.
export const CHAMBER_AIR_PER_100 = 1;
// Space buildings must stand within this many tiles (Chebyshev) of a finished dock's centre.
export const DOCK_REACH = 24;
// Wanderers of the market: base sale price in credits per unit (rules.sell moves it).
export const BASE_PRICE = { ore: 3, food: 3, parts: 10, water: 1, air: 2, alloy: 12, helium: 30 };

export const BUILDINGS = [
  { key: 'command', name: 'Command Centre', cat: 'core', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], fixed: true,
    cost: { credits: 0, parts: 0 }, days: 0, jobs: 0, upkeep: 0, power: 20, makes: { air: 60, water: 10, parts: 2, food: 15 }, housing: 20,
    storage: { food: 300, water: 300, air: 300, parts: 300, ore: 200, alloy: 100, helium: 50 },
    text: 'The Governor\'s seat: a small reactor, air plant, ration stores, workshop and stores. Lose it and the colony is lost.' },
  { key: 'dock', name: 'Dock', cat: 'core', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 400, parts: 40 }, days: 6, jobs: 4, upkeep: 6, power: -4, radius: 24,
    text: 'Opens the hull to space: space buildings must stand within its reach. Transports land here.' },
  { key: 'repairyard', name: 'Repair Yard', cat: 'core', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 250, parts: 20 }, days: 4, jobs: 6, upkeep: 4, power: -3,
    levels: [{ crews: 1 }, { crews: 2, cost: { credits: 300, parts: 40 } }, { crews: 3, cost: { credits: 500, parts: 80 } }],
    text: 'Ruess\'s crews. Each crew builds one thing at a time; more crews, more at once.' },
  { key: 'depot', name: 'Storage Depot', cat: 'core', size: 1, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void', 'asteroid', 'hull'], cost: { credits: 80, parts: 5 }, days: 2, jobs: 0, upkeep: 1,
    storage: { food: 300 }, modes: [{ key: 'food', name: 'Food' }, { key: 'water', name: 'Water' }, { key: 'air', name: 'Air' }, { key: 'parts', name: 'Parts' }, { key: 'ore', name: 'Ore' }, { key: 'alloy', name: 'Alloy' }, { key: 'helium', name: 'Helium-3' }],
    text: 'Stores 300 of one good. Switch what it holds any time.' },

  { key: 'road', name: 'Road', cat: 'core', size: 1, zone: 'road', on: ['deck', 'plain', 'fertile', 'poor', 'gate'], cost: { credits: 5, parts: 1 }, days: 0, jobs: 0, upkeep: 0,
    text: 'Colonists walk and rovers drive only where there are roads. Click the start, then the end. Roads pass through gates between open chambers.' },

  { key: 'solar', name: 'Solar Array', cat: 'power', size: 1, zone: 'any', on: ['void', 'hull'], cost: { credits: 120, parts: 5 }, days: 2, jobs: 0, upkeep: 2, power: 12,
    levels: [{ power: 12 }, { power: 20, cost: { credits: 150, parts: 15 } }, { power: 30, cost: { credits: 250, parts: 30 } }],
    text: 'Clean, small power. On the hull or in open space near a dock.' },
  { key: 'induction', name: 'Induction Collector', cat: 'power', size: 2, zone: 'space', on: ['magnetic'], cost: { credits: 500, parts: 30 }, days: 6, jobs: 2, upkeep: 8, power: 60, unlock: { pop: 80 },
    text: 'Harvests a magnetic field: big, steady power. Only on a magnetic belt.' },
  { key: 'battery', name: 'Battery Bank', cat: 'power', size: 1, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void', 'hull'], cost: { credits: 100, parts: 5 }, days: 2, jobs: 0, upkeep: 1, storage: { power: 100 }, unlock: { pop: 80 },
    text: 'Stores 100 power for a bad day. Power is otherwise never stored.' },

  { key: 'riverpump', name: 'River Pump', cat: 'life', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck'], adj: 'river', cost: { credits: 150, parts: 5 }, days: 3, jobs: 2, upkeep: 2, power: -4, makes: { water: 40 },
    text: 'Water from Eden\'s river. Must stand beside it.' },
  { key: 'airplant', name: 'Air Plant', cat: 'life', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 3, upkeep: 4, power: -10, uses: { water: 10 }, makes: { air: 60 },
    text: 'Splits water into air. Every colonist and every open chamber breathes.' },
  { key: 'grove', name: 'Forest Grove', cat: 'life', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor'], cost: { credits: 40, parts: 0 }, days: 3, jobs: 0, upkeep: 0, uses: { water: 1 }, makes: { air: 6 }, radius: 4, park: 6,
    text: 'A stand of young trees: a little air with no power, and a pleasant place nearby.' },
  { key: 'seal', name: 'Bulkhead Seal', cat: 'life', size: 1, zone: 'wall', on: ['breach'], cost: { credits: 30, parts: 10 }, days: 2, jobs: 0, upkeep: 0,
    text: 'Patches one breach. Seal every breach of a chamber, then pressurise it.' },

  { key: 'farm', name: 'Farm Field', cat: 'food', size: 2, zone: 'interior', on: ['plain', 'fertile', 'poor'], cost: { credits: 120, parts: 5 }, days: 3, jobs: 4, upkeep: 2, uses: { water: 6 }, makes: { food: 12 },
    modes: [{ key: 'grain', name: 'Grain', text: 'Food by soil: fertile ×1.8, poor ×0.55; +25% beside the river.' },
            { key: 'cash', name: 'Cash crop', text: 'Credits instead: food ×0.4, +8 credits a day.' },
            { key: 'fallow', name: 'Fallow', text: 'Nothing grows; after 30 days its poor soil becomes plain.' }],
    text: 'Fields on Eden\'s soil. Fertile ground and the river make all the difference.' },
  { key: 'hydro', name: 'Hydroponics Bay', cat: 'food', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 200, parts: 10 }, days: 3, jobs: 2, upkeep: 3, power: -6, uses: { water: 4 }, makes: { food: 10 },
    text: 'Food from power and water, on any floor. Dull and reliable.' },

  { key: 'oremine', name: 'Ore Mine', cat: 'industry', size: 2, zone: 'space', on: ['asteroid'], cost: { credits: 350, parts: 20 }, days: 5, jobs: 4, upkeep: 6, power: -8, makes: { ore: 15 }, unlock: { pop: 80 },
    text: 'Mines an asteroid. Double on an ore seam. Sell the ore at the dock.' },
  { key: 'salvage', name: 'Salvage Yard', cat: 'industry', size: 2, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void'], cost: { credits: 250, parts: 10 }, days: 4, jobs: 4, upkeep: 2, power: -4, radius: 6, makes: { parts: 10 }, unlock: { pop: 80 },
    modes: [{ key: 'fast', name: 'Fast', text: 'Strip it quickly: full rate.' },
            { key: 'careful', name: 'Careful', text: 'Half the rate, double the parts from each tile.' }],
    text: 'Turns rubble and wrecks in range into parts, clearing the ground as it goes.' },

  { key: 'habitat', name: 'Habitat', cat: 'homes', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 100, parts: 5 }, days: 2, jobs: 0, upkeep: 2, power: -2, housing: 20,
    levels: [{ housing: 20, name: 'Shelter' }, { housing: 40, name: 'Quarters', needs: ['allNeeds', 'park'] }, { housing: 70, name: 'Apartments', needs: ['allNeeds', 'park', 'clinic'] }],
    text: 'Homes that grow by themselves when their needs are met. Its panel lists what is missing.' },
  // ---------------------------------------------------------------- version 2 (docs/COLONY-V2.md)
  // `tech` = the tech (data/tech.js) that unlocks it. Numbers are first guesses for the balance pass.
  { key: 'lab', name: 'Research Lab', cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock'], cost: { credits: 400, parts: 30 }, days: 5, jobs: 4, upkeep: 4, power: -8, makes: { research: 4 }, unlock: { pop: 80 },
    levels: [{ makes: { research: 4 } }, { makes: { research: 7 }, cost: { credits: 400, parts: 40 } }, { makes: { research: 11 }, cost: { credits: 700, parts: 80 } }],
    text: 'Research points for the tech tree. Pick what to study in the Research panel.' },
  { key: 'reclaimer', name: 'Water Reclaimer', cat: 'life', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock'], cost: { credits: 180, parts: 15 }, days: 3, jobs: 1, upkeep: 2, power: -3, makes: { water: 25 }, tech: 'reclaim',
    levels: [{ makes: { water: 25 } }, { makes: { water: 40 }, cost: { credits: 150, parts: 15 } }, { makes: { water: 60 }, cost: { credits: 250, parts: 30 } }],
    text: 'Recycles the colony\'s water: no river needed.' },
  { key: 'iceharvester', name: 'Ice Harvester', cat: 'life', size: 2, zone: 'space', on: ['comet'], cost: { credits: 400, parts: 30 }, days: 5, jobs: 3, upkeep: 4, power: -6, makes: { water: 80 }, tech: 'cometice',
    text: 'Melts the comet\'s icy tail into water. Only on the comet tail.' },
  { key: 'gasscoop', name: 'Gas Scoop', cat: 'life', size: 2, zone: 'space', on: ['atmosphere'], cost: { credits: 450, parts: 35 }, days: 6, jobs: 3, upkeep: 5, power: -8, makes: { air: 50 }, tech: 'gasscoop',
    text: 'Skims air from the top of Earth\'s atmosphere. Tether Masts carry the dock\'s reach down to it.' },
  { key: 'orchard', name: 'Orchard Terrace', cat: 'food', size: 2, zone: 'interior', on: ['hills'], cost: { credits: 160, parts: 8 }, days: 4, jobs: 3, upkeep: 2, uses: { water: 4 }, makes: { food: 10, credits: 3 }, tech: 'orchards',
    text: 'Fruit on the hills: food and a little money.' },
  { key: 'fishery', name: 'Fishery', cat: 'food', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck'], adj: 'river', cost: { credits: 140, parts: 8 }, days: 3, jobs: 2, upkeep: 2, makes: { food: 14 }, tech: 'orchards',
    text: 'Fish from Eden\'s river. Must stand beside it.' },
  { key: 'canteen', name: 'Canteen', cat: 'food', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 150, parts: 10 }, days: 3, jobs: 2, upkeep: 2, power: -3, uses: { food: 4 }, radius: 8, service: 5, tech: 'canteens',
    modes: [{ key: 'meals', name: 'Hot meals', text: 'Happiness for homes in range.' },
            { key: 'ration', name: 'Rationing', text: 'The colony eats a fifth less; no hot meals, and everyone is a little less happy.' }],
    text: 'Hot meals: happiness for the homes in range. Can ration food in a pinch.' },
  { key: 'seedvault', name: 'Seed Vault', cat: 'food', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor'], cost: { credits: 200, parts: 15 }, days: 4, jobs: 1, upkeep: 2, radius: 5, tech: 'seeds',
    text: 'Mends the soil around it: a poor tile in range becomes plain every 10 days.' },
  { key: 'smelter', name: 'Smelter', cat: 'industry', size: 2, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock'], cost: { credits: 350, parts: 25 }, days: 5, jobs: 4, upkeep: 4, power: -12, uses: { ore: 20 }, makes: { alloy: 10 }, tech: 'smelting',
    text: 'Melts ore into alloy. Alloy sells well and feeds the Fabricator.' },
  { key: 'fabricator', name: 'Fabricator', cat: 'industry', size: 2, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock'], cost: { credits: 400, parts: 30 }, days: 5, jobs: 4, upkeep: 4, power: -10, uses: { alloy: 10 }, makes: { parts: 15 }, tech: 'fabrication',
    text: 'Turns alloy into parts: the colony makes its own.' },
  { key: 'sweeper', name: 'Meteoroid Sweeper', cat: 'industry', size: 1, zone: 'space', on: ['meteoroid'], cost: { credits: 150, parts: 12 }, days: 3, jobs: 1, upkeep: 2, power: -3, makes: { ore: 6, water: 6 }, tech: 'sweeping',
    text: 'Gathers ore and ice from a meteoroid drift. Now and then a strike stops it for a few days.' },
  { key: 'tailings', name: 'Tailings Dump', cat: 'industry', size: 2, zone: 'space', on: ['void', 'asteroid'], cost: { credits: 200, parts: 10 }, days: 3, jobs: 0, upkeep: 1, tech: 'smelting',
    text: 'Takes the waste of the mines: more than four Ore Mines need one per four. It fills up; empty it (an order) before it is full.' },
  { key: 'plasmaskimmer', name: 'Plasma Skimmer', cat: 'industry', size: 2, zone: 'space', on: ['plasma'], cost: { credits: 500, parts: 40 }, days: 6, jobs: 2, upkeep: 5, power: -6, makes: { helium: 6 }, tech: 'plasma',
    text: 'Draws helium-3 from a plasma cloud: the most valuable cargo Earth will buy.' },
  { key: 'tether', name: 'Tether Mast', cat: 'core', size: 1, zone: 'space', on: ['void', 'asteroid', 'magnetic', 'meteoroid', 'comet', 'plasma', 'atmosphere'], cost: { credits: 120, parts: 12 }, days: 3, jobs: 0, upkeep: 1, power: -1, radius: 16, tech: 'tethers',
    text: 'Carries the dock\'s reach 16 tiles further: build space buildings around it. Masts can chain.' },
  { key: 'dronebay', name: 'Survey Drone Bay', cat: 'core', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock'], cost: { credits: 250, parts: 20 }, days: 4, jobs: 2, upkeep: 2, power: -3, radius: 40, tech: 'drones',
    text: 'Drones can survey any sealed chamber within 40 tiles, not only those next to open ones.' },
  { key: 'clinic', name: 'Clinic', cat: 'services', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 250, parts: 20 }, days: 4, jobs: 3, upkeep: 3, power: -4, radius: 8, service: 6, tech: 'medicine',
    levels: [{ name: 'Clinic', radius: 8 }, { name: 'Medical Centre', radius: 12, cost: { credits: 300, parts: 30 } }, { name: 'Hospital', radius: 16, cost: { credits: 600, parts: 60 } }],
    modes: [{ key: 'full', name: 'Full care', text: 'Happiness and children in range.' },
            { key: 'triage', name: 'Triage', text: 'Half the upkeep, half the happiness.' }],
    text: 'Health care: happiness in range, children are born, and Habitats in range can grow into Apartments.' },
  { key: 'safetypost', name: 'Safety Post', cat: 'services', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 180, parts: 12 }, days: 3, jobs: 2, upkeep: 2, power: -2, radius: 10, service: 4, tech: 'safety',
    text: 'Wardens and breach crews: calmer homes in range, and Bulkhead Seals in range go up twice as fast.' },
  { key: 'obsdeck', name: 'Observation Deck', cat: 'services', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 300, parts: 20 }, days: 5, jobs: 1, upkeep: 2, power: -2, tech: 'observation',
    text: 'A window on Earth below: +3 happiness for the whole colony (the first one). Only on the hull facing Earth.' },
  // ---------------------------------------------------------------- version 3 (docs/COLONY-V3.md)
  // Machines (data/machines.js) are built with credits and parts (owner): price × 10 credits, price parts.
  { key: 'arsenal', name: 'Arsenal', cat: 'defence', size: 3, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock'], cost: { credits: 600, parts: 50 }, days: 6, jobs: 6, upkeep: 6, power: -10, unlock: { pop: 80 }, builds: 'arsenal',
    text: 'Builds Earth Light machines: HU mecha, fighters, armour and batteries, for credits and parts. One at a time; more research, stronger machines.' },
  { key: 'shipyard', name: 'Shipyard', cat: 'defence', size: 3, zone: 'hull', on: ['hull'], cost: { credits: 1200, parts: 100 }, days: 10, jobs: 10, upkeep: 12, power: -20, tech: 'shipyard', builds: 'shipyard',
    text: 'Builds capital ships on the hull: carriers, cruisers and battleships.' },
  { key: 'barracks', name: 'Guardian Barracks', cat: 'defence', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 0, upkeep: 3, power: -3, crews: 6, unlock: { pop: 80 },
    text: 'Quarters for the crews of six machines. Machines without a crew stay in the hangar when raiders come.' },
  { key: 'scrapyard', name: 'Scrapyard', cat: 'defence', size: 2, zone: 'any', on: ['deck', 'plain', 'poor', 'rock', 'void'], cost: { credits: 300, parts: 15 }, days: 4, jobs: 4, upkeep: 3, power: -4, unlock: { pop: 80 },
    text: 'Repairs damaged machines (2 HP a day each, a part per HP), and machines sold here fetch a fifth more.' },
  { key: 'emplacement', name: 'Battery Emplacement', cat: 'defence', size: 1, zone: 'hull', on: ['hull'], cost: { credits: 250, parts: 25 }, days: 4, jobs: 1, upkeep: 2, power: -2, unlock: { pop: 80 },
    modes: [{ key: 'dragon', name: 'Dragon', text: 'Railgun battery: strong against ships.' }, { key: 'hydra', name: 'Hydra', text: 'Missile battery: strong against small craft.' }],
    text: 'A Dragon or Hydra battery on the hull, as in Earth Light: it fires on raiders that come near.' },
  { key: 'sensormast', name: 'Sensor Mast', cat: 'defence', size: 1, zone: 'any', on: ['hull', 'void', 'asteroid'], cost: { credits: 200, parts: 15 }, days: 3, jobs: 1, upkeep: 2, power: -3, tech: 'sensors',
    text: 'Sees raiders coming: warnings come 3 days earlier (up to 9 with three masts).' },
  { key: 'shieldpylon', name: 'Shield Pylon', cat: 'defence', size: 1, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'hull'], cost: { credits: 350, parts: 30 }, days: 4, jobs: 1, upkeep: 4, power: -15, radius: 8, tech: 'shields',
    text: 'Keeps raiders\' fire off every building in range.' },
  { key: 'jammer', name: 'Jammer Array', cat: 'defence', size: 1, zone: 'space', on: ['void', 'asteroid', 'magnetic'], cost: { credits: 300, parts: 25 }, days: 4, jobs: 1, upkeep: 4, power: -8, tech: 'jamming',
    text: 'Hides Eden from prying sensors: heat −10 (up to −30 with three).' },
  { key: 'fusion', name: 'Fusion Reactor', cat: 'power', size: 3, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock'], cost: { credits: 1500, parts: 120 }, days: 10, jobs: 8, upkeep: 15, power: 200, uses: { helium: 2 }, tech: 'fusion',
    modes: [{ key: 'normal', name: 'Normal', text: '200 power.' }, { key: 'overdrive', name: 'Overdrive', text: '+50% power, twice the helium, and a small chance each day of a 5-day shutdown.' }],
    text: 'Burns helium-3 for 200 power: a city\'s worth.' },
  { key: 'mushroom', name: 'Mushroom Wall', cat: 'food', size: 1, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock'], cost: { credits: 180, parts: 12 }, days: 3, jobs: 1, upkeep: 2, power: -2, makes: { food: 10 }, tech: 'fungi',
    text: 'Food grown on the colony\'s waste: no water, no soil.' },
  { key: 'terrace', name: 'Terrace Homes', cat: 'homes', size: 2, zone: 'interior', on: ['hills'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 0, upkeep: 3, power: -3, housing: 60, radius: 4, service: 3, tech: 'terraces',
    text: 'Roomy homes on the hills for 60: they make their neighbours happier too.' },
  { key: 'lodge', name: 'Wanderers\' Lodge', cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 400, parts: 25 }, days: 5, jobs: 2, upkeep: 4, power: -3, tech: 'leadership',
    levels: [{ name: 'Lodge' }, { name: 'Inn', cost: { credits: 400, parts: 30 } }, { name: 'Grand Lodge', cost: { credits: 700, parts: 60 } }],
    text: 'Wanderers stop here: pilots, captains and engineers adrift since the war. Invite the best as commanders. Bigger lodges draw more.' },
  { key: 'quarters', name: 'Officers\' Quarters', cat: 'services', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 0, upkeep: 3, power: -2, tech: 'leadership',
    text: 'Room for two more commanders.' },
  { key: 'park', name: 'Park', cat: 'homes', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck'], cost: { credits: 60, parts: 0 }, days: 1, jobs: 0, upkeep: 1, uses: { water: 1 }, radius: 6, park: 8,
    text: 'Raises happiness in range, up to its rating. Costs water, not power.' },
];

export const BUILDING = Object.fromEntries(BUILDINGS.map((b) => [b.key, b]));
