// On-screen camera buttons for trackpads and touch (docs/COLONY-V2.md "View"): zoom in / out,
// rotate left / right 45°, tilt up / down and "home" (back to the Command Centre). view.js creates
// the pad in createView and toggles it with view.setNavButtons(on); each button calls act(name)
// and view.js animates the move.
// Version 4 (docs/COLONY-V4.md): a deck row under them, the deck on show and ▲ ▼ (act('deckUp') /
// act('deckDown'), also PageUp / PageDown); setDeck(label, canUp, canDown) updates it, and it is
// hidden while the colony has only one deck. Tilt keeps its buttons and Alt + scroll.
// Position: top-right of the view, clear of the top bar (80 px) and of the interface's right
// column (330 px wide, 300 px at ≤1100 px; at phone widths the pad goes to the right edge). Move
// it with CSS custom properties on the view container or any ancestor: --cv-nav-top,
// --cv-nav-right (and --cv-nav-left / --cv-nav-bottom with the other two set to auto), or style
// `.cv-nav` directly. Buttons never take keyboard focus from a click (so Space still pauses).
let styled = false;
function injectStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'cv-nav-style';
  s.textContent = `
.cv-nav { position: absolute; top: var(--cv-nav-top, 80px); right: var(--cv-nav-right, 356px);
  left: var(--cv-nav-left, auto); bottom: var(--cv-nav-bottom, auto);
  display: grid; grid-template-columns: repeat(2, 34px); gap: 4px; padding: 5px;
  background: rgba(6, 10, 30, .72); border: 1px solid rgba(111, 211, 255, .35); border-radius: 6px;
  box-shadow: 0 0 16px rgba(0, 0, 0, .45); user-select: none; -webkit-user-select: none; touch-action: manipulation; }
@media (max-width: 1100px) { .cv-nav { right: var(--cv-nav-right, 326px); } }
@media (max-width: 760px) { .cv-nav { right: var(--cv-nav-right, 8px); top: var(--cv-nav-top, 168px); grid-template-columns: repeat(2, 38px); } }
.cv-nav[hidden] { display: none; }
.cv-nav button { width: 100%; height: 34px; padding: 0; display: grid; place-items: center; cursor: pointer;
  color: #dfe8ff; background: linear-gradient(180deg, rgba(111, 211, 255, .16), rgba(111, 211, 255, .04));
  border: 1px solid rgba(111, 211, 255, .3); border-radius: 4px; transition: background .15s, border-color .15s, color .15s; }
@media (max-width: 760px) { .cv-nav button { height: 38px; } }
.cv-nav button:hover { color: #fff; border-color: rgba(111, 211, 255, .8); background: linear-gradient(180deg, rgba(111, 211, 255, .32), rgba(111, 211, 255, .08)); }
.cv-nav button:active { transform: translateY(1px); background: rgba(245, 197, 66, .25); border-color: #f5c542; }
.cv-nav button:focus-visible { outline: 2px solid #f5c542; outline-offset: 1px; }
.cv-nav button.wide { grid-column: span 2; }
.cv-nav .cv-nav-deck { grid-column: span 2; margin-top: 3px; padding-top: 5px; border-top: 1px solid rgba(111, 211, 255, .25);
  font: 600 10px/1.2 system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; text-align: center; color: #f5c542; white-space: nowrap; }
.cv-nav .cv-nav-deck[hidden], .cv-nav button[hidden] { display: none; }
.cv-nav button:disabled { opacity: .35; cursor: default; pointer-events: none; }
.cv-nav button.deck { font: 700 13px/1 system-ui, sans-serif; color: #f5c542; }
.cv-nav svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
`;
  document.head.appendChild(s);
}

const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
// name → [label (tooltip and screen readers), icon, key hint]
export const NAV_BUTTONS = [
  ['zoomIn', 'Zoom in', svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M7.5 10.5h6M10.5 7.5v6"/>'), '+'],
  ['zoomOut', 'Zoom out', svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M7.5 10.5h6"/>'), '−'],
  ['rotateLeft', 'Rotate left 45°', svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 3v5h5"/>'), 'Q'],
  ['rotateRight', 'Rotate right 45°', svg('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/>'), 'E'],
  ['tiltUp', 'Tilt up: look from higher, more top-down', svg('<path d="M3 17.5 12 14l9 3.5-9 3.5z"/><path d="M12 11V3M8.5 6.5 12 3l3.5 3.5"/>'), 'Alt + scroll'],
  ['tiltDown', 'Tilt down: look from lower, toward the horizon', svg('<path d="M3 17.5 12 14l9 3.5-9 3.5z"/><path d="M12 3v8M8.5 7.5 12 11l3.5-3.5"/>'), 'Alt + scroll'],
  ['home', 'Home: back to the Command Centre', svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>'), 'Home'],
];
// version 4: the deck row (after the deck label)
export const DECK_BUTTONS = [
  ['deckUp', 'One deck up', '▲', 'PgUp'],
  ['deckDown', 'One deck down', '▼', 'PgDn'],
];

export function createNavPad(host, act) {
  injectStyle();
  const el = document.createElement('div');
  el.className = 'cv-nav';
  el.setAttribute('role', 'toolbar');
  el.setAttribute('aria-label', 'Camera');
  for (const [name, label, icon, key] of NAV_BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.nav = name; b.innerHTML = icon;
    b.title = `${label} (${key})`; b.setAttribute('aria-label', label);
    if (name === 'home') b.className = 'wide';
    b.addEventListener('mousedown', (e) => e.preventDefault());   // a click leaves the focus where it was
    b.addEventListener('click', (e) => { e.preventDefault(); act(name); });
    el.appendChild(b);
  }
  const deckLabel = document.createElement('div');
  deckLabel.className = 'cv-nav-deck'; deckLabel.hidden = true;
  el.appendChild(deckLabel);
  const deckBtn = {};
  let deckSig = '';
  for (const [name, label, glyph, key] of DECK_BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.nav = name; b.className = 'deck'; b.textContent = glyph; b.hidden = true;
    b.title = `${label} (${key})`; b.setAttribute('aria-label', label);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => { e.preventDefault(); act(name); });
    el.appendChild(b); deckBtn[name] = b;
  }
  // wheel and pointer events on the pad stay on it (they must not reach the map or the page)
  el.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  host.appendChild(el);
  return {
    el,
    setVisible(on) { el.hidden = !on; },
    // The deck row: its label (null hides the row: a colony with one deck) and which way it can go.
    setDeck(label, canUp, canDown) {
      const sig = `${label}|${canUp}|${canDown}`;
      if (sig === deckSig) return;   // refresh() calls this every time: touch the DOM only on a change
      deckSig = sig;
      const on = !!label;
      deckLabel.hidden = !on; deckBtn.deckUp.hidden = !on; deckBtn.deckDown.hidden = !on;
      if (!on) return;
      deckLabel.textContent = label;
      deckBtn.deckUp.disabled = !canUp; deckBtn.deckDown.disabled = !canDown;
    },
    get visible() { return !el.hidden; },
    destroy() { el.remove(); },
  };
}
