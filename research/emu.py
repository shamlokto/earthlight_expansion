# Minimal SNES (65816 CPU + DMA + PPU register capture) for tracing Earth Light.
# No rendering, no APU; PPU state (VRAM/CGRAM/OAM/regs) is captured for offline rendering.
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from snes import rom as load_rom

N, V, M, X, D, I, Z, C = 0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01


class SNES:
    def __init__(self, romdata):
        self.rom = romdata
        self.wram = bytearray(0x20000)
        self.sram = bytearray(0x8000)
        self.vram = bytearray(0x10000)
        self.cgram = bytearray(512)
        self.oam = bytearray(544)
        self.ppureg = bytearray(256)       # last written value of $21xx
        self.io = bytearray(0x400)         # $4000-$43FF
        self.vaddr = 0; self.vinc = 1; self.vmain = 0
        self.cgaddr = 0; self.cglatch = None
        self.oamaddr = 0
        self.scroll = [[0, 0] for _ in range(4)]; self.scroll_latch = 0
        self.wmaddr = 0
        self.apu_in = [0xAA, 0xBB, 0, 0]
        self.apu_out = [0, 0, 0, 0]; self.apu_reset = True; self.apu_p1 = False
        self.joy = 0
        self.vblank = False
        self.nmi_flag = False
        self.frame = 0
        self.cycles = 0
        # CPU
        self.A = 0; self.Xr = 0; self.Y = 0; self.S = 0x1FF; self.D = 0
        self.DB = 0; self.PB = 0; self.PC = 0; self.P = 0x34; self.E = 1
        self.waiting = False
        self.hooks_vram = None   # callback(addr, value, pc)
        self.hook_read = None    # callback(addr, pc) for data reads
        self.hook_write = None
        self.cur_pc = 0
        self.mul = [0, 0]; self.divd = 0
        self.r4214 = 0; self.r4216 = 0
        self.PC = self.r16(0x00FFFC)

    # ---------------- memory ----------------
    def read(self, a):
        bank = a >> 16; off = a & 0xFFFF
        if bank == 0x7E or bank == 0x7F:
            return self.wram[((bank - 0x7E) << 16) | off]
        b = bank & 0x7F
        if b < 0x40:
            if off < 0x2000: return self.wram[off]
            if off >= 0x8000: return self.rom[(b << 15) | (off & 0x7FFF)]
            if 0x2100 <= off < 0x2200: return self.ppu_read(off)
            if 0x4000 <= off < 0x4400: return self.io_read(off)
            return 0
        if off >= 0x8000: return self.rom[((b << 15) | (off & 0x7FFF)) % len(self.rom)]
        if 0x70 <= b < 0x7E: return self.sram[off & 0x7FFF]
        return 0

    def write(self, a, v):
        bank = a >> 16; off = a & 0xFFFF
        if bank == 0x7E or bank == 0x7F:
            self.wram[((bank - 0x7E) << 16) | off] = v; return
        b = bank & 0x7F
        if b < 0x40:
            if off < 0x2000: self.wram[off] = v; return
            if 0x2100 <= off < 0x2200: self.ppu_write(off, v); return
            if 0x4000 <= off < 0x4400: self.io_write(off, v); return
            return
        if 0x70 <= b < 0x7E and off < 0x8000: self.sram[off & 0x7FFF] = v

    def r16(self, a):
        return self.read(a) | (self.read((a & 0xFF0000) | ((a + 1) & 0xFFFF)) << 8)

    # ---------------- PPU / IO ----------------
    def vram_step(self):
        self.vaddr = (self.vaddr + self.vinc) & 0x7FFF

    def ppu_write(self, off, v):
        r = off & 0xFF
        self.ppureg[r] = v
        if 0x0D <= r <= 0x14:
            bg, ax = (r - 0x0D) >> 1, (r - 0x0D) & 1
            self.scroll[bg][ax] = ((v << 8) | self.scroll_latch) & 0x3FF
            self.scroll_latch = v
        elif r == 0x15:
            self.vmain = v; self.vinc = (1, 32, 128, 128)[v & 3]
        elif r == 0x16: self.vaddr = (self.vaddr & 0xFF00) | v
        elif r == 0x17: self.vaddr = (self.vaddr & 0x00FF) | (v << 8)
        elif r == 0x18 or r == 0x19:
            i = (self.vaddr << 1 | (r & 1)) & 0xFFFF
            self.vram[i] = v
            if self.hooks_vram: self.hooks_vram(i, v, self.cur_pc)
            if ((self.vmain >> 7) & 1) == (r & 1): self.vram_step()
        elif r == 0x21: self.cgaddr = v * 2; self.cglatch = None
        elif r == 0x22:
            self.cgram[self.cgaddr & 511] = v; self.cgaddr = (self.cgaddr + 1) & 511
        elif r == 0x02: self.oamaddr = (self.oamaddr & 0x200) | (v << 1)
        elif r == 0x03: self.oamaddr = (self.oamaddr & 0x1FE) | ((v & 1) << 9)
        elif r == 0x04:
            self.oam[self.oamaddr % 544] = v; self.oamaddr = (self.oamaddr + 1) % 544
        elif 0x40 <= r <= 0x43:
            self.apu_out[r & 3] = v
            if r == 0x40:
                self.apu_reset = (v == 0xFF and not self.apu_p1); self.apu_p1 = False
            elif r == 0x41: self.apu_p1 = True
            self.apu_in[r & 3] = v   # echo: satisfies typical IPL upload handshakes
        elif r == 0x80:
            self.wram[self.wmaddr] = v; self.wmaddr = (self.wmaddr + 1) & 0x1FFFF
        elif r == 0x81: self.wmaddr = (self.wmaddr & 0x1FF00) | v
        elif r == 0x82: self.wmaddr = (self.wmaddr & 0x100FF) | (v << 8)
        elif r == 0x83: self.wmaddr = (self.wmaddr & 0x0FFFF) | ((v & 1) << 16)
        elif r == 0x02: pass

    def ppu_read(self, off):
        r = off & 0xFF
        if 0x40 <= r <= 0x7F:
            # Earth Light's IPL wait loop at 00:A870 expects the SPC700 ready signature
            if self.cur_pc in (0x00A870, 0x00A877): return (0xAA, 0xBB, 0, 0)[r & 3]
            return self.apu_in[r & 3]
        if r == 0x39 or r == 0x3A:
            i = (self.vaddr << 1 | (r & 1)) & 0xFFFF
            v = self.vram[i]
            if ((self.vmain >> 7) & 1) == (r & 1): self.vram_step()
            return v
        if r == 0x80:
            v = self.wram[self.wmaddr]; self.wmaddr = (self.wmaddr + 1) & 0x1FFFF; return v
        return 0

    def io_read(self, off):
        if off == 0x4210:
            v = 0x80 if self.nmi_flag else 0; self.nmi_flag = False; return v | 2
        if off == 0x4211: return 0
        if off == 0x4212: return 0x80 if self.vblank else 0
        if off == 0x4214: return self.r4214 & 0xFF
        if off == 0x4215: return self.r4214 >> 8
        if off == 0x4216: return self.r4216 & 0xFF
        if off == 0x4217: return self.r4216 >> 8
        if off == 0x4218: return self.joy & 0xFF
        if off == 0x4219: return self.joy >> 8
        if 0x421A <= off <= 0x421F: return 0
        if off == 0x4016 or off == 0x4017: return 0
        return self.io[off - 0x4000]

    def io_write(self, off, v):
        self.io[off - 0x4000] = v
        if off == 0x4203:
            self.r4216 = self.io[0x202] * v
        elif off == 0x4206:
            dv = self.io[0x204] | (self.io[0x205] << 8)
            if v == 0: self.r4214 = 0xFFFF; self.r4216 = dv
            else: self.r4214 = dv // v; self.r4216 = dv % v
        elif off == 0x420B:
            for ch in range(8):
                if v & (1 << ch): self.dma(ch)

    def dma(self, ch):
        base = 0x300 + ch * 16
        ctrl = self.io[base]; dest = self.io[base + 1]
        src = self.io[base + 2] | (self.io[base + 3] << 8); sbank = self.io[base + 4]
        n = self.io[base + 5] | (self.io[base + 6] << 8)
        if n == 0: n = 0x10000
        mode = ctrl & 7; to_cpu = ctrl & 0x80
        step = 0 if ctrl & 8 else (-1 if ctrl & 0x10 else 1)
        pat = {0: (0,), 1: (0, 1), 2: (0, 0), 3: (0, 0, 1, 1), 4: (0, 1, 2, 3), 5: (0, 1, 0, 1), 6: (0, 0), 7: (0, 0, 1, 1)}[mode]
        if self.hook_dma: self.hook_dma(ch, ctrl, dest, sbank, src, n)
        i = 0
        while n:
            a = (sbank << 16) | src
            reg = 0x2100 | ((dest + pat[i % len(pat)]) & 0xFF)
            if to_cpu: self.write(a, self.ppu_read(reg))
            else: self.ppu_write(reg, self.read(a))
            src = (src + step) & 0xFFFF; n -= 1; i += 1
        self.io[base + 5] = self.io[base + 6] = 0
        self.io[base + 2] = src & 0xFF; self.io[base + 3] = src >> 8
    hook_dma = None

    # ---------------- CPU helpers ----------------
    def fetch8(self):
        v = self.read((self.PB << 16) | self.PC); self.PC = (self.PC + 1) & 0xFFFF; return v

    def fetch16(self):
        v = self.fetch8(); return v | (self.fetch8() << 8)

    def fetch24(self):
        v = self.fetch16(); return v | (self.fetch8() << 16)

    def push8(self, v):
        self.write(self.S, v & 0xFF)
        self.S = (self.S - 1) & 0xFFFF
        if self.E: self.S = 0x100 | (self.S & 0xFF)

    def pull8(self):
        self.S = (self.S + 1) & 0xFFFF
        if self.E: self.S = 0x100 | (self.S & 0xFF)
        return self.read(self.S)

    def push16(self, v): self.push8(v >> 8); self.push8(v)

    def pull16(self): v = self.pull8(); return v | (self.pull8() << 8)

    def setnz8(self, v):
        self.P = (self.P & ~(N | Z)) | (v & 0x80) | (0 if v & 0xFF else Z)

    def setnz16(self, v):
        self.P = (self.P & ~(N | Z)) | ((v >> 8) & 0x80) | (0 if v & 0xFFFF else Z)

    def setp(self, v):
        self.P = v
        if self.E: self.P |= M | X
        if self.P & X: self.Xr &= 0xFF; self.Y &= 0xFF

    def interrupt(self, vec_native):
        self.waiting = False
        self.push8(self.PB); self.push16(self.PC); self.push8(self.P)
        self.P = (self.P | I) & ~D; self.PB = 0
        self.PC = self.r16(vec_native)

    # ---------------- addressing (return 24-bit address) ----------------
    def ea(self, mode):
        if mode == 'd': return (self.D + self.fetch8()) & 0xFFFF
        if mode == 'dx': return (self.D + self.fetch8() + self.Xr) & 0xFFFF
        if mode == 'dy': return (self.D + self.fetch8() + self.Y) & 0xFFFF
        if mode == 'ab': return (self.DB << 16) | self.fetch16()
        if mode == 'abx': return ((self.DB << 16) + self.fetch16() + self.Xr) & 0xFFFFFF
        if mode == 'aby': return ((self.DB << 16) + self.fetch16() + self.Y) & 0xFFFFFF
        if mode == 'al': return self.fetch24()
        if mode == 'alx': return (self.fetch24() + self.Xr) & 0xFFFFFF
        if mode == 'di':
            p = (self.D + self.fetch8()) & 0xFFFF; return (self.DB << 16) | self.r16(p)
        if mode == 'dxi':
            p = (self.D + self.fetch8() + self.Xr) & 0xFFFF; return (self.DB << 16) | self.r16(p)
        if mode == 'dix':
            p = (self.D + self.fetch8()) & 0xFFFF; return ((self.DB << 16) + self.r16(p) + self.Y) & 0xFFFFFF
        if mode == 'dil':
            p = (self.D + self.fetch8()) & 0xFFFF; return self.r16(p) | (self.read(p + 2) << 16)
        if mode == 'dily':
            p = (self.D + self.fetch8()) & 0xFFFF; return ((self.r16(p) | (self.read(p + 2) << 16)) + self.Y) & 0xFFFFFF
        if mode == 'sr': return (self.S + self.fetch8()) & 0xFFFF
        if mode == 'srix':
            p = (self.S + self.fetch8()) & 0xFFFF; return ((self.DB << 16) + self.r16(p) + self.Y) & 0xFFFFFF
        raise ValueError(mode)

    def rd(self, a, w):
        if self.hook_read: self.hook_read(a, self.cur_pc)
        if w: return self.read(a) | (self.read((a + 1) & 0xFFFFFF) << 8)
        return self.read(a)

    def wr(self, a, v, w):
        if self.hook_write: self.hook_write(a, v, w, self.cur_pc)
        self.write(a, v & 0xFF)
        if w: self.write((a + 1) & 0xFFFFFF, (v >> 8) & 0xFF)

    def operand(self, mode, w):
        if mode == 'im': return self.fetch16() if w else self.fetch8()
        return self.rd(self.ea(mode), w)

    # ---------------- ALU ----------------
    def adc(self, v, w):
        c = self.P & C; a = self.A if w else self.A & 0xFF
        if self.P & D:
            res = 0; cc = c
            for sh in range(0, 16 if w else 8, 4):
                d = ((a >> sh) & 15) + ((v >> sh) & 15) + cc
                cc = 1 if d > 9 else 0
                if cc: d += 6
                res |= (d & 15) << sh
            r = res; carry = cc
            mask = 0xFFFF if w else 0xFF; sign = 0x8000 if w else 0x80
            ov = (~(a ^ v) & (a ^ r) & sign)
        else:
            r = a + v + c; mask = 0xFFFF if w else 0xFF; sign = 0x8000 if w else 0x80
            carry = 1 if r > mask else 0; r &= mask
            ov = (~(a ^ v) & (a ^ r) & sign)
        self.P = (self.P & ~(C | V)) | carry | (V if ov else 0)
        if w: self.A = r; self.setnz16(r)
        else: self.A = (self.A & 0xFF00) | r; self.setnz8(r)

    def sbc(self, v, w):
        if self.P & D:
            # BCD subtract
            c = self.P & C; a = self.A if w else self.A & 0xFF
            res = 0; borrow = 1 - c
            for sh in range(0, 16 if w else 8, 4):
                d = ((a >> sh) & 15) - ((v >> sh) & 15) - borrow
                borrow = 1 if d < 0 else 0
                if borrow: d += 10
                res |= (d & 15) << sh
            mask = 0xFFFF if w else 0xFF; sign = 0x8000 if w else 0x80
            ov = ((a ^ v) & (a ^ res) & sign)
            self.P = (self.P & ~(C | V)) | (0 if borrow else C) | (V if ov else 0)
            if w: self.A = res; self.setnz16(res)
            else: self.A = (self.A & 0xFF00) | res; self.setnz8(res)
        else:
            self.adc(v ^ (0xFFFF if w else 0xFF), w)

    def cmp(self, r, v, w):
        mask = 0xFFFF if w else 0xFF
        r &= mask; d = (r - v) & mask
        self.P = (self.P & ~C) | (C if r >= v else 0)
        (self.setnz16 if w else self.setnz8)(d)

    # ---------------- step ----------------
    def step(self):
        self.cur_pc = (self.PB << 16) | self.PC
        op = self.fetch8()
        mw = not (self.P & M); xw = not (self.P & X)
        h = OPS[op]
        h(self, op, mw, xw)


def _gen():
    T = {}
    from dis65 import TAB
    # group handlers
    def ld(reg):
        def f(s, op, mw, xw, mode):
            w = mw if reg == 'A' else xw
            v = s.operand(mode, w)
            if reg == 'A':
                s.A = v if w else (s.A & 0xFF00) | v
            elif reg == 'X': s.Xr = v
            else: s.Y = v
            (s.setnz16 if w else s.setnz8)(v)
        return f

    def st(reg):
        def f(s, op, mw, xw, mode):
            w = mw if reg in 'AZ' else xw
            v = {'A': s.A, 'X': s.Xr, 'Y': s.Y, 'Z': 0}[reg]
            s.wr(s.ea(mode), v, w)
        return f

    def alu(kind):
        def f(s, op, mw, xw, mode):
            v = s.operand(mode, mw)
            if kind == 'ADC': s.adc(v, mw); return
            if kind == 'SBC': s.sbc(v, mw); return
            if kind == 'CMP': s.cmp(s.A, v, mw); return
            a = s.A if mw else s.A & 0xFF
            r = a | v if kind == 'ORA' else a & v if kind == 'AND' else a ^ v
            if mw: s.A = r; s.setnz16(r)
            else: s.A = (s.A & 0xFF00) | r; s.setnz8(r)
        return f

    def cpx(reg):
        def f(s, op, mw, xw, mode):
            v = s.operand('im' if mode == 'imx' else mode, xw)
            s.cmp(s.Xr if reg == 'X' else s.Y, v, xw)
        return f

    def rmw(kind):
        def f(s, op, mw, xw, mode):
            w = mw
            if mode == 'a':
                v = s.A if w else s.A & 0xFF
            else:
                a = s.ea(mode); v = s.rd(a, w)
            mask = 0xFFFF if w else 0xFF; top = 0x8000 if w else 0x80
            c = s.P & C
            if kind == 'ASL': s.P = (s.P & ~C) | (1 if v & top else 0); v = (v << 1) & mask
            elif kind == 'LSR': s.P = (s.P & ~C) | (v & 1); v >>= 1
            elif kind == 'ROL': s.P = (s.P & ~C) | (1 if v & top else 0); v = ((v << 1) | c) & mask
            elif kind == 'ROR': s.P = (s.P & ~C) | (v & 1); v = (v >> 1) | (top if c else 0)
            elif kind == 'INC': v = (v + 1) & mask
            elif kind == 'DEC': v = (v - 1) & mask
            elif kind in ('TSB', 'TRB'):
                acc = s.A & mask
                s.P = (s.P & ~Z) | (0 if v & acc else Z)
                v = (v | acc) if kind == 'TSB' else (v & ~acc & mask)
                s.wr(a, v, w); return
            (s.setnz16 if w else s.setnz8)(v)
            if mode == 'a':
                s.A = v if w else (s.A & 0xFF00) | v
            else: s.wr(a, v, w)
        return f

    def bit(s, op, mw, xw, mode):
        v = s.operand(mode, mw)
        acc = s.A if mw else s.A & 0xFF
        s.P = (s.P & ~Z) | (0 if v & acc else Z)
        if mode != 'im':
            if mw: s.P = (s.P & ~(N | V)) | ((v >> 8) & 0xC0)
            else: s.P = (s.P & ~(N | V)) | (v & 0xC0)

    def branch(cond):
        def f(s, op, mw, xw, mode):
            o = s.fetch8()
            if cond(s.P):
                s.PC = (s.PC + (o - 256 if o > 127 else o)) & 0xFFFF
        return f

    def incdec_reg(reg, d):
        def f(s, op, mw, xw, mode):
            w = xw
            mask = 0xFFFF if w else 0xFF
            if reg == 'X': s.Xr = (s.Xr + d) & mask; v = s.Xr
            else: s.Y = (s.Y + d) & mask; v = s.Y
            (s.setnz16 if w else s.setnz8)(v)
        return f

    def xfer(src, dst):
        def f(s, op, mw, xw, mode):
            get = {'A': lambda: s.A, 'X': lambda: s.Xr, 'Y': lambda: s.Y, 'S': lambda: s.S, 'D': lambda: s.D}
            v = get[src]()
            if dst == 'A':
                if mw: s.A = v & 0xFFFF; s.setnz16(s.A)
                else: s.A = (s.A & 0xFF00) | (v & 0xFF); s.setnz8(v)
            elif dst in 'XY':
                if xw: v &= 0xFFFF; (s.setnz16)(v)
                else: v &= 0xFF; s.setnz8(v)
                if dst == 'X': s.Xr = v
                else: s.Y = v
            elif dst == 'S':
                s.S = v if not s.E else 0x100 | (v & 0xFF)
            elif dst == 'D': s.D = v; s.setnz16(v)
        return f

    def tcd(s, op, mw, xw, mode): s.D = s.A; s.setnz16(s.A)
    def tdc(s, op, mw, xw, mode): s.A = s.D; s.setnz16(s.A)
    def tcs(s, op, mw, xw, mode): s.S = s.A if not s.E else 0x100 | (s.A & 0xFF)
    def tsc(s, op, mw, xw, mode): s.A = s.S; s.setnz16(s.A)

    def flag(bitv, val):
        def f(s, op, mw, xw, mode):
            s.P = (s.P | bitv) if val else (s.P & ~bitv)
        return f

    def rep(s, op, mw, xw, mode): s.setp(s.P & ~s.fetch8())
    def sep(s, op, mw, xw, mode): s.setp(s.P | s.fetch8())
    def xce(s, op, mw, xw, mode):
        c = s.P & C; s.P = (s.P & ~C) | s.E; s.E = c
        if s.E: s.setp(s.P | M | X); s.S = 0x100 | (s.S & 0xFF)
    def xba(s, op, mw, xw, mode):
        s.A = ((s.A >> 8) | (s.A << 8)) & 0xFFFF; s.setnz8(s.A & 0xFF)

    def jmp(s, op, mw, xw, mode):
        if mode == 'ab': s.PC = s.fetch16()
        elif mode == 'al': a = s.fetch24(); s.PC = a & 0xFFFF; s.PB = a >> 16
        elif mode == 'abi': p = s.fetch16(); s.PC = s.r16(p)
        elif mode == 'abxi': p = (s.fetch16() + s.Xr) & 0xFFFF; s.PC = s.r16((s.PB << 16) | p)
        elif mode == 'abil': p = s.fetch16(); s.PC = s.r16(p); s.PB = s.read(p + 2)

    def jsr(s, op, mw, xw, mode):
        if mode == 'ab':
            t = s.fetch16(); s.push16((s.PC - 1) & 0xFFFF); s.PC = t
        elif mode == 'abxi':
            p = (s.fetch16() + s.Xr) & 0xFFFF; s.push16((s.PC - 1) & 0xFFFF); s.PC = s.r16((s.PB << 16) | p)

    def jsl(s, op, mw, xw, mode):
        t = s.fetch24(); s.push8(s.PB); s.push16((s.PC - 1) & 0xFFFF)
        s.PB = t >> 16; s.PC = t & 0xFFFF
        if s.hook_call: s.hook_call(t, s.cur_pc)

    def rts(s, op, mw, xw, mode): s.PC = (s.pull16() + 1) & 0xFFFF
    def rtl(s, op, mw, xw, mode): s.PC = (s.pull16() + 1) & 0xFFFF; s.PB = s.pull8()
    def rti(s, op, mw, xw, mode):
        s.setp(s.pull8()); s.PC = s.pull16()
        if not s.E: s.PB = s.pull8()

    def push(reg):
        def f(s, op, mw, xw, mode):
            if reg == 'A': (s.push16 if mw else s.push8)(s.A if mw else s.A & 0xFF)
            elif reg == 'X': (s.push16 if xw else s.push8)(s.Xr)
            elif reg == 'Y': (s.push16 if xw else s.push8)(s.Y)
            elif reg == 'P': s.push8(s.P)
            elif reg == 'B': s.push8(s.DB)
            elif reg == 'K': s.push8(s.PB)
            elif reg == 'D': s.push16(s.D)
        return f

    def pull(reg):
        def f(s, op, mw, xw, mode):
            if reg == 'A':
                if mw: s.A = s.pull16(); s.setnz16(s.A)
                else: v = s.pull8(); s.A = (s.A & 0xFF00) | v; s.setnz8(v)
            elif reg in 'XY':
                v = s.pull16() if xw else s.pull8()
                (s.setnz16 if xw else s.setnz8)(v)
                if reg == 'X': s.Xr = v
                else: s.Y = v
            elif reg == 'P': s.setp(s.pull8())
            elif reg == 'B': s.DB = s.pull8(); s.setnz8(s.DB)
            elif reg == 'D': s.D = s.pull16(); s.setnz16(s.D)
        return f

    def pea(s, op, mw, xw, mode): s.push16(s.fetch16())
    def pei(s, op, mw, xw, mode): p = (s.D + s.fetch8()) & 0xFFFF; s.push16(s.r16(p))
    def per(s, op, mw, xw, mode):
        o = s.fetch16(); s.push16((s.PC + o) & 0xFFFF)
    def brl(s, op, mw, xw, mode):
        o = s.fetch16(); s.PC = (s.PC + o) & 0xFFFF

    def mv(dirn):
        def f(s, op, mw, xw, mode):
            db = s.fetch8(); sb = s.fetch8()
            s.DB = db
            mask = 0xFFFF if xw else 0xFF
            while True:
                s.write((db << 16) | s.Y, s.read((sb << 16) | s.Xr))
                s.Xr = (s.Xr + dirn) & mask; s.Y = (s.Y + dirn) & mask
                s.A = (s.A - 1) & 0xFFFF
                if s.A == 0xFFFF: break
        return f

    def wai(s, op, mw, xw, mode): s.waiting = True
    def nop(s, op, mw, xw, mode): pass
    def wdm(s, op, mw, xw, mode): s.fetch8()
    def brk(s, op, mw, xw, mode):
        raise RuntimeError('BRK/COP/STP at %06X' % s.cur_pc)

    H = {}
    for op in range(256):
        mn, mode = TAB[op]
        f = None
        if mn in ('LDA', 'LDX', 'LDY'):
            f = ld(mn[2]); mode = 'im' if mode == 'imx' else mode
        elif mn in ('STA', 'STX', 'STY', 'STZ'): f = st(mn[2])
        elif mn in ('ORA', 'AND', 'EOR', 'ADC', 'SBC', 'CMP'): f = alu(mn)
        elif mn in ('CPX', 'CPY'): f = cpx(mn[2])
        elif mn in ('ASL', 'LSR', 'ROL', 'ROR', 'TSB', 'TRB'): f = rmw(mn)
        elif mn in ('INC', 'DEC'): f = rmw(mn)
        elif mn == 'BIT': f = bit
        elif mn == 'BPL': f = branch(lambda p: not p & N)
        elif mn == 'BMI': f = branch(lambda p: p & N)
        elif mn == 'BVC': f = branch(lambda p: not p & V)
        elif mn == 'BVS': f = branch(lambda p: p & V)
        elif mn == 'BCC': f = branch(lambda p: not p & C)
        elif mn == 'BCS': f = branch(lambda p: p & C)
        elif mn == 'BNE': f = branch(lambda p: not p & Z)
        elif mn == 'BEQ': f = branch(lambda p: p & Z)
        elif mn == 'BRA': f = branch(lambda p: True)
        elif mn == 'BRL': f = brl
        elif mn in ('INX', 'DEX'): f = incdec_reg('X', 1 if mn == 'INX' else -1)
        elif mn in ('INY', 'DEY'): f = incdec_reg('Y', 1 if mn == 'INY' else -1)
        elif mn in ('TAX', 'TAY', 'TXA', 'TYA', 'TXY', 'TYX', 'TSX', 'TXS'):
            f = xfer(mn[1], mn[2])
        elif mn == 'TCD': f = tcd
        elif mn == 'TDC': f = tdc
        elif mn == 'TCS': f = tcs
        elif mn == 'TSC': f = tsc
        elif mn == 'CLC': f = flag(C, 0)
        elif mn == 'SEC': f = flag(C, 1)
        elif mn == 'CLI': f = flag(I, 0)
        elif mn == 'SEI': f = flag(I, 1)
        elif mn == 'CLD': f = flag(D, 0)
        elif mn == 'SED': f = flag(D, 1)
        elif mn == 'CLV': f = flag(V, 0)
        elif mn == 'REP': f = rep
        elif mn == 'SEP': f = sep
        elif mn == 'XCE': f = xce
        elif mn == 'XBA': f = xba
        elif mn in ('JMP', 'JML'): f = jmp
        elif mn == 'JSR': f = jsr
        elif mn == 'JSL': f = jsl
        elif mn == 'RTS': f = rts
        elif mn == 'RTL': f = rtl
        elif mn == 'RTI': f = rti
        elif mn in ('PHA', 'PHX', 'PHY', 'PHP', 'PHB', 'PHK', 'PHD'): f = push(mn[2])
        elif mn in ('PLA', 'PLX', 'PLY', 'PLP', 'PLB', 'PLD'): f = pull(mn[2])
        elif mn == 'PEA': f = pea
        elif mn == 'PEI': f = pei
        elif mn == 'PER': f = per
        elif mn == 'MVN': f = mv(1)
        elif mn == 'MVP': f = mv(-1)
        elif mn == 'WAI': f = wai
        elif mn == 'NOP': f = nop
        elif mn == 'WDM': f = wdm
        elif mn in ('BRK', 'COP', 'STP'): f = brk
        assert f, mn
        H[op] = (lambda f, mode: (lambda s, op, mw, xw: f(s, op, mw, xw, mode)))(f, mode)
    return [H[i] for i in range(256)]


OPS = _gen()
SNES.hook_call = None

INSNS_PER_FRAME = 9000   # rough: active display portion
VBLANK_INSNS = 1500


def run_frames(s, n, joy_fn=None):
    for _ in range(n):
        s.vblank = False
        s.joy = joy_fn(s.frame) if joy_fn else 0
        k = 0
        while k < INSNS_PER_FRAME:
            if s.waiting: break
            s.step(); k += 1
        # enter vblank
        s.vblank = True; s.nmi_flag = True
        if s.io[0x200] & 0x80:
            s.interrupt(0x00FFEA)
        k = 0
        while k < VBLANK_INSNS:
            if s.waiting: break
            s.step(); k += 1
        s.frame += 1


if __name__ == '__main__':
    s = SNES(load_rom())
    import time
    t = time.time()
    run_frames(s, int(sys.argv[1]) if len(sys.argv) > 1 else 60)
    print('frames', s.frame, 'time', round(time.time() - t, 1), 'PC %02X:%04X' % (s.PB, s.PC))
