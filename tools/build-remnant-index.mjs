// Combines the new campaign's per-act index files (missions/remnant/index-act*.json, written by
// the mission builders) into missions/remnant/index.json, the index the intermission reads
// (docs/STORY.md). `start` comes from the first act; `allFrom` from whichever act sets it; the
// missions are concatenated in act order. Usage: node tools/build-remnant-index.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'missions', 'remnant');
const acts = readdirSync(dir).filter((f) => /^index-act\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(9), 10) - parseInt(b.slice(9), 10));
if (!acts.length) throw new Error('no missions/remnant/index-act*.json');
const index = { campaign: 'remnant', title: 'Galt remnant', start: [], missions: [] };
for (const f of acts) {
  const a = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (!index.start.length && a.start) index.start = a.start;
  if (a.allFrom !== undefined) index.allFrom = a.allFrom;
  index.missions.push(...a.missions);
}
writeFileSync(join(dir, 'index.json'), `{"campaign":"remnant","title":"Galt remnant","start":${JSON.stringify(index.start)},${index.allFrom !== undefined ? `"allFrom":${index.allFrom},` : ''}"missions":[\n${index.missions.map((m) => JSON.stringify(m)).join(',\n')}\n]}\n`);
console.log(`missions/remnant/index.json: ${acts.join(', ')} → ${index.missions.length} entries`);
