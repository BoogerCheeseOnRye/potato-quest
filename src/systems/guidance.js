// Guidance: turns the active quest into one concrete thing to walk toward.
// The HUD compass and the in-world marker both read from here, so a new player
// is never left guessing what "Salvage Rights" wants them to do next.
import { QUESTS } from '../data/quests.js';
import { BASE_BY_ID } from '../data/items.js';

const ITEM_NODE = {
  scrap: 'scrap', alloy: 'scrap', core_shard: 'scrap',
  herb: 'herb', spore: 'herb', fiber: 'herb',
  raw_fish: 'fish', hide: 'herb',
};

function progressOf(game, quest) {
  return game.player?.quests?.progress?.[quest.id] ?? [];
}

// The first unfinished objective of the oldest active main quest.
export function activeObjective(game) {
  const p = game?.player;
  if (!p) return null;
  const active = (p.quests?.active ?? []).map(id => QUESTS[id]).filter(Boolean);
  const ordered = active.filter(q => q.main).concat(active.filter(q => !q.main));
  for (const q of ordered) {
    const prog = progressOf(game, q);
    for (let i = 0; i < (q.objectives?.length ?? 0); i++) {
      const o = q.objectives[i];
      if ((prog[i] ?? 0) < o.count) return { quest: q, obj: o, index: i, progress: prog[i] ?? 0 };
    }
  }
  return null;
}

function nearestEntity(game, pred, maxD = 400) {
  const p = game.player;
  let best = null, bd = maxD;
  for (const e of game.entities ?? []) {
    if (!pred(e)) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function poi(game, pred) {
  return (game.world?.zone?.pois ?? []).find(pred) ?? null;
}

function toward(game, x, y, label, kind, extra = {}) {
  const p = game.player;
  return {
    x, y, label, kind,
    dist: Math.hypot(x - p.x, y - p.y),
    ...extra,
  };
}

// Resolve one objective to a world point. Returns null when there is nothing
// useful to point at (e.g. "choose a path", which is a panel, not a place).
export function objectiveTarget(game) {
  const found = activeObjective(game);
  if (!found) return null;
  const { quest, obj } = found;
  const p = game.player;
  const zone = game.world?.zone;
  const here = zone?.id;

  // talk to a person
  if (obj.type === 'talk') {
    const npc = nearestEntity(game, e => e.kind === 'npc' && (e.def?.id === obj.target || e.id === obj.target));
    if (npc) return toward(game, npc.x, npc.y, `Speak to ${npc.name}`, 'npc', { ent: npc });
    const po = poi(game, x => x.npc === obj.target);
    if (po) return toward(game, po.x, po.y, po.name, 'npc');
  }

  // reach a place or zone
  if (obj.type === 'reach') {
    const dest = zone?.id === obj.target ? poi(game, x => x.id === obj.target) : null;
    if (dest) return toward(game, dest.x, dest.y, dest.name, 'poi');
    const gate = poi(game, x => x.kind === 'gate' && x.toZone === obj.target);
    if (gate) return toward(game, gate.x, gate.y, gate.name, 'gate');
    const targetZone = game.world?.zone;
    if (here !== obj.target) {
      // walk the chain: aim at the gate that leads toward the target zone
      const order = ['wrack_shore', 'tidal_flats', 'rustfield', 'sporewood', 'ashen_downs', 'dead_grid', 'relay_spire', 'havenreach'];
      const dir = Math.sign(order.indexOf(obj.target) - order.indexOf(here));
      const nextId = order[order.indexOf(here) + dir];
      const g = poi(game, x => x.kind === 'gate' && x.toZone === nextId);
      if (g) return toward(game, g.x, g.y, g.name, 'gate');
      return toward(game, targetZone.size / 2, targetZone.size / 2, 'Head for ' + obj.label, 'poi');
    }
  }

  // kill something
  if (obj.type === 'kill' || obj.type === 'killfamily' || obj.type === 'named') {
    const match = (e) => {
      if (e.kind !== 'monster' || e.hp <= 0) return false;
      if (obj.type === 'named') return e.namedId === obj.target;
      if (obj.type === 'killfamily') return e.family === obj.target;
      return e.species === obj.target || e.baseId === obj.target;
    };
    const mon = nearestEntity(game, match, 90);
    if (mon) return toward(game, mon.x, mon.y, mon.name, 'monster', { ent: mon });
    const boss = poi(game, x => x.kind === 'boss' && x.boss === obj.target);
    if (boss) return toward(game, boss.x, boss.y, boss.name, 'boss');
    const named = poi(game, x => x.kind === 'boss');
    if (obj.type === 'named' && named) return toward(game, named.x, named.y, named.name, 'boss');
    // nothing on screen: sweep the zone
    return toward(game, zone.size / 2, zone.size / 2, obj.label, 'hunt');
  }

  // collect materials
  if (obj.type === 'collect') {
    const kind = ITEM_NODE[obj.target];
    const node = nearestEntity(game, e => e.kind === 'node' && !e.used && e.node?.kind === kind, 400)
      ?? (game.world?.state?.nodes ?? []).filter(n => !n.used && (!kind || n.kind === kind))
        .map(n => ({ ...n, _d: Math.hypot(n.x - p.x, n.y - p.y) }))
        .sort((a, b) => a._d - b._d)[0];
    if (node) return toward(game, node.x, node.y, `Gather ${BASE_BY_ID[obj.target]?.name ?? obj.label}`, 'node');
  }

  // farm / craft / tame / cache
  if (obj.type === 'craft') {
    const anvil = (game.world?.state?.props ?? []).find(pr => pr.kind === 'anvil');
    if (anvil) return toward(game, anvil.x, anvil.y, 'Use the anvil at camp', 'prop');
    const camp = poi(game, x => x.kind === 'camp');
    if (camp) return toward(game, camp.x, camp.y, camp.name, 'camp');
  }
  if (obj.type === 'plant' || obj.type === 'harvest') {
    const camp = poi(game, x => x.kind === 'farm') ?? poi(game, x => x.kind === 'camp');
    if (camp) return toward(game, camp.x, camp.y, obj.type === 'plant' ? 'Plant at ' + camp.name : 'Harvest at ' + camp.name, 'farm');
  }
  if (obj.type === 'tame') {
    const pet = nearestEntity(game, e => e.kind === 'monster' && e.hp > 0 && e.tameable, 90);
    if (pet) return toward(game, pet.x, pet.y, `Tame a ${pet.name}`, 'monster', { ent: pet });
  }
  if (obj.type === 'cache') {
    const cache = poi(game, x => x.kind === 'cache');
    if (cache) return toward(game, cache.x, cache.y, cache.name, 'cache');
  }
  return null;
}

// Fallback when no quest objective has a location: point at the next gate or
// the nearest interesting thing so the compass is never dead.
export function nearestWaypoint(game) {
  const p = game.player;
  if (!p) return null;
  const zone = game.world?.zone;
  const pois = zone?.pois ?? [];
  let best = null, bd = Infinity;
  for (const po of pois) {
    if (po.kind === 'camp') continue;
    const d = Math.hypot(po.x - p.x, po.y - p.y);
    if (d < bd) { bd = d; best = po; }
  }
  return best ? toward(game, best.x, best.y, best.name, best.kind) : null;
}

export function compass(game) {
  const t = objectiveTarget(game) ?? nearestWaypoint(game);
  if (!t) return null;
  const cam = game.cam;
  const p = game.player;
  const dx = t.x - p.x, dy = t.y - p.y;
  let fx, fy, rx, ry;
  if (game.view === 'iso') {
    // iso screen right is (+x, -y); screen up is (-x, -y)
    fx = -0.7071; fy = -0.7071; rx = 0.7071; ry = -0.7071;
  } else {
    fx = Math.sin(cam.yaw); fy = Math.cos(cam.yaw);
    rx = Math.cos(cam.yaw); ry = -Math.sin(cam.yaw);
  }
  const forward = dx * fx + dy * fy;
  const right = dx * rx + dy * ry;
  const angle = Math.atan2(right, forward); // 0 = straight up the screen
  return { ...t, angle, quest: activeObjective(game)?.quest?.name ?? null };
}
