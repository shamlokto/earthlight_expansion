// Earthlight Space Colony Rebuild: Earth Light's own music (owner, 2026-11-03), played by the
// expansion's sound engine (js/audio/sound.js: the game's SPC700 driver, emulated) from the pack the
// expansion builds once from the player's ROM (js/expansion/pack.js). Nothing from the ROM ships.
// Without a pack the colony stays silent and never asks for the ROM by itself; setUp() asks.
//
//   const audio = createAudio();
//   await audio.init();          // finds a stored pack (no prompt); audio.available tells
//   audio.unlock();              // from a click or key press: browsers start audio only then
//   audio.play('title' | 'colony');  audio.setMuted(m);  await audio.setUp();  // asks for the ROM once
import { Sound, SONGS, briefingSong } from '../audio/sound.js';
import { ensurePack } from '../expansion/pack.js';

const MUTE = 'earthlight-mute';    // shared with the original game and the expansion
// The colony's calm rotation: between-missions, the main menu and the briefing tunes of the
// original. One every few minutes; each loops until the next.
const PLAYLIST = [SONGS.interlude, SONGS.menu, briefingSong(9), briefingSong(0)];
const ROTATE_MS = 4 * 60 * 1000;

export function createAudio() {
  let rom = null, sound = null, want = null, turn = 0, timer = 0, starting = null;
  const mutedNow = () => { try { return localStorage.getItem(MUTE) === '1'; } catch { return false; } };
  const api = {
    available: false, muted: mutedNow(), why: '',
    // A pack already stored in this browser (by the expansion or an earlier setUp): no prompt.
    async init() {
      try {
        const p = await ensurePack({ onNeedRom: () => { throw new Error('no pack'); } });
        rom = p.rom; api.available = true; api.why = '';
      } catch { api.available = false; api.why = 'Earth Light music needs your ROM once (the expansion uses the same setup).'; }
      return api.available;
    },
    // Ask for the ROM (the expansion's one-time dialog) and build the pack, then play.
    async setUp() {
      const p = await ensurePack();
      rom = p.rom; api.available = true; api.why = '';
      await api.unlock(true);
      return true;
    },
    // Start the sound unit; must run inside a user gesture the first time.
    unlock(force = false) {
      if (!rom || (sound && !force)) return starting;
      sound ||= new Sound(rom);
      sound.setMuted(api.muted);
      starting = sound.start().then(() => { if (want) play(want, true); }).catch((e) => { console.warn('colony sound', e); });
      return starting;
    },
    play(name) { want = name; play(name); },
    setMuted(m) {
      api.muted = !!m;
      try { localStorage.setItem(MUTE, m ? '1' : '0'); } catch { }
      sound?.setMuted(api.muted);
    },
    stop() { want = null; clearInterval(timer); timer = 0; try { sound?.stop(); } catch { } },
  };
  function song(s) { try { if (sound?.ctx?.state === 'running') sound.playSong(s); } catch (e) { console.warn('colony sound', e); } }
  function play(name, restart = false) {
    clearInterval(timer); timer = 0;
    if (!sound) return;
    if (name === 'title') song(SONGS.title);
    else if (name === 'colony') {
      if (restart) turn = 0;
      song(PLAYLIST[turn % PLAYLIST.length]);
      timer = setInterval(() => { turn++; song(PLAYLIST[turn % PLAYLIST.length]); }, ROTATE_MS);
    }
  }
  return api;
}
