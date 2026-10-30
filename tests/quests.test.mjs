import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS } from '../src/data/quests.js';
import { acceptQuest, emit, recheckAll, progressFor, questState, availableFrom } from '../src/systems/quests.js';
import { addItem, countItem } from '../src/systems/inventory.js';
import { makeItem } from '../src/data/items.js';
import { makeGame } from './helpers.mjs';

test('main quest chain is well formed', () => {
  const ids = Object.keys(QUESTS);
  for (const id of ids) {
    const q = QUESTS[id];
    assert.equal(q.id, id);
    assert.ok(q.name && q.desc, id + ' is missing text');
    assert.ok(q.objectives?.length, id + ' has no objectives');
    for (const o of q.objectives) assert.ok(o.type && o.target && o.count > 0 && o.label, id + ' bad objective');
    if (q.next) assert.ok(QUESTS[q.next], id + ' points at missing quest ' + q.next);
  }
});

test('m1 completes after choosing a path and talking to Marrow', () => {
  const g = makeGame();
  const p = g.player;
  assert.equal(questState(p, 'm1_washup'), 'available');
  const acc = acceptQuest(g, 'm1_washup');
  assert.equal(acc.ok, true);
  assert.equal(progressFor(p, 'm1_washup')[0], 1, 'role objective did not tick on accept');
  assert.equal(questState(p, 'm1_washup'), 'active');
  emit(g, 'talk', 'marrow', 1);
  assert.equal(questState(p, 'm1_washup'), 'done');
  assert.ok(p.marks >= 15, 'reward marks missing');
  assert.ok(p.quests.done.includes('m1_washup'));
  assert.ok(availableFrom(p, 'marrow').some(q => q.id === 'm2_salvage'));
});

test('m2 tracks kills and collected scrap', () => {
  const g = makeGame();
  const p = g.player;
  acceptQuest(g, 'm1_washup');
  emit(g, 'talk', 'marrow', 1);
  acceptQuest(g, 'm2_salvage');
  const prog = progressFor(p, 'm2_salvage');
  assert.deepEqual(prog, [0, 0]);
  emit(g, 'kill', 'wreck_scavenger', 4);
  assert.equal(prog[0], 4);
  assert.equal(questState(p, 'm2_salvage'), 'active', 'completed before scrap was collected');
  for (let i = 0; i < 3; i++) addItem(p, makeItem('scrap', { rng: g.rng }));
  assert.equal(countItem(p, 'scrap'), 3);
  recheckAll(g);
  assert.equal(prog[1], 3);
  assert.equal(questState(p, 'm2_salvage'), 'done');
  assert.ok(p.flags.unlock_campfire, 'unlock reward missing');
});

test('collect objectives count stacks, not slots', () => {
  const g = makeGame();
  const p = g.player;
  acceptQuest(g, 'm1_washup');
  emit(g, 'talk', 'marrow', 1);
  acceptQuest(g, 'm2_salvage');
  addItem(p, makeItem('scrap', { rng: g.rng, qty: 3 }));
  recheckAll(g);
  assert.equal(progressFor(p, 'm2_salvage')[1], 3);
});
