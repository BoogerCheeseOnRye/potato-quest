// All full-screen panels: sheet, bag, quests, map, camp/farm, NPCs, crafting,
// pets, bounties, menu, role pick. One delegated click handler drives them.
import { CLASSES, ABILITIES as ABIL, fmtMod, mod, ABILITY_NAMES, SKILLS, SAVE_NAMES } from '../rules/dnd.js';
import { ABILITIES, abilityLine, rankMult } from '../data/abilities.js';
import { QUESTS, QUEST_LIST, MAIN_QUESTS } from '../data/quests.js';
import { PROFESSIONS, PROF_LIST } from '../data/professions.js';
import { itemColor, itemLines, isEquipment, RARITY, BASE_BY_ID, statLabel } from '../data/items.js';
import { equip, unequip, sellItem, addItem, dropItem } from '../systems/inventory.js';
import { canCraft, profLevel, trainProf, trainAbility } from '../systems/progression.js';
import { ensurePlots, plotState, plant, harvest, water, allPlots, timeString } from '../systems/farming.js';
import { availableFrom, questState, progressFor, isReady, acceptQuest } from '../systems/quests.js';
import { recalc } from '../systems/sheet.js';
import { NPCS } from '../data/npcs.js';
import { ZONE_BY_ID, ZONE_ORDER, zoneMood } from '../data/zones.js';
import { esc } from './hud.js';

let gameRef = null, current = null, data = {}, tab = null, selectedUid = null;
const $ = (s) => document.querySelector(s);

export function isPanelOpen() { return !!current; }

export function openPanel(game, name, opts = {}) {
  gameRef = game;
  if (current === name && !opts.force) { closePanel(game); return; }
  current = name; data = opts; tab = opts.tab ?? null; selectedUid = null;
  render();
  game.paused = name !== 'map';
}

export function closePanel(game) {
  const was = current;
  current = null; data = {}; tab = null; selectedUid = null;
  const host = $('#panels');
  if (host) host.innerHTML = '';
  document.querySelector('.tooltip')?.remove();
  if (game) {
    game.paused = false;
    if (was === 'intro' && !game.player?.flags.roleChosen) {
      setTimeout(() => { if (!current) openPanel(game, 'role', { force: true }); }, 220);
    }
  }
}

export function refreshOpen() { if (current) render(); }

function render() {
  const host = $('#panels');
  if (!host || !gameRef) return;
  const p = gameRef.player;
  if (!p) { host.innerHTML = ''; return; }
  let title = '', body = '', tabs = null;
  switch (current) {
    case 'char': title = 'Character Sheet'; body = charPanel(gameRef, p); break;
    case 'inv': title = 'Bag & Kit'; body = invPanel(gameRef, p); break;
    case 'quests': title = 'Journal'; body = questPanel(gameRef, p); break;
    case 'map': title = 'Map'; body = mapPanel(gameRef, p); break;
    case 'farm': title = 'Camp & Fields'; body = farmPanel(gameRef, p); break;
    case 'npc': title = data.npc?.name ?? 'Talk'; body = npcPanel(gameRef, p, data.npc); break;
    case 'craft': title = 'Professions'; body = craftPanel(gameRef, p); break;
    case 'pets': title = 'Companions'; body = petPanel(gameRef, p); break;
    case 'bounty': title = 'Bounty Board'; body = bountyPanel(gameRef, p); break;
    case 'menu': title = 'Menu'; body = menuPanel(gameRef, p); break;
    case 'role': title = 'Choose a Path'; body = rolePanel(gameRef, p); break;
    case 'intro': title = 'Wrack Shore'; body = introPanel(gameRef, p); break;
    default: title = 'Panel'; body = '<p class="mini">Nothing here yet.</p>';
  }
  host.innerHTML = `<div class="panel"><header><h2>${esc(title)}</h2>
    <button class="close" data-act="close">✕</button></header>
    <div class="body">${body}</div></div>`;
  const bodyEl = host.querySelector('.body');
  if (bodyEl) bodyEl.scrollTop = 0;
}

// ---------------- character ----------------
function charPanel(game, p) {
  const s = p.sheet;
  const cls = CLASSES[p.role];
  const abilRows = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(a => `
    <div class="abil"><div class="an">${a.toUpperCase()}</div><div class="av">${s[a]}</div><div class="am">${fmtMod(mod(s[a]))}</div></div>`).join('');
  const skills = SKILLS.map(sk => {
    const t = p.skills?.[sk.id] ?? { level: 0 };
    return `<div class="rowline"><span class="k">${sk.name} <span class="mini">(${sk.ab.toUpperCase()})</span></span><span class="v">${t.level} · ${fmtMod(s.skills[sk.id] ?? 0)}</span></div>`;
  }).join('');
  const abilities = Object.values(ABILITIES).filter(a => a.role === p.role).map(a => {
    const r = p.abilityTrain?.[a.id]?.level ?? 1;
    return `<div class="rowline"><span class="k">${a.icon} ${a.name} <span class="mini">rank ${r}</span></span><span class="v">${abilityLine(a, r)}</span></div>`;
  }).join('');
  const gear = Object.entries(p.equip ?? {}).filter(([, it]) => it).map(([slot, it]) =>
    `<div class="rowline"><span class="k">${slot}</span><span class="v" style="color:${itemColor(it)}">${esc(it.name)}</span></div>`).join('') || '<div class="mini">Nothing equipped.</div>';
  return `
    <div class="rowline"><span class="k">${esc(p.name)} — ${cls?.name ?? 'Castaway'}</span><span class="v">Level ${p.level} · ${p.marks} marks</span></div>
    <div class="mini" style="margin:4px 0 10px">${cls?.blurb ?? 'A castaway with no path yet.'}</div>
    <h3>Abilities ${p.unspentPoints ? `<span class="pill on">${p.unspentPoints} point${p.unspentPoints > 1 ? 's' : ''} to spend</span>` : ''}</h3>
    <div class="grid6">${abilRows}</div>
    ${p.unspentPoints ? `<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(a => `<button class="chip" data-act="raise" data-abil="${a}">+1 ${a.toUpperCase()}</button>`).join('')}</div>` : ''}
    <h3>Combat</h3>
    <div class="kv">
      <span class="k">Hit points</span><span class="v">${Math.ceil(p.hp)} / ${s.hpMax}</span>
      <span class="k">Energy</span><span class="v">${Math.floor(p.mp)} / ${s.mpMax}</span>
      <span class="k">Armour class</span><span class="v">${s.ac}${s.proficientArmor ? '' : ' (unproficient)'}</span>
      <span class="k">Base attack</span><span class="v">+${s.atk}</span>
      <span class="k">Damage</span><span class="v">${s.dmg} +${s.dmgBonus} (crit ${s.critRange}–20 ×${s.critMult})</span>
      <span class="k">Saves</span><span class="v">F ${fmtMod(s.saves.fort)} · R ${fmtMod(s.saves.ref)} · W ${fmtMod(s.saves.will)}</span>
      <span class="k">Resist</span><span class="v">${Object.entries(s.resists).filter(([, v]) => v).map(([k, v]) => k + ' ' + v).join(' · ') || '—'}</span>
      <span class="k">Kills / tamed</span><span class="v">${p.kills ?? 0} / ${p.tamed ?? 0}</span>
    </div>
    <h3>Skills <span class="mini">trained by use</span></h3>
    ${skills}
    <h3>Path abilities</h3>
    ${abilities || '<div class="mini">Choose a path first.</div>'}
    <h3>Equipment</h3>
    ${gear}
    <div class="mini" style="margin-top:10px">XP ${Math.floor(p.xp)} / ${s.xpNext} · next level ${s.xpNext - Math.floor(p.xp)} away</div>`;
}

// ---------------- inventory ----------------
function invPanel(game, p) {
  const eq = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'ring', 'charm'].map(slot => {
    const it = p.equip?.[slot];
    return `<div class="eqslot" ${it ? `data-uid="${it.uid}"` : ''}><div class="es">${slot}</div>
      <div class="en ${it ? it.rarity : ''}">${it ? esc(it.name) : '—'}</div></div>`;
  }).join('');
  const cells = [];
  for (let i = 0; i < 30; i++) {
    const it = p.inv[i];
    if (!it) { cells.push('<div class="islot"></div>'); continue; }
    cells.push(`<div class="islot filled ${selectedUid === it.uid ? 'equipped' : ''}" data-uid="${it.uid}">
      <span class="gem" style="background:${itemColor(it)}"></span>${it.icon ?? '?'}
      ${(it.qty ?? 1) > 1 ? `<span class="qty">${it.qty}</span>` : ''}</div>`);
  }
  const sel = p.inv.find(i => i.uid === selectedUid);
  let actions = '';
  if (sel) {
    const b = BASE_BY_ID[sel.base];
    const usable = !!b?.use;
    actions = `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span class="mini" style="flex:1">${esc(sel.name)}</span>
      ${isEquipment(sel) ? '<button class="chip" data-act="equip">Equip</button>' : ''}
      ${usable ? '<button class="chip" data-act="use">Use</button>' : ''}
      <button class="chip" data-act="sell">Sell ${Math.max(1, Math.round((sel.value || 1) * 0.4))}</button>
      <button class="chip" data-act="drop">Drop</button></div>`;
  }
  return `
    <div class="rowline"><span class="k">${p.inv.length}/30 slots · ${p.marks} marks</span><span class="v">bag worth ${p.inv.reduce((n, i) => n + (i.value || 0) * (i.qty || 1), 0)}</span></div>
    <h3>Worn</h3>
    <div class="equip">${eq}</div>
    <h3>Bag</h3>
    <div class="invgrid">${cells.join('')}</div>
    ${actions}
    <div class="mini" style="margin-top:10px">Tap an item to inspect it. Worn gear can be tapped to take it off.</div>`;
}

// ---------------- quests ----------------
function questPanel(game, p) {
  const active = p.quests.active.map(id => QUESTS[id]).filter(Boolean);
  const done = p.quests.done.map(id => QUESTS[id]).filter(Boolean);
  const act = active.map(q => questEntry(game, p, q)).join('') || '<div class="mini">Nothing pressing. Talk to people; they always want something.</div>';
  const mainDone = MAIN_QUESTS.filter(q => p.quests.done.includes(q.id)).length;
  return `<div class="mini" style="margin-bottom:8px">Main line: ${mainDone}/${MAIN_QUESTS.length} · side quests done: ${done.filter(q => q.side).length}</div>
    <h3>Active</h3>${act}
    <h3>Completed</h3>
    ${done.slice(-8).reverse().map(q => `<div class="qentry done"><div class="qt">${esc(q.name)}</div></div>`).join('') || '<div class="mini">None yet.</div>'}`;
}

function questEntry(game, p, q) {
  const prog = progressFor(p, q.id);
  return `<div class="qentry">
    <div class="qt">${esc(q.name)} ${q.main ? '<span class="pill">main</span>' : ''}</div>
    <div class="qd">${esc(q.desc)}</div>
    ${q.objectives.map((o, i) => `<div class="qo ${prog[i] >= o.count ? 'done' : 'todo'}">${prog[i] >= o.count ? '✓' : '○'} ${esc(o.label)} ${Math.min(prog[i] ?? 0, o.count)}/${o.count}</div>`).join('')}
    <div class="qr">Reward: ${q.rewards.xp ?? 0} xp${q.rewards.marks ? ` · ${q.rewards.marks} marks` : ''}${q.rewards.items?.length ? ' · ' + q.rewards.items.map(i => i.id).join(', ') : ''}</div>
  </div>`;
}

// ---------------- map ----------------
function mapPanel(game, p) {
  const zone = game.world.zone;
  const W = 260;
  const scale = W / zone.size;
  const poiSvg = zone.pois.map(poi => {
    const c = { camp: '#7fd06a', gate: '#e8a33d', waystone: '#3fd1c0', rift: '#8f7bff', npc: '#d9c46a', vendor: '#e8c14a', trainer: '#e8a33d', boss: '#c8372d', cache: '#5aa9ff', farm: '#7fd06a', board: '#c9d6da', ruin: '#9fb4ba' }[poi.kind] ?? '#9fb4ba';
    const r = poi.kind === 'boss' ? 5 : 3.5;
    return `<circle cx="${poi.x * scale}" cy="${(zone.size - poi.y) * scale}" r="${r}" fill="${c}" opacity=".9"/>
      <text x="${poi.x * scale}" y="${(zone.size - poi.y) * scale - 6}" font-size="5" fill="#cfe0e4" text-anchor="middle">${esc(poi.name.split(' ')[0])}</text>`;
  }).join('');
  const water = game.world.state.water.map(w => `<circle cx="${w.x * scale}" cy="${(zone.size - w.y) * scale}" r="${w.r * scale}" fill="#12343a" opacity=".6"/>`).join('');
  const monsters = game.entities.filter(e => e.kind === 'monster' && e.hp > 0).map(m =>
    `<circle cx="${m.x * scale}" cy="${(zone.size - m.y) * scale}" r="${m.tier === 'normal' ? 1.3 : 2.6}" fill="${m.tier === 'normal' ? '#c4552f' : m.tier === 'elite' ? '#5aa9ff' : '#e0892a'}"/>`).join('');
  const px = p.x * scale, py = (zone.size - p.y) * scale;
  const discovered = p.flags.waystones ?? {};
  const travel = ZONE_ORDER.filter(z => discovered[z] && z !== zone.id).map(z =>
    `<button class="chip" data-act="travel" data-zone="${z}">${esc(ZONE_BY_ID[z].name)}</button>`).join('');
  return `
    <div class="mapwrap"><svg class="mapsvg" viewBox="0 0 ${W} ${W}">
      <rect width="${W}" height="${W}" fill="${zone.palette.ground}"/>
      ${water}
      <g opacity=".5">${game.world.state.patches.slice(0, 40).map(pt => `<circle cx="${pt.x * scale}" cy="${(zone.size - pt.y) * scale}" r="${pt.r * scale}" fill="${zone.palette.ground2}" opacity=".35"/>`).join('')}</g>
      ${poiSvg}${monsters}
      <circle cx="${px}" cy="${py}" r="3.6" fill="#eaf7f4" stroke="#0b1113"/>
      <text x="${px}" y="${py - 7}" font-size="6" fill="#eaf7f4" text-anchor="middle">you</text>
    </svg></div>
    <div class="legend"><span>◆ you</span><span style="color:#7fd06a">● camp/farm</span><span style="color:#e8a33d">● gate</span><span style="color:#3fd1c0">● waystone</span><span style="color:#8f7bff">● rift</span><span style="color:#c4552f">● creature</span></div>
    <h3>${esc(zone.name)} <span class="mini">${zoneMood(zone)} · level ${zone.band[0]}–${zone.band[1]}</span></h3>
    <div class="mini">${esc(zone.lore ?? '')}</div>
    <h3>Fast travel ${travel ? '' : '<span class="mini">(find waystones)</span>'}</h3>
    <div style="display:flex;gap:5px;flex-wrap:wrap">${travel || '<span class="mini">No other waystones known yet.</span>'}</div>
    <h3>World</h3>
    <div class="mini">${ZONE_ORDER.map(z => `<span class="pill ${z === zone.id ? 'on' : ''}">${esc(ZONE_BY_ID[z].name)}</span>`).join(' ')}</div>`;
}

// ---------------- camp / farm / crafting ----------------
function farmPanel(game, p) {
  const zoneId = game.world.zone?.id;
  const plots = ensurePlots(p, zoneId);
  const plotCards = plots.map((plot, i) => {
    const st = plotState(plot, p.time);
    if (st.state === 'empty') {
      const seeds = p.inv.filter(it => BASE_BY_ID[it.base]?.kind === 'seed');
      return `<div class="plot empty"><div class="pi">▫</div><div class="pn">Empty plot</div>
        <div class="pt">${seeds.length ? 'plant:' : 'no seeds'}</div>
        ${seeds.map(sd => `<button class="chip" style="margin-top:2px;font-size:8px" data-act="plant" data-plot="${i}" data-seed="${sd.base}">${sd.name.replace(' Seed', '')}</button>`).join('')}
      </div>`;
    }
    const def = plot.plant;
    return `<div class="plot ${st.state}"><div class="pi">${def === 'grain' ? '🌾' : def === 'root' ? '🥕' : '🫐'}</div>
      <div class="pn">${def}</div><div class="pt">${st.state === 'ready' ? 'ready' : Math.ceil(st.hoursLeft) + 'h left'}</div>
      ${st.state === 'ready' ? `<button class="chip" data-act="harvest" data-plot="${i}">Harvest</button>` : `<button class="chip" data-act="water" data-plot="${i}">Water</button>`}</div>`;
  }).join('');
  const profs = PROF_LIST.filter(pr => pr.recipes.length).map(pr => {
    const lvl = profLevel(p, pr.id);
    const rows = pr.recipes.map(r => {
      const chk = canCraft(p, pr.id, r);
      const ins = r.in.map(x => `${x.qty}× ${BASE_BY_ID[x.id]?.name ?? x.id}`).join(' + ');
      return `<div class="shopitem"><span class="si">${BASE_BY_ID[r.out.id]?.icon ?? '·'}</span>
        <span class="sn">${esc(r.name)} <span class="mini">${ins}</span></span>
        <span class="sp">${r.lvl}</span>
        <button class="buybtn" data-act="craft" data-prof="${pr.id}" data-recipe="${r.id}" ${chk.ok ? '' : 'disabled style="opacity:.35"'}>make</button></div>`;
    }).join('');
    return `<h3>${pr.icon} ${pr.name} <span class="mini">level ${lvl}</span></h3>${rows}`;
  }).join('');
  const seedsHint = p.inv.filter(it => BASE_BY_ID[it.base]?.kind === 'seed').map(it => `${it.name}×${it.qty}`).join(', ') || 'none';
  const hasBed = p.inv.some(it => it.base === 'bedroll');
  const mins = (p.time ?? 0) % 1440;
  const night = mins >= 18 * 60 || mins < 6 * 60;
  const sleepRow = hasBed
    ? `<button class="chip" data-act="sleep" ${night ? '' : 'disabled style="opacity:.4"'}>🛏️ Sleep until dawn (${timeString(p)})</button>
       <span class="mini">${night ? 'Rest to 06:00.' : 'The bedroll is for the night. Sleep after dusk.'}</span>`
    : `<span class="mini">No bedroll. You cannot sleep rough without one.</span>`;
  return `<div class="mini">${esc(game.world.zone?.name ?? '')} · plots: ${plots.length} · seeds: ${esc(seedsHint)}</div>
    <div class="farmgrid" style="margin-top:8px">${plotCards || '<div class="mini">No plots here. Camp and Havenreach have soil.</div>'}</div>
    <div class="mini" style="margin-top:8px">Crops grow in game time (1 real second ≈ 1 game minute). Watering cuts 20% off.</div>
    <div style="margin:10px 0 4px">${sleepRow}</div>
    <h3>Crafting</h3>${profs}`;
}

function craftPanel(game, p) {
  const profs = PROF_LIST.map(pr => {
    const lvl = profLevel(p, pr.id);
    const rows = pr.recipes.map(r => {
      const chk = canCraft(p, pr.id, r);
      const ins = r.in.map(x => `${x.qty}× ${BASE_BY_ID[x.id]?.name ?? x.id}`).join(' + ');
      return `<div class="shopitem"><span class="si">${BASE_BY_ID[r.out.id]?.icon ?? '·'}</span>
        <span class="sn">${esc(r.name)} <span class="mini">${ins}</span></span>
        <button class="buybtn" data-act="craft" data-prof="${pr.id}" data-recipe="${r.id}" ${chk.ok ? '' : 'disabled style="opacity:.35"'}>make</button></div>`;
    }).join('');
    return `<h3>${pr.icon} ${pr.name} <span class="mini">level ${lvl} · ${pr.desc}</span></h3>${rows || '<div class="mini">Gather with this profession in the world.</div>'}`;
  }).join('');
  return profs;
}

// ---------------- NPC ----------------
function npcPanel(game, p, npcEnt) {
  const def = npcEnt?.def ?? NPCS[npcEnt?.id];
  if (!def) return '<div class="mini">Nobody here.</div>';
  const avail = availableFrom(p, def.id);
  const active = p.quests.active.map(id => QUESTS[id]).filter(q => q?.giver === def.id);
  const questRows = [
    ...active.map(q => `<div class="qentry"><div class="qt">${esc(q.name)} <span class="pill">active</span></div><div class="qd">${esc(q.desc)}</div></div>`),
    ...avail.map(q => `<div class="qentry"><div class="qt">${esc(q.name)}</div><div class="qd">${esc(q.desc)}</div>
      <button class="chip" data-act="accept" data-quest="${q.id}">Accept</button>
      <span class="qr">${q.rewards.xp ?? 0} xp${q.rewards.marks ? ' · ' + q.rewards.marks + ' marks' : ''}</span></div>`),
  ].join('') || '<div class="mini">Nothing to say about work.</div>';
  const shop = (def.shop ?? []).map(s => {
    const b = BASE_BY_ID[s.id];
    return `<div class="shopitem"><span class="si">${b?.icon ?? '·'}</span><span class="sn">${esc(b?.name ?? s.id)}</span>
      <span class="sp">${s.price}</span><button class="buybtn" data-act="buy" data-npc="${def.id}" data-item="${s.id}">buy</button></div>`;
  }).join('');
  const train = def.drills?.map(d => `<div class="shopitem"><span class="si">✎</span><span class="sn">${esc(d.name)} <span class="mini">${esc(d.desc)}</span></span>
    <span class="sp">${d.cost}</span><button class="buybtn" data-act="drill" data-drill="${d.id}">do</button></div>`).join('') ?? '';
  return `<div class="rowline"><span class="k">${esc(def.name)}</span><span class="v">${esc(def.title ?? '')}</span></div>
    <div class="mini" style="margin:6px 0 10px;font-style:italic">“${esc(def.greeting)}”</div>
    <h3>Work</h3>${questRows}
    ${shop ? `<h3>Trade</h3>${shop}` : ''}
    ${train ? `<h3>Drills</h3>${train}` : ''}`;
}

// ---------------- pets ----------------
function petPanel(game, p) {
  if (!p.pets.length) return `<div class="mini">No companions. Weaken a beast (below 40% health) and use Beast Bond, or tame with the Shaman's ability. Pets follow, fight and level with you.</div>`;
  return p.pets.map(pet => `
    <div class="qentry">
      <div class="qt">${esc(pet.name)} <span class="pill">${pet.species.replace(/_/g, ' ')} · lv ${pet.level}</span></div>
      <div class="qrow mini">HP ${Math.round(pet.hp)}/${pet.hpMax} · AC ${pet.ac} · atk +${pet.atk} · ${pet.dmg}</div>
      <div class="mini">Abilities: ${pet.abilities.join(' · ')}</div>
      <div style="margin-top:6px;display:flex;gap:5px">
        <button class="chip" data-act="petactive" data-pet="${pet.id}">${p.activePet === pet.id ? '✓ active' : 'set active'}</button>
        <button class="chip" data-act="petmode" data-pet="${pet.id}">${pet.mode === 'stay' ? 'stay' : 'follow'}</button>
      </div>
    </div>`).join('');
}

// ---------------- bounty ----------------
function bountyPanel(game, p) {
  const bounties = p.quests.active.map(id => QUESTS[id]).filter(q => q?.bounty);
  return `<div class="mini">The board posts work for whoever is standing. Rewards scale with your level.</div>
    <h3>Posted</h3>${bounties.map(q => questEntry(game, p, q)).join('') || '<div class="mini">Nothing taken.</div>'}
    <button class="chip" style="margin-top:10px" data-act="bounty">Take a new bounty</button>`;
}

// ---------------- menu ----------------
function menuPanel(game, p) {
  return `<div class="kv">
      <span class="k">Version</span><span class="v">0.1 · stand-in art</span>
      <span class="k">Zone</span><span class="v">${esc(game.world.zone?.name ?? '')}</span>
      <span class="k">Played</span><span class="v">${Math.floor((p.playtime ?? 0) / 60)} min</span>
      <span class="k">Kills</span><span class="v">${p.kills ?? 0}</span>
    </div>
    <h3>View</h3>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${['iso', 'third', 'first'].map(v => `<button class="chip ${game.view === v ? 'on' : ''}" data-act="view" data-view="${v}">${v}</button>`).join('')}
    </div>
    ${!p.flags.roleChosen ? '<h3>Path</h3><button class="chip" data-act="rolepick">Choose a path</button>' : ''}
    <h3>Controls</h3>
    <div class="mini" style="line-height:1.7">
      <b>Keyboard</b>: WASD/arrows move · J or left click attack · K/E interact · 1–7 abilities · Tab view · C sheet · I bag · M map · Q quests · Esc close<br>
      <b>Mouse</b>: click ground to move, click a creature to attack · drag to pan camera<br>
      <b>Touch</b>: left stick moves · right buttons attack/abilities · tap a creature to target, tap ground to walk<br>
      <b>Gamepad</b>: left stick move · A attack · X interact · Y/B/LT/RT abilities · D-pad view
    </div>
    <h3>Save</h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="chip" data-act="save">Save now</button>
      <button class="chip" data-act="reload">Reload save</button>
      <button class="chip" data-act="wipe">Erase save</button>
    </div>
    <div class="mini" style="margin-top:14px">POTATO QUEST — a 2.5D SVG action RPG. Everything is drawn as vectors; the "textures" are placeholders until the systems are tested.</div>`;
}

// ---------------- role / intro ----------------
function rolePanel(game, p) {
  return `<div class="mini" style="margin-bottom:8px">The sea did not care what you were before. Pick what you are now. This is permanent for this character.</div>
    <div style="display:grid;gap:6px">
    ${Object.values(CLASSES).map(c => `<button class="role" data-act="role" data-role="${c.id}">
      <div class="rn">${c.name}</div><div class="rd">${c.blurb}</div>
      <div class="rs">d${c.hitDie} · ${c.primary.toUpperCase()} · ${c.abilities.map(a => ABILITIES[a]?.name).join(', ')}</div></button>`).join('')}
    </div>`;
}

function introPanel(game, p) {
  return `<div class="mini" style="line-height:1.7">
    You remember water. A lot of it. Then shingle, and gulls, and a sky the colour of a dead screen.<br><br>
    The wreck behind you is not yours, or not only yours. Ahead: a shore of black rock, a waystone humming somewhere inland, and a thin line of smoke that could be a person.<br><br>
    Everything else is the ruin of something that used to be very large.<br><br>
    You have the clothes on your back, one ration, and a bedroll. No weapon, no coin.
    </div>
    <div style="display:flex;gap:6px;margin-top:14px">
      <button class="chip" data-act="rolepick">Choose a path</button>
      <button class="chip" data-act="close">Look around first</button>
    </div>`;
}

// ---------------- events ----------------
export function initPanels(game) {
  gameRef = game;
  const host = $('#panels');
  if (!host) return;
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const uidEl = e.target.closest('[data-uid]');
    const p = game.player;
    if (!p) return;
    if (uidEl && !btn) {
      const uid = uidEl.dataset.uid;
      const item = p.inv.find(i => i.uid === uid) ?? Object.values(p.equip ?? {}).find(i => i?.uid === uid);
      if (item) {
        if (Object.values(p.equip ?? {}).includes(item)) {
          const slot = Object.keys(p.equip).find(k => p.equip[k]?.uid === item.uid);
          unequip(p, slot);
          recalc(p);
          render();
          return;
        }
        selectedUid = selectedUid === uid ? null : uid;
        render();
        return;
      }
    }
    if (!btn) return;
    const act = btn.dataset.act;
    switch (act) {
      case 'close': closePanel(game); break;
      case 'raise': {
        if (p.unspentPoints > 0) {
          p.abilities[btn.dataset.abil] += 1;
          p.unspentPoints--;
          p.sheet = recalc(p);
          render();
        }
        break;
      }
      case 'equip': {
        const it = p.inv.find(i => i.uid === selectedUid);
        if (it) { const r = equip(p, it); p.sheet = recalc(p); game.log?.(r.ok ? `Equipped ${it.name}.` : r.msg); selectedUid = null; render(); }
        break;
      }
      case 'use': {
        const it = p.inv.find(i => i.uid === selectedUid);
        if (it) { game.useConsumable(it); selectedUid = null; render(); }
        break;
      }
      case 'sell': {
        const it = p.inv.find(i => i.uid === selectedUid);
        if (it) { const price = sellItem(p, it); game.log?.(`Sold ${it.name} for ${price}.`); selectedUid = null; render(); }
        break;
      }
      case 'drop': {
        const it = p.inv.find(i => i.uid === selectedUid);
        if (it) { dropItem(p, it); selectedUid = null; render(); }
        break;
      }
      case 'plant': {
        const plots = ensurePlots(p, game.world.zone?.id);
        const res = plant(p, plots[+btn.dataset.plot], btn.dataset.seed, p.time);
        if (!res.ok) game.toast?.(res.why, 'info');
        else game.toast?.('Planted.', 'info');
        render();
        break;
      }
      case 'harvest': {
        const plots = ensurePlots(p, game.world.zone?.id);
        const res = harvest(p, plots[+btn.dataset.plot], p.time);
        if (!res.ok) game.toast?.(res.why, 'info');
        else {
          game.toast?.(`Harvested ${res.qty}× ${res.name}`, 'loot');
          game.emit?.('harvest', res.crop, res.qty);
          if (res.prof?.ups) game.toast?.(`Farming ${res.prof.level}`);
        }
        render();
        break;
      }
      case 'water': {
        const plots = ensurePlots(p, game.world.zone?.id);
        water(p, plots[+btn.dataset.plot]);
        render();
        break;
      }
      case 'sleep': {
        game.sleep?.();
        render();
        break;
      }
      case 'craft': {
        const { prof, recipe } = findRecipe(btn.dataset.prof, btn.dataset.recipe);
        const chk = canCraft(p, prof.id, recipe);
        if (!chk.ok) { game.toast?.(chk.why, 'info'); break; }
        for (const need of recipe.in) removeFromBag(p, need.id, need.qty);
        addItem(p, recipe.out.id, recipe.out.qty);
        const tr = trainProf(p, prof.id, recipe.xp);
        game.emit?.('craft', recipe.out.id, recipe.out.qty);
        game.emit?.('craft', 'any', 1);
        game.toast?.(`Made ${BASE_BY_ID[recipe.out.id]?.name ?? recipe.out.id}`, 'loot');
        if (tr?.ups) game.toast?.(`${prof.name} ${tr.level}`);
        p.sheet = recalc(p);
        render();
        break;
      }
      case 'accept': {
        const q = acceptQuest(game, btn.dataset.quest);
        if (!q.ok) game.toast?.('Cannot take that yet.', 'info');
        render();
        break;
      }
      case 'buy': {
        const def = NPCS[btn.dataset.npc];
        const entry = def?.shop?.find(s => s.id === btn.dataset.item);
        if (!entry) break;
        if (p.marks < entry.price) { game.toast?.('Not enough marks.', 'info'); break; }
        p.marks -= entry.price;
        addItem(p, entry.id, 1);
        game.toast?.(`Bought ${BASE_BY_ID[entry.id]?.name ?? entry.id}`, 'loot');
        render();
        break;
      }
      case 'drill': {
        const def = NPCS[btn.dataset.npc] ?? Object.values(NPCS).find(n => n.drills);
        const drill = def?.drills?.find(d => d.id === btn.dataset.drill);
        if (!drill) break;
        if (p.marks < drill.cost) { game.toast?.('Not enough marks.', 'info'); break; }
        p.marks -= drill.cost;
        trainAbility(p, 'attack', drill.xp);
        game.toast?.('Drill done.', 'good');
        render();
        break;
      }
      case 'petactive': {
        p.activePet = btn.dataset.pet;
        game.ensurePetEntity?.();
        render();
        break;
      }
      case 'petmode': {
        const pet = p.pets.find(x => x.id === btn.dataset.pet);
        if (pet) { pet.mode = pet.mode === 'stay' ? 'follow' : 'stay'; const e = game.entities.find(x => x.kind === 'pet' && x.petId === pet.id); if (e) e.mode = pet.mode; }
        render();
        break;
      }
      case 'travel': {
        closePanel(game);
        game.travel(btn.dataset.zone);
        break;
      }
      case 'view': game.setView(btn.dataset.view); closePanel(game); break;
      case 'bounty': game.acceptBounty?.(); render(); break;
      case 'save': game.save?.(); game.toast?.('Saved.', 'good'); break;
      case 'reload': closePanel(game); game.load?.(); break;
      case 'wipe': if (confirm('Erase this save?')) { game.wipe?.(); location.reload(); } break;
      case 'rolepick': closePanel(game); openPanel(game, 'role', { force: true }); break;
      case 'role': {
        game.choosePath(btn.dataset.role);
        closePanel(game);
        break;
      }
    }
  });

  // tooltips
  host.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-uid]');
    if (!el) return;
    const uid = el.dataset.uid;
    const p = game.player;
    const item = p.inv.find(i => i.uid === uid) ?? Object.values(p.equip ?? {}).find(i => i?.uid === uid);
    if (!item) return;
    showTip(e.clientX, e.clientY, item);
  });
  host.addEventListener('pointermove', (e) => {
    const tip = document.querySelector('.tooltip');
    if (tip) positionTip(e.clientX, e.clientY, tip);
  });
  host.addEventListener('pointerout', () => {
    document.querySelector('.tooltip')?.remove();
  });
}

function findRecipe(profId, recipeId) {
  const prof = PROFESSIONS[profId];
  return { prof, recipe: prof.recipes.find(r => r.id === recipeId) };
}

function removeFromBag(p, id, qty) {
  let left = qty;
  for (let i = p.inv.length - 1; i >= 0 && left > 0; i--) {
    const it = p.inv[i];
    if (it.base !== id) continue;
    const take = Math.min(it.qty ?? 1, left);
    it.qty -= take; left -= take;
    if (it.qty <= 0) p.inv.splice(i, 1);
  }
}

function showTip(x, y, item) {
  document.querySelector('.tooltip')?.remove();
  const d = document.createElement('div');
  d.className = 'tooltip';
  const col = itemColor(item);
  d.innerHTML = `<div class="tn" style="color:${col}">${esc(item.name)}</div>
    <div class="tt">${esc(item.kind)} · ${esc(item.slot)} · ilvl ${item.ilvl ?? 1}${item.rarity !== 'common' ? ' · ' + item.rarity : ''}</div>
    ${itemLines(item).map(l => `<div class="tl">${esc(l)}</div>`).join('')}
    ${item.flavor ? `<div class="tf">${esc(item.flavor)}</div>` : ''}
    <div class="tl" style="color:#e8c14a">value ${item.value ?? 1}</div>`;
  document.body.appendChild(d);
  positionTip(x, y, d);
}
function positionTip(x, y, tip) {
  const pad = 12;
  const w = tip.offsetWidth || 230, h = tip.offsetHeight || 120;
  tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x + pad)) + 'px';
  tip.style.top = Math.min(window.innerHeight - h - 8, Math.max(8, y - h - pad)) + 'px';
}
