// Map scripts: what each side must do to win, plus per-map extras (turn limits, guards).
// Hand-written from the English briefings (brief block, 4 pages per map) and the game's own
// victory lines (labels 0-8); the ROM's own script format is not decoded.
//
// The general rule follows the unit descriptions: a side is defeated when it has nothing
// left, when it loses every command centre (Brain, CT-TYX6) it started with, or when it loses
// its military fortress (Solomon / Carthage / Goliath, FOR-TY1/2/4). Azzam (CT-TY4) only
// controls the Buccaneer cannon and doesn't count. On top of that some maps have a Galt
// flagship or carrier group whose loss ends the battle.
//
// Reinforcements and starting cargo come from the ROM (scenario.js); scripts only add what
// the tables can't say.
import { distance } from './rules.js';

export const BRAIN = 56, AZZAM = 57;
export const FORTRESSES = new Set([53, 54, 55]);
const CARRIER_CAT = 1;

// Victory line per win reason (labels block, index = reason).
export const WIN_LINE = { tower: 0, annihilate: 1, fortress: 2, fleet: 3, battleship: 4, carrier: 5, carriers: 6, flagship: 7, towers: 8 };

// One entry per map. `win`: how the Union wins besides the general rule
//   (flagship: Galt loses when its first unit of `type` is destroyed; carriers: when all its
//   carriers are gone). `line`: which victory line to show. `limit`: Galt wins if the Union
//   hasn't won by the end of that turn. `guards`: Galt units within `guards` hexes of their
//   own command centre or fortress hold their post (see ai.js).
export const SCRIPTS = [
  /* 0 Hamilton Must Stand Fast */ { line: 'annihilate', goal: 'Destroy the Galt strike group. Hamilton Command must survive.' },
  /* 1 Gallun Breakthrough */     { line: 'tower', goal: "Break through: destroy Galt's command centre.", guards: 2 },
  /* 2 Escape from Bertram */     { line: 'tower', goal: 'Capture the dock, repair, then destroy the command centre.', guards: 2 },
  /* 3 Fort Rucker */             { line: 'fortress', goal: 'Capture the neutral docks and destroy the Galt fortress.', guards: 2 },
  /* 4 Raymond Campaign */        { line: 'tower', goal: 'Seize the bombers in the neutral docks and destroy the command centre.', guards: 2 },
  /* 5 Uniting the Fleet */       { line: 'fleet', goal: 'Rescue the flotilla: destroy the Galt fleet.' },
  /* 6 Le Guin */                 { line: 'battleship', win: { flagship: 30 }, goal: "Sink the Admiral's battleship Tiamat." },
  /* 7 Defense of Olympos */      { line: 'fleet', goal: 'Repel the all-out attack: destroy the Galt fleet. Protect the command centre.' },
  /* 8 Gate of Eden */            { line: 'fortress', goal: 'Take the docks and destroy the Galt fortress.', guards: 2 },
  /* 9 Into the Lion's Den */     { line: 'tower', goal: "Get past Nemea's wall and destroy the command centre.", guards: 3 },
  /* 10 Norton's Watch */         { line: 'carrier', win: { flagship: 35 }, goal: 'Destroy the flagship, the carrier Iris.' },
  /* 11 Blockade of Van Vogt */   { line: 'fortress', goal: 'Get through the mines and fluxes and destroy the fortress.', guards: 2 },
  /* 12 Arthur's Belt */          { line: 'fortress', goal: 'Destroy the fortress before the Galt fleet arrives.', guards: 2 },
  /* 13 Moore's Star */           { line: 'carriers', win: { carriers: true }, goal: 'Sink every Galt carrier.' },
  /* 14 Foundry Luggnagg */       { line: 'fortress', goal: 'Capture the docks and destroy the Galt fortress.', guards: 2 },
  /* 15 Verne Docks */            { line: 'fortress', goal: 'Hold the docks and destroy the Galt fortress.', guards: 2 },
  /* 16 Flight of the Raven */    { line: 'fortress', goal: 'Seize the docks and destroy the invaders’ fortress.', guards: 2 },
  /* 17 Basked in Earthlight */   { line: 'flagship', win: { flagship: 33 }, goal: 'Break through to the Galt flagship and sink it.' },
  /* 18 As Hope Fades */          { line: 'fortress', goal: 'Hold until the allies arrive, then destroy the fortress.', guards: 2 },
  /* 19 Buccaneer Cannon */       { line: 'tower', goal: "Get inside Basilisk and destroy the command centre.", guards: 3 },
  /* 20 A Goddess Descends */     { line: 'tower', goal: 'Hold the base and destroy the Galt command centre.', guards: 2 },
  /* 21 Pandora Parallax */       { line: 'fortress', goal: 'Clear the mines and destroy the Galt fortress.', guards: 2 },
  /* 22 Warships without Turrets */ { line: 'fortress', goal: 'Engage the new battleships and destroy the fortress.', guards: 2 },
  /* 23 Shooting Star */          { line: 'tower', goal: "Destroy Sturgeon's command centre.", guards: 3 },
  /* 24 Assault on Alfred */      { line: 'fortress', goal: 'Destroy Fortress Alfred.', guards: 2 },
  /* 25 Aldiss */                 { line: 'fortress', goal: 'Clear a path through the asteroids and destroy the fortress.', guards: 2 },
  /* 26 Standoff at Derleth */    { line: 'tower', goal: 'Punch through the battle line and destroy the command centre.', guards: 2 },
  /* 27 Showdown at Balam */      { line: 'towers', goal: 'Destroy every command centre on Balam.', guards: 2 },
  /* 28 Shipyards of Asgard */    { line: 'towers', goal: 'Destroy the shipyard command centres before Babylon launches.', guards: 2 },
  /* 29 Render unto Babylon */    { line: 'towers', limit: 18, goal: 'Destroy all of Babylon’s command centres within 18 turns.', guards: 3 },
];

export function scriptFor(m) { return SCRIPTS[m] || { line: 'annihilate' }; }

// What each army has to protect, taken when the battle starts.
export function setupScript(b) {
  const s = b.script;
  b.stakes = [0, 1].map((a) => {
    const own = b.units.filter((u) => u.army === a);
    return {
      towers: own.filter((u) => u.type === BRAIN),
      fortress: own.filter((u) => FORTRESSES.has(u.type)),
      flagship: a === 1 && s.win && s.win.flagship !== undefined ? own.find((u) => u.type === s.win.flagship && !u.carrier) || null : null,
      carriers: a === 1 && s.win && s.win.carriers ? own.filter((u) => b.types[u.type].category === CARRIER_CAT && !u.carrier) : [],
    };
  });
  if (s.guards) {
    for (const g of b.units) {
      if (g.army !== 1 || g.carrier || b.types[g.type].move === 0) continue;
      const post = [...b.stakes[1].towers, ...b.stakes[1].fortress].find((c) => distance(c, g) <= s.guards);
      if (post) { g.guard = post; g.post = [g.x, g.y]; }
    }
  }
}

// { winner, reason } once the battle is decided, else null. Called after every action.
export function outcome(b) {
  const gone = (list) => list.length && list.every((u) => u.hp <= 0);
  const lost = (a) => {
    const st = b.stakes[a];
    if (!b.forces(a).length) return 'annihilate';
    if (gone(st.towers)) return st.towers.length > 1 ? 'towers' : 'tower';
    if (gone(st.fortress)) return 'fortress';
    return null;
  };
  const r1 = lost(1);
  if (r1 && b.units.some((u) => u.army === 1)) return { winner: 0, reason: r1 };
  const st = b.stakes[1];
  if (st.flagship && st.flagship.hp <= 0) return { winner: 0, reason: b.script.line };
  if (st.carriers.length && st.carriers.every((u) => u.hp <= 0)) return { winner: 0, reason: 'carriers' };
  const r0 = lost(0);
  if (r0) return { winner: 1, reason: r0 };
  if (b.script.limit && b.turn > b.script.limit) return { winner: 1, reason: 'timeup' };
  return null;
}
