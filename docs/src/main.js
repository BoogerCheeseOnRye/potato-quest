import { Game } from './game.js';
import { initHud, toast } from './ui/hud.js';
import { initPanels, openPanel, closePanel } from './ui/panels.js';
import { initInput } from './input/input.js';
import { initScene } from './render/scene.js';
import { initAudio } from './audio/ambient.js';

const game = new Game();
window.__game = game;

initHud(game);
initPanels(game);
initInput(game);
initScene(game);

const $ = (s) => document.querySelector(s);
const title = $('#title');
const hud = $('#hud');
const newBtn = $('#newbtn');
const loadBtn = $('#loadbtn');

if (!game.hasSave() && loadBtn) loadBtn.style.display = 'none';

function begin() {
  title?.classList.add('hidden');
  hud?.classList.remove('hidden');
  initAudio(); // browsers only allow sound after a click
  game.start();
  openPanel(game, 'intro', { force: true });
  setTimeout(() => toast('Move: WASD / left stick · Attack: J / ⚔ · Interact: E / ✚', 'info'), 600);
}

newBtn?.addEventListener('click', () => {
  game.wipe();
  game.startCastaway();
  begin();
});

loadBtn?.addEventListener('click', () => {
  if (game.load()) begin();
  else toast('No save found.', 'info');
});

// keep the phone awake if we can
try {
  if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {});
} catch {}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.save();
});

window.addEventListener('beforeunload', () => game.save());

// iOS/Safari: block double-tap zoom on the play area
document.addEventListener('gesturestart', (e) => e.preventDefault());
