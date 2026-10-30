// Player and pet factories + the small amount of persistent player state.
import { CLASSES } from '../rules/dnd.js';
import { makeItem, makeUnique, BASES } from '../data/items.js';
import { RNG } from '../core/rng.js';
import { addItem } from '../systems/inventory.js';
import { recalc } from '../systems/sheet.js';
import { PROFESSIONS } from '../data/professions.js';
import { MONSTER_BY_ID, PET_ABILITIES } from '../data/bestiary.js';

export const SAVE_VERSION = 3;

export function createPlayer(role, name = 'Castaway', seed = Date.now()) {
  const cls = CLASSES[role];
  if (!cls) throw new Error('unknown role ' + role);
  const rng = new RNG(seed);
  const p = {
    version: SAVE_VERSION,
    name, role, isPlayer: true,
    level: 1, xp: 0, marks: 0, unspentPoints: 0,
    abilities: { ...cls.start },
    hp: 1, mp: 1,
    equip: {}, inv: [], stash: [],
    skills: {}, abilityTrain: {}, prof: {},
    pets: [], activePet: null,
    quests: { active: [], done: [], progress: {} },
    flags: {}, buffs: [], effects: [], foodBuff: null,
    position: { zone: 'wrack_shore', x: 70, y: 60 },
    playtime: 0, kills: 0, deaths: 0, tamed: 0,
    time: 6 * 60, day: 1,
    farm: { plots: [] },
    log: [],
  };
  for (const id of cls.skills) p.skills[id] = { level: 1, xp: 0 };
  for (const id of [...cls.abilities, 'attack']) p.abilityTrain[id] = { level: 1, xp: 0 };
  for (const id of Object.keys(PROFESSIONS)) p.prof[id] = { level: 1, xp: 0 };
  // Starting kit: the clothes on your back, one ration, one bedroll. Nothing else.
  p.equip.body = makeItem('castaway_rags', { rng, ilvl: 1, rarity: 'common' });
  addItem(p, makeItem('ration', { rng, qty: 1 }));
  addItem(p, makeItem('bedroll', { rng, qty: 1 }));
  p.sheet = recalc(p);
  p.hp = p.sheet.hpMax;
  p.mp = p.sheet.mpMax;
  return p;
}

export function chooseRole(player, role) {
  const cls = CLASSES[role];
  if (!cls) return false;
  player.role = role;
  player.abilities = { ...cls.start };
  player.skills = {};
  for (const id of cls.skills) player.skills[id] = { level: 1, xp: 0 };
  player.abilityTrain = {};
  for (const id of [...cls.abilities, 'attack']) player.abilityTrain[id] = { level: 1, xp: 0 };
  player.sheet = recalc(player);
  player.hp = player.sheet.hpMax;
  player.mp = player.sheet.mpMax;
  player.flags.roleChosen = true;
  return true;
}

export function makePet(speciesId, level = 1, rng = new RNG(1)) {
  const m = MONSTER_BY_ID[speciesId];
  if (!m) return null;
  const names = ['Rust', 'Pip', 'Moth', 'Brack', 'Nub', 'Sable', 'Kettle', 'Wick', 'Grist', 'Tansy'];
  const pet = {
    id: 'pet_' + Math.floor(rng.next() * 1e9).toString(36),
    species: speciesId, name: rng.pick(names), level,
    xp: 0, loyalty: 60, mode: 'follow',
    hp: 0, hpMax: 0, ac: 0, atk: 0, dmg: '', speed: 1,
    abilities: (PET_ABILITIES[speciesId] || ['Peck', 'Scout']).slice(),
    cooldowns: {}, sprite: m.sprite, size: m.size, family: m.family,
  };
  scalePet(pet);
  pet.hp = pet.hpMax;
  return pet;
}

export function scalePet(pet) {
  const m = MONSTER_BY_ID[pet.species];
  const lv = pet.level;
  pet.hpMax = Math.round(m.hp * (1 + (lv - 1) * 0.30) * 1.15);
  pet.ac = m.ac + Math.floor(lv / 3);
  pet.atk = m.atk + Math.floor(lv * 0.55) + 2;
  pet.dmg = m.dmg;
  pet.speed = m.speed * 1.15;
  pet.ranged = m.ranged ?? 0;
  pet.hp = Math.min(pet.hp, pet.hpMax);
}

export function petXp(pet, amount) {
  pet.xp += amount;
  let ups = 0;
  while (pet.xp >= pet.level * 120 && pet.level < 40) {
    pet.xp -= pet.level * 120;
    pet.level++;
    ups++;
    scalePet(pet);
    pet.hp = pet.hpMax;
  }
  return ups;
}

export function makeLegendaryFor(player, rng) {
  const u = makeUnique(rng, player.level);
  return u;
}

// the weapon a fresh player is carrying (used by the prologue)
export function starterWeapon() {
  return BASES.find(b => b.id === 'driftwood_club');
}
