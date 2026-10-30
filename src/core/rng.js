// Deterministic RNG. Every zone, spawn, loot roll and name comes from a stream
// so a save file only needs seeds, not the world itself.
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class RNG {
  constructor(seed = 1) {
    this.s = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 1;
    this.calls = 0;
  }
  next() {
    // xorshift32
    let x = this.s;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.s = x;
    this.calls++;
    return x / 4294967296;
  }
  int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); }
  float(min, max) { return min + this.next() * (max - min); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // weighted table: [{w, ...}] -> entry
  weighted(table) {
    let total = 0;
    for (const t of table) total += t.w ?? 1;
    let r = this.next() * total;
    for (const t of table) { r -= t.w ?? 1; if (r <= 0) return t; }
    return table[table.length - 1];
  }
  fork(tag) { return new RNG(hashString(tag + ':' + this.s)); }
  state() { return this.s; }
}

export const rng = (seed) => new RNG(seed);
