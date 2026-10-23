// Campaign progress and a mid-battle save slot, kept in localStorage (the original has
// Save/Load on its "What now?" menu, labels 12/13). A battle is stored as its unit list;
// object links (carrier, guard post, script stakes) are saved as unit ids.
const PROGRESS = 'earthlight-campaign', BATTLE = 'earthlight-battle';

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function loadProgress() {
  const p = read(PROGRESS) || {};
  return { next: p.next || 0, cleared: p.cleared || [], best: p.best || {}, hard: !!p.hard };
}
export function saveProgress(p) { return write(PROGRESS, p); }

const UNIT_REFS = ['carrier', 'guard'];

export function saveBattle(b, mission) {
  const id = (u) => (u ? u.id : null);
  const units = b.units.map((u) => {
    const o = { ...u };
    for (const k of UNIT_REFS) o[k] = id(u[k]);
    return o;
  });
  const stakes = b.stakes.map((s) => ({ towers: s.towers.map(id), fortress: s.fortress.map(id), flagship: id(s.flagship), carriers: s.carriers.map(id) }));
  return write(BATTLE, { mission, hard: b.hard, turn: b.turn, army: b.army, done: b.arrivals.map((e) => e.done), units, stakes, saved: Date.now() });
}

export function savedBattle() { return read(BATTLE); }
export function clearSavedBattle() { write(BATTLE, null); }

// Puts a saved state into a Battle freshly built for the same map.
export function restoreBattle(b, s) {
  const units = s.units.map((o) => ({ ...o }));
  const ref = (i) => (i === null || i === undefined ? null : units[i]);
  for (const u of units) for (const k of UNIT_REFS) u[k] = ref(u[k]);
  b.units = units; b.turn = s.turn; b.army = s.army; b.hard = s.hard;
  s.done.forEach((d, i) => { if (b.arrivals[i]) b.arrivals[i].done = d; });
  b.stakes = s.stakes.map((t) => ({ towers: t.towers.map(ref), fortress: t.fortress.map(ref), flagship: ref(t.flagship), carriers: t.carriers.map(ref) }));
  b.result = null;
  return b;
}
