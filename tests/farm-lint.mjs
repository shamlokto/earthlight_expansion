// farm-lint: catches code accidentally swallowed by a line comment, e.g.  `foo();   // note bar();`
// (an edit that appends a comment and then the rest of a line). Strings and regexes are blanked first.
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
const dir = new URL('../js/farm/', import.meta.url);
let bad = 0, n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  readFileSync(new URL(f, dir), 'utf8').split('\n').forEach((line, i) => {
    let s = line.replace(/\\./g, '__').replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""').replace(/\/[^/\n*]+\/[gimsuy]*(?=[.,;)\s])/g, '/r/');
    const k = s.indexOf('//'); if (k < 0) return; n++;
    const tail = s.slice(k + 2);
    // a statement after the comment: `; word(` or `; word =` or `} word(`, as code reads, not prose
    const stmt = (/[;}]\s*(?:await\s+)?[A-Za-z_$][\w$.]*\s*(?:\(|=[^=])[^)]*[;)]\s*(?:[;}]|$)/.test(tail) && /\w\(/.test(tail) && /;/.test(tail))
      || /\b[a-zA-Z_$][\w$]*\.[\w$.]+\s*=\s*[\w$.]+;\s*$/.test(tail)
      || /\}\s*else\b/.test(tail)
      || /\b[a-zA-Z_$][\w$]*(?:\.[\w$]+)*\s*=\s*[A-Za-z_$][\w$.]*\(.*\);\s*$/.test(tail);   // or `x.y = call(...);` (how the hull stopped taking hits, 2026-11-23)   // or the rest of an if/else (how the water's glints hid the else, 2026-11-22)   // or a trailing `obj.prop = value;` (how me.running was lost)
    if (stmt) { bad++; console.log(`FAIL ${f}:${i + 1}: code after a // comment: ${line.trim().slice(0, 160)}`); }
  });
}
// and every module must parse (a swallowed brace shows up here even when the pattern above misses it)
const tmp = mkdtempSync(join(tmpdir(), 'farmlint-'));
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const t = join(tmp, f.replace(/\.js$/, '.mjs')); writeFileSync(t, readFileSync(new URL(f, dir), 'utf8'));
  try { execFileSync(process.execPath, ['--check', t], { stdio: 'pipe' }); } catch (e) { bad++; console.log(`FAIL ${f} does not parse: ${String(e.stderr).split('\n').slice(0, 4).join(' | ')}`); }
}
rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `farm-lint: ${bad} suspicious lines (of ${n} with comments)` : `farm-lint: all ${n} commented lines clean`);
process.exit(bad ? 1 : 0);
