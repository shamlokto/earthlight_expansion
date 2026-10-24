// Mission 1, Betrayal: MAP-ASIMOV, Hamilton Command on F1 Olympos (docs/EXPANSION.md).
// The general breaks out of the locked-down base and runs for the east edge. Rebalanced after
// the first playtest: the Union mecha start 5-6 hexes from the gate, the cruiser screen waits
// behind the meteoroid gap, the base's own troops come out on turn 5, and the general plus two
// units must get away.
export default {
  name: 'ASIMOV', title: 'Betrayal', screens: [2, 1],
  objective: { kind: 'escape', edge: 'east', count: 2 }, turnLimit: 12, cap: 6, music: 0,
  chapter: "Chapter 1 · F1 Olympos, Hamilton Command",
  transmission: "All units, Hamilton Command. This is Marshal Kessrin, Security Directorate. The commander's murderer is the deputy commander. He is trying to leave the base. Stop him. Alive, if it is convenient.",
  strategy: ["Out of the gate on turn 1. The two Talos outside fire beams: shelter in the magnetic band, where beams can't reach you, and kill them from there.", "Run for the meteoroid fields in the north or south. The Hannibal and the Fenrirs can't enter meteoroids, so cross the gap through the rocks, not the open middle.", "The garrison comes out of the base behind you on turn 5 and hunts your carrier. Keep the Selene moving east, ahead of the pack.", "Only the general and two more machines have to get off the east edge. Don't turn back for stragglers."],
  plan: [{"n": 1, "path": [[4, 5], [8, 5], [13, 5]]}, {"n": 2, "path": [[14, 4], [18, 2], [22, 2]]}, {"n": 4, "path": [[23, 3], [28, 4]]}, {"n": 3, "at": [3, 3], "note": "Garrison sorties T5"}],
  briefing: `
Hamilton Command, F1 Olympos. The commander is dead, shot in the command centre an hour after the victory parade, and the Union's new masters already call it the work of Galt saboteurs.

You were his deputy, and you know better. The base is locking down around you. A handful of crews have chosen to follow you rather than the men who gave the order.

Take the gate before it seals, cross the magnetic band and get through the meteoroid gap to the east. The Union's beam weapons can't touch a ship sheltering in the magnetic field; their cruisers can't follow you into the meteoroids.`,
  //          11111111112222222222
  // 12345678901234567890123456789
  terrain: `
#######...mm.......:::::.....
#ddddd#....mm......:::::..a..
#ddddd#.....mm.....::::.....a
#ddddd#......mm.....::::.....
#dddddd.......mm.............
#dddddd........mm............
#ddddd#........mm...::::.....
#ddddd#.......mm...:::::..a..
#ddddd#......mm....:::::.....
#######.....mm.....:::::..aa.`,
  units: `
.............................
...........m............f....
..S..........................
...M.....t...................
..G..........................
....C....................h...
..TM.....t...................
.............................
............m...........f....
.............................`,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena (bomber form), the general's machine
    M: { type: 0, army: 0 },                  // Mars
    T: { type: 1, army: 0 },                  // Titan
    C: { type: 9, army: 0 },                  // Crane
    S: { type: 38, army: 0 },                 // Selene, light carrier
    m: { type: 0, army: 1 },                  // Union Mars
    t: { type: 2, army: 1 },                  // Union Talos
    h: { type: 39, army: 1 },                 // Hannibal cruiser
    f: { type: 49, army: 1 },                 // Fenrir destroyer
  },
  // the base's garrison comes out behind you (rules.js: event turn 4 = the Union phase of turn 5)
  // ... and hunts the player's carriers (ai.js `chase`)
  arrivals: [{ turn: 4, army: 1, units: [{ type: 2, x: 2, y: 2, chase: 'carriers' }, { type: 2, x: 2, y: 9, chase: 'carriers' }, { type: 3, x: 3, y: 2, chase: 'carriers' }] }],
};
