// Earthlight Space Colony Rebuild: picture slots (docs/COLONY.md §7, docs/COLONY-V1.md "art.js").
// Original art made with xAI's image model by tools/art/colony-xai.mjs (style bible
// tools/art/colony/style.txt, one prompt per slot in tools/art/colony/prompts/). The game asks for a
// slot by name: art(slot) gives the picture's URL (relative to the page) if one exists, else null,
// and the caller draws its procedural fallback. Plain ES module, no DOM.
//
//   MANIFEST[slot] = { kind, size: [w, h], seamless, prompt, refs, file }
//     kind      'card' | 'terrain' | 'portrait' | 'sky' | 'title'
//     size      output size in pixels
//     seamless  the picture tiles (terrain textures)
//     prompt    prompt file (the style bible and tools/art/colony/prompts/_<kind>.txt go first)
//     refs      reference pictures for the edits endpoint, so a set keeps one style
//     file      'art/colony/<kind>/<name>.webp', or null while the slot has no picture

const SIZE = { card: [256, 256], terrain: [256, 256], portrait: [256, 320], sky: [1024, 512], title: [1280, 720] };
const CARD_REF = 'tools/art/colony/ref/card.png';

// Slots of version 1. Add a slot here and a prompt file, then run tools/art/colony-xai.mjs.
const SLOTS = {
  card: ['command', 'dock', 'repairyard', 'depot', 'solar', 'induction', 'battery', 'riverpump', 'airplant',
    'grove', 'seal', 'farm', 'hydro', 'oremine', 'salvage', 'habitat', 'park'],
  title: ['rebuild'],
  sky: ['earth-below'],
  terrain: ['void', 'asteroid', 'magnetic', 'atmosphere', 'hull', 'deck', 'plain', 'fertile', 'river', 'rubble', 'breach'],
  portrait: ['ruess', 'sato'],
};

// Pictures that exist. Kept up to date by `node tools/art/colony-xai.mjs --index`.
// @files-begin
const FILES = {
  'card/command': 'art/colony/card/command.webp',
  'card/dock': 'art/colony/card/dock.webp',
  'card/repairyard': 'art/colony/card/repairyard.webp',
  'card/depot': 'art/colony/card/depot.webp',
  'card/solar': 'art/colony/card/solar.webp',
  'card/induction': 'art/colony/card/induction.webp',
  'card/battery': 'art/colony/card/battery.webp',
  'card/riverpump': 'art/colony/card/riverpump.webp',
  'card/airplant': 'art/colony/card/airplant.webp',
  'card/grove': 'art/colony/card/grove.webp',
  'card/seal': 'art/colony/card/seal.webp',
  'card/farm': 'art/colony/card/farm.webp',
  'card/hydro': 'art/colony/card/hydro.webp',
  'card/oremine': 'art/colony/card/oremine.webp',
  'card/salvage': 'art/colony/card/salvage.webp',
  'card/habitat': 'art/colony/card/habitat.webp',
  'card/park': 'art/colony/card/park.webp',
  'title/rebuild': 'art/colony/title/rebuild.webp',
  'sky/earth-below': 'art/colony/sky/earth-below.webp',
  'terrain/void': 'art/colony/terrain/void.webp',
  'terrain/asteroid': 'art/colony/terrain/asteroid.webp',
  'terrain/magnetic': 'art/colony/terrain/magnetic.webp',
  'terrain/atmosphere': 'art/colony/terrain/atmosphere.webp',
  'terrain/hull': 'art/colony/terrain/hull.webp',
  'terrain/deck': 'art/colony/terrain/deck.webp',
  'terrain/plain': 'art/colony/terrain/plain.webp',
  'terrain/fertile': 'art/colony/terrain/fertile.webp',
  'terrain/river': 'art/colony/terrain/river.webp',
  'terrain/rubble': 'art/colony/terrain/rubble.webp',
  'terrain/breach': 'art/colony/terrain/breach.webp',
  'portrait/ruess': 'art/colony/portrait/ruess.webp',
  'portrait/sato': 'art/colony/portrait/sato.webp',
};
// @files-end

export const MANIFEST = {};
for (const [kind, names] of Object.entries(SLOTS)) {
  for (const name of names) {
    const slot = `${kind}/${name}`;
    MANIFEST[slot] = {
      kind,
      size: SIZE[kind],
      seamless: kind === 'terrain',
      prompt: `tools/art/colony/prompts/${kind}-${name}.txt`,
      refs: kind === 'card' && name !== 'command' ? [CARD_REF] : [],
      file: FILES[slot] || null,
    };
  }
}

export const hasArt = (slot) => !!MANIFEST[slot]?.file;
export const art = (slot) => MANIFEST[slot]?.file || null;
