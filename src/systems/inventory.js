// Inventory: stacks, equip slots, two-handed rules, selling.
import { BASE_BY_ID, isEquipment, itemScore, SLOT_NAMES } from '../data/items.js';

export const INV_SIZE = 30;

export function addItem(player, itemOrId, qty = 1) {
  const item = typeof itemOrId === 'string' ? makeStack(itemOrId, qty) : itemOrId;
  if (!item) return false;
  const stackable = item.kind === 'material' || item.kind === 'consumable' || item.kind === 'food' || item.kind === 'seed' || item.kind === 'crop';
  if (stackable) {
    const have = player.inv.find(i => i.base === item.base);
    if (have) {
      have.qty = (have.qty || 1) + (item.qty || qty);
      return true;
    }
  }
  if (player.inv.length >= INV_SIZE) {
    player.overflow = player.overflow || [];
    player.overflow.push(item);
    return false;
  }
  player.inv.push(item);
  return true;
}

export function makeStack(id, qty = 1) {
  const b = BASE_BY_ID[id];
  if (!b) return null;
  return {
    uid: id + '-stack-' + Math.random().toString(36).slice(2, 7),
    base: id, name: b.name, slot: b.slot, kind: b.kind, rarity: 'common',
    icon: b.icon, qty, stack: b.stack ?? 1, tags: b.tags ?? [], value: b.value ?? 1, mods: [],
  };
}

export function countItem(player, id) {
  return player.inv.filter(i => i.base === id).reduce((n, i) => n + (i.qty || 1), 0);
}

export function removeItem(player, id, qty = 1) {
  let left = qty;
  for (let i = player.inv.length - 1; i >= 0 && left > 0; i--) {
    const it = player.inv[i];
    if (it.base !== id) continue;
    const have = it.qty || 1;
    const take = Math.min(have, left);
    it.qty = have - take;
    left -= take;
    if (it.qty <= 0) player.inv.splice(i, 1);
  }
  return left === 0;
}

export function equip(player, item) {
  if (!isEquipment(item)) return { ok: false, msg: 'That is not equipment.' };
  const slot = item.slot;
  const twoHand = item.tags?.includes('twohand');
  const prev = player.equip[slot];
  // two-handed weapons push out the offhand
  if (slot === 'weapon' && twoHand && player.equip.offhand) {
    addItem(player, player.equip.offhand);
    player.equip.offhand = null;
  }
  if (slot === 'offhand' && player.equip.weapon?.tags?.includes('twohand')) {
    return { ok: false, msg: 'Both hands are on the weapon.' };
  }
  player.equip[slot] = item;
  removeItemByUid(player, item.uid);
  if (prev) addItem(player, prev);
  return { ok: true, slot };
}

export function unequip(player, slot) {
  const it = player.equip[slot];
  if (!it) return { ok: false };
  if (addItem(player, it)) player.equip[slot] = null;
  return { ok: true };
}

export function removeItemByUid(player, uid) {
  const i = player.inv.findIndex(x => x.uid === uid);
  if (i >= 0) return player.inv.splice(i, 1)[0];
  return null;
}

export function dropItem(player, item) {
  const i = player.inv.findIndex(x => x.uid === item.uid);
  if (i >= 0) return player.inv.splice(i, 1)[0];
  return null;
}

export function sellItem(player, item) {
  const price = Math.max(1, Math.round((item.value || 1) * 0.4));
  dropItem(player, item);
  player.marks += price;
  return price;
}

export function bestUpgradeFor(player, item) {
  if (!isEquipment(item)) return false;
  const cur = player.equip[item.slot];
  return itemScore(item) > itemScore(cur) + 0.01;
}

export function slotName(slot) { return SLOT_NAMES[slot] ?? slot; }

// total weight-ish value for the bag line
export function bagValue(player) {
  return player.inv.reduce((n, i) => n + (i.value || 1) * (i.qty || 1), 0);
}

export function autoSort(player) {
  const order = { weapon: 0, offhand: 1, head: 2, body: 3, hands: 4, feet: 5, ring: 6, charm: 7 };
  player.inv.sort((a, b) => {
    const ra = ['legendary', 'unique', 'rare', 'magic', 'common'].indexOf(a.rarity);
    const rb = ['legendary', 'unique', 'rare', 'magic', 'common'].indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return (order[a.slot] ?? 9) - (order[b.slot] ?? 9) || a.name.localeCompare(b.name);
  });
}
