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

// Mountain food from Terrace Hill (2026-11-18): each season has its own; rarer ones are worth more.
item('bamboo_shoot', 'Bamboo shoot', 'forage', 'A crisp spring shoot from the hill grove, planted by the first terrace crews.', { sell: 60, stamina: 6 });
item('wild_mint', 'Wild mint', 'forage', 'Mint that escaped a ration garden decades ago and never looked back.', { sell: 35 });
item('fiddlehead', 'Fiddlehead', 'forage', 'A curled young fern frond. Spring only.', { sell: 45, stamina: 5 });
item('wild_grape', 'Wild grape', 'forage', 'Small dark grapes off the vines on the old irrigation trellis. Sweet.', { sell: 50, stamina: 6 });
item('honeycomb', 'Honeycomb', 'forage', 'A broken piece of comb from the hill bees, the colony\'s oldest workers.', { sell: 120, stamina: 15 });
item('chestnut', 'Chestnut', 'forage', 'A glossy autumn chestnut. Roast it before you eat it.', { sell: 55 });
item('wild_apple', 'Wild apple', 'forage', 'A small sour apple from a seedling tree nobody planted on purpose.', { sell: 50, stamina: 8 });
item('matsutake', 'Matsutake', 'forage', 'A rare, fragrant autumn mushroom that hides under the hill pines. Prized.', { sell: 400 });
item('pine_nut', 'Pine nut', 'forage', 'Shaken out of winter cones on the hill. Rich and buttery.', { sell: 45, stamina: 4 });
item('winter_root', 'Winter root', 'forage', 'A pale, sweet root dug from the cold hill soil.', { sell: 50 });

// Fruit from Sato's own trees (planted from saplings; 28 days to grow, then one a day in season).
item('cherry', 'Cherry', 'fruit', 'Spring cherries, the first fruit of the year on the Upper deck.', { sell: 80, stamina: 8 });
item('peach', 'Peach', 'fruit', 'A soft summer peach that smells of sun-line afternoons.', { sell: 110, stamina: 12 });
item('apple', 'Apple', 'fruit', 'A crisp autumn apple from your own tree.', { sell: 90, stamina: 10 });
item('persimmon', 'Persimmon', 'fruit', 'A bright orange autumn persimmon, sweet once it softens.', { sell: 100, stamina: 10 });
export const FRUIT_TREES = {
  apple: { id: 'apple', name: 'Apple tree', fruit: 'apple', season: 2 },
  peach: { id: 'peach', name: 'Peach tree', fruit: 'peach', season: 1 },
  cherry: { id: 'cherry', name: 'Cherry tree', fruit: 'cherry', season: 0 },
  persimmon: { id: 'persimmon', name: 'Persimmon tree', fruit: 'persimmon', season: 2 },
};
export const TREE_DAYS = 28;
for (const t of Object.values(FRUIT_TREES)) item(`sapling_${t.id}`, `${t.name} sapling`, 'sapling', `Plant on farm grass (not the field). Grows for ${TREE_DAYS} days, then gives a ${t.fruit} a day in ${SEASONS[t.season].toLowerCase()}.`, { tree: t.id });

// Gear for the bigger farm: carried and placed things, and the field robots' batteries.
item('basket', 'Basket', 'tool', 'While it is in your hand, picked crops and forage go into the basket (30 in all). E at the bin ships the lot.');
item('field_chest', 'Field chest', 'placeable', 'A weatherproof chest. Hold it and press Space on free ground on the farm or the hill to set it down.');
item('solar_panel', 'Solar charger', 'placeable', 'A little panel that charges two robot batteries a day. Set it down on the farm like a chest.');
item('battery', 'Battery (empty)', 'part', 'A flat robot battery. Put it in a solar charger overnight.', { sell: 60 });
item('battery_full', 'Battery (charged)', 'part', 'A charged robot battery. Give it to a Field-unit with E (+60 charge).', { sell: 90 });

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
// Home cooking (the kitchen): better than shop food, and worth more in the bin than the raw goods.
item('omelette', 'Omelette', 'food', 'Egg and milk, folded soft. Restores 45 stamina.', { stamina: 45, sell: 220 });
item('salad', 'Garden salad', 'food', 'Two fresh vegetables, crisp. Restores 30 stamina.', { stamina: 30, sell: 190 });
item('veg_soup', 'Vegetable soup', 'food', 'Three vegetables, simmered. Restores 60 stamina.', { stamina: 60, sell: 320 });
item('fish_grill', 'Grilled fish', 'food', 'Any fish, salt and a hot pan. Restores 50 stamina.', { stamina: 50, sell: 260 });
item('cooked_meal', 'Colony bento', 'food', 'Fish, egg and a vegetable in a tin box, the way crews ate on the carriers. Restores 90 stamina.', { stamina: 90, sell: 480 });
item('berry_jam', 'Berry jam', 'food', 'Berries and patience. Restores 25 stamina.', { stamina: 25, sell: 160 });
// More home cooking (2026-11-18): mountain food, fruit and the old favourites.
item('mint_tea', 'Mint tea', 'food', 'Wild mint and a hill herb, steeped. Restores 20 stamina.', { stamina: 20, sell: 140 });
item('grape_juice', 'Grape juice', 'food', 'Three handfuls of wild grapes, pressed. Restores 30 stamina.', { stamina: 30, sell: 230 });
item('bamboo_stirfry', 'Bamboo stir-fry', 'food', 'Bamboo shoot and a garden vegetable in a hot pan. Restores 45 stamina.', { stamina: 45, sell: 290 });
item('honey_toast', 'Honey toast', 'food', 'Bread, toasted, with hill honeycomb melting into it. Restores 40 stamina.', { stamina: 40, sell: 260 });
item('fiddlehead_tempura', 'Fiddlehead tempura', 'food', 'Fern fronds in a light egg batter. Restores 30 stamina.', { stamina: 30, sell: 180 });
item('fruit_tart', 'Fruit tart', 'food', 'Any fruit, an egg and bread for the crust. Restores 55 stamina.', { stamina: 55, sell: 380 });
item('fruit_salad', 'Fruit salad', 'food', 'Two different fruits, cut small. Restores 35 stamina.', { stamina: 35, sell: 300 });
item('persimmon_jam', 'Persimmon jam', 'food', 'Two persimmons cooked down slowly. Restores 30 stamina.', { stamina: 30, sell: 320 });
item('chestnut_roast', 'Roast chestnuts', 'food', 'Three chestnuts, scored and roasted. Restores 35 stamina.', { stamina: 35, sell: 240 });
item('mushroom_soup', 'Mushroom soup', 'food', 'A hill mushroom simmered in milk. Restores 50 stamina.', { stamina: 50, sell: 330 });
item('root_stew', 'Root stew', 'food', 'Winter root, a garden root and a handful of nuts. Restores 60 stamina.', { stamina: 60, sell: 360 });
item('honeyed_nuts', 'Honeyed nuts', 'food', 'Pine nuts rolled in warm honeycomb. Restores 30 stamina.', { stamina: 30, sell: 250 });
item('matsutake_grill', 'Grilled matsutake', 'food', 'A matsutake and a hill herb over coals. Restores 70 stamina.', { stamina: 70, sell: 700 });
item('forest_bento', 'Forest bento', 'food', 'Fish, a mushroom and a vegetable packed for a long walk. Restores 95 stamina.', { stamina: 95, sell: 640 });
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

// Sato's birthday (as in story.js NPCS.sato): the onsen is free that day.
export const SATO_BIRTHDAY = { season: 1, day: 2 };

// Festival days [season, day]: the weather is always fair.
export const FESTIVAL_DAYS = [[0, 18], [1, 24], [2, 9], [3, 30]];

// ---------------------------------------------------------------- the journal's longer texts
// `detail`: what the Farm journal says when Sato examines a thing (1–3 sentences, flavour and a tip).
// The journal adds the hard facts itself (price, stamina, recipes, who loves it).
const DETAIL = {
  hoe: 'A field hoe with a handle cut from a carrier\'s cargo pole. Tills bare ground into soil; Ruess can rework it to till three tiles, then a 3×3 block.',
  can: 'A battered steel can that once watered the hydroponic racks on the Nineveh. Fill it at the pond, the well or any water; upgrades hold 40 and 80.',
  sickle: 'A short curved blade for weeds, dead crops and ripe pasture grass. It never touches a living crop, so swing freely.',
  hammer: 'A heavy hand hammer. Breaks field rocks, and at Alloy level the big boulders too; it also flattens soil you tilled by mistake.',
  axe: 'A felling axe with a nicked edge. Branches and stumps give lumber, and trees on the farm and the hill fall in a few swings and grow back in two weeks.',
  rod: 'A fishing rod from Seln\'s store, bamboo and salvaged line. Cast at any water and pull when the float dips; Ruess can make it land bigger fish.',
  milker: 'A hand milker from Corran\'s ranch. A fed cow gives one bottle a day; happier cows give bigger bottles.',
  brush: 'A stiff cow brush. One good brushing a day makes a cow fonder of you, and fond cows give large milk.',
  turnip: 'The colony\'s first-season crop: fast, forgiving and a little peppery. Four days from seed in spring, the classic first harvest.',
  potato: 'Plain, filling and loved by everyone who ever ate ration paste. A spring crop that takes a week.',
  cucumber: 'Cool, crisp and climbing. A spring crop that keeps giving every five days once it is ripe.',
  strawberry: 'Small, red and sweet; the General\'s weakness. A spring crop that regrows every two days.',
  tomato: 'Sun-line tomatoes, the taste of summer on the Upper deck. Regrows every three days.',
  corn: 'Tall summer corn that rustles when the air pumps cycle. Slow to start, then a cob every four days.',
  onion: 'A summer onion; it makes every stew better and every cook cry.',
  pumpkin: 'A great orange summer pumpkin, the pride of any field. Two weeks to grow and worth it.',
  carrot: 'A bright autumn carrot, sweet from the cool nights. One of the best-paying autumn crops.',
  eggplant: 'Glossy purple autumn eggplant. Regrows every three days.',
  sweetpotato: 'A rosy autumn sweet potato. Quick, and it regrows every two days.',
  spinach: 'Dark autumn spinach, five days from seed. Good in soups and salads.',
  moonflower: 'A pale flower that opens at the sun-line\'s dimming. Moraine sells the seeds; it grows in any season but winter and fetches a fine price.',
  egg: 'A brown egg from one of your hens. A fed chicken lays one each morning; collect them from the coop.',
  milk_s: 'A small bottle of milk from a cow who barely knows you yet. Brush and feed her and the bottles grow.',
  milk_m: 'A good bottle of milk from a contented cow.',
  milk_l: 'A large bottle of rich milk from a cow who adores you.',
  fish_s: 'A small silver river fish, common everywhere. Good grilled.',
  fish_m: 'A river trout, speckled and lively. Common in the village river and the hill lake.',
  fish_l: 'A big chamber carp, descended from the fish the first crews brought in a tank. Most common in the hill lake.',
  fish_spring: 'A pink-finned dace that runs only in spring. Rain and the hill lake help.',
  fish_summer: 'A golden perch that basks under the summer sun-line.',
  fish_autumn: 'A copper-coloured eel that only bites in autumn.',
  fish_winter: 'A frost char, caught only in winter when the water runs cold.',
  fish_king: 'Old Hollin, the legendary king of the hill lake. Only a better rod can hold him, and only rarely; rain helps.',
  herb: 'A fragrant hill herb, the kind the clinic dries for teas. Found on Terrace Hill in spring and summer.',
  berry: 'Sweet, sharp wild berries from the hill and farm bushes. Edible on the spot; three make a jar of jam.',
  mushroom: 'A brown autumn mushroom from under the hill trees. Good in soups and bentos.',
  frostcap: 'A pale mushroom that pushes up through the snow on Terrace Hill in winter.',
  bamboo_shoot: 'A crisp shoot from the bamboo the first terrace crews planted to hold the soil. Spring forage on the hill.',
  wild_mint: 'Mint that escaped a ration garden decades ago and took over the hill paths. Spring forage; brew it for tea.',
  fiddlehead: 'A curled fern frond, gone by summer. Spring forage on the hill; lovely as tempura.',
  wild_grape: 'Small dark grapes from vines that climbed the old irrigation trellis. Summer forage on the hill.',
  honeycomb: 'Comb from the hill bees, descendants of the hives that pollinated the first crops. A rare summer find.',
  chestnut: 'A glossy chestnut from the hill trees. Autumn forage; roast it before eating.',
  wild_apple: 'A small sour apple from a self-sown hill tree. Autumn forage; edible raw.',
  matsutake: 'The rarest thing on Terrace Hill: a fragrant mushroom that hides under the pines in autumn. Worth a small fortune, or one perfect grill.',
  pine_nut: 'Buttery nuts shaken from winter cones on the hill.',
  winter_root: 'A pale sweet root dug from the cold hill soil in winter. Makes a warming stew.',
  cherry: 'Cherries from your own tree, the first fruit of the year. Spring only.',
  peach: 'A soft summer peach from your own tree.',
  apple: 'A crisp autumn apple from your own tree, grown from a sapling Seln brought up from the Middle deck orchards.',
  persimmon: 'A bright autumn persimmon from your own tree. Sweet once it softens; two make jam.',
  sapling_apple: 'A young apple tree in a burlap ball, sold at Seln\'s store. Plant it on farm grass; it fruits in autumn after 28 days.',
  sapling_peach: 'A young peach tree from Seln\'s store. Plant it on farm grass; it fruits in summer after 28 days.',
  sapling_cherry: 'A young cherry tree from Seln\'s store. Plant it on farm grass; it blossoms and fruits in spring after 28 days.',
  sapling_persimmon: 'A young persimmon tree from Seln\'s store. Plant it on farm grass; it fruits in autumn after 28 days.',
  basket: 'A woven harvest basket from Seln\'s store. Hold it while you pick and up to 30 crops and forage go in it instead of the rucksack; E at the bin ships the lot.',
  field_chest: 'A weatherproof field chest built by Ruess from hull plate and lumber. Set it down on the farm or the hill for 20 spaces of storage; an axe picks up an empty one.',
  solar_panel: 'A small solar charger from Ruess\'s workshop. Set it on the farm, put empty robot batteries in with E, and they are charged by morning: two on a bright day, one in rain or snow, none in a storm.',
  battery: 'A flat Field-unit battery. Charge it overnight in a solar charger. Ruess sells them, and they turn up in the ruins.',
  battery_full: 'A charged Field-unit battery. Give it to one of your robots with E for 60 charge; you get the empty one back.',
  scrap: 'Twisted metal from the Old World ruins. Ruess wants five for every Alloy upgrade, and he never says no to more.',
  alloy: 'Good structural alloy, found from level 5 of the Descent. Five go into a Starsteel upgrade.',
  crystal: 'A drive crystal from before the fall, found from level 10 down. Starsteel tools need one.',
  photo: 'Strangers smiling under a blue sky, faded to sepia. Found in the shallowest ruins; the Memory Room keeps one.',
  teacup: 'A porcelain cup without a chip on it, somehow. Found in the shallow ruins.',
  book: 'An old-world book whose pages still turn. Found from level 2 of the ruins.',
  watch: 'A pocket watch stopped at a quarter past four. Found from level 3; Ruess loves to tinker with them.',
  toy: 'A wind-up tin robot. It still walks. Found from level 4.',
  medal: 'Somebody earned this once. Found from level 5; give it to the Memory Room rather than to the General.',
  seedtin: 'A rusted tin of seeds from old Earth. Found from level 6.',
  musicbox: 'A music box that plays a tune nobody remembers. Found from level 8.',
  datachip: 'A sealed data chip from before the fall. Found from level 10; Ruess would give anything to read it.',
  ring: 'A gold ring engraved with two names and a date. Found from level 12, the deepest of the finds.',
  bread: 'A round loaf from Seln\'s store, baked in the hydroponics oven at dawn. Also the crust of a fruit tart and the base of honey toast.',
  omelette: 'Egg and milk, folded soft, cooked in your own kitchen.',
  salad: 'Two different vegetables, crisp from the field.',
  veg_soup: 'Three vegetables simmered together. Hearty and cheap.',
  fish_grill: 'Any fish, salt and a hot pan. Sato learned this one on the carriers.',
  cooked_meal: 'The crews\' old tin-box meal: fish, egg and a vegetable.',
  berry_jam: 'Three berries and patience, in a jar.',
  mint_tea: 'Wild mint and a hill herb steeped in hot water. Clears the head after a long morning.',
  grape_juice: 'Three handfuls of wild grapes pressed through a cloth. Summer in a cup.',
  bamboo_stirfry: 'Bamboo shoot and a garden vegetable tossed in a hot pan, the way Oduya does it at the Hangar.',
  honey_toast: 'Bread toasted on the galley ring, with hill honeycomb melting into it.',
  fiddlehead_tempura: 'Fern fronds in a light egg batter, crisp and green. A spring treat.',
  fruit_tart: 'Any fruit, an egg and a loaf for the crust. The pride of a farm kitchen.',
  fruit_salad: 'Two different fruits cut small. Wild apples and grapes count.',
  persimmon_jam: 'Two persimmons cooked down slowly into a deep orange jam.',
  chestnut_roast: 'Three chestnuts, scored and roasted until they split. Autumn on the Upper deck.',
  mushroom_soup: 'A hill mushroom simmered in milk. Frostcaps work in winter.',
  root_stew: 'Winter root, a garden root and a handful of nuts. Warms you right through.',
  honeyed_nuts: 'Pine nuts rolled in warm honeycomb. Keeps for weeks, but never lasts that long.',
  matsutake_grill: 'A matsutake and a hill herb over coals. The finest thing a farm kitchen can make.',
  forest_bento: 'Fish, a mushroom and a vegetable packed for a long walk. Restores almost a whole day\'s strength.',
  soup: 'A bowl of the Hangar\'s soup of the day. Oduya never says what is in it.',
  pie: 'A slice of the Hangar\'s pie, served warm.',
  tea: 'A cup of the Hangar\'s tea, strong enough to stand a spoon in.',
  tonic: 'Moraine\'s tonic, from the Ashfall Cartel\'s old stores. Restores everything; tastes of nothing you can name.',
  pendant: 'A drop of fused hull-glass that holds Earth\'s light, sold on Moraine\'s barge. On Eden you give it to the one you want to share your table with.',
  lumber: 'Cut timber from the farm and the hill, kept in the wood store. Ruess wants it for chests, the kitchen and the greenhouse.',
  feed: 'Chicken feed from Corran\'s ranch, kept in the coop. One a hen a day.',
  fodder: 'Fodder for the cows, from Corran or cut from your own pasture. One a cow a day.',
};
for (const it of Object.values(ITEMS)) {
  if (DETAIL[it.id]) it.detail = DETAIL[it.id];
  else if (it.kind === 'seed' && it.crop) { const c = CROPS[it.crop]; it.detail = `A paper bag of ${c.name.toLowerCase()} seeds from ${it.crop === 'moonflower' ? 'Moraine\'s barge' : 'Seln\'s store'}. It sows a 3×3 patch of tilled soil; water it every day and it ripens in ${c.days} days${c.regrow ? `, then gives again every ${c.regrow}` : ''}.`; }
  else if (it.id === 'seed_grass') it.detail = 'Pasture grass seed from Seln\'s store. Sow it in the pasture; in nine days the sickle cuts it to fodder, and it grows back.';
  else it.detail = it.desc;
}

// The Field-units (leased farm robots): their names and what they say (by mood).
export const ROBOT_NAMES = ['Mochi', 'Sprocket', 'Tamago', 'Pebble', 'Kettle', 'Daikon', 'Bolt', 'Yuzu'];
export const ROBOT_JOBS = { water: 'Water', harvest: 'Harvest', animals: 'Animals', rest: 'Rest' };
export const ROBOT_MOODS = {
  happy: ['Beep! Today was a good day.', 'All tasks done. The soil smells nice.', 'Whirr. I like this farm.'],
  proud: ['New skill level! I counted every leaf.', 'I am getting very good at this. Beep beep.'],
  tired: ['Charge low… a battery would be lovely.', 'Running on fumes. Well, on electrons.'],
  flat: ['Zzz… battery flat… please charge…', '…bip. (It is too flat to say more.)'],
  bored: ['Resting. Watching the sun-line.', 'No job today. I counted clouds. There are none; it is a colony.'],
  idle: ['Nothing needed doing. I polished my wheels.', 'Everything was already done! Beep.'],
};
