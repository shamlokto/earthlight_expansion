// Sato's Harvest: expression portraits (2026-11-20). Bust cut-outs in art/farm/people/portraits/<id>_<expression>.webp, listed in
// portraits/index.json as { id: { expression: "file.webp" } }. Pure lookups (node tests use them); the browser part loads the index
// once, lazily, and never blocks the game: with no index, or no picture for someone, the dialogue keeps the full-body front picture.
export const MAIN_CAST = ['sato', 'general', 'ruess', 'kestrel', 'mori', 'oduya', 'yui', 'lark', 'vesna'];
export const EXPRESSIONS = ['neutral', 'joyful', 'enjoying', 'shy', 'embarrassed', 'loved', 'sad', 'tearful', 'angry', 'surprised', 'worried', 'disgusted', 'teasing', 'happy'];
export const OTHER_EXPRESSIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'worried'];
// The nearest faces to try, in order, when a picture is missing (then neutral, then the front picture).
export const CLOSEST = {
  joyful: ['happy', 'enjoying', 'loved'], happy: ['joyful', 'enjoying'], enjoying: ['happy', 'joyful', 'teasing'], teasing: ['enjoying', 'happy', 'joyful'],
  shy: ['embarrassed', 'loved', 'happy'], embarrassed: ['shy', 'surprised', 'worried'], loved: ['joyful', 'shy', 'happy'],
  sad: ['tearful', 'worried'], tearful: ['sad', 'worried'], worried: ['sad', 'surprised'], surprised: ['worried', 'embarrassed'],
  angry: ['disgusted', 'worried', 'sad'], disgusted: ['angry', 'worried', 'sad'], neutral: [],
};
export const known = (ex) => EXPRESSIONS.includes(ex);
// The file for someone's face: the asked-for expression, its nearest, then neutral; null when there is none at all.
export function portraitFile(index, id, ex = 'neutral') {
  const own = index && index[id]; if (!own) return null;
  for (const e of [ex, ...(CLOSEST[ex] || []), 'neutral']) if (own[e]) return own[e];
  return null;
}
// What a gift reaction looks like, by tier (birthdays: joyful).
export const GIFT_FACE = { loved: 'loved', liked: 'happy', neutral: 'neutral', disliked: 'disgusted' };

// ---------------------------------------------------------------- the browser: load the index once, lazily
const BASE = 'art/farm/people/portraits/';
let index = null, loading = null;
export function loadPortraits() {
  if (index || loading || typeof fetch === 'undefined') return loading;
  loading = fetch(BASE + 'index.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((j) => { index = j && typeof j === 'object' ? j : {}; return index; });
  return loading;
}
const warmed = new Set();
// The URL of someone's bust for this line, or null (then the dialogue falls back to the front picture). Asks for the index on first use.
export function portraitUrl(id, ex) {
  if (!index) { loadPortraits(); return null; }
  const f = portraitFile(index, id, ex || 'neutral'); if (!f) return null;
  const u = BASE + f; if (!warmed.has(u) && typeof Image !== 'undefined') { warmed.add(u); const im = new Image(); im.src = u; }   // cached by the browser from here on
  return u;
}
// Fetch this person's other faces in the background (when they start talking), so the next line's change is instant.
export function warmPerson(id) { if (!index || !index[id] || typeof Image === 'undefined') return; for (const f of Object.values(index[id])) { const u = BASE + f; if (!warmed.has(u)) { warmed.add(u); const im = new Image(); im.src = u; } } }
export const portraitIndex = () => index;
