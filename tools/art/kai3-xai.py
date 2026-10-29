# The Fenrir Kai's (type 71) and the Asura-II Kai's (type 72) pictures, fight hulls and board
# tokens from their generated sources in tools/art/kai3/ (<unit>-picture-src.jpg, a three-quarter
# view, and <unit>-top-src.jpg, the same ship from directly above with the bow to the right, plus
# asura-broadside-src.jpg, the Asura-II Kai from above with the bow up and every turret swung to
# starboard; made with tools/art/xai-gen.py from the prompts beside them, the pictures generated
# with the Lobster Kai's as the style reference and the views with each unit's picture). Owner's
# redesign (2026-10-29): the Fenrir Kai a teal hit-and-run gunboat with one oversized spine
# railgun, the Asura-II Kai a navy-and-gold battleship of three giant triple turrets. Writes tools/art/kai3/<unit>-art.json, which tools/art/kai3-xai.mjs turns into
# js/art/kai3.js with the map icons.
#   python3 tools/art/kai3-xai.py && node tools/art/kai3-xai.mjs
# The helpers (silhouette, warp, the 3x full-colour hull shrunk to the ships' fight rows) are
# tools/art/ships-xai.py's. The hulls stand where their looks' recorded hulls stand, so the
# recorded shots leave from the guns (box coordinates of the base hull, js/game/fightdata.js):
#   Fenrir Kai `hull` (64x64, the Fenrir's top-down hull, bow right): the spine railgun's muzzle at
#     the box's right edge on y 29.5 (the Fenrir's shots leave x 62-70, y 19-39);
#   Asura-II Kai `hull` (64x128, the Asura-II's hull against craft, bow up): the broadside view,
#     its starboard gun muzzles out at x 63, the hull down to the bottom (shots leave x 63, y 68-116);
#   Asura-II Kai `hull2` (96x128, its top-down hull against ships, slot 1): the rail battery's
#     muzzles at x 95 on y 61 (shots leave x 92-108, y 45-77).
import importlib.util, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('ships_xai', os.path.join(HERE, 'ships-xai.py'))
X = importlib.util.module_from_spec(spec); spec.loader.exec_module(X)
X.BACK = '#6b6b9c'   # the Kai series' picture backdrop (js/art/kai.js)
DIR = os.path.join(HERE, 'kai3')

def load(name):
    im = Image.open(os.path.join(DIR, name)).convert('RGB')
    return im, X.silhouette(im)

def picture(unit):
    import subprocess, sys
    out = os.path.join(DIR, f'{unit}-picture.json')
    subprocess.run([sys.executable, os.path.join(HERE, 'kai-convert.py'), os.path.join(DIR, f'{unit}-picture-src.jpg'), out, '96', '32', X.BACK], check=True)
    os.remove(out.replace('.json', '.png'))
    art = json.load(open(out)); os.remove(out)
    return art

def muzzle_row(fg, frac=0.03):
    """The row the bow's furthest-forward pixels sit on (the gun's muzzle), weighted."""
    x0, y0, x1, y1 = X.bbox(fg)
    reach = np.array([np.where(r)[0].max() if r.any() else -1 for r in fg])
    rows = np.where(reach >= reach.max() - (x1 - x0) * frac)[0]
    return rows.mean()

def bow_right(im, fg, W, H, bow_x, row_y, stern_x=1):
    """The top view (bow right) scaled evenly so its stern sits at stern_x and its bow at bow_x,
    with the muzzle row on row_y; W x H box at 3x."""
    x0, y0, x1, y1 = X.bbox(fg); my = muzzle_row(fg)
    s = (bow_x - stern_x) * 3 / (x1 - x0)
    top = row_y * 3 - (my - y0) * s
    return X.warp(im, fg, (x0, y0, x1, y1), (stern_x * 3, top, bow_x * 3, top + (y1 - y0) * s), W * 3, H * 3)

def fenrir():
    im, fg = load('fenrir-top-src.jpg')
    P, C = bow_right(im, fg, 64, 64, 63.4, 29.5)
    idx3, pal = X.full(P, C)
    hull = X.classic(idx3, pal, 64, 64)
    tok_art, tok = X.token(im, fg, 32, 16)
    return {'art': picture('fenrir'), 'hull': {'w': 64, 'h': 64, 'rows': X.rows36(hull)},
            'hullArt': {'w': 192, 'h': 192, 'palette': pal, 'rows': X.rows36(idx3)}, 'token': tok}

def asura():
    im, fg = load('asura-top-src.jpg')
    # hull2 (against ships, bow right): the rail battery's muzzles at x 95 on y 61
    P, C = bow_right(im, fg, 96, 128, 95.4, 61)
    idx3_2, pal2 = X.full(P, C)
    hull2 = X.classic(idx3_2, pal2, 96, 128)
    # hull (against craft, bow up): the broadside view (every turret swung to starboard), from the
    # port wing at x 1 to the gun muzzles at the right edge x 63, where the recorded broadside
    # shots leave; its length (in proportion, at most the box from y 17) ends at the bottom
    bim, bfg = load('asura-broadside-src.jpg')
    bx0, by0, bx1, by1 = X.bbox(bfg)
    w = 186; h = min(381 - 51, (by1 - by0) * w / (bx1 - bx0))
    P, C = X.warp(bim, bfg, (bx0, by0, bx1, by1), (3, 381 - h, 189, 381), 192, 384)
    idx3, pal = X.full(P, C)
    hull = X.classic(idx3, pal, 64, 128)
    tok_art, tok = X.token(im, fg, 36, 24)
    return {'art': picture('asura'), 'hull': {'w': 64, 'h': 128, 'rows': X.rows36(hull)}, 'hull2': {'w': 96, 'h': 128, 'rows': X.rows36(hull2)},
            'hullArt': {'w': 192, 'h': 384, 'palette': pal, 'rows': X.rows36(idx3)}, 'hull2Art': {'w': 288, 'h': 384, 'palette': pal2, 'rows': X.rows36(idx3_2)},
            'token': tok}

if __name__ == '__main__':
    for unit, fn in (('fenrir', fenrir), ('asura', asura)):
        json.dump(fn(), open(os.path.join(DIR, f'{unit}-art.json'), 'w'))
        print('wrote', f'tools/art/kai3/{unit}-art.json')
