// Units whose graphics come from another type (the expansion's `look`, js/expansion/data):
// the ROM's cut units, whose own tables all point at the Mars, and new types past the ROM's 58.
// They borrow that type's unit-info picture (hue-shifted by `tint` degrees), map icon, board
// token and fight choreography; the base game has no looks, so all of this is a no-op there.
import { paintUnitArt } from './unitart.js';
import { unitIcon } from './maps.js';
import { ownArt, ownInfoArt, ownIcon } from './art/own.js';

export const lookOf = (types, type) => types?.[type]?.look ?? type;

// The weapon slot the look's choreography uses for a shot from `slot`: the look's weapon of the
// same mode, else its first weapon.
export function lookSlot(types, type, slot) {
  const t = types?.[type];
  if (!t || t.look === undefined || slot === undefined || slot === null) return slot;
  if (t.keepSlots && types[t.look].weapons[slot]) return slot;   // a successor fighting with its predecessor's moves (Pallas)
  const mode = t.weapons[slot]?.mode, lw = types[t.look].weapons;
  const same = lw.findIndex((w) => w && w.mode === mode);
  return same >= 0 ? same : Math.max(0, lw.findIndex((w) => w));
}

export function paintLookArt(canvas, rom, types, type, zoom = 2) {
  const own = ownArt(types, type);
  if (own) {   // a type with its own picture (js/art/own.js)
    const art = ownInfoArt(own), src = document.createElement('canvas');
    src.width = art.w; src.height = art.h;
    src.getContext('2d').putImageData(new ImageData(art.data, art.w, art.h), 0, 0);
    canvas.width = art.w * zoom; canvas.height = art.h * zoom;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, canvas.width, canvas.height);
    return art;
  }
  const art = paintUnitArt(canvas, rom, lookOf(types, type), zoom), tint = types?.[type]?.tint;
  if (tint) {
    const src = document.createElement('canvas'); src.width = canvas.width; src.height = canvas.height;
    src.getContext('2d').drawImage(canvas, 0, 0);
    const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height);
    g.filter = `hue-rotate(${tint}deg)`; g.drawImage(src, 0, 0); g.filter = 'none';
  }
  return art;
}

// A type's map icon for an army (0 or 1): its own (js/art/own.js), or the ROM's for its graphics.
export function typeIcon(rom, types, type, army, frame = 0) {
  const own = ownArt(types, type);
  return own ? ownIcon(own, army ? 1 : 0) : unitIcon(rom, army ? 1 : 0, types[type].gfx, frame);
}
