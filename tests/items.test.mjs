import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../src/core/rng.js';
import { makeItem, rollLoot, makeUnique, rollRarity, RARITY_ORDER, itemScore, itemLines, BASES } from '../src/data/items.js';

test('every base can be made and has a usable name and slot', () => {
  const rng = new RNG(11);
  for (const b of BASES) {
    const it = makeItem(b.id, { rng, ilvl: 5 });
    assert.equal(it.base, b.id);
    assert.ok(it.name && it.name.length > 1, 'no name for ' + b.id);
    assert.ok(it.slot, 'no slot for ' + b.id);
    assert.ok(it.value >= 0);
  }
});

test('rarity rises with item level and tier', () => {
  const rng = new RNG(12);
  const count = (n, tier) => {
    const seen = new Set();
    for (let i = 0; i < n; i++) seen.add(rollRarity(rng, tier));
    return seen;
  };
  const low = count(300, 'normal');
  const high = count(300, 'boss');
  assert.ok(high.size >= low.size);
  assert.ok(RARITY_ORDER.length === 5);
});

test('loot rolls always produce a valid item with a rarity colour', () => {
  const rng = new RNG(13);
  const seen = new Set();
  for (let i = 0; i < 4000; i++) {
    const it = rollLoot(rng, 12, { tier: i % 7 === 0 ? 'elite' : 'normal' });
    assert.ok(it?.base && it?.name, 'bad loot item');
    assert.ok(RARITY_ORDER.includes(it.rarity), 'bad rarity ' + it.rarity);
    assert.ok(itemScore(it) >= 0);
    seen.add(it.rarity);
  }
  assert.ok(seen.has('common'));
  assert.ok(seen.size >= 2, 'loot never rolled above common');
});

test('affixes and uniques carry stats', () => {
  const rng = new RNG(14);
  let affixed = 0;
  for (let i = 0; i < 300; i++) {
    const it = rollLoot(rng, 20);
    if (it.rarity !== 'common') {
      assert.ok(it.mods?.length > 0, 'non-common item without affixes');
      assert.ok(itemLines(it).length > 0);
      affixed++;
    }
  }
  assert.ok(affixed > 10);
  const u = makeUnique(rng, 20);
  assert.equal(u.rarity, 'unique');
  assert.ok(u.name);
  assert.ok(u.power?.id, 'unique without a power');
  assert.ok(itemLines(u).length > 0);
});
