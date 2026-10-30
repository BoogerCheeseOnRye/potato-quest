// Headless smoke run: boots the real Game with a stub DOM, walks the whole zone
// chain, fights, gathers and levels for a few simulated minutes. Catches wiring
// errors that only show up once the loop starts (no browser needed).
//
//   node tools/sim.mjs [seconds-per-zone]
import { performance } from 'node:perf_hooks';

// ---------------- stub DOM ----------------
function stubEl(tag = 'div') {
  const el = {
    tagName: tag, children: [], dataset: {}, style: {}, className: '', id: '',
    textContent: '', innerHTML: '', firstChild: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); this.firstChild = this.children[0]; return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); this.firstChild = this.children[0] ?? null; },
    remove() {},
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; },
    querySelector() { return stubEl(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 844 }; },
    closest() { return null; },
    focus() {}, blur() {},
  };
  Object.defineProperty(el, 'firstChild', { get() { return this.children[0] ?? null; }, set() {} });
  return el;
}
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (t) => stubEl(t),
  createElementNS: (_ns, t) => stubEl(t),
  addEventListener() {}, body: stubEl('body'), documentElement: stubEl('html'),
};
globalThis.window = {
  addEventListener() {}, innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
};
try { globalThis.window.navigator = globalThis.navigator; } catch {}
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });

const { Game } = await import('../src/game.js');
const { ZONE_ORDER } = await import('../src/data/zones.js');

const PER_ZONE = Number(process.argv[2] ?? 20);
const DT = 1 / 60;
const game = new Game();
game.startCastaway();

const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };
check(Object.keys(game.player.abilityTrain).join(',') === 'attack', 'castaway had class abilities before choosing a path');
game.choosePath('warden');

function simulate(seconds, { fight = true, move = true } = {}) {
  const frames = Math.round(seconds / DT);
  for (let i = 0; i < frames; i++) {
    const p = game.player;
    if (fight && i % 20 === 0 && (!game.autoTarget || game.autoTarget.hp <= 0)) {
      const t = game.nearestMonster(p.x, p.y, 40);
      if (t) game.autoTarget = t;
    }
    const chasing = fight && game.autoTarget && game.autoTarget.hp > 0;
    if (move && !chasing) {
      const a = i * 0.013;
      game.input.moveX = Math.sin(a) * 0.7;
      game.input.moveY = Math.cos(a * 0.7) * 0.7;
    } else {
      game.input.moveX = 0; game.input.moveY = 0;
    }
    if (fight && chasing) game.cast('attack', { target: game.autoTarget });
    if (i % 120 === 0) game.interact();
    game.update(DT);
    if (process.env.SIM_VERBOSE && i % 300 === 0) console.log(`    t=${(i * DT).toFixed(0)}s hp=${Math.round(p.hp)} lvl=${p.level} auto=${game.autoTarget ? game.autoTarget.name : '-'} ent=${game.entities.length}`);
    check(Number.isFinite(p.x) && Number.isFinite(p.y), 'player position went NaN');
    check(p.hp > 0, `player died in ${game.world.zone?.id} (${Math.round(p.hp)} hp)`);
    check(p.hp <= p.sheet.hpMax + 0.01, 'hp above max');
  }
}

for (const zone of ZONE_ORDER) {
  game.travel(zone);
  simulate(PER_ZONE);
  const z = game.world.zone;
  console.log(`  ${z.id.padEnd(12)} lvl ${String(game.player.level).padStart(2)} hp ${Math.round(game.player.hp)}/${game.player.sheet.hpMax} marks ${game.player.marks} entities ${game.entities.length} quests ${game.player.quests.active.length}`);
}

// starting kit and resting
game.travel('wrack_shore');
const p0 = game.player;
check(p0.marks === 0, 'castaway started with money');
check(p0.equip?.body?.base === 'castaway_rags', 'castaway is not wearing the starting clothes');
check(p0.equip?.weapon == null, 'castaway started with a weapon');
check(p0.inv.some(i => i.base === 'ration'), 'castaway has no ration');
check(p0.inv.some(i => i.base === 'bedroll'), 'castaway has no bedroll');
game.entities = game.entities.filter(e => e.kind !== 'monster');
p0.hp = Math.max(1, Math.floor(p0.sheet.hpMax / 2));
const hurt = p0.hp;
game.quickHeal();
check(p0.hp > hurt, 'quick heal did not restore hp');
p0.time = 12 * 60;
check(!game.sleep(), 'sleep was allowed in the middle of the day');
p0.time = 22 * 60;
const dayBefore = p0.day;
const slept = game.sleep();
check(slept, 'sleep refused with a bedroll and no monsters');
check(p0.time % 1440 === 360, 'sleep did not end at 06:00');
check(p0.day > dayBefore, 'sleep did not advance the day');
check(p0.hp === p0.sheet.hpMax, 'sleep did not restore hp');
console.log(`  rest        kit ok, slept to ${String(Math.floor((p0.time % 1440) / 60)).padStart(2, '0')}:00 day ${p0.day}`);

// save / load round trip
game.save();
const snapshot = game.player.level;
const g2 = new Game();
check(g2.load(), 'save did not load');
check(g2.player?.level === snapshot, 'loaded level differs');

// rifts
game.travel('rustfield');
const rift = game.world.zone.pois.find(p => p.kind === 'rift');
if (rift) {
  game.player.x = rift.x; game.player.y = rift.y;
  game.world.enterRift(rift);
  // check entry before simulating: a death inside the rift legitimately ejects you
  check(!!game.world.rift, 'rift was not entered');
  simulate(8, { move: false });
  console.log(`  rift        kills ${game.world.rift?.kills ?? '-'} cleared ${game.world.rift?.cleared ?? '-'}`);
  game.world.leaveRift?.();
}

if (problems.length) {
  const uniq = [...new Set(problems)];
  console.error(`\nFAIL (${uniq.length})`);
  for (const p of uniq.slice(0, 20)) console.error(' -', p);
  process.exit(1);
}
console.log('\nOK: loop, travel, combat, gather, save/load all survived');
