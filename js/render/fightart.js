// High-resolution art for the modern fight renderer (js/render/fightfx.js): a ROM sprite (or a
// whole capital ship, its 32 px parts put together first so its lighting has no seams)
// remastered at 4x, once, and cached.
//   * smooth silhouettes: the 1x mask is resampled bilinearly and thresholded with a soft ramp,
//     so stair-stepped edges become anti-aliased curves, with a dark outline around them
//   * a height map from each pixel's distance to the silhouette (bevel) and its brightness, and
//     from it a normal map for per-pixel lighting: a warm key light from the top left, a cool fill
//     from below, ambient occlusion in the crevices, metal highlights, and a rim light in the
//     army's colour along the edges turned away from the key
//   * an emissive layer (engine flames, sensor eyes, lamps: small hot, saturated areas), blurred
//     into a glow the renderer adds each frame
//   * two light-response layers (lit from the left, lit from the right) the renderer adds when an
//     explosion or a shot lights the machine up
//   * a soft drop shadow
// Nothing here changes what is drawn where; it only decides how it looks.
export const UP = 4;

export function canvasOf(w, h) {
  if (typeof document !== 'undefined') return Object.assign(document.createElement('canvas'), { width: w, height: h });
  return new OffscreenCanvas(w, h);
}

// Scale2x on colour numbers (crisp detail inside the sprite).
export function scale2x(src, w, h) {
  const out = new (src.constructor)(w * h * 4), W2 = w * 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = src[y * w + x];
      const a = y > 0 ? src[(y - 1) * w + x] : p, b = x < w - 1 ? src[y * w + x + 1] : p;
      const c = x > 0 ? src[y * w + x - 1] : p, d = y < h - 1 ? src[(y + 1) * w + x] : p;
      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (c === a && c !== d && a !== b) e0 = a;
      if (a === b && a !== c && b !== d) e1 = b;
      if (d === c && d !== b && c !== a) e2 = c;
      if (b === d && b !== a && d !== c) e3 = d;
      const o = y * 2 * W2 + x * 2;
      out[o] = e0; out[o + 1] = e1; out[o + W2] = e2; out[o + W2 + 1] = e3;
    }
  }
  return out;
}

// Box blur in place (separable, radius r, `passes` times) on a Float32Array of w*h.
function blur(a, w, h, r, passes = 1) {
  const t = new Float32Array(a.length), k = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let s = 0;
      for (let i = -r; i <= r; i++) s += a[o + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) {
        t[o + x] = s * k;
        s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += t[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = s * k;
        s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const norm = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const KEY = norm(-0.55, -0.7, 0.62), FILL = norm(0.5, 0.8, 0.4), HV = norm(KEY[0], KEY[1], KEY[2] + 1);
const LL = norm(-1, -0.2, 0.5), LR = norm(1, -0.2, 0.5);

// Remasters one picture.
//   idx: Uint8Array w*h colour numbers into cols (0 = transparent); cols: [r, g, b] colours
//   opts.fx: an effect sprite (shot, explosion): smooth and boosted, no lighting
//   opts.rim: [r, g, b] rim light colour (the army's)
// Returns { c, pad, ... } where pad is the margin (in 1x px) added around the picture.
export function remaster(idx0, w0, h0, cols, opts = {}) {
  const fx = !!opts.fx, rim = opts.rim || [255, 120, 220], PAD = fx ? 1 : 2;
  const w = w0 + 2 * PAD, h = h0 + 2 * PAD, N1 = w * h;
  const idx = new Uint8Array(N1);
  for (let y = 0; y < h0; y++) idx.set(idx0.subarray(y * w0, y * w0 + w0), (y + PAD) * w + PAD);
  const mw = w * UP, mh = h * UP, M = mw * mh;
  // ---- 1x fields
  const R1 = new Float32Array(N1), G1 = new Float32Array(N1), B1 = new Float32Array(N1), A1 = new Float32Array(N1), L1 = new Float32Array(N1);
  const count = new Map();
  let opaque = 0;
  for (let i = 0; i < N1; i++) {
    const k = idx[i];
    if (!k) continue;
    const c = cols[k];
    R1[i] = c[0] / 255; G1[i] = c[1] / 255; B1[i] = c[2] / 255; A1[i] = 1;
    L1[i] = 0.3 * R1[i] + 0.55 * G1[i] + 0.15 * B1[i];
    count.set(k, (count.get(k) || 0) + 1); opaque++;
  }
  if (!opaque) return null;
  // emissive colours: hot and saturated (or near white and rare), and a small part of the picture
  // (counted by colour: the ROM often gives one colour several palette numbers)
  const byCol = new Map();
  for (const [k, cnt] of count) { const ck = cols[k].join(); byCol.set(ck, (byCol.get(ck) || 0) + cnt); }
  const emissive = new Set();
  for (const k of count.keys()) {
    const [r, g, b] = cols[k], mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, sat = mx ? (mx - mn) / mx : 0;
    if (byCol.get(cols[k].join()) / opaque < 0.06 && mx > 0.82 && (sat > 0.4 || mn > 0.85)) emissive.add(k);
  }
  const D1 = new Float32Array(N1);
  for (let i = 0; i < N1; i++) {
    if (!A1[i]) continue;
    const x = i % w, y = (i / w) | 0;
    D1[i] = !A1[i - 1] || !A1[i + 1] || !A1[i - w] || !A1[i + w] || x === 0 || y === 0 ? 1 : 9;
  }
  for (let it = 0; it < 4; it++) {
    for (let i = w; i < N1 - w; i++) {
      if (!A1[i]) continue;
      D1[i] = Math.min(D1[i], D1[i - 1] + 1, D1[i + 1] + 1, D1[i - w] + 1, D1[i + w] + 1);
    }
  }
  const Hs = new Float32Array(N1), PR = new Float32Array(N1), PG = new Float32Array(N1), PB = new Float32Array(N1);
  // a broad dome over the whole silhouette gives the body its rounded form; a bevel at the edges
  // and a little of the brightness give it plates and detail
  const dr = Math.max(2, Math.round(Math.min(w0, h0) / 5)), dome = blur(Float32Array.from(A1), w, h, dr, 2);
  let dmax = 0; for (let i = 0; i < N1; i++) if (A1[i]) dmax = Math.max(dmax, dome[i]);
  const damp = 0.75 * Math.max(1, dr / 4) / (dmax || 1);
  for (let i = 0; i < N1; i++) {
    if (!A1[i]) continue;
    Hs[i] = 0.6 * Math.min(D1[i], 3) / 3 + 0.14 * L1[i] + damp * dome[i];
    PR[i] = R1[i]; PG[i] = G1[i]; PB[i] = B1[i];
  }
  // ---- bilinear sampling at 4x
  const s4 = scale2x(scale2x(idx, w, h), w * 2, h * 2);
  const A = new Float32Array(M), Rc = new Float32Array(M), Gc = new Float32Array(M), Bc = new Float32Array(M);
  const Hh = new Float32Array(M), Dh = new Float32Array(M), Em = new Float32Array(M), Ol = new Float32Array(M);
  for (let Y = 0; Y < mh; Y++) {
    const v = (Y + 0.5) / UP - 0.5, y0 = Math.max(0, Math.min(h - 2, Math.floor(v))), fy = Math.min(1, Math.max(0, v - y0));
    for (let X = 0; X < mw; X++) {
      const u = (X + 0.5) / UP - 0.5, x0 = Math.max(0, Math.min(w - 2, Math.floor(u))), fxx = Math.min(1, Math.max(0, u - x0));
      const i00 = y0 * w + x0, i10 = i00 + 1, i01 = i00 + w, i11 = i01 + 1;
      const w00 = (1 - fxx) * (1 - fy), w10 = fxx * (1 - fy), w01 = (1 - fxx) * fy, w11 = fxx * fy;
      const a = A1[i00] * w00 + A1[i10] * w10 + A1[i01] * w01 + A1[i11] * w11, i = Y * mw + X;
      Ol[i] = a;   // the outline is drawn where this is above zero but the body isn't
      const al = fx ? smooth(0.12, 0.6, a) : smooth(0.34, 0.6, a);
      A[i] = al;
      if (!al) continue;
      const k = s4[i];
      const br = (PR[i00] * w00 + PR[i10] * w10 + PR[i01] * w01 + PR[i11] * w11) / a;
      const bg = (PG[i00] * w00 + PG[i10] * w10 + PG[i01] * w01 + PG[i11] * w11) / a;
      const bb = (PB[i00] * w00 + PB[i10] * w10 + PB[i01] * w01 + PB[i11] * w11) / a;
      if (k) {
        const c = cols[k];
        Rc[i] = 0.6 * c[0] / 255 + 0.4 * br; Gc[i] = 0.6 * c[1] / 255 + 0.4 * bg; Bc[i] = 0.6 * c[2] / 255 + 0.4 * bb;
        if (emissive.has(k)) Em[i] = 1;
      } else { Rc[i] = br; Gc[i] = bg; Bc[i] = bb; }
      Hh[i] = (Hs[i00] * w00 + Hs[i10] * w10 + Hs[i01] * w01 + Hs[i11] * w11) / a;
      Dh[i] = (D1[i00] * w00 + D1[i10] * w10 + D1[i01] * w01 + D1[i11] * w11) / a;
    }
  }
  const c = canvasOf(mw, mh), g = c.getContext('2d'), img = g.createImageData(mw, mh), d = img.data;
  if (fx) {
    let er = 0, eg = 0, eb = 0, en = 0;
    for (let i = 0; i < M; i++) {
      if (!A[i]) continue;
      const o = i * 4;
      d[o] = Math.min(255, Rc[i] * 290); d[o + 1] = Math.min(255, Gc[i] * 290); d[o + 2] = Math.min(255, Bc[i] * 290); d[o + 3] = A[i] * 255;
      if (Math.max(Rc[i], Gc[i], Bc[i]) > 0.55) { er += Rc[i]; eg += Gc[i]; eb += Bc[i]; en++; }
    }
    g.putImageData(img, 0, 0);
    return { c, pad: PAD, fx: true, glow: en ? [er / en * 255, eg / en * 255, eb / en * 255] : [255, 220, 160] };
  }
  // ---- lighting
  blur(Hh, mw, mh, 2, 2);
  const Hb = blur(Float32Array.from(Hh), mw, mh, 7, 2);
  const STR = 10;
  const litL = new Float32Array(M), litR = new Float32Array(M), glowPx = new Uint8ClampedArray(M * 4);
  let er = 0, eg = 0, eb = 0, en = 0;
  for (let Y = 0; Y < mh; Y++) {
    for (let X = 0; X < mw; X++) {
      const i = Y * mw + X, o = i * 4;
      if (!A[i]) {
        // outline: a soft dark band just outside the silhouette
        const ol = Ol[i];
        if (ol > 0.04) { d[o] = 8; d[o + 1] = 6; d[o + 2] = 18; d[o + 3] = smooth(0.04, 0.3, ol) * 235; }
        continue;
      }
      const hx = Hh[i + (X < mw - 1 ? 1 : 0)] - Hh[i - (X > 0 ? 1 : 0)];
      const hy = Hh[i + (Y < mh - 1 ? mw : 0)] - Hh[i - (Y > 0 ? mw : 0)];
      const [nx, ny, nz] = norm(-hx * STR, -hy * STR, 1);
      const ao = Math.max(0.45, Math.min(1, 1 - (Hb[i] - Hh[i]) * 2.6));
      const ndl = nx * KEY[0] + ny * KEY[1] + nz * KEY[2], dk = Math.max(0, ndl);
      const df = Math.max(0, nx * FILL[0] + ny * FILL[1] + nz * FILL[2]);
      // albedo a little richer than the ROM's
      let r = Rc[i], gg = Gc[i], b = Bc[i];
      const lum = 0.3 * r + 0.55 * gg + 0.15 * b;
      r = Math.max(0, lum + (r - lum) * 1.18); gg = Math.max(0, lum + (gg - lum) * 1.18); b = Math.max(0, lum + (b - lum) * 1.18);
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
      const metal = 0.3 + 0.7 * (1 - sat) * smooth(0.2, 0.75, lum);
      const sp = (Math.pow(Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]), 22) * 1.3 + Math.pow(Math.max(0, ndl), 60) * 0.5) * metal;
      const graze = Math.pow(Math.max(0, 1 - nz), 1.3), away = Math.max(0, -(nx * KEY[0] + ny * KEY[1]) / Math.max(1e-3, Math.hypot(nx, ny)));
      const rimK = graze * (0.15 + 0.85 * away) * 2.2 * smooth(0.2, 1.2, Dh[i]);
      // gentle toon banding on the key light gives the painted, illustrated look
      const band = dk < 0.18 ? dk * 0.6 : 0.11 + (dk - 0.18) * 1.08;
      const amb = 0.26 * ao, key = 1.12 * band * (0.6 + 0.4 * ao);
      let R = r * (amb + key) + 0.1 * df * ao + sp + rimK * rim[0] / 255 * 0.55;
      let G = gg * (amb + key) + 0.14 * df * ao + sp + rimK * rim[1] / 255 * 0.55;
      let B = b * (amb + key) + 0.28 * df * ao + sp * 1.05 + rimK * rim[2] / 255 * 0.55;
      const ink = 0.55 + 0.45 * smooth(0.3, 0.95, Dh[i]);
      R *= ink; G *= ink; B *= ink;
      const e = Em[i];
      if (e) {
        R = Rc[i] * 1.2; G = Gc[i] * 1.2; B = Bc[i] * 1.2;
        glowPx[o] = Rc[i] * 255; glowPx[o + 1] = Gc[i] * 255; glowPx[o + 2] = Bc[i] * 255; glowPx[o + 3] = 255 * A[i];
        er += Rc[i]; eg += Gc[i]; eb += Bc[i]; en++;
      }
      d[o] = Math.min(255, R * 255); d[o + 1] = Math.min(255, G * 255); d[o + 2] = Math.min(255, B * 255); d[o + 3] = A[i] * 255;
      litL[i] = A[i] * Math.max(0, nx * LL[0] + ny * LL[1] + nz * LL[2]) * (0.55 + 0.45 * lum);
      litR[i] = A[i] * Math.max(0, nx * LR[0] + ny * LR[1] + nz * LR[2]) * (0.55 + 0.45 * lum);
    }
  }
  g.putImageData(img, 0, 0);
  // light-response layers at half resolution, warm white
  const hw = mw >> 1, hh = mh >> 1;
  const layer = (F) => {
    const q = canvasOf(hw, hh), qg = q.getContext('2d'), qi = qg.createImageData(hw, hh), qd = qi.data;
    for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
      const j = 2 * y * mw + 2 * x, s = (F[j] + F[j + 1] + F[j + mw] + F[j + mw + 1]) / 4, o = (y * hw + x) * 4;
      qd[o] = 255; qd[o + 1] = 214; qd[o + 2] = 170; qd[o + 3] = Math.min(255, s * 255);
    }
    qg.putImageData(qi, 0, 0);
    return q;
  };
  let glowC = null;
  if (en) {
    const raw = canvasOf(mw, mh), rg = raw.getContext('2d'), ri = rg.createImageData(mw, mh);
    ri.data.set(glowPx); rg.putImageData(ri, 0, 0);
    const gp = 6, gc = canvasOf(mw + gp * 2 * UP, mh + gp * 2 * UP), gx = gc.getContext('2d');
    gx.filter = `blur(${UP * 2}px)`; gx.drawImage(raw, gp * UP, gp * UP); gx.drawImage(raw, gp * UP, gp * UP); gx.filter = 'none';
    gx.globalCompositeOperation = 'lighter'; gx.globalAlpha = 0.6; gx.drawImage(raw, gp * UP, gp * UP);
    glowC = { c: gc, pad: PAD + gp };
  }
  const sw = Math.max(4, w >> 1), sh = Math.max(4, h >> 1), sc = canvasOf(sw, sh), sg = sc.getContext('2d');
  sg.drawImage(c, 0, 0, sw, sh); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(0,0,12,0.62)'; sg.fillRect(0, 0, sw, sh);
  return {
    c, pad: PAD, fx: false, shadow: sc, glowC, litL: layer(litL), litR: layer(litR),
    glow: en ? [er / en * 255, eg / en * 255, eb / en * 255] : [255, 200, 150],
  };
}

// Content-keyed cache shared by every fight: the same machine in the next fight is free.
const CACHE = new Map();
export function remastered(idx, w, h, cols, opts = {}) {
  let hsh = 2166136261 ^ (w * 977 + h);
  for (let i = 0; i < idx.length; i++) hsh = Math.imul(hsh ^ idx[i], 16777619);
  const used = new Set(idx);
  for (const k of used) if (k) hsh = Math.imul(hsh ^ ((cols[k][0] << 16) | (cols[k][1] << 8) | cols[k][2]) ^ (k << 24), 16777619);
  const key = `${hsh >>> 0}:${opts.fx ? 1 : 0}:${(opts.rim || []).join()}`;
  let e = CACHE.get(key);
  if (e === undefined) {
    e = remaster(idx, w, h, cols, opts);
    if (CACHE.size > 1200) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(key, e);
  }
  return e;
}
