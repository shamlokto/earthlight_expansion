# Render a captured SNES PPU state (modes 0/1, 8x8 tiles, sprites) to PNG.
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from snes import png, bgr555

BPP = {0: (2, 2, 2, 2), 1: (4, 4, 2, 0), 2: (4, 4, 0, 0), 3: (8, 4, 0, 0), 4: (8, 2, 0, 0)}


def pal(s):
    return [bgr555(s.cgram[i * 2] | (s.cgram[i * 2 + 1] << 8)) for i in range(256)]


def tile_px(vram, base, bpp, n, x, y):
    o = (base + n * 8 * bpp) & 0xFFFF
    v = 0
    for p in range(0, bpp, 2):
        lo = vram[(o + p * 8 + y * 2) & 0xFFFF]; hi = vram[(o + p * 8 + y * 2 + 1) & 0xFFFF]
        sh = 7 - x
        v |= (((lo >> sh) & 1) | (((hi >> sh) & 1) << 1)) << p
    return v


def layer(s, bg, W=256, H=224):
    r = s.ppureg; mode = r[0x05] & 7
    bpp = BPP.get(mode, (4, 4, 2, 0))[bg]
    if not bpp: return None
    sc = r[0x07 + bg]; mapbase = (sc & 0xFC) << 9
    big = (r[0x05] >> (4 + bg)) & 1
    nba = r[0x0B + bg // 2]; charbase = ((nba >> (4 * (bg & 1))) & 0xF) << 13
    sx = s.scroll[bg][0] if hasattr(s, 'scroll') else 0
    sy = s.scroll[bg][1] if hasattr(s, 'scroll') else 0
    out = [[None] * W for _ in range(H)]
    for py in range(H):
        yy = (py + sy) & 0x3FF
        for px in range(W):
            xx = (px + sx) & 0x3FF
            tx, ty = (xx >> 3) & 63, (yy >> 3) & 63
            m = mapbase + ((ty & 31) * 32 + (tx & 31)) * 2
            if (sc & 1) and tx >= 32: m += 0x800
            if (sc & 2) and ty >= 32: m += 0x800 * (2 if sc & 1 else 1)
            e = s.vram[m & 0xFFFF] | (s.vram[(m + 1) & 0xFFFF] << 8)
            n = e & 0x3FF; pl = (e >> 10) & 7
            fx, fy = (xx & 7), (yy & 7)
            if e & 0x4000: fx = 7 - fx
            if e & 0x8000: fy = 7 - fy
            c = tile_px(s.vram, charbase, bpp, n, fx, fy)
            if c:
                idx = c if bpp == 8 else (pl * (1 << bpp) + c) if mode != 0 else (bg * 32 + pl * 4 + c)
                out[py][px] = (idx, (e >> 13) & 1)
    return out


def screen(s, path, layers=(0, 1, 2, 3), sprites=True):
    P = pal(s); W, H = 256, 224
    img = bytearray(W * H * 3)
    for i in range(W * H): img[i * 3:i * 3 + 3] = bytes(P[0])
    tm = s.ppureg[0x2C] | s.ppureg[0x2D]
    for bg in reversed(layers):
        if not (tm >> bg) & 1: continue
        L = layer(s, bg)
        if not L: continue
        for y in range(H):
            for x in range(W):
                if L[y][x]:
                    img[(y * W + x) * 3:(y * W + x) * 3 + 3] = bytes(P[L[y][x][0]])
    if sprites and tm & 0x10:
        obsel = s.ppureg[0x01]; base = (obsel & 7) << 14; gap = (((obsel >> 3) & 3) + 1) << 13  # second name table: base + (N+1)*8KB
        sizes = [(8, 16), (8, 32), (8, 64), (16, 32), (16, 64), (32, 64), (16, 32), (16, 32)][obsel >> 5]
        for i in reversed(range(128)):
            o = s.oam[i * 4:i * 4 + 4]; hi = (s.oam[512 + i // 4] >> ((i & 3) * 2)) & 3
            x = o[0] | ((hi & 1) << 8); y = o[1]; n = o[2] | ((o[3] & 1) << 8)
            pl = (o[3] >> 1) & 7; sz = sizes[(hi >> 1) & 1]
            if x >= 256: x -= 512
            for ty in range(sz):
                for tx in range(sz):
                    ux = sz - 1 - tx if o[3] & 0x40 else tx
                    uy = sz - 1 - ty if o[3] & 0x80 else ty
                    t = n + (uy >> 3) * 16 + (ux >> 3)
                    tb = base + (gap if t & 0x100 else 0)
                    c = tile_px(s.vram, tb, 4, ((t & 0xF) | (t & 0xF0)) & 0xFF, ux & 7, uy & 7)
                    X_, Y_ = x + tx, (y + ty) & 255
                    if c and 0 <= X_ < W and Y_ < H:
                        img[(Y_ * W + X_) * 3:(Y_ * W + X_) * 3 + 3] = bytes(P[128 + pl * 16 + c])
    png(path, W, H, img)


def vram_sheet(s, path, bpp=4, palette=0):
    P = pal(s); cols = 32; tb = 8 * bpp; n = 0x10000 // tb; rows = n // cols
    W, H = cols * 8, rows * 8; img = bytearray(W * H * 3)
    for t in range(n):
        for y in range(8):
            for x in range(8):
                c = tile_px(s.vram, 0, bpp, t, x, y)
                col = P[palette * (1 << bpp) + c] if c else (40, 0, 40)
                i = (((t // cols) * 8 + y) * W + (t % cols) * 8 + x) * 3
                img[i:i + 3] = bytes(col)
    png(path, W, H, img)
