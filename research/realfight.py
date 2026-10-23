# Let the game's own enemy phase start a fight: put a player unit next to the
# enemy arrival hexes on HAMILTON, then run and log fight-scene activity.
import sys, pickle; sys.path.insert(0, __file__.rsplit('/',1)[0])
from emu import *; from render import screen; from snes import OUT
s = pickle.load(open(OUT + 'state_1760.pkl', 'rb'))
for k in ('hook_read','hook_write','hook_dma','hooks_vram','hook_call'): setattr(s, k, None)
w = s.wram
u, nx, ny = 0, int(sys.argv[1]), int(sys.argv[2])
ox, oy = w[0x1C6F + u], w[0x1CF9 + u]
w[0x10000 + 0x42D2 - 0x10000 + oy * 64 + ox] = 0          # 7E:42D2 unit grid (7E bank = wram[0..])
w[0x42D2 + ny * 64 + nx] = u + 1
w[0x1C6F + u], w[0x1CF9 + u] = nx, ny
loads = []
s.hook_call = lambda t, pc: loads.append((s.frame, s.wram[0xFD7] | s.wram[0xFD8] << 8)) if t == 0x00CFDE else None
calls = []
def hc(t, pc):
    if t == 0x00CFDE: loads.append((s.frame, s.wram[0xFD7] | s.wram[0xFD8] << 8))
    if t == 0x0388B3: calls.append(s.frame)
s.hook_call = hc
last = None; shots = 0
for i in range(int(sys.argv[3])):
    run_frames(s, 10)
    m = s.ppureg[5]
    if calls and shots < 80 and i % 2 == 0:
        screen(s, OUT + 'rf_%03d.png' % shots); shots += 1
    if m != last: print(s.frame, 'mode', m); last = m
print('fight starts at frames', calls)
print('loads', [l for l in loads if l[1] not in (731,)][:30])
s.hook_call = None
pickle.dump(s, open(OUT + 'rf_end.pkl', 'wb'))
