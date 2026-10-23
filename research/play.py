# Drive the emulator from a saved state with a joypad script; save screenshots.
# usage: play.py in.pkl out.pkl "BTN:frames,..." [shot_prefix]
import sys, pickle; sys.path.insert(0, __file__.rsplit('/',1)[0])
from emu import *; from render import screen; from snes import OUT
BTN = {'B':0x8000,'Y':0x4000,'SEL':0x2000,'ST':0x1000,'U':0x0800,'D':0x0400,'L':0x0200,'R':0x0100,'A':0x0080,'X':0x0040,'LS':0x0020,'RS':0x0010,'_':0}
s = pickle.load(open(OUT+sys.argv[1],'rb'))
for k in ('hook_read','hook_write','hook_dma','hooks_vram','hook_call'): setattr(s,k,None)
n = 0
for step in sys.argv[3].split(','):
    b, f = step.split(':'); mask = 0
    for p in b.split('+'): mask |= BTN[p]
    run_frames(s, int(f), lambda fr, m=mask: m)
    n += 1
    if len(sys.argv) > 4: screen(s, OUT+f'{sys.argv[4]}_{n}.png')
pickle.dump(s, open(OUT+sys.argv[2],'wb'))
print('frame', s.frame)
