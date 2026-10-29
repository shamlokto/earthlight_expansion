// Expansion campaign state between battles (docs/EXPANSION.md): the roster carries over, each
// machine with its anonymous pilot's level; production buys 1-3 machines a mission with supply
// earned from the battle score; trade swaps machines at fixed rates by price; repairs are free;
// the general boards one eligible machine. Kept in localStorage; game.html reads it when it
// plays a mission with &campaign=1 and writes the outcome back.
// Two campaigns (docs/STORY.md): the new "Galt remnant" and the Classic one (the first 10
// missions). Each keeps its own save and mid-battle slot; the Classic one uses the keys every
// earlier save was written under, so existing progress carries over as the Classic campaign.
export const CAMPAIGNS = {
  remnant: { id: 'remnant', title: 'Galt remnant', index: 'missions/remnant/index.json', key: 'el-expansion-campaign-remnant', battle: 'earthlight-expansion-battle-remnant' },
  classic: { id: 'classic', title: 'Classic campaign', index: 'missions/index.json', key: 'el-expansion-campaign', battle: 'earthlight-expansion-battle' },
};
const CURRENT = 'el-expansion-current';
let current = CAMPAIGNS.classic;
// The campaign being played: chosen on expansion.html (remembered), or `c=` in game.html's URL.
export function use(id) { current = CAMPAIGNS[id] || CAMPAIGNS.classic; return current; }
export const campaign = () => current;
export function remembered() { try { return localStorage.getItem(CURRENT); } catch { return null; } }
export function remember(id) { try { id ? localStorage.setItem(CURRENT, id) : localStorage.removeItem(CURRENT); } catch { } }
export const saved = (id) => { try { return JSON.parse(localStorage.getItem(CAMPAIGNS[id].key)); } catch { return null; } };
export const MAX_BUILDS = 3;
export const BASE_SUPPLY = 10;          // every intermission, so a bad battle still builds something
export const SCORE_PER_SUPPLY = 10;     // map points per supply point
export const GENERAL_SHIPS = new Set([4, 5, 6, 7, 30, 31, 33, 34, 35, 36, 37, 38, 58, 61, 62, 63, 64, 65, 72, 73, 74, 75, 76]);   // Athena, Tiamat, Asura-II, Hastur, carriers (58: Selene Kai, 61: Azoras, 62-65: Pallas, 72: Asura-II Kai, 73-76: Athena Kai)
const ATHENA = 4, STRUCTURE = 52;       // types 52-57 are docks, fortresses and command centres (58+: new expansion machines)
const isStructure = (type) => type >= STRUCTURE && type < 58;

// Price of a machine: the ROM's points-per-HP value times its HP, so a Mars costs 8, an Athena
// 24, a Tiamat 48 and a Nodens 60.
export const price = (types, type) => Math.max(1, types[type].value) * types[type].hp;

// Machines that can be bought or traded for: mobile, not cut, not structures or mines.
// The Dragon and Hydra batteries (owner's request) can't move: a Crab is loaded with one at the
// intermission and sets it down on bedrock, asteroid, deck or railway.
const BATTERIES = [23, 24], CRAB_EMPTY = 26;
export function marketTypes(types) {
  return types.filter((t) => !t.cut && !t.unionOnly && (t.move > 0 || BATTERIES.includes(t.type)) && !isStructure(t.type) && t.armed === undefined && t.formOf === undefined && t.empty === undefined);
}

export function load() { try { return JSON.parse(localStorage.getItem(current.key)); } catch { return null; } }
export function save(s) { try { localStorage.setItem(current.key, JSON.stringify(s)); return true; } catch { return false; } }
export function clear() { try { localStorage.removeItem(current.key); } catch { } }

// The campaign's mission index, or null while it isn't written yet.
export async function missionIndex() { try { const r = await fetch(current.index, { cache: 'no-cache' }); return r.ok ? r.json() : null; } catch { return null; } }

// The missions as this campaign plays them. Entries sharing a `no` are alternatives: the one whose
// `when.choice` matches the campaign's choice, else the one without `when`, else (choice not made
// yet) the group's first. Index entries without `no` stand alone.
export function missionList(index, s) {
  const out = [], seen = new Map();
  for (const e of index.missions) {
    if (e.no === undefined) { out.push(e); continue; }
    if (!seen.has(e.no)) { seen.set(e.no, out.length); out.push(e); continue; }
    const i = seen.get(e.no), cur = out[i], fits = (x) => x.when && s.choice !== undefined && x.when.choice === s.choice;
    if (fits(e) && !fits(cur)) out[i] = e;
    else if (!e.when && cur.when && !fits(cur)) out[i] = e;
  }
  return out;
}
// The choice to make before the mission at `i` (its alternatives carry it), if not made yet.
export function pendingChoice(index, s, i) {
  const e = missionList(index, s)[i];
  if (!e || s.choice !== undefined) return null;
  const alts = index.missions.filter((x) => x === e || (e.no !== undefined && x.no === e.no));
  return alts.map((x) => x.choice).find(Boolean) || null;
}

// A new campaign starts with the first mission's own player units as the roster.
export function newCampaign(firstMission) {
  let id = 0;
  const own = firstMission.units.filter((u) => u.army === 0 && !u.neutral), gen = firstMission.general;
  const roster = own.map((u) => ({ id: id++, type: u.type, level: 0 }));
  const g = gen ? own.findIndex((u) => u.x === gen.x && u.y === gen.y) : -1;
  return { version: 1, next: 0, nextId: id, roster, supply: 0, builds: 0, general: g >= 0 ? roster[g].id : null, deploy: null, history: [] };
}

// Free replacement when the last Athena was lost in battle (decided: a lost Athena is replaced
// for free). Trading it away earns no replacement.
const isAthena = (type) => type >= 4 && type <= 7;
export function ensureAthena(s) {
  if (!s.athenaLost || s.roster.some((r) => isAthena(r.type))) return false;
  s.athenaLost = false;
  s.roster.push({ id: s.nextId++, type: ATHENA, level: 0 });
  return true;
}

// Beta testing (owner's request, 2026-10-23): on by default, also for campaigns saved before it.
// Unlimited supply, every machine type buildable with no per-visit limit, and trades at any
// price, so every unit can be tried. Turning it off (s.beta = false) restores the earned supply.
export const beta = (s) => s.beta !== false;

// Unique machines (owner, 2026-10-24: too strong to field more than one): a type marked `unique`
// may be in the roster once, counting all its forms (spent, loaded, transformed).
const family = (types, t) => { let x = t; for (let i = 0; i < 4; i++) { const u = types[x]; const n = u.armed ?? u.empty ?? u.formOf; if (n === undefined) break; x = n; } return x; };
// Series (owner, 2026-10-29): the Kai refits (units.json `series: "kai"`) and the original machines,
// shown as separate groups in the intermission's roster, production and trade lists.
export const SERIES = [{ id: 'kai', label: 'Kai series' }, { id: 'original', label: 'Original series' }];
export const seriesOf = (types, type) => types[family(types, type)].series || types[type].series || 'original';
export const isUnique = (types, type) => !!types[family(types, type)].unique || !!types[type].unique;
// (beta testing lifts the limit, like every other limit)
export function ownsUnique(s, types, type, except = []) {
  return !beta(s) && isUnique(types, type) && s.roster.some((r) => !except.includes(r.id) && family(types, r.type) === family(types, type));
}

export function build(s, types, type) {
  const cost = price(types, type);
  if (ownsUnique(s, types, type)) return false;
  if (!beta(s) && (s.builds >= MAX_BUILDS || s.supply < cost)) return false;
  if (!beta(s)) s.supply -= cost;
  s.builds++;
  s.roster.push({ id: s.nextId++, type, level: 0 });
  return true;
}

// Trade: give one or more machines, get one machine. Whatever its price exceeds theirs combined
// is paid from supply, so supply can upgrade a veteran's machine. The best of the given pilots
// flies the new machine and keeps their level; the others are gone with their machines.
export const tradeCost = (s, types, giveIds, type) =>
  Math.max(0, price(types, type) - s.roster.filter((r) => giveIds.includes(r.id)).reduce((t, r) => t + price(types, r.type), 0));
export function trade(s, types, giveIds, type) {
  const give = s.roster.filter((r) => giveIds.includes(r.id)), cost = tradeCost(s, types, giveIds, type);
  if (!give.length || (!beta(s) && s.supply < cost) || ownsUnique(s, types, type, giveIds)) return false;
  if (!beta(s)) s.supply -= cost;
  const best = give.reduce((a, b) => (b.level > a.level ? b : a));
  s.roster = s.roster.filter((r) => !giveIds.includes(r.id) || r === best);
  if (s.general !== null && giveIds.includes(s.general) && (s.general !== best.id || !GENERAL_SHIPS.has(type))) s.general = null;
  best.type = type;
  return true;
}

// Sell: spare machines go back for their full price in supply (the same rate trade uses); their
// pilots leave with them. At least one machine always stays.
export function sell(s, types, ids) {
  const gone = s.roster.filter((r) => ids.includes(r.id));
  if (!gone.length || gone.length >= s.roster.length) return 0;
  const gain = gone.reduce((t, r) => t + price(types, r.type), 0);
  s.roster = s.roster.filter((r) => !ids.includes(r.id));
  if (ids.includes(s.general)) s.general = null;
  s.supply += gain;
  return gain;
}

// The mission as game.html should play it: its player units are deployment slots, filled with
// the deployed roster machines (cap = the mission's cap, or the number of slots). A machine only
// takes a slot whose terrain it can enter (`canStand`, from battle.js): the general's machine
// first, then those with the fewest usable slots; one with no usable slot left stays home.
// Units marked `joiner` stay as they are and join the roster if they survive.
export function applyRoster(mission, s, canStand = () => true, types = null) {
  const slots = mission.units.filter((u) => u.army === 0 && !u.neutral && !u.joiner);
  const battery = (r) => types && types[r.type].move === 0;
  const chosen = (s.deploy || s.roster.map((r) => r.id)).map((id) => s.roster.find((r) => r.id === id)).filter((r) => r && !battery(r)).slice(0, slots.length);
  const others = mission.units.filter((u) => !slots.includes(u));
  const usable = new Map(chosen.map((r) => [r, slots.filter((sl) => canStand(r.type, sl.x, sl.y)).length]));
  const order = [...chosen].sort((a, b) => (b.id === s.general) - (a.id === s.general) || usable.get(a) - usable.get(b));
  const free = [...slots], placed = [];
  for (const r of order) {
    const i = free.findIndex((sl) => canStand(r.type, sl.x, sl.y));
    if (i < 0) continue;
    const u = { ...free[i], type: r.type, level: r.level, rosterId: r.id, cargo: [] };
    // a deployed Crab takes the battery loaded into it at the intermission (crabLoads)
    const b = r.type === CRAB_EMPTY && s.roster.find((v) => v.id === crabLoads(s, types)[r.id]);
    if (b) { u.cargo.push({ type: b.type, level: b.level, rosterId: b.id }); u.type = CRAB_EMPTY + 1; }
    placed.push(u);
    free.splice(i, 1);
  }
  const g = placed.find((u) => u.rosterId === s.general);
  return { ...mission, units: [...placed, ...others], general: g ? { x: g.x, y: g.y } : null };
}

// Which battery (Dragon, Hydra) each Crab carries into battle: { crabId: batteryId }, set at the
// intermission (the Crab's only job). Entries for machines no longer in the roster are dropped.
export function crabLoads(s, types) {
  const has = (id, ok) => s.roster.some((r) => r.id === id && ok(r));
  const loads = {};
  for (const [c, b] of Object.entries(s.loads || {})) if (has(+c, (r) => r.type === CRAB_EMPTY) && has(b, (r) => !types || types[r.type].move === 0)) loads[c] = b;
  return loads;
}
export function loadCrab(s, crabId, batteryId) {
  const loads = { ...(s.loads || {}) };
  for (const k of Object.keys(loads)) if (loads[k] === batteryId) delete loads[k];
  if (batteryId === null) delete loads[crabId]; else loads[crabId] = batteryId;
  s.loads = loads;
}

export const deployCap = (mission) => Math.min(mission.cap || 99, mission.units.filter((u) => u.army === 0 && !u.neutral && !u.joiner).length);

// After a won battle: survivors keep their machine and new level, the lost are gone, and any
// other player unit still alive (joiners, captured dock cargo) joins the roster. Supply grows
// from the score. Production and trade reset for the next intermission.
export function finish(s, battle, points, missionNo) {
  // on an escape map, whoever is still on it when the general gets away is left behind (a map
  // won another way, by wiping out the Union, keeps everyone)
  const escape = battle.result?.reason === 'escape';
  const out = (u) => u.hp > 0 && (!escape || u.escaped);
  const alive = battle.units.filter((u) => u.army === 0 && out(u) && !isStructure(u.type) && !u.exit);
  const kept = [];
  for (const r of s.roster) {
    const deployed = battle.units.find((u) => u.rosterId === r.id);
    if (deployed && !out(deployed) && isAthena(deployed.type)) s.athenaLost = true;
    if (!deployed) kept.push(r);                                   // stayed home
    else if (out(deployed)) kept.push({ ...r, type: baseForm(battle, deployed.type), level: deployed.general ? r.level : deployed.level });
  }
  for (const u of alive) if (u.rosterId === undefined) kept.push({ id: s.nextId++, type: baseForm(battle, u.type), level: u.level });
  if (!kept.some((r) => r.id === s.general)) s.general = null;
  const gain = BASE_SUPPLY + Math.floor(points / SCORE_PER_SUPPLY);
  s.roster = kept; s.supply += gain; s.builds = 0; s.deploy = null;
  s.history.push({ mission: missionNo, turns: battle.turn, points, supply: gain });
  s.next = missionNo + 1;
  return gain;
}

// Spent bombers and loaded carriers go back to their usual form between battles.
function baseForm(battle, type) {
  const t = battle.types[type];
  if (t.armed !== undefined) return t.armed;
  if (t.empty !== undefined) return t.empty;
  return type;
}
