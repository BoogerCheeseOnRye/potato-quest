// D&D 3.5 shaped rules: six abilities, BAB/saves, d20 checks, skill ranks,
// use-based training (Morrowind/RuneScape), and a 3.5 XP table.
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
export const SKILLS = [
  { id: 'athletics', name: 'Athletics', ab: 'str' },
  { id: 'acrobatics', name: 'Acrobatics', ab: 'dex' },
  { id: 'stealth', name: 'Stealth', ab: 'dex' },
  { id: 'survival', name: 'Survival', ab: 'wis' },
  { id: 'perception', name: 'Perception', ab: 'wis' },
  { id: 'lore', name: 'Lore', ab: 'int' },
  { id: 'tech', name: 'Tech', ab: 'int' },
  { id: 'persuasion', name: 'Persuasion', ab: 'cha' },
  { id: 'medicine', name: 'Medicine', ab: 'wis' },
  { id: 'tame', name: 'Animal Handling', ab: 'cha' },
];
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// 3.5 XP to reach level N (index = level-1)
export const XP_TABLE = [0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000, 66000, 78000, 91000, 105000, 120000, 136000, 153000, 171000, 190000, 210000];

export function xpForLevel(level) { return XP_TABLE[Math.min(level - 1, XP_TABLE.length - 1)] + Math.max(0, level - XP_TABLE.length) * 20000; }
export function levelForXp(xp) {
  let l = 1;
  while (l < 40 && xp >= xpForLevel(l + 1)) l++;
  return l;
}
export function mod(score) { return Math.floor((score - 10) / 2); }
export function fmtMod(m) { return (m >= 0 ? '+' : '') + m; }

// Classes: hit die, BAB rate, good saves, role abilities, starting kit.
export const CLASSES = {
  warden: {
    id: 'warden', name: 'Warden', blurb: 'Ruin-tempered front line. Heavy, deliberate, hard to put down.',
    hitDie: 10, bab: 1.0, goodSaves: ['fort', 'will'], primary: 'str',
    armor: 'heavy', weapon: 'martial', abilities: ['cleave', 'shieldBash', 'rally', 'bulwark'],
    start: { str: 15, dex: 12, con: 15, int: 10, wis: 12, cha: 10 },
    gear: ['rusted_blade', 'patchwork_mail', 'wooden_buckler'],
    skills: ['athletics', 'survival', 'perception', 'persuasion'],
  },
  drifter: {
    id: 'drifter', name: 'Drifter', blurb: 'Rubble-runner and knife artist. Hits first, hits again, leaves.',
    hitDie: 8, bab: 0.75, goodSaves: ['ref', 'ref'], primary: 'dex',
    armor: 'light', weapon: 'finesse', abilities: ['backstab', 'smokeStep', 'volley', 'pickpocket'],
    start: { str: 11, dex: 16, con: 13, int: 12, wis: 12, cha: 12 },
    gear: ['slice_wire', 'scav_leathers', 'throwing_knives'],
    skills: ['stealth', 'acrobatics', 'perception', 'tech'],
  },
  technosavant: {
    id: 'technosavant', name: 'Technosavant', blurb: 'Reads dead machines like scripture. Turns static into fire.',
    hitDie: 6, bab: 0.5, goodSaves: ['will', 'will'], primary: 'int',
    armor: 'none', weapon: 'simple', abilities: ['arcBolt', 'staticField', 'overclock', 'discharge'],
    start: { str: 9, dex: 13, con: 12, int: 16, wis: 13, cha: 10 },
    gear: ['arc_wand', 'threadbare_robe', 'insulator_charm'],
    skills: ['lore', 'tech', 'perception', 'medicine'],
  },
  shaman: {
    id: 'shaman', name: 'Shaman', blurb: 'Speaks for the things that grew back. Beasts answer; wounds close.',
    hitDie: 8, bab: 0.75, goodSaves: ['fort', 'will'], primary: 'wis',
    armor: 'medium', weapon: 'simple', abilities: ['thornLash', 'beastBond', 'mend', 'sporeCloud'],
    start: { str: 12, dex: 13, con: 13, int: 10, wis: 16, cha: 13 },
    gear: ['thorn_staff', 'hide_vest', 'seed_pouch'],
    skills: ['survival', 'tame', 'medicine', 'perception'],
  },
  tinker: {
    id: 'tinker', name: 'Tinker', blurb: 'Builds a friend out of the wreckage, then hides behind it.',
    hitDie: 8, bab: 0.75, goodSaves: ['ref', 'fort'], primary: 'int',
    armor: 'medium', weapon: 'martial', abilities: ['scrapShot', 'turret', 'patchUp', 'overload'],
    start: { str: 12, dex: 14, con: 13, int: 15, wis: 11, cha: 10 },
    gear: ['scrap_gun', 'rig_harness', 'toolkit'],
    skills: ['tech', 'lore', 'athletics', 'perception'],
  },
};

export function babFor(cls, level) { return Math.floor(level * (cls?.bab ?? 0.75) + 1e-9); }
export function baseSave(cls, level, which) {
  const good = cls?.goodSaves?.includes(which);
  return Math.floor(level * (good ? 0.5 : 1 / 3) + (good ? 2 : 0));
}

export const SAVE_NAMES = { fort: 'Fortitude', ref: 'Reflex', will: 'Will' };

// d20 + bonus vs DC / AC. Natural 20 always hits, natural 1 always misses.
export function d20(rng) { return rng.int(1, 20); }
export function check(rng, bonus, dc) {
  const r = d20(rng);
  const total = r + bonus;
  const crit = r === 20, fumble = r === 1;
  return { roll: r, total, dc, success: crit ? true : fumble ? false : total >= dc, crit, fumble };
}
export function attackRoll(rng, bonus, ac) {
  const r = d20(rng);
  const total = r + bonus;
  return { roll: r, total, ac, hit: r === 20 || (r !== 1 && total >= ac), crit: r === 20, fumble: r === 1 };
}
export function rollDice(rng, count, sides, bonus = 0) {
  let sum = 0, rolls = [];
  for (let i = 0; i < count; i++) { const v = rng.int(1, sides); rolls.push(v); sum += v; }
  return { sum: sum + bonus, rolls, bonus };
}
export function parseDice(str) {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(String(str).trim());
  if (!m) return { count: 1, sides: 6, bonus: 0 };
  return { count: +m[1], sides: +m[2], bonus: m[3] ? +m[3] : 0 };
}
export function roll(str, rng) { const d = parseDice(str); return rollDice(rng, d.count, d.sides, d.bonus); }

// Use-based progression: each ability and each skill trains itself.
export function trainXpNeeded(level) { return Math.round(60 * Math.pow(1.22, level)); }
export function trainGain(trains, amount) {
  trains.xp += amount;
  let ups = 0;
  while (trains.xp >= trainXpNeeded(trains.level) && trains.level < 100) {
    trains.xp -= trainXpNeeded(trains.level);
    trains.level++;
    ups++;
  }
  return ups;
}

// Level-scaled numbers for monsters/items. Player level 1 -> x1.
export function scaleFactor(level) { return 1 + (level - 1) * 0.22; }

export function abilityMods(abilities) {
  const out = {};
  for (const a of ABILITIES) out[a] = mod(abilities[a] ?? 10);
  return out;
}

// Encumbrance-lite: heavy armour caps dex to AC.
export const ARMOR_CAP = { none: 99, light: 8, medium: 4, heavy: 2 };

export function xpAward(monsterLevel, playerLevel, base) {
  const b = base ?? 40 + monsterLevel * 22;
  const diff = monsterLevel - playerLevel;
  const mult = diff >= 3 ? 1.5 : diff >= 1 ? 1.15 : diff <= -4 ? 0.25 : diff <= -2 ? 0.5 : 1;
  return Math.max(1, Math.round(b * mult));
}
