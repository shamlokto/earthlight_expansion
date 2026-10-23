// AudioWorklet that runs the emulated sound unit (spc.js) in real time.
// Messages: {type:'load', blocks:[[addr, Uint8Array]], entry} uploads and restarts the driver;
// {type:'cmd', value, param} queues a sound command; {type:'gain', value};
// {type:'meter', on} makes it post {type:'meter', env:[8]} about 30 times a second.
import { Apu } from './spc.js';

const FRAME = 32000 / 60; // the game sends at most one command per video frame

class SpcProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.apu = new Apu();
    this.queue = [];
    this.toggle = 0;
    this.sinceCmd = FRAME; this.hold = 0;
    this.gain = 1;
    this.buf = new Int16Array(2);
    this.prev = [0, 0]; this.cur = [0, 0]; this.frac = 1;
    this.step = 32000 / sampleRate;
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  onMessage(m) {
    const apu = this.apu;
    if (m.type === 'load') {
      apu.load(m.blocks, m.entry);
      // $00:A883 leaves the ports like this, then $00:A7F3 writes 1 to port 0
      apu.portIn.set([1, 0, m.entry & 0xFF, m.entry >> 8]);
      // the driver clears its input ports ~27 ms into its init ($F1 = $F0); hold commands until then
      apu.portsCleared = false; this.hold = 32000 / 5;
      this.toggle = 0; this.queue.length = 0; this.sinceCmd = 0;
    } else if (m.type === 'cmd') {
      this.queue.push(m);
    } else if (m.type === 'meter') {
      this.meter = m.on; this.meterN = 0;
    } else if (m.type === 'gain') {
      this.gain = m.value;
    }
  }

  // one 32 kHz frame from the emulator, sending queued commands like $00:A817 does
  next() {
    if (this.hold > 0 && (this.apu.portsCleared || --this.hold === 0)) this.hold = 0;
    if (++this.sinceCmd >= FRAME && this.queue.length && !this.hold) {
      const c = this.queue.shift();
      this.apu.portIn[0] = c.value | this.toggle;
      this.apu.portIn[1] = c.param || 0;
      this.toggle ^= 0x80; this.sinceCmd = 0;
    }
    this.apu.sample(this.buf);
    if (this.meter && ++this.meterN >= 1024) { // voice envelopes for level meters
      this.meterN = 0;
      this.port.postMessage({ type: 'meter', env: Array.from({ length: 8 }, (_, v) => this.apu.regs[v * 16 + 8]) });
    }
    this.prev[0] = this.cur[0]; this.prev[1] = this.cur[1];
    this.cur[0] = this.buf[0] / 32768; this.cur[1] = this.buf[1] / 32768;
  }

  process(inputs, outputs) {
    const out = outputs[0], L = out[0], R = out[1] || out[0], g = this.gain;
    for (let i = 0; i < L.length; i++) {
      // linear resampling from 32 kHz to the context rate (a no-op when it is 32 kHz)
      while (this.frac >= 1) { this.next(); this.frac -= 1; }
      const f = this.frac;
      L[i] = (this.prev[0] + (this.cur[0] - this.prev[0]) * f) * g;
      R[i] = (this.prev[1] + (this.cur[1] - this.prev[1]) * f) * g;
      this.frac += this.step;
    }
    return true;
  }
}

registerProcessor('spc-processor', SpcProcessor);
