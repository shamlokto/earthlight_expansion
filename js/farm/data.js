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
  ['potato', 'Potato', 'potatoes', [0], 7, 0, 100, 150],
  ['cucumber', 'Cucumber', 'cucumbers', [0], 9, 5, 60, 200],
  ['strawberry', 'Strawberry', 'strawberries', [0], 8, 2, 30, 150],
  ['tomato', 'Tomato', 'tomatoes', [1], 9, 3, 60, 200],
  ['corn', 'Corn', 'corn', [1], 13, 4, 100, 300],
  ['onion', 'Onion', 'onions', [1], 7, 0, 100, 150],
  ['pumpkin', 'Pumpkin', 'pumpkins', [1], 14, 0, 250, 500],
  ['carrot', 'Carrot', 'carrots', [2], 7, 0, 120, 300],
  ['eggplant', 'Eggplant', 'eggplants', [2], 9, 3, 80, 120],
  ['sweetpotato', 'Sweet potato', 'sweet potatoes', [2], 6, 3, 60, 300],
  ['spinach', 'Spinach', 'spinach', [2], 5, 0, 80, 200],
  ['moonflower', 'Moonflower', 'moonflowers', [0, 1, 2], 18, 0, 420, 1000],
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

item('fish_s', 'Silverfin', 'fish', 'A small river fish.', { sell: 35 });
item('fish_m', 'River trout', 'fish', 'A decent catch.', { sell: 75 });
item('fish_l', 'Chamber carp', 'fish', 'A fish worth boasting about.', { sell: 130 });
item('fish_spring', 'Blossom dace', 'fish', 'Runs only in spring.', { sell: 110 });
item('fish_summer', 'Sunline perch', 'fish', 'Basks under the summer sun-line.', { sell: 120 });
item('fish_autumn', 'Copper eel', 'fish', 'An autumn eel the colour of old wire.', { sell: 150 });
item('fish_winter', 'Frost char', 'fish', 'Caught only in the cold.', { sell: 180 });
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
// Wild fruit trees: some of the trees already growing on the Upper deck bear fruit anyone may pick.
// season: when it fruits; most: fruit per picking; every: days between pickings.
export const WILD_TREES = {
  plum: { fruit: 'plum', season: 0, most: 3, every: 3 },
  loquat: { fruit: 'loquat', season: 1, most: 3, every: 3 },
  mulberry: { fruit: 'mulberry', season: 1, most: 4, every: 2 },
  wild_apple: { fruit: 'wild_apple', season: 2, most: 3, every: 3 },
  chestnut: { fruit: 'chestnut', season: 2, most: 4, every: 3 },
  yuzu: { fruit: 'yuzu', season: 3, most: 2, every: 3 },
};
item('plum', 'Wild plum', 'fruit', 'A small tart plum from the old orchard rows nobody owns any more. Spring.', { sell: 60, stamina: 6, detail: 'Wild plum trees flower white along the hill paths and fruit in spring. Anyone may pick them; they come back every few days. Good in a fruit tart.' });
item('loquat', 'Loquat', 'fruit', 'A golden early-summer fruit, sweet and a little floral.', { sell: 70, stamina: 8, detail: 'Loquats came up to the Upper deck in a seed vault and went wild. Summer, every few days, from trees on the hill and in the village.' });
item('mulberry', 'Mulberry', 'fruit', 'Dark summer mulberries that stain everything they touch.', { sell: 35, stamina: 5, detail: 'Mulberry trees grow along the colony irrigation lines. Summer; a handful every couple of days. Children of Willowfall come home purple.' });
item('yuzu', 'Yuzu', 'fruit', 'A fragrant winter citrus, too sour to eat, wonderful to cook with.', { sell: 120, stamina: 4, detail: 'The only tree on the Upper deck that fruits in winter, under the cool sun-line. The canteen pays well for them.' });
for (const t of Object.values(FRUIT_TREES)) item(`sapling_${t.id}`, `${t.name} sapling`, 'sapling', `Plant on farm grass (not the field). Grows for ${TREE_DAYS} days, then gives a ${t.fruit} a day in ${SEASONS[t.season].toLowerCase()}.`, { tree: t.id });

// Gear for the bigger farm: carried and placed things, and the field robots' batteries.
item('basket', 'Basket', 'tool', 'While it is in your hand, picked crops and forage go into the basket (30 in all). E at the bin ships the lot.');
item('field_chest', 'Field chest', 'placeable', 'A weatherproof chest. Hold it and press Space on free ground on the farm or the hill to set it down.');
item('solar_panel', 'Solar charger', 'placeable', 'A little panel that charges two robot batteries a day. Set it down on the farm like a chest.');
item('battery', 'Battery (empty)', 'part', 'A flat robot battery. Put it in a solar charger overnight.', { sell: 60 });
item('battery_full', 'Battery (charged)', 'part', 'A charged robot battery. Give it to a Field-unit with E (+60 charge).', { sell: 90 });

item('scrap', 'Scrap', 'ore', 'Scrap metal from the ruins.', { sell: 15 });
item('comet_ice', 'Comet ice', 'ore', 'Dirty ice from the belt, full of useful volatiles. Ruess always wants some.', { sell: 60, detail: 'Broken out of the pale comet-ice clusters in the belt, from sector 2 out, and now and then from plain rock. It sells, the Workshop uses it for coolant, and Ruess is fond of a gift of it.' });
item('star_metal', 'Star-metal', 'ore', 'A rare meteoric metal from deep in the belt, bright as a mirror.', { sell: 500, detail: 'Found only in the asteroid belt, from sector 3 out, and not often: a little more often the further north you fly, and most of all in the large and huge boulders, which want an Alloy or Starsteel hammer. Ruess needs one to fit the Pallas with air filters for the Old World.' });
item('alloy', 'Alloy', 'ore', 'Good alloy, broken from belt rocks from sector 5 out.', { sell: 40 });
item('crystal', 'Crystal', 'ore', 'A drive crystal, from medium boulders from sector 10 out, and from large and huge boulders anywhere.', { sell: 150 });
// The belt's other ores (2026-11-19): common nickel-iron and silica near the colony, copper and titanium a little
// further out, platinum-group nuggets deep. sim.BELT_ORES has the odds; Ruess turns most of them into something.
item('nickel_iron', 'Nickel-iron', 'ore', 'Grey, heavy ore that makes up most of the belt. Ruess smelts four into one alloy.', { sell: 25,
  detail: 'The commonest rock in the belt, from sector 1 out: iron and nickel, much as it came from the birth of the sun. Ruess smelts four of them into a bar of alloy for 100 cr, which saves you waiting for sector 5.' });
item('silica', 'Silica', 'ore', 'Glassy belt sand. The colony melts it into panes and solar cells.', { sell: 30,
  detail: 'Drifting grit and glassy nodules from the belt, from sector 1 out. Every window on Eden began as something like this. Ruess wants four, with two copper, to build more charging racks in the Willowfall solar yard.' });
item('copper', 'Copper ore', 'ore', 'Reddish, metal-bright ore from sector 2 out. Wiring, motors and batteries.', { sell: 45,
  detail: 'Bright copper, red-orange as a new coin, in a darker rock, from belt sector 2 out. Ruess winds two into a new robot battery for 80 cr, and it goes into the solar yard racks and the rock-splitter head for your hammer.' });
item('titanium', 'Titanium ore', 'ore', 'Light, stubborn ore from sector 4 out. Ruess uses it where things wear.', { sell: 90,
  detail: 'Pale, light and very hard to break, broken from belt sector 4 out. Ruess casts two into steel rollers for the feed mill (it grinds twice as much), three go into the rock-splitter hammer head and two line a bigger suit air tank.' });
item('platinum', 'Platinum nugget', 'ore', 'A heavy, soft-shining nugget of the platinum metals, deep in the belt.', { sell: 260,
  detail: 'Platinum, iridium and osmium, fused into a nugget the size of a thumb, from belt sector 8 out. It sells very well, Moraine adores it, and one tips the rock-splitter hammer head.' });

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
item('fish_grill', 'Grilled fish', 'food', 'Any fish, salt and a hot pan. Restores 50 stamina.', { stamina: 50, sell: 70 });
item('cooked_meal', 'Colony bento', 'food', 'Fish, egg and a vegetable in a tin box, the way crews ate on the carriers. Restores 90 stamina.', { stamina: 90, sell: 260 });
item('berry_jam', 'Berry jam', 'food', 'Berries and patience. Restores 25 stamina.', { stamina: 25, sell: 160 });
// More home cooking (2026-11-18): mountain food, fruit and the old favourites.
item('mint_tea', 'Mint tea', 'food', 'Wild mint and a hill herb, steeped. Restores 20 stamina.', { stamina: 20, sell: 140 });
item('grape_juice', 'Grape juice', 'food', 'Three handfuls of wild grapes, pressed. Restores 30 stamina.', { stamina: 30, sell: 230 });
item('bamboo_stirfry', 'Bamboo stir-fry', 'food', 'Bamboo shoot and a garden vegetable in a hot pan. Restores 45 stamina.', { stamina: 45, sell: 290 });
item('honey_toast', 'Honey toast', 'food', 'Bread, toasted, with hill honeycomb melting into it. Restores 40 stamina.', { stamina: 40, sell: 260 });
item('fiddlehead_tempura', 'Fiddlehead tempura', 'food', 'Fern fronds in a light egg batter. Restores 30 stamina.', { stamina: 30, sell: 180 });
item('fruit_tart', 'Fruit tart', 'food', 'Any fruit, an egg and bread for the crust. Restores 55 stamina.', { stamina: 55, sell: 270 });
item('fruit_salad', 'Fruit salad', 'food', 'Two different fruits, cut small. Restores 35 stamina.', { stamina: 35, sell: 260 });
item('persimmon_jam', 'Persimmon jam', 'food', 'Two persimmons cooked down slowly. Restores 30 stamina.', { stamina: 30, sell: 320 });
item('chestnut_roast', 'Roast chestnuts', 'food', 'Three chestnuts, scored and roasted. Restores 35 stamina.', { stamina: 35, sell: 240 });
item('mushroom_soup', 'Mushroom soup', 'food', 'A hill mushroom simmered in milk. Restores 50 stamina.', { stamina: 50, sell: 330 });
item('root_stew', 'Root stew', 'food', 'Winter root, a garden root and a handful of nuts. Restores 60 stamina.', { stamina: 60, sell: 360 });
item('honeyed_nuts', 'Honeyed nuts', 'food', 'Pine nuts rolled in warm honeycomb. Restores 30 stamina.', { stamina: 30, sell: 250 });
item('matsutake_grill', 'Grilled matsutake', 'food', 'A matsutake and a hill herb over coals. Restores 70 stamina.', { stamina: 70, sell: 700 });
item('forest_bento', 'Forest bento', 'food', 'Fish, a mushroom and a vegetable packed for a long walk. Restores 95 stamina.', { stamina: 95, sell: 560 });
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
  battery_full: 'A charged Field-unit battery. Give it to one of your robots with E (or from the journal\'s Robots tab) for 60 charge; you get the empty one back. A robot on the Batteries job swaps them in for you, and the mining unit runs on them in the belt.',
  scrap: 'Twisted metal from the Old World ruins and the near belt. Ruess wants five for every Alloy upgrade, and he never says no to more.',
  alloy: 'Good structural alloy, broken from asteroid rocks from belt sector 5 out. Five go into a Starsteel upgrade; three into the Pallas filters.',
  crystal: 'A drive crystal from the belt: in medium boulders from sector 10 out, and in large and huge boulders anywhere. Starsteel tools need one.',
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
  else if (it.detail) { /* given with the item */ }
  else if (it.kind === 'seed' && it.crop) { const c = CROPS[it.crop]; it.detail = `A paper bag of ${c.name.toLowerCase()} seeds from ${it.crop === 'moonflower' ? 'Moraine\'s barge' : 'Seln\'s store'}. It sows a 3×3 patch of tilled soil; water it every day and it ripens in ${c.days} days${c.regrow ? `, then gives again every ${c.regrow}` : ''}.`; }
  else if (it.id === 'seed_grass') it.detail = 'Pasture grass seed from Seln\'s store. Sow it in the pasture; in nine days the sickle cuts it to fodder, and it grows back.';
  else it.detail = it.desc;
}

// Star-plums (2026-11-18): small glowing violet fruit grown from seeds the colony's founders brought.
// Each raises max stamina by 10 (to 200). Ten are hidden about the colony, one place each.
item('star_plum', 'Star-plum', 'fruit', 'A small violet fruit that glows faintly. Eating one raises your max stamina by 10, for good.', { maxUp: 10,
  detail: 'Grown from the founders\' own seeds, and there are only a handful left on the whole ring. One may show itself on Terrace Hill on one day a season; the deep ruins hide two; the festivals, two old friends, a doctor, a queen and a collector each keep one.' });
item('colony_feast', 'Colony feast', 'food', 'Fish, fruit, a vegetable and an egg: a meal for the whole crew. Restores 100 stamina; the first one you eat raises max stamina by 5.', { stamina: 100, sell: 640, firstMaxUp: 5,
  detail: 'The founders\' landing-day meal, cooked from everything the ring grows. The first time you eat one, it raises your max stamina by 5 for good.' });
item('founders_cake', 'Founders\' cake', 'food', 'Honeycomb, chestnut, milk and egg, baked slow. Restores 80 stamina; the first one you eat raises max stamina by 5.', { stamina: 80, sell: 560, firstMaxUp: 5,
  detail: 'Marrow says the first crews baked it on the anniversary of the sealing, from the only sweet things they had. The first slice raises your max stamina by 5 for good.' });

// ---------------------------------------------------------------- Market Lane, the fold and the hives (2026-11-19)
// Earth seeds Noor Asante revived at the Seedhouse (sold there, not at Seln's: `shop`), the fold's goats and sheep, the duck
// house, the artisan machines and what the new shops of Market Lane bake, sew and tie. Every item carries its own detail.
// [id, name, plural, seasons, days, regrow, sale, bag, flower, detail]
const LANE_CROPS = [
  ['cabbage', 'Cabbage', 'cabbages', [0], 10, 0, 190, 260, 0, 'A tight spring cabbage from an Earth seed line Noor coaxed back to life. Slow, heavy and worth it; the heart of cabbage rolls.'],
  ['snap_pea', 'Snap pea', 'snap peas', [0], 7, 3, 50, 220, 0, 'Sweet spring peas that climb anything, including the scarecrow. Once ripe they give again every three days.'],
  ['tulip', 'Tulip', 'tulips', [0], 6, 0, 90, 180, 1, 'A cup of spring colour, grown from bulbs Noor found sealed in a seed bank drawer. Bees adore a bed of them; so does Noor.'],
  ['bell_pepper', 'Bell pepper', 'bell peppers', [1], 8, 3, 60, 220, 0, 'Glossy summer peppers that redden under the sun-line. They keep coming every three days, and Lark stuffs them with cheese.'],
  ['melon', 'Melon', 'melons', [1], 12, 0, 280, 480, 0, 'A netted summer melon, heavy as a hull bolt bag. Twelve days of patience; the colony has not tasted one since before the war.'],
  ['sunflower', 'Sunflower', 'sunflowers', [1], 9, 0, 130, 220, 1, 'Taller than Sato by the end of summer and turned faithfully to the sun-line. A beehive near a row of these works overtime.'],
  ['beet', 'Beet', 'beets', [2], 6, 0, 100, 220, 0, 'A deep red autumn beet that stains every board in the kitchen. Quick to grow; the base of Ruby beet soup.'],
  ['cranberry', 'Cranberry', 'cranberries', [2], 10, 2, 35, 260, 0, 'Sharp autumn berries on a low bush. Slow to start, then a handful every two days until the frost.'],
  ['cosmos', 'Cosmos', 'cosmos', [2], 7, 0, 110, 200, 1, 'Feathery autumn flowers in pink and white. The last good meal of the year for the bees, and Noor\'s favourite.'],
  ['kale', 'Kale', 'kale', [3], 6, 0, 110, 200, 0, 'Curly winter kale that sweetens in the cold. One of the few things that will grow outdoors on the Lantern Ring in winter.'],
  ['frost_leek', 'Frost leek', 'frost leeks', [3], 8, 4, 70, 260, 0, 'A winter leek bred on a ship that never saw a summer. Pull the green and it grows back every four days.'],
  ['snowbell', 'Snowbell', 'snowbells', [3], 8, 0, 140, 240, 1, 'A small white winter flower that nods under the snow. No bee is out to see it, but every florist on the ring wants one.'],
];
export const FLOWER_CROPS = [];
for (const [id, name, plural, seasons, days, regrow, sell, bag, flower, detail] of LANE_CROPS) {
  CROPS[id] = { id, name, plural, seasons, days, regrow, sell, bag, shop: 'florist', ...(flower ? { flower: true } : {}) };
  if (flower) FLOWER_CROPS.push(id);
  const when = SEASONS[seasons[0]].toLowerCase();
  item(id, name, 'crop', `Grown in ${when}${flower ? ', a flower' : ''}. Sells for ${sell} cr.`, { sell, detail });
  item(`seed_${id}`, `${name} seeds`, 'seed', `Sows a 3×3 patch. ${days} days, ${when}${regrow ? ', regrows' : ''}.`, { crop: id,
    detail: `Earth seed revived at the Seedhouse in Market Lane: Noor sells it in ${when}. It sows a 3×3 patch of tilled soil; water it for ${days} days${regrow ? `, then it gives again every ${regrow}` : ''}.` });
}
FESTIVAL_DAYS.push([1, 10]);            // the Bloom Fair in Market Lane (story.js FESTIVALS)
// The farm's second field: the East Terrace, cleared by Ruess (flags.eastfield). FIELD_ORIGINS: its top-left tile on the farm map.
export const EAST_FIELD = [12, 10], FIELD_ORIGINS = { farm: [3, 11], east: [48, 13] };
const lane = (id, name, kind, desc, more) => item(id, name, kind, desc, more);
lane('clippers', 'Clippers', 'tool', 'Shears a fed sheep whose fleece has grown.', { detail: 'Spring-steel shears from Corran\'s ranch. A fed sheep grows a fleece in three nights; stand beside her with these in your rucksack and Space takes it.' });
lane('goat_milk', 'Goat milk', 'animal', 'A bottle of fresh goat milk.', { sell: 120, detail: 'Milked from a fed goat once a day (the cow milker does the job). Tangier than cow milk, and the cheese press turns it into goat cheese overnight.' });
lane('goat_milk_l', 'Rich goat milk', 'animal', 'A creamy bottle from a goat who trusts you.', { sell: 190, detail: 'What a goat gives when her affection is high. It makes the same goat cheese, only more of it would be greedy: one bottle, one round.' });
lane('wool', 'Wool', 'material', 'A soft fleece, sheared from your own sheep.', { sell: 200, detail: 'Sheared with clippers from a fed sheep every few days. Pia Varga buys it at the tailor\'s, and the spinning wheel turns it into yarn overnight.' });
lane('fine_wool', 'Fine wool', 'material', 'A long, silky fleece from a well-loved sheep.', { sell: 360, detail: 'A happy sheep (high affection, brushed and fed) grows wool this fine. The spinning wheel makes two skeins of yarn from it; Pia makes a face she would deny.' });
lane('duck_egg', 'Duck egg', 'animal', 'A large blue-white duck egg.', { sell: 70, detail: 'Laid by a fed duck in the duck house by the east pond; collect them at the nest box. Richer than a hen\'s egg, and it does anything an egg can.' });
lane('duck_feather', 'Duck feather', 'material', 'A soft white down feather.', { sell: 40, detail: 'Fond ducks leave a feather or two in the nest now and then. Pia stuffs quilts with them, and Vesna wears one in her headphones.' });
lane('cheese', 'Farm cheese', 'artisan', 'A wheel of cheese from your own cows\' milk.', { sell: 280, stamina: 25, detail: 'Put a bottle of cow milk in the cheese press and it is a small wheel of farm cheese by morning. Good alone, better on toast.' });
lane('goat_cheese', 'Goat cheese', 'artisan', 'A soft white goat cheese, rolled in herbs.', { sell: 320, stamina: 25, detail: 'The cheese press turns a bottle of goat milk into this overnight. Lark puts it in everything, Corran pretends it is cow cheese, and the Harvest Fair has a chair for it.' });
lane('yarn', 'Yarn', 'material', 'A skein of homespun yarn.', { sell: 340, detail: 'Spun overnight on your spinning wheel from a fleece (two skeins from fine wool). Pia knits three into a scarf, and Vesna will trade a whole song for one.' });
lane('honey', 'Honey', 'artisan', 'A jar of farm honey.', { sell: 140, stamina: 20, detail: 'From your own beehives, spring to autumn: a jar every three days, every two with a bed of flowers within a few tiles (tulips, sunflowers, cosmos, moonflowers). The bees sleep through winter.' });
lane('cheese_press', 'Cheese press', 'placeable', 'Turns a bottle of milk into cheese overnight. Set it down on the farm.', { detail: 'A screw press Tika Brandt built from a hydraulic jack and a lot of opinions. Set it on the farm, E with milk puts a bottle in, and by morning it is cheese (goat milk gives goat cheese).' });
lane('spinning_wheel', 'Spinning wheel', 'placeable', 'Spins a fleece into yarn overnight. Set it down on the farm.', { detail: 'A treadle wheel Tika rebuilt from a bicycle and an old cable drum. E with wool puts a fleece on; by morning there is yarn. It squeaks on the upstroke and she says that is character.' });
lane('beehive', 'Beehive', 'placeable', 'A hive of colony bees. Honey every few days, spring to autumn.', { detail: 'A white hive box with a colony of Noor\'s bees, descendants of the hives that pollinated the first crops. Set it on the farm; flowers within a few tiles make it work faster. E collects the honey.' });
lane('yarn_scarf', 'Yarn scarf', 'craft', 'A long striped scarf, knitted by Pia from your yarn.', { sell: 1300, detail: 'Three skeins of your own yarn and an evening of Pia\'s needles. A gift almost anybody on the ring would be glad of in winter; she will tell you who.' });
lane('bouquet', 'Bouquet', 'craft', 'A bouquet tied with ribbon at the Seedhouse.', { sell: 450, detail: 'Noor ties them from her own beds or from flowers you bring, with a ribbon from Pia\'s offcuts. A bouquet says a great deal without anybody having to.' });
lane('record', 'Salvaged record', 'craft', 'An old-world vinyl record from the radio station\'s crates.', { sell: 240, detail: 'Vesna sells the doubles from Radio Willowfall\'s crates: voices and bands from before the fall, scratched and lovely. Ruess pretends not to want one.' });
lane('sun_bun', 'Sunrise bun', 'food', 'A sweet glazed bun from the Sunrise Oven. Restores 30 stamina.', { stamina: 30, detail: 'Lark Penhallow bakes them at four in the morning so they are warm when the sun-line comes up. Sticky, golden and gone by nine.' });
lane('seed_loaf', 'Seeded loaf', 'food', 'A dark loaf full of seeds. Restores 35 stamina.', { stamina: 35, detail: 'Lark\'s everyday loaf, with sunflower and pumpkin seeds from the Seedhouse. It counts as bread in any recipe that wants a crust.' });
lane('wild_violet', 'Wild violet', 'forage', 'A small purple spring flower from the hill.', { sell: 35, detail: 'Violets grow in the shade under the hill pines in spring. Steep them for blossom tea, or give a handful to someone who notices small things.' });
lane('elderflower', 'Elderflower', 'forage', 'A frothy head of cream summer blossom.', { sell: 45, detail: 'Elder bushes along the hill stream flower in summer. With a jar of honey it makes a cordial the whole village queues for.' });
lane('rosehip', 'Rosehip', 'forage', 'A bright red autumn rosehip.', { sell: 50, stamina: 4, detail: 'Wild roses climb the old terrace walls; in autumn the hips go scarlet. Sharp and full of goodness; it counts as fruit in the kitchen.' });
lane('snowdrop', 'Snowdrop', 'forage', 'A white winter flower pushing up through the snow.', { sell: 40, detail: 'The first flower of the cold, found on Terrace Hill in winter. It counts as a flower for blossom tea, and Noor keeps a pressed one in her notebook.' });
// Eleven dishes from the fold, the hives and Market Lane (sim.js LANE_RECIPES has what they need).
for (const [id, name, stamina, sell, desc] of [
  ['goat_cheese_salad', 'Goat cheese salad', 45, 720, 'Goat cheese crumbled over a fresh vegetable.'],
  ['cheese_omelette', 'Cheese omelette', 55, 520, 'An egg folded over farm or goat cheese.'],
  ['duck_custard', 'Duck egg custard', 50, 480, 'A duck egg, milk and honey, baked slow.'],
  ['honey_cake', 'Honey cake', 60, 520, 'Honey, an egg and a loaf\'s worth of crumb. A proper present.'],
  ['blossom_tea', 'Blossom tea', 25, 200, 'A flower and a hill herb, steeped.'],
  ['cheese_toast', 'Cheese toast', 45, 500, 'A loaf and a cheese under the grill.'],
  ['stuffed_peppers', 'Stuffed peppers', 65, 600, 'Bell pepper, cheese and onion or tomato, baked.'],
  ['cabbage_rolls', 'Cabbage rolls', 60, 420, 'Cabbage leaves round a root and an egg.'],
  ['honey_melon', 'Honeyed melon', 40, 520, 'Melon in cold honey. Summer on a plate.'],
  ['ruby_soup', 'Ruby beet soup', 60, 540, 'Beet, greens and milk. Very red, very warm.'],
  ['kale_frittata', 'Green frittata', 70, 640, 'Winter greens, a duck egg and cheese.'],
]) item(id, name, 'food', `${desc} Restores ${stamina} stamina.`, { stamina, sell, detail: `${desc} A farm-kitchen recipe from the Market Lane years, worth more than what goes into it.` });
ITEMS.honey_cake.detail = 'Honey, an egg and a loaf, baked in your own kitchen (Lark sells them too). Loved by more people in Willowfall than any other cake, which she finds suspicious.';
ITEMS.blossom_tea.detail = 'Any flower you have grown or picked (tulip, sunflower, cosmos, snowbell, violet, elderflower or snowdrop) and a hill herb or mint, steeped. Noor drinks nothing else.';

// The Field-units (leased farm robots): their names and what they say (by mood).
export const ROBOT_NAMES = ['Mochi', 'Sprocket', 'Tamago', 'Pebble', 'Kettle', 'Daikon', 'Bolt', 'Yuzu'];
export const ROBOT_JOBS = { water: 'Water', harvest: 'Harvest', animals: 'Animals', batteries: 'Batteries', rest: 'Rest' };
export const ROBOT_MOODS = {
  happy: ['Beep! Today was a good day.', 'All tasks done. The soil smells nice.', 'Whirr. I like this farm.'],
  proud: ['New skill level! I counted every leaf.', 'I am getting very good at this. Beep beep.'],
  tired: ['Charge low… a battery would be lovely.', 'Running on fumes. Well, on electrons.'],
  flat: ['Zzz… battery flat… please charge…', '…bip. (It is too flat to say more.)'],
  bored: ['Resting. Watching the sun-line.', 'No job today. I counted clouds. There are none; it is a colony.'],
  idle: ['Nothing needed doing. I polished my wheels.', 'Everything was already done! Beep.'],
  keeper: ['Everyone is charged. I counted twice.', 'Battery round done. Nobody went flat on my watch.', 'I like the chargers. They hum back.'],
};

// ---------------------------------------------------------------- the Lower deck, "the Undercroft" (2026-11-19, release 1)
// Cave fish from the pump halls, mushrooms grown in the catacomb beds, the parts that restore it, and the logs found there.
// [id, name, sale, stamina, desc, detail]
const UNDER_FISH = [
  ['cave_fish', 'Cave fish', 45, 0, 'A blind white fish from the flooded pump halls.', 'Pale as a candle and quite unbothered by the dark. The commonest catch in the Undercroft basins; Ansel Wick says they can hear you thinking about them.'],
  ['glowfish', 'Glowfish', 100, 0, 'A small fish with a soft cyan glow.', 'It glows faintly for an hour after it is caught, then sulks. Uncommon in the pump hall basins, a little less shy in the Sump.'],
  ['pipe_eel', 'Pipe eel', 140, 0, 'A long grey eel that lives in the pipes.', 'It lives inside the old drain pipes and comes out to feed when the hall lamps dim, after six in the evening.'],
  ['abyss_koi', 'Abyss koi', 1800, 0, 'Legendary: a deep-blue koi with silver star speckles.', 'Somebody kept koi in the cisterns before the war, and one of them never stopped growing. It rises only in the deep Sump, after eight at night, to a rod of Alloy or better. Wick has seen it twice.'],
];
for (const [id, name, sell, , desc, detail] of UNDER_FISH) item(id, name, 'fish', desc, { sell, detail });
// Mushrooms: no season, no watering. days to the first flush; regrow: days between flushes (0 = once); flushes in all.
export const MUSHROOMS = {
  shiitake: { id: 'shiitake', name: 'Shiitake', days: 6, regrow: 3, flushes: 4, yield: 2, sell: 90, weight: 36 },
  pale_oyster: { id: 'pale_oyster', name: 'Pale oyster', days: 4, regrow: 2, flushes: 4, yield: 2, sell: 60, weight: 36 },
  glowcap: { id: 'glowcap', name: 'Glowcap', days: 8, regrow: 4, flushes: 3, yield: 2, sell: 160, weight: 22 },
  deep_truffle: { id: 'deep_truffle', name: 'Deep truffle', days: 12, regrow: 0, flushes: 1, yield: 1, sell: 900, weight: 6 },
};
item('shiitake', 'Shiitake', 'crop', 'Brown cave mushrooms from a catacomb bed. Any season.', { sell: 90, stamina: 4, detail: 'Grown on old logs in the Undercroft catacombs: six days to the first flush, then more every three, four flushes a bag. Oduya says they taste of rain, which is odd, because they have never seen any.' });
item('pale_oyster', 'Pale oyster', 'crop', 'Pale oyster mushrooms in a cluster. Any season.', { sell: 60, stamina: 3, detail: 'The quickest of the catacomb mushrooms: four days, then a flush every two. Soft, mild, and very good fried in egg.' });
item('glowcap', 'Glowcap', 'crop', 'Small mushrooms with softly glowing teal caps.', { sell: 160, detail: 'They glow because they can, says Moth. Eight days to the first flush, then every four. Edible once cooked; the glow goes out in the pan, the flavour does not.' });
item('deep_truffle', 'Deep truffle', 'crop', 'A rare dark truffle from the deepest beds.', { sell: 900, detail: 'Now and then a spore bag takes the long way and gives one truffle after twelve days. Moraine would sell her crown for a basket of them, she says, and nobody believes her, quite.' });
item('spore_bag', 'Spore bag', 'seed', 'A cloth bag of mushroom spawn. E at an empty catacomb bed plants it.', { detail: 'Mixed spawn from the Undercroft: shiitake, pale oyster or glowcap, and once in a while a deep truffle. Plant it in a catacomb bed; no watering, no seasons, just patience and the dark.' });
item('pump_part', 'Pump part', 'part', 'A brass pump valve with a red handwheel.', { sell: 80, detail: 'Tobias Venn turns them out at his terminal from nickel-iron and copper, and the pump hall basins cough one up now and then. The old pumps eat them.' });
item('lamp_kit', 'Lamp kit', 'part', 'A boxed work-lamp kit.', { sell: 70, detail: 'A caged work lamp, a cable and a box of fiddly brackets. The Undercroft is lit one of these at a time.' });
item('log_tape', 'Log tape', 'keepsake', 'An old colony log tape, copied from a terminal.', { detail: 'A recorder cassette with a voice on it from the war. Every log you recover is kept in the farm journal (P), under Logs.' });
item('diary_page', 'Diary page', 'keepsake', 'A folded child\'s diary page with a crayon drawing.', { detail: 'Moth finds them in the catacomb crypts and keeps the ones with the best drawings. The writing is someone else\'s, from the war. The journal (P) keeps every page under Logs.' });
item('mushroom_skewer', 'Shiitake skewer', 'food', 'Shiitake and an onion over the coals. Restores 40 stamina.', { stamina: 40, sell: 300 });
item('oyster_fry', 'Oyster fry', 'food', 'Pale oysters fried in egg. Restores 35 stamina.', { stamina: 35, sell: 230 });
item('glowcap_broth', 'Glowcap broth', 'food', 'Glowcaps and a cave fish, simmered. Restores 60 stamina.', { stamina: 60, sell: 520 });
item('undercroft_stew', 'Undercroft stew', 'food', 'Any cave mushroom, a potato or root, and a fish. The enclave\'s Sunday pot. Restores 80 stamina.', { stamina: 80, sell: 440 });
item('truffle_omelette', 'Truffle omelette', 'food', 'A deep truffle shaved over egg and milk. Restores 90 stamina.', { stamina: 90, sell: 1500 });
Object.assign(ITEMS.mushroom_skewer, { detail: 'Shiitake threaded on a skewer with onion, or a hill herb, and turned over the coals. Venn eats three standing up and calls it lunch.' });
Object.assign(ITEMS.oyster_fry, { detail: 'Pale oysters dipped in beaten egg and fried soft. The enclave\'s breakfast, the mornings there was an egg.' });
Object.assign(ITEMS.glowcap_broth, { detail: 'Glowcaps simmered with a cave fish. The pot glows faintly for a minute, then thinks better of it. Very restoring.' });
Object.assign(ITEMS.undercroft_stew, { detail: 'Agnes Thorne\'s Sunday pot: a cave mushroom, a potato or a root, and a fish from Wick\'s basins. It kept eleven people going for three years.' });
Object.assign(ITEMS.truffle_omelette, { detail: 'A deep truffle shaved thin over egg and milk. Possibly the most expensive breakfast on Eden. Worth it.' });
// Where the logs of release 1 come from: a terminal (map prop act 'terminal', log id) or Moth's diary pages (by hearts).
export const LOWER_LOGS = [
  { id: 'quarantine', src: 'terminal' }, { id: 'requisition', src: 'terminal' }, { id: 'schedule', src: 'terminal' }, { id: 'galt_hands', src: 'wall' },
  { id: 'venn60', src: 'terminal' }, { id: 'catacombs', src: 'terminal' }, { id: 'ninefold', src: 'vault' },
  { id: 'pim_grey', src: 'page', hearts: 0 }, { id: 'pim_shaking', src: 'page', hearts: 2 }, { id: 'pim_galt', src: 'page', hearts: 4 }, { id: 'moth_sun', src: 'page', hearts: 6 },
];
// The Undercroft, release 2 (docs/FARM.md §14): what the Works makes, and the logs that finish the story.
item('tin_lantern', 'Tin lantern', 'craft', 'A little lantern pressed from scrap, with a glowcap wick.', { sell: 180, detail: 'Venn\'s press stamps them out of old ration tins: a pierced shade, a brass handle, a glowcap in a jar for a wick. The enclave lit its first winter with lanterns like this.' });
item('gear_brooch', 'Gear brooch', 'craft', 'A brooch made from a tiny brass gear and a copper wire.', { sell: 260, detail: 'A clock gear from a dead pump gauge, polished up and wired into a brooch. It still turns if you breathe on it.' });
item('pipe_whistle', 'Pipe whistle', 'craft', 'A whistle cut from a length of nickel pipe.', { sell: 140, detail: 'Wick taught Venn how to tune them: one note for "dinner", two for "come and look at this fish". Children love them. Parents are more measured.' });
item('ring_shard', 'Slice of ring three', 'keepsake', 'A thin, cold sliver of the broken ring from the vault. It glows a little.', { detail: 'All that is left of the machine under the Lower deck: a curved sliver of ring three, quite harmless now, that holds a faint blue light like a held breath. Venn cut it for you himself. "Something from it should end up with somebody kind."' });
LOWER_LOGS.push(
  { id: 'works_ledger', src: 'terminal' }, { id: 'galt_cover', src: 'terminal' }, { id: 'bathhouse', src: 'terminal' }, { id: 'marrow_last', src: 'wall' },
  { id: 'day211', src: 'reactor' }, { id: 'galt_door', src: 'reactor' }, { id: 'venn_key', src: 'reactor' },
  { id: 'ninefold_report', src: 'vault' }, { id: 'the_roll', src: 'vault' }, { id: 'agnes_letter', src: 'vault' },
);
FESTIVAL_DAYS.push([2, 19]);            // the Hub Cup in the Zero-G Arena (story.js FESTIVALS; held once the arena is restored)
item('hub_cup', 'The Hub Cup', 'keepsake', 'A small, dented silver cup on a magnetic base, so it stays put in zero-g.', { detail: 'The Lower deck\'s zero-g ball trophy, first played for in the old training drum. Venn made it from a pump bell. Your name is scratched on the base, under several older names nobody can read.' });
