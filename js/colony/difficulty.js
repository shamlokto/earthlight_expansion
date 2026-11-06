// Earthlight Space Colony Rebuild: difficulty (owner, 2026-11-03: "even on beta testing it becomes
// too hard"). Easy is the default for a first colony and for beta testers. Pure data.
//   cost     building, upgrade, move, road and survey costs
//   upkeep   credits a day for buildings
//   need     what colonists eat, drink and breathe (and the air open chambers leak)
//   transportEvery / transportHappy   a ship comes every N days if happiness is at least this
//   grant    Council grant for each finished goal (js/colony/goals.js)
//   relief   Easy only: when the treasury is empty or colonists go hungry, the Council sends this,
//            at most once every `every` days, so a beginner's colony never starves for want of money
//   rescue   Easy only (version 8): emergency imports of food, water and air while the treasury can pay
export const DIFFICULTY = {
  easy: { key: 'easy', name: 'Easy', text: 'Recommended for a first colony: cheaper buildings, gentler needs, ships every 7 days, bigger grants.',
    cost: 0.6, upkeep: 0.5, need: 0.8, transportEvery: 7, transportHappy: 45, grant: { credits: 400, parts: 40 },
    relief: { credits: 500, food: 150, water: 150, air: 150, every: 30 },
    // version 8: when the stores cannot cover today's food, water or air, the quartermaster buys `days` of it from the
    // traders at the dock (import prices), keeping `keep` credits back
    rescue: { days: 3, keep: 200 } },
  normal: { key: 'normal', name: 'Normal', text: 'The colony as designed: full prices and needs, ships every 10 days at happiness 55.',
    cost: 1, upkeep: 1, need: 1, transportEvery: 10, transportHappy: 55, grant: { credits: 200, parts: 20 } },
};
// Colonies saved before difficulty existed play as Normal (what they were tuned for).
export const diffOf = (state) => DIFFICULTY[state?.difficulty] || DIFFICULTY.normal;
