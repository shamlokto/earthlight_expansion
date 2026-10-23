# List the SPC700 upload blocks in the sound assets (822-834): [len16][addr16][data], len 0 = end (+ entry addr)
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from snes import rom
from decomp import decode
d = rom()
def blocks(k):
    b = decode(d, k)[0]; i = 0; out = []
    while True:
        n = b[i] | b[i+1] << 8; a = b[i+2] | b[i+3] << 8; i += 4
        if n == 0: return out, a, b
        out.append((a, b[i:i+n])); i += n
if __name__ == '__main__':
    for k in range(822, 835):
        bl, ent, raw = blocks(k)
        print(k, len(raw), 'entry %04X' % ent, ' '.join('%04X+%X' % (a, len(x)) for a, x in bl))
