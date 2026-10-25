// The Pallas's own art (expansion types 62-65, the Athena's successor): original pixel art, drawn
// from the shapes below with tools/art/raster.mjs and written to js/art/pallas.js.
//   node tools/art/pallas.mjs
// Three sets, one per look of the machine:
//   pallasJet      62, the jet with its missile pod
//   pallasJetSpent 63, the jet after the bomb run (pod gone)
//   pallasRobot    64/65, the robot (the bomb rides inside the backpack, so both look the same)
// Each set: the unit-info picture (96x96, own palette), the map icon (24x16, the icon rows'
// colour numbers 1-7) and the fight poses: 32x32 sprites in the colour numbers of the small
// craft's fight rows, facing left like the ROM's sheets, keyed by the sheet tile of the Athena
// pose they stand in for (`look` 4/5/6/7; poses measured from the fight scene):
//   jet  (sheet 403)          0 flying
//   jet, spent (sheet 404)    0 flying, 64 firing the nose guns
//   robot, slot 0 (sheet 405) 0 at rest, 4/8/12 striding, 64 firing the railgun
//   robot, slots 1-3 (406)    0-12 sabre drawn, 64 guard, 68/72/76 the cuts, 128 struck
// The design: one machine in two shapes. The jet has forward-swept wings, twin canted fins, side
// intakes and a long nose with a bubble canopy; in robot form the nose and canopy fold into the
// chest, the intakes become the shoulders, the wings a binder pack on the back and the fins the
// V-crest over a cyan visor. Galt pink and white with blue trim (gold on the unit pictures).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, capsule, union, render, encode } from './raster.mjs';
import { robotSprites } from './pallas-pixels.mjs';
import { JET_POSES, robotPicture, jetPicture, robotIcon, jetIcon } from './pallas-pics.mjs';

const rot = (cx, cy, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
const polar = ([x, y], deg, len) => { const a = (deg * Math.PI) / 180; return [x + Math.sin(a) * len, y - Math.cos(a) * len]; };   // 0 deg = up, negative = forward (left)

// A frame helper: points in the 32-unit frame (facing left), posed by rotation `lean` about
// (16, 16), shifted by (dx, dy), scaled by k and moved by (ox, oy).
function frame(p, k, ox, oy) {
  const lean = rot(16, 16, p.lean || 0), g = p.grow || 1, c = p.centre || [16, 17];
  const P = ([x, y]) => { const [u, v] = lean([c[0] + (x - c[0]) * g + (p.dx || 0), c[1] + (y - c[1]) * g + (p.dy || 0)]); return [ox + u * k, oy + v * k]; };
  return {
    P, pts: (a) => poly(a.map(P)),
    cap: (a, b, r) => { const [x0, y0] = P(a), [x1, y1] = P(b); return capsule(x0, y0, x1, y1, r * k * g); },
    ell: (q, rx, ry) => { const [x, y] = P(q); return ellipse(x, y, rx * k * g, ry * k * g); },
    // details: a 1-px line and a single pixel (rivet, glint), at any scale at least a pixel wide
    ln: (a, b, w = 0.42) => { const [x0, y0] = P(a), [x1, y1] = P(b); return capsule(x0, y0, x1, y1, Math.max(w * k, 0.62)); },
    dot: (q, rr = 0.45) => { const [x, y] = P(q); return ellipse(x, y, Math.max(rr * k, 0.62), Math.max(rr * k, 0.62)); },
  };
}

// ---------------------------------------------------------------- the jet
// Side view facing left, seen a little from above: the far wing above the fuselage, the near wing
// below it, both swept forward. `p.pod`: the missile pod under the belly; `p.guns`: muzzle flash.
function jet(p, C, k = 1, ox = 0, oy = 0) {
  const { pts, cap, ell } = frame(p, k, ox, oy), parts = [];
  // far wing (behind the body), swept forward, and the far fin
  parts.push({ shape: pts([[17, 12], [24.5, 11.5], [16.5, 2.4], [11, 3]]), ramp: C.far, bevel: 2, dome: 1 });
  parts.push({ shape: pts([[11.4, 3.6], [14.4, 3.2], [16.6, 4.6], [12.6, 5.4]]), ramp: C.trim, bevel: 1, line: false });
  parts.push({ shape: pts([[22.5, 11.5], [27.5, 11], [31, 3.6], [28.6, 3.4]]), ramp: C.far, bevel: 1, dome: 1 });
  // engine glow at the tail
  parts.push({ shape: ell([30.6, 16], 1.4, 3), ramp: C.glow, bevel: 1, bias: 0.3, line: false });
  // fuselage: a long nose, a deep body, the engine block
  parts.push({ shape: pts([[0.4, 16.2], [4, 13.4], [10, 10.8], [24, 10.2], [30.6, 11.8], [30.6, 20.2], [24, 21.6], [11, 21.4], [4, 19]]), ramp: C.white, bevel: 4, dome: 1, height: 1.3, spec: 0.8 });
  // pink stripe along the spine to the nose
  parts.push({ shape: pts([[2.4, 15.2], [10, 11.6], [28, 11.4], [28.6, 13], [10, 13.2], [3.4, 16.4]]), ramp: C.pink, bevel: 1, line: false });
  // bubble canopy
  parts.push({ shape: ell([10.6, 12], 4.4, 2.3), ramp: C.cyan, bevel: 2, dome: 1, bias: 0.15, spec: 1 });
  // side intake (the robot's shoulder), dark mouth
  parts.push({ shape: pts([[13, 14.6], [21.5, 14], [22.2, 20], [14, 20.4]]), ramp: C.blue, bevel: 2, dome: 1 });
  parts.push({ shape: pts([[13.8, 15.6], [16.6, 15.4], [16.8, 19.4], [14.4, 19.6]]), ramp: C.dark, bevel: 1, line: false });
  // the near fin, canted, blue tip
  parts.push({ shape: pts([[21.5, 11], [27, 10.6], [29.6, 1.4], [26.4, 1.6]]), ramp: C.white, bevel: 2, dome: 1 });
  parts.push({ shape: pts([[26.2, 2.6], [29.4, 2.4], [29.6, 1.4], [26.4, 1.6]]), ramp: C.trim, bevel: 1, line: false });
  // near wing, swept forward, blue leading edge, pink tip
  parts.push({ shape: pts([[15.5, 19], [25, 19.4], [19, 30], [11.6, 30.6]]), ramp: C.white, bevel: 3, dome: 1, bias: 0.05 });
  parts.push({ shape: pts([[15.5, 19], [17.6, 19.1], [13.6, 30.5], [11.6, 30.6]]), ramp: C.trim, bevel: 1, line: false });
  parts.push({ shape: pts([[14.6, 28], [19.8, 28.6], [19, 30], [12.2, 30.5]]), ramp: C.pink, bevel: 1, line: false });
  // the missile pod under the belly: a long white store with a pink seeker and blue fins
  if (p.pod) {
    parts.push({ shape: cap([5.6, 23.4], [21.6, 23.4], 2), ramp: C.white, bevel: 2, dome: 1, spec: 0.9 });
    parts.push({ shape: pts([[18.6, 21.6], [23.6, 20.6], [23.6, 26.2], [18.6, 25.2]]), ramp: C.blue, bevel: 1, line: false });
    parts.push({ shape: ell([5, 23.4], 1.5, 1.5), ramp: C.pink, bevel: 1, line: false });
    parts.push({ shape: pts([[10, 21], [13.4, 21], [12.6, 22], [10.6, 22]]), ramp: C.dark, bevel: 1, line: false });
  }
  // details: panel lines, the canopy frame and glint, intake shading, fin and wing markings, rivets
  const { ln, dot } = frame(p, k, ox, oy), flat = (shape, v) => parts.push({ shape, flat: v, line: false });
  const fine = k > 1.5;   // panel lines and rivets only where there is room for them (the pictures); sprites keep the big reads
  if (fine) flat(union(ln([6, 17.6], [12, 19.4]), ln([12.4, 11], [12.4, 13.8]), ln([25, 14], [30, 14]), ln([4, 16.6], [8, 15.4])), C.line);
  flat(ln([22, 11.4], [22.4, 20.6]), C.line);
  flat(union(ln([7.4, 11.4], [13.6, 11]), dot([8.6, 11.6], 0.5)), C.glint);
  flat(ln([14.2, 20.2], [21.8, 19.8], 0.5), C.line);
  flat(union(ln([18, 15], [21, 14.8]), dot([20.6, 17.6])), C.hi);
  flat(union(ln([27.3, 4.4], [28.6, 4.3]), ln([26.8, 6.6], [28.2, 6.5])), C.mark);
  if (fine) flat(union(ln([16.6, 22], [22.6, 21.4]), ln([16.4, 25], [20.4, 24.6])), C.line);
  if (fine) flat(union(dot([24.4, 17]), dot([26.4, 17]), dot([28.2, 17]), dot([18, 12.6]), dot([20.6, 12.6])), C.hi);
  flat(union(ln([29.4, 13], [29.4, 19]), ln([30.6, 13.6], [30.6, 18.4])), C.line);
  // nose guns firing
  if (p.guns) parts.push({ shape: union(cap([-1.5, 17], [3, 17], 0.9), ell([0.2, 17], 1.9, 1.6)), ramp: C.beam, bevel: 1, bias: 0.4, line: false });
  return parts;
}

// ---------------------------------------------------------------- the robot
// Facing left, posed by `p`: `arm` the weapon (rifle or sabre), `aim` its angle (0 up, -90
// straight forward), `hand`/`elbow`, `legs`, `spark` (struck).
function robot(p, C, k = 1, ox = 0, oy = 0) {
  p = { grow: 1.08, centre: [15, 18], ...p };   // a little chunkier than the frame, like the ROM's hunters
  const { P, pts, cap, ell } = frame(p, k, ox, oy), parts = [];
  const L = p.legs || {}, fk = L.front || [[13, 20.5], [10.4, 25.4], [9.6, 29.4]], rk = L.rear || [[18.6, 20.5], [20.6, 25.4], [21.8, 29.4]];
  const hand = p.hand || [6.5, 16.5], el = p.elbow || [8.4, 15.2];
  // wing-binder pack: the jet's wings folded up behind the shoulders, and its fins' thrusters
  parts.push({ shape: pts([[18, 8.4], [22.4, 7.4], [30.6, -0.2], [27.4, -0.6]]), ramp: C.far, bevel: 2, dome: 1 });
  parts.push({ shape: pts([[27.2, -0.6], [30.6, -0.2], [29.4, 1.6], [26.4, 1.2]]), ramp: C.pink, bevel: 1, line: false });
  parts.push({ shape: pts([[18.6, 10.6], [23.4, 9.2], [31.6, 5.2], [31, 2.6]]), ramp: C.white, bevel: 2, dome: 1 });
  parts.push({ shape: pts([[28.6, 3.2], [31, 2.6], [31.6, 5.2], [29, 5.8]]), ramp: C.trim, bevel: 1, line: false });
  parts.push({ shape: pts([[17.6, 9], [24.6, 9], [25.4, 17.4], [18.6, 18.4]]), ramp: C.dark, bevel: 2, dome: 1 });
  parts.push({ shape: union(ell([25.6, 18.6], 1.3, 1.7), ell([23, 19.2], 1.2, 1.6)), ramp: C.glow, bevel: 1, bias: 0.3, line: false });
  // rear leg and foot
  parts.push({ shape: union(cap(rk[0], rk[1], 3.4), cap(rk[1], rk[2], 3.1)), ramp: C.far, bevel: 2, dome: 1 });
  parts.push({ shape: pts([[rk[2][0] - 3.4, rk[2][1] - 0.8], [rk[2][0] + 3.4, rk[2][1] - 1], [rk[2][0] + 3.8, rk[2][1] + 2], [rk[2][0] - 3.8, rk[2][1] + 2]]), ramp: C.dark, bevel: 1 });
  // rear arm (behind the body)
  parts.push({ shape: union(cap([18.6, 11.4], [20.2, 15.6], 2), cap([20.2, 15.6], [18, 18.6], 1.8)), ramp: C.far, bevel: 1, dome: 1 });
  // waist, hip armour
  parts.push({ shape: pts([[11.4, 17.4], [19.8, 17.2], [19.6, 22], [12, 22.4]]), ramp: C.dark, bevel: 1 });
  parts.push({ shape: pts([[10.6, 18.6], [15.4, 18.4], [14.6, 23.6], [11.2, 23]]), ramp: C.white, bevel: 2, dome: 1 });
  // torso: the jet's nose folded into the chest, its canopy the chest light
  parts.push({ shape: pts([[9.2, 8.6], [19.8, 8], [20.4, 14.4], [18.4, 18.8], [12, 19], [9.6, 14]]), ramp: C.white, bevel: 4, dome: 1, height: 1.2, spec: 0.8 });
  parts.push({ shape: pts([[10.2, 9.6], [13.6, 9.4], [12.8, 18.2], [11.2, 17.2]]), ramp: C.pink, bevel: 1, line: false });
  parts.push({ shape: ell([16, 11.8], 2.4, 1.9), ramp: C.cyan, bevel: 1, dome: 1, bias: 0.2, spec: 1, line: false });
  parts.push({ shape: pts([[13.2, 15.6], [19, 15.4], [18.2, 17.8], [13.6, 18]]), ramp: C.blue, bevel: 1, line: false });
  // front leg: thigh, knee guard, shin with the pink stripe, a big foot
  parts.push({ shape: union(cap(fk[0], fk[1], 3.6), cap(fk[1], fk[2], 3.3)), ramp: C.white, bevel: 3, dome: 1 });
  parts.push({ shape: cap([fk[1][0] - 0.8, fk[1][1] + 1], [fk[2][0] - 0.8, fk[2][1] - 1.8], 0.9), ramp: C.pink, bevel: 1, line: false });
  parts.push({ shape: pts([[fk[2][0] - 4.6, fk[2][1] - 0.8], [fk[2][0] + 3, fk[2][1] - 1], [fk[2][0] + 3.4, fk[2][1] + 2], [fk[2][0] - 5, fk[2][1] + 2]]), ramp: C.blue, bevel: 1 });
  parts.push({ shape: ell(fk[1], 2.2, 1.9), ramp: C.blue, bevel: 1, line: false });
  // head: helmet, the jet's fins as a V-crest, a cyan visor, the pink face plate
  parts.push({ shape: pts([[11, 3.6], [16.8, 2.8], [18.8, 5.6], [18, 9.4], [12.4, 9.6], [10.4, 6.4]]), ramp: C.white, bevel: 2, dome: 1, bias: 0.05 });
  parts.push({ shape: pts([[13.4, 4], [8.6, -1], [15.2, 3.2]]), ramp: C.trim, bevel: 1 });
  parts.push({ shape: pts([[15.4, 3.4], [20, -1.2], [17, 4.4]]), ramp: C.trim, bevel: 1 });
  parts.push({ shape: pts([[10.4, 5.8], [15, 5.2], [14.6, 7.4], [10.6, 7.6]]), ramp: C.cyan, bevel: 1, bias: 0.35, line: false });
  parts.push({ shape: pts([[11.8, 8.2], [15, 8], [14.6, 9.6], [12, 9.6]]), ramp: C.pink, bevel: 1, line: false });
  // the weapon arm, then the front shoulder over it: the jet's intake
  parts.push({ shape: union(cap([11, 12], el, 2.6), cap(el, hand, 2.4)), ramp: C.white, bevel: 2, dome: 1 });
  if (p.arm === 'rifle') {
    // the railgun: a long two-rail rifle along `aim`
    const a = p.aim ?? -90, muzzle = polar(hand, a, 14), back = polar(hand, a + 180, 5);
    parts.push({ shape: cap(back, muzzle, 1.5), ramp: C.gun, bevel: 1, dome: 1, spec: 0.9 });
    parts.push({ shape: cap(polar(hand, a, 2.5), polar(hand, a, 12.6), 0.55), ramp: C.dark, bevel: 1, line: false });
    parts.push({ shape: ell(polar(hand, a + 160, 1.6), 1.4, 1.8), ramp: C.dark, bevel: 1, line: false });
    if (p.flash) { const [fx, fy] = P(polar(hand, a, 15.4)); parts.push({ shape: union(ellipse(fx, fy, 2.4 * k, 2 * k), capsule(fx - 3.2 * k, fy, fx + 1 * k, fy, 0.9 * k)), ramp: C.beam, bevel: 1, bias: 0.45, line: false }); }
  } else {
    // the beamsaber
    const a = p.aim ?? 0, tip = polar(hand, a, 14);
    parts.push({ shape: cap(hand, polar(hand, a + 180, 2.2), 1.1), ramp: C.dark, bevel: 1, line: false });
    parts.push({ shape: cap(polar(hand, a, 1.6), tip, 1.05), ramp: C.beam, bevel: 1, bias: 0.25, line: false });
  }
  parts.push({ shape: ell(hand, 1.7, 1.7), ramp: C.blue, bevel: 1, dome: 1 });
  parts.push({ shape: pts([[6, 7.2], [14.4, 6.6], [15, 13.4], [6.8, 14]]), ramp: C.blue, bevel: 3, dome: 1, bias: 0.05 });
  parts.push({ shape: pts([[6.8, 8.4], [9.6, 8.2], [9.8, 12.8], [7.4, 13]]), ramp: C.dark, bevel: 1, line: false });
  parts.push({ shape: pts([[10.4, 6.8], [14.4, 6.6], [14.5, 7.8], [10.4, 8]]), ramp: C.white, bevel: 1, line: false });
  // details: armour plate lines, chest vents, knee and elbow joints, rivets, the visor glint,
  // the crest gem, rifle vents and scope, backpack nozzles
  const { ln, dot } = frame(p, k, ox, oy), flat = (shape, v) => parts.push({ shape, flat: v, line: false });
  const fine = k > 1.5;   // panel lines and rivets only on the pictures
  if (fine) flat(union(ln([10.2, 14.2], [19.6, 13.8]), ln([16, 8.6], [16.4, 9.8]), ln([12, 19], [18.8, 18.8])), C.line);
  flat(union(ln([14.8, 16.4], [17.8, 16.3]), ln([14.6, 17.4], [17.6, 17.3])), C.line);
  if (fine) flat(union(ln([7, 10.6], [13.6, 10.2]), ln([10.8, 7.4], [11, 13])), C.line);
  if (fine) flat(union(dot([8.2, 8]), dot([13.4, 7.8]), dot([13.6, 12.2])), C.hi);
  flat(union(dot([fk[1][0] + 1.6, fk[1][1] - 0.6], 0.8), dot(el, 0.8)), C.line);
  if (fine) flat(union(ln([fk[0][0] - 2, fk[0][1] + 1.4], [fk[0][0] + 1.6, fk[0][1] + 1]), ln([fk[2][0] - 3.6, fk[2][1] + 0.6], [fk[2][0] + 2.4, fk[2][1] + 0.4])), C.line);
  flat(union(dot([11.4, 6.2], 0.5), dot([16.6, 12.6], 0.5)), C.glint);
  flat(dot([14.4, 4.4], 0.6), C.mark);
  flat(union(ln([21, 11.4], [24, 11.2]), ln([21.2, 13.6], [24.2, 13.4]), ln([21.4, 15.8], [24.4, 15.6])), C.line);
  if (p.arm === 'rifle') {
    const a = p.aim ?? -90;
    if (fine) flat(union(dot(polar(hand, a, 5.5), 0.5), dot(polar(hand, a, 7.5), 0.5), dot(polar(hand, a, 9.5), 0.5)), C.hi);
    flat(ln(polar(polar(hand, a, 3), a - 90, 1.6), polar(polar(hand, a, 7), a - 90, 1.6), 0.55), C.line);
  }
  if (p.spark) { const [sx, sy] = P(p.spark); parts.push({ shape: union(capsule(sx - 5 * k, sy, sx + 5 * k, sy, 0.9 * k), capsule(sx, sy - 5 * k, sx, sy + 5 * k, 0.9 * k), ellipse(sx, sy, 1.8 * k, 1.8 * k)), ramp: C.beam, bevel: 1, bias: 0.4, line: false }); }
  return parts;
}

// ---------------------------------------------------------------- fight poses
// craft fight rows (army A): 1 black, 2-7 pink light to dark, 8-11 blue to pale, 12-14 cyan, 15 white
const FIGHT = { line: 5, hi: 2, glint: 15, mark: 9, white: [4, 3, 2, 15], trim: [8, 9, 10], gun: [8, 10, 11, 15], far: [5, 4, 3], dark: [6, 5, 4], pink: [9, 10, 11], blue: [8, 9, 10], cyan: [12, 13, 14, 15], glow: [10, 11, 15], beam: [12, 13, 14, 15] };
const stride = (a) => ({ front: [[13.5, 20], [11 - a, 24.8], [9.6 - a, 29.4]], rear: [[18.5, 20], [20.5 + a, 24.8], [22.2 + a, 29.4]] });
const rifle = (o) => ({ arm: 'rifle', aim: -90, hand: [6.4, 16.4], elbow: [9.2, 16.6], ...o });
export const POSES = {
  jet: { 0: { pod: true } },
  jetSpent: { 0: {}, 64: { guns: true, lean: -3 } },
  robot: {   // sheet 405: the railgun
    0: rifle({}),
    4: rifle({ dy: -0.4, legs: stride(1) }),
    8: rifle({ legs: stride(-0.5) }),
    12: rifle({ dy: 0.4, legs: stride(0.5) }),
    64: rifle({ flash: true, dx: 0.8, aim: -88, legs: stride(0.6) }),
  },
  robotMelee: {   // sheet 406: the beamsaber
    0: { aim: 0, hand: [7, 15.5] },
    4: { aim: -6, dy: -0.5, hand: [7, 15.5], legs: stride(1) },
    8: { aim: 6, hand: [7, 15.5], legs: stride(-0.5) },
    12: { aim: -12, dy: 0.5, hand: [7, 15.5], legs: stride(0.5) },
    64: { aim: -68, dy: 1, hand: [6.5, 16.5], legs: { front: [[13.5, 20.5], [10.5, 25], [10, 29.6]], rear: [[18.5, 20.5], [21, 26], [20.6, 29.6]] } },
    68: { aim: -125, lean: -10, hand: [6, 17.5], elbow: [8.5, 16], legs: stride(1.5) },
    72: { aim: 35, lean: 8, hand: [8.5, 8.5], elbow: [9.5, 12], legs: stride(-1) },
    76: { aim: -100, lean: -18, dx: -1.5, hand: [5, 15.5], elbow: [8, 15], legs: stride(2.5) },
    128: { aim: 45, lean: 14, dx: 2, legs: stride(-1), spark: [5, 11] },
  },
};
// the ROM's sprites outline in the army's darkest tone, not black
const sprite = (draw, pose) => render(32, 32, draw(pose, FIGHT), { outline: 7, cel: true, smooth: 1, bands: [0.1, 0.42, 0.9], bands3: [0.16, 0.6] });
// the robot's fight poses are placed pixel by pixel (tools/art/pallas-pixels.mjs); the jet's are drawn from shapes
export const poseSprites = (which) => (which.startsWith('robot') ? robotSprites(which) : JET_POSES[which]);

// ---------------------------------------------------------------- unit-info pictures
export const ART_PALETTE = ['#6b6bad', '#000000', '#5a5a7b', '#9c9cbd', '#d6d6ef', '#ffffff', '#7b005a', '#bd00bd', '#ff3aff', '#ff9cff',
  '#00399c', '#005aff', '#009cff', '#7bdeff', '#9c6b00', '#e7ad00', '#ffe75a', '#26263a', '#40405a', '#ffffff'];
const ARTC = { line: 2, hi: 5, glint: 19, mark: 8, white: [2, 3, 4, 5], trim: [14, 15, 16], gun: [2, 3, 4, 5], far: [18, 2, 3], dark: [17, 18, 2], pink: [6, 7, 8, 9], blue: [10, 11, 12], cyan: [11, 12, 13, 5], glow: [15, 16, 5], beam: [12, 13, 5], gold: [14, 15, 16] };
// the pictures have gold trim (crest, fin tips, leading edges); the fight palette has no gold, so blue there
const PIC = ARTC;
export function infoArt(which) {
  return which === 'robot' ? robotPicture() : jetPicture(which === 'jet');
}

// ---------------------------------------------------------------- map icons (facing right)
// icon rows: 1 white, 2-6 pink light to dark, 7 near black
export function mapIcon(which) {
  const C = { line: 6, hi: 1, glint: 1, mark: 2, white: [3, 2, 1], trim: [5, 4], gun: [2, 1], far: [5, 4], dark: [6, 5], pink: [4, 3], blue: [5, 4], cyan: [2, 1], glow: [2, 1], beam: [2, 1] };
  const img = which === 'robot' ? robotIcon() : jetIcon(which === 'jet');
  const px = new Uint8Array(img.px.length);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) px[y * 24 + x] = img.px[y * 24 + 23 - x];
  return { w: 24, h: 16, px };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (img) => JSON.stringify(encode(img)).replace(/","/g, '",\n      "');
  const poses = (which) => Object.entries(poseSprites(which)).map(([b, img]) => `    ${b}: { w: 32, h: 32,\n      rows: ${rows(img)} },`).join('\n');
  const set = (name, art, icon, poseKey, poses2) => `export const ${name} = {
  art: { w: 96, h: 96, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(infoArt(art))} },
  icon: { w: 24, h: 16,
    rows: ${rows(mapIcon(icon))} },
  poses: {
${poses(poseKey)}
  },${poses2 ? `\n  // poses on the second sheet (weapon slots 1-3: the sabre)\n  poses2: {\n${poses(poses2)}\n  },` : ''}
};
`;
  const out = `// The Pallas's own art (expansion types 62-65), drawn by tools/art/pallas.mjs; original art, not
// from the ROM. Rows of base-36 colour numbers: the pictures' own palette; the map icons' numbers
// in the icon army rows (1-7); the fight poses' in the small craft's fight rows, keyed by the
// Athena sheet tile each stands in for.
${set('PALLAS_JET', 'jet', 'jet', 'jet')}
${set('PALLAS_JET_SPENT', 'jetSpent', 'jetSpent', 'jetSpent')}
${set('PALLAS_ROBOT', 'robot', 'robot', 'robot', 'robotMelee')}`;
  writeFileSync(new URL('../../js/art/pallas.js', import.meta.url), out);
  console.log('wrote js/art/pallas.js');
}
