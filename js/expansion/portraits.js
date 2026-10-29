// The new campaign's cast (docs/STORY.md), drawn as SVG busts in the same early-90s anime style
// as Kessrin's (villain.js): the ROM has no character portraits, so these are original art.
// Each portrait shares the face construction and differs in hair, eyes, mouth, outfit and props.
// Gradient ids carry the speaker's name, so several portraits can share a page.
import { VILLAIN, villainPortrait } from './villain.js';

// side: 'ally' (your comms panel), 'enemy' (the red incoming transmission), 'cartel' (amber)
export const SPEAKERS = {
  sato: { name: 'Captain Mira Sato', rank: 'Carrier commander, the General\'s second', side: 'ally' },
  arkin: { name: 'Lt. Dov Arkin', rank: 'Athena ace', side: 'ally' },
  ruess: { name: 'Prof. Hal Ruess', rank: 'Chief engineer', side: 'ally' },
  kessrin: { name: VILLAIN.name, rank: VILLAIN.rank, side: 'enemy' },
  vane: { name: 'Commander Lysa Vane', rank: 'Directorate ace', side: 'enemy' },
  moraine: { name: 'Queen Moraine', rank: 'Ashfall Cartel', side: 'cartel' },
  ahriman: { name: 'Ahriman', rank: 'Supreme Commander of Galt', side: 'enemy' },
};

const SKIN = { light: ['#f1d2bf', '#e1b39c', '#a77466', '#c4917f'], warm: ['#e9bf9f', '#d39c7c', '#8f5f4b', '#b98266'], pale: ['#f6e1d6', '#e8c4b4', '#ad8278', '#d0a596'], aged: ['#e4bba2', '#cc9a82', '#8c6150', '#b4846f'] };

// Shared construction: background, coat (`outfit`), neck, face, ear, eyes, nose, plus the
// character's hair (behind and in front), brows, mouth and props.
function bust(id, c) {
  const [s0, s1, s2, ear] = SKIN[c.skin];
  const eye = (cx, open = true) => `<path d="M${cx - 12} 99 C${cx - 6} 94 ${cx + 4} 94 ${cx + 10} 99 C${cx + 4} 103 ${cx - 6} 104 ${cx - 12} 99 Z" fill="#fbf8ff"/>
    ${open ? `<circle cx="${cx}" cy="99" r="4" fill="${c.iris}"/><circle cx="${cx}" cy="99" r="1.8" fill="#120c18"/><circle cx="${cx - 1.3}" cy="97.6" r="1.1" fill="#fff"/>` : ''}
    <path d="M${cx - 13} 99 C${cx - 6} 93 ${cx + 5} 93 ${cx + 11} 98" stroke="#1d1428" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
  return `<svg class="portrait ${id}" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${SPEAKERS[id].name}">
  <defs>
    <radialGradient id="${id}Bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset=".55" stop-color="${c.bg[1]}"/><stop offset="1" stop-color="#04050c"/></radialGradient>
    <linearGradient id="${id}Skin" x1="0" x2="1"><stop offset="0" stop-color="${s0}"/><stop offset=".55" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient>
    <linearGradient id="${id}Shade" x1="0" x2="1"><stop offset="0" stop-color="${s2}" stop-opacity="0"/><stop offset="1" stop-color="${s2}" stop-opacity=".7"/></linearGradient>
    <linearGradient id="${id}Hair" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${c.hair[0]}"/><stop offset=".5" stop-color="${c.hair[1]}"/><stop offset="1" stop-color="${c.hair[2]}"/></linearGradient>
    <linearGradient id="${id}Coat" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c.coat[0]}"/><stop offset="1" stop-color="${c.coat[1]}"/></linearGradient>
    <linearGradient id="${id}Trim" x1="0" x2="1"><stop offset="0" stop-color="${c.trim[0]}"/><stop offset=".5" stop-color="${c.trim[1]}"/><stop offset="1" stop-color="${c.trim[0]}"/></linearGradient>
    <filter id="${id}Glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="200" height="240" fill="url(#${id}Bg)"/>
  <g opacity=".22" stroke="${c.grid}" stroke-width=".6" fill="none"><circle cx="100" cy="92" r="78"/><circle cx="100" cy="92" r="62" stroke-dasharray="3 5"/><path d="M8 92h40M152 92h40M100 6v22"/></g>
  ${c.hairBack ? `<path d="${c.hairBack}" fill="url(#${id}Hair)"/>` : ''}
  <path d="M10 240 C14 196 40 182 70 174 L100 196 L130 174 C160 182 186 196 190 240 Z" fill="url(#${id}Coat)"/>
  ${c.outfit}
  <path d="M84 150 L84 176 L100 192 L116 176 L116 150 Z" fill="${ear}"/>
  <path d="M84 160 L100 178 L116 160 L116 168 L100 186 L84 168 Z" fill="${s2}" opacity=".55"/>
  ${c.collar || ''}
  <path d="M66 84 C66 64 82 50 101 50 C122 50 137 64 136 86 C136 110 131 128 121 142 C113 154 106 164 100 168 C94 164 87 154 80 142 C70 128 66 108 66 84 Z" fill="url(#${id}Skin)"/>
  <path d="M112 60 C130 66 138 84 137 98 C136 120 128 140 116 152 C110 158 104 166 100 168 C108 152 120 128 122 104 C123 84 120 70 112 60 Z" fill="url(#${id}Shade)"/>
  <path d="M135 92 C143 90 146 100 142 110 C140 116 136 118 133 117 Z" fill="${ear}"/>
  ${c.face || ''}
  ${c.brows}
  ${c.eyeL ?? eye(86)}
  ${c.eyeR ?? eye(117)}
  <path d="M100 102 L97 123 L103 125" stroke="${s2}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  ${c.mouth}
  <path d="${c.hairFront}" fill="url(#${id}Hair)"/>
  ${c.hairLines || ''}
  ${c.props || ''}
</svg>`;
}

const CAST = {
  // calm, precise; a blunt black bob, comms headset, navy fleet uniform with white piping
  sato: {
    skin: 'light', iris: '#8a5a2a', bg: ['#0f3346', '#091726'], grid: '#6fd3ff',
    hair: ['#3a4566', '#1a1f33', '#0a0c16'], coat: ['#1d2a4d', '#0b1124'], trim: ['#9fb6d8', '#ffffff'],
    hairBack: 'M54 90 C46 52 70 22 102 22 C136 22 158 50 150 92 L154 150 C146 156 138 156 132 150 L134 100 L68 100 L68 150 C62 156 54 156 48 150 Z',
    hairFront: 'M60 94 C54 56 76 24 104 24 C134 24 152 52 146 94 L140 80 C138 72 134 68 128 66 L128 78 L120 66 L116 76 L108 64 L104 76 L96 64 L92 76 L84 66 L80 78 L74 68 C68 72 64 80 60 94 Z',
    hairLines: '<path d="M72 46 C90 34 118 32 138 46" stroke="#5d6a92" stroke-width="1.6" fill="none" opacity=".7"/>',
    brows: '<path d="M73 88 C80 85 90 85 96 88" stroke="#1a1f33" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M106 88 C112 85 122 85 129 88" stroke="#1a1f33" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    mouth: '<path d="M90 140 C96 143 104 143 110 139" stroke="#8a4a48" stroke-width="2" fill="none" stroke-linecap="round"/>',
    outfit: `<path d="M70 174 L100 200 L130 174 L134 184 L100 212 L66 184 Z" fill="#e8eefa"/>
      <path d="M100 212 L100 240" stroke="#9fb6d8" stroke-width="2"/>
      <g transform="translate(150 206)"><rect x="-12" y="-5" width="24" height="10" rx="2" fill="url(#satoTrim)"/><path d="M-8 0h16" stroke="#2a5ba8" stroke-width="2"/></g>`,
    props: `<path d="M62 92 C58 80 60 70 66 64" stroke="#2b3248" stroke-width="4" fill="none"/>
      <rect x="56" y="92" width="12" height="20" rx="5" fill="#2b3248"/><circle cx="62" cy="102" r="3" fill="#6fd3ff" filter="url(#satoGlow)"/><circle cx="62" cy="102" r="2" fill="#bdf0ff"/>
      <path d="M62 112 C66 128 76 138 88 140" stroke="#2b3248" stroke-width="2.4" fill="none"/><circle cx="89" cy="140" r="2.6" fill="#2b3248"/>`,
  },
  // hothead ace: spiky auburn hair, a plaster on the cheek, orange pilot suit with neck ring
  arkin: {
    skin: 'warm', iris: '#3f9a52', bg: ['#3b2a10', '#140d06'], grid: '#ffb347',
    hair: ['#e0874a', '#a3471f', '#4e1d0c'], coat: ['#e06a1c', '#5a2208'], trim: ['#5a6070', '#c9d0e0'],
    hairBack: 'M56 96 C48 60 68 26 102 24 C138 22 160 52 150 98 L142 122 L136 100 L66 100 L62 124 Z',
    hairFront: 'M58 100 L50 70 L66 74 L58 44 L80 56 L82 26 L98 46 L110 18 L118 46 L138 28 L134 56 L156 50 L144 74 L158 84 L142 88 L140 96 C136 80 126 70 114 66 L110 80 L102 66 L94 82 L88 68 L80 84 L76 70 C68 76 62 86 60 98 Z',
    hairLines: '<path d="M84 44 L96 30 M112 40 L118 26" stroke="#f3b27c" stroke-width="1.6" opacity=".7"/>',
    brows: '<path d="M71 90 L96 86 L96 91 L72 94 Z" fill="#5a2610"/><path d="M106 86 L131 88 L130 93 L106 91 Z" fill="#5a2610"/>',
    mouth: '<path d="M86 136 C94 146 108 146 116 134 C108 139 94 140 86 136 Z" fill="#fff"/><path d="M85 135 C94 147 108 147 117 133" stroke="#6a2a22" stroke-width="2" fill="none" stroke-linecap="round"/>',
    face: '<g transform="translate(122 120) rotate(-18)"><rect x="-9" y="-4" width="18" height="8" rx="2" fill="#f4d9b8"/><path d="M-4 -4v8M0 -4v8M4 -4v8" stroke="#d1aa84" stroke-width=".8"/></g>',
    outfit: `<path d="M64 170 C76 162 124 162 136 170 L138 186 C124 178 76 178 62 186 Z" fill="url(#arkinTrim)"/>
      <path d="M40 240 L64 186 L76 186 L56 240 Z M160 240 L136 186 L124 186 L144 240 Z" fill="#2c303c"/>
      <g transform="translate(146 214)"><circle r="9" fill="#1d2130"/><path d="M-5 2 L0 -6 L5 2 Z" fill="#ffd76a"/></g>`,
  },
  // the engineer: older, receding grey hair, round glasses, goggles pushed up, lab coat
  ruess: {
    skin: 'aged', iris: '#5b6f9a', bg: ['#16323a', '#071418'], grid: '#7fffd2',
    hair: ['#eef0f2', '#b5bac2', '#6d737d'], coat: ['#e8ecef', '#9aa3ad'], trim: ['#6b4a2a', '#a8784a'],
    hairBack: 'M56 104 C50 84 54 70 62 64 L64 112 Z M146 104 C152 84 148 70 140 64 L138 112 Z',
    hairFront: 'M58 108 C52 88 56 70 66 62 C70 70 70 80 68 92 C66 98 62 104 58 108 Z M144 108 C150 88 146 70 136 62 C132 70 132 80 134 92 C136 98 140 104 144 108 Z M84 52 C92 46 110 46 118 52 C110 50 92 50 84 52 Z',
    face: '<path d="M76 116 C80 120 84 121 88 120 M112 120 C116 121 120 120 124 116" stroke="#9c6f5d" stroke-width="1" fill="none" opacity=".7"/><path d="M82 66 C94 62 108 62 120 66 M86 72 C96 69 106 69 116 72" stroke="#b3866f" stroke-width="1" fill="none" opacity=".6"/>',
    brows: '<path d="M72 88 C80 84 90 85 96 89" stroke="#e8eaee" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M106 89 C112 85 122 84 130 88" stroke="#e8eaee" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
    mouth: `<path d="M84 128 C92 124 100 126 100 130 C100 126 108 124 116 128 C110 134 104 132 100 132 C96 132 90 134 84 128 Z" fill="#dfe2e6"/>
      <path d="M92 140 C97 142 103 142 108 140" stroke="#7a4a40" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    outfit: `<path d="M70 174 L100 210 L130 174 L150 240 L50 240 Z" fill="#6b4a2a"/><path d="M84 182 L100 210 L116 182" stroke="#a8784a" stroke-width="3" fill="none"/>
      <path d="M50 240 L70 174 L84 182 L72 240 Z M150 240 L130 174 L116 182 L128 240 Z" fill="#cfd5db"/>
      <g transform="translate(140 214)"><rect x="-4" y="-14" width="3" height="20" fill="#2a6bd1"/><rect x="2" y="-12" width="3" height="18" fill="#d12a3a"/></g>`,
    props: `<g fill="none" stroke="#3b3f48" stroke-width="2.4"><circle cx="86" cy="99" r="11"/><circle cx="117" cy="99" r="11"/><path d="M97 98 C100 95 103 95 106 98 M75 97 L66 94 M128 97 L136 94"/></g>
      <g opacity=".35" fill="#cfe9ff"><circle cx="86" cy="99" r="10"/><circle cx="117" cy="99" r="10"/></g>
      <rect x="66" y="58" width="70" height="7" rx="3" fill="#3a2a1c"/>
      <g><circle cx="86" cy="54" r="11" fill="#3a2a1c"/><circle cx="86" cy="54" r="7.5" fill="#7fffd2" opacity=".75"/><circle cx="116" cy="54" r="11" fill="#3a2a1c"/><circle cx="116" cy="54" r="7.5" fill="#7fffd2" opacity=".75"/>
      <circle cx="83" cy="51" r="2" fill="#fff" opacity=".8"/><circle cx="113" cy="51" r="2" fill="#fff" opacity=".8"/></g>`,
  },
  // Kessrin's ace: long platinum hair, ice-blue eyes, red visor band, black-and-red pilot suit
  vane: {
    skin: 'pale', iris: '#3fb6ff', bg: ['#3d0a18', '#12040a'], grid: '#ff4d6d',
    hair: ['#fffbe9', '#e6d79a', '#a48f4a'], coat: ['#1c1a24', '#060509'], trim: ['#8c1426', '#ff3d5a'],
    hairBack: 'M50 92 C42 50 70 18 104 18 C140 18 164 50 154 96 C152 140 160 190 166 236 L132 236 C136 190 136 150 134 104 L66 104 C64 150 62 196 66 236 L34 236 C40 190 48 140 50 92 Z',
    hairFront: 'M58 102 C50 58 76 22 106 22 C138 22 156 52 150 96 C146 80 140 70 130 64 C116 74 96 76 74 70 C88 82 96 96 98 112 C88 96 74 88 62 90 C60 94 59 98 58 102 Z',
    hairLines: '<path d="M78 40 C98 28 126 30 144 46 M74 70 C92 76 112 74 128 64" stroke="#fffdf2" stroke-width="1.6" fill="none" opacity=".7"/>',
    brows: '<path d="M72 89 L96 86 L96 90 L73 93 Z" fill="#b9a56a"/><path d="M106 86 L130 87 L129 91 L106 90 Z" fill="#b9a56a"/>',
    eyeL: `<path d="M74 99 C80 94 90 94 96 99 C90 102 80 103 74 99 Z" fill="#fbf8ff"/><circle cx="86" cy="99" r="3.8" fill="#3fb6ff"/><circle cx="86" cy="99" r="1.6" fill="#0a1830"/><circle cx="84.8" cy="97.8" r=".9" fill="#fff"/><path d="M72 98 C80 92 91 92 98 98" stroke="#1d1428" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M96 98 L101 95" stroke="#1d1428" stroke-width="1.6"/>`,
    eyeR: `<path d="M106 99 C112 94 122 94 128 98 C122 102 112 103 106 99 Z" fill="#fbf8ff"/><circle cx="117" cy="99" r="3.8" fill="#3fb6ff"/><circle cx="117" cy="99" r="1.6" fill="#0a1830"/><circle cx="115.8" cy="97.8" r=".9" fill="#fff"/><path d="M104 98 C112 92 123 92 130 97" stroke="#1d1428" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M130 97 L134 94" stroke="#1d1428" stroke-width="1.6"/>`,
    mouth: '<path d="M90 140 C96 138 104 138 112 136 C106 142 96 144 90 140 Z" fill="#c4213a"/><path d="M112 136 L115 133" stroke="#8c1426" stroke-width="1.4" stroke-linecap="round"/>',
    collar: '<path d="M78 160 L84 150 L116 150 L122 160 L118 182 L100 190 L82 182 Z" fill="#1c1a24"/><path d="M82 166 L118 166" stroke="#ff3d5a" stroke-width="2"/>',
    outfit: `<path d="M60 182 L100 214 L140 182 L144 196 L100 228 L56 196 Z" fill="url(#vaneTrim)"/>
      <g transform="translate(100 226)"><path d="M0 -8 L7 0 L0 8 L-7 0 Z" fill="#ffd76a"/><circle r="2.6" fill="#8c1426"/></g>`,
    props: `<path d="M62 76 C80 64 122 64 140 76 L138 84 C120 74 82 74 64 84 Z" fill="#2b0d16"/><path d="M66 78 C84 68 118 68 136 78" stroke="#ff3d5a" stroke-width="2.2" fill="none" filter="url(#vaneGlow)"/><path d="M66 78 C84 68 118 68 136 78" stroke="#ffb3c0" stroke-width="1" fill="none"/>`,
  },
  // the pirate queen: wild violet hair under a gold circlet, an eyepatch, fur-collared coat
  moraine: {
    skin: 'warm', iris: '#2fd6c4', bg: ['#3a2508', '#120a02'], grid: '#ffc94a',
    hair: ['#d78cff', '#8b3fc9', '#3a1366'], coat: ['#3a1c5a', '#12061e'], trim: ['#8a5a12', '#ffd76a'],
    hairBack: 'M40 120 C26 70 56 14 104 14 C152 14 182 66 166 124 C176 150 170 176 156 196 L140 150 L136 102 L66 102 L60 152 L44 196 C30 176 28 146 40 120 Z',
    hairFront: 'M56 104 C46 60 74 26 104 26 C136 26 158 56 150 100 C144 84 136 72 122 66 C110 70 96 70 84 66 C72 74 62 88 56 104 Z',
    hairLines: '<path d="M60 70 C70 44 96 30 124 34 M140 52 C152 66 156 82 154 98" stroke="#efc7ff" stroke-width="1.6" fill="none" opacity=".65"/>',
    brows: '<path d="M73 88 C80 84 90 84 96 88" stroke="#4a1a72" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M106 86 C114 82 122 83 130 88" stroke="#4a1a72" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    eyeL: '<path d="M70 92 C76 88 94 88 98 92 L96 108 C90 112 78 112 72 108 Z" fill="#14101c"/><path d="M60 80 L98 96 M140 70 L98 96" stroke="#14101c" stroke-width="2"/><circle cx="84" cy="100" r="3" fill="#ffd76a"/>',
    mouth: '<path d="M88 138 C96 142 106 141 114 134" stroke="#7a1f3a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M90 139 C97 141 105 140 112 136 C106 144 96 145 90 139 Z" fill="#a8284e"/>',
    outfit: `<path d="M22 240 C28 206 50 190 74 182 C86 194 114 194 126 182 C150 190 172 206 178 240 Z" fill="url(#moraineCoat)"/>
      <path d="M30 214 C40 186 66 172 84 176 C76 186 70 198 72 212 C60 206 44 206 30 214 Z M170 214 C160 186 134 172 116 176 C124 186 130 198 128 212 C140 206 156 206 170 214 Z" fill="#f2ece4"/>
      <path d="M36 212 C46 196 60 188 74 190 M164 212 C154 196 140 188 126 190" stroke="#cbbfb0" stroke-width="1.4" fill="none"/>
      <g transform="translate(100 222)"><circle r="8" fill="url(#moraineTrim)"/><circle r="3.5" fill="#2fd6c4"/></g>`,
    props: `<path d="M66 64 C82 52 120 52 136 64 L132 70 C118 60 84 60 70 70 Z" fill="url(#moraineTrim)"/>
      <path d="M92 58 L100 42 L108 58 Z M76 62 L80 50 L86 60 Z M116 60 L122 50 L126 62 Z" fill="url(#moraineTrim)"/><circle cx="100" cy="54" r="3" fill="#2fd6c4"/>
      <g transform="translate(140 118)"><circle r="4" fill="none" stroke="url(#moraineTrim)" stroke-width="2"/><path d="M0 4 L0 16" stroke="#ffd76a" stroke-width="1.6"/><circle cy="18" r="3" fill="#2fd6c4"/></g>`,
  },
  // Galt's old warlord, eleven years in hiding: long white hair swept back, a white beard, a scar
  // through the brow, a green cybernetic eye, a high-collared Galt coat in black, green and gold
  ahriman: {
    skin: 'aged', iris: '#c9a23a', bg: ['#0f2e1a', '#04100a'], grid: '#5dff9a',
    hair: ['#ffffff', '#cfd3d6', '#8a9096'], coat: ['#132018', '#030805'], trim: ['#7a5a12', '#ffd76a'],
    hairBack: 'M48 110 C38 64 66 20 104 20 C142 20 166 62 156 110 C160 146 158 182 150 214 L132 186 L134 104 L68 104 L70 186 L52 214 C44 182 42 146 48 110 Z',
    hairFront: 'M60 96 C56 60 78 30 104 30 C132 30 152 58 146 94 C140 76 130 62 112 56 C96 58 82 64 72 74 C66 80 62 88 60 96 Z',
    hairLines: '<path d="M70 70 C86 50 112 44 136 54 M78 82 C92 64 116 58 140 66" stroke="#ffffff" stroke-width="1.4" fill="none" opacity=".75"/>',
    brows: '<path d="M71 88 L96 84 L96 89 L72 92 Z" fill="#f2f2f0"/><path d="M106 84 L131 88 L130 92 L106 89 Z" fill="#f2f2f0"/>',
    eyeR: `<path d="M106 99 C112 94 122 94 128 98 C122 102 112 103 106 99 Z" fill="#fbf8ff"/><circle cx="117" cy="99" r="3.8" fill="#c9a23a"/><circle cx="117" cy="99" r="1.6" fill="#1a1006"/><circle cx="115.8" cy="97.8" r=".9" fill="#fff"/><path d="M104 98 C112 92 123 92 130 97" stroke="#1d1428" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    eyeL: `<circle cx="86" cy="99" r="11" fill="#1b2a20" stroke="#8a9a90" stroke-width="2"/><circle cx="86" cy="99" r="6" fill="#5dff9a" filter="url(#ahrimanGlow)"/><circle cx="86" cy="99" r="3.6" fill="#c8ffe0"/>
      <path d="M75 99 L66 99 M86 88 L86 82" stroke="#8a9a90" stroke-width="2"/>`,
    face: `<path d="M120 78 L127 104" stroke="#9c5a4a" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
      <path d="M76 118 C80 122 84 123 88 122 M112 122 C116 123 120 122 124 118 M84 70 C96 66 108 66 120 70" stroke="#b3866f" stroke-width="1" fill="none" opacity=".6"/>`,
    mouth: `<path d="M74 126 C82 150 92 166 100 170 C108 166 118 150 126 126 C118 136 110 134 100 136 C90 134 82 136 74 126 Z" fill="#e8e8e4"/>
      <path d="M90 138 C96 136 104 136 110 138" stroke="#6a3a30" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M84 146 L90 160 M100 148 L100 166 M116 146 L110 160" stroke="#c6c8c6" stroke-width="1" opacity=".8"/>`,
    collar: '<path d="M72 150 L86 142 L114 142 L128 150 L124 186 L100 196 L76 186 Z" fill="#0c140f"/><path d="M78 156 L122 156" stroke="#ffd76a" stroke-width="2"/><path d="M80 164 L120 164" stroke="#5dff9a" stroke-width="1.2" opacity=".8"/>',
    outfit: `<path d="M26 206 C40 186 58 178 72 176 L68 196 C54 196 40 202 26 214 Z M174 206 C160 186 142 178 128 176 L132 196 C146 196 160 202 174 214 Z" fill="url(#ahrimanTrim)"/>
      <path d="M30 210 L40 198 M42 204 L50 192 M170 210 L160 198 M158 204 L150 192" stroke="#ffe9a6" stroke-width="1.6"/>
      <g transform="translate(100 222)"><path d="M0 -10 L9 0 L0 10 L-9 0 Z" fill="url(#ahrimanTrim)"/><circle r="3.4" fill="#5dff9a"/></g>`,
  },
};

// SVG markup for a speaker's portrait ('' for an unknown speaker).
export function portrait(speaker) {
  if (speaker === 'kessrin') return villainPortrait();
  return CAST[speaker] ? bust(speaker, CAST[speaker]) : '';
}
