// Mission 2, Old Enemies: MAP-LEM, the Aldiss asteroids (docs/EXPANSION.md).
// A Union patrol hunts the fugitives and a Galt remnant band hiding in the NE meteoroids. The
// band joins the player on turn 2. The patrol is missile-heavy, and missiles lose 40% against
// targets in meteoroid fields; its destroyers can't enter meteoroids or asteroids at all.
export default {
  name: 'LEM', title: 'Old Enemies', screens: [2, 2],
  objective: { kind: 'annihilate' }, cap: 6, music: 25,
  briefing: `
The Aldiss belt. We came here to disappear, and for two days it worked.

Then the long-range scopes picked up a Union patrol sweeping the belt, and something else: a Galt signal, old army codes, from the meteoroid field to the northeast. Remnants of the Emperor's fleet have been hiding here since Babylon fell. The patrol is hunting them too.

They were our enemies a month ago. Today the same men want us both dead. Break the patrol, and give the Galt crews a reason to trust the general.

Their missiles lose much of their bite against ships sheltering in the meteoroids, and their destroyers can't follow you into the rocks.`,
  //          11111111112222222222
  // 12345678901234567890123456789
  terrain: `
::::...aa....::::....aa..::::
:::....a.....:::.....a..:::::
::.......aa.......aa....:::::
.........aaa......aaa...::::.
....::...........::.....:::..
...::::.....a....:::.....::..
...:::.....aaa............aa.
....:.......a.......::....aaa
..aa..............::::.....a.
.aaa......::......:::........
..a.......:::.......a.....::.
..........::.......aaa....:::
.....aa.............a....::::
....aaaa......::..........:::
.....aa......::::.....aa.....
...::.........::.....aaaa....
..::::...aa...........aa..::.
..:::....aaa.....::.......:::
...::.....a.....::::.......::
...........aa...:::....aa....`,
  units: `
.............................
.............................
.............................
.............................
.........m...................
.............................
...............d.............
.............................
............g.....c..........
.............................
.G...................e.......
...M.....................m...
..S..........d...............
.T...........................
..C.......c..................
.M...........................
.............................
.............................
.............................
.............................`,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 },                  // Mars
    T: { type: 1, army: 0 },                  // Titan
    C: { type: 9, army: 0 },                  // Crane
    S: { type: 38, army: 0 },                 // Selene
    c: { type: 16, army: 1 },                 // Cyclops missile gunboat
    m: { type: 3, army: 1 },                  // Medusa missile mecha
    d: { type: 50, army: 1 },                 // Cerberus destroyer
    g: { type: 51, army: 1 },                 // Gulon destroyer
    e: { type: 50, army: 1 },                 // Cerberus destroyer (east)
  },
  // the Galt band breaks cover and joins on turn 2 (event turn 1 = the player phase of turn 2)
  arrivals: [{ turn: 1, army: 0, units: [{ type: 8, x: 26, y: 3 }, { type: 8, x: 27, y: 4 }, { type: 9, x: 25, y: 5 }, { type: 9, x: 28, y: 2 }] }],
};
