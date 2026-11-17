#!/usr/bin/env python3
"""accept.py RAWDIR name[:stem][=note] ... : copy checked models into art/farm/models and update manifest.json.

Reads RAWDIR/<stem>.glb (stem defaults to name; e.g. `sato:sato_n41`), verifies it is a plain glTF 2.0 binary (no extensions, one JPEG/PNG texture,
on the ground, centred, longest side 1), then writes art/farm/models/<name>.glb and the manifest entry.
`accept.py RAWDIR -name` removes a model from the folder and the manifest.
"""
import json, os, struct, sys, shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
DEST = os.path.join(ROOT, 'art', 'farm', 'models')
MAN = os.path.join(DEST, 'manifest.json')
PROMPTS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prompts.json')))


def inspect(path):
    b = open(path, 'rb').read()
    magic, ver, total = struct.unpack('<4sII', b[:12])
    assert magic == b'glTF' and ver == 2 and total == len(b), 'not a GLB v2'
    n, kind = struct.unpack('<I4s', b[12:20])
    assert kind == b'JSON'
    g = json.loads(b[20:20 + n])
    assert not g.get('extensionsUsed') and not g.get('extensionsRequired'), 'uses extensions'
    imgs = g.get('images', [])
    assert len(imgs) == 1 and imgs[0].get('mimeType') in ('image/jpeg', 'image/png'), 'want one JPEG/PNG texture: %r' % imgs
    tris = 0; lo = [1e9] * 3; hi = [-1e9] * 3
    for m in g['meshes']:
        for p in m['primitives']:
            tris += g['accessors'][p['indices']]['count'] // 3
            a = g['accessors'][p['attributes']['POSITION']]
            lo = [min(x, y) for x, y in zip(lo, a['min'])]; hi = [max(x, y) for x, y in zip(hi, a['max'])]
            assert 'TEXCOORD_0' in p['attributes'] and 'NORMAL' in p['attributes']
    size = [round(h - l, 4) for l, h in zip(lo, hi)]
    assert abs(lo[1]) < 1e-3 and abs(lo[0] + hi[0]) < 1e-3 and abs(lo[2] + hi[2]) < 1e-3, 'not grounded/centred'
    assert abs(max(size) - 1) < 1e-3 or abs(size[1] - 1) < 1e-3, 'neither longest side nor height is 1'
    return tris, size, len(b)


def main():
    raw, *specs = sys.argv[1:]
    man = json.load(open(MAN)) if os.path.exists(MAN) else {}
    for s in specs:
        if s.startswith('-'):
            man.pop(s[1:], None)
            if os.path.exists(os.path.join(DEST, s[1:] + '.glb')): os.remove(os.path.join(DEST, s[1:] + '.glb'))
            continue
        name, _, note = s.partition('=')
        name, _, stem = name.partition(':')
        src = os.path.join(raw, (stem or name) + '.glb')
        tris, size, nbytes = inspect(src)
        shutil.copyfile(src, os.path.join(DEST, name + '.glb'))
        man[name] = {'file': name + '.glb', 'tris': tris, 'size': size, 'note': note}
        if 'h' in PROMPTS.get(name, {}).get('opts', '').replace('t512', ''): man[name]['unit'] = 'height'   # height = 1, not longest side
        print('%-12s %6d tris  %7.0f KB  size %s' % (name, tris, nbytes / 1024, size))
    json.dump(man, open(MAN, 'w'), indent=1)
    tot = sum(os.path.getsize(os.path.join(DEST, v['file'])) for v in man.values() if os.path.exists(os.path.join(DEST, v['file'])))
    print('%d models, %.1f MB' % (len(man), tot / 1e6))


if __name__ == '__main__':
    main()
