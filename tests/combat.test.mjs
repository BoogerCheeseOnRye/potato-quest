import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMonster, playerAttack, applyDamage, monsterAttack, scaleMonster, nearestMonster } from '../src/systems/combat.js';
import { makeGame } from './helpers.mjs';

test('monsters scale with level and keep positive stats', () => {
  const g = makeGame(1);
  const low = makeMonster('rock_crab', 1, { rng: g.rng, x: 0, y: 0 });
  const high = makeMonster('rock_crab', 12, { rng: g.rng, x: 0, y: 0 });
  assert.ok(high.hpMax > low.hpMax);
  assert.ok(high.ac >= low.ac);
  assert.ok(high.atk > low.atk);
  assert.ok(low.hpMax > 0 && low.ac > 0 && low.xpValue > 0);
  scaleMonster(low, 5);
  assert.equal(low.level, 5);
});

test('damage kills a monster and reports the kill once', () => {
  const g = makeGame(2);
  const m = makeMonster('rock_crab', 1, { rng: g.rng, x: 1, y: 1 });
  let kills = 0, xp = 0;
  g.onKill = () => kills++;
  g.grantXp = (n) => { xp += n; };
  const dealt = applyDamage(g, m, m.hpMax + 50, 'physical', g.player);
  assert.ok(dealt > 0);
  assert.equal(m.hp, 0);
  assert.equal(m.dead, true);
  assert.equal(kills, 1);
  assert.ok(xp > 0);
  applyDamage(g, m, 10, 'physical', g.player);
  assert.equal(kills, 1, 'kill fired twice');
});

test('the player cannot hit out of reach', () => {
  const g = makeGame(3);
  const m = makeMonster('rock_crab', 1, { rng: g.rng, x: 9, y: 9 });
  g.entities.push(m);
  const res = playerAttack(g, m);
  assert.equal(res, null);
  assert.equal(m.hp, m.hpMax);
});

test('melee attacks connect in range and cost the monster hp', () => {
  const g = makeGame(4);
  const p = g.player;
  const m = makeMonster('rock_crab', 1, { rng: g.rng, x: p.x + 1, y: p.y });
  g.entities.push(m);
  let hit = false;
  for (let i = 0; i < 40 && m.hp > 0; i++) {
    const r = playerAttack(g, m);
    if (r?.dmg > 0) hit = true;
  }
  assert.ok(hit, 'never landed a hit');
  assert.ok(m.hp < m.hpMax);
});

test('monsters hit the player and the player has isPlayer set', () => {
  const g = makeGame(5);
  const p = g.player;
  assert.equal(p.isPlayer, true);
  const m = makeMonster('wreck_scavenger', 30, { rng: g.rng, x: p.x + 1, y: p.y });
  let damage = 0;
  for (let i = 0; i < 50; i++) {
    const r = monsterAttack(g, m, p);
    if (r?.dmg > 0) damage += r.dmg;
    if (p.hp <= 0) p.hp = p.sheet.hpMax;
  }
  assert.ok(damage > 0, 'a level 30 scavenger never hit a level 1 player');
});

test('nearestMonster ignores the dead and respects radius', () => {
  const g = makeGame(6);
  const p = g.player;
  const near = makeMonster('rock_crab', 1, { rng: g.rng, x: p.x + 2, y: p.y });
  const far = makeMonster('rock_crab', 1, { rng: g.rng, x: p.x + 30, y: p.y });
  const dead = makeMonster('rock_crab', 1, { rng: g.rng, x: p.x + 0.5, y: p.y });
  dead.hp = 0;
  g.entities.push(near, far, dead);
  assert.equal(nearestMonster(g, p, 10), near);
  assert.equal(nearestMonster(g, p, 1), null);
});
