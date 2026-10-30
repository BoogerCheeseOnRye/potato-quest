import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePlots, allPlots, plant, plotState, harvest, water, farmSummary } from '../src/systems/farming.js';
import { addItem, countItem } from '../src/systems/inventory.js';
import { makeItem, BASE_BY_ID } from '../src/data/items.js';
import { PLANTS } from '../src/data/professions.js';
import { makeGame } from './helpers.mjs';

test('camp and haven plots exist and are persistent', () => {
  const g = makeGame();
  const camp = ensurePlots(g.player, 'wrack_shore');
  assert.equal(camp.length, 3);
  const haven = ensurePlots(g.player, 'havenreach');
  assert.equal(haven.length, 8);
  assert.equal(allPlots(g.player).length, 11);
  assert.equal(ensurePlots(g.player, 'wrack_shore'), camp, 'plots were recreated');
});

test('seeds plant, grow on game time and harvest', () => {
  const g = makeGame();
  const p = g.player;
  const [plot] = ensurePlots(p, 'wrack_shore');
  addItem(p, makeItem('seed_root', { rng: g.rng }));
  const seed = BASE_BY_ID.seed_root;
  assert.ok(seed?.plant, 'seed_root is not a seed');
  const def = PLANTS[seed.plant];
  assert.ok(def, 'seed points at a missing plant');

  const res = plant(p, plot, 'seed_root', 0);
  assert.equal(res.ok, true);
  assert.equal(plotState(plot, 0).state, 'growing');
  assert.equal(plotState(plot, plot.readyAt - 1).state, 'growing');
  assert.equal(plotState(plot, plot.readyAt).state, 'ready');

  const xpBefore = p.prof.farming.xp;
  const h = harvest(p, plot, plot.readyAt);
  assert.equal(h.ok, true);
  assert.ok(h.qty >= def.yield[0]);
  assert.equal(countItem(p, def.crop), h.qty);
  assert.ok(p.prof.farming.xp > xpBefore || p.prof.farming.level > 1, 'harvest did not train farming');
  assert.equal(plot.plant, null);
  assert.equal(plotState(plot, plot.readyAt).state, 'empty');
});

test('harvest is refused before the crop is ready', () => {
  const g = makeGame();
  const p = g.player;
  const [plot] = ensurePlots(p, 'wrack_shore');
  addItem(p, makeItem('seed_root', { rng: g.rng }));
  plant(p, plot, 'seed_root', 0);
  const h = harvest(p, plot, 1);
  assert.equal(h.ok, false);
  assert.match(h.why, /ready/i);
});

test('watering shortens the remaining grow time once', () => {
  const g = makeGame();
  const p = g.player;
  p.time = 0;
  const [plot] = ensurePlots(p, 'wrack_shore');
  addItem(p, makeItem('seed_root', { rng: g.rng }));
  plant(p, plot, 'seed_root', 0);
  const before = plot.readyAt;
  assert.equal(water(p, plot).ok, true);
  assert.ok(plot.readyAt < before);
  assert.equal(water(p, plot).ok, false, 'watering twice should do nothing');
});

test('farm summary reports what is growing', () => {
  const g = makeGame();
  const p = g.player;
  const [plot] = ensurePlots(p, 'wrack_shore');
  addItem(p, makeItem('seed_root', { rng: g.rng }));
  plant(p, plot, 'seed_root', 0);
  const sum = farmSummary(p, 0);
  assert.ok(sum.plots >= 3);
  assert.ok(sum.growing >= 1);
});
