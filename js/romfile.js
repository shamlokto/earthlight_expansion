// Read a ROM from a user-supplied File: plain .sfc/.smc, or the first .sfc/.smc
// inside a .zip (stored or deflated), using the browser's DecompressionStream.

export async function readRomFile(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return unzipFirst(buf, /\.(sfc|smc|fig|swc)$/i);
  return buf.buffer;
}

// A .bps patch, or the first .bps inside a .zip.
export async function readPatchFile(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return unzipFirst(buf, /\.bps$/i);
  return buf.buffer;
}

async function unzipFirst(buf, pattern) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Use the central directory: local headers may defer sizes to a data descriptor.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid zip file');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!pattern.test(name)) continue;
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const data = buf.subarray(start, start + csize);
    if (method === 0) return data.slice().buffer;
    if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).arrayBuffer();
    }
    throw new Error(`Unsupported zip compression method ${method}`);
  }
  throw new Error(`No matching file (${pattern.source}) found in the zip`);
}
