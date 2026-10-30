import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, ZONE_BY_ID, ZONE_ORDER } from '../src/data/zones.js';
import { makeGame } from './helpers.mjs';

test('the zone chain is connected end to end', () => {
  assert.equal(ZONE_ORDER.length, 8);
  for (let i = 0; i < ZONES.length - 1; i++) {
    const a = ZONES[i], b = ZONES[i + 1];
    assert.ok(a.pois.some(p => p.kind === 'gate' && p.toZone === b.id), `${a.id} has no gate to ${b.id}`);
    assert.ok(b.pois.some(p => p.kind === 'gate' && p.toZone === a.id), `${b.id} has no gate back to ${a.id}`);
  }
  for (const z of ZONES) {
    assert.ok(z.habitat?.length, z.id + ' has no habitat');
    for (const p of z.pois) {
      assert.ok(p.x > 0 && p.y > 0 && p.x < z.size && p.y < z.size, `${z.id}/${p.id} is outside the map`);
    }
  }
});

test('same seed makes the same zone, different seed does not', () => {
  const g1 = makeGame(5), g2 = makeGame(5), g3 = makeGame(6);
  const a = g1.world.loadZone('wrack_shore', {});
  const b = g2.world.loadZone('wrack_shore', {});
  const c = g3.world.loadZone('wrack_shore', {});
  assert.equal(a.props.length, b.props.length);
  assert.deepEqual(a.props.slice(0, 10), b.props.slice(0, 10));
  assert.notDeepEqual(a.props.slice(0, 10), c.props.slice(0, 10));
  assert.equal(a.nodes.length, b.nodes.length);
});

test('zones have enough ground clutter to look alive', () => {
  const g = makeGame(8);
  for (const id of ZONE_ORDER) {
    const st = g.world.loadZone(id, {});
    assert.ok(st.props.length > 300, `${id} only has ${st.props.length} props`);
    assert.ok(st.patches.length >= 150, `${id} has too few ground patches`);
  }
});

test('arrival point is inside the map and walkable in every zone', () => {
  const g = makeGame(9);
  for (const id of ZONE_ORDER) {
    g.world.loadZone(id, {});
    const p = g.player, z = g.world.zone;
    assert.ok(p.x > 0 && p.x < z.size && p.y > 0 && p.y < z.size, `${id} spawn outside`);
    assert.equal(g.world.blockedAt(p.x, p.y, 0.5), false, `${id} spawn inside an obstacle`);
    assert.equal(g.world.state.pois.some(poi => Math.hypot(poi.x - p.x, poi.y - p.y) < 1), false, `${id} spawn on a POI`);
  }
});

test('the spatial hash agrees with a brute-force obstacle scan', () => {
  const g = makeGame(10);
  const st = g.world.loadZone('sporewood', {});
  const brute = (x, y, r) => st.obstacles.some(o => Math.hypot(x - o.x, y - o.y) < o.r + r);
  const rng = g.rng;
  let blocked = 0;
  for (let i = 0; i < 2000; i++) {
    // stay inside the playable bounds (world.js insets the map by 2 m plus the body radius)
    const x = rng.float(3, 257), y = rng.float(3, 257);
    const a = g.world.blockedAt(x, y, 0.35);
    const b = brute(x, y, 0.35);
    assert.equal(a, b, `grid disagrees at ${x.toFixed(1)},${y.toFixed(1)}`);
    if (a) blocked++;
  }
  assert.ok(blocked > 10, 'test never hit an obstacle');
});

test('travel moves the player between zones and keeps a return gate', () => {
  const g = makeGame(11);
  g.world.loadZone('wrack_shore', {});
  assert.equal(g.world.travel('tidal_flats'), true);
  assert.equal(g.player.position.zone, 'tidal_flats');
  assert.ok(g.world.state.pois.some(p => p.kind === 'gate' && p.toZone === 'wrack_shore'));
  assert.equal(ZONE_BY_ID.tidal_flats.id, 'tidal_flats');
});
