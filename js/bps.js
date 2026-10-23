// BPS ("beat") patch applier, used to build the English ROM in memory from the
// user's own Japanese ROM plus Nezz's English translation patch.

function crc32(bytes) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = (crc ^ bytes[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function applyBps(patchBuf, sourceBuf) {
  const p = new Uint8Array(patchBuf), src = new Uint8Array(sourceBuf);
  if (String.fromCharCode(p[0], p[1], p[2], p[3]) !== 'BPS1') throw new Error('Not a BPS patch');
  let i = 4;
  const num = () => {
    let v = 0, s = 1;
    for (;;) {
      const x = p[i++];
      v += (x & 0x7f) * s;
      if (x & 0x80) return v;
      s *= 128; v += s;
    }
  };
  const srcSize = num(), dstSize = num(), metaSize = num();
  i += metaSize;
  if (src.length !== srcSize) throw new Error(`Patch expects a ${srcSize}-byte ROM, got ${src.length}`);
  const dv = new DataView(p.buffer, p.byteOffset + p.length - 12, 12);
  if (crc32(src) !== dv.getUint32(0, true)) throw new Error('This patch is for a different ROM (source CRC mismatch)');
  const out = new Uint8Array(dstSize);
  let o = 0, so = 0, to = 0;
  const end = p.length - 12;
  while (i < end) {
    const d = num(), n = Math.floor(d / 4) + 1, action = d & 3;
    if (action === 0) { out.set(src.subarray(o, o + n), o); o += n; }
    else if (action === 1) { out.set(p.subarray(i, i + n), o); i += n; o += n; }
    else {
      const raw = num(), off = (raw & 1 ? -1 : 1) * Math.floor(raw / 2);
      if (action === 2) { so += off; for (let k = 0; k < n; k++) out[o++] = src[so++]; }
      else { to += off; for (let k = 0; k < n; k++) out[o++] = out[to++]; }
    }
  }
  if (crc32(out) !== dv.getUint32(4, true)) throw new Error('Patched ROM failed its checksum');
  return out.buffer;
}
