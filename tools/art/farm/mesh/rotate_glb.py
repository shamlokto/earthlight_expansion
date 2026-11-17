#!/usr/bin/env python3
"""rotate_glb.py IN.glb OUT.glb : turn a model a quarter turn about Y ((x, z) -> (z, -x)), in place in the buffers.

For models that came out with their length along Z when the game wants it along X. Pure Python + numpy;
positions, normals and the accessor min/max are rewritten, everything else is untouched.
"""
import json, struct, sys
import numpy as np
src, dst = sys.argv[1:3]
b = open(src, 'rb').read()
n = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + n])
bin0 = 20 + n + 8; blob = bytearray(b[bin0:])
done = set()
for m in g['meshes']:
    for p in m['primitives']:
        for key in ('POSITION', 'NORMAL'):
            i = p['attributes'].get(key)
            if i is None or i in done: continue
            done.add(i); a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
            assert a['componentType'] == 5126 and a['type'] == 'VEC3' and not bv.get('byteStride')
            off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
            v = np.frombuffer(blob, np.float32, a['count'] * 3, off).reshape(-1, 3).copy()
            v[:, 0], v[:, 2] = v[:, 2].copy(), -v[:, 0].copy()
            blob[off:off + v.nbytes] = v.tobytes()
            if key == 'POSITION': a['min'], a['max'] = v.min(0).tolist(), v.max(0).tolist()
js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
out = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(blob), b'BIN\0') + bytes(blob)
open(dst, 'wb').write(out)
