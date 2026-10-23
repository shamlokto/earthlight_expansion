// Earth Light sound and music, played by emulating the SNES sound unit with the
// game's own SPC700 driver, songs and samples uploaded from the ROM (assets 822-834).
// See docs/FORMATS.md "Sound".

// $00:A839: per song group, the two upload slots (index into SLOT_ASSETS, 0xFF = none)
export const GROUPS = [[0, 0xFF], [1, 2], [3, 0xFF], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 0xFF]];
// $00:A851: slot value -> asset number
export const SLOT_ASSETS = [822, 823, 833, 832, 829, 830, 826, 827, 828, 825, 831, 824, 834];

// Upload stream: repeated [len16][addr16][len bytes], len 0 ends it and gives the entry point.
export function uploadBlocks(data) {
  const blocks = []; let i = 0;
  for (;;) {
    const n = data[i] | (data[i + 1] << 8), a = data[i + 2] | (data[i + 3] << 8); i += 4;
    if (!n) return { blocks, entry: a };
    blocks.push([a, data.slice(i, i + n)]); i += n;
  }
}

export class Sound {
  constructor(rom) {
    this.rom = rom;
    this.ctx = null; this.node = null;
    this.slots = [0xFF, 0xFF];   // $0A4F/$0A50: what is already uploaded
    this.group = -1;
    this.muted = false; this.song = null;
    this.volume = 0.8;
  }

  // Create the AudioContext (call from a user gesture) and boot the driver (group 0).
  async start() {
    if (this.ctx) { if (this.ctx.state !== 'running') await this.ctx.resume(); return this; }
    let ctx;
    try { ctx = new AudioContext({ sampleRate: 32000 }); } catch { ctx = new AudioContext(); }
    this.ctx = ctx;
    await ctx.audioWorklet.addModule(new URL('./worklet.js', import.meta.url));
    this.node = new AudioWorkletNode(ctx, 'spc-processor', { outputChannelCount: [2] });
    this.node.connect(ctx.destination);
    this.applyGain();
    this.loadGroup(0);
    if (ctx.state !== 'running') await ctx.resume();
    return this;
  }

  // $00:A799: upload a song group (skipping slots that are already in place) and restart the driver.
  loadGroup(n) {
    if (!this.node || n === this.group) return;
    const blocks = []; let entry = 0x0800;
    GROUPS[n].forEach((v, s) => {
      if (v === this.slots[s]) return;
      this.slots[s] = v;
      if (v & 0x80) return;
      const up = uploadBlocks(this.rom.body(SLOT_ASSETS[v]));
      blocks.push(...up.blocks); entry = up.entry;
    });
    this.group = n;
    this.node.port.postMessage({ type: 'load', blocks, entry });
  }

  // Raw command byte to the driver, as the game writes it to $0A51/$0A52.
  command(value, param = 0) {
    if (this.node) this.node.port.postMessage({ type: 'cmd', value, param });
  }

  // Songs are {group, cmd} pairs (from soundTest() or mapMusic()); same song = no restart.
  playSong(s) {
    if (!s || !this.node || (this.song && this.song.group === s.group && this.song.cmd === s.cmd)) return;
    this.song = { group: s.group, cmd: s.cmd };
    if (s.group !== 0xFF) this.loadGroup(s.group);
    this.command(s.cmd);
  }

  // Sound effects are commands $04-$42 (voices 6-7); they mix over the music.
  playSfx(id) { this.command(id); }

  // $00:A80C: fade the music out (command $FE, speed $32).
  fadeOut(speed = 0x32) { this.command(0xFE, speed); }

  // Command 1 keys off everything (sound test entry 0); 2 stops the music, 3 the effects.
  stop() { this.song = null; this.command(1); }

  setMuted(m) { this.muted = m; this.applyGain(); }
  setVolume(v) { this.volume = v; this.applyGain(); }
  applyGain() { if (this.node) this.node.port.postMessage({ type: 'gain', value: this.muted ? 0 : this.volume }); }
}

// The game's sound test ($02:D4C6, 113 entries of [cmd, group] at $02:D500; group $FF = keep).
export function soundTest(rom) {
  const out = [];
  for (let i = 0; i < 0x71; i++) out.push({ index: i, cmd: rom.byteAt(0x02D500 + i * 2), group: rom.byteAt(0x02D501 + i * 2) });
  return out;
}

// Song/SFX table of a group: the $1400 block starts with one pointer per command (cmd 1 = entry 0).
// Each entry is a voice mask (bits 0-5 = music voices, 6-7 = sound-effect voices) and 8 track pointers.
export function trackTable(rom, group) {
  const asset = SLOT_ASSETS[GROUPS[group][0]];
  const blk = uploadBlocks(rom.body(asset)).blocks.find(([a]) => a === 0x1400);
  if (!blk) return [];
  const d = blk[1], ptr = (i) => d[i * 2] | (d[i * 2 + 1] << 8), n = (ptr(0) - 0x1400) >> 1, out = [];
  for (let i = 0; i < n; i++) {
    const o = ptr(i) - 0x1400, mask = d[o];
    let tracks = 0;
    for (let v = 0; v < 8; v++) if (d[o + 1 + v * 2] | d[o + 2 + v * 2]) tracks |= 1 << v;
    out.push({ cmd: i + 1, mask, tracks, kind: !tracks ? 'control' : (tracks & 0x3F) ? 'music' : 'sfx' });
  }
  return out;
}

// Map music ($02:DD2A): table $02:DE32 (group) / $02:DE6E (cmd), indexed by map + 30 on army B's
// phase. Maps whose group is 4 or 7 always keep their own song. Otherwise, when one army has at
// least twice the other's unit count ($02:DDE3, flags $06EA/$06EB), the phase plays a tension
// track from group 5 (army A) or 8 (army B). $06EC/$06ED (event music, set by map scripts)
// pick cmd $4F of the same groups.
export function mapMusic(rom, map, side, countA = 0, countB = 0, event = false) {
  const x = map + (side ? 30 : 0);
  const group = rom.byteAt(0x02DE32 + x), cmd = rom.byteAt(0x02DE6E + x);
  const g = side ? 8 : 5;
  if (event) return { group: g, cmd: 0x4F };
  if (group === 4 || group === 7) return { group, cmd };
  const known = countA > 0 && countB > 0;
  const aWins = known && (countA >> 1) >= countB, bWins = known && (countB >> 1) >= countA;
  if (aWins) return { group: g, cmd: side ? 0x4E : 0x4D };
  if (bWins) return { group: g, cmd: side ? 0x4D : 0x4E };
  return { group, cmd };
}
