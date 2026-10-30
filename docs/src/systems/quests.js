// Quest state machine: accept, emit events, auto-complete, reward.
import { QUESTS, QUEST_LIST, MAIN_QUESTS, makeBounty } from '../data/quests.js';
import { gainXp } from './sheet.js';
import { addItem } from './inventory.js';

export function questState(player, id) {
  if (player.quests.done.includes(id)) return 'done';
  if (player.quests.active.includes(id)) return 'active';
  return 'available';
}

export function progressFor(player, id) {
  const q = QUESTS[id];
  if (!q) return [];
  if (!player.quests.progress[id]) player.quests.progress[id] = q.objectives.map(() => 0);
  return player.quests.progress[id];
}

export function isReady(player, id) {
  const q = QUESTS[id];
  if (!q) return false;
  const prog = progressFor(player, id);
  return q.objectives.every((o, i) => prog[i] >= o.count);
}

export function prevDone(player, id) {
  const q = QUESTS[id];
  if (!q || !q.main) return true;
  const main = MAIN_QUESTS;
  const idx = main.findIndex(x => x.id === id);
  if (idx <= 0) return true;
  return player.quests.done.includes(main[idx - 1].id);
}

export function availableFrom(player, npcId) {
  return QUEST_LIST.filter(q => q.giver === npcId && questState(player, q.id) === 'available' && prevDone(player, q.id));
}

export function acceptQuest(game, id, opts = {}) {
  const p = game.player;
  let q = QUESTS[id];
  if (!q && opts.quest) { q = opts.quest; QUESTS[id] = q; }
  if (!q || questState(p, id) !== 'available') return { ok: false };
  if (!prevDone(p, id)) return { ok: false, why: 'Finish what came before.' };
  p.quests.active.push(id);
  progressFor(p, id);
  game.log?.(`Quest accepted: ${q.name}`, 'hi');
  game.toast?.(`✦ ${q.name}`, 'quest');
  game.emit?.('questAccept', id, 1);
  // immediate objectives that can already be satisfied (collect/reach already true)
  recheck(game, id);
  return { ok: true, quest: q };
}

export function emit(game, type, target, count = 1, meta = {}) {
  const p = game.player;
  for (const qid of [...p.quests.active]) {
    const q = QUESTS[qid];
    if (!q) continue;
    const prog = progressFor(p, qid);
    let changed = false;
    q.objectives.forEach((o, i) => {
      if (prog[i] >= o.count) return;
      if (o.type !== type) return;
      if (o.target !== 'any' && o.target !== target) return;
      if (type === 'collect') {
        // collect objectives track inventory totals, handled in recheck
        return;
      }
      prog[i] = Math.min(o.count, prog[i] + count);
      changed = true;
    });
    if (changed) checkComplete(game, qid);
  }
}

export function recheck(game, id) {
  const p = game.player;
  const q = QUESTS[id];
  if (!q) return;
  const prog = progressFor(p, id);
  q.objectives.forEach((o, i) => {
    if (o.type === 'collect') {
      const have = p.inv.filter(it => it.base === o.target).reduce((n, it) => n + (it.qty || 1), 0);
      prog[i] = Math.min(o.count, have);
    }
    if (o.type === 'role' && p.flags.roleChosen) prog[i] = 1;
  });
  checkComplete(game, id);
}

export function recheckAll(game) {
  for (const id of [...game.player.quests.active]) recheck(game, id);
}

function checkComplete(game, id) {
  const p = game.player;
  if (!isReady(p, id)) return;
  const q = QUESTS[id];
  // main story quests with a talk objective complete on the spot; otherwise auto
  p.quests.active = p.quests.active.filter(x => x !== id);
  p.quests.done.push(id);
  grantRewards(game, q);
  game.log?.(`Quest complete: ${q.name}`, 'good');
  game.toast?.(`✓ ${q.name}`, 'quest');
  game.emit?.('questDone', id, 1);
  // auto-offer the next main quest when its giver is a signal, or if it is self-starting
  const next = q.next ? QUESTS[q.next] : null;
  if (next && (next.giver === 'signal' || next.giver === 'self')) {
    setTimeout(() => acceptQuest(game, next.id), 1200);
  }
}

export function grantRewards(game, q) {
  const p = game.player;
  const r = q.rewards ?? {};
  if (r.xp) {
    const ups = gainXp(p, r.xp);
    game.float?.(p, `+${r.xp} xp`, 'xp');
    if (ups) {
      game.toast?.(`Level ${p.level} — ${p.level} hit points and a point to spend`, 'level');
      game.log?.(`You reach level ${p.level}.`, 'good');
    }
  }
  if (r.marks) { p.marks += r.marks; game.float?.(p, `+${r.marks} marks`, 'xp'); }
  for (const it of r.items ?? []) addItem(p, it.id, it.qty ?? 1);
  for (const u of r.unlock ?? []) {
    p.flags['unlock_' + u] = true;
    game.toast?.(`Unlocked: ${u}`, 'unlock');
  }
  game.emit?.('reward', q.id, 1);
}

// The zone radio / signal: main-line quests that start when you get close.
export function signalQuests(player) {
  return QUEST_LIST.filter(q => q.giver === 'signal' && questState(player, q.id) === 'available' && prevDone(player, q.id));
}

export function trackerQuests(player) {
  return player.quests.active.map(id => QUESTS[id]).filter(Boolean);
}

export function bountyFor(game, level) {
  return makeBounty(game.rng, level);
}

export function acceptBounty(game) {
  const q = makeBounty(game.rng, game.player.level);
  QUESTS[q.id] = q;
  game.player.quests.active.push(q.id);
  progressFor(game.player, q.id);
  game.toast?.(`Bounty posted: ${q.name}`, 'quest');
  return q;
}
