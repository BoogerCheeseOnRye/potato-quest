// Headless scene snapshot: no browser needed. Builds a real zone from the real
// world generator, projects it with the real camera + SVG sprites, writes an SVG
// and rasterises it with rsvg-convert so the layout can be eyeballed.
//
//   node tools/snapshot.mjs [zone] [iso|third|first] [out.png]
//        [--seed N] [--w 390] [--h 844] [--monsters N] [--boss] [--level N] [--no-quest]
//
// Mirrors src/render/scene.js: faceted ground, metric sprites, floating POI
// beacons, gatherable pips and the gold objective marker.
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { RNG } from '../src/core/rng.js';
import { makeCamera, project, onScreen, ISO_K } from '../src/core/geom.js';
import { World } from '../src/world/world.js';
import { createPlayer } from '../src/entities/player.js';
import { ZONE_BY_ID } from '../src/data/zones.js';
import { NAMED } from '../src/data/bestiary.js';
import { spriteSVG, poiSprite, spriteTop } from '../src/render/sprites.js';
import { makeSpawnGroup, makeNamedEncounter } from '../src/systems/spawn.js';
import { objectiveTarget } from '../src/systems/guidance.js';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const has = (name) => argv.includes('--' + name);
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));

const zoneId = positional[0] ?? 'wrack_shore';
const view = positional[1] ?? 'iso';
const out = resolve(positional[2] ?? `/tmp/potatoquest-${zoneId}-${view}.png`);
const seed = Number(flag('seed', 1234));
const W = Number(flag('w', 390));
const H = Number(flag('h', 844));
const monsterCount = Number(flag('monsters', 5));
const level = Number(flag('level', 1));

const zone = ZONE_BY_ID[zoneId];
if (!zone) {
  console.error(`unknown zone ${zoneId}\nzones: ${Object.keys(ZONE_BY_ID).join(', ')}`);
  process.exit(1);
}

// ---- a game-shaped object just big enough for the world generator ----
const game = {
  rng: new RNG(seed),
  worldSeed: seed,
  entities: [],
  projectiles: [],
  effects: [],
  now: 42,
  view,
  player: createPlayer('warden', 'Castaway', seed),
  activePetEntity: null,
  emit() {}, log() {}, fx() {}, onZoneEnter() {}, signalAvailable() {},
  nearestMonster() { return null; },
  removeEntity() {}, pickupLoot() {}, updateProjectiles() {},
};
game.player.level = level;
game.player.role = 'warden';
game.world = new World(game);
game.cam = makeCamera(view);
game.world.loadZone(zoneId, {});
const p = game.player;

// A live-looking objective so the gold beacon is in the snapshot too.
if (!has('no-quest')) {
  p.quests.active = ['m1_washup'];
  p.quests.progress.m1_washup = [1, 0];
}

// put a few monsters in front of the player so the snapshot shows combat-scale art
for (let i = 0; i < monsterCount; i++) {
  const a = (i / Math.max(1, monsterCount)) * Math.PI * 2 + 0.4;
  const d = 7 + (i % 3) * 3;
  const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
  if (game.world.blockedAt(x, y, 0.5)) continue;
  game.entities.push(...makeSpawnGroup(game, zone, x, y));
}
if (has('boss')) {
  const poi = zone.pois.find(x => x.kind === 'boss');
  const def = poi ? NAMED.find(n => n.id === poi.boss) : NAMED.find(n => n.zone === zoneId);
  if (def) {
    const m = makeNamedEncounter(game, def, p.x + 6, p.y + 6);
    game.entities.push(m);
  }
}
// face the camera somewhere with something to look at
p.facing = 0.6;

// ---- camera ----
const cam = game.cam;
cam.w = W; cam.h = H;
cam.x = p.x; cam.y = p.y; cam.z = 0.4;
cam.yaw = p.facing;
cam.zoom = 1;

// ---- drawing (same rules as src/render/scene.js, minus DOM pooling) ----
const k = ISO_K * cam.zoom;
const pal = zone.palette;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return '#' + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0');
};
const hash01 = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
};
const parts = [];

const ground = pal.ground ?? '#2a3136';
const g2 = pal.ground2 ?? shade(ground, 0.12);
const offX = ((-cam.x + cam.y) * k * 0.866) % 64;
const offY = ((-cam.x - cam.y) * k * 0.5) % 48;

parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
parts.push(`<defs>
  <radialGradient id="vign" cx="50%" cy="45%" r="70%"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="#000" stop-opacity=".6"/></radialGradient>
  <linearGradient id="skygrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(pal.sky ?? '#122027', -0.15)}"/><stop offset="0.7" stop-color="${pal.sky ?? '#122027'}"/><stop offset="1" stop-color="${shade(pal.sky ?? '#122027', 0.28)}"/></linearGradient>
  <linearGradient id="groundgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(ground, 0.18)}"/><stop offset="0.45" stop-color="${ground}"/><stop offset="1" stop-color="${shade(ground, -0.12)}"/></linearGradient>
  <pattern id="grit" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="translate(${offX.toFixed(1)} ${offY.toFixed(1)})">
    <circle cx="3" cy="4" r=".9" fill="#dfeeea" opacity=".09"/>
    <circle cx="13" cy="11" r=".7" fill="#dfeeea" opacity=".07"/>
    <circle cx="8" cy="18" r="1.1" fill="#000" opacity=".10"/>
    <circle cx="19" cy="3" r=".6" fill="#dfeeea" opacity=".06"/>
    <circle cx="17" cy="17" r=".8" fill="#000" opacity=".08"/>
  </pattern>
  <pattern id="facets" width="120" height="80" patternUnits="userSpaceOnUse" patternTransform="translate(${offX.toFixed(1)} ${offY.toFixed(1)})">
    <rect width="120" height="80" fill="${ground}"/>
    <polygon points="0,0 60,0 30,40" fill="${g2}" opacity=".18"/>
    <polygon points="60,0 120,0 90,40" fill="${pal.accent}" opacity=".05"/>
    <polygon points="0,0 30,40 0,80" fill="${g2}" opacity=".12"/>
    <polygon points="120,0 120,80 90,40" fill="${g2}" opacity=".15"/>
    <polygon points="30,40 90,40 60,80" fill="${pal.accent}" opacity=".04"/>
    <polygon points="60,80 90,40 120,80" fill="${shade(ground, -0.12)}" opacity=".16"/>
    <polygon points="0,80 30,40 60,80" fill="${g2}" opacity=".16"/>
  </pattern>
</defs>`);

if (view === 'iso') {
  parts.push(`<rect width="${W}" height="${H}" fill="url(#facets)"/>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#grit)"/>`);
  parts.push(`<g transform="translate(${(W / 2 + offX).toFixed(2)} ${(H / 2 + offY).toFixed(2)})">`);
  const wetSand = shade(pal.ground2 ?? pal.ground ?? '#2a3136', 0.2);
  for (const w of game.world.state.water) {
    const cx = (w.x - w.y) * k * 0.866, cy = (w.x + w.y) * k * 0.5;
    const rx = w.r * k * 1.2247, ry = w.r * k * 0.7071;
    parts.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * 1.16).toFixed(1)}" ry="${(ry * 1.16).toFixed(1)}" fill="${wetSand}" opacity=".32"/>`);
    parts.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${pal.water}" opacity=".72"/>`);
    parts.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * 0.86).toFixed(1)}" ry="${(ry * 0.84).toFixed(1)}" fill="${shade(pal.water, -0.18)}" opacity=".3"/>`);
    for (let i = 0; i < 3; i++) {
      const t = -0.34 + i * 0.34;
      parts.push(`<path d="M ${(cx - rx * 0.32).toFixed(1)} ${(cy + ry * t).toFixed(1)} q ${(rx * 0.32).toFixed(1)} ${(ry * 0.1).toFixed(1)} ${(rx * 0.64).toFixed(1)} 0" stroke="${shade(pal.water, 0.4)}" stroke-width="1" fill="none" opacity=".16"/>`);
    }
  }
  for (const patch of game.world.state.patches) {
    const cx = (patch.x - patch.y) * k * 0.866, cy = (patch.x + patch.y) * k * 0.5;
    const pts = (patch.pts ?? []).map(([px, py]) => `${((px - py) * k * 0.866).toFixed(1)},${((px + py) * k * 0.5).toFixed(1)}`).join(' ');
    const fill = patch.tone === 0 ? pal.ground2 : pal.accent;
    parts.push(`<polygon points="${pts}" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})" fill="${fill}" opacity="${Math.min(0.12, patch.a * 1.7).toFixed(2)}"/>`);
  }
  const gritCol = shade(pal.ground2 ?? pal.ground ?? '#2a3136', 0.28);
  const darkCol = shade(pal.ground ?? '#2a3136', -0.3);
  for (const gr of game.world.state.grit ?? []) {
    const cx = (gr.x - gr.y) * k * 0.866, cy = (gr.x + gr.y) * k * 0.5;
    const s = gr.s ?? 1;
    if (gr.kind === 'pebble') {
      parts.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(0.16 * k * s).toFixed(1)}" ry="${(0.1 * k * s).toFixed(1)}" fill="${gritCol}" opacity=".28"/>`);
      parts.push(`<ellipse cx="${(cx + 0.4).toFixed(1)}" cy="${(cy - 0.3).toFixed(1)}" rx="${(0.08 * k * s).toFixed(1)}" ry="${(0.05 * k * s).toFixed(1)}" fill="${darkCol}" opacity=".18"/>`);
    } else if (gr.kind === 'tuft') {
      const h = 0.34 * k * s;
      parts.push(`<path d="M ${cx.toFixed(1)} ${cy.toFixed(1)} l ${(-0.12 * k * s).toFixed(1)} ${(-h).toFixed(1)} M ${cx.toFixed(1)} ${cy.toFixed(1)} l ${(0.1 * k * s).toFixed(1)} ${(-h * 1.15).toFixed(1)} M ${cx.toFixed(1)} ${cy.toFixed(1)} l ${(0.24 * k * s).toFixed(1)} ${(-h * 0.7).toFixed(1)}" stroke="${gritCol}" stroke-width="1" fill="none" opacity=".22"/>`);
    } else {
      const r = 0.4 * k * s, a = gr.rot ?? 0;
      parts.push(`<path d="M ${cx.toFixed(1)} ${cy.toFixed(1)} l ${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r * 0.55).toFixed(1)} l ${(Math.cos(a + 0.6) * r * 0.6).toFixed(1)} ${(Math.sin(a + 0.6) * r * 0.35).toFixed(1)}" stroke="${darkCol}" stroke-width=".8" fill="none" opacity=".16"/>`);
    }
  }
  for (const poi of zone.pois) {
    const cx = (poi.x - poi.y) * k * 0.866, cy = (poi.x + poi.y) * k * 0.5;
    parts.push(`<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${k})" opacity=".95">${poiSprite(poi.kind, poi)}</g>`);
  }
  parts.push('</g>');
} else {
  const horizon = H * (view === 'first' ? 0.44 : 0.40);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#skygrad)"/>`);
  // sun / moon
  const mins = (p.time ?? 360) % 1440;
  const day = mins > 360 && mins < 1140;
  const sx = W * (0.18 + 0.64 * ((mins / 1440 + 0.25) % 1));
  parts.push(`<circle cx="${sx.toFixed(1)}" cy="${(horizon * (day ? 0.34 : 0.24)).toFixed(1)}" r="${day ? 26 : 18}" fill="${day ? '#ffe6a8' : '#cfe0f0'}" opacity="${day ? '.5' : '.35'}"/>`);
  // ridges
  const ridge = (yBase, amp, color, seedv, op) => {
    let d = `M -40 ${(horizon + 4).toFixed(1)} L -40 ${yBase.toFixed(1)}`;
    for (let x = -40; x <= W + 40; x += 40) {
      const y = yBase - Math.sin((x * 0.011) + seedv) * amp - Math.sin((x * 0.031) + seedv * 2.7) * amp * 0.4;
      d += ` L ${x} ${y.toFixed(1)}`;
    }
    d += ` L ${W + 40} ${(horizon + 4).toFixed(1)} Z`;
    parts.push(`<path d="${d}" fill="${color}" opacity="${op}"/>`);
  };
  ridge(horizon - 26, 22, shade(pal.fog ?? pal.sky ?? '#0d161a', 0.18), 1.3, '.85');
  ridge(horizon - 8, 16, shade(pal.fog ?? pal.sky ?? '#0d161a', 0.34), 3.1, '.8');
  ridge(horizon + 2, 9, pal.ground2 ?? '#39434a', 5.7, '.9');
  parts.push(`<rect x="0" y="${horizon.toFixed(1)}" width="${W}" height="${(H - horizon).toFixed(1)}" fill="url(#groundgrad)"/>`);
  parts.push(`<rect x="0" y="${(horizon - 34).toFixed(1)}" width="${W}" height="68" fill="${shade(pal.sky ?? '#122027', 0.4)}" opacity=".12"/>`);
  parts.push(`<rect x="0" y="${(horizon - 1).toFixed(1)}" width="${W}" height="1.5" fill="${pal.accent}" opacity=".3"/>`);
  for (const w of game.world.state.water) {
    const pr = project({ x: w.x, y: w.y, z: 0 }, cam);
    if (!pr || !onScreen(pr, 300, cam)) continue;
    parts.push(`<ellipse cx="${pr.x.toFixed(1)}" cy="${pr.y.toFixed(1)}" rx="${(w.r * pr.s).toFixed(1)}" ry="${(w.r * pr.s * 0.32).toFixed(1)}" fill="${pal.water}" opacity=".55"/>`);
  }
  for (const patch of game.world.state.patches) {
    if (!patch.pts?.length) continue;
    let poly = '', any = false;
    for (const [px, py] of patch.pts) {
      const pr = project({ x: patch.x + px, y: patch.y + py, z: 0 }, cam);
      if (!pr) continue;
      if (pr.y > -60 && pr.y < H + 60) any = true;
      poly += `${pr.x.toFixed(1)},${pr.y.toFixed(1)} `;
    }
    if (!any) continue;
    parts.push(`<polygon points="${poly.trim()}" fill="${patch.tone === 0 ? pal.ground2 : pal.accent}" opacity="${Math.min(0.1, patch.a * 1.5).toFixed(2)}"/>`);
  }
  const gritCol2 = shade(pal.ground2 ?? pal.ground ?? '#2a3136', 0.28);
  for (const gr of game.world.state.grit ?? []) {
    if (Math.hypot(gr.x - p.x, gr.y - p.y) > 26) continue;
    const pr = project({ x: gr.x, y: gr.y, z: 0 }, cam);
    if (!pr || pr.y < 0 || pr.y > H) continue;
    const s = gr.s ?? 1;
    parts.push(`<ellipse cx="${pr.x.toFixed(1)}" cy="${pr.y.toFixed(1)}" rx="${(0.16 * pr.s * s).toFixed(1)}" ry="${(0.1 * pr.s * s).toFixed(1)}" fill="${gritCol2}" opacity=".24"/>`);
  }
  for (const poi of zone.pois) {
    const pr = project({ x: poi.x, y: poi.y, z: 0 }, cam);
    if (!pr || !onScreen(pr, 220, cam)) continue;
    parts.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)}) scale(${pr.s.toFixed(2)})" opacity=".95">${poiSprite(poi.kind, poi)}</g>`);
  }
}

// ---- depth-sorted billboards ----
const maxD = view === 'iso' ? 52 : 46;
const list = [];
game.world.state.props.forEach((pr0, i) => {
  if (Math.hypot(pr0.x - p.x, pr0.y - p.y) > maxD) return;
  list.push({
    kind: 'prop', x: pr0.x, y: pr0.y, s: pr0.s, sprite: pr0.kind, tone: pr0.tone,
    v: (pr0.tone ?? 0) / 4 + hash01(i + ':' + pr0.x) * 0.2,
  });
});
for (const n of game.world.state.nodes) {
  if (n.used) continue;
  if (Math.hypot(n.x - p.x, n.y - p.y) > maxD) continue;
  list.push({ kind: 'prop', x: n.x, y: n.y, s: n.kind === 'fish' ? 0.9 : 0.8, sprite: n.kind === 'fish' ? 'puddle' : n.kind === 'herb' ? 'fern' : 'scrap', tone: 0, v: 0.5 });
}
for (const e of game.entities) {
  if (e.kind === 'monster' && e.hp <= 0) continue;
  if (e.kind === 'npc' || e.kind === 'monster' || e.kind === 'loot' || e.kind === 'pet' || e.kind === 'turret') {
    if (Math.hypot(e.x - p.x, e.y - p.y) > maxD + (e.kind === 'monster' ? 10 : 0)) continue;
    list.push({ kind: e.kind, x: e.x, y: e.y, s: 1, ent: e, facing: e.facing, v: hash01(e.id ?? e.species ?? e.kind) });
  }
}
list.push({ kind: 'player', x: p.x, y: p.y, s: 1, ent: p, facing: p.facing, v: 0 });

const draw = [];
for (const it of list) {
  const pr = project({ x: it.x, y: it.y, z: 0 }, cam);
  if (!pr || !onScreen(pr, 300, cam)) continue;
  if (view !== 'iso' && pr.depth < (view === 'first' ? 0.9 : 6)) continue;
  it.pr = pr;
  it.depth = view === 'iso' ? it.x + it.y : -pr.depth;
  draw.push(it);
}
draw.sort((a, b) => a.depth - b.depth);

// player selection ring (under everything, like l-ground)
{
  const pr = project({ x: p.x, y: p.y, z: 0 }, cam);
  if (pr) {
    const iso = view === 'iso';
    const rx = iso ? 0.62 * pr.s * 1.2247 : 0.62 * pr.s;
    const ry = iso ? 0.62 * pr.s * 0.7071 : 0.62 * pr.s * 0.34;
    parts.push(`<ellipse cx="${pr.x.toFixed(1)}" cy="${pr.y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="#7fe6d8" stroke-width="1.6" opacity=".55"/>`);
  }
}

for (const it of draw) {
  const pr = it.pr;
  let flip = 1;
  if (it.facing != null) {
    const fx = Math.sin(it.facing), fy = Math.cos(it.facing);
    const sx = view === 'iso' ? fx - fy : fx * Math.cos(cam.yaw) - fy * Math.sin(cam.yaw);
    flip = sx < -0.05 ? -1 : 1;
  }
  const mScale = it.kind === 'monster' && it.ent ? Math.min(1.7, Math.max(1, 0.9 / (it.ent.size ?? 1))) : 1;
  const scale = pr.s * (it.kind === 'prop' ? (it.s ?? 1) : mScale);
  let body = '';
  if (it.kind === 'player') body = spriteSVG('player', { role: p.role });
  else if (it.kind === 'monster' || it.kind === 'pet') body = spriteSVG(it.ent.sprite ?? it.ent.species, { species: it.ent.sprite ?? it.ent.species, v: it.v });
  else if (it.kind === 'npc') body = spriteSVG('npc', { look: it.ent.sprite });
  else if (it.kind === 'loot') body = spriteSVG('loot', { rarity: it.ent.item?.rarity, icon: it.ent.item?.icon });
  else if (it.kind === 'turret') body = spriteSVG('turret');
  else body = spriteSVG(it.sprite, { v: it.v, tone: it.tone });
  parts.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)}) scale(${(flip * scale).toFixed(2)} ${scale.toFixed(2)})">${body}</g>`);
  if (it.kind === 'monster' && it.ent && (it.ent.tier !== 'normal' || it.ent.hp < it.ent.hpMax)) {
    const frac = Math.max(0, it.ent.hp / it.ent.hpMax);
    const col = it.ent.tier === 'normal' ? '#c4552f' : it.ent.tier === 'elite' ? '#5aa9ff' : '#e0892a';
    const top = spriteTop(it.ent.sprite ?? it.ent.species);
    parts.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)}) scale(${scale.toFixed(2)})">
      <rect x="-0.55" y="${(-top).toFixed(2)}" width="1.1" height="0.14" fill="#0a0f12" opacity=".72"/>
      <rect x="-0.55" y="${(-top).toFixed(2)}" width="${(1.1 * frac).toFixed(2)}" height="0.14" fill="${col}"/>
    </g>`);
  }
}

// ---- floating markers: POI beacons, node pips, objective ----
const GLYPH = { waystone: '✦', rift: '◈', gate: '⇧', boss: '☠', cache: '▣', camp: '⌂', ruin: '▤', farm: '♣', board: '≡', vendor: '¤', trainer: '✚', npc: '•' };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
for (const po of zone.pois) {
  const pr = project({ x: po.x, y: po.y, z: 0 }, cam);
  const d = Math.hypot(po.x - p.x, po.y - p.y);
  if (!pr || d > 90 || !onScreen(pr, 260, cam)) continue;
  const h = clamp((po.kind === 'boss' ? 4.4 : 3.4) * pr.s, 34, 120);
  const glyph = GLYPH[po.kind] ?? '•';
  const col = po.kind === 'boss' ? '#e07a2a' : po.kind === 'gate' ? '#e8a33d' : '#7fe6d8';
  parts.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)})">
    <rect x="-.8" y="${(-h).toFixed(1)}" width="1.6" height="${h.toFixed(1)}" fill="${col}" opacity=".16"/>
    <g transform="translate(0 ${(-h).toFixed(1)})">
      <path d="M0 -7 L7 0 L0 7 L-7 0 Z" fill="${col}" stroke="#071012" stroke-width="1.2"/>
      <text y="3" text-anchor="middle" font-size="8" fill="#071012" font-family="monospace" font-weight="bold">${glyph}</text>
      ${d < 46 ? `<text y="-12" text-anchor="middle" font-size="10.5" fill="#f2fbfa" stroke="#071012" stroke-width="3" paint-order="stroke" font-family="ui-monospace,monospace">${esc(po.name)}</text>` : ''}
      <text y="19" text-anchor="middle" font-size="8.5" fill="${col}" stroke="#071012" stroke-width="2.6" paint-order="stroke" font-family="ui-monospace,monospace">${Math.round(d)} m</text>
    </g>
  </g>`);
}
for (const n of game.world.state.nodes) {
  if (n.used) continue;
  const d = Math.hypot(n.x - p.x, n.y - p.y);
  if (d > 26) continue;
  const pr = project({ x: n.x, y: n.y, z: 0 }, cam);
  if (!pr) continue;
  const col = n.kind === 'herb' ? '#8fe08a' : n.kind === 'fish' ? '#7fd6ff' : '#e8a33d';
  parts.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)})"><circle cx="0" cy="${(-1.1 * pr.s).toFixed(1)}" r="3" fill="${col}" opacity=".8"/><circle cx="0" cy="${(-1.1 * pr.s).toFixed(1)}" r="8" fill="${col}" opacity=".15"/></g>`);
}
const target = objectiveTarget(game);
if (target) {
  const pr = project({ x: target.x, y: target.y, z: 0 }, cam);
  const d = Math.hypot(target.x - p.x, target.y - p.y);
  if (pr && d > 1.5 && d < 140) {
    const h = clamp(4.6 * pr.s, 46, 160);
    parts.push(`<g transform="translate(${pr.x.toFixed(1)} ${pr.y.toFixed(1)})">
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

// weather particles (static frame)
const particle = { rain: 'rain', ashfall: 'ash', spores: 'spore', static: 'spark' }[game.world.state.weather];
if (particle) {
  const wrng = new RNG(seed + ':weather');
  const n = { rain: 60, ash: 45, spore: 35, spark: 26 }[particle];
  for (let i = 0; i < n; i++) {
    const x = wrng.float(0, W), y = wrng.float(0, H * 0.85);
    const r = particle === 'rain' ? 1 : particle === 'spore' ? 2.2 : 1.6;
    const col = particle === 'rain' ? '#8fb8c0' : particle === 'ash' ? '#c9c3b8' : particle === 'spore' ? '#a8e08a' : '#9fd8ff';
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${col}" opacity="${wrng.float(0.15, 0.5).toFixed(2)}"/>`);
  }
}

parts.push(`<rect width="${W}" height="${H}" fill="url(#vign)"/>`);
parts.push('</svg>');

await mkdir(dirname(out), { recursive: true });
const svgPath = out.replace(/\.png$/i, '.svg');
const svg = parts.join('\n');
await writeFile(svgPath, svg);
try {
  execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '-o', out, svgPath], { stdio: 'inherit' });
  console.log(`wrote ${out}`);
} catch (e) {
  console.error('rsvg-convert failed; SVG left at', svgPath, e.message);
  process.exitCode = 1;
}
console.log(`zone=${zoneId} view=${view} seed=${seed} monsters=${game.entities.filter(e => e.kind === 'monster').length}`);
