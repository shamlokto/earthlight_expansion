// Monorail lines for the 3D view (version 11, docs/COLONY-V11.md). The lines themselves are the rules' (network.js
// monorailNet: Monorail Stops and Market Quads from the Arcade up, each linked to its nearest stations): here they are
// drawn as an elevated white beam on slim pylons, with small cars gliding to and fro along each line.
//   * three InstancedMeshes for every line on the deck (beams, pylons, car bodies) and one for the cars' lit windows;
//     rebuilt only when the lines change, never per frame
//   * update(dt) moves the cars in place: no allocation in the hot loop (movers.js style); dt is already scaled by the
//     game speed (0 freezes them)
import * as THREE from 'three';
import { monorailNet } from '../network.js';

const RAIL = { y: 1.62, beam: 0.16, depth: 0.12, pylonEvery: 3, pylonR: 0.07, carL: 0.9, carW: 0.24, carH: 0.2, speed: 2.2, longLine: 12 };

export function createMonorail(parent) {
  const group = new THREE.Group();
  group.name = 'monorail';
  parent.add(group);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const beamMat = new THREE.MeshLambertMaterial({ color: '#e8ecf0' }), pylonMat = new THREE.MeshLambertMaterial({ color: '#f4f6f8' });
  const carMat = new THREE.MeshLambertMaterial({ color: '#f2f5f8' }), winMat = new THREE.MeshBasicMaterial({ color: '#7fe0ff' });
  let beams = null, pylons = null, cars = null, wins = null, sig = '';
  // per car: [ax, ay, az, bx, by, bz, u, dir, speedPerSec, yaw]
  let carData = new Float32Array(0), nCars = 0;
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  function clear() {
    for (const m of [beams, pylons, cars, wins]) if (m) { group.remove(m); m.dispose(); }
    beams = pylons = cars = wins = null; nCars = 0;
  }
  function mk(geo, mat, n, name) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.count = n; m.frustumCulled = false; m.name = name; group.add(m);
    return m;
  }

  // state: the whole colony; deck: the deck on show; topAt(x, y): the ground's height under a tile.
  function refresh(state, deck, topAt) {
    const net = monorailNet(state), links = net.links.filter((l) => l.deck === deck);
    const s = deck + '|' + links.map((l) => `${l.key}:${l.a.x},${l.a.y},${l.b.x},${l.b.y}`).join(';');
    if (s === sig) return;
    sig = s;
    clear();
    if (!links.length) return;
    const ground = (x, y) => topAt(Math.floor(x), Math.floor(y));
    let nPylons = 0;
    const lines = links.map((l) => {
      const len = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y), y = Math.max(ground(l.a.x, l.a.y), ground(l.b.x, l.b.y)) + RAIL.y;
      const np = Math.max(0, Math.floor(len / RAIL.pylonEvery) - 1);
      nPylons += np;
      return { l, len, y, np };
    });
    beams = mk(boxGeo, beamMat, lines.length, 'monorail-beams');
    pylons = nPylons ? mk(cylGeo, pylonMat, nPylons, 'monorail-pylons') : null;
    let p = 0;
    lines.forEach(({ l, len, y, np }, k) => {
      const yaw = Math.atan2(-(l.b.y - l.a.y), l.b.x - l.a.x);
      q4.setFromAxisAngle(up, yaw);
      m4.compose(v4.set((l.a.x + l.b.x) / 2, y, (l.a.y + l.b.y) / 2), q4, s4.set(len, RAIL.beam, RAIL.depth));
      beams.setMatrixAt(k, m4);
      for (let i = 1; i <= np; i++) {
        const t = i / (np + 1), x = l.a.x + (l.b.x - l.a.x) * t, z = l.a.y + (l.b.y - l.a.y) * t, g = ground(x, z), h = Math.max(0.1, y - g);
        m4.compose(v4.set(x, g + h / 2, z), q4.identity(), s4.set(RAIL.pylonR, h, RAIL.pylonR));
        pylons.setMatrixAt(p++, m4);
      }
    });
    beams.instanceMatrix.needsUpdate = true;
    if (pylons) pylons.instanceMatrix.needsUpdate = true;
    // the cars: one a line, two on a long one, starting at different points
    const list = [];
    lines.forEach(({ l, len, y }, k) => {
      const n = len > RAIL.longLine ? 2 : 1;
      for (let c = 0; c < n; c++) list.push([l.a.x, y + RAIL.beam / 2 + RAIL.carH / 2, l.a.y, l.b.x, y + RAIL.beam / 2 + RAIL.carH / 2, l.b.y, ((k * 0.37 + c * 0.5) % 1), c ? -1 : 1, RAIL.speed / Math.max(1, len), Math.atan2(-(l.b.y - l.a.y), l.b.x - l.a.x)]);
    });
    nCars = list.length;
    carData = new Float32Array(nCars * 10);
    list.forEach((c, i) => carData.set(c, i * 10));
    cars = mk(boxGeo, carMat, nCars, 'monorail-cars');
    wins = mk(boxGeo, winMat, nCars, 'monorail-windows');
    update(0);
  }

  function update(dt) {
    if (!nCars) return;
    for (let i = 0; i < nCars; i++) {
      const o = i * 10;
      let u = carData[o + 6] + carData[o + 7] * carData[o + 8] * dt;
      if (u > 1) { u = 2 - u; carData[o + 7] = -1; } else if (u < 0) { u = -u; carData[o + 7] = 1; }
      carData[o + 6] = u;
      const e = (1 - Math.cos(Math.PI * u)) / 2;   // easing into and out of each station
      const x = carData[o] + (carData[o + 3] - carData[o]) * e, y = carData[o + 1], z = carData[o + 2] + (carData[o + 5] - carData[o + 2]) * e;
      q4.setFromAxisAngle(up, carData[o + 9]);
      m4.compose(v4.set(x, y, z), q4, s4.set(RAIL.carL, RAIL.carH, RAIL.carW));
      cars.setMatrixAt(i, m4);
      m4.compose(v4.set(x, y + 0.02, z), q4, s4.set(RAIL.carL * 0.92, RAIL.carH * 0.4, RAIL.carW * 1.04));
      wins.setMatrixAt(i, m4);
    }
    cars.instanceMatrix.needsUpdate = true;
    wins.instanceMatrix.needsUpdate = true;
  }

  function reset() { sig = ''; clear(); }
  function dispose() { clear(); parent.remove(group); boxGeo.dispose(); cylGeo.dispose(); for (const m of [beamMat, pylonMat, carMat, winMat]) m.dispose(); }
  return { refresh, update, reset, dispose, group, stats: () => ({ lines: beams?.count || 0, cars: nCars }) };
}
