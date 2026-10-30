// Professions: levelled by doing. Recipes gate on profession level and station.
// Farming is its own system (systems/farming.js) but trains the same profession.
export const PROFESSIONS = {
  cooking: {
    id: 'cooking', name: 'Cooking', icon: '🍲', stat: 'wis',
    desc: 'Turn what you caught and grew into something that keeps you alive.',
    recipes: [
      { id: 'grilled_fish', name: 'Grilled Fish', out: { id: 'grilled_fish', qty: 1 }, in: [{ id: 'raw_fish', qty: 1 }], lvl: 1, xp: 12, station: 'fire' },
      { id: 'shore_stew', name: 'Shore Stew', out: { id: 'shore_stew', qty: 1 }, in: [{ id: 'root', qty: 1 }, { id: 'raw_fish', qty: 1 }, { id: 'herb', qty: 1 }], lvl: 3, xp: 24, station: 'fire' },
      { id: 'spore_tea', name: 'Spore Tea', out: { id: 'spore_tea', qty: 1 }, in: [{ id: 'spore', qty: 1 }, { id: 'herb', qty: 2 }], lvl: 6, xp: 34, station: 'fire' },
    ],
  },
  alchemy: {
    id: 'alchemy', name: 'Alchemy', icon: '⚗️', stat: 'int',
    desc: 'Bandages, salves and tonics from whatever the world grew or leaked.',
    recipes: [
      { id: 'bandage', name: 'Bandage', out: { id: 'bandage', qty: 2 }, in: [{ id: 'fiber', qty: 2 }], lvl: 1, xp: 8 },
      { id: 'salve', name: 'Herb Salve', out: { id: 'salve', qty: 1 }, in: [{ id: 'herb', qty: 2 }, { id: 'fiber', qty: 1 }], lvl: 3, xp: 18 },
      { id: 'tonic', name: 'Static Tonic', out: { id: 'tonic', qty: 1 }, in: [{ id: 'core_shard', qty: 1 }, { id: 'herb', qty: 1 }], lvl: 8, xp: 40 },
    ],
  },
  smithing: {
    id: 'smithing', name: 'Smithing', icon: '🔨', stat: 'str',
    desc: 'Beat dead machines into things that hold an edge.',
    recipes: [
      { id: 'rusted_blade', name: 'Rusted Blade', out: { id: 'rusted_blade', qty: 1 }, in: [{ id: 'scrap', qty: 3 }], lvl: 1, xp: 14, station: 'anvil' },
      { id: 'patchwork_mail', name: 'Patchwork Mail', out: { id: 'patchwork_mail', qty: 1 }, in: [{ id: 'scrap', qty: 5 }, { id: 'fiber', qty: 2 }], lvl: 3, xp: 26, station: 'anvil' },
      { id: 'scrap_shield', name: 'Scrap Shield', out: { id: 'scrap_shield', qty: 1 }, in: [{ id: 'scrap', qty: 4 }, { id: 'hide', qty: 2 }], lvl: 5, xp: 34, station: 'anvil' },
      { id: 'coil_spear', name: 'Coil Spear', out: { id: 'coil_spear', qty: 1 }, in: [{ id: 'alloy', qty: 2 }, { id: 'scrap', qty: 4 }], lvl: 9, xp: 60, station: 'anvil' },
      { id: 'plated_shell', name: 'Plated Shell', out: { id: 'plated_shell', qty: 1 }, in: [{ id: 'alloy', qty: 4 }, { id: 'hide', qty: 2 }], lvl: 12, xp: 90, station: 'anvil' },
      { id: 'salvage_axe', name: 'Salvage Axe', out: { id: 'salvage_axe', qty: 1 }, in: [{ id: 'alloy', qty: 2 }, { id: 'scrap', qty: 6 }], lvl: 7, xp: 48, station: 'anvil' },
    ],
  },
  fishing: {
    id: 'fishing', name: 'Fishing', icon: '🎣', stat: 'wis',
    desc: 'The sea is still full of things. Some of them are fish.',
    recipes: [],
    gather: { id: 'raw_fish', qty: [1, 2], xp: 10, time: 3.5 },
  },
  herbalism: {
    id: 'herbalism', name: 'Herbalism', icon: '🌿', stat: 'wis',
    desc: 'Find the green things that survived and know what they do.',
    recipes: [],
    gather: { id: 'herb', qty: [1, 2], xp: 8, time: 2.5 },
  },
  scavenging: {
    id: 'scavenging', name: 'Scavenging', icon: '⚙️', stat: 'int',
    desc: 'Take apart what the old world left lying around.',
    recipes: [
      { id: 'scrap_from_alloy', name: 'Break down alloy', out: { id: 'scrap', qty: 3 }, in: [{ id: 'alloy', qty: 1 }], lvl: 4, xp: 12, anywhere: true },
      { id: 'alloy_from_scrap', name: 'Refine scrap into alloy', out: { id: 'alloy', qty: 1 }, in: [{ id: 'scrap', qty: 4 }], lvl: 6, xp: 22, station: 'anvil' },
    ],
  },
  farming: {
    id: 'farming', name: 'Farming', icon: '🌱', stat: 'wis',
    desc: 'The one profession that makes more of the world instead of less.',
    recipes: [],
  },
};
export const PROF_LIST = Object.values(PROFESSIONS);
export function recipeById(id) {
  for (const p of PROF_LIST) { const r = p.recipes.find(r => r.id === id); if (r) return { prof: p, recipe: r }; }
  return null;
}

export function profXpNeeded(level) { return Math.round(50 * Math.pow(1.28, level - 1)); }

// Plants that farming plots can grow.
export const PLANTS = {
  potato: { id: 'potato', name: 'Potato', seed: 'seed_potato', crop: 'potato', icon: '🥔', growHours: 3, yield: [3, 5], xp: 12 },
  grain: { id: 'grain', name: 'Grain', seed: 'seed_grain', crop: 'grain', icon: '🌾', growHours: 6, yield: [2, 4], xp: 16 },
  root: { id: 'root', name: 'Marrow Root', seed: 'seed_root', crop: 'root', icon: '🥕', growHours: 4, yield: [2, 3], xp: 14 },
  berry: { id: 'berry', name: 'Glowberry', seed: 'seed_berry', crop: 'berry', icon: '🫐', growHours: 8, yield: [1, 3], xp: 22 },
};
