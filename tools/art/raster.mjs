// A small shape rasterizer for the expansion's own pixel art (tools/art/*.mjs): parts are shapes
// in a local frame, drawn in order; each pixel of a part is shaded from a bevelled height field
// lit from the top left and quantized onto the part's colour ramp (darkest first), then the
// silhouette and part edges get a dark outline, in the hand-shaded style of the ROM's art.
// The output is an indexed image; nothing here reads the ROM.

export const poly = (pts) => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
export const ellipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
export const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
export const capsule = (x0, y0, x1, y1, r) => (x, y) => {
  const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  return (x - x0 - t * dx) ** 2 + (y - y0 - t * dy) ** 2 <= r * r;
};
export const union = (...s) => (x, y) => s.some((f) => f(x, y));
export const minus = (a, b) => (x, y) => a(x, y) && !b(x, y);

// render(w, h, parts, { toLocal, light, outline, bg })
//   part: { shape(x, y) in local coords, ramp: [index...], bevel: px, dome: 0..1, flat: index (no shading),
//           bias: brightness offset, edge: outline index for this part's border (default: ramp[0]) }
export function render(w, h, parts, opt = {}) {
  const toLocal = opt.toLocal || ((x, y) => [x, y]), SS = 4;
  const L = norm(opt.light || [-0.55, -0.7, 0.65]), Hv = norm([L[0], L[1], L[2] + 1]), G = opt.grad || [0.5, 0.5];
  const owner = new Int16Array(w * h).fill(-1);
  const masks = parts.map((p) => {
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) { const [u, v] = toLocal(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS); if (p.shape(u, v)) n++; }
      if (n * 2 >= SS * SS) m[y * w + x] = 1;
    }
    return m;
  });
  masks.forEach((m, k) => { for (let i = 0; i < m.length; i++) if (m[i]) owner[i] = k; });
  const out = new Uint8Array(w * h).fill(opt.bg ?? 0);
  parts.forEach((p, k) => {
    const m = masks[k], d = dist(m, w, h), R = p.bevel ?? 4;
    const H = new Float32Array(w * h);
    for (let i = 0; i < H.length; i++) if (m[i]) { const t = Math.min(d[i], R) / R; H[i] = R * (p.dome ? Math.sqrt(1 - (1 - t) ** 2) : t) * (p.height ?? 1); }
    smooth(H, m, w, h, 2);
    // light every pixel, then spread the part's light range (2nd-98th percentile) over its whole
    // ramp, so each part runs from its darkest shade to its lightest like hand-shaded pixel art
    const lit = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (owner[i] !== k) continue;
      if (p.flat !== undefined) { out[i] = p.flat; continue; }
      const hx = (H[i + (x < w - 1 ? 1 : 0)] - H[i - (x > 0 ? 1 : 0)]) / 2, hy = (H[i + (y < h - 1 ? w : 0)] - H[i - (y > 0 ? w : 0)]) / 2;
      const n = norm([-hx, -hy, 1]), spec = Math.max(0, n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]) ** 24 * (p.spec ?? 0.5);
      // diffuse light, a highlight, and a fall-off across the whole picture away from the light
      lit.set(i, Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) + spec - G[0] * (x / w - 0.5) - G[1] * (y / h - 0.5));
    }
    if (!lit.size) return;
    const v = [...lit.values()].sort((a, b) => a - b), lo = v[Math.floor(v.length * 0.02)], hi = v[Math.floor(v.length * 0.98)], r = p.ramp;
    for (const [i, l] of lit) {
      const t = (hi > lo ? (l - lo) / (hi - lo) : 0.6) + (p.bias || 0);
      out[i] = r[Math.max(0, Math.min(r.length - 1, Math.floor(t * r.length)))];
    }
  });
  // outlines: the silhouette, and a part's border where it sits over another part
  const edge = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = owner[i];
    if (k < 0) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy, o = X < 0 || Y < 0 || X >= w || Y >= h ? -1 : owner[Y * w + X];
      if (o === -1 && !opt.openEdges) { edge[i] = 1; break; }
      if (o >= 0 && o < k && parts[k].line !== false) { edge[i] = 2; break; }
    }
  }
  for (let i = 0; i < edge.length; i++) {
    if (!edge[i]) continue;
    const p = parts[owner[i]];
    out[i] = edge[i] === 1 ? (opt.outline ?? p.ramp?.[0] ?? out[i]) : (p.edge ?? p.ramp?.[0] ?? out[i]);
  }
  return { w, h, px: out };
}

// box-blur a height field inside its mask (`passes` times), to round off the chamfer's facets
function smooth(H, m, w, h, passes) {
  const t = new Float32Array(H.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!m[i]) { t[i] = 0; continue; }
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        s += H[Y * w + X]; n++;
      }
      t[i] = s / n;
    }
    H.set(t);
  }
}

function norm(v) { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); }
// city-block distance to the outside of the mask (chamfer, two passes)
function dist(m, w, h) {
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? 1e9 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; d[i] = Math.min(d[i], (x ? d[i - 1] : 0) + 1, (y ? d[i - w] : 0) + 1); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; d[i] = Math.min(d[i], (x < w - 1 ? d[i + 1] : 0) + 1, (y < h - 1 ? d[i + w] : 0) + 1); }
  return d;
}

// rows of base-36 digits, for committing an indexed image as text
export const encode = (img) => Array.from({ length: img.h }, (_, y) => Array.from(img.px.subarray(y * img.w, (y + 1) * img.w), (v) => v.toString(36)).join(''));
