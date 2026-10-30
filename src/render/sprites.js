// Potato Quest — low-poly SVG art.
//
// Everything is drawn in METRES with the origin at its feet, so a 1.8 m person
// next to a 9 m tree next to a 7 m house reads at the right size in every camera.
// Style rules: faceted planes, one cool shadow tone, one warm lit tone, a dark
// silhouette outline, and a soft cast shadow. No raster assets, no gradients.

const OUT = '#0b0e11';
const SHADOW = (w = 0.9, o = 0.3) =>
  `<ellipse cx="0" cy="0.02" rx="${(w * 0.52).toFixed(2)}" ry="${(w * 0.19).toFixed(2)}" fill="#000" opacity="${o}"/>`;

const COL = {
  skin: '#c9a37c', skin2: '#a87f5c', cloth: '#4f6a6e', cloth2: '#33474d', rust: '#a15a32',
  rust2: '#6f3c21', bone: '#d8cdb4', steel: '#8a979c', steel2: '#5b6a70', dark: '#202a2e',
  glow: '#7fe6d8', amber: '#e8a33d', blood: '#a8322a', green: '#6fa35a', spore: '#9f7fd0',
  white: '#e6eef0', ash: '#8b857c', violet: '#8f7bff', wood: '#7a5433', wood2: '#54381f',
  soil: '#3a2c1f', leaf: '#4f7a3f', leaf2: '#35592c', spud: '#c99a58', spud2: '#a2763c',
};

// ---------------------------------------------------------------- helpers
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return '#' + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0');
}
// deterministic 0..1 from a seed and an index
function vr(v = 0, i = 0) {
  const x = Math.sin((v + 1) * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const f2 = (n) => Number(n).toFixed(2);
const pts = (list) => list.map(([x, y]) => `${f2(x)},${f2(y)}`).join(' ');
const poly = (list, fill, extra = '') => `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;
const S = `.03`; // outline width in metres

function canopyBlob(cx, cy, r, n, seed, squash = 0.85) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = r * (0.76 + vr(seed, i) * 0.36);
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
  }
  return out;
}

// ---------------------------------------------------------------- people
function biped(c = {}) {
  const skin = c.skin ?? COL.skin;
  const cloth = c.cloth ?? COL.cloth, cloth2 = c.cloth2 ?? COL.cloth2;
  const trim = c.trim ?? shade(cloth, 0.2);
  const w = c.wide ?? 1, h = c.h ?? 1;
  const weapon = c.weapon ?? 'blade';
  const hip = -0.84 * h, sh = -1.46 * h, headY = -1.63 * h;
  const legs = `
    <polygon points="${pts([[-0.21 * w, 0], [-0.04 * w, 0], [-0.02 * w, hip], [-0.18 * w, hip]])}" fill="${cloth2}"/>
    <polygon points="${pts([[0.04 * w, 0], [0.21 * w, 0], [0.18 * w, hip], [0.02 * w, hip]])}" fill="${shade(cloth2, 0.14)}"/>
    <polygon points="${pts([[-0.24 * w, 0], [-0.02 * w, 0], [-0.02 * w, -0.09], [-0.24 * w, -0.09]])}" fill="${COL.wood2}"/>
    <polygon points="${pts([[0.02 * w, 0], [0.24 * w, 0], [0.24 * w, -0.09], [0.02 * w, -0.09]])}" fill="${COL.wood2}"/>`;
  const torso = `
    <polygon points="${pts([[-0.3 * w, hip], [0.3 * w, hip], [0.25 * w, sh], [-0.25 * w, sh]])}" fill="${cloth}"/>
    <polygon points="${pts([[-0.3 * w, hip], [-0.05 * w, hip], [-0.03 * w, sh], [-0.25 * w, sh]])}" fill="${shade(cloth, 0.14)}" stroke="none"/>
    <polygon points="${pts([[-0.25 * w, sh], [0.25 * w, sh], [0.18 * w, sh + 0.1], [-0.18 * w, sh + 0.1]])}" fill="${trim}" stroke="none"/>
    <rect x="${f2(-0.29 * w)}" y="${f2(hip - 0.06)}" width="${f2(0.58 * w)}" height=".07" fill="${COL.wood2}" stroke="none"/>
    <circle cx="${f2(0.09 * w)}" cy="${f2(hip - 0.025)}" r=".035" fill="${COL.amber}" stroke="none"/>`;
  const head = `
    <polygon points="${pts([[-0.11 * w, sh - 0.02], [0.11 * w, sh - 0.02], [0.1 * w, sh + 0.09], [-0.1 * w, sh + 0.09]])}" fill="${skin}" stroke="none"/>
    <circle cx="0" cy="${f2(headY)}" r="${f2(0.155 * h)}" fill="${skin}"/>
    <polygon points="${pts([[-0.14 * h, headY - 0.02], [0.14 * h, headY - 0.02], [0.1 * h, headY + 0.09], [-0.1 * h, headY + 0.09]])}" fill="${shade(skin, -0.12)}" stroke="none"/>`;
  const hair = c.hood
    ? `<path d="M ${f2(-0.21 * h)} ${f2(headY + 0.06)} Q 0 ${f2(headY - 0.32 * h)} ${f2(0.21 * h)} ${f2(headY + 0.06)} L ${f2(0.17 * h)} ${f2(headY + 0.14)} L ${f2(-0.17 * h)} ${f2(headY + 0.14)} Z" fill="${cloth2}"/>`
    : `<path d="M ${f2(-0.16 * h)} ${f2(headY - 0.02)} Q 0 ${f2(headY - 0.22 * h)} ${f2(0.16 * h)} ${f2(headY - 0.02)} L ${f2(0.15 * h)} ${f2(headY + 0.04)} Q 0 ${f2(headY - 0.08 * h)} ${f2(-0.15 * h)} ${f2(headY + 0.04)} Z" fill="${c.hair ?? '#2a2320'}"/>`;
  const face = `
    <circle cx="${f2(-0.055 * h)}" cy="${f2(headY)}" r=".018" fill="${c.eyes ?? '#1a1410'}" stroke="none"/>
    <circle cx="${f2(0.055 * h)}" cy="${f2(headY)}" r=".018" fill="${c.eyes ?? '#1a1410'}" stroke="none"/>
    ${c.beard ? `<path d="M ${f2(-0.1 * h)} ${f2(headY + 0.08)} Q 0 ${f2(headY + 0.26 * h)} ${f2(0.1 * h)} ${f2(headY + 0.08)} Z" fill="${c.hair ?? '#3a3028'}"/>` : ''}`;
  const arms = `
    <polygon points="${pts([[-0.3 * w, sh + 0.06], [-0.22 * w, sh + 0.02], [-0.31 * w, hip + 0.1], [-0.4 * w, hip + 0.14]])}" fill="${shade(cloth, -0.08)}"/>
    <polygon points="${pts([[0.3 * w, sh + 0.06], [0.22 * w, sh + 0.02], [0.31 * w, hip + 0.1], [0.4 * w, hip + 0.14]])}" fill="${cloth}"/>
    <circle cx="${f2(0.36 * w)}" cy="${f2(hip + 0.13)}" r=".055" fill="${skin}" stroke="none"/>
    <circle cx="${f2(-0.36 * w)}" cy="${f2(hip + 0.13)}" r=".055" fill="${skin}" stroke="none"/>`;
  const gear = `
    ${c.pack ? `<rect x="${f2(-0.2 * w)}" y="${f2(sh + 0.05)}" width="${f2(0.4 * w)}" height=".38" rx=".05" fill="${COL.steel2}"/><rect x="${f2(-0.2 * w)}" y="${f2(sh + 0.05)}" width="${f2(0.4 * w)}" height=".07" fill="${COL.steel}" stroke="none"/>` : ''}
    ${c.apron ? `<polygon points="${pts([[-0.2 * w, sh + 0.1], [0.2 * w, sh + 0.1], [0.16 * w, hip - 0.02], [-0.16 * w, hip - 0.02]])}" fill="${COL.rust2}" stroke="none"/>` : ''}
    ${c.shield ? `<ellipse cx="${f2(-0.4 * w)}" cy="${f2(hip + 0.02)}" rx=".15" ry=".24" fill="${COL.rust2}"/><ellipse cx="${f2(-0.4 * w)}" cy="${f2(hip + 0.02)}" rx=".1" ry=".17" fill="none" stroke="${COL.steel}" stroke-width=".025"/>` : ''}
    ${c.hat === 'straw' ? `<ellipse cx="0" cy="${f2(headY - 0.13 * h)}" rx=".3" ry=".09" fill="#c9a85e"/><path d="M ${f2(-0.15)} ${f2(headY - 0.14 * h)} Q 0 ${f2(headY - 0.34 * h)} ${f2(0.15)} ${f2(headY - 0.14 * h)} Z" fill="#d8b96e"/>` : ''}
    ${c.spud ? `<ellipse cx="${f2(0.13 * w)}" cy="${f2(hip - 0.03)}" rx=".05" ry=".038" fill="${COL.spud}" stroke="none"/><circle cx="${f2(0.15 * w)}" cy="${f2(hip - 0.04)}" r=".008" fill="${COL.spud2}" stroke="none"/>` : ''}`;
  const hand = [0.36 * w, hip + 0.13];
  const weapons = {
    blade: `<g transform="translate(${f2(hand[0])} ${f2(hand[1])}) rotate(22)"><rect x="-.02" y="-.62" width=".05" height=".66" fill="${COL.steel}"/><rect x="-.02" y="-.62" width=".02" height=".66" fill="${COL.white}" stroke="none"/><rect x="-.09" y="-.02" width=".19" height=".05" fill="${COL.wood2}"/></g>`,
    club: `<g transform="translate(${f2(hand[0])} ${f2(hand[1])}) rotate(18)"><polygon points="${pts([[-.035, .04], [.035, .04], [.06, -.56], [-.05, -.6]])}" fill="${COL.wood}"/><circle cx="0" cy="-.56" r=".07" fill="${COL.wood}"/></g>`,
    staff: `<line x1="${f2(hand[0])}" y1="${f2(hand[1])}" x2="${f2(hand[0] - 0.04)}" y2="${f2(sh - 0.16)}" stroke="${COL.wood2}" stroke-width=".055"/><circle cx="${f2(hand[0] - 0.04)}" cy="${f2(sh - 0.18)}" r=".08" fill="${c.glowColor ?? COL.glow}"/><circle cx="${f2(hand[0] - 0.04)}" cy="${f2(sh - 0.18)}" r=".17" fill="${c.glowColor ?? COL.glow}" opacity=".16" stroke="none"/>`,
    gun: `<g transform="translate(${f2(hand[0] - 0.02)} ${f2(hand[1] - 0.04)})"><rect x="0" y="0" width=".52" height=".07" fill="${COL.steel2}"/><rect x=".1" y=".06" width=".08" height=".15" fill="${COL.wood2}"/><rect x=".44" y="-.01" width=".06" height=".09" fill="${COL.steel}"/></g>`,
    spear: `<line x1="${f2(hand[0])}" y1="${f2(hand[1] + 0.3)}" x2="${f2(hand[0] + 0.1)}" y2="${f2(sh - 0.3)}" stroke="${COL.wood}" stroke-width=".045"/><polygon points="${pts([[hand[0] + 0.1, sh - 0.3], [hand[0] + 0.16, sh - 0.48], [hand[0] + 0.04, sh - 0.42]])}" fill="${COL.steel}"/>`,
    axe: `<g transform="translate(${f2(hand[0])} ${f2(hand[1])}) rotate(14)"><rect x="-.025" y="-.56" width=".05" height=".6" fill="${COL.wood}"/><path d="M .02 -.5 Q .22 -.56 .26 -.38 Q .16 -.3 .02 -.34 Z" fill="${COL.steel}"/></g>`,
  };
  return `${SHADOW(1.0 * w)}
  <g stroke="${OUT}" stroke-width="${S}" stroke-linejoin="round">
    ${legs}${torso}${arms}${head}${hair}${face}${gear}
    ${weapons[weapon] ?? ''}
  </g>`;
}

// ---------------------------------------------------------------- beasts
function quadruped(c = {}) {
  const body = c.body ?? COL.rust;
  const dark = c.dark ?? shade(body, -0.3);
  const light = c.light ?? shade(body, 0.2);
  const L = c.len ?? 1.25, legH = c.legs ?? 0.44, bh = c.bodyH ?? 0.4;
  const backY = -(legH + bh);
  const frontX = 0.5 * L, backX = -0.48 * L;
  const headX = 0.62 * L, headY = backY + 0.02;
  return `${SHADOW(1.35 * L / 1.25)}
  <g stroke="${OUT}" stroke-width="${S}" stroke-linejoin="round">
    <polygon points="${pts([[-0.42 * L, 0], [-0.32 * L, 0], [-0.36 * L, backY + 0.04], [-0.46 * L, backY + 0.04]])}" fill="${dark}"/>
    <polygon points="${pts([[-0.16 * L, 0], [-0.06 * L, 0], [-0.12 * L, backY + 0.04], [-0.22 * L, backY + 0.04]])}" fill="${dark}"/>
    <polygon points="${pts([[0.26 * L, 0], [0.36 * L, 0], [0.3 * L, backY + 0.04], [0.2 * L, backY + 0.04]])}" fill="${dark}"/>
    <polygon points="${pts([[0.4 * L, 0], [0.5 * L, 0], [0.44 * L, backY + 0.04], [0.34 * L, backY + 0.04]])}" fill="${dark}"/>
    <polygon points="${pts([[backX, backY + 0.12], [frontX, backY], [frontX + 0.04, backY + bh], [backX, backY + bh + 0.02]])}" fill="${body}"/>
    <polygon points="${pts([[backX, backY + 0.12], [frontX, backY], [frontX, backY + 0.16], [backX, backY + 0.26]])}" fill="${light}" stroke="none"/>
    <polygon points="${pts([[backX, backY + 0.14], [backX + 0.5 * L, backY + 0.1], [backX + 0.5 * L, backY + bh], [backX, backY + bh]])}" fill="${dark}" stroke="none" opacity=".45"/>
    <path d="M ${f2(backX)} ${f2(backY + 0.18)} q ${f2(-0.28 * L)} ${f2(-0.04)} ${f2(-0.34 * L)} ${f2(0.12)}" fill="none" stroke="${dark}" stroke-width=".05"/>
    <polygon points="${pts([[headX - 0.16 * L, headY + 0.06], [headX + 0.16 * L, headY], [headX + 0.2 * L, headY + 0.24], [headX - 0.04 * L, headY + 0.3]])}" fill="${body}"/>
    <polygon points="${pts([[headX - 0.02 * L, headY + 0.26], [headX + 0.2 * L, headY + 0.24], [headX + 0.16 * L, headY + 0.34], [headX + 0.02 * L, headY + 0.34]])}" fill="${dark}"/>
    <path d="M ${f2(headX + 0.18 * L)} ${f2(headY + 0.14)} l .1 .02 l -.1 .04 z" fill="${COL.dark}"/>
    <circle cx="${f2(headX + 0.08 * L)}" cy="${f2(headY + 0.12)}" r=".028" fill="${c.eyes ?? COL.amber}" stroke="none"/>
    ${c.ears !== false ? `<polygon points="${pts([[headX - 0.1 * L, headY + 0.02], [headX - 0.16 * L, headY - 0.14], [headX - 0.02 * L, headY + 0.02]])}" fill="${dark}"/><polygon points="${pts([[headX + 0.04 * L, headY], [headX + 0.02 * L, headY - 0.16], [headX + 0.14 * L, headY - 0.02]])}" fill="${dark}"/>` : ''}
    ${c.horns ? `<path d="M ${f2(headX)} ${f2(headY + 0.02)} q -.04 -.18 .06 -.26 M ${f2(headX + 0.12 * L)} ${f2(headY)} q .06 -.16 .16 -.2" stroke="${COL.bone}" stroke-width=".04" fill="none"/>` : ''}
    ${c.spikes ? `<path d="M ${f2(backX + 0.2 * L)} ${f2(backY + 0.02)} l .06 -.13 l .07 .13 l .07 -.15 l .08 .15 l .07 -.12" fill="none" stroke="${dark}" stroke-width=".035"/>` : ''}
    ${c.cap ? `<ellipse cx="${f2(-0.02 * L)}" cy="${f2(backY - 0.04)}" rx="${f2(0.3 * L)}" ry=".12" fill="${COL.spore}"/><ellipse cx="${f2(-0.08 * L)}" cy="${f2(backY - 0.07)}" rx="${f2(0.16 * L)}" ry=".05" fill="#cbb6ef" stroke="none"/>` : ''}
  </g>`;
}

function bird(c = {}) {
  const body = c.body ?? COL.white, wing = c.wing ?? COL.steel;
  return `${SHADOW(0.55, 0.24)}
  <g stroke="${OUT}" stroke-width=".022" stroke-linejoin="round">
    <path d="M -.1 0 l .03 -.24 M .06 0 l .02 -.22" stroke="${COL.amber}" stroke-width=".028"/>
    <polygon points="${pts([[-.22, -.34], [.02, -.56], [.2, -.4], [.04, -.26]])}" fill="${body}"/>
    <polygon points="${pts([[-.16, -.4], [-.34, -.3], [-.06, -.28]])}" fill="${wing}"/>
    <polygon points="${pts([[.02, -.42], [.28, -.44], [.1, -.32]])}" fill="${shade(wing, 0.15)}"/>
    <circle cx=".16" cy="-.56" r=".1" fill="${body}"/>
    <path d="M .24 -.57 l .14 .03 l -.14 .05 z" fill="${COL.amber}"/>
    <circle cx=".19" cy="-.59" r=".018" fill="${COL.dark}" stroke="none"/>
  </g>`;
}

function crab(c = {}) {
  const shell = c.shell ?? COL.rust, hi = c.hi ?? shade(shell, 0.22), s = c.scale ?? 1;
  const leg = (side, y, dx, dy) => `<path d="M ${f2(side * .16 * s)} ${f2(y)} l ${f2(side * dx * s)} ${f2(dy * s)}" stroke="${shade(shell, -0.3)}" stroke-width="${f2(.04 * s)}" fill="none"/>`;
  return `${SHADOW(0.95 * s)}
  <g stroke="${OUT}" stroke-width=".02" stroke-linejoin="round">
    ${[-1, 1].map(side => `${leg(side, -.08, .26, .02)}${leg(side, -.15, .3, -.06)}${leg(side, -.22, .26, -.14)}`).join('')}
    <ellipse cx="0" cy="${f2(-.26 * s)}" rx="${f2(.34 * s)}" ry="${f2(.2 * s)}" fill="${shell}"/>
    <polygon points="${pts([[-.3 * s, -.26 * s], [0, -.46 * s], [.3 * s, -.26 * s], [0, -.18 * s]])}" fill="${hi}" stroke="none"/>
    ${[-1, 1].map(side => `<path d="M ${f2(side * .26 * s)} ${f2(-.34 * s)} q ${f2(side * .14 * s)} ${f2(-.1 * s)} ${f2(side * .12 * s)} ${f2(-.22 * s)}" stroke="${shade(shell, -0.2)}" stroke-width="${f2(.055 * s)}" fill="none"/><polygon points="${pts([[side * .4 * s, -.56 * s], [side * .56 * s, -.62 * s], [side * .48 * s, -.46 * s]])}" fill="${shell}"/>`).join('')}
    <circle cx="${f2(-.1 * s)}" cy="${f2(-.36 * s)}" r="${f2(.03 * s)}" fill="${COL.dark}" stroke="none"/>
    <circle cx="${f2(.1 * s)}" cy="${f2(-.36 * s)}" r="${f2(.03 * s)}" fill="${COL.dark}" stroke="none"/>
    ${c.spikes ? `<path d="M ${f2(-.18 * s)} ${f2(-.42 * s)} l -.05 -.1 M 0 ${f2(-.47 * s)} l 0 -.11 M ${f2(.18 * s)} ${f2(-.42 * s)} l .05 -.1" stroke="${COL.bone}" stroke-width=".025"/>` : ''}
  </g>`;
}

function blob(c = {}) {
  const body = c.body ?? '#4f8f6a';
  return `${SHADOW(0.9, .28)}
  <g stroke="${OUT}" stroke-width=".025" stroke-linejoin="round">
    <path d="M -.34 0 Q -.46 -.34 -.2 -.54 Q 0 -.68 .24 -.5 Q .46 -.32 .32 0 Z" fill="${body}"/>
    <path d="M -.28 -.04 Q -.36 -.3 -.16 -.46 Q -.02 -.54 .04 -.4 Q -.06 -.18 -.28 -.04 Z" fill="${shade(body, 0.24)}" stroke="none"/>
    <circle cx="-.08" cy="-.34" r=".028" fill="${COL.dark}" stroke="none"/>
    <circle cx=".1" cy="-.36" r=".028" fill="${COL.dark}" stroke="none"/>
    ${c.bubbles ? `<circle cx=".14" cy="-.5" r=".03" fill="#fff" opacity=".3" stroke="none"/><circle cx="-.18" cy="-.44" r=".02" fill="#fff" opacity=".25" stroke="none"/>` : ''}
  </g>`;
}

function flyer(c = {}) {
  const t = c.t ?? 0.5, body = c.body ?? COL.dark, wing = c.wing ?? COL.steel;
  return `${SHADOW(0.55, .18)}
  <g transform="translate(0 ${f2(-t)})" stroke="${OUT}" stroke-width=".02" stroke-linejoin="round">
    <polygon points="${pts([[0, -.08], [-.42, -.22], [-.36, -.02], [-.06, .02]])}" fill="${wing}" opacity=".9"/>
    <polygon points="${pts([[0, -.08], [.42, -.22], [.36, -.02], [.06, .02]])}" fill="${shade(wing, 0.12)}" opacity=".9"/>
    <ellipse cx="0" cy="0" rx=".2" ry=".13" fill="${body}"/>
    <circle cx="0" cy="-.04" r=".04" fill="${c.glow ?? COL.glow}" stroke="none"/>
    ${c.lights ? `<circle cx="-.14" cy=".03" r=".02" fill="${COL.amber}" stroke="none"/><circle cx=".14" cy=".03" r=".02" fill="${COL.amber}" stroke="none"/>` : ''}
  </g>`;
}

function construct(c = {}) {
  const m = c.metal ?? COL.steel2, hi = c.hi ?? COL.steel, h = c.h ?? 1.5, w = c.w ?? 1.2;
  return `${SHADOW(1.1 * w, .34)}
  <g stroke="${OUT}" stroke-width=".03" stroke-linejoin="round">
    <rect x="${f2(-.34 * w)}" y="-.16" width=".26" height=".16" fill="${COL.dark}"/>
    <rect x="${f2(.08 * w)}" y="-.16" width=".26" height=".16" fill="${COL.dark}"/>
    <rect x="${f2(-.34 * w)}" y="-.16" width=".26" height=".05" fill="${m}"/>
    <rect x="${f2(.08 * w)}" y="-.16" width=".26" height=".05" fill="${m}"/>
    <rect x="${f2(-.3 * w)}" y="${f2(-.82 * h)}" width="${f2(.6 * w)}" height="${f2(.68 * h)}" rx=".04" fill="${m}"/>
    <rect x="${f2(-.3 * w)}" y="${f2(-.82 * h)}" width="${f2(.18 * w)}" height="${f2(.68 * h)}" fill="${hi}" stroke="none" opacity=".5"/>
    <rect x="${f2(-.22 * w)}" y="${f2(-.72 * h)}" width="${f2(.44 * w)}" height="${f2(.26 * h)}" fill="${COL.dark}"/>
    <circle cx="0" cy="${f2(-.59 * h)}" r=".07" fill="${c.glow ?? COL.glow}" stroke="none"/>
    <rect x="${f2(-.44 * w)}" y="${f2(-.78 * h)}" width=".1" height="${f2(.46 * h)}" fill="${m}" transform="rotate(-6)"/>
    <rect x="${f2(.34 * w)}" y="${f2(-.78 * h)}" width=".1" height="${f2(.46 * h)}" fill="${m}" transform="rotate(6)"/>
    <circle cx="0" cy="${f2(-.94 * h)}" r=".13" fill="${m}"/>
    <circle cx="0" cy="${f2(-.94 * h)}" r=".05" fill="${c.glow ?? COL.blood}" stroke="none"/>
    ${c.cannon ? `<rect x="${f2(.34 * w)}" y="${f2(-.66 * h)}" width=".4" height=".1" fill="${COL.dark}"/><circle cx="${f2(.76 * w)}" cy="${f2(-.61 * h)}" r=".05" fill="${c.glow ?? COL.glow}" stroke="none"/>` : ''}
    <path d="M ${f2(-.3 * w)} ${f2(-.5 * h)} l -.14 .2 M ${f2(.3 * w)} ${f2(-.5 * h)} l .14 .2" stroke="${COL.dark}" stroke-width=".03"/>
  </g>`;
}

function ghost(c = {}) {
  const body = c.body ?? COL.violet;
  return `<ellipse cx="0" cy="0" rx=".34" ry=".11" fill="${body}" opacity=".16"/>
  <g opacity=".9" stroke="${OUT}" stroke-width=".02" stroke-linejoin="round">
    <path d="M -.24 -.08 Q -.34 -1.0 0 -1.12 Q .34 -1.0 .24 -.08 Q .12 -.16 .06 -.04 Q 0 -.16 -.06 -.04 Q -.14 -.16 -.24 -.08 Z" fill="${body}" opacity=".62"/>
    <path d="M -.18 -.14 Q -.24 -.8 0 -.96 Q -.04 -.5 -.18 -.14 Z" fill="${shade(body, 0.3)}" opacity=".4" stroke="none"/>
    <circle cx="-.08" cy="-.78" r=".032" fill="${c.eyes ?? COL.glow}" stroke="none"/>
    <circle cx=".08" cy="-.78" r=".032" fill="${c.eyes ?? COL.glow}" stroke="none"/>
  </g>`;
}

// ---------------------------------------------------------------- props
function tree(c = {}) {
  const v = c.v ?? 0.5;
  const kind = c.kind ?? (v < 0.24 ? 'conifer' : v < 0.48 ? 'broad' : v < 0.7 ? 'birch' : 'dead');
  const leaf = c.leaf ?? COL.leaf, leaf2 = shade(leaf, -0.24), leaf3 = shade(leaf, 0.2);
  if (kind === 'conifer') {
    return `${SHADOW(2.2, .26)}
    <g stroke="${OUT}" stroke-width=".04" stroke-linejoin="round">
      <polygon points="${pts([[-.28, 0], [.28, 0], [.16, -3.2], [-.16, -3.2]])}" fill="${COL.wood2}"/>
      <polygon points="${pts([[-2.0, -2.6], [0, -4.6], [2.0, -2.6]])}" fill="${leaf2}"/>
      <polygon points="${pts([[-1.7, -4.0], [0, -6.2], [1.7, -4.0]])}" fill="${leaf}"/>
      <polygon points="${pts([[-1.3, -5.5], [0, -7.7], [1.3, -5.5]])}" fill="${leaf3}"/>
      <polygon points="${pts([[0, -7.7], [1.3, -5.5], [0, -5.5]])}" fill="${leaf2}" stroke="none" opacity=".6"/>
      <polygon points="${pts([[-2.0, -2.6], [0, -4.6], [0, -3.1]])}" fill="${leaf3}" stroke="none" opacity=".35"/>
    </g>`;
  }
  if (kind === 'dead') {
    return `${SHADOW(1.5, .24)}
    <g stroke="${OUT}" stroke-width=".04" stroke-linejoin="round" fill="none">
      <path d="M -.2 0 L -.1 -3.4 L .1 -5.8 L -.04 -7.2" stroke="${COL.wood2}" stroke-width=".34"/>
      <path d="M -.12 -3.6 L -1.3 -5.0 M .04 -4.6 L 1.2 -5.9 M -.08 -5.8 L -.9 -6.9 M .06 -6.4 L .8 -7.4" stroke="${COL.wood2}" stroke-width=".16"/>
    </g>`;
  }
  const trunk = kind === 'birch' ? '#cfc7b2' : COL.wood2;
  const canopyY = -5.4;
  const b1 = canopyBlob(-0.8, canopyY, 2.2, 7, v, 0.78);
  const b2 = canopyBlob(1.0, canopyY - 0.5, 2.0, 7, v + 3, 0.78);
  const b3 = canopyBlob(0.1, canopyY - 2.0, 2.2, 7, v + 7, 0.8);
  return `${SHADOW(2.4, .26)}
  <g stroke="${OUT}" stroke-width=".04" stroke-linejoin="round">
    <polygon points="${pts([[-.24, 0], [.24, 0], [.14, -4.2], [-.14, -4.2]])}" fill="${trunk}"/>
    ${kind === 'birch' ? `<path d="M -.12 -1.2 l .16 .04 M -.1 -2.4 l .14 .03 M -.06 -3.4 l .12 .03" stroke="${COL.dark}" stroke-width=".05"/>` : ''}
    <polygon points="${pts(b3)}" fill="${leaf2}"/>
    <polygon points="${pts(b2)}" fill="${leaf}"/>
    <polygon points="${pts(b1)}" fill="${leaf3}"/>
    <polygon points="${pts(b1.slice(0, 4))}" fill="${shade(leaf3, 0.2)}" stroke="none" opacity=".5"/>
    <circle cx="${f2(-1.1)}" cy="${f2(canopyY - 0.4)}" r=".09" fill="${COL.spud}" stroke="none" opacity=".9"/>
    <circle cx="${f2(0.6)}" cy="${f2(canopyY - 1.7)}" r=".08" fill="${COL.spud}" stroke="none" opacity=".9"/>
  </g>`;
}

function building(c = {}) {
  const wall = c.wall ?? '#5a4a3a', roof = c.roof ?? '#7a3f2a';
  return `${SHADOW(4.6, .32)}
  <g stroke="${OUT}" stroke-width=".05" stroke-linejoin="round">
    <polygon points="${pts([[-4, 0], [4, 0], [4, -3.4], [-4, -3.4]])}" fill="${wall}"/>
    <polygon points="${pts([[0, 0], [4, 0], [4, -3.4], [0, -3.4]])}" fill="${shade(wall, -0.16)}"/>
    <polygon points="${pts([[-4.4, -3.3], [0, -5.9], [4.4, -3.3], [0, -2.9]])}" fill="${roof}"/>
    <polygon points="${pts([[0, -5.9], [4.4, -3.3], [0, -2.9]])}" fill="${shade(roof, -0.22)}"/>
    <rect x="-.7" y="-1.9" width="1.4" height="1.9" fill="${COL.wood2}"/>
    <rect x="-3.2" y="-2.6" width="1.1" height="1.0" fill="${COL.amber}" opacity=".75"/>
    <rect x="2.1" y="-2.6" width="1.1" height="1.0" fill="${COL.amber}" opacity=".55"/>
    <path d="M -3.2 -2.6 v 1 M -2.65 -2.6 v 1 M 2.1 -2.6 v 1 M 2.65 -2.6 v 1" stroke="${OUT}" stroke-width=".04"/>
    <rect x="2.8" y="-5.6" width=".7" height="2.0" fill="${COL.rust2}"/>
    <rect x="2.6" y="-5.8" width="1.1" height=".25" fill="${COL.steel2}"/>
    <rect x="-4" y="-.5" width="8" height=".5" fill="${shade(wall, -0.3)}"/>
    <circle cx="0" cy="-3.7" r=".32" fill="${COL.spud}"/>
    <circle cx="-.1" cy="-3.8" r=".05" fill="${COL.spud2}" stroke="none"/>
  </g>`;
}

function wreck(c = {}) {
  return `${SHADOW(5.4, .34)}
  <g stroke="${OUT}" stroke-width=".05" stroke-linejoin="round">
    <path d="M -4.4 0 L -3.6 -2.2 L 2.6 -2.8 L 4.6 -.5 L 4.0 0 Z" fill="${COL.rust2}"/>
    <path d="M -3.6 -2.2 L 2.6 -2.8 L 3.4 -1.6 L -3.1 -1.1 Z" fill="${COL.rust}"/>
    <path d="M -2.8 -1.1 L -2.6 -2.4 M -1.4 -1.2 L -1.2 -2.5 M .2 -1.3 L .3 -2.6 M 1.8 -1.4 L 1.9 -2.7" stroke="${COL.wood2}" stroke-width=".1"/>
    <path d="M 2.4 -2.6 L 4.4 -6.8 L 4.8 -6.6 L 3.0 -2.4 Z" fill="${COL.steel2}"/>
    <path d="M -3.9 -1.2 L -4.6 -3.4 L -4.2 -3.5 L -3.5 -1.3 Z" fill="${COL.steel2}" opacity=".8"/>
    <path d="M -3.4 -.6 q .6 -.2 1.2 0 q -.6 .3 -1.2 0 M 1.4 -.7 q .7 -.2 1.3 .1 q -.7 .2 -1.3 -.1" fill="${COL.green}" stroke="none" opacity=".8"/>
  </g>`;
}

function spire(c = {}) {
  return `${SHADOW(3.4, .3)}
  <g stroke="${OUT}" stroke-width=".05" stroke-linejoin="round" fill="none">
    <path d="M -2.4 0 L -1.0 -13.2 L 1.0 -13.2 L 2.4 0" fill="${COL.steel2}"/>
    <path d="M -2.4 0 L -1.0 -13.2 L 0 -13.2 L .3 0 Z" fill="${COL.steel}" opacity=".45" stroke="none"/>
    <path d="M -2.2 -2 L 2.2 -2 M -1.8 -5 L 1.8 -5 M -1.4 -8 L 1.4 -8 M -1.1 -11 L 1.1 -11" stroke="${COL.steel2}" stroke-width=".12"/>
    <path d="M -2.2 -2 L 1.8 -5 M 2.2 -2 L -1.8 -5 M -1.8 -5 L 1.4 -8 M 1.8 -5 L -1.4 -8" stroke="${COL.steel2}" stroke-width=".06"/>
    <circle cx="0" cy="-13.6" r=".34" fill="${COL.glow}" stroke="none"/>
    <circle cx="0" cy="-13.6" r=".9" fill="${COL.glow}" opacity=".16" stroke="none"/>
  </g>`;
}

function prop(kind, c = {}) {
  const v = c.v ?? 0.5, tone = c.tone ?? 0;
  const rockCol = tone === 1 ? '#6d6f66' : tone === 2 ? '#7a6a58' : '#646b6e';
  switch (kind) {
    case 'rock': {
      const r = 0.8 + vr(v, 1) * 0.6;
      return `${SHADOW(1.9 * r, .3)}
      <g stroke="${OUT}" stroke-width=".04" stroke-linejoin="round">
        <polygon points="${pts([[-1.1 * r, 0], [-.9 * r, -.7 * r], [-.2 * r, -1.15 * r], [.7 * r, -.9 * r], [1.05 * r, -.25 * r], [.7 * r, 0]])}" fill="${rockCol}"/>
        <polygon points="${pts([[-.9 * r, -.7 * r], [-.2 * r, -1.15 * r], [.7 * r, -.9 * r], [.05 * r, -.55 * r]])}" fill="${shade(rockCol, 0.22)}" stroke="none"/>
        <polygon points="${pts([[.05 * r, -.55 * r], [.7 * r, -.9 * r], [1.05 * r, -.25 * r], [.3 * r, -.2 * r]])}" fill="${shade(rockCol, -0.2)}" stroke="none"/>
      </g>`;
    }
    case 'stone': return `${SHADOW(.6, .22)}<polygon points="${pts([[-.34, 0], [-.24, -.34], [.12, -.4], [.36, -.12], [.24, 0]])}" fill="${rockCol}" stroke="${OUT}" stroke-width=".025"/><polygon points="${pts([[-.24, -.34], [.12, -.4], [.02, -.2]])}" fill="${shade(rockCol, 0.24)}" stroke="none"/>`;
    case 'driftwood': return `${SHADOW(1.2, .2)}<path d="M -.9 0 Q -.3 -.28 .9 -.14" stroke="${COL.wood2}" stroke-width=".16" fill="none" stroke-linecap="round"/><path d="M -.2 -.16 l .18 -.34 M .5 -.2 l .1 -.3" stroke="${COL.wood2}" stroke-width=".08"/>`;
    case 'hull': return `${SHADOW(3.6, .3)}<path d="M -3 0 Q -2.6 -2.4 .4 -2.8 Q 2.6 -2.4 3.2 0 Z" fill="${COL.rust2}" stroke="${OUT}" stroke-width=".05"/><path d="M -2.6 -1 Q 0 -1.8 2.8 -1 L 3.2 0 L -3 0 Z" fill="${COL.rust}" opacity=".8"/><circle cx="-.8" cy="-1.8" r=".22" fill="${COL.dark}"/><circle cx="1.1" cy="-1.6" r=".2" fill="${COL.dark}"/><path d="M .2 -2.8 L .3 -5.2 L 1.6 -2.5" fill="${COL.steel2}" opacity=".8"/>`;
    case 'wreck': return wreck(c);
    case 'tree': return tree({ ...c, v });
    case 'mushroom': {
      const h = 0.42 + vr(v, 2) * 0.26;
      return `${SHADOW(.34, .2)}<g stroke="${OUT}" stroke-width=".02">
        <path d="M -.07 0 Q -.09 ${f2(-h * 0.5)} -.05 ${f2(-h)} L .05 ${f2(-h)} Q .09 ${f2(-h * 0.5)} .07 0 Z" fill="${COL.bone}"/>
        <path d="M -.27 ${f2(-h + 0.01)} Q -.25 ${f2(-h - .16)} 0 ${f2(-h - .19)} Q .25 ${f2(-h - .16)} .27 ${f2(-h + 0.01)} Q .12 ${f2(-h + .09)} 0 ${f2(-h + .09)} Q -.12 ${f2(-h + .09)} -.27 ${f2(-h + 0.01)} Z" fill="${COL.spore}"/>
        <path d="M -.27 ${f2(-h + 0.01)} Q -.25 ${f2(-h - .16)} 0 ${f2(-h - .19)} L 0 ${f2(-h + .09)} Q -.12 ${f2(-h + .09)} -.27 ${f2(-h + 0.01)} Z" fill="${shade(COL.spore, .18)}" stroke="none" opacity=".55"/>
        <ellipse cx="-.08" cy="${f2(-h - .07)}" rx=".06" ry=".025" fill="#efe6ff" stroke="none" opacity=".8"/>
        <circle cx=".09" cy="${f2(-h - .05)}" r=".02" fill="#efe6ff" stroke="none"/>
      </g>`;
    }
    case 'fern': return `${SHADOW(.55, .18)}<g fill="none" stroke="${COL.leaf}" stroke-width=".05" stroke-linecap="round"><path d="M 0 0 Q -.2 -.4 -.5 -.6"/><path d="M 0 0 Q .16 -.44 .46 -.68"/><path d="M 0 0 Q 0 -.5 .02 -.8"/><path d="M 0 -.2 l -.22 -.16 M 0 -.3 l .2 -.14 M .02 -.45 l -.18 -.12"/></g>`;
    case 'log': return `${SHADOW(1.5, .24)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.9" y="-.34" width="1.8" height=".34" rx=".1" fill="${COL.wood2}"/><ellipse cx="-.9" cy="-.17" rx=".1" ry=".17" fill="${COL.bone}" opacity=".7"/><path d="M -.4 -.3 l .2 -.2 M .3 -.3 l .2 -.2" stroke="${COL.green}" stroke-width=".04"/></g>`;
    case 'stump': return `${SHADOW(.8, .24)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.34" y="-.5" width=".68" height=".5" rx=".06" fill="${COL.wood2}"/><ellipse cx="0" cy="-.5" rx=".34" ry=".13" fill="${COL.bone}" opacity=".75"/><ellipse cx="0" cy="-.5" rx=".2" ry=".07" fill="${COL.wood2}" opacity=".5"/></g>`;
    case 'puddle': return `<ellipse cx="0" cy="-.02" rx="1.0" ry=".36" fill="${COL.glow}" opacity=".14"/><ellipse cx="0" cy="-.02" rx=".86" ry=".28" fill="#2b6d72" opacity=".55"/><path d="M -.4 -.04 q .2 -.06 .4 0" stroke="#9fe0dc" stroke-width=".03" opacity=".5"/>`;
    case 'pool': return `<ellipse cx="0" cy="-.02" rx="1.8" ry=".66" fill="${COL.glow}" opacity=".13"/><ellipse cx="0" cy="-.02" rx="1.6" ry=".54" fill="#2b6d72" opacity=".55"/><path d="M -.7 -.06 q .4 -.1 .8 0 M .2 .04 q .4 -.1 .7 0" stroke="#9fe0dc" stroke-width=".04" opacity=".45"/>`;
    case 'shell': return `${SHADOW(.28, .16)}<path d="M -.22 0 Q -.26 -.26 0 -.3 Q .26 -.26 .22 0 Z" fill="${COL.bone}" stroke="${OUT}" stroke-width=".02"/><path d="M 0 -.3 L 0 0 M -.14 -.26 L -.1 0 M .14 -.26 L .1 0" stroke="${COL.ash}" stroke-width=".018"/>`;
    case 'kelp': return `<g fill="none" stroke="#4f7a52" stroke-width=".06" opacity=".9"><path d="M -.1 0 Q -.28 -.5 -.04 -.9 Q .16 -1.2 .02 -1.5"/><path d="M .16 0 Q .34 -.4 .14 -.8"/></g>`;
    case 'grass': return `<g fill="none" stroke="${COL.green}" stroke-width=".035" stroke-linecap="round"><path d="M -.16 0 Q -.22 -.22 -.3 -.3"/><path d="M 0 0 Q -.02 -.3 .02 -.44"/><path d="M .14 0 Q .2 -.22 .3 -.28"/></g>`;
    case 'bone': return `${SHADOW(.45, .16)}<path d="M -.32 -.02 Q 0 -.16 .36 -.02" stroke="${COL.bone}" stroke-width=".08" fill="none"/><circle cx="-.34" cy="-.02" r=".06" fill="${COL.bone}"/><circle cx=".38" cy="-.02" r=".06" fill="${COL.bone}"/>`;
    case 'ashpile': return `<ellipse cx="0" cy="-.06" rx=".7" ry=".26" fill="${COL.ash}" opacity=".7"/><ellipse cx="-.1" cy="-.12" rx=".42" ry=".16" fill="#a8a29a" opacity=".6"/>`;
    case 'crate': return `${SHADOW(.8, .28)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.4" y="-.8" width=".8" height=".8" fill="${COL.wood}"/><rect x="-.4" y="-.8" width=".8" height=".12" fill="${shade(COL.wood, .18)}"/><path d="M -.4 -.68 L .4 -.12 M .4 -.68 L -.4 -.12" stroke="${COL.wood2}" stroke-width=".05"/></g>`;
    case 'pipe': return `${SHADOW(1.0, .24)}<path d="M -.6 0 L -.6 -.5 Q -.6 -.7 -.3 -.7 L .7 -.7" stroke="${COL.steel2}" stroke-width=".18" fill="none"/><circle cx=".7" cy="-.7" r=".13" fill="${COL.dark}"/>`;
    case 'tower': return `${SHADOW(2.4, .28)}<g stroke="${OUT}" stroke-width=".04" stroke-linejoin="round">
      <polygon points="-1.8,0 -1.0,-7.6 0,-7.6 0,0" fill="${COL.steel2}"/>
      <polygon points="0,0 0,-7.6 1.0,-7.6 1.8,0" fill="${shade(COL.steel2, -0.3)}"/>
      <polygon points="-1.7,-0.2 -1.02,-7.2 -0.86,-7.2 -1.4,-0.2" fill="${shade(COL.steel, 0.05)}" opacity=".5" stroke="none"/>
      <path d="M -1.5 -1 L 1.5 -1 M -1.2 -3.6 L 1.2 -3.6 M -1.0 -6 L 1.0 -6" stroke="${COL.steel}" stroke-width=".09"/>
      <path d="M -1.5 -1 L 1.2 -3.6 M 1.5 -1 L -1.2 -3.6 M -1.2 -3.6 L 1.0 -6 M 1.2 -3.6 L -1.0 -6" stroke="${COL.steel}" stroke-width=".05" opacity=".8"/>
      <rect x="-1.15" y="-8" width="2.3" height=".4" fill="${COL.rust}"/>
      <rect x="-1.05" y="-8.4" width="2.1" height=".2" fill="${shade(COL.rust, -0.2)}"/>
      <circle cx="0" cy="-8.7" r=".16" fill="${COL.amber}" stroke="none"/>
      <circle cx="0" cy="-8.7" r=".45" fill="${COL.amber}" opacity=".14" stroke="none"/>
    </g>`;
    case 'pylon': return `${SHADOW(1.6, .26)}<g stroke="${OUT}" stroke-width=".035" fill="none"><path d="M -.7 0 L -.22 -9.4 L .22 -9.4 L .7 0" stroke="${COL.steel2}" stroke-width=".1"/><path d="M -1.4 -7.2 L 1.4 -7.2 M -1.1 -5 L 1.1 -5 M -.85 -2.6 L .85 -2.6" stroke="${COL.steel2}" stroke-width=".08"/><path d="M -.22 -9.4 L -1.4 -7.2 M .22 -9.4 L 1.4 -7.2" stroke="${COL.steel2}" stroke-width=".06"/><circle cx="0" cy="-9.6" r=".16" fill="${COL.amber}" stroke="none"/><circle cx="0" cy="-9.6" r=".4" fill="${COL.amber}" opacity=".14" stroke="none"/></g>`;
    case 'server': return `${SHADOW(.9, .3)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.4" y="-2.0" width=".8" height="2.0" fill="${COL.dark}"/><rect x="-.4" y="-2.0" width=".8" height=".12" fill="${COL.steel2}"/><rect x="-.32" y="-1.7" width=".64" height=".1" fill="${COL.steel2}" stroke="none"/><rect x="-.32" y="-1.4" width=".64" height=".1" fill="${COL.steel2}" stroke="none"/><circle cx="-.22" cy="-1.0" r=".03" fill="${COL.glow}" stroke="none"/><circle cx="-.22" cy="-.8" r=".03" fill="${COL.amber}" stroke="none"/><circle cx=".22" cy="-.6" r=".03" fill="${COL.blood}" stroke="none"/></g>`;
    case 'building': return building(c);
    case 'spire': return spire(c);
    case 'monolith': return `${SHADOW(1.4, .3)}<g stroke="${OUT}" stroke-width=".04"><polygon points="${pts([[-.5, 0], [-.62, -3.2], [.34, -3.8], [.58, 0]])}" fill="#3a3f45"/><polygon points="${pts([[-.62, -3.2], [.34, -3.8], [.12, -3.3], [-.4, -2.8]])}" fill="#565c62" stroke="none"/><path d="M -.2 -1.4 l .1 .8 M .1 -2.2 l -.1 .7" stroke="${COL.glow}" stroke-width=".05" opacity=".5"/></g>`;
    case 'well': return `${SHADOW(1.4, .3)}<g stroke="${OUT}" stroke-width=".04"><ellipse cx="0" cy="-.32" rx="1.0" ry=".4" fill="${COL.steel2}"/><ellipse cx="0" cy="-.32" rx=".76" ry=".28" fill="${COL.dark}"/><path d="M -.86 -.4 L -.86 -2.2 L .86 -2.2 L .86 -.4" stroke="${COL.wood2}" stroke-width=".1" fill="none"/><polygon points="${pts([[-1.1, -2.2], [0, -2.9], [1.1, -2.2]])}" fill="${COL.roof ?? '#7a3f2a'}"/><rect x="-.14" y="-2.2" width=".28" height=".6" fill="${COL.wood}"/></g>`;
    case 'lamp': return `${SHADOW(.4, .22)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.06" y="-3.2" width=".12" height="3.2" fill="${COL.steel2}"/><path d="M 0 -3.2 q .5 0 .5 .4" stroke="${COL.steel2}" stroke-width=".06" fill="none"/><rect x=".3" y="-3.0" width=".4" height=".55" rx=".06" fill="${COL.amber}" opacity=".9"/><circle cx=".5" cy="-2.72" r=".5" fill="${COL.amber}" opacity=".12" stroke="none"/></g>`;
    case 'cart': return `${SHADOW(1.5, .28)}<g stroke="${OUT}" stroke-width=".04"><rect x="-.8" y="-1.0" width="1.6" height=".55" fill="${COL.wood}"/><path d="M -.8 -1.0 L -.8 -.6 M -.3 -1.0 L -.3 -.6 M .2 -1.0 L .2 -.6 M .7 -1.0 L .7 -.6" stroke="${COL.wood2}" stroke-width=".05"/><circle cx="-.5" cy="-.22" r=".24" fill="none" stroke="${COL.wood2}" stroke-width=".07"/><circle cx=".5" cy="-.22" r=".24" fill="none" stroke="${COL.wood2}" stroke-width=".07"/><path d="M .8 -.9 L 1.3 -.9" stroke="${COL.wood2}" stroke-width=".1"/><circle cx="-.3" cy="-1.05" r=".12" fill="${COL.spud}"/><circle cx="0" cy="-1.08" r=".13" fill="${COL.spud}"/></g>`;
    case 'banner': return `${SHADOW(.5, .2)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.05" y="-3.8" width=".1" height="3.8" fill="${COL.wood2}"/><path d="M .05 -3.7 L 1.2 -3.5 L 1.0 -2.4 L .05 -2.6 Z" fill="${COL.rust}"/><circle cx=".55" cy="-3.05" r=".18" fill="${COL.spud}" stroke="none"/></g>`;
    case 'fire': return `<ellipse cx="0" cy="0" rx="1.0" ry=".36" fill="${COL.dark}" opacity=".35"/><path d="M -.55 0 L .55 -.06" stroke="${COL.wood2}" stroke-width=".16"/><path d="M -.2 0 Q -.4 -.8 0 -1.25 Q .12 -.8 .34 -.66 Q .44 -.24 0 0 Z" fill="${COL.amber}"/><path d="M -.1 -.04 Q -.14 -.6 .04 -.86 Q .2 -.44 .16 -.1 Z" fill="#ffd98a"/><circle cx="0" cy="-.6" r="1.4" fill="${COL.amber}" opacity=".08"/>`;
    case 'tent': return `${SHADOW(2.2, .3)}<g stroke="${OUT}" stroke-width=".04"><polygon points="${pts([[-1.3, 0], [0, -2.2], [1.3, 0]])}" fill="${COL.cloth}"/><polygon points="${pts([[0, -2.2], [1.3, 0], [.4, 0]])}" fill="${COL.cloth2}"/><polygon points="${pts([[-.34, 0], [0, -.9], [.34, 0]])}" fill="${COL.dark}"/><path d="M 0 -2.2 L 0 -2.8" stroke="${COL.wood2}" stroke-width=".05"/></g>`;
    case 'stash': return `${SHADOW(.9, .28)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.45" y="-.66" width=".9" height=".66" fill="${COL.wood}"/><path d="M -.45 -.66 Q 0 -1.0 .45 -.66 Z" fill="${COL.rust}"/><rect x="-.09" y="-.46" width=".18" height=".18" fill="${COL.amber}"/><circle cx=".3" cy="-.72" r=".12" fill="${COL.spud}"/></g>`;
    case 'anvil': return `${SHADOW(.9, .3)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.28" y="-.34" width=".56" height=".34" fill="${COL.steel2}"/><path d="M -.55 -.62 L .48 -.62 L .36 -.44 L -.36 -.44 Z" fill="${COL.steel}"/><path d="M .48 -.62 L .72 -.54 L .44 -.5 Z" fill="${COL.steel}"/></g>`;
    case 'plot': return `<g stroke="${OUT}" stroke-width=".03"><rect x="-1.1" y="-.62" width="2.2" height=".62" rx=".05" fill="${COL.soil}"/><path d="M -1.0 -.5 L 1.0 -.5 M -1.0 -.34 L 1.0 -.34 M -1.0 -.18 L 1.0 -.18" stroke="#4a3a28" stroke-width=".03"/><path d="M -.6 -.5 q -.06 -.24 .04 -.36 M 0 -.36 q .06 -.24 -.04 -.36 M .6 -.5 q -.06 -.24 .04 -.36" stroke="${COL.leaf}" stroke-width=".04" fill="none"/></g>`;
    case 'bench': return `${SHADOW(1.2, .26)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.8" y="-.5" width="1.6" height=".12" fill="${COL.wood}"/><rect x="-.68" y="-.38" width=".1" height=".38" fill="${COL.wood2}"/><rect x=".58" y="-.38" width=".1" height=".38" fill="${COL.wood2}"/><circle cx="-.3" cy="-.58" r=".1" fill="${COL.spud}" stroke="none"/></g>`;
    case 'glass': return `<g stroke="${OUT}" stroke-width=".02"><polygon points="${pts([[-.3, 0], [-.44, -.9], [-.12, -.24]])}" fill="${COL.glow}" opacity=".5"/><polygon points="${pts([[.1, 0], [.4, -1.1], [.5, 0]])}" fill="${COL.glow}" opacity=".35"/><polygon points="${pts([[-.02, 0], [.1, -.5], [.2, 0]])}" fill="#bff6ee" opacity=".3"/></g>`;
    case 'conduit': return `${SHADOW(.8, .24)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.45" y="-.62" width=".9" height=".62" fill="${COL.dark}"/><path d="M -.3 -.62 L -.3 -1.0 M 0 -.62 L 0 -1.1 M .3 -.62 L .3 -.96" stroke="${COL.steel2}" stroke-width=".07"/><circle cx="0" cy="-.82" r=".04" fill="${COL.glow}" stroke="none"/></g>`;
    case 'cable': return `${SHADOW(1.2, .18)}<g fill="none"><path d="M -.9 0 Q -.4 -1.0 .2 -.4 Q .7 -.1 1.0 0" stroke="${COL.dark}" stroke-width=".14"/><path d="M -.9 0 Q -.4 -1.0 .2 -.4" stroke="${COL.steel2}" stroke-width=".03"/></g>`;
    case 'scrap': return `${SHADOW(.8, .2)}<g stroke="${OUT}" stroke-width=".02"><polygon points="${pts([[-.45, 0], [-.3, -.28], [.14, -.36], [.44, -.1], [.26, 0]])}" fill="${COL.rust2}"/><polygon points="${pts([[-.3, -.28], [.14, -.36], [.04, -.14]])}" fill="${COL.rust}" stroke="none"/><rect x="-.1" y="-.52" width=".36" height=".06" fill="${COL.steel2}" transform="rotate(-18)"/><circle cx=".34" cy="-.22" r=".06" fill="${COL.steel}"/></g>`;
    case 'mast': return `${SHADOW(1.0, .24)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.08" y="-6.0" width=".16" height="6.0" fill="${COL.wood2}"/><rect x="-.9" y="-5.0" width="1.8" height=".12" fill="${COL.wood2}" transform="rotate(-8)"/><path d="M -.7 -4.8 Q -.4 -4.2 -.6 -3.6" stroke="${COL.cloth2}" stroke-width=".2" fill="none" opacity=".7"/></g>`;
    case 'glow': return `<circle cx="0" cy="-.4" r="1.0" fill="${COL.glow}" opacity=".1"/><g stroke="${OUT}" stroke-width=".02"><path d="M -.3 0 Q -.4 -.3 -.2 -.4 Q 0 -.46 .1 -.3 Q .2 -.1 0 0 Z" fill="${COL.spore}"/><path d="M .2 0 Q .16 -.2 .3 -.3 Q .46 -.24 .4 -.06 Q .36 0 .2 0 Z" fill="${shade(COL.spore, .18)}"/><circle cx="-.2" cy="-.4" r=".12" fill="${COL.glow}" opacity=".8" stroke="none"/></g>`;
    // ---- potato set ----
    case 'potato_plant': return `${SHADOW(.8, .22)}
      <g stroke="${OUT}" stroke-width=".03" stroke-linejoin="round">
        <path d="M 0 0 Q -.1 -.3 .02 -.5" stroke="${COL.leaf2}" stroke-width=".05" fill="none"/>
        <polygon points="${pts([[-.34, -.3], [-.12, -.62], [.06, -.34], [-.16, -.18]])}" fill="${COL.leaf}"/>
        <polygon points="${pts([[.02, -.36], [.3, -.68], [.4, -.36], [.16, -.22]])}" fill="${shade(COL.leaf, .18)}"/>
        <polygon points="${pts([[-.18, -.5], [.06, -.8], [.22, -.5], [0, -.38]])}" fill="${COL.leaf2}"/>
        <circle cx=".04" cy="-.72" r=".06" fill="#f2e9d0" stroke="none"/>
        <circle cx="-.2" cy="-.56" r=".05" fill="#f2e9d0" stroke="none"/>
        <ellipse cx="-.2" cy="-.02" rx=".12" ry=".08" fill="${COL.spud}" stroke="none"/>
        <ellipse cx=".18" cy="-.01" rx=".1" ry=".07" fill="${COL.spud2}" stroke="none"/>
      </g>`;
    case 'potato_pile': return `${SHADOW(.8, .24)}
      <g stroke="${OUT}" stroke-width=".025">
        <ellipse cx="-.2" cy="-.1" rx=".24" ry=".17" fill="${COL.spud}"/>
        <ellipse cx=".18" cy="-.12" rx=".26" ry=".18" fill="${COL.spud2}"/>
        <ellipse cx="0" cy="-.24" rx=".26" ry=".18" fill="${COL.spud}"/>
        <ellipse cx="-.02" cy="-.26" rx=".1" ry=".06" fill="#e0bd82" stroke="none"/>
        <circle cx="-.26" cy="-.14" r=".025" fill="${COL.spud2}" stroke="none"/>
        <circle cx=".14" cy="-.3" r=".025" fill="${COL.spud2}" stroke="none"/>
      </g>`;
    case 'potato_sack': return `${SHADOW(.9, .26)}
      <g stroke="${OUT}" stroke-width=".03" stroke-linejoin="round">
        <path d="M -.34 0 L -.4 -.5 Q -.44 -.72 -.24 -.8 L .24 -.8 Q .44 -.72 .4 -.5 L .34 0 Z" fill="#b09a6a"/>
        <path d="M -.3 -.8 Q -.1 -.96 .12 -.84 L .2 -.78 L -.2 -.78 Z" fill="#8f7a50"/>
        <ellipse cx="-.1" cy="-.28" rx=".16" ry=".12" fill="${COL.spud}" stroke="none"/>
        <ellipse cx=".14" cy="-.2" rx=".14" ry=".1" fill="${COL.spud2}" stroke="none"/>
      </g>`;
    case 'scarecrow': return `${SHADOW(1.0, .26)}
      <g stroke="${OUT}" stroke-width=".04" stroke-linejoin="round">
        <!-- a pole that sticks up past the head is the clearest "this is not a person" cue -->
        <rect x="-.055" y="-3.1" width=".11" height="3.1" fill="${COL.wood2}"/>
        <rect x="-.85" y="-1.98" width="1.7" height=".09" fill="${COL.wood2}"/>
        <path d="M -.3 -1.9 L .3 -1.9 L .38 -1.12 L .16 -1.2 L .1 -.9 L -.1 -.9 L -.16 -1.2 L -.38 -1.12 Z" fill="${COL.cloth2}"/>
        <path d="M -.3 -1.9 L 0 -1.9 L 0 -.9 L -.1 -.9 L -.16 -1.2 L -.38 -1.12 Z" fill="${shade(COL.cloth2, .16)}" stroke="none"/>
        <path d="M -.85 -1.94 L -.98 -1.7 M -.85 -1.94 L -.96 -2.1 M .85 -1.94 L .98 -1.72 M .85 -1.94 L .95 -2.08" stroke="#c9a85e" stroke-width=".06" stroke-linecap="round"/>
        <path d="M -.24 -1.7 L -.36 -1.52 M -.36 -1.7 L -.24 -1.52 M .24 -1.7 L .36 -1.52 M .36 -1.7 L .24 -1.52" stroke="#c9a85e" stroke-width=".05" stroke-linecap="round"/>
        <ellipse cx="0" cy="-2.22" rx=".21" ry=".24" fill="#c9b58a"/>
        <path d="M -.11 -2.27 l .08 .09 M -.03 -2.18 l -.08 .09 M .03 -2.27 l .08 .09 M .11 -2.18 l -.08 .09" stroke="${COL.dark}" stroke-width=".035"/>
        <path d="M -.06 -2.08 q .06 .06 .12 0" stroke="${COL.dark}" stroke-width=".025" fill="none"/>
        <path d="M -.09 -2.46 L .09 -2.46 L .06 -2.6 L -.06 -2.6 Z" fill="#8f7a50"/>
        <path d="M 0 -3.1 L .34 -3.02 L .3 -2.86 L 0 -2.92 Z" fill="${COL.rust}" stroke-width=".03"/>
        <ellipse cx="0" cy="-1.98" rx=".08" ry=".055" fill="${COL.spud}" stroke="none"/>
      </g>`;
    case 'potato_crate': return `${SHADOW(.8, .26)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.42" y="-.5" width=".84" height=".5" fill="${COL.wood}"/><rect x="-.42" y="-.5" width=".84" height=".1" fill="${shade(COL.wood, .2)}"/><ellipse cx="-.16" cy="-.56" rx=".14" ry=".1" fill="${COL.spud}"/><ellipse cx=".16" cy="-.58" rx=".15" ry=".11" fill="${COL.spud2}"/><ellipse cx="0" cy="-.64" rx=".13" ry=".09" fill="${COL.spud}"/></g>`;
    default: return `${SHADOW(.7, .22)}<ellipse cx="0" cy="-.24" rx=".3" ry=".24" fill="${COL.steel2}" stroke="${OUT}" stroke-width=".03"/>`;
  }
}

// ---------------------------------------------------------------- creatures
const CREATURES = {
  gull: () => bird({ body: COL.white, wing: COL.steel }),
  heron: () => `${SHADOW(.6, .18)}<g stroke="${OUT}" stroke-width=".02" stroke-linejoin="round"><path d="M -.02 0 l .02 -.9 M .08 0 l .02 -.9" stroke="${COL.amber}" stroke-width=".03"/><ellipse cx="0" cy="-1.05" rx=".24" ry=".17" fill="${COL.white}"/><path d="M -.02 -1.1 q -.2 -.42 .08 -.6 q .14 .26 .02 .54" stroke="${COL.white}" stroke-width=".08" fill="none"/><circle cx=".1" cy="-1.62" r=".08" fill="${COL.white}"/><path d="M .17 -1.62 l .24 .03 l -.24 .05 z" fill="${COL.amber}"/><path d="M -.18 -1.0 l -.26 .12" stroke="${COL.steel}" stroke-width=".05"/></g>`,
  crab: () => crab({}),
  crab_big: () => crab({ shell: '#8f4f3a', scale: 1.5, spikes: true }),
  rat: () => quadruped({ body: '#6b5a4a', dark: '#4a3e33', len: .8, legs: .16, bodyH: .24, eyes: COL.blood }),
  scav: () => biped({ cloth: '#4a4a42', cloth2: '#2f2f2a', hood: true, weapon: 'blade', wide: .95, eyes: COL.amber }),
  slime: () => blob({ body: '#4f8f6a', bubbles: true }),
  eel: () => `${SHADOW(1.2, .18)}<g fill="none"><path d="M -.7 0 Q -.3 -.5 .1 -.26 Q .5 -.04 .78 -.18" stroke="#3d6b52" stroke-width=".16"/><path d="M -.7 0 Q -.3 -.5 .1 -.26" stroke="#5d8f72" stroke-width=".05"/><circle cx=".8" cy="-.2" r=".08" fill="#2f5742" stroke="${OUT}" stroke-width=".02"/><circle cx=".83" cy="-.22" r=".02" fill="${COL.amber}" stroke="none"/></g>`,
  wraith: () => ghost({ body: '#9fc4cc', eyes: '#e6f7ff' }),
  hound: () => quadruped({ body: COL.rust, dark: COL.rust2, eyes: COL.blood, spikes: true, len: 1.35, legs: .5 }),
  drone: () => flyer({ body: COL.steel2, wing: COL.steel, glow: COL.glow, lights: true }),
  crawler: () => `${SHADOW(1.0, .22)}<g stroke="${OUT}" stroke-width=".03"><path d="M -.5 0 l .1 -.26 l .2 .2 l .14 -.26 l .18 .22 l .14 -.22" stroke="${COL.rust}" stroke-width=".09" fill="none"/><ellipse cx="0" cy="-.4" rx=".4" ry=".2" fill="${COL.steel2}"/><circle cx="0" cy="-.5" r=".08" fill="${COL.glow}" stroke="none"/><path d="M -.26 -.4 l -.2 -.26 M .26 -.4 l .2 -.28" stroke="${COL.steel2}" stroke-width=".05"/></g>`,
  golem: () => construct({ metal: COL.rust2, hi: COL.rust, h: 1.7, w: 1.35, glow: COL.amber, cannon: true }),
  boar: () => quadruped({ body: '#6b5540', dark: '#4a3a2b', legs: .3, bodyH: .5, len: 1.4, cap: true, eyes: COL.amber, horns: true }),
  wolf: () => quadruped({ body: '#7f8a8f', dark: '#58636a', legs: .34, len: 1.4, cap: true, eyes: COL.glow }),
  shambler: () => `${SHADOW(1.6, .28)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.3" y="-1.1" width=".2" height="1.1" fill="#4a5a3f"/><rect x=".12" y="-1.1" width=".2" height="1.1" fill="#3d4a34"/><ellipse cx="0" cy="-1.34" rx=".55" ry=".38" fill="#5d7a4a"/><ellipse cx="0" cy="-1.5" rx=".7" ry=".24" fill="${COL.spore}"/><circle cx="-.2" cy="-1.62" r=".05" fill="#d9c4ff" stroke="none"/><circle cx=".2" cy="-1.62" r=".05" fill="#d9c4ff" stroke="none"/><path d="M -.5 -1.3 l -.3 -.24 M .5 -1.3 l .3 -.2" stroke="#4a5a3f" stroke-width=".08"/><circle cx=".4" cy="-1.1" r=".12" fill="${COL.spud}" stroke="none"/></g>`,
  moth: () => flyer({ body: '#c9b6e8', wing: '#9f7fd0', glow: '#e8dcff', t: .9 }),
  jackal: () => quadruped({ body: '#a86a3a', dark: '#7a4a26', legs: .32, len: 1.2, eyes: COL.amber, spikes: true }),
  nomad: () => biped({ cloth: '#6b6357', cloth2: '#4a443b', hood: true, weapon: 'staff', eyes: COL.amber }),
  stalker: () => `${ghost({ body: '#cfd8d2', eyes: COL.blood })}<path d="M -.2 -1.0 l -.34 -.55 M .2 -1.0 l .34 -.55" stroke="#cfd8d2" stroke-width=".05" opacity=".6"/>`,
  wisp: () => flyer({ body: '#e8a33d', wing: '#ffd27a', glow: '#fff0b0', t: .7, lights: true }),
  mite: () => `${SHADOW(.45, .18)}<g stroke="${OUT}" stroke-width=".02"><ellipse cx="0" cy="-.2" rx=".2" ry=".14" fill="${COL.steel2}"/><path d="M -.18 -.2 l -.16 -.1 M .18 -.2 l .16 -.1 M -.14 -.26 l -.12 -.18 M .14 -.26 l .12 -.18" stroke="${COL.steel2}" stroke-width=".03"/><circle cx="0" cy="-.26" r=".04" fill="${COL.glow}" stroke="none"/></g>`,
  sentinel: () => construct({ metal: COL.steel2, hi: COL.steel, h: 1.7, w: 1.3, glow: COL.blood, cannon: true }),
  process: () => ghost({ body: '#6a8fa0', eyes: '#c8f0ff' }),
  cable: () => `${SHADOW(1.5, .26)}<g stroke="${OUT}" stroke-width=".03"><ellipse cx="0" cy="-.6" rx=".42" ry=".5" fill="${COL.dark}"/><circle cx="-.14" cy="-.78" r=".06" fill="${COL.blood}" stroke="none"/><circle cx=".14" cy="-.78" r=".06" fill="${COL.blood}" stroke="none"/><path d="M -.34 -.36 Q -.7 0 -.46 .24 M .12 -.24 Q .24 .34 .6 .22 M 0 -.12 Q -.22 .46 .12 .56 M .34 -.36 Q .7 .12 .82 -.12" stroke="${COL.steel2}" stroke-width=".07" fill="none"/></g>`,
  warden: () => construct({ metal: '#3f4a55', hi: '#6a7a86', h: 2.0, w: 1.5, glow: COL.glow, cannon: true }),
  shade: () => ghost({ body: '#7fd6ff', eyes: '#ffffff' }),
  relay: () => `${prop('pylon')}${construct({ metal: '#3f4a55', hi: COL.steel, h: 1.2, w: 1.0, glow: COL.glow })}`,
  horror: () => `${SHADOW(1.8, .32)}<g stroke="${OUT}" stroke-width=".03"><path d="M -.6 0 Q -.84 -.9 -.24 -1.4 Q .36 -1.6 .66 -.9 Q .96 -.24 .6 0 Z" fill="#241a33"/><circle cx="-.18" cy="-.94" r=".09" fill="${COL.violet}" stroke="none"/><circle cx=".24" cy="-1.0" r=".09" fill="${COL.violet}" stroke="none"/><path d="M -.24 -.6 Q 0 -.34 .3 -.6" stroke="${COL.violet}" stroke-width=".05" fill="none"/><circle cx=".5" cy="-.4" r=".12" fill="${COL.spud}" stroke="none"/></g>`,
  turret: () => `${SHADOW(.7, .22)}<g stroke="${OUT}" stroke-width=".03"><path d="M -.3 0 L 0 -.4 L .3 0" stroke="${COL.steel2}" stroke-width=".05" fill="none"/><rect x="-.18" y="-.62" width=".36" height=".24" fill="${COL.steel2}"/><rect x="0" y="-.56" width=".6" height=".08" fill="${COL.dark}"/><circle cx="0" cy="-.5" r=".05" fill="${COL.amber}" stroke="none"/></g>`,
};

const NPC_LOOK = {
  npc_marrow: { cloth: '#5a5040', cloth2: '#3d362c', weapon: 'staff', hood: true, beard: true, eyes: '#d8cfa8', spud: true },
  npc_tally: { cloth: '#3f4a50', cloth2: '#2a3338', weapon: 'blade', hood: true, eyes: '#9fd8d0' },
  npc_copper: { cloth: '#6b4a34', cloth2: '#4a3222', weapon: 'gun', pack: true, apron: true, eyes: COL.amber },
  npc_ivy: { cloth: '#4a6040', cloth2: '#33452c', weapon: 'staff', hood: true, hat: 'straw', eyes: '#c8e8a0' },
  npc_archivist: { cloth: '#3a4560', cloth2: '#28324a', weapon: 'staff', eyes: '#b0c8ff', beard: true },
  npc_vendor: { cloth: '#6b5a2a', cloth2: '#4a3f1e', weapon: 'none', pack: true, eyes: COL.amber, spud: true },
  npc_trainer: { cloth: '#5a3a3a', cloth2: '#3f2828', weapon: 'blade', shield: true, eyes: COL.amber },
};

const PLAYER_LOOK = {
  warden: { cloth: '#5a4a3a', cloth2: '#3d3228', weapon: 'blade', shield: true, wide: 1.1, spud: true },
  drifter: { cloth: '#3f4a50', cloth2: '#2a3338', weapon: 'blade', hood: true, spud: true },
  technosavant: { cloth: '#3a4560', cloth2: '#28324a', weapon: 'staff', glowColor: COL.glow, eyes: COL.glow },
  shaman: { cloth: '#4a6040', cloth2: '#33452c', weapon: 'staff', glowColor: '#c8e8a0', spud: true },
  tinker: { cloth: '#5a5030', cloth2: '#3d3620', weapon: 'gun', pack: true, eyes: COL.amber, spud: true },
};

export const CREATURE_KEYS = Object.keys(CREATURES);

// How tall each sprite actually stands, in metres above its feet. Health bars
// and name plates hang from this instead of a guessed constant, so a bar sits
// on the creature rather than floating in the air above it.
const TOPS = {
  gull: 0.75, heron: 1.8, crab: 0.6, crab_big: 1.05, rat: 0.5, scav: 1.9, slime: 0.7,
  eel: 0.55, wraith: 1.25, hound: 1.0, drone: 1.15, crawler: 0.75, golem: 3.0, boar: 1.15,
  wolf: 1.0, shambler: 1.9, moth: 1.05, jackal: 1.0, nomad: 1.9, stalker: 1.25, wisp: 1.0,
  mite: 0.5, sentinel: 3.0, process: 1.25, cable: 1.0, warden: 3.4, shade: 1.25, relay: 3.6,
  horror: 1.9, turret: 0.7, player: 1.85, npc: 1.9, pet: 0.8, loot: 0.6,
};
export function spriteTop(key) { return TOPS[key] ?? 1.6; }
export const PROP_KEYS = [
  'rock', 'stone', 'driftwood', 'wreck', 'hull', 'tree', 'mushroom', 'fern', 'log', 'stump',
  'puddle', 'pool', 'shell', 'kelp', 'grass', 'bone', 'ashpile', 'crate', 'pipe', 'tower',
  'pylon', 'server', 'building', 'spire', 'monolith', 'well', 'lamp', 'cart', 'banner', 'fire',
  'tent', 'stash', 'anvil', 'plot', 'bench', 'glass', 'conduit', 'cable', 'scrap', 'mast', 'glow',
  'potato_plant', 'potato_pile', 'potato_sack', 'scarecrow', 'potato_crate',
];
export const NPC_KEYS = Object.keys(NPC_LOOK);
export const PLAYER_ROLES = Object.keys(PLAYER_LOOK);

export function spriteSVG(key, opts = {}) {
  const size = opts.size ?? 1;
  const body = (() => {
    if (key === 'player') return biped(PLAYER_LOOK[opts.role] ?? PLAYER_LOOK.warden);
    if (key === 'npc') return biped(NPC_LOOK[opts.look] ?? NPC_LOOK.npc_marrow);
    if (CREATURES[key]) return CREATURES[key]();
    if (key === 'loot') return lootSprite(opts);
    if (key === 'pet') return CREATURES[opts.species]?.() ?? CREATURES.rat();
    if (key.startsWith('npc_')) return biped(NPC_LOOK[key] ?? {});
    return prop(key, opts);
  })();
  return `<g transform="scale(${size})">${body}</g>`;
}

export function lootSprite(opts = {}) {
  const rar = opts.rarity ?? 'common';
  const col = { common: '#c9d6da', magic: '#5aa9ff', rare: '#d8c14a', unique: '#e0892a', legendary: '#ff7a2a' }[rar] ?? '#c9d6da';
  const icon = opts.icon ?? '◆';
  return `<ellipse cx="0" cy="0" rx=".42" ry=".16" fill="${col}" opacity=".16"/>
    <circle cx="0" cy="-.2" r=".28" fill="${col}" opacity=".1"/>
    <text x="0" y="-.12" font-size=".5" text-anchor="middle" fill="${col}" font-family="monospace">${icon}</text>`;
}

export function poiSprite(kind, opts = {}) {
  if (kind === 'waystone') {
    return `${SHADOW(1.2, .3)}<g stroke="${OUT}" stroke-width=".04"><polygon points="${pts([[-.45, 0], [-.32, -2.3], [.32, -2.3], [.45, 0]])}" fill="#3a4a4e"/><polygon points="${pts([[-.32, -2.3], [.32, -2.3], [.2, -2.14], [-.2, -2.14]])}" fill="${COL.glow}" stroke="none"/><circle cx="0" cy="-1.2" r=".14" fill="${COL.glow}" stroke="none"/><circle cx="0" cy="-1.2" r=".5" fill="${COL.glow}" opacity=".13" stroke="none"/></g>`;
  }
  if (kind === 'rift') {
    return `<ellipse cx="0" cy="-.7" rx="1.0" ry="1.5" fill="#2a1f44" opacity=".9" stroke="${OUT}" stroke-width=".04"/><ellipse cx="0" cy="-.7" rx=".68" ry="1.16" fill="${COL.violet}" opacity=".55"/><ellipse cx="0" cy="-.7" rx=".3" ry=".8" fill="#0a0612"/>`;
  }
  if (kind === 'gate') {
    return `${SHADOW(1.2, .25)}<g stroke="${OUT}" stroke-width=".05" fill="none"><path d="M -.9 0 L -.9 -2.2 Q 0 -3.0 .9 -2.2 L .9 0" stroke="${COL.steel2}"/><path d="M -.9 -2.2 Q 0 -3.0 .9 -2.2" stroke="${COL.amber}" stroke-width=".06"/><path d="M -.7 -2.1 L -.7 -1.4 M .7 -2.1 L .7 -1.4" stroke="${COL.wood2}" stroke-width=".12"/></g>`;
  }
  if (kind === 'boss') {
    return `<ellipse cx="0" cy="0" rx="2.2" ry=".8" fill="${COL.blood}" opacity=".1"/><path d="M -1.1 0 L -.7 -1.4 L 0 -1.0 L .7 -1.4 L 1.1 0" stroke="${COL.blood}" stroke-width=".09" fill="none" opacity=".6"/>`;
  }
  if (kind === 'cache') {
    return `${SHADOW(.9, .26)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.5" y="-.62" width="1.0" height=".62" fill="#4a5a60"/><rect x="-.5" y="-.62" width="1.0" height=".12" fill="${COL.glow}" opacity=".55"/><circle cx="0" cy="-.34" r=".08" fill="${COL.amber}" stroke="none"/></g>`;
  }
  if (kind === 'camp') {
    return `${SHADOW(1.6, .26)}<g stroke="${OUT}" stroke-width=".03"><path d="M -.7 0 L .7 0" stroke="${COL.wood2}" stroke-width=".14"/><path d="M 0 0 Q -.2 -.5 0 -.9 Q .2 -.5 .1 0" fill="${COL.amber}"/><rect x="1.0" y="-2.4" width=".08" height="2.4" fill="${COL.wood2}"/><path d="M 1.08 -2.4 L 1.8 -2.3 L 1.7 -1.7 L 1.08 -1.8 Z" fill="${COL.rust}"/></g>`;
  }
  if (kind === 'ruin') {
    return `${SHADOW(2.0, .24)}<g stroke="${OUT}" stroke-width=".04"><rect x="-1.5" y="-2.6" width=".5" height="2.6" fill="#555b60"/><rect x="1.0" y="-1.8" width=".5" height="1.8" fill="#555b60"/><path d="M -1.5 -2.6 L .2 -2.9 L .2 -2.2 L -1.5 -2.0 Z" fill="#6a7076"/></g>`;
  }
  if (kind === 'farm') {
    return `<g stroke="${COL.leaf}" stroke-width=".04"><path d="M -1.4 0 L -1.4 -.5 M -.7 0 L -.7 -.5 M 0 0 L 0 -.5 M .7 0 L .7 -.5 M 1.4 0 L 1.4 -.5"/></g>`;
  }
  if (kind === 'board') {
    return `${SHADOW(.8, .24)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.06" y="-1.8" width=".12" height="1.8" fill="${COL.wood2}"/><rect x="-.7" y="-2.4" width="1.4" height=".9" fill="${COL.wood}"/><path d="M -.5 -2.2 h .8 M -.5 -2.0 h .6" stroke="${COL.bone}" stroke-width=".04"/></g>`;
  }
  if (kind === 'vendor') {
    return `${SHADOW(1.4, .24)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.9" y="-.9" width="1.8" height=".9" fill="${COL.wood}"/><path d="M -1.1 -1.4 L 1.1 -1.4 L 1.0 -.9 L -1.0 -.9 Z" fill="${COL.rust}"/><circle cx="-.3" cy="-.98" r=".12" fill="${COL.spud}"/><circle cx=".2" cy="-.98" r=".1" fill="${COL.spud2}"/></g>`;
  }
  if (kind === 'trainer') {
    return `${SHADOW(.8, .24)}<g stroke="${OUT}" stroke-width=".03"><rect x="-.06" y="-1.6" width=".12" height="1.6" fill="${COL.wood2}"/><rect x="-.4" y="-1.4" width=".8" height=".1" fill="${COL.wood2}"/><circle cx="0" cy="-1.7" r=".2" fill="#c9b58a"/></g>`;
  }
  return '';
}

export { SHADOW, COL, biped };
