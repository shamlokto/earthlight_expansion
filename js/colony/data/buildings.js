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
//   decks                    decks it may stand on: 'upper' | 'main' | 'lower' (version 4; absent = main only)
//   fixed                    cannot be built, moved or demolished by the player
//   retired                  no longer built (off the menu, never unlocked); old saves' copies keep working (version 9)
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
  { key: 'landmarks', name: 'Landmarks' },   // version 8 (docs/COLONY-V8.md): one of a kind each
  { key: 'wonders', name: 'Wonders' },       // version 9 (docs/COLONY-V9.md): grander, built in stages
];

// What one colonist needs a day.
export const NEEDS = { food: 1, water: 1, air: 1, power: 0.1 };
// Air an open chamber needs a day to stay pressurised, per 100 of its floor tiles.
export const CHAMBER_AIR_PER_100 = 1;
// Space buildings must stand within this many tiles (Chebyshev) of a finished dock's centre.
export const DOCK_REACH = 24;
// Wanderers of the market: base sale price in credits per unit (rules.sell moves it).
export const BASE_PRICE = { ore: 3, food: 3, parts: 10, water: 1, air: 2, alloy: 12, helium: 30, coffee: 4, wine: 5, art: 9 };   // version 10: the luxuries

export const BUILDINGS = [
  { key: 'command', name: 'Command Centre', cat: 'core', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], fixed: true,
    cost: { credits: 0, parts: 0 }, days: 0, jobs: 0, upkeep: 0, power: 20, makes: { air: 60, water: 10, parts: 2, food: 15 }, housing: 20,
    storage: { food: 300, water: 300, air: 300, parts: 300, ore: 200, alloy: 100, helium: 50 },
    text: 'The Governor\'s seat: a small reactor, air plant, ration stores, workshop and stores. Lose it and the colony is lost.' },
  { key: 'dock', name: 'Dock', cat: 'core', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 400, parts: 40 }, days: 6, jobs: 4, upkeep: 6, power: -4, radius: 24,
    text: 'Opens the hull to space: space buildings must stand within its reach. Transports land here.' },
  { key: 'repairyard', name: 'Repair Yard', cat: 'core', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 250, parts: 20 }, days: 4, jobs: 6, upkeep: 4, power: -3,
    levels: [{ crews: 1 }, { crews: 2, cost: { credits: 300, parts: 40 } }, { crews: 3, cost: { credits: 500, parts: 80 } }],
    text: 'Ruess\'s crews. Each crew builds one thing at a time; more crews, more at once.' },
  { key: 'depot', name: 'Storage Depot', cat: 'core', size: 1, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void', 'asteroid', 'hull', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 80, parts: 5 }, days: 2, jobs: 0, upkeep: 1,
    storage: { food: 300 }, modes: [{ key: 'food', name: 'Food' }, { key: 'water', name: 'Water' }, { key: 'air', name: 'Air' }, { key: 'parts', name: 'Parts' }, { key: 'ore', name: 'Ore' }, { key: 'alloy', name: 'Alloy' }, { key: 'helium', name: 'Helium-3' }],
    text: 'Stores 300 of one good. Switch what it holds any time.' },
  // owner, 2026-11-05: "a big warehouse to store everything in general"
  { key: 'warehouse', name: 'Warehouse', cat: 'core', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 400, parts: 30 }, days: 4, jobs: 2, upkeep: 3, power: -2,
    storage: { food: 1000, water: 1000, air: 800, parts: 800, ore: 800, alloy: 400, helium: 200 },
    text: 'A big general store: room for 1,000 food and water, 800 air, parts and ore, 400 alloy and 200 helium-3, all at once.' },
  { key: 'reserve', name: 'Emergency Stores', cat: 'core', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 150, parts: 10 }, days: 2, jobs: 0, upkeep: 1, reserve: 200,
    text: 'Sealed rations, water tanks and air candles: 200 of each held back for a crisis. When a store runs dry the colony lives on these instead of going without, and they refill by themselves from spare stock.' },
  { key: 'granary', name: 'Granary', cat: 'core', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 1, upkeep: 2, storage: { food: 2500 },
    text: 'A great silo: stores 2,500 food, so a bad month is not a hungry one (and heavy relief convoys have something to carry).' },

  { key: 'road', name: 'Road', cat: 'core', size: 1, zone: 'road', on: ['deck', 'plain', 'fertile', 'poor', 'gate', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 5, parts: 1 }, days: 0, jobs: 0, upkeep: 0,
    text: 'Colonists walk and rovers drive only where there are roads. Click the start, then the end. Roads pass through gates between open chambers.' },

  { key: 'solar', name: 'Solar Array', cat: 'power', size: 1, zone: 'any', on: ['void', 'hull'], cost: { credits: 120, parts: 5 }, days: 2, jobs: 0, upkeep: 2, power: 12,
    levels: [{ power: 12 }, { power: 20, cost: { credits: 150, parts: 15 } }, { power: 30, cost: { credits: 250, parts: 30 } }],
    text: 'Clean, small power. On the hull or in open space near a dock.' },
  { key: 'induction', name: 'Induction Collector', cat: 'power', size: 2, zone: 'space', on: ['magnetic'], cost: { credits: 500, parts: 30 }, days: 6, jobs: 2, upkeep: 8, power: 60, unlock: { pop: 80 },
    text: 'Harvests a magnetic field: big, steady power. Only on a magnetic belt.' },
  { key: 'battery', name: 'Battery Bank', cat: 'power', size: 1, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void', 'hull', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 100, parts: 5 }, days: 2, jobs: 0, upkeep: 1, storage: { power: 100 }, unlock: { pop: 80 },
    text: 'Stores 100 power for a bad day. Power is otherwise never stored.' },

  { key: 'riverpump', name: 'River Pump', cat: 'life', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck', 'hills'], decks: ['upper', 'main'], adj: 'river', cost: { credits: 150, parts: 5 }, days: 3, jobs: 2, upkeep: 2, power: -4, makes: { water: 40 },
    text: 'Water from Eden\'s river or an upper-deck canal. Must stand beside it.' },
  { key: 'airplant', name: 'Air Plant', cat: 'life', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'conduit', 'rock'], decks: ['upper', 'main', 'lower'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 3, upkeep: 4, power: -10, uses: { water: 10 }, makes: { air: 60 },
    text: 'Splits water into air. Every colonist and every open chamber breathes.' },
  { key: 'grove', name: 'Forest Grove', cat: 'life', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'hills'], decks: ['upper', 'main'], cost: { credits: 40, parts: 0 }, days: 3, jobs: 0, upkeep: 0, uses: { water: 1 }, makes: { air: 6 }, radius: 4, park: 6,
    text: 'A stand of young trees: a little air with no power, and a pleasant place nearby.' },
  { key: 'seal', name: 'Bulkhead Seal', cat: 'life', size: 1, zone: 'wall', on: ['breach'], decks: ['upper', 'main', 'lower'], cost: { credits: 30, parts: 10 }, days: 2, jobs: 0, upkeep: 0,
    text: 'Patches one breach. Seal every breach of a chamber, then pressurise it.' },

  { key: 'farm', name: 'Farm Field', cat: 'food', size: 2, zone: 'interior', on: ['plain', 'fertile', 'poor'], decks: ['upper', 'main'], cost: { credits: 120, parts: 5 }, days: 3, jobs: 4, upkeep: 2, uses: { water: 6 }, makes: { food: 12 },
    modes: [{ key: 'grain', name: 'Grain', text: 'Food by soil: fertile ×1.8, poor ×0.55; +25% beside a river or canal.' },
            { key: 'cash', name: 'Cash crop', text: 'Credits instead: food ×0.4, +8 credits a day.' },
            { key: 'fallow', name: 'Fallow', text: 'Nothing grows; after 30 days its poor soil becomes plain.' }],
    text: 'Fields on Eden\'s soil, on the main deck or in the upper deck\'s gardens. Fertile ground and water beside it make all the difference.' },
  { key: 'hydro', name: 'Hydroponics Bay', cat: 'food', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'conduit', 'rock'], decks: ['upper', 'main', 'lower'], cost: { credits: 200, parts: 10 }, days: 3, jobs: 2, upkeep: 3, power: -6, uses: { water: 4 }, makes: { food: 10 },
    text: 'Food from power and water, on any floor. Dull and reliable.' },

  { key: 'oremine', name: 'Ore Mine', cat: 'industry', size: 2, zone: 'space', on: ['asteroid'], cost: { credits: 350, parts: 20 }, days: 5, jobs: 4, upkeep: 6, power: -8, makes: { ore: 15 }, unlock: { pop: 80 },
    text: 'Mines an asteroid. Double on an ore seam. Sell the ore at the dock.' },
  { key: 'salvage', name: 'Salvage Yard', cat: 'industry', size: 2, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void', 'rock', 'conduit'], decks: ['main', 'lower'], cost: { credits: 250, parts: 10 }, days: 4, jobs: 4, upkeep: 2, power: -4, radius: 6, makes: { parts: 10 }, unlock: { pop: 80 },
    modes: [{ key: 'fast', name: 'Fast', text: 'Strip it quickly: full rate.' },
            { key: 'careful', name: 'Careful', text: 'Half the rate, double the parts from each tile.' }],
    text: 'Turns rubble and wrecks in range into parts, clearing the ground as it goes.' },

  { key: 'habitat', name: 'Habitat', cat: 'homes', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 100, parts: 5 }, days: 2, jobs: 0, upkeep: 2, power: -2, housing: 20,
    levels: [{ housing: 20, name: 'Shelter' }, { housing: 40, name: 'Quarters', needs: ['allNeeds', 'park'] }, { housing: 70, name: 'Apartments', needs: ['allNeeds', 'park', 'clinic'] }],
    text: 'Homes that grow by themselves when their needs are met. Its panel lists what is missing.' },
  // ---------------------------------------------------------------- version 2 (docs/COLONY-V2.md)
  // `tech` = the tech (data/tech.js) that unlocks it. Numbers are first guesses for the balance pass.
  { key: 'lab', name: 'Research Lab', cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 400, parts: 30 }, days: 5, jobs: 4, upkeep: 4, power: -8, makes: { research: 4 }, unlock: { pop: 80 },
    levels: [{ makes: { research: 4 } }, { makes: { research: 7 }, cost: { credits: 400, parts: 40 } }, { makes: { research: 11 }, cost: { credits: 700, parts: 80 } }],
    text: 'Research points for the tech tree. Pick what to study in the Research panel.' },
  { key: 'reclaimer', name: 'Water Reclaimer', cat: 'life', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 180, parts: 15 }, days: 3, jobs: 1, upkeep: 2, power: -3, makes: { water: 25 }, tech: 'reclaim',
    levels: [{ makes: { water: 25 } }, { makes: { water: 40 }, cost: { credits: 150, parts: 15 } }, { makes: { water: 60 }, cost: { credits: 250, parts: 30 } }],
    text: 'Recycles the colony\'s water: no river needed.' },
  { key: 'iceharvester', name: 'Ice Harvester', cat: 'life', size: 2, zone: 'space', on: ['comet'], cost: { credits: 400, parts: 30 }, days: 5, jobs: 3, upkeep: 4, power: -6, makes: { water: 80 }, tech: 'cometice',
    text: 'Melts the comet\'s icy tail into water. Only on the comet tail.' },
  { key: 'gasscoop', name: 'Gas Scoop', cat: 'life', size: 2, zone: 'space', on: ['atmosphere'], cost: { credits: 450, parts: 35 }, days: 6, jobs: 3, upkeep: 5, power: -8, makes: { air: 50 }, tech: 'gasscoop',
    text: 'Skims air from the top of Earth\'s atmosphere. Tether Masts carry the dock\'s reach down to it.' },
  { key: 'orchard', name: 'Orchard Terrace', cat: 'food', size: 2, zone: 'interior', on: ['hills'], decks: ['upper', 'main'], cost: { credits: 160, parts: 8 }, days: 4, jobs: 3, upkeep: 2, uses: { water: 4 }, makes: { food: 10, credits: 3 }, tech: 'orchards',
    text: 'Fruit on the hills: food and a little money.' },
  { key: 'fishery', name: 'Fishery', cat: 'food', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck', 'hills'], decks: ['upper', 'main'], adj: 'river', cost: { credits: 140, parts: 8 }, days: 3, jobs: 2, upkeep: 2, makes: { food: 14 }, tech: 'orchards',
    text: 'Fish from Eden\'s river or an upper-deck canal. Must stand beside it.' },
  { key: 'canteen', name: 'Canteen', cat: 'food', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 150, parts: 10 }, days: 3, jobs: 2, upkeep: 2, power: -3, uses: { food: 4 }, radius: 8, service: 5, tech: 'canteens',
    modes: [{ key: 'meals', name: 'Hot meals', text: 'Happiness for homes in range.' },
            { key: 'ration', name: 'Rationing', text: 'The colony eats a fifth less; no hot meals, and everyone is a little less happy.' }],
    text: 'Hot meals: happiness for the homes in range. Can ration food in a pinch.' },
  { key: 'seedvault', name: 'Seed Vault', cat: 'food', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor'], decks: ['upper', 'main'], cost: { credits: 200, parts: 15 }, days: 4, jobs: 1, upkeep: 2, radius: 5, tech: 'seeds',
    text: 'Mends the soil around it: a poor tile in range becomes plain every 10 days.' },
  { key: 'smelter', name: 'Smelter', cat: 'industry', size: 2, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock', 'conduit'], decks: ['main', 'lower'], cost: { credits: 350, parts: 25 }, days: 5, jobs: 4, upkeep: 4, power: -12, uses: { ore: 20 }, makes: { alloy: 10 }, tech: 'smelting',
    text: 'Melts ore into alloy. Alloy sells well and feeds the Fabricator.' },
  { key: 'fabricator', name: 'Fabricator', cat: 'industry', size: 2, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock', 'conduit'], decks: ['main', 'lower'], cost: { credits: 400, parts: 30 }, days: 5, jobs: 4, upkeep: 4, power: -10, uses: { alloy: 10 }, makes: { parts: 15 }, tech: 'fabrication',
    text: 'Turns alloy into parts: the colony makes its own.' },
  { key: 'sweeper', name: 'Meteoroid Sweeper', cat: 'industry', size: 1, zone: 'space', on: ['meteoroid'], cost: { credits: 150, parts: 12 }, days: 3, jobs: 1, upkeep: 2, power: -3, makes: { ore: 6, water: 6 }, tech: 'sweeping',
    text: 'Gathers ore and ice from a meteoroid drift. Now and then a strike stops it for a few days.' },
  { key: 'tailings', name: 'Tailings Dump', cat: 'industry', size: 2, zone: 'space', on: ['void', 'asteroid'], cost: { credits: 200, parts: 10 }, days: 3, jobs: 0, upkeep: 1, tech: 'smelting',
    text: 'Takes the waste of the mines: more than four Ore Mines need one per four. It fills up; empty it (an order) before it is full.' },
  { key: 'plasmaskimmer', name: 'Plasma Skimmer', cat: 'industry', size: 2, zone: 'space', on: ['plasma'], cost: { credits: 500, parts: 40 }, days: 6, jobs: 2, upkeep: 5, power: -6, makes: { helium: 6 }, tech: 'plasma',
    text: 'Draws helium-3 from a plasma cloud: the most valuable cargo Earth will buy.' },
  { key: 'tether', name: 'Tether Mast', cat: 'core', size: 1, zone: 'space', on: ['void', 'asteroid', 'magnetic', 'meteoroid', 'comet', 'plasma', 'atmosphere'], cost: { credits: 120, parts: 12 }, days: 3, jobs: 0, upkeep: 1, power: -1, radius: 16, tech: 'tethers',
    text: 'Carries the dock\'s reach 16 tiles further: build space buildings around it. Masts can chain.' },
  { key: 'dronebay', name: 'Survey Drone Bay', cat: 'core', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 250, parts: 20 }, days: 4, jobs: 2, upkeep: 2, power: -3, radius: 40, tech: 'drones',
    text: 'Drones can survey any sealed chamber within 40 tiles, not only those next to open ones.' },
  { key: 'clinic', name: 'Clinic', cat: 'services', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 250, parts: 20 }, days: 4, jobs: 3, upkeep: 3, power: -4, radius: 8, service: 6, tech: 'medicine',
    levels: [{ name: 'Clinic', radius: 8 }, { name: 'Medical Centre', radius: 12, cost: { credits: 300, parts: 30 } }, { name: 'Hospital', radius: 16, cost: { credits: 600, parts: 60 } }],
    modes: [{ key: 'full', name: 'Full care', text: 'Happiness and children in range.' },
            { key: 'triage', name: 'Triage', text: 'Half the upkeep, half the happiness.' }],
    text: 'Health care: happiness in range, children are born, and Habitats in range can grow into Apartments.' },
  { key: 'safetypost', name: 'Safety Post', cat: 'services', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 180, parts: 12 }, days: 3, jobs: 2, upkeep: 2, power: -2, radius: 10, service: 4, tech: 'safety',
    text: 'Wardens and breach crews: calmer homes in range, and Bulkhead Seals in range go up twice as fast.' },
  { key: 'obsdeck', name: 'Observation Deck', cat: 'services', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 300, parts: 20 }, days: 5, jobs: 1, upkeep: 2, power: -2, tech: 'observation',
    text: 'A window on Earth below: +3 happiness for the whole colony (the first one). Only on the hull facing Earth.' },
  // ---------------------------------------------------------------- version 3 (docs/COLONY-V3.md)
  // Machines (data/machines.js) are built with credits and parts (owner): price × 10 credits, price parts.
  { key: 'arsenal', name: 'Arsenal', cat: 'defence', size: 3, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock', 'conduit'], decks: ['main', 'lower'], cost: { credits: 600, parts: 50 }, days: 6, jobs: 6, upkeep: 6, power: -10, unlock: { pop: 80 }, builds: 'arsenal',
    text: 'Builds Earth Light machines: HU mecha, fighters, armour and batteries, for credits and parts. One at a time; more research, stronger machines.' },
  { key: 'shipyard', name: 'Shipyard', cat: 'defence', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 1200, parts: 100 }, days: 10, jobs: 10, upkeep: 12, power: -20, tech: 'shipyard', builds: 'shipyard',
    text: 'Builds capital ships on the hull: carriers, cruisers and battleships.' },
  { key: 'barracks', name: 'Guardian Barracks', cat: 'defence', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 0, upkeep: 3, power: -3, crews: 6, unlock: { pop: 80 },
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
  { key: 'fusion', name: 'Fusion Reactor', cat: 'power', size: 3, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock', 'conduit'], decks: ['main', 'lower'], cost: { credits: 1500, parts: 120 }, days: 10, jobs: 8, upkeep: 15, power: 200, uses: { helium: 2 }, tech: 'fusion',
    modes: [{ key: 'normal', name: 'Normal', text: '200 power.' }, { key: 'overdrive', name: 'Overdrive', text: '+50% power, twice the helium, and a small chance each day of a 5-day shutdown.' }],
    text: 'Burns helium-3 for 200 power: a city\'s worth.' },
  { key: 'mushroom', name: 'Mushroom Wall', cat: 'food', size: 1, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 180, parts: 12 }, days: 3, jobs: 1, upkeep: 2, power: -2, makes: { food: 10 }, tech: 'fungi',
    text: 'Food grown on the colony\'s waste: no water, no soil.' },
  { key: 'terrace', name: 'Terrace Homes', cat: 'homes', size: 2, zone: 'interior', on: ['hills'], decks: ['upper', 'main'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 0, upkeep: 3, power: -3, housing: 60, radius: 4, service: 3, tech: 'terraces',
    text: 'Roomy homes on the hills for 60: they make their neighbours happier too.' },
  { key: 'lodge', name: 'Wanderers\' Lodge', cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], decks: ['upper', 'main'], cost: { credits: 400, parts: 25 }, days: 5, jobs: 2, upkeep: 4, power: -3, tech: 'leadership',
    levels: [{ name: 'Lodge' }, { name: 'Inn', cost: { credits: 400, parts: 30 } }, { name: 'Grand Lodge', cost: { credits: 700, parts: 60 } }],
    text: 'Wanderers stop here: pilots, captains and engineers adrift since the war. Invite the best as commanders. Bigger lodges draw more.' },
  { key: 'quarters', name: 'Officers\' Quarters', cat: 'services', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 300, parts: 20 }, days: 4, jobs: 0, upkeep: 3, power: -2, tech: 'leadership',
    text: 'Room for two more commanders.' },
  // ---------------------------------------------------------------- version 4 (docs/COLONY-V4.md): decks
  // `decks`: which decks it may stand on ('upper' | 'main' | 'lower'); absent = the main deck only.
  { key: 'lift', name: 'Lift', cat: 'core', size: 2, zone: 'interior', on: ['shaft'], decks: ['upper', 'main', 'lower'], cost: { credits: 400, parts: 40 }, days: 6, jobs: 1, upkeep: 3, power: -6,
    text: 'Repairs a lift shaft: the chambers it passes through on every deck can be surveyed from here, and roads and people ride it.' },
  { key: 'skygarden', name: 'Sky Garden', cat: 'homes', size: 2, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck', 'hills'], decks: ['upper'], cost: { credits: 220, parts: 10 }, days: 4, jobs: 1, upkeep: 2, uses: { water: 3 }, makes: { air: 10 }, radius: 7, park: 10,
    text: 'Gardens under the sky panels: air, and the best park rating in Eden for homes nearby.' },
  { key: 'gallery', name: 'Gallery', cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'poor', 'fertile'], decks: ['upper', 'main'], cost: { credits: 350, parts: 20 }, days: 5, jobs: 3, upkeep: 3, power: -4, radius: 10, service: 5,
    text: 'Concerts and exhibitions in the old galleries: happiness for homes in range.' },
  { key: 'cistern', name: 'Water Cistern', cat: 'life', size: 2, zone: 'interior', on: ['deck', 'conduit', 'rock'], decks: ['lower'], cost: { credits: 250, parts: 15 }, days: 4, jobs: 0, upkeep: 1, storage: { water: 1000 },
    text: 'A great tank in the lower deck: stores 1,000 water.' },
  { key: 'geotap', name: 'Geothermal Tap', cat: 'power', size: 2, zone: 'interior', on: ['conduit', 'rock'], decks: ['lower'], cost: { credits: 600, parts: 50 }, days: 6, jobs: 3, upkeep: 6, power: 70,
    text: 'Draws heat from the colony\'s old core under the lower deck: steady power with no fuel.' },
  { key: 'pumpstation', name: 'Pump Station', cat: 'life', size: 1, zone: 'interior', on: ['deck', 'conduit', 'plain', 'poor', 'rock'], decks: ['main', 'lower'], cost: { credits: 200, parts: 15 }, days: 3, jobs: 1, upkeep: 2, power: -5, radius: 6,
    text: 'Drains flooded ground in range, a tile every 5 days, leaving buildable floor.' },
  { key: 'park', name: 'Park', cat: 'homes', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck', 'conduit', 'rock'], decks: ['upper', 'main', 'lower'], cost: { credits: 60, parts: 0 }, days: 1, jobs: 0, upkeep: 1, uses: { water: 1 }, radius: 6, park: 8,
    text: 'Raises happiness in range, up to its rating. Costs water, not power.' },
  // ---------------------------------------------------------------- version 6 (docs/COLONY-V6.md): the big city
  // `reserve`: emergency food, water and air held back (each), drawn only when the stores run dry (sim.js needs).
  { key: 'vertfarm', name: 'Vertical Farm', cat: 'food', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 2400, parts: 160 }, days: 10, jobs: 30, upkeep: 14, power: -40, uses: { water: 120 }, makes: { food: 800 }, tech: 'vertfarm',
    text: 'Forty storeys of lit trays: 800 food a day on any floor, for power and water. Feeds a city.' },
  { key: 'waterworks', name: 'Water Works', cat: 'life', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 2000, parts: 140 }, days: 10, jobs: 16, upkeep: 12, power: -45, makes: { water: 1800 }, tech: 'waterworks',
    text: 'Condensers, filters and the colony\'s whole grey-water loop in one plant: 1,800 water a day.' },
  { key: 'atmoproc', name: 'Atmosphere Processor', cat: 'life', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 2200, parts: 150 }, days: 10, jobs: 16, upkeep: 12, power: -50, uses: { water: 150 }, makes: { air: 1800 }, tech: 'atmoproc',
    text: 'A cathedral of electrolysis stacks and scrubbers: 1,800 air a day, enough for a city and its chambers.' },
  { key: 'sunmirror', name: 'Sun Mirror', cat: 'power', size: 2, zone: 'space', on: ['void'], cost: { credits: 1600, parts: 120 }, days: 8, jobs: 4, upkeep: 10, power: 350, tech: 'mirrors',
    text: 'A great foil mirror in open space focusing sunlight on a boiler: 350 power with no fuel. Near a dock or a Tether Mast.' },
  { key: 'towerblock', name: 'Tower Block', cat: 'homes', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 700, parts: 50 }, days: 6, jobs: 0, upkeep: 6, power: -10, housing: 150, tech: 'highrise',
    levels: [{ housing: 150, name: 'Block' }, { housing: 300, name: 'Tower', needs: ['allNeeds', 'park'] }, { housing: 450, name: 'Spire', needs: ['allNeeds', 'park', 'clinic'] },
      { housing: 600, name: 'Skyscraper', power: -14, needs: ['allNeeds', 'park', 'clinic', 'transit', 'tech:skyscrapers', 'luxuries'] }],   // version 9: the 4th level; version 10: luxuries
    text: 'High-rise homes for 150 that grow, like Habitats, into Towers (300) and Spires (450) when their needs are met, and with Skyscrapers and transit in reach into a Skyscraper (600), which also wants coffee and wine (Luxury Goods).' },
  { key: 'arcology', name: 'Arcology', cat: 'homes', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 5000, parts: 400 }, days: 16, jobs: 250, upkeep: 30, power: -60, housing: 1500, radius: 5, park: 8, tech: 'arcology',
    text: 'A city in one building: homes for 1,500, shops, schools and workshops inside (250 jobs), and roof gardens that count as a park nearby.' },
  { key: 'arrivals', name: 'Arrivals Hall', cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['main'], cost: { credits: 1200, parts: 80 }, days: 8, jobs: 12, upkeep: 8, power: -8, tech: 'immigration',
    text: 'Customs, quarantine and a warm welcome by the dock: every transport brings half as many colonists again (up to three halls).' },
  { key: 'plaza', name: 'Civic Plaza', cat: 'services', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 1800, parts: 100 }, days: 8, jobs: 20, upkeep: 10, power: -10, radius: 16, service: 8, park: 6, tech: 'civics',
    text: 'A town hall, school and market around a fountain square: happiness for every home within 16 tiles, and a park as well.' },
  { key: 'massdriver', name: 'Mass Driver', cat: 'core', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 3000, parts: 250 }, days: 12, jobs: 20, upkeep: 15, power: -60, tech: 'massdriver',
    modes: [{ key: 'manual', name: 'Manual', text: 'Heavy convoys are launched from the Market.' },
            { key: 'auto', name: 'Automatic', text: 'Launches a heavy convoy a day by itself, of whatever Eden can best spare, always keeping ten days of needs at home.' }],
    text: 'A magnetic rail on the hull that throws cargo pods down to Earth: a relief convoy becomes a heavy launch of three loads. Can run by itself.' },
  // ---------------------------------------------------------------- version 7 (docs/COLONY-V7.md): zoning and growth
  // Retired on 2026-11-07 (docs/COLONY-V9.md), then reinstated the same day (owner: "reinstate the quads but make r, c,
  // and i gauge more lenient ... so that it will build faster"; docs/COLONY-V7.md "Reinstated"): on the menu again from
  // day 1, with stronger demand (rules demandOf), 2 days a level (1 near transit, sim.js SIM.quadGrowDays) and lighter
  // early levels: Cottages and Row Houses want only demand and the colony's needs met.
  // Quads (`quad`: 'R' | 'C' | 'I'): cheap 2×2 lots that develop by themselves, level by level, like Habitats (sim.js
  // step 8, rules GROW_KEYS). Level 1 is the empty lot; each level's fields override the table's (rules.spec).
  // `shoppers`: the residents a Market Quad level serves (commercial demand, rules demandOf); `nuisance`: a Workshop
  // Quad's noise, the gap in tiles within which Living Quads cannot hold Row Houses or more ('quiet').
  // Level needs (rules habitatNeeds): 'allNeeds' | 'park' | 'clinic' | 'school' | 'transit' | 'freight' | 'shops' | 'quiet'
  // | 'demand:R|C|I' | 'happy:N' | 'residents:N' (homes within 12 tiles) | 'tech:<key>'. Demand, happiness and tech
  // only gate growing; the others must also hold, or the quad shrinks back after SIM.quadShrinkDays (20 days).
  // Version 11 (docs/COLONY-V11.md, owner 2026-11-08: "The quad zones should have more levels"): eight built levels
  // each (lot + 8), with two merged levels on top (`mega`: 2 or 4, never grown into: two or four neighbouring quads of
  // the same kind at the top level merge, js/colony/network.js megaDay). New levels were inserted, so a version 10 save's
  // levels are remapped on load (rules.QUAD_REMAP). From Courtyard Flats / Market Hall / Works up a quad needs a road
  // beside it to grow (rules.ROAD_GATE, only gates growing); 'monorail': on a monorail line (network.js).
  { key: 'livingquad', name: 'Living Quad', ver: 7, quad: 'R', cat: 'homes', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 120, parts: 5 }, days: 2, jobs: 0, upkeep: 1, power: 0, housing: 0,
    levels: [{ name: 'Zoned lot', housing: 0, power: 0, upkeep: 1 },
      { name: 'Cottages', housing: 40, power: -2, upkeep: 2, needs: ['demand:R'] },
      { name: 'Row Houses', housing: 100, power: -4, upkeep: 3, needs: ['demand:R', 'allNeeds'] },
      { name: 'Courtyard Flats', housing: 220, power: -8, upkeep: 5, needs: ['demand:R', 'allNeeds', 'park', 'clinic', 'quiet'] },
      { name: 'Garden Terraces', housing: 300, power: -11, upkeep: 6, needs: ['demand:R', 'allNeeds', 'park', 'clinic', 'quiet', 'shops', 'happy:50'] },
      { name: 'Mid-rise', housing: 400, power: -14, upkeep: 8, needs: ['demand:R', 'allNeeds', 'park', 'clinic', 'quiet', 'shops', 'school', 'happy:55', 'tech:urbanplan'] },
      { name: 'Residential Tower', housing: 700, power: -24, upkeep: 12, needs: ['demand:R', 'allNeeds', 'park', 'clinic', 'quiet', 'shops', 'school', 'transit', 'happy:60', 'tech:skyscrapers'] },
      { name: 'Sky Tower', housing: 1000, power: -34, upkeep: 16, needs: ['demand:R', 'allNeeds', 'park', 'clinic', 'quiet', 'shops', 'school', 'transit', 'happy:62', 'value:45', 'tech:skyscrapers'] },
      { name: 'Crown Spire', housing: 1400, power: -46, upkeep: 22, needs: ['demand:R', 'allNeeds', 'park', 'clinic', 'quiet', 'shops', 'school', 'monorail', 'luxuries', 'happy:65', 'value:55', 'tech:arcology'] },
      { name: 'Twin Spires', mega: 2, housing: 1750, power: -52, upkeep: 22, service: 3, radius: 12 },
      { name: 'Arcology Crown', mega: 4, housing: 2100, power: -56, upkeep: 22, service: 5, radius: 16 }],
    text: 'Zone a residential lot: it builds itself up, from Cottages (40) to a Crown Spire (1,400), while people want homes and the street has what it needs. Two or four Crown Spires side by side merge into Twin Spires or an Arcology Crown.' },
  { key: 'marketquad', name: 'Market Quad', ver: 7, quad: 'C', cat: 'homes', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 150, parts: 10 }, days: 2, jobs: 0, upkeep: 1, power: 0,
    levels: [{ name: 'Market lot', jobs: 0, power: 0, upkeep: 1 },
      { name: 'Stalls', jobs: 6, power: -2, upkeep: 1, makes: { credits: 15 }, shoppers: 150, service: 2, radius: 8, needs: ['demand:C', 'residents:20'] },
      { name: 'Shops', jobs: 15, power: -4, upkeep: 2, makes: { credits: 40 }, shoppers: 400, service: 3, radius: 9, needs: ['demand:C', 'residents:60', 'allNeeds'] },
      { name: 'Market Hall', jobs: 30, power: -8, upkeep: 4, makes: { credits: 90 }, shoppers: 900, service: 4, radius: 10, needs: ['demand:C', 'residents:200', 'allNeeds', 'tech:commerce'] },
      { name: 'Arcade', jobs: 55, power: -14, upkeep: 7, makes: { credits: 180 }, shoppers: 1800, service: 5, radius: 12, needs: ['demand:C', 'residents:500', 'allNeeds', 'happy:55', 'tech:urbanplan'] },
      { name: 'Galleria', jobs: 75, power: -18, upkeep: 9, makes: { credits: 260 }, shoppers: 2600, service: 5, radius: 13, needs: ['demand:C', 'residents:800', 'allNeeds', 'happy:57', 'tech:urbanplan'] },
      { name: 'Trade Tower', jobs: 100, power: -24, upkeep: 12, makes: { credits: 360 }, shoppers: 3500, service: 6, radius: 14, needs: ['demand:C', 'residents:1200', 'allNeeds', 'transit', 'happy:60', 'tech:skyscrapers'] },
      { name: 'Exchange', jobs: 140, power: -32, upkeep: 16, makes: { credits: 520 }, shoppers: 5000, service: 7, radius: 15, needs: ['demand:C', 'residents:2000', 'allNeeds', 'monorail', 'happy:62', 'value:45', 'tech:skyscrapers'] },
      { name: 'Grand Bazaar', jobs: 190, power: -42, upkeep: 20, makes: { credits: 720 }, shoppers: 7000, service: 8, radius: 16, needs: ['demand:C', 'residents:3000', 'allNeeds', 'monorail', 'luxuries', 'happy:65', 'value:55', 'tech:luxuries'] },
      { name: 'Grand Concourse', mega: 2, jobs: 240, power: -48, upkeep: 20, makes: { credits: 900 }, shoppers: 8750, service: 9, radius: 20 },
      { name: 'Megamall', mega: 4, jobs: 285, power: -52, upkeep: 20, makes: { credits: 1080 }, shoppers: 10500, service: 10, radius: 24 }],
    text: 'Zone a commercial lot: stalls grow into shops, a market hall, an Exchange and a Grand Bazaar while there are shoppers. Jobs, credits, and shopping for the homes around it. From the Arcade up, with Skyscrapers known, it is a monorail station.' },
  { key: 'workshopquad', name: 'Workshop Quad', ver: 7, quad: 'I', cat: 'homes', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 150, parts: 10 }, days: 2, jobs: 0, upkeep: 1, power: 0,
    levels: [{ name: 'Industrial lot', jobs: 0, power: 0, upkeep: 1 },
      { name: 'Workshops', jobs: 10, power: -3, upkeep: 1, makes: { parts: 3 }, nuisance: 2, needs: ['demand:I'] },
      { name: 'Machine Shops', jobs: 24, power: -6, upkeep: 2, makes: { parts: 7 }, nuisance: 3, needs: ['demand:I', 'allNeeds'] },
      { name: 'Works', jobs: 45, power: -12, upkeep: 4, makes: { parts: 12, alloy: 2 }, nuisance: 4, needs: ['demand:I', 'allNeeds', 'tech:lightindustry'] },
      { name: 'Foundry', jobs: 60, power: -16, upkeep: 5, makes: { parts: 15, alloy: 4 }, nuisance: 4, needs: ['demand:I', 'allNeeds', 'tech:lightindustry'] },
      { name: 'Assembly Plant', jobs: 80, power: -22, upkeep: 7, makes: { parts: 20, alloy: 5 }, nuisance: 5, needs: ['demand:I', 'allNeeds', 'freight', 'tech:urbanplan'] },
      { name: 'Factory', jobs: 140, power: -40, upkeep: 12, makes: { parts: 35, alloy: 10 }, nuisance: 6, needs: ['demand:I', 'allNeeds', 'freight', 'tech:automation'] },
      { name: 'Robotic Works', jobs: 170, power: -55, upkeep: 16, makes: { parts: 50, alloy: 15 }, nuisance: 6, needs: ['demand:I', 'allNeeds', 'freight', 'transit', 'tech:automation'] },
      { name: 'Megafactory', jobs: 210, power: -75, upkeep: 20, makes: { parts: 70, alloy: 22 }, nuisance: 7, needs: ['demand:I', 'allNeeds', 'freight', 'monorail', 'tech:heavyworks'] },
      { name: 'Industrial Complex', mega: 2, jobs: 260, power: -85, upkeep: 20, makes: { parts: 88, alloy: 28 }, nuisance: 7 },
      { name: 'Gigafactory', mega: 4, jobs: 315, power: -90, upkeep: 20, makes: { parts: 105, alloy: 33 }, nuisance: 7 }],
    text: 'Zone an industrial lot: workshops grow into a Factory and a Megafactory while people want work. Jobs and parts (alloy later), but the noise keeps Living Quads nearby small.' },
  { key: 'school', name: 'School', ver: 7, cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 500, parts: 30 }, days: 5, jobs: 8, upkeep: 4, power: -4, radius: 10, service: 3, makes: { research: 2 }, tech: 'schooling',
    text: 'Classrooms and a playing field: happiness for homes in range, a little research, and Living Quads in range can grow into Mid-rises.' },
  { key: 'transit', name: 'Transit Station', ver: 7, cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 900, parts: 60 }, days: 6, jobs: 10, upkeep: 6, power: -10, radius: 10, service: 2, tech: 'urbanplan',
    text: 'Trams through the chambers: Habitats and Tower Blocks in range grow in 2 days instead of 5, quads in 1 day instead of 2, and Tower Blocks and quads in range can reach their top level.' },
  { key: 'monorail', name: 'Monorail Stop', ver: 7, cat: 'services', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 800, parts: 60 }, days: 5, jobs: 4, upkeep: 6, power: -8, radius: 16, service: 2, tech: 'skyscrapers',
    text: 'A stop on the high line: a Transit Station on one tile, reaching 16 tiles. Stops (and Market Quads from the Arcade up) link by themselves into elevated lines: everything within 3 tiles of a line counts as near transit.' },
  { key: 'freightyard', name: 'Freight Yard', ver: 7, cat: 'industry', size: 2, zone: 'interior', on: ['deck', 'plain', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 600, parts: 40 }, days: 5, jobs: 8, upkeep: 4, power: -6, radius: 10, storage: { parts: 300, alloy: 200 }, tech: 'lightindustry',
    text: 'Cranes and containers: stores 300 parts and 200 alloy; Smelters, Fabricators and Workshop Quads in range make a quarter more, and Workshop Quads in range can grow into Assembly Plants and Factories.' },
  // ---------------------------------------------------------------- version 8 (docs/COLONY-V8.md): landmarks and incidents
  // Landmarks (`landmark`): one per colony, big and slow to build, each with a lasting bonus (js/colony/landmarks.js reads
  // them). `landmark` lists the requirement, met once and then kept: { pop, chambers: N | 'main' (every main-deck
  // chamber open), happyDays (happiness of 70 or more held that many days in a row), tech: [keys] }, and `effect` in words.
  // They carry no top-level `tech`: the requirement, not the research menu, opens them.
  { key: 'workshop', name: 'Ruess\'s Workshop', ver: 8, cat: 'landmarks', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 3000, parts: 250 }, days: 14, jobs: 12, upkeep: 10, power: -15,
    landmark: { chambers: 10, tech: ['fabrication'], effect: 'Two more construction crews, and every building costs a tenth less.' },
    text: 'The professor\'s own works: a great hall of lathes, cranes and drafting tables. Two more construction crews, and every building costs a tenth less.' },
  { key: 'govgarden', name: 'Governor\'s Garden', ver: 8, cat: 'landmarks', size: 3, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck', 'hills'], decks: ['upper', 'main'], cost: { credits: 2500, parts: 150 }, days: 12, jobs: 6, upkeep: 8, uses: { water: 10 }, makes: { air: 30 }, radius: 12, park: 12,
    landmark: { pop: 500, happyDays: 30, effect: '+5 happiness for the whole colony, and the finest park in Eden for every home within 12 tiles.' },
    text: 'Terraced lawns, a glasshouse and a lake around the Governor\'s old pavilion: +5 happiness colony-wide and a park rating of 12 within 12 tiles.' },
  { key: 'observatory', name: 'Sato\'s Watch', ver: 8, cat: 'landmarks', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main'], cost: { credits: 2400, parts: 200 }, days: 12, jobs: 8, upkeep: 8, power: -12, makes: { research: 4 },
    landmark: { pop: 300, tech: ['sensors', 'observation'], effect: 'Incidents and raids are seen 3 days earlier, and the telescopes make 4 research a day.' },
    text: 'An observatory with a great domed telescope and Sato\'s watch room: incidents and raids are seen 3 days earlier, and 4 research a day.' },
  { key: 'lantern', name: 'The Lantern', ver: 8, cat: 'landmarks', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['main'], cost: { credits: 4000, parts: 300 }, days: 16, jobs: 10, upkeep: 12, power: -40,
    landmark: { chambers: 'main', effect: 'Transports bring a quarter more colonists, relief convoys pay half as much again, and +3 happiness.' },
    text: 'A tower of light that Earth can see from the night side: transports bring a quarter more colonists, relief convoys pay half as much again, +3 happiness.' },
  { key: 'hallofnames', name: 'Hall of Names', ver: 8, cat: 'landmarks', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 3000, parts: 200 }, days: 14, jobs: 6, upkeep: 8, power: -8,
    landmark: { pop: 1000, tech: ['civics'], effect: '+4 happiness (+3 more once it holds the Ninefold registry), and grief and fear fade twice as fast.' },
    text: 'A quiet hall of lamps where Eden remembers its dead: +4 happiness, more once it holds the Ninefold registry, and grief and fear fade twice as fast.' },
  { key: 'elevator', name: 'Orbital Elevator', ver: 8, cat: 'landmarks', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 8000, parts: 600 }, days: 20, jobs: 30, upkeep: 25, power: -80,
    landmark: { pop: 3000, tech: ['massdriver'], effect: 'Relief convoys cost half, and goods bought from Earth at the Market cost a quarter less.' },
    text: 'A cable down the gravity well to Earth\'s upper air, with climbers riding it: relief convoys cost half, and Earth goods at the Market cost a quarter less.' },
  // Incidents (js/colony/incidents.js): the Flare Shelter is what helps in a solar flare.
  { key: 'flareshelter', name: 'Flare Shelter', ver: 8, cat: 'power', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 400, parts: 30 }, days: 4, jobs: 1, upkeep: 3, power: -2, storage: { power: 150 }, tech: 'forecasting',
    text: 'Shielded rooms and a buried switchyard: in a solar flare, solar power drops by a quarter instead of half and nobody panics. Stores 150 power too.' },
  // ---------------------------------------------------------------- version 9 (docs/COLONY-V9.md): wonders, tourism, the Ark
  // Wonders (`wonder`, cat 'wonders'): a grander tier above the landmarks, one of a kind, with big footprints (6×6 to
  // 8×8 since version 11; the Ark 7×7), built in STAGES. Placing one orders its first stage (`cost`, `days`); each later stage is a level (`levels`,
  // ordered from its panel like an upgrade, with its own `cost` and `days`; a cost may include alloy, helium-3 and
  // food, water or air). Only the last stage works: its fields (jobs, upkeep, power, makes, park...) are the working
  // wonder's. `wonder` is the requirement, met once and kept, as a landmark's: { pop, tech: [keys], built: [landmark or
  // wonder keys that must stand finished] }, plus what the finished wonder does (js/colony/wonders.js reads them):
  //   tourism (attraction points), happy (colony-wide), value + valueRadius (land value nearby), research (a day per
  //   1,000 colonists), transport (× transports), visitors (× the visitors that can arrive), fade (× how fast grief and
  //   fear fade), megaproject (the Ark: the second ending)
  // Version 11 (docs/COLONY-V11.md, owner 2026-11-08: "The wonders are not so wonderful. You can make the size bigger
  // and harder to build, but with stronger perks."): every wonder but the Ark is two tiles bigger (`kitSize`: the size
  // its kit was drawn for, scaled up by kits.js), has a fourth stage and dearer stages, and much stronger perks:
  //   tourismMul (× all tourism), researchMul (× all research), happyPer + happyMax (+1 happiness per `happyPer`
  //   colonists, up to happyMax more), perPop ({ credits: n } a day per 1,000 colonists), noGrief (no grief or fear)
  { key: 'arboretum', name: 'Grand Arboretum', ver: 9, cat: 'wonders', size: 8, kitSize: 6, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck', 'hills'], decks: ['upper'], cost: { credits: 9000, parts: 600 }, days: 16, jobs: 0, upkeep: 4, power: 0,
    wonder: { pop: 5000, built: ['govgarden'], tech: ['monumental'], tourism: 60, happy: 6, value: 25, valueRadius: 260,
      effect: 'Air for 5,000 colonists (5,000 a day), land value +25 across its whole deck, +6 happiness for the whole colony, a park of 16 within 26 tiles, and 60 tourism.' },
    levels: [{ name: 'Terraces' }, { name: 'Canals', cost: { credits: 10000, parts: 700, alloy: 200 }, days: 16 },
      { name: 'Glasshouses', cost: { credits: 12000, parts: 900, alloy: 300 }, days: 18 },
      { name: 'Grand Arboretum', cost: { credits: 15000, parts: 1200, alloy: 400 }, days: 20, jobs: 60, upkeep: 30, uses: { water: 300 }, makes: { air: 5000 }, radius: 26, park: 16 }],
    text: 'A forest under glass on the upper deck\'s gardens: a great dome around a tree older than Eden, terraces and canals. Happiness everywhere, the finest park and the highest land value for streets around.' },
  { key: 'library', name: 'Great Library', ver: 9, cat: 'wonders', size: 7, kitSize: 5, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main'], cost: { credits: 8000, parts: 600 }, days: 14, jobs: 0, upkeep: 4, power: 0,
    wonder: { pop: 5000, built: ['hallofnames'], tech: ['monumental'], tourism: 35, research: 4, researchMul: 2, value: 12, valueRadius: 20,
      effect: 'The Archive of Earth: all the colony\'s research doubled, plus 4 research a day for every 1,000 colonists, land value +12 within 20 tiles, and 35 tourism.' },
    levels: [{ name: 'Foundations' }, { name: 'Stacks', cost: { credits: 9000, parts: 700, alloy: 150 }, days: 14 },
      { name: 'Reading Dome', cost: { credits: 11000, parts: 900, alloy: 250 }, days: 16 },
      { name: 'Great Library', cost: { credits: 13000, parts: 1000, alloy: 300 }, days: 18, jobs: 80, upkeep: 25, power: -50 }],
    text: 'The Archive of Earth: every book, film and song the colony could save, under a reading dome. Research grows with the city: 4 a day for every 1,000 colonists.' },
  { key: 'concerthall', name: 'Concert Hall', ver: 9, cat: 'wonders', size: 6, kitSize: 4, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main'], cost: { credits: 5000, parts: 300 }, days: 10, jobs: 0, upkeep: 3, power: 0,
    wonder: { pop: 2500, tech: ['monumental'], tourism: 30, happy: 6, tourismMul: 2, value: 12, valueRadius: 24,
      effect: 'Tourism doubled, +6 happiness for the whole colony and 10 more for every home within 28 tiles, land value +12 within 24 tiles, 5 leisure for visitors, and 30 tourism.' },
    levels: [{ name: 'Foundations' }, { name: 'Shell', cost: { credits: 6000, parts: 400, alloy: 120 }, days: 12 },
      { name: 'Auditoriums', cost: { credits: 7000, parts: 500, alloy: 160 }, days: 12 },
      { name: 'Concert Hall', cost: { credits: 8000, parts: 600, alloy: 200 }, days: 14, jobs: 40, upkeep: 18, power: -30, radius: 28, service: 10, leisure: 5 }],
    text: 'White shells of a roof over two auditoriums and a glass foyer: happiness for every home in a wide reach, higher land value, and a night out for visitors.' },
  { key: 'memorial', name: 'Memorial Garden', ver: 9, cat: 'wonders', size: 7, kitSize: 5, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck', 'hills'], decks: ['main'], cost: { credits: 5000, parts: 250 }, days: 10, jobs: 0, upkeep: 3, power: 0,
    wonder: { pop: 2500, built: ['hallofnames'], tech: ['monumental'], tourism: 40, happy: 8, fade: 2, noGrief: true, value: 12, valueRadius: 20,
      effect: 'Eden no longer grieves or fears: no unhappiness from raids or losses at all. +8 happiness for the whole colony, a park of 14 within 20 tiles, land value +12 within 20, and 40 tourism.' },
    levels: [{ name: 'Grounds' }, { name: 'Long Pools', cost: { credits: 5000, parts: 300 }, days: 10 },
      { name: 'Walls of Names', cost: { credits: 6000, parts: 350, alloy: 60 }, days: 12 },
      { name: 'Memorial Garden', cost: { credits: 7000, parts: 400, alloy: 100 }, days: 12, jobs: 12, upkeep: 12, uses: { water: 40 }, radius: 20, park: 14 }],
    text: 'A garden to the war on the main deck: long pools, walls of names of both sides, cypresses and an eternal flame. Eden grieves more gently, and visitors come from Earth to stand there.' },
  { key: 'arena', name: 'Zero-G Arena', ver: 9, cat: 'wonders', size: 8, kitSize: 6, zone: 'interior', on: ['deck', 'conduit', 'rock'], decks: ['lower'], cost: { credits: 12000, parts: 900 }, days: 16, jobs: 0, upkeep: 6, power: 0,
    wonder: { pop: 10000, tech: ['monumental'], tourism: 70, happy: 6, happyPer: 2000, happyMax: 10, perPop: { credits: 60 },
      effect: 'Grows with the city: +6 happiness for the whole colony and 1 more for every 2,000 colonists (up to +16), 300 credits a day in tickets and 60 more for every 1,000 colonists, and 70 tourism: the biggest draw in Eden.' },
    levels: [{ name: 'Excavation' }, { name: 'Frame', cost: { credits: 14000, parts: 1100, alloy: 400 }, days: 16 },
      { name: 'Stands', cost: { credits: 16000, parts: 1300, alloy: 500 }, days: 18 },
      { name: 'Zero-G Arena', cost: { credits: 18000, parts: 1500, alloy: 600 }, days: 20, jobs: 160, upkeep: 35, power: -150, makes: { credits: 300 } }],
    text: 'A great bowl dug into the lower deck\'s machinery halls, with a weightless sphere above the field where teams fly. Happiness, ticket money, and crowds from Earth.' },
  { key: 'starport', name: 'Starport', ver: 9, cat: 'wonders', size: 7, kitSize: 5, zone: 'any', on: ['void', 'hull', 'asteroid', 'magnetic'], cost: { credits: 12000, parts: 900, alloy: 300 }, days: 16, jobs: 0, upkeep: 6, power: 0,
    wonder: { pop: 5000, built: ['elevator'], tech: ['monumental'], tourism: 30, transport: 3, visitors: 5,
      effect: 'Transports bring three times as many colonists, five times as many visitors can arrive (liners from Earth), 800 credits a day in trade, and 30 tourism.' },
    levels: [{ name: 'Moorings' }, { name: 'Piers', cost: { credits: 14000, parts: 1100, alloy: 400 }, days: 16 },
      { name: 'Concourse', cost: { credits: 16000, parts: 1300, alloy: 500 }, days: 18 },
      { name: 'Starport', cost: { credits: 18000, parts: 1500, alloy: 600 }, days: 20, jobs: 120, upkeep: 35, power: -120, makes: { credits: 800 } }],
    text: 'Piers for liners in space beside the hull, with a concourse tower: transports bring twice as many colonists, and tourist liners bring four times the visitors.' },
  { key: 'spinring', name: 'Spin-Gravity Ring', ver: 9, cat: 'wonders', size: 8, kitSize: 6, zone: 'any', on: ['void', 'hull', 'asteroid', 'magnetic'], cost: { credits: 18000, parts: 1500, alloy: 600 }, days: 18, jobs: 0, upkeep: 8, power: 0,
    wonder: { pop: 10000, built: ['starport'], tech: ['monumental'], tourism: 30, happy: 5,
      effect: 'Homes for 8,000 in real gravity, +5 happiness for the whole colony, and 30 tourism.' },
    levels: [{ name: 'Hub' }, { name: 'Spokes', cost: { credits: 20000, parts: 1600, alloy: 800 }, days: 18 },
      { name: 'Rim', cost: { credits: 24000, parts: 2000, alloy: 1000, helium: 100 }, days: 20 },
      { name: 'Spin-Gravity Ring', cost: { credits: 28000, parts: 2400, alloy: 1200, helium: 200 }, days: 22, jobs: 300, upkeep: 50, power: -260, housing: 8000 }],
    text: 'A wheel in space by the hull that spins to make real gravity: homes for 3,000 people who walk like they did on Earth.' },
  // The Ark (`megaproject`): the very late game's goal and a second ending, "Beyond Eden". Optional: it never blocks
  // Eden Restored. Five stages, each a big bill of alloy, parts and helium-3, and finally the provisions.
  { key: 'ark', name: 'The Ark', ver: 9, cat: 'wonders', size: 7, zone: 'any', on: ['void', 'hull', 'asteroid', 'magnetic'], cost: { credits: 20000, parts: 2000, alloy: 1500 }, days: 20, jobs: 0, upkeep: 10, power: 0,
    wonder: { pop: 15000, built: ['starport'], tech: ['generation'], tourism: 30, happy: 5, megaproject: true,
      effect: 'A generation ship for the stars: finishing it is the second ending, Beyond Eden. Afterwards +5 happiness for the whole colony, and 30 tourism.' },
    levels: [{ name: 'Keel' }, { name: 'Hull', cost: { credits: 25000, parts: 3000, alloy: 3000 }, days: 24 },
      { name: 'Drive', cost: { credits: 30000, parts: 2500, alloy: 2000, helium: 800 }, days: 28 },
      { name: 'Habitat Decks', cost: { credits: 30000, parts: 4000, alloy: 2000 }, days: 24 },
      { name: 'The Ark', cost: { credits: 40000, parts: 2000, helium: 600, food: 8000, water: 8000 }, days: 20, jobs: 300, upkeep: 50, power: -150 }],
    text: 'A generation ship in a dock of its own beside the hull, built over five great stages. Finishing it is a second ending: Beyond Eden. It never stands in the way of Eden Restored.' },
  // Tourism (js/colony/tourism.js): visitors come for the wonders, landmarks, parks and a happy, valuable city; they
  // need beds (`beds`: Hotels, which grow like Habitats) and spend more with leisure around (`leisure`). Research Tourism.
  { key: 'hotel', name: 'Hotel', ver: 9, cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 900, parts: 60 }, days: 6, jobs: 6, upkeep: 4, power: -6, beds: 80, tech: 'tourism',
    levels: [{ name: 'Guest House', beds: 80 },
      { name: 'Hotel', beds: 200, jobs: 15, upkeep: 8, power: -12, needs: ['allNeeds', 'park', 'leisure'] },
      { name: 'Grand Hotel', beds: 400, jobs: 30, upkeep: 14, power: -20, needs: ['allNeeds', 'park', 'leisure', 'value:55'] }],
    text: 'Beds for visitors: a Guest House for 80 grows by itself, like a Habitat, into a Hotel (200) with a park and leisure in reach, and a Grand Hotel (400) on land worth 55.' },
  { key: 'promenade', name: 'Promenade', ver: 9, cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 700, parts: 40 }, days: 5, jobs: 6, upkeep: 4, power: -4, radius: 10, service: 3, leisure: 1, tech: 'tourism',
    text: 'A lamp-lit walk of kiosks, cafés and a fountain: happiness for homes in range, and leisure for hotels and visitors.' },
  { key: 'theatre', name: 'Theatre', ver: 9, cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['upper', 'main', 'lower'], cost: { credits: 1200, parts: 80 }, days: 6, jobs: 14, upkeep: 8, power: -8, radius: 12, service: 4, leisure: 2, tech: 'tourism',
    text: 'Plays and music hall under a lit marquee: happiness for homes in range, and more leisure for visitors.' },
  { key: 'casino', name: 'Casino', ver: 9, cat: 'services', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit'], decks: ['main', 'lower'], cost: { credits: 2500, parts: 150 }, days: 8, jobs: 40, upkeep: 12, power: -20, makes: { credits: 100 }, leisure: 3, tech: 'tourism',
    text: 'Neon, a gold dome and tables that never close: 100 credits a day, and the most leisure for visitors.' },
  // ---- version 10 (docs/COLONY-V10.md): luxuries for the well-off (js/colony/luxuries.js). Spires, Skyscrapers, Arcologies and
  // the Spin-Gravity Ring want coffee, wine and art; meeting the want gives happiness, and a Skyscraper needs coffee and wine to hold.
  { key: 'coffee', name: 'Coffee Terrace', ver: 10, cat: 'food', size: 2, zone: 'interior', on: ['hills'], decks: ['upper', 'main'], cost: { credits: 600, parts: 30 }, days: 5, jobs: 4, upkeep: 3, power: 0,
    uses: { water: 3 }, makes: { coffee: 20 }, radius: 3, park: 3, tech: 'luxuries',
    text: 'Coffee bushes in green terraces on the hills: 20 coffee a day for the well-off in Spires, Skyscrapers, Arcologies and the Ring. Hills only.' },
  { key: 'vineyard', name: 'Vineyard Dome', ver: 10, cat: 'food', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'hills'], decks: ['upper'], cost: { credits: 700, parts: 40 }, days: 5, jobs: 4, upkeep: 3, power: -4,
    uses: { water: 4 }, makes: { wine: 16 }, radius: 3, park: 2, tech: 'luxuries',
    text: 'Vines under a glass dome in the sky-panel light: 16 wine a day for the well-off. Upper deck only.' },
  { key: 'artisan', name: 'Artisan Workshop', ver: 10, cat: 'services', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor', 'rock', 'conduit', 'hills'], decks: ['upper', 'main', 'lower'], cost: { credits: 800, parts: 50 }, days: 5, jobs: 6, upkeep: 4, power: -4,
    uses: { parts: 2 }, makes: { art: 10 }, tech: 'luxuries',
    text: 'Glass-blowers, painters and potters: 10 art a day from 2 parts, for the well-off\'s walls and for visitors to admire.' },
];

export const BUILDING = Object.fromEntries(BUILDINGS.map((b) => [b.key, b]));
