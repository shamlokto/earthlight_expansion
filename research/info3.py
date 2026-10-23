# Unit info screen capture: request it from the battle dispatcher task ($01:B163 polls
# $06EE; $0A runs $01:B342 -> $04:E4E0) from a battle state where the player has control, for the unit in slot <u> (optionally retyped), and save the screen.
# usage: info3.py state.pkl unit frames prefix [--type N] [--rom file.sfc]
import sys, pickle; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from emu import *; from render import screen; from snes import OUT
import __main__; __main__.hc = lambda *a: None
s = pickle.load(open(OUT + sys.argv[1], 'rb'))
for k in ('hook_read', 'hook_write', 'hook_dma', 'hooks_vram', 'hook_call'): setattr(s, k, None)
if '--rom' in sys.argv: s.rom = open(sys.argv[sys.argv.index('--rom') + 1], 'rb').read()
w = s.wram; u, nfr, pre = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
if '--type' in sys.argv: w[0x19BD + u] = int(sys.argv[sys.argv.index('--type') + 1])
w[0x6DE] = u + 1; w[0x6EE] = 0x0A
for i in range(nfr):
    try: run_frames(s, 1)
    except RuntimeError as e: print('stopped', i, e); break
screen(s, OUT + pre + '.png')
pickle.dump(s, open(OUT + pre + '_st.pkl', 'wb'))
print('mode', s.ppureg[5], 'PC %02X:%04X' % (s.PB, s.PC))
