// Procedural "key art": every game gets a cinematic poster with no image download.
// Drop real artwork into assets/art/<game-id>.webp (poster) or <game-id>-banner.webp and it is used automatically.
import { RNG } from './engine.js';

const CAT_HUE = {
  'Working memory and short-term recall': 265, 'Long-term learning and retrieval': 305, 'Attention and distraction control': 200,
  'Inhibition and cognitive flexibility': 15, 'Processing speed and rapid comparison': 48,
  'Logic and problem-solving': 175, 'Planning and executive organisation': 130, 'Spatial reasoning and mental imagery': 225,
  'Language and numerical reasoning': 335, 'Decision-making, behavioural habits, and metacognition': 28,
};
export const CAT_SHORT = {
  'Working memory and short-term recall': 'Working memory', 'Long-term learning and retrieval': 'Learning',
  'Attention and distraction control': 'Attention', 'Inhibition and cognitive flexibility': 'Flexibility',
  'Processing speed and rapid comparison': 'Speed', 'Logic and problem-solving': 'Logic', 'Planning and executive organisation': 'Planning',
  'Spatial reasoning and mental imagery': 'Spatial', 'Language and numerical reasoning': 'Language & numbers',
  'Decision-making, behavioural habits, and metacognition': 'Judgment',
};
export const catHue = (c) => CAT_HUE[c] ?? 260;

const hsl = (h, s, l, a = 1) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}% / ${a})`;


// Signature emblems for the playable games (others use their category emblem).
const EMB = {
  'window-watch': (g, st) => `<rect x="-58" y="-80" width="116" height="160" rx="6" ${st}/>` + [0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => { const lit = (r * 3 + c) % 5 === 1; return `<rect x="${-44 + c * 32}" y="${-66 + r * 36}" width="24" height="28" rx="3" fill="${lit ? g : 'rgba(255,255,255,.08)'}"/>`; }).join('')).join(''),
  'echo-grid': (g, st) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${-70 + c * 50}" y="${-70 + r * 50}" width="40" height="40" rx="10" ${[0, 4, 5, 8].includes(r * 3 + c) ? `fill="${g}"` : st}/>`).join('')).join('') + `<path d="M-50-50L0 0 50 0 50 50" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="4 8" stroke-linecap="round"/>`,
  'two-back-orchard': (g, st) => `<circle cx="-42" cy="10" r="34" fill="${g}"/><circle cx="42" cy="10" r="34" fill="${g}" opacity=".55"/><path d="M-42-24c0-14 6-22 16-26M42-24c0-14 6-22 16-26" ${st}/><path d="M28 64H-28l12-12M-28 64l12 12" ${st} stroke-linecap="round"/>`,
  'ink-interpreter': (g, st) => `<text x="0" y="22" text-anchor="middle" font-size="74" font-weight="900" font-family="system-ui" fill="${g}">RED</text><path d="M-80 46c40-16 120-16 160 0" ${st} stroke-linecap="round"/>`,
  'one-different': (g, st) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => `<circle cx="${-50 + c * 50}" cy="${-50 + r * 50}" r="18" ${r * 3 + c === 5 ? `fill="${g}"` : st}/>`).join('')).join(''),
  'rapid-equation-check': (g, st) => `<path d="M-74-12h60M-74 12h60" ${st} stroke-width="10" stroke-linecap="round"/><path d="M8 2l26 26 48-60" stroke="${g}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  'number-lock': (g, st) => `<circle r="70" ${st}/><circle r="50" fill="${g}" opacity=".9"/>` + Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<path d="M${Math.cos(a) * 58} ${Math.sin(a) * 58}L${Math.cos(a) * 68} ${Math.sin(a) * 68}" ${st}/>`; }).join('') + `<path d="M0 0L0-38" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  'circuit-path': (g, st) => `<path d="M-90 30H-30V-30H30V30H90" stroke="${g}" stroke-width="14" fill="none" stroke-linejoin="round" stroke-linecap="round"/><circle cx="-90" cy="30" r="12" fill="#fff"/><circle cx="90" cy="30" r="20" fill="${g}"/><path d="M-60-70h40M30-70v-20" ${st} stroke-linecap="round"/>`,
  'mirror-maze': (g, st) => `<path d="M-60 40l30-30M10-60l30 30M40 60l30-30" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M-100 25H-45V-45H25V45H95" stroke="${g}" stroke-width="8" fill="none" stroke-linejoin="round"/>`,
  'rotation-match': (g, st) => `<path d="M-80-30l40-30 30 20-10 40-40 10z" fill="${g}"/><path d="M40-10l40 10 0 40-30 20-30-20z" fill="${g}" opacity=".7" transform="rotate(40 50 20)"/><path d="M-30 60c30 30 70 20 80-10" ${st} stroke-linecap="round"/><path d="M50 50l2 12 10-6" ${st}/>`,
  'number-line-navigator': (g, st) => `<path d="M-100 30H100" ${st} stroke-width="6" stroke-linecap="round"/>` + [-100, -50, 0, 50, 100].map((x) => `<path d="M${x} 18v24" ${st}/>`).join('') + `<path d="M22-50a22 22 0 1 1 0.1 0zM22 2L22 22" fill="${g}" stroke="${g}" stroke-width="6"/>`,
  'fraction-duel': (g, st) => `<circle cx="-48" cy="0" r="40" ${st}/><path d="M-48 0V-40A40 40 0 1 1 -88 0z" fill="${g}"/><circle cx="48" cy="0" r="40" ${st}/><path d="M48 0V-40A40 40 0 0 1 48 40z" fill="${g}" opacity=".7"/><text x="0" y="78" text-anchor="middle" font-size="26" font-weight="900" fill="#fff" font-family="system-ui">VS</text>`,
};


// Generic motifs so every game gets distinct key art (category sets the colour, the game number picks the motif).
const MOTIFS = [
  (g, st, r) => [0, 1, 2, 3].map((i) => `<circle r="${22 + i * 18}" ${st} opacity="${1 - i * 0.18}"/>`).join('') + `<circle r="14" fill="${g}"/>`,
  (g, st, r) => { const pts = Array.from({ length: 6 }, () => [r.int(-80, 80), r.int(-80, 70)]); return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" ${st}/>` + pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 7 : 11}" fill="${g}"/>`).join(''); },
  (g, st, r) => Array.from({ length: 4 }, (_, i) => `<rect x="${-70 + i * 36}" y="${-20 - i * 18}" width="28" height="${40 + i * 36}" rx="6" ${i === 3 ? `fill="${g}"` : st}/>`).join(''),
  (g, st, r) => `<path d="M-90 0 C-60 -60 -30 60 0 0 S60 -60 90 0" ${st} stroke-width="6"/><path d="M-90 30 C-60 -30 -30 90 0 30 S60 -30 90 30" ${st} opacity=".5"/><circle cx="0" cy="0" r="12" fill="${g}"/>`,
  (g, st, r) => { let d = 'M0 0'; for (let a = 0; a < 18; a++) { const rr = 4 + a * 4.6, t = a * 0.7; d += `L${(Math.cos(t) * rr).toFixed(1)} ${(Math.sin(t) * rr).toFixed(1)}`; } return `<path d="${d}" ${st} stroke-linejoin="round"/><circle r="10" fill="${g}"/>`; },
  (g, st, r) => `<path d="M0-80 70 40H-70z" ${st}/><path d="M0-80 0 40" ${st}/><path d="M-20 -10 -100 10M20 -10 100 -20M20 0 100 20" stroke="${g}" stroke-width="5" stroke-linecap="round"/>`,
  (g, st, r) => `<ellipse rx="86" ry="30" ${st}/><ellipse rx="86" ry="30" ${st} transform="rotate(60)"/><ellipse rx="86" ry="30" ${st} transform="rotate(-60)"/><circle r="16" fill="${g}"/>`,
  (g, st, r) => [[0, 0], [40, 23], [-40, 23], [0, -46], [40, -23], [-40, -23], [0, 46]].map(([x, y], i) => `<path d="M${x} ${y - 22}l19 11v22l-19 11-19-11v-22z" ${i === r.int(0, 6) ? `fill="${g}"` : st}/>`).join(''),
  (g, st, r) => [0, 1, 2].map((i) => `<path d="M${-70 + i * 30} ${50 - i * 40}h50l-14-14M${-20 + i * 30} ${50 - i * 40}l-14 14" ${st} stroke-linecap="round" stroke-linejoin="round"/>`).join('') + `<circle cx="60" cy="-60" r="14" fill="${g}"/>`,
  (g, st, r) => `<path d="M-80 70h40v-40h40v-40h40v-40h40" ${st} stroke-width="6" stroke-linejoin="round"/><circle cx="80" cy="-50" r="14" fill="${g}"/>`,
  (g, st, r) => `<rect x="-80" y="-80" width="160" height="160" rx="10" ${st}/><path d="M-80 -40h120M-40 0h120M-80 40h120M0 -80v40M40 40v40" ${st}/><circle cx="60" cy="60" r="10" fill="${g}"/><circle cx="-60" cy="-60" r="10" fill="#fff"/>`,
  (g, st, r) => Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * 6.283; return `<line x1="0" y1="0" x2="${(Math.cos(a) * 70).toFixed(1)}" y2="${(Math.sin(a) * 70).toFixed(1)}" ${st}/><circle cx="${(Math.cos(a) * 76).toFixed(1)}" cy="${(Math.sin(a) * 76).toFixed(1)}" r="9" fill="${g}"/>`; }).join('') + `<circle r="18" ${st}/>`,
  (g, st, r) => `<path d="M-90 0Q0 -80 90 0Q0 80 -90 0z" ${st}/><circle r="30" ${st}/><circle r="14" fill="${g}"/>`,
  (g, st, r) => `<circle cx="-24" cy="0" r="40" ${st}/><rect x="10" y="-6" width="80" height="12" rx="6" fill="${g}"/><path d="M60 6v20M80 6v14" stroke="${g}" stroke-width="10" stroke-linecap="round"/>`,
  (g, st, r) => `<circle r="80" ${st}/><path d="M0-60 14 0 0 60-14 0z" fill="${g}"/><path d="M-80 0h-10M80 0h10M0-80v-10M0 80v10" ${st}/>`,
  (g, st, r) => `<path d="M-50-80h100M-50 80h100M-40-80c0 50 80 110 80 160M40-80c0 50-80 110-80 160" ${st}/><path d="M-20 50h40l-20-24z" fill="${g}"/>`,
];

function emblem(cat, hue, id, gid, n) {
  const g = `url(#g${id})`, glow = `filter="url(#b${id})"`;
  const c = CAT_SHORT[cat] || '';
  const stroke = `stroke="${hsl(hue, 90, 85)}" stroke-width="3" fill="none"`;
  let s = '';
  if (EMB[gid]) s = EMB[gid](g, stroke);
  else if (n) s = MOTIFS[(n * 7 + Math.floor(n / 16)) % MOTIFS.length](g, stroke, new RNG('motif' + n));
  else if (c === 'Working memory') { for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) { const lit = (r * 3 + q) % 4 === 0; s += `<rect x="${-66 + q * 46}" y="${-66 + r * 46}" width="40" height="40" rx="10" fill="${lit ? g : 'none'}" ${lit ? '' : stroke} opacity="${lit ? 1 : .55}"/>`; } }
  else if (c === 'Learning') s = `<path d="M-70 20c30-26 50-26 70 0 20-26 40-26 70 0v-60c-30-26-50-26-70 0-20-26-40-26-70 0z" fill="${g}"/><path d="M0-40v60" ${stroke}/>`;
  else if (c === 'Attention') s = `<circle r="66" ${stroke}/><circle r="42" ${stroke}/><circle r="18" fill="${g}"/><path d="M-90 0h40M50 0h40M0-90v40M0 50v40" ${stroke}/>`;
  else if (c === 'Flexibility') s = `<path d="M-70-20h110l-28-28M70 30H-40l28 28" ${stroke} stroke-linecap="round" stroke-linejoin="round" stroke-width="9"/><circle cx="0" cy="5" r="14" fill="${g}"/>`;
  else if (c === 'Speed') s = `<path d="M18-80L-52 8h42l-18 72 70-90H-2z" fill="${g}"/>`;
  else if (c === 'Logic') s = `<circle cx="-50" cy="-30" r="16" fill="${g}"/><circle cx="50" cy="-40" r="16" fill="${g}"/><circle cx="0" cy="50" r="20" fill="${g}"/><path d="M-50-30L0 50 50-40-50-30" ${stroke}/>`;
  else if (c === 'Planning') s = `<path d="M-70 60C-20 60-40-10 0-10s20 -50 70-50" ${stroke} stroke-width="6" stroke-dasharray="2 12" stroke-linecap="round"/><path d="M60-90v60l40-18z" fill="${g}"/><circle cx="-70" cy="60" r="12" fill="${g}"/>`;
  else if (c === 'Spatial') s = `<path d="M0-70l62 36v72L0 74-62 38v-72z" ${stroke}/><path d="M0-70v72M0 2l62-36M0 2l-62-36" ${stroke}/><path d="M0 2l62-36L0-70-62-34z" fill="${g}" opacity=".9"/>`;
  else if (c === 'Language & numbers') s = `<rect x="-76" y="-34" width="64" height="68" rx="12" fill="${g}"/><rect x="12" y="-34" width="64" height="68" rx="12" ${stroke}/><path d="M-56 10l12-30 12 30M-52 2h16" stroke="#fff" stroke-width="4" fill="none"/><path d="M34-6h20M44-16v20" ${stroke}/>`;
  else s = `<path d="M-70 30h140M0 30V-60M-50-10h-30l30 40zM50-10h30l-30 40z" ${stroke} stroke-linejoin="round"/><circle cy="-66" r="10" fill="${g}"/>`;
  return `<g transform="translate(150 175)" ${glow}>${s}</g><g transform="translate(150 175)">${s}</g>`;
}

export function posterSVG(g, { w = 300, h: hh = 400 } = {}) {
  const hue = catHue(g.cat) + ((g.n * 23) % 40) - 20, r = new RNG('art' + g.n), id = g.n;
  let stars = '';
  for (let i = 0; i < 38; i++) stars += `<circle cx="${r.int(4, w - 4)}" cy="${r.int(4, 230)}" r="${(r.next() * 1.4 + 0.3).toFixed(2)}" fill="#fff" opacity="${(r.next() * 0.6 + 0.15).toFixed(2)}"/>`;
  let hills = '';
  for (let l = 0; l < 3; l++) {
    let d = `M0 ${hh}`; const base = 300 + l * 34, amp = 26 + l * 8;
    for (let x = 0; x <= w; x += 30) d += `L${x} ${(base - amp * Math.abs(Math.sin((x + r.int(0, 60)) / (50 + l * 18)))).toFixed(1)}`;
    hills += `<path d="${d}L${w} ${hh}z" fill="${hsl(hue + l * 6, 55 - l * 8, 18 - l * 4)}" opacity="${0.9 - l * 0.05}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${g.title} key art">
<defs>
<linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(hue + 20, 70, 9)}"/><stop offset=".55" stop-color="${hsl(hue, 70, 24)}"/><stop offset="1" stop-color="${hsl(hue - 18, 80, 38)}"/></linearGradient>
<radialGradient id="o${id}" cx="50%" cy="44%" r="55%"><stop offset="0" stop-color="${hsl(hue + 10, 100, 65, .75)}"/><stop offset="1" stop-color="${hsl(hue, 100, 50, 0)}"/></radialGradient>
<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(hue + 30, 100, 80)}"/><stop offset="1" stop-color="${hsl(hue - 10, 95, 55)}"/></linearGradient>
<filter id="b${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
<radialGradient id="v${id}" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>
</defs>
<rect width="${w}" height="${hh}" fill="url(#s${id})"/>${stars}
<circle cx="150" cy="175" r="170" fill="url(#o${id})"/>
${hills}
${emblem(g.cat, hue, id, g.id, g.n)}
<rect width="${w}" height="${hh}" fill="url(#v${id})"/>
</svg>`;
}

let manifestP;
export function artManifest() {
  return (manifestP ||= fetch('assets/art/manifest.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
}
/** Returns a poster element: procedural art, upgraded to real artwork when a file is listed in manifest.json. */
export function posterEl(g, kind = 'poster') {
  const el = document.createElement('div');
  el.className = 'poster';
  el.innerHTML = posterSVG(g, kind === 'banner' ? { w: 300, h: 400 } : undefined);
  artManifest().then((m) => {
    const list = m[kind] || [];
    if (!list.includes(g.id)) return;
    const img = new Image();
    img.alt = ''; img.decoding = 'async';
    img.onload = () => { img.classList.add('in'); el.append(img); };
    img.src = `assets/art/${g.id}${kind === 'banner' ? '-banner' : ''}.webp`;
  });
  return el;
}
