// Bestiary. Levels are nominal for the zone they live in; the spawn director
// raises/lowers them toward the player's level inside the zone band.
// hp/dmg are level-1-ish values and get scaled by systems/spawn.js.
export const FAMILIES = {
  beast:     { name: 'Beast',     resist: {},        weak: 'none' },
  vermin:    { name: 'Vermin',    resist: {},        weak: 'none' },
  construct: { name: 'Construct', resist: { poison: 100, bleed: 100 }, weak: 'elec' },
  undead:    { name: 'Undead',    resist: { poison: 100, bleed: 100 }, weak: 'radiant' },
  humanoid:  { name: 'Humanoid',  resist: {},        weak: 'none' },
  spirit:    { name: 'Spirit',    resist: { physical: 40 }, weak: 'elec' },
  flora:     { name: 'Flora',     resist: { poison: 100 }, weak: 'fire' },
};

// habitat tags map onto zone tags in data/zones.js
export const MONSTERS = [
  { id: 'shore_gull', name: 'Spud Gull', family: 'beast', lvl: 1, hp: 4, ac: 11, atk: 0, dmg: '1d2', speed: 1.6, aggro: 3, xp: 6, sprite: 'gull', size: 0.6, habitat: ['shore'], weight: 16, pack: [1, 3], passive: true, tameable: true, drops: [{ id: 'fiber', chance: 0.3 }, { id: 'raw_fish', chance: 0.15 }, { id: 'spud', chance: 0.15 }] },
  { id: 'rock_crab', name: 'Spud Crab', family: 'vermin', lvl: 1, hp: 8, ac: 14, atk: 1, dmg: '1d4', speed: 0.9, aggro: 2.5, xp: 9, sprite: 'crab', size: 0.5, habitat: ['shore', 'tidal'], weight: 18, pack: [1, 2], tameable: true, drops: [{ id: 'scrap', chance: 0.4, qty: [1, 2] }, { id: 'hide', chance: 0.2 }, { id: 'spud', chance: 0.2 }] },
  { id: 'drift_rat', name: 'Drift Rat', family: 'vermin', lvl: 1, hp: 5, ac: 12, atk: 0, dmg: '1d3', speed: 1.5, aggro: 4, xp: 5, sprite: 'rat', size: 0.35, habitat: ['shore', 'ruins'], weight: 14, pack: [2, 4], drops: [{ id: 'fiber', chance: 0.25 }, { id: 'spud', chance: 0.25 }] },
  { id: 'wreck_scavenger', name: 'Wreck Scavenger', family: 'humanoid', lvl: 2, hp: 11, ac: 13, atk: 2, dmg: '1d6', speed: 1.2, aggro: 7, xp: 16, sprite: 'scav', size: 0.9, habitat: ['shore', 'ruins'], weight: 13, pack: [1, 2], drops: [{ id: 'scrap', chance: 0.6, qty: [1, 3] }, { id: 'bandage', chance: 0.2 }, { id: 'spud', chance: 0.3 }, { id: 'rusted_helm', chance: 0.05 }] },
  { id: 'brine_slime', name: 'Brine Slime', family: 'flora', lvl: 2, hp: 14, ac: 9, atk: 1, dmg: '1d4+1', speed: 0.6, aggro: 3, xp: 11, sprite: 'slime', size: 0.7, habitat: ['shore', 'tidal'], weight: 9, drops: [{ id: 'herb', chance: 0.35 }, { id: 'spud', chance: 0.2 }] },

  { id: 'mud_crab', name: 'Mud Crab', family: 'vermin', lvl: 4, hp: 16, ac: 15, atk: 3, dmg: '1d6', speed: 0.8, aggro: 3, xp: 18, sprite: 'crab_big', size: 0.7, habitat: ['tidal'], weight: 18, tameable: true, drops: [{ id: 'hide', chance: 0.5 }, { id: 'scrap', chance: 0.3 }] },
  { id: 'siphon_eel', name: 'Siphon Eel', family: 'beast', lvl: 4, hp: 12, ac: 13, atk: 4, dmg: '1d6+1', speed: 1.4, aggro: 5, xp: 20, sprite: 'eel', size: 1.0, habitat: ['tidal'], weight: 14, drops: [{ id: 'raw_fish', chance: 0.6 }] },
  { id: 'salt_wraith', name: 'Salt Wraith', family: 'undead', lvl: 5, hp: 18, ac: 12, atk: 4, dmg: '1d8', speed: 1.1, aggro: 8, xp: 30, sprite: 'wraith', size: 1.0, habitat: ['tidal', 'ruins'], weight: 7, drops: [{ id: 'tonic', chance: 0.15 }, { id: 'core_shard', chance: 0.04 }] },
  { id: 'glass_heron', name: 'Glass Heron', family: 'beast', lvl: 3, hp: 8, ac: 12, atk: 1, dmg: '1d4', speed: 1.5, aggro: 0, xp: 8, sprite: 'heron', size: 1.2, habitat: ['tidal', 'marsh'], weight: 8, passive: true, flee: true, drops: [{ id: 'fiber', chance: 0.4 }] },

  { id: 'rust_hound', name: 'Rust Hound', family: 'construct', lvl: 6, hp: 20, ac: 15, atk: 5, dmg: '1d8', speed: 1.9, aggro: 10, xp: 34, sprite: 'hound', size: 0.9, habitat: ['ruins'], weight: 16, pack: [1, 3], tameable: true, drops: [{ id: 'scrap', chance: 0.8, qty: [1, 3] }, { id: 'alloy', chance: 0.12 }] },
  { id: 'scav_drone', name: 'Scav Drone', family: 'construct', lvl: 6, hp: 14, ac: 16, atk: 5, dmg: '1d6+2', speed: 1.5, aggro: 9, xp: 30, sprite: 'drone', size: 0.6, flying: true, habitat: ['ruins', 'grid'], weight: 13, drops: [{ id: 'scrap', chance: 0.7 }, { id: 'alloy', chance: 0.1 }, { id: 'core_shard', chance: 0.03 }] },
  { id: 'coil_crawler', name: 'Coil Crawler', family: 'construct', lvl: 7, hp: 24, ac: 14, atk: 5, dmg: '1d8+2', speed: 1.0, aggro: 6, xp: 38, sprite: 'crawler', size: 0.8, habitat: ['ruins', 'grid'], weight: 10, drops: [{ id: 'alloy', chance: 0.2 }, { id: 'scrap', chance: 0.6 }] },
  { id: 'scrap_golem', name: 'Scrap Golem', family: 'construct', lvl: 8, hp: 48, ac: 18, atk: 6, dmg: '2d6', speed: 0.6, aggro: 5, xp: 70, sprite: 'golem', size: 1.6, habitat: ['ruins'], weight: 5, pack: [1, 1], drops: [{ id: 'alloy', chance: 0.7, qty: [1, 2] }, { id: 'core_shard', chance: 0.1 }] },

  { id: 'spore_boar', name: 'Spud Boar', family: 'beast', lvl: 9, hp: 34, ac: 14, atk: 7, dmg: '1d10+2', speed: 1.3, aggro: 6, xp: 44, sprite: 'boar', size: 1.0, habitat: ['forest'], weight: 18, tameable: true, drops: [{ id: 'hide', chance: 0.7 }, { id: 'spore', chance: 0.25 }, { id: 'spud', chance: 0.35 }] },
  { id: 'cap_wolf', name: 'Cap Wolf', family: 'beast', lvl: 10, hp: 30, ac: 15, atk: 8, dmg: '1d8+2', speed: 2.0, aggro: 11, xp: 48, sprite: 'wolf', size: 0.9, habitat: ['forest'], weight: 15, pack: [2, 4], tameable: true, drops: [{ id: 'hide', chance: 0.6 }, { id: 'spore', chance: 0.2 }, { id: 'potato', chance: 0.15 }] },
  { id: 'mycoid_shambler', name: 'Spud Shambler', family: 'flora', lvl: 10, hp: 44, ac: 13, atk: 7, dmg: '1d10', speed: 0.7, aggro: 5, xp: 52, sprite: 'shambler', size: 1.4, habitat: ['forest'], weight: 8, drops: [{ id: 'spore', chance: 0.8, qty: [1, 2] }, { id: 'potato', chance: 0.5, qty: [1, 2] }] },
  { id: 'glow_moth', name: 'Glow Moth', family: 'vermin', lvl: 8, hp: 10, ac: 15, atk: 3, dmg: '1d4', speed: 1.7, aggro: 6, xp: 14, sprite: 'moth', size: 0.4, flying: true, habitat: ['forest', 'marsh'], weight: 9, passive: true, drops: [{ id: 'fiber', chance: 0.5 }, { id: 'spore', chance: 0.15 }] },

  { id: 'cinder_jackal', name: 'Cinder Jackal', family: 'beast', lvl: 12, hp: 40, ac: 15, atk: 9, dmg: '1d10+3', speed: 2.1, aggro: 12, xp: 62, sprite: 'jackal', size: 0.9, habitat: ['ash'], weight: 16, pack: [2, 4], tameable: true, drops: [{ id: 'hide', chance: 0.7 }, { id: 'alloy', chance: 0.15 }, { id: 'potato', chance: 0.15 }] },
  { id: 'ash_nomad', name: 'Ash Nomad', family: 'humanoid', lvl: 12, hp: 42, ac: 16, atk: 9, dmg: '1d10+2', speed: 1.3, aggro: 9, xp: 66, sprite: 'nomad', size: 1.0, habitat: ['ash'], weight: 9, pack: [1, 2], drops: [{ id: 'bandage', chance: 0.3 }, { id: 'salve', chance: 0.15 }, { id: 'baked_potato', chance: 0.25 }, { id: 'throwing_knives', chance: 0.06 }] },
  { id: 'pale_stalker', name: 'Pale Stalker', family: 'undead', lvl: 13, hp: 36, ac: 17, atk: 10, dmg: '1d8+4', speed: 1.6, aggro: 14, xp: 78, sprite: 'stalker', size: 1.0, habitat: ['ash'], weight: 6, drops: [{ id: 'core_shard', chance: 0.08 }, { id: 'salve', chance: 0.2 }] },
  { id: 'ember_wisp', name: 'Ember Wisp', family: 'spirit', lvl: 13, hp: 22, ac: 16, atk: 9, dmg: '2d6', speed: 1.4, aggro: 10, xp: 58, sprite: 'wisp', size: 0.5, flying: true, ranged: 5, habitat: ['ash', 'grid'], weight: 8, drops: [{ id: 'core_shard', chance: 0.06 }] },

  { id: 'arc_mite', name: 'Arc Mite', family: 'construct', lvl: 15, hp: 30, ac: 17, atk: 11, dmg: '1d8+3', speed: 2.2, aggro: 8, xp: 70, sprite: 'mite', size: 0.5, habitat: ['grid', 'ruins'], weight: 16, pack: [2, 5], drops: [{ id: 'scrap', chance: 0.7 }, { id: 'core_shard', chance: 0.05 }] },
  { id: 'sentinel', name: 'Sentinel Frame', family: 'construct', lvl: 16, hp: 66, ac: 19, atk: 12, dmg: '2d8', speed: 0.8, aggro: 9, xp: 120, sprite: 'sentinel', size: 1.6, ranged: 7, habitat: ['grid', 'spire'], weight: 7, drops: [{ id: 'alloy', chance: 0.8, qty: [1, 3] }, { id: 'core_shard', chance: 0.2 }] },
  { id: 'ghost_process', name: 'Ghost Process', family: 'spirit', lvl: 16, hp: 40, ac: 16, atk: 12, dmg: '2d6+2', speed: 1.5, aggro: 12, xp: 96, sprite: 'process', size: 1.1, flying: true, habitat: ['grid', 'spire'], weight: 9, drops: [{ id: 'core_shard', chance: 0.15 }, { id: 'tonic', chance: 0.25 }] },
  { id: 'cable_horror', name: 'Cable Horror', family: 'construct', lvl: 17, hp: 80, ac: 17, atk: 13, dmg: '2d8+2', speed: 1.0, aggro: 8, xp: 140, sprite: 'cable', size: 1.5, habitat: ['grid'], weight: 5, drops: [{ id: 'alloy', chance: 0.9, qty: [2, 3] }, { id: 'core_shard', chance: 0.25 }] },

  { id: 'spire_warden', name: 'Spire Warden', family: 'construct', lvl: 19, hp: 110, ac: 21, atk: 15, dmg: '2d10+4', speed: 0.9, aggro: 10, xp: 220, sprite: 'warden', size: 1.8, ranged: 8, habitat: ['spire'], weight: 4, drops: [{ id: 'alloy', chance: 1, qty: [2, 4] }, { id: 'core_shard', chance: 0.5 }] },
  { id: 'voltaic_shade', name: 'Voltaic Shade', family: 'spirit', lvl: 19, hp: 60, ac: 18, atk: 15, dmg: '3d6', speed: 1.8, aggro: 13, xp: 190, sprite: 'shade', size: 1.1, flying: true, habitat: ['spire'], weight: 6, drops: [{ id: 'core_shard', chance: 0.3 }, { id: 'tonic', chance: 0.3 }] },
  { id: 'relay_construct', name: 'Relay Construct', family: 'construct', lvl: 18, hp: 95, ac: 20, atk: 14, dmg: '2d8+3', speed: 0.7, aggro: 7, xp: 160, sprite: 'relay', size: 2.0, habitat: ['spire'], weight: 6, drops: [{ id: 'alloy', chance: 0.9, qty: [1, 3] }, { id: 'core_shard', chance: 0.35 }] },

  { id: 'rift_horror', name: 'Rift Horror', family: 'spirit', lvl: 20, hp: 130, ac: 20, atk: 16, dmg: '3d8', speed: 1.2, aggro: 11, xp: 260, sprite: 'horror', size: 1.7, habitat: ['rift'], weight: 8, drops: [{ id: 'core_shard', chance: 0.6, qty: [1, 2] }, { id: 'alloy', chance: 0.5 }] },
];
export const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map(m => [m.id, m]));

// D2-flavoured elite modifiers
export const CHAMPION_MODS = [
  { id: 'cold', name: 'Cold Enchanted', desc: 'Chills on hit', effect: { onHit: 'chill' } },
  { id: 'fire', name: 'Fire Enchanted', desc: 'Burns on hit', effect: { onHit: 'burn' } },
  { id: 'lightning', name: 'Lightning Enchanted', desc: 'Crackles with arcs', effect: { onHit: 'shock' } },
  { id: 'fast', name: 'Extra Fast', desc: 'Moves quickly', effect: { speed: 1.45 } },
  { id: 'strong', name: 'Extra Strong', desc: 'Hits harder', effect: { dmg: 1.4 } },
  { id: 'stoneskin', name: 'Stoneskin', desc: 'Tough hide', effect: { ac: 3, hp: 1.3 } },
  { id: 'mana', name: 'Mana Burn', desc: 'Drains energy', effect: { onHit: 'drain' } },
  { id: 'multishot', name: 'Multishot', desc: 'Fires volleys', effect: { multishot: true } },
  { id: 'vampiric', name: 'Vampiric', desc: 'Heals from wounds', effect: { lifesteal: 0.25 } },
  { id: 'spectral', name: 'Spectral', desc: 'Half real', effect: { resist: 25 } },
];

// Named rares / legendaries. zone + chance rolled per spawn slot; always drop.
export const NAMED = [
  { id: 'old_salt', name: 'Old Salt', title: 'the Wreckkeeper', base: 'rock_crab', zone: 'wrack_shore', tier: 'rare', level: 4, chance: 0.02, mods: ['stoneskin'], line: 'The crab is older than the wreck. It wears a captain\'s coat.' },
  { id: 'brine_horror', name: 'The Brine-Crusted Horror', title: '', base: 'brine_slime', zone: 'tidal_flats', tier: 'legendary', level: 7, chance: 0.004, mods: ['cold', 'vampiric'], line: 'It remembers being a person. It is not one now.' },
  { id: 'foreman', name: 'Foreman Nine-Fingers', title: '', base: 'scrap_golem', zone: 'rustfield', tier: 'rare', level: 10, chance: 0.015, mods: ['strong', 'stoneskin'], line: 'Still clocking in. Still owed a wage.' },
  { id: 'pale_circuit_npc', name: 'The Pale Circuit', title: 'Last of the Line', base: 'pale_stalker', zone: 'ashen_downs', tier: 'legendary', level: 16, chance: 0.005, mods: ['fast', 'lightning'], line: 'A woman-shaped hole in the grid, walking the old power line.' },
  { id: 'ninth_relay', name: 'Warden of the Ninth Relay', title: '', base: 'spire_warden', zone: 'relay_spire', tier: 'legendary', level: 22, chance: 0.01, mods: ['multishot', 'spectral'], line: 'It has been waiting for a password for four hundred years.' },
  { id: 'last_harvest_npc', name: 'The Last Harvest', title: 'Keeper of Fields', base: 'mycoid_shambler', zone: 'sporewood', tier: 'unique', level: 13, chance: 0.008, mods: ['stoneskin', 'vampiric'], line: 'It plants what it kills.' },
];
export const NAMED_BY_ID = Object.fromEntries(NAMED.map(n => [n.id, n]));

// Rift bosses (roguelite floors)
export const RIFT_BOSSES = ['scrap_golem', 'cable_horror', 'rift_horror', 'sentinel'];

// Taming: pets get a small stat line and two abilities.
export const PET_ABILITIES = {
  shore_gull: ['Peck', 'Scout'],
  rock_crab: ['Pinch', 'Shell Up'],
  mud_crab: ['Pinch', 'Burrow'],
  rust_hound: ['Lunge', 'Track'],
  spore_boar: ['Gore', 'Spore Burst'],
  cap_wolf: ['Howl', 'Pack Bite'],
  cinder_jackal: ['Cinder Dash', 'Ember Bite'],
  arc_mite: ['Arc Bite', 'Overcharge'],
  glow_moth: ['Dust', 'Lantern'],
};

export const PET_ABILITY_INFO = {
  Peck: { desc: 'Small physical hit.', cd: 3, dmg: '1d4' },
  Scout: { desc: 'Reveals nearby creatures for 20s.', cd: 30 },
  Pinch: { desc: 'Grabs a target, slowing it.', cd: 6, dmg: '1d6' },
  'Shell Up': { desc: 'Pet gains +4 AC for 6s.', cd: 20 },
  Burrow: { desc: 'Pet vanishes and re-emerges at the target.', cd: 14 },
  Lunge: { desc: 'Charges the nearest enemy.', cd: 10, dmg: '1d8' },
  Track: { desc: 'Marks rare creatures on the map.', cd: 60 },
  Gore: { desc: 'Heavy charge, knocks back.', cd: 8, dmg: '2d6' },
  'Spore Burst': { desc: 'Poison cloud around the pet.', cd: 18, dmg: '1d6' },
  Howl: { desc: 'Nearby allies gain +2 attack.', cd: 25 },
  'Pack Bite': { desc: 'Bites twice.', cd: 5, dmg: '1d6' },
  'Cinder Dash': { desc: 'Blinks to target, burning.', cd: 12, dmg: '2d6' },
  'Ember Bite': { desc: 'Fire damage over time.', cd: 7, dmg: '1d8' },
  'Arc Bite': { desc: 'Electric bite, may stun.', cd: 6, dmg: '1d8' },
  Overcharge: { desc: 'Pet explodes in static.', cd: 20, dmg: '2d8' },
  Dust: { desc: 'Blinds nearby enemies.', cd: 16 },
  Lantern: { desc: 'Lights the area; reveals loot.', cd: 40 },
};
