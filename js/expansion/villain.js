// The expansion's recurring antagonist (docs/EXPANSION.md, "Story"): Marshal Oren Kessrin,
// Director of the Union Security Directorate. He staged the commander's assassination, blamed
// Galt saboteurs and runs the Union's new leadership from the citadel on F1 Olympos; Admiral
// Varga (mission 4) only signed the order. Cold, courteous, never raises his voice. He speaks to
// the general once a mission, in an intercepted or open transmission (mission JSON
// `transmission`). The ROM has no character portraits, so his face is original art, drawn here as
// an SVG bust in the game's early-90s anime style.
export const VILLAIN = { name: 'Marshal Oren Kessrin', rank: 'Director, Union Security Directorate' };

export function villainPortrait() {
  return `<svg class="villain" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${VILLAIN.name}">
  <defs>
    <radialGradient id="vBg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#3a1020"/><stop offset=".55" stop-color="#160a1c"/><stop offset="1" stop-color="#05040c"/></radialGradient>
    <linearGradient id="vSkin" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#e9c7b4"/><stop offset=".55" stop-color="#d9ab95"/><stop offset="1" stop-color="#9d6f62"/></linearGradient>
    <linearGradient id="vShade" x1="0" x2="1"><stop offset="0" stop-color="#7d4c49" stop-opacity="0"/><stop offset="1" stop-color="#5a3036" stop-opacity=".75"/></linearGradient>
    <linearGradient id="vHair" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f4f6ff"/><stop offset=".45" stop-color="#b9c0da"/><stop offset="1" stop-color="#5f6688"/></linearGradient>
    <linearGradient id="vCoat" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a3150"/><stop offset="1" stop-color="#0c0f1f"/></linearGradient>
    <linearGradient id="vGold" x1="0" x2="1"><stop offset="0" stop-color="#8a5a12"/><stop offset=".5" stop-color="#ffd76a"/><stop offset="1" stop-color="#9b6514"/></linearGradient>
    <radialGradient id="vLens" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#fff2f2"/><stop offset=".25" stop-color="#ff3b4e"/><stop offset="1" stop-color="#5a0010"/></radialGradient>
    <filter id="vGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="200" height="240" fill="url(#vBg)"/>
  <g opacity=".25" stroke="#ff4d6d" stroke-width=".6" fill="none"><circle cx="100" cy="92" r="78"/><circle cx="100" cy="92" r="62" stroke-dasharray="3 5"/><path d="M8 92h40M152 92h40M100 6v22"/></g>
  <!-- coat, high collar, epaulettes -->
  <path d="M10 240 C14 196 40 182 70 174 L100 196 L130 174 C160 182 186 196 190 240 Z" fill="url(#vCoat)"/>
  <path d="M30 196 C44 186 58 180 70 176 L76 190 C60 194 44 200 34 210 Z" fill="url(#vGold)"/>
  <path d="M170 196 C156 186 142 180 130 176 L124 190 C140 194 156 200 166 210 Z" fill="url(#vGold)"/>
  <g stroke="#ffd76a" stroke-width="1.4" opacity=".9"><path d="M34 206 L28 222M42 202 L37 220M50 199 L46 218M166 206 L172 222M158 202 L163 220M150 199 L154 218"/></g>
  <path d="M70 168 L100 200 L130 168 L132 186 L100 214 L68 186 Z" fill="#1b2140"/>
  <path d="M74 166 L100 194 L126 166 L127 176 L100 204 L73 176 Z" fill="#8c1426"/>
  <path d="M100 204 L100 240" stroke="#ffd76a" stroke-width="1.2" opacity=".6"/>
  <g transform="translate(100 222)"><path d="M0 -9 L8 0 L0 9 L-8 0 Z" fill="url(#vGold)"/><circle r="3" fill="#8c1426"/></g>
  <!-- neck -->
  <path d="M84 150 L84 176 L100 192 L116 176 L116 150 Z" fill="#b98777"/>
  <path d="M84 160 L100 178 L116 160 L116 168 L100 186 L84 168 Z" fill="#7a4c47" opacity=".6"/>
  <!-- hair behind -->
  <path d="M52 92 C44 54 66 22 102 20 C140 18 160 48 152 96 C150 120 146 134 140 146 L136 100 L64 100 L62 142 C56 128 54 112 52 92 Z" fill="#6c7395"/>
  <!-- face -->
  <path d="M66 84 C66 64 82 50 101 50 C122 50 137 64 136 86 C136 110 131 128 121 142 C113 154 106 164 100 168 C94 164 87 154 80 142 C70 128 66 108 66 84 Z" fill="url(#vSkin)"/>
  <path d="M112 60 C130 66 138 84 137 98 C136 120 128 140 116 152 C110 158 104 166 100 168 C108 152 120 128 122 104 C123 84 120 70 112 60 Z" fill="url(#vShade)"/>
  <path d="M72 128 C78 140 88 152 98 156" stroke="#9a6a60" stroke-width="1.2" fill="none" opacity=".7"/>
  <!-- ear -->
  <path d="M135 92 C143 90 146 100 142 110 C140 116 136 118 133 117 Z" fill="#c4917f"/>
  <!-- brows: sharp, angled down to the nose -->
  <path d="M70 86 L97 91 L95 96 L71 92 Z" fill="#4a4e6e"/>
  <path d="M132 84 L104 91 L105 96 L130 90 Z" fill="#4a4e6e"/>
  <!-- left eye: narrow, pale violet -->
  <path d="M74 99 C80 94 90 94 96 99 C90 102 80 103 74 99 Z" fill="#f6f0ff"/>
  <circle cx="86" cy="99" r="3.6" fill="#7a5fb8"/><circle cx="86" cy="99" r="1.6" fill="#1a1030"/><circle cx="84.8" cy="97.8" r=".9" fill="#fff"/>
  <path d="M73 99 C80 93 91 93 97 99" stroke="#1d1428" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M72 97 C80 91 91 91 98 97 L97 99 C90 95 80 95 73 99 Z" fill="#2a1f33" opacity=".55"/>
  <!-- right eye behind a cybernetic monocle -->
  <path d="M106 99 C112 94 122 94 128 98 C122 102 112 103 106 99 Z" fill="#f6f0ff"/>
  <circle cx="117" cy="99" r="3.6" fill="#7a5fb8"/>
  <path d="M105 99 C112 93 123 93 129 98" stroke="#1d1428" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <circle cx="117" cy="99" r="13" fill="none" stroke="#2b2f45" stroke-width="5"/>
  <circle cx="117" cy="99" r="13" fill="none" stroke="#c7cde6" stroke-width="1.4"/>
  <circle cx="117" cy="99" r="9.5" fill="url(#vLens)" opacity=".82"/>
  <circle cx="117" cy="99" r="10" fill="#ff2a44" opacity=".55" filter="url(#vGlow)"/>
  <path d="M129 103 L141 108 L141 112 L128 107 Z" fill="#2b2f45"/>
  <circle cx="113.5" cy="95.5" r="2" fill="#fff" opacity=".9"/>
  <!-- nose, cheekbone, mouth, scar -->
  <path d="M100 100 L97 124 L103 126" stroke="#8c5b52" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M110 116 C116 118 122 116 126 112" stroke="#b07c70" stroke-width="1" fill="none" opacity=".6"/>
  <path d="M88 141 L108 140 L114 136" stroke="#5e2f33" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M92 146 C97 147 102 147 106 145" stroke="#a87268" stroke-width="1" fill="none" opacity=".6"/>
  <path d="M76 108 L88 128" stroke="#c46a6a" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
  <path d="M80 114 L76 116 M84 120 L80 122" stroke="#c46a6a" stroke-width="1" opacity=".7"/>
  <!-- hair: swept back, silver, a high hairline and one loose strand -->
  <path d="M60 96 C52 58 74 22 106 22 C138 22 156 50 150 92 C146 76 140 66 132 62 C122 56 110 54 100 55 C88 56 78 60 72 68 C66 76 62 86 60 96 Z" fill="url(#vHair)"/>
  <path d="M74 64 C86 48 112 40 138 50" stroke="#ffffff" stroke-width="2" fill="none" opacity=".55"/>
  <path d="M82 58 C96 42 120 36 144 46" stroke="#e8ecff" stroke-width="1.2" fill="none" opacity=".5"/>
  <path d="M70 70 C80 50 104 36 128 38" stroke="#7d84a6" stroke-width="1.2" fill="none" opacity=".6"/>
  <path d="M98 56 C90 64 84 74 82 90 C86 80 92 72 100 66 Z" fill="#dfe4f6"/>
  <path d="M60 96 C58 108 60 120 64 130 L67 102 Z" fill="#8a91b3"/>
  <path d="M148 90 C150 104 148 118 143 130 L138 104 Z" fill="#6c7395"/>
  <!-- Union cap badge on the collar -->
  <g transform="translate(64 182) rotate(-14)"><rect x="-7" y="-4" width="14" height="8" rx="1.5" fill="url(#vGold)"/><path d="M-4 0h8" stroke="#8c1426" stroke-width="2"/></g>
  <g transform="translate(136 182) rotate(14)"><rect x="-7" y="-4" width="14" height="8" rx="1.5" fill="url(#vGold)"/><path d="M-4 0h8" stroke="#8c1426" stroke-width="2"/></g>
</svg>`;
}
