# The Hephaestus's (repair ship, expansion type 79) picture, fight hulls and board tokens from its
# generated sources (tools/art/hephaestus/: picture-src.jpg, a three-quarter view, and top-src.jpg,
# the same ship from directly above with the bow to the right; made with tools/art/xai-gen.py from
# the prompts beside them, the Azoras Kai's picture as the style reference). Writes
# hephaestus/hephaestus-art.json, which tools/art/hephaestus-xai.mjs turns into js/art/hephaestus.js.
#   python3 tools/art/hephaestus-xai.py && node tools/art/hephaestus-xai.mjs
# It borrows the Tiamat's fight layout as the Azoras does (`hull` 64x128 bow up against craft,
# `hull2` 96x128 bow right against ships). It has no weapons, so no muzzle has to line up: the
# ship keeps its proportions and is centred in each box.
import json, os, sys
from importlib import import_module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
S = import_module('ships-xai')

UNIT = 'hephaestus'

def fit(im, fg, W, H, pad=3):
    x0, y0, x1, y1 = S.bbox(fg); s = min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0))
    w, h = (x1 - x0) * s, (y1 - y0) * s; X, Y = (W - w) / 2, (H - h) / 2
    return S.warp(im, fg, (x0, y0, x1, y1), (X, Y, X + w, Y + h), W, H)

def hephaestus():
    im, fg = S.load(UNIT, 'top-src.jpg')
    P, C = fit(im, fg, 288, 384)                      # bow right, against ships
    idx3_2, pal2 = S.full(P, C)
    hull2 = S.classic(idx3_2, pal2, 96, 128)
    rim = im.rotate(90, expand=True); rfg = S.silhouette(rim)
    P, C = fit(rim, rfg, 192, 384)                    # bow up, against craft
    idx3, pal = S.full(P, C)
    hull = S.classic(idx3, pal, 64, 128)
    tok_art, tok = S.token(im, fg, 36, 24)
    r36 = S.rows36
    return {'art': S.picture(UNIT), 'hull': {'w': 64, 'h': 128, 'rows': r36(hull)}, 'hull2': {'w': 96, 'h': 128, 'rows': r36(hull2)},
            'hullArt': {'w': 192, 'h': 384, 'palette': pal, 'rows': r36(idx3)}, 'hull2Art': {'w': 288, 'h': 384, 'palette': pal2, 'rows': r36(idx3_2)},
            'token': tok, 'tokenArt': tok_art}

if __name__ == '__main__':
    json.dump(hephaestus(), open(os.path.join(S.HERE, UNIT, f'{UNIT}-art.json'), 'w'))
    print('wrote', f'tools/art/{UNIT}/{UNIT}-art.json')
