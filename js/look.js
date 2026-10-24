// Units whose graphics come from another type (the expansion's `look`, js/expansion/data):
// the ROM's cut units, whose own tables all point at the Mars, and new types past the ROM's 58.
// They borrow that type's unit-info picture (hue-shifted by `tint` degrees), map icon, board
// token and fight choreography; the base game has no looks, so all of this is a no-op there.
import { paintUnitArt } from './unitart.js';

export const lookOf = (types, type) => types?.[type]?.look ?? type;

// The weapon slot the look's choreography uses for a shot from `slot`: the look's weapon of the
// same mode, else its first weapon.
export function lookSlot(types, type, slot) {
  const t = types?.[type];
  if (!t || t.look === undefined || slot === undefined || slot === null) return slot;
  const mode = t.weapons[slot]?.mode, lw = types[t.look].weapons;
  const same = lw.findIndex((w) => w && w.mode === mode);
  return same >= 0 ? same : Math.max(0, lw.findIndex((w) => w));
}

export function paintLookArt(canvas, rom, types, type, zoom = 2) {
  const art = paintUnitArt(canvas, rom, lookOf(types, type), zoom), tint = types?.[type]?.tint;
  if (tint) {
    const src = document.createElement('canvas'); src.width = canvas.width; src.height = canvas.height;
    src.getContext('2d').drawImage(canvas, 0, 0);
    const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height);
    g.filter = `hue-rotate(${tint}deg)`; g.drawImage(src, 0, 0); g.filter = 'none';
  }
  return art;
}
