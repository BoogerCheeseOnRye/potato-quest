// The game object: state, loop, events, save/load. Systems talk through here.
import { RNG } from './core/rng.js';
import { makeCamera } from './core/geom.js';
import { World } from './world/world.js';
import { createPlayer, chooseRole, makePet, petXp } from './entities/player.js';
import { recalc, gainXp, clampVitals } from './systems/sheet.js';
import { addItem, removeItem, countItem } from './systems/inventory.js';
import { acceptQuest, emit as questEmit, recheckAll, signalQuests, acceptBounty } from './systems/quests.js';
import { useAbility, playerAttack, applyDamage, healEntity, tickEffects, nearestMonster, summonTurret, makeMonster } from './systems/combat.js';
import { rollLoot } from './data/items.js';
import { MONSTER_BY_ID, NAMED } from './data/bestiary.js';
import { ABILITIES, ROLE_ABILITIES } from './data/abilities.js';
import { ZONE_BY_ID } from './data/zones.js';
import { trainAbility } from './systems/progression.js';
import { timeString } from './systems/farming.js';
import { logLine, toast, floatText, updateHud, setTargetCard, showInteract } from './ui/hud.js';
import { openPanel, closePanel, isPanelOpen, refreshOpen } from './ui/panels.js';
import { pollKeys } from './input/input.js';
import { BASE_BY_ID } from './data/items.js';

const SAVE_KEY = 'potatoquest.save.v1';

export class Game {
  constructor() {
    this.rng = new RNG(Date.now() % 1e9);
    this.worldSeed = Math.floor(this.rng.next() * 1e9);
    this.entities = [];
    this.projectiles = [];
    this.effects = [];
    this.player = null;
    this.world = new World(this);
    this.cam = makeCamera('iso');
    this.view = 'iso';
    this.now = 0;
    this.running = false;
    this.paused = false;
    this.target = null;
    this.attackHeld = false;
    this.lastSave = 0;
    this.input = { moveX: 0, moveY: 0, aim: null };
    this.settings = { touch: false, sound: false };
    this.hover = null;
    this.lastZone = null;
    this.autoTarget = null;
    this.looping = false;
    this.lastRecheck = 0;
  }

  // ---------------- lifecycle ----------------
  newGame(role, name = 'Castaway') {
    this.worldSeed = Math.floor(this.rng.next() * 1e9);
    this.player = createPlayer(role, name, Math.floor(this.rng.next() * 1e9));
    chooseRole(this.player, role);
    this.player.flags.roleChosen = true;
    this.entities = [];
    this.projectiles = [];
    this.world.loadZone('wrack_shore', {});
    this.player.hp = this.player.sheet.hpMax;
    this.player.mp = this.player.sheet.mpMax;
    acceptQuest(this, 'm1_washup');
    recheckAll(this);
    this.cam.mode = this.view;
    this.running = true;
    this.save();
    logLine(this, `You wash up on the Wrack Shore. ${this.player.role ? 'The path is ' + this.player.role + '.' : ''}`, 'hi');
  }

  // Used before a role is picked: a temporary castaway with no class features.
  startCastaway() {
    this.player = createPlayer('warden', 'Castaway', Math.floor(this.rng.next() * 1e9));
    this.player.role = null;
    this.player.flags.roleChosen = false;
    // No class features until a path is chosen; the kit is all you have.
    this.player.skills = {};
    this.player.abilityTrain = { attack: { level: 1, xp: 0 } };
    this.player.sheet = recalc(this.player);
    this.player.hp = this.player.sheet.hpMax;
    this.player.mp = this.player.sheet.mpMax;
    this.entities = [];
    this.world.loadZone('wrack_shore', {});
    this.running = true;
    acceptQuest(this, 'm1_washup');
  }

  choosePath(role) {
    if (!this.player) return;
    chooseRole(this.player, role);
    this.player.flags.roleChosen = true;
    this.player.hp = this.player.sheet.hpMax;
    this.player.mp = this.player.sheet.mpMax;
    recheckAll(this);
    emitEvent(this, 'role', role, 1);
    toast(`Path: ${this.player.role}`, 'level');
    logLine(this, `You choose the path of the ${role}.`, 'good');
    this.save();
  }

  get activePetEntity() {
    const id = this.player?.activePet;
    if (!id) return null;
    return this.entities.find(e => e.kind === 'pet' && e.petId === id) ?? null;
  }

  ensurePetEntity() {
    const p = this.player;
    if (!p?.activePet) return;
    const pet = p.pets.find(x => x.id === p.activePet);
    if (!pet) return;
    let e = this.entities.find(x => x.kind === 'pet' && x.petId === pet.id);
    if (!e) {
      e = {
        kind: 'pet', petId: pet.id, name: pet.name, x: p.x + 1.2, y: p.y + 0.8, z: 0,
        hp: pet.hp, hpMax: pet.hpMax, ac: pet.ac, atk: pet.atk, dmg: pet.dmg, speed: pet.speed,
        level: pet.level, radius: 0.35, facing: 0, sprite: pet.sprite, size: pet.size,
        family: pet.family, mode: pet.mode, effects: [], down: false, attackCd: 0, ranged: pet.ranged,
      };
      this.entities.push(e);
    }
    e.hpMax = pet.hpMax; e.atk = pet.atk; e.ac = pet.ac; e.level = pet.level; e.mode = pet.mode;
    return e;
  }

  // ---------------- loop ----------------
  start() {
    if (this.looping) return;
    this.looping = true;
    this.running = true;
    this.last = performance.now();
    this.lastRecheck = 0;
    const tick = (ts) => {
      if (!this.looping) return;
      const dt = Math.min(0.1, (ts - this.last) / 1000);
      this.last = ts;
      if (!this.paused && this.running) this.update(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  update(dt) {
    if (!this.player) return;
    this.now += dt;
    const p = this.player;
    this.ensurePetEntity();
    p.cooldowns = p.cooldowns || {};

    // movement
    pollKeys(this);
    let mx = this.input.moveX, my = this.input.moveY;
    if (this.view !== 'iso' && (mx || my)) {
      const yaw = this.cam.yaw;
      const rx = Math.cos(yaw), ry = -Math.sin(yaw), fx = Math.sin(yaw), fy = Math.cos(yaw);
      const wx = rx * mx + fx * my;
      const wy = ry * mx + fy * my;
      mx = wx; my = wy;
    }
    if (p.effects?.some(e => e.type === 'stun')) { mx = 0; my = 0; }
    if (!Math.hypot(mx, my) && this.input.moveTarget) {
      const t = this.input.moveTarget;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < 0.45) this.input.moveTarget = null;
      else { mx = (t.x - p.x) / d; my = (t.y - p.y) / d; }
    }
    const moving = Math.hypot(mx, my) > 0.08;
    if (moving) {
      const slow = p.effects?.some(e => e.type === 'chill') ? 0.55 : 1;
      const sp = (p.sheet.speed ?? 3.6) * slow * dt;
      const len = Math.hypot(mx, my) || 1;
      p.x += (mx / len) * sp;
      p.y += (my / len) * sp;
      p.facing = Math.atan2(mx, my);
      p.moving = true;
      if (this.world.blockedAt(p.x, p.y, 0.35)) {
        // undo the axis that collides
        p.x -= (mx / len) * sp;
        if (this.world.blockedAt(p.x, p.y, 0.35)) { p.x += (mx / len) * sp; p.y -= (my / len) * sp; }
      }
    } else p.moving = false;
    p.position.x = p.x; p.position.y = p.y;

    // held attack
    p.attackCd = Math.max(0, (p.attackCd ?? 0) - dt);
    if (this.autoTarget) {
      const t = this.autoTarget;
      if (t.hp <= 0 || !this.entities.includes(t)) this.autoTarget = null;
      else if (moving) this.autoTarget = null; // player took the wheel
      else {
        this.target = t;
        const reach = (p.sheet.range ?? 1.4) + (t.radius ?? 0.3);
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d > reach) {
          // give up if the target is unreachable (across water, behind rocks)
          if (this._chaseD == null || d < this._chaseD - 0.25) { this._chaseD = d; this._chaseAt = this.now; }
          if (this.now - (this._chaseAt ?? this.now) > 3.5) { this.autoTarget = null; this._chaseD = null; }
          else this.moveToward(t.x, t.y, dt);
        } else {
          this._chaseD = null;
          if (p.attackCd <= 0) { playerAttack(this, t); p.attackCd = 0.55; }
        }
      }
    }
    if (this.attackHeld && !this.autoTarget && p.attackCd <= 0) {
      const t = this.target?.hp > 0 ? this.target : nearestMonster(this, p, p.sheet.range + 1.5);
      if (t) {
        if (Math.hypot(t.x - p.x, t.y - p.y) <= p.sheet.range + (t.radius ?? 0.3)) {
          playerAttack(this, t);
          p.attackCd = 0.55;
        } else this.moveToward(t.x, t.y, dt);
      }
    }

    // target validity
    if (this.target && (this.target.hp <= 0 || !this.entities.includes(this.target))) this.target = null;
    setTargetCard(this, this.target);

    // vitals regen out of combat
    const threat = nearestMonster(this, p, 9);
    if (!threat) {
      p.hp = Math.min(p.sheet.hpMax, p.hp + dt * 0.6);
      p.mp = Math.min(p.sheet.mpMax, p.mp + dt * 1.4);
    } else {
      p.mp = Math.min(p.sheet.mpMax, p.mp + dt * 0.25);
    }
    // buffs
    p.buffs = (p.buffs ?? []).filter(b => !b.until || b.until > this.now);
    if (p.foodBuff && p.foodBuff.until < this.now) { p.foodBuff = null; p.sheet = recalc(p); }
    for (const e of [...this.entities]) tickEffects(this, e);
    tickEffects(this, p);
    for (const e of [...this.entities]) if (e.removeAt && e.removeAt <= this.now) this.removeEntity(e);
    for (const e of [...this.entities]) if (e.kind === 'pet') { const pet = p.pets.find(x => x.id === e.petId); if (pet) { pet.hp = e.hp; } }

    this.world.update(dt);
    clampVitals(p);

    // pet entity sync
    const pe = this.activePetEntity;
    if (pe && !p.pets.find(x => x.id === pe.petId)) this.removeEntity(pe);
    if (p.activePet) {
      const pet = p.pets.find(x => x.id === p.activePet);
      if (pet && pe) { pet.x = pe.x; pet.y = pe.y; }
    }

    // interaction prompt
    const near = this.world.bestInteract();
    showInteract(this, near);

    // autosave
    if (this.now - this.lastSave > 20) { this.lastSave = this.now; this.save(); }
    if (this.now - this.lastRecheck > 1.5) { this.lastRecheck = this.now; recheckAll(this); }

    updateHud(this);
  }

  moveToward(tx, ty, dt) {
    const p = this.player;
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = (p.sheet.speed ?? 3.6) * dt;
    const nx = p.x + (dx / d) * sp, ny = p.y + (dy / d) * sp;
    if (!this.world.blockedAt(nx, ny, 0.35)) { p.x = nx; p.y = ny; }
    else if (!this.world.blockedAt(nx, p.y, 0.35)) p.x = nx;
    else if (!this.world.blockedAt(p.x, ny, 0.35)) p.y = ny;
    p.facing = Math.atan2(dx, dy);
    p.position.x = p.x; p.position.y = p.y;
  }

  // ---------------- actions ----------------
  cast(id, aim = {}) {
    const p = this.player;
    if (!p) return;
    const ab = ABILITIES[id];
    if (!ab) return;
    if (!ab.any && !p.abilityTrain?.[id]) return;
    if (this.target && this.target.hp > 0 && !aim.target) aim.target = this.target;
    if (!aim.x && this.target) { aim.x = this.target.x; aim.y = this.target.y; }
    if (!aim.x) { aim.x = p.x + Math.sin(p.facing) * 5; aim.y = p.y + Math.cos(p.facing) * 5; }
    const res = useAbility(this, id, aim);
    if (!res.ok) {
      if (res.why === 'not enough energy') floatText(p, 'no energy', 'info');
      else if (res.why === 'cooling down') floatText(p, 'wait', 'info');
      else if (res.why === 'nothing in range') floatText(p, 'nothing in range', 'info');
      else if (res.why) floatText(p, res.why, 'info');
      return res;
    }
    return res;
  }

  basicAttack(target) {
    if (target) { this.target = target; this.autoTarget = target; }
    else this.attackHeld = true;
    const t = this.target?.hp > 0 ? this.target : nearestMonster(this, this.player, 3);
    if (t) playerAttack(this, t);
    clearTimeout(this._attackTimer);
    this._attackTimer = setTimeout(() => { this.attackHeld = false; }, 350);
  }

  interact() {
    const near = this.world.bestInteract();
    if (!near) { toast('Nothing within reach.', 'info'); return; }
    if (near.kind === 'npc') { openPanel(this, 'npc', { npc: near.npc }); return; }
    if (near.kind === 'node') { this.world.gather(near.node); return; }
    if (near.kind === 'loot') { this.pickupLoot(near.loot); return; }
    if (near.kind === 'gate') { this.world.travel(near.poi.toZone); return; }
    if (near.kind === 'waystone') { openPanel(this, 'map'); return; }
    if (near.kind === 'rift') { this.world.enterRift(near.poi); return; }
    if (near.kind === 'rift_exit') { this.world.leaveRift(); return; }
    if (near.kind === 'camp') { openPanel(this, 'farm'); return; }
    if (near.kind === 'farm') { openPanel(this, 'farm'); return; }
    if (near.kind === 'board') { openPanel(this, 'bounty'); return; }
    if (near.kind === 'cache') { this.world.openCache(near.poi); return; }
    if (near.kind === 'ruin' || near.kind === 'boss') { toast(near.poi.name + ' — dangerous ground.', 'info'); return; }
    toast(near.poi.name, 'info');
  }

  // ---------------- combat plumbing ----------------
  damage(target, amount, type = 'physical', source = null) {
    return applyDamage(this, target, amount, type, source);
  }

  projectile(from, target, dmg, bonus = 0, type = 'physical') {
    const d = Math.hypot(target.x - from.x, target.y - from.y);
    this.projectiles.push({
      x: from.x, y: from.y, tx: target.x, ty: target.y, target, t: 0,
      speed: 18, dmg, bonus, type,
    });
    this.fx?.('shot', from.x, from.y);
  }

  updateProjectiles(dt) {
    for (const pr of [...this.projectiles]) {
      pr.t += dt;
      const d = Math.hypot(pr.tx - pr.x, pr.ty - pr.y);
      const step = pr.speed * dt;
      if (pr.target && pr.target.hp > 0) { pr.tx = pr.target.x; pr.ty = pr.target.y; }
      if (d <= step) {
        if (pr.target && pr.target.hp > 0) {
          const raw = this.rng.int(1, 8) + pr.bonus;
          this.damage(pr.target, raw, pr.type, null);
          if (pr.target.hp <= 0) this.onKill(pr.target, 'player');
        }
        this.projectiles = this.projectiles.filter(x => x !== pr);
        continue;
      }
      pr.x += ((pr.tx - pr.x) / d) * step;
      pr.y += ((pr.ty - pr.y) / d) * step;
      if (pr.t > 4) this.projectiles = this.projectiles.filter(x => x !== pr);
    }
  }

  nearestMonster(x, y, r) {
    let best = null, bd = r;
    for (const e of this.entities) {
      if (e.kind !== 'monster' || e.hp <= 0) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  onKill(m, source) {
    if (this.world.rift && m.kind === 'monster' && !m.dead) this.world.rift.kills++;
    if (m.namedId) this.player.flags['killed_' + m.namedId] = true;
    if (m.riftBoss) this.world.rift.cleared = true;
    this.target = null;
  }

  grantXp(amount, monster) {
    const p = this.player;
    const ups = gainXp(p, amount);
    floatText(p, `+${amount} xp`, 'xp');
    if (ups) {
      toast(`Level ${p.level}`, 'level');
      logLine(this, `You reach level ${p.level}.`, 'good');
      this.fx('level', p.x, p.y);
    }
    if (monster) logLine(this, `${monster.name} dies. +${amount} xp`, '');
  }

  dropLoot(x, y, item) {
    this.entities.push({ kind: 'loot', id: 'loot_' + Math.random().toString(36).slice(2, 8), x, y, z: 0, item, ttl: 180, radius: 0.25 });
  }

  dropMaterial(x, y, id, qty) {
    const b = BASE_BY_ID[id];
    if (!b) return;
    this.entities.push({
      kind: 'loot', id: 'loot_' + Math.random().toString(36).slice(2, 8), x: x + this.rng.float(-0.3, 0.3), y: y + this.rng.float(-0.3, 0.3),
      z: 0, item: { base: id, name: b.name, icon: b.icon, qty, kind: b.kind, rarity: 'common', value: b.value, uid: id + '-w' }, ttl: 180, radius: 0.2,
    });
  }

  pickupLoot(e) {
    if (!e.item) return;
    const item = e.item;
    const ok = addItem(this.player, item);
    if (!ok) { toast('Bag is full.', 'info'); return; }
    const label = item.qty > 1 ? `${item.name} ×${item.qty}` : item.name;
    logLine(this, `Picked up ${label}.`, item.rarity && item.rarity !== 'common' ? 'loot' : '');
    if (item.rarity && item.rarity !== 'common') toast(label, 'loot');
    this.fx('pickup', e.x, e.y);
    this.removeEntity(e);
    recheckAll(this);
  }

  removeEntity(e, delay = 0) {
    if (delay > 0) {
      e.removeAt = this.now + delay;
      return;
    }
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
  }

  createPet(species, level) {
    return makePet(species, level, this.rng);
  }

  spawnTurret(x, y, duration, owner) { return summonTurret(this, x, y, duration, owner); }

  onPlayerDeath() {
    const p = this.player;
    p.deaths = (p.deaths ?? 0) + 1;
    if (this.world.rift) {
      this.world.leaveRift();
      p.hp = Math.max(1, Math.round(p.sheet.hpMax * 0.4));
      p.mp = Math.round(p.sheet.mpMax * 0.3);
      logLine(this, 'The rift spits you out. It keeps what you found.', 'bad');
      toast('Ejected from the rift', 'boss');
      // roguelite penalty: lose half your marks, keep gear
      p.marks = Math.floor(p.marks * 0.5);
      return;
    }
    p.hp = Math.max(1, Math.round(p.sheet.hpMax * 0.35));
    p.mp = Math.round(p.sheet.mpMax * 0.4);
    const camp = this.world.state?.pois?.find(x => x.kind === 'camp');
    if (camp) { p.x = camp.x + 2; p.y = camp.y + 2; }
    const lost = Math.floor(p.marks * 0.1);
    p.marks -= lost;
    logLine(this, lost > 0 ? `You wake at camp. ${lost} marks gone from your pockets.` : 'You wake at camp with nothing but the clothes on your back.', 'bad');
    toast('You went down', 'boss');
  }

  // ---------------- events ----------------
  emit(type, target, count = 1, meta = {}) {
    if (!this.player) return;
    questEmit(this, type, target, count, meta);
  }

  log(msg, cls = '') { logLine(this, msg, cls); }
  toast(msg, kind = 'info') { toast(msg, kind); }
  float(ent, text, cls) { floatText(ent, text, cls); }
  fx(kind, x, y, opts = {}) {
    this.effects.push({ kind, x, y, t: 0, life: opts.life ?? 0.6, opts, born: this.now });
    if (this.effects.length > 60) this.effects.shift();
  }

  grantItem(item) { addItem(this.player, item); }

  // ---------------- panels ----------------
  panel(name, data) { openPanel(this, name, data); }
  closePanel() { closePanel(this); }
  panelOpen() { return isPanelOpen(); }

  // ---------------- travel / quests ----------------
  travel(zoneId) { return this.world.travel(zoneId); }

  signalAvailable() {
    const list = signalQuests(this.player);
    if (list.length) {
      const q = list[0];
      acceptQuest(this, q.id);
      toast('Signal acquired', 'quest');
    }
  }

  acceptBounty() { return acceptBounty(this); }

  useConsumable(item) {
    const b = BASE_BY_ID[item.base];
    if (!b?.use) return false;
    const p = this.player;
    if (b.use.heal) {
      const d = /(\d+)d(\d+)([+-]\d+)?/.exec(b.use.heal);
      let amt = 4;
      if (d) { for (let i = 0; i < +d[1]; i++) amt += this.rng.int(1, +d[2]); amt += d[3] ? +d[3] : 0; }
      healEntity(this, p, amt);
      this.fx('heal', p.x, p.y);
    }
    if (b.use.mp) {
      const d = /(\d+)d(\d+)([+-]\d+)?/.exec(b.use.mp);
      let amt = 3;
      if (d) { for (let i = 0; i < +d[1]; i++) amt += this.rng.int(1, +d[2]); amt += d[3] ? +d[3] : 0; }
      p.mp = Math.min(p.sheet.mpMax, p.mp + amt);
      floatText(p, `+${amt} energy`, 'heal');
    }
    if (b.use.buff) {
      p.foodBuff = { stats: { [b.use.buff.stat]: b.use.buff.value }, until: this.now + b.use.buff.secs };
      p.sheet = recalc(p);
    }
    removeItem(p, item.base, 1);
    this.save();
    return true;
  }

  // ---------------- rest / recovery ----------------
  // Bind a wound or eat: bandage first, then the ration, then anything edible/medicinal.
  quickHeal() {
    const p = this.player;
    if (!p) return false;
    if (p.hp >= p.sheet.hpMax) { toast('You are not hurt.', 'info'); return false; }
    for (const id of ['bandage', 'ration']) {
      const it = p.inv.find(i => i.base === id);
      if (it) return this.useConsumable(it);
    }
    const any = p.inv.find(i => BASE_BY_ID[i.base]?.use?.heal);
    if (any) return this.useConsumable(any);
    toast('Nothing to bind a wound with.', 'info');
    return false;
  }

  // Sleep in the bedroll until 06:00. Crops grow, wounds close, night passes.
  sleep() {
    const p = this.player;
    if (!p) return false;
    if (countItem(p, 'bedroll') < 1) { toast('You need a bedroll to sleep.', 'info'); return false; }
    const mins = (p.time ?? 0) % 1440;
    if (mins >= 6 * 60 && mins < 18 * 60) { toast('Too early to sleep. Wait for dusk.', 'info'); return false; }
    const danger = this.entities.some(e => e.kind === 'monster' && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 12);
    if (danger) { toast('Not while something is hunting you.', 'bad'); return false; }
    const dayStart = Math.floor((p.time ?? 0) / 1440) * 1440;
    let target = dayStart + 6 * 60;
    if (target <= (p.time ?? 0)) target += 1440;
    const hours = Math.max(1, Math.round((target - (p.time ?? 0)) / 60));
    p.time = target;
    p.day = 1 + Math.floor(p.time / 1440);
    p.effects = [];
    p.buffs = [];
    p.foodBuff = null;
    p.sheet = recalc(p);
    p.hp = p.sheet.hpMax;
    p.mp = p.sheet.mpMax;
    logLine(this, `You roll out the bedroll and sleep ${hours} hours, until ${timeString(p)}.`, 'good');
    toast('Rested until dawn', 'level');
    this.fx('heal', p.x, p.y);
    recheckAll(this);
    this.save();
    return true;
  }

  // ---------------- save / load ----------------
  save() {
    if (!this.player) return;
    try {
      const data = {
        version: 3, worldSeed: this.worldSeed, now: this.now,
        player: this.player, view: this.view,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.lastSave = this.now;
    } catch (e) { console.warn('save failed', e); }
  }

  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data?.player) return false;
      this.player = data.player;
      this.player.isPlayer = true;
      this.worldSeed = data.worldSeed ?? this.worldSeed;
      this.view = data.view ?? 'iso';
      this.cam.mode = this.view;
      this.player.sheet = recalc(this.player);
      this.player.cooldowns = this.player.cooldowns ?? {};
      this.player.buffs = this.player.buffs ?? [];
      this.player.effects = this.player.effects ?? [];
      this.entities = [];
      this.world.loadZone(this.player.position?.zone ?? 'wrack_shore', { x: this.player.position?.x, y: this.player.position?.y });
      this.player.hp = Math.max(1, this.player.hp);
      this.running = true;
      this.lastSave = this.now;
      logLine(this, 'Loaded. The shore is where you left it.', 'hi');
      return true;
    } catch (e) { console.warn('load failed', e); return false; }
  }

  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

  setView(mode) {
    this.view = mode;
    this.cam.mode = mode;
    toast(mode === 'iso' ? 'Isometric' : mode === 'third' ? 'Third person' : 'First person', 'info');
    this.save();
  }
}

// keep quest emission consistent even when called without the method
export function emitEvent(game, type, target, count = 1) {
  if (game.emit) return game.emit(type, target, count);
  return questEmit(game, type, target, count);
}
