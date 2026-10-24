// The Pegasus's own art (expansion type 61, the General's flagship): original pixel art, drawn
// from the shapes below with tools/art/raster.mjs and written to js/art/pegasus.js.
//   node tools/art/pegasus.mjs
// Same four pictures as the Selene Kai's (tools/art/selene-kai.mjs): unit-info picture (96x96,
// own palette), map icon (24x16, icon rows), board token and fight hull (ships' fight rows).
// The design: a streamlined blended-wing flagship. A long needle prow, a teardrop fuselage that
// flows into forward-swept wings, a twin-engine pod on each wingtip with a beam emitter at its
// nose, and a pearl-white hull with gold leading edges and the Galt pink stripe.
// The fight hull fits the Hastur's recorded fight (its `look`): the broadside leaves from ports
// along the wing leading edges (x 39-47 of the hull's box, y 36-100) and the beams from the wingtip
// pods (x 52-56, y 17 and 101 of the box), measured from the recording.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

// ---------------------------------------------------------------- unit-info picture
export const ART_PALETTE = ['#7b7bde', '#000000', '#4a4a6b', '#8484a5', '#b5b5d6', '#dedef7', '#ffffff', '#ff5abd', '#bd3984',
  '#bd8400', '#ffbd00', '#ffe784', '#0063bd', '#00b5ff', '#7bffff', '#ff7b00', '#ff395a', '#5a185a', '#9c399c', '#de7bde'];
const PEARL = [2, 3, 4, 5, 6], GOLD = [9, 10, 11], PINK = [8, 7], CYAN = [12, 13, 14], DARK = [17, 18, 19], FIRE = [15, 10, 6];

export function infoArt() {
  // the ship's frame: u forward (down-left on the picture), v to starboard (down-right)
  const C = [50, 46], F = [-0.8, 0.6], S = [0.6, 0.8];
  const K = 1.2, toLocal = (x, y) => { const dx = (x - C[0]) * K, dy = (y - C[1]) * K; return [dx * F[0] + dy * F[1], dx * S[0] + dy * S[1]]; };
  const side = (f) => union(f(1), f(-1));
  const parts = [
    // forward-swept wings, flowing out of the fuselage, with gold leading edges
    { shape: side((s) => poly([[-32, 5 * s], [4, 8 * s], [22, 33 * s], [18, 38 * s], [6, 40 * s], [-24, 20 * s], [-34, 10 * s]])), ramp: PEARL, bevel: 7, dome: 1, bias: -0.05 },
    { shape: side((s) => poly([[4, 8 * s], [22, 33 * s], [20, 35.5 * s], [2, 11 * s]])), ramp: GOLD, bevel: 1, line: false },
    // wingtip pods: twin engines behind, a beam emitter in front
    { shape: side((s) => capsule(-4, 40 * s, 26, 40 * s, 5)), ramp: PEARL, bevel: 4, dome: 1, spec: 0.9 },
    { shape: side((s) => ellipse(-6, 40 * s, 2.6, 4.2)), ramp: FIRE, bevel: 2, dome: 1, bias: 0.3 },
    { shape: side((s) => capsule(26, 40 * s, 33, 40 * s, 1.6)), ramp: CYAN, bevel: 1, bias: 0.2 },
    { shape: side((s) => rect(10, (s > 0 ? 37 : -43), 13, (s > 0 ? 43 : -37))), ramp: PINK, bevel: 1, line: false },
    // tail fins
    { shape: side((s) => poly([[-36, 2 * s], [-20, 4 * s], [-30, 13 * s], [-40, 13 * s]])), ramp: PEARL, bevel: 3, dome: 1, bias: -0.1 },
    // the fuselage: a teardrop body drawn out into a long needle prow
    { shape: poly([[48, 0], [24, 4], [4, 10], [-22, 10], [-34, 5], [-36, 0], [-34, -5], [-22, -10], [4, -10], [24, -4]]), ramp: PEARL, bevel: 10, dome: 1, height: 1.4, spec: 0.9 },
    // the Galt stripe down the spine and the gold prow tip
    { shape: poly([[44, 0.6], [10, 2.4], [-30, 2.4], [-30, -2.4], [10, -2.4], [44, -0.6]]), ramp: PINK, bevel: 1, line: false },
    { shape: poly([[48, 0], [38, 2.2], [38, -2.2]]), ramp: GOLD, bevel: 1, line: false },
    // canopy and the engine glow at the stern
    { shape: ellipse(16, 0, 8, 4.2), ramp: CYAN, bevel: 3, dome: 1, bias: 0.15, spec: 1 },
    { shape: ellipse(-36, 0, 2.2, 4), ramp: FIRE, bevel: 2, dome: 1, bias: 0.3 },
    // dorsal beam turret behind the canopy
    { shape: ellipse(-2, 0, 4.5, 4.5), ramp: DARK, bevel: 3, dome: 1 },
    { shape: capsule(-2, 0, 8, 0, 1.2), ramp: [12, 14, 6], bevel: 1, bias: 0.2 },
  ];
  return render(96, 96, parts, { toLocal, bg: 0, outline: 1 });
}

// ---------------------------------------------------------------- map icon (facing right)
// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
export function mapIcon() {
  const parts = [
    { shape: union(poly([[6, 7], [11, 7], [18, 2], [16, 1], [11, 1.5]]), poly([[6, 9], [11, 9], [18, 14], [16, 15], [11, 14.5]])), ramp: [5, 4, 3], bevel: 1, dome: 1 },
    { shape: union(capsule(9, 1.6, 18, 1.6, 1.3), capsule(9, 14.4, 18, 14.4, 1.3)), ramp: [6, 5, 4], bevel: 1 },
    { shape: poly([[23.5, 8], [16, 6.6], [6, 5.6], [1.5, 8], [6, 10.4], [16, 9.4]]), ramp: [6, 5, 4, 3, 2], bevel: 2, dome: 1 },
    { shape: rect(12, 7.5, 16, 8.5), ramp: [1], flat: 1, line: false },
  ];
  return render(24, 16, parts, { outline: 7 });
}

// ---------------------------------------------------------------- fight hull (left side, facing right)
// colour numbers of the ships' fight rows: 2-7 hull (light to dark), 8-11 metal (dark to light)
export function fightHull() {
  const HULL = [7, 6, 5, 4, 3, 2], METAL2 = [8, 9, 10, 11], cy = 64, PODS = [17, 101];
  const wing = (P) => { const s = Math.sign(P - cy); return poly([[4, cy + 8 * s], [30, cy + 8 * s], [52, P - 4 * s], [22, P - 4 * s]]); };
  // broadside ports on the wing leading edges and the prow (box y 36, 52, 68, 84, 100)
  const PORTS = [[41.5, 36], [33.5, 52], [47, 68], [37.5, 84], [45.5, 100]];
  const parts = [
    // forward-swept wings from the stern roots out to the pods
    { shape: union(...PODS.map(wing)), ramp: HULL, bevel: 6, dome: 1, bias: -0.05 },
    { shape: union(...PODS.map((P) => { const s = Math.sign(P - cy); return poly([[30, cy + 8 * s], [52, P - 4 * s], [49, P - 4 * s], [27, cy + 8 * s]]); })), ramp: [3, 2], bevel: 1, line: false },
    { shape: union(...PORTS.map(([x, y]) => ellipse(x, y, 3.2, 3.2))), ramp: METAL2, bevel: 2, dome: 1 },
    // wingtip pods with the beam emitters at their noses
    { shape: union(...PODS.map((P) => capsule(16, P, 52, P, 6))), ramp: HULL, bevel: 4, dome: 1, spec: 0.9 },
    { shape: union(...PODS.map((P) => ellipse(15, P, 3, 5))), ramp: [9, 10, 11], bevel: 2, dome: 1, bias: 0.4 },
    { shape: union(...PODS.map((P) => capsule(52, P, 60, P, 1.8))), ramp: [9, 11], bevel: 1, bias: 0.3 },
    // tail fins
    { shape: union(poly([[2, cy - 4], [16, cy - 6], [8, cy - 16], [0, cy - 16]]), poly([[2, cy + 4], [16, cy + 6], [8, cy + 16], [0, cy + 16]])), ramp: HULL, bevel: 3, dome: 1 },
    // the fuselage and needle prow
    { shape: poly([[63, cy], [44, cy - 4], [26, cy - 10], [6, cy - 9], [1, cy], [6, cy + 9], [26, cy + 10], [44, cy + 4]]), ramp: HULL, bevel: 9, dome: 1, height: 1.4, spec: 0.9 },
    { shape: poly([[60, cy + 0.6], [30, cy + 2], [6, cy + 2], [6, cy - 2], [30, cy - 2], [60, cy - 0.6]]), ramp: [4, 3], bevel: 1, line: false },
    { shape: ellipse(36, cy, 7, 4), ramp: [8, 10, 11], bevel: 3, dome: 1, bias: 0.15, spec: 1 },
    { shape: ellipse(1, cy, 2, 4), ramp: [10, 11], bevel: 1, bias: 0.4 },
  ];
  return render(64, 128, parts, { outline: 7 });
}

// ---------------------------------------------------------------- board token (facing right)
export function boardToken() {
  const HULL = [7, 6, 5, 4, 3, 2], cy = 12;
  const parts = [
    { shape: union(poly([[4, cy - 3], [12, cy - 3], [26, cy - 10], [22, cy - 11.5], [12, cy - 9]]), poly([[4, cy + 3], [12, cy + 3], [26, cy + 10], [22, cy + 11.5], [12, cy + 9]])), ramp: HULL, bevel: 2, dome: 1, bias: -0.05 },
    { shape: union(capsule(13, cy - 10.5, 27, cy - 10.5, 1.8), capsule(13, cy + 10.5, 27, cy + 10.5, 1.8)), ramp: HULL, bevel: 2, dome: 1 },
    { shape: union(ellipse(12.5, cy - 10.5, 1, 1.4), ellipse(12.5, cy + 10.5, 1, 1.4)), ramp: [10, 11], bevel: 1, bias: 0.4, line: false },
    { shape: poly([[35.5, cy], [26, cy - 2.2], [14, cy - 3.6], [3, cy - 2.6], [1, cy], [3, cy + 2.6], [14, cy + 3.6], [26, cy + 2.2]]), ramp: HULL, bevel: 3, dome: 1, height: 1.4, spec: 0.9 },
    { shape: ellipse(22, cy, 3, 1.6), ramp: [8, 10, 11], bevel: 1, dome: 1, bias: 0.2 },
    { shape: capsule(5, cy, 32, cy, 0.5), ramp: [4], flat: 4, line: false },
  ];
  return render(36, 24, parts, { outline: 7 });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const art = infoArt(), icon = mapIcon(), hull = fightHull(), token = boardToken();
  const rows = (img) => JSON.stringify(encode(img)).replace(/","/g, '",\n      "');
  writeFileSync(new URL('../../js/art/pegasus.js', import.meta.url), `// The Pegasus's own art (expansion type 61), drawn by tools/art/pegasus.mjs; original art, not
// from the ROM. Rows of base-36 colour numbers: the picture's own palette; the map icon's numbers
// in the map icons' army rows (1-7); the board token's and the fight hull's in the ships' fight rows.
export const PEGASUS = {
  art: { w: ${art.w}, h: ${art.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(art)} },
  icon: { w: ${icon.w}, h: ${icon.h},
    rows: ${rows(icon)} },
  token: { w: ${token.w}, h: ${token.h},
    rows: ${rows(token)} },
  hull: { w: ${hull.w}, h: ${hull.h},
    rows: ${rows(hull)} },
};
`);
  console.log('wrote js/art/pegasus.js');
}
