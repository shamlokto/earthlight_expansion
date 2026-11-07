// Earthlight Space Colony Rebuild, version 9 (docs/COLONY-V9.md): tourism, a reason to fill the space around wonders.
// Pure: no DOM, no randomness. Visitors from Earth and the other colonies come for what Eden has to see, stay in its
// hotels and spend credits; nothing else about them is simulated (they eat in the price).
//   attraction  = the wonders' tourism + 8 a working landmark + parks and greenery + leisure + a happy city
//                 + land value at the hotels (each part capped; tourismOf lists them)
//   want        = attraction × TOUR.perPoint visitors a day
//   visitors    = the least of want, beds (Hotels), and arrivals (300 a day through a dock; the Starport ×4)
//   credits     = visitors × spending (1 a day, +0.2 a point of leisure, up to 3; Commerce +20%)
// sim.js adds the credits each day (step 10) and keeps the day's figures in state.tourism (not needed to load).
import { BUILDING } from './data/buildings.js';
import { LANDMARKS, landmarkOn } from './landmarks.js';
import { wondersOn, wonderVisitors } from './wonders.js';
import { valueOf } from './landvalue.js';
import { active, spec, techEffect } from './rules.js';   // used inside functions only

export const TOUR = {
  landmark: 8,                          // a working landmark
  green: 0.25, greenMax: 30,            // per point of park rating of every park, grove or garden
  leisure: 2, leisureMax: 30,           // per point of leisure (Promenade 1, Theatre 2, Casino 3, Concert Hall 3)
  happyFrom: 50, happy: 0.5, happyMax: 25,   // (happiness − 50) × 0.5
  valueFrom: 30, value: 0.5, valueMax: 20,   // (land value at the hotels, on average, − 30) × 0.5
  perPoint: 8,                          // visitors a day who want to come, per point of attraction
  dockCap: 300,                         // visitors a day who can arrive through a finished dock
  spend: 1, spendPerLeisure: 0.2, spendMax: 3,   // credits a visitor spends a day
};
const HOTELS = new Set(['hotel']);
const clamp = (v, hi) => Math.max(0, Math.min(hi, v));
const round = (v) => Math.round(v);

// Everything the Market panel and the More pop-out show: { score, parts, want, beds, cap, visitors, spend, credits, limit }.
export function tourismOf(state) {
  const bs = state.buildings || [], on = bs.filter(active);
  const parts = [];
  for (const b of wondersOn(state)) if (BUILDING[b.key].wonder.tourism) parts.push({ label: BUILDING[b.key].name, value: BUILDING[b.key].wonder.tourism });
  const marks = LANDMARKS.filter((k) => landmarkOn(state, k)).length;
  if (marks) parts.push({ label: `Landmarks (${marks})`, value: marks * TOUR.landmark });
  const green = on.reduce((t, b) => t + (spec(b).park || 0), 0);
  if (green) parts.push({ label: 'Parks and greenery', value: round(clamp(green * TOUR.green, TOUR.greenMax)) });
  const leisure = on.reduce((t, b) => t + (spec(b).leisure || 0), 0);
  if (leisure) parts.push({ label: 'Leisure', value: round(clamp(leisure * TOUR.leisure, TOUR.leisureMax)) });
  const happy = round(clamp(((state.happy ?? 50) - TOUR.happyFrom) * TOUR.happy, TOUR.happyMax));
  if (happy) parts.push({ label: `A happy city (${round(state.happy || 0)})`, value: happy });
  const hotels = on.filter((b) => HOTELS.has(b.key));
  const beds = hotels.reduce((t, b) => t + (spec(b).beds || 0), 0);
  let lv = 0;
  if (hotels.length) {
    try { lv = hotels.reduce((t, b) => t + valueOf(state, b), 0) / hotels.length; } catch { lv = 0; }
    const v = round(clamp((lv - TOUR.valueFrom) * TOUR.value, TOUR.valueMax));
    if (v) parts.push({ label: `Land value at the hotels (${round(lv)})`, value: v });
  }
  const score = parts.reduce((t, p) => t + p.value, 0);
  const want = round(score * TOUR.perPoint);
  const dock = bs.some((b) => b.key === 'dock' && b.build === 0);
  const cap = dock ? round(TOUR.dockCap * wonderVisitors(state)) : 0;
  const visitors = Math.max(0, Math.min(want, beds, cap));
  const spend = Math.min(TOUR.spendMax, TOUR.spend + TOUR.spendPerLeisure * leisure) * techEffect(state, 'output', 'tourism');
  const credits = round(visitors * spend);
  const limit = !visitors ? (!dock ? 'dock' : !beds ? 'beds' : 'attraction') : visitors === want ? 'attraction' : visitors === beds ? 'beds' : 'arrivals';
  return { score, parts, want, beds, cap, visitors, spend: Math.round(spend * 100) / 100, credits, limit, hotels: hotels.length, leisure, landValue: round(lv) };
}
// What holds tourism back, in words (the Market panel and the More pop-out's tooltip).
export const tourismLimitText = (t) => ({
  dock: 'Visitors arrive through a finished dock.',
  beds: t.beds ? `Every bed is full (${t.beds}): build Hotels, and let them grow with a park and leisure in reach.` : 'No beds: research Tourism and build a Hotel.',
  arrivals: `Arrivals are full (${t.cap} a day): the Starport brings four times as many.`,
  attraction: t.score ? `All who want to come are here: wonders, landmarks, parks, leisure and a happy city draw more.` : 'Nothing draws visitors yet: wonders, landmarks, parks, leisure and a happy city do.',
}[t.limit]);

// Each day (sim.js step 10): the day's tourism, kept in state.tourism; returns the credits visitors spent.
export function tourismDay(state) {
  const t = tourismOf(state);
  state.tourism = { day: state.day, visitors: t.visitors, credits: t.credits, score: t.score };
  return t.credits;
}
