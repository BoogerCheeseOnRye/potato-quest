// Derived character sheet: base scores + gear + buffs -> everything combat reads.
import { ABILITIES, CLASSES, mod, babFor, baseSave, ARMOR_CAP, xpForLevel, levelForXp } from '../rules/dnd.js';
import { itemLines, RARITY } from '../data/items.js';

export function emptySheet(player) {
  return {
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    hpMax: 10, mpMax: 10, ac: 10, bab: 0, atk: 0, dmgBonus: 0, spellDmg: 0,
    critRange: 20, critMult: 2, speed: 3.6, resists: {}, saves: { fort: 0, ref: 0, will: 0 },
    skills: {}, abilityRanks: {}, dmg: '1d4', weapon: null, unarmed: true, range: 1.7,
    armorType: 'none', moveMult: 1, thorns: 0, lifesteal: 0, cdr: 0, block: 0,
  };
}

function itemMods(equip) {
  const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, hp: 0, mp: 0, ac: 0, dmg: 0, spellDmg: 0, critRange: 0, move: 0, resist: 0, block: 0, range: 0, thorns: 0 };
  const skillBonus = {};
  for (const it of Object.values(equip || {})) {
    if (!it) continue;
    for (const m of it.mods || []) {
      if (m.stat in out) out[m.stat] += m.value;
      else skillBonus[m.stat] = (skillBonus[m.stat] || 0) + m.value;
    }
    if (it.baseStats) for (const [k, v] of Object.entries(it.baseStats)) {
      if (k in out && typeof v === 'number') out[k] += v;
      else if (typeof v === 'number') skillBonus[k] = (skillBonus[k] || 0) + v;
      else if (k === 'resist' && typeof v === 'object') for (const r of Object.values(v)) out.resist += r;
    }
  }
  return { flat: out, skills: skillBonus };
}

export function buffTotals(buffs, now) {
  const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ac: 0, atk: 0, dmg: 0, spellDmg: 0, cdr: 0, thorns: 0, move: 0 };
  for (const b of buffs || []) {
    if (b.until && b.until < now) continue;
    for (const [k, v] of Object.entries(b.stats || {})) if (k in out) out[k] += v;
  }
  return out;
}

export function recalc(player, now = 0) {
  const cls = CLASSES[player.role] ?? null;
  const im = itemMods(player.equip);
  const bf = buffTotals(player.buffs, now);
  const s = emptySheet(player);

  for (const a of ABILITIES) {
    s[a] = (player.abilities?.[a] ?? 10) + im.flat[a] + bf[a];
  }
  // temporary stat buffs from food (stored on player.foodBuff)
  if (player.foodBuff) {
    for (const [k, v] of Object.entries(player.foodBuff.stats || {})) if (k in s) s[k] += v;
  }

  const level = player.level ?? 1;
  const hitDie = cls?.hitDie ?? 8;
  const conMod = mod(s.con);
  s.hpMax = Math.max(1, (hitDie + conMod) + (level - 1) * (Math.floor(hitDie / 2) + 1 + conMod) + im.flat.hp);
  s.mpMax = Math.max(2, 6 + Math.max(0, mod(s.int)) * 3 + level * 2 + im.flat.mp);

  s.bab = babFor(cls, level);
  const weapon = player.equip?.weapon ?? null;
  const off = player.equip?.offhand ?? null;
  const armor = player.equip?.body ?? null;
  const armorType = armor?.armorType ?? 'none';
  s.armorType = armorType;
  const dexCap = Math.max(0, (ARMOR_CAP[armorType] ?? 99) + (im.skills.dexCap ?? 0));
  const dexForAc = Math.min(mod(s.dex), dexCap);

  s.ac = 10 + dexForAc + im.flat.ac + (armor?.ac ?? 0) + (off?.ac ?? 0) + bf.ac + (player.equip?.charm?.ac ?? 0);
  if (player.flags?.bulwark) s.ac += 2;

  // proficiency: classes are only good at their listed armour/weapon families
  let proficientArmor = true;
  if (cls) {
    if (cls.armor === 'heavy') proficientArmor = true;
    else if (cls.armor === 'medium') proficientArmor = armorType !== 'heavy';
    else if (cls.armor === 'light') proficientArmor = armorType === 'light' || armorType === 'none';
    else proficientArmor = armorType === 'none';
  }
  s.proficientArmor = proficientArmor;

  const wDmg = weapon?.dmg ?? '1d3';
  s.dmg = wDmg;
  s.weapon = weapon;
  s.unarmed = !weapon;
  s.range = (weapon?.baseStats?.range ?? (weapon?.tags?.includes('ranged') ? 6 : 1.7));
  s.critRange = Math.max(15, (weapon?.crit ?? 20) - (im.flat.critRange || 0) - (weapon?.baseStats?.critRange || 0));
  s.critMult = weapon?.mult ?? 2;
  const primary = cls?.primary ?? 'str';
  s.atk = s.bab + mod(s[primary]) + (proficientArmor ? 0 : -2) + bf.atk;
  s.dmgBonus = mod(s[primary]) + im.flat.dmg + bf.dmg;
  s.spellDmg = mod(s.int) + im.flat.spellDmg + bf.spellDmg;
  s.speed = 3.6 * (1 + (im.flat.move + bf.move) / 100) * (proficientArmor ? 1 : 0.9);
  s.resists = { physical: 0, fire: 0, cold: 0, elec: 0, poison: 0, bleed: 0, radiant: 0 };
  const baseResist = im.flat.resist + (player.flags?.resistAll ?? 0);
  for (const k of Object.keys(s.resists)) s.resists[k] = baseResist;
  s.saves = {
    fort: baseSave(cls, level, 'fort') + mod(s.con),
    ref: baseSave(cls, level, 'ref') + mod(s.dex),
    will: baseSave(cls, level, 'will') + mod(s.wis),
  };
  s.skills = {};
  for (const sk of ['athletics', 'acrobatics', 'stealth', 'survival', 'perception', 'lore', 'tech', 'persuasion', 'medicine', 'tame']) {
    const t = player.skills?.[sk];
    s.skills[sk] = (t?.level ?? 0) + mod(s[skillAbility(sk)]) + (im.skills[sk] ?? 0);
  }
  s.abilityRanks = {};
  for (const [id, t] of Object.entries(player.abilityTrain || {})) s.abilityRanks[id] = t.level;
  s.cdr = Math.min(0.5, bf.cdr + (player.flags?.cdr ?? 0));
  s.thorns = (player.flags?.thorns ?? 0) + (im.skills.thorns ?? 0) + bf.thorns;
  s.lifesteal = im.skills.lifesteal ?? 0;
  s.block = im.flat.block ?? 0;
  s.moveMult = 1;
  s.level = level;
  s.xpNext = xpForLevel(level + 1);
  s.xpThis = xpForLevel(level);
  s.prof = player.prof ?? {};
  return s;
}

export function skillAbility(sk) {
  return { athletics: 'str', acrobatics: 'dex', stealth: 'dex', survival: 'wis', perception: 'wis', lore: 'int', tech: 'int', persuasion: 'cha', medicine: 'wis', tame: 'cha' }[sk] ?? 'wis';
}

export function clampVitals(player) {
  const s = player.sheet;
  if (!s) return;
  player.hp = Math.min(player.hp, s.hpMax);
  player.mp = Math.min(player.mp, s.mpMax);
  if (player.hp <= 0) player.hp = 0;
}

export function gainXp(player, amount) {
  player.xp += amount;
  const newLevel = levelForXp(player.xp);
  let ups = 0;
  while (player.level < newLevel) {
    player.level++;
    ups++;
    const cls = CLASSES[player.role];
    const primary = cls?.primary ?? 'str';
    player.abilities[primary] = (player.abilities[primary] ?? 10) + 1;
    if (player.level % 3 === 0) player.abilities.con = (player.abilities.con ?? 10) + 1;
    if (player.level % 4 === 0) player.abilities[primary] = (player.abilities[primary] ?? 10) + 1;
    player.unspentPoints = (player.unspentPoints ?? 0) + 1;
  }
  player.sheet = recalc(player);
  if (ups) player.hp = player.sheet.hpMax;
  return ups;
}

export function gearSummary(player) {
  const out = [];
  for (const [slot, it] of Object.entries(player.equip || {})) {
    if (it) out.push({ slot, name: it.name, rarity: it.rarity, color: RARITY[it.rarity].color, lines: itemLines(it) });
  }
  return out;
}
