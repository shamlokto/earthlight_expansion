// Earthlight Space Colony Rebuild, version 13 (docs/COLONY-V13.md): the buildings of The Hope, Eden's foothold on Earth.
// Original data. Earth-only (`decks: ['earth']`), all very expensive: credits come from Eden's purse, parts and alloy
// from the Hope's own stores (carried down by the Ark, the Mass Driver or the Orbital Elevator). The same fields as
// data/buildings.js where they mean the same; and:
//   treats      [{ from: [terrain keys], to, rate }]  tiles a day (at full staff) turned from → to within `radius`
//               of the footprint, nearest first; a tile under a building is never treated
//   clear       tiles of toxic gas or radiation that must be at least this far from the footprint (homes, fields)
//   nearSea     the footprint must touch the sea (poisoned or clean)
//   needsSeeds  a finished Seed Bank must stand on Earth first
//   soil        farms: food × the soil's multiplier (plain 1.1, fertile 1.8; forest does not farm)
// Kept out of BUILDINGS (so no Eden menu, unlock or sim loop sees them); data/buildings.js adds them to BUILDING so
// the view, the ghost and the minimap find their size and category.
export const HOPE_GROUND = ['ash', 'landing', 'plain', 'fertile'];

export const HOPE_BUILDINGS = [
  { key: 'landingfield', name: 'Landing Field', cat: 'hope', size: 4, decks: ['earth'], on: ['landing'], fixed: true, ver: 13,
    cost: { credits: 0, parts: 0, alloy: 0 }, days: 0, jobs: 0, upkeep: 0, housing: 20,
    storage: { food: 1500, water: 1500, air: 1500, parts: 1500, alloy: 1000 },
    text: 'Where the Ark sets down: pressure tents for the first twenty and the stores everything else on Earth draws from.' },
  { key: 'sealeddome', name: 'Sealed Dome', cat: 'hope', size: 3, decks: ['earth'], on: HOPE_GROUND, clear: 2, ver: 13,
    cost: { credits: 6000, parts: 300, alloy: 150 }, days: 12, jobs: 0, upkeep: 20, housing: 40, makes: { air: 20 }, uses: { water: 10 },
    storage: { food: 200, water: 200, air: 200 },
    text: 'The only place on Earth people can live yet: a pressurised dome for 40 with its own air recycler. Needs clean ground two tiles around.' },
  { key: 'airscrubber', name: 'Air Scrubber Tower', cat: 'hope', size: 2, decks: ['earth'], on: HOPE_GROUND, ver: 13, radius: 10,
    cost: { credits: 8000, parts: 400, alloy: 200 }, days: 14, jobs: 8, upkeep: 40, makes: { air: 30 },
    treats: [{ from: ['toxic'], to: 'ash', rate: 3 }],
    text: 'Draws the poison out of the air: clears toxic gas within 10 tiles, three tiles a day, and bottles a little clean air.' },
  { key: 'deconplant', name: 'Decontamination Plant', cat: 'hope', size: 3, decks: ['earth'], on: HOPE_GROUND, ver: 13, radius: 9,
    cost: { credits: 10000, parts: 500, alloy: 300 }, days: 16, jobs: 10, upkeep: 50,
    treats: [{ from: ['radzone'], to: 'ash', rate: 2 }],
    text: 'Scrapes, washes and buries the hot ground: makes radiation zones within 9 tiles safe, two tiles a day.' },
  { key: 'soilreactor', name: 'Soil Reactor', cat: 'hope', size: 3, decks: ['earth'], on: HOPE_GROUND, ver: 13, radius: 8,
    cost: { credits: 9000, parts: 450, alloy: 250 }, days: 14, jobs: 8, upkeep: 45, salvage: 4,
    treats: [{ from: ['ruins'], to: 'ash', rate: 1 }, { from: ['ash'], to: 'plain', rate: 3 }],
    text: 'Breaks ruins down (four parts a tile) and brings dead ground back to living soil within 8 tiles: three tiles a day.' },
  { key: 'seapurifier', name: 'Sea Purifier', cat: 'hope', size: 3, decks: ['earth'], on: HOPE_GROUND, nearSea: true, ver: 13, radius: 12,
    cost: { credits: 12000, parts: 600, alloy: 300 }, days: 18, jobs: 10, upkeep: 60, makes: { water: 80 },
    treats: [{ from: ['deadsea'], to: 'sea', rate: 4 }],
    text: 'Desalination and a filter for the whole bay: 80 water a day, and the poisoned sea within 12 tiles cleaned, four tiles a day. On the shore.' },
  { key: 'tidewall', name: 'Tide Wall', cat: 'hope', size: 1, decks: ['earth'], on: HOPE_GROUND, ver: 13, radius: 5,
    cost: { credits: 1500, parts: 60, alloy: 40 }, days: 4, jobs: 0, upkeep: 5,
    treats: [{ from: ['mire'], to: 'ash', rate: 1 }],
    text: 'A sea wall with a pump: drains the flooded lowland within 5 tiles, a tile a day.' },
  { key: 'seedbank', name: 'Seed Bank', cat: 'hope', size: 2, decks: ['earth'], on: HOPE_GROUND, ver: 13, radius: 8,
    cost: { credits: 7000, parts: 300, alloy: 100 }, days: 10, jobs: 6, upkeep: 30,
    treats: [{ from: ['plain'], to: 'fertile', rate: 2 }],
    text: 'Eden\'s seeds, soil life and worms, brought home: plain soil within 8 tiles turns fertile, two tiles a day. Fields need one.' },
  { key: 'firstfields', name: 'First Fields', cat: 'hope', size: 3, decks: ['earth'], on: ['plain', 'fertile'], clear: 3, needsSeeds: true, soil: true, ver: 13,
    cost: { credits: 3000, parts: 120, alloy: 20 }, days: 8, jobs: 6, upkeep: 10, makes: { food: 40 },
    text: 'The first crops on Earth in a generation: 40 food a day × the soil (plain 1.1, fertile 1.8). Recovered soil only, clean air three tiles around.' },
  { key: 'reforest', name: 'Reforestation Station', cat: 'hope', size: 2, decks: ['earth'], on: HOPE_GROUND, ver: 13, radius: 8,
    cost: { credits: 8000, parts: 300, alloy: 120 }, days: 12, jobs: 6, upkeep: 30, makes: { air: 20 },
    treats: [{ from: ['fertile'], to: 'forest', rate: 1 }],
    text: 'Seedling nurseries and planting drones: fertile ground within 8 tiles grows into forest, a tile a day.' },
  // owner, 2026-11-18 ("the sea, how can we clean the rest of the water? … how do we clear the city ruins?"): the
  // Sea Purifier only reaches 12 tiles from the shore and the Soil Reactor breaks one ruin a day
  { key: 'seaplatform', name: 'Ocean Platform', cat: 'hope', size: 2, decks: ['earth'], on: ['sea'], ver: 13, radius: 14,
    cost: { credits: 10000, parts: 500, alloy: 300 }, days: 14, jobs: 6, upkeep: 40, makes: { water: 40 },
    treats: [{ from: ['deadsea'], to: 'sea', rate: 6 }],
    text: 'A filter rig anchored on clean water: cleans the poisoned sea within 14 tiles, six tiles a day. Build it on sea you have already cleaned and leapfrog out to the open ocean.' },
  { key: 'ruinbreaker', name: 'Ruin Breaker', cat: 'hope', size: 2, decks: ['earth'], on: HOPE_GROUND, ver: 13, radius: 12, salvage: 6,
    cost: { credits: 7000, parts: 250, alloy: 150 }, days: 10, jobs: 8, upkeep: 30,
    treats: [{ from: ['ruins'], to: 'ash', rate: 4 }],
    text: 'Cranes, crushers and salvage crews: tears down city ruins within 12 tiles, four tiles a day, and sends six parts a tile to the stores. Leaves dead ground for a Soil Reactor.' },
];
export const HOPE_BUILDING = Object.fromEntries(HOPE_BUILDINGS.map((b) => [b.key, b]));
