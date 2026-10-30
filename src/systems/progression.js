// Use-based training for skills, abilities and professions. No XP is handed
// out for these directly; you get better at what you actually do.
import { trainGain, trainXpNeeded } from '../rules/dnd.js';
import { PROFESSIONS, profXpNeeded } from '../data/professions.js';

export function ensureTrain(store, id) {
  if (!store[id]) store[id] = { level: 1, xp: 0 };
  return store[id];
}

export function trainAbility(player, id, amount) {
  const t = ensureTrain(player.abilityTrain, id);
  const ups = trainGain(t, amount);
  return { level: t.level, ups, xp: t.xp, need: trainXpNeeded(t.level) };
}

export function trainSkill(player, id, amount) {
  const t = ensureTrain(player.skills, id);
  const ups = trainGain(t, amount);
  return { level: t.level, ups };
}

export function trainProf(player, id, amount) {
  const t = ensureTrain(player.prof, id);
  t.xp += amount;
  let ups = 0;
  while (t.xp >= profXpNeeded(t.level) && t.level < 100) {
    t.xp -= profXpNeeded(t.level);
    t.level++;
    ups++;
  }
  return { level: t.level, ups, xp: t.xp, need: profXpNeeded(t.level) };
}

export function profLevel(player, id) { return player.prof?.[id]?.level ?? 1; }
export function abilityRank(player, id) { return player.abilityTrain?.[id]?.level ?? 1; }
export function skillRank(player, id) { return player.skills?.[id]?.level ?? 0; }

export function canCraft(player, profId, recipe) {
  const prof = PROFESSIONS[profId];
  if (!prof) return { ok: false, why: 'no such profession' };
  const lvl = profLevel(player, profId);
  if (recipe.lvl > lvl) return { ok: false, why: `needs ${prof.name} ${recipe.lvl}` };
  for (const need of recipe.in) {
    const have = player.inv.filter(i => i.base === need.id).reduce((n, i) => n + (i.qty || 1), 0);
    if (have < need.qty) return { ok: false, why: `needs ${need.qty} ${need.id} (have ${have})` };
  }
  return { ok: true };
}

// Player-facing "you got better" strings. The UI decides how to show them.
export function trainingNotes(player, kind, id, res) {
  const notes = [];
  if (res?.ups) {
    const names = { ability: 'rank', skill: 'skill', prof: 'profession' }[kind] ?? kind;
    notes.push(`${id} ${names} up → ${res.level}`);
  }
  return notes;
}
