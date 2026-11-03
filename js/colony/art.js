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
const PORTRAIT_REF = 'art/colony/portrait/sato.webp';   // the wanderers' portraits follow Sato's style

// Slots of version 1, then version 2 (docs/COLONY-V2.md "Art"), then version 3 (docs/COLONY-V3.md "Art"). Add a slot here and a prompt file,
// then run tools/art/colony-xai.mjs.
const SLOTS = {
  card: ['command', 'dock', 'repairyard', 'depot', 'solar', 'induction', 'battery', 'riverpump', 'airplant',
    'grove', 'seal', 'farm', 'hydro', 'oremine', 'salvage', 'habitat', 'park',
    // version 2
    'lab', 'reclaimer', 'iceharvester', 'gasscoop', 'orchard', 'fishery', 'canteen', 'seedvault', 'smelter',
    'fabricator', 'sweeper', 'tailings', 'plasmaskimmer', 'tether', 'dronebay', 'clinic', 'safetypost', 'obsdeck',
    // version 3
    'arsenal', 'shipyard', 'barracks', 'scrapyard', 'emplacement', 'sensormast', 'shieldpylon', 'jammer', 'fusion',
    'mushroom', 'terrace', 'lodge', 'quarters'],
  title: ['rebuild'],
  sky: ['earth-below'],
  terrain: ['void', 'asteroid', 'magnetic', 'atmosphere', 'hull', 'deck', 'plain', 'fertile', 'river', 'rubble', 'breach',
    // version 2
    'forest', 'hills', 'rock', 'meteoroid', 'comet', 'plasma', 'gravity'],
  portrait: ['ruess', 'sato',
    // version 3: the wanderers (data/commanders.js WANDERERS)
    'w_kestrel', 'w_brann', 'w_ilves', 'w_oduya', 'w_vashti', 'w_corran', 'w_maris', 'w_thorne', 'w_seln', 'w_okafor',
    'w_rook', 'w_hale'],
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
  'card/lab': 'art/colony/card/lab.webp',
  'card/reclaimer': 'art/colony/card/reclaimer.webp',
  'card/iceharvester': 'art/colony/card/iceharvester.webp',
  'card/gasscoop': 'art/colony/card/gasscoop.webp',
  'card/orchard': 'art/colony/card/orchard.webp',
  'card/fishery': 'art/colony/card/fishery.webp',
  'card/canteen': 'art/colony/card/canteen.webp',
  'card/seedvault': 'art/colony/card/seedvault.webp',
  'card/smelter': 'art/colony/card/smelter.webp',
  'card/fabricator': 'art/colony/card/fabricator.webp',
  'card/sweeper': 'art/colony/card/sweeper.webp',
  'card/tailings': 'art/colony/card/tailings.webp',
  'card/plasmaskimmer': 'art/colony/card/plasmaskimmer.webp',
  'card/tether': 'art/colony/card/tether.webp',
  'card/dronebay': 'art/colony/card/dronebay.webp',
  'card/clinic': 'art/colony/card/clinic.webp',
  'card/safetypost': 'art/colony/card/safetypost.webp',
  'card/obsdeck': 'art/colony/card/obsdeck.webp',
  'card/arsenal': 'art/colony/card/arsenal.webp',
  'card/shipyard': 'art/colony/card/shipyard.webp',
  'card/emplacement': 'art/colony/card/emplacement.webp',
  'card/jammer': 'art/colony/card/jammer.webp',
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
  'terrain/forest': 'art/colony/terrain/forest.webp',
  'terrain/hills': 'art/colony/terrain/hills.webp',
  'terrain/rock': 'art/colony/terrain/rock.webp',
  'terrain/meteoroid': 'art/colony/terrain/meteoroid.webp',
  'terrain/comet': 'art/colony/terrain/comet.webp',
  'terrain/plasma': 'art/colony/terrain/plasma.webp',
  'terrain/gravity': 'art/colony/terrain/gravity.webp',
  'portrait/ruess': 'art/colony/portrait/ruess.webp',
  'portrait/sato': 'art/colony/portrait/sato.webp',
  'portrait/w_kestrel': 'art/colony/portrait/w_kestrel.webp',
  'portrait/w_brann': 'art/colony/portrait/w_brann.webp',
  'portrait/w_ilves': 'art/colony/portrait/w_ilves.webp',
  'portrait/w_oduya': 'art/colony/portrait/w_oduya.webp',
  'portrait/w_vashti': 'art/colony/portrait/w_vashti.webp',
  'portrait/w_corran': 'art/colony/portrait/w_corran.webp',
  'portrait/w_maris': 'art/colony/portrait/w_maris.webp',
  'portrait/w_thorne': 'art/colony/portrait/w_thorne.webp',
  'portrait/w_seln': 'art/colony/portrait/w_seln.webp',
  'portrait/w_okafor': 'art/colony/portrait/w_okafor.webp',
  'portrait/w_rook': 'art/colony/portrait/w_rook.webp',
  'portrait/w_hale': 'art/colony/portrait/w_hale.webp',
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
      refs: kind === 'card' && name !== 'command' ? [CARD_REF] : kind === 'portrait' && name.startsWith('w_') ? [PORTRAIT_REF] : [],
      file: FILES[slot] || null,
    };
  }
}

export const hasArt = (slot) => !!MANIFEST[slot]?.file;
export const art = (slot) => MANIFEST[slot]?.file || null;
