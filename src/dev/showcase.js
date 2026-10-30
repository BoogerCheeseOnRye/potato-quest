// DEV SHOWCASE — never shipped.
//
// A walkable model yard: every prop, every creature sprite and every NPC in the
// game, laid out on one flat field with labels, so art and scale can be checked
// on a real phone without playing through eight zones to find a shambler.
//
// This file is imported only by dev.html. tools/build.mjs copies index.html,
// css/ and src/ into docs/ while explicitly skipping dev.html and src/dev/, so
// the showcase cannot reach production. If you add dev-only files, add them to
// the skip list in tools/build.mjs.
import { Game } from '../game.js';
import { World } from '../world/world.js';
import { createPlayer, chooseRole } from '../entities/player.js';
import { initHud, toast } from '../ui/hud.js';
import { initPanels } from '../ui/panels.js';
import { initInput } from '../input/input.js';
import { initScene } from '../render/scene.js';
import { initAudio } from '../audio/ambient.js';
import { PROP_KEYS, CREATURE_KEYS, NPC_KEYS } from '../render/sprites.js';
import { project } from '../core/geom.js';
import { makeMonster } from '../systems/combat.js';

const SIZE = 140;
const START = { x: 82, y: 74 };

const DEV_ZONE = {
  id: 'dev_showcase',
  name: 'Model Yard',
  band: [1, 20],
  habitat: ['town'],
  density: 0,
  size: SIZE,
  water: 0,
  obstacles: 0,
  ground: 'town',
  palette: {
    ground: '#2b3238', ground2: '#3a444c', wet: '#232a2f', water: '#1e4038',
    accent: '#6d8f96', fog: '#141a1e', sky: '#1a2228', night: '#080b0d',
  },
  props: [],
  pois: [],
  lore: 'Every model in the game, standing still, waiting to be looked at.',
};

function dummyCreature(key, x, y, opts = {}) {
  const tier = opts.tier ?? 'normal';
  return {
    kind: 'monster', id: 'dummy_' + key + '_' + x + '_' + y,
    species: key, sprite: key, name: opts.name ?? key,
    family: 'beast', level: 1, tier,
    hp: 9999, hpMax: 9999, ac: 10, atk: 0, dmg: '1d2', dmgBonus: 0,
    x, y, z: 0, radius: 0.4, facing: 0.7, size: opts.size ?? 1,
    home: { x, y }, state: 'idle', target: null, attackCd: 0,
    wanderT: 0, aggroT: 0, effects: [], cooldowns: {}, drops: [],
    passive: true, flying: !!opts.flying, ranged: 0, mods: [],
  };
}

class ShowcaseWorld extends World {
  loadZone() {
    const zone = DEV_ZONE;
    this.zone = zone;
    this.rift = null;
    const st = {
      props: [], obstacles: [], patches: [], grit: [], nodes: [], water: [], pois: [],
      obstacleGrid: new Map(), discovered: true, weather: 'clear',
      cacheOpened: {}, nodeTimer: {}, ground: 'town', labels: [],
    };
    this.state = st;

    // ---- props: a labelled grid, 8 per row, in true metric scale ----
    const cols = 8, gapX = 7.4, gapY = 8.6;
    PROP_KEYS.forEach((kind, i) => {
      const x = 16 + (i % cols) * gapX;
      const y = 16 + Math.floor(i / cols) * gapY;
      st.props.push({ kind, x, y, s: 1, rot: 0, tone: 0, solid: false });
      st.labels.push({ x, y, text: kind });
    });

    // ---- creatures: every creature sprite, plus one of each tier ----
    const propRows = Math.ceil(PROP_KEYS.length / cols);
    const cTop = 16 + propRows * gapY + 4;
    CREATURE_KEYS.forEach((key, i) => {
      const x = 16 + (i % cols) * gapX;
      const y = cTop + Math.floor(i / cols) * gapY;
      const flying = ['moth', 'wisp', 'drone', 'wraith', 'shade'].includes(key);
      st.entities = st.entities ?? [];
      st.labels.push({ x, y, text: key });
      st.entities.push(dummyCreature(key, x, y, { flying }));
    });

    // tier examples, so health bars can be compared side by side
    const tierY = cTop + Math.ceil(CREATURE_KEYS.length / cols) * gapY;
    [['normal', 'normal'], ['elite', 'elite'], ['rare', 'rare'], ['legendary', 'legendary']]
      .forEach(([tier, label], i) => {
        const x = 16 + i * gapX;
        st.entities.push(dummyCreature('crab_big', x, tierY, { tier, name: label }));
        st.labels.push({ x, y: tierY, text: label + ' bar' });
      });

    // ---- NPCs ----
    const npcY = tierY + gapY;
    NPC_KEYS.forEach((key, i) => {
      const x = 16 + i * gapX;
      st.labels.push({ x, y: npcY, text: key });
    });

    const p = this.player;
    p.x = START.x; p.y = START.y;
    p.position.x = p.x; p.position.y = p.y; p.position.zone = zone.id;
    p.facing = -Math.PI / 4;
    return st;
  }

  // The yard does not spawn, simulate or travel. It only keeps the clock and
  // projectiles moving so combat effects still render when you test an attack.
  update(dt) {
    const p = this.player;
    p.time = (p.time ?? 360) + dt;
    p.day = 1 + Math.floor(p.time / 1440);
    this.game.updateProjectiles?.(dt);
  }

  bestInteract() { return null; }
}

class ShowcaseGame extends Game {
  // Never touch the real save. The showcase is not a game you can lose.
  save() {}
  load() { return false; }
  hasSave() { return false; }
  wipe() {}
}

const game = new ShowcaseGame();
game.world = new ShowcaseWorld(game);
window.__game = game;

game.player = createPlayer('warden', 'Dev', 7);
game.player.role = 'warden';
game.player.flags.roleChosen = true;
const st = game.world.loadZone();

// NPCs: real entities, so their sprites and name plates behave as in game.
const npcRowY = st.labels.find(l => NPC_KEYS.includes(l.text))?.y;
NPC_KEYS.forEach((key, i) => {
  const x = 16 + i * 7.4;
  const y = npcRowY ?? 120;
  const def = { id: key, name: key, title: 'dev', sprite: key };
  game.entities.push({
    kind: 'npc', id: key, name: key, title: 'dev', x, y, z: 0, radius: 0.4,
    facing: Math.PI, sprite: key, def, home: { x, y },
  });
});
for (const e of st.entities ?? []) game.entities.push(e);

initHud(game);
initPanels(game);
initInput(game);
initScene(game);

// ---- dev labels: project each yard entry every frame ----
const svg = document.querySelector('#scene');
const labelLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
labelLayer.setAttribute('id', 'dev-labels');
labelLayer.setAttribute('pointer-events', 'none');
svg.appendChild(labelLayer);

let labels = st.labels;
function drawLabels() {
  requestAnimationFrame(drawLabels);
  const cam = game.cam;
  if (!cam) return;
  const out = [];
  for (const l of labels) {
    const pr = project({ x: l.x, y: l.y, z: 0 }, cam);
    if (!pr || pr.x < -90 || pr.x > cam.w + 90 || pr.y < -20 || pr.y > cam.h + 60) continue;
    const size = Math.max(8, Math.min(13, pr.s * 0.5));
    out.push(`<text x="${pr.x.toFixed(0)}" y="${(pr.y + size * 1.1).toFixed(0)}" text-anchor="middle" font-size="${size.toFixed(1)}" fill="#d8ece8" stroke="#05090b" stroke-width="2.6" paint-order="stroke" font-family="ui-monospace,monospace">${l.text}</text>`);
  }
  labelLayer.innerHTML = out.join('');
}
drawLabels();

// ---- dev bar ----
const $ = (s) => document.querySelector(s);

function setRole(role) {
  const p = game.player;
  chooseRole(p, role);
  p.role = role;
  p.flags.roleChosen = true;
  p.hp = p.sheet.hpMax;
  p.mp = p.sheet.mpMax;
  document.querySelectorAll('#devbar [data-role]').forEach(b => b.classList.toggle('on', b.dataset.role === role));
  toast('Path: ' + role, 'info');
}

document.querySelectorAll('#devbar [data-role]').forEach(btn => {
  btn.addEventListener('click', () => setRole(btn.dataset.role));
});

$('#dummybtn')?.addEventListener('click', () => {
  const p = game.player;
  const m = makeMonster('rock_crab', 3, { x: p.x + 3.5, y: p.y + 2.5 });
  game.entities.push(m);
  toast('Spawned a live rock crab.', 'info');
});

$('#resetbtn')?.addEventListener('click', () => {
  game.entities = [];
  const fresh = game.world.loadZone();
  labels = fresh.labels;
  for (const e of fresh.entities ?? []) game.entities.push(e);
  for (const key of NPC_KEYS) {
    const y = fresh.labels.find(l => l.text === key)?.y ?? 120;
    const x = 16 + NPC_KEYS.indexOf(key) * 7.4;
    game.entities.push({
      kind: 'npc', id: key, name: key, title: 'dev', x, y, z: 0, radius: 0.4,
      facing: Math.PI, sprite: key, def: { id: key, name: key, title: 'dev', sprite: key }, home: { x, y },
    });
  }
  toast('Yard reset.', 'info');
});

const info = $('#devinfo');
let frames = 0, fpsT = performance.now(), fps = 0;
function tickInfo() {
  requestAnimationFrame(tickInfo);
  frames++;
  const now = performance.now();
  if (now - fpsT >= 500) {
    fps = Math.round((frames * 1000) / (now - fpsT));
    frames = 0; fpsT = now;
    if (info) {
      const monsters = game.entities.filter(e => e.kind === 'monster').length;
      info.textContent = `${fps} fps · ${labels.length} labels · ${monsters} dummies · view ${game.view}`;
    }
  }
}
tickInfo();

// ---- start (a gesture is required before the browser will play sound) ----
const title = $('#title');
const hud = $('#hud');
$('#enterbtn')?.addEventListener('click', () => {
  title?.classList.add('hidden');
  hud?.classList.remove('hidden');
  initAudio();
  game.running = true;
  game.start();
  setRole('warden');
  toast('WASD / stick to walk · 1–5 to change path', 'info');
});

// keyboard role switching on top of the normal input handler
window.addEventListener('keydown', (e) => {
  const roles = ['warden', 'drifter', 'technosavant', 'shaman', 'tinker'];
  const i = Number(e.key) - 1;
  if (i >= 0 && i < roles.length) setRole(roles[i]);
});
