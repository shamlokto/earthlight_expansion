// SNES sound unit: SPC700 CPU, timers and S-DSP, written from the fullsnes
// hardware reference (problemkaputt.de/fullsnes.htm). No DOM, so it runs in an
// AudioWorklet. One call to sample() runs 32 CPU cycles and returns one 32 kHz
// stereo frame.

// SPC700 cycles per opcode (taken branches add 2).
const CYC = [
  2,8,4,5,3,4,3,6,2,6,5,4,5,4,6,8, 2,8,4,5,4,5,5,6,5,5,6,5,2,2,4,6,
  2,8,4,5,3,4,3,6,2,6,5,4,5,4,5,4, 2,8,4,5,4,5,5,6,5,5,6,5,2,2,3,8,
  2,8,4,5,3,4,3,6,2,6,4,4,5,4,6,6, 2,8,4,5,4,5,5,6,5,5,4,5,2,2,4,3,
  2,8,4,5,3,4,3,6,2,6,4,4,5,4,5,5, 2,8,4,5,4,5,5,6,5,5,5,5,2,2,3,6,
  2,8,4,5,3,4,3,6,2,6,5,4,5,2,4,5, 2,8,4,5,4,5,5,6,5,5,5,5,2,2,12,5,
  3,8,4,5,3,4,3,6,2,6,4,4,5,2,4,4, 2,8,4,5,4,5,5,6,5,5,5,5,2,2,3,4,
  3,8,4,5,4,5,4,7,2,5,6,4,5,2,4,9, 2,8,4,5,5,6,6,7,4,5,5,5,2,2,6,3,
  2,8,4,5,3,4,3,6,2,4,5,3,4,3,4,3, 2,8,4,5,4,5,5,6,3,4,5,4,2,2,4,3,
];

// S-DSP 4-point interpolation table (fullsnes "4-Point Gaussian Interpolation").
const GAUSS = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,13,13,14,14,15,15,15,16,16,17,17,18,19,19,20,20,21,21,22,23,23,24,24,25,26,27,27,28,29,29,30,31,32,32,33,34,35,36,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,58,59,60,61,62,64,65,66,67,69,70,71,73,74,76,77,78,80,81,83,84,86,87,89,90,92,94,95,97,99,100,102,104,106,107,109,111,113,115,117,118,120,122,124,126,128,130,132,134,137,139,141,143,145,147,150,152,154,156,159,161,163,166,168,171,173,175,178,180,183,186,188,191,193,196,199,201,204,207,210,212,215,218,221,224,227,230,233,236,239,242,245,248,251,254,257,260,263,267,270,273,276,280,283,286,290,293,297,300,304,307,311,314,318,321,325,328,332,336,339,343,347,351,354,358,362,366,370,374,378,381,385,389,393,397,401,405,410,414,418,422,426,430,434,439,443,447,451,456,460,464,469,473,477,482,486,491,495,499,504,508,513,517,522,527,531,536,540,545,550,554,559,563,568,573,577,582,587,592,596,601,606,611,615,620,625,630,635,640,644,649,654,659,664,669,674,678,683,688,693,698,703,708,713,718,723,728,732,737,742,747,752,757,762,767,772,777,782,787,792,797,802,806,811,816,821,826,831,836,841,846,851,855,860,865,870,875,880,884,889,894,899,904,908,913,918,923,927,932,937,941,946,951,955,960,965,969,974,978,983,988,992,997,1001,1005,1010,1014,1019,1023,1027,1032,1036,1040,1045,1049,1053,1057,1061,1066,1070,1074,1078,1082,1086,1090,1094,1098,1102,1106,1109,1113,1117,1121,1125,1128,1132,1136,1139,1143,1146,1150,1153,1157,1160,1164,1167,1170,1174,1177,1180,1183,1186,1190,1193,1196,1199,1202,1205,1207,1210,1213,1216,1219,1221,1224,1227,1229,1232,1234,1237,1239,1241,1244,1246,1248,1251,1253,1255,1257,1259,1261,1263,1265,1267,1269,1270,1272,1274,1275,1277,1279,1280,1282,1283,1284,1286,1287,1288,1290,1291,1292,1293,1294,1295,1296,1297,1297,1298,1299,1300,1300,1301,1302,1302,1303,1303,1303,1304,1304,1304,1304,1304,1305,1305];

// Envelope/noise rates: samples per step, and phase offsets (fullsnes "ADSR/Gain Rates").
const RATE = [0,2048,1536,1280,1024,768,640,512,384,320,256,192,160,128,96,80,64,48,40,32,24,20,16,12,10,8,6,5,4,3,2,1];
const OFFS = [0,0,1040,536,0,1040,536,0,1040,536,0,1040,536,0,1040,536,0,1040,536,0,1040,536,0,1040,536,0,1040,536,0,1040,0,0];
const ATTACK = 0, DECAY = 1, SUSTAIN = 2, RELEASE = 3;

const s8 = (v) => (v << 24) >> 24;
const s16 = (v) => (v << 16) >> 16;
const clamp16 = (v) => (v > 32767 ? 32767 : v < -32768 ? -32768 : v);

class Voice {
  constructor() { this.buf = new Int16Array(19); this.reset(); }
  reset() {
    this.buf.fill(0); this.addr = 0; this.header = 0; this.pos = 0;
    this.env = 0; this.hidden = 0; this.mode = RELEASE; this.delay = 0; this.out = 0;
  }
}

export class Apu {
  constructor() {
    this.ram = new Uint8Array(0x10000);
    this.regs = new Uint8Array(128);   // DSP registers
    this.voices = Array.from({ length: 8 }, () => new Voice());
    this.echoHist = [new Int16Array(8), new Int16Array(8)];
    this.reset();
  }

  reset() {
    this.a = this.x = this.y = 0; this.sp = 0xEF; this.pc = 0xFFC0; this.psw = 0x02;
    this.halted = true; this.cycles = 0;
    this.portIn = new Uint8Array(4); this.portOut = new Uint8Array(4);
    this.dspAddr = 0;
    this.tEnable = 0; this.tTarget = [0, 0, 0]; this.tStage = [0, 0, 0]; this.tOut = [0, 0, 0]; this.tSub = [0, 0, 0];
    this.resetDsp();
  }

  resetDsp() {
    this.regs.fill(0); this.regs[0x6C] = 0xE0;
    for (const v of this.voices) v.reset();
    this.counter = 0; this.kon = 0; this.noise = 0x4000; this.echoPos = 0; this.echoLen = 0; this.echoIdx = 0;
    this.echoHist[0].fill(0); this.echoHist[1].fill(0);
  }

  // Copy upload blocks straight into RAM and start the driver, as the IPL ROM would.
  load(blocks, entry) {
    for (const [addr, data] of blocks) this.ram.set(data, addr);
    this.resetDsp();
    this.a = this.x = this.y = 0; this.sp = 0xEF; this.psw = 0x02; this.pc = entry; this.halted = false;
  }

  // ---- memory ----
  read(a) {
    if (a >= 0xF0 && a <= 0xFF) {
      switch (a) {
        case 0xF2: return this.dspAddr;
        case 0xF3: return this.regs[this.dspAddr & 0x7F];
        case 0xF4: case 0xF5: case 0xF6: case 0xF7: return this.portIn[a - 0xF4];
        case 0xFD: case 0xFE: case 0xFF: { const i = a - 0xFD, v = this.tOut[i]; this.tOut[i] = 0; return v; }
        case 0xF8: case 0xF9: return this.ram[a];
        default: return 0;
      }
    }
    return this.ram[a];
  }

  write(a, v) {
    if (a >= 0xF0 && a <= 0xFF) {
      switch (a) {
        case 0xF1:
          for (let i = 0; i < 3; i++) if ((v >> i & 1) && !(this.tEnable >> i & 1)) { this.tStage[i] = 0; this.tOut[i] = 0; }
          this.tEnable = v & 7;
          if (v & 0x10) { this.portIn[0] = 0; this.portIn[1] = 0; this.portsCleared = true; }
          if (v & 0x20) { this.portIn[2] = 0; this.portIn[3] = 0; }
          break;
        case 0xF2: this.dspAddr = v; break;
        case 0xF3: if (this.dspAddr < 0x80) this.dspWrite(this.dspAddr, v); break;
        case 0xF4: case 0xF5: case 0xF6: case 0xF7: this.portOut[a - 0xF4] = v; break;
        case 0xFA: case 0xFB: case 0xFC: this.tTarget[a - 0xFA] = v; break;
      }
    }
    this.ram[a] = v;
  }

  dp(a) { return (this.psw & 0x20 ? 0x100 : 0) | (a & 0xFF); }
  rd(a) { return this.read(this.dp(a)); }
  wd(a, v) { this.write(this.dp(a), v); }
  fetch() { const v = this.ram[this.pc]; this.pc = (this.pc + 1) & 0xFFFF; return v; }
  fetchw() { const l = this.fetch(); return l | (this.fetch() << 8); }
  push(v) { this.ram[0x100 | this.sp] = v; this.sp = (this.sp - 1) & 0xFF; }
  pop() { this.sp = (this.sp + 1) & 0xFF; return this.ram[0x100 | this.sp]; }
  rdw(d) { return this.rd(d) | (this.rd((d + 1) & 0xFF) << 8); }

  // ---- flags ----
  nz(v) { this.psw = (this.psw & 0x7D) | (v & 0x80) | ((v & 0xFF) ? 0 : 2); return v & 0xFF; }
  get C() { return this.psw & 1; }
  setC(c) { this.psw = (this.psw & 0xFE) | (c ? 1 : 0); }
  adc(a, b) {
    const c = this.C, r = a + b + c;
    this.psw &= ~0x4B;
    if (r > 0xFF) this.psw |= 1;
    if (~(a ^ b) & (a ^ r) & 0x80) this.psw |= 0x40;
    if ((a ^ b ^ r) & 0x10) this.psw |= 0x08;
    return this.nz(r);
  }
  sbc(a, b) { return this.adc(a, b ^ 0xFF); }
  cmp(a, b) { const r = a - b; this.setC(r >= 0); this.nz(r); }
  alu(op, a, b) {
    switch (op) {
      case 0: return this.nz(a | b);
      case 1: return this.nz(a & b);
      case 2: return this.nz(a ^ b);
      case 3: this.cmp(a, b); return a;
      case 4: return this.adc(a, b);
      case 5: return this.sbc(a, b);
    }
  }
  branch(c) { const r = s8(this.fetch()); if (c) { this.pc = (this.pc + r) & 0xFFFF; this.cycles += 2; } }
  // 13-bit address + 3-bit bit index operand of the mem.bit opcodes
  mbit() { const w = this.fetchw(); return [w & 0x1FFF, w >> 13]; }

  // Execute one instruction.
  step() {
    if (this.halted) { this.cycles += 2; return; }
    const op = this.fetch();
    this.cycles += CYC[op];
    const lo = op & 0x0F, hi = op >> 4;
    // the regular ALU block: OR/AND/EOR/CMP/ADC/SBC on A (columns 4-9, rows 0-B)
    if (hi < 0xC && lo >= 4 && lo <= 9) {
      const f = hi >> 1, odd = hi & 1;
      let a, b;
      switch (lo) {
        case 4: b = odd ? this.rd(this.fetch() + this.x) : this.rd(this.fetch()); break;
        case 5: { const w = this.fetchw(); b = this.read(odd ? (w + this.x) & 0xFFFF : w); break; }
        case 6: if (odd) { const w = this.fetchw(); b = this.read((w + this.y) & 0xFFFF); } else b = this.rd(this.x); break;
        case 7: {
          const d = this.fetch();
          const p = odd ? (this.rdw(d) + this.y) & 0xFFFF : this.rdw((d + this.x) & 0xFF);
          b = this.read(p); break;
        }
        case 8:
          if (!odd) { b = this.fetch(); break; }
          { const i = this.fetch(), d = this.fetch(); const r = this.alu(f, this.rd(d), i); if (f !== 3) this.wd(d, r); return; }
        case 9: {
          let src, dst;
          if (odd) { src = this.rd(this.y); dst = this.x; } else { src = this.rd(this.fetch()); dst = this.fetch(); }
          const r = this.alu(f, this.rd(dst), src); if (f !== 3) this.wd(dst, r); return;
        }
      }
      a = this.alu(f, this.a, b); this.a = a; return;
    }
    let t, d, w;
    switch (op) {
      // column 0: branches and flag ops
      case 0x00: break;
      case 0x10: this.branch(!(this.psw & 0x80)); break;
      case 0x30: this.branch(this.psw & 0x80); break;
      case 0x50: this.branch(!(this.psw & 0x40)); break;
      case 0x70: this.branch(this.psw & 0x40); break;
      case 0x90: this.branch(!(this.psw & 1)); break;
      case 0xB0: this.branch(this.psw & 1); break;
      case 0xD0: this.branch(!(this.psw & 2)); break;
      case 0xF0: this.branch(this.psw & 2); break;
      case 0x2F: this.branch(true); this.cycles -= 2; break;
      case 0x20: this.psw &= ~0x20; break;
      case 0x40: this.psw |= 0x20; break;
      case 0x60: this.psw &= ~1; break;
      case 0x80: this.psw |= 1; break;
      case 0xA0: this.psw |= 0x04; break;
      case 0xC0: this.psw &= ~0x04; break;
      case 0xE0: this.psw &= ~0x48; break;
      case 0xED: this.psw ^= 1; break;

      // ALU on X/Y and moves (columns 8, 9, D, E, F)
      case 0xC8: this.cmp(this.x, this.fetch()); break;
      case 0xAD: this.cmp(this.y, this.fetch()); break;
      case 0x1E: this.cmp(this.x, this.read(this.fetchw())); break;
      case 0x3E: this.cmp(this.x, this.rd(this.fetch())); break;
      case 0x5E: this.cmp(this.y, this.read(this.fetchw())); break;
      case 0x7E: this.cmp(this.y, this.rd(this.fetch())); break;
      case 0xE8: this.a = this.nz(this.fetch()); break;
      case 0xCD: this.x = this.nz(this.fetch()); break;
      case 0x8D: this.y = this.nz(this.fetch()); break;
      case 0x7D: this.a = this.nz(this.x); break;
      case 0x5D: this.x = this.nz(this.a); break;
      case 0xDD: this.a = this.nz(this.y); break;
      case 0xFD: this.y = this.nz(this.a); break;
      case 0x9D: this.x = this.nz(this.sp); break;
      case 0xBD: this.sp = this.x; break;
      case 0xE4: this.a = this.nz(this.rd(this.fetch())); break;
      case 0xF4: this.a = this.nz(this.rd(this.fetch() + this.x)); break;
      case 0xE5: this.a = this.nz(this.read(this.fetchw())); break;
      case 0xF5: this.a = this.nz(this.read((this.fetchw() + this.x) & 0xFFFF)); break;
      case 0xF6: this.a = this.nz(this.read((this.fetchw() + this.y) & 0xFFFF)); break;
      case 0xE6: this.a = this.nz(this.rd(this.x)); break;
      case 0xBF: this.a = this.nz(this.rd(this.x)); this.x = (this.x + 1) & 0xFF; break;
      case 0xF7: d = this.fetch(); this.a = this.nz(this.read((this.rdw(d) + this.y) & 0xFFFF)); break;
      case 0xE7: d = this.fetch(); this.a = this.nz(this.read(this.rdw((d + this.x) & 0xFF))); break;
      case 0xF8: this.x = this.nz(this.rd(this.fetch())); break;
      case 0xF9: this.x = this.nz(this.rd(this.fetch() + this.y)); break;
      case 0xE9: this.x = this.nz(this.read(this.fetchw())); break;
      case 0xEB: this.y = this.nz(this.rd(this.fetch())); break;
      case 0xFB: this.y = this.nz(this.rd(this.fetch() + this.x)); break;
      case 0xEC: this.y = this.nz(this.read(this.fetchw())); break;
      case 0xC4: this.wd(this.fetch(), this.a); break;
      case 0xD4: this.wd(this.fetch() + this.x, this.a); break;
      case 0xC5: this.write(this.fetchw(), this.a); break;
      case 0xD5: this.write((this.fetchw() + this.x) & 0xFFFF, this.a); break;
      case 0xD6: this.write((this.fetchw() + this.y) & 0xFFFF, this.a); break;
      case 0xC6: this.wd(this.x, this.a); break;
      case 0xAF: this.wd(this.x, this.a); this.x = (this.x + 1) & 0xFF; break;
      case 0xD7: d = this.fetch(); this.write((this.rdw(d) + this.y) & 0xFFFF, this.a); break;
      case 0xC7: d = this.fetch(); this.write(this.rdw((d + this.x) & 0xFF), this.a); break;
      case 0xD8: this.wd(this.fetch(), this.x); break;
      case 0xD9: this.wd(this.fetch() + this.y, this.x); break;
      case 0xC9: this.write(this.fetchw(), this.x); break;
      case 0xCB: this.wd(this.fetch(), this.y); break;
      case 0xDB: this.wd(this.fetch() + this.x, this.y); break;
      case 0xCC: this.write(this.fetchw(), this.y); break;
      case 0xFA: t = this.rd(this.fetch()); this.wd(this.fetch(), t); break;
      case 0x8F: t = this.fetch(); this.wd(this.fetch(), t); break;

      // shifts and inc/dec (columns B, C)
      case 0x0B: case 0x1B: case 0x2B: case 0x3B: case 0x4B: case 0x5B: case 0x6B: case 0x7B:
      case 0x8B: case 0x9B: case 0xAB: case 0xBB:
        d = this.dp(this.fetch() + ((op & 0x10) ? this.x : 0));
        this.write(d, this.rmw(hi >> 1, this.read(d))); break;
      case 0x0C: case 0x2C: case 0x4C: case 0x6C: case 0x8C: case 0xAC:
        w = this.fetchw(); this.write(w, this.rmw(hi >> 1, this.read(w))); break;
      case 0x1C: case 0x3C: case 0x5C: case 0x7C: case 0x9C: case 0xBC:
        this.a = this.rmw(hi >> 1, this.a); break;
      case 0x1D: this.x = this.nz(this.x - 1); break;
      case 0x3D: this.x = this.nz(this.x + 1); break;
      case 0xDC: this.y = this.nz(this.y - 1); break;
      case 0xFC: this.y = this.nz(this.y + 1); break;

      // 16-bit ops
      case 0x1A: case 0x3A: {
        d = this.fetch(); const r = (this.rdw(d) + (op === 0x3A ? 1 : -1)) & 0xFFFF;
        this.wd(d, r & 0xFF); this.wd((d + 1) & 0xFF, r >> 8);
        this.psw = (this.psw & 0x7D) | ((r >> 8) & 0x80) | (r ? 0 : 2); break;
      }
      case 0x5A: {
        const m = this.rdw(this.fetch()), ya = (this.y << 8) | this.a, r = ya - m;
        this.setC(r >= 0); this.psw = (this.psw & 0x7D) | ((r >> 8) & 0x80) | ((r & 0xFFFF) ? 0 : 2); break;
      }
      case 0x7A: case 0x9A: {
        let m = this.rdw(this.fetch()); const ya = (this.y << 8) | this.a;
        if (op === 0x9A) m = (m ^ 0xFFFF);
        const c = op === 0x9A ? 1 : 0, r = ya + m + c;
        this.psw &= ~0xCB;
        if (r > 0xFFFF) this.psw |= 1;
        if (~(ya ^ m) & (ya ^ r) & 0x8000) this.psw |= 0x40;
        if ((ya ^ m ^ r) & 0x1000) this.psw |= 0x08;
        const rr = r & 0xFFFF; this.psw |= (rr >> 8) & 0x80; if (!rr) this.psw |= 2;
        this.a = rr & 0xFF; this.y = rr >> 8; break;
      }
      case 0xBA: {
        const v = this.rdw(this.fetch()); this.a = v & 0xFF; this.y = v >> 8;
        this.psw = (this.psw & 0x7D) | (this.y & 0x80) | (v ? 0 : 2); break;
      }
      case 0xDA: d = this.fetch(); this.wd(d, this.a); this.wd((d + 1) & 0xFF, this.y); break;
      case 0xCF: { const r = this.y * this.a; this.a = r & 0xFF; this.y = r >> 8; this.nz(this.y); break; }
      case 0x9E: {
        const ya = (this.y << 8) | this.a, x = this.x;
        this.psw &= ~0x48;
        if (this.y >= x) this.psw |= 0x40;
        if ((this.y & 15) >= (x & 15)) this.psw |= 0x08;
        if (this.y < (x << 1)) { this.a = Math.floor(ya / x) & 0xFF; this.y = (ya % x) & 0xFF; }
        else { this.a = (255 - Math.floor((ya - (x << 9)) / (256 - x))) & 0xFF; this.y = (x + (ya - (x << 9)) % (256 - x)) & 0xFF; }
        this.nz(this.a); break;
      }
      case 0xDF:
        if ((this.psw & 1) || this.a > 0x99) { this.a = (this.a + 0x60) & 0xFF; this.psw |= 1; }
        if ((this.psw & 8) || (this.a & 15) > 9) this.a = (this.a + 6) & 0xFF;
        this.nz(this.a); break;
      case 0xBE:
        if (!(this.psw & 1) || this.a > 0x99) { this.a = (this.a - 0x60) & 0xFF; this.psw &= ~1; }
        if (!(this.psw & 8) || (this.a & 15) > 9) this.a = (this.a - 6) & 0xFF;
        this.nz(this.a); break;
      case 0x9F: this.a = this.nz((this.a >> 4) | (this.a << 4)); break;

      // bit ops
      case 0x0E: case 0x4E: {
        w = this.fetchw(); t = this.read(w); this.nz(this.a - t);
        this.write(w, op === 0x0E ? t | this.a : t & ~this.a & 0xFF); break;
      }
      case 0x0A: case 0x2A: case 0x4A: case 0x6A: case 0x8A: case 0xAA: {
        const [m, b] = this.mbit(); let bit = (this.read(m) >> b) & 1;
        if (op === 0x2A || op === 0x6A) bit ^= 1;
        if (op <= 0x2A) this.setC(this.C | bit);
        else if (op <= 0x6A) this.setC(this.C & bit);
        else if (op === 0x8A) this.setC(this.C ^ bit);
        else this.setC(bit);
        break;
      }
      case 0xCA: { const [m, b] = this.mbit(); this.write(m, (this.read(m) & ~(1 << b)) | (this.C << b)); break; }
      case 0xEA: { const [m, b] = this.mbit(); this.write(m, this.read(m) ^ (1 << b)); break; }

      // stack, calls, jumps
      case 0x0D: this.push(this.psw); break;
      case 0x2D: this.push(this.a); break;
      case 0x4D: this.push(this.x); break;
      case 0x6D: this.push(this.y); break;
      case 0x8E: this.psw = this.pop(); break;
      case 0xAE: this.a = this.pop(); break;
      case 0xCE: this.x = this.pop(); break;
      case 0xEE: this.y = this.pop(); break;
      case 0x2E: d = this.fetch(); t = this.rd(d); this.branch(t !== this.a); break;
      case 0xDE: d = this.fetch(); t = this.rd(d + this.x); this.branch(t !== this.a); break;
      case 0x6E: d = this.fetch(); t = (this.rd(d) - 1) & 0xFF; this.wd(d, t); this.branch(t !== 0); break;
      case 0xFE: this.y = (this.y - 1) & 0xFF; this.branch(this.y !== 0); break;
      case 0x1F: w = (this.fetchw() + this.x) & 0xFFFF; this.pc = this.ram[w] | (this.ram[(w + 1) & 0xFFFF] << 8); break;
      case 0x5F: this.pc = this.fetchw(); break;
      case 0x3F: w = this.fetchw(); this.push(this.pc >> 8); this.push(this.pc & 0xFF); this.pc = w; break;
      case 0x4F: w = this.fetch(); this.push(this.pc >> 8); this.push(this.pc & 0xFF); this.pc = 0xFF00 | w; break;
      case 0x6F: this.pc = this.pop(); this.pc |= this.pop() << 8; break;
      case 0x7F: this.psw = this.pop(); this.pc = this.pop(); this.pc |= this.pop() << 8; break;
      case 0x0F:
        this.push(this.pc >> 8); this.push(this.pc & 0xFF); this.push(this.psw);
        this.psw = (this.psw | 0x10) & ~0x04; this.pc = this.ram[0xFFDE] | (this.ram[0xFFDF] << 8); break;
      case 0xEF: case 0xFF: this.halted = true; break;
      default:
        if (lo === 1) { // TCALL n
          w = 0xFFDE - hi * 2; this.push(this.pc >> 8); this.push(this.pc & 0xFF);
          this.pc = this.ram[w] | (this.ram[w + 1] << 8);
        } else if (lo === 2) { // SET1 / CLR1 d.b
          d = this.fetch(); const b = 1 << (hi >> 1);
          this.wd(d, hi & 1 ? this.rd(d) & ~b : this.rd(d) | b);
        } else if (lo === 3) { // BBS / BBC d.b,rel
          d = this.fetch(); const set = (this.rd(d) >> (hi >> 1)) & 1;
          this.branch(hi & 1 ? !set : set);
        }
    }
  }

  // ASL ROL LSR ROR DEC INC, selected by row/2
  rmw(k, v) {
    let r;
    switch (k) {
      case 0: this.setC(v & 0x80); r = v << 1; break;
      case 1: r = (v << 1) | this.C; this.setC(v & 0x80); break;
      case 2: this.setC(v & 1); r = v >> 1; break;
      case 3: r = (v >> 1) | (this.C << 7); this.setC(v & 1); break;
      case 4: r = v - 1; break;
      case 5: r = v + 1; break;
    }
    return this.nz(r);
  }

  // Run the CPU for 32 cycles and produce one stereo frame into out[0..1].
  sample(out) {
    const end = 32;
    while (this.cycles < end) {
      const before = this.cycles;
      this.step();
      this.clockTimers(this.cycles - before);
    }
    this.cycles -= end;
    this.dspSample(out);
  }

  clockTimers(n) {
    for (let i = 0; i < 3; i++) {
      const period = i === 2 ? 16 : 128;
      this.tSub[i] += n;
      while (this.tSub[i] >= period) {
        this.tSub[i] -= period;
        if (!(this.tEnable >> i & 1)) continue;
        this.tStage[i] = (this.tStage[i] + 1) & 0xFF;
        if (this.tStage[i] === this.tTarget[i]) { this.tStage[i] = 0; this.tOut[i] = (this.tOut[i] + 1) & 15; }
      }
    }
  }

  // ---- S-DSP ----
  dspWrite(r, v) {
    this.regs[r] = v;
    if (r === 0x4C) this.kon |= v;          // key-on latched until the next sample
    else if (r === 0x7C) this.regs[0x7C] = 0; // ENDX: any write clears
  }

  tick(rate) { return rate && (this.counter + OFFS[rate]) % RATE[rate] === 0; }

  keyOn(i) {
    const v = this.voices[i], dir = this.regs[0x5D] << 8, src = this.regs[i * 16 + 4];
    v.addr = this.ram[(dir + src * 4) & 0xFFFF] | (this.ram[(dir + src * 4 + 1) & 0xFFFF] << 8);
    v.buf.fill(0); v.pos = 0; v.env = 0; v.hidden = 0; v.mode = ATTACK; v.delay = 5;
    this.decodeBlock(v);
    this.regs[0x7C] &= ~(1 << i);
  }

  decodeBlock(v) {
    const ram = this.ram, b = v.buf;
    b[0] = b[16]; b[1] = b[17]; b[2] = b[18];
    const h = ram[v.addr]; v.header = h;
    const shift = h >> 4, filter = (h >> 2) & 3;
    for (let i = 0; i < 16; i++) {
      const byte = ram[(v.addr + 1 + (i >> 1)) & 0xFFFF];
      const n = ((i & 1 ? byte << 28 : byte << 24) >> 28);
      let s = shift <= 12 ? (n << shift) >> 1 : (n < 0 ? -2048 : 0);
      const p1 = b[i + 2], p2 = b[i + 1] >> 1;
      if (filter === 1) { s += p1 >> 1; s += (-p1) >> 5; }
      else if (filter === 2) { s += p1; s -= p2; s += p2 >> 4; s += (p1 * -3) >> 6; }
      else if (filter === 3) { s += p1; s -= p2; s += (p1 * -13) >> 7; s += (p2 * 3) >> 4; }
      b[i + 3] = s16(clamp16(s) * 2);
    }
  }

  dspSample(out) {
    const R = this.regs, ram = this.ram;
    if (--this.counter < 0) this.counter = 30720 - 1;
    if (this.tick(R[0x6C] & 31)) {
      const fb = (this.noise << 13) ^ (this.noise << 14);
      this.noise = (fb & 0x4000) ^ (this.noise >> 1);
    }
    const kon = this.kon; this.kon = 0;
    const koff = R[0x5C], flg = R[0x6C], pmon = R[0x2D], non = R[0x3D], eon = R[0x4D];
    let ml = 0, mr = 0, el = 0, er = 0, prevOut = 0;
    for (let i = 0; i < 8; i++) {
      const v = this.voices[i], base = i * 16;
      if (kon >> i & 1) this.keyOn(i);
      if ((koff >> i & 1) || (flg & 0x80)) { if (v.mode !== RELEASE) v.mode = RELEASE; if (flg & 0x80) v.env = 0; }
      let output = 0;
      if (v.delay > 0) {
        v.delay--;
      } else {
        // interpolate
        let o;
        if (non >> i & 1) o = s16(this.noise * 2);
        else {
          const g = (v.pos >> 4) & 0xFF, s = v.pos >> 12, b = v.buf;
          o = (GAUSS[255 - g] * b[s]) >> 11;
          o += (GAUSS[511 - g] * b[s + 1]) >> 11;
          o += (GAUSS[256 + g] * b[s + 2]) >> 11;
          o = s16(o);
          o += (GAUSS[g] * b[s + 3]) >> 11;
          o = clamp16(o) & ~1;
        }
        output = ((o * v.env) >> 11) & ~1;
        this.runEnvelope(v, base);
        // advance pitch
        let step = (R[base + 2] | (R[base + 3] << 8)) & 0x3FFF;
        if (i > 0 && (pmon >> i & 1)) step += ((prevOut >> 5) * step) >> 10;
        v.pos += step;
        while (v.pos >= 0x10000) {
          v.pos -= 0x10000;
          if (v.header & 1) {
            this.regs[0x7C] |= 1 << i;
            const dir = R[0x5D] << 8, src = R[base + 4];
            v.addr = ram[(dir + src * 4 + 2) & 0xFFFF] | (ram[(dir + src * 4 + 3) & 0xFFFF] << 8);
          } else v.addr = (v.addr + 9) & 0xFFFF;
          this.decodeBlock(v);
        }
        if ((v.header & 3) === 1) { v.mode = RELEASE; v.env = 0; }
      }
      v.out = output; prevOut = output;
      R[base + 8] = v.env >> 4;
      R[base + 9] = (output >> 8) & 0xFF;
      const l = (output * s8(R[base])) >> 7, r = (output * s8(R[base + 1])) >> 7;
      ml = clamp16(ml + l); mr = clamp16(mr + r);
      if (eon >> i & 1) { el = clamp16(el + l); er = clamp16(er + r); }
    }

    // echo
    const ea = ((R[0x6D] << 8) + this.echoPos) & 0xFFFF;
    const hl = this.echoHist[0], hr = this.echoHist[1];
    this.echoIdx = (this.echoIdx + 1) & 7;
    hl[this.echoIdx] = s16(ram[ea] | (ram[(ea + 1) & 0xFFFF] << 8)) >> 1;
    hr[this.echoIdx] = s16(ram[(ea + 2) & 0xFFFF] | (ram[(ea + 3) & 0xFFFF] << 8)) >> 1;
    let fl = 0, fr = 0;
    for (let k = 0; k < 7; k++) {
      const c = s8(R[k * 16 + 0x0F]), j = (this.echoIdx + 1 + k) & 7;
      fl += (hl[j] * c) >> 6; fr += (hr[j] * c) >> 6;
    }
    fl = s16(fl); fr = s16(fr);
    const c7 = s8(R[0x7F]);
    fl = clamp16(fl + ((hl[this.echoIdx] * c7) >> 6)); fr = clamp16(fr + ((hr[this.echoIdx] * c7) >> 6));
    let outl = clamp16(((ml * s8(R[0x0C])) >> 7) + ((fl * s8(R[0x2C])) >> 7));
    let outr = clamp16(((mr * s8(R[0x1C])) >> 7) + ((fr * s8(R[0x3C])) >> 7));
    if (!(flg & 0x20)) {
      const wl = clamp16(el + ((fl * s8(R[0x0D])) >> 7)) & ~1, wr = clamp16(er + ((fr * s8(R[0x0D])) >> 7)) & ~1;
      ram[ea] = wl & 0xFF; ram[(ea + 1) & 0xFFFF] = (wl >> 8) & 0xFF;
      ram[(ea + 2) & 0xFFFF] = wr & 0xFF; ram[(ea + 3) & 0xFFFF] = (wr >> 8) & 0xFF;
    }
    if (this.echoPos === 0) this.echoLen = (R[0x7D] & 15) * 0x800 || 4;
    this.echoPos += 4;
    if (this.echoPos >= this.echoLen) this.echoPos = 0;
    if (flg & 0x40) outl = outr = 0;
    out[0] = outl; out[1] = outr;
  }

  runEnvelope(v, base) {
    const R = this.regs;
    let env = v.env;
    if (v.mode === RELEASE) { env -= 8; if (env < 0) env = 0; v.env = env; return; }
    let rate, data;
    const adsr1 = R[base + 5];
    if (adsr1 & 0x80) {
      data = R[base + 6];
      if (v.mode >= DECAY) {
        env--; env -= env >> 8;
        rate = v.mode === DECAY ? ((adsr1 >> 3) & 0x0E) + 0x10 : data & 0x1F;
      } else {
        rate = (adsr1 & 0x0F) * 2 + 1;
        env += rate < 31 ? 0x20 : 0x400;
      }
    } else {
      data = R[base + 7];
      const mode = data >> 5;
      if (mode < 4) { env = data * 0x10; rate = 31; }
      else {
        rate = data & 0x1F;
        if (mode === 4) env -= 0x20;
        else if (mode < 6) { env--; env -= env >> 8; }
        else { env += 0x20; if (mode > 6 && (v.hidden >>> 0) >= 0x600) env += 0x8 - 0x20; }
      }
    }
    if ((env >> 8) === (data >> 5) && v.mode === DECAY) v.mode = SUSTAIN;
    v.hidden = env;
    if (env < 0 || env > 0x7FF) { env = env < 0 ? 0 : 0x7FF; if (v.mode === ATTACK) v.mode = DECAY; }
    if (this.tick(rate)) v.env = env;
  }
}
