// Shared SVG glyphs, helpers and small content banks for the game packs.
// Everything here is deterministic (no random ids), so generated trials can be compared in tests.

export const COLORS = [['red', '#ff5a5f'], ['blue', '#4d94ff'], ['green', '#2fd38a'], ['yellow', '#ffd84a'], ['purple', '#b57bff'], ['orange', '#ff9f1c'], ['pink', '#ff7ac6'], ['teal', '#2ee6d6']];
export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'heart', 'cross'];
export const PATTERNS = ['solid', 'stripes', 'dots', 'outline'];
const SP = {
  circle: '<circle cx="50" cy="50" r="38"/>', square: '<rect x="14" y="14" width="72" height="72" rx="10"/>', triangle: '<path d="M50 10 90 84H10z"/>',
  diamond: '<path d="M50 6 92 50 50 94 8 50z"/>', star: '<path d="M50 6l12 30 32 2-25 20 9 32-28-18-28 18 9-32L6 38l32-2z"/>',
  hexagon: '<path d="M28 10h44l22 40-22 40H28L6 50z"/>', heart: '<path d="M50 88S8 60 8 34a20 20 0 0 1 42-10 20 20 0 0 1 42 10c0 26-42 54-42 54z"/>',
  cross: '<path d="M36 8h28v28h28v28H64v28H36V64H8V36h28z"/>',
};
const col = (c) => (c && c[0] === '#' ? c : (COLORS.find((x) => x[0] === c) || COLORS[1])[1]);
const hexAdj = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); };
const colorName = (c) => (c && c[0] === '#' ? (COLORS.find((x) => x[1] === c) || [null])[0] : c);
/** Gem-style shape. If real sprite art has been added (assets/sprites/gem-<shape>-<colour>.webp, listed in the art manifest), that image is used instead. */
export function glyph({ shape = 'circle', color = 'blue', pattern = 'solid', rot = 0, scale = 1, cls = '' } = {}) {
  const c = col(color), cn = colorName(color);
  if (pattern === 'solid' && cn && globalThis.__SPRITES && globalThis.__SPRITES.has(`${shape}-${cn}`)) return `<img class="gl spr ${cls}" src="assets/sprites/gem-${shape}-${cn}.webp" alt="" draggable="false" style="transform:rotate(${rot}deg) scale(${scale})">`;
  const id = `pt-${pattern}-${c.slice(1)}`, gid = `gg-${c.slice(1)}`, cid = `cp-${shape}`;
  const grad = `<radialGradient id="${gid}" cx="34%" cy="26%" r="85%"><stop offset="0" stop-color="${hexAdj(c, 0.55)}"/><stop offset=".42" stop-color="${c}"/><stop offset="1" stop-color="${hexAdj(c, -0.45)}"/></radialGradient>`;
  const defs = grad + `<clipPath id="${cid}">${SP[shape]}</clipPath>` + (pattern === 'stripes' ? `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${c}" opacity=".3"/><rect width="6" height="12" fill="url(#${gid})"/></pattern>`
    : pattern === 'dots' ? `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${c}" opacity=".3"/><circle cx="7" cy="7" r="4.4" fill="${hexAdj(c, 0.15)}"/></pattern>` : '');
  const fill = pattern === 'solid' ? `url(#${gid})` : pattern === 'outline' ? 'none' : `url(#${id})`, stroke = pattern === 'outline' ? c : hexAdj(c, 0.6), sw = pattern === 'outline' ? 8 : 2.5;
  const gloss = pattern === 'outline' ? '' : `<g clip-path="url(#${cid})"><ellipse cx="36" cy="26" rx="34" ry="16" fill="#fff" opacity=".32" transform="rotate(-18 36 26)"/><path d="M8 78 Q50 96 92 78 L92 100 L8 100z" fill="#000" opacity=".18"/></g>`;
  return `<svg viewBox="0 0 100 100" class="gl gem ${cls}"><defs>${defs}</defs><g transform="translate(50 50) rotate(${rot}) scale(${scale}) translate(-50 -50)"><g fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">${SP[shape]}</g>${gloss}</g></svg>`;
}
export const tok = (label, hue = 260, cls = '') => `<span class="tok ${cls}" style="--th:${hue}">${label}</span>`;
export const card = (title, body = '', hue = 260) => `<span class="mcard" style="--th:${hue}"><b>${title}</b>${body ? `<small>${body}</small>` : ''}</span>`;
export const arrow = (deg, color = '#fff', size = 1) => `<svg viewBox="0 0 100 100" class="gl"><g transform="rotate(${deg} 50 50) translate(50 50) scale(${size}) translate(-50 -50)"><path d="M14 50h54M50 26l26 24-26 24" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
export const dots = (pts, r = 6, color = '#ffd84a') => `<svg viewBox="0 0 100 100" class="gl">${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`).join('')}</svg>`;
export function pie(n, d, color = '#4d94ff') {
  if (d === 1) return `<svg viewBox="0 0 100 100" class="gl"><circle cx="50" cy="50" r="42" fill="${color}"/></svg>`;
  let s = '';
  for (let i = 0; i < d; i++) {
    const a0 = (i / d) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2, f = (v) => v.toFixed(2);
    s += `<path d="M50 50L${f(50 + 42 * Math.cos(a0))} ${f(50 + 42 * Math.sin(a0))}A42 42 0 0 1 ${f(50 + 42 * Math.cos(a1))} ${f(50 + 42 * Math.sin(a1))}z" fill="${i < n ? color : 'rgba(255,255,255,.08)'}" stroke="rgba(255,255,255,.6)" stroke-width="2"/>`;
  }
  return `<svg viewBox="0 0 100 100" class="gl">${s}</svg>`;
}
export function barRect(n, d, color = '#2fd38a') { let s = ''; const w = 90 / d; for (let i = 0; i < d; i++) s += `<rect x="${5 + i * w}" y="30" width="${w}" height="40" fill="${i < n ? color : 'rgba(255,255,255,.08)'}" stroke="rgba(255,255,255,.6)" stroke-width="2"/>`; return `<svg viewBox="0 0 100 100" class="gl">${s}</svg>`; }
/** cells: array of {fill?, html?, label?, stroke?}; draws an n-column grid as SVG. */
export function gridSVG(cells, cols, { gap = 4, size = 100, round = 8, labels = false } = {}) {
  const rows = Math.ceil(cells.length / cols), cw = (size - gap * (cols + 1)) / cols, H = gap + rows * (cw + gap);
  return `<svg viewBox="0 0 ${size} ${H}" class="gl grid">${cells.map((c, i) => { const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (cw + gap);
    return `<rect x="${x}" y="${y}" width="${cw}" height="${cw}" rx="${round}" fill="${c.fill || 'rgba(255,255,255,.07)'}" stroke="${c.stroke || 'rgba(255,255,255,.18)'}" stroke-width="1.5"/>${c.label != null ? `<text x="${x + cw / 2}" y="${y + cw / 2 + cw * 0.17}" text-anchor="middle" font-size="${cw * 0.48}" font-weight="800" fill="${c.ink || '#fff'}">${c.label}</text>` : ''}${labels ? `<text x="${x + 3}" y="${y + 9}" font-size="7" fill="rgba(255,255,255,.5)">${i + 1}</text>` : ''}`; }).join('')}</svg>`;
}
export function barChart(vals, labels, { color = '#4d94ff', unit = '' } = {}) {
  const mx = Math.max(...vals) * 1.15, W = 300, H = 170, bw = (W - 40) / vals.length;
  let s = `<line x1="30" y1="140" x2="${W - 5}" y2="140" stroke="rgba(255,255,255,.4)"/>`;
  for (let k = 0; k <= 4; k++) { const v = Math.round((mx * k) / 4), y = 140 - (120 * k) / 4; s += `<text x="26" y="${y + 3}" text-anchor="end" font-size="9" fill="rgba(255,255,255,.55)">${v}</text><line x1="30" y1="${y}" x2="${W - 5}" y2="${y}" stroke="rgba(255,255,255,.07)"/>`; }
  vals.forEach((v, i) => { const hgt = (120 * v) / mx, x = 34 + i * bw; s += `<rect x="${x + bw * 0.15}" y="${140 - hgt}" width="${bw * 0.7}" height="${hgt}" rx="4" fill="${color}"/><text x="${x + bw / 2}" y="${136 - hgt}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${v}${unit}</text><text x="${x + bw / 2}" y="156" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.75)">${labels[i]}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" class="gl chart">${s}</svg>`;
}
const ICON = {
  sun: '<circle cx="50" cy="50" r="20" fill="#ffd84a"/><g stroke="#ffd84a" stroke-width="7" stroke-linecap="round"><path d="M50 10v12M50 78v12M10 50h12M78 50h12M22 22l9 9M69 69l9 9M78 22l-9 9M31 69l-9 9"/></g>',
  moon: '<path d="M64 14a36 36 0 1 0 22 54A30 30 0 0 1 64 14z" fill="#e9e3ff"/>',
  tree: '<rect x="44" y="60" width="12" height="30" fill="#8d6e63"/><circle cx="50" cy="42" r="28" fill="#2fd38a"/>',
  house: '<path d="M14 48 50 16l36 32v40H14z" fill="#ff9f1c"/><rect x="42" y="62" width="16" height="26" fill="#5d3a1a"/>',
  fish: '<path d="M14 50c18-24 46-24 62 0-16 24-44 24-62 0z" fill="#4d94ff"/><path d="M76 50l16-14v28z" fill="#4d94ff"/><circle cx="34" cy="46" r="4" fill="#fff"/>',
  key: '<circle cx="30" cy="50" r="16" fill="none" stroke="#ffd84a" stroke-width="9"/><path d="M46 50h40M74 50v14M86 50v10" stroke="#ffd84a" stroke-width="9" stroke-linecap="round"/>',
  cup: '<path d="M20 30h48v30a24 24 0 0 1-48 0z" fill="#ff7ac6"/><path d="M68 38h8a10 10 0 0 1 0 20h-8" fill="none" stroke="#ff7ac6" stroke-width="7"/>',
  bell: '<path d="M50 14a26 26 0 0 0-26 26v20l-8 12h68l-8-12V40a26 26 0 0 0-26-26z" fill="#ffd84a"/><circle cx="50" cy="82" r="7" fill="#ffd84a"/>',
  leaf: '<path d="M20 80C20 34 50 16 86 14 84 52 64 82 20 80z" fill="#2fd38a"/><path d="M20 80 66 34" stroke="#0a5" stroke-width="4"/>',
  umbrella: '<path d="M10 50a40 32 0 0 1 80 0z" fill="#b57bff"/><path d="M50 50v30a8 8 0 0 1-16 0" fill="none" stroke="#ddd" stroke-width="6" stroke-linecap="round"/>',
  boat: '<path d="M12 62h76L74 84H26z" fill="#ff9f1c"/><path d="M50 14v44H22z" fill="#fff"/><path d="M54 22v36h24z" fill="#4d94ff"/>',
  cloud: '<path d="M28 74a18 18 0 0 1 0-36 24 24 0 0 1 46 6 15 15 0 0 1-2 30z" fill="#dfe7ff"/>',
  flower: '<g fill="#ff7ac6"><circle cx="50" cy="30" r="14"/><circle cx="70" cy="50" r="14"/><circle cx="50" cy="70" r="14"/><circle cx="30" cy="50" r="14"/></g><circle cx="50" cy="50" r="10" fill="#ffd84a"/>',
  car: '<path d="M14 60l10-22h52l10 22v16H14z" fill="#ff5a5f"/><circle cx="30" cy="78" r="9" fill="#222"/><circle cx="70" cy="78" r="9" fill="#222"/>',
};
export const ICONS = Object.keys(ICON);
export const icon = (n) => `<svg viewBox="0 0 100 100" class="gl icon">${ICON[n]}</svg>`;

// ---------- helpers ----------
/** Options = correct + distinct distractors, shuffled. Each option {label|html, value}. */
export function mc(rng, correct, distractors, n = 4) {
  const seen = new Set([JSON.stringify(correct.value)]), out = [correct];
  for (const d of rng.shuffle(distractors)) { const k = JSON.stringify(d.value); if (out.length >= n) break; if (!seen.has(k)) { seen.add(k); out.push(d); } }
  return rng.shuffle(out);
}
export function numOpts(rng, ans, n = 4, spread = 3, fmt = (x) => String(x)) {
  const set = new Set([ans]); let guard = 0;
  while (set.size < n && guard++ < 200) { const d = ans + (rng.chance(0.5) ? 1 : -1) * rng.int(1, Math.max(1, spread)); if (d >= 0 || ans < 0) set.add(d); }
  for (let k = 1; set.size < n; k++) set.add(ans + k);
  return rng.shuffle([...set]).map((v) => ({ label: fmt(v), value: v }));
}
export const yesNo = (yesLabel = 'Yes', noLabel = 'No') => [{ label: yesLabel, value: true, cls: 'yes' }, { label: noLabel, value: false, cls: 'no' }];
export const toneFor = (i) => [261.63, 311.13, 349.23, 392.0, 466.16, 523.25, 622.25, 698.46, 783.99, 932.33][i % 10];
export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const sum = (a) => a.reduce((x, y) => x + y, 0);
export const range = (n) => [...Array(n).keys()];
export function permutations(a) { if (a.length <= 1) return [a]; const out = []; a.forEach((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).forEach((p) => out.push([x, ...p]))); return out; }

// ---------- content banks ----------
export const NAMES = ['Mira', 'Toma', 'Kalo', 'Wren', 'Odile', 'Juno', 'Basil', 'Rhea', 'Inko', 'Pell', 'Saffi', 'Bram', 'Lio', 'Nadia', 'Oren', 'Tess', 'Vik', 'Yara', 'Zane', 'Ilse', 'Cato', 'Dara', 'Emil', 'Fia', 'Gus', 'Hana', 'Ivo', 'Kira'];
export const OBJECTS = ['lantern', 'compass', 'teacup', 'violin', 'anchor', 'feather', 'telescope', 'hourglass', 'key', 'map', 'candle', 'globe', 'kite', 'drum', 'bell', 'camera', 'umbrella', 'clock', 'book', 'ring', 'scarf', 'helmet', 'mask', 'vase', 'shell', 'whistle', 'mirror', 'basket'];
export const ROOMS = ['Atrium', 'Gallery', 'Vault', 'Library', 'Observatory', 'Greenhouse', 'Armoury', 'Map Room', 'Chapel', 'Workshop'];
export const LANDMARKS = ['Lighthouse', 'Old Mill', 'Clock Tower', 'Bridge', 'Fountain', 'Windmill', 'Market', 'Temple', 'Harbour', 'Castle'];
export const HOBBIES = ['chess', 'pottery', 'sailing', 'archery', 'baking', 'birdwatching', 'fencing', 'gardening', 'juggling', 'rowing', 'painting', 'climbing'];
export const DRINKS = ['latte', 'mocha', 'chai', 'espresso', 'cocoa', 'matcha', 'tea', 'cider'];
export const MODS = ['iced', 'oat milk', 'extra shot', 'decaf', 'large', 'small', 'no sugar', 'cinnamon'];
export const SYLL = ['ka', 'lo', 'mi', 'ru', 'ven', 'zo', 'tal', 'bri', 'nu', 'sef', 'dor', 'pa', 'qui', 'lem', 'tor', 'xa'];
export const word = (rng, n = 2) => { let s = ''; for (let i = 0; i < n; i++) s += rng.pick(SYLL); return s[0].toUpperCase() + s.slice(1); };
export const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('');
export const HUES = [0, 30, 55, 140, 175, 205, 250, 290, 320];
