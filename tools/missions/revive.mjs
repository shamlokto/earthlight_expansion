// The ROM's cut units, revived for the expansion (docs/EXPANSION.md, "Revived units"): a few
// Union units on missions 5-10 are swapped for them. `swaps`: [old letter, new letter,
// [which occurrences of the old letter, 0-based in reading order]].
export const REVIVED = {
  1: { type: 17, army: 1 },   // Pandora armed mine
  2: { type: 19, army: 1 },   // Remora decoy drone
  3: { type: 20, army: 1 },   // Echidna beam pod
  4: { type: 21, army: 1 },   // Naga rail pod
  5: { type: 22, army: 1 },   // Rockeye twin rail pod
  7: { type: 47, army: 1 },   // Msfb-5 strike bomber
};

export function revive(units, swaps) {
  const g = [...units];
  for (const [from, to, which] of swaps) {
    const at = [...units].flatMap((c, i) => (c === from ? [i] : []));   // counted on the original grid
    for (const k of which) { if (at[k] === undefined) throw new Error(`revive: no occurrence ${k} of '${from}'`); g[at[k]] = to; }
  }
  return g.join('');
}
