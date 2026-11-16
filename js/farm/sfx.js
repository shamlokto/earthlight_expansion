// Sato's Harvest: small synthesised sound effects (Web Audio, no files).
let ac = null;
const tone = (f0, f1, dur, type = 'sine', vol = 0.12, delay = 0) => {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
};
const noise = (dur, freq, vol = 0.15) => {
  const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; const g = ac.createGain(); g.gain.value = vol;
  n.buffer = b; n.connect(f).connect(g).connect(ac.destination); n.start();
};
const S = {
  till: () => { noise(0.12, 500); tone(140, 70, 0.1, 'triangle', 0.1); }, sow: () => noise(0.18, 2600, 0.06), water: () => noise(0.35, 1800, 0.08),
  cut: () => noise(0.1, 3200, 0.1), smash: () => { noise(0.16, 900, 0.2); tone(200, 60, 0.12, 'square', 0.06); }, chop: () => { noise(0.08, 1200, 0.18); tone(260, 120, 0.08, 'triangle', 0.1); },
  dig: () => noise(0.22, 700, 0.16), pick: () => tone(520, 880, 0.09, 'triangle'), drop: () => tone(240, 130, 0.12, 'triangle'), door: () => { tone(180, 120, 0.12, 'square', 0.05); noise(0.1, 400, 0.08); },
  good: () => { tone(523, 523, 0.12, 'triangle'); tone(659, 659, 0.12, 'triangle', 0.12, 0.1); tone(784, 784, 0.22, 'triangle', 0.12, 0.2); }, bad: () => tone(220, 150, 0.3, 'sawtooth', 0.06),
  zap: () => tone(1400, 300, 0.1, 'sawtooth', 0.05), pop: () => { noise(0.2, 1500, 0.14); tone(300, 80, 0.2, 'square', 0.05); }, bite: () => { tone(900, 900, 0.06, 'square', 0.08); tone(900, 900, 0.06, 'square', 0.08, 0.1); },
  morning: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, f, 0.5, 'sine', 0.08, i * 0.16)); },
};
export function sfx(name) {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); (S[name] || S.pick)(); } catch { /* no audio: fine */ }
}
