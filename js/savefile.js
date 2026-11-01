// Save file export/import (owner's request): every campaign, mid-battle slot and setting lives in
// localStorage under keys starting "earthlight" or "el-"; Export writes them to a JSON file and
// Import puts a file's keys back (replacing the current ones) and reloads. The ROM is kept in
// IndexedDB and is never part of a save file.
const FORMAT = 'earthlight-save', VERSION = 1;
const ours = (k) => k.startsWith('earthlight') || k.startsWith('el-');

function keys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ours(k)) out.push(k); } } catch { } return out.sort(); }

export function exportSave() {
  const data = {};
  for (const k of keys()) data[k] = localStorage.getItem(k);
  const blob = new Blob([JSON.stringify({ format: FORMAT, version: VERSION, saved: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'), d = new Date(), p = (n) => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = `earthlight-save-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Checks a parsed file; returns the key/value map or throws a readable error.
export function parseSave(text) {
  let f; try { f = JSON.parse(text); } catch { throw new Error('This is not an Earth Light save file (not JSON).'); }
  if (!f || f.format !== FORMAT || typeof f.data !== 'object' || !f.data) throw new Error('This is not an Earth Light save file.');
  if (f.version > VERSION) throw new Error('This save file comes from a newer version of the game.');
  const data = {};
  for (const [k, v] of Object.entries(f.data)) if (ours(k) && typeof v === 'string') data[k] = v;
  if (!Object.keys(data).length) throw new Error('This save file is empty.');
  return { data, saved: f.saved };
}

export function applySave(data) {
  for (const k of keys()) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
}

export async function importSave(file) {
  const { data, saved } = parseSave(await file.text());
  const when = saved ? ` (saved ${new Date(saved).toLocaleString()})` : '';
  if (!confirm(`Load this save file${when}? It replaces all your current progress and battle saves in this browser.`)) return false;
  try { applySave(data); } catch { alert('The browser refused to store the save (storage full or disabled).'); return false; }
  location.reload();
  return true;
}

// Adds "Export save" and "Import save" buttons to `host`.
export function mountSaveButtons(host, cls = 'btn') {
  if (!host) return;
  const ex = document.createElement('button'), im = document.createElement('button'), input = document.createElement('input');
  ex.className = im.className = cls; ex.type = im.type = 'button';
  ex.textContent = 'Export save'; ex.title = 'Download your progress, battle saves and settings as a file';
  im.textContent = 'Import save'; im.title = 'Load progress from a save file (replaces the current progress)';
  input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
  ex.onclick = exportSave;
  im.onclick = () => input.click();
  input.onchange = async () => { const f = input.files[0]; input.value = ''; if (!f) return; try { await importSave(f); } catch (e) { alert(e.message); } };
  host.append(ex, im, input);
}
