# Boot the game from reset and log which song groups ($00:A799) and sound commands ($0A51)
# it sends, with a screenshot a few frames after each one, to tell which screen uses which song.
# usage: spc_boot.py frames "BTN@frame+len,..." prefix [state.pkl] [--poke addr=val,...]   (buttons as in play.py)
import sys, pickle
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import emu
from emu import SNES, load_rom, run_frames
from render import screen
from snes import OUT
BTN = {'B': 0x8000, 'Y': 0x4000, 'SEL': 0x2000, 'ST': 0x1000, 'U': 0x0800, 'D': 0x0400, 'L': 0x0200, 'R': 0x0100,
       'A': 0x0080, 'X': 0x0040, 'LS': 0x0020, 'RS': 0x0010}

nfr, script, pre = int(sys.argv[1]), sys.argv[2], sys.argv[3]
def hc(*a): pass   # saved states may reference fight3.py's hook
args = [x for x in sys.argv[4:] if not x.startswith('--')]
s = pickle.load(open(OUT + args[0], 'rb')) if args else SNES(load_rom())
for kv in (sys.argv[sys.argv.index('--poke') + 1].split(',') if '--poke' in sys.argv else []):
    k, v = kv.split('='); s.wram[int(k, 16)] = int(v, 16)   # WRAM pokes, hex addr=val
presses = []
for p in filter(None, script.split(',')):
    b, at = p.split('@'); f0, n = map(int, at.split('+'))
    presses.append((f0, f0 + n, BTN[b]))
def joy(fr): return sum(m for a, b, m in presses if a <= fr < b)

events, shots = [], {}
for k in ('hook_read', 'hook_write', 'hook_dma', 'hooks_vram'): setattr(s, k, None)
def on_call(t, pc):
    if t == 0x00A799: events.append((s.frame, 'group', s.A & 0xFF, pc)); shots[s.frame + 40] = 1
s.hook_call = on_call
_write = emu.SNES.write
def write(self, a, v):
    if (a & 0xFFFF) == 0x0A51 and ((a >> 16) < 0x40 or (a >> 16) == 0x7E) and v:
        events.append((self.frame, 'cmd', v, self.cur_pc))
        if v >= 0x40: shots[self.frame + 40] = 1
    _write(self, a, v)
emu.SNES.write = write

start = s.frame
while s.frame < start + nfr:
    run_frames(s, 1, joy)
    if s.frame in shots: screen(s, OUT + '%s_%05d.png' % (pre, s.frame))
for f, k, v, pc in events:
    if k == 'group' or v >= 0x40 or v < 4: print(f, k, '%02X' % v, '%06X' % pc)
s.hook_call = None
pickle.dump(s, open(OUT + pre + '_end.pkl', 'wb'))
