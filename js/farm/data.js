// Earthlight: Sato's Harvest. The tables of the farming game (docs/FARM.md §2 and §3.1).
// Pure data: no DOM, no imports. Crop item id === crop id; a seed bag is 'seed_<crop>'.

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_PER_SEASON = 30, DAY_START = 360, DAY_END = 1440;   // minutes
export const TOOL_LEVELS = ['', 'Field', 'Alloy', 'Starsteel'];
export const FIELD_SIZES = { farm: [16, 18], greenhouse: [10, 6] }, PASTURE_SIZE = [12, 7];

// [id, name, plural, seasons, days, regrow (0 = none), sale, bag price]
const CROP_ROWS = [
  ['turnip', 'Turnip', 'turnips', [0], 4, 0, 60, 120],
  ['potato', 'Potato', 'potatoes', [0], 7, 0, 80, 150],
  ['cucumber', 'Cucumber', 'cucumbers', [0], 9, 5, 60, 200],
  ['strawberry', 'Strawberry', 'strawberries', [0], 8, 2, 30, 150],
  ['tomato', 'Tomato', 'tomatoes', [1], 9, 3, 60, 200],
  ['corn', 'Corn', 'corn', [1], 13, 4, 100, 300],
  ['onion', 'Onion', 'onions', [1], 7, 0, 80, 150],
  ['pumpkin', 'Pumpkin', 'pumpkins', [1], 14, 0, 250, 500],
  ['carrot', 'Carrot', 'carrots', [2], 7, 0, 120, 300],
  ['eggplant', 'Eggplant', 'eggplants', [2], 9, 3, 80, 120],
  ['sweetpotato', 'Sweet potato', 'sweet potatoes', [2], 6, 2, 60, 300],
  ['spinach', 'Spinach', 'spinach', [2], 5, 0, 80, 200],
  ['moonflower', 'Moonflower', 'moonflowers', [0, 1, 2], 18, 0, 500, 1000],
];

// `plural` and `bag` (the seed bag's price) are extras beyond the contract.
export const CROPS = {};
for (const [id, name, plural, seasons, days, regrow, sell, bag] of CROP_ROWS) CROPS[id] = { id, name, plural, seasons, days, regrow, sell, bag };

export const ITEMS = {};
const item = (id, name, kind, desc, more = {}) => { ITEMS[id] = { id, name, kind, ...more, desc }; };

item('hoe', 'Hoe', 'tool', 'Tills bare ground into soil.');
item('can', 'Watering can', 'tool', 'Wets tilled soil. Fill it at any water.');
item('sickle', 'Sickle', 'tool', 'Cuts weeds, dead crops and ripe pasture grass.');
item('hammer', 'Hammer', 'tool', 'Breaks rocks and flattens empty soil.');
item('axe', 'Axe', 'tool', 'Chops branches and stumps into lumber.');
item('rod', 'Fishing rod', 'tool', 'Catches fish at any water. Better rods land bigger fish.');
item('milker', 'Milker', 'tool', 'Milks a fed cow once a day.');
item('brush', 'Brush', 'tool', 'Cows like a good brushing.');

const seasonText = (c) => (c.seasons.length > 1 ? 'any season but winter' : SEASONS[c.seasons[0]].toLowerCase());
for (const c of Object.values(CROPS)) {
  item(c.id, c.name, 'crop', `Grown in ${seasonText(c)}. Sells for ${c.sell} cr.`, { sell: c.sell });
  item(`seed_${c.id}`, `${c.name} seeds`, 'seed', `Sows a 3×3 patch. ${c.days} days, ${seasonText(c)}${c.regrow ? ', regrows' : ''}.`, { crop: c.id });
}
item('seed_grass', 'Grass seed', 'seed', 'Sows a 3×3 patch of pasture grass.');

item('egg', 'Egg', 'animal', 'Laid by a well-fed chicken.', { sell: 50 });
item('milk_s', 'Small milk', 'animal', 'A small bottle of milk.', { sell: 100 });
item('milk_m', 'Medium milk', 'animal', 'A good bottle of milk.', { sell: 150 });
item('milk_l', 'Large milk', 'animal', 'A large bottle from a happy cow.', { sell: 200 });

item('fish_s', 'Silverfin', 'fish', 'A small river fish.', { sell: 50 });
item('fish_m', 'River trout', 'fish', 'A decent catch.', { sell: 120 });
item('fish_l', 'Chamber carp', 'fish', 'A fish worth boasting about.', { sell: 200 });
item('fish_spring', 'Blossom dace', 'fish', 'Runs only in spring.', { sell: 160 });
item('fish_summer', 'Sunline perch', 'fish', 'Basks under the summer sun-line.', { sell: 180 });
item('fish_autumn', 'Copper eel', 'fish', 'An autumn eel the colour of old wire.', { sell: 220 });
item('fish_winter', 'Frost char', 'fish', 'Caught only in the cold.', { sell: 260 });
item('fish_king', 'Old Hollin', 'fish', 'The old king of the hill lake.', { sell: 1200 });

item('herb', 'Hill herb', 'forage', 'A fragrant herb from the hill.', { sell: 40 });
item('berry', 'Wild berry', 'forage', 'Sweet and sharp. Good to eat.', { sell: 30, stamina: 5 });
item('mushroom', 'Mushroom', 'forage', 'An autumn mushroom from the hill.', { sell: 70 });
item('frostcap', 'Frostcap', 'forage', 'A pale mushroom that grows in the snow.', { sell: 60 });

item('scrap', 'Scrap', 'ore', 'Scrap metal from the ruins.', { sell: 15 });
item('alloy', 'Alloy', 'ore', 'Good alloy, found from depth 5 down.', { sell: 40 });
item('crystal', 'Crystal', 'ore', 'A drive crystal, found from depth 10 down.', { sell: 150 });

// Old-world artefacts from the ruins, cheapest first. `depth` is the shallowest site they turn up in.
export const RELICS = [
  ['photo', 'Faded photograph', 80, 1, 'Strangers smiling under a blue sky.'],
  ['teacup', 'Porcelain cup', 120, 1, 'Not a chip on it, somehow.'],
  ['book', 'Old-world book', 150, 2, 'The pages still turn.'],
  ['watch', 'Pocket watch', 200, 3, 'Stopped at a quarter past four.'],
  ['toy', 'Tin robot', 250, 4, 'A wind-up toy. It still walks.'],
  ['medal', 'Old medal', 300, 5, 'Somebody earned this once.'],
  ['seedtin', 'Seed tin', 350, 6, 'A rusted tin of seeds from old Earth.'],
  ['musicbox', 'Music box', 400, 8, 'It plays a tune nobody remembers.'],
  ['datachip', 'Data chip', 500, 10, 'A sealed chip from before the fall.'],
  ['ring', 'Gold ring', 600, 12, 'Engraved inside: two names and a date.'],
].map(([id, name, sell, depth, desc]) => { item(id, name, 'relic', desc, { sell }); return { id, depth }; });

item('bread', 'Bread', 'food', 'Restores 20 stamina.', { stamina: 20 });
item('soup', 'Soup', 'food', 'Restores 40 stamina.', { stamina: 40 });
item('pie', 'Pie', 'food', 'Restores 70 stamina.', { stamina: 70 });
item('tea', 'Tea', 'food', 'Restores 10 stamina.', { stamina: 10 });
item('tonic', 'Tonic', 'food', "Moraine's tonic. Restores 100 stamina.", { stamina: 100 });
item('pendant', 'Earthlight pendant', 'keepsake', "A drop of fused hull-glass that holds Earth's light. On Eden you give it to the one you want to share your table with.");

// Extras beyond the contract: things kept in state.stock, never in the rucksack. They are listed
// here so that a `gained` entry always has a name; addItem() sends them straight to the stock.
item('lumber', 'Lumber', 'stock', 'Kept in the wood store by the house.');
item('feed', 'Chicken feed', 'stock', 'One a chicken a day. Kept in the coop.');
item('fodder', 'Fodder', 'stock', 'One a cow a day. Kept in the barn.');

// Festival days [season, day]: the weather is always fair.
export const FESTIVAL_DAYS = [[0, 18], [1, 24], [2, 9], [3, 30]];
