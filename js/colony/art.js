// Earthlight Space Colony Rebuild: picture slots (docs/COLONY.md §7, docs/COLONY-V1.md "art.js").
// Original art made with xAI's image model by tools/art/colony-xai.mjs (style bible
// tools/art/colony/style.txt, one prompt per slot in tools/art/colony/prompts/). The game asks for a
// slot by name: art(slot) gives the picture's URL (relative to the page) if one exists, else null,
// and the caller draws its procedural fallback. Plain ES module, no DOM.
//
//   MANIFEST[slot] = { kind, size: [w, h], seamless, prompt, refs, file }
//     kind      'card' | 'terrain' | 'portrait' | 'sky' | 'title' | 'scene' | 'site' | 'vault' | 'danger' (a big moment's still; its
//               clip, if any, is in VIDEOS below)
//     size      output size in pixels
//     seamless  the picture tiles (terrain textures)
//     prompt    prompt file (the style bible and tools/art/colony/prompts/_<kind>.txt go first)
//     refs      reference pictures for the edits endpoint, so a set keeps one style
//     file      'art/colony/<kind>/<name>.webp', or null while the slot has no picture

const SIZE = { card: [256, 256], terrain: [256, 256], portrait: [256, 320], sky: [1024, 512], title: [1280, 720], scene: [1280, 720],
  site: [480, 270], vault: [480, 270], danger: [480, 270] };
const CARD_REF = 'tools/art/colony/ref/card.png';
const PORTRAIT_REF = 'art/colony/portrait/sato.webp';
const TITLE_REF = 'art/colony/title/rebuild.webp';         // the scenes follow the title picture   // the later portraits (wanderers, survivors) follow Sato's style

// Slots of version 1, then version 2 (docs/COLONY-V2.md "Art"), then version 3 (docs/COLONY-V3.md "Art"), then version 4
// (docs/COLONY-V4.md stage 1: the deck buildings). Add a slot here and a prompt file,
// then run tools/art/colony-xai.mjs.
const SLOTS = {
  card: ['command', 'dock', 'repairyard', 'depot', 'solar', 'induction', 'battery', 'riverpump', 'airplant',
    'grove', 'seal', 'farm', 'hydro', 'oremine', 'salvage', 'habitat', 'park',
    // version 2
    'lab', 'reclaimer', 'iceharvester', 'gasscoop', 'orchard', 'fishery', 'canteen', 'seedvault', 'smelter',
    'fabricator', 'sweeper', 'tailings', 'plasmaskimmer', 'tether', 'dronebay', 'clinic', 'safetypost', 'obsdeck',
    // version 3
    'arsenal', 'shipyard', 'barracks', 'scrapyard', 'emplacement', 'sensormast', 'shieldpylon', 'jammer', 'fusion',
    'mushroom', 'terrace', 'lodge', 'quarters',
    // version 4: the deck buildings
    'lift', 'skygarden', 'gallery', 'cistern', 'geotap', 'pumpstation',
    // version 6 (docs/COLONY-V6.md): the big city (prompts written; pictures not made yet)
    'reserve', 'granary', 'warehouse', 'vertfarm', 'waterworks', 'atmoproc', 'sunmirror', 'towerblock', 'arcology', 'arrivals', 'plaza', 'massdriver',
    // version 7 (docs/COLONY-V7.md): zoning and growth (prompts written; pictures not made yet)
    'livingquad', 'marketquad', 'workshopquad', 'school', 'transit', 'monorail', 'freightyard',
    // version 8 (docs/COLONY-V8.md): the landmarks and the Flare Shelter (prompts written; pictures not made yet)
    'workshop', 'govgarden', 'observatory', 'lantern', 'hallofnames', 'elevator', 'flareshelter',
    // version 9 (docs/COLONY-V9.md): the wonders, the Ark and the tourism buildings (prompts written; pictures not made yet)
    'arboretum', 'library', 'concerthall', 'memorial', 'arena', 'starport', 'spinring', 'ark', 'hotel', 'promenade', 'theatre', 'casino'],
  title: ['rebuild'],
  sky: ['earth-below'],
  terrain: ['void', 'asteroid', 'magnetic', 'atmosphere', 'hull', 'deck', 'plain', 'fertile', 'river', 'rubble', 'breach',
    // version 2
    'forest', 'hills', 'rock', 'meteoroid', 'comet', 'plasma', 'gravity',
    // owner's reserve of 50 (2026-11-04): the terrains still drawn by hand, mostly the decks'
    'poor', 'lake', 'marsh', 'bulkhead', 'gate', 'glass', 'conduit', 'catacomb'],
  portrait: ['ruess', 'sato',
    // version 3: the wanderers (data/commanders.js WANDERERS)
    'w_kestrel', 'w_brann', 'w_ilves', 'w_oduya', 'w_vashti', 'w_corran', 'w_maris', 'w_thorne', 'w_seln', 'w_okafor',
    'w_rook', 'w_hale',
    // the survivors of Eden (data/secrets.js SURVIVOR_COMMANDERS)
    'marrow', 'venn',
    // version 4, stage 4: the player, at last (the ending)
    'general'],
  // version 4, stage 4: the big moments (D26); each still is the first frame of its clip
  scene: ['ending', 'finalvault', 'ark'],   // version 9: the Ark's ending, Beyond Eden (prompt written; picture not made yet)
  // the Star chart's sites (js/colony/expeditions.js SITES), the journal's vaults and dangers (data/secrets.js)
  site: ['belt', 'comet', 'derelict', 'babylon', 'bunker', 'den', 'outpost', 'listening', 'relief'],
  vault: ['v_stores', 'v_helium', 'v_msnp', 'v_msfb', 'v_seeds', 'v_blue'],
  danger: ['drones', 'toxic', 'radiation', 'flooded', 'reactor'],
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
  'card/barracks': 'art/colony/card/barracks.webp',
  'card/scrapyard': 'art/colony/card/scrapyard.webp',
  'card/emplacement': 'art/colony/card/emplacement.webp',
  'card/sensormast': 'art/colony/card/sensormast.webp',
  'card/shieldpylon': 'art/colony/card/shieldpylon.webp',
  'card/jammer': 'art/colony/card/jammer.webp',
  'card/fusion': 'art/colony/card/fusion.webp',
  'card/mushroom': 'art/colony/card/mushroom.webp',
  'card/terrace': 'art/colony/card/terrace.webp',
  'card/lodge': 'art/colony/card/lodge.webp',
  'card/quarters': 'art/colony/card/quarters.webp',
  'card/lift': 'art/colony/card/lift.webp',
  'card/skygarden': 'art/colony/card/skygarden.webp',
  'card/gallery': 'art/colony/card/gallery.webp',
  'card/cistern': 'art/colony/card/cistern.webp',
  'card/geotap': 'art/colony/card/geotap.webp',
  'card/pumpstation': 'art/colony/card/pumpstation.webp',
  'card/reserve': 'art/colony/card/reserve.webp',
  'card/granary': 'art/colony/card/granary.webp',
  'card/warehouse': 'art/colony/card/warehouse.webp',
  'card/vertfarm': 'art/colony/card/vertfarm.webp',
  'card/waterworks': 'art/colony/card/waterworks.webp',
  'card/atmoproc': 'art/colony/card/atmoproc.webp',
  'card/sunmirror': 'art/colony/card/sunmirror.webp',
  'card/towerblock': 'art/colony/card/towerblock.webp',
  'card/arcology': 'art/colony/card/arcology.webp',
  'card/arrivals': 'art/colony/card/arrivals.webp',
  'card/plaza': 'art/colony/card/plaza.webp',
  'card/massdriver': 'art/colony/card/massdriver.webp',
  'card/livingquad': 'art/colony/card/livingquad.webp',
  'card/marketquad': 'art/colony/card/marketquad.webp',
  'card/workshopquad': 'art/colony/card/workshopquad.webp',
  'card/school': 'art/colony/card/school.webp',
  'card/transit': 'art/colony/card/transit.webp',
  'card/monorail': 'art/colony/card/monorail.webp',
  'card/freightyard': 'art/colony/card/freightyard.webp',
  'card/workshop': 'art/colony/card/workshop.webp',
  'card/govgarden': 'art/colony/card/govgarden.webp',
  'card/observatory': 'art/colony/card/observatory.webp',
  'card/lantern': 'art/colony/card/lantern.webp',
  'card/hallofnames': 'art/colony/card/hallofnames.webp',
  'card/elevator': 'art/colony/card/elevator.webp',
  'card/flareshelter': 'art/colony/card/flareshelter.webp',
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
  'terrain/poor': 'art/colony/terrain/poor.webp',
  'terrain/lake': 'art/colony/terrain/lake.webp',
  'terrain/marsh': 'art/colony/terrain/marsh.webp',
  'terrain/bulkhead': 'art/colony/terrain/bulkhead.webp',
  'terrain/gate': 'art/colony/terrain/gate.webp',
  'terrain/glass': 'art/colony/terrain/glass.webp',
  'terrain/conduit': 'art/colony/terrain/conduit.webp',
  'terrain/catacomb': 'art/colony/terrain/catacomb.webp',
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
  'portrait/marrow': 'art/colony/portrait/marrow.webp',
  'portrait/venn': 'art/colony/portrait/venn.webp',
  'portrait/general': 'art/colony/portrait/general.webp',
  'scene/ending': 'art/colony/scene/ending.webp',
  'scene/finalvault': 'art/colony/scene/finalvault.webp',
  'site/belt': 'art/colony/site/belt.webp',
  'site/comet': 'art/colony/site/comet.webp',
  'site/derelict': 'art/colony/site/derelict.webp',
  'site/babylon': 'art/colony/site/babylon.webp',
  'site/bunker': 'art/colony/site/bunker.webp',
  'site/den': 'art/colony/site/den.webp',
  'site/outpost': 'art/colony/site/outpost.webp',
  'site/listening': 'art/colony/site/listening.webp',
  'site/relief': 'art/colony/site/relief.webp',
  'vault/v_stores': 'art/colony/vault/v_stores.webp',
  'vault/v_helium': 'art/colony/vault/v_helium.webp',
  'vault/v_msnp': 'art/colony/vault/v_msnp.webp',
  'vault/v_msfb': 'art/colony/vault/v_msfb.webp',
  'vault/v_seeds': 'art/colony/vault/v_seeds.webp',
  'vault/v_blue': 'art/colony/vault/v_blue.webp',
  'danger/drones': 'art/colony/danger/drones.webp',
  'danger/toxic': 'art/colony/danger/toxic.webp',
  'danger/radiation': 'art/colony/danger/radiation.webp',
  'danger/flooded': 'art/colony/danger/flooded.webp',
  'danger/reactor': 'art/colony/danger/reactor.webp',
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
      refs: kind === 'card' && name !== 'command' ? [CARD_REF] : kind === 'portrait' && name !== 'ruess' && name !== 'sato' ? [PORTRAIT_REF] : slot === 'scene/ending' ? [TITLE_REF] : [],
      file: FILES[slot] || null,
    };
  }
}

// Short xAI clips (image-to-video from a scene's still: tools/art/colony-video.py), silent, played muted
// over their still; skippable, and the still stands in where video cannot play.
const VIDEOS = { 'video/ending': 'art/colony/video/ending.mp4' };

export const hasArt = (slot) => !!(MANIFEST[slot]?.file || VIDEOS[slot]);
export const art = (slot) => MANIFEST[slot]?.file || VIDEOS[slot] || null;
