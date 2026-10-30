// Scene renderer: one SVG document, three camera modes, depth-sorted billboards.
// Nodes are pooled per entity; only transforms change most frames.
//
// Readability rules:
//   - the ground is a faceted low-poly plane, not a flat colour
//   - every prop is drawn at its real metric size (a tree is 8 m, a person 1.8 m)
//   - points of interest get a floating beacon + name so the world explains itself
//   - the active quest gets a gold beacon you can see across the zone
import { project, onScreen, clamp, ISO_K } from '../core/geom.js';
import { spriteSVG, poiSprite, spriteTop } from './sprites.js';
import { WEATHER } from '../data/zones.js';
import { objectiveTarget } from '../systems/guidance.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);

let svg = null;
let defsEl = null;
let gameRef = null;
let layers = {};
let nodes = new Map();
let lastZone = null;
let lastView = null;
let terrainBuilt = 0;
let isoTerrain = null;   // { zoneId, inner } — built once, then only translated
let weatherKey = '';
let lastSort = '';
let raf = null;
let pickables = [];
let gritPattern = null;
let facetPattern = null;
let groundGrad = null;

const GLYPH = {
  waystone: '✦', rift: '◈', gate: '⇧', boss: '☠', cache: '▣', camp: '⌂',
  ruin: '▤', farm: '♣', board: '≡', vendor: '¤', trainer: '✚', npc: '•',
};

function el(name, attrs = {}) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return '#' + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0');
}

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

export function initScene(game) {
  gameRef = game;
  svg = $('#scene');
  if (!svg) return;
  svg.innerHTML = `<defs></defs>
  <g id="l-sky"></g>
  <g id="l-terrain"></g>
  <g id="l-ground"></g>
  <g id="l-world"></g>
  <g id="l-markers"></g>
  <g id="l-fx"></g>
  <g id="l-weather"></g>
  <g id="l-firstperson"></g>
  <rect id="l-tint" x="0" y="0" width="100%" height="100%" fill="#0a1020" opacity="0" pointer-events="none"/>
  <rect id="l-vign" x="0" y="0" width="100%" height="100%" fill="url(#vign)" pointer-events="none"/>
  <g id="l-crosshair" style="display:none">
    <circle cx="50%" cy="50%" r="9" fill="none" stroke="#dff3f1" stroke-width="1" opacity=".5"/>
    <path d="M -10 0 h 6 M 4 0 h 6 M 0 -10 v 6 M 0 4 v 6" stroke="#dff3f1" stroke-width="1" opacity=".5" transform="translate(0,0)"/>
  </g>`;
  defsEl = svg.querySelector('defs');
  defsEl.innerHTML = `<radialGradient id="vign" cx="50%" cy="45%" r="70%"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="#000" stop-opacity=".6"/></radialGradient>`;
  layers = {
    sky: svg.querySelector('#l-sky'), terrain: svg.querySelector('#l-terrain'),
    ground: svg.querySelector('#l-ground'), world: svg.querySelector('#l-world'),
    markers: svg.querySelector('#l-markers'), fx: svg.querySelector('#l-fx'),
    weather: svg.querySelector('#l-weather'), first: svg.querySelector('#l-firstperson'),
    tint: svg.querySelector('#l-tint'), cross: svg.querySelector('#l-crosshair'),
  };
  resize();
  window.addEventListener('resize', resize);
  lastZone = null;
  startLoop();
}

function resize() {
  if (!svg || !gameRef) return;
  const r = svg.getBoundingClientRect();
  gameRef.cam.w = r.width || window.innerWidth;
  gameRef.cam.h = r.height || window.innerHeight;
  lastZone = null;
}

function startLoop() {
  if (raf) cancelAnimationFrame(raf);
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!gameRef?.player) return;
    try { render(); } catch (e) { console.error(e); }
  };
  raf = requestAnimationFrame(loop);
}

function camFor(game) {
  const cam = game.cam;
  const p = game.player;
  const targetYaw = p.facing ?? 0;
  if (game.view === 'iso') {
    cam.mode = 'iso';
    cam.x += (p.x - cam.x) * 0.2;
    cam.y += (p.y - cam.y) * 0.2;
    cam.z = 0.4;
    cam.zoom = 1;
  } else {
    cam.mode = game.view;
    cam.x = p.x; cam.y = p.y; cam.z = 0.4;
    if (game.view === 'first') cam.yaw = targetYaw;
    else {
      let d = ((targetYaw - cam.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      cam.yaw += d * 0.06;
    }
    cam.zoom = 1;
  }
  return cam;
}

export function render() {
  const game = gameRef;
  if (!game?.player || !svg) return;
  const cam = camFor(game);
  const W = cam.w, H = cam.h;
  const kk = ISO_K * cam.zoom;
  const ox = ((-cam.x + cam.y) * kk * 0.866) % 64;
  const oy = ((-cam.x - cam.y) * kk * 0.5) % 48;
  if (game.view === 'iso') {
    gritPattern?.setAttribute('patternTransform', `translate(${ox.toFixed(1)} ${oy.toFixed(1)})`);
    facetPattern?.setAttribute('patternTransform', `translate(${ox.toFixed(1)} ${oy.toFixed(1)})`);
  }
  const p = game.player;
  const zone = game.world.zone;
  if (!zone) return;

  if (lastZone !== zone.id || lastView !== game.view) {
    buildBackground(zone, game);
    nodes.forEach(n => n.el.remove());
    nodes.clear();
    lastZone = zone.id;
    lastView = game.view;
    terrainBuilt = 0;
    isoTerrain = null;
    layers.terrain.innerHTML = '';
  }
  buildTerrainIfNeeded(game, cam);
  updateWeather(zone, game);
  drawWorld(game, cam);
  drawMarkers(game, cam);
  drawGroundFx(game, cam);
  drawFirstPerson(game, cam);
  updateTint(game, zone);
}

function ensureDefs(zone) {
  const pal = zone.palette ?? {};
  const ground = pal.ground ?? '#2a3136';
  const g2 = pal.ground2 ?? shade(ground, 0.12);
  const accent = pal.accent ?? '#4f7378';
  const sky = pal.sky ?? '#122027';
  defsEl.innerHTML = `<radialGradient id="vign" cx="50%" cy="45%" r="70%"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="#000" stop-opacity=".6"/></radialGradient>
  <linearGradient id="skygrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(sky, -0.15)}"/><stop offset="0.7" stop-color="${sky}"/><stop offset="1" stop-color="${shade(sky, 0.28)}"/></linearGradient>
  <linearGradient id="groundgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(ground, 0.18)}"/><stop offset="0.45" stop-color="${ground}"/><stop offset="1" stop-color="${shade(ground, -0.12)}"/></linearGradient>
  <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(sky, 0.4)}" stop-opacity=".0"/><stop offset="1" stop-color="${shade(sky, 0.4)}" stop-opacity=".22"/></linearGradient>
  <pattern id="grit" width="22" height="22" patternUnits="userSpaceOnUse">
    <circle cx="3" cy="4" r=".9" fill="#dfeeea" opacity=".07"/>
    <circle cx="13" cy="11" r=".7" fill="#dfeeea" opacity=".05"/>
    <circle cx="8" cy="18" r="1.1" fill="#000" opacity=".09"/>
    <circle cx="19" cy="3" r=".6" fill="#dfeeea" opacity=".05"/>
  </pattern>
  <pattern id="facets" width="120" height="80" patternUnits="userSpaceOnUse">
    <rect width="120" height="80" fill="${ground}"/>
    <polygon points="0,0 60,0 30,40" fill="${g2}" opacity=".18"/>
    <polygon points="60,0 120,0 90,40" fill="${accent}" opacity=".05"/>
    <polygon points="0,0 30,40 0,80" fill="${g2}" opacity=".12"/>
    <polygon points="120,0 120,80 90,40" fill="${g2}" opacity=".15"/>
    <polygon points="30,40 90,40 60,80" fill="${accent}" opacity=".04"/>
    <polygon points="60,80 90,40 120,80" fill="${shade(ground, -0.12)}" opacity=".16"/>
    <polygon points="0,80 30,40 60,80" fill="${g2}" opacity=".16"/>
  </pattern>`;
  gritPattern = defsEl.querySelector('#grit');
  facetPattern = defsEl.querySelector('#facets');
  groundGrad = defsEl.querySelector('#groundgrad');
}

function buildBackground(zone, game) {
  const cam = game.cam;
  const pal = zone.palette ?? {};
  ensureDefs(zone);
  layers.sky.innerHTML = '';
  if (game.view === 'iso') {
    layers.sky.appendChild(el('rect', { x: 0, y: 0, width: cam.w, height: cam.h, fill: 'url(#facets)' }));
    layers.sky.appendChild(el('rect', { x: 0, y: 0, width: cam.w, height: cam.h, fill: 'url(#grit)' }));
    return;
  }
  const hz = cam.h * (game.view === 'first' ? 0.44 : 0.40);
  layers.sky.appendChild(el('rect', { x: 0, y: 0, width: cam.w, height: hz + 2, fill: 'url(#skygrad)' }));
  // sun / moon
  const mins = (game.player.time ?? 360) % 1440;
  const day = mins > 360 && mins < 1140;
  const sx = cam.w * (0.18 + 0.64 * ((mins / 1440 + 0.25) % 1));
  layers.sky.appendChild(el('circle', { cx: sx, cy: hz * (day ? 0.34 : 0.24), r: day ? 26 : 18, fill: day ? '#ffe6a8' : '#cfe0f0', opacity: day ? '.5' : '.35' }));
  layers.sky.appendChild(el('circle', { cx: sx, cy: hz * (day ? 0.34 : 0.24), r: day ? 60 : 40, fill: day ? '#ffe6a8' : '#cfe0f0', opacity: '.08' }));
  // distant ridges: three parallax silhouettes
  const ridge = (yBase, amp, color, seed, op) => {
    let d = `M -40 ${hz + 4} L -40 ${yBase}`;
    for (let x = -40; x <= cam.w + 40; x += 40) {
      const y = yBase - Math.sin((x * 0.011) + seed) * amp - Math.sin((x * 0.031) + seed * 2.7) * amp * 0.4;
      d += ` L ${x} ${y.toFixed(1)}`;
    }
    d += ` L ${cam.w + 40} ${hz + 4} Z`;
    layers.sky.appendChild(el('path', { d, fill: color, opacity: op }));
  };
  const yaw = cam.yaw ?? 0;
  ridge(hz - 26 + Math.sin(yaw) * 3, 22, shade(pal.fog ?? pal.sky ?? '#0d161a', 0.18), 1.3 + yaw * 0.2, '.85');
  ridge(hz - 8 + Math.sin(yaw + 1) * 2, 16, shade(pal.fog ?? pal.sky ?? '#0d161a', 0.34), 3.1 + yaw * 0.4, '.8');
  ridge(hz + 2, 9, pal.ground2 ?? '#39434a', 5.7 + yaw * 0.6, '.9');
  layers.sky.appendChild(el('rect', { x: 0, y: hz, width: cam.w, height: cam.h - hz, fill: 'url(#groundgrad)' }));
  layers.sky.appendChild(el('rect', { x: 0, y: hz - 34, width: cam.w, height: 68, fill: 'url(#haze)' }));
  layers.sky.appendChild(el('rect', { x: 0, y: hz - 1, width: cam.w, height: 1.5, fill: pal.accent, opacity: '.3' }));
}

// The ground is built in world space once per zone and then only translated.
// Rebuilding 520 patches + 900 grit every 110 ms was both wasteful and the
// reason the ground never got any detail: there was no budget left for it.
function isoOrigin(cam) {
  const k = ISO_K;
  return {
    x: cam.w / 2 + (-cam.x + cam.y) * k * 0.866,
    y: cam.h / 2 + (-cam.x - cam.y) * k * 0.5,
  };
}

function isoXY(x, y, k) {
  return { x: (x - y) * k * 0.866, y: (x + y) * k * 0.5 };
}

function patchPoints(patch, k) {
  const pts = patch.pts;
  if (!pts?.length) {
    // older/odd patch without a polygon: a soft diamond is better than nothing
    const r = patch.r * k;
    return `${-r},0 0,${-r * 0.62} ${r},0 0,${r * 0.62}`;
  }
  let out = '';
  for (const [px, py] of pts) {
    out += `${((px - py) * k * 0.866).toFixed(1)},${((px + py) * k * 0.5).toFixed(1)} `;
  }
  return out.trim();
}

function buildIsoTerrain(zone, st) {
  const k = ISO_K;
  const pal = zone.palette;
  const g = layers.terrain;
  g.innerHTML = '';
  const inner = el('g');
  const patchLayer = el('g');
  const gritLayer = el('g');

  // ground variation: organic polygons, in world space
  for (const patch of st.patches) {
    const c = isoXY(patch.x, patch.y, k);
    const fill = patch.tone === 0 ? (pal.ground2 ?? shade(pal.ground ?? '#2a3136', 0.12)) : (pal.accent ?? '#4f7378');
    patchLayer.appendChild(el('polygon', {
      points: patchPoints(patch, k),
      transform: `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`,
      fill,
      opacity: String(Math.min(0.12, patch.a * 1.7)),
    }));
  }
  inner.appendChild(patchLayer);

  // grit: pebbles, tufts and cracks. At 24 px/m these are 2–8 px, enough to
  // give the eye a sense of scale without reading as noise.
  const gritCol = shade(pal.ground2 ?? pal.ground ?? '#2a3136', 0.28);
  const darkCol = shade(pal.ground ?? '#2a3136', -0.3);
  for (const gr of st.grit ?? []) {
    const c = isoXY(gr.x, gr.y, k);
    const s = gr.s ?? 1;
    if (gr.kind === 'pebble') {
      gritLayer.appendChild(el('ellipse', {
        cx: c.x.toFixed(1), cy: c.y.toFixed(1),
        rx: (0.16 * k * s).toFixed(1), ry: (0.1 * k * s).toFixed(1),
        fill: gritCol, opacity: '.28',
      }));
      gritLayer.appendChild(el('ellipse', {
        cx: (c.x + 0.4).toFixed(1), cy: (c.y - 0.3).toFixed(1),
        rx: (0.08 * k * s).toFixed(1), ry: (0.05 * k * s).toFixed(1),
        fill: darkCol, opacity: '.18',
      }));
    } else if (gr.kind === 'tuft') {
      const h = 0.34 * k * s;
      gritLayer.appendChild(el('path', {
        d: `M ${c.x.toFixed(1)} ${c.y.toFixed(1)} l ${(-0.12 * k * s).toFixed(1)} ${(-h).toFixed(1)} M ${c.x.toFixed(1)} ${c.y.toFixed(1)} l ${(0.1 * k * s).toFixed(1)} ${(-h * 1.15).toFixed(1)} M ${c.x.toFixed(1)} ${c.y.toFixed(1)} l ${(0.24 * k * s).toFixed(1)} ${(-h * 0.7).toFixed(1)}`,
        stroke: gritCol, 'stroke-width': '1', fill: 'none', opacity: '.22',
      }));
    } else {
      const r = 0.4 * k * s;
      const a = gr.rot ?? 0;
      gritLayer.appendChild(el('path', {
        d: `M ${c.x.toFixed(1)} ${c.y.toFixed(1)} l ${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r * 0.55).toFixed(1)} l ${(Math.cos(a + 0.6) * r * 0.6).toFixed(1)} ${(Math.sin(a + 0.6) * r * 0.35).toFixed(1)}`,
        stroke: darkCol, 'stroke-width': '.8', fill: 'none', opacity: '.16',
      }));
    }
  }
  inner.appendChild(gritLayer);

  // water: a world circle is an ellipse 1.2247k x 0.7071k in this projection
  const wetSand = shade(pal.ground2 ?? pal.ground ?? '#2a3136', 0.2);
  for (const w of st.water) {
    const c = isoXY(w.x, w.y, k);
    const cx = c.x.toFixed(1), cy = c.y.toFixed(1);
    const rx = w.r * k * 1.2247, ry = w.r * k * 0.7071;
    // damp sand ring, so the shore has a beach instead of a cut-out
    inner.appendChild(el('ellipse', { cx, cy, rx: (rx * 1.16).toFixed(1), ry: (ry * 1.16).toFixed(1), fill: wetSand, opacity: '.32' }));
    inner.appendChild(el('ellipse', { cx, cy, rx: rx.toFixed(1), ry: ry.toFixed(1), fill: pal.water, opacity: '.72' }));
    inner.appendChild(el('ellipse', { cx, cy, rx: (rx * 0.86).toFixed(1), ry: (ry * 0.84).toFixed(1), fill: shade(pal.water, -0.18), opacity: '.3' }));
    // a few ripple arcs, fixed in place: cheap, and it reads as water not paint
    for (let i = 0; i < 3; i++) {
      const t = -0.34 + i * 0.34;
      inner.appendChild(el('path', {
        d: `M ${(c.x - rx * 0.32).toFixed(1)} ${(c.y + ry * t).toFixed(1)} q ${(rx * 0.32).toFixed(1)} ${(ry * 0.1).toFixed(1)} ${(rx * 0.64).toFixed(1)} 0`,
        stroke: shade(pal.water, 0.4), 'stroke-width': '1', fill: 'none', opacity: '.16',
      }));
    }
  }

  // points of interest, standing on the ground
  for (const poi of zone.pois) {
    const c = isoXY(poi.x, poi.y, k);
    const body = poiSprite(poi.kind, poi);
    if (!body) continue;
    const g2 = el('g', { transform: `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${k})`, opacity: '.95' });
    g2.innerHTML = body;
    inner.appendChild(g2);
  }

  g.appendChild(inner);
  isoTerrain = { zoneId: zone.id, inner };
}

function buildTerrainIfNeeded(game, cam) {
  const zone = game.world.zone;
  const st = game.world.state;
  if (!zone || !st) return;

  if (game.view === 'iso') {
    if (!isoTerrain || isoTerrain.zoneId !== zone.id) buildIsoTerrain(zone, st);
    const o = isoOrigin(cam);
    isoTerrain.inner.setAttribute('transform', `translate(${o.x.toFixed(2)} ${o.y.toFixed(2)})`);
    return;
  }

  // Perspective cameras rebuild on a timer: the projection changes every frame.
  const now = performance.now();
  if (now - terrainBuilt < 110) return;
  terrainBuilt = now;
  const g = layers.terrain;
  g.innerHTML = '';
  const pal = zone.palette;
  const p = game.player;

  for (const w of st.water) {
    const pr = project({ x: w.x, y: w.y, z: 0 }, cam);
    if (!pr || !onScreen(pr, 300, cam)) continue;
    g.appendChild(el('ellipse', { cx: pr.x, cy: pr.y, rx: w.r * pr.s, ry: w.r * pr.s * 0.32, fill: pal.water, opacity: '.55' }));
  }
  for (const patch of st.patches) {
    const pts = patch.pts;
    let poly = '', any = false, minY = Infinity, maxY = -Infinity;
    if (pts?.length) {
      for (const [px, py] of pts) {
        const pr = project({ x: patch.x + px, y: patch.y + py, z: 0 }, cam);
        if (!pr) continue;
        if (pr.y > -60 && pr.y < cam.h + 60) any = true;
        minY = Math.min(minY, pr.y); maxY = Math.max(maxY, pr.y);
        poly += `${pr.x.toFixed(1)},${pr.y.toFixed(1)} `;
      }
    }
    if (!any) continue;
    g.appendChild(el('polygon', {
      points: poly.trim(),
      fill: patch.tone === 0 ? (pal.ground2 ?? '#39434a') : (pal.accent ?? '#4f7378'),
      opacity: String(Math.min(0.1, patch.a * 1.5)),
    }));
  }
  // nearby grit only: at range it is sub-pixel noise
  const gritCol = shade(pal.ground2 ?? pal.ground ?? '#2a3136', 0.28);
  for (const gr of st.grit ?? []) {
    if (Math.hypot(gr.x - p.x, gr.y - p.y) > 26) continue;
    const pr = project({ x: gr.x, y: gr.y, z: 0 }, cam);
    if (!pr || pr.y < 0 || pr.y > cam.h) continue;
    const s = gr.s ?? 1;
    if (gr.kind === 'tuft') {
      const h = 0.34 * pr.s * s;
      g.appendChild(el('path', {
        d: `M ${pr.x.toFixed(1)} ${pr.y.toFixed(1)} l ${(-0.12 * pr.s * s).toFixed(1)} ${(-h).toFixed(1)} M ${pr.x.toFixed(1)} ${pr.y.toFixed(1)} l ${(0.12 * pr.s * s).toFixed(1)} ${(-h).toFixed(1)}`,
        stroke: gritCol, 'stroke-width': '1', fill: 'none', opacity: '.2',
      }));
    } else {
      g.appendChild(el('ellipse', { cx: pr.x.toFixed(1), cy: pr.y.toFixed(1), rx: (0.16 * pr.s * s).toFixed(1), ry: (0.1 * pr.s * s).toFixed(1), fill: gritCol, opacity: '.24' }));
    }
  }
  for (const poi of zone.pois) {
    const pr = project({ x: poi.x, y: poi.y, z: 0 }, cam);
    if (!pr || !onScreen(pr, 220, cam)) continue;
    const body = poiSprite(poi.kind, poi);
    if (!body) continue;
    const g2 = el('g', { transform: `translate(${pr.x} ${pr.y}) scale(${pr.s})`, opacity: '.95' });
    g2.innerHTML = body;
    g.appendChild(g2);
  }
}

function updateWeather(zone, game) {
  const w = game.world.state?.weather ?? 'clear';
  const key = zone.id + w;
  if (key === weatherKey) return;
  weatherKey = key;
  layers.weather.innerHTML = '';
  const particle = WEATHER.find(x => x.id === w)?.particle;
  const kind = particle === 'fog' ? null : particle;
  const count = { rain: 48, ash: 34, spore: 26, spark: 20 }[kind] ?? 0;
  if (!count) return;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * game.cam.w;
    const y = Math.random() * game.cam.h * 0.8;
    const size = kind === 'rain' ? 1 : kind === 'ash' ? 1.6 : kind === 'spore' ? 2.2 : 1.2;
    const color = kind === 'rain' ? '#8fb8c0' : kind === 'ash' ? '#c9c3b8' : kind === 'spore' ? '#a8e08a' : '#9fd8ff';
    const c = el('circle', { cx: x, cy: y, r: size, fill: color, opacity: String(0.15 + Math.random() * 0.4) });
    c.style.animation = `${kind === 'rain' ? 'fall' : 'drift'} ${2 + Math.random() * 3}s linear ${-Math.random() * 4}s infinite`;
    layers.weather.appendChild(c);
  }
}

function updateTint(game, zone) {
  const p = game.player;
  const minutes = (p.time ?? 360) % (24 * 60);
  const hour = minutes / 60;
  let op = 0, color = '#0a1020';
  if (hour < 5) { op = 0.46; color = '#060b16'; }
  else if (hour < 7) { op = 0.28 * (1 - (hour - 5) / 2); color = '#3a2a3a'; }
  else if (hour > 20) { op = Math.min(0.5, 0.1 + (hour - 20) * 0.14); color = '#08101e'; }
  else if (hour > 18) { op = 0.1 + (hour - 18) * 0.07; color = '#2a1a20'; }
  layers.tint.setAttribute('opacity', String(op));
  layers.tint.setAttribute('fill', color);
}

function spriteKeyFor(e, extra = {}) {
  if (e.kind === 'player') return 'player:' + (gameRef.player.role ?? 'castaway');
  if (e.kind === 'monster') return 'm:' + (e.sprite ?? e.species) + ':' + (e.tier ?? 'normal') + ':' + extra.v;
  if (e.kind === 'npc') return 'npc:' + (e.def?.id ?? e.id);
  if (e.kind === 'loot') return 'loot:' + (e.item?.rarity ?? 'common') + ':' + (e.item?.icon ?? '◆');
  if (e.kind === 'pet') return 'pet:' + (e.sprite ?? e.species);
  if (e.kind === 'turret') return 'turret';
  if (e.kind === 'prop') return 'prop:' + (e.sprite ?? e.kind) + ':' + (extra.tone ?? 0);
  return e.kind;
}

function spriteFor(e, extra = {}) {
  if (e.kind === 'player') return spriteSVG('player', { role: gameRef.player.role });
  if (e.kind === 'monster' || e.kind === 'pet') return spriteSVG(e.sprite ?? e.species, { species: e.sprite ?? e.species, size: e.kind === 'pet' ? Math.min(1.2, e.size ?? 1) : 1 });
  if (e.kind === 'npc') return spriteSVG('npc', { look: e.sprite });
  if (e.kind === 'loot') return spriteSVG('loot', { rarity: e.item?.rarity, icon: e.item?.icon });
  if (e.kind === 'turret') return spriteSVG('turret');
  if (e.kind === 'prop') return spriteSVG(e.sprite ?? e.kind, { v: extra.v, tone: extra.tone });
  return '';
}

// Monsters are modelled at true size, but a 35 cm rat is four pixels on a
// phone. Boost the small ones on screen only; collision stays honest.
function displayScale(ent) {
  if (!ent) return 1;
  const size = ent.size ?? 1;
  return clamp(0.9 / size, 1, 1.7);
}

function drawWorld(game, cam) {
  const p = game.player;
  const list = [];
  const now = game.now;

  const props = game.world.state.props;
  const maxD = game.view === 'iso' ? 52 : 46;
  for (let i = 0; i < props.length; i++) {
    const pr0 = props[i];
    const dx = pr0.x - p.x, dy = pr0.y - p.y;
    if (Math.hypot(dx, dy) > maxD) continue;
    list.push({
      id: 'prop' + i, kind: 'prop', x: pr0.x, y: pr0.y, s: pr0.s, sprite: pr0.kind,
      rot: pr0.rot, tone: pr0.tone, v: (pr0.tone ?? 0) / 4 + hash01(i + ':' + pr0.x) * 0.2,
    });
  }
  for (const n of game.world.state.nodes) {
    if (n.used) continue;
    if (Math.hypot(n.x - p.x, n.y - p.y) > maxD) continue;
    list.push({ id: 'node' + n.id, kind: 'prop', x: n.x, y: n.y, s: n.kind === 'fish' ? 0.9 : 0.8, sprite: n.kind === 'fish' ? 'puddle' : n.kind === 'herb' ? 'fern' : 'scrap', tone: 0, v: 0.5 });
  }
  for (const e of game.entities) {
    if (e.kind === 'monster' && e.hp <= 0) continue;
    if (e.kind === 'monster') {
      if (Math.hypot(e.x - p.x, e.y - p.y) > maxD + 10) continue;
      list.push({ id: e.id, kind: 'monster', x: e.x, y: e.y, s: 1, sprite: e.species, ent: e, facing: e.facing, v: hash01(e.id ?? e.species) });
    } else if (e.kind === 'pet') {
      list.push({ id: e.id, kind: 'pet', x: e.x, y: e.y, s: 1, sprite: e.species, ent: e, facing: e.facing, v: hash01(e.id ?? 'pet') });
    } else if (e.kind === 'npc') {
      if (Math.hypot(e.x - p.x, e.y - p.y) > maxD) continue;
      list.push({ id: e.id, kind: 'npc', x: e.x, y: e.y, s: 1, sprite: e.sprite, ent: e, facing: e.facing, v: 0 });
    } else if (e.kind === 'loot') {
      list.push({ id: e.id, kind: 'loot', x: e.x, y: e.y, s: 1, sprite: 'loot', ent: e, v: 0 });
    } else if (e.kind === 'turret') {
      list.push({ id: e.id, kind: 'turret', x: e.x, y: e.y, s: 1, sprite: 'turret', ent: e, v: 0 });
    }
  }
  list.push({ id: 'player', kind: 'player', x: p.x, y: p.y, s: 1, sprite: 'player', ent: p, facing: p.facing, v: 0 });

  for (const pr of game.projectiles) {
    list.push({ id: 'proj' + Math.round(pr.x * 10) + '_' + Math.round(pr.y * 10), kind: 'proj', x: pr.x, y: pr.y, s: 1, sprite: 'proj', v: 0 });
  }

  const draw = [];
  for (const it of list) {
    const pr = project({ x: it.x, y: it.y, z: 0 }, cam);
    if (!pr) continue;
    // in perspective, anything between the lens and the player would smear
    // across the screen at absurd scale; the third-person camera sits 10 m back
    const nearCut = game.view === 'first' ? 0.9 : 6;
    if (game.view !== 'iso' && pr.depth < nearCut) continue;
    if (!onScreen(pr, 300, cam)) continue;
    it.pr = pr;
    it.depth = game.view === 'iso' ? it.x + it.y : -pr.depth;
    draw.push(it);
  }
  draw.sort((a, b) => a.depth - b.depth);

  const orderSig = draw.map(d => d.id).join('|');
  const reorder = orderSig !== lastSort;
  lastSort = orderSig;

  const world = layers.world;
  const keep = new Set();
  pickables = [];

  for (const it of draw) {
    keep.add(it.id);
    let node = nodes.get(it.id);
    if (!node) {
      const g = el('g');
      node = { el: g, key: '', spriteEl: null };
      nodes.set(it.id, node);
      world.appendChild(g);
    }
    const g = node.el;
    const pr = it.pr;
    const bob = it.kind === 'loot' ? Math.sin(now * 3 + it.x) * 0.06 : 0;
    let flip = 1;
    if (it.facing != null) {
      const fx = Math.sin(it.facing), fy = Math.cos(it.facing);
      let sx;
      if (game.view === 'iso') sx = fx - fy;
      else sx = fx * Math.cos(cam.yaw) - fy * Math.sin(cam.yaw);
      flip = sx < -0.05 ? -1 : 1;
    }
    const scale = pr.s * (it.kind === 'prop' ? (it.s ?? 1) : it.kind === 'monster' ? displayScale(it.ent) : 1);
    const moving = it.kind === 'player' && game.player.moving ? Math.sin(now * 11) * 0.05 : 0;
    const lift = (it.kind === 'monster' && it.ent?.flying ? 0.5 : 0) + bob;
    g.setAttribute('transform', `translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)}) scale(${(flip * scale).toFixed(2)} ${scale.toFixed(2)}) translate(0 ${(-lift + moving).toFixed(3)})`);
    g.setAttribute('opacity', it.kind === 'loot' ? '.95' : '1');
    if (it.kind === 'proj') {
      if (node.key !== 'proj') {
        g.innerHTML = `<circle cx="0" cy="0" r=".1" fill="#ffe8a8"/><circle cx="0" cy="0" r=".3" fill="#ffd27a" opacity=".25"/>`;
        node.key = 'proj';
      }
    } else {
      const key = spriteKeyFor(it.ent ?? { kind: it.kind, sprite: it.sprite }, it);
      if (node.key !== key) {
        g.innerHTML = spriteFor(it.ent ?? it, it);
        node.key = key;
      }
    }
    if (it.kind === 'monster' || it.kind === 'npc' || it.kind === 'loot' || it.kind === 'pet') {
      pickables.push({ ent: it.ent, x: pr.x, y: pr.y - (it.kind === 'monster' ? 0.9 * scale : 0.3 * scale), s: scale });
    }
    if (it.kind === 'monster' && it.ent) {
      const top = spriteTop(it.ent.sprite ?? it.ent.species);
      if (it.ent.tier !== 'normal' || it.ent.hp < it.ent.hpMax) {
        const barW = 1.1, frac = Math.max(0, it.ent.hp / it.ent.hpMax);
        const col = it.ent.tier === 'normal' ? '#c4552f' : it.ent.tier === 'elite' ? '#5aa9ff' : '#e0892a';
        if (node.bar == null) {
          node.bar = document.createElementNS(NS, 'g');
          node.bar.innerHTML = `<rect x="${-barW / 2}" y="${-top}" width="${barW}" height=".14" fill="#0a0f12" opacity=".72"/><rect class="hp" x="${-barW / 2}" y="${-top}" width="${barW}" height=".14" fill="${col}"/>`;
          g.appendChild(node.bar);
        }
        node.bar.querySelector('.hp')?.setAttribute('width', String(barW * frac));
        node.bar.setAttribute('visibility', 'visible');
      } else if (node.bar) node.bar.setAttribute('visibility', 'hidden');
    }
    if (reorder) world.appendChild(g);
  }
  for (const [id, node] of nodes) {
    if (!keep.has(id)) {
      node.el.remove();
      nodes.delete(id);
    }
  }

  drawEffects(game, cam);
}

// Floating beacons over POIs, gatherables and the current quest target.
function drawMarkers(game, cam) {
  const p = game.player;
  const zone = game.world.zone;
  const layer = layers.markers;
  const out = [];
  const labelFor = (po) => {
    const d = Math.hypot(po.x - p.x, po.y - p.y);
    return { po, d, pr: project({ x: po.x, y: po.y, z: 0 }, cam) };
  };
  for (const po of zone.pois) {
    const m = labelFor(po);
    if (!m.pr || m.d > 90 || !onScreen(m.pr, 260, cam)) continue;
    const h = clamp((po.kind === 'boss' ? 4.4 : 3.4) * m.pr.s, 34, 120);
    const glyph = GLYPH[po.kind] ?? '•';
    const col = po.kind === 'boss' ? '#e07a2a' : po.kind === 'gate' ? '#e8a33d' : '#7fe6d8';
    out.push(`<g transform="translate(${m.pr.x.toFixed(1)} ${m.pr.y.toFixed(1)})" class="poi-mark">
      <rect x="-.8" y="${(-h).toFixed(1)}" width="1.6" height="${h.toFixed(1)}" fill="${col}" opacity=".16"/>
      <g transform="translate(0 ${(-h).toFixed(1)})">
        <path d="M0 -7 L7 0 L0 7 L-7 0 Z" fill="${col}" stroke="#071012" stroke-width="1.2"/>
        <text y="3" text-anchor="middle" font-size="8" fill="#071012" font-family="monospace" font-weight="bold">${glyph}</text>
        ${m.d < 46 ? `<text y="-12" text-anchor="middle" font-size="10.5" fill="#f2fbfa" stroke="#071012" stroke-width="3" paint-order="stroke" font-family="ui-monospace,monospace">${esc(po.name)}</text>` : ''}
        ${m.d >= 2 ? `<text y="19" text-anchor="middle" font-size="8.5" fill="${col}" stroke="#071012" stroke-width="2.6" paint-order="stroke" font-family="ui-monospace,monospace">${Math.round(m.d)} m</text>` : ''}
      </g>
    </g>`);
  }
  // gatherable nodes within reach get a small pulse so materials are findable
  for (const n of game.world.state.nodes) {
    if (n.used) continue;
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d > 26) continue;
    const pr = project({ x: n.x, y: n.y, z: 0 }, cam);
    if (!pr) continue;
    const col = n.kind === 'herb' ? '#8fe08a' : n.kind === 'fish' ? '#7fd6ff' : '#e8a33d';
    out.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)})"><circle cx="0" cy="${(-1.1 * pr.s).toFixed(1)}" r="3" fill="${col}" opacity=".8"/><circle cx="0" cy="${(-1.1 * pr.s).toFixed(1)}" r="8" fill="${col}" opacity=".15"/></g>`);
  }
  // quest beacon
  const target = objectiveTarget(game);
  if (target) {
    const pr = project({ x: target.x, y: target.y, z: 0 }, cam);
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    if (pr && d > 1.5 && d < 140) {
      const h = clamp(4.6 * pr.s, 46, 160);
      out.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)})" class="quest-mark">
        <rect x="-1" y="${(-h).toFixed(1)}" width="2" height="${h.toFixed(1)}" fill="#ffd27a" opacity=".22"/>
        <g transform="translate(0 ${(-h).toFixed(1)})">
          <path d="M0 -10 L10 0 L0 10 L-10 0 Z" fill="#ffd27a" stroke="#20140a" stroke-width="1.4"/>
          <circle cx="0" cy="0" r="16" fill="#ffd27a" opacity=".16"/>
          <text y="4" text-anchor="middle" font-size="11" fill="#20140a" font-family="monospace" font-weight="bold">!</text>
          <text y="24" text-anchor="middle" font-size="9" fill="#ffe6b0" stroke="#20140a" stroke-width="2.6" paint-order="stroke" font-family="ui-monospace,monospace">${Math.round(d)} m</text>
        </g>
      </g>`);
    }
  }
  layer.innerHTML = out.join('');
}

function drawGroundFx(game, cam) {
  const p = game.player;
  const pr = project({ x: p.x, y: p.y, z: 0 }, cam);
  if (!pr) { layers.ground.innerHTML = ''; return; }
  const iso = game.view === 'iso';
  const rx = (iso ? 0.62 * pr.s * 1.2247 : 0.62 * pr.s);
  const ry = (iso ? 0.62 * pr.s * 0.7071 : 0.62 * pr.s * 0.34);
  layers.ground.innerHTML = `<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)})">
    <ellipse rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="#7fe6d8" stroke-width="1.6" opacity=".55" class="selring"/>
    <ellipse rx="${(rx * 0.72).toFixed(1)}" ry="${(ry * 0.72).toFixed(1)}" fill="#7fe6d8" opacity=".05"/>
  </g>`;
}

const FX_SVG = {
  slash: `<path d="M -.5 .1 Q 0 -.6 .55 -.1" stroke="#ffe8c8" stroke-width=".09" fill="none" stroke-linecap="round"/><path d="M -.3 .2 Q 0 -.3 .35 .05" stroke="#fff" stroke-width=".04" fill="none" opacity=".8"/>`,
  hit: `<circle r=".2" fill="#ffd9b0" opacity=".8"/><path d="M -.3 0 h .2 M .1 0 h .2 M 0 -.3 v .2 M 0 .1 v .2" stroke="#fff" stroke-width=".05"/>`,
  zap: `<path d="M -.2 -.5 L .1 -.1 L -.1 -.05 L .2 .4" stroke="#bfefff" stroke-width=".08" fill="none"/><circle r=".28" fill="#7fe6d8" opacity=".18"/>`,
  heal: `<circle r=".3" fill="#7fd06a" opacity=".18"/><path d="M -.16 0 h .32 M 0 -.16 v .32" stroke="#a8f0a0" stroke-width=".09"/>`,
  death: `<circle r=".5" fill="none" stroke="#c8372d" stroke-width=".06" opacity=".8"/><circle r=".25" fill="#c8372d" opacity=".25"/>`,
  level: `<circle r=".7" fill="none" stroke="#e8c14a" stroke-width=".05"/><circle r=".4" fill="#e8c14a" opacity=".15"/><path d="M 0 -.9 v -.2 M .64 -.64 l .14 -.14 M .9 0 h .2 M .64 .64 l .14 .14" stroke="#e8c14a" stroke-width=".05"/>`,
  gather: `<path d="M 0 0 l .1 -.2 M 0 0 l -.14 -.1 M 0 0 l .02 -.24" stroke="#a8f0a0" stroke-width=".05"/><circle r=".1" cy="-.15" fill="#a8f0a0" opacity=".5"/>`,
  cache: `<circle r=".5" fill="#5aa9ff" opacity=".15"/><circle r=".2" fill="none" stroke="#9fd0ff" stroke-width=".04"/>`,
  boss: `<circle r="1.2" fill="none" stroke="#c8372d" stroke-width=".08" opacity=".6"/><circle r=".6" fill="#c8372d" opacity=".12"/>`,
  alert: `<text y="-.2" font-size=".6" fill="#ffd27a" text-anchor="middle">!</text>`,
  dash: `<path d="M -.5 .2 Q 0 0 .5 -.2" stroke="#dff3f1" stroke-width=".06" fill="none" opacity=".6"/><path d="M -.4 .35 Q 0 .15 .4 -.05" stroke="#dff3f1" stroke-width=".03" fill="none" opacity=".35"/>`,
  shot: `<circle r=".09" fill="#ffe8a8"/><path d="M -.4 0 h .3" stroke="#ffe8a8" stroke-width=".03" opacity=".6"/>`,
  buff: `<circle r=".45" fill="none" stroke="#e8c14a" stroke-width=".05" opacity=".7"/><path d="M 0 -.55 v -.15 M .39 -.39 l .1 -.1 M .55 0 h .15 M .39 .39 l .1 .1" stroke="#e8c14a" stroke-width=".04"/>`,
  pickup: `<circle r=".25" fill="none" stroke="#c9d6da" stroke-width=".04"/><path d="M 0 -.1 l .06 -.12 l .06 .12" stroke="#eaf7f4" stroke-width=".04"/>`,
  tame: `<path d="M 0 -.2 q -.2 -.2 -.1 -.4 q .12 -.1 .22 0 q .1 -.1 .2 0 q .12 .2 -.1 .4" stroke="#ffb0c8" stroke-width=".05" fill="none"/>`,
};

function drawEffects(game, cam) {
  for (const e of game.effects) {
    if (e._el) continue;
    const pr = project({ x: e.x, y: e.y, z: 0.6 }, cam);
    if (!pr) continue;
    const g = el('g', { class: `fx fx-${e.kind}`, transform: `translate(${pr.x} ${pr.y}) scale(${Math.max(0.25, pr.s * 0.9)})` });
    g.innerHTML = `<g class="fxin">${FX_SVG[e.kind] ?? FX_SVG.hit}</g>`;
    layers.fx.appendChild(g);
    e._el = g;
    setTimeout(() => g.remove(), (e.life ?? 0.6) * 1000);
  }
  game.effects = game.effects.filter(e => game.now - (e.born ?? game.now) < (e.life ?? 0.6));
}

function drawFirstPerson(game, cam) {
  const first = game.view === 'first';
  layers.cross.style.display = first ? 'block' : 'none';
  if (!first) { layers.first.innerHTML = ''; return; }
  const p = game.player;
  const bob = Math.sin(game.now * 8) * (p.moving ? 6 : 1.5);
  layers.first.innerHTML = `<g transform="translate(${cam.w * 0.5 + 18} ${cam.h - 10 + bob})">
    <path d="M 0 0 L 26 -120 L 58 -132 L 52 -6 Z" fill="#2a3238"/>
    <path d="M 26 -120 L 58 -132 L 52 -6 L 38 -6 Z" fill="#1b2226"/>
    <circle cx="40" cy="-128" r="4" fill="#3fd1c0" opacity=".8"/>
  </g>
  <g transform="translate(${cam.w * 0.5} ${cam.h * 0.5})" opacity=".9">
    <circle r="12" fill="none" stroke="#dff3f1" stroke-width=".7" opacity=".35"/>
    <path d="M -18 0 h 8 M 10 0 h 8 M 0 -18 v 8 M 0 10 v 8" stroke="#dff3f1" stroke-width=".7" opacity=".4"/>
  </g>`;
}

export function pickAt(sx, sy) {
  let best = null, bd = 44;
  for (const p of pickables) {
    const d = Math.hypot(p.x - sx, p.y - sy);
    const pad = p.ent?.tier && p.ent.tier !== 'normal' ? 20 : 0;
    if (d < bd + pad) { bd = d; best = p.ent; }
  }
  return best;
}

export function screenToWorldGround(sx, sy, game) {
  const cam = game.cam;
  if (game.view === 'iso') {
    const k = ISO_K;
    const dx = (sx - cam.w / 2) / (k * 0.866);
    const dy = (sy - cam.h / 2) / (k * 0.5);
    const wx = (dx + dy) / 2, wy = (dy - dx) / 2;
    return { x: cam.x + wx, y: cam.y + wy };
  }
  const horizon = cam.h * (game.view === 'first' ? 0.44 : 0.40);
  const f = cam.fov * cam.zoom;
  const eye = cam.z + (game.view === 'first' ? cam.eye : cam.eye + cam.dist * cam.pitch);
  const depth = (eye * f) / Math.max(4, sy - horizon);
  const lateral = ((sx - cam.w / 2) * depth) / f;
  const fx = Math.sin(cam.yaw), fy = Math.cos(cam.yaw);
  const rx = Math.cos(cam.yaw), ry = -Math.sin(cam.yaw);
  const back = game.view === 'first' ? 0 : cam.dist;
  const cx = cam.x - fx * back, cy = cam.y - fy * back;
  return { x: cx + fx * depth + rx * lateral, y: cy + fy * depth + ry * lateral };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
