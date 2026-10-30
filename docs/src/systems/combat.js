// Combat: d20 vs AC, dice damage, use-based training hooks, elite modifiers,
// monster AI helpers, pets and summoned turrets.
import { attackRoll, roll, mod, d20, xpAward } from '../rules/dnd.js';
import { MONSTER_BY_ID, CHAMPION_MODS, FAMILIES } from '../data/bestiary.js';
import { ABILITIES, rankMult, cdFor, radiusFor, targetsFor, costFor } from '../data/abilities.js';
import { trainAbility, trainSkill } from './progression.js';
import { rollLoot, makeUnique, RARITY, itemColor } from '../data/items.js';
import { addItem } from './inventory.js';
import { petXp } from '../entities/player.js';
import { scaleFactor } from '../rules/dnd.js';

export function makeMonster(speciesId, level = 1, opts = {}) {
  const base = MONSTER_BY_ID[speciesId];
  if (!base) throw new Error('no such monster ' + speciesId);
  const rng = opts.rng;
  const tier = opts.tier ?? 'normal';
  const m = {
    kind: 'monster', id: 'mob_' + Math.random().toString(36).slice(2, 9),
    species: speciesId, name: base.name, family: base.family,
    sprite: base.sprite, size: base.size, level, tier,
    x: opts.x ?? 0, y: opts.y ?? 0, z: 0, radius: Math.max(0.25, base.size * 0.4),
    facing: opts.facing ?? rng?.float(0, Math.PI * 2) ?? 0,
    home: { x: opts.x ?? 0, y: opts.y ?? 0 },
    state: 'idle', target: null, attackCd: 0, wanderT: 0, aggroT: 0,
    effects: [], cooldowns: {}, drops: base.drops ?? [],
    passive: !!base.passive, flee: !!base.flee, flying: !!base.flying,
    ranged: base.ranged ?? 0, namedId: opts.namedId ?? null, boss: !!opts.boss,
    mods: [], multishot: false, onHit: null,
  };
  scaleMonster(m, level);
  if (tier !== 'normal') applyTier(m, tier, rng);
  if (opts.mods?.length) applyMods(m, opts.mods);
  if (opts.name) m.name = opts.name;
  if (opts.title) m.title = opts.title;
  return m;
}

export function scaleMonster(m, level) {
  const base = MONSTER_BY_ID[m.species];
  const f = scaleFactor(level);
  m.hpMax = Math.round(base.hp * f);
  m.ac = base.ac + Math.floor(level / 4);
  m.atk = base.atk + Math.floor(level * 0.62);
  m.dmg = base.dmg;
  m.dmgBonus = Math.floor(level * 0.35);
  m.speed = base.speed;
  m.aggro = base.aggro;
  m.xpValue = xpAward(level, level, Math.round(base.xp * (1 + level * 0.35)));
  m.level = level;
  m.hp = m.hpMax;
  return m;
}

export function applyTier(m, tier, rng) {
  m.tier = tier;
  const mult = { normal: 1, elite: 2.2, rare: 3.6, unique: 6.5, legendary: 9, boss: 12 }[tier] ?? 1;
  const dmgM = { normal: 1, elite: 1.25, rare: 1.5, unique: 1.7, legendary: 1.9, boss: 2.1 }[tier] ?? 1;
  m.hpMax = Math.round(m.hpMax * mult);
  m.hp = m.hpMax;
  m.dmgBonus = Math.round(m.dmgBonus * dmgM);
  m.ac += { elite: 1, rare: 2, unique: 3, legendary: 4, boss: 4 }[tier] ?? 0;
  m.xpValue = Math.round(m.xpValue * { elite: 2.4, rare: 4.5, unique: 8, legendary: 12, boss: 14 }[tier] ?? 1);
  if (tier === 'elite' && rng) applyMods(m, [rng.pick(CHAMPION_MODS).id]);
  if ((tier === 'rare' || tier === 'unique' || tier === 'legendary') && rng) {
    applyMods(m, rng.shuffle(CHAMPION_MODS).slice(0, tier === 'rare' ? 1 : 2).map(c => c.id));
  }
  if (rng) {
    const pre = { elite: '', rare: 'Corrupted ', unique: 'Ancient ', legendary: 'Eternal ', boss: 'Warden ' }[tier] ?? '';
    m.name = pre + m.name;
  }
}

export function applyMods(m, ids) {
  for (const id of ids) {
    const cm = CHAMPION_MODS.find(c => c.id === id);
    if (!cm) continue;
    m.mods.push(cm.id);
    const e = cm.effect;
    if (e.speed) m.speed *= e.speed;
    if (e.dmg) m.dmgBonus = Math.round(m.dmgBonus * e.dmg);
    if (e.ac) m.ac += e.ac;
    if (e.hp) { m.hpMax = Math.round(m.hpMax * e.hp); m.hp = m.hpMax; }
    if (e.onHit) m.onHit = e.onHit;
    if (e.multishot) m.multishot = true;
    if (e.lifesteal) m.lifesteal = e.lifesteal;
    if (e.resist) m.flatResist = (m.flatResist ?? 0) + e.resist;
  }
  return m;
}

export function monsterLabel(m) {
  const t = m.tier !== 'normal' ? { elite: 'Elite ', rare: 'Rare ', unique: 'Unique ', legendary: 'Legendary ', boss: 'Boss ' }[m.tier] : '';
  return t + m.name + (m.title ? ', ' + m.title : '');
}

export function resistFor(target, type) {
  const fam = target.family ? FAMILIES[target.family] : null;
  let r = target.sheet?.resists?.[type] ?? 0;
  if (fam?.resist?.[type]) r = Math.max(r, fam.resist[type]);
  if (target.flatResist) r += target.flatResist;
  return Math.min(90, r);
}

export function applyDamage(game, target, amount, type = 'physical', source = null) {
  if (!target || target.hp <= 0) return 0;
  const res = resistFor(target, type) / 100;
  let dmg = Math.max(1, Math.round(amount * (1 - res)));
  if (target.effects?.some(e => e.type === 'shield')) dmg = Math.round(dmg * 0.5);
  target.hp -= dmg;
  target.lastHit = game.now;
  if (target.kind === 'monster') {
    target.aggroT = 8;
    if (source) target.target = source;
    target.state = target.hp <= 0 ? 'dead' : 'chase';
  }
  game.float?.(target, '-' + dmg, type === 'heal' ? 'heal' : 'dmg');
  if (target.hp <= 0) {
    target.hp = 0;
    if (target.kind === 'monster') killMonster(game, target, source);
    else if (target.kind === 'pet') {
      target.down = true;
      target.hp = 0;
      game.log?.(`${target.name} is down. It will limp back at camp.`, 'bad');
    } else if (target.isPlayer) {
      game.onPlayerDeath?.();
    }
  }
  return dmg;
}

export function healEntity(game, target, amount) {
  if (!target || target.hp <= 0) return 0;
  const max = target.hpMax ?? target.sheet?.hpMax ?? 1;
  const before = target.hp;
  target.hp = Math.min(max, target.hp + Math.round(amount));
  const got = target.hp - before;
  if (got > 0) game.float?.(target, '+' + got, 'heal');
  return got;
}

export function addEffect(target, effect) {
  target.effects = target.effects || [];
  target.effects.push(effect);
}

export function tickEffects(game, ent) {
  if (!ent.effects?.length) return;
  for (const e of ent.effects) {
    if (e.nextTick == null) e.nextTick = game.now + (e.tick ?? 1);
    if (e.until && e.until < game.now) { e.done = true; continue; }
    if (e.dps && game.now >= e.nextTick) {
      e.nextTick = game.now + (e.tick ?? 1);
      applyDamage(game, ent, e.dps, e.dmgType ?? 'physical', e.source);
    }
  }
  ent.effects = ent.effects.filter(e => !e.done && (!e.until || e.until > game.now));
}

export function playerAttack(game, target) {
  const p = game.player;
  const s = p.sheet;
  if (!target || target.hp <= 0) return null;
  const dist = Math.hypot(target.x - p.x, target.y - p.y);
  if (dist > (s.range ?? 1.7) + (target.radius ?? 0.3)) {
    game.float?.(p, 'out of reach', 'info');
    return null;
  }
  const r = attackRoll(game.rng, s.atk, target.ac);
  if (!r.hit) {
    game.float?.(target, 'miss', 'info');
    trainAbility(p, 'attack', 2);
    return { ...r, dmg: 0 };
  }
  const dr = roll(s.dmg, game.rng);
  let dmg = dr.sum + s.dmgBonus;
  const crit = r.roll >= (s.critRange ?? 20);
  if (crit) dmg = Math.round(dmg * (s.critMult ?? 2));
  const dealt = applyDamage(game, target, dmg, 'physical', p);
  game.float?.(target, (crit ? 'CRIT ' : '') + '-' + dealt, crit ? 'crit' : 'dmg');
  trainAbility(p, 'attack', crit ? 6 : 3);
  trainSkill(p, 'athletics', 1.5);
  game.fx?.('slash', target.x, target.y, { crit });
  game.onHitLanded?.(target, dealt, crit);
  return { ...r, dmg: dealt, crit };
}

export function monsterAttack(game, m, target) {
  if (!target || target.hp <= 0) return null;
  const p = target.isPlayer ? target : target;
  const ac = p.isPlayer ? p.sheet.ac : (p.ac ?? 10);
  const r = attackRoll(game.rng, m.atk, ac);
  if (!r.hit) {
    game.float?.(p, 'miss', 'info');
    return { hit: false };
  }
  const dr = roll(m.dmg, game.rng);
  let dmg = dr.sum + (m.dmgBonus ?? 0);
  if (r.crit) dmg = Math.round(dmg * 2);
  if (m.onHit === 'chill') addEffect(p, { type: 'chill', slow: 0.5, until: game.now + 3 });
  if (m.onHit === 'burn') addEffect(p, { type: 'burn', dps: Math.max(1, Math.round(m.level * 0.6)), until: game.now + 4, dmgType: 'fire' });
  if (m.onHit === 'shock') addEffect(p, { type: 'shock', dps: Math.max(1, Math.round(m.level * 0.5)), until: game.now + 3, dmgType: 'elec' });
  if (m.onHit === 'drain') p.mp = Math.max(0, p.mp - Math.round(m.level));
  const dealt = applyDamage(game, p, dmg, 'physical', m);
  if (m.lifesteal) healEntity(game, m, Math.round(dealt * m.lifesteal));
  game.fx?.('hit', p.x, p.y);
  return { ...r, dmg: dealt };
}

// ------------- ability use -------------
export function abilityTargets(game, actor, ab, aim) {
  const enemies = game.entities.filter(e => e.kind === 'monster' && e.hp > 0);
  const px = aim?.x ?? actor.x, py = aim?.y ?? actor.y;
  const r = radiusFor(ab, rank(actor, ab.id)) || (ab.kind === 'melee' ? 1.8 : 8);
  if (ab.kind === 'aoe' || ab.kind === 'nova') {
    return enemies.filter(e => Math.hypot(e.x - px, e.y - py) <= r + (e.radius ?? 0.3));
  }
  if (ab.kind === 'cone') {
    const facing = actor.facing ?? 0;
    return enemies.filter(e => {
      const d = Math.hypot(e.x - actor.x, e.y - actor.y);
      if (d > r + (e.radius ?? 0.3)) return false;
      const a = Math.atan2(e.x - actor.x, e.y - actor.y);
      let diff = Math.abs(((a - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      return diff <= Math.PI / 2.2;
    }).slice(0, targetsFor(ab, rank(actor, ab.id)));
  }
  if (ab.kind === 'melee' || ab.kind === 'ranged') {
    if (aim?.target && aim.target.hp > 0) return [aim.target];
    return enemies.filter(e => Math.hypot(e.x - actor.x, e.y - actor.y) <= r + (e.radius ?? 0.3))
      .sort((a, b) => Math.hypot(a.x - actor.x, a.y - actor.y) - Math.hypot(b.x - actor.x, b.y - actor.y))
      .slice(0, targetsFor(ab, rank(actor, ab.id)));
  }
  return [];
}

function rank(actor, id) { return actor.sheet?.abilityRanks?.[id] ?? actor.abilityTrain?.[id]?.level ?? 1; }

export function useAbility(game, id, aim = {}) {
  const p = game.player;
  const ab = ABILITIES[id];
  if (!ab) return { ok: false, why: 'unknown ability' };
  const rankNow = rank(p, id);
  const cdKey = id;
  const cdEnd = p.cooldowns?.[cdKey] ?? 0;
  if (cdEnd > game.now) return { ok: false, why: 'cooling down', cd: cdEnd - game.now };
  const cost = costFor(ab, rankNow);
  if (cost > p.mp) return { ok: false, why: 'not enough energy' };

  let targets = [];
  if (ab.kind === 'melee' || ab.kind === 'cone' || ab.kind === 'ranged' || ab.kind === 'aoe' || ab.kind === 'nova') {
    targets = abilityTargets(game, p, ab, aim);
    if (!targets.length && ab.kind !== 'nova' && ab.kind !== 'aoe') {
      return { ok: false, why: 'nothing in range' };
    }
  }

  p.cooldowns = p.cooldowns || {};
  p.mp -= cost;
  const cd = cdFor(ab, rankNow) * (1 - (p.sheet.cdr ?? 0));
  p.cooldowns[id] = game.now + cd;
  if (aim?.x != null) p.facing = Math.atan2(aim.x - p.x, aim.y - p.y);

  const mult = rankMult(rankNow);
  const primary = ab.stat ?? 'str';
  const statMod = mod(p.sheet[primary] ?? 10);
  const spellBonus = ab.spell ? (p.sheet.spellDmg ?? 0) : 0;
  const results = { ok: true, id, targets: targets.length, hits: [] };

  switch (ab.kind) {
    case 'melee': case 'cone': case 'ranged': case 'aoe': case 'nova': {
      for (const t of targets) {
        let dmg = roll(ab.dmg ?? '1d6', game.rng).sum + statMod + spellBonus;
        dmg = Math.round(dmg * mult);
        if (ab.id === 'backstab' && !t.target) dmg = Math.round(dmg * (ab.bonusVsUnaware ?? 1));
        if (ab.kind === 'aoe' || ab.kind === 'nova') dmg = Math.round(dmg * 0.9);
        const type = ab.spell ? (ab.id === 'arcBolt' || ab.id === 'staticField' || ab.id === 'discharge' || ab.id === 'overload' ? 'elec' : 'poison') : 'physical';
        const dealt = applyDamage(game, t, dmg, type, p);
        results.hits.push({ target: t, dmg: dealt });
        game.fx?.(ab.spell ? 'zap' : 'slash', t.x, t.y, { crit: false });
        if (ab.effect === 'stun') addEffect(t, { type: 'stun', until: game.now + (ab.effectSecs ?? 1.5) });
        if (ab.effect === 'shock') addEffect(t, { type: 'shock', dps: Math.max(1, Math.round(dmg * 0.25)), until: game.now + (ab.effectSecs ?? 3), dmgType: 'elec' });
        if (ab.effect === 'poison') addEffect(t, { type: 'poison', dps: Math.max(1, Math.round(dmg * 0.3)), until: game.now + (ab.effectSecs ?? 5), dmgType: 'poison' });
        if (ab.effect === 'slow') addEffect(t, { type: 'chill', slow: 0.5, until: game.now + (ab.effectSecs ?? 3) });
        if (t.hp <= 0) game.onKill?.(t, 'player');
      }
      if (ab.id === 'volley') trainSkill(p, 'acrobatics', 2);
      if (ab.spell) trainSkill(p, 'lore', 2);
      break;
    }
    case 'heal': {
      const target = aim.target?.kind === 'pet' ? aim.target : (p.hp / p.sheet.hpMax < 0.5 ? p : (game.activePetEntity ?? p));
      const amount = Math.round((roll(ab.heal ?? '1d8', game.rng).sum + statMod + spellBonus) * mult);
      const got = healEntity(game, target, amount);
      results.heal = got;
      game.fx?.('heal', target.x, target.y);
      trainSkill(p, 'medicine', 3);
      break;
    }
    case 'buff': {
      const stats = {};
      const b = ab.buff;
      if (b.atk) stats.atk = b.atk;
      if (b.ac) stats.ac = b.ac;
      if (b.spell) stats.spellDmg = b.spell;
      if (b.cdr) stats.cdr = b.cdr;
      if (b.thorns) stats.thorns = b.thorns;
      p.buffs.push({ id: ab.id, name: ab.name, stats, until: game.now + (b.secs ?? 8), icon: ab.icon });
      if (ab.id === 'overclock') p.flags.overclock = true;
      game.fx?.('buff', p.x, p.y);
      break;
    }
    case 'tame': {
      const t = aim.target ?? targets[0] ?? nearestMonster(game, p, 4);
      if (!t) return { ok: false, why: 'nothing to bond with' };
      const res = attemptTame(game, t);
      results.tame = res;
      break;
    }
    case 'summon': {
      game.spawnTurret?.(p.x, p.y + 1, ab.duration ?? 20, p);
      game.fx?.('buff', p.x, p.y);
      break;
    }
    case 'dash': {
      const dir = aim.dir ?? { x: Math.sin(p.facing), y: Math.cos(p.facing) };
      const d = ab.range ?? 4;
      p.x += dir.x * d; p.y += dir.y * d;
      if (ab.effect === 'stealth') addEffect(p, { type: 'stealth', until: game.now + (ab.effectSecs ?? 3) });
      game.fx?.('dash', p.x, p.y);
      break;
    }
    case 'utility': {
      const t = aim.target ?? nearestMonster(game, p, 2);
      if (!t) return { ok: false, why: 'nobody close enough' };
      const loot = rollLoot(game.rng, Math.max(1, p.level), { tier: 'magic' });
      addItem(p, loot);
      game.log?.(`Lifted ${loot.name}.`, 'loot');
      game.onPickup?.(loot);
      break;
    }
  }
  const tr = trainAbility(p, id, 6 + (results.targets || 0) * 2);
  if (tr.ups) game.onRankUp?.(ab, tr.level);
  return results;
}

export function nearestMonster(game, from, radius) {
  let best = null, bd = radius;
  for (const e of game.entities) {
    if (e.kind !== 'monster' || e.hp <= 0) continue;
    const d = Math.hypot(e.x - from.x, e.y - from.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function attemptTame(game, monster) {
  const p = game.player;
  if (!monster.tameable) return { ok: false, why: 'That is not a beast you can reach.' };
  const frac = monster.hp / monster.hpMax;
  if (frac > 0.4) return { ok: false, why: 'It is too strong. Wear it down first.' };
  if (p.pets.length >= 4) return { ok: false, why: 'Four is already a zoo.' };
  const skill = p.sheet.skills?.tame ?? 0;
  const chance = Math.min(0.92, 0.12 + skill * 0.05 + (1 - frac) * 0.45);
  if (game.rng.next() < chance) {
    const pet = game.createPet?.(monster.species, Math.max(1, monster.level - 1));
    if (pet) {
      p.pets.push(pet);
      if (!p.activePet) p.activePet = pet.id;
      game.log?.(`${monster.name} calms. ${pet.name} joins you.`, 'good');
      game.toast?.(`Tamed ${monster.name} — ${pet.name}`);
      p.tamed = (p.tamed ?? 0) + 1;
      monster.hp = 0;
      game.removeEntity?.(monster);
      trainSkill(p, 'tame', 20);
      game.emit?.('tame', monster.species, 1);
    }
    return { ok: true, pet };
  }
  game.float?.(monster, 'resists', 'info');
  trainSkill(p, 'tame', 6);
  return { ok: false, why: 'It pulls away.' };
}

// ------------- death & loot -------------
export function killMonster(game, m, source) {
  if (m.dead) return;
  m.dead = true;
  m.hp = 0;
  m.state = 'dead';
  const p = game.player;
  game.fx?.('death', m.x, m.y, { tier: m.tier });
  game.onKill?.(m, 'player');
  const xp = Math.round(m.xpValue * (1 + (m.tier === 'normal' ? 0 : 0.5)));
  game.grantXp?.(xp, m);
  p.kills = (p.kills ?? 0) + 1;
  if (source === 'player' || !source) game.emit?.('kill', m.species, 1, m);
  if (m.family) game.emit?.('killfamily', m.family, 1, m);
  if (m.namedId) game.emit?.('named', m.namedId, 1, m);
  if (m.tier === 'rare' || m.tier === 'unique' || m.tier === 'legendary') game.emit?.('rare', m.tier, 1, m);
  if (m.boss) game.emit?.('boss', m.species, 1, m);

  // loot
  const rng = game.rng;
  const lootChance = { normal: 0.28, elite: 0.75, rare: 1, unique: 1, legendary: 1, boss: 1 }[m.tier] ?? 0.28;
  if (rng.next() < lootChance) {
    const tierForLoot = m.tier === 'normal' ? 'normal' : m.tier === 'elite' ? 'elite' : m.tier;
    let item;
    if ((m.tier === 'unique' || m.tier === 'legendary' || m.tier === 'boss') && rng.chance(0.5)) {
      item = makeUnique(rng, Math.max(m.level, p.level));
    }
    item = item ?? rollLoot(rng, Math.max(1, m.level), { tier: tierForLoot });
    game.dropLoot?.(m.x, m.y, item);
  }
  // material drops
  for (const d of m.drops ?? []) {
    if (rng.next() < d.chance) {
      const qty = d.qty ? rng.int(d.qty[0], d.qty[1]) : 1;
      game.dropMaterial?.(m.x, m.y, d.id, qty);
    }
  }
  // pet xp
  const active = p.pets?.find(pt => pt.id === p.activePet);
  if (active && active.hp > 0) {
    const ups = petXp(active, Math.round(xp * 0.6));
    if (ups) game.toast?.(`${active.name} reached level ${active.level}`);
  }
  game.removeEntity?.(m, 0.6);
}

export function monsterXpPreview(m) { return Math.round(m.xpValue * (1 + (m.tier === 'normal' ? 0 : 0.5))); }

// basic monster AI, called from the world update with a list of possible targets
export function updateMonster(game, m, dt) {
  if (m.hp <= 0) return;
  tickEffects(game, m);
  const p = game.player;
  const distToPlayer = Math.hypot(p.x - m.x, p.y - m.y);
  const petTarget = game.activePetEntity?.hp > 0 ? game.activePetEntity : null;

  if (m.effects?.some(e => e.type === 'stun')) return;
  const slow = m.effects?.some(e => e.type === 'chill') ? 0.55 : 1;

  // leash / aggro
  if (m.aggroT > 0) m.aggroT -= dt;
  if (m.state === 'idle') {
    m.wanderT -= dt;
    if (m.wanderT <= 0) {
      m.wanderT = game.rng.float(2, 5);
      const a = game.rng.float(0, Math.PI * 2);
      m.wanderTo = { x: m.home.x + Math.cos(a) * game.rng.float(0, 4), y: m.home.y + Math.sin(a) * game.rng.float(0, 4) };
    }
    if (m.wanderTo) {
      const d = Math.hypot(m.wanderTo.x - m.x, m.wanderTo.y - m.y);
      if (d > 0.2) stepToward(m, m.wanderTo.x, m.wanderTo.y, m.speed * 0.35 * slow * dt, game);
    }
    const aggroR = m.passive ? m.aggro * 0.4 : m.aggro;
    if (distToPlayer < aggroR && !p.effects?.some(e => e.type === 'stealth')) {
      m.state = m.passive || m.flee ? 'flee' : 'chase';
      m.target = p;
      m.aggroT = 8;
      game.fx?.('alert', m.x, m.y);
    }
    return;
  }
  if (m.state === 'flee') {
    stepToward(m, p.x, p.y, -m.speed * slow * dt, game);
    if (distToPlayer > 16) { m.state = 'idle'; m.hp = m.hpMax; }
    return;
  }
  if (m.state === 'chase') {
    const target = petTarget && Math.hypot(petTarget.x - m.x, petTarget.y - m.y) < 4 ? petTarget : p;
    const dist = Math.hypot(target.x - m.x, target.y - m.y);
    const reach = m.ranged ? m.ranged : 1.4 + (target.radius ?? 0.3);
    if (dist > reach) {
      stepToward(m, target.x, target.y, m.speed * slow * dt, game);
    } else if (m.attackCd <= 0) {
      m.attackCd = m.ranged ? 2.2 : 1.4;
      if (m.ranged) {
        game.projectile?.(m, target, m.dmg, m.dmgBonus);
      } else {
        monsterAttack(game, m, target);
      }
      if (m.multishot) for (let i = 0; i < 2; i++) setTimeout(() => game.projectile?.(m, target, m.dmg, m.dmgBonus), 120 * (i + 1));
    }
    if (dist > 24 || (m.aggroT <= 0 && dist > 10)) { m.state = 'idle'; m.target = null; }
  }
  m.attackCd -= dt;
  if (m.attackCd < 0) m.attackCd = 0;
  if (m.ranged && m.state === 'chase') m.attackCd = Math.min(m.attackCd, 2.2);
}

export function stepToward(m, tx, ty, step, game) {
  const dx = tx - m.x, dy = ty - m.y;
  const d = Math.hypot(dx, dy) || 1;
  m.facing = Math.atan2(dx, dy);
  const nx = m.x + (dx / d) * step;
  const ny = m.y + (dy / d) * step;
  if (game.blockedAt?.(nx, ny, m.radius ?? 0.35)) return;
  m.x = nx; m.y = ny;
}

export function summonTurret(game, x, y, duration, owner) {
  const t = {
    kind: 'turret', id: 'turret_' + Math.random().toString(36).slice(2, 8), name: 'Sentry',
    x, y, z: 0, radius: 0.4, hp: 20 + owner.level * 4, hpMax: 20 + owner.level * 4,
    ac: 14, level: owner.level, until: game.now + duration, attackCd: 0, facing: 0,
    dmg: '1d8', dmgBonus: Math.floor(owner.level * 0.8), atk: owner.sheet.atk,
    effects: [], sprite: 'turret', size: 0.5, family: 'construct',
  };
  game.entities.push(t);
  return t;
}
