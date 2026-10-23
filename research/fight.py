# Call the suspected fight-scene routine $08:B5D6 from a battle-map state and capture frames.
import sys, pickle; sys.path.insert(0, __file__.rsplit('/',1)[0])
from emu import *; from render import screen; from snes import OUT
s = pickle.load(open(OUT + 'state_2300.pkl', 'rb'))
for k in ('hook_read','hook_write','hook_dma','hooks_vram','hook_call'): setattr(s, k, None)
w = s.wram
att, dfn = int(sys.argv[1]), int(sys.argv[2])
w[0x6B6] = att; w[0x6B7] = dfn
w[0x6BC] = w[0x19BD + att]; w[0x6BD] = w[0x19BD + dfn]
w[0x6B8] = int(sys.argv[3]) if len(sys.argv) > 3 else 0
w[0x6C4] = 0x80; w[0x6C5] = 1; w[0x6C6] = 0x40; w[0x6C7] = 0   # damage dealt / counter (1/128 HP)
w[0x6CC] = 6; w[0x6CD] = 5
w[0x6C8] = w[0x1D83 + att]; w[0x6C9] = w[0x1D83 + dfn]; w[0x6BE] = 0; w[0x6BF] = 0; w[0x6B9] = 0; w[0x6CE] = 0                                       # resulting HPs
# sentinel: BRA -2 at $00:1FF0, return address pushed for RTL
if '--prep' in sys.argv:
    # run the caller's setup ($01:B45D) as a subroutine, returning into a parking loop
    w[0x1FF0] = 0x80; w[0x1FF1] = 0xFE
    s.S = 0x03FF; s.push16(0x1FEF)
    s.PB, s.PC, s.DB, s.D = 0x01, 0xB45D, 0x00, 0x0000
    s.setp(s.P | 0x30); s.waiting = False
    n = 0
    while not (s.PC in (0x1FF0, 0x1FF1)) and n < 2000000:
        s.step(); n += 1
    print('prep done after', n, 'instructions; 062B =', hex(w[0x62B]))
    w[0x6EE] = 0
s.S = 0x03FF                     # main loop stack baseline (reset code)
s.push8(0x00); s.push16(0x9E47)  # RTL -> 00:9E48, the main loop / task scheduler
entry = int(sys.argv[5], 16) if len(sys.argv) > 5 else 0x08B5D6
s.PB, s.PC, s.DB, s.D = entry >> 16, entry & 0xFFFF, 0x00, 0x0000
s.setp(s.P | 0x30); s.waiting = False
loads = []
s.hook_call = lambda t, pc: loads.append((s.frame, s.wram[0xFD7] | s.wram[0xFD8] << 8)) if t == 0x00CFDE else None
modes = []
for i in range(int(sys.argv[4]) if len(sys.argv) > 4 else 40):
    run_frames(s, 15, (lambda f: 0x0080 if f % 40 < 4 else 0) if '--press' in sys.argv else None)
    modes.append((s.frame, s.ppureg[5], hex(s.ppureg[0x2C]), '%02X:%04X' % (s.PB, s.PC)))
    screen(s, OUT + (sys.argv[6] if len(sys.argv) > 6 else 'fight') + '_%03d.png' % i)
print(modes[:6], modes[-3:])
print('asset loads', loads[:40])
pickle.dump(s, open(OUT + 'fight_end.pkl', 'wb')) if False else None
