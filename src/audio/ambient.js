// Ambient sound, synthesised: no audio files, no downloads, cheap on a potato.
//
// Layers
//   wind    filtered noise, always on, louder in the open
//   water   band-passed noise near the shore and the flats
//   fire    crackling noise, only within earshot of a camp fire
//   birds   short chirps by day in green places
//   crickets chirps at night
//
// The browser will not let us make noise before a gesture, so nothing starts
// until initAudio() is called from the START/CONTINUE click.

const KEY = 'potatoquest.audio.v1';

let ctx = null;
let master = null;
let noiseBuf = null;
let layers = null;
let muted = false;
let started = false;
let zoneKey = '';
let chirpT = 0;

function readMuted() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

function writeMuted(v) {
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ }
}

export function isMuted() { return muted; }

export function initAudio() {
  if (started) return;
  muted = readMuted();
  started = true;
  try {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);

    // one second of noise, reused by every noise layer
    const len = Math.floor(ctx.sampleRate * 1.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    layers = {
      wind: noiseLayer({ type: 'lowpass', freq: 520, q: 0.7, gain: 0.16 }),
      water: noiseLayer({ type: 'bandpass', freq: 1400, q: 0.8, gain: 0 }),
      fire: noiseLayer({ type: 'highpass', freq: 2400, q: 0.6, gain: 0 }),
    };
    // fire crackle: wobble the gain so it is not a steady hiss
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'square';
    lfo.frequency.value = 7.3;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(layers.fire.gain.gain);
    lfo.start();
    layers.fire.lfo = lfo;

    // resume on any gesture (iOS suspends contexts aggressively)
    const resume = () => { ctx?.resume?.(); };
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('keydown', resume);
  } catch (e) {
    console.warn('ambient audio unavailable', e);
  }
}

function noiseLayer({ type, freq, q, gain }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(master);
  src.start();
  return { src, filter, gain: g };
}

export function setMuted(v) {
  muted = !!v;
  writeMuted(muted);
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.08);
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

// Called from the HUD a few times a second. Cheap: only touches gains when the
// zone/weather/night/fire state actually changes.
export function updateAmbient(game) {
  if (!ctx || !layers) return;
  const zone = game.world?.zone;
  const p = game.player;
  if (!zone || !p) return;
  const minutes = (p.time ?? 360) % 1440;
  const night = minutes < 330 || minutes > 1260;
  const wet = zone.habitat?.some(h => h === 'shore' || h === 'tidal');
  const green = zone.habitat?.some(h => h === 'forest' || h === 'town');
  const camp = (zone.pois ?? []).find(po => po.kind === 'camp' || po.kind === 'farm');
  const nearFire = camp ? Math.hypot(camp.x - p.x, camp.y - p.y) < 26 : false;
  const key = `${zone.id}|${night}|${nearFire}|${wet}`;
  if (key === zoneKey) return;
  zoneKey = key;
  const t = ctx.currentTime;
  layers.wind.gain.gain.setTargetAtTime(night ? 0.2 : 0.13, t, 1.2);
  layers.wind.filter.frequency.setTargetAtTime(night ? 380 : 560, t, 1.5);
  layers.water.gain.gain.setTargetAtTime(wet ? 0.09 : 0, t, 1.5);
  layers.fire.gain.gain.setTargetAtTime(nearFire ? 0.05 : 0, t, 0.6);

  // birds and crickets are scheduled in tick(), not here
  chirpT = 0;
  if (green && !night) scheduleBirds();
}

let birdTimer = null;
let cricketTimer = null;

function scheduleBirds() {
  clearTimeout(birdTimer);
  const chirp = () => {
    if (!ctx || muted) { birdTimer = setTimeout(chirp, 4000); return; }
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) chirpOnce(0.06 + Math.random() * 0.04, 2200 + Math.random() * 1400, i * 0.11);
    birdTimer = setTimeout(chirp, 3000 + Math.random() * 6000);
  };
  birdTimer = setTimeout(chirp, 1500);
}

function chirpOnce(vol, freq, delay) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.06);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.16);
}

export function stopAmbient() {
  clearTimeout(birdTimer);
  clearTimeout(cricketTimer);
  try { layers?.fire?.lfo?.stop(); } catch { /* already stopped */ }
  layers = null;
  if (ctx) { try { ctx.close(); } catch { /* ignore */ } }
  ctx = null;
  started = false;
  zoneKey = '';
}
