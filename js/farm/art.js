// Sato's Harvest: art slots (docs/FARM.md). Every visual is a named slot. If art/farm/manifest.json
// lists a file for the slot it is used; otherwise a procedural stand-in is drawn, so the game runs
// with no art at all. 3D models come from art/farm/models/manifest.json the same way.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/GLTFLoader.js';

const BASE = 'art/farm/';
let files = {}, models = {};
const texCache = new Map(), modelCache = new Map();
const loader = new THREE.TextureLoader(), gltf = new GLTFLoader();

export async function loadArt() {
  const get = async (u) => { try { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch { return null; } };
  const [a, b] = await Promise.all([get(BASE + 'manifest.json'), get(BASE + 'models/manifest.json')]);
  files = (a && a.files) || {}; models = b || {};
  return { images: Object.keys(files).length, models: Object.keys(models).length };
}
export const has = (slot) => !!files[slot];
export const info = (slot) => files[slot] || null;
export const url = (slot) => (files[slot] ? BASE + files[slot].file : null);
export const hasModel = (name) => !!models[name];
export const modelInfo = (name) => models[name] || null;

// ---------------------------------------------------------------- procedural stand-ins
const FLAT = {
  grass_spring: ['#6fae4c', '#5d9a40', '#83bd5c'], grass_summer: ['#4f9a3a', '#3f8530', '#63ab48'], grass_autumn: ['#a89a4a', '#8f7f3a', '#c2a653'],
  grass_winter: ['#e6edf2', '#d3dde6', '#f6f9fb'], soil_dry: ['#9a7b55', '#86694a', '#a98a63'], soil_tilled: ['#6e4f33', '#5c4029', '#7d5b3c'],
  soil_wet: ['#3f2c1d', '#332316', '#4b3524'], path_dirt: ['#c2a77c', '#b0966d', '#cdb48b'], cobble: ['#9a9a96', '#85857f', '#b0b0aa'],
  sand: ['#d9c79a', '#cbb888', '#e3d3aa'], cliff_rock: ['#77736d', '#66625c', '#8a857e'], wood_floor: ['#a37a4f', '#8f6942', '#b48a5c'],
  plank_wall: ['#cdbf9f', '#bcae8e', '#d9ccae'], barn_red: ['#9c3b2e', '#873225', '#ad4638'], plaster_wall: ['#e0d8c6', '#d2c9b5', '#eae3d3'],
  roof_shingle: ['#6f6a66', '#5d5955', '#7f7a75'], roof_red: ['#a5502f', '#8e4326', '#b65e3a'], roof_tin: ['#8d99a0', '#7b878e', '#a0abb1'],
  metal_hull: ['#6e7b88', '#5d6a77', '#808d99'], concrete_ruin: ['#8b8a84', '#787771', '#9c9b95'], brick_ruin: ['#8a5a48', '#774c3c', '#9a6854'],
  ash_ground: ['#7c776f', '#6a665f', '#8c877e'], hay: ['#d4b45a', '#c2a24b', '#e0c26c'], water: ['#2d5f73', '#27556a', '#35697d'],
  stone_floor: ['#a9a69d', '#97948b', '#b7b4ab'], glass: ['#bfe3e6', '#a9d3d8', '#d3eef0'],
  // the colony's own surfaces (art slots textures/deck_floor, hull_plate, colony_path, grass_colony)
  dust_lane: ['#24262f', '#1c1e26', '#2e3038'],
  deck_floor: ['#c4ccd0', '#b3bcc1', '#d3dadd'], hull_plate: ['#8a98a6', '#7b8997', '#9aa7b3'], colony_path: ['#d8d0c0', '#c8bfae', '#e4ddd0'], grass_colony: ['#6fae4c', '#5d9a40', '#83bd5c'],
};
function paintFlat(name, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const [base, lo, hi] = FLAT[name] || ['#888', '#777', '#999'];
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  let s = 0; for (const ch of name) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < size * 14; i++) { g.fillStyle = r() < 0.5 ? lo : hi; g.globalAlpha = 0.5; g.fillRect(r() * size, r() * size, 1 + r() * 3, 1 + r() * 2); }
  g.globalAlpha = 1;
  if (/plank|barn|wood|soil_tilled|soil_wet|roof/.test(name)) { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 2; const n = /roof/.test(name) ? 8 : 6; for (let i = 0; i < n; i++) { const p = (i + 0.5) * size / n; g.beginPath(); if (/soil|roof/.test(name)) { g.moveTo(0, p); g.lineTo(size, p); } else { g.moveTo(p, 0); g.lineTo(p, size); } g.stroke(); } }
  if (/deck|hull/.test(name)) { g.strokeStyle = 'rgba(40,55,65,.45)'; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * size / 2); g.lineTo(size, i * size / 2); g.moveTo(i * size / 2, 0); g.lineTo(i * size / 2, size); g.stroke(); } g.fillStyle = 'rgba(40,55,65,.5)'; for (const a of [8, size / 2 - 10, size / 2 + 8, size - 10]) for (const b of [8, size / 2 - 10, size / 2 + 8, size - 10]) g.fillRect(a, b, 3, 3); g.fillStyle = 'rgba(95,179,176,.55)'; g.fillRect(size / 2 - 1, size / 4, 2, size / 2); }
  if (/cobble|brick|colony_path/.test(name)) { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.strokeRect(x * size / 4 + (y % 2 ? size / 8 : 0), y * size / 4, size / 4, size / 4); }
  return c;
}

// A tiling ground or wall texture. `repeat` is how many times it repeats per tile unit.
export function tex(slot, { repeat = 1, wrap = true } = {}) {
  const key = slot + '|' + repeat;
  if (texCache.has(key)) return texCache.get(key);
  let t;
  if (files['textures/' + slot] || files[slot]) {
    const f = files['textures/' + slot] || files[slot];
    t = loader.load(BASE + f.file);
  } else t = new THREE.CanvasTexture(paintFlat(slot));
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  texCache.set(key, t); return t;
}
// A picture slot (sprite, facade, person). Returns null when there is no art for it.
export function pic(slot) {
  const f = files[slot]; if (!f) return null;
  const key = 'pic|' + slot;
  if (!texCache.has(key)) { const t = loader.load(BASE + f.file); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); }
  return { tex: texCache.get(key), ...f };
}
// A fresh texture object on the same image, for sprite-sheet animation (own offset/repeat).
export function sheet(slot) {
  const f = files[slot]; if (!f || !f.frames) return null;
  const t = loader.load(BASE + f.file); t.colorSpace = THREE.SRGBColorSpace;
  const cols = f.cols || f.frames, rows = Math.ceil(f.frames / cols);
  t.repeat.set(1 / cols, 1 / rows);
  return { tex: t, frames: f.frames, cols, rows, fps: f.fps || 12, fw: f.fw, fh: f.fh, anchor: f.anchor };
}
// A 3D model, or null. The clone is normalised: standing on y = 0, longest side 1 unit.
export function model(name) {
  if (!models[name]) return Promise.resolve(null);
  if (!modelCache.has(name)) {
    modelCache.set(name, new Promise((res) => gltf.load(BASE + 'models/' + models[name].file, (g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = 4; if (o.material) { o.material.metalness = Math.min(o.material.metalness ?? 0, 0.1); o.material.roughness = Math.max(o.material.roughness ?? 1, 0.75); } } });
      res(g.scene);
    }, undefined, () => res(null))));
  }
  return modelCache.get(name).then((s) => (s ? s.clone(true) : null));
}
