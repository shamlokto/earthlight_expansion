# Recruitable Named Commanders with Specialties — Design Research

Scope note on sourcing: Fandom wikis (402), GameFAQs (403) and StrategyWiki (403) blocked direct fetch from this environment, so claims from those domains come via search-engine extraction rather than my own page read — I mark those **[2nd-hand]**. Pages I read directly: akurasu.net, heroes.thelazy.net, fireemblemwiki.org, darkestdungeon.wiki.gg, fadden.com, warswiki.org, koeitecmo.wiki, lparchive.org.

---

## 1. STAT MODELS — what numbers a commander actually has, and how they enter combat

### 1.1 Super Robot Wars — the single best model for your engine
SRW separates **pilot** stats from **machine** stats and multiplies them. This is exactly your "commander leads a machine" structure. Formulas from the SRW Z community math writeup (https://lparchive.org/Super-Robot-Wars-Z/Update%2035/):

Pilot stats: **Melee (CQB), Ranged (RNG), Skill (SKL), Defense (DEF), Evasion (EVD), Accuracy/Hit (ACC)**, plus **Will/Morale** (a dynamic in-battle stat).

```
Attack  = (Melee or Ranged + Will) × (Weapon Attack × Weapon Terrain Rank) / 200
Defense = (Defense + Will) × Mech Armor / 200
Damage  = (Attack − Defense) × TerrainMod + SizeMod% × AbilityMods
          × SquadLeaderMods × FormationMod − Barrier
SizeMod% = 1 + (Attacker Size − Defender Size) × 10

HitRate = ([Pilot Accuracy / 2] + Mech Accuracy) × Terrain Rank + Weapon Hit
Evasion = ([Pilot Evasion / 2] + Mech Mobility) × Terrain Rank
FinalHit = (HitRate − Evasion) × SizeMod + DistanceMod + TerrainEffects
           + COMMANDER AURA MOD + SkillMods + SquadLeaderMods
           + FormationMods + SpiritCommandMods
DistanceMod = (5 − squares between units) × 3

CritRate = (Attacker SKL − Defender SKL) + Weapon Crit + SkillBonus + SquadLeaderBonus
Crit = ×1.5 damage
```

Key structural lessons:
- **Pilot stat is halved before being added to the machine stat** in hit/evade. That is the mechanical cap on commander dominance: a god-tier pilot in a junk machine still can't hit. Attack/defense use `/200` divisors against machine Armor/Weapon for the same reason.
- **Will/Morale is worth 1 point of Melee *and* Ranged *and* Defense simultaneously** — a single cheap scalar that makes "veteran commander" legible without a new stat.
- Terrain is a **letter rank multiplier**, not a flat bonus: S=110%, A=100%, B=80%, C=60%, D=cannot operate. Pilot terrain rank and machine/weapon terrain rank are **added and rounded down** (C+B=C, C+A=B). This is the cleanest "commander × machine affinity" mechanism I found anywhere and is directly portable to space/vacuum/atmosphere/ground for your colony game.

### 1.2 Koei officer stats (RTK / Nobunaga's Ambition) — the canonical 4–5 scalar model
- RTK: officers have **Leadership, War (military), Intelligence, Politics, Charm**, conventionally on a **10–100** scale; 100 INT is the franchise convention for top strategists **[2nd-hand]** (https://en.namu.wiki/w/%EC%82%BC%EA%B5%AD%EC%A7%80%20%EC%8B%9C%EB%A6%AC%EC%A6%88/%EB%8A%A5%EB%A0%A5%EC%B9%98). In RTK II, INT/War/Charm gate *task success probability*, not just combat — "an adviser with 100 intelligence will always accurately predict the result" **[2nd-hand]** (https://en.wikipedia.org/wiki/Romance_of_the_Three_Kingdoms_II).
- Nobunaga's Ambition: Taishi (https://gamefaqs.gamespot.com/ps4/209165-nobunagas-ambition-taishi/faqs/76067/officerstheir-functions-and-stat-distributions) **[2nd-hand]**: **LEA** = general quality, **VAL** = combat/tactical strikes, **INT** = organizing units (also combat defense per players), **POL** = how far they can upgrade specific facility types (Forges, Ranches, Trading Towns, Reservoirs, Politics Camps), **FOR** (Formality) = diplomacy/charisma only. Guide states "great talent (80+ in one or more stats) ought to be treasured as they are extremely rare" — i.e. **the scarcity of high numbers is the balance mechanism.** Camps train stats by at least +10 over time; Sphere of Influence players report a +20 training cap.
- Gemfire (https://koeitecmo.wiki/wiki/Gemfire, plus **[2nd-hand]** https://koei.fandom.com/wiki/Gemfire/Generals): three stats — **INT** (defend/develop a province), **WAR** (leading troops in battle), **CHA** (diplomacy/winning people over). Generals get **+1 to a stat at the start of each new year (+2 for rulers)** — slow, automatic, non-grindable growth.

### 1.3 Jagged Alliance 2 — 10 stats, all orthogonal, no "overall power" number
Read directly from https://fadden.com/gaming/ja2/stats.html: **HLT, AGI, DEX, STR, LDR, WIS, MRK, MEC, EXP, MED**, each 0–100. Concrete rosters:
- Gus (LVL 8): HLT 75, AGI 65, DEX 84, STR 82, **LDR 83**, WIS 94, MRK 97, MEC 80, EXP 76, MED 68
- Magic (LVL 5): HLT 95, AGI 99, DEX 98, STR 92, **LDR 16**, WIS 80, MRK 94, MEC 91, EXP 27, MED 24
- Spider (LVL 1): MEC 0, EXP 0, **MED 94**

Magic is physically the best merc in the game and has LDR 16; Spider is a pure medic with literal zeroes. **Hard zeroes and hard near-100s on orthogonal axes is what prevents interchangeability** — no merc is a scaled copy of another. Each merc also carries an **attitude** and a **base morale** (Barry: normal/0; Red: pessimist/4; Shadow: loner/2; Steroid: big shot/7; Biff: coward/9; Fidel: aggressive/5).

### 1.4 Fire Emblem — affinity-based pair bonuses (read directly: https://fireemblemwiki.org/wiki/Affinity)
GBA-era per-unit contribution at C support (×2 at B, ×3 at A), summed across the pair then floored:

| Affinity | Atk | Def | Hit | Avo | Crit | Ddg |
|---|---|---|---|---|---|---|
| Fire | 0.5 | 0 | 2.5 | 2.5 | 2.5 | 0 |
| Thunder | 0 | 0.5 | 0 | 2.5 | 2.5 | 2.5 |
| Wind | 0.5 | 0 | 2.5 | 0 | 2.5 | 2.5 |
| Ice | 0 | 0.5 | 2.5 | 2.5 | 0 | 2.5 |
| Dark | 0 | 0 | 2.5 | 2.5 | 2.5 | 2.5 |
| Light | 0.5 | 0.5 | 2.5 | 0 | 2.5 | 0 |
| Anima | 0.5 | 0.5 | 0 | 2.5 | 0 | 2.5 |

Bonuses require the pair to be **within 3 tiles**. Note the deliberate design: every affinity gives 4 of 6 possible bonuses, so none is strictly better — they differ in *shape*, not magnitude. Also **[2nd-hand]**: in Path of Radiance / Radiant Dawn affinity no longer grants crit or dodge, and **a unit whose affinity matches the map's affinity gets +5 hit and +5 avoid** — a per-mission affinity lottery. Weapon triangle for scale: FE6 winner +1 Atk/+10 Hit, FE8 winner +1 Atk/+15 Hit (https://fe6.triangleattack.com/guides/calculations, https://fe8.triangleattack.com/guides/calculations).

### 1.5 Advance Wars — CO as a global multiplier on a damage table
Day-to-day percentages are applied to a 100% baseline. Verified examples **[2nd-hand]** (https://warswiki.org/wiki/Grit, https://warswiki.org/wiki/Kanbei, https://advancewars.fandom.com/wiki/Max):
- **Grit:** indirect units **+1 range and 120% firepower**; direct non-infantry **80% firepower**. CO Power → indirect 150%. Super → also **+2 range**.
- **Max:** direct non-infantry **120% firepower** (AW2); indirect **−1 range and 90% firepower** (one source says 80%, another 100% — unresolved conflict, flag as unverified). COP → direct 140%.
- **Kanbei:** units **cost 120%** but have **130% firepower and 130% defense**; Morale Boost → 150% FP / 130(+10)% def; Samurai Spirit → 150/150(+10) and **counterattacks ×1.5**.

**Key pattern: every specialty is a paired bonus+penalty on the same axis.** Grit is the best indirect CO *and* the worst direct CO. That is the mechanism that prevents strict dominance in AW.

---

## 2. SPECIALTY DESIGN — concrete affinity types and their readability

### 2.1 Unit-type affinity
- **Advance Wars:** direct vs indirect vs air vs naval vs infantry, expressed as ±% firepower/defense and ±range. Sensei: **Copter Command** drops 9HP infantry on every owned city and boosts B-Copter attack; Airborne Assault does the same with mechs **[2nd-hand]** (https://www.pcinvasion.com/all-co-powers-and-super-powers-in-advance-wars-12-re-boot-camp/).
- **Heroes III creature specialty** (read directly: https://heroes.thelazy.net/index.php/Hero_specialty) — the most mathematically interesting unit-type affinity in any game:
  - Specialty creature gets **+1 Speed regardless of hero level**, and **Attack and Defense +5% (SoD) or +20% (HotA) every *n* levels, where *n* = the creature's tier**.
  - So a tier-1 specialist **doubles** attack/defense at hero level 21 (SoD) / 11 (HotA); tier-2 at level 40/10; tier-3 at 60/15.
  - **The divisor is the unit's own tier.** Buffing cheap, numerous units scales fast; buffing elites barely scales. That is an elegant automatic anti-snowball: the affinity is strongest exactly where the raw units are weakest.
  - Level 1–2 specialists (Gelu, Dracon, Tark, Frederick) **start with three stacks** of their creature; tier-3 specialists (Bron, Illor, Todd) start with it replacing their tier-2 stack. The specialty shapes the *starting army*, not just the modifier.
- **RimWorld/Battle Brothers analogue:** affinity is expressed as *what a character can never be good at*. Battle Brothers backgrounds **exclude specific talent stars** — Brawlers cannot get stars in Ranged Attack, so they concentrate in Melee Attack/Melee Defence; Oathtakers also cannot star in ranged **[2nd-hand]** (https://steamcommunity.com/app/365360/discussions/0/1642043267252056430/). RimWorld's equivalent: **passion multipliers on XP gain of 0.35 / 1.00 / 1.50 for none / minor / major** (https://steamcommunity.com/sharedfiles/filedetails/?id=2802989358), with `XP = GlobalLearningFactor × PassionMultiplier × BaseXP` (https://steamcommunity.com/app/294100/discussions/0/600773712135898986/). Affinity as **learning rate** rather than flat power is the subtlest option available.

### 2.2 Terrain affinity
- **SRW letter ranks (S/A/B/C/D) per pilot *and* per machine *and* per weapon, added and floored** — 110/100/80/60/unusable. D in a terrain means you cannot operate there at all. This is the readable gold standard: a one-letter grid per commander.
- **Fire Emblem:** map-wide affinity match gives +5 hit/+5 avoid **[2nd-hand]**.
- **Heroes III:** Pathfinding specialty = 5% reduction to rough-terrain movement cost per level (read directly).
- **Ogre Battle:** terrain is per-class rather than per-leader, plus day/night cycles; I could not verify a per-leader terrain affinity.

### 2.3 Weapon-mode / range-band affinity
- SRW's **Infight / Gunfight** skills raise the *base attack power* of melee / ranged weapons on that pilot's unit per skill level **[2nd-hand]** (https://akurasu.net/wiki/Super_Robot_Wars/W/Pilot_Skills). Note the clean separation: pilot Melee and Ranged are *separate stats* (§1.1) *and* there are separate skills on top. A melee-specialist commander is defined by (high CQB, low RNG, Infight), which is three reinforcing signals.
- SRW **Distance Modifier** `(5 − squares) × 3` on hit rate already builds in a close-range accuracy advantage even without a specialty.
- **Grit's +1/+2 indirect range** is the readable Advance Wars version.

### 2.4 Command radius / aura effects — most relevant to your design
- **SRW "Commander" skill** (read directly: https://akurasu.net/wiki/Super_Robot_Wars/Z2.2/Pilot_Abilities): projects a *command field*; allies inside gain **Hit and Evade bonuses that scale with distance from the commander**; field size and effect improve per level, **max level 4**. Crucially: **the bonus does not apply to the commander's own unit**, and where two fields overlap **only the highest level applies** (no stacking) **[2nd-hand]**. In SRW Z the field is **3 squares at level 1, +1 square per level** **[2nd-hand]**. In SRW T, level 4 gives roughly **+25% at range 1 falling to +5% at range 5** **[2nd-hand]** (https://gamefaqs.gamespot.com/ps4/252392-super-robot-wars-t/faqs/77139/skill-break-down). The aura appears as its own named term `+ (Commander Aura Modifier)` in the hit formula, which is why players can reason about it.
- **Advance Wars: Days of Ruin CO Zone** — the strongest readability design I found. Read directly from https://warswiki.org/wiki/CO_Power: the CO rides inside one unit; CO bonuses apply **only to friendly units inside the zone**. The meter fills from **HP damage dealt by units inside the zone, at one tick per 6HP**; **the first 30HP expands the zone by one space**, **60HP total expands it again and allows the CO Power**, which extends the zone **to the whole map** for a turn. Using a power drains the meter and resets the zone — and **destroying the CO unit resets the meter**. Three consequences worth stealing: (a) the commander is a physical, killable, positional object; (b) the aura grows as a *reward for using it*; (c) the ultimate power is simply "aura = infinite radius", so one mental model covers both passive and active.
- **Fire Emblem's 3-tile support range** is the same idea with pair-specific rather than broadcast effects.
- **SRW "Tactical Command"** is a stance-switching aura (read directly): Offense = +15 Melee/Ranged, +20 Hit; Defense = +30 Defense/Evasion; All-Out Attack = +30 Melee/Ranged, **−40 Defense/Evasion**.

### 2.5 Readability verdict (for a SNES-engine hex game)
Ranked most to least readable:
1. **Letter-grade affinity grid (SRW terrain ranks).** 4–6 letters per commander, visible on the portrait screen; multiplication by the machine's own grid teaches itself.
2. **Paired ±% on one axis (Advance Wars).** "120% air / 80% naval" is a single sentence and self-balancing.
3. **A single named creature/unit-type specialty with level scaling (Heroes III).** One line of text, grows invisibly, never needs retuning.
4. **Radius aura with distance falloff and no stacking (SRW Commander / DoR CO Zone).** Readable *only if* you draw the field on the hex grid; the no-stacking rule is essential or players cannot predict anything.
5. **Learning-rate affinity (RimWorld passions).** Most elegant, least readable — players cannot feel 1.5× XP without a UI flame icon.

Avoid: additive stacks of many small percentage buffs from multiple sources. The Total War: Warhammer community complaint is precisely that "buffstacking between the various skills, traits, techs, and mechanics makes the differences between units absolutely meaningless" (https://community.creative-assembly.com/total-war/total-war-warhammer/forums/8-general-discussion/threads/8939-is-powercreep-an-issue-for-you-or-not-reduces-engagement-to-play).

---

## 3. RECRUITMENT — generating, offering, and gating the pool

### 3.1 Darkest Dungeon stagecoach — the tightest "wandering NPCs arrive at your base" system
Read directly from https://darkestdungeon.wiki.gg/wiki/Stage_Coach:

| Upgrade | Lvl | Effect | Cost |
|---|---|---|---|
| Network | 1–5 | 3 / 4 / 5 / 6 / 7 recruits per week | 3D+4C → 25D+26C |
| Hero Barracks | 1–5 | roster 12 / 16 / 20 / 24 / 28 | 3D+4C → 25D+26C |
| Experienced Recruits | 1–4 | **18.75% / 12.5% / 6.25% / 3.12%** chance of a level 1/2/3/4 recruit | 9–18 Busts + 12–24 Crests, gated behind Instructor/Weaponsmith/Armorsmith tiers |

Design points to steal:
- **Recruit *count* and roster *capacity* are separate purchasable upgrades.** Wanting more offers and being able to keep them are different decisions.
- **Upgrades take effect only after you return from the next quest** — the pool refreshes on an event, not a timer.
- Quirk generation scales with recruit level: level 0 = **1–2 positive and 1–2 negative quirks; each resolve level adds +1 to both the min and max** (a resolve-2 recruit has 3–4 of each). Capped at 5 of each type. **Higher-level recruits are not strictly better — they come with proportionally more baggage.** This is the single most transferable anti-power-creep trick in the whole report.
- Even at base tier "there are always enough recruits for an expedition"; with one hero left in the roster you still get 3 — a **floor guarantee** so the system can never soft-lock you.
- Experienced recruits arrive with **weapons, armor and skills maxed** for their tier, so paying for tier skips a progression grind rather than raising a ceiling.

### 3.2 Taverns and roaming NPCs
- **Mount & Blade Warband:** 16 named companions sit in taverns; **locations are random and shift over time**, so you re-check taverns; **recruitment attempts per day are limited**; cost is **free to 500 denars**; companions who leave or are captured **reappear in taverns later** **[2nd-hand]** (https://mountandblade.fandom.com/wiki/Heroes, https://mountandblade.fandom.com/wiki/Tavern, https://raiderking.com/mount-and-blade-warband-companions-guide/). The pool is **finite and named** — scarcity does the work, and a lost companion is recoverable rather than deleted.
- **Wartales:** recruits are hired from taverns with cost rising with recruit level; at sufficient player level **the innkeeper lets you specify the stats of a new recruit** rather than taking what's offered — a late-game convenience valve **[2nd-hand]** (https://steamcommunity.com/app/1527950/discussions/0/3734078642254018448/). Some classes are **NPC-exclusive and can only be obtained by capturing and befriending** an enemy — a second, non-purchase acquisition channel.
- **Battle Brothers:** per-background **base hiring cost ~30 (worst) to ~150 (best)**, with Swordmaster as a deliberate outlier at **400**; **base daily wage 3–35 crowns**; wage **+2 per level up**, and the **Greedy trait adds +2 immediately**. A **try-out fee of roughly 10% of hiring cost reveals the recruit's traits** before you commit. Backgrounds set the **roll range** for each attribute plus starting traits and gear **[2nd-hand]** (https://battlebrothers.fandom.com/wiki/Game_Guide, https://steamcommunity.com/app/365360/discussions/0/1742227264187092941/). The try-out mechanic is an excellent cheap-information purchase and directly applicable to wandering NPCs at a colony.

### 3.3 Persuasion / loyalty checks and refusal
- **Koei RTK/NA:** recruitment success is a function of the target's **loyalty to their current lord**, plus the recruiter's stats, plus history. Nobunaga's Ambition Taishi uses **loyalty 1–20 against a per-officer "required loyalty" threshold**: "one with a required loyalty of 1 will be nearly impossible to recruit; one with 15 will be very easy" **[2nd-hand]** (https://gamefaqs.gamespot.com/ps4/209165-nobunagas-ambition-taishi/faqs/76067/officerstheir-functions-and-stat-distributions). RTK XIII adds a **relationship rating from −100 to +100**, bond tiers 1–5 (friendship unlocks at relationship 80), only officers in **bordering cities** are recruitable, and **rapport below roughly −70 makes someone unrecruitable** **[2nd-hand]** (https://gamefaqs.gamespot.com/boards/160302-romance-of-the-three-kingdoms-xiii/74002052, .../73988937). Hard historical refusals exist: playing as Nobunaga, Magoichi Saika and Sadayu Momochi reportedly never join because of past conflicts **[2nd-hand]** (https://steamcommunity.com/app/1336980/discussions/0/3811786447108854354/).
- **Ogre Battle:** recruitment is gated on the *leader's* own **Charisma and Alignment** — "Destin's own Charisma and Alignment ratings will also affect whether or not characters join the battalion, whether NPCs will hand over important items, and ultimately what ending the player receives" **[2nd-hand]** (https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/OgreBattleTheMarchOfTheBlackQueen). Charisma rises by defeating higher-level foes and falls by killing much weaker ones or fleeing — **you earn the right to recruit by fighting honourably.**
- **Tactics Ogre:** two-level system — per-unit **Loyalty** (that unit's view of your leader) and faction-wide **Chaos Frame** (a whole clan's view of you). **Higher enemy loyalty makes that enemy harder to recruit mid-battle**; Chaos Frame sets the *starting* loyalty of new recruits from that faction, and story choices move it (one player reports a quest refusal giving **+25 Galgastani Chaos Frame**) **[2nd-hand]** (https://ogrebattlesaga.fandom.com/wiki/Chaos_Frame, https://gamefaqs.gamespot.com/boards/999440-tactics-ogre-let-us-cling-together/62755000). A faction-reputation layer above per-NPC loyalty is very strong for a colony game: your colony's standing determines *what kind* of wanderer shows up.
- **RimWorld:** two-track gating. **Resistance must be reduced to 0 before recruitment attempts can even begin**; starting resistance is rolled per PawnKind (a "Warrior" rolls **5–9**). Reduction per interaction scales with the warden's **Social** skill and traits (Ugly makes it worse). Once resistance hits 0, success depends on recruitment difficulty %, prisoner mood, faction, **how many colonists you already have**, and the storyteller (https://rimworldwiki.com/wiki/Prisoner, https://steamcommunity.com/sharedfiles/filedetails/?id=3129874283). **Scaling difficulty by current colonist count is the direct answer to "how do I stop infinite recruits"** without a hard cap.
- **Gemfire:** you can only gain generals by **conquering a clan** or **persuading an undeployed officer to defect** (one diplomacy action per turn); persuading a *lord* hands you their whole state. Prisoners after battle can be **released, ransomed, or banished (permanently removed)** (https://koeitecmo.wiki/wiki/Gemfire, https://koei.fandom.com/wiki/Gemfire/Generals **[2nd-hand]**).
- **JA2:** two markets — **AIM** (expensive, skilled, negotiable contracts) and **M.E.R.C.** (cheap, flawed, daily-only). Read directly from https://fadden.com/gaming/ja2/stats.html: AIM mercs have **daily / weekly / bi-weekly** rates and a **deposit** flag (Barry 700/3400/5500, deposit yes; Lynx 2850/18500/35000, deposit no), while M.E.R.C. mercs list only a daily rate (Biff 200/0/0). Mercs get roughly **25% more expensive per level gained** **[2nd-hand]**. Free local recruits exist and "join without asking salary." **Three price tiers (premium contract / cheap daily / free local) is a clean way to make the same roster feel different.**

### 3.4 Keeping the pool interesting without infinite recruits — the five techniques found
1. **Finite named roster, recoverable** (Mount & Blade: 16 companions, lost ones return to taverns).
2. **Procedural recruits from a finite template set** (Battle Brothers backgrounds, Darkest Dungeon classes) — the *archetype* list is fixed, the *instance* is rolled.
3. **Scaling difficulty with colony size** (RimWorld recruitment chance factors in current colonist count).
4. **Roster cap as a purchasable upgrade** (Darkest Dungeon Hero Barracks 12→28) — forces dismissal decisions instead of hoarding.
5. **Acquisition channels with different currencies** (Gemfire: conquest vs persuasion vs ransom; Wartales: tavern hire vs capture-and-befriend; JA2: AIM vs MERC vs free locals).

---

## 4. PROGRESSION — and keeping a designated strongest character strongest

### 4.1 How commanders level and cap
- **SRW:** two currencies. **Levels** raise the six pilot stats; **PP (pilot points)** buy skills from a shop-like list with explicit prices (read directly from https://akurasu.net/wiki/Super_Robot_Wars/Z2.2/Pilot_Abilities): Support Attack 100 PP (+20/level, max 4), SP Recovery 320 PP, Dash 220 PP, Continuous Action 330 PP, SP Up 60 PP (+10/level, max 9, +5 max SP each), Potential/Counter 20 PP (+10/level, max 9). **Everything has a hard max level.** Later titles moved to a **pooled currency** (SRW X's TacP is awarded to the whole army, not per pilot) explicitly because per-pilot pools meant "side characters needed a very long time to become usable" (https://www.siliconera.com/super-robot-wars-xs-tacp-system-add-bit-strategy-character-customization/). SRW V's Skill Route makes **all skills purchasable by all pilots** (https://neo-akurasu.duckdns.org/wiki/Super_Robot_Wars/V/Skill_Route_System) — so differentiation lives in innate stats and *exclusive, non-purchasable* skills, not in what you were able to afford.
- **Heroes III:** levels feed **specialty formulas**, not raw stats. Secondary-skill specialty: `Total = A × (1 + 0.05 × HeroLevel)`, where A is the skill's own effect — a level-20 Offense specialist with Expert Offense (30%) gets **30 × 2 = 60%**. Spell specialty: base effect × `(1 + 0.03 × L / n)` in SoD or `(1 + 0.1 × L / n)` in HotA, where n is the target creature's tier (Meteor Shower, Chain Lightning, Resurrection and Animate Dead use 0.05). Unique scalers: Scouting +1 radius per 6 levels; Fire Magic +50% fire damage; Diplomacy 5%/level but **only on surrender**; Ballista +30% atk/def plus 5% per 5 levels; Cannon +20% per 6 levels. Resource specialties (+1 Mercury/Sulfur/Crystal/Gem, or +350 gold) **do not scale at all** and "may matter less later in the game" — deliberately front-loaded. (All read directly from https://heroes.thelazy.net/index.php/Hero_specialty.)
- **Advance Wars:** COs **never level**. Zero progression. All variety is lateral. This is why AW CO design stays balanced across hundreds of maps.
- **XCOM 2:** classes assigned on promotion from Rookie to Squaddie (or diverted to Psi Operative in the Psi Lab); **13 abilities per class of which the player picks 6**, Psi Operatives have 14 trained from **three random options each time**; promotion is kill-credit based with different ratios per class (**Ranger 1 kill per 4 assists; Sharpshooter and Grenadier per 5; Specialist and Psi Operative per 3**) **[2nd-hand]** (https://xcom.fandom.com/wiki/Soldier_(XCOM_2), https://steamcommunity.com/sharedfiles/filedetails/?id=618141960). Note the elegance: **support classes promote faster** so they don't fall behind the kill-stealing classes.
- **Koei:** slow, bounded, automatic. Gemfire: +1 stat per year (+2 rulers). Nobunaga's Ambition: facility camps give at least +10 over time, with a reported **+20 training cap** **[2nd-hand]**.

### 4.2 Keeping a designated "strongest" strongest without making the rest pointless
This is your core question. Six patterns, strongest first:

**(a) The Jeigan / prepromote: start at the ceiling, grow slowest.** Fire Emblem's Seth starts with stats comparable to an already-promoted Paladin, so he trivially outperforms everyone for the first third of the game — but his **growth total is ~325%, merely mid-tier (Eirika 350%)**, and critically **he does not promote, so he gets no promotion stat bonus**, while trainee units like Amelia have far higher total potential **[2nd-hand]** (https://fe8.triangleattack.com/characters/seth, http://www.feshrine.net/fe8/char_growthrates.php, https://serenesforest.net/the-sacred-stones/characters/growth-rates/). The community debate is instructive: Seth wins in practice only because the game is short and few units reach caps. **Translation for you: give the general double attack/double evasion and max level, and give him literally zero growth and no specialty. He is a flat ceiling that specialists eventually meet on their own axis.**

**(b) Breadth vs depth.** The general is best at everything *by a constant*; specialists exceed him *on one axis under a condition*. If the general is ×2 attack flat and an aircraft specialist is ×1.4 attack but ×2.2 when piloting aircraft over open vacuum, the specialist is the correct pick for that job — and there is only one general, so you must field specialists anyway. Advance Wars' paired ±% is the template: **Grit is strictly better than Max at indirect fire and strictly worse at direct fire.** Nobody is a subset of anyone.

**(c) Hard caps on multipliers, with the aura excluded from itself.** SRW: Commander maxes at level 4; overlapping command fields **do not stack, only the highest applies**; and **the commander's own unit gets no benefit from its own aura**. Translation: your general should not buff himself. That makes him want escorts, which makes the specialists matter.

**(d) One scarce body, many jobs.** Advance Wars Days of Ruin puts the CO *inside a unit* with a finite zone, and **destroying the CO unit resets the power meter** (https://warswiki.org/wiki/CO_Power). A general who can only be in one hex of a hex map is automatically not a solution to the whole map. For a colony builder with multiple simultaneous fronts, this is the cleanest brake there is.

**(e) Opportunity cost of the strongest character.** Make the general expensive to field: in Kanbei's model, his strength is paid for with **120% unit cost**. Battle Brothers' Swordmaster is strictly the best background and costs **400 base to hire** against ~150 for everything else, with the top daily wage band. JA2's Lynx costs 2850/day.

**(f) Let the strongest be unique in *kind*, not in *degree*.** SRW's Ace Bonuses are per-character, non-numeric-comparable effects, unlocked at a kill threshold (60 kills in SRW 30 and T; the Proud Ace skill lowers it to 50/70). The generic bonus is tiny — **+5 starting Morale and ×1.1 funds** (Super Ace: +10 Morale, ×1.3) — and the character-specific half is wildly varied (read directly from https://akurasu.net/wiki/Super_Robot_Wars/30/Ace_Bonuses): Kamille +20% damage and +20% crit **on the enemy phase only**; Üso +20% final accuracy and a flat **+40% chance to evade any attack independent of Evasion**; Odelo −20% damage taken; Ichiro Ogami **+5 to all stats per adjacent ally, up to +20**; Jona Basta +10 to all six stats; Gilliam +2 Move and +20% final evasion. Note how many are **conditional** (enemy phase, adjacency, low HP) — that's what stops them stacking into godhood. Compare SRW's conditional skills: Abnormal Survivor gives **+30 Hit/Evade and +20 Melee/Ranged/Defense/Skill but only below 10% HP**; Guard gives **80% damage taken only at 130+ Will**; Predict gives +10% hit/evade/crit only at 130+ Will.

---

## 5. LOYALTY / MORALE / DEATH

### 5.1 Loyalty (Koei is the canonical case)
- **Nobunaga's Ambition Taishi:** loyalty **1–20** vs a per-officer **required loyalty**. The guide's illustration is the whole design in two sentences: "guys with a required loyalty of 1 and a loyalty of 6 don't like you much but they'd never betray you. Guys with a required loyalty of 15 and a loyalty of 12 actually do like you but not enough to prevent them from considering desertion/betrayal" **[2nd-hand]**. **Two numbers, and the *gap* is what matters** — so a high-maintenance star and a loyal journeyman are both viable, differently.
- **Sphere of Influence:** base loyalty 10, modified by rewards, compatibility, ideals, family bonuses and recent events **[2nd-hand]**. **Iron Triangle:** loyalty capped at 100, "dictating how reliable they are and how much of a stipend will be required to keep their service" **[2nd-hand]** (https://koei.fandom.com/wiki/Nobunaga%27s_Ambition:_Iron_Triangle). Levers to raise it: **stipends (December-timed), treasures/items, titles and Imperial rank, matching ideology, marriage** (https://www.koeitecmoamerica.com/manual/nobunaga/awakening/en/4300.html, plus GameFAQs threads **[2nd-hand]**).
- **RTK:** loyalty maxes at 100; low loyalty means officers may leave; **loyalty changes every month according to the officer's compatibility with his ruler** (RTK III manual, via https://kongming.net/3/dl/rot3k3manual.pdf **[I could not read this PDF — it is LZW/ASCII85-compressed and my fetch returned only binary; the claim comes from search extraction of the manual, flag as unverified]**). The hidden **compatibility value is 1–150 and wraps around**, with Cao Cao at 25, Liu Bei at 75 and the Sun clan at 125 — deliberately equidistant, so Wei officers are structurally unhappy serving Shu or Wu. This is **player inference, not documented** (https://steamcommunity.com/app/872410/discussions/0/1754654019208939351/). A documented NES-era loyalty formula exists for a different mechanic: `NewLoyalty = OldLoyalty + Floor(Rice / (100 + Pop/1000))` **[2nd-hand]** (https://gamefaqs.gamespot.com/boards/587590-romance-of-the-three-kingdoms/41801838). Decay rules: enemy/nemesis officers lose loyalty regardless of what you do; **captured officers' loyalty slowly drops** **[2nd-hand]**.
- **Tactics Ogre:** killing too many of a unit's clansmen slowly lowers its loyalty; story decisions contradicting a unit's alignment lower it too **[2nd-hand]** (https://gamefaqs.gamespot.com/boards/999440-tactics-ogre-let-us-cling-together/71035238). **Loyalty as a consequence of your strategic choices, not a resource you spend on.**

### 5.2 Inter-character friction
- **JA2** (read directly, https://fadden.com/gaming/ja2/stats.html): each merc record has **friends**, **enemies**, and a **learn-to-hate** field — "after sufficient exposure, the learn-to-hate character is added to the enemies list." Blood: friends Magic, enemies Cliff, learn-to-hate Bubba. Fox: friends Wolf, enemies Steroid, learn-to-hate Haywire. Barry: friends Red, no enemies at all. The **learn-to-hate delay** is a lovely slow-burn mechanic.
- **Mount & Blade:** each companion dislikes two others; "if you have 2 people that one of your companions dislikes in your party, they will inevitably leave you"; dislikes can be offset by a *like* plus high morale; wine from the tavern reportedly gives **+30 morale to all companions**; players report only around **8–10** compatible companions can coexist conflict-free (figures conflict across sources) **[2nd-hand]** (https://raiderking.com/mount-and-blade-warband-companions-guide/, https://strategywiki.org/wiki/Mount&Blade/Companion_Builds, https://steamcommunity.com/sharedfiles/filedetails/?id=213515522). Dislike triggers also include **hunger, unpaid wages, heavy casualties** — i.e. your logistics failures are expressed as personnel problems.
- **Wartales:** party happiness; **at −5 overall happiness members begin defecting**; at **+7 happiness max Valor points +1**, at **+15 happiness +15% combat XP** — a two-sided scalar with a desertion floor and a performance ceiling **[2nd-hand]** (https://n4g.com/articles/how-to-keep-mercenaries-happy-in-wartales). Unpaid wages cost happiness and lead to desertion; wages come due on a timer regardless of income **[2nd-hand]**.

### 5.3 Wages and upkeep
- Battle Brothers: **3–35 crowns/day base by background, +2 per level, +2 for Greedy** **[2nd-hand]**. JA2: Barry 700/day vs Lynx 2850/day (read directly). Wartales: wages rise with level, recruiting a higher-level member costs more **[2nd-hand]**. Mount & Blade: unpaid wages directly cause companion complaints **[2nd-hand]**.
- **Wartales' tavern storage** is a mechanic worth copying for a colony builder: benched units "do not eat food and do not take wages in krowns" **[2nd-hand]** (https://steamcommunity.com/sharedfiles/filedetails/?id=3367258425) — though another thread says they still cost upkeep paid from the tavern's own money (conflict unresolved). **Bench-with-zero-upkeep converts roster bloat from a cost problem into a choice problem.**

### 5.4 Injury, recovery, permadeath
- **Darkest Dungeon** is the reference implementation. **Death's Door** debuff: **−10 ACC, −25% DMG, −5 SPD, +33% Stress** for its duration, plus a lingering recovery debuff after being healed off it (https://darkestdungeon.wiki.gg/wiki/Death's_Door_(Darkest_Dungeon)). Stress: an afflicted hero refilling the bar suffers a **heart attack at 200 stress**, which puts them on Death's Door or **kills outright if already there**; Virtuous heroes instead lose the Virtue and reset to 0 **[2nd-hand]** (https://darkestdungeon.fandom.com/wiki/Affliction). **Negative quirks left untreated for too many expeditions become terminal and cost far more to cure**; up to **three positive quirks can be locked permanently** (https://thegemsbok.com/art-reviews-and-articles/darkest-dungeon-red-hook-critique-mechanics-design/ **[2nd-hand]**). Design intent per the devs: players "aren't being asked to build one party and get attached to them," the goal was to "make players feel there's a cost," and the team "never set out to kill everybody" **[2nd-hand, secondary write-ups of a VentureBeat interview, I could not reach the primary transcript]** (https://rpgwatch.com/news/darkest-dungeon--interview-venturebeat-30877.html).
- **Gemfire:** captured generals can be **released, ransomed, or banished (permanent removal)** — the player chooses the permanence (https://koeitecmo.wiki/wiki/Gemfire).
- **Mount & Blade:** companions who leave or are captured are **not deleted — they turn up in taverns again** **[2nd-hand]**. Soft permadeath.
- **SRW:** classically pilots are merely shot down and return next mission; the attrition cost is the SP/Will economy and the opportunity cost of the turn.

---

## 6. The 10 best individual commander-system designs

1. **Advance Wars: Days of Ruin CO Zone** — the commander is a killable unit on the map, the aura grows as a reward for fighting inside it (1 bar per 6HP dealt; +1 radius at 30HP, +1 more and power unlocked at 60HP), the ultimate power is simply "radius = whole map", and killing the CO unit wipes the meter. One mental model covers position, power and counterplay. (https://warswiki.org/wiki/CO_Power)
2. **Advance Wars 1/2 paired-penalty COs** — every specialty is a bonus and a penalty on the same axis (Grit: indirect 120% +1 range, direct 80%), so no CO is a superset of another and the system never needed numeric rebalancing across hundreds of maps. **[2nd-hand]** (https://warswiki.org/wiki/Grit)
3. **SRW pilot-×-machine multiplication with the pilot stat halved** — `([Pilot Evasion/2] + Mech Mobility) × TerrainRank` means commander skill and hardware are both necessary and neither is sufficient. Exactly the structure your "machine led by a commander" needs. (https://lparchive.org/Super-Robot-Wars-Z/Update%2035/)
4. **SRW terrain letter ranks (S/A/B/C/D), added and floored between pilot and machine** — 110/100/80/60/unusable, a five-symbol language that makes "this commander is wrong for vacuum" instantly readable and gives D-rank a hard veto. (same source)
5. **Heroes III creature specialty divided by unit tier** — Attack/Def +5% every *n* levels where *n* is the creature's tier, so cheap-unit affinities snowball and elite-unit affinities barely move. The anti-snowball is built into the formula rather than bolted on. (https://heroes.thelazy.net/index.php/Hero_specialty)
6. **Darkest Dungeon's level-scaled quirk count** — a level-0 recruit has 1–2 positive and 1–2 negative quirks; each resolve level adds +1 to both. Veterans arrive stronger *and* more damaged, so there is no "just recruit high level" dominant strategy. (https://darkestdungeon.wiki.gg/wiki/Stage_Coach)
7. **Nobunaga's Ambition loyalty vs required-loyalty gap** — two numbers (1–20 each) whose *difference* determines betrayal risk, so a brilliant high-maintenance officer and a mediocre loyal one are both genuinely playable choices. **[2nd-hand]**
8. **Jagged Alliance 2's hard zeroes** — Magic has LDR 16, Spider has MEC 0 and EXP 0. No "overall power" number exists, so no merc is a scaled copy of another and every hire changes what your squad can physically do. (https://fadden.com/gaming/ja2/stats.html)
9. **SRW conditional Ace Bonuses** — unlocked at a kill threshold, generic half tiny (+5 Morale, ×1.1 funds), character half wildly varied and almost always conditional: Kamille's +20% damage/crit is **enemy phase only**, Ogami's +5 all stats scales with **adjacent allies** up to +20, Üso's +40% evade chance is **independent of Evasion**. Rewards mastery without flattening roles. (https://akurasu.net/wiki/Super_Robot_Wars/30/Ace_Bonuses)
10. **Fire Emblem affinity tables** — every affinity grants 4 of 6 possible bonus types at identical magnitudes, within a 3-tile leash, so affinities differ in *shape* not *strength* and positioning becomes the expression of relationship. (https://fireemblemwiki.org/wiki/Affinity)

Honourable mentions: Battle Brothers' **try-out fee at ~10% of hiring cost** to reveal traits before committing; RimWorld's **recruitment chance scaling with current colonist count**; Tactics Ogre's **faction-level Chaos Frame above per-unit Loyalty**; Gemfire's **+1 stat per year** automatic bounded growth; XCOM 2's **faster promotion ratios for support classes** (Specialist 1 kill per 3 assists vs Sharpshooter per 5).

---

## 7. PITFALLS and mitigations

**P1 — Snowballing: the aura/buff stack compounds with the army it buffs.**
A commander who makes units stronger makes units that win more fights that charge the commander's meter that makes units stronger. Mitigations found in the wild: Heroes III divides creature-specialty growth **by the unit's own tier**; SRW **halves the pilot contribution** before adding it to the machine's and caps every skill (Commander max level 4, SP Up max 9); SRW Commander fields **do not stack — only the highest level applies to any square**; Advance Wars resets the meter on power use and **Days of Ruin resets it entirely if the CO unit dies**.

**P2 — The must-use character.** If the general is strictly better, every mission is "where do I send the general," and the other commanders are a UI chore. Mitigations: (a) **one body, many fronts** (DoR CO Zone — he can only be in one hex); (b) **no self-buff** (SRW Commander excludes the commander's own unit); (c) **flat ceiling, zero growth** (the Seth/Jeigan pattern: start at the cap, never improve, no promotion bonus, mid-tier growths — the FE8 community debate over whether Seth is broken resolves to "only because the game is short", https://fe8.triangleattack.com/characters/seth); (d) **make him expensive to field** (Kanbei's 120% unit cost; Battle Brothers' Swordmaster at 400 base hire).

**P3 — Interchangeable commanders (the "stat stick" failure).** If commanders differ only by a power number, specialties are decoration. Mitigations: **hard zeroes on orthogonal axes** (JA2: LDR 16, MEC 0); **exclusion rules** (Battle Brothers backgrounds that *cannot* receive stars in certain attributes); **paired penalties** (Advance Wars). A Legion TD 2 player names the opposite failure precisely — repeated nerfs to special abilities leave "mostly stat stick units with no discernable characteristics" (https://steamcommunity.com/app/469600/discussions/0/6733519464640503254). Balancing by deleting identity is worse than the imbalance.

**P4 — Buff-stack illegibility.** Total War: Warhammer players report that "buffstacking between the various skills, traits, techs, and mechanics makes the differences between units absolutely meaningless", and that lord-specific options crowd out the rest of the roster (https://community.creative-assembly.com/total-war/total-war-warhammer/forums/8-general-discussion/threads/8939-is-powercreep-an-issue-for-you-or-not-reduces-engagement-to-play). Mitigation: cap the number of simultaneous modifier *sources*, make them **multiplicative on separate terms** of a visible formula (SRW literally names each term in the damage equation: Commander Aura Modifier, Squad Leader Bonus, Formation Modifier, Size Modifier), and show the arithmetic in the attack-prediction window.

**P5 — Roster bloat and micromanagement.** Mitigations: **purchasable roster cap** (Darkest Dungeon 12→28, so expansion is a priced decision competing with other upgrades); **zero-upkeep bench** (Wartales tavern storage); **pooled rather than per-character progression currency** — SRW X moved to army-wide TacP specifically because per-pilot pools meant side characters "needed a very long time to become usable" (https://www.siliconera.com/super-robot-wars-xs-tacp-system-add-bit-strategy-character-customization/), and SRW V's Skill Route makes all skills buyable by all pilots so you stop building each commander from scratch.

**P6 — Attachment vs attrition mismatch.** If commanders are named and permadeath is on, players save-scum or refuse to field anyone but the general. Red Hook's framing is that players "aren't being asked to build one party and get attached to them" and the aim was to "make players feel there's a cost" **[2nd-hand]** (https://rpgwatch.com/news/darkest-dungeon--interview-venturebeat-30877.html) — but note Darkest Dungeon backs that with 3–7 fresh recruits *every week*. Mount & Blade takes the opposite route: companions who die/leave/are captured **return to taverns**, soft-permadeath for a finite named cast. **Pick one: expendable-and-replenishing, or named-and-recoverable. Named-and-permanently-lost with a thin recruit stream is the combination that makes players stop playing.**

**P7 — Infinite-recruit inflation.** Mitigations: RimWorld folds **current colonist count** into recruitment success; Koei gates on **per-officer required-loyalty thresholds** and hard historical refusals; RTK XIII restricts recruiting to **bordering cities** and makes rapport below ~−70 a flat no; Mount & Blade caps **recruitment attempts per day** in taverns.

**P8 — Unreadable auras.** A radius effect the player cannot see is a tax on mental arithmetic. Mitigations: draw the field on the hex grid (DoR does); use **no-stacking, highest-wins** so the player only ever has to find the nearest commander (SRW); publish a distance table rather than a continuous curve (SRW T level 4: +25% at range 1 down to +5% at range 5 **[2nd-hand]**).

---

## Could not verify / open conflicts

- **Max's indirect-unit penalty in AW2** — sources say −1 range with 90% firepower, or 80%, or 100%. Unresolved. **[2nd-hand]**
- **AW2 CO power star costs** (Copter Command 2, Turbo Charge 3, Overdrive 6, Black Wave 5, Lightning Strike/Black Storm 9) come from a single GameFAQs post; treat as unverified. The meter *value* is better attested: AW1 damage-based with inflicted damage worth ¼ of received; AW2 **1 star = 9,000G** with inflicted damage worth ½ (https://warswiki.org/wiki/CO_Power).
- **RTK III manual** — I fetched https://kongming.net/3/dl/rot3k3manual.pdf but it is LZW/ASCII85-compressed and returned unreadable binary. All RTK III loyalty/compatibility claims here are search-extraction only.
- **RTK compatibility 1–150 wrap-around with Cao Cao 25 / Liu Bei 75 / Sun 125** — explicitly described by its own source as player inference, not documented.
- **No documented monthly loyalty-drift formula** exists in any accessible RTK source. The only real formula found is the NES rice/population one, which governs a different mechanic.
- **Heroes III creature specialty** — the staroceans mirror and heroes.thelazy.net describe the mechanic differently (doubling schedules vs per-level percentages). I used thelazy.net, which I read directly and which distinguishes SoD (5%) from HotA (20%) — that version reconciles both. The widely cited `(hero level − creature level) × 5% / creature level` is a 2008 forum guess, not official.
- **Ogre Battle:** I found no source confirming a direct leadership- or charisma-based stat bonus or damage modifier for unit leaders. Charisma is confirmed to gate *class promotion* and *recruitment*, not to modify combat. The claim that Dragoon leaders give stat bonuses to other unit members is one player's anecdote.
- **Darkest Dungeon heart-attack stress reset** — wiki says 0, a Steam post says 150. Also: no source states whether unrecruited stagecoach heroes vanish each week.
- **Wartales bench upkeep** — one guide says benched units cost nothing, another says upkeep is paid from the tavern's funds.
- **No developer postmortem or design essay** on named-leader balance in strategy games surfaced in any search. Everything in §7 is reconstructed from mechanics plus player-community critique, not from stated designer intent. The one partial exception is HoMM lead designer Gus Smedstad on the pre-HoMM4 problem: "If you had a hero who wasn't particularly strong in a given area, he couldn't compete" (https://www.gamebanshee.com/news/66886-homm4-preview.html) — which is precisely the interchangeability failure, and HoMM4's answer was to let heroes occupy army slots so they could cover each other's weaknesses.
