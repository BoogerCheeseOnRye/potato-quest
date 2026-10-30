// Input: keyboard + mouse, touch stick/buttons, and gamepad (GameSir & friends).
import { pickAt, screenToWorldGround } from '../render/scene.js';

const $ = (s) => document.querySelector(s);

const keys = new Set();
let gameRef = null;
let touchMode = false;
let stick = null;
let stickId = null;
let padPrev = {};

export function initInput(game) {  gameRef = game;
  const scene = $('#scene');
  if (!scene) return;

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // mouse / touch on the world
  let down = null;
  scene.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('#hud')) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    if (e.pointerType === 'touch') enableTouch();
  });
  scene.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 14) return;
    handleTap(e.clientX, e.clientY);
  });
  scene.addEventListener('pointercancel', () => { down = null; });

  // touch stick
  stick = $('#stick');
  if (stick) {
    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stickId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      updateStick(e);
    });
    stick.addEventListener('pointermove', (e) => { if (stickId === e.pointerId) updateStick(e); });
    const end = (e) => {
      if (stickId !== e.pointerId) return;
      stickId = null;
      game.input.moveX = 0; game.input.moveY = 0;
      const knob = stick.querySelector('i');
      if (knob) knob.style.transform = '';
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
  }

  buildTouchButtons();
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) enableTouch();
  setInterval(pollGamepad, 40);
}

function enableTouch() {  if (touchMode) return;
  touchMode = true;
  $('#touchui')?.classList.add('on');
  document.body.classList.add('touch');
}

function onKeyDown(e) {
  if (!gameRef) return;
  if (e.target?.tagName === 'INPUT') return;
  const code = e.code;
  keys.add(code);
  const g = gameRef;
  const map = {
    KeyC: 'char', KeyI: 'inv', KeyM: 'map', KeyQ: 'quests', KeyF: 'farm',
    KeyP: 'pets', KeyB: 'bounty', KeyO: 'craft',
  };
  if (map[code]) { e.preventDefault(); g.panel(map[code]); return; }
  if (code === 'Escape') { g.closePanel(); return; }
  if (code === 'Tab') { e.preventDefault(); cycleView(); return; }
  if (code === 'KeyJ' || code === 'Space') { e.preventDefault(); g.basicAttack(g.target); return; }
  if (code === 'KeyK' || code === 'KeyE') { e.preventDefault(); g.interact(); return; }
  if (code === 'KeyV') { cycleView(); return; }
  const digits = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5, Digit6: 6, Digit7: 7 };
  if (digits[code]) {
    const slots = hotbarIds();
    const id = slots[digits[code] - 1];
    if (id === 'potion') {
      g.quickHeal();
      return;
    }
    if (id === 'attack') { g.basicAttack(g.target); return; }
    if (id) g.cast(id, { target: g.target });
  }
}

function hotbarIds() {
  const g = gameRef;
  const ids = ['attack'];
  const order = ['cleave', 'shieldBash', 'rally', 'bulwark', 'backstab', 'smokeStep', 'volley', 'pickpocket', 'arcBolt', 'staticField', 'overclock', 'discharge', 'thornLash', 'beastBond', 'mend', 'sporeCloud', 'scrapShot', 'turret', 'patchUp', 'overload'];
  const mine = order.filter(id => g.player.abilityTrain?.[id]);
  ids.push(...mine);
  ids.push('dodge', 'potion');
  return ids;
}

function cycleView() {
  const g = gameRef;
  const order = ['iso', 'third', 'first'];
  g.setView(order[(order.indexOf(g.view) + 1) % 3]);
  const b = $('#viewbtn');
  if (b) b.textContent = g.view === 'iso' ? 'ISOMETRIC' : g.view === 'third' ? 'THIRD' : 'FIRST';
}

function updateStick(e) {
  const r = stick.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = (e.clientX - cx) / (r.width * 0.38);
  let dy = (e.clientY - cy) / (r.height * 0.38);
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  gameRef.input.moveX = dx;
  gameRef.input.moveY = -dy;
  gameRef.input.moveTarget = null;
  gameRef.autoTarget = null;
  const knob = stick.querySelector('i');
  if (knob) knob.style.transform = `translate(${dx * 26}px,${dy * 26}px)`;
}

function handleTap(sx, sy) {
  const g = gameRef;
  if (!g?.player) return;
  const ent = pickAt(sx, sy);
  if (ent && ent.kind === 'monster' && ent.hp > 0) {
    g.target = ent;
    g.basicAttack(ent);
    return;
  }
  if (ent && ent.kind === 'npc') {
    g.panel('npc', { npc: ent });
    return;
  }
  if (ent && ent.kind === 'loot') { g.pickupLoot(ent); return; }
  const wp = screenToWorldGround(sx, sy, g);
  g.input.moveTarget = wp;
  g.autoTarget = null;
  g.target = null;
}

function buildTouchButtons() {
  const host = $('#tbtns');
  if (!host) return;
  const defs = [
    { id: 'tbtn1', icon: '⚔', act: () => gameRef.basicAttack(gameRef.target) },
    { id: 'tbtn2', icon: '✦', act: () => castFirst() },
    { id: 'tbtn3', icon: '✚', act: () => gameRef.interact() },
    { id: 'tbtn4', icon: '➤', act: () => gameRef.cast('dodge') },
  ];
  host.innerHTML = defs.map(d => `<button class="tbtn" id="${d.id}">${d.icon}<span class="cd"></span></button>`).join('');
  defs.forEach(d => {
    const el = document.getElementById(d.id);
    if (el) el.addEventListener('pointerdown', (e) => { e.preventDefault(); d.act(); });
  });
}

function castFirst() {
  const g = gameRef;
  const ids = Object.keys(g.player.abilityTrain ?? {}).filter(id => id !== 'attack');
  const id = ids[0];
  if (id) g.cast(id, { target: g.target });
}

function pollGamepad() {
  if (!gameRef?.player) return;
  const pads = navigator.getGamepads?.() ?? [];
  const pad = [...pads].find(p => p && p.connected);
  if (!pad) return;
  const g = gameRef;
  const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
  const dead = 0.22;
  if (Math.hypot(ax, ay) > dead) {
    g.input.moveX = ax;
    g.input.moveY = -ay;
    g.input.moveTarget = null;
  } else if (g.input.padActive) {
    g.input.moveX = 0; g.input.moveY = 0;
  }
  g.input.padActive = Math.hypot(ax, ay) > dead;
  const btn = (i) => pad.buttons[i]?.pressed;
  const pressed = (i) => btn(i) && !padPrev[i];
  if (pressed(0)) g.basicAttack(g.target);
  if (pressed(2)) g.interact();
  if (pressed(3)) castFirst();
  if (pressed(1)) { const ids = Object.keys(g.player.abilityTrain ?? {}).filter(id => id !== 'attack'); if (ids[1]) g.cast(ids[1], { target: g.target }); }
  if (pressed(4)) { const ids = Object.keys(g.player.abilityTrain ?? {}).filter(id => id !== 'attack'); if (ids[2]) g.cast(ids[2], { target: g.target }); }
  if (pressed(5)) { const ids = Object.keys(g.player.abilityTrain ?? {}).filter(id => id !== 'attack'); if (ids[3]) g.cast(ids[3], { target: g.target }); }
  if (pressed(6)) g.cast('dodge');
  if (pressed(7)) g.quickHeal();
  if (pressed(12)) cycleView();
  if (pressed(13)) cycleView();
  if (pressed(9)) g.panel('menu');
  padPrev = {};
  pad.buttons.forEach((b, i) => { padPrev[i] = b.pressed; });
}

// called once per frame by the game loop
export function pollKeys(game) {
  if (!game?.player || game.paused) return;
  let x = 0, y = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (x || y) {
    game.input.moveX = x;
    game.input.moveY = y;
    game.input.moveTarget = null;
  } else if (!stickId && !game.input.padActive) {
    game.input.moveX = 0;
    game.input.moveY = 0;
  }
}
