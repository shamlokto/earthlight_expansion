// Expansion campaign state between battles (docs/EXPANSION.md): the roster carries over, each
// machine with its anonymous pilot's level; production buys 1-3 machines a mission with supply
// earned from the battle score; trade swaps machines at fixed rates by price; repairs are free;
// the general boards one eligible machine. Kept in localStorage; game.html reads it when it
// plays a mission with &campaign=1 and writes the outcome back.
const KEY = 'el-expansion-campaign';
export const INDEX_URL = 'missions/index.json';
export const MAX_BUILDS = 3;
export const BASE_SUPPLY = 10;          // every intermission, so a bad battle still builds something
export const SCORE_PER_SUPPLY = 10;     // map points per supply point
export const GENERAL_SHIPS = new Set([4, 5, 6, 7, 30, 31, 33, 34, 35, 36, 37, 38, 58]);   // Athena, Tiamat, Asura-II, Hastur, carriers (58: Selene Kai)
const ATHENA = 4, STRUCTURE = 52;       // types 52-57 are docks, fortresses and command centres (58+: new expansion machines)
const isStructure = (type) => type >= STRUCTURE && type < 58;

// Price of a machine: the ROM's points-per-HP value times its HP, so a Mars costs 8, an Athena
// 24, a Tiamat 48 and a Nodens 60.
export const price = (types, type) => Math.max(1, types[type].value) * types[type].hp;

// Machines that can be bought or traded for: mobile, not cut, not structures or mines.
export function marketTypes(types) {
  return types.filter((t) => !t.cut && t.move > 0 && !isStructure(t.type) && t.armed === undefined && t.formOf === undefined && t.empty === undefined);
}

export function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } }
export function clear() { try { localStorage.removeItem(KEY); } catch { } }

export async function missionIndex() { return (await fetch(INDEX_URL)).json(); }

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

export function build(s, types, type) {
  const cost = price(types, type);
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
  if (!give.length || (!beta(s) && s.supply < cost)) return false;
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
export function applyRoster(mission, s, canStand = () => true) {
  const slots = mission.units.filter((u) => u.army === 0 && !u.neutral && !u.joiner);
  const chosen = (s.deploy || s.roster.map((r) => r.id)).map((id) => s.roster.find((r) => r.id === id)).filter(Boolean).slice(0, slots.length);
  const others = mission.units.filter((u) => !slots.includes(u));
  const usable = new Map(chosen.map((r) => [r, slots.filter((sl) => canStand(r.type, sl.x, sl.y)).length]));
  const order = [...chosen].sort((a, b) => (b.id === s.general) - (a.id === s.general) || usable.get(a) - usable.get(b));
  const free = [...slots], placed = [];
  for (const r of order) {
    const i = free.findIndex((sl) => canStand(r.type, sl.x, sl.y));
    if (i < 0) continue;
    placed.push({ ...free[i], type: r.type, level: r.level, rosterId: r.id, cargo: [] });
    free.splice(i, 1);
  }
  const g = placed.find((u) => u.rosterId === s.general);
  return { ...mission, units: [...placed, ...others], general: g ? { x: g.x, y: g.y } : null };
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
