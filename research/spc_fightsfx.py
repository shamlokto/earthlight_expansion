# Log the sound commands the game sends during a real fight: runs fight3.py with the
# same arguments and records every write to $0A51 (sound command) and $0A52 (param),
# with the frame number and the writing PC. Song group uploads ($00:A799) show up as
# port-0 writes of $FF.
# usage: spc_fightsfx.py <fight3.py args...>   -> prints "sfx frame cmd pc" lines
import sys, runpy
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import emu

log = []
_write = emu.SNES.write
def write(self, a, v):
    off = a & 0xFFFF; bank = (a >> 16) & 0xFF
    if off in (0x0A51, 0x0A52) and (bank < 0x40 or bank == 0x7E) and v:
        log.append((self.frame, off, v, self.cur_pc))
    if off == 0x2140 and v == 0xFF and bank < 0x40:
        log.append((self.frame, 0x2140, v, self.cur_pc))
    _write(self, a, v)
emu.SNES.write = write

sys.argv = [__file__.replace('spc_fightsfx.py', 'fight3.py')] + sys.argv[1:]
try:
    runpy.run_path(sys.argv[0], run_name='__main__')
finally:
    for f, off, v, pc in log:
        print('sfx', f, {0x0A51: 'cmd', 0x0A52: 'param', 0x2140: 'upload'}[off], '%02X' % v, '%06X' % pc)
