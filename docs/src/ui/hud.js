// HUD: bars, hotbar, log, toasts, floating numbers, target card, interact prompt,
// and the guidance banner that always says where to go next.
import { project } from '../core/geom.js';
import { ABILITIES } from '../data/abilities.js';
import { timeString } from '../systems/farming.js';
import { zoneMood } from '../data/zones.js';
import { itemColor, BASE_BY_ID } from '../data/items.js';
import { QUESTS } from '../data/quests.js';
import { compass, activeObjective } from '../systems/guidance.js';
import { initAudio, updateAmbient, toggleMuted, isMuted } from '../audio/ambient.js';

const $ = (s) => document.querySelector(s);
let logBuf = [];
let interactEl = null;
let lastHotbarKey = '';
let gameRef = null;

export function logLine(game, msg, cls = '') {
  logBuf.push({ msg, cls, t: performance.now() });
  if (logBuf.length > 30) logBuf.shift();
  const el = $('#log');
  if (!el) return;
  el.innerHTML = logBuf.slice(-6).map(l => `<div class="${l.cls}">${esc(l.msg)}</div>`).join('');
}

export function toast(msg, kind = 'info') {
  const wrap = $('#toasts');
  if (!wrap) return;
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.textContent = msg;
  wrap.appendChild(d);
  while (wrap.children.length > 4) wrap.firstChild.remove();
  setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 420); }, 2400);
}

export function floatText(ent, text, cls = 'dmg') {
  const game = gameRef ?? window.__game;
  if (!game?.cam) return;
  const pr = project({ x: ent.x ?? 0, y: ent.y ?? 0, z: (ent.z ?? 0) + (ent.size ?? 0.9) * 0.9 }, game.cam);
  if (!pr) return;
  const wrap = $('#floaters');
  if (!wrap) return;
  const d = document.createElement('div');
  d.className = 'float ' + cls;
  d.textContent = text;
  d.style.left = pr.x + 'px';
  d.style.top = pr.y + 'px';
  wrap.appendChild(d);
  setTimeout(() => d.remove(), 950);
}

export function setTargetCard(game, target) {
  const card = $('#targetcard');
  if (!card) return;
  if (!target || target.hp <= 0) { card.classList.add('hidden'); return; }
  card.classList.remove('hidden', 'elite', 'rare', 'legend');
  if (target.tier === 'elite') card.classList.add('elite');
  if (target.tier === 'rare' || target.tier === 'unique') card.classList.add('rare');
  if (target.tier === 'legendary' || target.tier === 'boss') card.classList.add('legend');
  const nm = target.name + (target.title ? ', ' + target.title : '');
  card.querySelector('.tname').textContent = nm;
  card.querySelector('.tbar i').style.width = Math.max(0, (target.hp / target.hpMax) * 100) + '%';
  const mods = (target.mods ?? []).join(' · ');
  card.querySelector('.tinfo').textContent = `Lv ${target.level} ${target.family} · AC ${target.ac}${mods ? ' · ' + mods : ''}`;
}

export function showInteract(game, near) {
  const hud = $('#hud');
  if (!hud) return;
  if (!interactEl) {
    interactEl = document.createElement('button');
    interactEl.id = 'interactbtn';
    interactEl.className = 'chip';
    interactEl.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(146px + var(--safe-b));pointer-events:auto;font-size:10px;padding:8px 14px;border-color:#3f6f66;color:#cfece4;background:rgba(9,20,20,.88)';
    interactEl.addEventListener('click', () => window.__game?.interact());
    hud.appendChild(interactEl);
  }
  if (!near) { interactEl.classList.add('hidden'); return; }
  const label = {
    npc: () => 'Talk · ' + near.npc.name,
    node: () => (near.node.kind === 'fish' ? 'Fish' : near.node.kind === 'herb' ? 'Gather herbs' : 'Scavenge'),
    loot: () => 'Pick up ' + (near.loot.item?.name ?? 'item'),
    gate: () => 'Travel · ' + near.poi.name,
    waystone: () => 'Waystone · ' + near.poi.name,
    rift: () => 'Enter ' + near.poi.name,
    rift_exit: () => 'Leave the rift',
    camp: () => 'Camp · plots & fire',
    farm: () => 'Fields',
    board: () => 'Bounty board',
    cache: () => 'Open cache',
    ruin: () => near.poi.name,
    boss: () => near.poi.name,
  }[near.kind];
  interactEl.textContent = (label ? label() : near.poi?.name ?? 'Interact') + '  [E]';
  interactEl.classList.remove('hidden');
}

export function updateHud(game) {
  const p = game.player;
  if (!p) return;
  const s = p.sheet;
  $('#hud')?.classList.remove('hidden');
  setBar('#hpf', '#hpt', p.hp, s.hpMax, `${Math.ceil(p.hp)} / ${s.hpMax}`);
  setBar('#mpf', '#mpt', p.mp, s.mpMax, `${Math.floor(p.mp)} / ${s.mpMax}`);
  const xpNext = s.xpNext ?? 1000, xpThis = s.xpThis ?? 0;
  const pct = Math.max(0, Math.min(1, (p.xp - xpThis) / Math.max(1, xpNext - xpThis)));
  const xf = $('#xpf'); if (xf) xf.style.width = (pct * 100) + '%';
  const xt = $('#xpt'); if (xt) xt.textContent = `Lv ${p.level} · ${Math.floor(p.xp)} xp`;
  const zn = $('#zonename'); if (zn) zn.textContent = game.world.zone?.name ?? '—';
  const zi = $('#zoneinfo');
  if (zi) {
    const zone = game.world.zone;
    const alive = game.entities.filter(e => e.kind === 'monster' && e.hp > 0).length;
    zi.innerHTML = `<span>${timeString(p)}</span> · <span>lvl ${zone?.band?.[0]}–${zone?.band?.[1]}</span> · <span>${zoneMood(zone ?? {})}${alive ? ' · ' + alive : ''}</span>`;
  }
  updateQuestTracker(game);
  updateGuide(game);
  updateAmbient(game);
  updateHotbar(game);
}

function setBar(fill, text, v, max, label) {
  const f = $(fill), t = $(text);
  if (f) f.style.width = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100)) + '%';
  if (t) t.textContent = label;
}

export function updateQuestTracker(game) {
  const el = $('#questtrack');
  if (!el) return;
  const qs = game.player.quests.active.slice(-2).map(id => QUESTS[id]).filter(Boolean);
  if (!qs.length) { el.innerHTML = ''; return; }
  el.innerHTML = qs.map(q => {
    const prog = game.player.quests.progress[q.id] ?? [];
    return `<div class="q">${esc(q.name)}</div>` + q.objectives.map((o, i) =>
      `<div class="o ${prog[i] >= o.count ? 'done' : ''}">${prog[i] >= o.count ? '✓' : '·'} ${esc(o.label)} ${Math.min(prog[i] ?? 0, o.count)}/${o.count}</div>`
    ).join('');
  }).join('');
}

// The compass banner: quest name, the one thing to do, a needle, and metres.
// This is the answer to "what am I supposed to do" and it never goes blank.
export function updateGuide(game) {
  const box = $('#guide');
  if (!box) return;
  const c = compass(game);
  const needle = $('#needle');
  if (!c) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  const obj = activeObjective(game);
  const qname = obj?.quest?.name ?? 'Explore';
  const line = c.label ?? 'Look around';
  const qEl = $('#guidequest');
  const lEl = $('#guideline');
  const dEl = $('#guidedist');
  if (qEl) qEl.textContent = qname;
  if (lEl) lEl.textContent = line;
  if (dEl) dEl.textContent = c.dist < 2 ? 'here' : Math.round(c.dist) + ' m';
  if (needle) {
    const deg = (c.angle * 180 / Math.PI).toFixed(0);
    needle.style.transform = `rotate(${deg}deg)`;
  }
  box.classList.toggle('questing', !!obj);
  box.title = obj ? `${qname} — ${line}` : line;
}

export function hotbarSlots(game) {
  const p = game.player;
  const roleAbilities = p.role ? (Object.values(ABILITIES).filter(a => a.role === p.role).map(a => a.id)) : [];
  const slots = [{ id: 'attack', key: '1', label: '⚔', name: 'Attack' }];
  roleAbilities.forEach((id, i) => slots.push({ id, key: String(i + 2), label: ABILITIES[id].icon, name: ABILITIES[id].name }));
  slots.push({ id: 'dodge', key: '6', label: '➤', name: 'Roll' });
  const healItem = p.inv.find(i => i.base === 'bandage')
    ?? p.inv.find(i => i.base === 'ration')
    ?? p.inv.find(i => BASE_BY_ID[i.base]?.use?.heal);
  slots.push({ id: 'potion', key: '7', label: healItem?.icon ?? '✚', name: healItem?.name ?? 'Heal' });
  return slots;
}

export function updateHotbar(game) {
  const p = game.player;
  const bar = $('#hotbar');
  if (!bar || !p) return;
  const slots = hotbarSlots(game);
  const key = slots.map(s => s.id).join(',') + '|' + Math.round(game.now * 2);
  if (key === lastHotbarKey) return;
  lastHotbarKey = key;
  bar.innerHTML = slots.map(sl => {
    const ab = ABILITIES[sl.id];
    const cdLeft = Math.max(0, (p.cooldowns?.[sl.id] ?? 0) - game.now);
    const cdPct = ab && ab.cd ? Math.min(1, cdLeft / ab.cd) : 0;
    const rank = sl.id === 'potion' ? '' : (p.abilityTrain?.[sl.id]?.level ?? 1);
    return `<button class="slot ${cdLeft > 0 ? '' : 'ready'}" data-ability="${sl.id}" title="${sl.name}">
      <span class="k">${sl.key}</span>${sl.label}<span class="lv">${rank}</span>
      <span class="cd" style="transform:scaleY(${cdPct})"></span></button>`;
  }).join('');
}

export function initHud(game) {
  gameRef = game;
  const bar = $('#hotbar');
  if (bar) {
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ability]');
      if (!b) return;
      const id = b.dataset.ability;
      if (id === 'potion') {
        game.quickHeal();
        return;
      }
      if (id === 'attack') {
        game.cast('attack', { target: game.target });
        return;
      }
      game.cast(id, { target: game.target });
    });
  }
  $('#viewbtn')?.addEventListener('click', () => {
    const order = ['iso', 'third', 'first'];
    const next = order[(order.indexOf(game.view) + 1) % 3];
    game.setView(next);
    const b = $('#viewbtn');
    if (b) b.textContent = next === 'iso' ? 'ISOMETRIC' : next === 'third' ? 'THIRD' : 'FIRST';
  });
  const soundBtn = $('#soundbtn');
  if (soundBtn) {
    const paint = () => {
      const off = isMuted();
      soundBtn.textContent = off ? '🔇' : '♪';
      soundBtn.classList.toggle('off', off);
      soundBtn.title = off ? 'Sound off — tap for ambient' : 'Sound on — tap to mute';
    };
    paint();
    soundBtn.addEventListener('click', () => {
      initAudio();
      toggleMuted();
      paint();
      toast(isMuted() ? 'Sound off.' : 'Sound on.', 'info');
    });
  }
  document.querySelectorAll('[data-panel]').forEach(b => {
    b.addEventListener('click', () => game.panel(b.dataset.panel));
  });
  window.__game = game;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
