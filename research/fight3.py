# Real fight capture: game's damage routine, then the game's fight setup ($01:B45D)
# and fight task ($03:88B3), returning into the main loop. Records PPU state per frame.
# usage: fight3.py state.pkl att def slot frames out_prefix [--atype N] [--dtype N] [--dump f,f..] [--rom file.sfc]
import sys, pickle; sys.path.insert(0, __file__.rsplit('/',1)[0])
from emu import *; from render import screen; from snes import OUT
def hc(*a): pass
import __main__; __main__.hc = hc
s = pickle.load(open(OUT + sys.argv[1], 'rb')); s.hook_call = None
w = s.wram
if '--rom' in sys.argv:   # run the same state on another ROM image (e.g. the English patch)
    s.rom = open(sys.argv[sys.argv.index('--rom') + 1], 'rb').read()
att, dfn, slot, nfr, pre = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]

def call(pb, pc, db, limit=3000000):
    w[0x1FF0] = 0x80; w[0x1FF1] = 0xFE
    s.S = 0x1F80; s.push16(0x1FEF)
    s.PB, s.PC, s.DB, s.D = pb, pc, db, 0
    s.setp(s.P | 0x30); s.E = 0; s.waiting = False
    n = 0
    while s.PC not in (0x1FF0, 0x1FF1) and n < limit: s.step(); n += 1
    return n

# optional unit-type overrides: --atype N --dtype N (sets type, icon, category, HP)
def settype(u, t):
    d = s.rom; lo = lambda a: ((a >> 16) & 0x7f) * 0x8000 + (a & 0x7fff)
    w[0x19BD + u] = t; w[0x1A47 + u] = d[lo(0x01EE2C) + t]
    w[0x1B5B + u] = d[lo(0x01F206) + t]; w[0x1D83 + u] = d[lo(0x01F676) + t]
if '--atype' in sys.argv: settype(att, int(sys.argv[sys.argv.index('--atype') + 1]))
if '--dtype' in sys.argv: settype(dfn, int(sys.argv[sys.argv.index('--dtype') + 1]))
# --move u,x,y[;u,x,y]: reposition units (unit table and the unit grid at $7E:42D2)
if '--move' in sys.argv:
    for m in sys.argv[sys.argv.index('--move') + 1].split(';'):
        u, x, y = map(int, m.split(','))
        w[0x42D2 + w[0x1CF9 + u] * 64 + w[0x1C6F + u]] = 0
        w[0x42D2 + y * 64 + x] = u + 1; w[0x1C6F + u], w[0x1CF9 + u] = x, y
def pokes(flag):   # --pre / --post addr=val,addr=val (hex) before damage / after the fight block
    if flag in sys.argv:
        for kv in sys.argv[sys.argv.index(flag) + 1].split(','):
            a, v = kv.split('='); w[int(a, 16)] = int(v, 16)
pokes('--pre')
w[0x6B6], w[0x6B7], w[0x6B8], w[0x6CE] = att, dfn, slot, 0
call(0x02, 0x9157, 0x01)   # info-screen values per phase ($0683-$06A2), as $01:9C54 does
print('info', [w[0x683 + i] | w[0x684 + i] << 8 for i in range(0, 0x20, 2)])
call(0x01, 0xA871, 0x01)
print('dmg', w[0x6C4] | w[0x6C5] << 8, 'counter', w[0x6C6] | w[0x6C7] << 8, 'HP after', w[0x6CC], w[0x6CD])
call(0x01, 0xA163, 0x01)   # copy results into the fight block $059F-$05B3
pokes('--post')
print('fight block', [hex(w[i]) for i in range(0x59F, 0x5B4)])
n = call(0x01, 0xB45D, 0x01)
print('setup', n, 'insns')
w[0x6EE] = 0
s.S = 0x03FF; s.push8(0x00); s.push16(0x9E47)   # RTL into the main loop
s.PB, s.PC, s.DB = 0x03, 0x88B3, 0x01
frames = []
dumps = set(int(x) for x in sys.argv[sys.argv.index('--dump') + 1].split(',')) if '--dump' in sys.argv else set()
import collections
recent = collections.deque(maxlen=6); loadlog = []
def _hr(a, pc):
    b = (a >> 16) & 0x7f
    if b < 0x40 and (a & 0xffff) >= 0x8000 and (pc >> 16) in (3, 4): recent.append('%06X<-%06X' % (a, pc))
def _hc(t, pc):
    if t == 0x00CFDE: loadlog.append((s.frame, w[0xFD7] | w[0xFD8] << 8, '%06X' % pc, list(recent)[-3:]))
s.hook_read = _hr; s.hook_call = _hc
for i in range(nfr):
    try: run_frames(s, 1)
    except RuntimeError as e:   # keep what was recorded (some types hit an emulator gap)
        print('stopped at frame', i, e); break
    frames.append((s.frame, bytes(s.oam), bytes(s.cgram), bytes(s.ppureg), [list(x) for x in s.scroll]))
    if i % 8 == 0: screen(s, OUT + '%s_%03d.png' % (pre, i // 8))
    if i in dumps:   # full emulator state at chosen frames (--dump a,b,...)
        hk = {k: getattr(s, k, None) for k in ('hook_read', 'hook_call')}
        s.hook_read = s.hook_call = None
        pickle.dump(s, open(OUT + '%s_st%03d.pkl' % (pre, i), 'wb')); s.__dict__.update(hk)
for l in loadlog: print('load', l)
print('end frame', s.frame, 'mode', s.ppureg[5], 'PC %02X:%04X' % (s.PB, s.PC))
pickle.dump(frames, open(OUT + pre + '_frames.pkl', 'wb'))
for k in ('hook_read','hook_write','hook_dma','hooks_vram','hook_call'): setattr(s, k, None)
pickle.dump(s, open(OUT + pre + '_end.pkl', 'wb'))
