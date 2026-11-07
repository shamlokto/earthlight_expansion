// Earthlight Space Colony Rebuild, version 10 (docs/COLONY-V10.md): districts, a reason to fill a chamber.
// Pure: no DOM, no randomness. In the chamber inspector the Governor may declare an open chamber a district of one
// theme (THEMES); it can be changed again DISTRICT.cooldown days later. A district's bonus grows with its fill: the
// share of the chamber's land (buildable floor, roads left out) covered by finished buildings that fit the theme. At
// 25%, 50% and 75% it reaches tiers 1, 2 and 3 (DISTRICT.tiers); each tier adds the theme's `per` once more:
//   garden         happiness for everyone, air a day, land value in the chamber, greenery (gardens.js)
//   industry       the chamber's buildings make more (sim.js step 5)
//   university     the chamber's research makers make more, and research a day of its own
//   entertainment  tourism attraction, and happiness for everyone
// Homes fit every theme but the Industrial Quarter; forests count as Garden District land already green.
// District happiness, all districts together, is capped at DISTRICT.happyMax.
// c.district = { theme, since, fill, tier }   (on the chamber, so it saves with it)
import { BUILDING } from './data/buildings.js';
import { T, TERRAIN } from './data/terrain.js';
import { mapOf, deckOf, chamberOf } from './rules.js';   // used inside functions only (rules.js imports this module back)

export const DISTRICT = { tiers: [0.25, 0.5, 0.75], cooldown: 30, happyMax: 8 };
const HOMES = ['habitat', 'terrace', 'towerblock', 'arcology', 'livingquad'];
const GREEN = ['park', 'grove', 'skygarden', 'orchard', 'seedvault', 'plaza', 'govgarden', 'arboretum', 'memorial', 'vineyard', 'coffee', 'fishery'];
const WORKS = ['warehouse', 'granary', 'depot', 'reserve', 'repairyard', 'freightyard', 'dronebay', 'workshop', 'arsenal', 'scrapyard', 'barracks', 'artisan',
  'airplant', 'reclaimer', 'waterworks', 'atmoproc', 'cistern', 'pumpstation', 'riverpump', 'hydro', 'mushroom', 'vertfarm', 'flareshelter', 'lift'];
export const THEMES = {
  garden: { name: 'Garden District', icon: '❀', color: '#7fd36a', fits: [...GREEN, ...HOMES, 'gallery', 'lodge', 'hotel'],
    per: { happy: 1, air: 20, value: 4, greenery: 10 }, text: 'Parks, groves, gardens and the homes among them.',
    bonusText: (t) => `+${t} happiness for everyone, ${t * 20} air a day, land value +${t * 4} in the chamber, greenery +${t * 10}` },
  industry: { name: 'Industrial Quarter', icon: '⚙', color: '#ff9a52', fits: WORKS, cats: ['industry', 'power'],
    per: { output: 0.05 }, text: 'Smelters, fabricators, plants, stores and workshops (homes do not fit).',
    bonusText: (t) => `the chamber's buildings make ${t * 5}% more` },
  university: { name: 'University Quarter', icon: '✎', color: '#c3a6ff', fits: ['lab', 'school', 'gallery', 'clinic', 'library', 'observatory', 'hallofnames', 'artisan', 'transit', 'monorail', 'park', 'grove', 'plaza', ...HOMES],
    per: { research: 0.1, flat: 2 }, text: 'Labs, schools, galleries, clinics, campus greens and student homes.',
    bonusText: (t) => `labs here make ${t * 10}% more, and ${t * 2} research a day of its own` },
  entertainment: { name: 'Entertainment District', icon: '★', color: '#ff5ad8', fits: ['hotel', 'promenade', 'theatre', 'casino', 'concerthall', 'arena', 'plaza', 'gallery', 'canteen', 'park', 'grove', 'coffee', 'artisan', 'lodge', 'arrivals', ...HOMES],
    per: { tourism: 6, happy: 1 }, text: 'Hotels, promenades, theatres, casinos, cafés and the homes round them.',
    bonusText: (t) => `+${t * 6} tourism attraction, +${t} happiness for everyone` },
};
export const THEME_KEYS = Object.keys(THEMES);
const FIT = Object.fromEntries(THEME_KEYS.map((k) => [k, new Set(THEMES[k].fits)]));
export const fitsTheme = (theme, key) => !!THEMES[theme] && (FIT[theme].has(key) || (THEMES[theme].cats || []).includes(BUILDING[key]?.cat));

// A chamber's land and what of it fits its theme: { land, fit, fill (0..1), tier (0..3) }.
export function districtFill(state, c, theme = c?.district?.theme) {
  const m = mapOf(state, deckOf(c));
  if (!m || !THEMES[theme]) return { land: 0, fit: 0, fill: 0, tier: 0 };
  const { w, t, ch } = m, inside = (i) => ch[i] === c.id;
  const road = new Set(), fitTiles = new Set();
  for (const b of state.buildings) {
    if (deckOf(b) !== deckOf(c)) continue;
    const n = BUILDING[b.key]?.size || 1;
    if (b.x + n - 1 < c.x0 || b.x > c.x1 || b.y + n - 1 < c.y0 || b.y > c.y1) continue;
    if (b.key === 'road') { road.add(b.y * w + b.x); continue; }
    if (b.build > 0 || !fitsTheme(theme, b.key)) continue;
    for (let y = b.y; y < b.y + n; y++) for (let x = b.x; x < b.x + n; x++) { const i = y * w + x; if (inside(i)) fitTiles.add(i); }
  }
  let land = 0, fit = 0;
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
    const i = y * w + x;
    if (!inside(i) || road.has(i)) continue;
    const tt = t[i];
    if (theme === 'garden' && tt === T.FOREST) { land++; fit++; continue; }
    if (!TERRAIN[tt]?.build || tt === T.SHAFT) continue;
    land++;
    if (fitTiles.has(i)) fit++;
  }
  const fill = land ? Math.min(1, fit / land) : 0;
  return { land, fit, fill, tier: DISTRICT.tiers.filter((k) => fill >= k - 1e-9).length };
}
export const districtsOf = (state) => (state.chambers || []).filter((c) => c.status === 'open' && THEMES[c.district?.theme]);
const tierOf = (c) => c.district?.tier || 0;

// Declare (or clear, theme null) a chamber's district. Returns { ok, msg } like every action.
export function setDistrict(state, chamberId, theme) {
  const c = chamberOf(state, chamberId);
  if (!c) return { ok: false, msg: 'There is no such chamber.' };
  if (c.status !== 'open') return { ok: false, msg: 'Only an open chamber can be a district: pressurise it first.' };
  if (theme && !THEMES[theme]) return { ok: false, msg: 'There is no such district.' };
  const cur = c.district?.theme || null;
  if (cur === (theme || null)) return { ok: false, msg: theme ? `${c.name} is already a ${THEMES[theme].name}.` : `${c.name} is not a district.` };
  const wait = c.district?.since != null ? c.district.since + DISTRICT.cooldown - (state.day || 0) : 0;
  if (cur && wait > 0) return { ok: false, msg: `${c.name} became a ${THEMES[cur].name} only lately: it can change in ${wait} day${wait === 1 ? '' : 's'}.` };
  if (!theme) { delete c.district; return { ok: true, msg: `${c.name} is no longer a district.` }; }
  c.district = { theme, since: state.day || 0, fill: 0, tier: 0 };
  const f = districtFill(state, c);
  c.district.fill = f.fill; c.district.tier = f.tier;
  return { ok: true, msg: `${c.name} is now a ${THEMES[theme].name} (${Math.round(f.fill * 100)}% built to fit). ${tierText(theme, f.tier)}` };
}
export const tierText = (theme, tier) => (tier ? `Tier ${tier}: ${THEMES[theme].bonusText(tier)}.` : `Build ${Math.round(DISTRICT.tiers[0] * 100)}% of its land to fit for the first bonus (${THEMES[theme].bonusText(1)}).`);

// What the inspector shows: { theme, name, fill, tier, land, fit, next, wait, bonus } or null.
export function districtStatus(state, c) {
  const theme = c?.district?.theme;
  const wait = c?.district?.since != null ? Math.max(0, c.district.since + DISTRICT.cooldown - (state.day || 0)) : 0;
  if (!THEMES[theme]) return { theme: null, wait: 0 };
  const f = districtFill(state, c), next = DISTRICT.tiers[f.tier] ?? null;
  return { theme, name: THEMES[theme].name, icon: THEMES[theme].icon, color: THEMES[theme].color, ...f, next, wait,
    bonus: f.tier ? THEMES[theme].bonusText(f.tier) : '', nextBonus: next != null ? THEMES[theme].bonusText(f.tier + 1) : '' };
}

// ---------------------------------------------------------------- the effects (sim.js, landvalue.js, tourism.js, gardens.js)
const sum = (state, theme, field) => districtsOf(state).filter((c) => c.district.theme === theme).reduce((t, c) => t + tierOf(c) * THEMES[theme].per[field], 0);
export function districtHappy(state) {
  const g = sum(state, 'garden', 'happy'), e = sum(state, 'entertainment', 'happy');
  const gv = Math.min(DISTRICT.happyMax, g), ev = Math.min(DISTRICT.happyMax - gv, e);
  return [...(gv ? [{ label: 'Garden Districts', value: gv }] : []), ...(ev ? [{ label: 'Entertainment Districts', value: ev }] : [])];
}
export const districtAir = (state) => sum(state, 'garden', 'air');
export const districtGreenery = (state) => sum(state, 'garden', 'greenery');
export const districtTourism = (state) => sum(state, 'entertainment', 'tourism');
export const districtResearch = (state) => sum(state, 'university', 'flat');
// Land value in a chamber (landvalue.js): the Garden District's.
export const districtValue = (c) => (c?.district?.theme === 'garden' ? tierOf(c) * THEMES.garden.per.value : 0);
// Per building: { make, research } multipliers from the district its chamber is (sim.js step 5). One lookup a day.
export function districtMults(state) {
  const byCh = new Map();
  for (const c of districtsOf(state)) if (tierOf(c)) byCh.set(`${deckOf(c)}:${c.id}`, c);
  return (b) => {
    if (!byCh.size) return null;
    const m = mapOf(state, deckOf(b));
    const c = m && byCh.get(`${deckOf(b)}:${m.ch[b.y * m.w + b.x]}`);
    if (!c || !fitsTheme(c.district.theme, b.key)) return null;
    const t = tierOf(c), th = c.district.theme;
    return { make: th === 'industry' ? 1 + t * THEMES.industry.per.output : 1, research: th === 'university' ? 1 + t * THEMES.university.per.research : 1 };
  };
}

// Each day: each district's fill and tier, with a log line when a tier is reached or lost.
export function districtsDay(state, { say }) {
  for (const c of districtsOf(state)) {
    const f = districtFill(state, c), was = c.district.tier || 0;
    c.district.fill = Math.round(f.fill * 1000) / 1000; c.district.tier = f.tier;
    if (f.tier > was) say('district', `${c.name} is a tier ${f.tier} ${THEMES[c.district.theme].name} (${Math.round(f.fill * 100)}% built to fit): ${THEMES[c.district.theme].bonusText(f.tier)}.`);
    else if (f.tier < was) say('district', `${c.name} fell back to tier ${f.tier} as a ${THEMES[c.district.theme].name} (${Math.round(f.fill * 100)}% built to fit).`);
  }
}
