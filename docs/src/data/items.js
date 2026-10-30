// Items: D&D 3.5 stat lines wearing Diablo rarity clothes.
// Bases are real-ish gear; affixes are rolled per instance from the base and ilvl.
import { RNG } from '../core/rng.js';

export const RARITY = {
  common:    { id: 'common',    name: 'Common',    color: '#c9d6da', affixes: [0, 0], weight: 100, mult: 1.0 },
  magic:     { id: 'magic',     name: 'Magic',     color: '#5aa9ff', affixes: [1, 2], weight: 34,  mult: 1.8 },
  rare:      { id: 'rare',      name: 'Rare',      color: '#d8c14a', affixes: [2, 4], weight: 8,   mult: 3.2 },
  unique:    { id: 'unique',    name: 'Unique',    color: '#e0892a', affixes: [3, 5], weight: 1.4, mult: 6.0 },
  legendary: { id: 'legendary', name: 'Legendary', color: '#ff7a2a', affixes: [4, 6], weight: 0.18, mult: 12.0 },
};
export const RARITY_ORDER = ['common', 'magic', 'rare', 'unique', 'legendary'];

export const SLOTS = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'ring', 'charm'];
export const SLOT_NAMES = { weapon: 'Weapon', offhand: 'Off-hand', head: 'Head', body: 'Body', hands: 'Hands', feet: 'Feet', ring: 'Ring', charm: 'Charm' };

// base: { id, name, slot, kind, dmg, crit, mult, ac, armorType, req, value, icon, stats, tags }
export const BASES = [
  // ---- weapons
  { id: 'driftwood_club', name: 'Driftwood Club', slot: 'weapon', kind: 'club', dmg: '1d6', crit: 20, mult: 2, value: 4, icon: '🪵', tags: ['blunt', 'simple'], desc: 'Heavy, wet, and better than fists.' },
  { id: 'rusted_blade', name: 'Rusted Blade', slot: 'weapon', kind: 'longsword', dmg: '1d8', crit: 19, mult: 2, value: 12, icon: '🗡️', tags: ['blade', 'martial'] },
  { id: 'slice_wire', name: 'Slice Wire', slot: 'weapon', kind: 'dagger', dmg: '1d4', crit: 19, mult: 3, value: 16, icon: '🔪', tags: ['blade', 'finesse', 'light'], stats: { critRange: 1 } },
  { id: 'thorn_staff', name: 'Thorn Staff', slot: 'weapon', kind: 'staff', dmg: '1d6', crit: 20, mult: 2, value: 18, icon: '🌿', tags: ['staff', 'simple'], stats: { spellDmg: 2 } },
  { id: 'arc_wand', name: 'Arc Wand', slot: 'weapon', kind: 'wand', dmg: '1d4', crit: 20, mult: 2, value: 20, icon: '⚡', tags: ['wand', 'focus'], stats: { spellDmg: 3, mp: 4 } },
  { id: 'scrap_gun', name: 'Scrap Gun', slot: 'weapon', kind: 'gun', dmg: '1d8', crit: 20, mult: 2, value: 26, icon: '🔧', tags: ['gun', 'ranged', 'martial'], stats: { range: 6 } },
  { id: 'coil_spear', name: 'Coil Spear', slot: 'weapon', kind: 'spear', dmg: '1d10', crit: 20, mult: 3, value: 44, icon: '🔱', tags: ['polearm', 'martial'], stats: { reach: 1 } },
  { id: 'salvage_axe', name: 'Salvage Axe', slot: 'weapon', kind: 'axe', dmg: '1d10', crit: 20, mult: 3, value: 38, icon: '🪓', tags: ['axe', 'martial'] },
  { id: 'static_rifle', name: 'Static Rifle', slot: 'weapon', kind: 'rifle', dmg: '2d6', crit: 19, mult: 2, value: 90, icon: '🔫', tags: ['gun', 'ranged', 'martial'], stats: { range: 12, spellDmg: 4 } },
  { id: 'spire_edge', name: 'Spire Edge', slot: 'weapon', kind: 'greatsword', dmg: '2d8', crit: 19, mult: 2, value: 120, icon: '⚔️', tags: ['blade', 'martial', 'twohand'], stats: { str: 2 } },
  // ---- armour
  { id: 'threadbare_robe', name: 'Threadbare Robe', slot: 'body', kind: 'robe', ac: 1, armorType: 'none', value: 6, icon: '👘', tags: ['cloth'], stats: { mp: 3 } },
  { id: 'hide_vest', name: 'Hide Vest', slot: 'body', kind: 'leather', ac: 2, armorType: 'light', value: 10, icon: '🦺', tags: ['leather'] },
  { id: 'scav_leathers', name: 'Scavenger Leathers', slot: 'body', kind: 'leather', ac: 3, armorType: 'light', value: 18, icon: '🥼', tags: ['leather'], stats: { stealth: 1 } },
  { id: 'patchwork_mail', name: 'Patchwork Mail', slot: 'body', kind: 'chain', ac: 4, armorType: 'medium', value: 26, icon: '🧥', tags: ['mail'], stats: { dexCap: -1 } },
  { id: 'rig_harness', name: 'Rig Harness', slot: 'body', kind: 'leather', ac: 3, armorType: 'light', value: 24, icon: '🎽', tags: ['leather'], stats: { tech: 1 } },
  { id: 'plated_shell', name: 'Plated Shell', slot: 'body', kind: 'plate', ac: 6, armorType: 'heavy', value: 80, icon: '🛡️', tags: ['plate'], stats: { dexCap: -3 } },
  { id: 'feral_cloak', name: 'Feral Cloak', slot: 'body', kind: 'leather', ac: 4, armorType: 'medium', value: 64, icon: '🧣', tags: ['leather'], stats: { wis: 1, tame: 2 } },
  { id: 'rusted_helm', name: 'Rusted Helm', slot: 'head', kind: 'helm', ac: 1, armorType: 'light', value: 8, icon: '⛑️', tags: ['metal'] },
  { id: 'wreck_hood', name: 'Wreckdiver Hood', slot: 'head', kind: 'hood', ac: 1, armorType: 'light', value: 14, icon: '🎩', tags: ['cloth'], stats: { perception: 2 } },
  { id: 'antenna_crown', name: 'Antenna Crown', slot: 'head', kind: 'circlet', ac: 0, armorType: 'none', value: 70, icon: '👑', tags: ['focus'], stats: { int: 2, mp: 6 } },
  { id: 'wrapped_hands', name: 'Wrapped Hands', slot: 'hands', kind: 'gloves', ac: 0, armorType: 'light', value: 5, icon: '🧤', tags: ['cloth'] },
  { id: 'grip_gauntlets', name: 'Grip Gauntlets', slot: 'hands', kind: 'gloves', ac: 1, armorType: 'light', value: 20, icon: '🧤', tags: ['leather'], stats: { str: 1 } },
  { id: 'worn_boots', name: 'Worn Boots', slot: 'feet', kind: 'boots', ac: 0, armorType: 'light', value: 5, icon: '🥾', tags: ['leather'], stats: { move: 1 } },
  { id: 'tide_striders', name: 'Tide Striders', slot: 'feet', kind: 'boots', ac: 1, armorType: 'light', value: 34, icon: '🥾', tags: ['leather'], stats: { move: 3, swim: 1 } },
  { id: 'wooden_buckler', name: 'Wooden Buckler', slot: 'offhand', kind: 'shield', ac: 1, value: 8, icon: '🪃', tags: ['shield'] },
  { id: 'scrap_shield', name: 'Scrap Shield', slot: 'offhand', kind: 'shield', ac: 2, value: 22, icon: '🛡️', tags: ['shield'], stats: { block: 10 } },
  { id: 'insulator_charm', name: 'Insulator Charm', slot: 'charm', kind: 'charm', value: 18, icon: '🔮', tags: ['focus'], stats: { resist: { elec: 10 }, mp: 2 } },
  { id: 'seed_pouch', name: 'Seed Pouch', slot: 'charm', kind: 'charm', value: 12, icon: '🌱', tags: ['tool'], stats: { farming: 2 } },
  { id: 'toolkit', name: 'Toolkit', slot: 'charm', kind: 'charm', value: 16, icon: '🧰', tags: ['tool'], stats: { tech: 2, smithing: 1 } },
  { id: 'throwing_knives', name: 'Throwing Knives', slot: 'offhand', kind: 'thrown', ac: 0, value: 10, icon: '🎯', tags: ['thrown'], stats: { range: 5 } },
  { id: 'copper_ring', name: 'Copper Ring', slot: 'ring', kind: 'ring', value: 10, icon: '💍', tags: ['jewelry'], stats: { con: 1 } },
  { id: 'signal_ring', name: 'Signal Ring', slot: 'ring', kind: 'ring', value: 40, icon: '💍', tags: ['jewelry'], stats: { int: 1, mp: 4 } },
  // ---- clothing (starting kit: no armour, no weapon) ----
  { id: 'castaway_rags', name: 'Castaway Rags', slot: 'body', kind: 'cloth', ac: 0, armorType: 'none', value: 0, icon: '👕', tags: ['cloth'], desc: 'What the sea left you. Salt-stiff, torn, and yours.' },
  { id: 'bedroll', name: 'Bedroll', slot: 'none', kind: 'tool', value: 2, icon: '🛏️', tags: ['bed', 'tool'], stack: 1, desc: 'Oilcloth and a thin blanket. Sleep through the night, anywhere the dark is quiet.' },
  // ---- consumables, materials & seeds (not equippable)
  { id: 'bandage', name: 'Bandage', slot: 'none', kind: 'consumable', value: 3, icon: '🩹', tags: ['heal'], use: { heal: '1d8+2' }, stack: 20 },
  { id: 'ration', name: "Spud Ration", slot: 'none', kind: 'food', value: 1, icon: '🥔', tags: ['food', 'spud'], use: { heal: '1d4', buff: { stat: 'con', value: 1, secs: 240 } }, stack: 5, desc: 'A cold boiled potato and a heel of hard bread. One meal, if you are careful.' },
  { id: 'salve', name: 'Herb Salve', slot: 'none', kind: 'consumable', value: 6, icon: '🧪', tags: ['heal'], use: { heal: '2d8+3' }, stack: 20 },
  { id: 'tonic', name: 'Static Tonic', slot: 'none', kind: 'consumable', value: 8, icon: '⚗️', tags: ['mana'], use: { mp: '1d6+4' }, stack: 20 },
  { id: 'grilled_fish', name: 'Grilled Fish', slot: 'none', kind: 'food', value: 5, icon: '🐟', tags: ['food'], use: { heal: '1d6', buff: { stat: 'con', value: 1, secs: 300 } }, stack: 10 },
  { id: 'shore_stew', name: 'Spud & Shore Stew', slot: 'none', kind: 'food', value: 12, icon: '🍲', tags: ['food', 'spud'], use: { heal: '2d6', buff: { stat: 'str', value: 2, secs: 600 } }, stack: 10 },
  { id: 'spore_tea', name: 'Spore Tea', slot: 'none', kind: 'food', value: 16, icon: '🍵', tags: ['food'], use: { mp: '2d6', buff: { stat: 'wis', value: 2, secs: 600 } }, stack: 10 },
  { id: 'scrap', name: 'Scrap Metal', slot: 'none', kind: 'material', value: 2, icon: '⚙️', tags: ['scrap'], stack: 200 },
  { id: 'alloy', name: 'Salvaged Alloy', slot: 'none', kind: 'material', value: 9, icon: '🔩', tags: ['scrap', 'alloy'], stack: 200 },
  { id: 'fiber', name: 'Fiber', slot: 'none', kind: 'material', value: 1, icon: '🧵', tags: ['fiber'], stack: 200 },
  { id: 'hide', name: 'Raw Hide', slot: 'none', kind: 'material', value: 3, icon: '🟫', tags: ['hide'], stack: 200 },
  { id: 'herb', name: 'Bitter Herb', slot: 'none', kind: 'material', value: 3, icon: '🌿', tags: ['herb'], stack: 200 },
  { id: 'spore', name: 'Glow Spore', slot: 'none', kind: 'material', value: 6, icon: '🍄', tags: ['herb', 'spore'], stack: 200 },
  { id: 'raw_fish', name: 'Raw Fish', slot: 'none', kind: 'material', value: 2, icon: '🐠', tags: ['fish'], stack: 200 },
  { id: 'core_shard', name: 'Core Shard', slot: 'none', kind: 'material', value: 25, icon: '💠', tags: ['core'], stack: 200 },
  { id: 'seed_grain', name: 'Grain Seed', slot: 'none', kind: 'seed', value: 4, icon: '🌾', tags: ['seed'], plant: 'grain', growHours: 6, stack: 50 },
  { id: 'seed_root', name: 'Root Seed', slot: 'none', kind: 'seed', value: 5, icon: '🥕', tags: ['seed'], plant: 'root', growHours: 4, stack: 50 },
  { id: 'seed_berry', name: 'Berry Seed', slot: 'none', kind: 'seed', value: 6, icon: '🫐', tags: ['seed'], plant: 'berry', growHours: 8, stack: 50 },
  { id: 'grain', name: 'Grain', slot: 'none', kind: 'crop', value: 6, icon: '🌾', tags: ['crop'], stack: 200 },
  { id: 'root', name: 'Marrow Root', slot: 'none', kind: 'crop', value: 7, icon: '🥕', tags: ['crop'], stack: 200 },
  { id: 'berry', name: 'Glowberry', slot: 'none', kind: 'crop', value: 9, icon: '🫐', tags: ['crop'], stack: 200 },
  // ---- the potato: food, seed, currency of the new world ----
  { id: 'spud', name: 'Wild Spud', slot: 'none', kind: 'material', value: 1, icon: '🥔', tags: ['crop', 'spud'], stack: 200, desc: 'Grows in salt shingle and ash. Bitter raw, filling cooked.' },
  { id: 'seed_potato', name: 'Seed Potato', slot: 'none', kind: 'seed', value: 4, icon: '🌱', tags: ['seed', 'spud'], plant: 'potato', growHours: 3, stack: 50 },
  { id: 'potato', name: 'Potato', slot: 'none', kind: 'crop', value: 6, icon: '🥔', tags: ['crop', 'spud'], stack: 200 },
  { id: 'baked_potato', name: 'Baked Potato', slot: 'none', kind: 'food', value: 8, icon: '🍠', tags: ['food', 'spud'], use: { heal: '1d6+2', buff: { stat: 'con', value: 1, secs: 420 } }, stack: 10, desc: 'Ash-baked, split, salted. The best thing in the world, out here.' },
];
export const BASE_BY_ID = Object.fromEntries(BASES.map(b => [b.id, b]));

// ---------- affixes ----------
// stat -> how it is applied to the player sheet (see systems/sheet.js)
export const AFFIXES = [
  { id: 'heavy', name: 'Heavy', kind: 'prefix', stats: [{ stat: 'dmg', min: 1, max: 3, per: 0.35 }], tags: ['weapon'] },
  { id: 'keen', name: 'Keen', kind: 'prefix', stats: [{ stat: 'critRange', min: 1, max: 1 }], tags: ['weapon'] },
  { id: 'brutal', name: 'Brutal', kind: 'prefix', stats: [{ stat: 'str', min: 1, max: 2, per: 0.06 }], tags: ['weapon', 'armor'] },
  { id: 'nimble', name: 'Nimble', kind: 'prefix', stats: [{ stat: 'dex', min: 1, max: 2, per: 0.06 }], tags: ['armor', 'jewelry'] },
  { id: 'vital', name: 'Vital', kind: 'prefix', stats: [{ stat: 'hp', min: 4, max: 8, per: 1.6 }], tags: ['armor', 'jewelry'] },
  { id: 'stout', name: 'Stout', kind: 'prefix', stats: [{ stat: 'con', min: 1, max: 2, per: 0.05 }], tags: ['armor'] },
  { id: 'warded', name: 'Warded', kind: 'prefix', stats: [{ stat: 'resist', min: 4, max: 8, per: 1.0 }], tags: ['armor', 'offhand'] },
  { id: 'swift', name: 'Swift', kind: 'prefix', stats: [{ stat: 'move', min: 1, max: 2 }], tags: ['feet', 'armor'] },
  { id: 'arcane', name: 'Arcane', kind: 'prefix', stats: [{ stat: 'mp', min: 3, max: 7, per: 1.2 }], tags: ['armor', 'jewelry', 'weapon'] },
  { id: 'salvaged', name: 'Salvaged', kind: 'prefix', stats: [{ stat: 'ac', min: 1, max: 2 }], tags: ['armor', 'offhand'] },
  { id: 'gleaming', name: 'Gleaming', kind: 'prefix', stats: [{ stat: 'spellDmg', min: 1, max: 3, per: 0.3 }], tags: ['weapon', 'jewelry'] },
  { id: 'hunters', name: "Hunter's", kind: 'prefix', stats: [{ stat: 'survival', min: 1, max: 2 }], tags: ['armor', 'jewelry'] },

  { id: 'of_the_shore', name: 'of the Shore', kind: 'suffix', stats: [{ stat: 'ac', min: 1, max: 2 }, { stat: 'hp', min: 2, max: 5, per: 0.8 }] },
  { id: 'of_static', name: 'of Static', kind: 'suffix', stats: [{ stat: 'resist', min: 5, max: 10, per: 0.8 }] },
  { id: 'of_the_deep', name: 'of the Deep', kind: 'suffix', stats: [{ stat: 'mp', min: 3, max: 6, per: 0.8 }] },
  { id: 'of_ruin', name: 'of Ruin', kind: 'suffix', stats: [{ stat: 'dmg', min: 2, max: 4, per: 0.4 }] },
  { id: 'of_growth', name: 'of Growth', kind: 'suffix', stats: [{ stat: 'con', min: 1, max: 1 }, { stat: 'hp', min: 3, max: 6, per: 0.5 }] },
  { id: 'of_the_machine', name: 'of the Machine', kind: 'suffix', stats: [{ stat: 'tech', min: 1, max: 2 }] },
  { id: 'of_endurance', name: 'of Endurance', kind: 'suffix', stats: [{ stat: 'hp', min: 5, max: 10, per: 1.2 }] },
  { id: 'of_precision', name: 'of Precision', kind: 'suffix', stats: [{ stat: 'critRange', min: 1, max: 1 }] },
  { id: 'of_the_storm', name: 'of the Storm', kind: 'suffix', stats: [{ stat: 'spellDmg', min: 2, max: 4, per: 0.3 }, { stat: 'resist', min: 3, max: 6, per: 0.5 }] },
  { id: 'of_nine_lives', name: 'of Nine Lives', kind: 'suffix', stats: [{ stat: 'tame', min: 1, max: 3 }] },
];

// Named uniques/legendaries. They roll above their base and carry a power.
export const UNIQUES = [
  { id: 'tidewrack', name: 'Tidewrack, the First Lesson', base: 'rusted_blade', ilvl: 4, rarity: 'unique', flavor: 'Someone scratched nine notches in the guard. There is room for more.', power: { id: 'riposte', name: 'Riposte', desc: '10% chance to counterattack when hit.' } },
  { id: 'hollow_lantern', name: 'The Hollow Lantern', base: 'arc_wand', ilvl: 6, rarity: 'unique', flavor: 'It lights only dead things.', power: { id: 'graveLight', name: 'Grave Light', desc: 'Arc Bolt chains to one extra target.' } },
  { id: 'saltbound', name: 'Saltbound Carapace', base: 'plated_shell', ilvl: 9, rarity: 'unique', flavor: 'The sea refused it. So did the owner.', power: { id: 'brineGuard', name: 'Brine Guard', desc: '+25% armour while standing in water.' } },
  { id: 'skydrinker', name: 'Skydrinker', base: 'coil_spear', ilvl: 12, rarity: 'legendary', flavor: 'A relay spire fell here. The spear remembers the fall.', power: { id: 'arcReach', name: 'Arc Reach', desc: 'Attacks arc to a second enemy for 40% damage.' } },
  { id: 'pale_circuit', name: 'The Pale Circuit', base: 'antenna_crown', ilvl: 15, rarity: 'legendary', flavor: 'Wearing it, you hear the grid breathe.', power: { id: 'gridsight', name: 'Gridsight', desc: 'Reveals rare spawns on the zone map.' } },
  { id: 'last_harvest', name: 'The Last Harvest', base: 'feral_cloak', ilvl: 18, rarity: 'legendary', flavor: 'Every field it has crossed still grows.', power: { id: 'wildGrowth', name: 'Wild Growth', desc: 'Crops grow twice as fast; pets gain +2 levels.' } },
];

const RARE_PREFIX = ['Ashen', 'Brine', 'Cinder', 'Coil', 'Drift', 'Ember', 'Glass', 'Hollow', 'Iron', 'Marrow', 'Pale', 'Rust', 'Salt', 'Silt', 'Spore', 'Tide', 'Wrack'];
const RARE_SUFFIX = ['Answer', 'Bargain', 'Cradle', 'Debt', 'Echo', 'Hymn', 'Knot', 'Ledger', 'Mercy', 'Oath', 'Ruin', 'Signal', 'Song', 'Vow', 'Wake'];

export function rollRarity(rng, tier = 'normal') {
  // tier shifts the table upward: normal < magic < rare < unique
  const boost = { normal: 0, elite: 2.2, rare: 6, unique: 14, legendary: 30, boss: 26 }[tier] ?? 0;
  const table = RARITY_ORDER.map(id => ({ id, w: RARITY[id].weight * (id === 'common' ? 1 : 1 + boost) }));
  return rng.weighted(table).id;
}

export function makeItem(baseId, opts = {}) {
  const base = typeof baseId === 'string' ? BASE_BY_ID[baseId] : baseId;
  if (!base) throw new Error('unknown base ' + baseId);
  const rng = opts.rng ?? new RNG(1);
  const ilvl = Math.max(1, opts.ilvl ?? 1);
  const rarity = opts.rarity ?? 'common';
  const item = {
    uid: opts.uid ?? (base.id + '-' + Math.floor(rng.next() * 1e9).toString(36)),
    base: base.id, name: base.name, slot: base.slot, kind: base.kind,
    rarity, ilvl, icon: base.icon, tags: base.tags ?? [], mods: [], power: null,
    value: Math.round((base.value ?? 1) * (RARITY[rarity]?.mult ?? 1) * (0.8 + ilvl * 0.08)),
    stack: base.stack ?? 1, qty: opts.qty ?? 1,
  };
  if (base.stats) item.baseStats = { ...base.stats };
  if (base.dmg) { item.dmg = base.dmg; item.crit = base.crit ?? 20; item.mult = base.mult ?? 2; }
  if (base.ac != null) item.ac = base.ac;

  const [minA, maxA] = RARITY[rarity]?.affixes ?? [0, 0];
  const count = opts.affixCount ?? rng.int(minA, maxA);
  const prefixPool = AFFIXES.filter(a => a.kind === 'prefix' && (!a.tags || a.tags.includes(base.slot) || a.tags.includes(base.kind)));
  const suffixPool = AFFIXES.filter(a => a.kind === 'suffix');
  const pre = rng.shuffle(prefixPool), suf = rng.shuffle(suffixPool);
  for (let i = 0; i < count; i++) {
    const a = i % 2 === 0 ? (pre.shift() ?? suf.shift()) : (suf.shift() ?? pre.shift());
    if (!a) break;
    for (const s of a.stats) {
      const scale = 1 + (ilvl - 1) * (s.per ?? 0);
      let v = Math.max(1, Math.round(rng.float(s.min, s.max) * scale));
      if (s.stat === 'critRange') v = 1;
      if (s.stat === 'move' && v > 3) v = 3;
      item.mods.push({ stat: s.stat, value: v, src: a.name });
    }
  }
  if (rarity === 'rare' || rarity === 'unique' || rarity === 'legendary') {
    item.name = `${rng.pick(RARE_PREFIX)} ${base.name.split(' ').pop()} ${rng.pick(RARE_SUFFIX)}`;
  } else if (rarity === 'magic') {
    const mods = item.mods.map(m => m.src).filter(Boolean);
    item.name = `${mods[0] ? mods[0] + ' ' : ''}${base.name}${mods[1] ? ' ' + mods[1] : ''}`;
  }
  if (opts.unique) {
    const u = opts.unique;
    item.uniqueId = u.id; item.name = u.name; item.rarity = u.rarity; item.power = u.power;
    item.flavor = u.flavor; item.ilvl = u.ilvl; item.value = Math.round(200 * RARITY[u.rarity].mult);
  }
  return item;
}

// Loot roller: pick a base appropriate to level, then rarity.
export function rollLoot(rng, level, opts = {}) {
  const pool = opts.pool?.length
    ? opts.pool.map(id => BASE_BY_ID[id]).filter(Boolean)
    : BASES.filter(b => b.slot !== 'none' && (b.tags?.includes('jewelry') ? level >= 4 : true));
  const base = rng.pick(pool);
  const rarity = opts.rarity ?? rollRarity(rng, opts.tier ?? 'normal');
  return makeItem(base.id, { rng, ilvl: Math.max(1, level + rng.int(-1, 1)), rarity });
}

export function makeUnique(rng, level) {
  const avail = UNIQUES.filter(u => u.ilvl <= level + 4);
  if (!avail.length) return null;
  const u = rng.pick(avail);
  return makeItem(u.base, { rng, ilvl: u.ilvl, rarity: u.rarity, unique: u });
}

export function itemColor(item) { return RARITY[item?.rarity]?.color ?? '#c9d6da'; }
export function isEquipment(item) { return item && item.slot !== 'none'; }

// Human readable stat lines for tooltips/sheets.
const STAT_LABEL = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
  hp: 'Max HP', mp: 'Max MP', ac: 'Armour', dmg: 'Damage', critRange: 'Crit range', move: 'Move speed',
  resist: 'Resist all', spellDmg: 'Spell damage', range: 'Range', reach: 'Reach', block: 'Block', swim: 'Swim',
  stealth: 'Stealth', tech: 'Tech', tame: 'Animal Handling', survival: 'Survival', farming: 'Farming', smithing: 'Smithing', dexCap: 'Dex cap',
};
export function statLabel(s) { return STAT_LABEL[s] ?? s; }

export function itemLines(item) {
  const lines = [];
  if (item.dmg) lines.push(`Damage ${item.dmg} · crit ${item.crit ?? 20}–20 ×${item.mult ?? 2}`);
  if (item.ac) lines.push(`Armour +${item.ac}`);
  for (const m of item.mods ?? []) {
    let v = m.value;
    if (m.stat === 'critRange') lines.push(`Crit threat +${v}`);
    else if (m.stat === 'resist') lines.push(`Resist +${v}%`);
    else if (m.stat === 'move') lines.push(`Movement +${v}%`);
    else if (['stealth', 'tech', 'tame', 'survival', 'farming', 'smithing'].includes(m.stat)) lines.push(`${statLabel(m.stat)} +${v}`);
    else lines.push(`${statLabel(m.stat)} +${v}`);
  }
  if (item.baseStats) for (const [k, v] of Object.entries(item.baseStats)) {
    if (k === 'critRange') continue;
    lines.push(`${statLabel(k)} ${typeof v === 'number' && v > 0 ? '+' : ''}${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  if (item.power) lines.push(`◆ ${item.power.name}: ${item.power.desc}`);
  return lines;
}

export function itemScore(item) {
  if (!item) return 0;
  let s = (item.ac ?? 0) * 4;
  if (item.dmg) { const d = /(\d+)d(\d+)/.exec(item.dmg); s += d ? (+d[1] * (+d[2] + 1) / 2) * 2.2 : 5; }
  for (const m of item.mods ?? []) {
    if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(m.stat)) s += m.value * 5;
    else if (m.stat === 'hp') s += m.value * 0.8;
    else if (m.stat === 'mp') s += m.value * 0.4;
    else s += Math.abs(m.value) * 1.2;
  }
  return s;
}
