// Shared fake game object for tests: no DOM, no rendering, just state + events.
import { RNG } from '../src/core/rng.js';
import { createPlayer, chooseRole } from '../src/entities/player.js';
import { World } from '../src/world/world.js';
import { ZONE_BY_ID } from '../src/data/zones.js';
import { emit as questEmit } from '../src/systems/quests.js';

export function makeGame(seed = 99, role = 'warden') {
  const game = {
    rng: new RNG(seed),
    worldSeed: seed,
    now: 0,
    entities: [],
    projectiles: [],
    effects: [],
    player: null,
    log() {}, toast() {}, float() {}, fx() {},
    dropLoot() {}, dropMaterial() {}, removeEntity() {}, grantXp() {}, onKill() {},
    signalAvailable() {}, onZoneEnter() {},
  };
  game.player = createPlayer(role, 'Test', seed);
  chooseRole(game.player, role);
  game.player.x = game.player.position.x;
  game.player.y = game.player.position.y;
  game.emit = (type, target, count = 1, meta = {}) => questEmit(game, type, target, count, meta);
  game.world = new World(game);
  game.world.zone = ZONE_BY_ID.wrack_shore;
  game.world.state = null;
  return game;
}

export function loadZone(game, id, opts = {}) {
  game.world.loadZone(id, opts);
  return game.world.state;
}
