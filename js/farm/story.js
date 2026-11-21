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
    likes: ['tea', 'fish_dawnscale', 'tomato', 'egg', 'milk_m', 'fish_s', 'fish_m', 'book'],
    dislikes: ['medal', 'scrap', 'tonic'],
  },
  ruess: {
    id: 'ruess', name: 'Prof. Hal Ruess', short: 'Ruess', title: 'Chief engineer; the Workshop', portrait: P + 'ruess.webp',
    look: { skin: '#e0b896', hair: '#9a9da3', top: '#6b5a48', bottom: '#3a3632', style: 'short' },
    birthday: { season: 2, day: 21 },
    loves: ['scrap', 'alloy', 'crystal', 'datachip', 'data_core'],
    likes: ['watch', 'tea', 'bread', 'potato', 'egg', 'musicbox', 'toy', 'film_camera'],
    dislikes: ['moonflower', 'berry', 'spinach'],
    shop: 'workshop',
  },
  marrow: {
    id: 'marrow', name: 'Warden Ilse Marrow', short: 'Marrow', title: 'Warden of Willowfall', portrait: P + 'marrow.webp',
    look: { skin: '#e6c9b0', hair: '#d5d8dc', top: '#5a4a6e', bottom: '#33303c', style: 'bun' },
    birthday: { season: 3, day: 3 },
    loves: ['photo', 'book', 'strawberry', 'tea', 'fish_ferryman'],
    likes: ['teacup', 'musicbox', 'old_coin', 'turnip', 'spinach', 'soup', 'herb', 'moonflower'],
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
    likes: ['egg', 'milk_m', 'potato', 'eggplant', 'herb', 'fish_spokerun', 'fish_m', 'fish_summer'],
    dislikes: ['scrap', 'tonic', 'datachip'],
    shop: 'cafe',
  },
  maris: {
    id: 'maris', name: 'Juno Maris', short: 'Maris', title: 'Courier pilot', portrait: P + 'w_maris.webp',
    look: { skin: '#c99672', hair: '#5a3622', top: '#3a78b8', bottom: '#d9d2c0', style: 'short' },
    birthday: { season: 0, day: 25 },
    loves: ['berry', 'pie', 'strawberry', 'musicbox', 'record'],
    likes: ['bread', 'corn', 'milk_s', 'sweetpotato', 'cucumber', 'tea', 'ring', 'fish_spring'],
    dislikes: ['scrap', 'onion', 'frostcap'],
  },
  vashti: {
    id: 'vashti', name: 'Nell Vashti', short: 'Vashti', title: 'Salvage pilot; keeper of the hangar and the orbital elevator', portrait: P + 'w_vashti.webp',
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
    loves: ['ring', 'crystal', 'moonflower', 'fish_king', 'platinum'],
    likes: ['old_coin', 'tea', 'teacup', 'strawberry', 'pumpkin', 'musicbox', 'tonic', 'fish_l'],
    dislikes: ['scrap', 'turnip', 'fish_s'],
    shop: 'barge',
  },
};

Object.assign(NPCS, {
  kestrel: {
    id: 'kestrel', name: 'Commander Rell Kestrel', short: 'Kestrel', title: "Commander of the Guardians' wing, Upper deck", portrait: P + 'w_kestrel.webp',
    look: { skin: '#e2bd9a', hair: '#d8b860', top: '#7a4f2a', bottom: '#39404a', style: 'short' },
    birthday: { season: 1, day: 28 },
    loves: ['pie', 'corn', 'fish_summer', 'datachip', 'fish_sailfin'],
    likes: ['bread', 'tea', 'egg', 'tomato', 'strawberry', 'toy', 'medal', 'fish_m'],
    dislikes: ['scrap', 'spinach', 'frostcap'],
  },
  mori: {
    id: 'mori', name: 'Dr. Haruto Mori', short: 'Dr. Mori', title: 'Doctor of the Willowfall clinic', portrait: 'art/farm/people/mori_front.webp',
    look: { skin: '#e3c3a2', hair: '#22201e', top: '#f2f2ee', bottom: '#4a5560', style: 'short' },
    birthday: { season: 2, day: 3 },
    loves: ['tea', 'herb', 'soup', 'teacup', 'fish_earthlight_trout'],
    likes: ['mushroom', 'spinach', 'carrot', 'egg', 'milk_s', 'berry', 'book', 'fish_winter'],
    dislikes: ['tonic', 'scrap', 'alloy'],
    shop: 'clinic',
  },
  yui: {
    id: 'yui', name: 'Yui Hoshino', short: 'Yui', title: 'Librarian of the Lantern Ring library', portrait: 'art/farm/people/yui_front.webp',
    look: { skin: '#ecd0b4', hair: '#231a18', top: '#b06a7a', bottom: '#5b5347', style: 'long' },
    birthday: { season: 3, day: 17 },
    loves: ['book', 'moonflower', 'strawberry', 'musicbox', 'record'],
    likes: ['tea', 'photo', 'teacup', 'berry', 'sweetpotato', 'mushroom', 'datachip', 'fish_spring'],
    dislikes: ['scrap', 'onion', 'fish_l'],
  },
  // 2026-11-19: Eden Central's pastor and its constable (friends, not romance candidates).
  calloway: {
    id: 'calloway', name: 'Pastor Ines Calloway', short: 'Pastor Ines', title: 'Pastor of Second Dawn Church, Eden Central', portrait: 'art/farm/people/calloway_front.webp',
    look: { skin: '#f3cfb4', hair: '#b4b7c0', top: '#363a48', bottom: '#2b2e38', style: 'bun' },
    birthday: { season: 0, day: 14 },
    loves: ['tomato', 'teacup', 'herb', 'soup', 'fish_halo_eel'],
    likes: ['bread', 'tea', 'egg', 'strawberry', 'carrot', 'book', 'musicbox', 'milk_m'],
    dislikes: ['tonic', 'scrap', 'medal'],
  },
  fenn: {
    id: 'fenn', name: 'Constable Aldo Fenn', short: 'Constable Fenn', title: 'Constable of the Eden Central safety depot', portrait: 'art/farm/people/fenn_front.webp',
    look: { skin: '#c99a74', hair: '#2a2830', top: '#24406e', bottom: '#1e2636', style: 'cap' },
    birthday: { season: 2, day: 26 },
    loves: ['pie', 'toy', 'sweetpotato', 'fish_winter', 'teddy_bear'],
    likes: ['tea', 'bread', 'soup', 'corn', 'fish_lantern_cat', 'watch', 'egg', 'fish_s'],
    dislikes: ['tonic', 'onion', 'berry'],
  },
});

export const VILLAGERS = ['general', 'ruess', 'marrow', 'seln', 'corran', 'oduya', 'maris', 'vashti', 'moraine', 'kestrel', 'mori', 'yui', 'calloway', 'fenn'];

export const SPOTS = [
  'farm.porch', 'farm.bin', 'farm.gate', 'farm.pond', 'farm.field',
  'village.square', 'village.memorial', 'village.bridge', 'village.riverside', 'village.bench', 'village.storefront',
  'village.cafefront', 'village.hallfront', 'village.workshopfront', 'village.ranchyard', 'village.river',
  'hill.wreck', 'hill.lake', 'hill.overlook', 'hill.onsen', 'central.office', 'central.arrivals', 'central.exchange', 'central.plaza', 'central.dock', 'hangar.floor',
  'store.counter', 'store.floor', 'ranch.counter', 'workshop.counter', 'workshop.bench',
  'cafe.counter', 'cafe.table1', 'cafe.table2', 'cafe.table3', 'hall.desk', 'hall.floor',
  'clinic.counter', 'clinic.floor', 'library.counter', 'library.floor', 'village.clinicfront', 'village.libraryfront',
  'church.altar', 'church.pew', 'central.churchgarden', 'central.schoolyard', 'school.floor', 'depot.desk', 'depot.floor', 'central.depotfront',
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
      { who: 'fenn', text: 'For the record, Professor, it also lacked a licence.' },
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
      { who: 'calloway', text: 'I have brought the names up from the church candles, all three hundred and twelve. The Constable carried the basket and would not let me help.' },
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
      { who: 'fenn', text: 'Order at the pie table, please. Commander, that is your twelfth. I am obliged to log it.' },
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
      { who: 'calloway', text: 'I have three words for midnight. They are "well done, everyone". Then I am helping with the bowls.' },
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
    if (wd === 3) return pick(m, [H(9), H(11), 'village.memorial'], [H(11), H(13), 'workshop.bench'], [H(13), H(16), 'village.riverside'], [H(16), H(20), 'cafe.table2']);
    const pint = wd === 0 || wd === 2 || wd === 4 || wd === 5;
    return pick(m, [H(7), H(9), 'village.ranchyard'], [H(9), H(17), 'ranch.counter'], [H(17), H(18), 'village.ranchyard'],
      [H(18), H(21), pint ? 'cafe.table2' : (wd === 6 ? 'hill.onsen' : null)]);   // Sunday evenings: a soak at the Terrace Onsen; Tuesdays at home with the radio   // Sunday evenings: a soak at the Terrace Onsen
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
    return pick(m, [H(8), H(9, 30), market ? 'village.riverside' : 'village.river'], [H(9, 30), H(10), 'village.cafefront'], [H(10), H(22), 'cafe.counter']);
  },
  // The Hall: desk hours Monday to Friday.
  marrow(wd, m) {
    if (wd === 5) return pick(m, [H(9), H(10), 'village.hallfront'], [H(10), H(11, 30), 'store.floor'], [H(11, 30), H(14), 'village.square'], [H(14), H(18), 'village.bench']);
    if (wd === 6) return pick(m, [H(10), H(12), 'village.memorial'], [H(12), H(15), 'village.bridge'], [H(15), H(18), 'village.square'], [H(18, 30), H(20, 30), 'hill.onsen']);
    const supper = wd === 1 || wd === 4;
    return pick(m, [H(8), H(9), 'village.hallfront'], [H(9), H(16), 'hall.desk'], [H(16), H(17, 30), 'village.square'],
      [H(17, 30), H(19), wd === 0 || wd === 3 ? 'village.memorial' : 'village.bench'],
      [H(19), H(20, 30), supper ? 'cafe.table1' : 'village.hallfront']);
  },
  // The courier: the farm's bin at five, the village otherwise.
  maris(wd, m) {
    const round = ['village.ranchyard', 'village.workshopfront', 'village.bridge', 'village.square', 'village.ranchyard', 'village.memorial', 'village.river'][wd];
    return pick(m, [H(8), H(9, 30), wd === 5 ? 'village.square' : wd === 1 || wd === 4 ? 'central.arrivals' : 'village.riverside'],   // Tue and Fri: her run lands at Eden Central
      [H(9, 30), H(10, 30), wd < 5 ? 'hall.floor' : 'village.hallfront'],
      [H(10, 30), H(12), 'village.storefront'], [H(12), H(13, 30), 'cafe.table2'], [H(13, 30), H(16, 20), round],
      [H(16, 20), H(17), 'farm.gate'], [H(17), H(17, 40), 'farm.bin'], [H(17, 40), H(18, 10), 'farm.gate'],
      [H(18, 30), H(20, 30), wd === 1 || wd === 6 ? 'cafe.table2' : 'village.cafefront']);
  },
  // The hangar at the top of the orbital elevator, where the Pallas launches for the belt.
  vashti(wd, m) {
    if (wd === 6) return pick(m, [H(9), H(11), 'hill.lake'], [H(11, 30), H(15), 'cafe.table3'], [H(15), H(18), 'hangar.floor']);
    if (wd === 4 && m >= H(15, 10) && m < H(17, 30)) return 'workshop.bench';
    if (wd === 4 && m >= H(17, 30) && m < H(18)) return 'hill.overlook';   // Fridays: from the Workshop up the hill, too late to open the hangar again
    const lake = wd === 1 || wd === 3 || wd === 5;
    return pick(m, [H(8), H(18), 'hangar.floor'], [H(18), H(20, 30), lake ? 'hill.lake' : 'hill.overlook']);
  },
  // Saturdays at the dock (her barge is her counter); other days her trading house in Eden Central.
  moraine(wd, m) {
    if (wd === 5) return pick(m, [H(9), H(17), 'central.dock']);   // Saturdays: trading from her ship at the Central dock
    return pick(m, [H(9), H(10), 'central.plaza'], [H(10), H(18), 'central.exchange']);   // the Ashfall Exchange on the Main deck
  },
  // Saturdays in the village, Sundays at the farm; from year 2, Wednesday evenings at the Hangar.
  general(wd, m, c) {
    if (wd === 5) return pick(m, [H(10), H(11, 30), 'village.memorial'], [H(11, 30), H(13, 30), 'village.bridge'], [H(13, 30), H(15, 30), 'cafe.table1'], [H(15, 30), H(18), 'village.river']);
    if (wd === 6) {
      if (m < H(11) || m >= H(16)) return null;
      if (c.weather === 'rain' || c.weather === 'snow') return 'farm.porch';
      return pick(m, [H(11), H(12, 30), 'farm.porch'], [H(12, 30), H(14, 30), 'farm.field'], [H(14, 30), H(16), 'farm.pond']);
    }
    if (wd === 2 && (c.year || 1) >= 2 && m >= H(18)) return pick(m, [H(18), H(21), 'cafe.table1']);
    return wd < 5 ? pick(m, [H(9), H(17), 'central.office']) : null;   // weekdays: the Governor's office on the Main deck
  },
};

Object.assign(SCHEDULE, {
  // The Guardians' commander: about the village by day, the overlook some evenings.
  kestrel(wd, m) {
    const after = ['village.clinicfront', 'village.square', 'village.libraryfront', 'village.ranchyard', 'village.square', 'village.riverside', 'village.bench'][wd];
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

Object.assign(SCHEDULE, {
  // Second Dawn Church: the pastor keeps the altar and the candles, and her garden after lunch. Mondays off, in Willowfall.
  calloway(wd, m) {
    if (wd === 0) return pick(m, [H(9), H(11), 'village.memorial'], [H(11), H(13, 30), 'village.river'], [H(13, 30), H(16), 'library.floor'], [H(16), H(18), 'village.bench']);
    if (wd === 6) return pick(m, [H(8), H(12), 'church.altar'], [H(12), H(14), 'central.plaza'], [H(14), H(16, 30), 'central.churchgarden'], [H(18), H(20), 'church.pew']);
    return pick(m, [H(8), H(9), 'central.churchgarden'], [H(9), wd === 2 ? H(11, 10) : H(12), 'church.altar'], [H(11, 10), H(12), 'central.schoolyard'], [H(12), H(13), wd === 2 ? 'school.floor' : 'central.plaza'],   // Wednesdays: across to the school for assembly
      [H(13), H(15), 'central.churchgarden'], [H(15), H(18), 'church.altar'], [H(18), H(19, 30), 'church.pew']);
  },
  // The safety depot: the constable checks the empty school's locks every morning. Thursdays off (he takes stray hens home to Willowfall).
  fenn(wd, m) {
    if (wd === 3) return pick(m, [H(9), H(11), 'village.ranchyard'], [H(11), H(13), 'village.square'], [H(13), H(15), 'hill.lake'], [H(15), H(17), 'village.riverside'], [H(18), H(20), 'village.bridge']);
    const beat = ['central.schoolyard', 'central.arrivals', 'central.churchgarden', null, 'central.arrivals', 'central.plaza', 'central.schoolyard'][wd];
    return pick(m, [H(7, 30), H(8), 'central.schoolyard'], [H(8), H(8, 30), 'school.floor'], [H(8, 30), H(9, 30), 'central.depotfront'], [H(9, 30), H(12), 'depot.desk'],   // the school is a walk from the depot [H(12), H(13), 'central.plaza'],
      [H(13), H(15), beat], [H(15), H(17), 'depot.desk'], [H(17), H(18), 'depot.floor'], [H(18), H(19, 30), wd === 6 ? 'church.pew' : 'central.depotfront']);
  },
});

const FESTIVAL_SPOTS = {
  'village.square': {
    general: 'village.memorial', marrow: 'village.square', seln: 'village.storefront', corran: 'village.square', ruess: 'village.bench',
    oduya: 'village.cafefront', maris: 'village.square', vashti: 'village.bench', moraine: 'village.hallfront',
    kestrel: 'village.square', mori: 'village.bench', yui: 'village.hallfront', calloway: 'village.memorial', fenn: 'village.square',
  },
  'village.bridge': {
    general: 'village.bridge', marrow: 'village.bridge', seln: 'village.river', corran: 'village.river', ruess: 'village.bench',
    oduya: 'village.bench', maris: 'village.bridge', vashti: 'village.riverside', moraine: 'village.river',
    kestrel: 'village.bridge', mori: 'village.river', yui: 'village.bench', calloway: 'village.bridge', fenn: 'village.riverside',
  },
};

export function whereIs(npcId, ctx) {
  const plan = SCHEDULE[npcId];
  if (!plan || !ctx) return null;
  const m = Number(ctx.minute) || 0;
  const wd = (((Number(ctx.weekday) || 0) % 7) + 7) % 7;
  const storm = ctx.weather === 'storm';
  // The Undercroft folk keep their own hours below decks: no weather, no festivals (until the Thornes move up).
  if (UNDERFOLK.includes(npcId) && !(ctx.flags && ctx.flags.ld_rehoused && (npcId === 'thorne' || npcId === 'moth'))) { const fe = festivalOf(ctx); if (fe && fe.spot.startsWith('lower.') && m >= fe.from - 60 && m < fe.to) return { spot: (FESTIVAL_SPOTS[fe.spot] || {})[npcId] || fe.spot }; const s = plan(wd, m, ctx); if (s) return { spot: festivalOf(ctx) && s.endsWith('.counter') ? 'lower.landing' : s }; const hs = awake(npcId, wd, m) && homeSpot(npcId, ctx); return hs ? { spot: hs } : null; }   // festival days: the bench is shut
  let spot = null;
  const fest = festivalOf(ctx);
  // Sato's partner lives at the farm: on the porch at dawn and in the evening (unless a festival is on).
  const atHome = ctx.partner === npcId && ((m >= H(6) && m < H(8)) || (m >= H(20) && m < H(22)));
  if (atHome && !(fest && m >= fest.from - 60 && m < fest.to)) return { spot: 'farm.porch' };
  if (fest) {
    // Shops are shut all day; the village gathers from an hour before until the end.
    if (m >= fest.from - 60 && m < fest.to) spot = (FESTIVAL_SPOTS[fest.spot] || FESTIVAL_SPOTS['village.square'])[npcId] || fest.spot;
    else if (npcId === 'vashti' && m >= H(8) && m < Math.min(H(18), fest.from - 60)) spot = 'hangar.floor';
    if (storm) spot = null;
  } else {
    spot = plan(wd, m, ctx);
    // A storm keeps everyone at home, except the Hangar and whoever is already inside it.
    if (storm && !(spot && spot.startsWith('cafe.'))) spot = null;
    // Nobody but Vashti climbs the hill in the wet.
    else if ((ctx.weather === 'rain' || ctx.weather === 'snow') && spot && spot.startsWith('hill.') && npcId !== 'vashti') spot = npcId === 'ruess' ? 'village.workshopfront' : 'village.bench';
  }
  // Free time between waking and bed is spent at home (docs/FARM.md §15); a storm keeps them in too, but out of sight.
  if (!spot && !storm && awake(npcId, wd, m)) spot = homeSpot(npcId, ctx);
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
    first: ['...You are the one with the Pallas.', 'Vashti. I run the elevator and the hangar at the top of it. You go out to the belt in a suit, not that walking tank. Nothing out there to shoot. You go out and you come back. I see to the second part.'],
    bday: ['...How did you know.', 'Nobody has given me anything in a long time. I do not know what my face is doing. Ignore it.'],
    b0: [
      'Elevator runs eight till six. Be back in the car by six or sleep in the hangar. The hangar is cold.',
      'Search the rubble. Set your Hydra down first. The crawlers scatter. It is not difficult.',
      'Nickel-iron near the colony. Copper and titanium further out. Platinum if you are patient. Everything has a price or a place. Learn which.',
      ['Twenty sectors, south to north. One is the apron. Twenty is the far marker. Further is richer.', 'Further is also further. Watch your air.'],
      ['Every sector has a pickup pod. Green light, lit pad. Get in, it flies you home.', 'I put them there. Somebody has to think about the coming back.'],
      'Reach sector five and the cradle can fling you straight there next time. Ten, fifteen, twenty, the same. Earn it first.',
    ],
    b1: [
      'You keep that salvage arm clean. Most do not. ...Good.',
      ['The big boulders want a better hammer. Ruess knows. Do not hit a huge one with a field hammer.', 'I did, once. My wrist still talks about it.'],
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
      '...You can have the elevator after six. If you ask. Only you.',
    ],
    s0: 'Spring damp gets into the elevator cable. I grease the clamps twice. You are welcome.',
    s1: 'Summer. Cooler at the axis than down here. One good thing about having no weight.',
    s2: 'Mushrooms come up round the elevator pad in autumn. Take them. I do not eat things that grow overnight.',
    s3: 'Frostcaps by the lake. And the cable sings in the cold. I like winter. It is quiet in the right way.',
    rain: 'Rain. The pad is slick. Walk on to the car, do not run. I am not fishing you off the hillside.',
    snow: 'Snow up here. Ash down there. From a distance they look the same. They are not.',
    sun: 'Clear. From the overlook you can see the whole ring curve. ...I look, sometimes.',
    morning: 'Early. Good. The best finds are before the dust lifts.',
    evening: 'Elevator is locked. The lake is that way, if you are going to stand about.',
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

Object.assign(TALK, {
  calloway: {
    first: ['Hello, hello. You are the farmer. Ines Calloway; I keep Second Dawn Church, the candles and a very argumentative tomato bed.', 'Come in whenever you like. The door has not been locked since the siege. I lost the key, and then I decided I had not.'],
    bday: ['A present? On my birthday? I shall have to preach on gratitude now, and I had something lazy planned.', '...Thank you, Mira. Truly. Sit a moment. I like to be given things slowly.'],
    b0: [
      'The church is open day and night. People come in at three in the morning to sit. I leave the kettle out for them.',
      ['Of any faith or none, the sign says. I wrote it.', 'Mostly "none" come, and sit at the back, and look at the windows. That counts.'],
      'I have a garden beside the church. Six tomato plants, two herbs, and one rose that refuses to admit it is a weed.',
    ],
    b1: [
      ['I was a field chaplain on the gates in the siege. You were on the gates too, I think.', 'We never met. I would have remembered somebody who was not shouting.'],
      ['Three hundred and twelve candles. One for each name.', 'I trim the wicks every morning. It takes an hour. It is the best hour I have.'],
      'Constable Fenn sits at the back on Sunday evenings and pretends he is checking the exits. I let him.',
    ],
    b2: [
      ['People ask me whether I still believe, after the siege.', 'I tell them I believe in soup, and tomatoes, and the people who turn up. The rest is on loan.'],
      ['The school across the avenue has no children yet. I go and sit in it on Wednesdays.', 'I plan the first assembly. It is a very short one. Mostly it is "hello".'],
      'You water things the way I light candles. Every day, whether or not anything comes of it. I recognise the habit.',
    ],
    b3: [
      ['I have started a candle that has no name on it.', 'It is for the ones still to come. The first child at that school. Your next spring. It seemed only fair.'],
      'You are the person I talk to when I am tired of being the person people talk to. I thought you should know.',
    ],
    s0: 'Spring. My tomatoes are in, and already sulking. The climate plant and I are not on speaking terms.',
    s1: 'Summer. The windows throw colours all down the aisle in the afternoon. People come in just to stand in them.',
    s2: 'Autumn. I bottle what the garden gives and leave the jars by the door. They are always gone by morning. Good.',
    s3: 'Winter. The candles matter more in winter. I do not know why. Perhaps because the dark is scheduled.',
    rain: 'Rain on the Upper deck, they tell me. Down here under the glass we only hear about it. I pray for your crops anyway.',
    snow: 'Snow up on the Lantern Ring. I shall light one candle for the sledges and one for the people mending them.',
    sun: 'A fine day. The sun-line comes through the glass roof and the whole avenue smells of warm dust and bread.',
    morning: 'Good morning. I have trimmed every wick. Three hundred and twelve, and none of them complained.',
    evening: 'Evening. This is the hour people come in to sit. I try to be furniture. Kind furniture.',
    fest: 'A festival! I have left the candles with the Constable. He is guarding them with his life. Somebody should tell him to sit down.',
    year2: ['A whole year of you coming in with mud on your boots.', 'I have stopped sweeping it up on Mondays. It is a sort of attendance record.'],
    fish: 'I fished once, as a girl. I caught a boot and gave it a proper burial. My father never let me forget it.',
    eve: { lantern: ['Lantern Night tomorrow. I bring the names from the church.', 'I carry them down the lift in a basket. It is heavier than it looks, and lighter than it was.'], yearsend: "Year's End tomorrow. I say three words at midnight, and then I go and help Oduya with the bowls." },
  },
  fenn: {
    first: ['Constable Aldo Fenn, safety depot, Main deck. Good day, madam. ...Captain. Farmer. Good day.', 'If you see anything unsafe, report it. If you lose anything, report it. If you find a hen, I will take the hen.'],
    bday: ['A gift. For me. On the correct date.', '...I shall log it. Under "kindness, received". It is a new heading. Thank you, Sato.'],
    b0: [
      'Peacekeeping, rescue, lost property and hull alarms. Mostly lost property. Yesterday: one glove, one umbrella, one goose.',
      ['All green on the deck map today.', 'I say that every morning. I say it to the drones. They do not reply, which is correct procedure.'],
      'Please do not run on the avenue. That is not a rule. It is a strongly worded hope.',
    ],
    b1: [
      ['I check the school locks every morning at eight.', 'Nobody has asked me to. There is nothing in it. It is the principle of the thing.'],
      ['I was a cadet in the siege. Nineteen. They gave me a torch and a corridor.', 'I kept the corridor. I still have the torch. It is in the drawer, regulation side up.'],
      'Pastor Ines says I salute too much. I have reduced it to three a day. It is very difficult.',
    ],
    b2: [
      ['There is a shelf at the depot of things nobody came back for. From the siege.', 'I keep them labelled and dusted. In case. A constable must allow for in case.'],
      'I tested the school bell once. To be sure it worked. It worked. I stood there afterwards for a while.',
      ['People think I am stiff. I am. It is like a splint.', 'It keeps the soft part straight while it heals.'],
    ],
    b3: [
      ['I have bought a box for the school. For the first child. Crayons, a ruler, a little torch.', 'Do not tell anyone. I have filed it under "equipment".'],
      'When you come down the lift on a Sunday, the deck map shows one green light walking about. I find I watch it.',
    ],
    s0: 'Spring. The hydroponics in the gardens bloom and half the deck stops to look. I direct the traffic. It is the best duty there is.',
    s1: 'Summer. The glass roof warms the avenue. I have issued myself a lighter jacket. It took a form.',
    s2: 'Autumn. Harvest Fair on the Lantern Ring. I am on duty there, which means I eat a pie standing up and guard the others.',
    s3: 'Winter. Snow up on the Upper deck, none down here. People come down the lift with it on their shoulders, and I let them track it in.',
    rain: 'Rain on the Upper deck, the board says. We get the rumour of it down here. I have an umbrella anyway. Regulation.',
    snow: 'Snow up on the Ring. Mind the lift steps when you come down. Wet boots on deck plate. I have seen things.',
    sun: 'Clear day under the glass. Visibility excellent. Morale, if I may say, also excellent.',
    morning: 'Good morning. School locks checked: secure. Deck map: green. Constable: present and correct.',
    evening: 'Evening. The depot drones are charging. I like the hum. It sounds like a house with people in it.',
    fest: 'On duty at the festival. Nobody has done anything unsafe. Corran has come close. I am watching Corran.',
    year2: ['A year since you came down that lift with a sack of turnips and no idea where the market was.', 'I gave you directions. You did not need them. I gave them anyway. I would again.'],
    fish: 'I fish the hill lake on Thursdays. I have caught nothing, and logged every hour of it. It is the most peaceful file in the depot.',
    eve: { harvest: 'Harvest Fair tomorrow. I have been asked to keep order at the pie table. I have been asked by the Commander, who is judging it.', planting: 'Planting Day tomorrow. I have pressed my gardening uniform. There is no such uniform. I have pressed a shirt.' },
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
  if (t.flag) for (const [k, l] of Object.entries(t.flag)) if (flags[k] && !(t.flag[k + '!'] && flags[t.flag[k + '!']])) addAll(l, 3);   // lines for how far the Undercroft has come
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

Object.assign(GIFT, {
  calloway: {
    loved: 'Oh, now. This is a blessing with its sleeves rolled up. Thank you, Mira. I shall be cheerful about it all week.',
    liked: 'How kind. I shall share it, which is the only way I know to keep a thing.',
    neutral: 'Thank you, dear. Everything given in kindness finds a use here, eventually. Usually on Sundays.',
    disliked: 'Ah. I have buried too many of these, in my time. I shall find it a quiet drawer. Thank you for the thought.',
    bday: 'And on my birthday. ',
  },
  fenn: {
    loved: 'This is... Sato, this is entirely in order. Wholly in order. I need a moment. I am going to log it twice.',
    liked: 'Thank you. Received with thanks. I shall make a note. A good note.',
    neutral: 'Received. Thank you, citizen. Farmer. Sato. Thank you.',
    disliked: 'Ah. I shall place it in lost property. Not that it is lost. It is simply... safer there.',
    bday: 'On the correct date, too. ',
  },
});

export function giftLine(npcId, tier, isBirthday) {
  const g = GIFT[npcId];
  if (!g) return 'Thank you.';
  const line = g[tier] || g.neutral;
  return isBirthday && tier !== 'disliked' ? g.bday + line : line;
}

// ------------------------------------------------------------------ heart events

const L = (who, text, ex) => (ex ? { who, text, ex } : { who, text });   // ex: an expression for the portrait (see expressions.js)

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
    id: 'vashti3', npc: 'vashti', hearts: 3, map: 'hangar', from: H(8), to: H(18),
    lines: [
      L('narrator', 'Vashti is greasing the cable clamps of the elevator car. A square of card is tucked into her bandana, the way other people keep a pencil.'),
      L('sato', 'You have a photograph in your hat.'),
      L('vashti', '...Most people pretend they have not seen it.'),
      L('narrator', 'She hands it over. A street corner, long ago. A blue door. A woman laughing with a child on her hip. Half a street sign: —ILLOW LA—.'),
      L('vashti', 'Found it in a wallet, in a hull I was stripping. Their side. He had carried it right through the war.'),
      L('vashti', 'I took the copper out of that ship and sold it. Then I could not sell the picture. Three years I have had it.'),
      L('sato', 'And Maris\'s shuttle goes down to where the streets are.'),
      L('vashti', 'There are a great many streets. I have been looking for one blue door. It is stupid.'),
      L('sato', 'I bought a field I did not know how to plant. I am in no position to call a thing stupid.'),
      L('vashti', '...Hm. If you see a blue door down there, tell me. Take this. I have too many, and you came and asked.'),
    ],
    reward: { love: 3, item: ['crystal', 1] },
  },
  {
    id: 'vashti7', npc: 'vashti', hearts: 7, map: 'hangar', from: H(8), to: H(18),
    lines: [
      L('narrator', 'The elevator car is docked and locked, in the middle of the day. Vashti sits on the lip of the hangar mouth with her boots hanging over the stars.'),
      L('vashti', 'I found it. Willow Lane. The door is grey now. It was blue under the ash. I scratched it to be sure.'),
      L('sato', 'And inside?'),
      L('vashti', 'A kitchen. A table laid for three. Dust. A height chart on the door frame, pencil, up to here. Nobody. There was never going to be anybody.'),
      L('vashti', 'I thought I would feel finished. I put the photograph on the table and came up. Now I do not know what I am for.'),
      L('sato', 'I know that one. It lasts about a season. Then something needs watering.'),
      L('vashti', '...I thought about leaving. I always do, after. I have the pack by the door.'),
      L('sato', "Marrow's Memory Room needs someone who knows what things were. The children ask questions she cannot answer. And the elevator does not run itself."),
      L('vashti', 'You are giving me a reason. You are not even hiding it.'),
      L('sato', 'I was a captain. Subtlety was never in the manual.'),
      L('narrator', 'Vashti is quiet for a while. Then she gets up, hangs her pack on the hook inside the elevator car, and leaves it there.'),
      L('vashti', 'The village is called Willowfall. I only noticed that on the way up. ...Take this. It was on their mantelpiece. It ought to be wound by someone.'),
    ],
    reward: { love: 5, item: ['watch', 1] },
  },

  // ---- Moraine: the price of peace.
  {
    id: 'moraine3', npc: 'moraine', hearts: 3, map: 'central', weekday: 5, from: H(9), to: H(17),
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
    id: 'moraine7', npc: 'moraine', hearts: 7, map: 'central', weekday: 5, from: H(9), to: H(17),
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

EVENTS.push(
  // ---- Pastor Ines: the candles, and the garden.
  {
    id: 'calloway3', npc: 'calloway', hearts: 3, map: 'church', from: H(9), to: H(12),
    lines: [
      L('narrator', 'Second Dawn Church is empty but for the candles and Pastor Ines, who is trimming wicks with a pair of nail scissors.'),
      L('calloway', 'Mira. Hold this, would you? No, the other end. That is the end that is on fire.'),
      L('sato', 'You know every one of these by name.'),
      L('calloway', 'Three hundred and twelve. I wrote the names on the bases in pencil. Pencil, so I can go over it when it fades.'),
      L('calloway', 'You are wondering whether there is one of yours here. There is room. There is always room. Light one if you like.'),
      L('narrator', 'Sato lights a candle and says a name from the carrier, very quietly. Ines writes it on the base without asking how it is spelled.'),
      L('sato', 'You did not ask.'),
      L('calloway', 'You said it as if you had been saying it for years. I trust a name that has been carried that long.'),
      L('calloway', 'Now. Take these. Tomato seed, from my own bed. They are stubborn, like the people who come in here. They do very well.'),
    ],
    reward: { love: 3, item: ['seed_tomato', 1] },
  },
  {
    id: 'calloway7', npc: 'calloway', hearts: 7, map: 'central', from: H(13), to: H(15),
    lines: [
      L('narrator', 'In the little garden beside the church, Pastor Ines is on her knees in the soil, in her cassock, swearing mildly at a tomato.'),
      L('calloway', 'Do not look so shocked. He understands me. Help me tie him up. Gently. He has had a hard week.'),
      L('sato', 'You never told me why you came down from the gates. After the siege.'),
      L('calloway', 'I stopped believing in anything, the eleventh night. I knelt by a boy who had been nineteen for one day, and I had nothing to say to him.'),
      L('calloway', 'I came down here meaning to give it all up. The church was a ruin. Someone had planted one tomato in the rubble by the door.'),
      L('calloway', 'Nobody knew who. It fruited anyway. I sat by it every day for a month. Then I swept the floor. Then I lit a candle. Then I lit another.'),
      L('sato', 'So it was a tomato.'),
      L('calloway', 'It was somebody who planted one, and went away, and never knew. Like you, every morning. That is the whole of my faith now, Mira. It is enough.'),
      L('narrator', 'She sits back on her heels, and wipes her hands on her cassock, and looks at the plant as if it were a person she was proud of.'),
      L('calloway', 'Here. This was my mother\'s. Thin as a leaf. Drink something good out of it, and think of somebody who planted something.'),
    ],
    reward: { love: 5, item: ['teacup', 1] },
  },
  // ---- Constable Fenn: the lost property shelf, and the school bell.
  {
    id: 'fenn3', npc: 'fenn', hearts: 3, map: 'depot', from: H(9, 30), to: H(12),
    lines: [
      L('narrator', 'At the safety depot, Constable Fenn is standing very straight at the front desk. On the desk, in a crate marked EVIDENCE, sits a hen.'),
      L('fenn', 'Sato. Good. Official business. Is this your hen?'),
      L('sato', 'No. That is Pell. She is Corran\'s. She is famous for it.'),
      L('fenn', 'She was found in the Arrivals hall at six this morning, on the courier desk. She had no ticket. I have taken a statement.'),
      L('sato', 'From the hen.'),
      L('fenn', 'She declined to comment. ...She has had some seed, and some water, and a short lie-down on my jacket. Not regulation. She looked cold.'),
      L('narrator', 'Behind him, a whole wall of shelves: gloves, a child\'s shoe, a pair of spectacles, a cap badge. Every one labelled in very neat writing.'),
      L('fenn', 'Lost property. From the siege, mostly. I keep it. People do come back, sometimes. Not often. Sometimes.'),
      L('fenn', 'I take strays up to Willowfall on Thursdays. If you would carry this one now, there is a finder\'s fee. It is regulation. I wrote the regulation.'),
    ],
    reward: { love: 3, money: 150 },
  },
  {
    id: 'fenn7', npc: 'fenn', hearts: 7, map: 'village', weekday: 3, from: H(9), to: H(11),
    lines: [
      L('narrator', 'Thursday, Willowfall. Constable Fenn is out of uniform for once, in a knitted jumper, holding a cardboard box very carefully at the ranch gate.'),
      L('fenn', 'Sato. You have caught me off duty. I do not do it well.'),
      L('sato', 'What is in the box?'),
      L('fenn', '...Equipment. For the school. Crayons. A ruler. A little torch, the kind with a hand crank. For the first child, whoever that is.'),
      L('fenn', 'In the siege they gave me a corridor full of children from the Lower deck, and a torch, and said hold it. I held it. Nine days.'),
      L('fenn', 'They used to ask me for stories in the dark. I did not know any. I read them the safety regulations, in voices. They liked the fire drill best.'),
      L('sato', 'And now you check the school locks every morning.'),
      L('fenn', 'It is empty, so I keep it safe. Then when somebody comes, it will have been safe the whole time. That seems important. I cannot explain why.'),
      L('sato', 'You just did. Very clearly.'),
      L('narrator', 'Fenn looks at the box for a long moment, and then, very stiffly, holds out a paper bag to Sato.'),
      L('fenn', 'Pie. From the Hangar. I bought two. Do not tell the depot drones. They will want to know which one I gave away.'),
    ],
    reward: { love: 5, item: ['pie', 1] },
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
  'village.riverside': 'THE RIVERSIDE WALK. Willows, benches and the best bank for fishing in Willowfall. The old dock was taken down after the siege; boats moor on the Main deck now.',
  'village.storefront': "SELN'S SEED & SUNDRY. Seeds in season, fresh bread, rucksacks, fishing rods. Open 9 to 5. Closed Sundays, when the steward is out counting seedlings.",
  'village.cafefront': "THE HANGAR. The Upper deck's canteen. Hot food, ten till ten, every day of the year. Storms included. If you are hungry and cannot pay, come in anyway. T. Oduya, chef.",
  'village.hallfront': 'VILLAGE HALL. Warden E. Marrow. Desk hours 9 to 4, Monday to Friday. The Memory Room is open to all: things from the Old World, kept so we know what was good.',
  'village.workshopfront': 'RUESS: WORKSHOP. Tools upgraded overnight. Greenhouses mended. Clocks, prams and rods considered. Open 9 to 5. Closed Wednesdays. Do not touch the carousel.',
  'village.ranchyard': "CORRAN'S RANCH. Chickens, cows, feed and fodder, milkers and brushes. Open 9 to 5. Closed Thursdays (gone fishing). The shouting is normal.",
  'hill.wreck': 'THE ORBITAL ELEVATOR. Cable car up to the axis and N. Vashti\'s hangar; suited runs to the asteroid belt, 8 to 6. You get lighter as you rise; hold the rail. The Old World is by shuttle from the Eden Central space dock.',
  'hill.lake': 'HILL LAKE. Best fishing on the Upper deck. Home of "Old Hollin", a carp of great age and poor manners. Rods lost to him so far: 14.',
  'hill.overlook': 'THE OVERLOOK. From here the whole Lantern Ring curves up and over. At dusk the great window opens, and you can see the Earth. Give it time. So are we.',
};

export const HELP = [
  {
    title: 'Helpers and gear',
    body: 'Seln sells a harvest basket: hold it while you pick and the crops and forage go in it (30 in all); E at the bin ships the lot. Ruess builds field chests to set down on the farm or the hill, and leases Field-units: little robots that water, harvest or feed the animals each morning. They run on batteries; charge empty ones overnight in a solar charger. The Terrace Onsen on the hill restores you and lightens your tools for the day. P opens the Farm journal.',
  },
  {
    title: 'Controls',
    body: 'Move: W A S D or the arrow keys. Hold Shift to run.\nUse the held tool or item: Space or left click.\nTalk, interact, harvest, enter a door: E.\nChoose a rucksack slot: keys 1 to 0, or the mouse wheel.\nEat the food you are holding: R.\nOpen the rucksack: Tab.\nThe town map: M (or the map button; click the little map in the corner too).\nThe farm journal (today, collections, logs): P, or the pause button.\nMenu (save, settings, music, this guide): Esc.\nDrag with the mouse, or press Q and C, to turn the camera.\n\nOn a touch screen there is a stick on the left to move, and buttons on the right for Use, Interact, Eat and the rucksack. Drag anywhere else to turn the camera.',
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
    body: 'Every villager has a friendship score, shown as hearts (0 to 10).\n\nTalk to someone with E: the first talk each day adds a little. Hold an item and press E to give it: the first gift of the day counts in full, more that day a quarter. People have things they love, like and dislike, and a birthday gift counts three times over.\n\nNow and then someone asks a favour: a few of something from your field, the water or the Old World. Bringing it raises friendship more than a gift does.\n\nAt certain hearts a villager has something to show or tell you. Walk in at the right place and time and the scene plays by itself.\n\nThe General visits the village on Saturdays and the farm on Sundays.',
  },
  {
    title: 'Love',
    body: 'Six people can become more than friends: the General, Professor Ruess, Commander Kestrel, Dr. Mori, Oduya the canteen chef and Yui the librarian.\n\nLove grows from friendship. See their heart events, do a couple of favours for them, and reach 8 hearts: then comes the confession, and they become your sweetheart. Only one sweetheart at a time.\n\nAt 10 hearts, buy the Earthlight pendant from Moraine\'s barge and offer it. On Eden it means: share my table. Offered too early, it is gently refused.\n\nThe wedding is held in the village square under the lanterns. Afterwards your partner shares the farmhouse: on the porch at dawn and in the evening, about their own work by day.',
  },
  {
    title: 'The Old World, fishing and forage',
    body: 'The orbital elevator on the hill rides up to Vashti\'s hangar: suit up for the asteroid belt, twenty sectors north, richer further out. Space or E with the hammer breaks rocks (bigger ones need a better hammer); flying uses air, and every sector has a pickup pod home.\n\nThe Old World: Maris\'s shuttle lands by one big ruined city, new every trip. Roam it in the Pallas (Space fires, F sets the Hydra, E searches what sparkles, R scans); the far north is richer and rougher. Relics go to the Memory Room. Camp at a safe spot to sleep, save or fly home; or walk back to the shuttle before the hull runs out.\n\nFishing: face water, Space to cast, Space when the float dips; the hill lake is best.',
  },
  {
    title: 'Eden Central',
    body: 'The lift in Willowfall\'s lift plaza drops to Eden Central on the Main deck (20 minutes). There: the Governor\'s office, the Ashfall Exchange, the Grand Market terminals, the viewing gallery at the great window, Sato\'s Watch after seven, and the Arrivals hall, whose courier desk books the shuttle to Earth (200 cr, free with Maris at 5 hearts). The space dock is north-west. Pastor Ines keeps Second Dawn Church; Constable Fenn the safety depot. The new school waits for its first pupils.',
  },
  {
    title: 'Seasons and festivals',
    body: 'A year has four seasons of 30 days. Spring 1 of the first year is a Monday.\n\nSpring: turnip, potato, cucumber, strawberry.\nSummer: tomato, corn, onion, pumpkin.\nAutumn: carrot, eggplant, sweet potato, spinach.\nWinter: nothing grows outdoors. Fish, explore, tend animals, use the greenhouse.\nMoonflower, from Moraine, grows in any season but winter.\n\nFestivals (shops are shut that day):\nPlanting Day, Spring 18, the square, from 10:00.\nLantern Night, Summer 24, the bridge, from 18:00.\nHarvest Fair, Autumn 9, the square, from 10:00.\nYear\'s End, Winter 30, the square, from 18:00.\n\nGo to the place during the festival and join in.',
  },
];

// ------------------------------------------------------------------ the Memory Room, fishing, the Old World

export const RELICS = ['photo', 'teacup', 'book', 'watch', 'toy', 'medal', 'seedtin', 'musicbox', 'datachip', 'ring'];
export const FISH = ['fish_s', 'fish_m', 'fish_l', 'fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter', 'fish_king',
  'fish_reedling', 'fish_dawnscale', 'fish_rainbarb', 'fish_lantern_cat', 'fish_spokerun', 'fish_paneray', 'fish_stormgar', 'fish_cloudfin',
  'fish_earthlight_trout', 'fish_sailfin', 'fish_halo_eel', 'fish_mochi', 'fish_ferryman', 'fish_admiral'];   // the waters under the sky (the Lower deck's: wiki, §12)

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
  // The Old World is one big ruined city a trip (sim.cityLayout): suburbs by the landing pad, downtown, the core far north.
  first: [
    'The shuttle settles on its skids at the edge of a city nobody has walked in a lifetime. Grey light, still air, ivy on everything.',
    'Sato climbs down the ramp in the Pallas. Streets run off in every direction: little houses here, the broken towers of downtown beyond, and far to the north a glow over the old industrial core.',
    'Maris, over the radio: "I\'ll keep the engine warm on the pad. Walk back to me when you\'re done, or when that hull bar goes red. If it gives out, I tow you. And I charge for towing."',
  ],
  arrive: [
    'The shuttle settles on its skids. A new street plan, the same quiet: the city has shifted its rubble since last time.',
    'The Pallas steps off the shuttle ramp into ash and ivy. Somewhere a broken billboard creaks. Green haze pools in the low streets downtown.',
    'The Old World. Roofless houses, rusted cars nose to tail, and a sky the colour of old pewter. The hull meter on the Pallas hums.',
  ],
  zone: ['The suburbs: little houses, overgrown yards. The shuttle is south.', 'Downtown: tall broken towers, shopfronts, and the gas lies thick in places.', 'The core: the old industrial district. The air hums, the pools glow, and the creatures here are bigger.'],
  zoneFirst: [
    'The suburbs. Little houses in yards gone wild, cars still parked in the drives. Rad-hounds nose about here: quick, but not tough.',
    'Downtown for the first time. Towers broken off at the third or fourth floor, shop counters still standing in the shopfronts. Watch for the smog-wraiths: they drink the Pallas\'s charge.',
    'The core. Everything glows faintly, and the craters are full of something lime-green. Somewhere in here is a sealed vault, and something big guarding it.',
  ],
  goal: (m) => (m.camps && m.camps.some((c) => c.built) ? { title: 'Find treasure', hint: 'Your camp is safe: sleep, save or fly home from it. Or walk back to the shuttle.' } : { title: 'Find treasure', hint: m.zone === 2 ? 'The core: richest finds, toughest creatures. The vault is here somewhere.' : 'Search cars, rubble, lockers and safes. Green rings are safe spots for a camp.' }),
  vault: 'The sealed vault groans open. Inside, on steel shelves, the things somebody thought worth saving from the end of the world.',
  monster: [
    'Pest control. Carry on.',
    'It was eating a letterbox. I have done the letterbox a favour.',
    'The Hydra has opinions about crawlers. I let it express them.',
    'It fizzled off into the gas, sulking. It will be back. They always are.',
    'Shoo. Go and glow somewhere else.',
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
  finds: {                                     // the city's own valuables (not for the Memory Room)
    old_coin: 'An old coin, its face worn smooth by a lifetime of pockets.',
    teddy_bear: 'A teddy bear with one button eye, tucked away as if somebody meant to come back for it.',
    film_camera: 'A film camera with a roll still inside: twelve pictures nobody has ever seen.',
    credit_chip: 'An old-world credit chip, still sealed. The Ashfall Exchange will honour it.',
    data_core: 'A crystal data core, humming faintly in its cradle: a whole archive of the old world.',
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
        L('calloway', 'And from the church, a blessing, if you will have one: may your field be stubborn, your table full, and your watches all off duty.'),
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
        L('calloway', 'A blessing on the pair of you, and on whatever he builds next in that barn. May it have brakes.'),
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
        L('calloway', 'Bless you both. May you always land where the lamp is lit, Commander, and may she always leave it on.'),
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
        L('calloway', 'A blessing, Doctor, from one night-watcher to another: may you both sleep through till morning, for years and years.'),
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
        L('calloway', 'Bless this table and everyone at it. May the pan never be empty, and may the cook sit down for once.'),
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
        L('calloway', 'A blessing, very quietly: may your house be full of good pages, and may the best ones be the ones you write together.'),
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
    Q('vashti_scrap', 'scrap', 4, 'Four scrap. The elevator brake is worn. I could fetch it. Somebody has to stay up here and mind the cable.', 'Good. That will hold. ...Thanks.'),
    Q('vashti_crystal', 'crystal', 1, 'One crystal, if you find one out there. The car lamp wants a new lens. Then you can see the cable all the way down. Useful.', 'Clean one. Good eye. The cable will be lit by tonight.'),
    Q('vashti_mushroom', 'mushroom', 2, 'Two mushrooms. ...I said I do not eat them. Oduya made a soup. I was wrong. Do not repeat that.', 'Hm. Fine. I was wrong twice. Thank you.', { season: 2 }),
    Q('vashti_frostcap', 'frostcap', 3, 'Three frostcaps from by the lake. They keep the cable grease from freezing. Old salvage trick.', 'That will do it. You did not ask why. I like that.', { season: 3 }),
    Q('vashti_soup', 'soup', 1, 'One soup. Hot. It is cold at the axis all day. I will not ask twice.', '...Still hot. You ran. You did not need to run. Thanks.'),
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
  calloway: [
    Q('calloway_tomato', 'tomato', 3, 'Might I beg three tomatoes? Mine have gone on strike again, and the Sunday soup is a tomato soup by long tradition.', 'Look at them. Proper ones. The soup will be the talk of the deck, and I shall take no credit.', { season: 1 }),
    Q('calloway_herb', 'herb', 3, 'Three herbs from the hill, if you are up that way. I make a tea for the people who come in at three in the morning.', 'Thank you, Mira. Somebody will sleep tonight on the strength of these.', { season: 0 }),
    Q('calloway_bread', 'bread', 2, 'Two loaves, if you are passing Seln\'s. Whoever sits in the back pew after evensong gets fed. That is my only rule.', 'Lovely. The back pew is going to be very popular tonight.'),
    Q('calloway_tea', 'tea', 2, 'Two teas from the Hangar? One for me and one for the Constable. He will not accept one from me directly. He thinks it is a bribe.', 'Bless you. I shall tell him it is evidence. He will drink it to keep it safe.'),
    Q('calloway_milk', 'milk_s', 2, 'Two small milks, please. The old folk come to Sunday tea, and they like it the way it used to be, before the powder.', 'Real milk. You will hear the sighing from the Lantern Ring.'),
    Q('calloway_photo', 'photo', 1, 'If you find one photograph in the Old World, would you bring it to me? Some names on the candles have no face. I should like one, even a stranger\'s.', 'Look at her laughing. She will stand beside the candles now. Thank you, Mira.', { minHearts: 5 }),
  ],
  fenn: [
    Q('fenn_egg', 'egg', 6, 'Half a dozen eggs, if your hens can spare them. For the depot breakfast. The night shift is one constable and three drones, and only I eat.', 'Six. Received in good order. The drones will watch me eat them, as usual.'),
    Q('fenn_scrap', 'scrap', 4, 'Four pieces of scrap, if you have them. One of the rescue drones scraped a bulkhead. It was not its fault. The bulkhead was in the way.', 'Thank you. The drone is fixed. It has been told the bulkhead is sorry.'),
    Q('fenn_corn', 'corn', 3, 'Three ears of corn. The Arrivals hall wants a display for the summer couriers. I volunteered. I do not know why I volunteered.', 'An excellent display. I have arranged it at regulation spacing.', { season: 1 }),
    Q('fenn_sweetpotato', 'sweetpotato', 3, 'Three sweet potatoes, please. I roast them on the depot heater on cold shifts. It is against regulations. I have not yet reported myself.', 'Thank you. I shall continue not reporting myself.', { season: 2 }),
    Q('fenn_fish', 'fish_s', 2, 'Two silverfin. I have fished every Thursday for a year and logged nothing. I should like the log to show one good day, even if it is yours.', 'Two. I shall enter them as "assisted". Thank you, Sato.'),
    Q('fenn_toy', 'toy', 1, 'An odd request. One tin robot, if the Old World gives you one. For the school\'s toy box. For the first child. It must be one that still walks.', 'It walks. Three steps and over. ...That is correct procedure, for a toy. Thank you.', { minHearts: 5 }),
  ],
};

// ------------------------------------------------------------------ Market Lane: five new villagers (2026-11-19)
// Willowfall grew east into Market Lane. Pia Varga the tailor, Lark Penhallow the baker (romance), Noor Asante the Seedhouse
// botanist, Tika Brandt the garage mechanic (Ruess's apprentice) and Vesna Kade of Radio Willowfall (romance). Their portraits
// are drawn from their looks ('look:<id>', ui.js). The Bloom Fair in Lane Square, Summer 10, is their festival.
const LANE = ['pia', 'lark', 'noor', 'tika', 'vesna'];
Object.assign(NPCS, {
  pia: {
    id: 'pia', name: 'Pia Varga', short: 'Pia', title: "Tailor and dressmaker; Varga's Mend & Make", portrait: 'look:pia',
    look: { skin: '#f0cdb0', hair: '#6b2a45', top: '#2f6f73', bottom: '#3b3040', style: 'braid' },
    birthday: { season: 2, day: 23 },
    loves: ['fine_wool', 'yarn', 'musicbox', 'cosmos'],
    likes: ['wool', 'tea', 'bread', 'photo', 'goat_cheese', 'strawberry', 'duck_feather', 'honey'],
    dislikes: ['scrap', 'mushroom', 'tonic'],
    shop: 'tailor',
  },
  lark: {
    id: 'lark', name: 'Lark Penhallow', short: 'Lark', title: 'Baker of the Sunrise Oven, Market Lane', portrait: 'look:lark',
    look: { skin: '#f6d2b4', hair: '#e9b35a', top: '#f1d9a8', bottom: '#6b4a35', style: 'ponytail' },
    birthday: { season: 0, day: 4 },
    loves: ['honey', 'duck_egg', 'strawberry', 'cranberry'],
    likes: ['egg', 'milk_m', 'milk_l', 'berry', 'cheese', 'pumpkin', 'tea', 'sunflower'],
    dislikes: ['scrap', 'frostcap', 'tonic'],
    shop: 'bakery',
  },
  noor: {
    id: 'noor', name: 'Noor Asante', short: 'Noor', title: 'Seed botanist; the Seedhouse florist', portrait: 'look:noor',
    look: { skin: '#8a5a3e', hair: '#b9a3d9', top: '#9bb07a', bottom: '#4a5a48', style: 'odango' },
    birthday: { season: 0, day: 27 },
    loves: ['seedtin', 'tulip', 'cosmos', 'moonflower'],
    likes: ['herb', 'snowbell', 'sunflower', 'honey', 'mushroom', 'book', 'spinach', 'wild_violet'],
    dislikes: ['bouquet', 'scrap', 'alloy'],
    shop: 'florist',
  },
  tika: {
    id: 'tika', name: 'Tika Brandt', short: 'Tika', title: "Ruess's apprentice; Brandt's Garage", portrait: 'look:tika',
    look: { skin: '#eac2a0', hair: '#e2553a', top: '#2e8f8a', bottom: '#2a6f6b', style: 'short' },
    birthday: { season: 3, day: 24 },
    loves: ['copper', 'toy', 'pie', 'watch'],
    likes: ['scrap', 'alloy', 'titanium', 'corn', 'bread', 'sun_bun', 'datachip', 'egg'],
    dislikes: ['bouquet', 'spinach', 'teacup'],
    shop: 'garage',
  },
  vesna: {
    id: 'vesna', name: 'Vesna Kade', short: 'Vesna', title: 'Voice of Radio Willowfall; plays the Hangar', portrait: 'look:vesna',
    look: { skin: '#f3d6c2', hair: '#d76f9c', top: '#2b2533', bottom: '#5b4a7a', style: 'twintails' },
    birthday: { season: 1, day: 19 },
    loves: ['record', 'musicbox', 'honey', 'elderflower'],
    likes: ['tea', 'pie', 'berry', 'melon', 'yuzu', 'fish_summer', 'ring', 'honey_cake'],
    dislikes: ['scrap', 'onion', 'kale'],
    shop: 'radio',
  },
});
VILLAGERS.push(...LANE);
SPOTS.push('village.lane', 'village.bakeryfront', 'village.tailorfront', 'village.floristfront', 'village.garagefront', 'village.radiofront', 'village.millbridge', 'village.trialbeds',
  'bakery.counter', 'bakery.table', 'bakery.floor', 'tailor.counter', 'florist.counter', 'garage.counter', 'garage.bench', 'radio.counter', 'cafe.stage', 'hill.terraces', 'farm.east');
for (const id of LANE) {                      // their gift tiers (the table above was built before they moved in)
  const n = NPCS[id], m = {};
  for (const x of n.dislikes) m[x] = 'disliked';
  for (const x of n.likes) m[x] = 'liked';
  for (const x of n.loves) m[x] = 'loved';
  tierOf[id] = m;
}

FESTIVALS.push({
  id: 'bloom', name: 'The Bloom Fair', season: 1, day: 10, from: H(10), to: H(16), spot: 'village.lane',
  blurb: 'The Bloom Fair in Lane Square from ten: flowers judged without mercy, wool and cheese judged with lunch.',
  lines: [
    L('narrator', 'Lane Square is strung with bunting Pia sewed from offcuts. Every table holds something grown, spun, pressed or baked, and a small card in very neat writing.'),
    L('vesna', 'Good morning, Willowfall, and good morning to the Middle deck, who can hear us if Tika\'s cable holds. This is the Bloom Fair, live.'),
    L('tika', 'It will hold! ...It is holding. Mostly. If you hear a pop, that was not the cable.'),
    L('noor', 'I am judging the flowers. Marrow has asked me to be kind. I shall be accurate, and then, if there is time, kind.'),
    L('pia', 'Wool and cheese on the long table. Touch the fleeces with clean hands or not at all. Corran, that means you.'),
    L('corran', 'Clean as a gun barrel! And that goat cheese has my goats\' names on it, so mind how you judge it.'),
    L('lark', 'Honey cake with real flowers on top! Noor says they are edible. Noor also says that about bark, so start with the edges.'),
    L('fenn', 'One cake each, please. I have been asked to keep order at the cake table. I have been asked by myself.'),
    L('noor', 'Mira. Your sunflowers lean. Every one of them, towards the sun-line, as if it owed them money. ...First prize.'),
    L('sato', 'They lean because I never managed to tell them anything. I take no credit. I only watered them and worried.'),
    L('marrow', 'That is all farming has ever been, my dear. Now, somebody cut that cake before the Constable arrests it.'),
    L('narrator', 'By four the tables are bare, the bees from the farm hives have found the bouquets, and the whole Lane is humming along to the radio.'),
  ],
  reward: { money: 500 },
});
for (const t of [SIGNS]) if (t['village.square'] && !/Bloom Fair/.test(t['village.square'])) t['village.square'] = t['village.square'].replace('Lantern Night, Summer 24.', 'Bloom Fair, Summer 10 (Market Lane). Lantern Night, Summer 24.');

Object.assign(SCHEDULE, {
  // The tailor's: closed Sunday, when Pia buys fleeces at the ranch and walks the trial beds.
  pia(wd, m) {
    if (wd === 6) return pick(m, [H(10), H(12), 'village.ranchyard'], [H(12), H(14), 'village.lane'], [H(14), H(17), 'village.trialbeds'], [H(17), H(19), 'village.bench']);
    return pick(m, [H(8), H(9), 'village.tailorfront'], [H(9), H(17), 'tailor.counter'], [H(17), H(18, 30), wd % 2 ? 'village.lane' : 'village.square'],
      [H(18, 30), H(20), wd === 2 || wd === 5 ? 'bakery.table' : 'village.tailorfront']);
  },
  // The Sunrise Oven: open seven till three and again for the afternoon bake; closed Mondays. In bed by half past seven.
  lark(wd, m) {
    if (wd === 0) return pick(m, [H(9), H(11), 'village.river'], [H(11), H(13), 'hill.lake'], [H(13), H(16), 'village.millbridge'], [H(16), H(18), 'village.lane'], [H(18), H(19, 30), 'village.bench']);
    return pick(m, [H(7), H(15), 'bakery.counter'], [H(15), H(16, 30), wd % 2 ? 'village.riverside' : 'village.bakeryfront'], [H(16, 30), H(18), 'bakery.floor'], [H(18), H(19, 30), wd === 2 || wd === 5 ? 'village.lane' : null]);   // most evenings: home, feet up, by half past six
  },
  // The Seedhouse: closed Tuesdays, for the hill terraces and a look at the farmer's hives.
  noor(wd, m) {
    if (wd === 1) return pick(m, [H(9), H(13), 'hill.terraces'], [H(13), H(16), 'library.floor'], [H(16), H(18), 'farm.east'], [H(18), H(19, 30), 'village.trialbeds']);
    return pick(m, [H(7), H(9), 'village.trialbeds'], [H(9), H(17), 'florist.counter'], [H(17), H(19), wd === 0 || wd === 3 || wd === 5 ? 'village.riverside' : 'village.trialbeds'], [H(19), H(20), 'village.floristfront']);
  },
  // The Workshop with Ruess in the mornings, her own garage in the afternoons; Wednesdays with Ruess on the hill, Sundays off.
  tika(wd, m) {
    if (wd === 6) return pick(m, [H(10), H(13), 'hangar.floor'], [H(13), H(16), 'village.riverside'], [H(16), H(19), 'village.garagefront']);
    if (wd === 2) return pick(m, [H(10), H(13), 'hill.wreck'], [H(13), H(15), 'village.river'], [H(15), H(18), 'garage.bench'], [H(18), H(20), 'village.lane']);
    return pick(m, [H(8), H(12), 'workshop.bench'], [H(12), H(13), 'village.workshopfront'], [H(13), wd === 4 ? H(17, 20) : H(18), 'garage.counter'], [H(17, 20), H(18), 'village.garagefront'], [H(18), H(20), wd === 4 ? 'cafe.stage' : 'village.garagefront']);
  },
  // Radio Willowfall: the morning show 7-9, the booth in the afternoon, the night show from seven; Fridays and Saturdays she plays the Hangar.
  vesna(wd, m) {
    if (wd === 6) return pick(m, [H(11), H(14), 'village.riverside'], [H(14), H(17), 'hill.overlook'], [H(17), H(19), 'village.millbridge'], [H(19), H(21), 'village.bench']);
    return pick(m, [H(7), H(9), 'radio.counter'], [H(12), H(13, 30), 'village.lane'], [H(13, 30), H(17), 'radio.counter'], [H(17), H(18, 30), 'village.millbridge'],
      [H(18, 30), H(19), 'village.radiofront'], [H(19), H(22), wd === 4 || wd === 5 ? 'cafe.stage' : 'radio.counter']);
  },
});
Object.assign(FESTIVAL_SPOTS['village.square'], { pia: 'village.hallfront', lark: 'village.cafefront', noor: 'village.bench', tika: 'village.square', vesna: 'village.memorial' });
Object.assign(FESTIVAL_SPOTS['village.bridge'], { pia: 'village.bench', lark: 'village.river', noor: 'village.riverside', tika: 'village.bridge', vesna: 'village.bridge' });
FESTIVAL_SPOTS['village.lane'] = {
  general: 'village.lane', marrow: 'village.lane', seln: 'village.floristfront', corran: 'village.lane', ruess: 'village.garagefront', oduya: 'village.bakeryfront',
  maris: 'village.lane', vashti: 'village.radiofront', moraine: 'village.tailorfront', kestrel: 'village.lane', mori: 'village.floristfront', yui: 'village.tailorfront',
  calloway: 'village.lane', fenn: 'village.bakeryfront', pia: 'village.tailorfront', lark: 'village.bakeryfront', noor: 'village.floristfront', tika: 'village.radiofront', vesna: 'village.lane',
};

Object.assign(TALK, {
  pia: {
    first: ['Pia Varga. Mend and Make, on the Lane. You are the farmer with the coat that does not fit.', 'Do not apologise. Come in on a weekday and I will take the shoulders in. It hurts me to look at it.'],
    bday: ['You know my birthday. Who told you? It was Lark. Lark tells everyone everything.', '...Thank you. It is well chosen. I am annoyed about how well chosen it is.'],
    b0: [
      'Open nine to five, closed Sundays. If you need a button before nine, you needed it yesterday.',
      ['Every coat on this ring used to be a uniform.', 'I unpick the badges and the rank tape. People sleep better in a coat that never saluted anyone.'],
      'If you shear a sheep, bring me the fleece. Not the sheep. I have had the sheep. Corran thought it was funny.',
    ],
    b1: [
      ['In the siege I ran the parachute loft. Hull patches, stretcher slings, the odd flag.', 'Nine hundred metres of seam in eleven days. My stitches have been very straight since. It is a curse.'],
      'Your hems are better. Somebody has been mending. Do not tell me who; I would only have opinions.',
      'Lark brings me a bun every morning and stands in the doorway until I eat it. I have never once asked for a bun.',
    ],
    b2: [
      ['I keep a quilt of the bits I could not throw away. A sleeve from every coat I unpicked.', 'It is very ugly. I sleep under it every night.'],
      'You do not flinch when I tell you something is wrong. Most people do. It is restful.',
      ['Tika brought me a jacket with a hole burned through both elbows.', 'I asked how. She said science. I charged her double, and then I did not.'],
    ],
    b3: [
      ['I have cut you a pattern. Your measurements, on brown paper, pinned to my wall.', 'It is not sentiment. It is efficiency. ...It is a bit sentiment.'],
      'When the Lane is quiet I listen for your boots. You walk like someone who carried a lot of things a long way. I mend for people like that.',
    ],
    s0: 'Spring. Everyone wants something light and nobody owns anything light. I am sewing summer out of curtains.',
    s1: 'Summer. Nobody wants a coat, so I take the coats apart. It is my favourite season. Do not repeat that to anyone with a coat.',
    s2: "Autumn. Wool season. Bring me your fleeces now and by Year's End half the Lane will be wearing your sheep.",
    s3: 'Winter. I have forty scarves on order and two hands. If you can knit, lie to me and say you cannot.',
    rain: 'Rain. Everyone comes in dripping to have something taken in. I keep a towel by the door and a list of names.',
    snow: 'Snow. Stamp your boots. I mean it. There are pins on this floor that have been waiting for a bare foot since the war.',
    sun: 'Bright day. Good light to thread a needle. I can see every crooked seam on the Lantern Ring, including yours.',
    morning: 'Morning. Do not talk to me before the first cup. Lark is allowed. Lark is weather; the rules do not apply.',
    evening: 'Evening. I am done. The needles are done. If you have a button off, it can stay off until nine.',
    fest: 'A festival. I made half the bunting and none of the clothes are hemmed. I am trying very hard to enjoy myself.',
    year2: ['A whole year, and you have not once come in to have anything made.', 'I have made you something anyway. It is on the peg. Do not argue.'],
    fish: "Fishing line is only thread with ambition. I mend Corran's nets on Sundays. He loses fish through holes I could sew shut asleep.",
    eve: { bloom: ['The Bloom Fair tomorrow. I am showing a wool coat and a cheese. The cheese is Corran\'s; I only made its little cloak.', 'Do not laugh. It is a very good cloak.'], yearsend: "Year's End tomorrow. I have let out the Warden's good dress for the twelfth time. She keeps growing an inch of dignity." },
  },
  lark: {
    first: ["You're the farmer! I knew it, you've got soil in your eyebrows. Lark Penhallow, the Sunrise Oven. Hello, hello!", 'Here, take a bun. No, take two. One for now and one for when you realise how good the first one was.'],
    bday: ["My birthday! You remembered! Nobody remembers, I'm always too busy remembering theirs!", "I'm going to cry into the dough. Don't worry, it's good for the crust. Thank you, Mira."],
    b0: [
      "Oven's on at four, door's open at seven, buns are gone by nine. I'd say come early, but I've seen your field. You already do.",
      ["Closed Mondays. On Mondays I sleep until six. It's decadent. I feel like a queen.", "Don't tell Moraine I said that. She'd want royalties."],
      "The flour comes up the lift from the Middle deck and it's always late. If you ever grow wheat, I'll marry you. That's a joke. Mostly.",
    ],
    b1: [
      ['In the siege I baked for the shelters on a field oven. Burned the furniture to keep it going.', "Half the chairs on the Lantern Ring are new because of me. Nobody's ever sent a bill."],
      "Pia pretends she doesn't want her morning bun. She's had one every day for two years. I count everything that comes out of my oven.",
      "Your honey's in my glaze this week. Don't look so surprised. You think I wouldn't notice the best thing on the Lane?",
    ],
    b2: [
      ["People think I'm always this loud.", "I'm only loud in the morning. By the afternoon I'm tired, and by the evening I'm just a person who smells of bread."],
      ["My gran said bread's a promise. You knead it tonight and it's there in the morning.", 'In the war it was the only promise anyone could keep. So I kept it.'],
      "You're the only person who comes in after the buns are gone. Just to talk. I've noticed. I notice you a lot, actually.",
    ],
    b3: [
      ['I made a loaf with your initials scored on top. Then I panicked and sold it to Corran.', "He ate the M first. I'm choosing to read nothing into that."],
      "When the oven's warming up at four I think about who I'll see that day. You're the first thing I think of. Second's the buns. Don't tell the buns.",
    ],
    s0: "Spring! Everything I bake is suddenly green. Snap peas, herbs, Noor's violets on the cakes. I'm a woman possessed.",
    s1: 'Summer. The bakery is a furnace by noon, so I bake at three and sleep through the worst of it. Melon tart on Saturdays!',
    s2: "Autumn's the best. Pumpkin, cranberry, honey. The whole Lane smells like my oven, which is to say, like me.",
    s3: "Winter, and everyone wants something warm in their pocket. I make the buns a bit bigger. Don't tell Marrow, she calls it inflation.",
    rain: "Rain! Bread loves a damp day. Rises like it's got somewhere to be. I wish I did.",
    snow: "Snow on the Lane! I put a tray of buns out to cool and three walked off. Very small footprints. I'm not angry.",
    sun: 'Lovely bright morning. I watched the sun-line come up over the Lane at half five. I always do. Best bit of my day, apart from the buns.',
    morning: "Good morning! Fresh out. Mind your fingers, it's hot. Mind your heart, it's cinnamon.",
    evening: "Evening already? I've been up since four. I'm running on crumbs and goodwill. Mostly crumbs. Bed by half seven!",
    fest: "A festival! I've baked three hundred buns and I'm going to eat at least one of them. Possibly six.",
    year2: ['A year since you first came in covered in mud asking whether bread could be had on credit.', "You still owe me eleven credits. I'm keeping it. It's the start of a beautiful tab."],
    fish: "I can't fish. I talk too much and the fish leave. Vesna says I could empty a lake just by describing my morning.",
    eve: { bloom: 'Bloom Fair tomorrow! I am doing a honey cake with real flowers on it. Noor says the flowers are edible. Noor also eats bark.', harvest: "Harvest Fair tomorrow. I'm entering a loaf shaped like Corran. It's a tribute. He doesn't know yet." },
  },
  noor: {
    first: ['You are standing on a seedling. ...No, the other foot. Thank you. Noor Asante. The Seedhouse.', 'I revive Earth seeds that were sealed before the fall. Most of them are sulking. You are a farmer. You may be useful.'],
    bday: ['This is a gift. For my birthday. I had forgotten it was my birthday. I was repotting.', '...Thank you. I shall put it where the light is good. That is the highest compliment I know how to pay.'],
    b0: [
      'Open nine to five. Closed Tuesdays, when I walk the hill terraces and count what survived the week. It is usually more than I expected.',
      ['Every seed in that drawer was sealed by someone who thought they would be back for it.', 'They were not. So I am. It seemed only polite.'],
      'Do not buy me a bouquet. I know what happens to cut flowers. I do it to them. It is my job, and I have made my peace with it.',
    ],
    b1: [
      ['The cabbage line took four years. Four. It did not want to wake up.', 'I sang to it in the end. Do not tell anyone. It worked, which is worse.'],
      'Your bees visit my trial beds. I can tell by the pollen on the tulips. I am not complaining. I am taking notes.',
      'Lark brings me buns and I forget to eat them, and then I find them at the bottom of a seed tray and they have grown something. Science.',
    ],
    b2: [
      ['I am told I am bad with people.', 'I am only bad with people who will not hold still and tell me what they need. Plants always tell you. So do you. You are easy.'],
      ["On the founders' ship the seed vault was the one thing they never rationed.", 'They went hungry rather than eat it. I think about that whenever someone calls me fussy.'],
      'I have named a sunflower after you. It is the one that leans furthest towards the sun-line and will not be told.',
    ],
    b3: [
      ["There is a seed in my desk I have never sown. A rose, from my grandmother's garden on Earth.", 'I keep waiting for a place good enough. I think it might be your farm. I am not asking yet. I am only thinking aloud.'],
      'You are the only person whose visits I write in the notebook. Under weather. You are a sort of weather.',
    ],
    s0: 'Spring. Germination season. I have four hundred trays going and I can hear every one of them thinking.',
    s1: 'Summer. The sunflowers are taller than the Constable. He measured. He was very gracious about it.',
    s2: 'Autumn. Seed-saving. I go through every bed with paper envelopes and the patience of a saint. I do not have it. I fake it.',
    s3: 'Winter. Kale and snowbells and nothing else, and the bees asleep. I miss the noise. I would never say so to a bee.',
    rain: 'Rain. Good. I can stop carrying water and start carrying notebooks.',
    snow: 'Snow. The snowbells are out. Look at them properly. Bred on a ship that never saw winter, and they still knew what to do.',
    sun: 'Clear sun-line. Ideal. I have opened every vent in the Seedhouse and shut my door to people. You are not people. Come in.',
    morning: 'Morning. I have watered the trial beds, talked to the leeks and lost an argument with a tulip. A full day already.',
    evening: 'Evening. Plants close up at dusk. So do I. Say what you came to say; I am folding.',
    fest: 'A festival. Crowds. I have brought a seed packet to hold, so my hands have something to do.',
    year2: ['A year of your farm. I have a page on it. Soil, yields, what you plant when.', 'You have improved. I underline improvement. You have a great deal of underlining.'],
    fish: 'Fish are of no interest to me. Pond weed is fascinating. If you catch anything with weed on it, bring me the weed.',
    eve: { bloom: ['The Bloom Fair tomorrow. I am judging the flowers. I have been asked to be kind.', 'I have been asked by Marrow, twice. I shall try. I shall be accurate first.'], planting: 'Planting Day tomorrow. Seln\'s seed is good. Mine is older and angrier. I bring both.' },
  },
  tika: {
    first: ["Oh! Hi! You're Sato! The Sato! I'm Tika, Ruess's apprentice. I've read every report you ever filed, the boring ones too!", "Sorry. Sorry. There's grease on my hand. There's grease on yours now. That's how you know we've met."],
    bday: ["It's my birthday and you got me something? I got myself a torque wrench. You beat a torque wrench.", "It's going on the good shelf over my bench. Thank you, Captain! Farmer! Sato!"],
    b0: [
      "Mornings I'm at the Workshop learning from the Professor. Afternoons I run the garage on the Lane. Closed Wednesdays and Sundays. Even geniuses sleep.",
      ['The Professor says I talk too fast. I say he listens too slow.', "We've agreed to disagree. He's agreed. I'm still disagreeing."],
      'I build things for farms. Cheese presses, spinning wheels. If it has a crank, I can make it worse and then better.',
    ],
    b1: [
      ['I grew up on the Middle deck. In the war I was fourteen and I fixed rescue drones in a cupboard.', "Nobody knew I was fourteen. I wore a big coat. The drones didn't mind."],
      "Your spinning wheel squeaks on the upstroke. That's not a fault, that's a personality. I'm not fixing it. Okay, I'll fix it.",
      "Pia sewed patches on my elbows and called me a disgrace. Then she sewed little stars on the patches. She's soft. Don't tell her I know.",
    ],
    b2: [
      ['The Professor gave me his old goggles. The ones from the carrier.', 'He said he did not need them. He did. He wanted me to have them. I wear them every day and pretend I do not know.'],
      "Sometimes I take a thing apart just to see if I can put it back. When I can't, I come and look at your field. Your field always goes back together.",
      ["Everyone thinks I'm not scared of anything.", "I'm scared of being in the way. That's why I'm always fixing things. You can't be in the way if you're useful."],
    ],
    b3: [
      ["I'm building you something. I won't say what. It has gears.", "Possibly too many gears. It's friendship, but for engineering. Shush, I know what I said."],
      'You never once told me to slow down. I noticed. I am still fast. But around you I feel like I could stop, if I wanted.',
    ],
    s0: "Spring! Every bot on the Lantern Ring comes in for a service at once, like they planned it. They planned it. I've read their logs.",
    s1: "Summer. The garage is an oven. Lark keeps saying hers is hotter. It isn't. I measured. She's very competitive about ovens.",
    s2: 'Autumn. Harvest means every machine on the deck breaks at once. My favourite. I sleep in the garage. I bring a pillow.',
    s3: 'Winter. Cold metal bites. Two pairs of gloves and I still lose a fingertip of feeling. Worth it. Look at this carburettor.',
    rain: "Rain! Everything rusts. Everyone needs me. I'm sorry, I'm happy about it, I'm a terrible person.",
    snow: 'Snow! I put skis on a Field-unit. It went very fast in one direction. The Professor has asked me not to do it again.',
    sun: "Sunny! Good light for welding. Don't look at the arc. I mean it. Don't look at it even if I do.",
    morning: "Morning! I've been at the bench since seven. The Professor says that's late. He's been there since the war.",
    evening: "Evening! Fridays I go and hear Vesna play at the Hangar. She's terrible at guitar. She's amazing. Both!",
    fest: "Festival! I fixed the lights. Nobody's thanked me. That's how you know they're working.",
    year2: ["A whole year! The Professor says I'm almost competent. That's the best thing he's ever said to anyone!", "...Except you. He says you're competent. Full stop. I'm a bit jealous."],
    fish: "I built a fishing reel with a motor once. It caught Corran's hat. From the riverbank. While he was wearing it.",
    eve: { bloom: "Bloom Fair tomorrow! I'm running the radio cable to the Lane so Vesna can broadcast it. If it all goes quiet, it was a squirrel.", yearsend: "Year's End tomorrow! I'm in charge of the window shutters. They'll open at midnight. Probably. Ninety percent." },
  },
  vesna: {
    first: ["Well. If it isn't the captain who grows turnips. I've talked about you on air. Twice. Don't be flattered; it was a slow week.", 'Vesna Kade. The voice on your radio at seven, and the one keeping you up at ten. Pleasure, farmer.'],
    bday: ['A present? On my birthday? Careful. I might have to dedicate a song to you, and then everyone will talk.', "...They'll talk anyway. Thank you, Mira. Really."],
    b0: [
      "Morning show seven till nine, the booth in the afternoon, night show from seven. Fridays and Saturdays I play the Hangar. Sundays I'm a rumour.",
      ['You can request a song at the station. One a week.', "Scarcity is what makes it romantic. That, and my voice."],
      "I never read bad news on air any more. If something's sad, Marrow can pin it to a board. My frequency is for weather, recipes and people in love.",
    ],
    b1: [
      ['In the siege I read the lists. Every night at nine, the names.', "Then one morning I read the all-clear. Nobody remembers who read the lists. Everybody remembers the all-clear. That's right."],
      "Lark calls the morning show every single day to say good morning. To me. On my own show. I keep her on. The listeners adore her.",
      'Tika rewired my desk so the microphone sounds like velvet. Then she rewired it so it sounds like a duck. She is still not sure which she meant.',
    ],
    b2: [
      ["I'm good at talking to everyone at once.", "One person at a time is harder. You're one person. I'm practising."],
      'When you come into the station I stop talking. Have you noticed? Ask anyone on the Lane. Dr. Mori wants to write it up.',
      ['My mother sang. The most beautiful voice on the Middle deck.', "I don't sing like her. I sing like somebody trying to remember how she did it."],
    ],
    b3: [
      ['I wrote a song. It is about a farmer who used to be a captain and still walks like one.', "It's very bad. It's the best thing I've written. I'll play it when you're not in the room."],
      'I leave the station light on after the night show now. In case somebody walks past and wants to say goodnight. Somebody specific.',
    ],
    s0: "Spring. I do the planting report on the morning show. I know nothing about planting. I read out what Noor tells me and add drama.",
    s1: "Summer. Windows open, radio up, the whole Lane singing along to the night show. Badly. I've never been happier.",
    s2: 'Autumn. Long dusk, low light. Best season for slow songs, and for people requesting slow songs. Hint.',
    s3: 'Winter. I play the night show into the snow. I like to think it settles on the music. Physics disagrees. Physics can get its own show.',
    rain: "Rain. Radio weather. Everyone's in, everyone's listening. I could say anything. I've decided to be kind.",
    snow: "Snow. I just did the weather. I said 'snow'. Then I played four songs about snow. I am a professional.",
    sun: "Clear sun-line. Bright. Too bright. I'm a night creature, farmer. Lend me your hat.",
    morning: "Morning. I've been on air since seven and I've already told Willowfall three lies about the weather. Two came true.",
    evening: "Evening. Best hours of the day. Everyone's tired and honest. Stay and listen? I'll play something with a farmer in it.",
    fest: "Festival! I'm broadcasting live. If I go quiet, it's because I've stopped to eat something Lark made.",
    year2: ["A year of you on my frequency. I've counted. You've been in four hundred and twelve of my sentences.", "That's more than the weather. The weather is furious."],
    fish: "I've never caught a fish. I've caught Corran telling the same fish story on air nine times. The fish grows every time.",
    eve: { bloom: ['Bloom Fair tomorrow. I am calling it live from Lane Square. Pray for Tika\'s cable.', "If it rains I'm calling it from under Pia's awning, and she's charging me rent."], lantern: "Lantern Night tomorrow. I go off air at six. One night a year the radio stays quiet. Some things don't need a voice." },
  },
});
Object.assign(GIFT, {
  pia: { loved: 'Oh. This is... well. This is excellent. I have no criticism. Write the date down; it will not happen again.', liked: 'Good. Useful. Thank you. I can tell you chose it, which is the main thing.', neutral: 'Thank you. I shall find a use for it. I find a use for everything. It is an affliction.', disliked: 'Ah. No. I will pass it on to someone who will not have to look at it every day.', bday: 'And on my birthday. ' },
  lark: { loved: "Oh, Mira! That's going straight in a recipe. Or I'm keeping it forever. Both! I'm doing both!", liked: "Ooh, lovely! Thank you! I'm going to tell everyone you gave me this.", neutral: "Thank you! I'll find a use for it. Probably as a doorstop for the oven. A very honoured doorstop.", disliked: "Oh. Ha. Well. It's the thought, isn't it? I'm going to concentrate very hard on the thought.", bday: 'On my birthday! ' },
  noor: { loved: 'This is... precisely right. I have no notes. I always have notes. Thank you, Mira.', liked: 'Good. Thank you. I will make use of it, which is how I say I like things.', neutral: 'Thank you. I will put it with the other things. I have a drawer for things.', disliked: 'You cut it, or dug it up, or ended it in some way. I appreciate the gesture. I am in mourning.', bday: 'For my birthday. ' },
  tika: { loved: "WHAT! For me? Are you serious? This is going on the good shelf! The GOOD shelf!", liked: "Ooh, nice! I can use this. Or take it apart. Is that all right? I'll put it back.", neutral: "Thanks! I'll find a use for it. I find a use for everything. Even the Professor's old socks.", disliked: "Oh. Um. Thank you? I'll keep it somewhere safe. Somewhere a long way from me.", bday: 'And for my birthday! ' },
  vesna: { loved: "Well, now. You've gone and done it. I'm going to have to dedicate the whole night show to you.", liked: "Thank you, farmer. That's a good one. I'll mention it on air. Anonymously. Badly anonymously.", neutral: "That's sweet. I'll put it on the console. It'll be the most interesting thing there.", disliked: "Ah. I'm going to say thank you in my radio voice, and you'll never know what I really think.", bday: 'For my birthday? ' },
});

EVENTS.push(
  // ---- Pia: the parachute loft, and the quilt of sleeves.
  {
    id: 'pia3', npc: 'pia', hearts: 3, map: 'tailor', from: H(9), to: H(17),
    lines: [
      L('narrator', "In Varga's Mend & Make, Pia has Sato standing on a crate in her old captain's coat, with a mouthful of pins and an expression of deep professional grief."),
      L('pia', 'Arms out. Further. Who cut this? No, do not tell me. I will only want to find them.'),
      L('sato', 'Fleet stores. It was cut for whoever came next in the queue.'),
      L('pia', 'It shows. You have been wearing someone else\'s shoulders for eleven years.'),
      L('narrator', 'She unpicks the rank tape from the cuffs in two neat pulls, and rolls it, and puts it in a tin with a great many others.'),
      L('pia', 'In the siege I ran the parachute loft. Hull patches. Stretcher slings. The flag over the gate, twice, because it kept getting shot.'),
      L('sato', 'I remember that flag. Somebody kept sewing it back up overnight. We thought it was a sort of miracle.'),
      L('pia', 'It was me and a lamp and very bad language. Hold still. There. Now it is a coat that belongs to a farmer.'),
      L('pia', 'Take this as well. Yarn, from the first fleece I ever bought on the Lane. Make something crooked with it. It will be good for you.'),
    ],
    reward: { love: 3, item: ['yarn', 1] },
  },
  {
    id: 'pia7', npc: 'pia', hearts: 7, map: 'village', weekday: 6, from: H(10), to: H(12),
    lines: [
      L('narrator', 'Sunday at the ranch gate. Pia is sitting on a feed sack with a quilt across her knees: a patchwork of a hundred different sleeves, every one a different uniform.'),
      L('pia', 'Corran wanted to see it. He has found his old battery\'s colours in it, and gone to stand behind the barn for a while.'),
      L('sato', 'Every coat you unpicked.'),
      L('pia', 'One sleeve each. I could not throw them away. People came in wanting to forget, and I let them, and I kept the forgetting here.'),
      L('pia', 'It is very ugly. I know. I sleep under it every night. It is the warmest thing I own.'),
      L('narrator', 'She turns a corner of it over. In the last square, not yet sewn in, is a piece of navy cloth with a captain\'s braid.'),
      L('sato', 'That is from my coat.'),
      L('pia', 'I asked you whether I might keep the cuffs. You said yes without looking. I have learned that you say yes without looking to people you trust.'),
      L('pia', 'Here. Do not make a speech. It is a scarf. I knitted it from your yarn while you were not watching, which is the only way I can give anyone anything.'),
    ],
    reward: { love: 5, item: ['yarn_scarf', 1] },
  },
  // ---- Lark: the field oven, the Monday off, the late flour.
  {
    id: 'lark3', npc: 'lark', hearts: 3, map: 'bakery', from: H(7), to: H(15),
    lines: [
      L('narrator', 'The Sunrise Oven is warm as a held breath. Lark is floured to the elbows and has, somehow, flour in one eyebrow and none in the other.'),
      L('lark', 'Mira! Perfect timing. Hold this tray. No, flat. Flat like the deck. You were a captain, you know what flat is.'),
      L('sato', 'You have been up since four.'),
      L('lark', 'Three, today. There was a nice dough and it wanted company.'),
      L('narrator', 'Over the ovens hangs a blackened iron door with a brass handle, screwed to the wall like a painting.'),
      L('lark', 'That was my field oven, in the siege. Shelter nine. I burned the furniture to keep it lit. Chairs, mostly. One very good piano. I still feel bad about the piano.'),
      L('sato', 'Nine fed the gate crews. I ate that bread. It was the only warm thing on the gate for a week.'),
      L('lark', '...You ate my bread? On the gate? Oh, I am going to cry into the dough again. Take these, quick, before I do. And come back tomorrow. Every tomorrow.'),
    ],
    reward: { love: 3, item: ['sun_bun', 3] },
  },
  {
    id: 'lark5', npc: 'lark', hearts: 5, map: 'village', weekday: 0, from: H(9), to: H(11),
    lines: [
      L('narrator', 'Monday, the riverbank. Lark is lying flat on the grass in a borrowed sun hat, not doing anything at all, very determinedly.'),
      L('lark', 'Shh. I am having a day off. I am told this is what it looks like. It is very boring. I love it.'),
      L('sato', 'May I join you?'),
      L('lark', 'You may lie down. No talking about bread. Or flour. Or the delivery from the Middle deck, which is late, which I am not thinking about.'),
      L('narrator', 'They lie in the grass and watch the far side of the ring turn slowly overhead. Lark lasts nearly four minutes.'),
      L('lark', 'My gran baked in the Lower deck kitchens before the war. She said bread is a promise. You knead it tonight and it keeps its word in the morning.'),
      L('lark', 'When everything was burning, I thought, well, I can keep one promise. So I did. Every morning. I sort of forgot how to stop.'),
      L('sato', 'You do not have to stop. Only come and lie in the grass on Mondays. I will hold you to it.'),
      L('lark', 'Deal. I brought a honey cake, by the way. For later. It is my day off, and I was bored.'),
    ],
    reward: { love: 4, item: ['honey_cake', 1] },
  },
  {
    id: 'lark7', npc: 'lark', hearts: 7, map: 'bakery', from: H(16, 30), to: H(18),
    lines: [
      L('narrator', 'Late afternoon. The bakery is dim, the ovens ticking as they cool. Lark is sitting on a flour sack with an empty one in her lap, very quiet for once.'),
      L('lark', 'The flour did not come. Third week. The Middle deck mill has a broken roller and nobody to fix it.'),
      L('lark', 'I have enough for tomorrow. Then nothing. Seven hundred people on this ring have had a bun from me every morning since the war ended.'),
      L('sato', 'Tika can fix a roller. Ruess can fix anything Tika cannot. I will ride the lift down with them at six.'),
      L('lark', '...You would do that? For buns?'),
      L('sato', 'For the woman who kept a promise every morning while the gate burned. The buns are a happy side effect.'),
      L('narrator', 'Lark laughs, and wipes her face with a floury hand, and leaves a white stripe across her cheek like war paint.'),
      L('lark', 'You are a very difficult person to stay loud around, Mira Sato. Here. Take a loaf home. It is the last of the good flour, and I want you to have it.'),
    ],
    reward: { love: 5, item: ['bread', 3] },
  },
  // ---- Noor: the cabbage that would not wake, and the rose.
  {
    id: 'noor3', npc: 'noor', hearts: 3, map: 'florist', from: H(9), to: H(17),
    lines: [
      L('narrator', 'The Seedhouse smells of wet soil and green leaves. Noor is standing over a single tray of seedlings with a hand lens, absolutely still.'),
      L('noor', 'Do not breathe on them. You may breathe near them. Mira. Look.'),
      L('sato', 'They are cabbages.'),
      L('noor', 'They are an Earth cabbage line, sealed in a founders\' drawer two hundred years ago. Four years I tried. They would not wake.'),
      L('noor', 'Last month I sang to them. I have no voice. I sang anyway. Vesna says I should never tell anyone. You are not anyone; you are a farmer.'),
      L('sato', 'What did you sing?'),
      L('noor', 'The only song I know. A planting song my grandmother sang on Earth. Two hundred years, and they still knew the tune.'),
      L('narrator', 'She looks at the tray as if it might say something back. Perhaps, Sato thinks, it already has.'),
      L('noor', 'Here. Seed from the first ones. Grow them properly. I shall be checking. I shall be checking a great deal.'),
    ],
    reward: { love: 3, item: ['seed_cabbage', 1] },
  },
  {
    id: 'noor7', npc: 'noor', hearts: 7, map: 'hill', weekday: 1, from: H(9), to: H(13),
    lines: [
      L('narrator', 'Tuesday, on the orchard terraces. Noor is kneeling at the end of a row, a paper envelope in her hand, not writing anything in her notebook for once.'),
      L('noor', 'Mira. Sit. This is the envelope I told you about. The one I have never opened.'),
      L('noor', 'A rose. From my grandmother\'s garden, before the fall. She sent it up with my mother. My mother sent it up with me.'),
      L('sato', 'And you have been waiting for somewhere good enough.'),
      L('noor', 'Everywhere I find, something is wrong. The soil. The light. A Constable measuring the sunflowers.'),
      L('noor', 'I think I have been waiting for somewhere I would not mind failing. That is harder to find than good soil.'),
      L('sato', 'Plant it on my farm. If it fails we will dig it up and try again. Nobody will write it in a notebook.'),
      L('noor', '...I will write it in a notebook. But I will write it kindly. Yes. Spring, by your porch. Take these meanwhile; the bees will want something to do.'),
    ],
    reward: { love: 5, item: ['seed_tulip', 2] },
  },
  // ---- Tika: the cheese press that exploded, and the goggles.
  {
    id: 'tika3', npc: 'tika', hearts: 3, map: 'garage', from: H(13), to: H(18),
    lines: [
      L('narrator', "Brandt's Garage. There is a dent in the ceiling the exact shape of a cheese press, and Tika is underneath it with a clipboard and a very bright smile."),
      L('tika', 'Sato! Hi! Don\'t look up. There\'s nothing up there. Okay, there\'s a dent. It\'s a good dent. It\'s data.'),
      L('sato', 'Was that my cheese press?'),
      L('tika', 'It was the prototype of your cheese press! The real one is perfectly safe! Ninety-eight percent! I took the extra spring out!'),
      L('narrator', 'Behind her, the wall is papered with drawings: drones, a milker that sings, and a careful sketch of Ruess with a cartoon storm cloud over his head.'),
      L('tika', 'The Professor says I think with my hands first and my head second. I said at least I think twice. He laughed. Out loud. Nobody has ever heard him do that.'),
      L('sato', 'I have. Once, on the carrier, when a junior engineer told him his own drive was over-built. She was right, too.'),
      L('tika', 'He told me about her! He said she was the best he ever had. ...Wait. Wait, was that YOU? No. It was. Okay, I need to sit down. Take this for the press. Testing fee.'),
    ],
    reward: { love: 3, money: 150 },
  },
  {
    id: 'tika7', npc: 'tika', hearts: 7, map: 'hill', weekday: 2, from: H(10), to: H(13),
    lines: [
      L('narrator', 'Wednesday at the foot of the orbital elevator. Ruess and Tika are under the cable car with their legs sticking out, arguing about a bolt.'),
      L('ruess', 'Clockwise. It has been clockwise since before you were born.'),
      L('tika', 'It is a left-hand thread, Professor. Look. LOOK. ...Ha!'),
      L('ruess', 'Hm. So it is. Sato, you saw nothing. Tika, you will not mention this to the Warden, the canteen or the radio.'),
      L('narrator', 'He goes off muttering to fetch a longer spanner. Tika sits up, pushes her goggles onto her forehead, and grins at nothing.'),
      L('tika', 'These were his. From the carrier. He gave them to me on my first day and said he had a spare pair. He didn\'t. I checked. He squints now.'),
      L('sato', 'He gave you the thing he was proudest of. He does not know how else to say it.'),
      L('tika', 'I know. I know. I just like hearing somebody else say it out loud. ...Don\'t tell him I cried on the cable car. Here. Copper. For your machines. I owe you about a hundred.'),
    ],
    reward: { love: 5, item: ['copper', 2] },
  },
  // ---- Vesna: on air, the Hangar stage, the lists.
  {
    id: 'vesna3', npc: 'vesna', hearts: 3, map: 'radio', from: H(13, 30), to: H(17),
    lines: [
      L('narrator', 'Radio Willowfall is one warm room of records, cables and a red ON AIR lamp. Vesna waves Sato in without taking her eyes off the board.'),
      L('vesna', '...and that was the weather, which is to say, the weather is fine. And look who has walked in. Willowfall, say hello to your farmer.'),
      L('sato', 'Am I on the radio?'),
      L('vesna', 'You are on the radio. Say something farmerish. The Middle deck is listening. Possibly. Tika\'s cable is a philosophy more than a fact.'),
      L('sato', 'Water your seedlings in the morning. Shut the gate. And Corran, the hens are on the bridge again.'),
      L('narrator', 'Somewhere outside, very faintly, there is a roar of laughter from the ranch.'),
      L('vesna', 'A natural. You have a voice people would follow somewhere bad. Luckily you only use it for hens.'),
      L('vesna', 'Here. A record from the crates, for your trouble. Old-world dance music. Play it in the barn. Cows like a waltz; I have it on good authority.'),
    ],
    reward: { love: 3, item: ['record', 1] },
  },
  {
    id: 'vesna5', npc: 'vesna', hearts: 5, map: 'cafe', weekday: 4, from: H(19), to: H(22),
    lines: [
      L('narrator', 'Friday night at the Hangar. The tables are pushed back. Vesna sits on a stool in the corner with a battered guitar, tuning it as if it had personally wronged her.'),
      L('vesna', 'This one is new. Be gentle. It is about a farm. Any resemblance to a real farm is entirely your own fault.'),
      L('narrator', 'Halfway through the second verse her voice catches on a high note and does not come back. The room goes very still.'),
      L('sato', '...Up the terrace road, where the sun-line falls.'),
      L('narrator', 'Sato sings the line, flat and rough, from the back of the room. Vesna stares at her, and laughs, and picks it up again, and finishes it.'),
      L('vesna', 'You were not supposed to know the words. I only played it on the night show. Once. At eleven.'),
      L('sato', 'I listen to the night show. I listen to all of it. I have for a while.'),
      L('vesna', '...Well. Now I have to write a better song. Thanks for nothing, farmer. Stay till close? I owe you a drink, and an apology for the high note.'),
    ],
    reward: { love: 4 },
  },
  {
    id: 'vesna7', npc: 'vesna', hearts: 7, map: 'village', weekday: 6, from: H(17), to: H(19),
    lines: [
      L('narrator', 'Sunday evening on the Mill Bridge. Vesna leans on the rail without her headphones, which makes her look oddly unguarded, like a lamp without its shade.'),
      L('vesna', 'Every night in the siege at nine, I read the names. Whoever we had lost that day. In this voice. The one that is supposed to make you feel better.'),
      L('vesna', 'Two hundred and six nights. I never got one wrong. I practised them all afternoon so I would not.'),
      L('sato', 'I heard you. On the gate. We used to stop for it. We took our helmets off.'),
      L('vesna', '...You did? I always thought I was reading into nothing. Into the dark. That nobody could bear to listen.'),
      L('sato', 'Everybody listened. It was the only time anyone said their names aloud. It mattered that it was a kind voice.'),
      L('narrator', 'Vesna does not say anything for a long moment. Then she takes something small out of her pocket and puts it in Sato\'s hand.'),
      L('vesna', 'My mother\'s music box. It plays the all-clear, if you wind it slowly. I want somebody who heard the lists to have it. Do not argue. I will cry on the radio.'),
    ],
    reward: { love: 5, item: ['musicbox', 1] },
  },
);

ROMANCE.candidates.push('lark', 'vesna');
Object.assign(ROMANCE.people, {
  lark: {
    confess: [
      L('narrator', 'Four in the morning. The Lane is dark but for one window. Sato has come to help with the dough, as she has most mornings lately, and Lark is not kneading.'),
      L('lark', 'I scored a loaf with your initials. Again. Then I could not sell it to Corran. So I baked another, and another.'),
      L('narrator', 'On the board are six loaves, each one scored with an M and an S, in steadily worse handwriting.'),
      L('sato', 'Lark.'),
      L('lark', 'I am loud all day so nobody hears the quiet bit. The quiet bit is you. Every morning it is you. I would like to stop baking it into bread and just say it.'),
      L('sato', 'Then say it. I have been eating my initials for a month. I am running out of room.'),
      L('lark', 'I love you, Mira Sato. You keep showing up at four in the morning. Nobody shows up at four in the morning for buns.'),
      L('sato', 'I do not come for the buns. I come because it is the best hour of my day, and you are in it.'),
      L('lark', 'Oh, I am going to cry into the dough. I am actually doing it. Hold me before I ruin the batch.'),
      L('narrator', 'The oven warms, the loaves rise, and by the time the sun-line comes up over the Lane the two of them are sitting on the step with one bun between them, not hurrying at all.'),
    ],
    propose: [
      L('narrator', 'Seven sharp. The first customers are queuing outside. Sato is behind the counter, which she has never been, holding a bun with something baked into the middle.'),
      L('lark', 'You are behind my counter. Nobody is behind my counter. What is in that bun?'),
      L('sato', 'A pendant. Hull-glass, with Earth\'s light in it. On Eden you give it to the person you want at your table. I thought you would look in a bun before you looked anywhere else.'),
      L('narrator', 'Lark breaks the bun open. The pendant shines through the crumb like a tiny morning.'),
      L('lark', 'You baked it. You BAKED it. You cannot bake. You burned toast in the Hangar last week and Oduya had to open a window.'),
      L('sato', 'I burned four. This was the fifth. I am asking whether you will have a farmer who cannot bake, every morning, for good.'),
      L('lark', 'Yes. Yes! Every morning. I will teach you to bake and you will be terrible and I will not mind at all.'),
      L('narrator', 'Outside, the queue has been watching through the window. Somebody starts clapping. It is Pia, who will later deny it.'),
      L('lark', 'Free buns! Everyone! Free buns today! Mira, help me, I cannot see the till for crying.'),
    ],
    wedding: [
      L('narrator', 'The square smells of warm bread. Lark has baked her own wedding cake, three tiers of honey cake with flowers on top, and is refusing to let anyone else cut it.'),
      L('marrow', 'Lark Penhallow. You fed this village through a siege with a field oven and a stack of chairs. Today we feed you.'),
      L('pia', 'I made the dress. If anybody spills honey on it I will know, and I will remember, and I will be at your door with a needle.'),
      L('vesna', 'Live from Lantern Square: the baker is crying, the farmer is not, and the cake is magnificent. More at eleven.'),
      L('lark', 'I promise you warm bread every morning, a loud house every day, and to be quiet with you whenever you need it. Mostly.'),
      L('sato', 'I promise to be up at four with you. And to burn the toast, so you always have something to forgive me for.'),
      L('calloway', 'A blessing, from the church: may your oven stay lit, your table stay full, and your mornings always begin with each other.'),
      L('marrow', 'It is written. Now somebody cut that cake before she does it herself.'),
      L('narrator', 'The whole village eats honey cake standing up in the square, and the bees from the farm come to see what all the fuss is about.'),
    ],
    partnerTalk: [
      'I baked at the farm today. Your oven is terrible. I love it. It has character, and by character I mean a draught.',
      'The hens have decided I am their queen. I fed them crusts. That is all it takes. Write that down.',
      'You came home smelling of soil and I smelled of bread and the whole house smelled like a sandwich. Perfect.',
      'I closed the bakery an hour early to watch you water. Do not tell the Lane. They will riot.',
      'I tried a day off at home. I baked four things before ten. I do not think I understand days off.',
      'Pia came for supper and said our kitchen is a disgrace. Then she stayed three hours. That means she loves us.',
      'I put honey from your hives in the morning buns. The whole Lane asked what was different. I said love. They laughed. It is not a joke.',
      'I sleep better here. The farm is quiet. Too quiet, so I talk. You do not seem to mind.',
      'Your initials on every loaf, still. I could not stop if I tried. Ours, now. M and L.',
      'Come in before the light goes. There is soup, and there is bread, and there is me, in that order of excitement.',
    ],
    morning: [
      'Good morning! I have been up since four. You have been up since five. We are a terrible influence on each other.',
      'Bun, before you go out. Not optional. Eat it on the step, I want to watch you.',
      'Morning, Mira. The kettle is on and the oven is on and I am on. Very on.',
      'I warmed your boots by the oven. Do not ask how long I have been up.',
    ],
    sweetTalk: [
      'I keep looking at the door at four in the morning. You have ruined the best hour of my day by making it better.',
      'I scored a little heart on your bun. Just yours. If anyone asks, it was an accident with the knife.',
      'Pia says I smile at the dough now. I have always smiled at the dough. I smile at it differently.',
      'Come by after close? I will save you the last loaf. I always save it now. I have stopped pretending it is for anyone else.',
    ],
    decline: 'Oh, Mira... not yet. Ask me again a little later, when I can look at you without dropping a tray. Soon. I promise. I keep promises.',
  },
  vesna: {
    confess: [
      L('narrator', 'Eleven at night. The night show is almost over. Sato is the only person left in Radio Willowfall, on the sofa by the record shelves, listening.'),
      L('vesna', '...and that is the end of the night show. Except for one more. This is a request. It is from me. It is for someone who is in the room.'),
      L('narrator', 'She takes off her headphones and picks up the guitar. It is the farm song, finished at last, and this time her voice does not catch.'),
      L('vesna', 'I have said ten thousand words on air about everybody on this ring. I have never once said the true thing about myself. So.'),
      L('vesna', 'I am in love with you, farmer. It is ridiculous. I talk for a living and I cannot find a better way to say it.'),
      L('sato', 'You found the best way. You said it with the ON AIR light still lit.'),
      L('vesna', '...Oh, no. Oh, I did. The whole Lantern Ring heard that. Lark heard that. Lark is going to be unbearable.'),
      L('sato', 'Then we had better give them something to talk about. Turn it off. Walk me to the bridge.'),
      L('vesna', 'Yes. Yes, all right. I am leaving the light on in the window. In case somebody wants to say goodnight. Somebody specific.'),
      L('narrator', 'They walk to the Mill Bridge in the dark, and the radios in every window along the Lane hiss softly with nothing at all, and nobody turns them off.'),
    ],
    propose: [
      L('narrator', 'Seven in the morning. The morning show. Vesna is reading the weather in her bright voice when Sato walks into the booth and sits down at the guest microphone.'),
      L('vesna', '...and here is the farmer, without an appointment. Good morning, farmer. Have you come to tell Willowfall about turnips?'),
      L('sato', 'No. I have brought a pendant. Hull-glass, with Earth\'s light in it. On Eden you give it to the person you want at your table, every day.'),
      L('narrator', 'Vesna stares at the pendant, then at the ON AIR lamp, then at Sato. For the first time in her career, there is dead air.'),
      L('sato', 'You said once that you were better at everyone than at one person. I am one person. I am asking whether you would like to practise for the rest of your life.'),
      L('vesna', 'You are proposing to me on my own show.'),
      L('sato', 'You confessed to me on it. I thought it only fair.'),
      L('vesna', 'Yes. Willowfall, the answer is yes. That concludes the morning show. I am going to go and be extremely happy where none of you can hear it.'),
      L('narrator', 'She forgets to switch the microphone off. The whole ring hears her laugh, and then cry, and then laugh again, and then a door closing.'),
    ],
    wedding: [
      L('narrator', 'Lantern Square, and a radio on every windowsill. Tika has wired the whole Lane so that the wedding goes out live, to anyone on Eden who wants to hear it.'),
      L('marrow', 'Vesna Kade. You read us the hardest words of the war, and then the best ones. Today you get to hear some.'),
      L('tika', 'Cable holding! Microphones on! If anything pops, it was not the cable!'),
      L('lark', 'I am not crying. I am live on air. I am crying on air. Hello, Middle deck.'),
      L('vesna', 'I promise you a house full of music, the night show on low while you sleep, and to say the true thing to you first, before I say it to anyone else.'),
      L('sato', 'I promise to listen to all of it. Every show. Every song. Even the bad ones at eleven.'),
      L('calloway', 'From the church, a blessing: may your house always have a song in it, and may the quiet between them be the best part.'),
      L('marrow', 'It is written. Somebody play something. Not you, Vesna; you are busy.'),
      L('narrator', 'Somebody plays a waltz on a salvaged record, and the farmer and the radio host dance badly in the middle of the square while the whole ring listens.'),
    ],
    partnerTalk: [
      'I did the night show from the porch. Tika ran a cable. The frogs were on air. Listeners loved them.',
      'You hum when you water. Flat. I adore it. I am never correcting you.',
      'I dedicated the weather to you this morning. Sunny with a chance of me.',
      'The cows like jazz. Not waltzes. I was misinformed. I have apologised to them.',
      'I wrote a new song on the porch at dawn. It is about mud. It is a love song. Do not laugh.',
      'Lark calls the show every morning to say good morning to both of us now. On air. I have given up.',
      'I sleep at midnight and you get up at five. We overlap for about four seconds. They are the best four seconds of my day.',
      'I left the station light on, out of habit, and then remembered I was already home. I am still getting used to that.',
      'I read the farm report on air today. Our farm. I said "our" eleven times. Somebody counted.',
      'Come in before the light goes. I saved you the last song of the evening. It is a quiet one.',
    ],
    morning: [
      'Mm. Morning. I am not a morning person, farmer. You married a night creature. Bring the kettle and nobody gets hurt.',
      'I am up for the morning show. Tell me something true so I have one thing to say that is not the weather.',
      'Good morning, Mira. I am going to whisper it, because it is too early for my real voice.',
      'Kiss for luck before the show? I have never needed luck. I like the kiss.',
    ],
    sweetTalk: [
      'I played your song again last night. Three people called in to ask who it was for. I said a farmer. That narrowed it down to one.',
      'I keep the station light on until you have walked past. You always do. You think I do not notice.',
      'Lark says I have gone soft on air. I have not. I have gone soft off air. It is a completely different problem.',
      'Sit in the booth with me tonight? You do not have to say anything. I will talk enough for both of us.',
    ],
    decline: 'Not yet, farmer. Ask me again when I can answer without the whole Lantern Ring listening in. They will be. They always are.',
  },
});

Object.assign(QUESTS, {
  pia: [
    Q('pia_wool', 'wool', 2, 'Two fleeces from your sheep, if you are shearing. I have twelve scarves promised and not one sheep of my own. I refuse to own a sheep.', 'Good, clean wool. You may watch me be pleased. It will not take long.'),
    Q('pia_feather', 'duck_feather', 4, 'Four duck feathers, please. I am stuffing a quilt for the clinic beds and Dr. Mori says pillows count as medicine.', 'Soft. Very soft. The clinic will sleep better, and so shall I, knowing it.'),
    Q('pia_tea', 'tea', 2, 'Two teas from the Hangar. I have a wedding dress pinned on the form and I cannot leave it, in case it moves.', 'Thank you. It did not move. I watched it the whole time.'),
    Q('pia_cosmos', 'cosmos', 3, 'Three cosmos, if you are growing them. I dye with them: that soft pink nobody can name. Noor will not let me pick hers.', 'Look at that colour. I shall make something too good for anyone to wear.', { season: 2 }),
    Q('pia_beet', 'beet', 2, 'Two beets. Not for eating. For dye. Corran asked for a red waistcoat and I fear what he will do if I refuse.', 'Deep red. He will be unbearable in it. Thank you, I suppose.', { season: 2 }),
    Q('pia_yarn', 'yarn', 1, 'One skein of your own yarn, spun on your own wheel. I would like to make you something from your own farm. Do not ask what.', 'Perfect. Uneven in three places. That is how I know it is yours.', { minHearts: 5 }),
  ],
  lark: [
    Q('lark_egg', 'egg', 6, 'Half a dozen eggs! The Middle deck sent powder again. POWDER. I will not put powder in a bun. I have standards.', 'Real eggs! I could kiss you. I could kiss the hens. Tell them I said so.'),
    Q('lark_honey', 'honey', 2, 'Two jars of your honey for the glaze, please? Once the Lane has tasted it nobody will let me go back.', 'Look at the colour of it. I am going to make you famous, one bun at a time.'),
    Q('lark_strawberry', 'strawberry', 4, 'Four strawberries for the Saturday tarts! The first of spring. People queue for them. I queue for them, and I made them.', 'Perfect! Come by Saturday and you get the first slice. That is the law.', { season: 0 }),
    Q('lark_pumpkin', 'pumpkin', 1, 'One big pumpkin, please. I am making a pie the size of a hatch cover for the Lane and Oduya says I cannot. Watch me.', 'That is a magnificent pumpkin. Oduya is going to be so cross.', { season: 1 }),
    Q('lark_cranberry', 'cranberry', 5, 'Five cranberries for the autumn buns? Sharp ones. The sharp ones are the best ones. Like Pia.', 'Ha! Do not tell her I said that. Thank you, Mira!', { season: 2 }),
    Q('lark_milk', 'milk_m', 2, 'Two good bottles of milk. I want to try my gran\'s custard and I have only got her handwriting to go on, and it is mostly flour stains.', 'It worked! It worked first time! You are getting the first spoon. Nobody else gets the first spoon.', { minHearts: 5 }),
    Q('lark_duck', 'duck_egg', 3, 'Three duck eggs. I want to make you a cake. A secret one. You are not allowed to ask what for.', 'Thank you. Come by on Saturday. Wear something nice. ...Not too nice. It is a cake.', { minHearts: 6 }),
  ],
  noor: [
    Q('noor_violet', 'wild_violet', 4, 'Four wild violets from under the hill pines. I am pressing a reference set and the ones on my side of the hill are sulking.', 'Good specimens. You picked them low, by the root. You listen. I will remember that.', { season: 0 }),
    Q('noor_herb', 'herb', 3, 'Three hill herbs, please. I am testing whether they grow better beside tulips. They do. I want to know why.', 'Thank you. I shall interrogate them thoroughly.', { season: 1 }),
    Q('noor_honey', 'honey', 1, 'One jar of your honey. I want to see which flowers your bees have been visiting. Honey is a diary, if you read it properly.', 'Tulip, clover, a little moonflower. Your bees have taste. So, apparently, do you.'),
    Q('noor_seedtin', 'seedtin', 1, 'If you find one seed tin in the Old World, bring it to me before anyone else sees it. Anyone. Seln included.', 'Oh. Oh, there is still seed in it. I am going to need to sit on the floor for a minute.'),
    Q('noor_snowdrop', 'snowdrop', 2, 'Two snowdrops from the hill. They are the first thing up after the cold, and I like to have them on the desk when I am sulking about winter.', 'Thank you. I have stopped sulking. Partly.', { season: 3 }),
    Q('noor_mushroom', 'mushroom', 2, 'Two hill mushrooms. Not to eat. I want to see what they do to my compost. Science is sometimes very disgusting.', 'Excellent. Do not come into the back room for a week.', { season: 2 }),
  ],
  tika: [
    Q('tika_scrap', 'scrap', 5, 'Five bits of scrap! I am building a thing. A good thing. The Professor says it is a bad thing. It is a good thing.', 'Yes! Perfect! It is going to be SO good. Possibly loud.'),
    Q('tika_copper', 'copper', 3, 'Three copper ore from the belt? I am winding a motor for Vesna\'s turntable so it stops going wobbly on the slow songs.', 'Copper! Lovely and shiny. Vesna\'s slow songs are saved.'),
    Q('tika_pie', 'pie', 1, 'One pie. A whole one. I forgot lunch. And yesterday\'s lunch. The Professor says I am running on solder.', 'Pie! You are a hero. A pie hero. I am going to eat it with a spanner.'),
    Q('tika_corn', 'corn', 2, 'Two ears of corn, please! I am testing a corn-popper for the Bloom Fair. Not the Professor\'s. Mine. Mine is better.', 'Great! If you hear a bang on the Lane, that was science.', { season: 1 }),
    Q('tika_sweetpotato', 'sweetpotato', 3, 'Three sweet potatoes. I roast them on the welding bench. Do not tell Pia. She thinks the burn marks on my sleeves are from engines.', 'Thank you! They are also from engines. Some of them.', { season: 2 }),
    Q('tika_watch', 'watch', 1, 'If you find one pocket watch in the Old World, could I have it? Not for me. For the Professor. His stopped years ago and he will not let me fix it.', 'I fixed this one. I am going to leave it on his bench and say nothing. Like him.', { minHearts: 5 }),
  ],
  vesna: [
    Q('vesna_tea', 'tea', 2, 'Two teas, farmer, if you are passing the Hangar. A night show on dry throat is a crime against the listeners.', 'Bless you. My voice is restored. The Lantern Ring is safe.'),
    Q('vesna_honey', 'honey', 1, 'One jar of honey. For the voice. And for the toast. Mostly the toast, if I am honest, and I am, on air.', 'Lovely. I will thank you on the show. Mysteriously.'),
    Q('vesna_berry', 'berry', 3, 'Three wild berries. I want something to eat in the booth that is not Lark\'s buns. Do not tell Lark. She will take it personally.', 'Perfect. I will eat them during the slow songs. Nobody can see me on the radio.', { season: 1 }),
    Q('vesna_elderflower', 'elderflower', 3, 'Three elderflowers off the hill stream. Lark makes a cordial and I am the only person she lets have the first glass.', 'You picked the good ones. I will save you the second glass. That is an honour.', { season: 1 }),
    Q('vesna_pie', 'pie', 1, 'One pie, for a long night show. I am doing six hours of requests. Five of them will be Corran.', 'You are a lifesaver. I will play you something. Not Corran\'s request.', { minHearts: 5 }),
    Q('vesna_musicbox', 'musicbox', 1, 'There is a song my mother sang that I cannot remember. If you ever find a music box below, one might play it. I know. It is silly.', 'It is not her song. But it is close. ...Sit with me while it plays? It is short.', { minHearts: 6 }),
  ],
});

Object.assign(SIGNS, {
  'village.lane': "MARKET LANE. The Sunrise Oven: from 7, not Mondays. Varga's Mend & Make: 9 to 5, not Sundays. The Seedhouse (Earth seeds, flowers, hives): not Tuesdays. Brandt's Garage: afternoons. Radio Willowfall.",
  'village.bakeryfront': "THE SUNRISE OVEN. Bread from seven. Buns until they are gone, which is nine. Honey cake on Saturdays and whenever Lark feels like it. Closed Mondays: she is lying in the grass.",
  'village.millbridge': 'THE MILL BRIDGE, built by the Lane crews in the first summer of peace from a siege barricade. Over it: the Lane cottages and the Seedhouse trial beds.',
  'village.trialbeds': "SEEDHOUSE TRIAL BEDS. Earth seed, being persuaded. Please do not water, pick, sing to or step on anything. (N. Asante. The singing is my job.)",
  'farm.east': "THE EAST TERRACE. Once the Hollin family's second field; the old fold north, the duck pond south. Ruess at the Workshop clears the terrace, mends the fold and the duck house. Corran sells goats, sheep and ducks.",
});
HELP.push({
  title: 'Market Lane, the fold and the hives',
  body: "Willowfall's Market Lane lies east of the lift plaza: the Sunrise Oven (Lark, bread and cakes), Varga's Mend & Make (Pia spins wool and knits scarves), the Seedhouse (Noor sells Earth seeds, among them winter kale, frost leeks and snowbells, plus beehives and bouquets), Brandt's Garage (Tika builds the cheese press and spinning wheel) and Radio Willowfall (Vesna; one song request a week).\n\nOn the farm, Ruess clears the East Terrace field and mends the fold and the duck house. Corran then sells goats (milk), sheep (shear with clippers for wool) and ducks. Set machines and hives down on the farm like chests; flowers near a hive make honey faster.",
});
{
  const pg = (t) => HELP.find((p) => p.title === t);
  const love = pg('Love'); if (love && !/Lark/.test(love.body)) love.body = love.body.replace(/^Six people can become more than friends: the General, Professor Ruess, Commander Kestrel, Dr\. Mori, Oduya the canteen chef and Yui the librarian\./, 'Eight people can become more than friends: the General, Professor Ruess, Commander Kestrel, Dr. Mori, Oduya, Yui the librarian, Lark the baker and Vesna of the radio.');
  // 2026-11-21: the whole list, with the Seedhouse crops and all six festivals
  const fest = pg('Seasons and festivals'); if (fest) fest.body = 'Four seasons of 30 days; year 1 starts on a Monday.\n\nSpring: turnip, potato, cucumber, strawberry, cabbage*, snap pea*, tulip*.\nSummer: tomato, corn, onion, pumpkin, bell pepper*, melon*, sunflower*.\nAutumn: carrot, eggplant, sweet potato, spinach, beet*, cranberry*, cosmos*.\nWinter: kale*, frost leek*, snowbell*.\n* from the Seedhouse. Moonflower, from Moraine, grows spring to autumn.\n\nFestivals (shops shut; go and join in):\nSpring 18, Planting Day, the square, 10:00.\nSummer 10, Bloom Fair, Market Lane, 10:00.\nSummer 24, Lantern Night, the bridge, 18:00.\nAutumn 9, Harvest Fair, the square, 10:00.\nAutumn 19, Hub Cup, the Lower deck arena, 10:00.\nWinter 30, Year\'s End, the square, 18:00.';
  const day = pg('The day'); if (day) day.body = day.body.replace(' (fishing costs 1; a swing that does nothing is free)', ' (a swing that does nothing is free)');
}

// ------------------------------------------------------------------ star-plums and the Main deck (2026-11-18)
export const STAR_PLUM = {
  found: 'A star-plum! Eat it and your strength grows for good.',
  seln7: [{ who: 'seln', text: 'Oh, and Mira. There was a second paper in that drawer, and this came up from it in my window box overnight. Star-plum. The founders brought six seeds. I think you should have it.' }],
  marrow7: [{ who: 'marrow', text: 'One more thing. The hall\'s little tree fruited this year, for the first time since the sealing. Star-plum, the founders called it. Eat it, Captain. Grow strong; the village leans on you now.' }],
  harvest: [{ who: 'marrow', text: 'And the fair\'s first prize, by vote of the judges and much argument: a star-plum from the hall tree. Well grown, Mira.' }],
  lantern: [{ who: 'general', text: 'Someone left this on the bridge rail with your name on it. A star-plum. I suspect the whole village, frankly.' }],
  mori: [{ who: 'mori', text: 'Five favours. You have kept half my clinic stocked. Doctor\'s orders: eat this. A star-plum. I was saving it for a patient who needed it, and you are the one who never stops.' }],
  hill: 'Under a fern in a quiet corner, something glows violet: a star-plum.',
};
export const CENTRAL = {
  down: 'The car drops through the spoke. You get heavier as you go; at the bottom, the Main deck.',
  up: 'The car climbs back to the Lantern Ring. Your feet remember the lighter pull.',
  gallery: ['Through the great window the Earth turns, blue and white and patient. From up here, you cannot see the ash at all.', 'The window frames half the Earth and a slice of the Moon. Somebody on the bench beside you is asleep, smiling.', 'The night shift sun-line dims, and the stars come out on the far side of the glass. Somewhere down there, the old world is waiting for spring.'],
  galleryDay: 'In daylight the window shows mostly glare and the hull\'s own shadow. The view is better after dark.',
};

// Sato's Watch: the dome at night, by season; the plaque; the General's visit.
export const WATCH = {
  season: [
    ['The dome splits open with a long, patient grind. Through the telescope, Earth fills the eyepiece: spring cloud over the old oceans.', 'Below the cloud, here and there, a green that was not there last year.'],
    ['Summer on the Main deck: the sun-line dimmed, the stars hard and bright beyond the glass.', 'The Moon slides into the eyepiece, grey and patient. Somebody has scratched a small heart on the brass of the focusing knob.'],
    ['Autumn. The Earth turns its night side to the colony, and the dark is not quite dark: a few lights burn where the ash has thinned.', 'Someone down there is keeping a fire. Sato watches it for a long time.'],
    ['Winter. The great window frosts at its edges, and the stars come through it sharp as needles.', 'The radar dish turns overhead, steady as a heartbeat. Everything that is coming home is being watched for.'],
  ],
  plaque: [
    { who: 'narrator', text: 'By the door, a brass plaque: SATO\'S WATCH. FOR CAPTAIN M. SATO, WHO KEPT WATCH WHEN NO ONE ELSE COULD.' },
    { who: 'sato', text: 'I asked them to call it something else. Anything else. "The Observatory" was right there.' },
    { who: 'sato', text: '...It is a very good telescope, though.' },
  ],
  general: [
    { who: 'general', text: 'They told me I would find you here. Under your own name, pretending not to notice it.' },
    { who: 'sato', text: 'I am looking at the stars. The name is on the outside. I cannot see it from in here.' },
    { who: 'general', text: 'Then I will read it for you, Mira, as often as you need. You kept watch. Let someone else do it for a while.' },
  ],
  again: 'You sit a while longer under the open dome. (Stargazing restores your strength once a night.)',
};

// The asteroid belt (from Vashti's hangar) and Maris's shuttle to Earth.
export const BELT = {
  suitUp: ['Vashti checks every seal on the suit twice, taps the helmet glass, and steps back. "Air is distance. Spend it like money."', 'The cradle clamps your boots, counts down from three, and throws you out of the hangar mouth. Eden turns behind you, a great slow drum; ahead, the belt glitters.'],
  arrive: ['Out of the hangar mouth on a puff of thrusters. Rocks drift in the dust lane, slow as thought.', 'The belt. No wind, no sound but your own breathing and the hiss of the pack.', 'The cradle lets go. For a moment you are the only moving thing for a thousand miles.'],
  start: (n) => `The cradle flings you far out, straight to sector ${n}. The colony is a bright coin behind you.`,
  sector: ['The dust changes colour under you. A new sector.', 'Past the marker buoys: further out, darker rock, better ore.', 'The numbers on the marker roll over. Further out.'],
  first: (n) => `Sector ${n}. Nobody from Willowfall has logged a run this far before. Vashti will pretend not to be impressed.`,
  milestone: (n) => `Sector ${n}! From now on the launch cradle can fling you straight here.`,
  air: { 30: 'The suit chimes: air at 30. Time to think about a pickup pod.', 10: 'The suit chimes urgently: air at 10. Find a pod. Now.' },
  pod: 'The pickup pod seals, hums, and flies you home on its own. Fifteen minutes of stars and then the hangar lights.',
  tow: 'The air alarm, then the hard tug of the tow line: Vashti reels you in across the whole belt. It takes an hour, and it takes it out of you.',
  hammer: ['The hammer rings through your glove. Dust sparkles away into the dark.', 'A clean break. Vashti will be pleased.'],
  debris: 'A tumbling scrap of old hull bumps you aside. No harm done; the suit is tougher than it looks.',
  marks: {
    derelict: 'An old navigation buoy from before the war, knocked crooked. One red light still blinks, very patiently, for ships that stopped coming. Someone has stuck a Willowfall seed-packet sticker on it.',
    comet: 'A comet asleep in the dust lane, a dirty snowball the size of a barn. Its tail is only a faint breath of ice. The ice around it is the best in the belt.',
    wreck: 'Half a freighter hull, ribs open to the stars. HESP... is all that is left of her name. Vashti says she was the Hesper, and that her crew got off. Vashti says it firmly.',
    far_marker: 'THE FAR MARKER. The last buoy the colony ever set, at the edge of charted rock. A gold ring turns at the top for nobody in particular. You have come a very long way for a farmer.',
  },
  hangar: 'Vashti\'s hangar: the launch cradle, a rack of space suits, the Pallas parked on its gantry, and through the hangar mouth, the stars.',
};
// The orbital elevator on Terrace Hill (it replaced the old hull lift, the Descent), and the church candles.
export const ELEVATOR = {
  up: 'The car hums up the cable. Terrace Hill shrinks to a green coin, the ring curls overhead, and you grow lighter until the hangar takes you in.',
  down: 'The car slides back down the cable. The ring unrolls into hills and roofs again, and your weight comes home a little at a time.',
};
export const CHURCH = {
  candles: [
    'You light a candle from one already burning. The flame leans, steadies, and stands up straight with the others.',
    'Three hundred and twelve little flames, and a few more since. Each base has a name in pencil. Somebody has gone over the faded ones.',
    'You light a candle for the carrier crews, and stand a while. Nobody hurries you. That is what the room is for.',
    'There is one candle without a name, a little apart from the rest. Pastor Ines says it is for the ones still to come.',
  ],
};
export const SHUTTLE = {
  board: [{ who: 'maris', text: 'Strap in, Captain. Down through the soup and out the other side. Keep your lunch where it is.' }],
  boardAlt: [{ who: 'maris', text: 'Earth run! I love this one. Well. I love the coming back.' }],
  descent: 'The shuttle drops out of the dock and down the long fall to Earth. The windows go orange, then grey, then the poisoned clouds close round you, thick as wool. Then, below: the old city, and a landing pad at its edge.',
  home: 'The shuttle climbs out of the grey into black, and there is Eden, turning, every window lit.',
  haze: 'The Pallas\'s hull meter chatters: gas and toxic pools eat at the plating. (Ruess\'s air filters keep the gas out; nothing keeps a pool from stinging.)',
  hull: { 50: 'Hull at half. Maris, on the radio: "Plenty left. But you do know where I\'m parked?"', 25: 'Hull warning! The Pallas\'s alarms go off in a polite, rising chime. Time to walk back to the shuttle, or Maris tows you.' },
  tow: 'The hull gives out with a sigh and the Pallas kneels in the street. A cable drops out of the grey: Maris\'s tow.',
  tally: (cr, n) => (cr || n ? `This trip: ${cr} cr found, and ${n} thing${n === 1 ? '' : 's'} in the rucksack.` : 'This trip: nothing found but dust. Next time.'),
};

// ------------------------------------------------------------------ the Lower deck, "the Undercroft" (2026-11-19, release 1)
// Four people below decks (friends, not romance candidates): Tobias Venn keeps the pumps and the restoration terminal,
// Agnes Thorne keeps the enclave's rota, her granddaughter Moth keeps everything she finds, and Ansel Wick keeps the fish.
// Their talk can depend on how far the restoration has come: TALK[id].flag = { ld_<project>: lines } ('<flag>!' ends a set).
export const UNDERFOLK = ['venn', 'thorne', 'moth', 'wick'];
Object.assign(NPCS, {
  venn: {
    id: 'venn', name: 'Tobias Venn', short: 'Venn', title: 'Engineer of the Lower deck; the restoration terminal', portrait: 'art/farm/people/venn_front.webp',
    look: { skin: '#d6ad8a', hair: '#5f5850', top: '#5d6b4e', bottom: '#34363c', style: 'short' },
    birthday: { season: 2, day: 11 },
    loves: ['tea', 'pie', 'copper', 'pump_part'],
    likes: ['scrap', 'nickel_iron', 'bread', 'soup', 'alloy', 'watch', 'cave_fish', 'mushroom_skewer'],
    dislikes: ['tonic', 'medal', 'cucumber'],
    shop: 'undercroft',
  },
  thorne: {
    id: 'thorne', name: 'Agnes Thorne', short: 'Agnes', title: 'Keeper of the enclave\'s rota; once the cistern supervisor', portrait: 'art/farm/people/thorne_front.webp',
    look: { skin: '#c58f6a', hair: '#e6e2da', top: '#86485a', bottom: '#45454e', style: 'bun' },
    birthday: { season: 3, day: 8 },
    loves: ['egg', 'milk_m', 'strawberry', 'undercroft_stew'],
    likes: ['bread', 'tea', 'potato', 'shiitake', 'pale_oyster', 'turnip', 'teacup', 'soup'],
    dislikes: ['scrap', 'tonic', 'pipe_eel'],
  },
  moth: {
    id: 'moth', name: 'Moth Thorne', short: 'Moth', title: 'Eight, curious, collector of lamps and diary pages', portrait: 'art/farm/people/moth_front.webp',
    look: { skin: '#f3d6be', hair: '#4a3050', top: '#e8b44a', bottom: '#3f5a7a', style: 'short' },
    birthday: { season: 0, day: 21 },
    loves: ['berry', 'strawberry', 'toy', 'glowcap'],
    likes: ['wild_apple', 'cherry', 'peach', 'egg', 'glowfish', 'musicbox', 'photo', 'honey_toast'],
    dislikes: ['onion', 'spinach', 'scrap'],
  },
  wick: {
    id: 'wick', name: 'Ansel Wick', short: 'Wick', title: 'Keeper of the pump halls, who knows every fish', portrait: 'art/farm/people/wick_front.webp',
    look: { skin: '#b98a6a', hair: '#9aa0a6', top: '#3f5f6f', bottom: '#2f3a40', style: 'cap' },
    birthday: { season: 1, day: 13 },
    loves: ['fish_king', 'abyss_koi', 'tea', 'fish_grill', 'fish_deep_angler'],
    likes: ['cave_fish', 'glowfish', 'pipe_eel', 'fish_s', 'fish_m', 'bread', 'herb', 'soup'],
    dislikes: ['scrap', 'tonic', 'glowcap'],
  },
});
VILLAGERS.push(...UNDERFOLK);
SPOTS.push('lower.works', 'lower.vents', 'lower.reactor', 'lower.vault', 'lower.arena', 'lower.stands', 'lower.stands2', 'lower.arenagate');
SPOTS.push('central.gallery', 'undercroft.counter', 'lower.landing', 'lower.gallery', 'lower.pumps', 'lower.pumphouse', 'lower.sump', 'lower.catacombs', 'lower.beds', 'lower.enclave', 'lower.kettle', 'school.teacher', 'school.pupil', 'central.homes');
for (const id of UNDERFOLK) {
  const n = NPCS[id], m = {};
  for (const x of n.dislikes) m[x] = 'disliked'; for (const x of n.likes) m[x] = 'liked'; for (const x of n.loves) m[x] = 'loved';
  tierOf[id] = m;
}

Object.assign(SCHEDULE, {
  // The terminal by the lift, the pumps after lunch, the gallery last thing. Fridays, once the halls run, he goes up to argue with Ruess at the Workshop door.
  venn(wd, m, c) {
    const f = (c && c.flags) || {};
    if (wd === 4 && f.ld_pumps && c.weather !== 'storm' && m >= H(15, 10) && m < H(19)) return m < H(17, 30) ? 'village.workshopfront' : 'lower.landing';   // up the lift to argue with Ruess, and back down in time for the evening bench
    if (wd === 6) return pick(m, [H(9), H(12), f.ld_pumps ? 'lower.pumphouse' : 'lower.landing'], [H(12), H(14), f.ld_arena ? 'lower.arenagate' : f.ld_enclave ? 'lower.kettle' : 'undercroft.counter'], [H(14), H(18), f.ld_pump2 ? 'lower.sump' : f.ld_lights ? 'lower.gallery' : 'lower.landing']);
    return pick(m, [H(7), H(12), 'undercroft.counter'], [H(12), H(13), f.ld_enclave ? 'lower.kettle' : 'undercroft.counter'], [H(13), f.ld_vents ? H(14, 30) : H(15), f.ld_works ? 'lower.works' : f.ld_pumps ? 'lower.pumphouse' : 'undercroft.counter'],
      [f.ld_vents ? H(14, 30) : H(15), H(16), f.ld_vents ? 'lower.reactor' : 'undercroft.counter'], [H(16), H(20), 'undercroft.counter'], [H(20), H(22), f.ld_vault ? 'lower.vault' : f.ld_lights ? 'lower.gallery' : 'lower.landing']);   // release 2: the Works after lunch, the needles at three, the open vault last thing
  },
  // The basins by day, the Sump at night once it is drained. He eats with the enclave when there is light to eat by.
  wick(wd, m, c) {
    const f = (c && c.flags) || {}; if (!f.ld_pumps) return null;
    const deep = f.ld_pump2 ? 'lower.sump' : 'lower.pumps';
    if (wd === 6) return pick(m, [H(8), H(12), 'lower.pumps'], [H(12), H(15), f.ld_vents ? 'lower.vents' : f.ld_enclave ? 'lower.kettle' : 'lower.pumphouse'], [H(15), H(22), deep]);   // Sundays: a long soak, once there is hot water
    return pick(m, [H(7), H(11), 'lower.pumps'], [H(11), H(13), deep], [H(13), H(14), f.ld_arena ? 'lower.stands2' : f.ld_enclave ? 'lower.kettle' : 'lower.pumphouse'], [H(14), H(19), 'lower.pumps'], [H(19), H(23), deep]);   // lunch in the stands, practising in his head
  },
  // The rota and the kettle; after the move, the school (she taught the enclave's children for years, by lamplight).
  thorne(wd, m, c) {
    const f = (c && c.flags) || {}; if (!f.ld_enclave) return null;
    if (!f.ld_rehoused) return pick(m, [H(7), H(9), 'lower.kettle'], [H(9), H(12), 'lower.enclave'], [H(12), H(14), 'lower.kettle'], [H(14), H(18), 'lower.enclave'], [H(18), H(21), 'lower.kettle']);
    if (wd === 5) return pick(m, [H(10), H(16), 'lower.kettle'], [H(16), H(19), 'central.homes']);
    if (wd === 6) return pick(m, [H(8), H(12), 'church.pew'], [H(12), H(18), 'central.homes']);
    return pick(m, [H(8), H(15), 'school.teacher'], [H(15), H(17), 'central.schoolyard'], [H(17), H(20), 'central.homes']);
  },
  // Wherever the lamps are newest. After the move: school, the schoolyard, and Saturdays fishing with Wick.
  moth(wd, m, c) {
    const f = (c && c.flags) || {}; if (!f.ld_catacombs) return null;
    if (!f.ld_enclave) return pick(m, [H(10), H(12), 'lower.catacombs'], [H(15), H(18), 'lower.beds']);
    if (!f.ld_rehoused) return pick(m, [H(8), H(11), 'lower.enclave'], [H(11), H(12), 'lower.pumps'], [H(12), H(13), 'lower.kettle'], [H(13), H(17), 'lower.beds'], [H(17), H(19, 30), 'lower.kettle']);
    if (wd === 5) return f.ld_arena ? pick(m, [H(9), H(13), 'lower.pumps'], [H(13), H(15), 'lower.arena'], [H(15), H(17), 'lower.stands']) : pick(m, [H(9), H(17), 'lower.pumps']);   // Saturday afternoons in the drum
    if (wd === 6) return pick(m, [H(9), H(12), 'church.pew'], [H(13), H(17), 'central.gallery'], [H(17), H(19), 'central.homes']);
    return pick(m, [H(8), H(15), 'school.pupil'], [H(15), H(17), 'central.schoolyard'], [H(17), H(19), 'central.homes']);
  },
});

Object.assign(TALK, {
  venn: {
    first: ['Venn. Tobias Venn. I keep the pumps going, mostly by shouting at them.', 'You came down the lift on purpose? Nobody does that. ...Well. The terminal is there. Put money in it and I will put light in the dark.'],
    bday: ['Somebody told you. Agnes, I expect. She keeps a list of everything.', '...Thank you. I have not had a birthday since the war. I had forgotten they come with things.'],
    b0: [
      'Pump four is singing again. That is bad. When they go quiet, that is worse.',
      ['The lift stops here because I asked it to. Twice a day, nobody gets off.', 'Today, somebody got off. I am still deciding how I feel about it.'],
      'Fund a project at the terminal and I will have it done by morning. I do not sleep much. The pumps do not let me.',
    ],
    b1: [
      ['I was an engineer for the Directorate. Before.', 'Do not ask me about before yet. Ask me about valves. I am good company about valves.'],
      'Lamp kits, pump parts: bring me scrap, ore and copper and I will make them on the bench. It is the only thing I make now. On purpose.',
      ['Ruess and I trained in the same college. He was louder.', 'He still is. I can hear him from here on a Friday.'],
    ],
    b2: [
      ['People think the Lower deck is broken.', 'It is not broken. It is waiting. There is a difference, and I have spent a long time on the difference.'],
      'Every lamp you light, I hear the families laugh a little more through the vents. It is not a sound I deserve. I listen anyway.',
      'You are the first person to come down here and ask what I need instead of what I did. I am grateful. I will deny it.',
    ],
    b3: [
      ['There is a door in the gallery I will not open. Not yet.', 'When I do, it will be with you standing next to me. That is a promise, and I do not make many.'],
      'Sato. If you ever wondered whether one person can mend a thing they helped break: I think so. Slowly. With friends.',
    ],
    s0: 'Spring up top, they tell me. Down here it is always the same season: damp.',
    s1: 'Summer. The heat comes down the shafts and the pumps sweat. So do I.',
    s2: 'Autumn. Ruess sends me apples. He pretends they are spares.',
    s3: 'Winter. The cisterns run cold and clear. Best time of year for the fish, says Wick.',
    sun: 'No weather down here. One less thing to blame.',
    rain: 'Rain up top, the shafts say. The cisterns will fill tonight. I shall pretend I planned it.',
    snow: 'Snow up top. The shafts breathe cold. The pumps like it; they are the only ones.',
    morning: 'Morning. Pumps: running. Tea: strong. Engineer: upright. Two out of three is good.',
    evening: 'Evening. I walk the gallery and count the lamps. It used to be a short walk.',
    fish: 'Wick talks to the fish. I talk to the pumps. Nobody talks to us. It works.',
    year2: ['A year of you coming down that lift.', 'I have started leaving the landing light on. Do not make anything of it.'],
    flag: {
      ld_lights: ['The gallery has light again. Look at it. Somebody painted the pipes blue once. I had forgotten.', 'With the lights on the drones can see us. There are no drones now. I keep telling myself.'],
      'ld_lights!': 'ld_catacombs',
      ld_pumps: ['Pump one runs like it is young. Wick wept. Do not tell him I told you.'],
      ld_enclave: [['The families have light. Real light, not candles.', 'Agnes sent me a cake. I think it means she has forgiven me. It is hard to tell with cake.']],
      ld_rehoused: [['They have gone up.', 'The enclave is very quiet. Wick and I play cards. He cheats. It is the best thing that has happened in years.']],
    },
  },
  thorne: {
    first: ['You are the one with the lamps. Agnes Thorne. I keep the rota.', 'Everyone has a turn: water, cooking, watch, washing. Twenty families once. Eleven now. Four, really, who will see you. Sit if you like. Mind the kettle.'],
    bday: ['A present. On the right day. Nobody down here has known what day it was for years, so I made one up for each of us.', 'Mine is real, though. You got it right. Thank you, dear.'],
    b0: [
      'If you are staying, you are on the rota. Visitors do the washing up. It is how I know they are friendly.',
      ['We stayed because the last time a lift said come up, it lied.', 'That is all I will say about it today. Have a biscuit. They are mostly fungus, but they are honest about it.'],
      'Moth found you, did she? She finds everything. Lamps, pages, people. I have stopped asking where she goes.',
    ],
    b1: [
      ['I ran the cisterns before the war. Every tap on Eden, through my hands.', 'Now I run eleven people and a kettle. It is harder. The kettle argues back.'],
      'I teach the children their letters on a slate by the stove. Moth reads better than I do now. She reads everything twice, to be sure it is not lying.',
      ['You bring us food from up top. Eggs. Real eggs.', 'The little ones had never seen one. They held them like jewels. Then we ate them like eggs.'],
    ],
    b2: [
      ['Some nights I go to the lift and stand there.', 'I never press the button. My hand knows where it is, though.'],
      'You keep your promises. I have been watching. It is a habit, down here: who keeps their word. You do.',
      ['Ilse Marrow kept sixty of us alive in these crypts.', 'When she went up, I said I would follow. Then I did not. I should send her a letter. I have been writing it for three years.'],
    ],
    b3: [
      ['If we went up. If. Would the children be safe?', '...You do not have to answer. You already did, coming down here every week.'],
      'I have started packing. Only small things. A cup. The rota. Moth\'s drawings. Just in case.',
    ],
    s0: 'Spring, up top. Moth asks what it smells like. I tell her: like damp, but optimistic.',
    s1: 'Summer. The vents bring the warm down. We open every curtain and pretend it is a holiday.',
    s2: 'Autumn. We bottle what the beds give. Mushroom jam is not a success. We have stopped trying.',
    s3: 'Winter. We gather round the big stove and tell the children about snow. Mostly lies. Good lies.',
    sun: 'Another day of the same weather. It is restful, if you do not think about it.',
    rain: 'Rain, you say? Real rain, out of the sky? I used to complain about it. Imagine.',
    snow: 'Snow up top. I told the children it falls like flour. Now they want to know who is baking.',
    morning: 'Morning, dear. Rota is up. You are on nothing. That is a kindness, not an insult.',
    evening: 'Evening. Everyone is in, everyone is fed, the kettle is on. That is a good day, by my count.',
    fest: 'A festival. People singing, all in one place, out in the open. I had forgotten how loud happy is.',
    fish: 'Ansel would fish the cisterns dry if we let him. We do not let him. We eat the fish, though.',
    year2: ['A year since the lamps started coming on.', 'I have stopped counting the days we hid. I count the days since you came instead. It is a much nicer number.'],
    flag: {
      ld_rehoused: [['A house. With a door that is ours, and a window, and a step to sweep.', 'I swept it four times this morning. The Constable watched. I think he approved.'], ['Twelve desks, and I am the one at the front.', 'I taught them by candle for three years. The chalk is so white up here it hurts.'], 'The children run in the avenue. Running! In the open! I have to sit down, sometimes, just to watch.'],
    },
  },
  moth: {
    first: ['You are not a grey coat. Grey coats do not have mud on their boots.', 'I am Moth. Because I go where the lamps are. I have a collection. Do you want to see? You can not touch.'],
    bday: ['A present! For me? Is it a lamp? It is not a lamp. That is all right. I like it anyway.', 'Gran says I am eight now, officially. I was eight already. Now it is written down.'],
    b0: [
      'I find pages in the crypts. Somebody wrote them in the war. They have drawings. The drawings are not as good as mine.',
      ['Gran says not to go past the arch.', 'I go past the arch every day. I just do not tell Gran. You will not tell Gran.'],
      'The glowcaps are friends. They light up when I say hello. Gran says it is chemistry. Gran does not know everything.',
    ],
    b1: [
      ['What does the sun-line look like?', 'Wick says it is like the longest lamp in the world. I think he is making it up. Is he making it up?'],
      'I have counted every lamp you put up. Forty-one. You can check. Do not check. I am right.',
      ['Mr Venn is grumpy but he made me a torch.', 'It has a crank. I wind it when I am frightened. I am not frightened much any more.'],
    ],
    b2: [
      ['Up top, is there a school?', 'A real one? With desks? I would sit at the front. Then the back. Then every desk, one each day, to be fair.'],
      'I gave you the pages because you look at them properly. Most grown-ups look at them and then look sad. You look at them and then look.',
      'I drew you. You are the one with the big hat. Gran says you do not have a big hat. In my drawing you do.',
    ],
    b3: [
      ['When I am big I am going to be a lamp engineer.', 'Or a fish. Wick says I can not be a fish. Wick does not know everything either.'],
      'You are my best grown-up. Gran is my best person. That is different. You can be both, if Gran says.',
    ],
    s0: 'Is it spring? Wick says the cave fish know. They swim in circles. I swim in circles too, sometimes.',
    s1: 'Summer! The vents are warm. I lie on the grate and pretend it is the sun.',
    s2: 'Autumn means leaves up top. They fall off trees. On purpose! Every year!',
    s3: 'Winter. Snow is cold rain that is pretending. Gran told me. I want to see it pretend.',
    sun: 'Down here every day is the same day. Except when you come. Then it is a different day.',
    rain: 'Is it raining up there? Is it like the drips, only everywhere? I knew it.',
    snow: 'Snow! Did you bring any? It melted? On the LIFT? That is so unfair.',
    morning: 'Morning! I have been up for ages. I have already found a button.',
    evening: 'Gran says bed. I say five more lamps. We are negotiating.',
    fest: 'A festival! Everyone is here at once and nobody is whispering!',
    fish: 'Wick lets me hold the rod. I caught a cave fish once. It looked at me. I let it go. We are friends now.',
    year2: ['You have been coming for a whole year.', 'I made you a calendar. Every day has a lamp on it.'],
    flag: {
      ld_rehoused: [['I have a desk! It has my name on the card! Somebody spelled it right!', 'The Constable gave me crayons. Forty-eight colours. I have named all of them.'], ['At school we learn sums and letters and that the sun-line is real.', 'It is real! Wick was not making it up! I am going to tell him on Saturday.'], 'Pastor Ines said "hello" to the whole school at once. That was the assembly. It was the best one I have ever been to.'],
    },
  },
  wick: {
    first: ['Mind the edge. The basin is deeper than it looks, and the fish are older than they look.', 'Ansel Wick. I keep the halls. Well, the halls keep themselves. I keep an eye on them.'],
    bday: ['For me? You will have the fish jealous.', '...That is kind. I shall eat it slowly, by the water, and tell them all about it.'],
    b0: [
      'Cave fish all day. Glowfish if you are patient. Pipe eels after six, when the lamps go low and they think nobody is looking.',
      ['I keep a ledger of every fish in these basins.', 'Not by number. By name. That one is Agatha. She has never been caught and she never will be.'],
      'No weather down here, so no excuses. If they are not biting, it is you, or it is Tuesday.',
    ],
    b1: [
      ['Before the war these were cisterns. The koi were somebody\'s hobby.', 'The somebody went up on the ships. The koi stayed. So did I. We have that in common.'],
      'Bring an Alloy rod to the Sump, after eight at night, and sit very still. That is all I will tell you. That is all anybody can.',
      'Venn fixed pump one for me. I did not ask. He just came down one night with a toolbox and did not go away.',
    ],
    b2: [
      ['There is a fish in the Sump the colour of the deep sky.', 'Silver speckles, like stars. I have seen her twice in four years. I did not even reach for the rod. Some things you just look at.'],
      'You fish like someone who has waited for things before. Long watches. I know the look.',
      'Moth asks me what the sun-line is like. I tell her it is like a lamp you do not have to wind. I hope I remember right.',
    ],
    b3: [
      'When the families go up, I shall stay. Somebody should keep the fish company. Come down and fish with me now and then.',
      ['I named a glowfish after you.', 'She is small and stubborn and she does not let go of the line. I meant it as a compliment.'],
    ],
    s0: 'Spring, up top. Down here the cave fish start to spawn. Same thing, only quieter.',
    s1: 'Summer. The water warms a degree and the eels get bold.',
    s2: 'Autumn. The glowfish glow brighter. Nobody knows why. I like not knowing.',
    s3: 'Winter. The cisterns run clear as glass. Best fishing of the year, and nobody here to see it but me.',
    sun: 'Same water, same dark, same fish. It is a comfort, if you let it be.',
    rain: 'Raining up top? The basins rise a finger and the glowfish come up to see.',
    snow: 'Snow up top. The cisterns chill and the koi goes deep. Cold nights are long nights at the Sump.',
    morning: 'Morning. The fish are up. I am up. One of us is pleased about it.',
    evening: 'Evening. Lamps go low, eels come out. Take a rod to the far basin.',
    fish: 'Every fish in these halls has a name in my ledger. Except the koi. You do not name the sky.',
    year2: ['A year of you at my basins.', 'I have written you into the ledger. Under "regulars". You are the only one.'],
    flag: {
      ld_pump2: ['The north tunnel is dry. The Sump is open again. I sat by it all night. Didn\'t catch a thing. Best night in years.'],
      ld_rehoused: ['The enclave has gone up. It is very quiet. The fish do not mind. I mind a little. Come and fish.'],
    },
  },
});

Object.assign(GIFT, {
  venn: {
    loved: 'That is... yes. That is exactly right. You have been watching what I use. Thank you. I mean it.',
    liked: 'Useful. Thank you. I will find a place for it, and then I will find it again, eventually.',
    neutral: 'Hm. Thank you. It is on the bench now. Everything ends up on the bench.',
    disliked: 'I would rather not. Old memories. You were not to know.',
    bday: 'And today, of all days. ',
  },
  thorne: {
    loved: 'Oh, my dear. That goes straight on the rota: everyone gets a taste. Thank you.',
    liked: 'That is kind. It will be shared, which is the only way anything gets eaten down here.',
    neutral: 'Thank you, dear. Everything is useful to someone. I will find out who.',
    disliked: 'Ah. No, thank you. We had enough of that in the bad years.',
    bday: 'On my birthday, too. ',
  },
  moth: {
    loved: 'FOR ME? This is the best thing! It is going in the collection! You can visit it!',
    liked: 'Thank you! I like it. I am going to show Gran and Wick and the fish.',
    neutral: 'Oh. Thank you. ...What is it for? I will think of something.',
    disliked: 'Eugh. I do not have to eat it, do I? I will give it to Mr Venn. He eats anything.',
    bday: 'A BIRTHDAY present! ',
  },
  wick: {
    loved: 'Now that is a gift a fishing man understands. Thank you. I shall tell the basin.',
    liked: 'Kind of you. That will keep a man company on a long watch.',
    neutral: 'Thank you. I will put it by the ledger.',
    disliked: 'Hm. That is not for me, but thank you. The eels will not want it either.',
    bday: 'A present on my birthday. ',
  },
});

EVENTS.push(
  // ---- Tobias Venn: the terminal, the pumps, and the door he will not open.
  { id: 'venn3', npc: 'venn', hearts: 3, map: 'lower', flag: 'ld_pumps', from: H(13), to: H(15),
    lines: [
      L('narrator', 'Pump one is running. Venn has his ear pressed to the casing like a doctor with a stethoscope.'),
      L('venn', 'Hear that? The bearing on the left is tired. So am I. We are both still going.'),
      L('venn', 'For three years I kept four pumps alive with parts from the other twelve. Every night, one more thing I could not fix.'),
      L('sato', 'And now?'),
      L('venn', 'Now somebody brings me copper. You would be surprised what a man can do with copper and company.'),
      L('venn', 'Take these. Spares. I made too many. I made them on purpose.'),
    ],
    reward: { love: 4, item: ['pump_part', 2] } },
  { id: 'venn7', npc: 'venn', hearts: 7, map: 'lower', flag: 'ld_enclave', from: H(20), to: H(22),
    lines: [
      L('narrator', 'Night in the gallery. Venn is standing in front of the great round door in the north wall, hands in his pockets.'),
      L('venn', 'You have read the tapes. I know you have. I watched you at the terminals.'),
      L('venn', 'I built a thing down here, for people who wanted it built. It went wrong. Everything behind that door is what is left of it.'),
      L('sato', 'You stayed.'),
      L('venn', 'Somebody had to seal it. Somebody had to keep the water out of the crypts while the families hid. It turned out to be me. It turned out I did not mind.'),
      L('venn', 'Not yet, Sato. When the door opens, it opens properly, with everyone told the truth. Until then, have a lamp kit. I am not good at speeches. I am good at lamp kits.'),
    ],
    reward: { love: 5, item: ['lamp_kit', 2] } },
  // ---- Moth: the girl who goes where the lamps are.
  { id: 'moth3', npc: 'moth', hearts: 3, map: 'lower', flag: 'ld_enclave', from: H(13), to: H(17),
    lines: [
      L('narrator', 'Moth has laid out her collection on a crate by the beds: bulbs, a cracked lamp glass, a bicycle bell, eleven buttons, and a hand-crank torch.'),
      L('moth', 'This is the museum. You are the first visitor. Visitors do not touch, they only look, and then they say "ooh".'),
      L('sato', 'Ooh.'),
      L('moth', 'Good. The torch is from Mr Venn. The bell is from nobody; it was just there. The buttons are from everywhere.'),
      L('moth', 'This one is for you. It was the first lamp I found. It does not work. It is not for working. It is for keeping.'),
      L('sato', 'I will keep it on the mantel, beside the radio. Pride of place.'),
    ],
    reward: { love: 4, item: ['glowcap', 2] } },
  // ---- Agnes Thorne: the rota and the lift that lied.
  { id: 'thorne3', npc: 'thorne', hearts: 3, map: 'lower', flag: 'ld_enclave', from: H(18), to: H(21),
    lines: [
      L('narrator', 'Evening at the enclave. The children are asleep. Agnes pours two cups and sits down beside you on an upturned crate.'),
      L('thorne', 'The Okafor boy asked me today what a window is. A real one, with the stars in it. I did not know how to tell him.'),
      L('thorne', 'We want to go up, Sato. Every one of us. We are frightened of it, that is all. Fear gets to be a habit, like the rota.'),
      L('sato', 'There are empty houses in Eden Central. And a school with nobody in it.'),
      L('thorne', '...A school. Moth would lose her mind. In a good way.'),
      L('thorne', 'Help us a little longer. Let the families get to know you. Then speak to Venn about those houses, and I will speak to the families. Deal?'),
    ],
    reward: { love: 4 } },
  // ---- Ansel Wick: the ledger and the koi.
  { id: 'wick3', npc: 'wick', hearts: 3, map: 'lower', flag: 'ld_pump2', from: H(19), to: H(23),
    lines: [
      L('narrator', 'Night at the Sump. The water is black and very still. Wick is not fishing; he is just looking.'),
      L('wick', 'Before the war the cisterns had koi in them. Somebody\'s hobby. Gold and white and red. They all went belly-up in the bad month.'),
      L('wick', 'All but one. She went down, very deep, and turned the colour of the sky outside a window. With silver on her, like stars.'),
      L('wick', 'After eight. An Alloy rod at least. Sit still and do not want it too much. That is the trick of it. That is the trick of most things.'),
      L('sato', 'You are not fishing.'),
      L('wick', 'Not tonight. Tonight I am keeping her company. Here. Bread for bait, for your turn. It does not help. It makes you feel better.'),
    ],
    reward: { love: 4, item: ['bread', 2] } },
  { id: 'moth7', npc: 'moth', hearts: 7, map: 'lower', flag: 'ld_enclave', from: H(17), to: H(19, 30),
    lines: [
      L('narrator', 'By the stove at the enclave, Moth is lying on her stomach with a crayon and a very serious face.'),
      L('moth', 'Do not look. ...You can look now. It is you. That is your hat.'),
      L('sato', 'I do not have a hat that big.'),
      L('moth', 'In the drawing you do. In the drawing you have a hat with a lamp on it, so you can see in the dark and also in the light.'),
      L('moth', 'Gran says when we go up I will see the sun-line every day. Every single day. I am going to get tired of it. I want to see what that feels like.'),
      L('narrator', 'She folds the drawing in four and pushes it into your hand, and then, for good measure, a glowcap.'),
    ],
    reward: { love: 5, item: ['glowcap', 1] } },
  { id: 'thorne7', npc: 'thorne', hearts: 7, map: 'lower', flag: 'ld_enclave', from: H(9), to: H(12),
    lines: [
      L('narrator', 'Agnes is at the rota board, rubbing out a column of names with the side of her hand.'),
      L('thorne', 'Watch. I have taken the watch off the rota. Four years, somebody awake every hour, listening for boots on the lift.'),
      L('thorne', 'Last night nobody kept watch, and nobody came, and the children slept through. So did I. First time since the ships.'),
      L('sato', 'How did it feel?'),
      L('thorne', 'Like being forty again. Stiff, and very rested.'),
      L('thorne', 'Take these eggs back up with you, dear. No, I insist. You brought them, and we have had our share. That is how a rota works.'),
    ],
    reward: { love: 5, item: ['egg', 3] } },
  { id: 'wick7', npc: 'wick', hearts: 7, map: 'lower', flag: 'ld_pump2', from: H(14), to: H(19),
    lines: [
      L('narrator', 'Wick holds his ledger out to you, open at a page near the back. Under a heading in his small square hand: REGULARS.'),
      L('wick', 'Agatha. The eel in the third pipe. The glowfish I named after you. And you.'),
      L('sato', 'I am in the fish ledger.'),
      L('wick', 'You are in the ledger. It is not only fish. It is everything that comes back to the water. That is a short list, down here.'),
      L('wick', 'Venn says the families are going up. I am glad. I shall stay with the halls. Somebody has to tell the fish the news.'),
      L('wick', 'Here. One of mine. Grill it with salt, and think of the Sump.'),
    ],
    reward: { love: 5, item: ['glowfish', 1] } },

);

// First meetings: they play instead of TALK[id].first the first time Sato talks to each of them.
export const MEETINGS = {
  venn: [
      L('narrator', 'A man in an oil-dark coat is hunched over a green-screened terminal by the lift, with goggles pushed up into hair that has gone grey early.'),
      L('venn', 'You got off. Nobody gets off.'),
      L('sato', 'Mira Sato. I was told the Lower deck was sealed.'),
      L('venn', 'It is. By me. The pumps keep the water out, I keep the pumps in, and the dark keeps everyone else away.'),
      L('venn', 'Tobias Venn. Engineer. ...If you are here to help, the terminal takes credits and parts. That one: the green screen by the sign, not me. Face it and press E. Work lights first. Then we will see what the dark has kept.'),
    ],
  moth: [
      L('narrator', 'Between two of the old crypt arches, a small girl in a mustard raincoat is crouched over a mushroom bed, talking to the glowcaps.'),
      L('moth', '...and that is a big person. Do not be frightened. I am not frightened. Much.'),
      L('moth', 'You are not a grey coat. Grey coats do not have mud on their boots, and they do not put up lamps. You put up lamps.'),
      L('sato', 'I did. I am Sato. Who are you?'),
      L('moth', 'Moth. Because I go where the lamps are. Gran says do not talk to anybody from the lift. You are not from the lift. You are from the lamps.'),
      L('narrator', 'She looks over her shoulder at a dark arch to the north, hung with a tarpaulin, and lowers her voice.'),
      L('moth', 'There are people past there. Us. We are a secret. If you light it up, it will not be a secret. Gran says that would be bad. I think it would be good.'),
    ],
  thorne: [
      L('narrator', 'Past the north arch: four patched-up shelters under strings of little lights, a stove with a kettle on it, washing on a line. A dozen faces turn towards you, and then all look at one woman.'),
      L('thorne', 'So you are the one with the lamps. Moth said you were tall. You are about average.'),
      L('thorne', 'Agnes Thorne. I keep the rota. Eleven of us, four families. We have been down here since the ships left, and nobody has come looking.'),
      L('sato', 'Nobody up top knows you are here.'),
      L('thorne', 'No. We made sure of it. The last time a lift said "come up, it is safe", it was lying, and we knew it was lying. We stayed with the ones who knew.'),
      L('thorne', 'Well. You have lit our door. You had better come in and have some tea. It is mostly fungus. It is honest about it.'),
    ],
  wick: [
      L('narrator', 'At the edge of the first basin, an old man in an oilskin coat sits on a bucket with a rod and a fat little ledger open on his knee.'),
      L('wick', 'Shh. Agatha is thinking about it.'),
      L('narrator', 'Nothing happens for some time. He writes something down.'),
      L('wick', 'She thought better of it. Ansel Wick. I keep the halls, and the ledger, and the fish keep me.'),
      L('wick', 'Cave fish all day. Glowfish if you are patient. Pipe eels when the lamps go low. And something else in the Sump, past the north tunnel, when the water lets you through.'),
    ],
};

// Story scenes of the Undercroft that are not heart events: the school's first morning, its first assembly, Marrow's letter.
export const LOWER_SCENES = [
  { id: 'fenn_pupils', npc: 'fenn', hearts: 1, map: 'school', flag: 'ld_rehoused', from: H(8), to: H(8, 30),
    lines: [
      L('narrator', 'Eight o\'clock. Constable Fenn checks the school locks, as he has every morning since it was built. This morning the room is full of children.'),
      L('fenn', 'Good morning. Constable Fenn. I check the locks. ...I am not needed. I can see that. I shall go.'),
      L('narrator', 'He does not go. He takes a cardboard box out from under his arm and sets it very carefully on Moth\'s desk.'),
      L('fenn', 'Equipment. Crayons. A ruler. A torch, with a crank. It was for the first child. You are the first child, by about four seconds.'),
      L('moth', 'Forty-eight colours! Constable, you have to be my friend now. It is a rule.'),
      L('sato', 'You kept it safe the whole time, Constable.'),
      L('fenn', '...I did. I shall log it. Under "kindness, received". The heading is getting full.'),
    ],
    reward: { love: 5 } },
  { id: 'calloway_pupils', npc: 'calloway', hearts: 1, map: 'school', flag: 'ld_rehoused', weekday: 2, from: H(12), to: H(13),
    lines: [
      L('narrator', 'Wednesday, noon. Pastor Ines comes in with her notes for the first assembly, which she has been planning in this empty room every Wednesday for a year. The room is not empty.'),
      L('calloway', 'Oh. Oh, look at you all.'),
      L('narrator', 'She looks down at her notes, folds them in half, and puts them in her pocket.'),
      L('calloway', 'Hello.'),
      L('sato', '(quietly) That was perfect.'),
      L('narrator', 'Six children say hello back, all at slightly different times. Agnes Thorne, at the teacher\'s desk, has to look out of the window for a moment.'),
      L('calloway', 'That was the whole assembly. I had more, but it was not as good. Carry on, Mrs Thorne. I will light a candle with a name on it this afternoon. Several.'),
    ],
    reward: { love: 5 } },
  // ---- Warden Marrow, once the enclave has light.
  { id: 'marrow_under', npc: 'marrow', hearts: 2, map: 'hall', flag: 'ld_enclave', from: H(9), to: H(16),
    lines: [
      L('narrator', 'At the hall desk, Warden Marrow lets her pen stop when you tell her about the shelters under the catacombs.'),
      L('marrow', 'Agnes. Agnes Thorne. She said she would follow me up. She never did, and I never went back down to ask why.'),
      L('marrow', 'I kept sixty-one people alive in those crypts, child. I counted them every night. I thought, when the lifts opened, I had counted them all up.'),
      L('sato', 'She says she has been writing you a letter for three years.'),
      L('marrow', 'Has she. ...So have I. We are a pair of old fools, and the lift goes both ways.'),
      L('marrow', 'Tell her the strawberries by the memorial are for everyone, and there are plenty. And tell her I shall come down on a Saturday. Bring her eggs.'),
    ],
    reward: { love: 3 } },
];

Object.assign(QUESTS, {
  venn: [
    Q('venn_scrap', 'scrap', 6, 'Six bits of scrap, if you have them. Pump three has eaten its own gasket again.', 'Good. That will keep it quiet for a week. It thanks you. I can tell by the noise.'),
    Q('venn_copper', 'copper', 2, 'Two copper ore from the belt. I am rewinding a motor older than you, and it is running out of patience.', 'Copper. Lovely. The motor and I both feel better.'),
    Q('venn_tea', 'tea', 2, 'Bring me two teas from the Hangar? The kettle down here makes everything taste of valve.', 'Real tea. Do not tell Oduya I said it was better than mine. He knows.'),
    Q('venn_pie', 'pie', 1, 'A slice of pie from the Hangar? I have not eaten anything that was not grey since the war. I would like one thing that is not grey.', 'It is brown. Close enough. ...It is very good. Do not watch me eat it.'),
    Q('venn_nickel', 'nickel_iron', 4, 'Four nickel-iron. I want to cast new brackets for the gallery lamps. The old ones are mostly rust and optimism.', 'That will do it. The lamps will stay up now. Probably.', { minHearts: 2 }),
  ],
  thorne: [
    Q('thorne_bread', 'bread', 3, 'Three loaves, if you can carry them. Eleven people and one oven made from a filing cabinet.', 'Bread that did not come out of a filing cabinet. The children are going to make a terrible fuss. Thank you.'),
    Q('thorne_egg', 'egg', 4, 'Four eggs, dear. The little ones have never had a boiled egg. It seems a dreadful gap in an education.', 'Eggs! Real ones. I shall boil them myself and supervise the eating.'),
    Q('thorne_milk', 'milk_s', 2, 'Two small milks. I have been drinking tea black for four years. I would like to remember the other way.', 'Oh. Oh, that is how it is supposed to taste. Thank you, Sato.'),
    Q('thorne_turnip', 'turnip', 5, 'Five turnips from your field. Something green that grew under a sky. I want to cook it and tell them so.', 'There. Grown under a sky. They will eat every one.', { season: 0 }),
    Q('thorne_carrot', 'carrot', 4, 'Four carrots. Moth has seen them in a book and believes they are a myth.', 'Proof. She will be very cross with the book.', { season: 2 }),
    Q('thorne_shiitake', 'shiitake', 3, 'Three shiitake from the beds you mended. For the Sunday pot. It is our oldest recipe, and it was always short of mushrooms.', 'A proper pot at last. Stay and eat. You are on the rota now.', { minHearts: 2 }),
  ],
  moth: [
    Q('moth_berry', 'berry', 3, 'Can you bring me three berries? From a real bush? I want to see if they are as red as in the pages.', 'They ARE red! Redder! The pages were not lying! Thank you thank you.', { season: 1 }),
    Q('moth_strawberry', 'strawberry', 2, 'Two strawberries, please. Gran says they are the best thing up top. I have to check.', 'Gran was right. Do not tell her. She will be unbearable.', { season: 0 }),
    Q('moth_egg', 'egg', 1, 'Can I have an egg? Just one. I want to see if it really comes out of a bird. Gran says yes. I have questions.', 'It is warm! It is SMOOTH! I am never eating it. I am keeping it. ...I am eating it tomorrow.'),
    Q('moth_glowcap', 'glowcap', 2, 'Two glowcaps for my museum. They have to be nice ones. Glowing ones.', 'Perfect. They are glowing at me. That means they like the museum.'),
    Q('moth_apple', 'wild_apple', 2, 'Two apples. Off a tree. Trees are real, Wick says. I need evidence.', 'Evidence! I am going to keep one and eat one. Science.', { season: 2 }),
    Q('moth_pinenut', 'pine_nut', 3, 'Three pine nuts. They come out of a cone. A cone! What is a cone? Bring me some and I will find out.', 'They are tiny! The cone must be enormous. Is it enormous? Do not tell me. I will imagine it.', { season: 3 }),
  ],
  wick: [
    Q('wick_fish_s', 'fish_s', 3, 'Three silverfin from up top? I want to see what fish look like when they have had sunshine.', 'Look at them. Bright as coins. The cave fish will be jealous.'),
    Q('wick_fish_m', 'fish_m', 2, 'Two river trout, if the river is kind. For the ledger. I have room for some foreigners.', 'Speckled. Like the old pictures. Into the ledger they go.', { minHearts: 1 }),
    Q('wick_bread', 'bread', 2, 'Two loaves for bait. It does not help. I just like the ritual.', 'Lovely. I will feed one to the fish and one to me.'),
    Q('wick_fish_l', 'fish_l', 1, 'One chamber carp from up top, for the ledger. I want to show the cave fish what their cousins look like with a tan.', 'A carp! Heavy as a full can. The basin will talk of nothing else.', { minHearts: 3 }),
    Q('wick_tea', 'tea', 1, 'A tea from the Hangar, for a long watch at the Sump. It gets cold down there at night.', 'Hot all the way down the lift? You must have run. Bless you.', { minHearts: 2 }),
  ],
});

FISHING.caught.cave_fish = 'A cave fish, white as a candle. It has no eyes and seems to know exactly where you are.';
FISHING.caught.glowfish = 'A glowfish! It glows a soft cyan in your hands, then dims, embarrassed.';
FISHING.caught.pipe_eel = 'A pipe eel, long and grey and furious about it.';
FISHING.caught.abyss_koi = 'The abyss koi. Deep blue, silver-speckled, older than the war. She looks at you, and you both hold very still.';
// 2026-11-21: the new fish (data.js MORE_FISH, FISH_TABLE)
Object.assign(FISHING.caught, {
  fish_reedling: 'A reedling, olive and indignant, with a bit of reed still in its mouth.',
  fish_dawnscale: 'A dawnscale! It holds the first light of the sun-line in every scale.',
  fish_rainbarb: 'A rain barb, whiskers twitching. It was expecting you; the rain was on the schedule.',
  fish_lantern_cat: 'A lantern catfish. Its two amber spots blink at you like a pair of porch lamps.',
  fish_spokerun: 'A spokerun salmon, all muscle. It has swum halfway round the ring to be this annoyed.',
  fish_paneray: 'A paneray, flat and clear as a window. You can see your own hand through it.',
  fish_stormgar: 'A stormglass gar, crackling faintly. Your hair stands up a little.',
  fish_cloudfin: 'A cloudfin. Its fins drift in the air like the mist off Terrace Falls.',
  fish_cistern_sturgeon: 'A cistern sturgeon, armoured and ancient. It has seen the war and is not impressed by you.',
  fish_earthlight_trout: 'An Earthlight trout: blue sea, green land, white cloud. A whole Earth in your hands.',
  fish_sailfin: 'A sun-line sailfin! Its great sail blazes gold and the whole river seems brighter for it.',
  fish_halo_eel: 'A halo eel, curled into a perfect ring of silver light. Somebody at the church will want to hear about this.',
  fish_deep_angler: 'A cistern angler, its little teal lamp still lit. Wick would call it the other lamp man.',
  fish_ferryman: 'The Ferryman, black as the river at night. He looks at Sato as if checking her name on a list.',
  fish_mochi: 'Lady Mochi! Round, gold and pearl, and plainly expecting a rice cake.',
  fish_admiral: 'Admiral Brass, scarred and gleaming, an old hook in his lip like a medal. He inspects you.',
});
FISH.push('cave_fish', 'glowfish', 'pipe_eel', 'abyss_koi');


export const LOGS = {
  quarantine: { title: 'Quarantine notice', author: 'Colony bulletin, on the landing terminal', text: 'By order of the Directorate, the Lower deck is closed for a medical quarantine. Residents are not to approach the lifts. Rations continue as normal. Please do not be alarmed by the noise from below. Thank you for your patience.' },
  requisition: { title: 'The requisition', author: 'Warden Ilse Marrow', text: 'They call it a quarantine. Nobody is sick. They have taken the pump halls, the cisterns and the old core, and the crates they bring down have no labels, only seals. I asked a man in a grey coat what was in them. He asked me my name. I gave it to him slowly, so he would remember it.' },
  schedule: { title: 'Site Ninefold: schedule', author: 'Directorate memo, cistern pump room', text: 'SITE NINEFOLD. Installation complete day 140. Containment tests at thirty per cent, day 190; sixty per cent, day 205; full yield, day 211. The civilian population above is to remain unaware. Cistern water to be diverted for coolant. Authority: Office of the Marshal.' },
  galt_hands: { title: 'Scratched into the crypt wall', author: 'A Galt prisoner', text: 'We are Galt, from Aldiss. They bring us down to dig under the core, and back to the crypts to sleep. Twelve of us. We sing at night so the others know we are still here. If you are reading this, sing something. Anything. We will not hear it, but sing.' },
  venn60: { title: 'The sixty per cent test', author: 'Engineer Tobias Venn', text: 'Sixty per cent held. Ring three slipped out of phase for four seconds and I did not breathe for any of them. I told the Major we are not ready for full yield. He said the Marshal does not want to hear the word ready. I am going to say it again tomorrow. Louder.' },
  catacombs: { title: 'The crypts', author: 'Warden Ilse Marrow', text: 'Sixty-one of us in the old crypts tonight, and the engineer, who keeps apologising and fixing things. We have water from the cisterns and mushrooms on the walls. Agnes has made a rota. Everyone has a turn. It is the bravest thing I have ever seen: a rota, written in chalk, in the dark.' },
  ninefold: { title: 'Stencil on the round door', author: 'The vault in the gallery', text: 'SITE NINEFOLD. SECTOR NINE. SEALED BY ORDER. The great round door does not move, and no light shows at its seams. Someone has scratched a tally beside it: three hundred and something marks, one for every night. The last mark is quite fresh.' },
  pim_grey: { title: 'Diary: the men in grey', author: 'Pim, age 9 (a page Moth found)', text: 'Men in grey coats came down the lift today and Mum said not to look at them. Old Marrow the warden shouted at one in the garden. I think she won. Drawing: a very tall grey man, and a very small Marrow, who is bigger.' },
  pim_shaking: { title: 'Diary: the shaking', author: 'Pim, age 9 (a page Moth found)', text: 'The floor shook in the night and all the lamps swung. Dad says it is the pumps. Dad is lying, he does his eyebrows. Marrow came round with candles and said keep them, just in case. Drawing: a candle with a face, looking brave.' },
  pim_galt: { title: 'Diary: the attack', author: 'Pim, age 9 (a page Moth found)', text: 'They said on the speakers it was a Galt attack and we must go to the ships. But there were no Galt ships. I was at the window the whole time. Marrow did not get on. She said someone has to mind the gardens. Drawing: a window, empty, with stars.' },
  moth_sun: { title: 'Moth\'s page: the sun-line', author: 'Moth, age 8 (her own page)', text: 'This is my page. It is not from the war. It is from now. Sato says up top there is a lamp so long it goes all the way round. I have drawn it. It goes off the edge of the page, because it is too long. When we go up I am going to check.' },
};

export const LOWER = {
  arrive: [
    'The lift sinks past the Main deck and keeps going, down a shaft lined with cable and old paint, until the light in the car is the only light there is.',
    'It stops with a clank. A caged platform, two work lamps, and beyond them a dark so complete it seems to have weight. Water drips somewhere. Something hums.',
  ],
  down: 'The lift sinks into the dark. The Lower deck: warm, damp, humming.',
  up: 'The lift climbs out of the dark, and the light comes back a deck at a time.',
  dark: 'It is too dark to go on. The work lights would let you through. (Fund them at the restoration terminal: the green screen just north-east of the lift, beside the sign. Face it and press E.)',
  terminal: 'The restoration terminal. Its green screen lists every project Venn has wanted to do for three years. Pick one, pay its credits and parts, and Venn has it done by morning.',
  funded: 'The terminal prints a ticket with a satisfied little chirp. Venn will work through the night.',
  bulkhead: 'Sealed. The terminal by the lift can tell you what it would take.',
  bedEmpty: 'An empty catacomb bed, dark and damp. Plant a spore bag here.',
  bedRotten: 'A rotten old growing bed. The catacombs need restoring before anything grows here.',
  pumpBroken: 'An old pump, silent. Its gauge reads zero. A brass plate: FIT PARTS HERE.',
  pumpRunning: 'The pump thrums steadily. The gauge needle trembles in the green.',
  vault: 'A huge round door, sealed. Your hand on it: cold, and very faintly humming. Not yet, it seems to say.',
  pupils: ['A pupil is drawing a fish with too many fins. "It is a Wick fish," she explains.', 'A boy is very carefully writing his own name, tongue out.', 'Two pupils are sharing a crayon and an argument about the colour of the sky.', 'A small girl waves at you with her whole arm.'],
  houses: {
    'central.house_1': 'THORNE, on a new brass plate. A rota is chalked on the inside of the window, and a child\'s drawing of a lamp.',
    'central.house_2': 'The boards are down and the chalk sunflower has been kept, framed. OKAFOR, says the door. Somebody inside is practising the recorder.',
    'central.house_5': 'LIND, in careful letters. Two pairs of boots by the step, one tiny. The note about the keys is gone.',
    'central.house_6': 'The roof garden has been weeded. BARROS. Through the window, a family is learning how the taps work, and laughing.',
  },
  rehoused: 'Undercroft: the families are up. The school in Eden Central has its first pupils.',
};

HELP.push({
  title: 'The Lower deck (the Undercroft)',
  body: 'The spoke lift goes all the way down, past Eden Central, to the Lower deck. At first only the landing is lit. Tobias Venn\'s restoration terminal by the lift lists the projects: work lights, the Pump Halls, the Mushroom Catacombs, the Survivors\' Enclave and, once the families trust you, homes for them up on the Main deck. Each costs credits and materials and is done by morning; Venn\'s bench makes lamp kits and pump parts.\n\nThe pump halls have cave fish, glowfish and, after six, pipe eels; fit pump parts to the silent pumps to drain more tunnels. Catacomb beds grow mushrooms from spore bags all year. Logs from the terminals and Moth\'s diary pages are in the journal (P), under Logs.',
});

// ------------------------------------------------------------------ the Undercroft, release 2 (docs/FARM.md §14)
// The Works, the Thermal Vents and the reactor chain, the last ten logs and the vault behind the round door.
Object.assign(LOGS, {
  works_ledger: { title: 'Fabrication ledger', author: 'Engineer Tobias Venn', text: 'Works order 4471: forty-eight coil segments, ring three. Works order 4472: the same, because the Major dropped the first set. Works order 4473: a cot, a kettle and blankets for the crypts, signed for by me and charged to the Office of the Marshal. Let them find that one in the audit.' },
  galt_cover: { title: 'Draft bulletin, unsent', author: 'Directorate dispatch office', text: 'DRAFT. "At 02:10 a Galt strike craft breached the Lower deck. Damage is contained. Evacuate to the ships in good order." Margin, in pencil: no Galt craft were within a light-hour. Reply, in ink: then nobody will contradict it. Approved. Burn the draft.' },
  bathhouse: { title: 'Wash hall rota', author: 'Agnes Thorne, chalked by the boiler', text: 'Hot water from the core pipe, Tuesdays and Saturdays, while T.V. says the needle is green. Children first, then the old, then whoever is left. Two minutes each. Sing while you wash so the next one knows when you are done. Nobody is to say the word "reactor" in front of Moth.' },
  marrow_last: { title: 'Chalk on the tiles', author: 'Warden Ilse Marrow', text: 'Going up tomorrow with the gardens and the ones who can climb. Agnes stays with the ones who cannot. Sixty-one counted down here; forty-nine go up with me. I will come back for twelve. I will come back for twelve. Wash the tiles if I am late. I will not be late.' },
  day211: { title: 'Day 211', author: 'Engineer Tobias Venn, the reactor console', text: 'Full yield, 02:04. Ring three went out of phase at 02:06 and did not come back. It did not explode. It folded: the light went in instead of out, and took the test floor with it. The core held because I held it. The Major left on the first lift. I stayed, because somebody had to turn the valves.' },
  galt_door: { title: 'Scratched inside the shielding', author: 'The Galt prisoners', text: 'The engineer opened our door the night of the shaking. Then the warden took us up the service ladder in colony coats with colony names. Twelve. We are going home on the ships as other people. If you find this, the singing worked. Thank the warden. Thank the tall sad one with the valves.' },
  venn_key: { title: 'The sealing', author: 'Engineer Tobias Venn', text: 'I sealed Sector Nine with the Works bus, because the Directorate cut the main feed when they left. The code is Agnes\'s rota: water, cooking, watch, washing, lessons. Feed the lock from the Works, drain the sill with the gallery pump, and say the rota to the door. I hope it is you. I hope it is everyone.' },
  ninefold_report: { title: 'Site Ninefold: final report', author: 'Office of the Marshal (copy left on the vault desk)', text: 'Test failed at full yield. Device unrecoverable. Lower deck to be written off. Public account: Galt attack, evacuation, heroic loss. Residents unaccounted for are presumed dead and are not to be recovered. Under it, in Venn\'s hand: "Sixty-one were recovered. By the people you did not count."' },
  the_roll: { title: 'The roll', author: 'Chalk on the vault wall', text: 'Every name, in two hands: the warden\'s capitals and Agnes\'s neat joined-up. Sixty-one of the colony, twelve of Galt, one engineer. Beside each name a tick for every night counted. The last column has a heading in a child\'s writing: UP. Every name has a tick in it but one, and that is Venn\'s. He has added it now, in pencil.' },
  agnes_letter: { title: 'A letter, finished', author: 'Agnes Thorne, to Ilse Marrow', text: 'Ilse. You did come back. Not for me: for the twelve, the night before the ships, and you took them up the ladder in our coats. I was so angry I did not write for three years. I have been wrong for about two and a half of them. Come for tea. Bring eggs. Bring the strawberries. Your friend, A.' },
});
Object.assign(LOWER, {
  works: 'The Works. A press the size of a cottage wakes with a cough and a long, contented hiss. Venn wipes his hands and holds out the order book.',
  worksShut: 'The press is asleep under a dust sheet. (The Works project at the terminal wakes it.)',
  vents: 'The vent bath: warm tiles, a deep pool fed by the reactor\'s spare heat, steam ticking in the brass pipes, and glowcaps along the ledge.',
  ventsShut: 'The wash hall is cold. (The Thermal Vents project at the terminal brings the heat back.)',
  reactorShut: 'Behind the cold wash hall, a console of red needles. (Restore the Thermal Vents first.)',
  reactorDone: 'Every needle on the reactor console reads zero and stays there. The core hums, very softly, like a cat that has decided to stay.',
  vaultHint: 'The lock ring is cold. Venn\'s logs may say how it opens.',
  vaultWait: 'The lock ring on the round door, checked off on your fingers:',
  ventFree: 'The reactor pays for this one.',
});
// Each reactor job is a short scene at the console, with Venn and, for two of them, Ruess.
export const REACTOR = {
  gauges: [
    L('narrator', 'Venn lifts a cracked gauge glass out with two fingers, like a splinter, and slots in the new silica one. The needle behind it is in the red, and has been for years.'),
    L('venn', 'There. Now we can see how worried to be. Worried is better than guessing.'),
    L('venn', 'There is a log in this console. Day 211. I never played it back. ...You play it. I will hold the torch.'),
  ],
  valves: [
    L('narrator', 'Two red handwheels, seized solid. You lean on one, Venn on the other. Rust gives, then the cistern water sighs through the jacket and the first needle drops out of the red.'),
    L('venn', 'Cold water round a warm heart. That is all a reactor wants. That is all most people want.'),
    L('venn', 'Next, the jacket. I need titanium and I need Ruess. Do not tell him I said the second part.'),
  ],
  jacket: [
    L('narrator', 'The lift comes down with a cart full of titanium plate and Prof. Ruess on top of it, in a hard hat, looking furious and delighted at once.'),
    L('ruess', 'Tobias. You built a reactor in a cellar and then sat on it for three years.'),
    L('venn', 'Yes.'),
    L('ruess', '...Hold this. Not like that. Like that. Sato, rivets. Hand them to me in order of size and we will not speak of feelings.'),
    L('narrator', 'Behind the last plate, Ruess stops. Something is scratched into the old shielding. He calls you over and, for once, says nothing at all.'),
  ],
  rods: [
    L('narrator', 'The damping rods go in one at a time, platinum tips first, with comet ice packed round them hissing like a kettle. Ruess counts. Venn listens to the core with his ear to the casing.'),
    L('ruess', 'Three needles green. I would like it on record that I have never worked on anything so stupid or so well built.'),
    L('venn', 'It is on record. I am the record. One more job and it sleeps.'),
  ],
  cold: [
    L('narrator', 'The safety loop takes the charged batteries with a click each. Then Venn walks the console from one end to the other, turning each needle down to zero, slowly, the way you would lower a sleeping child into a cot.'),
    L('venn', 'Done. It is cold. It is safe. It will keep the bath warm and the beds warm, and nothing else, ever.'),
    L('venn', 'There is one more tape in here. Mine. I recorded it the night I sealed the door. It says how to open it.'),
    L('venn', '...I always meant it for whoever made the reactor safe first. I did not think it would be somebody with mud on their boots. I am very glad it is.'),
  ],
};
// The vault: a quiet scene with the people who knew.
export const VAULT = {
  open: [
    L('narrator', 'Word goes up the lift faster than you do. By the time the cable from the Works is humming, Venn is at the round door, Agnes beside him in her good coat, and Warden Marrow has come down the lift for the first time since the war, with a basket of eggs.'),
    L('marrow', 'Agnes.'),
    L('thorne', 'Ilse. You are late.'),
    L('marrow', 'Three years. I know. I counted.'),
    L('venn', 'Sato. The rota. Say it to the door.'),
    L('sato', 'Water. Cooking. Watch. Washing. Lessons.'),
    L('narrator', 'The lock ring turns, one click a word. The round door rolls aside on its rail, and a breath of cold, clean air comes out, the first in years.'),
    L('narrator', 'Inside: a test floor gone smooth as glass, and on it the great broken ring of the machine, dark and still. A desk with a report on it. And on the far wall, in chalk, every name.'),
    L('thorne', 'The roll. We wrote it in here because it was the only wall they never looked at.'),
    L('marrow', 'And the twelve. Look, Agnes. Their names are on the ships\' list too, under ours. They got home.'),
    L('thorne', '...I was so angry with you for going up. And you went up to get them out.'),
    L('marrow', 'I should have told you. I was afraid you would make me take you, and someone had to keep the children singing.'),
    L('narrator', 'Agnes takes a folded letter out of her coat, three years old, finished last night. She gives it to Marrow. Marrow gives her the eggs. Neither of them says anything for some time.'),
    L('venn', 'It was not Galt. It was never Galt. It was me, and the Major, and a machine that should not have been built. Now everyone will know.'),
    L('sato', 'Everyone will know who stayed, too.'),
    L('narrator', 'Venn crouches by the ring and cuts away a thin sliver of it with a hand tool, then presses it into your palm. It is cold, and it glows faintly blue, like a held breath.'),
    L('venn', 'Something from it should end up with somebody kind. Go on. It does nothing now but shine.'),
  ],
  after: 'The vault is open and quiet. The roll on the wall has a new pencil tick in the UP column.',
};
LOWER_SCENES.push(
  { id: 'marrow_vault', npc: 'marrow', hearts: 0, map: 'hall', flag: 'ld_vault', from: H(9), to: H(16),
    lines: [
      L('narrator', 'Warden Marrow has cleared the hall\'s long table. On it lies a fair copy of the roll from the vault, sixty-one names and twelve and one.'),
      L('marrow', 'They are going on the memorial. All of them. The colony\'s, the Galt twelve, and Tobias Venn, who is going to hate it.'),
      L('marrow', 'For three years the board in Eden Central said "Galt attack". This morning the Governor took it down himself. He did not make a speech. I liked him for that.'),
      L('sato', 'And Agnes?'),
      L('marrow', 'Agnes has put me on her rota. Saturdays, eggs. I have never been so happy to be told what to do.'),
    ],
    reward: { love: 8 } },
);
// Notices that change once the vault is open (main.js reads SIGNS_VAULT[sign] before SIGNS[sign]).
export const SIGNS_VAULT = {
  'central.board': 'NOTICE FROM THE GOVERNOR\'S OFFICE: the Lower deck was not attacked by Galt. It was lost to a Directorate weapons test, and its people were kept alive below by their neighbours. Their names are on the Willowfall memorial. The lift goes all the way down. Visit.',
  'lower.gallery': 'THE GALLERY. West: pump halls. East: the catacombs. South: the Works and the Vents. North: SECTOR NINE, OPEN. (Under the old stencil, in chalk: "Mind the step. Mind each other.")',
};
export const RADIO_VAULT = [
  'Vesna on the night show: "This one is for the Lower deck. All of it. And for the people who kept the lamps lit when nobody upstairs knew there was anyone to light them for."',
  'Vesna here. "I have had more letters this week than in a year. Most of them say: we didn\'t know. Some of them say: we did. Both are welcome on this station."',
  'Radio Willowfall: "Tobias Venn has asked me to say that he is not a hero, and that he will not be giving interviews. He then talked to me for forty minutes about valves. Lovely man."',
];
HELP.push({
  title: 'The Undercroft: the Works, the Vents and the vault',
  body: 'Two more projects at Venn\'s terminal open the south of the Lower deck. The Works press turns scrap and belt ore into parts in bulk, batteries, alloy, robot upgrades, tool grips, farmhouse decor and gifts; its bin recycles junk. The Thermal Vents warm a bath that restores stamina like the onsen (60 cr).\n\nAt the reactor console, five jobs with Venn and Ruess, one a day, make the old core safe: then the bath is free and the catacomb beds grow twice as fast. Venn\'s last log says how to open the round door: a feed from the Works, the gallery pump running (6 pump parts), and the rota.',
});
// Gifts from the Works, and a word or two from the people below about the new halls.
for (const [id, items] of Object.entries({ venn: { pipe_whistle: 'liked', gear_brooch: 'liked' }, thorne: { tin_lantern: 'loved', gear_brooch: 'liked' }, moth: { pipe_whistle: 'loved', tin_lantern: 'loved', gear_brooch: 'liked' }, wick: { tin_lantern: 'liked', pipe_whistle: 'liked' }, marrow: { tin_lantern: 'loved' } })) Object.assign(tierOf[id] ||= {}, items);
Object.assign(TALK.venn.flag, {
  ld_works: [['The press is awake. I had forgotten how it sings.', 'Bring me scrap. Bring me ore. The Works is the only machine I ever built that I am proud of.']],
  ld_vents: ['Hot water. Real hot water, down here. Agnes cried. Wick pretended he was not in the bath at all.'],
  ld_reactor: [['It is cold. It is safe. I keep going to look at the needles.', 'Three years of listening for the wrong noise. Now there is no noise at all. I do not know what to do with my ears.']],
  ld_vault: [['Everyone knows now.', 'I thought it would feel like being found out. It feels like putting down a crate I have been carrying up a hill.'], 'Ruess has asked me to dinner on Fridays. On purpose. I am told this is called a friend.'],
});
Object.assign(TALK.thorne.flag, { ld_vault: [['Ilse comes on Saturdays now, with eggs. We argue about the rota.', 'It is the happiest I have been since before the war.'], 'I was angry with the wrong person for three years. Do not do that, Sato. It is very tiring.'] });
Object.assign(TALK.moth.flag, { ld_vents: ['There is a BATH. It is warm. The glowcaps steam. I am going to live in it.'], ld_vault: ['The round door is open! It was just names inside. And a broken ring. And Mr Venn crying, but he says that was dust.'] });
Object.assign(TALK.wick.flag, { ld_vents: ['I have had a bath. My first in four years with the water hot all the way through. The fish can smell the difference. They approve.'] });
// ---- the Hub Cup: the Zero-G Arena's festival (Autumn 19, held once the arena is restored: `flag`). Sato throws five
// times at the hoop (sim.playHubCup); Tika, Kestrel and Wick throw too, and the decks come down the lift to watch.
FESTIVALS.push({
  id: 'hubcup', name: 'The Hub Cup', season: 2, day: 19, from: H(10), to: H(16), spot: 'lower.arena', flag: 'ld_arena',
  blurb: 'The Hub Cup in the Lower deck\'s Zero-G Arena from ten: five throws at the hoop with the gravity off, and every deck in the stands.',
  lines: [
    L('narrator', 'The lift has been running full since nine. The stands round the old drum are packed with all three decks at once, eating Lark\'s buns and pointing at the floating balls.'),
    L('vesna', 'Good morning, Eden, live from the bottom of the world! This is the Hub Cup, back for the first time since the war. Tika, is the cable holding?'),
    L('tika', 'It is holding! I tied it to Venn. If he walks off, we lose the broadcast.'),
    L('venn', 'I am not walking anywhere. I have made a trophy. I would like to see somebody win it.'),
    L('kestrel', 'Five throws. Gravity off. Push off the rail, let go at the top of the swing, and do not chase the ball. The ball always wins a chase.'),
    L('wick', 'I played in the last Hub Cup before the war. I came fourth of four. I have been practising.'),
    L('moth', 'GO SATO! Gran says I am allowed to shout because it is a sport.'),
    L('marrow', 'Agnes and I have a bet on. I shall not say which way. Agnes, sit down, you are blocking the Constable.'),
    L('fenn', 'I am not blocked. I am keeping order from a low position. It is a recognised technique.'),
    L('sato', 'Let go at the top of the swing. Do not chase the ball. Right. I can do that. Probably.'),
  ],
  reward: { money: 300 },
});
FESTIVAL_SPOTS['lower.arena'] = Object.fromEntries(VILLAGERS.map((id, i) => [id, ['lower.stands', 'lower.stands2', 'lower.arenagate'][i % 3]]));
Object.assign(FESTIVAL_SPOTS['lower.arena'], { tika: 'lower.arenagate', kestrel: 'lower.arenagate', wick: 'lower.arenagate', venn: 'lower.arenagate', vesna: 'lower.stands2', moth: 'lower.stands', thorne: 'lower.stands', marrow: 'lower.stands' });
export const HUB_CUP_LINES = {
  win: [L('venn', 'First place. Here. It is a pump bell with a handle. It is the best thing I have made this year, and I made a reactor safe.'), L('moth', 'SATO WON! I shouted and it WORKED!')],
  place: [L('kestrel', 'Good throwing. You let go clean. Next year, let go a hair sooner.'), L('marrow', 'A fine effort, my dear. Agnes owes me an egg.')],
  try: [L('wick', 'Fourth of four. Welcome to the club. We meet at the basins and say "next year".'), L('moth', 'You were the best at floating. That counts. I have decided it counts.')],
  arenaShut: 'The drum is quiet, its balls tethered. The Hub Cup is on Autumn 19, from ten.',
  played: 'You have had your five throws this year. The stands are still cheering someone.',
};
// ---- Hana Corvel (release 2): Venn's apprentice before the war, who hid in the ducts above the Works for three years and
// comes back down the day the press wakes. A friend, not a romance candidate; she lives below, so she is one of the UNDERFOLK.
UNDERFOLK.push('hana'); VILLAGERS.push('hana'); SPOTS.push('lower.press');
NPCS.hana = {
  id: 'hana', name: 'Hana Corvel', short: 'Hana', title: 'Venn\'s apprentice at the Works; back from the ducts', portrait: 'look:hana',
  look: { skin: '#f3d2b8', hair: '#2f3354', top: '#c8553d', bottom: '#3d4f6a', style: 'odango' },
  birthday: { season: 3, day: 19 },
  loves: ['copper', 'honey_toast', 'strawberry', 'glowcap'],
  likes: ['scrap', 'tea', 'bread', 'pie', 'nickel_iron', 'cave_fish', 'mushroom_skewer'],
  dislikes: ['tonic', 'pipe_eel', 'onion'],
};
tierOf.hana = { ...Object.fromEntries(NPCS.hana.dislikes.map((x) => [x, 'disliked'])), ...Object.fromEntries(NPCS.hana.likes.map((x) => [x, 'liked'])), ...Object.fromEntries(NPCS.hana.loves.map((x) => [x, 'loved'])), gear_brooch: 'loved', pipe_whistle: 'liked', tin_lantern: 'liked' };
FESTIVAL_SPOTS['lower.arena'].hana = 'lower.arenagate';
// The press all day, lunch at the kettle, the bath after work; Sundays in the drum and the warm tiles.
SCHEDULE.hana = (wd, m, c) => {
  const f = (c && c.flags) || {}; if (!f.ld_works) return null;
  if (wd === 6) return pick(m, [H(9), H(13), f.ld_arena ? 'lower.arena' : 'lower.gallery'], [H(13), H(17), f.ld_vents ? 'lower.vents' : 'lower.pumps'], [H(17), H(21), 'lower.gallery']);
  return pick(m, [H(7, 30), H(12), 'lower.press'], [H(12), H(13), 'lower.works'], [H(13), H(17), 'lower.press'], [H(17), H(19), f.ld_vents ? 'lower.vents' : 'lower.gallery'], [H(19), H(22), 'lower.landing']);
};
TALK.hana = {
  first: ['Oh! A person. A whole one. Sorry. I am Hana. I used to work here.', 'I still work here, apparently. The press woke up and so did I.'],
  bday: ['You remembered! Nobody has had my birthday on a list for three years. I was starting to think I had stopped having them.', 'Thank you. I am going to be insufferable all day.'],
  b0: [
    ['I was Venn\'s apprentice. Then the shaking, and I hid in the ducts above the press.', 'Three years. I came out for mushrooms and water and went back in. I am very good at ducts now.'],
    'The press takes scrap and ore and gives back lamps. It is the nicest machine in the colony. Do not tell the reactor.',
    ['Venn cried when I came down the ladder.', 'He says it was dust. There is a lot of dust in here. I cried too, and that was also dust.'],
  ],
  b1: [
    'Bring me copper and I will make you anything. Within reason. Within slightly unreasonable reason.',
    ['I heard the families singing through the vents, all three years.', 'I sang back, very quietly. Agnes says she always thought it was the pipes.'],
    'Moth wants a lantern with a door that opens. I am designing hinges. I have never been so happy about hinges.',
  ],
  b2: [
    ['People up top think the Lower deck is sad.', 'It is warm and it hums and everybody knows your name. It is the least sad place I know.'],
    'You have soot on your nose. ...There. Gone. Now I have soot on my thumb. That is fair.',
    ['Tika came down to see the press.', 'We talked about gear ratios for four hours. Venn went to bed. It was the best night I have had in years.'],
  ],
  b3: [
    'If I ever have a workshop of my own, there will be a stool in it with your name on it. Painted. Badly. With love.',
    ['I was so frightened in the ducts.', 'Then a farmer came down the lift and started lighting lamps. I watched you from the grille for a week before I was brave enough.'],
    'You are my favourite person who is not a machine. That is the highest honour I can give. Ask anyone.',
  ],
  s0: 'Spring up top? Down here it means the cistern water warms and the press runs sweeter. Same thing, really.',
  s1: 'Summer. The vent bath is too hot by noon. I go anyway. I am stubborn and pink.',
  s2: 'Autumn means the Hub Cup. I am not competing. I am in charge of the ball pump. It is a position of great power.',
  s3: 'Winter. Everyone from up top comes down for the warm tiles. I charge them nothing and judge them silently.',
  sun: 'No weather down here. I miss weather. Is that silly? I miss being rained on.',
  rain: 'Raining up top? Tell me about it. Every drop. I want details.',
  snow: 'Snow! Up top! I am going up to look at it after work. Do not let me make a snow-Venn. I will make a snow-Venn.',
  storm: 'A storm up top. The lift hums differently in a storm. I can feel it in my teeth.',
  morning: 'Morning! The press has its coffee first, which is oil, and then I have mine, which is also nearly oil.',
  evening: 'End of the shift. My hands smell of copper and my hair smells of steam. A perfect day.',
  year2: ['A whole year of you coming down the lift.', 'I keep a tally on the press, like the one by the round door. Yours is the happy kind.'],
  flag: {
    ld_vents: ['The vent bath! I sit on the warm tiles and the glowcaps steam and I do not think about the ducts at all.'],
    ld_reactor: [['Ruess said my rivets were acceptable.', 'Acceptable! From Ruess! I am having it engraved.']],
    ld_vault: [['The round door is open.', 'I always wondered what Venn was guarding. It was names. Mine is on the wall, under the Works. I did not know he had written it.']],
  },
};
GIFT.hana = {
  loved: 'For me? Oh, this is wonderful. I am going to put it somewhere the press can see it. It gets jealous.',
  liked: 'Thank you! That is going straight in my pocket, with the screws and the good bolts.',
  neutral: 'Ooh, a thing. Thank you. I will find out what it is for. I always do, eventually.',
  disliked: 'Ah. No. Duct food, that. I have had enough to last me. Thank you anyway, truly.',
  bday: 'On my birthday! ',
};
MEETINGS.hana = [
  L('narrator', 'A clang from inside the Works, and a young woman drops out of a ceiling hatch onto a stack of crates, soot on her cheeks, two dark buns of hair tied up with red cloth.'),
  L('hana', 'Ow. Fine. I am fine. Hello! You are the farmer. The one with the lamps.'),
  L('sato', 'Mira Sato. Were you... in the ceiling?'),
  L('hana', 'In the ducts. Since the shaking. Three years. I am Hana Corvel, Venn\'s apprentice, and I heard the press start this morning and I thought: oh, I miss that noise.'),
  L('hana', 'So I came down. Venn sat on a crate and did not say anything for a long time. Then he gave me my old gloves. He had kept them on a hook.'),
  L('hana', 'Anyway! If you want something made, tell me. If you want it made well, tell Venn. If you want it made fast, definitely tell me.'),
];
QUESTS.hana = [
  Q('hana_copper', 'copper', 3, 'Three copper ore? I am rewinding the crane motor and I refuse to ask Venn for his. He labels them.', 'Copper! Lovely and shiny. The crane says thank you. It says it by not falling on me.'),
  Q('hana_bread', 'bread', 2, 'Two loaves from up top. I lived on duct mushrooms for three years. I am making up for it one loaf at a time.', 'Still warm from the lift! I am going to eat one now and the other one also now.'),
  Q('hana_tea', 'tea', 1, 'A tea from the Hangar? Venn\'s kettle tastes of valve and so, by now, does Venn.', 'Real tea. I am going to drink it very slowly in front of him.'),
  Q('hana_scrap', 'scrap', 6, 'Six scrap for the press. Moth has requested a lantern with a door that opens. She has drawn the hinges.', 'Perfect. The hinges will be exactly as drawn. They will not work, but they will be exactly as drawn.', { minHearts: 2 }),
  Q('hana_strawberry', 'strawberry', 3, 'Three strawberries. I have never had one. Everybody up top talks about them like a religion.', 'Oh. Oh no. Now I understand. I am converted. I am a strawberry person now.', { season: 0 }),
  Q('hana_glowcap', 'glowcap', 2, 'Two glowcaps for the ledge in the vent bath. They steam so prettily in the warm. It is my favourite thing on the deck.', 'There. Look at them glow. Thank you, Sato. Come and soak some evening; I will save you the warm end.', { minHearts: 3 }),
];
EVENTS.push(
  { id: 'hana3', npc: 'hana', hearts: 3, map: 'lower', flag: 'ld_works', from: H(13), to: H(17),
    lines: [
      L('narrator', 'Hana is lying on her back under the press with only her boots showing. A spanner is singing a tune against a bolt.'),
      L('hana', 'Sato? Hand me the thin one. No, the other thin one. Thank you.'),
      L('hana', 'Up in the ducts I kept a list of every machine I could hear. Pumps, fans, the lift. I gave them names so I would have someone to talk to.'),
      L('hana', 'The press was Aunt Doris. Do not tell Venn. He would never recover.'),
      L('sato', 'I think Aunt Doris is a very good name for a press.'),
      L('hana', 'You see? This is why I came out. Here. I pressed you a brooch from a gauge gear. It still turns if you breathe on it.'),
    ],
    reward: { love: 4, item: ['gear_brooch', 1] } },
  { id: 'hana7', npc: 'hana', hearts: 7, map: 'lower', flag: 'ld_vents', from: H(17), to: H(19),
    lines: [
      L('narrator', 'The vent bath after the shift. Hana sits on the warm tiles with her feet in the water and her buns coming undone, lining glowcaps up along the ledge.'),
      L('hana', 'I used to watch you through the grille, you know. Lighting lamps. One a day, sometimes two.'),
      L('hana', 'I thought: if she keeps going, one day she will light the Works, and I can come down. I counted the lamps like Wick counts fish.'),
      L('sato', 'Why did you not just call out?'),
      L('hana', 'I forgot how. Three years is a long time to be quiet. You taught me again, a lamp at a time.'),
      L('hana', 'So. Thank you. That is all. Now get in, the water is perfect, and if you splash my glowcaps I will never forgive you.'),
    ],
    reward: { love: 5, item: ['tin_lantern', 1] } },
);

// ------------------------------------------------------------------ homes (2026-11-19: "every main character has a home ... you can visit")
// Whose home is which (maps.js HOMES builds the rooms and doors; a person stands at `home_<key>.<id>` inside). Hours awake:
// whereIs fills their free time with home between waking and bed (not in a storm: then it stays null and they are indoors at home,
// and not in a lie-in). `when`: the flag before which they are not on the deck at all. Partners live at the farm.
export const HOMES = {
  general: { home: 'general', wake: H(7), bed: H(22) }, ruess: { home: 'ruess', wake: H(7), bed: H(22) }, marrow: { home: 'marrow', wake: H(7), bed: H(21, 30) },
  seln: { home: 'seln', wake: H(7), bed: H(21, 30) }, corran: { home: 'corran', wake: H(7), bed: H(21, 30) }, oduya: { home: 'oduya', wake: H(7, 30), bed: H(23) },
  maris: { home: 'maris', wake: H(7), bed: H(21, 30) }, vashti: { home: 'vashti', wake: H(7), bed: H(21, 30) }, moraine: { home: 'moraine', wake: H(8), bed: H(22) },
  kestrel: { home: 'kestrel', wake: H(7), bed: H(22) }, mori: { home: 'mori', wake: H(7), bed: H(22) }, yui: { home: 'yui', wake: H(7, 30), bed: H(22) },
  calloway: { home: 'calloway', wake: H(7), bed: H(21, 30) }, fenn: { home: 'fenn', wake: H(7), bed: H(21, 30) },
  pia: { home: 'pia', wake: H(7), bed: H(21, 30) }, lark: { home: 'lark', wake: H(7), bed: H(19, 30) }, noor: { home: 'noor', wake: H(7), bed: H(21, 30) },
  tika: { home: 'tika', wake: H(7), bed: H(22) }, vesna: { home: 'vesna', wake: H(7), bed: H(23), nap: (wd) => (wd === 6 ? [H(7), H(11)] : [H(9), H(12)]) },
  venn: { home: 'venn', wake: H(7), bed: H(22) }, wick: { home: 'wick', wake: H(7), bed: H(23), when: 'ld_pumps' }, hana: { home: 'hana', wake: H(7), bed: H(22), when: 'ld_works' },
  thorne: { home: (f) => (f.ld_rehoused ? 'thornes' : 'shelter'), wake: H(7), bed: H(21, 30), when: 'ld_enclave' },
  moth: { home: (f) => (f.ld_rehoused ? 'thornes' : 'shelter'), wake: H(7), bed: H(20), when: 'ld_catacombs' },
};
export function homeKey(npcId, flags = {}) { const h = HOMES[npcId]; if (!h || (h.when && !flags[h.when])) return null; return typeof h.home === 'function' ? h.home(flags) : h.home; }
export function homeSpot(npcId, ctx = {}) {
  if (ctx.partner === npcId) return HOMES[npcId] ? 'farm.porch' : null;       // a partner lives at the farm
  const k = homeKey(npcId, ctx.flags || {}); return k ? `home_${k}.${npcId}` : null;
}
export function awake(npcId, wd, m) { const h = HOMES[npcId]; if (!h || m < h.wake || m >= h.bed) return false; const n = h.nap && h.nap(wd); return !(n && m >= n[0] && m < n[1]); }
// 'home' (in, awake), 'out' (somewhere else), 'asleep' (in bed, or a lie-in) or 'away' (not on the deck yet).
export function presence(npcId, ctx) {
  const hs = homeSpot(npcId, ctx); if (!hs || !ctx) return 'away';
  const w = whereIs(npcId, ctx); if (w) return w.spot === hs ? 'home' : 'out';
  const m = Number(ctx.minute) || 0, wd = (((Number(ctx.weekday) || 0) % 7) + 7) % 7;
  return !awake(npcId, wd, m) ? 'asleep' : ctx.weather === 'storm' ? 'home' : 'away';
}
// Knocking and visiting. note: pinned to the door when they are out; asleep: through the door; shy: not close enough yet;
// visit: talk at home (1-2 lines each); in: what Sato sees as she comes in.
export const HOME_LINES = {
  general: { in: 'Dust sheets on most of it. A piano, half uncovered. Two cups by the kettle, as if he had expected company and lost his nerve.',
    note: 'A card in the window, in a very tidy hand: AT THE OFFICE. (OR, IF IT IS SUNDAY, AT A FARM.)', asleep: 'A lamp goes on upstairs, and then, decisively, off again. The Governor is asleep, and intends to stay so.', shy: '...Sato? I am afraid the house is not fit to be seen. Another time. I mean that.',
    visit: [['I bought this house the week the fleet was sold. I have slept in it eleven times.', 'The office has a perfectly good couch. That is not an excuse. It is a confession.'], ['The piano came with the house. I can play one tune, badly.', 'You may not hear it yet. I am saving it for a day that deserves it.'], 'Sit anywhere that is not under a sheet. I am told that is how homes work.'] },
  ruess: { in: 'Upstairs over the Workshop: a bed, a lamp, and every flat surface covered in drawings of things that do not exist yet.',
    note: 'Chalked on the door: DOWNSTAIRS. OR OUT. OR THINKING. KNOCK LOUDER.', asleep: 'Snoring, through the door. Rhythmic. Possibly calibrated.', shy: 'Up here is private, Captain. The Workshop is open. Bring me something broken and we will talk.',
    visit: [['This is the drawing for the irrigation pump. This is the drawing for the better one.', 'This is the drawing of you falling off the first one. For the archive.'], 'Mind the lamp. It is a prototype. Everything in here is a prototype, including me.', ['I keep a bed up here so I do not have to walk home.', 'I have not walked home in nine years. Do not tell Marrow.']] },
  marrow: { in: 'A neat cottage that smells of soap and old paper. Photographs of the village crowd one wall: every year since before the war.',
    note: 'A slate on the door: AT THE HALL, OR ABOUT. IF IT IS URGENT, IT IS NOT, DEAR. I.M.', asleep: 'A voice through the door: "Whoever that is, it is gone nine. Come back with daylight."', shy: 'Mira? How kind. Not today, dear. Come and see me at the Hall and we will get to know each other properly.',
    visit: [['Every face on that wall is somebody I counted through the siege.', 'The ones who are still here, I count twice. Sit down, you are on it now.'], 'Tea is in the pot. Biscuits are in the tin. Gossip is free and I am not passing on anything I have not checked.', ['I was going to retire, you know. Before all of it.', 'I do not regret staying. I regret the knees.']] },
  seln: { in: 'Two rooms behind the shop, green with cuttings: a shoot on every sill, a tower humming in the corner, a kettle that never quite cools.',
    note: 'On the door, in pencil: IN THE SHOP OR OUT IN THE GREEN. RING THE BELL ON THE COUNTER. A.S.', asleep: 'Seln, through the door, half asleep: "Mira? The shop opens at nine, love. So do I."', shy: 'Oh, the back rooms are just a mess of pots, Mira. Come through the shop and we can talk at the counter.',
    visit: [['Everything on these sills is a cutting from something somebody nearly lost.', 'Bring me a slip of anything you love and it will have a sill here too.'], 'Sit, sit. The kettle is always on. I have never once caught it off.', ['I sleep better in the back of the shop.', 'If anyone comes at night for seed, it is because something needs planting. I like to be near when it does.']] },
  corran: { in: 'The ranch house: boots by the door, a radio tuned to the weather, and on the wall a gun crew of twelve grinning in their shirtsleeves.',
    note: 'A board nailed to the door: OUT WITH THE GIRLS. BACK FOR SUPPER. A.C.', asleep: 'Through the door, a roar of a snore, and a cow somewhere answering it.', shy: 'Ha! The house? It is all boots and old photographs. Come by the counter, lass, I will show you a proper cow.',
    visit: [['That is number two battery. Every one of them. I kept the photograph and lost the rest.', 'Do not look sad about it. They would have hated sad. They would have liked you.'], 'Kettle on! Biscuits in the tin! Mind the dog bed, there is no dog, I keep meaning to get one.', ['My Duchess was born in that corner. Snowstorm. I slept on the floor beside her.', 'Best night of my life, and I have had some nights.']] },
  oduya: { in: 'Oduya\'s cottage is mostly kitchen. Pans hang from every beam, onions sit in crates, and something on the stove is always being tasted.',
    note: 'A chalk menu on the door, with one item: OUT. BACK BY TEN. T.O.', asleep: 'A tired voice through the door: "Kitchen\'s closed, friend. Even mine."', shy: 'You are welcome at the Hangar any hour, friend. My own kitchen is a little more private. Give it time.',
    visit: [['This is where I try things before they are allowed near the Hangar.', 'Tonight it is soup. It is always soup at first. Taste.'], ['On the dock I cooked for four hundred. Here I cook for one, and I keep making four hundred.', 'Take some home. Take all of it home.'], 'Sit at the table. No, the other chair; that one has opinions.'] },
  maris: { in: 'A little flat over the post room: a bed under the eaves, crates of parcels nobody has claimed yet, and a wall of postcards from every deck.',
    note: 'A luggage tag tied to the knocker: OUT ON THE ROUND. BACK BEFORE DARK, PROBABLY. J.M.', asleep: 'A thump, a muffled "Ow", and then silence. Maris has gone back to sleep on the floor, apparently.', shy: 'Oh! Hi! The flat is, um, a lot of parcels right now. Catch me on the round? I will be about.',
    visit: [['Every postcard is a run I came back from.', 'In the war I stopped putting them up. I started again in spring. Yours is the one with the turnip.'], 'Mind the crates. Undelivered. I will find every one of their people if it takes me ten years.', ['Up here I can hear the whole village wake up.', 'Your rooster is first. Then Lark. Then Corran shouting at the rooster.']] },
  vashti: { in: 'A bunk behind a curtain at the back of the hangar. A crate for a table, a tool roll, and one photograph of a street, half its name torn away.',
    note: 'Nothing on the door. It is a hangar. She is somewhere in it, or on the hill.', asleep: 'Through the curtain, flatly: "Asleep. Go away. Politely."', shy: 'This is where I sleep. Not where I talk. The hangar floor is for talking.',
    visit: [['That is the photograph. Half a street sign, a door, a window box.', 'When I find the other half I will need someone to tell. You will do.'], 'Sit on the crate. It is the guest crate. I have one now.', ['I sleep next to the Pallas cradle.', 'In case it needs me in the night. It does not. I like the sound of the cradle cooling.']] },
  moraine: { in: 'The reserved corner house: crimson hangings, a bed fit for a queen in exile, two glass cases of things she will not say where she got, and the stock.',
    note: 'A card on brass: HER MAJESTY IS AT HER EXCHANGE. HER MAJESTY DOES NOT RECEIVE ON THE STEP.', asleep: 'Nothing. Then, very clearly: "It is the middle of the night, Captain. Even queens close."', shy: 'My house is not a shop, Captain. You may visit my shop. When you have earned a chair, I will tell you.',
    visit: [['Everything in those cases was once traded against me.', 'I bought it all back. A queen keeps her receipts.'], 'Sit. The red chair. No one else is allowed in the red chair. That is a compliment; take it.', ['They reserved this house for me before I agreed to stay.', 'The General is a cunning man. I have never forgiven him. I have never moved out.']] },
  kestrel: { in: 'Commander\'s quarters at the Guardians\' Post: a bunk made with corners you could cut bread with, a window onto the stars, and a telescope pointed straight up.',
    note: 'A duty slip under the knocker: CDR KESTREL — ABOUT THE VILLAGE. ANY ALARM, RING THE POST BELL.', asleep: 'A muffled "Stand down, whoever you are. Oh-six-hundred."', shy: 'Quarters are quarters, Sato. I will see you out on the square. That is where I am human.',
    visit: [['I aim the telescope at the hub every night.', 'Not for anything. A pilot likes to know where up is.'], 'Tea? It is ration tea. I have the good stuff hidden. ...I will get the good stuff.', ['My wing gave me that photograph when we stood down.', 'Fourteen of us. We all look terrible. It is the happiest I have ever looked.']] },
  mori: { in: 'A quiet house with a doctor\'s desk, a bonsai older than the colony, books in three languages, and an armchair that has clearly seen a great many late nights.',
    note: 'A card in a neat hand: AT THE CLINIC. IF THIS IS AN EMERGENCY, YOU ARE AT THE WRONG DOOR. H.M.', asleep: 'A soft voice: "If someone is hurt, the clinic bell rings here. If not, sleep. Doctor\'s orders."', shy: 'Sato. I keep my house very quiet; it is the only thing I keep for myself. Come to the clinic, I would like that.',
    visit: [['The tree came up from Earth in my grandfather\'s coat pocket.', 'I prune it on Sundays. It is the only patient who never argues.'], 'Sit in the armchair. It has heard every worry in Willowfall, and kept all of them.', ['I read in three languages so I can be tired in three languages.', 'Tonight I am only tired in one. That is your doing.']] },
  yui: { in: 'Yui\'s cottage is a library that someone also sleeps in. Shelves to the ceiling, books in stacks on the floor, and one chair by the lamp with a blanket over it.',
    note: 'A bookmark tucked in the door: AT THE LIBRARY (THE OTHER ONE). Y.H.', asleep: 'A pause, a page turning, the lamp going out. She is asleep, or pretending, with a book on her face.', shy: 'Oh. Um. My cottage is just more books, really. I would rather show you the library first. It has better chairs.',
    visit: [['These are the books I do not lend.', 'Not because they are precious. Because I have written in all the margins and I am embarrassed.'], 'You can take the chair. I will sit on the stack of encyclopaedias. They are very comfortable from A to F.', ['I read in bed until the words swim.', 'Then I read one more page so the day ends on something good.']] },
  calloway: { in: 'Two rooms behind the church: books, a kettle, a candle for every friend she has buried and one more, and a pot of the famous tomatoes on the sill.',
    note: 'A card pinned to the vestry door: IN THE CHURCH OR THE GARDEN. THE DOOR IS ALWAYS OPEN. (THIS ONE IS NOT. THE BIG ONE IS.) I.C.', asleep: 'A gentle voice through the door: "Not now, my dear. Even I sleep. Light a candle on your way out."', shy: 'The church is open to you any hour, Sato. My rooms are where I keep my tiredness. Soon, I think.',
    visit: [['People think a pastor\'s house is very holy.', 'Mine is mostly tea and seed catalogues. God has never complained.'], 'That candle has no name. It is for whoever needs it tonight. Sometimes it is me.', ['The tomatoes are a scandal. Fenn thinks I am growing them for profit.', 'I am growing them for him. He does not know yet.']] },
  fenn: { in: 'A flat on the canal, kept as a barracks: the bed squared off, boots in a line, framed commendations, and a crate of lost property with a list on its lid.',
    note: 'A typed slip in a plastic sleeve: CONSTABLE A. FENN IS ON DUTY. THE DEPOT IS ALWAYS STAFFED. THANK YOU FOR CALLING.', asleep: 'A crisp "Off duty! Sorry. Off duty. Goodnight, citizen." Then, smaller: "...Goodnight."', shy: 'I am afraid my flat is not open to the public, Captain. It is not regulations. It is just very tidy and I would worry.',
    visit: [['These are the things nobody has come for. Gloves, a doll, one very good spanner.', 'I keep them here so they are not alone at the depot at night. That is not in any manual.'], 'Please, sit. I have a second chair now. I requisitioned it. From myself.', ['That is a commendation for holding the east lock in the siege.', 'I was fifteen. I mostly remember being cold. I am warm now. I mention it.']] },
  pia: { in: 'Pia\'s cottage is a workroom in disguise: a dress form wearing a half-made coat, bolts of cloth by the window, pins in everything, and a very good armchair.',
    note: 'A paper tag pinned to the door: AT THE SHOP. IF YOUR HEM HAS FALLEN, IT WILL KEEP. P.V.', asleep: 'A sharp "We are closed," through the letterbox, then softer: "Oh, it is you. Still closed. Goodnight, farmer."', shy: 'My house is where the unfinished things live. You may come in when you are finished being a stranger. Shop hours, please.',
    visit: [['That coat on the form is for nobody yet.', 'I make one every winter in case somebody arrives who needs it. Somebody always does.'], 'Sit down. No, not there, there are pins. There, also pins. Here. I have moved the pins.', ['I kept the parachute loft\'s last canopy.', 'It is in the cushions. You are sitting on the siege. It is very comfortable now.']] },
  lark: { in: 'Lark\'s cottage smells of yeast and burnt sugar. There is flour on every surface, a loaf proving on the sill, and a bed that has clearly been leapt out of at four.',
    note: 'A floury note on the door: AT THE OVEN! OR ASLEEP! OR BOTH! L.', asleep: 'A snore, a mumble about buns, and nothing more. Lark has been up since four and is not getting up again.', shy: 'Oh, Mira, the house is a flour bomb! Come to the bakery, there are chairs there and they are not sticky.',
    visit: [['This is my test oven. If it works here it goes in the big one.', 'If it does not work here, Corran eats it.'], ['I am always in bed by half seven.', 'Then I lie there and think about tomorrow\'s bake until about eight. It is my favourite hour.'], 'Sit! Have a bun! Not that one, that one is an experiment. Fine, have the experiment.'] },
  noor: { in: 'Noor\'s cottage is a greenhouse with a bed in it. Seed trays on every sill, labelled drawers to the ceiling, beds of seedlings along the walls, and soil on the pillow.',
    note: 'A plant label pushed into the door frame: ASANTE — OUT (IN THE FIELD). DO NOT WATER THE PORCH.', asleep: 'A sleepy voice: "The seedlings are asleep. I am the seedlings. Go away."', shy: 'My house is mostly seeds that are not ready to be looked at. I am also not ready to be looked at. The Seedhouse, please.',
    visit: [['Every drawer is a plant the founders brought up from Earth.', 'Some have not grown in eighty years. I talk to them. They do not answer. Yet.'], 'Sit on the bed, the chair has a tray of beans on it. They are in a very important phase.', ['I sleep better when something is germinating in the room.', 'It is like having company that is busy and does not need anything from me.']] },
  tika: { in: 'Tika\'s place is half bedroom and half workshop, and the workshop is winning: a tool wall, an engine block on the floor, and a bed with a spanner on it.',
    note: 'Taped to the door: AT THE GARAGE OR THE WORKSHOP OR UNDER SOMETHING. SHOUT. T.', asleep: 'From inside, a clatter and a sleepy "Who is fixing what? Oh. Nobody. Goodnight."', shy: 'Uh, the house is not for visitors yet. It is for engines. Come to the garage, it is basically the same but with a sign.',
    visit: [['That engine is from a lifeboat. I am going to make it into a kettle.', 'The biggest kettle in the colony. Ruess says no. Ruess said no to the garage, too.'], 'Sit on the crate. Not the blue crate, the blue crate is live.', ['I sleep with a torch under the pillow.', 'Habit from the drone cupboard. Sometimes I take it apart in my sleep. I wake up and it is in bits.']] },
  vesna: { in: 'Vesna\'s flat is a nest: records floor to ceiling, two speakers taller than she is, posters, fairy lights, and a sofa built for falling asleep on after the night show.',
    note: 'A record sleeve wedged in the door: ON AIR, OR ON MY WAY THERE. TUNE IN. V.', asleep: 'From inside, very faintly, the static between stations, and someone breathing slow and even. Vesna does not do mornings.', shy: 'Ooh, you want to see where the magic happens? It is mostly laundry. Come by the station, I will put you on air instead.',
    visit: [['These are all the records I have played since the all-clear.', 'And this shelf is the ones I could not play. Not yet. One day I will do a whole night of them.'], 'Sit on the sofa. Everyone falls asleep on that sofa. It is famous. It has a fan club.', ['I read the siege lists from that chair. Every night for two years.', 'I moved it to the window after. It deserved a view.']] },
  venn: { in: 'A cabin cut into the rock by the lift: a bunk, a kettle, a terminal that has never been switched off, and the pumps humming through the wall like a cat.',
    note: 'Chalk on the hatch: AT THE BENCH. OR THE PUMPS. OR SHOUTING AT ONE OF THEM. T.V.', asleep: 'Through the hatch, the pumps, and under them someone sleeping very lightly. One knock more would wake him. You let him be.', shy: 'This is where I sleep, when I sleep. Not a place for company. The terminal is open, Sato.',
    visit: [['I can hear every pump on the deck from this bunk.', 'If one changes its note at night, I wake. I have not slept through since the war. I am getting closer.'], 'Kettle is on. It is always on. The pumps keep it warm. Everything down here is somebody\'s spare heat.', ['I built this cabin the week after the seal.', 'I needed to be near the lift. In case anyone came down. You were the first who stayed.']] },
  wick: { in: 'Wick\'s hut, tucked into the pump hall: a tank of tiny glowfish, a radio murmuring the weather from a deck with no weather, and the names of fish chalked on every wall.',
    note: 'Chalked on the hatch: AT THE BASINS. FISH BITING. A.W.', asleep: 'Inside, a slow, contented snore, and the gentle bubbling of the tank.', shy: 'My hut is small and smells of fish, Sato. Come and fish with me first. The basins are friendlier.',
    visit: [['Those in the tank are the little ones. I keep them till they are big enough for the basins.', 'Like a school. Agnes says I am soft. Agnes is right.'], 'Every name on the wall is a fish I have known. Some of them I knew for years. Some of them I ate. Respectfully.', ['I listen to the weather from up top.', 'No weather here. I like to know if you are getting wet.']] },
  hana: { in: 'Hana\'s loft is up a ladder over the Works: a bunk wedged between beams, hinge sketches pinned everywhere, and a little bed of glowcaps for a night light.',
    note: 'A gear on a string, tied to the hatch, with a tag: AT THE PRESS. PULL GEAR TO RING. (IT DOES NOT RING. I AM WORKING ON IT.)', asleep: 'A muffled giggle in a dream about gears, and then silence. Hana sleeps like someone who finally can.', shy: 'Oh! You found the loft. It is very small and very mine and I am not used to visitors yet. The press, maybe? Hi.',
    visit: [['I came out of the ducts, and then I built a duct of my own.', 'It has a window now. It looks at the press. Aunt Doris looks back.'], 'Sit on the bunk. Mind the beam. Everybody hits the beam. I hit the beam this morning.', ['These are the hinges for Moth\'s lantern.', 'Forty-one drawings. Thirty-nine do not work. The fortieth is very nearly a hinge.']] },
  thorne: { in: 'The Thornes\' home is the rota made into a room: everything with its place, chalk on the board, a stove with the kettle on, and a child\'s drawings of lamps along the wall.',
    note: 'A chalk slate on the door: OUT. BACK FOR TEA. WIPE YOUR FEET WHEN WE ARE IN. A.T.', asleep: 'Agnes, low through the door: "The child is asleep. So am I, nearly. Tomorrow, Sato."', shy: 'You are kind to call. The house is a little shy of visitors yet; so am I. Help us a while longer.',
    visit: [['I keep the rota on the wall still.', 'Water, cooking, washing, lessons. Nobody needs it now. It is how I know the day is real.'], 'Sit, sit. The kettle is the same kettle. It came up the lift in my lap.', ['Moth draws a lamp every night before bed.', 'She says it is so the dark knows we are still here. I have never corrected her.']] },
  moth: { in: '', note: '', asleep: '', shy: 'Gran says not yet. Gran says I have to wait to be asked first. ...You are asking. I will ask Gran.',
    visit: [['This is my drawing wall! This one is a lamp. This one is a lamp. This one is Wick.', 'He is also a lamp.'], ['I have a bed with a blanket that is just mine.', 'In the enclave I had half of Gran. That was nice too. This is nicer.'], 'Do you want to see my crayons? Mr Fenn gave them. I have named all of them. This one is called Sato.'] },
};
HOME_LINES.moth.in = HOME_LINES.thorne.in; HOME_LINES.moth.note = HOME_LINES.thorne.note; HOME_LINES.moth.asleep = HOME_LINES.thorne.asleep;
// Notes on doors whose people are not living there (after a move, or before one).
export const HOME_NOTES = {
  shelter: 'The shelter is swept and empty. A chalk note on the frame: GONE UP. BACK FOR CARDS ON SUNDAYS. A.T. (AND M.)',
  thornes: 'A neat townhouse with a brass knocker. A card in the window: TO LET. THE HOUSING OFFICE WILL DECIDE.',
  moved: 'The door is locked and the curtains are drawn. A card on the step: MOVED TO THE HOLLIN FIELD. FORWARD EVERYTHING, ESPECIALLY CAKE.',
  late: 'A light behind the curtain, and then it goes out. It is late to be knocking.',
  goodnight: 'Look at the time. I am for bed, Sato. Thank you for coming; mind the step on your way out.',
  byeOut: 'I have to be off now, I am afraid. Come again soon? I will see you out.',
};
SPOTS.push(...Object.entries(HOMES).flatMap(([id, h]) => (typeof h.home === 'function' ? [h.home({}), h.home({ ld_rehoused: true })] : [h.home]).map((k) => `home_${k}.${id}`)));
HELP.push({
  title: 'People walk, and visiting homes',
  body: 'Everyone has a home and walks where they are going next, through doors, the farm gate and the lift. Stand still near a walker and they stop for a word.\n\nThe map marks whose home is whose. Knock (E at the door): if they are in, awake and fond enough, they let you in. Most want 4 hearts; the open-house sort (Marrow, Seln, Corran, Oduya, Lark, Pastor Ines, Agnes, Moth) 3. From nine at night only a sweetheart gets in. Otherwise: a note on the door, a sleepy voice, or a kind "not yet".\n\nThe first chat at someone\'s home each day is worth a little extra. Their mailbox takes a gift when they are out (80% of handing it over). Signs by public doors give the opening hours.',
});

// ------------------------------------------------------------------ opening hours (2026-11-20: a signboard by every public door)
// The hours are read off the schedules themselves (whereIs on a fine, ordinary day with the current story flags), so a sign can
// never disagree with when the keeper is really there. maps.js puts an `hours_sign` prop with `place` by each door.
export const PLACES = {
  store: { name: "Seln's Seed & Sundry", keeper: 'seln', spots: ['store.counter'] }, ranch: { name: "Corran's Ranch", keeper: 'corran', spots: ['ranch.counter'] },
  workshop: { name: "Ruess's Workshop", keeper: 'ruess', spots: ['workshop.counter'] }, cafe: { name: 'The Hangar', keeper: 'oduya', spots: ['cafe.counter'], note: 'Shut on festival days. Open in a storm.' },
  clinic: { name: 'Willowfall Clinic', keeper: 'mori', spots: ['clinic.counter'] }, library: { name: 'Lantern Ring Library', keeper: 'yui', spots: ['library.counter'] },
  hall: { name: 'Village Hall', keeper: 'marrow', spots: ['hall.desk'], what: 'Front desk' },
  bakery: { name: 'The Sunrise Oven', keeper: 'lark', spots: ['bakery.counter'] }, tailor: { name: "Varga's Mend & Make", keeper: 'pia', spots: ['tailor.counter'] },
  florist: { name: 'The Seedhouse', keeper: 'noor', spots: ['florist.counter'] }, garage: { name: "Brandt's Garage", keeper: 'tika', spots: ['garage.counter'] },
  radio: { name: 'Radio Willowfall', keeper: 'vesna', spots: ['radio.counter'], what: 'On air' },
  guard: { name: "Guardians' Post", keeper: 'kestrel', spots: [], note: 'Always manned. In an emergency, ring the bell.' },
  office: { name: "Governor's office", keeper: 'general', spots: ['central.office'], what: 'Office hours' },
  exchange: { name: 'The Ashfall Exchange', keeper: 'moraine', spots: ['central.exchange', 'central.dock'], what: 'Trading (on Saturdays from the ship at the dock)' },
  church: { name: 'Second Dawn Church', keeper: 'calloway', spots: ['church.altar'], what: 'Services at the altar', note: 'The doors are always open.' },
  depot: { name: 'Safety depot', keeper: 'fenn', spots: ['depot.desk'], what: 'Front desk', note: 'Always staffed; in an emergency, shout.' },
  arrivals: { name: 'Arrivals hall', keeper: 'maris', spots: ['central.arrivals'], what: 'Courier landings', note: 'The courier desk books the shuttle to Earth at any hour.' },
  grandmarket: { name: 'Grand Market', keeper: null, spots: [], note: 'The terminals never close and never haggle.' },
  undercroft: { name: "Venn's bench", keeper: 'venn', spots: ['undercroft.counter'], note: 'The restoration terminal beside it is always on.' },
};
const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
// [[from, to], …] for each weekday (0 = Mon), when the keeper stands at one of the spots.
export function openHours(keeper, spots, base = {}) {
  return DAY.map((_, wd) => { const out = []; let a = null;
    for (let m = 360; m <= 1440; m += 10) { const w = m < 1440 && whereIs(keeper, { season: 0, day: 1, year: 1, ...base, weekday: wd, minute: m, weather: 'sun', festival: null }), on = !!(w && spots.includes(w.spot));
      if (on && a == null) a = m; if (!on && a != null) { out.push([a, m]); a = null; } }
    return out; });
}
// The sign's words (only the place and its hours, owner 2026-11-20): the name, the hours grouped by day ("Mon–Sat 9:00–17:00 · Sun closed") and a note.
export function hoursSign(place, base = {}) {
  const P = PLACES[place]; if (!P) return null;
  const lines = [P.name];
  if (P.spots.length && P.keeper) {
    const shop = P.spots.some((x) => x.endsWith('.counter') || x === 'central.exchange');
    const H = openHours(P.keeper, P.spots, base).map((d) => (d.length ? d.map(([a, b]) => `${hm(a)}–${hm(b)}`).join(', ') : shop ? 'closed' : 'none')), parts = [];
    for (let i = 0; i < 7;) { let j = i; while (j + 1 < 7 && H[j + 1] === H[i]) j++; parts.push(`${j > i ? DAY[i] + '–' + DAY[j] : DAY[i]} ${H[i]}`); i = j + 1; }
    lines.push(`${P.what || 'Open'}: ${parts.join(' · ')}.`);
    if (!P.note || !/storm/.test(P.note)) lines.push(P.keeper === 'venn' ? 'Below decks there is no weather. Shut on festival days.' : shop ? 'Shut on festival days and in a storm.' : 'Not on festival days, nor in a storm.');
  }
  if (P.note) lines.push(P.note);
  return lines.join('\n');
}
// What they say the next time they see you, after a gift in the mailbox (by tier).
export const MAIL_LINES = {
  loved: 'Somebody left something wonderful in my mailbox. I have a fair idea who. Thank you, truly.',
  liked: 'I found your parcel in the mailbox. That was kind. It made the whole morning.',
  neutral: 'There was something in my mailbox from you. Thank you for thinking of me.',
  disliked: 'Somebody posted me a... thing. I am choosing to believe it was a joke.',
};

// ------------------------------------------------------------------ expressions (2026-11-20: expression portraits, js/farm/expressions.js)
// A line may carry `ex` (L(who, text, ex)); the dialogue shows that face when there is a picture for it. Where a line has none,
// the scene gives a sensible default (moodLines); the key lines of the love stories are picked by hand below.
export const SCENE_MOOD = {
  confess: { npc: 'shy', sato: 'shy' }, propose: { npc: 'shy', sato: 'shy' }, wedding: { npc: 'loved', sato: 'loved', other: 'joyful' },
  decline: { npc: 'sad' }, partner: { npc: 'loved' }, birthday: { npc: 'joyful' }, sweet: { npc: 'shy' },
};
// [person, scene, line index, expression]: picked by hand where the feeling is plain.
const EX_PICKS = [
  ['general', 'confess', 1, 'embarrassed'], ['general', 'confess', 6, 'shy'], ['general', 'propose', 5, 'embarrassed'], ['general', 'propose', 7, 'loved'], ['general', 'propose', 9, 'joyful'],
  ['ruess', 'confess', 4, 'embarrassed'], ['ruess', 'confess', 6, 'worried'], ['ruess', 'confess', 8, 'tearful'], ['ruess', 'propose', 1, 'surprised'], ['ruess', 'propose', 3, 'teasing'], ['ruess', 'propose', 7, 'joyful'], ['ruess', 'propose', 9, 'loved'],
  ['kestrel', 'confess', 1, 'teasing'], ['kestrel', 'confess', 5, 'embarrassed'], ['kestrel', 'confess', 9, 'surprised'], ['kestrel', 'propose', 1, 'surprised'], ['kestrel', 'propose', 3, 'angry'], ['kestrel', 'propose', 8, 'loved'], ['kestrel', 'propose', 9, 'joyful'],
  ['mori', 'confess', 1, 'embarrassed'], ['mori', 'confess', 5, 'shy'], ['mori', 'confess', 7, 'loved'], ['mori', 'propose', 3, 'teasing'], ['mori', 'propose', 6, 'embarrassed'], ['mori', 'propose', 8, 'tearful'], ['mori', 'propose', 10, 'loved'],
  ['oduya', 'confess', 1, 'worried'], ['oduya', 'confess', 7, 'shy'], ['oduya', 'propose', 1, 'surprised'], ['oduya', 'propose', 3, 'embarrassed'], ['oduya', 'propose', 6, 'tearful'], ['oduya', 'propose', 8, 'loved'], ['oduya', 'propose', 9, 'joyful'],
  ['yui', 'confess', 1, 'shy'], ['yui', 'confess', 6, 'embarrassed'], ['yui', 'confess', 9, 'loved'], ['yui', 'propose', 1, 'surprised'], ['yui', 'propose', 6, 'tearful'], ['yui', 'propose', 8, 'loved'], ['yui', 'propose', 9, 'joyful'],
  ['lark', 'confess', 1, 'embarrassed'], ['lark', 'confess', 6, 'loved'], ['lark', 'confess', 8, 'tearful'], ['lark', 'propose', 1, 'surprised'], ['lark', 'propose', 4, 'surprised'], ['lark', 'propose', 6, 'joyful'], ['lark', 'propose', 8, 'tearful'],
  ['vesna', 'confess', 1, 'teasing'], ['vesna', 'confess', 4, 'loved'], ['vesna', 'confess', 6, 'embarrassed'], ['vesna', 'confess', 8, 'joyful'], ['vesna', 'propose', 1, 'teasing'], ['vesna', 'propose', 5, 'surprised'], ['vesna', 'propose', 7, 'joyful'],
];
for (const [id, scene, i, ex] of EX_PICKS) { const l = ROMANCE.people[id] && ROMANCE.people[id][scene] && ROMANCE.people[id][scene][i]; if (l && l.who === id) l.ex = ex; }
// Sato in the love stories: the last thing she says in a confession is shy, in a proposal loved; at the wedding, her vow is loved.
for (const id of ROMANCE.candidates) { const P = ROMANCE.people[id]; for (const [scene, ex] of [['confess', 'shy'], ['propose', 'loved'], ['wedding', 'loved']]) { const own = (P[scene] || []).filter((l) => l.who === 'sato'); if (own.length && !own[own.length - 1].ex) own[own.length - 1].ex = ex; } }
// Heart events: plain feelings from the words themselves (tears, a laugh, a gasp), only where there is no doubt, and only for people speaking.
const CUES = [[/\b(cry|crying|cried|tears?)\b/i, 'tearful'], [/^(Ha!|Ha\b)/, 'joyful'], [/^(Oh!|Oh\.|What\?|Wait\.)/, 'surprised'], [/\bsorry\b/i, 'sad']];
for (const e of EVENTS) for (const l of e.lines) if (!l.ex && l.who !== 'narrator' && NPCS[l.who]) { const c = CUES.find(([re]) => re.test(l.text)); if (c) l.ex = c[1]; }
// Fills `ex` from the scene where a line has none: npc for the person the scene is about, sato for Sato, other for anybody else.
export function moodLines(lines, scene, npc) {
  const M = SCENE_MOOD[scene] || {};
  return (lines || []).map((l) => (typeof l === 'string' ? { who: npc, text: l, ex: M.npc } : l.ex ? l : { ...l, ex: l.who === npc ? M.npc : l.who === 'sato' ? M.sato : l.who === 'narrator' ? undefined : M.other }));
}
// Every expression tagged in the words (for the tests).
export function taggedLines() { const out = []; (function w(v) { if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object') { if (typeof v.text === 'string' && v.ex) out.push(v); else for (const k of Object.keys(v)) w(v[k]); } })({ EVENTS, ROMANCE, FESTIVALS }); return out; }
// The close of a heart event: in the love stories from seven hearts the last thing they say is loved; otherwise, from three, joyful.
for (const e of EVENTS) { const own = e.lines.filter((l) => l.who === e.npc); const last = own[own.length - 1]; if (last && !last.ex && e.hearts >= 3) last.ex = ROMANCE.candidates.includes(e.npc) && e.hearts >= 7 ? 'loved' : 'joyful'; }

// ------------------------------------------------------------------ Memories (2026-11-21): every scene, to see again from the journal
// One entry per scene: id (the same as sim.memoryOfFlag gives), group (a person's id, 'story' or 'festivals'), who (whose face),
// title, hint (how to see it, for a locked entry), lines() (exactly what plays), art (the scene picture, if it had one).
const SEASON_WORDS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const firstWords = (lines, n = 9) => { const l = (lines || []).find((x) => x.who === 'narrator') || (lines || [])[0]; if (!l) return ''; const w = l.text.split(/\s+/); return w.slice(0, n).join(' ').replace(/[,.;:]$/, '') + (w.length > n ? '…' : ''); };
const narr = (arr) => arr.map((t) => (typeof t === 'string' ? { who: 'narrator', text: t } : t));
export function memoryCatalogue() {
  const out = [], nm = (id) => (id === 'general' ? 'the General' : (NPCS[id] && (NPCS[id].short || NPCS[id].name)) || id);
  out.push({ id: 'intro', group: 'story', who: 'sato', title: 'The opening: the Hollin field', hint: 'The start of the game.', lines: () => INTRO, art: INTRO[0] && INTRO[0].art });
  out.push({ id: 'day1', group: 'story', who: 'marrow', title: 'Marrow at the gate', hint: 'Your first morning at the farm.', lines: () => DAY1 });
  for (const e of EVENTS) out.push({ id: 'ev_' + e.id, group: e.npc, who: e.npc, ex: (e.lines.filter((l) => l.who === e.npc).pop() || {}).ex, title: `${e.hearts} hearts: ${firstWords(e.lines)}`, hint: `Reach ${e.hearts} hearts with ${nm(e.npc)}${e.flag ? ', further on in the story' : ''}, and meet them at the right place and time.`, lines: () => e.lines, art: e.id === 'general10' ? 'heart10' : undefined, hearts: e.hearts });
  for (const e of LOWER_SCENES || []) out.push({ id: 'ev_' + e.id, group: 'story', who: e.npc, title: `${nm(e.npc)}: ${firstWords(e.lines, 7)}`, hint: `Later in the Lower deck's story, with ${nm(e.npc)}.`, lines: () => e.lines });
  for (const id of ROMANCE.candidates) {
    const P = ROMANCE.people[id];
    out.push({ id: 'confess_' + id, group: id, who: id, ex: 'shy', title: 'The confession', hint: `Reach 8 hearts with ${nm(id)}, see their heart events and do them two favours.`, lines: () => moodLines(P.confess, 'confess', id), love: true });
    out.push({ id: 'sweet_' + id, group: id, who: id, ex: 'shy', title: 'Sweethearts', hint: `Say yes when ${nm(id)} asks you to be their sweetheart.`, lines: () => [{ who: 'narrator', text: `The days when ${nm(id)} was your sweetheart: the things they said.` }, ...P.sweetTalk.map((t) => ({ who: id, text: t, ex: 'shy' }))], love: true });
    out.push({ id: 'wed_' + id, group: id, who: id, ex: 'loved', title: 'The proposal and the wedding', hint: `Be ${nm(id)}'s sweetheart at 10 hearts, and give them the Earthlight pendant.`, lines: () => [...moodLines(P.propose, 'propose', id), { who: 'narrator', text: 'And then, under the lanterns of the square:', art: 'wedding' }, ...moodLines(P.wedding, 'wedding', id)], love: true });
    out.push({ id: 'partner_' + id, group: id, who: id, ex: 'loved', title: 'Life on the farm together', hint: `Marry ${nm(id)}.`, lines: () => [{ who: 'narrator', text: `Mornings and evenings at the Hollin field, with ${nm(id)}.` }, ...[...P.morning, ...P.partnerTalk].map((t) => ({ who: id, text: t, ex: 'loved' }))], love: true });
  }
  for (const f of FESTIVALS) out.push({ id: 'fest_' + f.id, group: 'festivals', who: (f.lines.find((l) => NPCS[l.who] && l.who !== 'sato') || {}).who || 'marrow', title: f.name, hint: `${f.name}: ${SEASON_WORDS[f.season]} ${f.day}${f.flag ? ', once the Lower deck is restored that far' : ''}. Be there during the festival.`, lines: () => f.lines, art: 'festival_' + ({ yearsend: 'yearend' }[f.id] || f.id) });
  out.push({ id: 'lower_arrive', group: 'story', who: 'venn', title: 'Down to the Lower deck', hint: 'Ride the spoke lift all the way down.', lines: () => narr(LOWER.arrive) });
  out.push({ id: 'vault', group: 'story', who: 'thorne', title: 'The vault opens', hint: 'Restore the Lower deck and open the round door.', lines: () => VAULT.open });
  out.push({ id: 'earth_first', group: 'story', who: 'sato', title: 'The first landing on Earth', hint: "Take Maris's shuttle down to the Old World.", lines: () => narr(RUINS.first) });
  const order = (m) => (ROMANCE.candidates.includes(m.group) ? 0 : m.group === 'story' ? 1 : m.group === 'festivals' ? 2 : 3), ci = (m) => ROMANCE.candidates.indexOf(m.group);   // the love stories first
  return out.map((m, i) => [m, i]).sort((a, b) => order(a[0]) - order(b[0]) || ci(a[0]) - ci(b[0]) || a[1] - b[1]).map(([m]) => m);
}
