import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../src/core/rng.js';
import { xpForLevel, levelForXp, mod, babFor, baseSave, attackRoll, roll, parseDice, trainXpNeeded, trainGain, scaleFactor, CLASSES } from '../src/rules/dnd.js';

test('xp table is monotonic and inverts', () => {
  for (let l = 2; l <= 20; l++) assert.ok(xpForLevel(l) > xpForLevel(l - 1));
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(999), 1);
  assert.equal(levelForXp(1000), 2);
  assert.equal(levelForXp(2999), 2);
  assert.equal(levelForXp(3000), 3);
});

test('ability modifiers follow 3.5', () => {
  assert.equal(mod(1), -5);
  assert.equal(mod(8), -1);
  assert.equal(mod(10), 0);
  assert.equal(mod(11), 0);
  assert.equal(mod(18), 4);
});

test('BAB and saves grow with class tables', () => {
  assert.equal(babFor(CLASSES.warden, 1), 1);
  assert.equal(babFor(CLASSES.warden, 4), 4);
  assert.equal(babFor(CLASSES.technosavant, 1), 0);
  assert.equal(babFor(CLASSES.technosavant, 4), 2);
  assert.equal(baseSave(CLASSES.warden, 1, 'fort'), 2);
  assert.equal(baseSave(CLASSES.technosavant, 1, 'will'), 2);
});

test('attack rolls hit on a high bonus and miss on a high AC', () => {
  const rng = new RNG(7);
  let hits = 0;
  for (let i = 0; i < 200; i++) if (attackRoll(rng, 50, 5).hit) hits++;
  assert.ok(hits >= 188, 'only ' + hits + '/200 hit with +50');
  let misses = 0;
  for (let i = 0; i < 200; i++) if (!attackRoll(rng, -20, 60).hit) misses++;
  assert.ok(misses >= 188, 'only ' + misses + '/200 missed with AC 60');
  const nat20 = attackRoll({ int: () => 20 }, 0, 99);
  assert.ok(nat20.hit, 'natural 20 always hits');
});

test('dice parsing and rolls stay in range', () => {
  assert.deepEqual(parseDice('2d6+3'), { count: 2, sides: 6, bonus: 3 });
  const rng = new RNG(3);
  for (let i = 0; i < 500; i++) {
    const r = roll('2d6+3', rng).sum;
    assert.ok(r >= 5 && r <= 15, 'roll out of range: ' + r);
  }
});

test('use-based training levels up after enough xp', () => {
  const skill = { level: 1, xp: 0 };
  let ups = 0;
  for (let i = 0; i < 100; i++) ups += trainGain(skill, 20);
  assert.ok(skill.level > 1, 'skill never levelled');
  assert.ok(ups > 0);
  assert.ok(trainXpNeeded(5) > trainXpNeeded(1));
});

test('monster scaling is linear and positive', () => {
  assert.equal(scaleFactor(1), 1);
  assert.ok(scaleFactor(10) > scaleFactor(5));
});
