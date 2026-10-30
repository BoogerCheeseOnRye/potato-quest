// Spawn director tables: which creatures belong to a zone, at what level, and
// how often something awful shows up. D2-ish: crowds of normal things, the
// occasional champion pack, rare/unique names seldom, fixed named bosses always.
import { MONSTERS, NAMED } from '../data/bestiary.js';
import { makeMonster, applyMods } from './combat.js';
import { clamp } from '../core/geom.js';

export function zoneMonsters(zone) {
  return MONSTERS.filter(m => m.habitat.some(h => zone.habitat.includes(h) || (h === 'ruins' && zone.habitat.includes('grid')) || (zone.habitat.includes('rift') && (h === 'grid' || h === 'spire' || h === 'ruins'))));
}

export function spawnTable(zone, playerLevel) {
  return zoneMonsters(zone).map(m => {
    let w = m.weight ?? 10;
    const lvlGap = playerLevel - m.lvl;
    if (lvlGap > 6) w *= 0.35;
    if (lvlGap > 12) w *= 0.2;
    if (m.boss) w *= 0.05;
    return { ...m, w };
  });
}

// Tier weights per spawn slot. Named rares are zone-bound and rare.
export const TIER_RATES = { elite: 0.085, rare: 0.011, unique: 0.0022, legendary: 0.0004 };

export function rollTier(rng, zone, playerLevel) {
  const named = NAMED.filter(n => n.zone === zone.id);
  const roll = rng.next();
  if (named.length) {
    const namedChance = 0.0009 * Math.min(3, 1 + playerLevel / 20);
    if (roll < namedChance) { const n = rng.pick(named); return { tier: n.tier, named: n }; }
  }
  let acc = TIER_RATES.elite;
  if (roll < acc) return { tier: 'elite' };
  acc += TIER_RATES.rare;
  if (roll < acc) return { tier: 'rare' };
  acc += TIER_RATES.unique;
  if (roll < acc) return { tier: 'unique' };
  acc += TIER_RATES.legendary;
  if (roll < acc) return { tier: 'legendary' };
  return { tier: 'normal' };
}

export function levelForSpawn(zone, playerLevel, rng) {
  const [lo, hi] = zone.band;
  return clamp(playerLevel + rng.int(-1, 1), lo, hi + 1);
}

export function makeSpawnGroup(game, zone, x, y, opts = {}) {
  const rng = game.rng;
  const table = spawnTable(zone, game.player.level);
  if (!table.length) return [];
  const pick = rng.weighted(table);
  const level = opts.level ?? levelForSpawn(zone, game.player.level, rng);
  const tierRoll = opts.tier ? { tier: opts.tier, named: opts.named } : rollTier(rng, zone, game.player.level);
  const group = [];
  const packSize = tierRoll.tier === 'normal' ? rng.int(pick.pack?.[0] ?? 1, pick.pack?.[1] ?? 1)
    : tierRoll.tier === 'elite' ? rng.int(2, 4) : 1;

  let named = tierRoll.named;
  if (!named && (tierRoll.tier === 'rare' || tierRoll.tier === 'unique' || tierRoll.tier === 'legendary')) {
    const pool = NAMED.filter(n => n.zone === zone.id);
    if (pool.length && rng.chance(0.5)) named = rng.pick(pool);
  }

  for (let i = 0; i < packSize; i++) {
    const species = named ? named.base : pick.id;
    const lv = named ? named.level : level;
    const m = makeMonster(species, lv, {
      rng, x: x + rng.float(-1.6, 1.6), y: y + rng.float(-1.6, 1.6),
      tier: named ? named.tier : tierRoll.tier,
      name: named?.name, title: named?.title, namedId: named?.id,
    });
    if (named) {
      applyMods(m, named.mods ?? []);
      m.namedId = named.id;
      m.xpValue = Math.round(m.xpValue * 3.2);
    }
    group.push(m);
  }
  return group;
}

// Guaranteed named encounters at boss POIs.
export function makeNamedEncounter(game, namedDef, x, y) {
  const rng = game.rng;
  const m = makeMonster(namedDef.base, namedDef.level, {
    rng, x, y, name: namedDef.name, title: namedDef.title, tier: namedDef.tier, namedId: namedDef.id,
  });
  applyMods(m, namedDef.mods ?? []);
  m.boss = true;
  m.aggro = 12;
  m.xpValue = Math.round(m.xpValue * 4);
  return m;
}

export function packSizeFor(tier) {
  return { normal: [1, 1], elite: [2, 4], rare: [1, 2], unique: [1, 1], legendary: [1, 1], boss: [1, 1] }[tier] ?? [1, 1];
}
