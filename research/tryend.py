import sys, pickle; sys.path.insert(0, __file__.rsplit('/',1)[0])
from emu import *; from snes import OUT
def hc(*a): pass   # placeholder for a hook pickled with the state
B = {'B':0x8000,'Y':0x4000,'SEL':0x2000,'ST':0x1000,'U':0x0800,'D':0x0400,'L':0x0200,'R':0x0100,'A':0x0080,'X':0x0040,'LS':0x0020,'RS':0x0010,'_':0}
for seq in sys.argv[2:]:
    s = pickle.load(open(OUT + sys.argv[1], 'rb'))
    hit = []
    s.hook_call = lambda t, pc: hit.append((s.frame, '%06X' % t)) if t in (0x0388B3, 0x01A871, 0x08B5D6) else None
    for st in seq.split(','):
        b, f = st.split(':'); m = 0
        for p in b.split('+'): m |= B[p]
        run_frames(s, int(f), lambda fr, m=m: m)
    run_frames(s, 900)
    pos = [(s.wram[0x1C6F+i], s.wram[0x1CF9+i]) for i in range(9)]
    print(seq, '->', hit[:6], 'unit pos', pos)
