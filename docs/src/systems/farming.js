// Farming: plots live at camp and in Havenreach, grow on game time, harvest
// yields crops + seeds and trains Farming. Harvest Moon, with worse weather.
import { PLANTS } from '../data/professions.js';
import { addItem, removeItem, countItem } from './inventory.js';
import { trainProf } from './progression.js';
import { BASE_BY_ID } from '../data/items.js';

export const FARM_SITES = {
  wrack_shore: { plots: 3, name: 'Shipwreck Camp' },
  havenreach: { plots: 8, name: 'Haven Fields' },
};

export function ensurePlots(player, zoneId) {
  const site = FARM_SITES[zoneId];
  if (!site) return [];
  player.farm = player.farm || { plots: [] };
  player.farm.sites = player.farm.sites || {};
  if (!player.farm.sites[zoneId]) {
    player.farm.sites[zoneId] = Array.from({ length: site.plots }, (_, i) => ({
      id: zoneId + '_' + i, zone: zoneId, plant: null, plantedAt: 0, readyAt: 0, watered: false, stage: 0,
    }));
  }
  return player.farm.sites[zoneId];
}

export function allPlots(player) {
  const out = [];
  for (const zone of Object.keys(player.farm?.sites ?? {})) out.push(...player.farm.sites[zone]);
  return out;
}

export function plant(player, plot, seedId, nowMinutes) {
  if (plot.plant) return { ok: false, why: 'Something is already growing.' };
  const seed = BASE_BY_ID[seedId];
  if (!seed || seed.kind !== 'seed') return { ok: false, why: 'That is not a seed.' };
  if (countItem(player, seedId) < 1) return { ok: false, why: 'No seeds.' };
  const plantDef = PLANTS[seed.plant];
  if (!plantDef) return { ok: false, why: 'That seed will not take here.' };
  removeItem(player, seedId, 1);
  const grow = (plantDef.growHours * 60) * (player.flags?.wildGrowth ? 0.5 : 1);
  plot.plant = seed.plant;
  plot.plantedAt = nowMinutes;
  plot.readyAt = nowMinutes + grow;
  plot.watered = false;
  return { ok: true, plot, readyAt: plot.readyAt };
}

export function plotState(plot, nowMinutes) {
  if (!plot.plant) return { state: 'empty', pct: 0 };
  const total = Math.max(1, plot.readyAt - plot.plantedAt);
  const pct = Math.max(0, Math.min(1, (nowMinutes - plot.plantedAt) / total));
  return { state: pct >= 1 ? 'ready' : 'growing', pct, hoursLeft: Math.max(0, (plot.readyAt - nowMinutes) / 60) };
}

export function harvest(player, plot, nowMinutes) {
  const st = plotState(plot, nowMinutes);
  if (st.state !== 'ready') return { ok: false, why: st.state === 'empty' ? 'Nothing planted.' : 'Not ready yet.' };
  const def = PLANTS[plot.plant];
  const rng = player._rng ?? Math.random;
  const qty = def.yield[0] + Math.floor(Math.random() * (def.yield[1] - def.yield[0] + 1));
  addItem(player, def.crop, qty);
  const seedBack = Math.random() < 0.4;
  if (seedBack) addItem(player, def.seed, 1);
  const tr = trainProf(player, 'farming', def.xp);
  plot.plant = null;
  plot.plantedAt = 0;
  plot.readyAt = 0;
  return { ok: true, crop: def.crop, qty, seedBack, prof: tr, name: def.name };
}

export function water(player, plot) {
  if (!plot.plant || plot.watered) return { ok: false };
  plot.watered = true;
  // watering knocks 20% off remaining time
  const left = plot.readyAt - (player.time ?? 0);
  plot.readyAt -= left * 0.2;
  return { ok: true };
}

export function farmSummary(player, nowMinutes) {
  const plots = allPlots(player);
  return {
    total: plots.length,
    plots: plots.length,
    growing: plots.filter(p => plotState(p, nowMinutes).state === 'growing').length,
    ready: plots.filter(p => plotState(p, nowMinutes).state === 'ready').length,
    empty: plots.filter(p => !p.plant).length,
  };
}

// Offline growth: plots use absolute game minutes, so time spent away counts.
export function advanceTime(player, minutes) {
  player.time = (player.time ?? 0) + minutes;
  player.day = 1 + Math.floor(player.time / (24 * 60));
  return player.time;
}

export function timeString(player) {
  const m = Math.floor((player.time ?? 0) % (24 * 60));
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
