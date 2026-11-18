#!/usr/bin/env python3
"""drop_floor.py IN.glb OUT.glb [EPS] : delete triangles lying flat on the ground (all three corners below EPS,
default 0.006 units) -- removes a baked "shadow sheet" under a model. Then re-grounds, re-centres and
re-normalises like gen3d.py (longest side 1). Index buffer is rewritten in place (unused vertices stay)."""
import json, struct, sys
import numpy as np
src, dst = sys.argv[1:3]; eps = float(sys.argv[3]) if len(sys.argv) > 3 else 0.006
b = open(src, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + n])
blob = bytearray(b[20 + n + 8:])
p = g['meshes'][0]['primitives'][0]
def view(i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]; off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
    k = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[a['type']]
    return a, off, np.frombuffer(blob, dt, a['count'] * k, off).reshape(-1, k).copy()
pa, poff, pos = view(p['attributes']['POSITION']); ia, ioff, idx = view(p['indices'])
tri = idx.reshape(-1, 3); keep = ~(pos[tri][:, :, 1] < eps).all(1)
used = np.unique(tri[keep]); lo, hi = pos[used].min(0), pos[used].max(0)
pos[:, 0] -= (lo[0] + hi[0]) / 2; pos[:, 2] -= (lo[2] + hi[2]) / 2; pos[:, 1] -= lo[1]; pos /= (hi - lo).max()
newi = tri[keep].reshape(-1).astype(idx.dtype)
blob[ioff:ioff + newi.nbytes] = newi.tobytes(); ia['count'] = int(newi.size)
blob[poff:poff + pos.nbytes] = pos.astype(np.float32).tobytes()
pa['min'], pa['max'] = pos[used].min(0).tolist(), pos[used].max(0).tolist()
js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
open(dst, 'wb').write(struct.pack('<4sII', b'glTF', 2, 28 + len(js) + len(blob)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(blob), b'BIN\0') + bytes(blob))
print('dropped', int((~keep).sum()), 'of', len(tri), 'triangles')
