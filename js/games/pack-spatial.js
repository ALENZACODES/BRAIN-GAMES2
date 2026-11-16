// Concepts 141–160: spatial reasoning and mental imagery.
import { std } from '../play.js';
import { glyph, tok, gridSVG, arrow, mc, numOpts, HUES, range, sum, LETTERS, permutations } from '../gfx.js';

const cellGrid = (n, on, opts = {}) => gridSVG(range(n * n).map((i) => ({ fill: on.has(i) ? opts.fill || '#7ef0ff' : 'rgba(255,255,255,.06)', label: opts.labels?.[i] })), n, { gap: 4, round: 4 });
function iso(hm, n, { light } = {}) {
  const P = (x, y, z) => [(x - y) * 22 + n * 22 + 10, (x + y) * 12 - z * 24 + 24 * 4 + 14]; let s = '';
  const poly = (pts, f) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${f}" stroke="#0b0f22" stroke-width="1.4" stroke-linejoin="round"/>`;
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) s += poly([P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0)], 'rgba(255,255,255,.06)');
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < hm[y * n + x]; z++) {
    s += poly([P(x, y + 1, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x, y + 1, z)], '#3e7bd6') + poly([P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x + 1, y, z)], '#2a5aa8') + poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], '#8fc1ff');
  }
  return `<svg viewBox="0 0 ${n * 44 + 20} ${n * 24 + 24 * 4 + 30}" class="gl iso">${s}</svg>`;
}
const POLY = [[0, 1, 2, 5], [0, 1, 4, 5, 6], [0, 5, 6, 7], [1, 5, 6, 10], [0, 1, 2, 6, 11], [0, 5, 10, 11], [0, 1, 6, 7], [2, 6, 7, 10, 11], [0, 1, 2, 7, 12], [1, 5, 6, 7, 11]];
const shift = (cells, n = 5) => { const rs = cells.map((c) => Math.floor(c / n)), cs = cells.map((c) => c % n), r0 = Math.min(...rs), c0 = Math.min(...cs); return cells.map((c) => (Math.floor(c / n) - r0) * n + (c % n) - c0).sort((a, b) => a - b); };
const rot90 = (cells, n = 5) => shift(cells.map((c) => (c % n) * n + (n - 1 - Math.floor(c / n))), n);
const key = (cells) => cells.join(',');

export const G = [
  std({ num: 142, title: 'Folded Paper', max: 12,
    how: ['A square sheet is folded (shown by the arrows), then a hole is punched through every layer.', 'Imagine unfolding it.', 'Pick where the holes end up. More folds and holes as you improve.'],
    makeTrial(rng, lv) {
      const folds = rng.sample([{ a: 'v', keep: rng.pick(['lo', 'hi']) }, { a: 'h', keep: rng.pick(['lo', 'hi']) }], lv <= 3 ? 1 : 2), nh = lv >= 8 ? 2 : 1;
      const cols = folds.some((f) => f.a === 'v') ? (folds.find((f) => f.a === 'v').keep === 'hi' ? [2, 3] : [0, 1]) : [0, 1, 2, 3], rows = folds.some((f) => f.a === 'h') ? (folds.find((f) => f.a === 'h').keep === 'hi' ? [2, 3] : [0, 1]) : [0, 1, 2, 3];
      const holes = rng.sample(rows.flatMap((r) => cols.map((c) => r * 4 + c)), nh), unfold = (hs, fs) => { let set = new Set(hs); for (const f of [...fs].reverse()) { for (const x of [...set]) { const r = Math.floor(x / 4), c = x % 4; set.add(f.a === 'v' ? r * 4 + (3 - c) : (3 - r) * 4 + c); } } return set; };
      const ans = unfold(holes, folds), k = (s) => [...s].sort((a, b) => a - b).join(',');
      const ds = [new Set(holes), unfold(holes, folds.map((f) => ({ ...f, a: f.a === 'v' ? 'h' : 'v' }))), unfold(holes.map((x) => (x + 1) % 16), folds), unfold(holes.map((x) => (x + 4) % 16), folds), new Set([...ans, (holes[0] + 5) % 16])];
      const folded = new Set(rows.flatMap((r) => cols.map((c) => r * 4 + c)));
      const pic = gridSVG(range(16).map((i) => ({ fill: !folded.has(i) ? 'rgba(255,255,255,.03)' : holes.includes(i) ? '#150f2c' : '#f7f1e3', stroke: folded.has(i) ? '#999' : 'rgba(255,255,255,.12)' })), 4, { gap: 2, round: 2 });
      const desc = folds.map((f) => (f.a === 'v' ? (f.keep === 'hi' ? 'left half over to the right' : 'right half over to the left') : f.keep === 'hi' ? 'top half down' : 'bottom half up')).join(', then ');
      const draw = (s) => gridSVG(range(16).map((i) => ({ fill: s.has(i) ? '#150f2c' : '#f7f1e3', stroke: '#999' })), 4, { gap: 2, round: 2 });
      return { kind: 'choice', promptHtml: `<span class="rule">Fold: ${desc}. Punch shown in the folded sheet.</span><span class="paper">${pic}</span>`, prompt: 'Unfolded, the holes are…', options: mc(rng, { html: draw(ans), value: k(ans), cls: 'tile' }, ds.map((s) => ({ html: draw(s), value: k(s), cls: 'tile' })), 4), answer: k(ans), cols: 2 };
    } }),
  std({ num: 143, title: 'Cube Net', max: 12,
    how: ['A flat net of six lettered squares folds into a cube.', 'Fold it in your mind.', 'Which letter ends up OPPOSITE the highlighted one? Trickier nets as you improve.'],
    makeTrial(rng, lv) {
      const nets = []; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) nets.push([[a, 0], [0, 1], [1, 1], [2, 1], [3, 1], [b, 2]]);
      nets.push([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]], [[1, 0], [0, 1], [1, 1], [2, 1], [2, 2], [3, 2]]);
      const fold = (net) => { const map = new Map(net.map((c, i) => [c.join(), i])), N = Array(6), seen = new Set([0]), q = [[0, [0, 0, -1], [1, 0, 0], [0, 1, 0]]]; N[0] = [0, 0, -1]; const neg = (v) => v.map((x) => -x);
        while (q.length) { const [i, n, ex, ey] = q.shift(), [x, y] = net[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = map.get([x + dx, y + dy].join()); if (j == null || seen.has(j)) continue; seen.add(j);
          let nn, ex2 = ex, ey2 = ey; if (dx === 1) { nn = ex; ex2 = neg(n); } else if (dx === -1) { nn = neg(ex); ex2 = n; } else if (dy === 1) { nn = ey; ey2 = neg(n); } else { nn = neg(ey); ey2 = n; } N[j] = nn; q.push([j, nn, ex2, ey2]); } }
        return N; };
      const pool = (lv <= 4 ? nets.slice(0, 16) : nets).filter((net) => { const N = fold(net); return N.every(Boolean) && new Set(N.map((v) => v.join())).size === 6; });
      const net = rng.pick(pool), N = fold(net), labels = rng.sample(LETTERS, 6), q = rng.int(0, 5), opp = N.findIndex((v) => v.join() === N[q].map((x) => -x).join());
      const W = Math.max(...net.map((c) => c[0])) + 1, H = Math.max(...net.map((c) => c[1])) + 1, cs = 40;
      const svg = `<svg viewBox="0 0 ${W * cs + 4} ${H * cs + 4}" class="gl net">${net.map(([x, y], i) => `<rect x="${x * cs + 2}" y="${y * cs + 2}" width="${cs - 2}" height="${cs - 2}" rx="4" fill="${i === q ? '#ffd84a' : '#4d94ff'}" stroke="#fff" stroke-width="1.5"/><text x="${x * cs + cs / 2 + 1}" y="${y * cs + cs / 2 + 9}" text-anchor="middle" font-size="22" font-weight="900" fill="#0b0f22">${labels[i]}</text>`).join('')}</svg>`;
      return { kind: 'choice', promptHtml: svg, prompt: `Opposite ${labels[q]}?`, options: range(6).filter((i) => i !== q).map((i) => ({ label: labels[i], value: labels[i] })), answer: labels[opp], cols: 5 };
    } }),
  std({ num: 144, title: 'Perspective Finder', max: 12,
    how: ['A block city is shown from above: each number is the height of that tower.', 'Imagine standing at the FRONT (bottom edge) looking straight at it.', 'Pick the outline you would see. Later you are asked for the side view too.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 3 : 4, hm = range(n * n).map(() => rng.int(0, Math.min(4, 1 + Math.floor(lv / 3)))), side = lv >= 6 && rng.chance(0.5);
      const front = range(n).map((c) => Math.max(...range(n).map((r) => hm[r * n + c]))), right = range(n).map((r) => Math.max(...range(n).map((c) => hm[(n - 1 - r) * n + c])));
      const prof = (p) => { const mx = 4, cw = 100 / n; return `<svg viewBox="0 0 100 100" class="gl">${p.map((v, i) => range(v).map((z) => `<rect x="${i * cw + 1}" y="${96 - (z + 1) * 22}" width="${cw - 2}" height="20" rx="2" fill="#8fc1ff" stroke="#0b0f22"/>`).join('')).join('')}<path d="M0 98H100" stroke="#fff6"/></svg>`; };
      const ans = side ? right : front, k = (p) => p.join(''), ds = [side ? front : right, [...ans].reverse(), ans.map((v, i) => (i === 0 ? Math.max(0, v - 1) : v)), ans.map((v, i) => (i === n - 1 ? Math.min(4, v + 1) : v)), range(n).map((c) => Math.min(...range(n).map((r) => hm[r * n + c])))];
      return { kind: 'choice', promptHtml: `${cellGrid(n, new Set(range(n * n).filter((i) => hm[i] > 0)), { labels: hm.map(String), fill: '#2a5aa8' })}<span class="rule">${side ? 'View from the RIGHT side' : 'View from the FRONT (bottom edge)'}</span>`, prompt: '', options: mc(rng, { html: prof(ans), value: k(ans), cls: 'tile' }, ds.map((p) => ({ html: prof(p), value: k(p), cls: 'tile' })), 4), answer: k(ans), cols: 2 };
    } }),
  std({ num: 146, title: 'Shape Assembly', max: 12,
    how: ['A target silhouette is shown.', 'Which PAIR of pieces fits together to make it exactly, with no overlaps or gaps? Pieces may be slid but not turned.', 'Bigger targets and closer decoys as you improve.'],
    makeTrial(rng, lv) {
      const n = 6, can = (A, B, T) => { const tset = new Set(T); for (let a = 0; a < n * n; a++) { const pa = A.map((c) => c + Math.floor(a / n) * n + (a % n)); if (A.some((c) => (c % n) + (a % n) >= n) || pa.some((c) => !tset.has(c))) continue; for (let b = 0; b < n * n; b++) { if (B.some((c) => (c % n) + (b % n) >= n)) continue; const pb = B.map((c) => c + Math.floor(b / n) * n + (b % n)); if (pb.every((c) => tset.has(c) && !pa.includes(c)) && pa.length + pb.length === T.length) return true; } } return false; };
      const re = (c5) => c5.map((c) => Math.floor(c / 5) * n + (c % 5));
      for (let g = 0; g < 400; g++) {
        const A = re(rng.pick(POLY)), B = re(rng.pick(POLY)), off = rng.int(1, 9), off2 = Math.floor(off / 3) * n + (off % 3);
        const pb = B.map((c) => c + off2); if (B.some((c) => (c % n) + (off % 3) >= n) || pb.some((c) => c >= n * n || A.includes(c))) continue;
        const T = [...A, ...pb].sort((a, b) => a - b); const adj = pb.some((c) => A.some((a) => Math.abs(a - c) === n || (Math.abs(a - c) === 1 && Math.floor(a / n) === Math.floor(c / n)))); if (!adj) continue;
        const ds = []; for (let t = 0; t < 60 && ds.length < 3; t++) { const X = re(rng.pick(POLY)), Y = rng.chance(0.5) ? A : B, pair = rng.chance(0.5) ? [X, Y] : [Y, X]; if (!can(pair[0], pair[1], T) && !ds.some((d) => key(d[0]) + '|' + key(d[1]) === key(pair[0]) + '|' + key(pair[1]))) ds.push(pair); }
        if (ds.length < 3) continue;
        const pic = (P) => gridSVG(range(n * n).map((i) => ({ fill: P.includes(i) ? '#ffd84a' : 'rgba(255,255,255,.03)', stroke: P.includes(i) ? '#0b0f22' : 'transparent' })), n, { gap: 1, round: 1 });
        const pairPic = ([X, Y]) => `<span class="pp">${pic(X)}${pic(Y)}</span>`, kk = ([X, Y]) => key(X) + '|' + key(Y);
        return { kind: 'choice', promptHtml: `<span class="ref">${gridSVG(range(n * n).map((i) => ({ fill: T.includes(i) ? '#7ef0ff' : 'rgba(255,255,255,.03)', stroke: 'transparent' })), n, { gap: 1, round: 1 })}<small>target</small></span>`, prompt: 'Which pair builds it?', options: rng.shuffle([[A, B], ...ds]).map((p) => ({ html: pairPic(p), value: kk(p), cls: 'tile wide' })), answer: kk([A, B]), cols: 2 };
      }
      throw new Error('assembly gen');
    } }),
  std({ num: 147, title: 'Hidden Blocks', max: 12,
    how: ['Count every cube in the stack.', 'Rule: no cube floats, so every cube you see rests on cubes (or ground) beneath it, even ones you cannot see.', 'Bigger stacks as you improve.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 2 : lv <= 8 ? 3 : 4, mx = Math.min(4, 2 + Math.floor(lv / 4)), hm = Array(n * n).fill(0);
      for (let s = 0; s < n * 2; s++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if (x + y !== s) continue; const lim = Math.min(x > 0 ? hm[y * n + x - 1] : mx, y > 0 ? hm[(y - 1) * n + x] : mx); hm[y * n + x] = rng.int(x + y === 0 ? 1 : 0, lim); }
      return { kind: 'numeric', promptHtml: iso(hm, n), prompt: 'How many cubes in total?', answer: sum(hm) };
    } }),
  std({ num: 148, title: 'Map Rotation', max: 12,
    how: ['Your map is turned so north is not at the top (see the N arrow).', 'You are told which compass direction to travel.', 'Pick the screen direction that matches. Finer angles later.'],
    makeTrial(rng, lv) {
      const step = lv <= 5 ? 90 : 45, rot = rng.int(0, 360 / step - 1) * step, D = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'], di = lv <= 5 ? rng.pick([0, 2, 4, 6]) : rng.int(0, 7);
      const scr = (rot + di * 45 - 90 + 720) % 360, opts = lv <= 5 ? [0, 90, 180, 270] : [0, 45, 90, 135, 180, 225, 270, 315];
      return { kind: 'choice', promptHtml: `<span class="compass"><svg viewBox="0 0 100 100" class="gl"><circle cx="50" cy="50" r="46" fill="rgba(255,255,255,.06)" stroke="#fff4"/><g transform="rotate(${rot} 50 50)"><path d="M50 10 60 50 50 44 40 50z" fill="#ff5a5f"/><text x="50" y="9" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">N</text></g></svg></span>`, prompt: `Travel ${D[di]}. Which way on screen?`,
        options: opts.map((a) => ({ html: arrow(a), value: a, cls: 'tile', aria: `${a} degrees` })), answer: scr, cols: 4 };
    } }),
  std({ num: 149, title: 'Path Integration', max: 12,
    how: ['Follow a walker’s moves away from home, step by step.', 'Keep track of where they end up.', 'Then pick the direction that points straight back home. More turns as you improve.'],
    makeTrial(rng, lv) {
      const D = [[0, -1, 'north', '↑'], [1, 0, 'east', '→'], [0, 1, 'south', '↓'], [-1, 0, 'west', '←']], C = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
      for (let g = 0; g < 500; g++) {
        const k = Math.min(6, 2 + Math.floor(lv / 2)), mv = range(k).map(() => [rng.int(0, 3), rng.int(1, 4)]); let x = 0, y = 0; mv.forEach(([d, s]) => { x += D[d][0] * s; y += D[d][1] * s; });
        if (!x && !y) continue; if (x && y && Math.abs(x) !== Math.abs(y)) continue;
        const bx = -Math.sign(x), by = -Math.sign(y), idx = { '0,-1': 0, '1,-1': 1, '1,0': 2, '1,1': 3, '0,1': 4, '-1,1': 5, '-1,0': 6, '-1,-1': 7 }[`${bx},${by}`];
        return { kind: 'choice', study: { title: 'Follow the walker from home', frames: mv.map(([d, s]) => ({ html: `<b class="dir">${D[d][3]} ${s} ${D[d][2]}</b>` })), ms: Math.max(900, 1600 - lv * 50), blank: 150 }, prompt: 'Which way is home?', options: C.map((c, i) => ({ html: arrow((i * 45 - 90 + 360) % 360), value: i, cls: 'tile', aria: c })), answer: idx, cols: 4 };
      }
      throw new Error('path gen');
    } }),
  std({ num: 150, title: 'Cross-Section Studio', max: 10,
    how: ['A solid is sliced by a flat cut.', 'Picture the face revealed by the cut.', 'Pick its shape. Oblique and corner cuts appear as you improve.'],
    makeTrial(rng, lv) {
      const T = [['cube', 'cut parallel to the base', 'square', 1], ['cube', 'cut straight down through two opposite edges', 'rectangle', 4], ['cube', 'cut off one corner', 'triangle', 6], ['cube', 'cut through the centre at right angles to a corner-to-corner diagonal', 'hexagon', 9],
        ['cylinder', 'cut parallel to the base', 'circle', 1], ['cylinder', 'cut straight down through the axis', 'rectangle', 2], ['cylinder', 'cut at a slant (not touching the ends)', 'ellipse', 6], ['cone', 'cut parallel to the base', 'circle', 1], ['cone', 'cut straight down through the tip', 'triangle', 3],
        ['cone', 'cut at a slant (not touching the base)', 'ellipse', 7], ['sphere', 'cut anywhere', 'circle', 1], ['square pyramid', 'cut parallel to the base', 'square', 2], ['square pyramid', 'cut straight down through the tip, parallel to a base edge', 'triangle', 4], ['triangular prism', 'cut parallel to the triangular ends', 'triangle', 2], ['triangular prism', 'cut straight along its length, parallel to one side face', 'rectangle', 5], ['cube', 'cut through four corners diagonally (corner to corner across two faces)', 'rectangle', 8]];
      const [solid, cut, ans] = rng.pick(T.filter((x) => x[3] <= lv + 1)), SH = ['circle', 'square', 'rectangle', 'triangle', 'ellipse', 'hexagon', 'trapezoid', 'pentagon'];
      return { kind: 'choice', promptHtml: `<span class="memo"><b>${solid[0].toUpperCase() + solid.slice(1)}</b>: ${cut}.</span>`, prompt: 'The cut face is a…', options: mc(rng, { label: ans, value: ans }, SH.map((s) => ({ label: s, value: s })), 4), answer: ans, cols: 2 };
    } }),
  std({ num: 151, title: 'Relative Position', max: 12,
    how: ['Objects stand in a 2-row by 3-column display: a FRONT row and a BACK row.', 'Read the clues.', 'Pick the only arrangement that fits every clue.'],
    makeTrial(rng, lv) {
      const k = lv <= 4 ? 3 : 4, ob = rng.sample(['Vase', 'Lamp', 'Clock', 'Globe', 'Bust', 'Drum'], k), cells = range(6), R = (c) => (c < 3 ? 'back' : 'front'), Cc = (c) => c % 3;
      const all = []; const rec = (acc) => { if (acc.length === k) { all.push(acc); return; } for (const c of cells) if (!acc.includes(c)) rec([...acc, c]); }; rec([]);
      const sol = rng.pick(all), facts = [];
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) if (a !== b) { const A = sol[a], B = sol[b];
        if (Cc(A) < Cc(B)) facts.push([`${ob[a]} is somewhere left of ${ob[b]}.`, (p) => Cc(p[a]) < Cc(p[b])]);
        if (Cc(A) === Cc(B) && A < B) facts.push([`${ob[a]} is directly behind ${ob[b]}.`, (p) => Cc(p[a]) === Cc(p[b]) && p[a] < p[b]]);
        if (R(A) === R(B) && Math.abs(Cc(A) - Cc(B)) === 1) facts.push([`${ob[a]} is right next to ${ob[b]} in the same row.`, (p) => R(p[a]) === R(p[b]) && Math.abs(Cc(p[a]) - Cc(p[b])) === 1]); }
      for (let a = 0; a < k; a++) facts.push([`${ob[a]} is in the ${R(sol[a])} row.`, (p) => R(p[a]) === R(sol[a])], [`${ob[a]} is in the ${['left', 'middle', 'right'][Cc(sol[a])]} column.`, (p) => Cc(p[a]) === Cc(sol[a])]);
      let cand = all; const used = []; for (const f of rng.shuffle(facts)) { const nc = cand.filter(f[1]); if (nc.length < cand.length) { used.push(f[0]); cand = nc; } if (cand.length === 1) break; }
      const draw = (p) => `<span class="lay">${cells.map((c) => `<i>${p.includes(c) ? ob[p.indexOf(c)].slice(0, 4) : ''}</i>`).join('')}</span>`, kk = (p) => p.join(',');
      const ds = rng.sample(all.filter((p) => kk(p) !== kk(sol)), 3);
      return { kind: 'choice', promptHtml: `<span class="memo list">${used.map((u) => `<span>• ${u}</span>`).join('')}<span><small>(Top row = back, bottom row = front)</small></span></span>`, prompt: 'Which arrangement?', options: rng.shuffle([sol, ...ds]).map((p) => ({ html: draw(p), value: kk(p), cls: 'tile' })), answer: kk(sol), cols: 2 };
    } }),
  std({ num: 152, title: 'Shadow Match', max: 12,
    how: ['A block sculpture is lit from directly above.', 'Picture the shadow it casts on the floor (seen from above).', 'Pick the matching shadow. Bigger sculptures with gaps as you improve.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 3 : 4; let hm; do { hm = range(n * n).map(() => (rng.chance(0.35) ? 0 : rng.int(1, Math.min(4, 1 + Math.floor(lv / 3))))); } while (hm.every((v) => v === 0) || hm.every((v) => v > 0));
      const fp = new Set(range(n * n).filter((i) => hm[i] > 0)), k = (s) => [...s].sort((a, b) => a - b).join(','), mir = (s) => new Set([...s].map((i) => Math.floor(i / n) * n + (n - 1 - (i % n)))), tr = (s) => new Set([...s].map((i) => (i % n) * n + Math.floor(i / n)));
      const tog = (s) => { const x = new Set(s), i = rng.int(0, n * n - 1); x.has(i) ? x.delete(i) : x.add(i); return x; };
      return { kind: 'choice', promptHtml: iso(hm, n), prompt: 'Shadow from directly above (top edge = back)?', options: mc(rng, { html: cellGrid(n, fp, { fill: '#150f2c' }), value: k(fp), cls: 'tile' }, [mir(fp), tr(fp), tog(fp), tog(fp), tog(tog(fp))].map((s) => ({ html: cellGrid(n, s, { fill: '#150f2c' }), value: k(s), cls: 'tile' })), 4), answer: k(fp), cols: 2 };
    } }),
  std({ num: 153, title: 'Route Reconstruction', max: 12,
    how: ['Follow a walk described from the walker’s point of view: forward, turn left, turn right.', 'The walker starts at S facing UP the map.', 'Pick the map route they took. More turns as you improve.'],
    makeTrial(rng, lv) {
      const n = 6, H = [[-1, 0], [0, 1], [1, 0], [0, -1]];
      for (let g = 0; g < 400; g++) {
        let r = rng.int(2, 3), c = rng.int(2, 3), hd = 0; const s = r * n + c, path = [s], cmds = []; const k = Math.min(6, 2 + Math.floor(lv / 2)); let ok = true;
        for (let i = 0; i < k; i++) { const t = i === 0 ? 0 : rng.pick([-1, 1]); if (t) { hd = (hd + t + 4) % 4; cmds.push(t < 0 ? '↰ turn left' : '↱ turn right'); } const st = rng.int(1, 2); for (let j = 0; j < st; j++) { r += H[hd][0]; c += H[hd][1]; if (r < 0 || c < 0 || r >= n || c >= n || path.includes(r * n + c)) ok = false; path.push(r * n + c); } cmds.push(`↑ forward ${st}`); }
        if (!ok) continue;
        const alt = (flip) => { let r2 = Math.floor(s / n), c2 = s % n, h2 = 0; const p = [s]; let bad = false, idx = 0; for (const cm of cmds) { if (cm.includes('turn')) { let t = cm.includes('left') ? -1 : 1; if (idx === flip) t = -t; h2 = (h2 + t + 4) % 4; idx++; } else { const st = +cm.split(' ').pop(); for (let j = 0; j < st; j++) { r2 += H[h2][0]; c2 += H[h2][1]; if (r2 < 0 || c2 < 0 || r2 >= n || c2 >= n) bad = true; p.push(r2 * n + c2); } } } return bad ? null : p; };
        const turns = cmds.filter((x) => x.includes('turn')).length, ds = range(turns).map(alt).filter(Boolean).filter((p) => p.join() !== path.join()); if (ds.length < 1) continue;
        const mir = path.map((x) => Math.floor(x / n) * n + (n - 1 - (x % n))); if (!mir.every((x) => x >= 0)) continue;
        const opts = [path, ...ds.slice(0, 2), mir].filter((p, i, a) => a.findIndex((q) => q.join() === p.join()) === i); if (opts.length < 3) continue;
        return { kind: 'choice', study: { title: 'Start at S, facing up the map', frames: cmds.map((x) => ({ html: `<b class="dir">${x}</b>` })), ms: Math.max(900, 1500 - lv * 40), blank: 120 }, prompt: 'Which route was it?', options: rng.shuffle(opts).map((p, i) => ({ html: `<svg viewBox="0 0 120 120" class="gl"><rect width="120" height="120" rx="8" fill="rgba(255,255,255,.04)"/>${range(7).map((j) => `<path d="M${j * 20} 0V120M0 ${j * 20}H120" stroke="rgba(255,255,255,.07)"/>`).join('')}<polyline points="${p.map((x) => `${(x % n) * 20 + 10},${Math.floor(x / n) * 20 + 10}`).join(' ')}" fill="none" stroke="#ffd84a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${(s % n) * 20 + 10}" cy="${Math.floor(s / n) * 20 + 10}" r="7" fill="#7ef0ff"/><text x="${(s % n) * 20 + 10}" y="${Math.floor(s / n) * 20 + 14}" text-anchor="middle" font-size="9" font-weight="900" fill="#041a1f">S</text></svg>`, value: p.join(','), cls: 'tile' })), answer: path.join(','), cols: 2 };
      }
      throw new Error('route gen');
    } }),
  std({ num: 154, title: 'Symmetry Workshop', max: 12,
    how: ['Half of a pattern is drawn on one side of the mirror line.', 'Complete it: select the squares on the other half so the picture is perfectly mirrored.', 'Bigger patterns and a horizontal mirror line as you improve.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 4 : 6, half = n / 2, horiz = lv >= 7 && rng.chance(0.5); let on; do { on = range(n * half).filter(() => rng.chance(0.4)); } while (on.length < 2);
      const src = new Set(on.map((i) => (horiz ? i : Math.floor(i / half) * n + (i % half)))), tgt = [...src].map((i) => (horiz ? (n - 1 - Math.floor(i / n)) * n + (i % n) : Math.floor(i / n) * n + (n - 1 - (i % n))));
      const full = gridSVG(range(n * n).map((i) => ({ fill: src.has(i) ? '#ff7ac6' : (horiz ? Math.floor(i / n) >= half : i % n >= half) ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.04)' })), n, { gap: 3, round: 3 });
      const cellsOther = range(n * n).filter((i) => (horiz ? Math.floor(i / n) >= half : i % n >= half));
      return { kind: 'multi', promptHtml: `<span class="symm ${horiz ? 'h' : 'v'}">${full}</span>`, prompt: `Select the ${tgt.length} squares on the ${horiz ? 'bottom' : 'right'} half`, items: cellsOther.map((i) => ({ label: '', value: i, aria: `Row ${Math.floor(i / n) + 1} column ${(i % n) + 1}` })), answer: tgt, need: tgt.length, cols: horiz ? n : half };
    } }),
  std({ num: 155, title: 'Packing Rotation', max: 12,
    how: ['A block must pass through the slot shown.', 'It can only be turned clockwise in quarter turns (no flipping).', 'How far must it turn to fit? Trickier shapes as you improve.'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 100; g++) {
        const P = shift(rng.pick(POLY)), R = [P, rot90(P), rot90(rot90(P)), rot90(rot90(rot90(P)))]; if (new Set(R.map(key)).size < 4) continue;
        const k = rng.int(1, 3), slot = R[k], pic = (c, f) => gridSVG(range(25).map((i) => ({ fill: c.includes(i) ? f : f === '#000' ? '#8d6e63' : 'rgba(255,255,255,.03)', stroke: c.includes(i) ? (f === '#000' ? '#ffd84a' : '#0b0f22') : 'transparent' })), 5, { gap: f === '#000' ? 0 : 1, round: 2 });
        return { kind: 'choice', promptHtml: `<span class="pair"><span class="ref">${pic(P, '#ffd84a')}<small>block</small></span><span class="ref slot">${pic(slot, '#000')}<small>slot in the wall</small></span></span>`, prompt: 'Turn it clockwise by…', options: [0, 90, 180, 270].map((a) => ({ label: a ? `${a}°` : 'No turn', value: a })), answer: k * 90, cols: 4 };
      }
      throw new Error('rot gen');
    } }),
  std({ num: 156, title: 'Scale Mapper', max: 12,
    how: ['A small sketch map shows two places.', 'On the full-size map, every distance is multiplied by the scale.', 'How far right/left and down/up is the second place from the first on the big map?'],
    makeTrial(rng, lv) {
      const s = lv <= 4 ? 2 : lv <= 8 ? 3 : 1.5, n = 5; let a, b, dx, dy; do { a = [rng.int(0, 4), rng.int(0, 4)]; b = [rng.int(0, 4), rng.int(0, 4)]; dx = b[0] - a[0]; dy = b[1] - a[1]; } while ((!dx && !dy) || (s === 1.5 && (dx % 2 || dy % 2)));
      const f = (x, y) => `${x >= 0 ? '→' : '←'} ${Math.abs(x)}, ${y >= 0 ? '↓' : '↑'} ${Math.abs(y)}`, ans = f(dx * s, dy * s);
      const ds = [f(dx, dy), f(dy * s, dx * s), f(-dx * s, dy * s), f(dx * s, -dy * s), f(dx * s + 1, dy * s), f(dx * (s + 1), dy * (s + 1))];
      const map = gridSVG(range(25).map((i) => ({ fill: i === a[1] * n + a[0] ? '#7ef0ff' : i === b[1] * n + b[0] ? '#ffd84a' : 'rgba(255,255,255,.05)', label: i === a[1] * n + a[0] ? 'W' : i === b[1] * n + b[0] ? 'T' : null, ink: '#041a1f' })), n, { gap: 3, round: 3 });
      return { kind: 'choice', promptHtml: `${map}<span class="rule">Scale: big map = ${s} × the sketch</span>`, prompt: 'From Well (W) to Tower (T) on the big map:', options: mc(rng, { label: ans, value: ans }, ds.map((x) => ({ label: x, value: x })), 4), answer: ans, cols: 2 };
    } }),
  std({ num: 157, title: 'Landmark Ordering', max: 12,
    how: ['Several travellers each saw part of a skyline, always looking north.', 'Each report says which landmark was LEFT of which.', 'Combine the reports and order all landmarks from left to right.'],
    makeTrial(rng, lv) {
      const k = Math.min(6, 3 + Math.floor(lv / 3)), L = rng.sample(['Mill', 'Tower', 'Dome', 'Spire', 'Bridge', 'Crane', 'Arch'], k), perm = permutations(range(k)), pairs = [];
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) pairs.push([i, j]);
      const pool = lv >= 6 ? pairs : pairs.filter(([i, j]) => j === i + 1); let cand = perm; const used = [];
      for (const [i, j] of rng.shuffle(pool)) { const f = (p) => p.indexOf(i) < p.indexOf(j); const nc = cand.filter(f); if (nc.length < cand.length) { used.push([i, j]); cand = nc; } if (cand.length === 1) break; }
      for (const [i, j] of pairs) { if (cand.length === 1) break; const nc = cand.filter((p) => p.indexOf(i) < p.indexOf(j)); if (nc.length < cand.length) { used.push([i, j]); cand = nc; } }
      return { kind: 'order', promptHtml: `<span class="memo list">${rng.shuffle(used).map(([i, j]) => `<span>👁 ${L[i]} … ${L[j]}  (left → right)</span>`).join('')}</span>`, items: rng.shuffle(range(k)).map((i) => ({ label: L[i], value: i })), answer: range(k), prompt: 'Left to right' };
    } }),
  std({ num: 158, title: 'Tile Navigation', max: 12,
    how: ['A robot starts on the star, facing UP.', 'Commands are relative to the way it faces: F = forward one, L/R = turn left/right on the spot.', 'Tap where it ends. Longer programs as you improve.'],
    makeTrial(rng, lv) {
      const n = 5, H = [[-1, 0], [0, 1], [1, 0], [0, -1]];
      for (let g = 0; g < 400; g++) { let r = 2, c = 2, hd = 0; const k = Math.min(10, 3 + lv), cmd = []; let ok = true;
        for (let i = 0; i < k; i++) { const x = rng.pick(['F', 'F', 'L', 'R']); cmd.push(x); if (x === 'L') hd = (hd + 3) % 4; else if (x === 'R') hd = (hd + 1) % 4; else { r += H[hd][0]; c += H[hd][1]; if (r < 0 || c < 0 || r >= n || c >= n) ok = false; } }
        if (!ok || (r === 2 && c === 2) || !cmd.includes('L') && !cmd.includes('R')) continue;
        return { kind: 'choice', promptHtml: `<span class="countline">${cmd.map((x) => `<b class="${x === 'F' ? '' : 'times'}">${x}</b>`).join('')}</span>`, prompt: 'Where does it stop?', options: range(n * n).map((i) => ({ label: i === 12 ? '★' : '', value: i, cls: 'tile cellbtn', aria: `Row ${Math.floor(i / n) + 1} column ${(i % n) + 1}` })), answer: r * n + c, cols: n }; }
      throw new Error('tile gen');
    } }),
  std({ num: 159, title: 'Occlusion Detective', max: 12,
    how: ['A shape is partly hidden behind a box.', 'Use the visible part to work out which shape it is.', 'More of it is hidden as you improve, but there is always enough to decide.'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 300; g++) {
        const opts = rng.sample(POLY.map((p) => shift(p)), 4), tgt = opts[0], hidden = new Set(); const cover = Math.min(0.6, 0.25 + lv * 0.03);
        const r0 = rng.int(0, 2), c0 = rng.int(0, 2), hh = rng.int(2, 3), ww = rng.int(2, 3); for (let r = r0; r < r0 + hh; r++) for (let c = c0; c < c0 + ww; c++) hidden.add(r * 5 + c);
        if (tgt.filter((x) => hidden.has(x)).length / tgt.length < cover - 0.15) continue;
        const vis = (p) => range(25).filter((i) => !hidden.has(i)).map((i) => +p.includes(i)).join('');
        if (opts.slice(1).some((o) => vis(o) === vis(tgt))) continue;
        const pic = (p, mask) => gridSVG(range(25).map((i) => ({ fill: mask && hidden.has(i) ? '#3b2f55' : p.includes(i) ? '#7ef0ff' : 'rgba(255,255,255,.04)', stroke: mask && hidden.has(i) ? '#3b2f55' : 'transparent' })), 5, { gap: 1, round: 1 });
        return { kind: 'choice', promptHtml: pic(tgt, true), prompt: 'Which shape is behind the box?', options: rng.shuffle(opts).map((p) => ({ html: pic(p, false), value: key(p), cls: 'tile' })), answer: key(tgt), cols: 4 };
      }
      throw new Error('occ gen');
    } }),
  std({ num: 160, title: 'Construction Blueprint', max: 12,
    how: ['A blueprint gives the outline seen from the FRONT and from the RIGHT side.', 'Each option is a top-down plan where numbers are tower heights.', 'Pick the only plan that matches both views.'],
    makeTrial(rng, lv) {
      const n = lv <= 5 ? 2 : 3, mx = Math.min(4, 2 + Math.floor(lv / 4)), mk = () => range(n * n).map(() => rng.int(0, mx));
      const F = (hm) => range(n).map((c) => Math.max(...range(n).map((r) => hm[r * n + c]))), S = (hm) => range(n).map((r) => Math.max(...range(n).map((c) => hm[(n - 1 - r) * n + c])));
      const hm = mk(), f = F(hm), s = S(hm), ok = (x) => F(x).join() === f.join() && S(x).join() === s.join(); if (f.every((v) => !v)) return this.makeTrial(rng, lv);
      const ds = []; for (let g = 0; g < 300 && ds.length < 3; g++) { const x = hm.map((v) => (rng.chance(0.4) ? Math.max(0, Math.min(mx, v + rng.pick([-1, 1]))) : v)); if (!ok(x) && !ds.some((d) => d.join() === x.join())) ds.push(x); }
      const prof = (p) => `<svg viewBox="0 0 100 100" class="gl">${p.map((v, i) => range(v).map((z) => `<rect x="${i * (100 / n) + 1}" y="${96 - (z + 1) * 22}" width="${100 / n - 2}" height="20" rx="2" fill="#8fc1ff" stroke="#0b0f22"/>`).join('')).join('')}<path d="M0 98H100" stroke="#fff6"/></svg>`;
      const plan = (x) => gridSVG(x.map((v) => ({ fill: v ? '#2a5aa8' : 'rgba(255,255,255,.05)', label: String(v) })), n, { gap: 4, round: 4 });
      return { kind: 'choice', promptHtml: `<span class="pair"><span class="ref">${prof(f)}<small>front</small></span><span class="ref">${prof(s)}<small>right side</small></span></span>`, prompt: 'Which plan? (bottom edge = front)', options: rng.shuffle([hm, ...ds]).map((x) => ({ html: plan(x), value: x.join(''), cls: 'tile' })), answer: hm.join(''), cols: 2 };
    } }),
];
