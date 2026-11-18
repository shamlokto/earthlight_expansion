// Sato's Harvest: small synthesised sound effects (Web Audio, no files) and the background music:
// recorded tracks from art/farm/music (manifest slots music/<name>), with a generated tune as the fallback.
import * as art from './art.js';
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
  geiger: () => { for (let i = 0; i < 5; i++) tone(2200 + Math.random() * 800, 1800, 0.012, 'square', 0.05, i * 0.05 + Math.random() * 0.04); },
  morning: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, f, 0.5, 'sine', 0.08, i * 0.16)); },
};
export function sfx(name) {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); (S[name] || S.pick)(); } catch { /* no audio: fine */ }
}

// ---------------------------------------------------------------- music
// The track comes from the mood main.js reports: { season, night, ruins, map, festival, title }.
// Tracks are decoded into Web Audio buffers and looped sample-exactly; a change crossfades over 2 s.
// No file for the track (or no audio decoding) -> the quiet generated tune below plays instead.
const PREF_KEY = 'satoHarvest.music';
const prefs = (() => { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (p && typeof p === 'object') return { on: p.on !== false, vol: Number.isFinite(p.vol) ? Math.min(1, Math.max(0, p.vol)) : 0.7 }; } catch { /* no storage */ } return { on: true, vol: 0.7 }; })();
const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* fine */ } };
const SEASON_TRACKS = ['spring', 'summer', 'autumn', 'winter'], FADE = 2;
let musicOn = false, musicTimer = null, step = 0, mood = { season: 0, night: false, ruins: false, map: null, festival: null, title: false };
let master = null, cur = null, want = null, token = 0;
const buffers = new Map(), order = [];   // decoded tracks, the last few kept

// Which track a mood asks for (pure; exported for tests).
export function trackFor(m) {
  if (m.title) return 'title';
  if (m.festival === 'wedding') return 'wedding';
  if (m.festival === 'lantern') return 'lantern';
  if (m.festival) return 'festival';
  if (m.belt || m.map === 'belt') return art.has('music/belt') ? 'belt' : 'night';   // calm, for the asteroid belt
  if (m.ruins || m.map === 'ruins') return 'ruins';
  if (m.night) return 'night';
  if (m.map === 'village') return 'village';
  if (m.map === 'central') return 'central';
  return SEASON_TRACKS[m.season] || 'spring';
}
function srcOf(name) {
  const i = art.info('music/' + name); if (!i) return null;
  let ogg = false; try { ogg = !!i.ogg && !!document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"'); } catch { /* no DOM */ }
  return { main: 'art/farm/' + (ogg ? i.ogg : i.file), alt: ogg ? 'art/farm/' + i.file : null };
}
async function decode(url) {
  const r = await fetch(url); if (!r.ok) throw new Error('http ' + r.status);
  const a = await r.arrayBuffer();
  return await new Promise((res, rej) => { const p = ac.decodeAudioData(a, res, rej); if (p && p.then) p.then(res, rej); });
}
async function bufferFor(name, src) {
  if (buffers.has(name)) return buffers.get(name);
  let b, used = src.main;
  try { b = await decode(src.main); } catch (e) { if (!src.alt) throw e; used = src.alt; b = await decode(src.alt); }
  buffers.set(name, { b, url: used }); order.push(name);
  for (let i = 0; order.length > 3 && i < order.length;) { if (cur && order[i] === cur.name) i++; else buffers.delete(order.splice(i, 1)[0]); }
  return buffers.get(name);
}
function fadeOutCur() {
  if (!cur) return; const c = cur; cur = null;
  if (c.node) { const t = ac.currentTime; c.gain.gain.cancelScheduledValues(t); c.gain.gain.setValueAtTime(c.gain.gain.value, t); c.gain.gain.linearRampToValueAtTime(0, t + FADE); try { c.node.stop(t + FADE + 0.05); } catch { /* stopped */ } }
  else stopTune();
}
function startTune() { clearInterval(musicTimer); musicTimer = setInterval(beat, 340); }
function stopTune() { clearInterval(musicTimer); musicTimer = null; }
async function update() {
  if (!musicOn || !ac) return;
  const name = trackFor(mood); if (want === name) return;
  want = name; const my = ++token, src = srcOf(name);
  if (cur && cur.name === name && cur.node) return;   // back to the track that is still playing
  if (src) {
    try {
      const { b, url } = await bufferFor(name, src); if (my !== token || !musicOn) return;
      fadeOutCur();
      const node = ac.createBufferSource(), gain = ac.createGain(), t = ac.currentTime;
      node.buffer = b; node.loop = true; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(1, t + FADE);
      node.connect(gain).connect(master); node.start(t);
      cur = { name, node, gain, src: url }; return;
    } catch { if (my !== token || !musicOn) return; }
  }
  if (cur && !cur.node) { cur.name = name; return; }   // the generated tune is already playing: it follows the mood itself
  fadeOutCur(); cur = { name, node: null, src: null }; startTune();
}
function ensureCtx() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  if (!master) { master = ac.createGain(); master.gain.value = prefs.vol; master.connect(ac.destination); }
}
// The generated tune: a pentatonic melody over two soft chords, a little different each season.
const SCALES = [[0, 2, 4, 7, 9], [0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8]], ROOTS = [262, 294, 247, 220];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mtone = (f, dur, type, vol, delay = 0) => {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
};
function beat() {
  if (!musicOn || !ac) return;
  const sc = mood.ruins ? [0, 3, 5, 6, 10] : SCALES[mood.season] || SCALES[0], root = (mood.ruins ? 196 : ROOTS[mood.season] || ROOTS[0]) * (mood.night ? 0.5 : 1), v = (mood.night ? 0.028 : 0.04) * 1.4;
  const note = (deg, oct = 0) => root * Math.pow(2, (sc[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct)) / 12);
  if (step % 8 === 0) { const ch = (step / 8) % 2 ? [0, 2, 4] : [-2, 0, 3]; for (const d of ch) mtone(note(d, -1), 2.6, 'sine', v * 0.6); }
  if (rnd() < (mood.night ? 0.4 : 0.68)) { const d = Math.floor(rnd() * 8) - 1; mtone(note(d), 0.7 + rnd() * 0.5, 'triangle', v); if (rnd() < 0.2) mtone(note(d + 2), 0.5, 'triangle', v * 0.7, 0.17); }
  step++;
}
// music(on): the player's switch (remembered). Call from a click or key press: browsers only start audio after one.
export function music(on) {
  prefs.on = !!on; savePrefs();
  return setPlaying(prefs.on);
}
// startMusic(): start if the player has not switched music off (also needs a user gesture).
export const startMusic = () => setPlaying(prefs.on);
function setPlaying(on) {
  try { ensureCtx(); } catch { musicOn = false; return false; }
  if (on === musicOn) { if (on) update(); return on; }
  musicOn = on; want = null; token++;
  if (on) update(); else { fadeOutCur(); stopTune(); }
  return on;
}
export const musicPlaying = () => musicOn;
export const musicWanted = () => prefs.on;
export const musicVolume = () => prefs.vol;
export function setMusicVolume(v) {
  prefs.vol = Math.min(1, Math.max(0, +v || 0)); savePrefs();
  if (master) master.gain.setTargetAtTime(prefs.vol, ac.currentTime, 0.05);
}
export function setMood(m) {
  const before = trackFor(mood); Object.assign(mood, m);
  if (musicOn && trackFor(mood) !== before) update();
}
// What is playing now (for tests and the debug console).
export const musicNow = () => ({ on: musicOn, want, track: cur ? cur.name : null, src: cur ? cur.src : null, generated: !!(cur && !cur.node && musicTimer) });
if (typeof window !== 'undefined') window.__farmMusic = musicNow;
