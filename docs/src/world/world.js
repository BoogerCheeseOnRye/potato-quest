// World: seeded zone generation, props, resources, POIs, spawn director,
// travel, rifts, day/night and weather. The map is not covered in monsters;
// density is per-zone and most of the world is empty ground with history on it.
import { RNG } from '../core/rng.js';
import { ZONE_BY_ID, zoneMood, WEATHER } from '../data/zones.js';
import { NPCS } from '../data/npcs.js';
import { NAMED } from '../data/bestiary.js';
import { makeSpawnGroup, makeNamedEncounter, spawnTable } from '../systems/spawn.js';
import { updateMonster, tickEffects } from '../systems/combat.js';
import { addItem } from '../systems/inventory.js';
import { trainProf } from '../systems/progression.js';
import { emit } from '../systems/quests.js';
import { ensurePlots, plotState } from '../systems/farming.js';
import { clamp, moveWithCollision } from '../core/geom.js';
import { rollLoot, makeUnique } from '../data/items.js';

const SOLID = new Set(['rock', 'wreck', 'hull', 'tree', 'tower', 'pylon', 'server', 'building', 'spire', 'monolith', 'crate', 'log', 'well', 'pipe', 'stump', 'cable', 'glass', 'conduit']);
// Collision radius in metres at s=1. Trees block at the trunk, not the canopy;
// a wreck blocks along its whole hull. Keeps a person able to walk between
// trunks and under branches instead of bouncing off invisible domes.
const SOLID_R = {
  tree: 0.4, rock: 0.85, wreck: 2.6, hull: 2.2, tower: 1.1, pylon: 0.5, server: 0.5,
  building: 3.4, spire: 1.2, monolith: 0.6, crate: 0.45, log: 0.7, well: 0.9,
  pipe: 0.4, stump: 0.4, cable: 0.3, glass: 0.4, conduit: 0.4,
};
// Multipliers on the metric size drawn in render/sprites.js. A tree sprite is
// 8 m tall, so 0.7–1.2 gives 5.6–9.6 m trees; a building sprite is 6 m to the
// ridge, so 0.9–1.1 gives real houses next to a 1.8 m person.
const SIZES = {
  rock: [0.5, 1.2], wreck: [0.8, 1.3], hull: [0.8, 1.2], tree: [0.7, 1.2], tower: [0.8, 1.2],
  pylon: [0.8, 1.2], server: [0.8, 1.1], building: [0.9, 1.1], spire: [0.8, 1.2], monolith: [0.8, 1.3],
  crate: [0.8, 1.2], log: [0.8, 1.2], well: [0.8, 1.1], pipe: [0.8, 1.2], stump: [0.8, 1.2],
  cable: [0.8, 1.2], glass: [0.8, 1.2], conduit: [0.8, 1.2], driftwood: [0.8, 1.2], kelp: [0.8, 1.2],
  puddle: [0.8, 1.2], shell: [0.8, 1.2], pool: [0.8, 1.2], grass: [0.8, 1.2], mast: [0.8, 1.2],
  stone: [0.8, 1.2], mushroom: [0.8, 1.2], fern: [0.8, 1.2], glow: [0.8, 1.2], bone: [0.8, 1.2],
  ashpile: [0.8, 1.2], lamp: [0.8, 1.2], cart: [0.8, 1.2], banner: [0.8, 1.2],
  potato_plant: [0.8, 1.3], potato_pile: [0.8, 1.2], potato_sack: [0.8, 1.1],
  scarecrow: [0.9, 1.1], potato_crate: [0.8, 1.1],
};

export class World {
  constructor(game) {
    this.game = game;
    this.zone = null;
    this.state = null;
    this.rift = null;
  }

  get player() { return this.game.player; }

  loadZone(zoneId, opts = {}) {
    const game = this.game;
    const zone = ZONE_BY_ID[zoneId];
    if (!zone) throw new Error('no zone ' + zoneId);
    const fromZone = this.zone?.id;
    this.zone = zone;
    this.rift = null;
    this.state = this.generate(zone, opts.seed ?? game.worldSeed);
    this.state.weather = this.pickWeather(zone);
    game.entities = game.entities.filter(e => e.kind === 'pet' || e.kind === 'turret');
    // npcs
    for (const poi of zone.pois) {
      if (poi.npc && NPCS[poi.npc]) {
        const def = NPCS[poi.npc];
        game.entities.push({ kind: 'npc', id: def.id, name: def.name, title: def.title, x: poi.x, y: poi.y, z: 0, radius: 0.4, facing: Math.PI, sprite: def.sprite, def, home: { x: poi.x, y: poi.y } });
      }
    }
    const p = this.player;
    p.position.zone = zoneId;
    if (opts.x == null || opts.y == null) {
      const sp = this.spawnPoint(zone, fromZone);
      opts = { ...opts, x: sp.x, y: sp.y };
    }
    if (opts.x != null) p.position.x = opts.x;
    if (opts.y != null) p.position.y = opts.y;
    p.x = p.position.x; p.y = p.position.y;
    // never start inside a rock
    for (let i = 0; i < 24 && this.blockedAt(p.x, p.y, 0.5); i++) {
      const a = i * 0.9;
      p.x = clamp(p.position.x + Math.cos(a) * (1 + i * 0.4), 5, zone.size - 5);
      p.y = clamp(p.position.y + Math.sin(a) * (1 + i * 0.4), 5, zone.size - 5);
    }
    p.position.x = p.x; p.position.y = p.y;
    game.emit('reach', zoneId, 1);
    game.onZoneEnter?.(zone);
    ensurePlots(p, zoneId);
    this.spawnAccum = 0;
    this.bossSpawned = {};
    this.poiCooldowns = {};
    this.checkSignal();
    return this.state;
  }

  // Where you arrive: the zone's entry, else just inside the gate that leads back
  // to where you came from, else the middle — nudged off any POI so you never
  // spawn standing inside the waystone.
  spawnPoint(zone, fromZone) {
    let pt;
    if (zone.entry) pt = { ...zone.entry };
    else {
      const mid = zone.size / 2;
      const back = zone.pois.find(p => p.kind === 'gate' && p.toZone === fromZone);
      if (back) {
        const dx = mid - back.x, dy = mid - back.y;
        const d = Math.hypot(dx, dy) || 1;
        pt = { x: back.x + (dx / d) * 8, y: back.y + (dy / d) * 8 };
      } else pt = { x: mid, y: mid };
    }
    for (let i = 0; i < 8; i++) {
      const near = zone.pois.find(p => Math.hypot(p.x - pt.x, p.y - pt.y) < (p.r ?? 3) + 3);
      if (!near) break;
      const a = Math.atan2(pt.y - near.y, pt.x - near.x) || 0.7;
      pt = { x: pt.x + Math.cos(a) * 5, y: pt.y + Math.sin(a) * 5 };
    }
    return pt;
  }

  checkSignal() {
    const game = this.game;
    if (this.zone?.id === 'dead_grid' || this.zone?.id === 'relay_spire') {
      game.signalAvailable?.();
    }
  }

  generate(zone, worldSeed) {
    const rng = new RNG(worldSeed + ':' + zone.id);
    const size = zone.size;
    const state = {
      props: [], obstacles: [], patches: [], grit: [], nodes: [], water: [], pois: zone.pois.map(p => ({ ...p })),
      discovered: false, weather: 'clear', cacheOpened: {}, nodeTimer: {}, ground: zone.ground,
    };
    const nearPoi = (x, y, pad = 7) => zone.pois.some(p => Math.hypot(p.x - x, p.y - y) < (p.r ?? 3) + pad);

    // spatial hash so collision checks do not scan the whole zone
    const CELL = 8;
    state.obstacleCell = CELL;
    state.obstacleGrid = new Map();
    const addObstacle = (o) => {
      state.obstacles.push(o);
      const x0 = Math.floor((o.x - o.r - 1) / CELL), x1 = Math.floor((o.x + o.r + 1) / CELL);
      const y0 = Math.floor((o.y - o.r - 1) / CELL), y1 = Math.floor((o.y + o.r + 1) / CELL);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const key = gx + ':' + gy;
          let list = state.obstacleGrid.get(key);
          if (!list) { list = []; state.obstacleGrid.set(key, list); }
          list.push(o);
        }
      }
    };

    // water pools / sea edge
    const poolCount = Math.round(zone.water * 26);
    for (let i = 0; i < poolCount; i++) {
      const x = rng.float(8, size - 8), y = rng.float(8, size - 8);
      const r = rng.float(4, 13);
      if (nearPoi(x, y, 12)) continue;
      state.water.push({ x, y, r });
      addObstacle({ type: 'circle', x, y, r });
    }
    const inWater = (x, y, pad = 0) => state.water.some(w => Math.hypot(w.x - x, w.y - y) < w.r + pad);

    // ground patches for the renderer. Organic polygons, not circles, and a
    // scatter of small grit so the ground never looks like wallpaper.
    for (let i = 0; i < 520; i++) {
      const r = rng.float(0.8, 5.5);
      const n = rng.int(5, 7);
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rng.float(-0.25, 0.25);
        const rr = r * rng.float(0.62, 1.15);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.72]);
      }
      const px = rng.float(0, size), py = rng.float(0, size);
      if (inWater(px, py, 1)) continue;
      state.patches.push({
        x: px, y: py, r, pts,
        tone: rng.int(0, 2), a: rng.float(0.05, 0.15),
      });
    }
    // grit: pebbles, tufts and cracks at true-ish sizes (0.1–0.5 m) for scale cues
    const gritKinds = zone.ground === 'forest' || zone.ground === 'moss' ? ['tuft', 'tuft', 'pebble']
      : zone.ground === 'ash' ? ['pebble', 'crack', 'pebble']
      : zone.ground === 'town' ? ['pebble', 'crack']
      : zone.ground === 'grid' || zone.ground === 'spire' ? ['pebble', 'crack']
      : ['pebble', 'tuft', 'crack'];
    for (let i = 0; i < 900; i++) {
      const x = rng.float(0, size), y = rng.float(0, size);
      if (inWater(x, y, 0.5)) continue;
      state.grit.push({
        x, y,
        kind: rng.pick(gritKinds), rot: rng.float(0, Math.PI * 2), s: rng.float(0.7, 1.6),
      });
    }

    // props
    const propCount = Math.min(2200, Math.round((size * size) / 45 * (0.6 + zone.obstacles * 3.2)));
    for (let i = 0; i < propCount; i++) {
      const kind = rng.pick(zone.props);
      const x = rng.float(4, size - 4), y = rng.float(4, size - 4);
      if (nearPoi(x, y, 5)) continue;
      if (inWater(x, y, 0.5)) continue;
      const [lo, hi] = SIZES[kind] ?? [0.4, 1.0];
      const sc = rng.float(lo, hi);
      const rot = rng.float(0, Math.PI * 2);
      const solid = SOLID.has(kind);
      const prop = { kind, x, y, s: sc, rot, tone: rng.int(0, 3), solid };
      state.props.push(prop);
      if (solid) addObstacle({ type: 'circle', x, y, r: Math.max(0.3, sc * (SOLID_R[kind] ?? 0.5)) });
    }

    // Forest canopy: uniform props alone make a meadow, not a wood. Grow clumps
    // of trees and underbrush so the forest reads as a forest and gives cover.
    if (zone.habitat.includes('forest')) {
      const clumps = 26;
      for (let c = 0; c < clumps; c++) {
        const cx = rng.float(10, size - 10), cy = rng.float(10, size - 10);
        if (nearPoi(cx, cy, 10)) continue;
        const count = rng.int(7, 14);
        for (let i = 0; i < count; i++) {
          const a = rng.float(0, Math.PI * 2), d = rng.float(0, 13);
          const x = clamp(cx + Math.cos(a) * d, 5, size - 5);
          const y = clamp(cy + Math.sin(a) * d, 5, size - 5);
          if (nearPoi(x, y, 5)) continue;
          if (inWater(x, y, 1)) continue;
          const kind = rng.next() < 0.72 ? 'tree' : rng.pick(['fern', 'mushroom', 'stump', 'glow']);
          const sc = kind === 'tree' ? rng.float(0.75, 1.15) : rng.float(0.8, 1.2);
          state.props.push({ kind, x, y, s: sc, rot: rng.float(0, Math.PI * 2), tone: rng.int(0, 3), solid: kind === 'tree' || kind === 'stump' });
          if (kind === 'tree' || kind === 'stump') {
            addObstacle({ type: 'circle', x, y, r: Math.max(0.3, sc * (SOLID_R[kind] ?? 0.5)) });
          }
        }
      }
    }

    // camp set-dressing
    const camp = zone.pois.find(p => p.kind === 'camp');    if (camp) {
      const cx = camp.x, cy = camp.y;
      // Sprites are drawn in metres, so s=1 means "the size it looks": a 2.8 m
      // tent, a 1.2 m fire, a 0.9 m stash. Only slight variation is wanted.
      for (const [kind, dx, dy, s] of [
        ['fire', 0, 0, 1.0], ['tent', -4.2, 2.0, 1.0], ['stash', 3.4, -1.6, 1.0], ['anvil', 2.6, 2.8, 1.0],
        ['plot', -2.4, -3.4, 1.0], ['plot', 0, -3.8, 1.0], ['plot', 2.4, -3.4, 1.0], ['bench', -3.4, 4.2, 1.0],
        ['potato_sack', 3.2, 1.4, 1.0], ['potato_crate', 4.2, 0.4, 1.0],
      ]) {
        state.props.push({ kind, x: cx + dx, y: cy + dy, s, rot: 0, tone: 0, solid: kind === 'stash' || kind === 'anvil' });
      }
      for (const [dx, dy, r] of [[-4.2, 2.0, 1.6], [3.4, -1.6, 0.6], [2.6, 2.8, 0.5], [3.2, 1.4, 0.4], [4.2, 0.4, 0.5]]) {
        addObstacle({ type: 'circle', x: cx + dx, y: cy + dy, r });
      }
    }

    // havenreach buildings
    if (zone.id === 'havenreach') {
      const spots = [[100, 100], [140, 96], [96, 172], [150, 175], [170, 120], [70, 120], [112, 200], [180, 160]];
      for (const [x, y] of spots) {
        state.props.push({ kind: 'building', x, y, s: 1.0, rot: 0, tone: 0, solid: true });
        // the sprite is ~8.8 m wide and 6 m tall; the wall line is what blocks
        addObstacle({ type: 'circle', x, y, r: 3.4 });
        state.props.push({ kind: 'lamp', x: x + 4.4, y: y + 2.6, s: 1.0, rot: 0, tone: 0, solid: false });
      }
    }

    // resource nodes
    const nodeKinds = [];
    if (zone.habitat.includes('shore') || zone.habitat.includes('tidal')) nodeKinds.push('fish', 'fish', 'scrap', 'herb');
    if (zone.habitat.includes('forest')) nodeKinds.push('herb', 'herb', 'scrap');
    if (zone.habitat.includes('ruins') || zone.habitat.includes('grid') || zone.habitat.includes('spire')) nodeKinds.push('scrap', 'scrap', 'herb');
    if (zone.habitat.includes('ash')) nodeKinds.push('scrap', 'herb');
    if (zone.habitat.includes('town')) nodeKinds.push('herb', 'scrap');
    for (let i = 0; i < Math.min(22, Math.round(size / 12)); i++) {
      const kind = rng.pick(nodeKinds.length ? nodeKinds : ['scrap']);
      const x = rng.float(6, size - 6), y = rng.float(6, size - 6);
      if (nearPoi(x, y, 4)) continue;
      state.nodes.push({ kind, x, y, r: 1.4, used: false, regrowAt: 0, id: 'node_' + i });
    }

    return state;
  }

  pickWeather(zone) {
    const rng = this.game.rng;
    if (zone.habitat.includes('ash')) return 'ashfall';
    if (zone.habitat.includes('forest')) return rng.chance(0.5) ? 'spores' : 'mist';
    if (zone.habitat.includes('grid') || zone.habitat.includes('spire')) return rng.chance(0.5) ? 'static' : 'mist';
    if (zone.habitat.includes('shore') || zone.habitat.includes('tidal')) return rng.chance(0.4) ? 'rain' : 'mist';
    return 'clear';
  }

  bounds() {
    const s = this.zone?.size ?? 100;
    return { x: 2, y: 2, w: s - 4, h: s - 4 };
  }

  blockedAt(x, y, r = 0.35) {
    const b = this.bounds();
    if (x < b.x + r || y < b.y + r || x > b.x + b.w - r || y > b.y + b.h - r) return true;
    const st = this.state;
    if (!st) return false;
    const grid = st.obstacleGrid;
    if (!grid) {
      for (const o of st.obstacles ?? []) {
        if (o.type === 'circle' && Math.hypot(x - o.x, y - o.y) < o.r + r) return true;
      }
      return false;
    }
    const CELL = st.obstacleCell ?? 8;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const list = grid.get(gx + ':' + gy);
        if (!list) continue;
        for (const o of list) {
          if (o.type === 'circle' && Math.hypot(x - o.x, y - o.y) < o.r + r) return true;
        }
      }
    }
    return false;
  }

  safeSpot(x, y) {
    return !this.blockedAt(x, y, 0.5);
  }

  // ------------- spawn director -------------
  spawnTick(dt) {
    const game = this.game, zone = this.zone, p = this.player;
    if (!zone || this.rift) return;
    if (!spawnTable(zone, p.level).length) return;
    this.spawnAccum += dt * 1000;
    const densityScale = clamp(zone.density / 0.3, 0.35, 1.5);
    const maxAlive = Math.round(zone.maxAlive * densityScale);
    const alive = game.entities.filter(e => e.kind === 'monster' && e.hp > 0).length;
    const [lo, hi] = zone.spawnMs;
    const wait = lo + (hi - lo) * (1 - Math.min(1, zone.density / 0.55));
    if (this.spawnAccum < wait) return;
    this.spawnAccum = 0;
    if (alive >= maxAlive) return;
    // don't spawn on top of the player; find a ring spot that is walkable
    for (let tries = 0; tries < 12; tries++) {
      const a = game.rng.float(0, Math.PI * 2);
      const d = game.rng.float(17, 32);
      const x = clamp(p.x + Math.cos(a) * d, 5, zone.size - 5);
      const y = clamp(p.y + Math.sin(a) * d, 5, zone.size - 5);
      if (!this.safeSpot(x, y)) continue;
      if (this.nearSafePoi(x, y, 13)) continue;
      const group = makeSpawnGroup(game, zone, x, y);
      if (!group.length) return;
      for (const m of group) game.entities.push(m);
      const big = group[0].tier !== 'normal';
      if (big) game.log?.(`${group[0].name} stirs nearby.`, 'hi');
      return;
    }
  }

  nearSafePoi(x, y, pad) {
    return this.zone.pois.some(p => ['camp', 'waystone', 'npc', 'vendor', 'trainer', 'farm', 'board'].includes(p.kind) && Math.hypot(p.x - x, p.y - y) < (p.r ?? 3) + pad);
  }

  // ------------- per-frame -------------
  update(dt) {
    const game = this.game, p = this.player;
    if (!this.zone) return;
    // time: 1 real second = 1 game minute
    p.time = (p.time ?? 360) + dt;
    p.day = 1 + Math.floor(p.time / (24 * 60));

    this.spawnTick(dt);
    this.updateBosses(dt);
    this.updateNodes(dt);

    const petEntity = game.activePetEntity;
    for (const e of [...game.entities]) {
      if (e.kind === 'monster') {
        updateMonster(game, e, dt);
      } else if (e.kind === 'turret') {
        e.attackCd -= dt;
        const target = game.nearestMonster?.(e.x, e.y, 8);
        if (target && e.attackCd <= 0) {
          e.attackCd = 1.3;
          game.projectile?.(e, target, e.dmg, e.dmgBonus);
        }
        if (e.until < game.now) game.removeEntity?.(e);
      } else if (e.kind === 'pet') {
        this.updatePet(e, dt);
      } else if (e.kind === 'loot') {
        e.ttl = (e.ttl ?? 120) - dt;
        if (e.ttl <= 0) game.removeEntity?.(e);
      }
    }
    game.updateProjectiles?.(dt);

    // pick up loot by walking over it
    for (const e of [...game.entities]) {
      if (e.kind !== 'loot') continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < 1.5) game.pickupLoot?.(e);
    }

    // POI proximity: caches, waystones, rifts, gates are interactable
    for (const poi of this.state.pois) {
      const d = Math.hypot(poi.x - p.x, poi.y - p.y);
      if (d < (poi.r ?? 3) + 1.5 && !this.state.reached?.[poi.id]) {
        this.state.reached = this.state.reached || {};
        this.state.reached[poi.id] = true;
        game.emit?.('reach', poi.id, 1);
      }
      if (poi.kind === 'waystone' && d < (poi.r ?? 3) + 3) {
        p.flags.waystones = p.flags.waystones || {};
        p.flags.waystones[this.zone.id] = true;
      }
      if (d < (poi.r ?? 3) + 1.2 && poi.kind === 'cache' && !this.state.cacheOpened[poi.id]) {
        this.openCache(poi);
      }
    }

    // rift
    if (this.rift) this.updateRift(dt);
  }

  updateBosses(dt) {
    const game = this.game, p = this.player;
    for (const poi of this.state.pois) {
      if (poi.kind !== 'boss' || this.bossSpawned[poi.id]) continue;
      if (Math.hypot(poi.x - p.x, poi.y - p.y) > 14) continue;
      const def = NAMED.find(n => n.id === poi.boss);
      if (!def) continue;
      this.bossSpawned[poi.id] = true;
      const m = makeNamedEncounter(game, def, poi.x, poi.y);
      game.entities.push(m);
      game.log?.(`${m.name}${m.title ? ', ' + m.title : ''} is here.`, 'hi');
      game.toast?.(`☠ ${m.name}`, 'boss');
      game.fx?.('boss', poi.x, poi.y);
    }
  }

  updateNodes(dt) {
    for (const n of this.state.nodes) {
      if (n.used && n.regrowAt && this.player.time >= n.regrowAt) n.used = false;
    }
  }

  updatePet(pet, dt) {
    const game = this.game, p = this.player;
    if (pet.down) {
      // limp back after 20s
      pet.downT = (pet.downT ?? 0) + dt;
      if (pet.downT > 20) { pet.down = false; pet.hp = Math.max(1, Math.round(pet.hpMax * 0.3)); pet.downT = 0; }
      return;
    }
    pet.attackCd = (pet.attackCd ?? 0) - dt;
    const target = game.entities.find(e => e.kind === 'monster' && e.hp > 0 && Math.hypot(e.x - pet.x, e.y - pet.y) < 7 && Math.hypot(e.x - p.x, e.y - p.y) < 12);
    if (pet.mode === 'stay') {
      if (target && Math.hypot(target.x - pet.x, target.y - pet.y) < 2.4 && pet.attackCd <= 0) this.petAttack(pet, target);
      return;
    }
    if (target) {
      const d = Math.hypot(target.x - pet.x, target.y - pet.y);
      const reach = pet.ranged ? pet.ranged : 1.4;
      if (d > reach) this.stepPet(pet, target.x, target.y, pet.speed * dt);
      else if (pet.attackCd <= 0) this.petAttack(pet, target);
    } else {
      const d = Math.hypot(p.x - pet.x, p.y - pet.y);
      if (d > 3.2) this.stepPet(pet, p.x, p.y, pet.speed * 1.4 * dt);
    }
  }

  stepPet(pet, tx, ty, step) {
    const dx = tx - pet.x, dy = ty - pet.y;
    const d = Math.hypot(dx, dy) || 1;
    pet.facing = Math.atan2(dx, dy);
    const nx = pet.x + (dx / d) * step, ny = pet.y + (dy / d) * step;
    if (!this.blockedAt(nx, ny, pet.radius ?? 0.3)) { pet.x = nx; pet.y = ny; }
  }

  petAttack(pet, target) {
    const game = this.game;
    pet.attackCd = 1.5;
    const r = game.rng.int(1, 20) + pet.atk;
    if (r >= target.ac) {
      const d = game.rng.int(1, 6) + Math.floor(pet.level * 0.8);
      game.damage?.(target, d, 'physical', pet);
      game.fx?.('slash', target.x, target.y);
    } else {
      game.float?.(target, 'miss', 'info');
    }
  }

  // ------------- interactions -------------
  interactables() {
    const p = this.player, out = [];
    for (const poi of this.state?.pois ?? []) {
      const d = Math.hypot(poi.x - p.x, poi.y - p.y);
      if (d < (poi.r ?? 3) + 2.2) out.push({ kind: poi.kind, poi, d });
    }
    for (const e of this.game.entities) {
      if (e.kind === 'npc') {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 2.6) out.push({ kind: 'npc', npc: e, d });
      }
    }
    for (const n of this.state?.nodes ?? []) {
      if (n.used) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < 2.4) out.push({ kind: 'node', node: n, d });
    }
    for (const e of this.game.entities) {
      if (e.kind === 'loot') {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 2.2) out.push({ kind: 'loot', loot: e, d });
      }
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  }

  bestInteract() { return this.interactables()[0] ?? null; }

  gather(node) {
    const game = this.game, p = this.player;
    const map = { fish: 'fishing', herb: 'herbalism', scrap: 'scavenging' };
    const profId = map[node.kind];
    const prof = { fish: { item: 'raw_fish', qty: [1, 2], xp: 10 }, herb: { item: 'herb', qty: [1, 2], xp: 8 }, scrap: { item: 'scrap', qty: [1, 3], xp: 9 } }[node.kind];
    const lvl = p.prof?.[profId]?.level ?? 1;
    const bonus = Math.floor(lvl / 5);
    const qty = game.rng.int(prof.qty[0], prof.qty[1]) + bonus;
    addItem(p, prof.item, qty);
    const tr = trainProf(p, profId, prof.xp);
    node.used = true;
    node.regrowAt = p.time + game.rng.int(3, 8) * 60;
    game.float?.(p, `+${qty} ${prof.item.replace('_', ' ')}`, 'xp');
    game.log?.(`Gathered ${qty} ${prof.item.replace('_', ' ')}.`, 'good');
    game.emit('gather', prof.item, qty);
    if (tr.ups) game.toast?.(`${profId} ${tr.level}`);
    game.fx?.('gather', node.x, node.y);
    return { ok: true, qty, item: prof.item };
  }

  openCache(poi) {
    const game = this.game, p = this.player;
    this.state.cacheOpened[poi.id] = true;
    const marks = 20 + p.level * 8;
    p.marks += marks;
    const item = rollLoot(game.rng, Math.max(2, p.level), { tier: game.rng.chance(0.3) ? 'rare' : 'magic' });
    addItem(p, item);
    game.log?.(`Cache: ${item.name} and ${marks} marks.`, 'loot');
    game.toast?.(`Opened ${poi.name}`, 'loot');
    game.emit('cache', poi.id, 1);
    game.fx?.('cache', poi.x, poi.y);
  }

  // ------------- travel -------------
  travel(zoneId, opts = {}) {
    const game = this.game;
    const target = ZONE_BY_ID[zoneId];
    if (!target) return false;
    this.player.position.zone = zoneId;
    this.loadZone(zoneId, opts);
    game.log?.(`You travel to ${target.name}.`, 'hi');
    game.toast?.(target.name, 'zone');
    game.save?.();
    return true;
  }

  // ------------- rifts -------------
  enterRift(poi) {
    const game = this.game, p = this.player;
    const tier = 1 + Math.floor(p.level / 4);
    const zone = {
      id: 'rift_' + Date.now(), name: 'Rift: ' + (poi?.name ?? 'Unknown'), band: [p.level, p.level + 3],
      habitat: ['rift'], density: 0.9, size: 80, water: 0, obstacles: 0.12, ground: 'rift',
      palette: { ground: '#1a1622', ground2: '#241d31', wet: '#150f1c', water: '#241a33', accent: '#8f7bff', fog: '#0b0812', sky: '#1a1426', night: '#050308' },
      props: ['glass', 'monolith', 'cable', 'bone'], spawnMs: [3000, 6000], maxAlive: 8,
      pois: [{ id: 'rift_exit', kind: 'rift_exit', x: 40, y: 40, r: 3, name: 'Rift Mouth' }],
      rift: true,
    };
    this.riftReturn = { zone: this.zone.id, x: p.x, y: p.y };
    this.zone = zone;
    this.state = this.generate(zone, game.worldSeed + ':rift:' + Date.now());
    this.rift = { kills: 0, needed: 9, wave: 1, boss: null, cleared: false, chest: false, zone };
    game.entities = game.entities.filter(e => e.kind === 'pet');
    p.x = 40; p.y = 46;
    game.log?.('The rift folds shut behind you.', 'hi');
    game.toast?.('RIFT — clear it or die inside', 'boss');
    game.onRiftEnter?.();
  }

  updateRift(dt) {
    const game = this.game, r = this.rift, p = this.player;
    if (!r || r.cleared) return;
    this.spawnAccum = (this.spawnAccum ?? 0) + dt * 1000;
    const alive = game.entities.filter(e => e.kind === 'monster' && e.hp > 0).length;
    if (!r.boss && r.kills < r.needed && alive < 6 && this.spawnAccum > 2500) {
      this.spawnAccum = 0;
      const a = game.rng.float(0, Math.PI * 2), d = game.rng.float(9, 18);
      const x = clamp(p.x + Math.cos(a) * d, 4, 76), y = clamp(p.y + Math.sin(a) * d, 4, 76);
      const group = makeSpawnGroup(game, this.zone, x, y, { level: p.level + game.rng.int(0, 2) });
      for (const m of group) game.entities.push(m);
    }
    if (!r.boss && r.kills >= r.needed) {
      r.boss = true;
      const def = NAMED.find(n => n.id === 'ninth_relay');
      const boss = makeNamedEncounter(game, { ...def, name: 'Rift Warden', title: '', base: 'rift_horror', tier: 'unique', level: p.level + 2 }, 40, 40);
      boss.boss = true;
      boss.riftBoss = true;
      game.entities.push(boss);
      game.toast?.('The rift answers.', 'boss');
    }
    if (r.boss && !r.cleared) {
      const bossAlive = game.entities.some(e => e.kind === 'monster' && e.riftBoss && e.hp > 0);
      if (!bossAlive && game.entities.some(e => e.riftBoss && e.dead)) {
        r.cleared = true;
        const item = makeUnique(game.rng, p.level + 2) ?? rollLoot(game.rng, p.level + 2, { tier: 'rare' });
        addItem(p, item);
        p.marks += 80 + p.level * 20;
        game.log?.(`Rift cleared. ${item.name}.`, 'loot');
        game.toast?.('RIFT CLEARED', 'level');
        game.emit('rift', 'any', 1);
        // portal home
        this.state.pois.push({ id: 'rift_out', kind: 'rift_exit', x: 40, y: 34, r: 3, name: 'Way Out' });
      }
    }
  }

  leaveRift() {
    const game = this.game;
    const back = this.riftReturn;
    this.rift = null;
    this.loadZone(back?.zone ?? 'wrack_shore', { x: back?.x, y: back?.y });
    game.toast?.('You step back out.', 'zone');
  }
}
