// Earthlight Space Colony Rebuild: the buildings of version 1 (docs/COLONY.md §11, contract in
// docs/COLONY-V1.md). Original data. Numbers are per day at full staff and power, level 1, and are
// first guesses for the balance pass (tests/colony-sim.mjs). Later versions append entries.
//
//   key, name, cat           id and build-menu group (CATEGORIES)
//   size                     footprint N×N tiles; (x, y) of a building is its top-left tile
//   on                       terrain keys every tile of the footprint must have
//   zone                     'interior' (inside an open chamber) | 'space' (within a dock's reach) | 'hull' | 'any'
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
//   fixed                    cannot be built, moved or demolished by the player
//   text                     one line for the build menu
export const CATEGORIES = [
  { key: 'core', name: 'Command' },
  { key: 'power', name: 'Power' },
  { key: 'life', name: 'Water & air' },
  { key: 'food', name: 'Food' },
  { key: 'industry', name: 'Industry' },
  { key: 'homes', name: 'Homes & parks' },
];

// What one colonist needs a day.
export const NEEDS = { food: 1, water: 1, air: 1, power: 0.1 };
// Air an open chamber needs a day to stay pressurised, per 100 of its floor tiles.
export const CHAMBER_AIR_PER_100 = 1;
// Space buildings must stand within this many tiles (Chebyshev) of a finished dock's centre.
export const DOCK_REACH = 24;
// Wanderers of the market: base sale price in credits per unit (rules.sell moves it).
export const BASE_PRICE = { ore: 4, food: 3, parts: 10, water: 1, air: 2 };

export const BUILDINGS = [
  { key: 'command', name: 'Command Centre', cat: 'core', size: 3, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], fixed: true,
    cost: { credits: 0, parts: 0 }, days: 0, jobs: 0, upkeep: 0, power: 20, makes: { air: 20, water: 10 }, housing: 20,
    storage: { food: 300, water: 300, air: 200, parts: 300, ore: 200 },
    text: 'The Governor\'s seat: a small reactor, air plant and stores. Lose it and the colony is lost.' },
  { key: 'dock', name: 'Dock', cat: 'core', size: 2, zone: 'hull', on: ['hull'], cost: { credits: 400, parts: 40 }, days: 6, jobs: 4, upkeep: 4, power: -4, radius: 24,
    text: 'Opens the hull to space: space buildings must stand within its reach. Transports land here.' },
  { key: 'repairyard', name: 'Repair Yard', cat: 'core', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 250, parts: 20 }, days: 4, jobs: 6, upkeep: 3, power: -3,
    levels: [{ crews: 1 }, { crews: 2, cost: { credits: 300, parts: 40 } }, { crews: 3, cost: { credits: 500, parts: 80 } }],
    text: 'Ruess\'s crews. Each crew builds one thing at a time; more crews, more at once.' },
  { key: 'depot', name: 'Storage Depot', cat: 'core', size: 1, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void', 'asteroid', 'hull'], cost: { credits: 80, parts: 5 }, days: 2, jobs: 0, upkeep: 1,
    storage: { food: 300 }, modes: [{ key: 'food', name: 'Food' }, { key: 'water', name: 'Water' }, { key: 'air', name: 'Air' }, { key: 'parts', name: 'Parts' }, { key: 'ore', name: 'Ore' }],
    text: 'Stores 300 of one good. Switch what it holds any time.' },

  { key: 'solar', name: 'Solar Array', cat: 'power', size: 1, zone: 'any', on: ['void', 'hull'], cost: { credits: 120, parts: 8 }, days: 2, jobs: 0, upkeep: 1, power: 12,
    levels: [{ power: 12 }, { power: 20, cost: { credits: 150, parts: 15 } }, { power: 30, cost: { credits: 250, parts: 30 } }],
    text: 'Clean, small power. On the hull or in open space near a dock.' },
  { key: 'induction', name: 'Induction Collector', cat: 'power', size: 2, zone: 'space', on: ['magnetic'], cost: { credits: 500, parts: 40 }, days: 6, jobs: 2, upkeep: 5, power: 60, unlock: { pop: 80 },
    text: 'Harvests a magnetic field: big, steady power. Only on a magnetic belt.' },
  { key: 'battery', name: 'Battery Bank', cat: 'power', size: 1, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void', 'hull'], cost: { credits: 100, parts: 10 }, days: 2, jobs: 0, upkeep: 1, storage: { power: 100 }, unlock: { pop: 80 },
    text: 'Stores 100 power for a bad day. Power is otherwise never stored.' },

  { key: 'riverpump', name: 'River Pump', cat: 'life', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck'], adj: 'river', cost: { credits: 150, parts: 10 }, days: 3, jobs: 2, upkeep: 2, power: -4, makes: { water: 40 },
    text: 'Water from Eden\'s river. Must stand beside it.' },
  { key: 'airplant', name: 'Air Plant', cat: 'life', size: 2, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 300, parts: 25 }, days: 4, jobs: 3, upkeep: 3, power: -10, uses: { water: 10 }, makes: { air: 60 },
    text: 'Splits water into air. Every colonist and every open chamber breathes.' },
  { key: 'grove', name: 'Forest Grove', cat: 'life', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor'], cost: { credits: 40, parts: 0 }, days: 3, jobs: 0, upkeep: 0, uses: { water: 1 }, makes: { air: 6 }, radius: 4, park: 6,
    text: 'A stand of young trees: a little air with no power, and a pleasant place nearby.' },
  { key: 'seal', name: 'Bulkhead Seal', cat: 'life', size: 1, zone: 'wall', on: ['breach'], cost: { credits: 30, parts: 15 }, days: 2, jobs: 0, upkeep: 0,
    text: 'Patches one breach. Seal every breach of a chamber, then pressurise it.' },

  { key: 'farm', name: 'Farm Field', cat: 'food', size: 2, zone: 'interior', on: ['plain', 'fertile', 'poor'], cost: { credits: 120, parts: 5 }, days: 3, jobs: 4, upkeep: 1, uses: { water: 6 }, makes: { food: 12 },
    modes: [{ key: 'grain', name: 'Grain', text: 'Food by soil: fertile ×1.8, poor ×0.55; +25% beside the river.' },
            { key: 'cash', name: 'Cash crop', text: 'Credits instead: food ×0.4, +8 credits a day.' },
            { key: 'fallow', name: 'Fallow', text: 'Nothing grows; after 30 days its poor soil becomes plain.' }],
    text: 'Fields on Eden\'s soil. Fertile ground and the river make all the difference.' },
  { key: 'hydro', name: 'Hydroponics Bay', cat: 'food', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 200, parts: 15 }, days: 3, jobs: 2, upkeep: 2, power: -6, uses: { water: 4 }, makes: { food: 10 },
    text: 'Food from power and water, on any floor. Dull and reliable.' },

  { key: 'oremine', name: 'Ore Mine', cat: 'industry', size: 2, zone: 'space', on: ['asteroid'], cost: { credits: 350, parts: 30 }, days: 5, jobs: 4, upkeep: 3, power: -8, makes: { ore: 20 }, unlock: { pop: 80 },
    text: 'Mines an asteroid. Double on an ore seam. Sell the ore at the dock.' },
  { key: 'salvage', name: 'Salvage Yard', cat: 'industry', size: 2, zone: 'any', on: ['deck', 'plain', 'fertile', 'poor', 'void'], cost: { credits: 250, parts: 10 }, days: 4, jobs: 4, upkeep: 2, power: -4, radius: 6, makes: { parts: 8 }, unlock: { pop: 80 },
    modes: [{ key: 'fast', name: 'Fast', text: 'Strip it quickly: full rate.' },
            { key: 'careful', name: 'Careful', text: 'Half the rate, double the parts from each tile.' }],
    text: 'Turns rubble and wrecks in range into parts, clearing the ground as it goes.' },

  { key: 'habitat', name: 'Habitat', cat: 'homes', size: 1, zone: 'interior', on: ['deck', 'plain', 'fertile', 'poor'], cost: { credits: 100, parts: 10 }, days: 2, jobs: 0, upkeep: 1, power: -2, housing: 20,
    levels: [{ housing: 20, name: 'Shelter' }, { housing: 40, name: 'Quarters', needs: ['allNeeds', 'park'] }, { housing: 70, name: 'Apartments', needs: ['allNeeds', 'park', 'clinic'] }],
    text: 'Homes that grow by themselves when their needs are met. Its panel lists what is missing.' },
  { key: 'park', name: 'Park', cat: 'homes', size: 1, zone: 'interior', on: ['plain', 'fertile', 'poor', 'deck'], cost: { credits: 60, parts: 0 }, days: 1, jobs: 0, upkeep: 1, uses: { water: 1 }, radius: 6, park: 8,
    text: 'Raises happiness in range, up to its rating. Costs water, not power.' },
];

export const BUILDING = Object.fromEntries(BUILDINGS.map((b) => [b.key, b]));
