import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, chooseRole } from '../src/entities/player.js';
import { countItem } from '../src/systems/inventory.js';
import { CLASSES } from '../src/rules/dnd.js';

test('a castaway starts with clothing, one ration and a bedroll — nothing else', () => {
  const p = createPlayer('warden', 'Castaway', 7);
  assert.equal(p.marks, 0, 'starts with money');
  assert.equal(p.equip.body?.base, 'castaway_rags', 'not wearing the starting clothes');
  assert.equal(p.equip.weapon, undefined, 'starts with a weapon');
  assert.equal(countItem(p, 'ration'), 1);
  assert.equal(countItem(p, 'bedroll'), 1);
  const carried = p.inv.reduce((n, it) => n + (it.qty ?? 1), 0);
  assert.equal(carried, 2, 'carrying more than the ration and bedroll');
  for (const it of p.inv) assert.ok(['ration', 'bedroll'].includes(it.base), 'unexpected starting item ' + it.base);
});

test('choosing a path keeps the starting kit and grants no gear', () => {
  for (const role of Object.keys(CLASSES)) {
    const p = createPlayer('warden', 'Castaway', 11);
    assert.equal(chooseRole(p, role), true);
    assert.equal(p.equip.body?.base, 'castaway_rags', role + ' lost the starting clothes');
    assert.equal(p.equip.weapon, undefined, role + ' was handed a weapon');
    assert.equal(countItem(p, 'ration'), 1, role + ' lost the ration');
    assert.equal(countItem(p, 'bedroll'), 1, role + ' lost the bedroll');
    assert.equal(p.marks, 0, role + ' was handed money');
  }
});

test('unarmed castaways still fight with fists', () => {
  const p = createPlayer('warden', 'Castaway', 3);
  assert.equal(p.sheet.unarmed, true);
  assert.equal(p.sheet.dmg, '1d3');
  assert.ok(p.sheet.atk >= 0);
  assert.ok(p.hp > 0 && p.mp > 0);
});
