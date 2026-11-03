// Earthlight Space Colony Rebuild: commanders and wanderers (docs/COLONY.md §13.2–13.3, version 3).
// Original characters. The General is the ceiling (owner): power ×2, evasion ×2, level 9, in any
// machine; the others are weaker specialists and never stronger than the General.
//   might / wits / charm   Lanternfall's three stats (0..100): battle, management, people
//   grades                 per machine class (data/machines.js cls): S A B C D
//   style                  one weapon habit: melee | gunner | beam | railgun | missile
//   perk                   a conditional knack (PERKS)
//   wage                   credits a day; loyalty 0..100 drifts with happiness and pay
//   portrait               art slot (js/colony/art.js); the expansion's SVG portraits for story characters
export const CLASSES = ['hu', 'planes', 'armour', 'ships', 'support'];
export const CLASS_NAME = { hu: 'HU', planes: 'Planes', armour: 'Armour', ships: 'Ships', support: 'Support' };
// Grade → power multiplier in that class (scaled by might/100 towards it), capped below the General.
export const GRADE = { S: 1.6, A: 1.4, B: 1.2, C: 1.0, D: 0.85 };
export const GENERAL_POWER = 2, GENERAL_EVASION = 2;
export const STYLES = {
  melee: 'Close fighter: +15% with range-1 weapons.', gunner: 'Marksman: +15% at range.',
  beam: 'Beam specialist: +15% with beams.', railgun: 'Railgun specialist: +15% with railguns.', missile: 'Missile specialist: +15% with missiles.',
};
export const PERKS = {
  ace: { name: 'Ace', text: 'Planes they lead strike first: +10% in a raid.' },
  bulwark: { name: 'Bulwark', text: 'Their machine shrugs off hits: takes a quarter less damage.' },
  mechanic: { name: 'Mechanic', text: 'Repairs to their machine cost half.' },
  quartermaster: { name: 'Quartermaster', text: 'Their machine\'s upkeep is halved.' },
  hunter: { name: 'Hunter', text: 'Wins pay a fifth more salvage.' },
  steady: { name: 'Steady', text: 'Never leaves, whatever the pay or the mood.' },
};
// Departments a commander can head (one each): + (stat / 10)% to what the department does.
export const DEPARTMENTS = {
  agriculture: { name: 'Agriculture', stat: 'wits', text: 'Farms, orchards, fisheries and mushroom walls' },
  industry: { name: 'Industry', stat: 'wits', text: 'Mines, smelters, fabricators and skimmers' },
  research: { name: 'Research', stat: 'wits', text: 'Research Labs' },
  security: { name: 'Security', stat: 'might', text: 'Guardian strength in raids' },
  trade: { name: 'Trade', stat: 'charm', text: 'Market prices' },
  welfare: { name: 'Welfare', stat: 'charm', text: 'Happiness (+ charm / 20)' },
};

// The General and Capt. Sato are commanders from the start.
export const GENERAL = { key: 'general', name: 'The General', title: 'Governor of Eden', might: 100, wits: 90, charm: 80, general: true,
  grades: { hu: 'S', planes: 'S', armour: 'S', ships: 'S', support: 'S' }, style: null, perk: 'steady', wage: 0, portrait: null, svg: null,
  text: 'Won the war and sold the fleet to rebuild Eden. Still the best pilot alive.' };
export const STARTERS = [
  { key: 'sato', name: 'Capt. Mira Sato', title: 'Commander of the Guardians', might: 74, wits: 78, charm: 66,
    grades: { hu: 'C', planes: 'B', armour: 'C', ships: 'S', support: 'B' }, style: 'missile', perk: 'steady', wage: 6, portrait: 'portrait/sato', svg: 'sato',
    text: 'The General\'s second since the coup. Calm, dry, and the best carrier captain left.' },
];
// Wanderers (Lanternfall): they arrive at a Wanderers' Lodge, stay a while, and can be invited.
// `flaw` is the baggage that comes with the best ones (Darkest Dungeon's rule).
export const WANDERERS = [
  { key: 'w_kestrel', name: 'Rell Kestrel', title: 'Former Union Ace', might: 78, wits: 58, charm: 52, grades: { hu: 'B', planes: 'S', armour: 'C', ships: 'D', support: 'C' }, style: 'gunner', perk: 'ace', wage: 8, loyalty: 55, flaw: 'Proud: wants a raise after every won raid.' },
  { key: 'w_brann', name: 'Oska Brann', title: 'Galt Brawler', might: 84, wits: 40, charm: 44, grades: { hu: 'S', planes: 'D', armour: 'B', ships: 'D', support: 'C' }, style: 'melee', perk: 'bulwark', wage: 7, loyalty: 60, flaw: 'Hot-headed: −2 happiness while unpaid.' },
  { key: 'w_ilves', name: 'Dana Ilves', title: 'Cruiser Captain', might: 60, wits: 74, charm: 62, grades: { hu: 'C', planes: 'C', armour: 'C', ships: 'S', support: 'B' }, style: 'missile', perk: 'quartermaster', wage: 9, loyalty: 65 },
  { key: 'w_oduya', name: 'Tem Oduya', title: 'Dockyard Engineer', might: 40, wits: 86, charm: 58, grades: { hu: 'C', planes: 'D', armour: 'B', ships: 'C', support: 'A' }, style: 'railgun', perk: 'mechanic', wage: 6, loyalty: 70 },
  { key: 'w_vashti', name: 'Nell Vashti', title: 'Salvage Hunter', might: 66, wits: 64, charm: 48, grades: { hu: 'B', planes: 'B', armour: 'A', ships: 'D', support: 'C' }, style: 'beam', perk: 'hunter', wage: 7, loyalty: 45, flaw: 'Restless: leaves sooner when loyalty drops.' },
  { key: 'w_corran', name: 'Abel Corran', title: 'Retired Gunnery Chief', might: 58, wits: 70, charm: 60, grades: { hu: 'C', planes: 'C', armour: 'B', ships: 'A', support: 'A' }, style: 'railgun', perk: 'steady', wage: 6, loyalty: 75 },
  { key: 'w_maris', name: 'Juno Maris', title: 'Courier Pilot', might: 62, wits: 60, charm: 72, grades: { hu: 'C', planes: 'A', armour: 'D', ships: 'C', support: 'B' }, style: 'gunner', perk: 'ace', wage: 6, loyalty: 60 },
  { key: 'w_thorne', name: 'Grey Thorne', title: 'Deserter Sergeant', might: 80, wits: 46, charm: 38, grades: { hu: 'A', planes: 'C', armour: 'A', ships: 'D', support: 'C' }, style: 'melee', perk: 'bulwark', wage: 8, loyalty: 35, flaw: 'Deserted once: loyalty falls twice as fast.' },
  { key: 'w_seln', name: 'Ama Seln', title: 'Hydroponics Steward', might: 30, wits: 80, charm: 76, grades: { hu: 'D', planes: 'D', armour: 'C', ships: 'C', support: 'B' }, style: null, perk: 'quartermaster', wage: 5, loyalty: 80 },
  { key: 'w_okafor', name: 'Lio Okafor', title: 'Signals Officer', might: 50, wits: 82, charm: 64, grades: { hu: 'C', planes: 'B', armour: 'C', ships: 'B', support: 'B' }, style: 'beam', perk: 'mechanic', wage: 7, loyalty: 65 },
  { key: 'w_rook', name: 'Cass Rook', title: 'Cartel Defector', might: 70, wits: 66, charm: 70, grades: { hu: 'B', planes: 'B', armour: 'B', ships: 'B', support: 'C' }, style: 'missile', perk: 'hunter', wage: 10, loyalty: 40, flaw: 'Moraine wants her back: raids come a little more often while she serves.' },
  { key: 'w_hale', name: 'Ivo Hale', title: 'Old Galt Ace', might: 82, wits: 62, charm: 50, grades: { hu: 'A', planes: 'A', armour: 'C', ships: 'D', support: 'D' }, style: 'beam', perk: 'ace', wage: 11, loyalty: 50, flaw: 'Expensive: the best pilot here knows it.' },
];
for (const w of WANDERERS) w.portrait = `portrait/${w.key}`;
export const COMMANDER = Object.fromEntries([GENERAL, ...STARTERS, ...WANDERERS].map((c) => [c.key, c]));
// Commanders the colony can keep: the General and Sato, plus two per Officers' Quarters.
export const BASE_COMMANDERS = 2, PER_QUARTERS = 2;
