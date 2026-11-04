// Earthlight Space Colony Rebuild: the secrets of the deserted colony (version 4, stage 2;
// docs/COLONY-V4.md §2, owner's D22). Original writing. Sites are placed by js/colony/secrets.js
// in chambers (mostly the lower deck), revealed when their chamber is surveyed, and collected in
// the Discoveries journal.
//
// The mystery: Eden was hardly a battlefield, yet it is half dead. In the war's last year Marshal
// Kessrin's Union Security Directorate took Eden's lower decks as a black site ("Site Ninefold")
// under cover of a quarantine, and built a Quantum Decimator test rig in the old core. On day 211
// of the quarantine the test went wrong: it gutted the lower decks and tore the hull. The
// Directorate announced a Galt raid and evacuated the colony; the few who knew the truth hid in
// the catacombs. The final vault holds the proof, and the registry of Eden's people.

// ---------------------------------------------------------------- logs
// key: one of the five fragments of the final vault's code (the vault opens when all five are read).
// deck: where the generator prefers to place it. order: the story's order in the journal.
export const LOGS = [
  { id: 'l01', order: 1, deck: 'main', author: 'Colony bulletin', title: 'Quarantine notice',
    text: 'By order of the Union Security Directorate, the lower decks of Eden are closed for the duration of a biological quarantine. Residents will not approach the lifts. Rations continue as normal. Thank you for your patience in this difficult time.' },
  { id: 'l02', order: 2, deck: 'upper', author: 'Pim, age 9', title: 'Diary: the men in grey',
    text: 'Men in grey coats came up the lift today and Mum said not to look at them. Old Marrow the warden shouted at one of them in the garden. I think she won. The lift has a lock on it now.' },
  { id: 'l03', order: 3, deck: 'lower', author: 'Warden Ilse Marrow', title: 'Warden\'s log: the requisition', key: 1,
    text: 'They call it a quarantine. Nobody is sick. They took the cisterns, the pump hall and the old core, and they brought in machines I have never seen, with Directorate seals on the crates. If anyone reads this: the code to my vault begins with the year Eden was founded.' },
  { id: 'l04', order: 4, deck: 'lower', author: 'Unknown, scratched into a wall', title: 'Galt hands',
    text: 'We are Galt prisoners from Aldiss. They make us dig under the core, twelve hours, no sun. One of us asked what the cavity is for. He did not come back to the barracks. If Ahriman wins, remember us. If the Union wins, remember us louder.' },
  { id: 'l05', order: 5, deck: 'lower', author: 'Directorate memo', title: 'Site Ninefold: schedule',
    text: 'SITE NINEFOLD. Decimator core installation complete day 140. Containment rings to be tested at 30% yield day 190, 60% day 205, full yield day 211. Civilian population above to be kept unaware. Authority: Directorate, Office of the Marshal.' },
  { id: 'l06', order: 6, deck: 'upper', author: 'Pim, age 9', title: 'Diary: the shaking',
    text: 'The floor shook in the night and all the lamps swung. Dad says it\'s the pumps. Dad is lying, I can tell when he does his eyebrows. Marrow came round and gave us candles and said keep them, just in case.' },
  { id: 'l07', order: 7, deck: 'lower', author: 'Engineer Tobias Venn', title: 'Venn: the 60% test', key: 2,
    text: 'Sixty percent held, barely. Ring three drifted out of phase for four seconds. I told Major Hesk we are not ready for full yield. He said the Marshal does not want to hear the word ready. I wrote the vault code\'s second part on the back of my badge; I don\'t trust my memory any more.' },
  { id: 'l08', order: 8, deck: 'main', author: 'Farmer\'s note, pinned to a gate', title: 'The river runs warm',
    text: 'River\'s running warm from the lower deck end. Fish went belly-up by the weir. Reported it twice. Grey coats said it\'s the quarantine filters. Since when do filters cook fish.' },
  { id: 'l09', order: 9, deck: 'lower', author: 'Major Hesk, Directorate', title: 'Hesk: orders for day 211',
    text: 'Full yield proceeds at 0300. Civilian lift locks engaged. In the event of a containment failure, Protocol Ash is in force: the incident will be attributed to Galt action, the colony evacuated, and all Ninefold staff withdrawn. No one stays behind. No one.' },
  { id: 'l10', order: 10, deck: 'lower', author: 'Engineer Tobias Venn', title: 'Venn: 0302', key: 3,
    text: 'Ring three again. The cavity folded in on itself, half the lower deck went with it, the hull is open to space on the east side. Hesk is on the last shuttle. I am not. Someone has to seal the core before it eats the rest. Third part of the code is the ring that failed.' },
  { id: 'l11', order: 11, deck: 'upper', author: 'Pim, age 9', title: 'Diary: the Galt attack',
    text: 'They said on the speakers it was a Galt attack and we have to go to the ships. But there weren\'t any Galt ships, I was at the window the whole time. Marrow didn\'t get on the ship. She said someone has to mind the gardens.' },
  { id: 'l12', order: 12, deck: 'main', author: 'Evacuation officer', title: 'Evacuation manifest (partial)',
    text: 'Eden evacuated in 31 hours. 11,402 residents embarked. Unaccounted: 63. Search suspended on Directorate order: lower decks unsafe. Note added by hand: the warden refused to board. So did the engineer from the quarantine.' },
  { id: 'l13', order: 13, deck: 'lower', author: 'Warden Ilse Marrow', title: 'Warden\'s log: the catacombs', key: 4,
    text: 'Sixty-one of us in the old crypts under the fields, and the engineer, who keeps apologising. We have water from the cisterns and fungus on the walls. Whoever finds this, the fourth part of the code is how many of us there were the first night.' },
  { id: 'l14', order: 14, deck: 'lower', author: 'Engineer Tobias Venn', title: 'Venn: sealing the core',
    text: 'The core is clamped and the cavity sealed behind a vault door. Everything is inside: the test logs, Hesk\'s orders, the Marshal\'s own seal on the authorisation, and Ilse\'s registry of every soul who lived on Eden. If the Union ever asks what happened here, the answer is behind that door.' },
  { id: 'l15', order: 15, deck: 'upper', author: 'Graffiti in a gallery', title: 'IT WASN\'T GALT',
    text: 'IT WASN\'T GALT. ASK THE GREY COATS WHAT THEY BURIED. ASK THE MARSHAL.' },
  { id: 'l16', order: 16, deck: 'lower', author: 'Directorate drone log', title: 'Sentry instruction set',
    text: 'SENTRY UNITS 1-40. Hold the Ninefold perimeter. Engage any person without Directorate authority. Instruction expires: never. Maintenance cycle: self.' },
  { id: 'l17', order: 17, deck: 'main', author: 'Union broadcast, transcribed', title: 'The Marshal on Eden',
    text: '"Eden fell to a cowardly Galt strike on a civilian colony. Every one of its people will be avenged." Marshal Kessrin, three days after the evacuation. The broadcast is stamped with the Directorate\'s seal.' },
  { id: 'l18', order: 18, deck: 'lower', author: 'Warden Ilse Marrow', title: 'Warden\'s log: the last entry', key: 5,
    text: 'The engineer wants to try for the surface lift tonight; the drones have learned our paths. I am staying with the ones too sick to move. The last part of the code is my name for this place: the word for what we kept. When you open the vault, read the names out. All of them.' },
  { id: 'l19', order: 19, deck: 'upper', author: 'Pim, age 9 (later hand)', title: 'Diary, last page',
    text: 'I\'m twelve now and on a transport to somewhere. I kept the diary. If anyone finds Eden again, the strawberries were by the Lantern Ring and Marrow knew every name. Tell her Pim said thank you.' },
  { id: 'l20', order: 20, deck: 'lower', author: 'Engineer Tobias Venn', title: 'Venn: for whoever comes',
    text: 'If you have read this far you have the five parts. The door will open for them. I am sorry for what we built here. I am sorrier for what we said afterwards.' },
];
// The final vault's code, in the logs: founding year, the failed ring, the first night's number, and Marrow's word.
export const FINAL_CODE_PARTS = 5;

// ---------------------------------------------------------------- vaults
// requires: what opens it (any of): { key: logId } a log read · { drained: true } no flooded ground in its chamber ·
// { cleared: true } its chamber's danger dealt with · { power: n } spare power of n while opening · { code: true } every key log read.
// reward: { goods: { good: n }, research: n, machine: type, tech: key, soil: n (poor tiles in the chamber made fertile),
//           survivors: groupId, final: true }
export const VAULTS = [
  { id: 'v_stores', name: 'Quarantine stores', deck: 'lower', requires: { drained: true }, reward: { goods: { parts: 300, alloy: 120 } },
    text: 'Crates the Directorate never shipped out: parts and alloy, stamped NINEFOLD.' },
  { id: 'v_helium', name: 'Reactor fuel cache', deck: 'lower', requires: { cleared: true }, reward: { goods: { helium: 120 }, research: 80 },
    text: 'Helium-3 canisters for the test rig, and the engineers\' notebooks.' },
  { id: 'v_msnp', name: 'Prototype hangar A', deck: 'lower', requires: { key: 'l07', cleared: true }, reward: { machine: 46 },
    text: 'A Directorate prototype under a tarpaulin: the MSNP-II, never fielded in the war.' },
  { id: 'v_msfb', name: 'Prototype hangar B', deck: 'lower', requires: { key: 'l10', power: 40 }, reward: { machine: 48 },
    text: 'The second prototype: the MSFB-5, fuelled and waiting for a pilot who never came.' },
  { id: 'v_seeds', name: 'Seed archive', deck: 'upper', requires: { key: 'l02' }, reward: { soil: 40, goods: { food: 300 } },
    text: 'Marrow\'s seed archive, kept cold behind the gardens: Eden\'s own strains. The soil around it remembers.' },
  { id: 'v_blue', name: 'Engineer\'s drafting room', deck: 'main', requires: { key: 'l14' }, reward: { research: 200, tech: 'heavyworks' },
    text: 'Venn\'s drawings: Union machine works in every detail. Ruess will want these.' },
  { id: 'v_final', name: 'The Ninefold vault', deck: 'lower', requires: { code: true, cleared: true }, reward: { final: true, goods: { parts: 500 }, research: 300 },
    text: 'The sealed core and everything Venn put beside it: the test logs, Hesk\'s orders, the Marshal\'s seal, and the registry of Eden\'s people.' },
];

// ---------------------------------------------------------------- survivors
// Found when their chamber is surveyed; they join when it is open (pop, and a commander key if any).
export const SURVIVORS = [
  { id: 's_garden', name: 'The garden families', deck: 'upper', pop: 24, text: 'Families who hid in the sky gardens and lived on what grew. They have kept the rings alive for years.' },
  { id: 's_crypt', name: 'The catacomb survivors', deck: 'lower', pop: 31, commander: 'marrow', text: 'The last of Warden Marrow\'s sixty-one, and Marrow herself, older and fiercer than her logs.' },
  { id: 's_pumps', name: 'The pump hall crew', deck: 'lower', pop: 15, text: 'Engineers who kept the pumps turning so the lower deck would not drown.' },
  { id: 's_venn', name: 'Engineer Tobias Venn', deck: 'lower', pop: 1, commander: 'venn', requires: { key: 'l20' }, text: 'Alive, barely, in a sealed workshop: the man who built the rig and then sealed it.' },
  { id: 's_market', name: 'The old market traders', deck: 'main', pop: 18, text: 'Traders who sheltered in a sealed arcade and kept a ledger of every debt owed to them.' },
];
// Two unique commanders among the survivors (data/commanders.js shape).
export const SURVIVOR_COMMANDERS = [
  { key: 'marrow', name: 'Warden Ilse Marrow', title: 'Last Warden of Eden', might: 46, wits: 80, charm: 92, grades: { hu: 'C', planes: 'D', armour: 'C', ships: 'C', support: 'B' },
    style: null, perk: 'steady', wage: 4, loyalty: 95, svg: null, text: 'Knew every name on Eden. Stayed behind with the ones who could not leave.' },
  { key: 'venn', name: 'Tobias Venn', title: 'Former Directorate Engineer', might: 52, wits: 94, charm: 40, grades: { hu: 'B', planes: 'C', armour: 'A', ships: 'B', support: 'S' },
    style: 'railgun', perk: 'mechanic', wage: 8, loyalty: 60, svg: null, text: 'Built the Ninefold rig, then sealed it. Spends the rest of his life making amends.' },
];

// ---------------------------------------------------------------- dangers
// A chamber may hold one; it must be dealt with before the chamber can be pressurised (except the reactor).
//   drones   Directorate sentries: clear them by sending guardians (auto-resolved like a raid; strength).
//   toxic    Toxic air: decontaminate (a crew job: parts and days).
//   radiation  Near the old core: decontaminate (more parts, more days; a Shield Pylon on the deck halves it).
//   flooded  Flooded ground: drain it with Pump Stations (the chamber's MARSH tiles must be gone).
//   reactor  The old core stirs once its chamber is surveyed: stabilise it (a crew job) within `deadline` days,
//            or it damages buildings on its deck and reseals two chambers there.
export const DANGERS = {
  drones: { name: 'Directorate sentries', strength: [300, 900], text: 'Sentry drones still guard the Ninefold perimeter. Send guardians to clear them.' },
  toxic: { name: 'Toxic air', cost: { credits: 300, parts: 40 }, days: 6, text: 'Something in the air here burns the throat. Decontaminate before pumping in air.' },
  radiation: { name: 'Radiation', cost: { credits: 600, parts: 80 }, days: 10, text: 'Close to the old core, the walls still glow on the counters. Decontaminate (a Shield Pylon on this deck halves the work).' },
  flooded: { name: 'Flooding', text: 'Burst mains have flooded the floor. Pump Stations drain it, a tile at a time.' },
  reactor: { name: 'The old core', cost: { credits: 1000, parts: 150 }, days: 12, deadline: 60, text: 'The Ninefold core is stirring. Stabilise it before the deadline or it will tear through this deck.' },
};
