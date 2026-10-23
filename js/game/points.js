// Victory points and rank, as the game computes them for its points screen ($08:A6C0,
// labels 14-20; ranks are labels 51-66).
//
//   Units Destroyed  $7E:208E  every fight adds HP lost x value[type] ($01:F27A, battle tables) for the Galt side ($01:9F7F)
//   Units Lost       $7E:2091  ... and for the Union side ($01:9F46)
//   Docks Captured   $7E:2094  +100 per dock the Union captures ($01:A626)
//   Units Survived   $7E:2097  sum of HP x F27A[type] over every unit not of army B ($02:E580)
//   Stage Win Bonus  $7E:214E  B = 100 x (map + 1), minus B / 20 per turn used ($02:E5D3)
//   Map points       $0F97     destroyed + survived + docks + bonus - lost, 0 if negative ($08:A916)
//   Total points     $7E:208B  campaign sum of map points
//   Rank             $7E:208A  from (total - 128) / 2: highest bit x 4 + the next two bits,
//                              capped at 63 ($08:ABEE). Rank name = label $08:AD52[rank >> 2]
//                              (66 Moon Rat up to 51 Hellhound); rank & 3 is the emblem colour.
const RANK_NAMES = 0x08ad52;

export function newTally() { return { destroyed: 0, lost: 0, docks: 0 }; }

const worth = (b, u) => b.tables.value(u.type);

// Called after every fight (rules.js attack).
export function tally(b, e) {
  const t = b.points || (b.points = newTally());
  [[e.att, e.before[0], e.after[0]], [e.def, e.before[1], e.after[1]]].forEach(([u, hp0, hp1]) => {
    const p = (hp0 - hp1) * worth(b, u);
    if (u.army === 0) t.lost += p; else t.destroyed += p;
  });
  if (e.captured && e.att.army === 0) t.docks += 100;
}

// The points screen for a won map. `turns` is the game's turn counter (0 on the first turn).
export function mapPoints(b, map) {
  const t = b.points || newTally();
  const survived = b.units.filter((u) => u.hp > 0 && u.army !== 1).reduce((s, u) => s + u.hp * worth(b, u), 0);
  const base = 100 * (map + 1), turns = b.turn - 1;
  const bonus = Math.max(0, base - Math.floor(base / 20) * turns);
  const total = Math.max(0, t.destroyed + survived + t.docks + bonus - t.lost);
  return { destroyed: t.destroyed, survived, lost: t.lost, docks: t.docks, bonus, total };
}

// $08:ABEE, on the 3-byte campaign total.
export function rankOf(total) {
  let v = total - 128;
  if (v < 0) return 0;
  v = (v >> 1) & 0xffffff;
  const bytes = [v & 255, (v >> 8) & 255, (v >> 16) & 255];
  let k = 2;
  while (k >= 0 && !bytes[k]) k--;
  if (k < 0) return 0;
  let a = bytes[k], x = 8 * (k + 1), c = 0;
  do { x--; c = a >> 7; a = (a << 1) & 255; } while (!c);
  // ROL x3 with carry 1, AND 3: the two bits below the top one (within that byte)
  const frac = ((a >> 7) << 1) | ((a >> 6) & 1);
  return Math.min(63, x * 4 + frac);
}

export function rankName(rom, rank, labels) {
  const id = rom.byteAt(RANK_NAMES + (rank >> 2));
  return labels ? labels[id] : `rank ${16 - (rank >> 2)}`;
}
