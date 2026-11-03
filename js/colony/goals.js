// Earthlight Space Colony Rebuild: guided goals and the advisor (owner, 2026-11-03: "in-game
// instructions on how to play become important"; "even on beta testing it becomes too hard").
// Pure: no DOM. The sim calls updateGoals() each day; the interface shows goalStatus() and advise().
//   goal: { id, title, text, speaker, done(state), progress(state)?, show(state)?, only(state)? }
//   show: { build: key } | { chamber: id } | { tile: { x, y } } | { market: true } | { roads: true } | { research: true | techKey } | { defence: tab } | null
import { BUILDING } from './data/buildings.js';
import { summary, chamberLinks, openBreaches, chamberOf, addPending, log, centre, pressuriseAir, storageCaps } from './rules.js';
import { diffOf } from './difficulty.js';
import { TECH } from './data/tech.js';

const finished = (s, key) => s.buildings.filter((b) => b.key === key && b.build === 0).length;
const opened = (s) => s.chambers.filter((c) => c.status === 'open').length;
const landing = (s) => s.chambers.find((c) => c.kind === 'landing') || s.chambers.find((c) => c.status === 'open');
// The chamber to work on next: one being worked on, else a sealed one beside an open chamber.
function nextChamber(s) {
  const busy = s.chambers.find((c) => c.status === 'surveyed' || c.status === 'surveying' || c.status === 'pressurising');
  if (busy) return busy;
  const links = chamberLinks(s);
  for (const c of s.chambers) if (c.status === 'open') for (const id of links.get(c.id) || []) {
    const n = chamberOf(s, id);
    if (n && n.status === 'sealed') return n;
  }
  return null;
}
const dock = (s) => s.buildings.find((b) => b.key === 'dock');
// The next chamber, unless the air stores are too small to pressurise it: then an air depot.
function airFor(s) {
  const c = nextChamber(s);
  if (c && c.status === 'surveyed' && openBreaches(s, c).length === 0 && pressuriseAir(s, c) > (storageCaps(s).air || 0)) return { build: 'depot' };
  return c ? { chamber: c.id } : null;
}

export const GOALS = [
  { id: 'guardian', speaker: 'sato', title: 'Turn a spare machine into money',
    only: (s) => !!s.imported?.beta && s.guardians.length > 0,
    text: 'Governor, the old army stands guard, but Eden needs credits and parts more than gunships right now. Open the Market (the dock) and sell a machine you can spare: each one brings ten times its price in credits, and parts too.',
    done: (s) => s.guardians.length < (s.imported?.units ?? 0), show: () => ({ market: true }) },
  { id: 'farm', speaker: 'ruess', title: 'Plant more fields',
    text: 'More colonists are coming and they will be hungry. Plant a second Farm Field on the fertile soil by the river (dark green): fields beside the river grow a quarter more.',
    done: (s) => finished(s, 'farm') >= 2, progress: (s) => `${finished(s, 'farm')} / 2 fields`, show: () => ({ build: 'farm' }) },
  { id: 'park', speaker: 'ruess', title: 'A park beside the homes',
    text: 'Homes grow into bigger homes when every need is met and a park or a grove is close by. Put a Park next to the Habitats: it costs a little water, no power.',
    done: (s) => finished(s, 'park') + finished(s, 'grove') >= 1, show: () => ({ build: 'park' }) },
  { id: 'solar', speaker: 'ruess', title: 'Power for the homes',
    text: 'The Command Centre\'s reactor is small, and every home and workshop draws on it. Put two Solar Arrays on the hull (the grey wall) or in open space near the dock: power is the one thing we cannot store without batteries.',
    done: (s) => finished(s, 'solar') >= 2, progress: (s) => `${finished(s, 'solar')} / 2 arrays`, show: () => ({ build: 'solar' }) },
  { id: 'habitat', speaker: 'ruess', title: 'Homes for the next ship',
    text: 'A transport only docks when there are free homes. Build two more Habitats near the Command Centre, then keep the roads joined to them so people can walk out.',
    done: (s) => finished(s, 'habitat') >= 4, progress: (s) => `${finished(s, 'habitat')} / 4 habitats`, show: () => ({ build: 'habitat' }) },
  { id: 'repairyard', speaker: 'ruess', title: 'More hands for building',
    text: 'Every building needs a crew while it goes up. The Command Centre has two crews; a Repair Yard adds another, so more gets built at once.',
    done: (s) => finished(s, 'repairyard') >= 1, show: () => ({ build: 'repairyard' }) },
  { id: 'airplant', speaker: 'ruess', title: 'Air for a bigger colony',
    text: 'The Command Centre breathes for the first families, not for a city. An Air Plant turns water into air: build one before the colony grows past what the Centre can give.',
    done: (s) => finished(s, 'airplant') >= 1, show: () => ({ build: 'airplant' }) },
  { id: 'transport', speaker: 'sato', title: 'Welcome a transport',
    text: 'Ships come to the dock every few days, but they only dock if the colony is happy enough, has free homes and is not short of food, water or air. Keep those three right and wait for the next one.',
    done: (s) => !!s.flags.arrival, progress: (s) => { const d = diffOf(s); return `next ship in ${d.transportEvery - (s.day % d.transportEvery)} days · happiness ${Math.round(s.happy)} / ${d.transportHappy}`; },
    show: (s) => { const d = dock(s); return d ? { tile: { x: d.x, y: d.y } } : null; } },
  { id: 'survey', speaker: 'ruess', title: 'Survey the next chamber',
    text: 'Eden has more than twenty chambers behind its bulkheads. Click a dark chamber next to ours and press Survey: the crews find out what is inside and where the hull is broken.',
    done: (s) => s.chambers.some((c) => c !== landing(s) && c.status !== 'sealed'), show: (s) => { const c = nextChamber(s); return c ? { chamber: c.id } : null; } },
  { id: 'seal', speaker: 'ruess', title: 'Seal its breaches',
    text: 'The red tiles in the chamber\'s walls are breaches. Build a Bulkhead Seal on each one (Water & air menu). When every breach is sealed, the chamber can hold air.',
    done: (s) => s.chambers.some((c) => c !== landing(s) && ((c.status === 'surveyed' && openBreaches(s, c).length === 0) || c.status === 'pressurising' || c.status === 'open')),
    progress: (s) => { const c = s.chambers.find((k) => k.status === 'surveyed'); return c ? `${c.breaches.length - openBreaches(s, c).length} / ${c.breaches.length} breaches sealed in ${c.name}` : ''; },
    show: (s) => { const c = s.chambers.find((k) => k.status === 'surveyed'), i = c && openBreaches(s, c)[0]; return i !== undefined && i !== null ? { tile: { x: i % s.map.w, y: (i / s.map.w) | 0 } } : c ? { chamber: c.id } : null; } },
  { id: 'pressurise', speaker: 'ruess', title: 'Give it air',
    text: 'Click the sealed chamber and press Pressurise. It takes air from our stores, so keep the Air Plant running; a big chamber may need more air than we can store, so build a Storage Depot and set it to Air. Five days later the chamber is ours to build in.',
    done: (s) => opened(s) >= 2, show: (s) => airFor(s) },
  { id: 'roads', speaker: 'sato', title: 'Roads into the new chamber',
    text: 'Colonists walk and rovers drive only on roads. Choose Road, click where it starts and then where it ends: run one from our roads through the gate into the new chamber.',
    done: (s) => s.buildings.some((b) => b.key === 'road' && s.map.ch[b.y * s.map.w + b.x] !== landing(s)?.id && s.map.ch[b.y * s.map.w + b.x] !== 255),
    show: () => ({ roads: true }) },
  { id: 'pop80', speaker: 'ruess', title: 'Grow to 80 colonists',
    text: 'At 80 colonists the Council lets us mine asteroids, harvest the magnetic fields and run a salvage yard. Homes, food, air and a happy colony bring the ships.',
    done: (s) => s.pop >= 80, progress: (s) => `${s.pop} / 80 colonists`, show: () => ({ build: 'habitat' }) },
  { id: 'oremine', speaker: 'ruess', title: 'Mine an asteroid',
    text: 'Outside the hull, the brown asteroid fields hold ore. Build an Ore Mine on one within the dock\'s reach (the Reach overlay shows it); a gleaming ore seam doubles its output.',
    done: (s) => finished(s, 'oremine') >= 1, show: () => ({ build: 'oremine' }) },
  { id: 'sell', speaker: 'sato', title: 'Sell at the Market',
    text: 'Ore sells at the dock. Open the Market and sell a lot: every sale lowers the price a little, and it recovers over a few days, so sell in batches.',
    done: (s) => (s.flags.sold || 0) > 0, show: () => ({ market: true }) },
  { id: 'chambers4', speaker: 'ruess', title: 'Four chambers breathing',
    text: 'Keep going: survey, seal and pressurise until four chambers are open. Each one is room for fields, homes and industry. Eden is coming back to life.',
    done: (s) => opened(s) >= 4, progress: (s) => `${opened(s)} / 4 chambers open`, show: (s) => airFor(s) },
  // ---- version 2: research and the new buildings (docs/COLONY-V2.md)
  { id: 'lab', speaker: 'ruess', title: 'A Research Lab',
    text: 'With eighty colonists we can spare minds as well as hands. A Research Lab makes research points: with them we learn to smelt ore, heal the sick, harvest the comet and reach further into space.',
    done: (s) => finished(s, 'lab') >= 1, show: () => ({ build: 'lab' }) },
  { id: 'tech1', speaker: 'ruess', title: 'Choose what to study',
    text: 'Open Research (the button in the top bar, or T) and pick a technology. Smelting is a good start: it turns our ore into alloy, which sells well and later becomes parts. Medicine brings clinics.',
    done: (s) => (s.research?.done?.length || 0) >= 1,
    progress: (s) => { const f = s.research?.focus; return f ? `studying ${TECH[f]?.name || f}` : 'nothing studied yet'; }, show: () => ({ research: true }) },
  { id: 'alloy', speaker: 'ruess', title: 'Make alloy',
    text: 'Research Smelting, then build a Smelter: it melts 20 ore a day into 10 alloy. Keep the mines running to feed it; alloy sells for far more than ore.',
    done: (s) => (s.stock.alloy || 0) > 0 || finished(s, 'fabricator') > 0, show: (s) => (s.unlocked.includes('smelter') ? { build: 'smelter' } : { research: 'smelting' }) },
  { id: 'clinic', speaker: 'sato', title: 'A Clinic for the colony',
    text: 'Research Medicine and open a Clinic near the homes. Colonists in its reach are happier, children are born, and their Habitats can grow into Apartments.',
    done: (s) => finished(s, 'clinic') >= 1, show: (s) => (s.unlocked.includes('clinic') ? { build: 'clinic' } : { research: 'medicine' }) },
  { id: 'apartments', speaker: 'sato', title: 'Apartments',
    text: 'A Habitat with every need met, a park and a clinic in reach grows into Apartments: seventy homes on one tile. Watch the homes around the Clinic.',
    done: (s) => s.buildings.some((b) => b.key === 'habitat' && b.level >= 3), show: (s) => (s.unlocked.includes('clinic') ? { build: 'park' } : { research: 'medicine' }) },
  // ---- version 3: guardians and raids (docs/COLONY-V3.md)
  { id: 'arsenal', speaker: 'sato', title: 'An Arsenal',
    text: 'Eden is starting to look rich, and in this sky that draws trouble. An Arsenal builds Earth Light machines for credits and parts: Mars and Titan to start, stronger ones as Ruess researches Machine Works.',
    done: (s) => finished(s, 'arsenal') >= 1, show: () => ({ build: 'arsenal' }) },
  { id: 'machine', speaker: 'sato', title: 'The first guardian',
    text: 'Open Defence (the top bar, or G), choose Production and order a machine. A Mars or a Titan is cheap and fights well enough against scavengers.',
    done: (s) => (s.guardians?.length || 0) > (s.imported?.beta ? s.imported.units : 0), show: () => ({ defence: 'production' }) },
  { id: 'barracks', speaker: 'sato', title: 'Crews for the machines',
    text: 'A machine needs a crew to fly it. The Command Centre crews four; a Guardian Barracks crews six more. Put Battery Emplacements on the hull too: they fire on raiders that come close.',
    done: (s) => finished(s, 'barracks') >= 1, show: () => ({ build: 'barracks' }) },
  { id: 'raid', speaker: 'sato', title: 'Weather the first raid',
    text: 'Sooner or later the sensors will pick up a contact. When the raiders come, fight with the guardians or pay them to leave: either way, Eden goes on. The Defence panel shows how heated things are.',
    done: (s) => (s.raid?.count || 0) >= 1, progress: (s) => (s.raid?.coming ? `raiders on the way` : `heat ${Math.round(s.raid?.heat || 0)}`), show: () => ({ defence: 'raids' }) },
  // ---- version 4: the decks (docs/COLONY-V4.md)
  { id: 'lift', speaker: 'ruess', title: 'Repair a lift',
    text: 'Eden is three decks deep: the habitat rings above us and the machinery and catacombs below. The gold-rimmed pits are lift shafts. Repair a Lift on the one in our own chamber, and the decks above and below open to survey.',
    done: (s) => s.buildings.some((b) => b.key === 'lift' && b.build === 0), show: () => ({ build: 'lift' }) },
  { id: 'upper', speaker: 'ruess', title: 'Open a chamber on the upper deck',
    text: 'Ride the lift up: the upper deck has sky gardens and galleries under the glass. Survey a chamber the lift reaches, seal it and pump in air, as we did down here.',
    done: (s) => s.chambers.some((c) => c.deck === 'upper' && c.status === 'open'), show: (s) => deckChamber(s, 'upper') },
  { id: 'lower', speaker: 'sato', title: 'Open a chamber on the lower deck',
    text: 'The lower deck is pumps, cisterns and flooded tunnels, and the old core still runs hot down there. People say the catacombs are not empty. Open a chamber below and see.',
    done: (s) => s.chambers.some((c) => c.deck === 'lower' && c.status === 'open'), show: (s) => deckChamber(s, 'lower') },
];

// The next chamber to open on another deck: one being worked on, else a sealed one a working lift reaches.
function deckChamber(s, deck) {
  const on = s.chambers.filter((c) => c.deck === deck);
  const busy = on.find((c) => c.status !== 'sealed' && c.status !== 'open');
  // a big chamber may need more air than the stores hold: point at an air depot first (as airFor does)
  if (busy && busy.status === 'surveyed' && openBreaches(s, busy).length === 0 && pressuriseAir(s, busy) > (storageCaps(s).air || 0)) return { build: 'depot' };
  if (busy) return { chamber: busy.id };
  const lifts = s.buildings.filter((b) => b.key === 'lift' && b.build === 0);
  for (const l of lifts) {
    const ch = s.decks?.[deck]?.ch?.[l.y * s.map.w + l.x];
    const c = ch !== undefined && ch !== 255 && on.find((k) => k.id === ch);
    if (c && c.status === 'sealed') return { chamber: c.id };
  }
  return lifts.length ? null : { build: 'lift' };
}

const active = (s) => GOALS.filter((g) => !g.only || g.only(s) || (s.goals?.done || []).includes(g.id));

// What the interface shows: the current goal and the checklist.
export function goalStatus(state) {
  const done = new Set(state.goals?.done || []), list = active(state).map((g) => ({ id: g.id, title: g.title, done: done.has(g.id) }));
  const g = active(state).find((x) => !done.has(x.id));
  const grant = diffOf(state).grant;
  return {
    current: g ? { id: g.id, title: g.title, text: g.text, speaker: g.speaker, progress: g.progress?.(state) || '', show: g.show?.(state) || null, reward: { ...grant } } : null,
    done: list.filter((x) => x.done).length, total: list.length, list,
  };
}

// Each day: a finished current goal pays the Council grant and announces the next one (an event
// that pauses the clock). Goals already met when they come up are passed through one a day.
export function updateGoals(state) {
  state.goals ??= { done: [] };
  const done = new Set(state.goals.done), g = active(state).find((x) => !done.has(x.id));
  if (!g || !g.done(state)) return null;
  state.goals.done.push(g.id);
  const grant = diffOf(state).grant;
  state.stock.credits += grant.credits; state.stock.parts += grant.parts;
  log(state, `Goal done: ${g.title}. The Council grants ${grant.credits} credits and ${grant.parts} parts.`);
  const next = active(state).find((x) => !state.goals.done.includes(x.id));
  const p = addPending(state, 'goal', `Goal done: ${g.title}`, `The Council grants ${grant.credits} credits and ${grant.parts} parts. `
    + (next ? `Next: ${next.title}. ${next.text}` : 'Every goal is done: Eden is yours to grow as you see fit.'));
  p.speaker = next?.speaker || g.speaker;
  return g.id;
}

// The advisor: what is going wrong or about to, worst first, each with a way to fix it.
const FIX = {
  food: ['Plant Farm Fields on fertile river soil, or build a Hydroponics Bay', { build: 'farm' }],
  water: ['Build a River Pump beside the river', { build: 'riverpump' }],
  air: ['Build an Air Plant, or plant Forest Groves', { build: 'airplant' }],
};
export function advise(state) {
  const s = summary(state), out = [], dv = diffOf(state);
  for (const g of ['food', 'water', 'air']) {
    const { have, delta } = s.stock[g];
    if (delta >= 0) continue;
    const days = Math.floor(have / -delta);
    if (have < 1) out.push({ level: 'bad', text: `Colonists are going without ${g}! ${FIX[g][0]}.`, show: FIX[g][1] });
    else if (days < 15) out.push({ level: days < 5 ? 'bad' : 'warn', text: `${g[0].toUpperCase() + g.slice(1)} runs out in ${days} day${days === 1 ? '' : 's'} (${Math.round(delta)} a day). ${FIX[g][0]}.`, show: FIX[g][1] });
  }
  if (s.power.demand > s.power.supply + 1e-6) out.push({ level: s.power.battery > 0 ? 'warn' : 'bad', text: `Power is short (${Math.round(s.power.supply)} made, ${Math.round(s.power.demand)} needed): everything powered slows down. Build Solar Arrays on the hull.`, show: { build: 'solar' } });
  else if (s.power.demand > 0.85 * s.power.supply) out.push({ level: 'tip', text: `Power is nearly used up (${Math.round(s.power.demand)} of ${Math.round(s.power.supply)}): the next homes or workshops will need more. Add a Solar Array on the hull.`, show: { build: 'solar' } });
  if (state.flags.unpaid) out.push({ level: 'bad', text: 'The treasury is empty: upkeep goes unpaid and work slows. Sell goods at the Market or switch off what you don\'t need.', show: { market: true } });
  else {
    const c = s.stock.credits;
    if (c.delta < 0 && c.have / -c.delta < 25) out.push({ level: 'warn', text: `Credits run out in ${Math.floor(c.have / -c.delta)} days. Sell food or ore at the Market, or raise the tax a little.`, show: { market: true } });
  }
  if (s.jobs > state.pop) out.push({ level: 'warn', text: `${s.jobs} jobs but only ${state.pop} colonists: every workplace runs at ${Math.round((state.pop / s.jobs) * 100)}%. More homes bring more colonists; switch off what you don't need.`, show: { build: 'habitat' } });
  if (s.housing <= state.pop) out.push({ level: 'warn', text: 'Every home is full: the next ship will not dock. Build Habitats.', show: { build: 'habitat' } });
  if (state.happy < dv.transportHappy) {
    const worst = [...(state.happyParts || [])].sort((a, b) => a.value - b.value)[0];
    out.push({ level: 'warn', text: `Happiness ${Math.round(state.happy)} is below ${dv.transportHappy}: ships won't dock.${worst && worst.value < 0 ? ` Worst: ${worst.label} (${Math.round(worst.value)}).` : ''} Parks help; so does a lower tax.`, show: { build: 'park' } });
  }
  if (state.stock.parts < 20 && s.stock.parts.delta <= 2) out.push({ level: 'tip', text: 'Parts are scarce. The Command Centre makes a few a day; a Salvage Yard (at 80 colonists) turns rubble into many; finished goals bring Council grants.', show: null });
  const order = { bad: 0, warn: 1, tip: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]).slice(0, 5);
}
