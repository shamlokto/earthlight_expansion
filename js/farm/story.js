// Earthlight: Sato's Harvest — all the words (docs/FARM.md section 3.2).
// Pure data and pure functions: no DOM, no imports, no Math.random. Runs in Node and in browsers.
// Seasons are indices 0..3 (Spring, Summer, Autumn, Winter); season names are accepted too.
// Weekdays are 0 = Monday .. 6 = Sunday. Times are minutes since midnight.

const P = 'art/colony/portrait/';
const H = (h, m = 0) => h * 60 + m;
const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];
function seasonIndex(s) {
  if (typeof s === 'number' && s >= 0 && s <= 3) return s | 0;
  const i = SEASON_NAMES.indexOf(String(s ?? '').toLowerCase());
  return i < 0 ? 0 : i;
}

// ------------------------------------------------------------------ the cast

export const NPCS = {
  sato: {
    id: 'sato', name: 'Mira Sato', short: 'Sato', title: 'Farmer, late of the carrier service', portrait: P + 'sato.webp',
    look: { skin: '#e8c4a0', hair: '#1d2440', top: '#7a8c5c', bottom: '#4a4038', style: 'bob' },
    birthday: { season: 1, day: 2 }, loves: [], likes: [], dislikes: [],
  },
  general: {
    id: 'general', name: 'The General', short: 'General', title: 'Governor of Eden', portrait: P + 'general.webp',
    look: { skin: '#d9b38c', hair: '#2a2420', top: '#3d4a63', bottom: '#2b2f3a', style: 'short' },
    birthday: { season: 3, day: 12 },
    loves: ['strawberry', 'soup', 'bread', 'pie'],
    likes: ['tea', 'potato', 'tomato', 'egg', 'milk_m', 'fish_s', 'fish_m', 'book'],
    dislikes: ['medal', 'scrap', 'tonic'],
  },
  ruess: {
    id: 'ruess', name: 'Prof. Hal Ruess', short: 'Ruess', title: 'Chief engineer; the Workshop', portrait: P + 'ruess.webp',
    look: { skin: '#e0b896', hair: '#9a9da3', top: '#6b5a48', bottom: '#3a3632', style: 'short' },
    birthday: { season: 2, day: 21 },
    loves: ['scrap', 'alloy', 'crystal', 'datachip', 'watch'],
    likes: ['tea', 'bread', 'corn', 'potato', 'egg', 'musicbox', 'toy'],
    dislikes: ['moonflower', 'berry', 'spinach'],
    shop: 'workshop',
  },
  marrow: {
    id: 'marrow', name: 'Warden Ilse Marrow', short: 'Marrow', title: 'Warden of Willowfall', portrait: P + 'marrow.webp',
    look: { skin: '#e6c9b0', hair: '#d5d8dc', top: '#5a4a6e', bottom: '#33303c', style: 'bun' },
    birthday: { season: 3, day: 3 },
    loves: ['photo', 'book', 'strawberry', 'tea'],
    likes: ['teacup', 'musicbox', 'turnip', 'spinach', 'soup', 'herb', 'moonflower'],
    dislikes: ['scrap', 'alloy', 'tonic'],
  },
  seln: {
    id: 'seln', name: 'Ama Seln', short: 'Seln', title: "Hydroponics steward; Seln's Seed & Sundry", portrait: P + 'w_seln.webp',
    look: { skin: '#8a5a3c', hair: '#2b1d16', top: '#3f8f5a', bottom: '#6b5540', style: 'long' },
    birthday: { season: 0, day: 9 },
    loves: ['seedtin', 'moonflower', 'herb', 'pumpkin'],
    likes: ['strawberry', 'tomato', 'carrot', 'spinach', 'mushroom', 'berry', 'tea', 'teacup'],
    dislikes: ['scrap', 'alloy', 'tonic'],
    shop: 'store',
  },
  corran: {
    id: 'corran', name: 'Abel Corran', short: 'Corran', title: "Retired gunnery chief; Corran's Ranch", portrait: P + 'w_corran.webp',
    look: { skin: '#d8a888', hair: '#f0f0ec', top: '#8c3b2e', bottom: '#4b4a3a', style: 'bald' },
    birthday: { season: 1, day: 6 },
    loves: ['toy', 'milk_l', 'pie', 'corn', 'fish_king'],
    likes: ['milk_m', 'milk_s', 'egg', 'potato', 'bread', 'sweetpotato', 'fish_m', 'fish_l'],
    dislikes: ['scrap', 'eggplant', 'frostcap'],
    shop: 'ranch',
  },
  oduya: {
    id: 'oduya', name: 'Tem Oduya', short: 'Oduya', title: 'Dockyard engineer turned cook; the Hangar', portrait: P + 'w_oduya.webp',
    look: { skin: '#6e4630', hair: '#1a1614', top: '#e07b24', bottom: '#c96a1c', style: 'cap' },
    birthday: { season: 2, day: 15 },
    loves: ['tomato', 'onion', 'mushroom', 'fish_l', 'fish_autumn'],
    likes: ['egg', 'milk_m', 'potato', 'eggplant', 'herb', 'corn', 'fish_m', 'fish_summer'],
    dislikes: ['scrap', 'tonic', 'datachip'],
    shop: 'cafe',
  },
  maris: {
    id: 'maris', name: 'Juno Maris', short: 'Maris', title: 'Courier pilot', portrait: P + 'w_maris.webp',
    look: { skin: '#c99672', hair: '#5a3622', top: '#3a78b8', bottom: '#d9d2c0', style: 'short' },
    birthday: { season: 0, day: 25 },
    loves: ['berry', 'pie', 'strawberry', 'musicbox'],
    likes: ['bread', 'corn', 'milk_s', 'sweetpotato', 'cucumber', 'tea', 'ring', 'fish_spring'],
    dislikes: ['scrap', 'onion', 'frostcap'],
  },
  vashti: {
    id: 'vashti', name: 'Nell Vashti', short: 'Vashti', title: 'Salvage hunter; keeper of the Descent', portrait: P + 'w_vashti.webp',
    look: { skin: '#b98a66', hair: '#3b2a20', top: '#55604a', bottom: '#2f2c28', style: 'bandana' },
    birthday: { season: 1, day: 17 },
    loves: ['crystal', 'photo', 'watch', 'datachip', 'medal'],
    likes: ['teacup', 'book', 'toy', 'seedtin', 'musicbox', 'ring', 'soup', 'mushroom'],
    dislikes: ['tonic', 'cucumber', 'tea'],
  },
  moraine: {
    id: 'moraine', name: 'Queen Moraine', short: 'Moraine', title: 'Of the Ashfall Cartel; trader', portrait: 'svg:moraine',
    look: { skin: '#caa58a', hair: '#7a1f2b', top: '#1f1a24', bottom: '#b8922e', style: 'long' },
    birthday: { season: 3, day: 21 },
    loves: ['ring', 'crystal', 'moonflower', 'fish_king'],
    likes: ['tea', 'teacup', 'strawberry', 'pumpkin', 'musicbox', 'tonic', 'fish_l'],
    dislikes: ['scrap', 'turnip', 'fish_s'],
    shop: 'barge',
  },
};

export const VILLAGERS = ['general', 'ruess', 'marrow', 'seln', 'corran', 'oduya', 'maris', 'vashti', 'moraine'];

export const SPOTS = [
  'farm.porch', 'farm.bin', 'farm.gate', 'farm.pond', 'farm.field',
  'village.square', 'village.memorial', 'village.bridge', 'village.dock', 'village.bench', 'village.storefront',
  'village.cafefront', 'village.hallfront', 'village.workshopfront', 'village.ranchyard', 'village.river',
  'hill.wreck', 'hill.lake', 'hill.overlook',
  'store.counter', 'store.floor', 'ranch.counter', 'workshop.counter', 'workshop.bench',
  'cafe.counter', 'cafe.table1', 'cafe.table2', 'cafe.table3', 'hall.desk', 'hall.floor',
];

// ------------------------------------------------------------------ festivals

export const FESTIVALS = [
  {
    id: 'planting', name: 'Planting Day', season: 0, day: 18, from: H(10), to: H(15), spot: 'village.square',
    blurb: 'Planting Day in the square from ten: bring clean hands and expect to leave with dirty ones.',
    lines: [
      { who: 'narrator', text: 'The square smells of turned earth. Somebody has dug a long bed where the old parade markings used to be.' },
      { who: 'marrow', text: 'Every household plants one row. Not for the ledger. For whoever is here in a hundred years.' },
      { who: 'seln', text: "The seed is Eden's own strain. It slept through the whole war in a cold drawer. Be gentle, it's older than you." },
      { who: 'corran', text: 'Straight rows, mind! I ran a gun deck for thirty years, I know a crooked line when I see one!' },
      { who: 'maris', text: 'Yours is the crooked one, Chief.' },
      { who: 'corran', text: "...It's following the contour." },
      { who: 'general', text: 'May I take the row beside yours, Sato? I am told you have become the expert.' },
      { who: 'sato', text: 'Seventeen days in. I know which end of the seed goes down. Stay close, sir, and I will share the secret.' },
      { who: 'ruess', text: 'I built a drill that plants forty rows an hour. Marrow has banned it. Apparently it lacks soul.' },
      { who: 'marrow', text: 'It also lacks brakes, Professor. Hands, please. All of you.' },
      { who: 'narrator', text: 'By three the bed is planted and watered, and nobody can say afterwards which row was whose.' },
      { who: 'seln', text: 'Take these home, Mira. A field that size wants potatoes in it.' },
    ],
    reward: { item: ['seed_potato', 2] },
  },
  {
    id: 'lantern', name: 'Lantern Night', season: 1, day: 24, from: H(18), to: H(22), spot: 'village.bridge',
    blurb: 'Lantern Night at the bridge from six: one lantern on the river for each name you carry.',
    lines: [
      { who: 'narrator', text: 'The sun-line dims to its last thread. Along the bridge, paper lanterns wait in rows, each with a name inked on its side.' },
      { who: 'marrow', text: 'We do not make speeches tonight. We say a name, we set it on the water, and we watch it go.' },
      { who: 'corran', text: 'Number two battery. Six lanterns. I folded them myself, so they will leak, and the lads would have laughed.' },
      { who: 'maris', text: "I've one for every letter I carried back unopened. I ran out of paper, so some are sharing." },
      { who: 'oduya', text: 'Dock four, night shift. They never did let me finish feeding them.' },
      { who: 'vashti', text: '...One. No name on it. I am still looking for the name.' },
      { who: 'general', text: 'I have rather a lot. I hope the river will forgive the traffic.' },
      { who: 'sato', text: 'Hand me half, sir. You always did try to carry the whole manifest yourself.' },
      { who: 'narrator', text: 'They kneel side by side on the bank and launch them one at a time. Neither of them hurries.' },
      { who: 'moraine', text: 'I sold to both sides, Captain. So I have brought lanterns for both. It seemed the only honest count.' },
      { who: 'narrator', text: 'The lights drift under the bridge and down the long curve of the chamber, until the river above and the river below both carry stars.' },
      { who: 'marrow', text: 'There. Now they know the way home. Go and eat something, all of you. Tem has soup on.' },
    ],
    reward: { loveAll: 2 },
  },
  {
    id: 'harvest', name: 'Harvest Fair', season: 2, day: 9, from: H(10), to: H(16), spot: 'village.square',
    blurb: 'Harvest Fair in the square from ten: best of the season on the long table, judged by people with strong opinions.',
    lines: [
      { who: 'narrator', text: 'Trestle tables fill the square: marrows like torpedoes, jars of everything, and one cheese that has its own chair.' },
      { who: 'marrow', text: 'Entries on the long table. Judging is by taste, by weight, and by whether I like the look of it.' },
      { who: 'corran', text: "Feast your eyes! Milk from Duchess, my best girl. She'd have made gunnery chief if she had thumbs." },
      { who: 'oduya', text: "I'm cooking whatever wins. So win with something that goes with onions, would you?" },
      { who: 'seln', text: "Let me see what you've brought, Mira. Oh. Oh, that's honest work. Look at the colour on it." },
      { who: 'sato', text: 'It grew. I stood near it and worried. I am not certain which of us deserves the credit.' },
      { who: 'ruess', text: "I've weighed every entry twice. The scale is mine and it is accurate to a hair, whatever Corran says." },
      { who: 'corran', text: 'That scale is rigged against dairy!' },
      { who: 'maris', text: 'The Hollin field takes a ribbon! First one since before the war. Somebody ring something!' },
      { who: 'general', text: 'Well earned. I have pinned a good many things on your jacket, Sato. I think this one suits you best.' },
      { who: 'sato', text: 'It is the only one that came with prize money, sir. That helps.' },
      { who: 'narrator', text: 'Oduya cooks the winners in a pan the size of a hatch cover, and the whole village eats standing up.' },
    ],
    reward: { money: 800 },
  },
  {
    id: 'yearsend', name: "Year's End", season: 3, day: 30, from: H(18), to: H(23), spot: 'village.square',
    blurb: "Year's End in the square from six: a fire, a pot, and the great window open on Earth at midnight.",
    lines: [
      { who: 'narrator', text: 'Snow lies on the square, and in the middle of it a fire that Ruess insists is perfectly under control.' },
      { who: 'oduya', text: 'Bowls! Take a bowl, pass a bowl. Nobody sees the new year in on an empty stomach in my chamber.' },
      { who: 'marrow', text: 'Another year with air in it. I counted every day. There was a time I was not certain I would get to.' },
      { who: 'seln', text: 'The seed drawers are full again. First time in eleven years I have had to label a new one.' },
      { who: 'maris', text: 'I flew four hundred runs this year and not one of them was a casualty list. Best year of my life.' },
      { who: 'vashti', text: '...I came down off the hill. Do not make a fuss about it.' },
      { who: 'moraine', text: 'A year of honest trade. I find I can sleep on it. Tell no one; I have a reputation.' },
      { who: 'general', text: 'When I signed away the fleet I thought it was the end of something. It appears I had the direction wrong.' },
      { who: 'sato', text: 'You usually had the direction right, sir. It was the arrival time you guessed at.' },
      { who: 'narrator', text: 'At midnight the shutters of the great window roll back. Earth hangs there, grey and scarred, and along one coast, faintly, green.' },
      { who: 'corran', text: "To the ones who aren't here! And to the ones who are, the stubborn lot of you!" },
      { who: 'sato', text: 'To next year. I have plans for the east corner.' },
    ],
    reward: { loveAll: 2 },
  },
];

function festivalOf(ctx) {
  if (!ctx || !ctx.festival) return null;
  const s = seasonIndex(ctx.season);
  return FESTIVALS.find((f) => f.id === ctx.festival) || FESTIVALS.find((f) => f.season === s && f.day === ctx.day) || FESTIVALS[0];
}

// ------------------------------------------------------------------ schedules

// pick(m, [from, to, spot], ...) -> the spot of the first block containing m, or null.
function pick(m, ...blocks) {
  for (const [a, b, spot] of blocks) if (m >= a && m < b) return spot;
  return null;
}

const SCHEDULE = {
  // Store: closed Sunday.
  seln(wd, m) {
    if (wd === 6) return pick(m, [H(9), H(12), 'village.river'], [H(12), H(14), 'cafe.table1'], [H(14), H(17), 'hill.lake'], [H(17), H(18, 30), 'village.bench']);
    const tea = wd === 0 || wd === 3;
    return pick(m, [H(8), H(9), 'village.storefront'], [H(9), H(17), 'store.counter'],
      [H(17), H(18, 30), wd % 2 ? 'village.river' : 'village.square'],
      [H(18, 30), H(20, 30), tea ? 'cafe.table1' : 'village.storefront']);
  },
  // Ranch: closed Thursday.
  corran(wd, m) {
    if (wd === 3) return pick(m, [H(9), H(11), 'village.memorial'], [H(11), H(13), 'workshop.bench'], [H(13), H(16), 'village.dock'], [H(16), H(20), 'cafe.table2']);
    const pint = wd === 0 || wd === 2 || wd === 4 || wd === 5;
    return pick(m, [H(7), H(9), 'village.ranchyard'], [H(9), H(17), 'ranch.counter'], [H(17), H(18), 'village.ranchyard'],
      [H(18), H(21), pint ? 'cafe.table2' : (wd === 6 ? 'village.river' : 'village.bridge')]);
  },
  // Workshop: closed Wednesday.
  ruess(wd, m) {
    if (wd === 2) return pick(m, [H(10), H(13), 'hill.wreck'], [H(13), H(15), 'hill.overlook'], [H(15), H(18), 'village.river'], [H(18), H(20, 30), 'cafe.table3']);
    const supper = wd === 1 || wd === 3 || wd === 5;
    return pick(m, [H(8), H(9), 'village.workshopfront'], [H(9), H(17), 'workshop.counter'], [H(17), H(18, 30), 'village.workshopfront'],
      [H(18, 30), H(21), supper ? 'cafe.table3' : 'village.bridge']);
  },
  // The Hangar: every day, ten till ten.
  oduya(wd, m) {
    const market = wd === 0 || wd === 3;
    return pick(m, [H(8), H(9, 30), market ? 'village.dock' : 'village.river'], [H(9, 30), H(10), 'village.cafefront'], [H(10), H(22), 'cafe.counter']);
  },
  // The Hall: desk hours Monday to Friday.
  marrow(wd, m) {
    if (wd === 5) return pick(m, [H(9), H(10), 'village.hallfront'], [H(10), H(11, 30), 'store.floor'], [H(11, 30), H(14), 'village.square'], [H(14), H(18), 'village.bench']);
    if (wd === 6) return pick(m, [H(10), H(12), 'village.memorial'], [H(12), H(15), 'village.bridge'], [H(15), H(18), 'village.square']);
    const supper = wd === 1 || wd === 4;
    return pick(m, [H(8), H(9), 'village.hallfront'], [H(9), H(16), 'hall.desk'], [H(16), H(17, 30), 'village.square'],
      [H(17, 30), H(19), wd === 0 || wd === 3 ? 'village.memorial' : 'village.bench'],
      [H(19), H(20, 30), supper ? 'cafe.table1' : 'village.hallfront']);
  },
  // The courier: the farm's bin at five, the village otherwise.
  maris(wd, m) {
    const round = ['village.ranchyard', 'village.workshopfront', 'village.bridge', 'village.square', 'village.ranchyard', 'village.memorial', 'village.river'][wd];
    return pick(m, [H(8), H(9, 30), wd === 5 ? 'village.square' : 'village.dock'],
      [H(9, 30), H(10, 30), wd < 5 ? 'hall.floor' : 'village.hallfront'],
      [H(10, 30), H(12), 'village.storefront'], [H(12), H(13, 30), 'cafe.table2'], [H(13, 30), H(16, 20), round],
      [H(16, 20), H(17), 'farm.gate'], [H(17), H(17, 40), 'farm.bin'], [H(17, 40), H(18, 10), 'farm.gate'],
      [H(18, 30), H(20, 30), wd === 1 || wd === 6 ? 'cafe.table2' : 'village.cafefront']);
  },
  // The Descent: the lift pad on the hill.
  vashti(wd, m) {
    if (wd === 6) return pick(m, [H(9), H(11), 'hill.lake'], [H(11, 30), H(15), 'cafe.table3'], [H(15), H(18), 'hill.wreck']);
    if (wd === 4 && m >= H(15, 30) && m < H(17)) return 'workshop.bench';
    const lake = wd === 1 || wd === 3 || wd === 5;
    return pick(m, [H(8), H(18), 'hill.wreck'], [H(18), H(20, 30), lake ? 'hill.lake' : 'hill.overlook']);
  },
  // Saturdays at the dock; her barge is her counter.
  moraine(wd, m) {
    return wd === 5 ? pick(m, [H(9), H(17), 'village.dock']) : null;
  },
  // Saturdays in the village, Sundays at the farm; from year 2, Wednesday evenings at the Hangar.
  general(wd, m, c) {
    if (wd === 5) return pick(m, [H(10), H(11, 30), 'village.memorial'], [H(11, 30), H(13, 30), 'village.bridge'], [H(13, 30), H(15, 30), 'cafe.table1'], [H(15, 30), H(18), 'village.river']);
    if (wd === 6) {
      if (m < H(11) || m >= H(16)) return null;
      if (c.weather === 'rain' || c.weather === 'snow') return 'farm.porch';
      return pick(m, [H(11), H(12, 30), 'farm.porch'], [H(12, 30), H(14, 30), 'farm.field'], [H(14, 30), H(16), 'farm.pond']);
    }
    if (wd === 2 && (c.year || 1) >= 2) return pick(m, [H(18), H(21), 'cafe.table1']);
    return null;
  },
};

const FESTIVAL_SPOTS = {
  'village.square': {
    general: 'village.memorial', marrow: 'village.square', seln: 'village.storefront', corran: 'village.square', ruess: 'village.bench',
    oduya: 'village.cafefront', maris: 'village.square', vashti: 'village.bench', moraine: 'village.hallfront',
  },
  'village.bridge': {
    general: 'village.bridge', marrow: 'village.bridge', seln: 'village.river', corran: 'village.river', ruess: 'village.bench',
    oduya: 'village.bench', maris: 'village.bridge', vashti: 'village.dock', moraine: 'village.dock',
  },
};

export function whereIs(npcId, ctx) {
  const plan = SCHEDULE[npcId];
  if (!plan || !ctx) return null;
  const m = Number(ctx.minute) || 0;
  const wd = (((Number(ctx.weekday) || 0) % 7) + 7) % 7;
  const storm = ctx.weather === 'storm';
  let spot = null;
  const fest = festivalOf(ctx);
  if (fest) {
    // Shops are shut all day; the village gathers from an hour before until the end.
    if (m >= fest.from - 60 && m < fest.to) spot = (FESTIVAL_SPOTS[fest.spot] || FESTIVAL_SPOTS['village.square'])[npcId] || fest.spot;
    else if (npcId === 'vashti' && m >= H(8) && m < Math.min(H(18), fest.from - 60)) spot = 'hill.wreck';
    if (storm) spot = null;
  } else {
    spot = plan(wd, m, ctx);
    // A storm keeps everyone at home, except the Hangar and whoever is already inside it.
    if (storm && !(spot && spot.startsWith('cafe.'))) spot = null;
    // Nobody but Vashti climbs the hill in the wet.
    else if ((ctx.weather === 'rain' || ctx.weather === 'snow') && spot && spot.startsWith('hill.') && npcId !== 'vashti') spot = npcId === 'ruess' ? 'village.workshopfront' : 'village.bench';
  }
  return spot ? { spot } : null;
}

// ------------------------------------------------------------------ small talk

// A conversation is a string (one line) or an array of 1-3 lines.
// Keys: first, bday, b0..b3 (friendship bands 0-2, 3-5, 6-8, 9-10 hearts), s0..s3 (seasons), rain / snow / sun / storm,
// morning, evening, eve: { festivalId }, fest, greenhouse, year2, fish, farm (the General's Sundays).
export const TALK = {
  general: {
    first: ['Captain. No... forgive me. Old habit.', "So you bought the Hollin field. I am told it looks like a dockyard the morning after a raid. You'll manage. You always did."],
    bday: ["You remembered. I'd hoped nobody would; the Council wanted a parade.", 'This is better than a parade. Thank you.'],
    b0: [
      'Eden put forty-one petitions on my desk this morning. One concerned a goose. I came here instead.',
      ['How is the soil?', 'I ask because nobody in my office can answer a question in fewer than nine pages.'],
      'You look well, Sato. Tired, but the right sort of tired.',
    ],
    b1: [
      ['I keep reaching for your report at six bells.', 'Then I remember your report is a row of turnips, and I find I prefer it.'],
      "The Council calls me Governor. The children call me 'that man'. The children are nearer the mark.",
      ['I walked here from the lift. Nobody stopped me to sign anything.', 'It was the best half hour of my week.'],
    ],
    b2: [
      ['I used to know what tomorrow looked like. It looked like a map with arrows on it.', 'Yours looks like weather and a watering can. I envy you a little.'],
      "You never salute me any more. Please don't start. I mention it only to say thank you.",
      ["Marrow says I'm thinner. Oduya says I'm thinner. They have formed an alliance.", 'I am being fed on two fronts.'],
    ],
    b3: [
      ['I catch myself counting the days to Sunday.', 'A governor should not admit that. A friend may.'],
      'I slept the whole night after last Sunday. First time since the Nineveh. I blame your field.',
      ['When the office gets loud I think of this place. The pond. The shutter you still have not mended.', 'It helps more than you would think.'],
    ],
    s0: 'Spring in a sealed chamber. The climate plant schedules it, and still the blossom surprises everyone. Me included.',
    s1: "They have turned the sun-line up for summer. Ruess says two per cent. My collar says more.",
    s2: 'Autumn suits Eden. Everything the colour of old brass, and for once nothing is on fire.',
    s3: ['Winter, made to order. I signed the requisition for it myself.', 'I regret nothing. Look at it.'],
    rain: 'Scheduled rain. I approved the timetable and forgot my coat anyway.',
    snow: "I asked the plant for light snow. This is what an engineer believes 'light' means.",
    sun: 'A clear day, the whole length of the chamber. You can see the far fields overhead. I never tire of that.',
    morning: "I took the early lift. The duty officer believes I am inspecting pumps.",
    evening: "Earth is coming up in the great window. Still grey. A little less grey than last year, I tell myself.",
    eve: {
      lantern: ['Lantern Night tomorrow. I have a great many lanterns to float.', "I'd be glad of company on the bridge, if you are going."],
      yearsend: "Year's End tomorrow. Marrow has ordered me to enjoy myself. I intend to obey.",
    },
    fest: 'No speeches today. I promised Marrow, and she has my word in writing.',
    greenhouse: "Ruess showed me your greenhouse as if he'd grown it himself. I let him. Well done, Sato.",
    year2: ["A full year on the land. You have outlasted three of my deputy governors.", "Don't tell them I said so."],
    fish: [
      ["I've had a line in the water for an hour. The fish have convened a council and voted against me.", "It's wonderfully restful."],
      "Corran swears Old Hollin took his rod last autumn. I've read less plausible after-action reports. Not many.",
    ],
    farm: [
      ['Give me a job. Something with no consequences.', 'Weeding. Excellent. Nobody was ever court-martialled over a weed.'],
      'I brought my own gloves this time. Corran laughed at them. They are perfectly good gloves.',
    ],
  },

  ruess: {
    first: ["Sato! So it's true. You've traded a carrier for a cabbage patch.", "Good. Bring me your tools when they wear out. They will. Field-grade steel is mostly optimism."],
    bday: ["My birthday? Who told you? Marrow. It's always Marrow.", "...Thank you, girl. Now stop looking at me like that, I've work to do."],
    b0: [
      "Don't touch that. Or that. That one's fine, it's only a kettle.",
      ['Tool upgrades take a night. I could do it in an hour, but then people would expect it in an hour.'],
      'I used to keep forty machines flying on spit and wire. Now I sharpen hoes. Do you know, I sleep better.',
    ],
    b1: [
      ["You're holding that hammer like a sidearm. Loosen the wrist. It's a rock, it isn't going to shoot back."],
      ['People bring me broken clocks now. Clocks! Nobody ever died of a slow clock.', "It's marvellous."],
      "Bring me scrap from the Old World when you go down. The old alloys are better than anything we cast today.",
    ],
    b2: [
      ["I had a look at that Pallas of yours. Somebody has been oiling the salvage arm properly.", 'Don\'t tell me who. Let an old man believe he taught you something.'],
      ['Every battery I ever built, I knew what it was for. I never liked knowing.', 'A watering can, now. There is a clean conscience in a watering can.'],
      "You always brought my Crabs home, Sato. Dented, but home. I never said thank you. I'm saying it to the hoe.",
    ],
    b3: [
      ['I never had children. I had engines, and one calm young captain who would not take advice.', 'The engines were less trouble. I was prouder of the captain.'],
      "If the General turns up at your gate looking lost again, feed him. He forgets. He always forgot.",
      "I've started a design for a wind-chime. A wind-chime! If you tell Corran I will deny it under oath.",
    ],
    s0: "Spring. Everyone wants their hoe sharpened by Tuesday. I have one grindstone and two hands.",
    s1: "Summer storms are the plant venting heat. I helped write the schedule. Yes, I do apologise for it.",
    s2: 'Autumn. The condensers hum a half-tone lower in the cool. Listen. ...No? Nobody ever can.',
    s3: 'Winter is when I finally get to the repair shelf. That shelf has things on it from before the coup.',
    rain: "Rain on the workshop roof. Best sound in the chamber. Second best: a bearing that's stopped squeaking.",
    snow: "Don't leave your can full overnight in this. Ice has split better steel than yours.",
    sun: 'Fine day. Sun-line is running at ninety-eight per cent. I checked. I always check.',
    morning: "Too early for questions. Ask me after the kettle's boiled.",
    evening: 'Shop is shut. I am only standing here thinking, and that is free.',
    eve: {
      planting: "Planting Day tomorrow. I've a seed drill that does forty rows an hour. Marrow says no. Again.",
      harvest: "I'm bringing my own scale to the Fair tomorrow. Last year's weighing was a scandal.",
    },
    fest: "I'm told I am here to enjoy myself. I've brought a screwdriver in case that fails.",
    greenhouse: "That greenhouse frame was true to a hair when I left it. If a pane rattles, it is the wind's fault.",
    year2: ["A year, and you have not once asked me to put the guns back on that Pallas.", "I'd have refused. I'm glad I never had to."],
    fish: [
      "Seln sells you the rod; I can make it better. New reel, proper line. Then the only weak part left is you.",
      "Old Hollin? I've seen the sonar trace from the lake. Either it is a carp or someone has lost a small boat.",
    ],
  },

  marrow: {
    first: ['You will be the soldier who bought the Hollin field. I am Marrow. I keep the hall, the records and my opinions.', 'Come to me if you need anything. Come sooner if you think you do not.'],
    bday: ['At my age one stops counting and starts collecting. And yet here you are with a gift.', 'Sit down, child. You have made an old warden very pleased.'],
    b0: [
      'The Hollins were good farmers. The field remembers how. You will have to remind it.',
      'Hall hours are nine till four, Monday to Friday. Outside those hours I am merely a woman with a kettle.',
      "Willowfall has ninety-three souls. Ninety-four, now. I have written you in the book. In ink.",
    ],
    b1: [
      ['People here will not ask about the war. That is not coldness.', 'It is the best manners we have.'],
      'You wave back now when the children wave. Took you a fortnight. I was keeping count.',
      'Bring what you find in the Old World to the Memory Room. The children should know what was good down there.',
    ],
    b2: [
      ["When the chamber lost its air I knew every name on my list. I still say them over, most mornings.", 'It is shorter than saying nothing.'],
      ['You look less like someone waiting for an alarm.', 'It took me three years after we came up from the catacombs. You are quicker than I was.'],
      'There were strawberries by the Lantern Ring, before. A child wrote to tell me so. Plant some, would you?',
    ],
    b3: [
      ['I have buried enough and counted enough. Now I mostly watch things grow.', 'Your field is my favourite thing to watch. Do not let it go to your head.'],
      "The General sits easier in your kitchen than in his own office. I notice things. It is my trade.",
      'When I am gone, somebody must know every name. I have been wondering whether farmers have good memories.',
    ],
    s0: 'Spring. I have the planting rota drawn up and three volunteers who do not know it yet.',
    s1: 'Summer. Mind the storms; when the warning bell goes, you go indoors. I do not ring it for my amusement.',
    s2: 'Autumn was always our best season. Even in the bad years the apples came. Fewer, but they came.',
    s3: 'Winter. Check on your neighbours. That is not a suggestion, it is the oldest by-law we have.',
    rain: 'A good soaking rain. The river will be up at the bridge by evening, and all the better for it.',
    snow: 'Snow on the memorial. I brush the names clear each morning. They should be able to see out.',
    sun: 'A bright day. I can read the far side of the chamber like a page. Someone over there has not mown.',
    morning: 'Up with the sun-line. Good. The Hollins were early risers too.',
    evening: 'The day is done and nobody needed me for anything dreadful. I call that a triumph.',
    eve: {
      planting: 'Planting Day tomorrow, ten sharp in the square. One row per household. Yours is a household now.',
      lantern: 'Lantern Night tomorrow. Bring a name, or several. The river has room.',
      harvest: 'The Fair is tomorrow. Bring the best thing you have grown. Not the biggest. The best.',
      yearsend: "Year's End tomorrow evening. The great window opens at midnight. Do not sleep through it.",
    },
    fest: 'Everyone is here and nobody is arguing. Write the date down; it may not happen twice.',
    greenhouse: "The Hollin greenhouse, with glass in it again. Old Bren Hollin would have wept. Then complained about the putty.",
    year2: ['Your second year. The first year a field tests you. The second, it begins to trust you.', 'So does the village, as it happens.'],
    fish: [
      'Old Hollin was in that lake before the war and before the air went. Some say it is why the lake never froze through.',
      'My husband fished the river every Sunday for thirty years and caught, by my count, a boot. He was very happy.',
    ],
  },

  seln: {
    first: ["Oh! You're Mira. I'm Ama. Seeds, bread, a bit of everything. Welcome to Willowfall.", "Start with turnips. They forgive nearly anything. I'd never say that about strawberries."],
    bday: ["For me? Oh, you kind thing. Nobody's remembered since the hydroponics bay.", "I'm putting this where I can see it from the counter."],
    b0: [
      "A seed bag sows a block three by three. Till it first, water it after. That's most of farming, honestly.",
      "Shop's shut on Sundays. That's when I walk the river and pretend not to be counting seedlings.",
      'Water every day, Mira. A crop only grows on a night it went to bed wet. Like bread dough, but slower.',
    ],
    b1: [
      ['I can tell what a person is like by what they plant first.', 'You planted in straight lines and apologised to the crooked one. I liked you at once.'],
      "Bread's fresh this morning. Take one for the field. You can't till on an empty stomach, whatever the army told you.",
      'If you want the summer seed, come early in the season. Corn takes its time and will not be hurried.',
    ],
    b2: [
      ["In the war I kept a seed vault cold on a quarter of the power it needed. I talked to the drawers so they'd not give up.", "Don't laugh. They didn't."],
      ['Every strain I sell you slept through eleven years in the dark.', 'So when one comes up in your field, wave at it. It has come a long way.'],
      "You've a real hand for it now. I've seen your turnips. I've been telling people about your turnips.",
    ],
    b3: [
      ["I used to be afraid I'd be the last person who knew what a pumpkin was.", "Now there's a whole field of you. I sleep ever so well."],
      'I have a drawer of seed with no label. Marrow thinks it was a flower. One spring I shall give it to you and we will find out.',
      "You came here to grow something, you said. Look round you, love. It isn't only the vegetables.",
    ],
    s0: "Spring! Turnips, potatoes, cucumbers, strawberries. I've been waiting all winter to say that out loud.",
    s1: 'Summer stock is in: tomato, corn, onion, and pumpkin if you are feeling brave and rich.',
    s2: 'Autumn: carrots, eggplant, sweet potato, spinach. Spinach is quick. Carrots pay. Choose with your heart, then your purse.',
    s3: 'Nothing grows outdoors in winter, so I sell bread and good advice. The advice is free with the bread.',
    rain: "Rain! That's every tile in your field watered for nothing. Put your feet up. Or go fishing; they bite in the wet.",
    snow: "The snow is tucking the soil in. Leave it be till spring and it'll thank you.",
    sun: 'Dry day, so mind your watering. The sun-line is kind, but it is thirsty.',
    morning: "Morning, Mira! Kettle's on in the back if you're gasping.",
    evening: "Shop's shut, feet are up. Ask me about seeds tomorrow; ask me about anything else now.",
    eve: {
      planting: "Planting Day tomorrow! I've sorted the heritage seed by hand. Twice. I couldn't sleep.",
      harvest: 'Fair tomorrow. Pick your entry tonight and keep it cool. And do not polish it; Marrow can always tell.',
    },
    fest: "I've shut the shop and I'm not thinking about the till. Not once. Well. Once.",
    greenhouse: 'A greenhouse! Then the seasons do not rule you any more. Strawberries in winter, Mira. Think of it.',
    year2: ['A year ago you asked me which way up a potato goes.', "I've never told a soul. I do think of it fondly, though."],
    fish: [
      "I sell the rod, but I can't fish to save my life. I feel sorry for them. Then I eat them at Tem's, so there we are.",
      "Each season has its own fish, they say. Blossom dace in spring, sunline perch in summer. Same as seed, really.",
    ],
  },

  corran: {
    first: ["HA! The Captain! Abel Corran, number two battery, retired! I sell chickens now. Don't laugh. They're good chickens!", 'You want eggs, milk or a bit of noise about the place, you come to me.'],
    bday: ['A PRESENT? For me? Nobody tell the hens, they will all want one.', "...That's grand. That's really grand, lass. Something in my eye. Feed dust."],
    b0: [
      'Sorry, am I shouting? Thirty years beside the guns. This is me whispering.',
      "A chicken wants feed every day and a cow wants fodder. Miss a day and they sulk. I'd sulk an' all.",
      'Ranch is shut Thursdays. Thursdays I go fishing. The fish are in no danger, I promise you.',
    ],
    b1: [
      ['Brush a cow every day and talk to her. She gives better milk for it.', "Don't ask me why. I never understood the gun either, I just looked after it."],
      'You grow your own grass and cut it with the sickle, you will never buy fodder off me again. I should not tell you that.',
      "I name every animal. The General said never name what you might lose. Well. I don't mean to lose these.",
    ],
    b2: [
      ['I had six lads on my gun. Loudest crew in the fleet. I could pick out each voice with my eyes shut.', "It's quiet now. The cows help. Cows are good with quiet."],
      'Your carrier took a hit over the mining moon and you held her steady so we could keep firing. I never forgot that, Captain.',
      'Come by after milking some evening. I do a cheese that could stop a Talos. Oduya is afraid of it.',
    ],
    b3: [
      ['Six lanterns I float every summer. This year I told them about you. About the farm.', 'They would have liked it. Two of them were farm boys. They never stopped going on about it.'],
      "I spent my whole life aiming things. First time I've ever just fed something and watched it get fat. It's grand.",
      "You're family to this ranch, lass. The hens voted. It was close, but hens are like that.",
    ],
    s0: 'Spring! The hens have gone daft and the grass is up. Sow your pasture now and you will bless me in summer.',
    s1: 'Hot one. Keep the troughs full, the girls drink like a boiler room in this.',
    s2: "Autumn. Cut your grass before the cold, every blade. It won't grow in winter and cows cannot eat good intentions.",
    s3: "Winter. No grass till spring, so I hope you've fodder laid by. If not, I sell it. No shame. Bit of shame.",
    rain: 'Rain! The cows are stood in it looking at me as if I had ordered it. I did not order it!',
    snow: 'Snow on a bald head. Nobody warns you about that at the recruiting office.',
    sun: 'Grand day! Makes you want to fire a salute. I shall not. Marrow has the fuse.',
    morning: "Morning! Been up since five. The hens don't keep officers' hours.",
    evening: 'Day is done, boots are off, pint is poured. Do not tell me anything that needs remembering.',
    eve: {
      lantern: 'Lantern Night tomorrow. I fold six. They leak. The lads would not have had it otherwise.',
      harvest: "Fair tomorrow! Duchess's milk is taking the ribbon or I'm demanding a recount!",
    },
    fest: "I've been asked to keep my voice down. THIS IS DOWN.",
    greenhouse: 'A greenhouse, eh? Glass everywhere. I should not be allowed near it. I walk like a loading drill.',
    year2: ['A year on the land! You have got farmer hands now. Show me. Aye. Ruined.', 'Welcome to the club.'],
    fish: [
      ["Old Hollin had my rod off me last autumn. Rod, reel and my dignity. Long as a rowing boat, that carp.", 'The General was there. He will tell you. He was laughing too hard to help.'],
      'Me and the General fish the same way. Badly, and with sandwiches. I would not swap it for a good catch.',
    ],
  },

  oduya: {
    first: ["Sit. Anywhere. You're the farmer. Tem Oduya. I used to fix hulls, now I fix hunger.", 'This place was a hangar bay once, so I kept the name. The soup is new.'],
    bday: ["Who told you? I haven't had a birthday since dock four. We were always on shift.", "Right. You eat free today. Don't argue with a man holding a ladle."],
    b0: [
      "Menu's on the board. If it isn't on the board I'm out of it or I haven't invented it yet.",
      'Open ten till ten, every day. Hunger does not take Sundays off, so neither do I.',
      "You're running low, I can see it in your shoulders. Eat something hot. Stamina does not grow on its own.",
    ],
    b1: [
      ["I still wear the headlamp. Habit. Also the back of that oven is as dark as a fuel bunker."],
      ['You grow it, Maris hauls it, I cook it. Shortest supply line I ever worked on.', 'I used to wait nine weeks for a gasket.'],
      'Bring me tomatoes in summer and I will show you what they are for.',
    ],
    b2: [
      ['Dock crews worked twenty hours in three, in vacuum suits. I started cooking because nobody else would.', 'Turned out a welder holds a pan steadier than most.'],
      ['Some nights they went out to a hull and did not all come back in. I would still set the table for all of them.', "Marrow says that's why I cook too much. She's right."],
      'Your onions made a dock rigger cry yesterday. In the good way. He asked whose they were. I told him.',
    ],
    b3: [
      ["I used to feed people so they could go back out. Now I feed them and they just sit. Talk. Stay.", "First time I've seen the end of a meal."],
      "There's a table by the window I keep for you and whoever you bring. I don't ask who. I just lay two places.",
      "If this chamber ever loses air again, I'm dying with a full larder and so are all of you. That is a promise.",
    ],
    s0: 'Spring greens. Everyone forgets how good a turnip is until they have had a winter of stored ones.',
    s1: "Summer. The kitchen's hot as a reactor room. I've worked in a reactor room. This is hotter.",
    s2: 'Mushroom season on the hill. Bring me a basket and I will name a soup after you.',
    s3: 'Winter is soup. Soup, and then more soup, and nobody has ever complained.',
    rain: "Wet out. Everyone comes in smelling of coat. Good for trade.",
    snow: 'Snow day. I have had the big pot on since six. Come and stand near it.',
    sun: "Fine day and you're indoors? Then eat quick and get back out to your field.",
    storm: ["Storm's on the schedule and it is early, as usual. Sit tight. Nobody leaves till it has blown out.", "I've weathered a hull breach in this room. A bit of wind is nothing."],
    morning: "Stove's not hot yet. Give me ten minutes and I'll give you breakfast.",
    evening: 'Evening crowd is in. Find a seat, mind the Chief, he gestures.',
    eve: {
      harvest: "Fair tomorrow, and I cook the winners. So I'm sharpening everything tonight.",
      yearsend: "Year's End tomorrow. Big pot, big fire, bowls for the whole village. Bring an appetite.",
    },
    fest: "Café's shut and I'm still feeding people. I do not know how to do anything else.",
    greenhouse: "Greenhouse, is it? Fresh tomatoes in winter? I'd marry that greenhouse.",
    year2: ['A year of your vegetables through my kitchen. I have stopped buying from the upper-deck vats.', 'They sent a man to ask why. I gave him lunch. He understood.'],
    fish: [
      "Bring me a copper eel in autumn and I'll smoke it over applewood. I have been waiting eleven years to say that.",
      "Old Hollin? If anybody lands that carp, they are not bringing it to me. I won't cook a neighbour.",
    ],
  },

  maris: {
    first: ["Hi! Juno Maris, courier. You're the new farm! I mean, you have the new farm. You're a person.", "Whatever's in your shipping bin at five, I haul it. You get paid at dawn. Easy!"],
    bday: ["No! You didn't! I deliver everyone's parcels and nobody ever sends me one.", "I'm keeping the wrapping too. Don't look at me, I'm fine."],
    b0: [
      "Five o'clock at the bin, every day. I've never been late. I have been early and hidden behind the shed, to keep the record tidy.",
      "Anything in the bin sells. Crops, eggs, fish, things you dug out of the Old World. Not tools. I asked. I don't make the rules.",
      'The village is down the south road from your gate. Ten minutes at a walk. Four if Corran is telling a story behind you.',
    ],
    b1: [
      ['I flew couriers all through the war. Fast, unarmed, bright orange. Everyone could see me coming.', 'That was sort of the point. And sort of the problem.'],
      'Your bin was heavier this week! I can tell. I have a very educated left arm.',
      "I know everybody's business from their post. I never read it. I just weigh it. Thoughtfully.",
    ],
    b2: [
      ["Most of what I carried was letters. Crews writing home. Home writing back.", 'Some came back to me unopened. I kept every one. I could not just... bin them.'],
      'Do you know what I haul now? Jam. Seed catalogues. A birthday hat for a goat. I love this job so much.',
      "You talk more than you did in spring. Not a lot more. Like, nine words. I'm counting them as a win.",
    ],
    b3: [
      ['I finally delivered the last of the old letters. Found the families, one by one. It took the whole year.', "I told them a farmer I know said it's never too late to bring something home."],
      "When I come up your lane at five and the lamp's on in your window, it's the best bit of my round. That's all. That's the thing I wanted to say.",
      'The General sent a parcel to your farm last week. Squashy. I did not squeeze it. I squeezed it a bit. It was a scarf.',
    ],
    s0: "Spring post is all seed packets. My bag rattles like a maraca. I'm not complaining.",
    s1: "Summer! I do the hill run in the mornings now, before the sun-line gets fierce.",
    s2: 'Autumn is jam season. Everyone posts jam to everyone. It all evens out, but nobody will stop.',
    s3: 'Winter rounds are quick, nothing in the bins but eggs and milk. I get to the Hangar by six. Dangerous.',
    rain: "I love the rain run! The lanes are empty and I sing. You can't hear me from the house, can you? Good.",
    snow: "Snow! The bin lid freezes. Give it a thump. Not that hard. Okay, that hard.",
    sun: 'What a day! You can see my whole round from here, all the way up the curve of the chamber.',
    morning: "Morning! I've already been to the dock and back. Your day has barely started and I'm winning.",
    evening: "Round's done. My feet have filed a complaint with Marrow.",
    eve: {
      planting: "Planting Day tomorrow! I get a row this year. I've never owned a row of anything.",
      lantern: "Lantern Night's tomorrow. I'm bringing the letters ones. You'll... you'll stand near me, yeah?",
    },
    fest: 'No deliveries today! I keep reaching for my bag. Hold my hand down if you see it twitch.',
    greenhouse: 'You fixed the greenhouse! That means bin stuff all winter! My left arm is thrilled. Truly.',
    year2: ['Three hundred and something pick-ups from your bin. I only dropped the eggs once.', 'Twice. You were paid for them both times, it came out of my pride.'],
    fish: [
      "I saw Old Hollin from the air once, flying low over the lake. Just a shadow. I thought it was my own.",
      'You and that fishing rod. I come at five and half the bin is fish. Do they just... like you?',
    ],
  },

  vashti: {
    first: ['...You are the one with the Pallas.', 'Vashti. I run the lift. It goes down to the Old World and it comes back. I see to the second part.'],
    bday: ['...How did you know.', 'Nobody has given me anything in a long time. I do not know what my face is doing. Ignore it.'],
    b0: [
      'Lift runs eight till six. Be on it by six or sleep down there. The crawlers snore.',
      'Search the rubble. Set your Hydra down first. The crawlers scatter. It is not difficult.',
      'Scrap near the top. Better things lower. Everything has a price or a place. Learn which.',
    ],
    b1: [
      'You keep that salvage arm clean. Most do not. ...Good.',
      ['Down there was a city. Shops. A school. A place that only sold hats.', 'I think about the hat shop more than I should.'],
      'The drones still patrol a car park. Eleven years. Nobody told them it was over. I know the feeling.',
    ],
    b2: [
      ['People think I sell what I find. Most of it. Not all.', 'Some of it I only wanted to see was still there.'],
      ['In the war I stripped hulls while they were still warm. Ours and theirs.', 'I am done with ships. A teacup never belonged to anyone I failed.'],
      'You came up yesterday with nothing and you looked content. ...You understand it, then.',
    ],
    b3: [
      ['I am looking for a street. I have half the name, from a photograph.', 'When I find it I will tell you first. I have decided that.'],
      'I do not stay in places. Three years is the longest. I have been on this hill for one and I have planted beans. Draw your own conclusion.',
      '...You can have the lift after six. If you ask. Only you.',
    ],
    s0: 'Spring melt gets into the lift shaft. I grease the cable twice. You are welcome.',
    s1: 'Summer. Cooler down below than up here. One good thing about a dead city.',
    s2: 'Mushrooms come up round the lift pad in autumn. Take them. I do not eat things that grow overnight.',
    s3: 'Frostcaps by the lake. And the cable sings in the cold. I like winter. It is quiet in the right way.',
    rain: 'Rain. The pad is slick. Walk your Pallas on, do not run it. I am not fishing you out of the shaft.',
    snow: 'Snow up here. Ash down there. From a distance they look the same. They are not.',
    sun: 'Clear. From the overlook you can see the whole chamber curve. ...I look, sometimes.',
    morning: 'Early. Good. The best finds are before the dust lifts.',
    evening: 'Lift is locked. The lake is that way, if you are going to stand about.',
    eve: {
      lantern: 'Lantern Night tomorrow. ...I will come down for it. One lantern. Do not ask whose.',
      yearsend: "Year's End tomorrow. Marrow came up the hill herself to invite me. Unfair tactics.",
    },
    fest: 'Too many people. ...I am staying. I am only saying it is too many people.',
    greenhouse: 'You mended the glasshouse. I found the old Hollin seed labels down a storm drain once. Gave them to Seln. Small world. Was.',
    year2: ['A year of you riding my lift. You have never once been late back.', '...I do notice.'],
    fish: [
      'I fish the lake some evenings. There is something big in it. It took my line and gave me a look.',
      'The old carp. I do not want to catch it. I like knowing that something down here outlasted all of us.',
    ],
  },

  moraine: {
    first: ['Captain Sato. Or is it Farmer Sato? How delicious. You may call me what you always have. Queen will do.', 'My barge is here on Saturdays. Rare seed, strong tonic, fair prices. Fair for a queen.'],
    bday: ['A gift, freely given, with no invoice attached? You must show me how that is done.', 'I shall keep it in the cabin where the gold used to go.'],
    b0: [
      'I do not haggle with farmers. It is like duelling a kitten. The price is the price, darling.',
      'Moonflower seed, from a garden no one else knows the way to. Eighteen days to bloom. Worth every hour.',
    ],
    b1: [
      'I once ran forty ships and a scrapyard moon. Now I have one barge and a ledger with nothing hidden in it. It is very strange to me.',
      'They still bow to me on the dock, you know. I have told them not to. I have not told them very firmly.',
    ],
    b2: [
      ['Everything I sold in the war had a second price that somebody else paid.', 'I know the figures now. I did not ask for them then. That was my whole business.'],
      'You are the only officer who ever looked at me without checking her purse. I have decided to find it charming.',
    ],
    b3: [
      ['Peace is the first thing I ever bought that I cannot sell on.', 'I should be furious. I am sitting on a barge selling flower seed, and I am not furious at all.'],
    ],
    s0: 'Spring. Everyone buys seed and hope. I stock the one; the other I sell on commission.',
    s1: 'The river is warm in summer. My crew swims. I supervise from a chair, as is proper.',
    s2: 'Autumn. The whole chamber turns to gold and for once I had nothing to do with it.',
    s3: 'Winter trade is slow. I stay for the tonic customers and for the look of this place under snow.',
    rain: 'Rain on a barge awning. I have slept through bombardments less soothing.',
    fest: 'A festival with no entry fee. Charming. Ruinous, but charming.',
    year2: ['A year, and you are still my best customer in this chamber.', 'You are also very nearly the only one. Both things can be true.'],
    fish: ["They tell me there is a king in the hill lake. An old carp. I do respect a monarch who cannot be caught."],
  },
};

// The key order used to count and to enumerate conversations.
function conversationsOf(npcId) {
  const t = TALK[npcId];
  if (!t) return [];
  const out = [];
  const add = (c) => { if (c == null) return; out.push(typeof c === 'string' ? [c] : c); };
  const addAll = (l) => { if (Array.isArray(l)) l.forEach(add); else add(l); };
  add(t.first); add(t.bday);
  for (const k of ['b0', 'b1', 'b2', 'b3', 'fish', 'farm']) addAll(t[k]);
  for (const k of ['s0', 's1', 's2', 's3', 'rain', 'snow', 'sun', 'storm', 'morning', 'evening', 'fest', 'greenhouse', 'year2']) add(t[k]);
  if (t.eve) for (const k of Object.keys(t.eve)) add(t.eve[k]);
  return out;
}
export function conversationCount(npcId) { return conversationsOf(npcId).length; }
export function allConversations(npcId) { return conversationsOf(npcId); }

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}
const asConv = (c) => (typeof c === 'string' ? [c] : c.slice(0, 3));

export function talkLines(npcId, ctx) {
  const c = ctx || {};
  const t = TALK[npcId];
  if (!t) return ['...'];
  if (c.met === false) return asConv(t.first);
  const season = seasonIndex(c.season);
  const day = Number(c.day) || 1, minute = Number(c.minute) || 0, year = Number(c.year) || 1;
  const hearts = Math.max(0, Math.min(10, Number(c.hearts) || 0));
  const flags = c.flags && typeof c.flags === 'object' ? c.flags : {};
  const h = hash([npcId, year, season, day, Math.floor(minute / 20)].join('|'));
  if (c.isBirthday && t.bday && h % 3 !== 0) return asConv(t.bday);

  const band = hearts <= 2 ? 0 : hearts <= 5 ? 1 : hearts <= 8 ? 2 : 3;
  const pool = [];
  const add = (conv, w = 1) => { if (conv) for (let i = 0; i < w; i++) pool.push(conv); };
  const addAll = (l, w) => { if (Array.isArray(l)) l.forEach((x) => add(x, w)); };
  addAll(t['b' + band], 3);
  if (band > 0) addAll(t['b' + (band - 1)], 1);
  add(t['s' + season], 2);
  if (c.weather === 'sun' || !c.weather) add(t.sun, 1); else add(t[c.weather], 3);
  if (minute < H(10)) add(t.morning, 2);
  if (minute >= H(18)) add(t.evening, 2);
  addAll(t.fish, 1);
  if (npcId === 'general' && c.weekday === 6) addAll(t.farm, 3);
  if (flags.greenhouse) add(t.greenhouse, 2);
  if (year >= 2) add(t.year2, 2);
  if (c.festival) add(t.fest, 8);
  else if (t.eve) {
    const next = FESTIVALS.find((f) => f.season === season && f.day === day + 1);
    if (next) add(t.eve[next.id], 8);
  }
  if (!pool.length) return asConv(t.first);
  return asConv(pool[h % pool.length]);
}

// ------------------------------------------------------------------ gifts

const tierOf = {};
for (const id of Object.keys(NPCS)) {
  const n = NPCS[id], m = {};
  for (const x of n.dislikes) m[x] = 'disliked';
  for (const x of n.likes) m[x] = 'liked';
  for (const x of n.loves) m[x] = 'loved';
  tierOf[id] = m;
}

export function giftTier(npcId, itemId) {
  const m = tierOf[npcId];
  return (m && typeof itemId === 'string' && Object.prototype.hasOwnProperty.call(m, itemId) && m[itemId]) || 'neutral';
}

const GIFT = {
  general: {
    loved: "For me? ...Nobody has handed me anything without a form attached in a year. Thank you. Truly.",
    liked: 'That is kind of you, Sato. I shall enjoy it on the lift home.',
    neutral: 'Thank you. I shall find a place for it on the desk, among the petitions.',
    disliked: "Ah. I... have rather a lot of these already. But I thank you for the thought.",
    bday: 'You remembered the day. ',
  },
  ruess: {
    loved: "Now THAT is worth having. Look at the grain on it. Leave it with me; don't tell me what you want for it.",
    liked: "Hm. Useful. Don't stand there looking pleased, you'll put me off.",
    neutral: "It's a thing. I'll put it with the other things.",
    disliked: 'What am I to do with this? Does it turn? Does it conduct? No. Take it away. ...Leave it, then.',
    bday: 'Birthday, is it. Bah. ',
  },
  marrow: {
    loved: 'Oh, now. Where did you find this? No, sit down and tell me properly. This is a treasure, child.',
    liked: 'How thoughtful. You were well brought up, or you have learned since. Either will do.',
    neutral: 'Thank you, dear. I shall enter it in the book under "miscellaneous kindness".',
    disliked: 'I see. Well. One accepts the thought and quietly loses the object.',
    bday: 'On my birthday, too. ',
  },
  seln: {
    loved: "Oh, Mira! Oh, look at it! I'm going to have a little sit down. This is the loveliest thing.",
    liked: "That's so kind. I'll have it with my tea and think of your field.",
    neutral: 'Thank you, love. That was sweet of you.',
    disliked: "Oh. It's... very metal, isn't it. I'll find it a shelf. A high one.",
    bday: 'You remembered my birthday! ',
  },
  corran: {
    loved: "HA! Would you look at that! Best thing I've been handed since my discharge papers! Come here, lass!",
    liked: "That's grand, that is. Very decent of you. I'll tell the hens you called.",
    neutral: 'Much obliged! I do not know what it is for, but much obliged!',
    disliked: "Er. Well. It's the thought. I'll... put it in the barn. Right at the back of the barn.",
    bday: 'On my birthday! ',
  },
  oduya: {
    loved: "Stop. Give it here. Do you know what I can make with this? Sit down, you're eating it in twenty minutes.",
    liked: 'Good produce. Honest. That goes straight in the pot, thank you.',
    neutral: "Thanks. I'll find a use. I found a use for hull sealant once.",
    disliked: "I can't cook that. I tried cooking most things in the war. Not that.",
    bday: 'A birthday present. Huh. ',
  },
  maris: {
    loved: "For ME? Oh, I love it, I love it. I'm putting it in the cockpit. Next to the lucky sock.",
    liked: "Oh, nice! Thank you! Nobody ever gives the courier anything, I'm usually just the middle bit.",
    neutral: "Aw, thanks! I'll, um, deliver it to my own house.",
    disliked: "Oh! It's... wow. Okay. No, I'm grateful! I'm being grateful. Look.",
    bday: 'A birthday parcel! ',
  },
  vashti: {
    loved: '...Where did you find this. No. Do not tell me. Thank you. I mean it.',
    liked: 'Good piece. You have an eye. ...Thanks.',
    neutral: 'Fine. Put it there.',
    disliked: 'No. ...I will take it. But no.',
    bday: 'Today of all days. ',
  },
  moraine: {
    loved: 'Oh, exquisite. You have taste, Captain; I always suspected it. I shall wear it, drink it or display it at once.',
    liked: 'A pleasing little tribute. I accept. You may consider the dock fee waived, had I been charging one.',
    neutral: 'How rustic. Set it on the deck, somebody will be delighted by it.',
    disliked: 'Darling, I used to throw this overboard by the tonne. Still, a queen accepts graciously.',
    bday: 'And on my birthday. ',
  },
};

export function giftLine(npcId, tier, isBirthday) {
  const g = GIFT[npcId];
  if (!g) return 'Thank you.';
  const line = g[tier] || g.neutral;
  return isBirthday && tier !== 'disliked' ? g.bday + line : line;
}

// ------------------------------------------------------------------ heart events

const L = (who, text) => ({ who, text });

export const EVENTS = [
  // ---- The General: two soldiers learning to live in peace.
  {
    id: 'general2', npc: 'general', hearts: 2, map: 'farm', weekday: 6, from: H(11), to: H(16),
    lines: [
      L('narrator', 'The General is standing at the edge of the field with his hands behind his back, inspecting a row of seedlings as if they were on parade.'),
      L('sato', 'They are not going to come to attention, sir.'),
      L('general', 'No. I suppose not. Forgive me, Captain. I have forgotten how to stand anywhere without a reason.'),
      L('sato', "It's Sato now. I handed the bars in, if you recall. You signed for them."),
      L('general', 'I recall. It was the only thing I signed that week that I did not have to read twice.'),
      L('narrator', 'She begins to straighten her back out of habit, and stops. He notices, and lets out a breath.'),
      L('general', 'Thank you. Everyone in Eden salutes me. The baker salutes me. A child saluted me on Tuesday and dropped her bread.'),
      L('sato', 'House rule, then. Nobody salutes on this farm. Not the hens, not the governor.'),
      L('general', 'I think that is the best standing order I have ever heard.'),
      L('sato', 'There is a second hoe by the shed, if standing about is a problem.'),
      L('narrator', 'He takes off his coat, folds it over the fence with great care, and goes to fetch it.'),
    ],
    reward: { love: 3 },
  },
  {
    id: 'general4', npc: 'general', hearts: 4, map: 'village', weekday: 5, from: H(10), to: H(11, 30),
    lines: [
      L('narrator', 'The memorial in Willowfall is a plain stone wall. Ship names on the left, people on the right. The General is reading the left.'),
      L('general', 'Every Saturday I read them through. Top to bottom. The ones we lost, and then the ones I sold.'),
      L('sato', 'The ones you sold bought the air in this chamber. I am breathing it. So is the baker.'),
      L('general', 'I know the arithmetic. I did it myself, a great many times, hoping for a different answer.'),
      L('general', 'Your carrier is on there. Fourth from the bottom. I thought you should hear it from me that I come and look at her.'),
      L('sato', 'She was a good ship. She would have made a poor farm. The hangar deck drained badly.'),
      L('narrator', 'He laughs. It surprises him. It is not a loud laugh, and it ends too soon, but it is a real one.'),
      L('general', 'I had forgotten you could do that. Say the true thing sideways, so that a man can bear to look at it.'),
      L('sato', 'It is a carrier habit. You learn to bring things in at an angle.'),
      L('general', 'Walk with me as far as the bridge? I should like to be seen in the village doing something other than grieving.'),
    ],
    reward: { love: 4 },
  },
  {
    id: 'general6', npc: 'general', hearts: 6, map: 'farm', weekday: 6, from: H(11), to: H(16),
    lines: [
      L('narrator', 'He has brought a fishing rod. It is brand new, and he holds it like a thing he has been briefed on but never issued.'),
      L('general', 'Seln sold it to me. She said the pond on the Hollin field was a good place for a beginner. She was very tactful.'),
      L('sato', 'Sit there. Cast towards the reeds. Then do nothing. I am told you will find that part difficult.'),
      L('narrator', 'They sit on the bank. The floats sit on the water. For a long while that is everything that happens.'),
      L('general', 'A hundred decisions before noon, most days. Which pump. Which family. Which deck goes without. And every one of them says "sir" before they ask.'),
      L('general', 'I am very tired, Sato. I have not said that aloud to anyone. I thought I would try it on a pond first.'),
      L('sato', 'The pond will not repeat it. Nor will I.'),
      L('sato', 'You do not have to hold anything up here. The field holds itself. I only water it.'),
      L('narrator', 'His float dips. He strikes far too late, and far too hard, and somehow a small silverfin lands in the grass between them.'),
      L('general', 'Good heavens. I have caught one. Is that... a good one?'),
      L('sato', 'It is the smallest fish I have ever seen, sir. I am very proud of you.'),
      L('general', 'Then it is yours. Spoils go to the commanding officer. On this farm that is you.'),
    ],
    reward: { love: 4, item: ['fish_s', 1] },
  },
  {
    id: 'general8', npc: 'general', hearts: 8, map: 'village', weekday: 5, from: H(11, 30), to: H(13, 30),
    lines: [
      L('narrator', 'The General is leaning on the rail of the bridge, watching the river run on up the curve of the chamber and over his head.'),
      L('general', 'The Council has voted me a statue. Bronze. In the square. On a horse, I believe, though I have never met one.'),
      L('sato', 'You will look ridiculous.'),
      L('general', 'That is what I told them. So I have asked for a tree instead. They said I must choose which kind, and I find I do not know any trees.'),
      L('general', 'So I am asking the only farmer I trust. What should stand in that square in fifty years, Sato?'),
      L('sato', 'An apple. It gives shade, it feeds people, and every autumn the children will steal from it. Nobody ever stole from a statue.'),
      L('general', 'An apple tree. Yes. Let them remember me as something worth climbing.'),
      L('narrator', 'He is quiet for a while. A leaf goes under the bridge, and he follows it with his eyes until it is gone.'),
      L('general', 'On the hangar deck I asked what you would do. You said "Grow something." Two words. I have turned them over every day for a year.'),
      L('general', 'I think you were braver than I was. You put it down. I only changed what I was carrying.'),
      L('sato', 'You were carrying a colony. Somebody had to. I just had the easier load and the better view.'),
      L('general', 'Perhaps. But I notice which of us sleeps. ...Help me plant it, when it comes? I should like to get one thing into the ground with my own hands.'),
      L('sato', 'Bring gloves. Not the ones Corran laughed at.'),
    ],
    reward: { love: 5 },
  },
  {
    id: 'general10', npc: 'general', hearts: 10, map: 'farm', weekday: 6, from: H(11), to: H(16),
    lines: [
      L('narrator', 'He is on the porch when she comes in from the field. No coat. Old boots, properly muddy. A loaf from Seln under one arm, still warm.'),
      L('general', 'I have told the Council that the Governor does not exist on Sundays. They took it better than I expected. I think they were relieved.'),
      L('sato', 'And who is it that exists on Sundays instead?'),
      L('general', 'That is rather what I came to ask you.'),
      L('narrator', 'He looks out over the rows: the ones she planted, and the crooked one at the end that he planted, which she never straightened.'),
      L('general', 'I have commanded fleets, Mira. I find I should very much like to be told where to dig.'),
      L('general', 'So. In my roundabout way. Is there room at your table, and work in your field, for one more retired soldier? On the days Eden can spare him.'),
      L('sato', 'The pay is terrible.'),
      L('general', 'I have had worse postings.'),
      L('sato', 'The east corner is all stones. The hens have no respect for rank. And the commanding officer is said to be difficult.'),
      L('general', 'I served beside her for nine years. I know exactly what she is.'),
      L('narrator', 'For once she has no dry answer ready. She looks at the loaf, and the boots, and then at him.'),
      L('sato', 'There is a second chair in the kitchen. I bought it in the spring. I did not ask myself why at the time.'),
      L('sato', 'Come in. Bring the bread. You can stay as long as the field needs you. ...It is a large field.'),
    ],
    reward: { love: 6, item: ['bread', 1] },
  },

  // ---- Ruess: building things that are not weapons.
  {
    id: 'ruess3', npc: 'ruess', hearts: 3, map: 'workshop',
    lines: [
      L('narrator', 'Ruess has a watering can in the vice, upside down, and is glaring into it through his goggles.'),
      L('ruess', "Sato. Good. Hold this. No, the other end. Forty years an engineer and I can't get a rose to pour evenly."),
      L('sato', 'You built a battery that could hit a cruiser across a moon.'),
      L('ruess', 'That was easy. A cruiser wants to be hit; it is large and it comes at you. Water wants to go everywhere at once.'),
      L('ruess', 'Do you know, nobody ever thanked me for a Dragon battery. They said "confirmed" and asked for six more.'),
      L('ruess', 'Mrs Abara thanked me yesterday for mending a pram wheel. Brought me a pie. I had to sit down.'),
      L('sato', 'What did you do with the pie?'),
      L('ruess', "Ate it, girl, I'm not sentimental. ...I kept the dish. That's different."),
      L('ruess', "There. Even pour. Take these off the scrap pile, I've no use for them, and stop smirking."),
    ],
    reward: { love: 3, item: ['scrap', 3] },
  },
  {
    id: 'ruess7', npc: 'ruess', hearts: 7, map: 'workshop',
    lines: [
      L('narrator', 'There is a sheet over something large on the workbench. Ruess is standing in front of it, which does not hide it at all.'),
      L('sato', 'Professor. That is either a secret or a very badly made bed.'),
      L('ruess', "Hmph. You'd have found it anyway. You always walked straight to whatever I was hiding. Go on, then."),
      L('narrator', 'Under the sheet is a carousel, small enough for a tabletop. Brass horses, a Crab, a cow, and one tiny carrier, all on rods.'),
      L('ruess', "It's for the square. Full size, when I've the alloy. The bearings are off a Hydra turret ring. Smoothest I ever cut."),
      L('ruess', 'I drew my first gun mount at nineteen, Sato. I was so proud of the tolerances. I never once drew anything a child could sit on.'),
      L('sato', 'It turns the same way a turret does.'),
      L('ruess', 'It does. I noticed that. I decided it was the turret that had it wrong.'),
      L('narrator', 'He winds the key. The little carrier goes round with the cow, rising and falling, and something inside plays four thin notes.'),
      L('sato', 'Put me down for the first ride. I will bring the General. He claims he has never met a horse.'),
      L('ruess', "Ha! ...Aye. Bring him. I'll make that one a bit wider. He's got no sense of balance, he never had."),
    ],
    reward: { love: 5, item: ['alloy', 2] },
  },

  // ---- Marrow: the list of names.
  {
    id: 'marrow3', npc: 'marrow', hearts: 3, map: 'hall', from: H(9), to: H(16),
    lines: [
      L('narrator', 'On the wall behind the Warden hangs a sheet of yellowed paper in a frame. Sixty-one names in a close hand, and a pencil tick by each.'),
      L('marrow', 'You are looking at my list. Everyone does. Almost nobody asks.'),
      L('sato', 'I was working up to it.'),
      L('marrow', 'When Eden was emptied, sixty-one of us would not go, or could not. Then this chamber lost its air and we went down into the catacombs.'),
      L('marrow', 'I called the roll at every shift change. Out loud. Every name, and they answered. That is all a warden is, in the end. Someone who keeps counting.'),
      L('sato', 'I kept a crew list like that. I checked it after every sortie. The ticks did not always come out even.'),
      L('marrow', 'No. Mine neither, by the finish. But you counted, and they knew that you counted. It matters more than you would think.'),
      L('marrow', 'There. You are number ninety-four in the new book. I tick you each evening when your lamp comes on up the lane.'),
      L('sato', '...I shall try to keep it lit, then.'),
    ],
    reward: { love: 3 },
  },
  {
    id: 'marrow7', npc: 'marrow', hearts: 7, map: 'village', weekday: 6, from: H(10), to: H(12),
    lines: [
      L('narrator', 'Marrow is on her knees at the foot of the memorial with a trowel, setting small green plants into the soil, one by one.'),
      L('marrow', 'Do not help me up. I got down here on purpose and I shall get up when I am ready.'),
      L('sato', 'Strawberries.'),
      L('marrow', 'From your runners. Seln slipped them to me. A boy called Pim wrote to me from the transports, years ago. He said the strawberries were the thing he remembered.'),
      L('marrow', 'Not the alarms, nor the dark. Strawberries. I have thought about that letter a good deal.'),
      L('marrow', 'I spent eleven years making sure people stayed alive, Mira. I am only now learning that it is not the same as making sure they live.'),
      L('sato', 'I am told the trick is to water it daily and not to stare at it.'),
      L('marrow', 'Ha. Is that farming, or wisdom?'),
      L('sato', 'I have not been doing either long enough to tell them apart.'),
      L('marrow', 'Good answer. Now you may help me up. And take this; it was in the hall cupboard and it belongs in a kitchen that gets used.'),
    ],
    reward: { love: 5, item: ['tea', 2] },
  },

  // ---- Seln: the seed vault.
  {
    id: 'seln3', npc: 'seln', hearts: 3, map: 'store', from: H(9), to: H(17),
    lines: [
      L('narrator', 'Behind the counter stands a steel cabinet of tiny drawers, scratched and dented, with frost-burn round every handle.'),
      L('seln', "That's the vault. Well, a bit of it. I couldn't leave it where it was, so it lives with me now."),
      L('seln', 'When the power was rationed, the hydroponics bay went dark first. They said seed could wait. Seed cannot wait, Mira, not warm.'),
      L('seln', "So I ran a line off my own heating. Eleven winters in two jumpers and a hat. I used to read the labels aloud so they'd know someone was there."),
      L('sato', 'Did they answer?'),
      L('seln', "Every one of them. It just took till this spring. You're growing the answer, love."),
      L('sato', 'I held a carrier together for nine years. You held a cupboard. I think yours was the harder watch.'),
      L('seln', "Oh, don't, you'll set me off, and I've flour on my hands. Here. Turnips. No, I won't hear of money."),
    ],
    reward: { love: 3, item: ['seed_turnip', 1] },
  },
  {
    id: 'seln7', npc: 'seln', hearts: 7, map: 'store', from: H(9), to: H(17),
    lines: [
      L('narrator', 'Seln has one drawer of the old cabinet out on the counter. It holds a paper twist and a label so faded that nothing is left of the writing.'),
      L('seln', "This is the one I never dared open. No name, no date. Marrow thinks it was a flower. I've been afraid it's dead, and afraid to find out."),
      L('sato', 'If it stays in the drawer, it is certainly never going to be a flower.'),
      L('seln', "That's what I told myself for eleven years about everything else in there. Funny how I can't say it about the last one."),
      L('seln', 'I think I liked being needed, Mira. The keeper of the vault. If every drawer is empty and growing somewhere, what am I?'),
      L('sato', 'A shopkeeper with warm hands. People cross the square just to be near you. I have watched them do it.'),
      L('sato', 'I was a captain until the war stopped. Then I was nobody in particular, in a field. It turned out to be the better rank.'),
      L('narrator', 'Seln looks at the paper twist a while longer. Then she tips half of it into an envelope and writes on it: HOLLIN FIELD. LET US SEE.'),
      L('seln', 'Half for your soil and half for my window box. Whatever it is, it comes up in two places.'),
      L('seln', "And take a moonflower bag as well. Moraine left me one, and I'd sooner you had it than the shelf."),
    ],
    reward: { love: 5, item: ['seed_moonflower', 1] },
  },

  // ---- Corran: the gun crew.
  {
    id: 'corran3', npc: 'corran', hearts: 3, map: 'ranch',
    lines: [
      L('narrator', 'Six hens are lined up along the ranch counter. Corran is addressing them by name, at volume.'),
      L('corran', 'Pell! Dask! Oro! Little Tam! Brigg! And Yenny, who is late, as always! ...Oh. Captain. You heard that.'),
      L('sato', 'The far side of the chamber heard that, Chief.'),
      L('corran', "They're my gun crew. Number two battery. I gave the hens their names. Daft, I know. You can say it's daft."),
      L('sato', 'Does Pell still argue about the firing order?'),
      L('corran', "...You remembered Pell. Aye. She pecks whoever goes first. Every morning. I could weep, it's so like him."),
      L('corran', 'I never had the words for them, see. I only ever had the volume. So I say the names loud, and I feed them well. It is all I know how to do.'),
      L('sato', "It is a good roll-call. I'd keep it going."),
      L('corran', 'Aye. Aye, I will. Here, take these. Yenny laid them. Late, but she laid them.'),
    ],
    reward: { love: 3, item: ['egg', 3] },
  },
  {
    id: 'corran7', npc: 'corran', hearts: 7, map: 'ranch',
    lines: [
      L('narrator', 'For once the ranch is quiet. Corran sits on an upturned bucket by the barn door with a newborn calf asleep across his boots.'),
      L('corran', "Shh. First one born in this chamber since the air came back. Three in the morning. I haven't moved since. Can't feel my feet."),
      L('sato', "I did not know you had a voice that went that low."),
      L('corran', "Nor did I, lass. Found it about four o'clock. Been saving it up sixty years, seems like."),
      L('corran', 'I trained that crew to be fast and I was proud of how fast. Never once got to teach anyone to be gentle. Nobody ever asked a gunner for gentle.'),
      L('corran', "Then this one turns up, wet and wobbly, and looks at me as if I'm the safest thing in the world. Me! With these hands!"),
      L('sato', 'She is asleep on your feet, Chief. I would call that an expert opinion.'),
      L('corran', "...I want to call her Seven. For the one who'd have come after my six. D'you think that's all right? Would they mind?"),
      L('sato', 'I think they would argue over who gets to feed her.'),
      L('corran', "Ha! ...Shh, shh. Aye. They would. Here. First milk of the season. I'd sooner you had it than sell it."),
    ],
    reward: { love: 5, item: ['milk_l', 2] },
  },

  // ---- Oduya: feeding the dock crews.
  {
    id: 'oduya3', npc: 'oduya', hearts: 3, map: 'cafe', from: H(10), to: H(22),
    lines: [
      L('narrator', 'It is quiet in the Hangar. Oduya is ladling soup into twelve bowls along the counter, though only two tables are taken.'),
      L('sato', 'Expecting a shift change?'),
      L('oduya', 'Hm? ...Ah. Did it again. Dock four ran twelve to a crew. My hands still count to twelve and stop.'),
      L('oduya', 'I was a hull engineer. Good one. But the crews came in off a twenty-hour patch and nobody had fed them, so I put a pot on a plasma heater.'),
      L('oduya', 'After that I was the cook. Never asked for it. You see twelve grey faces go pink over a bowl and you are finished, you are a cook for life.'),
      L('sato', 'And the bowls nobody comes for?'),
      L('oduya', 'Used to leave them out all night. Now somebody always turns up. The Chief. Maris. A farmer who forgets to eat.'),
      L('sato', 'That last one sounds unreliable.'),
      L('oduya', "She's here, isn't she? Sit. That one's yours, and you can take the next one home with you."),
    ],
    reward: { love: 3, item: ['soup', 2] },
  },
  {
    id: 'oduya7', npc: 'oduya', hearts: 7, map: 'cafe', from: H(10), to: H(22),
    lines: [
      L('narrator', "A new board hangs over the Hangar's counter. On it, painted by hand: DOCK FOUR SUPPER. EVERY FRIDAY. NOBODY PAYS."),
      L('oduya', "Don't say anything yet. I want to say it first or I won't say it."),
      L('oduya', 'Last night out there, a plate split on a cruiser and I lost five of the twelve. I had supper on. I let it burn. I have never burned anything since.'),
      L('oduya', "Eleven years I have cooked as if I were still trying to get that one meal to the table. That's no way to run a kitchen. Food knows."),
      L('sato', 'So now it is every Friday.'),
      L('oduya', 'Every Friday. Twelve seats, whoever comes. Riggers, kids, the Governor if he will sit still. One big pot. I am done feeding ghosts, Sato. I want to feed people who answer back.'),
      L('sato', 'You will need vegetables. A reliable supplier. I know a field.'),
      L('oduya', "I was hoping you'd say that. I'm not paying the full rate."),
      L('sato', 'You never have. I will take it in pie.'),
      L('oduya', 'Ha! Done. First one is here. And a bit on account, so nobody can say Tem Oduya does not pay his farmer.'),
    ],
    reward: { love: 5, item: ['pie', 1], money: 300 },
  },

  // ---- Maris: the letters she carried.
  {
    id: 'maris3', npc: 'maris', hearts: 3, map: 'farm', from: H(16, 20), to: H(18, 10),
    lines: [
      L('narrator', 'Maris has finished loading. She does not leave. She stands by the bin turning one envelope over and over in her hands.'),
      L('sato', 'That one is not mine. I have not written a letter since my discharge forms.'),
      L('maris', "No, it's... it's an old one. I carried post in the war. Crew letters. This one came back. The address wasn't there any more. Like, the deck wasn't."),
      L('maris', "I've got a box of them. Two hundred and six. I couldn't hand them in to be pulped. Somebody wrote these with their tongue sticking out, you know?"),
      L('sato', 'Have you opened any?'),
      L('maris', "No! No. They aren't mine. I just... keep them dry. And every time I see the box I feel like I'm still mid-flight. Like I never landed."),
      L('sato', 'Marrow has the evacuation registers. Every family, and where they were sent. She would know where to start.'),
      L('maris', "...Oh. Oh, I never thought. I could deliver them. Just late! Late is only a kind of delivered!"),
      L('sato', 'Eleven years is within tolerance. I have seen spare parts take longer.'),
      L('maris', "Ha! Okay. Okay. I'm going to the hall first thing. Thank you. I mean it. You'll find extra in your pay, I'm rounding up."),
    ],
    reward: { love: 3, money: 200 },
  },
  {
    id: 'maris7', npc: 'maris', hearts: 7, map: 'farm', from: H(16, 20), to: H(18, 10),
    lines: [
      L('narrator', 'Maris comes up the lane on foot today, with no crate. Her orange headband is off and wound round her wrist.'),
      L('maris', 'Two hundred and five. I found two hundred and five of them. Families, crewmates, one very confused cousin.'),
      L('sato', 'And the last one?'),
      L('maris', "It was addressed to me. From my wingmate. Dated the day before she didn't come back. It's been in my own box the whole time and I never looked at the names."),
      L('narrator', 'She holds it out. It has been opened, carefully, along the top.'),
      L('maris', "It's not sad. That's the thing. It's a list of places she wanted us to fly to after. Lakes, mostly. She drew a little fish by the best ones."),
      L('maris', "I spent the whole war being the fast cheerful one, because somebody had to turn up smiling. I think I forgot it was allowed to be real."),
      L('sato', 'It looks real from here. It has done since spring. I am a fair judge of people pretending to be calm.'),
      L('maris', "Yeah. You'd know, wouldn't you? ...There's a lake on her list that's just the hill lake. The one right here. Come fishing with me there some time?"),
      L('sato', 'Bring the list. We shall tick it off properly.'),
      L('maris', "Deal. And this is for you. She'd have wanted the farmer to have it. It still plays."),
    ],
    reward: { love: 5, item: ['musicbox', 1] },
  },

  // ---- Vashti: what she looks for in the Old World.
  {
    id: 'vashti3', npc: 'vashti', hearts: 3, map: 'hill', from: H(8), to: H(18),
    lines: [
      L('narrator', 'Vashti is greasing the cable drum of the Descent. A square of card is tucked into her bandana, the way other people keep a pencil.'),
      L('sato', 'You have a photograph in your hat.'),
      L('vashti', '...Most people pretend they have not seen it.'),
      L('narrator', 'She hands it over. A street corner, long ago. A blue door. A woman laughing with a child on her hip. Half a street sign: —ILLOW LA—.'),
      L('vashti', 'Found it in a wallet, in a hull I was stripping. Their side. He had carried it right through the war.'),
      L('vashti', 'I took the copper out of that ship and sold it. Then I could not sell the picture. Three years I have had it.'),
      L('sato', 'And the lift goes down to where the streets are.'),
      L('vashti', 'There are a great many streets. I have been looking for one blue door. It is stupid.'),
      L('sato', 'I bought a field I did not know how to plant. I am in no position to call a thing stupid.'),
      L('vashti', '...Hm. If you see a blue door down there, tell me. Take this. I have too many, and you came and asked.'),
    ],
    reward: { love: 3, item: ['crystal', 1] },
  },
  {
    id: 'vashti7', npc: 'vashti', hearts: 7, map: 'hill', from: H(8), to: H(18),
    lines: [
      L('narrator', 'The lift is up and locked, in the middle of the day. Vashti sits on the edge of the pad with her boots hanging over the shaft.'),
      L('vashti', 'I found it. Willow Lane. The door is grey now. It was blue under the ash. I scratched it to be sure.'),
      L('sato', 'And inside?'),
      L('vashti', 'A kitchen. A table laid for three. Dust. A height chart on the door frame, pencil, up to here. Nobody. There was never going to be anybody.'),
      L('vashti', 'I thought I would feel finished. I put the photograph on the table and came up. Now I do not know what I am for.'),
      L('sato', 'I know that one. It lasts about a season. Then something needs watering.'),
      L('vashti', '...I thought about leaving. I always do, after. I have the pack by the door.'),
      L('sato', "Marrow's Memory Room needs someone who knows what things were. The children ask questions she cannot answer. And the lift does not run itself."),
      L('vashti', 'You are giving me a reason. You are not even hiding it.'),
      L('sato', 'I was a captain. Subtlety was never in the manual.'),
      L('narrator', 'Vashti is quiet for a while. Then she gets up, hangs her pack on the hook inside the lift house, and leaves it there.'),
      L('vashti', 'The village is called Willowfall. I only noticed that on the way up. ...Take this. It was on their mantelpiece. It ought to be wound by someone.'),
    ],
    reward: { love: 5, item: ['watch', 1] },
  },

  // ---- Moraine: the price of peace.
  {
    id: 'moraine3', npc: 'moraine', hearts: 3, map: 'village', weekday: 5, from: H(9), to: H(17),
    lines: [
      L('narrator', 'Moraine is on the foredeck of her barge under a striped awning, with a ledger open on her knee and a pen she is not using.'),
      L('moraine', 'Captain. Come aboard. I am doing my accounts and I require a witness of good character. You will have to serve.'),
      L('sato', 'I am not sure a queen should let a farmer see her books.'),
      L('moraine', 'These are not those books. Those I burned. This is the other one: what each thing I sold went on to do.'),
      L('moraine', 'I sold to both sides, you know. Whoever paid. I told myself a merchant only moves the cargo. The pen does not sign the letter.'),
      L('sato', 'And now?'),
      L('moraine', 'Now I sell seed and tonic and I know precisely where every packet goes. Into a field. Into a tired woman with a hoe. It is unbearably wholesome.'),
      L('sato', 'You could raise your prices, if it would comfort you.'),
      L('moraine', 'Ha! Do not tempt me. No. Take this, and do not thank me. I am practising at giving things away, and I am not yet good at it.'),
    ],
    reward: { love: 3, item: ['tonic', 1] },
  },
  {
    id: 'moraine7', npc: 'moraine', hearts: 7, map: 'village', weekday: 5, from: H(9), to: H(17),
    lines: [
      L('narrator', 'There is a crate on the dock beside the barge, nailed shut, with the Ashfall crest burned into the lid. Moraine is looking at it and not at Sato.'),
      L('moraine', 'My crown is in there. The real one. Hull plate from the first carrier I ever stole, beaten into a circle. Ugly. I adored it.'),
      L('moraine', 'I am sending it to Marrow, for her room of lost things. With a card. I have written the card nine times.'),
      L('sato', 'What does the ninth say?'),
      L('moraine', '"This was worn by a woman who was paid for the war and was never sent the bill. She is paying it now, in instalments, in flower seed."'),
      L('sato', 'It is rather long for a card.'),
      L('moraine', 'I have never been brief. ...Peace costs something, Captain. Your General paid with a fleet. You paid with your bars. I looked for what I had left that would hurt.'),
      L('sato', 'They will still bow to you on the dock.'),
      L('moraine', 'Of course they will. I am magnificent. But they will be bowing to a trader. I find I should like to learn who she is.'),
      L('narrator', 'She slides something small and bright off her finger and drops it into Sato\'s palm before either of them can discuss it.'),
      L('moraine', 'The last piece of the old treasury. Do not dare be sentimental. Plant something expensive.'),
    ],
    reward: { love: 5, item: ['ring', 1], money: 500 },
  },
];

// ------------------------------------------------------------------ the opening

export const INTRO = [
  { who: 'narrator', text: 'The Nineveh broke along the seams her welders left. Her wreck turned slowly in the shadow of the Earth, and for the first time in eleven years, nobody fired.', art: 'intro1' },
  { who: 'narrator', text: 'The fleets drifted where they were. Someone began to read out the names of ships. The war was over. This time, all of it.' },
  { who: 'narrator', text: 'Above the poisoned Earth hung Eden: a broken colony, dark along half its length. The General looked at it for a long time. Then he sold the fleet.', art: 'intro2' },
  { who: 'narrator', text: 'Every carrier. Every machine. He signed them away hull by hull and bought air, glass and pumps with the money.' },
  { who: 'narrator', text: "On the last carrier, the hangar deck was empty. Captain Mira Sato crossed it alone, unpinned her captain's bars, and held them out.", art: 'intro3' },
  { who: 'general', text: 'Nine years you kept this deck for me. I never once had to look behind me. What will you do now, Captain?' },
  { who: 'sato', text: 'Grow something.' },
  { who: 'general', text: '...Yes. Somebody should. Go on, then, before I think of a reason to keep you.' },
  { who: 'narrator', text: "When the river chamber was sealed and its air came back, the long sun-line was lit from end to end. The far bank of the river curved up into the sky and became the sky.", art: 'intro4' },
  { who: 'narrator', text: 'Where the river bends there is a village called Willowfall: a hall, a bridge, a café in an old hangar bay, some ninety people who stayed.' },
  { who: 'narrator', text: 'North of it lies the old Hollin field. Nobody has farmed it since the war. It cost a captain her whole discharge pay, to the last credit.', art: 'intro5' },
  { who: 'narrator', text: 'Weeds to the knee. Stones. A farmhouse with one broken shutter, knocking in the breeze from the air plant. A kit bag set down in the long grass.' },
  { who: 'sato', text: 'Well. I have landed on worse.' },
];

export const DAY1 = [
  { who: 'marrow', text: 'So you are the captain who bought the Hollin field. Ilse Marrow, warden of Willowfall. Welcome. I mean that, though you may doubt it once you have seen the field.' },
  { who: 'sato', text: 'I have seen it. I am choosing to regard it as camouflage.' },
  { who: 'marrow', text: 'Ha. You will do. Now, clear a patch first: the sickle for weeds, the hammer for stones, the axe for branches. Do not try to clear it all today.' },
  { who: 'marrow', text: 'Then till the ground with the hoe, sow your seed, and water it. Every day. A crop only grows after a day it was watered.' },
  { who: 'marrow', text: 'Whatever you mean to sell goes in the shipping bin by the house. Juno Maris collects at five, and you are paid at dawn.' },
  { who: 'marrow', text: 'When your arms give out, eat something or go to bed. Fainting in a field impresses nobody. I have tried it.' },
  { who: 'marrow', text: 'The village is down the south road. Seln sells seed, and the rest of us will make ourselves known. We are a nosy people, Captain.' },
  { who: 'sato', text: 'Just Sato. Thank you, Warden. I shall try not to disgrace the Hollins.' },
  { who: 'marrow', text: 'They grew turnips, dear, not legends. Start there. Good morning to you.' },
];

// ------------------------------------------------------------------ the radio, the signs, the guide

export const RADIO = {
  sun: [
    'Eden Chamber Weather. Tomorrow: clear, sun-line at full output. This was decided on Tuesday and nobody has objected.',
    'Chamber Weather. Tomorrow will be fine and dry. The climate plant reports that it is quite pleased with itself.',
    'Tomorrow: sunshine, end to end. No rain is scheduled. Water your own crops; the plant accepts no responsibility.',
  ],
  rain: [
    'Eden Chamber Weather. Rain is scheduled for tomorrow, all day. Farmers may leave the watering can at home. You are welcome.',
    'Chamber Weather. Tomorrow: steady rain, as approved in committee by four votes to three. The three have been told to bring coats.',
    'Tomorrow the condensers will be emptied over the river chamber. We call this rain. It is good for the fields and for the fishing.',
  ],
  storm: [
    'Eden Chamber Weather. Tomorrow the climate plant must vent heat, which you will experience as a storm. Stay indoors. Shops will be shut.',
    'Chamber Weather. A storm is scheduled for tomorrow. It will start when it starts; the plant has never been good with clocks. Do not go out.',
    'Tomorrow: high wind and heavy rain, courtesy of the summer heat exchange. We apologise. The Hangar café says it will stay open regardless.',
  ],
  snow: [
    'Eden Chamber Weather. Snow tomorrow, by request of the village children and with the approval of the Governor. Wrap up.',
    'Chamber Weather. Tomorrow: snow. The climate plant calls it a controlled release of frozen condensate. We call it rather pretty.',
    'Tomorrow it will snow. Nothing grows outdoors, the lake stays open for fishing, and the plant would like some credit for the effect.',
  ],
};

export const SIGNS = {
  'farm.gate': 'THE HOLLIN FIELD. Est. before the war; re-est. this spring. South road to Willowfall, ten minutes. Please shut the gate; the hens have ambitions.',
  'farm.bin': 'SHIPPING BIN. Collection daily at five (J. Maris, courier). Payment at dawn. No tools, no livestock, no notes saying "sorry about the eggs".',
  'village.square': 'WILLOWFALL. Population 94 (the 4 is freshly painted). Notices: Planting Day, Spring 18. Lantern Night, Summer 24. Harvest Fair, Autumn 9. Year\'s End, Winter 30.',
  'village.memorial': 'Ships on the left. People on the right. They kept the dark out as long as they could. The strawberries are for everyone; take one and remember somebody.',
  'village.dock': 'RIVER DOCK. Courier boats daily. The Ashfall trading barge calls on Saturdays, nine till five. Her Majesty asks that you do not lean on the awning.',
  'village.storefront': "SELN'S SEED & SUNDRY. Seeds in season, fresh bread, rucksacks, fishing rods. Open 9 to 5. Closed Sundays, when the steward is out counting seedlings.",
  'village.cafefront': 'THE HANGAR. Hot food, ten till ten, every day of the year. Storms included. If you are hungry and cannot pay, come in anyway. T. Oduya, prop.',
  'village.hallfront': 'VILLAGE HALL. Warden E. Marrow. Desk hours 9 to 4, Monday to Friday. The Memory Room is open to all: things from the Old World, kept so we know what was good.',
  'village.workshopfront': 'RUESS: WORKSHOP. Tools upgraded overnight. Greenhouses mended. Clocks, prams and rods considered. Open 9 to 5. Closed Wednesdays. Do not touch the carousel.',
  'village.ranchyard': "CORRAN'S RANCH. Chickens, cows, feed and fodder, milkers and brushes. Open 9 to 5. Closed Thursdays (gone fishing). The shouting is normal.",
  'hill.wreck': 'THE DESCENT. Cargo lift to the Old World. Runs 8 to 6; N. Vashti, keeper. Walk your machine on. Set your turret down before you dig. The crawlers are pests, not monsters.',
  'hill.lake': 'HILL LAKE. Best fishing in the chamber. Home of "Old Hollin", a carp of great age and poor manners. Rods lost to him so far: 14.',
  'hill.overlook': 'THE OVERLOOK. From here the whole river chamber curves up and over. At dusk the great window opens, and you can see the Earth. Give it time. So are we.',
};

export const HELP = [
  {
    title: 'Controls',
    body: 'Move: W A S D or the arrow keys. Hold Shift to run.\nUse the held tool or item: Space or left click.\nTalk, interact, harvest, enter a door: E.\nChoose a rucksack slot: keys 1 to 0, or the mouse wheel.\nEat the food you are holding: R.\nOpen the rucksack: Tab.\nMenu (save, settings, this guide): Esc.\nDrag with the mouse to turn the camera.\n\nOn a touch screen there is a stick on the left to move, and buttons on the right for Use, Interact, Eat and the rucksack. Drag anywhere else to turn the camera.',
  },
  {
    title: 'The day',
    body: 'A day runs from 06:00 to midnight. Time stops while you read, talk or look in a menu.\n\nSato has 100 stamina. Each use of a tool costs 2 (fishing costs 1; a swing that does nothing is free). Food gives stamina back, and a night in bed restores all of it.\n\nIf stamina reaches 0 she faints, and if she is still up at midnight she collapses. Either way she wakes at 06:00 with half her stamina, so go to bed in good time.\n\nThe radio in the farmhouse gives tomorrow\'s weather. Rain waters the whole field for you. Storms come in summer and shut the shops. Snow falls in winter.',
  },
  {
    title: 'The field and crops',
    body: 'The field starts overgrown. Cut weeds with the sickle, break rocks with the hammer and chop branches and stumps with the axe.\n\nTill clear ground with the hoe. A seed bag sows a block of three by three tiles around the one you aim at; only tilled, empty tiles take seed.\n\nWater every day. A crop grows one day for each night it went to bed wet. When it is ripe, press E to harvest. Some crops grow again after picking.\n\nEach crop belongs to a season. When the season changes, crops that are out of season die; cut them with the sickle. The greenhouse, once Ruess has repaired it, ignores season and weather, but you must water it yourself.',
  },
  {
    title: 'Selling and shopping',
    body: 'Put anything you want to sell into the shipping bin beside the farmhouse. Juno Maris collects at 17:00, and the money arrives at dawn. Tools cannot be shipped.\n\nIn Willowfall, down the south road:\nSeln\'s Seed & Sundry: seeds, bread, bigger rucksacks, the fishing rod. Closed Sunday.\nCorran\'s Ranch: chickens, cows, feed, fodder, milker, brush. Closed Thursday.\nRuess\'s Workshop: tool upgrades, greenhouse repair. Closed Wednesday.\nThe Hangar café: hot meals, 10:00 to 22:00 every day.\nMoraine\'s barge: rare seed and tonic, Saturdays at the dock.\n\nA shop is open when its keeper is at the counter.',
  },
  {
    title: 'Tools and upgrades',
    body: 'Tools have three levels: Field, Alloy and Starsteel.\n\nAt level 1 the hoe, watering can and sickle work one tile. At level 2 they reach three tiles in a line ahead. At level 3 they cover a block of three by three.\n\nThe can holds 20, 40 or 80 waterings; refill it at any water. The hammer needs level 2 to break boulders. The axe fells stumps at any level, in three blows.\n\nRuess upgrades a tool overnight. Level 2 costs 800 cr and 5 scrap. Level 3 costs 2500 cr, 5 alloy and 1 crystal. He also repairs the greenhouse for 4000 cr and 120 lumber; chop branches and stumps to collect lumber.',
  },
  {
    title: 'Animals',
    body: 'Corran sells chickens (the coop holds 6) and cows (the barn holds 4). They arrive the next morning.\n\nEach chicken eats 1 feed a day and each cow 1 fodder. "Fill the troughs" feeds them all from your stock. Buy feed and fodder at the ranch, or sow grass seed in the pasture and cut ripe grass with the sickle for free fodder. Grass does not grow in winter.\n\nA fed chicken lays an egg the next morning. A fed cow can be milked once a day with the milker.\n\nAnimals grow fond of you when you feed them, talk to them and, for cows, brush them. A missed meal sets that back. The fonder a cow is, the larger her milk.',
  },
  {
    title: 'The village and friendship',
    body: 'Every villager has a friendship score, shown as hearts (0 to 10).\n\nTalk to someone with E: the first talk each day adds a little. You may also give each person one gift a day: hold the item and press E. People have things they love, like and dislike, and a gift on their birthday counts three times over.\n\nAt certain hearts a villager has something to show or tell you. Walk in at the right place and time and the scene plays by itself.\n\nPeople keep their own hours. The General visits the village on Saturdays and the farm on Sundays. Queen Moraine\'s barge is at the dock on Saturdays only.',
  },
  {
    title: 'The Old World, fishing and forage',
    body: 'On the hill, Vashti\'s cargo lift, the Descent, carries Sato and her Pallas down to the ruins of the Old World. Search rubble with E for scrap, alloy, crystal and relics. Set the Hydra turret down with Space: it sees off the crawlers and stray drones, which are pests and no real threat. Deeper levels hold rarer things. Give one of each relic to Marrow\'s Memory Room in the hall, or sell or gift the rest.\n\nFishing: hold the rod, face water and press Space to cast. When the float dips, press Space again. Rain and the hill lake are best, each season has its own fish, and Ruess can improve the rod.\n\nForage grows on the hill each day: herbs, berries, mushrooms, frostcaps.',
  },
  {
    title: 'Seasons and festivals',
    body: 'A year has four seasons of 30 days. Spring 1 of the first year is a Monday.\n\nSpring: turnip, potato, cucumber, strawberry.\nSummer: tomato, corn, onion, pumpkin.\nAutumn: carrot, eggplant, sweet potato, spinach.\nWinter: nothing grows outdoors. Fish, explore, tend animals, use the greenhouse.\nMoonflower, from Moraine, grows in any season but winter.\n\nFestivals (shops are shut that day):\nPlanting Day, Spring 18, the square, from 10:00.\nLantern Night, Summer 24, the bridge, from 18:00.\nHarvest Fair, Autumn 9, the square, from 10:00.\nYear\'s End, Winter 30, the square, from 18:00.\n\nGo to the place during the festival and join in.',
  },
];

// ------------------------------------------------------------------ the Memory Room, fishing, the Old World

export const RELICS = ['photo', 'teacup', 'book', 'watch', 'toy', 'medal', 'seedtin', 'musicbox', 'datachip', 'ring'];
export const FISH = ['fish_s', 'fish_m', 'fish_l', 'fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter', 'fish_king'];

export const MUSEUM = {
  intro: 'This is the Memory Room. Whatever you bring up from the Old World, I will show one of each, so the children know what was lost. And what was good.',
  thanks: {
    photo: 'A photograph. Look at them, squinting into a real sun. I shall hang it at a child\'s height.',
    teacup: 'Porcelain, and not a chip on it. Somebody washed this up with care for forty years. It goes on the top shelf.',
    book: 'A book, with paper pages. The children may turn them, with clean hands, one at a time.',
    watch: 'A pocket watch. It has stopped at ten past four. We shall leave it there; that was somebody\'s afternoon.',
    toy: 'A tin robot. Oh, the little ones will stand in front of this for hours. So will Corran.',
    medal: 'A medal from a war nobody remembers. Good. Let it sit here and be only a pretty thing.',
    seedtin: 'A seed tin, and the lid still tight. I shall show the tin, and Ama shall have a quiet look at what is inside.',
    musicbox: 'A music box. ...Well. I did not expect to hear that tune again. Give me a moment, child.',
    datachip: 'A data chip. Ruess says there are recipes on it, and a great many pictures of somebody\'s cat. Priceless.',
    ring: 'A gold ring, worn thin on one side. Somebody kept a promise for a very long time. It has a case to itself.',
  },
  repeat: 'We have one of those already, dear, and one is enough to remember by. Sell it, or give it to someone who will smile.',
  complete: [
    { who: 'narrator', text: 'Ten cases along the wall of the Memory Room, and now every one is filled. The village children have been let in early, and are being extremely quiet.' },
    { who: 'marrow', text: 'A photograph, a cup, a book, a watch, a toy, a medal, a seed tin, a music box, a chip, a ring. That is a whole life, near enough. Somebody\'s Tuesday.' },
    { who: 'marrow', text: 'I wanted them to know what was lost. I find the room says something else. It says people down there were kind, and careful, and wound their clocks.' },
    { who: 'vashti', text: '...I have written the cards. Where each one was found. What the room it came from looked like. It seemed right.' },
    { who: 'sato', text: 'I only dug them up, Warden. I spent years bringing wreckage home. This is the first load I have been glad to unpack.' },
    { who: 'marrow', text: 'Then let it be written in the book: collected by M. Sato, farmer. Not captain. I asked which you would prefer, and then I decided for you.' },
    { who: 'narrator', text: 'A small girl asks whether the tin robot has a name. Nobody knows. By evening it has eleven.' },
  ],
};

export const FISHING = {
  bite: ['The float dips. Now!', 'A tug on the line!', 'Something has taken the bait...'],
  miss: ['Too slow. The float bobs back up, unimpressed.', 'It got away. It had other plans.', 'Nothing on the hook but good intentions.'],
  caught: {
    fish_s: 'A silverfin. Small, bright and deeply offended.',
    fish_m: 'A river trout, speckled like the far bank at dusk.',
    fish_l: 'A chamber carp, heavy as a full watering can.',
    fish_spring: 'A blossom dace, pink along the flank. They only run in spring.',
    fish_summer: 'A sunline perch, striped gold. It was basking and regrets it.',
    fish_autumn: 'A copper eel. Oduya will want to hear about this.',
    fish_winter: 'A frost char, cold as the lake and twice as clear.',
    fish_king: 'Old Hollin himself. He looks at Sato as one veteran looks at another.',
  },
};

export const RUINS = {
  arrive: [
    'The lift settles. Grey light, still air, and the long quiet of streets nobody has walked in a lifetime.',
    'The Pallas steps off the platform into ash and ivy. Somewhere, a shop sign is still creaking.',
    'The Old World. Roofless houses, a rusted tram, and a sky the colour of old pewter.',
  ],
  deeper: [
    'Further in. The buildings are taller here, and the dust has kept things better.',
    'A stairway down, half buried. The air is cooler, and the rubble has not been touched.',
    'The old city centre. Whatever people prized, they kept it near here.',
  ],
  monster: [
    'Pest control. Carry on.',
    'It was eating a letterbox. I have done the letterbox a favour.',
    'The Hydra has opinions about crawlers. I let it express them.',
  ],
  relic: {
    photo: 'A faded photograph: strangers on a beach, laughing at whoever held the camera.',
    teacup: 'A porcelain cup with a thin gold rim, somehow unbroken under a fallen shelf.',
    book: 'An old-world book, swollen with damp, with a pressed flower still marking a page.',
    watch: 'A pocket watch on a chain, stopped, with initials worn almost smooth on the case.',
    toy: 'A tin robot with a key in its back; it walks three steps and falls over, delighted.',
    medal: 'An old medal on a faded ribbon, for some bravery nobody is left to describe.',
    seedtin: 'A seed tin with a painted lid, and something still rattling faintly inside.',
    musicbox: 'A music box of dark wood; the comb is bent, but it remembers most of its tune.',
    datachip: 'A data chip in a cracked case, labelled in careful handwriting: "Keep."',
    ring: 'A gold ring, plain and thin, found in a saucer beside a kitchen sink.',
  },
};
