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
    id: 'oduya', name: 'Tem Oduya', short: 'Oduya', title: 'Canteen chef of the Hangar; once a dockyard engineer', portrait: P + 'w_oduya.webp',
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

Object.assign(NPCS, {
  kestrel: {
    id: 'kestrel', name: 'Commander Rell Kestrel', short: 'Kestrel', title: "Commander of the Guardians' wing, Upper deck", portrait: P + 'w_kestrel.webp',
    look: { skin: '#e2bd9a', hair: '#d8b860', top: '#7a4f2a', bottom: '#39404a', style: 'short' },
    birthday: { season: 1, day: 28 },
    loves: ['pie', 'corn', 'fish_summer', 'datachip'],
    likes: ['bread', 'tea', 'egg', 'tomato', 'strawberry', 'toy', 'medal', 'fish_m'],
    dislikes: ['scrap', 'spinach', 'frostcap'],
  },
  mori: {
    id: 'mori', name: 'Dr. Haruto Mori', short: 'Dr. Mori', title: 'Doctor of the Willowfall clinic', portrait: 'art/farm/people/mori_front.webp',
    look: { skin: '#e3c3a2', hair: '#22201e', top: '#f2f2ee', bottom: '#4a5560', style: 'short' },
    birthday: { season: 2, day: 3 },
    loves: ['tea', 'herb', 'soup', 'teacup'],
    likes: ['mushroom', 'spinach', 'carrot', 'egg', 'milk_s', 'berry', 'book', 'fish_winter'],
    dislikes: ['tonic', 'scrap', 'alloy'],
    shop: 'clinic',
  },
  yui: {
    id: 'yui', name: 'Yui Hoshino', short: 'Yui', title: 'Librarian of the Lantern Ring library', portrait: 'art/farm/people/yui_front.webp',
    look: { skin: '#ecd0b4', hair: '#231a18', top: '#b06a7a', bottom: '#5b5347', style: 'long' },
    birthday: { season: 3, day: 17 },
    loves: ['book', 'moonflower', 'strawberry', 'musicbox'],
    likes: ['tea', 'photo', 'teacup', 'berry', 'sweetpotato', 'mushroom', 'datachip', 'fish_spring'],
    dislikes: ['scrap', 'onion', 'fish_l'],
  },
});

export const VILLAGERS = ['general', 'ruess', 'marrow', 'seln', 'corran', 'oduya', 'maris', 'vashti', 'moraine', 'kestrel', 'mori', 'yui'];

export const SPOTS = [
  'farm.porch', 'farm.bin', 'farm.gate', 'farm.pond', 'farm.field',
  'village.square', 'village.memorial', 'village.bridge', 'village.dock', 'village.bench', 'village.storefront',
  'village.cafefront', 'village.hallfront', 'village.workshopfront', 'village.ranchyard', 'village.river',
  'hill.wreck', 'hill.lake', 'hill.overlook',
  'store.counter', 'store.floor', 'ranch.counter', 'workshop.counter', 'workshop.bench',
  'cafe.counter', 'cafe.table1', 'cafe.table2', 'cafe.table3', 'hall.desk', 'hall.floor',
  'clinic.counter', 'clinic.floor', 'library.counter', 'library.floor', 'village.clinicfront', 'village.libraryfront',
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
      { who: 'mori', text: 'One for each I could not keep. I write the names small. There is more room on a lantern than you would think.' },
      { who: 'vashti', text: '...One. No name on it. I am still looking for the name.' },
      { who: 'general', text: 'I have rather a lot. I hope the river will forgive the traffic.' },
      { who: 'sato', text: 'Hand me half, sir. You always did try to carry the whole manifest yourself.' },
      { who: 'narrator', text: 'They kneel side by side on the bank and launch them one at a time. Neither of them hurries.' },
      { who: 'moraine', text: 'I sold to both sides, Captain. So I have brought lanterns for both. It seemed the only honest count.' },
      { who: 'narrator', text: 'The lights drift under the bridge and away round the long curve of the ring, until the river above and the river below both carry stars.' },
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
      { who: 'kestrel', text: 'I am judging pies. I have tasted eleven. It is a hard duty, and I shall see it through to the end.' },
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
      { who: 'oduya', text: 'Bowls! Take a bowl, pass a bowl. Nobody sees the new year in on an empty stomach on my deck.' },
      { who: 'marrow', text: 'Another year with air in it. I counted every day. There was a time I was not certain I would get to.' },
      { who: 'seln', text: 'The seed drawers are full again. First time in eleven years I have had to label a new one.' },
      { who: 'maris', text: 'I flew four hundred runs this year and not one of them was a casualty list. Best year of my life.' },
      { who: 'yui', text: 'I am to read aloud at eleven. It is one page. I have chosen it very carefully. It is about a morning.' },
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

Object.assign(SCHEDULE, {
  // The Guardians' commander: about the village by day, the overlook some evenings.
  kestrel(wd, m) {
    const after = ['village.clinicfront', 'village.square', 'village.libraryfront', 'village.ranchyard', 'village.square', 'village.dock', 'village.bench'][wd];
    const sky = wd === 0 || wd === 2 || wd === 4;
    return pick(m, [H(9), H(11), 'village.square'], [H(11), H(13), 'village.bridge'],
      [H(13), H(14, 30), wd === 6 ? 'village.cafefront' : 'cafe.table3'], [H(14, 30), H(17, 30), after],
      [H(18), H(20), sky ? 'hill.overlook' : 'village.bridge']);
  },
  // The clinic: closed Sunday.
  mori(wd, m) {
    if (wd === 6) return pick(m, [H(10), H(12), 'library.floor'], [H(12), H(15), 'hill.lake'], [H(15), H(17), 'village.bench']);
    const supper = wd === 0 || wd === 4;
    return pick(m, [H(8), H(9), 'village.clinicfront'], [H(9), H(17), 'clinic.counter'], [H(17), H(18, 30), wd % 2 ? 'village.river' : 'village.clinicfront'],
      [H(18, 30), H(20), supper ? 'cafe.table3' : 'village.bench']);
  },
  // The library: closed Monday.
  yui(wd, m) {
    if (wd === 0) return pick(m, [H(10), H(12), 'clinic.floor'], [H(12), H(14), 'village.river'], [H(14), H(17), 'hill.overlook'], [H(17), H(18, 30), 'village.libraryfront']);
    const tea = wd === 5 || wd === 6;
    return pick(m, [H(9), H(10), 'village.libraryfront'], [H(10), H(18), 'library.counter'],
      [H(18), H(18, 30), 'village.libraryfront'], [H(18, 30), H(20), tea ? 'cafe.table1' : 'village.bridge']);
  },
});

const FESTIVAL_SPOTS = {
  'village.square': {
    general: 'village.memorial', marrow: 'village.square', seln: 'village.storefront', corran: 'village.square', ruess: 'village.bench',
    oduya: 'village.cafefront', maris: 'village.square', vashti: 'village.bench', moraine: 'village.hallfront',
    kestrel: 'village.square', mori: 'village.bench', yui: 'village.hallfront',
  },
  'village.bridge': {
    general: 'village.bridge', marrow: 'village.bridge', seln: 'village.river', corran: 'village.river', ruess: 'village.bench',
    oduya: 'village.bench', maris: 'village.bridge', vashti: 'village.dock', moraine: 'village.dock',
    kestrel: 'village.bridge', mori: 'village.river', yui: 'village.bench',
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
  // Sato's partner lives at the farm: on the porch at dawn and in the evening (unless a festival is on).
  const atHome = ctx.partner === npcId && ((m >= H(6) && m < H(8)) || (m >= H(20) && m < H(22)));
  if (atHome && !(fest && m >= fest.from - 60 && m < fest.to)) return { spot: 'farm.porch' };
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
      'I slept the whole night after last Sunday. First time since the siege. I blame your field.',
      ['When the office gets loud I think of this place. The pond. The shutter you still have not mended.', 'It helps more than you would think.'],
    ],
    s0: 'Spring on a sealed deck. The climate plant schedules it, and still the blossom surprises everyone. Me included.',
    s1: "They have turned the sun-line up for summer. Ruess says two per cent. My collar says more.",
    s2: 'Autumn suits Eden. Everything the colour of old brass, and for once nothing is on fire.',
    s3: ['Winter, made to order. I signed the requisition for it myself.', 'I regret nothing. Look at it.'],
    rain: 'Scheduled rain. I approved the timetable and forgot my coat anyway.',
    snow: "I asked the plant for light snow. This is what an engineer believes 'light' means.",
    sun: 'A clear day, the whole length of the deck. You can see the far fields overhead. I never tire of that.',
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
    rain: "Rain on the workshop roof. Best sound on the deck. Second best: a bearing that's stopped squeaking.",
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
      ["When the ring lost its air I knew every name on my list. I still say them over, most mornings.", 'It is shorter than saying nothing.'],
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
    sun: 'A bright day. I can read the far side of the ring like a page. Someone over there has not mown.',
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
    first: ["Sit. Anywhere. You're the farmer. Tem Oduya. I used to fix hulls, now I fix hunger.", "This is the deck's canteen. It was a hangar bay once, so I kept the name. The soup is new."],
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
      "If this deck ever loses air again, I'm dying with a full larder and so are all of you. That is a promise.",
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
    sun: 'What a day! You can see my whole round from here, all the way up the curve of the ring.',
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
    sun: 'Clear. From the overlook you can see the whole ring curve. ...I look, sometimes.',
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
    s2: 'Autumn. The whole deck turns to gold and for once I had nothing to do with it.',
    s3: 'Winter trade is slow. I stay for the tonic customers and for the look of this place under snow.',
    rain: 'Rain on a barge awning. I have slept through bombardments less soothing.',
    fest: 'A festival with no entry fee. Charming. Ruinous, but charming.',
    year2: ['A year, and you are still my best customer on this deck.', 'You are also very nearly the only one. Both things can be true.'],
    fish: ["They tell me there is a king in the hill lake. An old carp. I do respect a monarch who cannot be caught."],
  },
};

Object.assign(TALK, {
  kestrel: {
    first: ["Sato. The carrier captain who bought a field. I'm Kestrel; I fly the Guardians' wing up here.", 'I had a bet with myself you would last a fortnight. I have lost bets before. Prove me wrong, I can take it.'],
    bday: ['A present? For me? Naturally. I am very easy to admire.', '...No, really. Thank you. Nobody on the wing would dare. I shall be unbearable about this.'],
    b0: [
      'I patrol the village. It is not a demanding patrol. Yesterday the incident was a duck.',
      'You hold a hoe like a gunner holds a mop. It is all right. I would be worse, and I never say that.',
      "Eleven confirmed aces on this deck and I am three of them. That's a joke. Mostly.",
    ],
    b1: [
      ['The wing flies cover over the Lantern Ring at dawn. If you hear engines, wave.', 'I shall not wave back. I have an image. But I will see it.'],
      'You were on the gates in the siege. I was above them. We never met. I thought about that when you moved in.',
      "I've been told I talk about myself a great deal. I listened carefully, then explained why they were wrong, at length.",
    ],
    b2: [
      ['I was the best pilot the Union had. Then the war stopped and I was the best at something nobody needs.', 'You seem to have solved that. I am watching how. Do not let it go to your head.'],
      ['I lost two wingmen in the siege. I tell everyone I am fine. I am telling you I am mostly fine.', 'That is a promotion, Sato. Appreciate it.'],
      'The children ask for flying stories. I leave out the frightening bits. There is not much story left, so I add loops.',
    ],
    b3: [
      ['When I land now, the first thing I look for is whether your lamp is lit.', 'A pilot likes a fixed light. That is all I am saying. For the moment.'],
      'I used to need a crowd. Now I would rather stand on your terrace and be ignored by hens. Explain that to me.',
    ],
    s0: 'Spring thermals off the terraces. The whole wing wobbles over your field. We call it the turnip bump.',
    s1: "Summer. They've turned the sun-line up. From a cockpit you can watch the ring's shadow walk across the far gardens.",
    s2: 'Autumn flying is the best. Cold air, clear deck, the coffee terraces gone copper. I do an extra lap and log it as vigilance.',
    s3: 'Winter. Snow on the wings before breakfast. The mechanics hate it. I look magnificent in a scarf, so I do not mind.',
    rain: 'Scheduled rain. I asked them to schedule it over somebody else. They declined. No respect for a war record.',
    snow: 'Snow. No flying today. I am told a walk is the same thing but slower. It is not.',
    sun: 'Clear from end to end. You can see the lift towers on the far side of the ring, upside down. Good day to be alive.',
    morning: 'Dawn patrol is done. Nothing to report. I say that every day now, and I have started to enjoy it.',
    evening: "Earth is coming up in the great window. I flew over it once, low. It was grey. I'd like to go back when it is not.",
    fest: 'A festival. I am off duty and out of uniform. Yes, this is what I wear out of uniform. It is a better jacket.',
    year2: ['A year. I owe myself a great deal of money on that fortnight.', "Best bet I ever lost."],
    fish: 'Fishing? I caught a sunline perch once by flying low over the lake. It landed in the cockpit. I maintain that counts.',
    eve: { harvest: 'Harvest Fair tomorrow. I am judging the pie table. I volunteered. Twice.' },
  },
  mori: {
    first: ['Ah. The new farmer. Haruto Mori; I keep the clinic. Welcome to Willowfall.', 'Farming injuries are mostly backs, blisters and pride. I can treat two of the three.'],
    bday: ['For me? Oh. I had forgotten the date; I only ever write other people\'s on charts.', 'Thank you, Sato. I shall take a full ten minutes off to enjoy it.'],
    b0: [
      'Lift with your knees. I say it to everyone. Nobody listens, and then I see them on Thursday.',
      'The clinic is open nine till five, not Sundays. Emergencies any time. Please do not make your turnips an emergency.',
      'You look tired. Eat before you work, not after you fall over. That is my whole medical philosophy.',
    ],
    b1: [
      ['I was a carrier surgeon. Not your carrier. I would remember a captain who did not shout.', 'Now I treat colds. I have come to love a cold. A cold gets better.'],
      'I prescribe your vegetables, you know. "Soup, twice daily." It is the most popular thing I have ever written.',
      'Forgive me, I am counting your breaths. Habit. Sixteen a minute. Very good. You may carry on talking.',
    ],
    b2: [
      ['In the siege the clinic had nine beds and thirty-one people. I did not sleep for four days.', 'I still wake at the hour the shelling started. I make tea and wait for it to be an ordinary morning. It always is.'],
      'You are the only patient who asks how I am and then waits for the answer. It is most irregular. Please continue.',
      ['People think a doctor is calm. I am not calm. I am merely slow, on purpose.', 'You do the same. I recognised it at once.'],
    ],
    b3: [
      ['I have started closing at five. Actually at five. The village is alarmed.', 'I tell them I have somewhere to be. I do not say it is a farm gate. They know.'],
      'I spent years listening to hearts that were failing. Yours is steady. I find I listen to it for no medical reason whatever.',
    ],
    s0: 'Spring. Hay fever on a space colony. The climate plant insists the pollen is authentic. My waiting room agrees.',
    s1: 'Summer. Drink water. Wear a hat. The sun-line is a lamp, but it does not know that and neither does your skin.',
    s2: 'Autumn is mushroom season, which means I spend it asking people what exactly they ate.',
    s3: 'Winter. Everyone slips on the bridge at least once. I have asked Marrow for a rail. She has asked me for a budget.',
    rain: 'Rain. Do keep your feet dry. No, I know you will not. I shall leave the kettle on.',
    snow: 'Snow. The clinic is warm and I have nothing in the beds. Come and sit down. Doctor\'s orders, loosely.',
    sun: 'A fine day. I can see the far side of the ring from the clinic window. Somebody is hanging out washing overhead.',
    morning: 'Good morning. You are up before my first patient. That is either discipline or insomnia; I can treat only one.',
    evening: 'The last chart is filed. For a few hours nobody in Willowfall needs me, and I hardly know where to put my hands.',
    fest: 'A whole village eating fried things and running about. I have brought bandages. I have also brought an appetite.',
    year2: ['A year, and you have not once been carried into my clinic.', 'I am a little hurt. Medically, I approve.'],
    fish: 'I fish the hill lake on Sundays. It is the one place where waiting is the whole treatment. I have caught very little and feel much better.',
    eve: { lantern: 'Lantern Night tomorrow. I float one for each I could not keep. It is a long evening. I am glad of the company on the bridge.' },
  },
  yui: {
    first: ['...Oh. Hello. You are the farmer. Yui Hoshino. I keep the library.', 'There is a shelf on soil. Third bay, bottom row. I have already put it at the front for you.'],
    bday: ['You... found out my birthday. I keep that in a restricted section.', 'Thank you. I am going to go and be pleased behind a bookcase for a minute.'],
    b0: [
      'The library is open ten till six. Not Mondays. On Mondays the books rest. So do I.',
      'Please do not fold the corners. I can tell. I can always tell.',
      'You may borrow three at a time. Four, if one of them is about turnips. I am not made of stone.',
    ],
    b1: [
      'You brought the almanac back a day early. Do you know how rare that is? I told the cat. The cat was moved.',
      ['It is quiet in here. People think that is a rule. It is only that books are good listeners and nobody wants to interrupt.'],
      'I have catalogued the whole village by what they borrow. Corran: romances. Do not tell him I told you.',
    ],
    b2: [
      ['In the siege I moved four thousand books down a lift shaft on a tea trolley. Three nights.', 'People ask whether I was frightened. I was too cross to be frightened.'],
      "You don't fill silences. Most people cannot bear one. I have been enjoying yours since spring.",
      'I talk more to you than to anyone. I counted. It is nearly two hundred words a visit. I may need to lie down.',
    ],
    b3: [
      ['I keep a chair by the window for you now. I have put a sign on it. The sign says "Reserved". It does not say for whom.', 'Everybody knows for whom.'],
      'I have read a great many love stories. They always skip the part where two people simply sit. That is the part I like.',
    ],
    s0: 'Spring. Everyone borrows gardening books and returns them with soil in. I mind less than I pretend.',
    s1: 'Summer. I open every window, and the pages all turn by themselves. The library reads itself. I just supervise.',
    s2: 'Autumn is reading weather. The sun-line goes low and gold and nobody wants to be anywhere else. Nor do I.',
    s3: 'Winter. Longest queue of the year. The whole Lantern Ring wants a story and a seat by the stove.',
    rain: 'Rain on the skylight. Best reading sound there is. I would put it on the catalogue if I could.',
    snow: 'Snow. Wipe your boots, please. Twice. The carpet has been through a siege already.',
    sun: 'Bright today. I can read the far gardens through the skylight. Upside down, but one adjusts.',
    morning: 'Good morning. I am not properly awake until the first page. Give me a moment.',
    evening: 'Closing time is my favourite. The books all settle. You can very nearly hear it.',
    fest: 'So many people. I have brought a book in case. ...I have not opened it. That is unusual.',
    year2: ['Your library card is full. I have never had to issue a second one to a farmer.', 'I made it myself. It has a turnip on it.'],
    fish: 'There is a book of lake stories in the local history bay. Old Hollin is in six of them. He gets bigger in each. I respect the editing.',
    eve: { yearsend: "Year's End tomorrow. I read aloud by the fire at eleven. It is a short piece. I have been practising since autumn." },
  },
});

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
  const love = ROMANCE.people[npcId];
  if (love && (c.partner === npcId || c.partner === true)) {
    if (c.isBirthday && t.bday && h % 3 === 1) return asConv(t.bday);
    const list = minute < H(8) ? love.morning : love.partnerTalk;
    return [list[h % list.length]];
  }
  if (c.isBirthday && t.bday && h % 3 !== 0) return asConv(t.bday);

  const band = hearts <= 2 ? 0 : hearts <= 5 ? 1 : hearts <= 8 ? 2 : 3;
  const pool = [];
  const add = (conv, w = 1) => { if (conv) for (let i = 0; i < w; i++) pool.push(conv); };
  const addAll = (l, w) => { if (Array.isArray(l)) l.forEach((x) => add(x, w)); else if (typeof l === 'string') add(l, w); };
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
  if (love && (c.sweetheart === npcId || c.sweetheart === true)) for (const l of love.sweetTalk) add(l, 4);
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

Object.assign(GIFT, {
  kestrel: {
    loved: "Now that is exactly right. How did you know? No, don't tell me, let me believe I'm that easy to read.",
    liked: 'Not bad at all, Sato. I shall mention it to the wing. Casually. Several times.',
    neutral: 'A gift. Well. It is the thought, and I am told I am worth thinking about.',
    disliked: 'Ah. You have mistaken me for someone with a use for this. An easy error. I forgive you.',
    bday: 'On my birthday, no less. ',
  },
  mori: {
    loved: 'Oh, this is just what I would have prescribed for myself, if I ever did. Thank you, truly.',
    liked: 'How kind. I shall have it at my desk between patients.',
    neutral: 'Thank you. It is good for a doctor to be the one receiving, now and then.',
    disliked: 'Ah. I shall keep it on the shelf, well away from the patients. It is the thought I am grateful for.',
    bday: 'You remembered the date. ',
  },
  yui: {
    loved: '...Oh. Oh, this is... I need a moment. I am going to shelve it where only I can find it.',
    liked: 'Thank you. That is thoughtful. I shall make a note of it. A fond note.',
    neutral: 'Thank you. I shall file it under "gifts, miscellaneous". It is a small section, but it is growing.',
    disliked: 'Oh. Hm. I do not think that may come into the library. But thank you for thinking of me.',
    bday: 'A birthday present. ',
  },
});

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
      L('sato', 'The ones you sold bought the air on this deck. I am breathing it. So is the baker.'),
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
      L('narrator', 'The General is leaning on the rail of the bridge, watching the river run on up the curve of the ring and over his head.'),
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
      L('marrow', 'When Eden was emptied, sixty-one of us would not go, or could not. Then the ring lost its air and we went down into the catacombs.'),
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
      L('sato', 'The far side of the ring heard that, Chief.'),
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
      L('corran', "Shh. First one born on this deck since the air came back. Three in the morning. I haven't moved since. Can't feel my feet."),
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

EVENTS.push(
  // ---- Kestrel: the ace with nothing to shoot at.
  {
    id: 'kestrel3', npc: 'kestrel', hearts: 3, map: 'village', from: H(9), to: H(13),
    lines: [
      L('narrator', 'Commander Kestrel is surrounded. Seven children, a great deal of paper, and a folded glider stuck in the lantern post above his head.'),
      L('kestrel', 'No, no. Nose down, then let it go. You do not throw an aircraft, Tolly, you release it. ...Sato. You saw nothing.'),
      L('sato', 'I saw the commander of the Guardians\' wing lose a dogfight to a lamp.'),
      L('kestrel', 'The lamp had the height. I shall be saying so in my report.'),
      L('kestrel', 'They asked me to teach them to fly. I said they were too small. So they asked what the smallest aeroplane was, and here we are.'),
      L('sato', 'You are good at it.'),
      L('kestrel', 'I am good at everything. ...That one I did not expect to be good at. I never taught anyone anything they would live long enough to use.'),
      L('narrator', 'A paper glider sails past, level and true, all the way across the square. The children shriek. Kestrel watches it the whole way down.'),
      L('kestrel', 'Did you see that? That is my trim. I taught her that trim. Here, hold these, I must go and be modest about it.'),
    ],
    reward: { love: 3 },
  },
  {
    id: 'kestrel7', npc: 'kestrel', hearts: 7, map: 'hill', weekday: 4, from: H(18), to: H(20),
    lines: [
      L('narrator', 'At the overlook the sun-line is dimming. Kestrel sits on the rail with his flight jacket off, which nobody in Willowfall has ever seen.'),
      L('kestrel', "Don't make a remark. It is warm. Jackets come off. It is a known property of jackets."),
      L('sato', 'I said nothing.'),
      L('kestrel', 'You said it very loudly. ...There are two names stitched inside the collar. Dace and Ilyan. My wing, at the siege. I do not take it off because then I can see them.'),
      L('kestrel', 'I was the ace. Everyone looked at me. So I could never once be seen to look down. I have been looking up for so long my neck hurts.'),
      L('sato', 'You can look down here. It is only me, and a great many turnips, a long way off.'),
      L('narrator', 'He does. For a while he says nothing at all, which from Rell Kestrel is a considerable thing to be given.'),
      L('kestrel', 'I talk too much, Sato. I know it. It is so that nobody gets a word in to ask how I am.'),
      L('sato', 'How are you, Commander?'),
      L('kestrel', '...Better than I was at six o\'clock. Do not tell the wing. Here. I won it at cards and it ought to go to somebody with patience.'),
    ],
    reward: { love: 5, item: ['datachip', 1] },
  },
  // ---- Mori: the surgeon learning to rest.
  {
    id: 'mori3', npc: 'mori', hearts: 3, map: 'clinic', from: H(9), to: H(17),
    lines: [
      L('narrator', 'Dr. Mori is asleep at his desk, glasses pushed up into his hair, one hand still resting on an open chart.'),
      L('sato', 'Doctor.'),
      L('mori', 'Pulse is... I am awake. I was resting my eyes in a clinical manner. How long have you been standing there?'),
      L('sato', 'Long enough to put the kettle on. When did you last go home?'),
      L('mori', 'Home is upstairs. So, technically, constantly. ...Tuesday.'),
      L('mori', 'On the carrier there was a bell. When it rang I went, and when it stopped I slept. Here nothing rings. I do not know when I am allowed to stop.'),
      L('sato', 'Nobody rings one for farmers either. I use the sun-line. When it dims, I put the hoe down. The field has never once objected.'),
      L('mori', 'A prescription from a patient. How irregular. ...Stop when the light dims. I shall write it on a chart so that I believe it.'),
      L('narrator', 'He drinks the tea. Halfway down the cup, his shoulders drop an inch, for what looks like the first time in a year.'),
      L('mori', 'Thank you, Sato. Take these, for your hands. Do not argue; I have seen your hands.'),
    ],
    reward: { love: 3, item: ['tea', 2] },
  },
  {
    id: 'mori7', npc: 'mori', hearts: 7, map: 'clinic', from: H(9), to: H(17),
    lines: [
      L('narrator', 'Every bed in the clinic is made, and every bed is empty. Dr. Mori stands in the middle of the ward with a watering can, looking lost.'),
      L('mori', 'Nobody is ill. In the entire village. It has never happened before. I have checked the appointment book four times.'),
      L('sato', 'And the watering can?'),
      L('mori', 'I have planted a physic garden in the window boxes. Feverfew, mint, a thing Seln swears is chamomile. I needed something that would let me look after it.'),
      L('mori', 'I became a doctor because people were breaking faster than anyone could mend them. I never asked what I would be when they stopped.'),
      L('sato', 'I asked myself that on a hangar deck. I am still working on the answer. So far it is mostly turnips.'),
      L('mori', 'I have noticed that you look well on it. Speaking as your physician. ...And otherwise.'),
      L('sato', 'You are over-watering the mint, Doctor.'),
      L('mori', 'Am I? Show me. No, properly; put your hand on the can. I am a slow learner outside my own subject.'),
      L('narrator', 'They water the window boxes together, a good deal more slowly than the job requires.'),
      L('mori', 'There. An empty ward and a full garden. I believe that is what the war was for. Take some home; it makes a better tea than mine.'),
    ],
    reward: { love: 5, item: ['herb', 3] },
  },
  // ---- Yui: the books and the siege.
  {
    id: 'yui3', npc: 'yui', hearts: 3, map: 'library', from: H(10), to: H(18),
    lines: [
      L('narrator', 'In the corner of the library stands a tea trolley with a bent wheel, polished, with a small brass plate screwed to its handle.'),
      L('sato', '"Trolley, Lantern Ring Library. Four thousand one hundred and twelve volumes. Three nights."'),
      L('yui', '...You read the plate. Nobody reads the plate.'),
      L('yui', 'When the siege began they said to take what mattered and go below. So I did. It took sixty-one trips. The lift had no power. I used the stairs for the last nine hundred.'),
      L('sato', 'They meant people.'),
      L('yui', 'I know what they meant. People are what is in the books. I was not going to let that man burn the Lantern Ring twice.'),
      L('sato', 'I held a gate that week with forty machines. You held a library with a tea trolley. I think you had the harder post.'),
      L('yui', '...That is the kindest thing anyone has said to me in this building. And you said it at the correct volume.'),
      L('yui', 'Here. It is overdue for a new reader. No return date. I am told that is called a gift.'),
    ],
    reward: { love: 3, item: ['book', 1] },
  },
  {
    id: 'yui7', npc: 'yui', hearts: 7, map: 'library', from: H(10), to: H(18),
    lines: [
      L('narrator', 'Yui has a thick handwritten ledger on the counter. She closes it when Sato comes in. Then, after a moment, she opens it again.'),
      L('yui', 'I am writing a book. I have never said that aloud. It sounds very large.'),
      L('yui', 'It is the siege, as the village tells it. One page each, in their own words. Corran took eleven pages. Vashti gave me four words. They are good words.'),
      L('sato', 'And yours?'),
      L('yui', 'I keep leaving mine blank. I saved everybody else\'s stories. I am not sure that I have one. I only carried things.'),
      L('sato', 'Then write that. "I carried things." It is the truest account of a war I have heard.'),
      L('narrator', 'Yui looks at her for a long time. It is one of her silences, and Sato does not fill it. That is, more or less, the whole reason they are friends.'),
      L('yui', 'There is a page for you. I should like your words on it. As many or as few as you wish.'),
      L('sato', '"After it was over, I grew turnips." You may add a full stop.'),
      L('yui', 'I shall put it on the last page. It is the only one that says what happens next. ...Stay a while? I have the kettle on, and nothing I need to say.'),
    ],
    reward: { love: 5, item: ['tea', 1], money: 200 },
  },
);

// ------------------------------------------------------------------ the opening

export const INTRO = [
  { who: 'narrator', text: "Major Hesk's stronghold broke on the fortieth day. His flagship, the Verdict, turned over once in the dark and went out. The fleets drifted, and nobody fired.", art: 'intro1' },
  { who: 'narrator', text: 'On Eden they read the registry aloud: every name Protocol Ash had tried to erase. It took a night and a morning. Nobody left before the end.' },
  { who: 'narrator', text: 'Years before, the General had sold his fleet, hull by hull, to buy Eden its air. Now he stood the last Guardians down and went back to a desk full of glass, pumps and petitions.', art: 'intro2' },
  { who: 'narrator', text: 'Two wars and a siege. The colony had its justice. What it wanted now was a morning with nothing in it.' },
  { who: 'narrator', text: "On the carrier's hangar deck the machines stood cold in their rows. Captain Mira Sato crossed it alone, unpinned her captain's bars, and held them out.", art: 'intro3' },
  { who: 'general', text: 'Nine years you kept this deck for me. I never once had to look behind me. What will you do now, Captain?' },
  { who: 'sato', text: 'Grow something.' },
  { who: 'general', text: '...Yes. Somebody should. Go on, then, before I think of a reason to keep you.' },
  { who: 'narrator', text: "The Upper deck of Eden: sky gardens, coffee terraces, hills under the long sun-line. The far side of the ring curves up overhead and becomes the sky.", art: 'intro4' },
  { who: 'narrator', text: 'On the Lantern Ring, where the river bends, stands the village of Willowfall: a hall, a bridge, a canteen in an old hangar bay, some ninety people who stayed.' },
  { who: 'narrator', text: 'Above it, on a terrace, lies the old Hollin field. Nobody has farmed it since the evacuation. It cost a captain her whole discharge pay, to the last credit.', art: 'intro5' },
  { who: 'narrator', text: 'Weeds to the knee. Stones. A farmhouse with one broken shutter, knocking in the breeze from the air plant. A kit bag set down in the long grass.' },
  { who: 'sato', text: 'Well. I have landed on worse.' },
];

export const DAY1 = [
  { who: 'marrow', text: 'So you are the captain who bought the old Hollin field. Ilse Marrow, warden of Willowfall. Welcome to the Upper deck. You may doubt the welcome once you have seen the terrace.' },
  { who: 'sato', text: 'I have seen it. I am choosing to regard it as camouflage.' },
  { who: 'marrow', text: 'Ha. You will do. Now, clear a patch first: the sickle for weeds, the hammer for stones, the axe for branches. Do not try to clear it all today.' },
  { who: 'marrow', text: 'Then till the ground with the hoe, sow your seed, and water it. Every day. A crop only grows after a day it was watered.' },
  { who: 'marrow', text: 'Whatever you mean to sell goes in the shipping bin by the house. Juno Maris collects at five, and you are paid at dawn.' },
  { who: 'marrow', text: 'When your arms give out, eat something or go to bed. Fainting in a field impresses nobody. I have tried it.' },
  { who: 'marrow', text: 'The village is down the south road, on the Lantern Ring. Seln sells seed, and the rest of us will make ourselves known. We are a nosy people, Captain.' },
  { who: 'sato', text: 'Just Sato. Thank you, Warden. I shall try not to disgrace the Hollins.' },
  { who: 'marrow', text: 'They grew turnips, dear, not legends. Start there. Good morning to you.' },
];

// ------------------------------------------------------------------ the radio, the signs, the guide

export const RADIO = {
  sun: [
    'Upper Deck Weather. Tomorrow: clear, sun-line at full output. This was decided on Tuesday and nobody has objected.',
    'Deck Weather. Tomorrow will be fine and dry. The climate plant reports that it is quite pleased with itself.',
    'Tomorrow: sunshine, end to end. No rain is scheduled. Water your own crops; the plant accepts no responsibility.',
  ],
  rain: [
    'Upper Deck Weather. Rain is scheduled for tomorrow, all day. Farmers may leave the watering can at home. You are welcome.',
    'Deck Weather. Tomorrow: steady rain, as approved in committee by four votes to three. The three have been told to bring coats.',
    'Tomorrow the condensers will be emptied over the Upper deck. We call this rain. It is good for the fields and for the fishing.',
  ],
  storm: [
    'Upper Deck Weather. Tomorrow the climate plant must vent heat, which you will experience as a storm. Stay indoors. Shops will be shut.',
    'Deck Weather. A storm is scheduled for tomorrow. It will start when it starts; the plant has never been good with clocks. Do not go out.',
    'Tomorrow: high wind and heavy rain, courtesy of the summer heat exchange. We apologise. The Hangar café says it will stay open regardless.',
  ],
  snow: [
    'Upper Deck Weather. Snow tomorrow, by request of the village children and with the approval of the Governor. Wrap up.',
    'Deck Weather. Tomorrow: snow. The climate plant calls it a controlled release of frozen condensate. We call it rather pretty.',
    'Tomorrow it will snow. Nothing grows outdoors, the lake stays open for fishing, and the plant would like some credit for the effect.',
  ],
};

export const SIGNS = {
  'farm.gate': 'THE HOLLIN FIELD, Upper deck, fourth terrace. Est. before the evacuation; re-est. this spring. South road to Willowfall, ten minutes. Please shut the gate; the hens have ambitions.',
  'farm.bin': 'SHIPPING BIN. Collection daily at five (J. Maris, courier). Payment at dawn. No tools, no livestock, no notes saying "sorry about the eggs".',
  'village.square': 'WILLOWFALL, on the Lantern Ring. Population 94 (the 4 is freshly painted). Notices: Planting Day, Spring 18. Lantern Night, Summer 24. Harvest Fair, Autumn 9. Year\'s End, Winter 30.',
  'village.memorial': 'Ships on the left. People on the right. They kept the dark out, in two wars and a siege. The strawberries are for everyone; take one and remember somebody.',
  'village.dock': 'RIVER DOCK. Courier boats daily. The Ashfall trading barge calls on Saturdays, nine till five. Her Majesty asks that you do not lean on the awning.',
  'village.storefront': "SELN'S SEED & SUNDRY. Seeds in season, fresh bread, rucksacks, fishing rods. Open 9 to 5. Closed Sundays, when the steward is out counting seedlings.",
  'village.cafefront': "THE HANGAR. The Upper deck's canteen. Hot food, ten till ten, every day of the year. Storms included. If you are hungry and cannot pay, come in anyway. T. Oduya, chef.",
  'village.hallfront': 'VILLAGE HALL. Warden E. Marrow. Desk hours 9 to 4, Monday to Friday. The Memory Room is open to all: things from the Old World, kept so we know what was good.',
  'village.workshopfront': 'RUESS: WORKSHOP. Tools upgraded overnight. Greenhouses mended. Clocks, prams and rods considered. Open 9 to 5. Closed Wednesdays. Do not touch the carousel.',
  'village.ranchyard': "CORRAN'S RANCH. Chickens, cows, feed and fodder, milkers and brushes. Open 9 to 5. Closed Thursdays (gone fishing). The shouting is normal.",
  'hill.wreck': 'THE DESCENT. Cargo lift to the Old World. Runs 8 to 6; N. Vashti, keeper. Walk your machine on. Set your turret down before you dig. The crawlers are pests, not monsters.',
  'hill.lake': 'HILL LAKE. Best fishing on the Upper deck. Home of "Old Hollin", a carp of great age and poor manners. Rods lost to him so far: 14.',
  'hill.overlook': 'THE OVERLOOK. From here the whole Lantern Ring curves up and over. At dusk the great window opens, and you can see the Earth. Give it time. So are we.',
};

export const HELP = [
  {
    title: 'Controls',
    body: 'Move: W A S D or the arrow keys. Hold Shift to run.\nUse the held tool or item: Space or left click.\nTalk, interact, harvest, enter a door: E.\nChoose a rucksack slot: keys 1 to 0, or the mouse wheel.\nEat the food you are holding: R.\nOpen the rucksack: Tab.\nThe town map: M (or the map button; click the little map in the corner too).\nMenu (save, settings, music, this guide): Esc.\nDrag with the mouse to turn the camera.\n\nOn a touch screen there is a stick on the left to move, and buttons on the right for Use, Interact, Eat and the rucksack. Drag anywhere else to turn the camera.',
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
    body: 'Put anything you want to sell into the shipping bin beside the farmhouse. Juno Maris collects at 17:00, and the money arrives at dawn. Tools cannot be shipped.\n\nIn Willowfall, on the Lantern Ring, down the south road:\nSeln\'s Seed & Sundry: seeds, bread, rucksacks, the fishing rod. Closed Sunday.\nCorran\'s Ranch: animals, feed, fodder, milker, brush. Closed Thursday.\nRuess\'s Workshop: tool upgrades, greenhouse repair. Closed Wednesday.\nThe Hangar canteen: hot meals, 10:00 to 22:00 daily.\nDr. Mori\'s clinic: closed Sunday.\nThe library: Yui, 10:00 to 18:00, closed Monday.\nMoraine\'s barge: rare seed and tonic, Saturdays at the dock.\n\nA shop is open when its keeper is at the counter.',
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
    body: 'Every villager has a friendship score, shown as hearts (0 to 10).\n\nTalk to someone with E: the first talk each day adds a little. You may give each person one gift a day: hold the item and press E. People have things they love, like and dislike, and a birthday gift counts three times over.\n\nNow and then someone asks a favour: a few of something from your field, the water or the Old World. Bringing it raises friendship more than a gift does.\n\nAt certain hearts a villager has something to show or tell you. Walk in at the right place and time and the scene plays by itself.\n\nThe General visits the village on Saturdays and the farm on Sundays.',
  },
  {
    title: 'Love',
    body: 'Six people can become more than friends: the General, Professor Ruess, Commander Kestrel, Dr. Mori, Oduya the canteen chef and Yui the librarian.\n\nLove grows from friendship. See their heart events, do a couple of favours for them, and reach 8 hearts: then comes the confession, and they become your sweetheart. Only one sweetheart at a time.\n\nAt 10 hearts, buy the Earthlight pendant from Moraine\'s barge and offer it. On Eden it means: share my table. Offered too early, it is gently refused.\n\nThe wedding is held in the village square under the lanterns. Afterwards your partner shares the farmhouse: on the porch at dawn and in the evening, about their own work by day.',
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

// ------------------------------------------------------------------ love stories

export const ROMANCE = {
  candidates: ['general', 'ruess', 'kestrel', 'mori', 'oduya', 'yui'],
  pendant: "The Earthlight pendant: a drop of fused hull-glass that holds the light of Earth as the great window shows it. On Eden you give it to the person you want to share your table with.",
  people: {
    general: {
      confess: [
        L('narrator', 'The last lift to the governor\'s deck leaves at eight. At a quarter past, the General is still at the farm gate, looking at his watch as if it had betrayed him.'),
        L('general', 'I appear to have missed it. For the first time in eleven years I have failed to be somewhere on time.'),
        L('sato', 'You have been checking that watch since seven, sir. You did not miss it. You declined it.'),
        L('general', '...Yes. I was hoping to be accused of carelessness. It seemed the smaller charge.'),
        L('general', 'I come here to rest, I told myself. Then I noticed that I do not rest anywhere you are not. A commander ought to report a thing like that.'),
        L('sato', 'You are not my commander. You have not been for a long while.'),
        L('general', 'No. That is rather the point I have been circling. For about a year, I think. I was never quick at this sort of manoeuvre.'),
        L('sato', 'You circled long enough for me to work it out and make up my mind. So that was useful.'),
        L('general', 'And what did you make it up to?'),
        L('sato', 'There is a later lift at ten. The long way to it goes by the bridge. Walk with me.'),
        L('narrator', 'They go down the south road side by side, not quite touching, the way two people walk who have all the time left in the world and have only just noticed.'),
      ],
      propose: [
        L('narrator', 'Sato has had the pendant in her pocket since Saturday. The General has noticed her hand going to it, and has said nothing, with great care.'),
        L('sato', 'I had a speech. I have given a hundred briefings to you and never once lost my place.'),
        L('general', 'Then I shall wait. I have waited for your reports before. They were always worth it.'),
        L('sato', 'It is short. This is hull-glass with Earth\'s light in it. On Eden it means there is a place at my table, every day, not only the days Eden can spare you.'),
        L('narrator', 'He looks at the pendant in her palm. For once the man who answers forty petitions before noon cannot find a word.'),
        L('general', 'Mira. I sold a fleet without my hand shaking. Look at it now.'),
        L('sato', 'I see it. Is that a yes, or should I call the doctor?'),
        L('general', 'It is yes. It has been yes since a hangar deck, when you said two words and walked away, and I very nearly called you back.'),
        L('sato', 'You should have. I would not have come. But I would have liked to be asked.'),
        L('general', 'Then I am asking now. Late, as usual. May I stay?'),
        L('sato', 'You may stay. The second chair has been waiting a year. It will be glad of the work.'),
      ],
      wedding: [
        L('narrator', 'The square is hung with every lantern in Willowfall. The Governor of Eden has come in a plain coat and his muddy Sunday boots, at the bride\'s request.'),
        L('marrow', 'I have written him in the book as "the General". He would not give me anything else, and Mira says she has no need of it.'),
        L('corran', 'NOBODY SALUTE! That\'s the house rule and it goes for the square an\' all! ...I\'m not crying, it\'s feed dust.'),
        L('ruess', 'Eleven years I watched the pair of you not say it. I had a wager with myself. I have won, and nobody to collect from.'),
        L('general', 'I promise to dig where I am told, to come home when the light dims, and never again to mistake duty for a life.'),
        L('sato', 'I promise to tell you the true thing sideways, so you can bear to look at it. And to keep the lamp lit.'),
        L('marrow', 'Then it is written. In ink. Kiss her, man, the village has been waiting longer than you have.'),
        L('narrator', 'Overhead, the far side of the ring is all lights. Through the great window, Earth looks on, and seems a little less grey.'),
      ],
      partnerTalk: [
        'I resigned two committees this week. Nobody noticed. I should have done it years ago.',
        'I mended the shutter. It took me four hours and three trips to Ruess. Do not look at it closely.',
        'They brought a petition to the gate today. I told them the governor was out and the farmhand was busy.',
        'You hum when you water. You never did that on the bridge of a carrier. I should have remembered if you had.',
        'I have the east corner nearly clear. I have named the largest stone after the Deputy Director.',
        'There is soup on. I followed Oduya\'s instructions exactly, and it has still come out as a sort of tea.',
        'I slept past six. On purpose. I lay there and listened to you not being on watch.',
        'Come in before the light goes, Mira. That is not an order. I gave those up. It is a request, with soup.',
        'I used to count ships before I slept. Now I count rows. I get to the end far more often.',
        'Marrow says marriage has put weight on me. She said it as if she had personally arranged it. She had.',
        'When I ride the lift down to the office I keep my boots muddy. So that I remember which life is the real one.',
      ],
      morning: [
        'Good morning. The kettle is on. I have been up since five; old habits. This one I shall keep, for the view.',
        'It rained on your side of the bed of beans, not mine. I consider that favouritism by the climate plant.',
        'Good morning, Mira. Nothing to report. I shall never tire of saying that to you.',
        'I have fed the hens. They have still not accepted my authority. I admire them for it.',
      ],
      sweetTalk: [
        'I took the long way to the lift again last night. I walked it slowly. I find I am in no hurry to stop being asked.',
        'The Council wonders why the Governor smiles at petitions now. I have not enlightened them.',
        'I keep one of your strawberries on my desk until it is past saving. My secretary thinks it is a filing system.',
        'Saturday and Sunday. It used to be enough to get me through the week. I am finding the arithmetic harder lately.',
      ],
      decline: 'Mira... put that away for now. Not because the answer is no. Because when you ask me, I should like to have earned it.',
    },
    ruess: {
      confess: [
        L('narrator', 'It is past closing. Ruess has been polishing the same spanner for ten minutes, and it was clean when he started.'),
        L('ruess', "Sato. Sit. No, stand. Stay there. I've a thing to say and I've built the whole of it wrong three times."),
        L('ruess', "I am a great deal older than you. I've a temper, a bad knee and forty years of talking to machinery because it didn't answer back."),
        L('sato', 'This is a very thorough fault report, Professor.'),
        L('ruess', "I'm telling you what's wrong with the unit before you take it on! ...That came out. Hm. I didn't mean to get to that part yet."),
        L('sato', 'I thought you might be working up to it. You have upgraded my watering can four times. It only has three levels.'),
        L('ruess', "You noticed that. Of course you noticed. Stars, I'm too old to be this frightened of a farmer."),
        L('sato', 'Hal. I have read your fault report. I have seen worse machines kept flying, and I have never been fonder of one.'),
        L('ruess', '...You called me Hal. Nobody has called me Hal since before the first war. Say it again, I was not ready.'),
        L('sato', 'Lock up, Hal. Walk me to the bridge. Mind the knee.'),
        L('narrator', 'He locks the workshop, twice, and offers her his arm with terrible formality. She takes it. They go out along the river, arguing gently about the can.'),
      ],
      propose: [
        L('narrator', 'Ruess is under the carousel with a grease gun when Sato sets the pendant down on the workbench, among the bearings.'),
        L('ruess', "What's that? Hull-glass. Good fusing, no bubbles. Who made...? Oh. Oh, now. Wait. Let me get out from under here, I'll not be asked lying down."),
        L('sato', 'I have not asked yet.'),
        L('ruess', "Well, hurry up, girl, I'm sixty-eight!"),
        L('sato', 'Hal Ruess. There is a place at my table and a shed that wants a bench in it. I should like you in both. Every day.'),
        L('ruess', "I never thought anybody would. I'd made my peace with it. Had a whole life worked out: engines, tea, die at the lathe."),
        L('sato', 'You may still die at the lathe. It will only be nearer the kitchen.'),
        L('ruess', "Ha! ...Aye. Yes. Yes, you impossible woman. Give it here, my hands are filthy, I'll... no, you put it on me, I shall only drop it."),
        L('narrator', 'She hangs it round his neck, over the goggles. He holds it up to the lamp and looks at Earth\'s light through it for a long while.'),
        L('ruess', "Best thing anybody ever built me. And I've no idea how it's done. I'm not going to take it apart to find out, either. That's love, that is."),
      ],
      wedding: [
        L('narrator', 'Lanterns over the square, and beneath them the carousel, finished at last and turning. The Professor has combed his hair. Everyone is too kind to mention it.'),
        L('marrow', 'Hal Ruess. I have known you thirty years and I never once saw you nervous. It is a great comfort to me to see it now.'),
        L('general', 'He kept my fleet flying on wire and bad language. Sato kept it calm. I cannot think how Eden will stand the pair of them together.'),
        L('corran', "HE'S GOT A CLEAN SHIRT ON! Somebody write the date down!"),
        L('ruess', "I'll not make a speech. I built her a pump, a porch swing and a kettle that whistles in tune. That's the speech."),
        L('sato', 'It is the best one I have heard. I promise to hand you the right spanner, and to make you stop when the light dims.'),
        L('marrow', 'Then it is written. Hal, you may kiss your wife. Goggles off first, you will have her eye out.'),
        L('narrator', 'The carousel plays its four thin notes. The little carrier goes round beside the cow, and for once the engineer does not check the bearings.'),
      ],
      partnerTalk: [
        "I've fixed the porch step. And the gate. And the thing that wasn't broken, which is now better.",
        "Don't touch the kettle, I'm improving it. ...It's a surprise. It may also be a fire.",
        "You've been at it since six. Sit down. That's not affection, that's maintenance. ...It's affection.",
        "I was up in the night with an idea. A seed drill with brakes. Marrow can't refuse brakes.",
        "Forty years I ate standing at a bench. You've got me using a chair. A plate! I hardly know myself.",
        "Your hoe's sharp, your can's full, and I've oiled the bin lid for Maris. Now ask me how I am. Go on. I'm happy. It's most peculiar.",
        "I found my old drawings of gun mounts. Used the backs for the greenhouse plans. Best use they ever had.",
        "Come and listen to this bearing. Hear that? Nothing. That's what I feel like, these days. Nothing squeaking.",
        "I'm too old to change, I said. Turns out I was only waiting for the right engineer. That's you, before you ask.",
        "Mind you wear a hat out there. I've only just got you, I'll not lose you to a lamp in the ceiling.",
      ],
      morning: [
        "Morning. Tea's made. It's the right colour this time, I measured it.",
        "Up already? Good. I've been in the shed since five. Don't go in the shed. It's a surprise.",
        "Morning, love. ...I said it. Don't make a face. I'm practising.",
        "Sun-line's at ninety-eight per cent and you're a sight better than that. There. That's the compliment for today.",
      ],
      sweetTalk: [
        "I caught myself whistling at the bench. Whistling! Vashti asked if I was ill.",
        "I've made you a thing. It's only a trowel. I went through four handles till it fitted your hand. Don't read anything into it. Read a bit into it.",
        "Say it again. The name. ...Aye. I'll never be used to that.",
        "At my age you don't expect the post to bring anything new. And then a carrier captain walks in with a blunt hoe.",
      ],
      decline: "Put that away, girl. I'm an old fool, but I'll not be an old fool in a hurry. Give me time to believe it first.",
    },
    kestrel: {
      confess: [
        L('narrator', 'Kestrel is waiting at the bridge with a prepared expression. It lasts roughly four seconds once Sato arrives.'),
        L('kestrel', 'Sato. Good. I have an announcement. I have decided that you are in love with me. I thought you would want to be told.'),
        L('sato', 'Have you. That was efficient of you.'),
        L('kestrel', 'It is the only explanation. I come past your farm six times a day and you have never once objected.'),
        L('sato', 'I assumed it was a patrol route.'),
        L('kestrel', 'It is not on any patrol route! It is forty minutes out of my way! I have been logging it as "weather observation" since spring!'),
        L('narrator', 'He hears himself. The famous composure goes out of him all at once, like air from a hatch.'),
        L('kestrel', '...That is not how I meant to do this. I had a line. It was very good. I cannot remember a word of it. Sato, I am... it is me. I am the one who.'),
        L('sato', 'I know, Rell. I have been counting the weather observations. I was waiting to see how long you could keep it up.'),
        L('kestrel', 'You knew? And you let me... That is the cruellest, most patient... Why are you smiling? You never smile. Do it again.'),
        L('sato', 'Walk me home. Forty minutes out of your way. You may log it however you like.'),
        L('narrator', 'They leave the bridge together. He talks the whole way, and for the first time not one word of it is about himself.'),
      ],
      propose: [
        L('narrator', 'Sato finds Kestrel on the terrace, explaining to a hen why it will never make a pilot. She holds the pendant out without preamble.'),
        L('kestrel', 'What is... no. No, no. I was going to do this. I have a ring-side table booked at the Hangar. I have a new jacket!'),
        L('sato', 'You were taking a long time on the approach. I thought I would bring us in.'),
        L('kestrel', 'You cannot simply... I am the ace! I go first! It is the entire point of me!'),
        L('sato', 'Rell. There is a place at my table. I should like you in it. That is the whole briefing.'),
        L('narrator', 'He opens his mouth. Nothing arrives. He sits down on an upturned bucket, which is not a thing aces do.'),
        L('kestrel', 'Everyone has always wanted the pilot. The record, the jacket. You are the first who waited to see what was left when I landed.'),
        L('sato', 'Rather a lot, it turned out. Most of it talks.'),
        L('kestrel', 'Yes. Obviously yes. Put it on me before I say something clever and spoil it.'),
        L('kestrel', '...I am keeping the table at the Hangar. We shall go tonight, and I shall tell everyone that I asked.'),
        L('sato', 'Tell them what you like. The hen and I know.'),
      ],
      wedding: [
        L('narrator', 'Lanterns over the square, and above them the Guardians\' wing going over in a slow, perfect arc, with one place left empty in the formation.'),
        L('kestrel', 'That gap is mine. I told them I would be busy. First time I have ever watched a fly-past from underneath. It is rather good.'),
        L('marrow', 'Commander, you have talked through the whole of my introduction. Do you wish to marry this woman or to narrate it?'),
        L('maris', "He's nervous! Look at him! I've flown with him, he wasn't like this under fire!"),
        L('kestrel', 'I promise to land where your lamp is. To listen at least as often as I speak. ...Half as often. I shall work up to it.'),
        L('sato', 'I promise to let you tell the story your way, and to know the true one. And to ask how you are, and wait.'),
        L('general', 'I flew beside both of them. I never thought to see either one grounded so gladly.'),
        L('marrow', 'It is written. Kiss her, Commander, and for once in your life say nothing first.'),
      ],
      partnerTalk: [
        'I told the wing I was moving to a farm. They laughed for four minutes. Then they asked to visit.',
        'I weeded the whole north row. It was heroic. You were not watching, so I shall describe it.',
        'The hens have accepted me as their commander. One of them. The small one. It is a start.',
        'I fly over at dawn and you wave. I still do not wave back. I waggle the wings. It is the same thing, with dignity.',
        'I hung my jacket on your hook. Next to your coat. I looked at that for longer than I shall admit.',
        'You said nothing all through supper and I knew exactly what you meant. I am becoming fluent in you.',
        'I named the scarecrow after myself. It is very handsome and the crows are not afraid of it either.',
        'Ask me how I am. Go on. ...Happy. Plain happy. I have no joke for it. Is that not extraordinary?',
        'I used to count kills. Now I count eggs. Six today. A personal best.',
        'Come here. No reason. I flew a long patrol and thought about this kitchen the whole way round the ring.',
      ],
      morning: [
        'Good morning. I have dawn patrol in an hour. I made the tea. It is perfect; I do not know why you look surprised.',
        'You are awake. Good. I have been lying here being quiet. It was very difficult. Tell me you noticed.',
        'Morning, Sato. I shall be over the field at six. Look up.',
        'I let you sleep. I am told that is romantic. I was also afraid of you before tea.',
      ],
      sweetTalk: [
        'I did my weather observation this morning. The weather over your farm was a woman with a hoe. Outlook: excellent.',
        'The wing knows. I have not told them. I am apparently "obvious". Me!',
        'I practised a compliment all the way here and you have ruined it by looking like that. Give me a moment.',
        'You smiled at the bridge. I have told nobody. It is mine.',
      ],
      decline: 'Sato. Wait. I talk fast, I fly fast... let me do this one thing slowly. Ask me again when I have earned the landing.',
    },
    mori: {
      confess: [
        L('narrator', 'Five o\'clock. Dr. Mori turns the clinic sign to CLOSED, actually at five, and finds Sato already waiting on the step.'),
        L('mori', 'You are not ill. I looked at you from the window for some time to make sure. I do that rather a lot. I ought to tell you.'),
        L('sato', 'I know. You take my pulse every time I buy a plaster.'),
        L('mori', 'Yes. I have been meaning to confess that it is not medically indicated. It never was. I only wanted a reason to hold your wrist.'),
        L('mori', 'I have spent my life being careful with other people. I do not know how to be anything else. So I shall say it carefully. I am very fond of you, Sato.'),
        L('mori', 'More than fond. I have a precise word for it and I find I cannot get it past my teeth.'),
        L('sato', 'Then leave it there for now. I am not going anywhere. You of all people know my heart rate.'),
        L('mori', 'It has gone up. Just now. Ninety, I should think.'),
        L('sato', 'Then you have your answer, Doctor. Hard evidence. Take my wrist. No reason needed.'),
        L('narrator', 'He does. They walk down to the river like that, slowly, as he does everything, and for once he is not counting.'),
      ],
      propose: [
        L('narrator', 'Sato comes into the empty clinic and sits on the edge of the examination couch. Dr. Mori reaches for his stethoscope out of habit.'),
        L('mori', 'What seems to be the trouble?'),
        L('sato', 'A persistent condition. It came on gradually, about a year ago. It is worse in the evenings when you have gone home.'),
        L('mori', 'I see. That sounds... chronic. I am afraid there may not be a cure.'),
        L('sato', 'I am not asking for one. I have brought the treatment myself.'),
        L('narrator', 'She puts the pendant in his palm and closes his fingers over it. His hands, which have never shaken in an operating theatre, are not quite steady.'),
        L('mori', 'Haruto. Please. If you are going to do this, you must call me Haruto. I cannot be proposed to as "Doctor".'),
        L('sato', 'Haruto. There is a place at my table. I should like you to come home to it, and stop when the light dims, every day.'),
        L('mori', 'Yes. Oh, yes. I have looked after everyone on this ring. I never thought anybody would want to look after me.'),
        L('sato', 'It is not difficult. Tea, soup, and somebody telling you to sit down. I have had a good teacher.'),
        L('mori', 'Then I prescribe it for life. Take as needed. I shall need it often.'),
      ],
      wedding: [
        L('narrator', 'Under the lanterns in the square, the doctor has left off his white coat. Half of Willowfall has never seen him without it and keeps not recognising him.'),
        L('marrow', 'Haruto Mori. You have sat up with every soul in this village. Tonight we sit up for you. Stand straight, you are not on a ward.'),
        L('oduya', "I've cooked for two hundred. He told me nothing fried. I've fried half of it. It's a wedding, Doc."),
        L('yui', 'He borrowed every book on farming last month. He returned them all with notes. I have kept the notes.'),
        L('mori', 'I promise to listen to your heart for no reason at all, and to come home when the sign says closed.'),
        L('sato', 'I promise to ask how you are and wait for the answer. And to make you take your own advice.'),
        L('marrow', 'It is written. You may kiss her, Doctor. Take your time. You always do, and we have all learned to like it.'),
      ],
      partnerTalk: [
        'I closed at five again. It is becoming a habit. The village has stopped being alarmed and started setting their clocks by it.',
        'I have put a first-aid box by the tool shed. And one in the barn. And one in the kitchen. I worry in triplicate.',
        'Sit. Hands. ...Blisters, two. Splinter, one. A kiss on the knuckles is not in any textbook, but I find it works.',
        'I planted the herb bed by the porch. If I may not treat you, I can at least make your tea.',
        'I slept through the night. No bell. No ward. Only you, breathing at sixteen a minute. I checked. Forgive me.',
        'Have you eaten? ...I know, I ask every day. I intend to go on asking for about fifty years.',
        'I was called out at three. I came home to a lamp in the window and soup on the stove. I stood in the lane a while, just looking.',
        'You hum when you think nobody hears. It has done my blood pressure more good than anything in the cabinet.',
        'I used to be afraid of quiet; quiet meant someone had stopped. Yours is the other kind. I am learning the difference.',
        'Come in out of the wet, please. I love you, and I am also your doctor. Both of us insist.',
      ],
      morning: [
        'Good morning. You slept seven hours. I did not count them. I counted them a little.',
        'Tea, and something to eat before you so much as look at the hoe. No, sit. I have the morning surgery at nine; I have time.',
        'Good morning, Mira. Let me look at you. No reason. Purely unprofessional.',
        'The light is coming up along the ring. I used to see dawn only from a ward window. This is a great improvement.',
      ],
      sweetTalk: [
        'I took my own pulse after you left yesterday. I shall not tell you the figure. It was unprofessional.',
        'Mrs Abara asked why I was smiling at a chart. I told her it was a very good chart.',
        'I walk past your gate on my rounds. It is not on my rounds. I have redrawn my rounds.',
        'Give me your wrist. ...There. Still no medical reason. I only missed it.',
      ],
      decline: 'Oh, Sato. Not yet. I should like to be certain I can look after you properly first. Give me a little longer; I am slow, but I arrive.',
    },
    oduya: {
      confess: [
        L('narrator', 'The Hangar is shut. One table by the window is laid for two, with a candle in an old fuel-valve cap. Oduya is standing beside it looking at the floor.'),
        L('oduya', "Sit. Don't talk. I've been cooking this since four and if I stop to explain it I'll lose my nerve."),
        L('narrator', 'He brings seven small dishes, one at a time. Her turnips. Her tomatoes. Her first potato, the ugly one, which he seems to have kept back for a year.'),
        L('sato', 'Tem. This is everything I have ever put in the bin.'),
        L('oduya', "In order. Spring to now. I kept one of each. I'm no good with words, Sato. This is the only way I know to say I've been paying attention."),
        L('oduya', "I've fed thousands. Dock crews, riggers, a whole deck. I never once cooked for one person. Didn't know I wanted to, till you kept forgetting to eat."),
        L('sato', 'You always laid two places at this table. You said you did not ask who the second was for.'),
        L('oduya', "Aye. I didn't ask because I was hoping. I've been hoping at that chair since last winter."),
        L('sato', 'Then sit in it. I am not eating seven courses alone, and I should like to look at you while I do.'),
        L('narrator', 'He sits. He forgets to take the headlamp off. They eat everything, and afterwards they walk the long way round the ring road, his hand very carefully in hers.'),
      ],
      propose: [
        L('narrator', 'Sato comes into the Hangar kitchen by the back door, which nobody does, and puts the pendant down on the chopping board between the onions.'),
        L('oduya', "Mind the... what's this? That's hull-glass. I used to cut that out of breached plates. Never saw a piece come out pretty."),
        L('sato', 'It holds Earth\'s light. On Eden you give it to the person you want at your table. You have fed me at yours for a year. I should like to return it.'),
        L('oduya', "...I've got a ladle in my hand. I can't be asked this with a ladle in my hand."),
        L('sato', 'Put the ladle down, Tem.'),
        L('narrator', 'He puts it down. He wipes his hands on his apron, three times, and they are still not steady when he picks the pendant up.'),
        L('oduya', "I set twelve places for eleven years for people who weren't coming back. You're telling me there's one set for me. At a table I didn't lay."),
        L('sato', 'Every night. I cannot cook as you do. But I can grow all of it, and I can be there.'),
        L('oduya', "That's all it ever was, the cooking. Somebody being there. Yes. Stars, yes. Come here."),
        L('oduya', "And you're staying for supper. Don't argue. I'm making the ugly potato again. It's our potato."),
      ],
      wedding: [
        L('narrator', 'Under the lanterns stands the longest table Willowfall has ever seen. The groom has been told four times that he is not to cook at his own wedding.'),
        L('marrow', 'Tem Oduya, come out of that kitchen. Corran, fetch him. Use the voice.'),
        L('corran', "ODUYA! FRONT AND CENTRE! ...He's coming. He's brought a tray. He can't help himself."),
        L('seln', "Every dish on this table grew in Mira's field. I checked. I cried into the carrots a bit, sorry."),
        L('oduya', "I promise there'll be something hot when you come in from the field. Every day. Till I can't lift the pan."),
        L('sato', 'I promise to come in when it is ready, to eat it while it is hot, and to sit with you until the end of the meal.'),
        L('marrow', 'It is written. Kiss her, Tem. And take off the headlamp, for pity\'s sake.'),
        L('narrator', 'Twelve places at the head of the table, and for the first time every one of them is filled. He counts them twice. Then he stops counting.'),
      ],
      partnerTalk: [
        "Supper's in the oven. Don't lift the lid. I mean it. It's a surprise and it's also not done.",
        "I've reorganised your larder. It was a crime scene. You'll thank me by winter.",
        "You came in at sundown. On time. I nearly dropped the pan. Sit, it's hot.",
        "I laid two places this morning without thinking. Then I thought about it. Then I had to sit down for a minute.",
        "Taste this. No, off the spoon, I'm holding it. ...More salt? You always say more salt. I already put more in. For you.",
        "The riggers say the canteen food's got better since I moved up here. I told them it's the commute.",
        "First time I've cooked in a kitchen with a window. I keep burning the onions watching you in the field.",
        "I packed you a lunch. It's in the tin by the door. Eat it at noon, not at four when you remember.",
        "I used to cook so people could leave. I cook now so you'll stay. That's all the recipe there is.",
        "Go and wash, you're all field. Then come here. Then supper. In that order.",
      ],
      morning: [
        "Morning. Eggs are on. Yours. From out there. I talked to the hen first, it seemed polite.",
        "Sit down. You don't go out to that field on an empty stomach, not out of my kitchen.",
        "Morning, love. I've to open the Hangar at ten. That's four hours of breakfast. I'm going to use them.",
        "Bread's just out. Mind, it's hot. ...You never mind. Give me your hand.",
      ],
      sweetTalk: [
        "I made too much again. For two this time, not twelve. It's a better mistake.",
        "Sit at the window table. It's yours. It's ours. I'm getting used to saying that.",
        "I named a soup after you. It's plain, it's steady and it keeps you going all day. That's a compliment. It is.",
        "You ate everything. You've no idea what that does to a cook. I'll be useless till closing.",
      ],
      decline: "Not yet, love. A thing like that wants a slow oven. Give it its time and ask me again; I'm not going anywhere.",
    },
    yui: {
      confess: [
        L('narrator', 'Closing time at the library. The lamps are low. Yui is at the counter with a single book in front of her, and both hands flat on its cover.'),
        L('yui', 'I have a book for you. I have had it under the counter for eleven weeks. I kept deciding that today was not the day.'),
        L('sato', 'What is it about?'),
        L('yui', 'It is poems. Old-world ones. I have put a slip of paper in at one of them. I should like you to read that page. Not aloud. I shall be over there, reshelving something.'),
        L('narrator', 'She goes and stands behind a bookcase. The poem is eight lines long. It is about two people who sit together and say nothing, and how that was the whole of it.'),
        L('sato', 'Yui.'),
        L('yui', '...Yes. I am still behind the bookcase.'),
        L('sato', 'I have read it. I have read it twice. Come out. I should like to say nothing to you in person.'),
        L('narrator', 'She comes out. Her glasses have steamed up. They stand at the counter for a long minute, in one of their silences, and it is the best one yet.'),
        L('yui', 'I do not know what happens on the next page. I have never got this far in a story of my own.'),
        L('sato', 'Nor have I. We lock up, I think, and walk as far as the bridge. I shall carry the book.'),
        L('narrator', 'They do. Neither of them says a word the whole way. The village, watching from its windows, understands perfectly.'),
      ],
      propose: [
        L('narrator', 'Sato returns a library book at the counter. Yui opens it to stamp it, and finds, where the date slip should be, a pendant on a cord.'),
        L('yui', 'This is not a permitted bookmark.'),
        L('sato', 'No. It is hull-glass, with Earth\'s light in it. On Eden you give it to the person you want at your table.'),
        L('narrator', 'Yui does not move. She reads the pendant the way she reads everything: slowly, completely, and twice.'),
        L('yui', 'I have catalogued four thousand books and I know exactly where each one belongs. I have never known where I do.'),
        L('sato', 'I have a suggestion. There is a window in my kitchen, and a chair. I should put a sign on it, but everybody would know for whom.'),
        L('yui', '...You remembered the sign.'),
        L('sato', 'I remember everything you say. There is not so much of it that I can afford to lose any.'),
        L('yui', 'Yes. The answer is yes. I am going to say it once more, because I like the word. Yes.'),
        L('yui', 'May I bring books? It would be rather a lot of books.'),
        L('sato', 'I shall ask Ruess for shelves. Bring all of them. Bring the trolley.'),
      ],
      wedding: [
        L('narrator', 'Lanterns over the square, and under each lantern, by the bride\'s request, a book left open for anyone to read. Willowfall has never been so quiet in a crowd.'),
        L('marrow', 'Yui Hoshino. You saved every story on this ring. I am very glad to be here for your own.'),
        L('mori', 'She asked me whether it was medically possible to be this nervous. I said yes, and that I had a book on it, from her.'),
        L('corran', "I'm whispering! Look! THIS IS ME WHISPERING! ...Lovely service."),
        L('yui', 'I promise you a quiet house and a full shelf. And to say what I mean, even when it takes me eleven weeks.'),
        L('sato', 'I promise to wait the eleven weeks. And to sit by you, saying nothing, for as long as there is light to read by.'),
        L('marrow', 'It is written, which seems only proper. Go on, my dears.'),
        L('narrator', 'They do not make a speech. They stand hand in hand under the lanterns, and the whole village, for once, lets a silence be.'),
      ],
      partnerTalk: [
        'I have shelved your seed catalogues by season. You are welcome. Please do not move them.',
        'I read on the porch while you watered. I looked up every third page. That is a great deal, for me.',
        'The trolley is in the barn. The hens are sitting on it. I have decided that it is retired, and happy.',
        'I wrote something this morning. It is about a field. It is not finished. You may read it when it is.',
        'You came in and did not say a word and I knew the whole of your day. I do love that.',
        'I have left a book on your pillow. It is short. There is a slip in it at the page I mean.',
        'The lamp, the kettle, you opposite. I have read about this in a hundred novels. They undersold it.',
        'I talked to Seln for ten minutes today. Voluntarily. You are a bad influence. Thank you.',
        'I walk to the library along the terrace now. It is longer. I see the whole of your field from there. Ours. I am still practising.',
        'Sit with me? I have nothing to say. I only want to not say it next to you.',
      ],
      morning: [
        'Good morning. ...That is all. I am not good before the first page. But I wanted to say it to you.',
        'I made tea. I read while it brewed, so it is rather strong. I am sorry. I am not very sorry.',
        'You are up with the light. I watched it come along the ring through the window and thought of a line for it. I shall tell you tonight.',
        'Good morning, Mira. I have put a book in your coat pocket. For when it rains.',
      ],
      sweetTalk: [
        'I have moved your chair nearer the counter. For the light. ...Not only for the light.',
        'I lost my place in a book today. Four times. I have never lost my place. I blame you entirely.',
        'There is a new slip of paper in the poetry. Different page. You need not read it now. Soon, though.',
        'I told the cat about you. At length. The cat has heard enough.',
      ],
      decline: 'Oh. Sato... not yet, please. I read slowly, and I should like to reach that page properly. Ask me again when I get there.',
    },
  },
};

// ------------------------------------------------------------------ requests (favours villagers ask now and then)

const Q = (id, item, n, ask, thanks, more = {}) => ({ id, item, n, ask, thanks, ...more });

export const QUESTS = {
  general: [
    Q('general_strawberry', 'strawberry', 3, 'Might I ask for three strawberries from your field, Sato? The Council has been arguing for a week, and I should like to bribe them.', 'Three, and perfect. The water vote will pass by teatime. Thank you.', { season: 0 }),
    Q('general_tomato', 'tomato', 2, 'Could you spare two tomatoes? My office window box has produced one leaf, and I should like to see what success looks like.', 'So that is a tomato. Mine has a long way to go. Thank you, Sato.', { season: 1 }),
    Q('general_potato', 'sweetpotato', 3, 'Three sweet potatoes, if the field can spare them. The night watch at the lift has been cold, and I mean to roast them myself.', 'The watch will be astonished. So shall I be, if I do not burn them. Thank you.', { season: 2 }),
    Q('general_bread', 'bread', 1, 'I have a favour to ask. One loaf of bread. I have eaten nothing all week that did not arrive under a silver lid.', 'Plain bread. You have no idea what a luxury that is. Thank you.'),
    Q('general_fish', 'fish_s', 2, 'Would you catch me two silverfin? I told Corran I had landed two last week. I had not. I should like the story to become true.', 'Two silverfin. My honour is restored, at your expense. I shall not forget it.', { minHearts: 5 }),
    Q('general_soup', 'soup', 1, 'A quiet request. One bowl of soup, to eat on your porch, with nobody saluting. I find I think of little else by Thursday.', 'Thank you, Mira. The soup is very good. The porch is better.', { minHearts: 6 }),
  ],
  ruess: [
    Q('ruess_scrap', 'scrap', 5, "I need five pieces of scrap for the carousel frame. Old-world scrap, mind. The new stuff bends if you look at it.", "That's the stuff. Feel the weight of it. Good girl."),
    Q('ruess_alloy', 'alloy', 2, "Two bits of alloy, Sato, if you're going down the lift. I've a bearing to cast and nothing fit to cast it from.", "Proper alloy. I could weep. I won't. Thank you."),
    Q('ruess_corn', 'corn', 3, "Three ears of corn. Don't ask why. ...I'm building a popper. For the children. Tell nobody.", "Ha! Listen to it go. Best machine I've made all year.", { season: 1 }),
    Q('ruess_potato', 'potato', 4, 'Four potatoes. I mean to run a lamp off them, to show the school how a cell works. And then eat them.', 'Four volts and a supper. Efficient. Thank you.', { season: 0 }),
    Q('ruess_tea', 'tea', 2, "Bring me two teas, would you? I've been at this bench since dawn and I'd sooner you fetched it than anybody else.", "Hm. Sit down while I drink it. No reason. I like the company.", { minHearts: 5 }),
    Q('ruess_watch', 'watch', 1, "If you turn up a pocket watch down below, bring it me. One will do. I had my father's once. I'd like to hear one tick again.", "...Listen to that. Same sound. Thank you, Sato. More than I can say.", { minHearts: 6 }),
  ],
  marrow: [
    Q('marrow_turnip', 'turnip', 4, 'Four turnips for the hall kitchen, dear. The school has a soup day and I have been volunteered.', 'Splendid. The children will complain bitterly and eat every drop.', { season: 0 }),
    Q('marrow_herb', 'herb', 3, 'Three herbs from the hill, if you would. My knees no longer make that climb, and my tea is the poorer for it.', 'Thank you, child. You have saved an old woman a hill.', { season: 1 }),
    Q('marrow_spinach', 'spinach', 3, 'I need three bunches of spinach for the harvest supper. Good ones. I have a reputation.', 'These will do nicely. More than nicely.', { season: 2 }),
    Q('marrow_tea', 'tea', 2, 'Two teas for the hall, please. I have a committee at three, and they are gentler with a cup in their hands.', 'Peace in our time. Thank you, dear.'),
    Q('marrow_photo', 'photo', 1, 'If you find one old photograph below, bring it to me. The children ask what people looked like, and I should like to show them.', 'Look at their faces. Ordinary, and happy. That is the whole lesson. Thank you.'),
  ],
  seln: [
    Q('seln_cucumber', 'cucumber', 3, "Could I have three cucumbers, Mira? I want to save seed from field-grown ones, and yours are the best on the ring.", "Oh, lovely and firm. There'll be a drawer with your name on it.", { season: 0 }),
    Q('seln_pumpkin', 'pumpkin', 1, "One pumpkin, love, if you've grown any. For the shop window. People ought to see what's possible.", "Look at the size of it! I'm putting a little sign on it. With your name.", { season: 1 }),
    Q('seln_carrot', 'carrot', 4, 'Four carrots, please. Old Mrs Abara cannot get to her plot this autumn and I said I would see her right.', "She'll be so pleased. I'll tell her who grew them.", { season: 2 }),
    Q('seln_milk', 'milk_s', 2, 'Two small milks, if your cows are giving. I am out, and the bread will not rise on kind thoughts.', 'Thank you! There will be a warm loaf in it for you.'),
    Q('seln_seedtin', 'seedtin', 1, "If you ever find a seed tin down in the Old World, just one, bring it to me? I only want to know what they grew.", "Oh, Mira. There's still seed in it. I shall hardly dare breathe.", ),
  ],
  corran: [
    Q('corran_potato', 'potato', 5, 'FIVE POTATOES! Sorry. Five potatoes, lass. I am making mash for the wing and they eat like a gun crew.', "Grand! That's a proper spud. You'll make a farmer yet.", { season: 0 }),
    Q('corran_corn', 'corn', 4, "Four ears of corn! The hens get a treat at midsummer. Don't tell them, it's a surprise.", 'Look at their little faces! Well. Beaks. Thank you, lass!', { season: 1 }),
    Q('corran_mushroom', 'mushroom', 3, 'Three mushrooms off the hill. I am doing a pie, and Oduya says I cannot. I will show him.', 'Ha! He will eat his words. And the pie. Ta, lass.', { season: 2 }),
    Q('corran_fish', 'fish_m', 2, "Two river trout. I told the lads at the canteen I'd caught two. I'd caught a cold. Help an old gunner out.", "You're a marvel. I owe you one. I shall tell it as if I helped."),
    Q('corran_egg', 'egg', 6, "Half a dozen eggs, if your hens can do it. Mine have gone on strike. I think it's Pell.", 'Six! Beautiful. I shall show them to Pell. Shame her.'),
  ],
  oduya: [
    Q('oduya_onion', 'onion', 5, "Five onions for the canteen. I'm down to the last string and there's a rigger crew in on Friday.", 'Good and sharp. You have saved the stew. Sit, eat.', { season: 1 }),
    Q('oduya_strawberry', 'strawberry', 4, 'Four strawberries. First of the season. I have a pudding in my head and it will not leave.', 'Look at the colour. Come back at six, you are tasting it.', { season: 0 }),
    Q('oduya_eggplant', 'eggplant', 3, 'Three eggplants. I do them over the flame till they give up. The dock crews used to fight over it.', 'Perfect. Hear that skin crackle? That is the sound of a good autumn.', { season: 2 }),
    Q('oduya_egg', 'egg', 6, 'Six eggs for the breakfast rush. The upper-deck vats sent me powder. Powder!', 'Real ones. Thank you. I can look my customers in the eye.'),
    Q('oduya_fish', 'fish_l', 1, "One chamber carp, a big one. I'm cooking for one person tonight and I want it right. Don't ask who.", "That's a beauty. ...It's for you, all right? Come at eight. Bring nothing.", { minHearts: 5 }),
    Q('oduya_milk', 'milk_m', 2, "Two medium milks. There's a thing my mother made, a sort of custard. Never cooked it for anyone. I want to try.", "It came out. First time in thirty years. You get the first spoon. Nobody else gets any.", { minHearts: 6 }),
  ],
  maris: [
    Q('maris_berry', 'berry', 4, "Could you pick me four berries off the hill? I'd go, but if I stop on the hill run I eat them all and get behind.", "Yes! Oh, they're so good. I'm already behind. Worth it.", { season: 1 }),
    Q('maris_strawberry', 'strawberry', 3, "Three strawberries? It's for a parcel. To my mum. She thinks nothing grows up here. I want to post her proof.", "She's going to cry. I'm going to cry. Thank you!", { season: 0 }),
    Q('maris_sweetpotato', 'sweetpotato', 3, 'Three sweet potatoes, please! I roast them on the engine cowling on cold runs. It works, honestly.', 'Perfect size for a cowling. You are the best stop on my round.', { season: 2 }),
    Q('maris_bread', 'bread', 2, "Two loaves of bread? I've a long run to the far side of the ring tomorrow and Seln's is shut when I leave.", 'Lifesaver. I shall eat one before I am even off the ground.'),
    Q('maris_pie', 'pie', 1, 'Okay, big ask. One pie. It is my flying anniversary and I always have pie, and I have no time to queue.', "You remembered! I mean, I told you. But you DID it!"),
  ],
  vashti: [
    Q('vashti_scrap', 'scrap', 4, 'Four scrap. The lift brake is worn. I could go down for it. Somebody has to stay up and mind the cable.', 'Good. That will hold. ...Thanks.'),
    Q('vashti_crystal', 'crystal', 1, 'One crystal, if you find one below. The lift lamp wants a new lens. Then you can see the bottom. Useful.', 'Clean one. Good eye. The shaft will be lit by tonight.'),
    Q('vashti_mushroom', 'mushroom', 2, 'Two mushrooms. ...I said I do not eat them. Oduya made a soup. I was wrong. Do not repeat that.', 'Hm. Fine. I was wrong twice. Thank you.', { season: 2 }),
    Q('vashti_frostcap', 'frostcap', 3, 'Three frostcaps from by the lake. They keep the cable grease from freezing. Old salvage trick.', 'That will do it. You did not ask why. I like that.', { season: 3 }),
    Q('vashti_soup', 'soup', 1, 'One soup. Hot. The wind comes up the shaft all day. I will not ask twice.', '...Still hot. You ran. You did not need to run. Thanks.'),
  ],
  moraine: [
    Q('moraine_strawberry', 'strawberry', 5, 'Five strawberries, darling. My crew has scurvy of the spirit, and I am told fruit is the cure.', 'Exquisite. They shall have two each. I shall have the rest, as is proper.', { season: 0 }),
    Q('moraine_pumpkin', 'pumpkin', 1, 'One pumpkin. A large one. I wish to see whether anything on this ring is as grand as I am.', 'Hm. Close. It may sit beside me on the foredeck.', { season: 1 }),
    Q('moraine_crystal', 'crystal', 2, 'Two crystals from below, Captain. For the barge lamps. A queen does not trade by tallow.', 'Now the whole dock will see me coming. Perfect.'),
    Q('moraine_tea', 'tea', 3, 'Three teas, if you would be so kind. My steward makes it like bilge water and I am too fond of him to say so.', 'Civilisation, at last. You have my gratitude, which was once worth a fleet.'),
    Q('moraine_fish', 'fish_l', 2, 'Two chamber carp. I am giving a dinner for the dock hands. Do not look so surprised; I am trying things.', 'Splendid beasts. They will dine like pirates. Like honest pirates.'),
  ],
  kestrel: [
    Q('kestrel_pie', 'pie', 1, 'A delicate matter. One pie. I cannot be seen queuing at the Hangar a third time this week. I have a reputation.', 'You are a discreet woman, Sato. The wing must never know.'),
    Q('kestrel_egg', 'egg', 4, 'Four eggs. I have told the wing I can cook. It was a tactical error. I now need to practise in secret.', 'Thank you. If you smell smoke from the barracks, you saw nothing.'),
    Q('kestrel_corn', 'corn', 3, 'Three ears of corn. The children want a picnic at the overlook and I may have promised to bring everything.', 'Perfect. I shall tell them I grew it. No. I shall tell them you did.', { season: 1 }),
    Q('kestrel_turnip', 'turnip', 3, "Three turnips. Don't laugh. My mother made a turnip stew, and I shall not ask Oduya for the recipe of a turnip stew.", 'Good ones. I may even admit where I got them.', { season: 0 }),
    Q('kestrel_toy', 'toy', 1, 'If you find a tin robot below, one will do, I would like it. I had one as a boy. I told everyone I had outgrown it. I lied.', '...It is the same model. Look, the key and everything. Sato. Thank you.', { minHearts: 5 }),
    Q('kestrel_tea', 'tea', 2, 'Bring two teas up to the overlook this evening? One is for you. I find I should like to watch Earth rise and not talk. With you.', 'You came. I was not certain. I shall be quiet now. Starting... now.', { minHearts: 6 }),
  ],
  mori: [
    Q('mori_herb', 'herb', 4, 'Might I trouble you for four herbs from the hill? The clinic is out of the makings of a chest rub, and half the school has a cough.', 'Thank you. That is twenty children breathing easier by Friday.', { season: 0 }),
    Q('mori_milk', 'milk_m', 3, 'Three medium milks, if you can. I have two patients who need building up, and it does more good than my pills.', 'Fresh, too. I shall tell them the farmer prescribes it.'),
    Q('mori_spinach', 'spinach', 3, 'Three bunches of spinach, please. Corran needs iron and will only eat it if he does not know it is medicine.', 'Excellent. I shall have Oduya hide it in a pie.', { season: 2 }),
    Q('mori_frostcap', 'frostcap', 2, 'Two frostcaps, if you pass the lake. They make a decent tincture for winter joints. Marrow would never ask for herself.', 'Thank you. She will pretend not to need it, and take it twice a day.', { season: 3 }),
    Q('mori_tea', 'tea', 2, 'A selfish request, for once. Two teas. I should like to sit down for ten minutes, and I find I sit longer if you bring it.', 'There. I sat. Twelve minutes. A record, and your doing.', { minHearts: 5 }),
    Q('mori_teacup', 'teacup', 1, 'If you ever find a porcelain cup below, one would do. My grandmother had such a cup. I have drunk from tin since the carrier.', 'Oh. It is so thin you can see the light through it. I shall keep it for the evenings. Thank you, Mira.', { minHearts: 6 }),
  ],
  yui: [
    Q('yui_book', 'book', 1, 'If you find an old-world book below, would you bring me one? Any one. I do not mind what it is about. That is the point.', 'It is a manual for a washing machine. It is wonderful. Thank you.'),
    Q('yui_strawberry', 'strawberry', 3, 'Three strawberries, please. It is story hour on Thursday and the book has a strawberry in it. I like to be thorough.', 'The children will remember this one. So shall I.', { season: 0 }),
    Q('yui_mushroom', 'mushroom', 2, 'Two mushrooms, if you are on the hill. There is a field guide I want to check. I suspect it of an error on page forty.', 'I was right. Page forty is wrong. Thank you. This has made my week.', { season: 2 }),
    Q('yui_datachip', 'datachip', 1, 'One data chip, if you find one below. Ruess says he can read them. There may be whole libraries on a thing that size.', 'Nine hundred novels. Nine hundred. I need to sit down.'),
    Q('yui_fish', 'fish_m', 1, 'One river trout? I should like a quiet fish supper. For two, if... if you are not busy. You need not talk.', 'Thank you. Come at seven. I have laid the table already. Twice.', { minHearts: 5 }),
    Q('yui_musicbox', 'musicbox', 1, 'There is a thing I would like, if you ever find one. A music box. The library is very silent after six, and I have begun to mind.', 'It plays. Listen. ...Stay till it winds down? It is a short tune. I should like it to be longer.', { minHearts: 6 }),
  ],
};
