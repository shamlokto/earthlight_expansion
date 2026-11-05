// Earthlight Space Colony Rebuild: music. Two soundtracks (owner):
//   * Lanternfall (the default since 2026-11-05: "the Lanternfall music suits better for this game"):
//     the owner's own original compositions from Lanternfall, sequenced live with WebAudio
//     (js/colony/lanternfall/music.js + tracks.js, copied from that project). Needs no ROM, so it
//     plays for everyone.
//   * Earth Light (2026-11-03): the original game's songs, played by the expansion's sound engine
//     (js/audio/sound.js, its SPC700 driver emulated) from the pack the expansion builds once from
//     the player's ROM (js/expansion/pack.js). Nothing from the ROM ships.
//
//   const audio = createAudio();
//   await audio.init();          // Lanternfall: always available; Earth Light: finds a stored pack (no prompt)
//   audio.unlock();              // from a click or key press: browsers start audio only then
//   audio.play('title' | 'colony' | 'raid');  audio.sting('victory' | 'won' | 'lost');
//   audio.setMuted(m);  audio.setSource('lanternfall' | 'earthlight');  await audio.setUp();  // Earth Light: asks for the ROM once
import { Sound, SONGS, briefingSong } from '../audio/sound.js';
import { ensurePack } from '../expansion/pack.js';
import { TRACKS } from './lanternfall/tracks.js';
import { MusicPlayer } from './lanternfall/music.js';

const MUTE = 'earthlight-mute';      // shared with the original game and the expansion
const SOURCE = 'el-colony-music';    // which soundtrack: 'lanternfall' (default) | 'earthlight'
const ROTATE_MS = 4 * 60 * 1000;     // the colony's calm rotation: a new tune every few minutes
// Earth Light: between-missions, the main menu and two briefing tunes.
const EL_PLAYLIST = [SONGS.interlude, SONGS.menu, briefingSong(9), briefingSong(0)];
// Lanternfall: the realm's seasons and the gentle waltz; raids get the defenders' theme.
const LF = { title: 'title', colony: ['realm_spring', 'select', 'realm_autumn', 'realm_winter'], raid: 'battle_defend', victory: 'victory', won: 'battle_won', lost: 'battle_lost' };

export function createAudio() {
  const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
  let rom = null, sound = null;                 // Earth Light
  let ctx = null, bus = null, player = null;    // Lanternfall
  let want = null, turn = 0, timer = 0, starting = null, now = null;
  const api = {
    source: read(SOURCE) === 'earthlight' ? 'earthlight' : 'lanternfall',
    available: true, muted: read(MUTE) === '1', why: '', earthlight: false,
    async init() {
      try {
        const p = await ensurePack({ onNeedRom: () => { throw new Error('no pack'); } });
        rom = p.rom; api.earthlight = true;
      } catch { api.earthlight = false; }
      refresh();
      return api.available;
    },
    // Earth Light: ask for the ROM (the expansion's one-time dialog), build the pack, switch to it.
    async setUp() {
      const p = await ensurePack();
      rom = p.rom; api.earthlight = true;
      api.setSource('earthlight');
      await api.unlock(true);
      return true;
    },
    setSource(s) {
      const next = s === 'earthlight' ? 'earthlight' : 'lanternfall';
      if (next === api.source) return;
      stopAll();
      api.source = next; write(SOURCE, next); refresh();
      if (want) { const w = want; now = null; api.unlock(true); play(w, true); }
    },
    // Start the sound; must run inside a user gesture the first time.
    unlock(force = false) {
      if (api.source === 'lanternfall') {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) { api.available = false; api.why = 'This browser has no Web Audio.'; return null; }
          ctx = new AC();
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -14; comp.ratio.value = 3;
          bus = ctx.createGain(); bus.connect(comp).connect(ctx.destination);
          player = new MusicPlayer(ctx, bus);
          volume();
        }
        if (ctx.state === 'suspended') ctx.resume();
        if (want && (force || !now)) play(want, true);
        return null;
      }
      if (!rom || (sound && !force)) return starting;
      sound ||= new Sound(rom);
      sound.setMuted(api.muted);
      starting = sound.start().then(() => { if (want) play(want, true); }).catch((e) => { console.warn('colony sound', e); });
      return starting;
    },
    play(name) { if (want === name && now === name) return; want = name; play(name); },
    // A one-shot over the music (Lanternfall only): the Eden Restored fanfare, a raid won or lost.
    sting(name) {
      if (api.source !== 'lanternfall' || !player || api.muted || !LF[name] || !TRACKS[LF[name]]) return;
      try { const h = player.play(LF[name], TRACKS, { fade: 0.02 }); player.stings = (player.stings || []).concat(h); } catch (e) { console.warn('colony sting', e); }
    },
    setMuted(m) {
      api.muted = !!m; write(MUTE, m ? '1' : '0');
      sound?.setMuted(api.muted); volume();
    },
    stop() { want = null; stopAll(); },
  };
  function refresh() {
    if (api.source === 'earthlight') { api.available = api.earthlight; api.why = api.earthlight ? '' : 'Earth Light music needs your ROM once (the expansion uses the same setup).'; }
    else { api.available = !!(window.AudioContext || window.webkitAudioContext); api.why = api.available ? '' : 'This browser has no Web Audio.'; }
  }
  function volume() { if (bus) bus.gain.setTargetAtTime(api.muted ? 0 : 0.5, ctx.currentTime, 0.05); }
  function stopAll() {
    clearInterval(timer); timer = 0; now = null;
    try { sound?.stop(); } catch { }
    if (player?.current) { player.fadeOut(player.current, 1); player.current = null; }
  }
  function song(s) { try { if (sound?.ctx?.state === 'running') sound.playSong(s); } catch (e) { console.warn('colony sound', e); } }
  function track(name) {
    if (!player || !TRACKS[name]) return;
    if (player.current && !player.current.done && player.current.name === name) return;
    player.setCurrent(player.play(name, TRACKS, { fade: 1.8 }), 1.8);
  }
  function play(name, restart = false) {
    clearInterval(timer); timer = 0;
    if (api.source === 'lanternfall') {
      if (!player) return;
      now = name;
      if (name === 'colony') {
        if (restart) turn = 0;
        track(LF.colony[turn % LF.colony.length]);
        timer = setInterval(() => { turn++; track(LF.colony[turn % LF.colony.length]); }, ROTATE_MS);
      } else track(LF[name]);
      return;
    }
    if (!sound) return;
    now = name;
    if (name === 'title') song(SONGS.title);
    else if (name === 'raid') song(SONGS.overview);
    else if (name === 'colony') {
      if (restart) turn = 0;
      song(EL_PLAYLIST[turn % EL_PLAYLIST.length]);
      timer = setInterval(() => { turn++; song(EL_PLAYLIST[turn % EL_PLAYLIST.length]); }, ROTATE_MS);
    }
  }
  return api;
}
