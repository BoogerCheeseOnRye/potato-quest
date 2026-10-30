import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../src/core/rng.js';
import { spawnTable, rollTier, makeSpawnGroup, makeNamedEncounter, TIER_RATES, levelForSpawn } from '../src/systems/spawn.js';
import { NAMED } from '../src/data/bestiary.js';
import { ZONES, ZONE_BY_ID } from '../src/data/zones.js';
import { makeGame } from './helpers.mjs';

test('every zone with wildlife has a spawn table', () => {
  for (const z of ZONES) {
    const table = spawnTable(z, 1);
    if (z.safe) continue;
    assert.ok(table.length > 0, z.id + ' cannot spawn anything');
    for (const t of table) assert.ok(t.id && t.w > 0);
  }
});

test('tier rates are Diablo-ish and match the published table', () => {
  const rng = new RNG(21);
  const zone = ZONE_BY_ID.rustfield;
  const n = 30000;
  const counts = { normal: 0, elite: 0, rare: 0, unique: 0, legendary: 0 };
  for (let i = 0; i < n; i++) counts[rollTier(rng, zone, 1).tier]++;
  assert.ok(Math.abs(counts.elite / n - TIER_RATES.elite) < 0.012, 'elite rate ' + counts.elite / n);
  assert.ok(counts.rare / n < 0.03, 'rares are not rare');
  assert.ok(counts.normal / n > 0.85, 'too many champions');
  assert.ok(counts.unique < counts.rare);
});

test('pack sizes and levels stay inside the zone band', () => {
  const g = makeGame(22);
  const zone = ZONE_BY_ID.sporewood;
  for (let i = 0; i < 60; i++) {
    const lv = levelForSpawn(zone, 10, g.rng);
    assert.ok(lv >= zone.band[0] && lv <= zone.band[1] + 1, 'level ' + lv + ' outside band');
    const group = makeSpawnGroup(g, zone, 50, 50);
    assert.ok(group.length >= 1 && group.length <= 4);
    for (const m of group) assert.equal(m.kind, 'monster');
  }
});

test('named encounters are bosses with mods and triple xp', () => {
  const g = makeGame(23);
  const def = NAMED[0];
  const m = makeNamedEncounter(g, def, 10, 10);
  assert.equal(m.boss, true);
  assert.equal(m.name, def.name);
  assert.equal(m.namedId, def.id);
  assert.ok(m.hpMax > 0);
});

test('every named spawn points at a real base creature and zone', () => {
  for (const n of NAMED) {
    assert.ok(ZONE_BY_ID[n.zone], n.id + ' has unknown zone');
    assert.ok(n.level > 0);
    assert.ok(n.base);
  }
});
