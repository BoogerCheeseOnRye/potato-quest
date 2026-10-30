// World is X east, Y north (metres, y-up on the map), Z up.
// Three cameras share one projection contract:
//   project({x,y,z}, cam) -> {x, y, s, depth} | null   (screen px, scale, sort depth)
export const TAU = Math.PI * 2;
// Pixels per metre in the isometric camera. 24 keeps a 1.8 m person about 43 px
// tall on a phone while still showing ~19 m across, so the world feels big and
// props read at their true size.
export const ISO_K = 24;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const deg = (d) => d * Math.PI / 180;

export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
export function angleTo(ax, ay, bx, by) { return Math.atan2(bx - ax, by - ay); }

export function makeCamera(mode = 'iso') {
  return {
    mode,                 // 'iso' | 'third' | 'first'
    x: 0, y: 0, z: 0,      // focus point (player), z = focus height
    yaw: 0,               // 0 = looking north (+y)
    zoom: 1,
    w: 390, h: 844,       // viewport px
    fov: 300,             // perspective focal length (px per metre at 1m)
    eye: 1.7,             // eye height (first person)
    dist: 10,             // third person boom length
    pitch: 0.30,          // third person look-down (0..1)
  };
}

export function camFollow(cam, x, y, z = 0) { cam.x = x; cam.y = y; cam.z = z; }

export function project(p, cam) {
  const W = cam.w, H = cam.h;
  if (cam.mode === 'iso') {
    // orthographic 45/30 isometric
    const k = ISO_K * cam.zoom;
    const px = p.x - cam.x, py = p.y - cam.y;
    return {
      x: W / 2 + (px - py) * k * 0.866,
      y: H / 2 + (px + py) * k * 0.5 - p.z * k,
      s: k,
      depth: px + py,
      horizon: false,
    };
  }
  // perspective cameras: camera sits behind/at the focus looking along yaw
  const fx = Math.sin(cam.yaw), fy = Math.cos(cam.yaw);   // forward
  const rx = Math.cos(cam.yaw), ry = -Math.sin(cam.yaw);  // right
  const back = cam.mode === 'first' ? 0 : cam.dist;
  const cx = cam.x - fx * back, cy = cam.y - fy * back;
  const cz = (cam.mode === 'first' ? cam.z + cam.eye : cam.z + cam.eye + cam.dist * cam.pitch);
  const dx = p.x - cx, dy = p.y - cy;
  const Z = dx * fx + dy * fy;            // metres ahead of camera
  const X = dx * rx + dy * ry;
  if (Z <= 0.35) return null;
  const f = cam.fov * cam.zoom;
  const horizon = H * (cam.mode === 'first' ? 0.44 : 0.40);
  return {
    x: W / 2 + (X * f) / Z,
    y: horizon + ((cz - p.z) * f) / Z,
    s: f / Z,
    depth: Z,
    horizon,
  };
}

// Screen-space distance helper for culling
export function onScreen(pr, pad = 200, cam = null) {
  if (!pr) return false;
  const w = cam ? cam.w : 1e9, h = cam ? cam.h : 1e9;
  return pr.x > -pad && pr.x < w + pad && pr.y > -pad && pr.y < h + pad;
}

// Simple obstacle collision: circles and rects, resolved by pushing out.
export function circleBlocked(x, y, r, obstacles) {
  for (const o of obstacles) {
    if (o.type === 'circle') {
      const d = Math.hypot(x - o.x, y - o.y);
      if (d < o.r + r) return { x: o.x, y: o.y, push: o.r + r - d };
    } else if (o.type === 'rect') {
      const nx = clamp(x, o.x, o.x + o.w), ny = clamp(y, o.y, o.y + o.h);
      const d = Math.hypot(x - nx, y - ny);
      if (d < r) return { x: nx, y: ny, push: r - Math.max(d, 0.001) };
    }
  }
  return null;
}

export function moveWithCollision(ent, dx, dy, obstacles, bounds) {
  let nx = ent.x + dx, ny = ent.y + dy;
  const r = ent.radius ?? 0.35;
  if (bounds) {
    nx = clamp(nx, bounds.x + r, bounds.x + bounds.w - r);
    ny = clamp(ny, bounds.y + r, bounds.y + bounds.h - r);
  }
  for (let i = 0; i < 2; i++) {
    const hit = circleBlocked(nx, ny, r, obstacles);
    if (!hit) break;
    const d = Math.hypot(nx - hit.x, ny - hit.y) || 0.001;
    nx = hit.x + ((nx - hit.x) / d) * (d + hit.push + 0.001);
    ny = hit.y + ((ny - hit.y) / d) * (d + hit.push + 0.001);
  }
  ent.x = nx; ent.y = ny;
}

export function num(v, d = 0) { return Number.isFinite(v) ? v : d; }
