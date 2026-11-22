// farm-lint: catches code accidentally swallowed by a line comment, e.g.  `foo();   // note bar();`
// (an edit that appends a comment and then the rest of a line). Strings and regexes are blanked first.
import { readFileSync, readdirSync } from 'fs';
const dir = new URL('../js/farm/', import.meta.url);
let bad = 0, n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  readFileSync(new URL(f, dir), 'utf8').split('\n').forEach((line, i) => {
    let s = line.replace(/\\./g, '__').replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""').replace(/\/[^/\n*]+\/[gimsuy]*(?=[.,;)\s])/g, '/r/');
    const k = s.indexOf('//'); if (k < 0) return; n++;
    const tail = s.slice(k + 2);
    // a statement after the comment: `; word(` or `; word =` or `} word(`, as code reads, not prose
    const stmt = (/[;}]\s*(?:await\s+)?[A-Za-z_$][\w$.]*\s*(?:\(|=[^=])[^)]*[;)]\s*(?:[;}]|$)/.test(tail) && /\w\(/.test(tail) && /;/.test(tail))
      || /\b[a-zA-Z_$][\w$]*\.[\w$.]+\s*=\s*[\w$.]+;\s*$/.test(tail);   // or a trailing `obj.prop = value;` (how me.running was lost)
    if (stmt) { bad++; console.log(`FAIL ${f}:${i + 1}: code after a // comment: ${line.trim().slice(0, 160)}`); }
  });
}
console.log(bad ? `farm-lint: ${bad} suspicious lines (of ${n} with comments)` : `farm-lint: all ${n} commented lines clean`);
process.exit(bad ? 1 : 0);
