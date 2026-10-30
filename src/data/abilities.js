// Role abilities. Every ability levels itself by use (Morrowind style):
// higher rank = more damage/healing, lower cooldown, extra targets.
// Combat resolution lives in systems/combat.js; this file is data + formulas.
export const ABILITIES = {
  // universal
  attack: { id: 'attack', name: 'Attack', icon: '⚔', cost: 0, cd: 0.55, range: 1.7, kind: 'melee', desc: 'Swing what you are holding.', basic: true, stat: 'str' },
  dodge: { id: 'dodge', name: 'Roll', icon: '➤', cost: 4, cd: 3.5, range: 0, kind: 'dash', range: 4.5, desc: 'Quick roll in the direction you are moving.', any: true },

  // Warden
  cleave: { id: 'cleave', name: 'Cleave', icon: '🪓', cost: 5, cd: 4, range: 2.1, kind: 'cone', dmg: '1d8', targets: 3, desc: 'A wide swing that catches up to three enemies.', role: 'warden', stat: 'str' },
  shieldBash: { id: 'shieldBash', name: 'Shield Bash', icon: '🛡', cost: 6, cd: 7, range: 1.8, kind: 'melee', dmg: '1d6', effect: 'stun', effectSecs: 1.6, desc: 'Slam a shield into something and stop it moving.', role: 'warden', stat: 'str' },
  rally: { id: 'rally', name: 'Rally', icon: '📣', cost: 8, cd: 20, range: 6, kind: 'buff', buff: { atk: 2, ac: 2, secs: 10 }, desc: 'You and nearby allies fight better for a while.', role: 'warden', stat: 'cha' },
  bulwark: { id: 'bulwark', name: 'Bulwark', icon: '🧱', cost: 10, cd: 24, range: 0, kind: 'buff', buff: { ac: 5, thorns: 3, secs: 8 }, desc: 'Plant your feet. Armour up, hit back.', role: 'warden' },

  // Drifter
  backstab: { id: 'backstab', name: 'Backstab', icon: '🔪', cost: 4, cd: 5, range: 1.8, kind: 'melee', dmg: '2d6', bonusVsUnaware: 2.2, desc: 'Hits much harder on something that has not noticed you.', role: 'drifter', stat: 'dex' },
  smokeStep: { id: 'smokeStep', name: 'Smoke Step', icon: '💨', cost: 7, cd: 9, range: 5, kind: 'dash', effect: 'stealth', effectSecs: 3, desc: 'Blink a short way and drop out of sight.', role: 'drifter', stat: 'dex' },
  volley: { id: 'volley', name: 'Volley', icon: '🎯', cost: 6, cd: 6, range: 8, kind: 'ranged', dmg: '1d6', targets: 3, desc: 'Throw a fan of blades at everything ahead.', role: 'drifter', stat: 'dex' },
  pickpocket: { id: 'pickpocket', name: 'Pickpocket', icon: '🫳', cost: 0, cd: 30, range: 2, kind: 'utility', desc: 'Lift something off a living target without killing it.', role: 'drifter', stat: 'dex' },

  // Technosavant
  arcBolt: { id: 'arcBolt', name: 'Arc Bolt', icon: '⚡', cost: 4, cd: 1.4, range: 10, kind: 'ranged', dmg: '1d10', spell: true, desc: 'A hard little bolt of borrowed lightning.', role: 'technosavant', stat: 'int' },
  staticField: { id: 'staticField', name: 'Static Field', icon: '🌀', cost: 9, cd: 10, range: 7, kind: 'aoe', dmg: '1d6', radius: 3.4, effect: 'shock', effectSecs: 4, desc: 'Charge the air. Everything near the point keeps taking damage.', role: 'technosavant', stat: 'int' },
  overclock: { id: 'overclock', name: 'Overclock', icon: '⏫', cost: 12, cd: 22, range: 0, kind: 'buff', buff: { spell: 4, cdr: 0.35, secs: 10 }, desc: 'Run yourself past spec for a few seconds.', role: 'technosavant', stat: 'int' },
  discharge: { id: 'discharge', name: 'Discharge', icon: '💥', cost: 16, cd: 18, range: 0, kind: 'nova', dmg: '2d8', radius: 4.5, desc: 'Dump everything you have into the ground around you.', role: 'technosavant', stat: 'int' },

  // Shaman
  thornLash: { id: 'thornLash', name: 'Thorn Lash', icon: '🌿', cost: 4, cd: 2, range: 5, kind: 'ranged', dmg: '1d8', spell: true, desc: 'A whip of rooted things.', role: 'shaman', stat: 'wis' },
  beastBond: { id: 'beastBond', name: 'Beast Bond', icon: '🐾', cost: 8, cd: 8, range: 4, kind: 'tame', desc: 'Calm a wounded animal and ask it to come with you.', role: 'shaman', stat: 'wis' },
  mend: { id: 'mend', name: 'Mend', icon: '✚', cost: 7, cd: 6, range: 6, kind: 'heal', heal: '1d8', desc: 'Close a wound with moss, spit and stubbornness.', role: 'shaman', stat: 'wis' },
  sporeCloud: { id: 'sporeCloud', name: 'Spore Cloud', icon: '🍄', cost: 10, cd: 14, range: 7, kind: 'aoe', dmg: '1d6', radius: 3.8, effect: 'poison', effectSecs: 6, desc: 'A cloud of something the forest invented.', role: 'shaman', stat: 'wis' },

  // Tinker
  scrapShot: { id: 'scrapShot', name: 'Scrap Shot', icon: '🔩', cost: 3, cd: 2, range: 9, kind: 'ranged', dmg: '1d8', desc: 'A handful of sharp rubbish, delivered fast.', role: 'tinker', stat: 'int' },
  turret: { id: 'turret', name: 'Sentry', icon: '🗼', cost: 12, cd: 25, range: 3, kind: 'summon', summon: 'turret', duration: 25, desc: 'Drop a little gun that shoots what you shoot.', role: 'tinker', stat: 'int' },
  patchUp: { id: 'patchUp', name: 'Patch Up', icon: '🩹', cost: 6, cd: 8, range: 4, kind: 'heal', heal: '1d6', desc: 'Staple the worst of it shut — you or your pet.', role: 'tinker', stat: 'int' },
  overload: { id: 'overload', name: 'Overload', icon: '🔋', cost: 14, cd: 16, range: 8, kind: 'aoe', dmg: '2d6', radius: 3, effect: 'shock', effectSecs: 3, desc: 'Detonate a power cell at range.', role: 'tinker', stat: 'int' },
};

export const ROLE_ABILITIES = {
  warden: ['cleave', 'shieldBash', 'rally', 'bulwark'],
  drifter: ['backstab', 'smokeStep', 'volley', 'pickpocket'],
  technosavant: ['arcBolt', 'staticField', 'overclock', 'discharge'],
  shaman: ['thornLash', 'beastBond', 'mend', 'sporeCloud'],
  tinker: ['scrapShot', 'turret', 'patchUp', 'overload'],
};

export function abilityFor(id) { return ABILITIES[id]; }

// Damage/heal multiplier from use-based rank.
export function rankMult(rank) { return 1 + (rank - 1) * 0.075; }
export function cdFor(ab, rank) { return Math.max(0.4, (ab.cd ?? 1) * (1 - Math.min(0.35, (rank - 1) * 0.02))); }
export function radiusFor(ab, rank) { return (ab.radius ?? 0) * (1 + Math.min(0.5, (rank - 1) * 0.03)); }
export function targetsFor(ab, rank) { return (ab.targets ?? 1) + Math.floor((rank - 1) / 5); }
export function costFor(ab, rank) { return Math.max(0, Math.round((ab.cost ?? 0) * (1 - Math.min(0.4, (rank - 1) * 0.02)))); }

// Human-readable line for the sheet.
export function abilityLine(ab, rank = 1) {
  const bits = [];
  if (ab.dmg) bits.push(`${ab.dmg} ×${rankMult(rank).toFixed(2)}`);
  if (ab.heal) bits.push(`heal ${ab.heal} ×${rankMult(rank).toFixed(2)}`);
  if (ab.cost) bits.push(`${costFor(ab, rank)} energy`);
  if (ab.cd) bits.push(`${cdFor(ab, rank).toFixed(1)}s cd`);
  if (ab.radius) bits.push(`${radiusFor(ab, rank).toFixed(1)}m radius`);
  if (ab.targets) bits.push(`${targetsFor(ab, rank)} targets`);
  return bits.join(' · ');
}
