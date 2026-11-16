// Concepts 121–140: planning and executive organisation.
import { std, runTrial } from '../play.js';
import { h, now, audio } from '../engine.js';
import { tok, card, mc, numOpts, yesNo, HUES, range, sum, permutations } from '../gfx.js';

const L = 'ABCDEFGH';
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const routeLen = (pts, depot, order) => { let d = 0, cur = depot; for (const i of order) { d += dist(cur, pts[i]); cur = pts[i]; } return d + dist(cur, depot); };
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
function gridMap(n, { walls = [], marks = {}, paths = [], closed = [], size = 220 } = {}) {
  const c = size / n; let s = `<rect width="${size}" height="${size}" rx="10" fill="rgba(255,255,255,.04)"/>`;
  for (let i = 0; i <= n; i++) s += `<path d="M${i * c} 0V${size}M0 ${i * c}H${size}" stroke="rgba(255,255,255,.08)"/>`;
  walls.forEach((w) => (s += `<rect x="${(w % n) * c + 2}" y="${Math.floor(w / n) * c + 2}" width="${c - 4}" height="${c - 4}" rx="4" fill="#3b2f55"/>`));
  closed.forEach(([a, b]) => { const x = ((a % n) + (b % n) + 1) * c / 2, y = (Math.floor(a / n) + Math.floor(b / n) + 1) * c / 2; s += `<text x="${x}" y="${y + 7}" text-anchor="middle" font-size="${c * 0.7}" font-weight="900" fill="#ff3b4f">✕</text>`; });
  paths.forEach(([p, col]) => (s += `<polyline points="${p.map((i) => `${(i % n) * c + c / 2},${Math.floor(i / n) * c + c / 2}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${c * 0.22}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`));
  Object.entries(marks).forEach(([i, l]) => (s += `<circle cx="${(i % n) * c + c / 2}" cy="${Math.floor(i / n) * c + c / 2}" r="${c * 0.36}" fill="${l === 'S' ? '#7ef0ff' : l === 'G' ? '#ffd84a' : '#ff7ac6'}"/><text x="${(i % n) * c + c / 2}" y="${Math.floor(i / n) * c + c / 2 + c * 0.15}" text-anchor="middle" font-size="${c * 0.42}" font-weight="900" fill="#150f2c">${l}</text>`));
  return `<svg viewBox="0 0 ${size} ${size}" class="gl mapsvg">${s}</svg>`;
}
const nb = (i, n) => { const r = Math.floor(i / n), c = i % n, o = []; if (r > 0) o.push(i - n); if (r < n - 1) o.push(i + n); if (c > 0) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
function bfsPath(n, s, g, blocked = new Set(), cut = new Set()) {
  const prev = new Map([[s, -1]]), q = [s];
  while (q.length) { const x = q.shift(); if (x === g) break; for (const y of nb(x, n)) { if (blocked.has(y) || prev.has(y) || cut.has(Math.min(x, y) + ':' + Math.max(x, y))) continue; prev.set(y, x); q.push(y); } }
  if (!prev.has(g)) return null; const p = []; for (let x = g; x !== -1; x = prev.get(x)) p.unshift(x); return p;
}

export const G = [
  std({ num: 121, title: 'Delivery Planner', max: 12,
    how: ['Start at the depot (D), visit every drop-off point, and return to the depot.', 'Tap the points in the order you would visit them.', 'Your route must be within the distance budget, which gets tighter as you improve.'],
    makeTrial(rng, lv) {
      const k = Math.min(7, 3 + Math.floor(lv / 2)), pts = []; while (pts.length < k) { const p = [rng.int(1, 9), rng.int(1, 9)]; if (!pts.some((q) => dist(p, q) < 1.6) && dist(p, [5, 5]) > 1.5) pts.push(p); }
      const depot = [5, 5]; let best = null, bl = 1e9; for (const o of permutations(range(k))) { const d = routeLen(pts, depot, o); if (d < bl - 1e-9) { bl = d; best = o; } }
      const slack = Math.max(0.03, 0.25 - lv * 0.02), budget = +(bl * (1 + slack)).toFixed(1);
      const svg = `<svg viewBox="0 0 100 100" class="gl mapsvg"><rect width="100" height="100" rx="8" fill="rgba(255,255,255,.04)"/>${range(11).map((i) => `<path d="M${i * 10} 0V100M0 ${i * 10}H100" stroke="rgba(255,255,255,.05)"/>`).join('')}<rect x="44" y="44" width="12" height="12" rx="3" fill="#7ef0ff"/><text x="50" y="53.5" text-anchor="middle" font-size="8" font-weight="900" fill="#041a1f">D</text>${pts.map((p, i) => `<circle cx="${p[0] * 10}" cy="${p[1] * 10}" r="5.5" fill="#ff7ac6"/><text x="${p[0] * 10}" y="${p[1] * 10 + 3}" text-anchor="middle" font-size="7" font-weight="900" fill="#150f2c">${L[i]}</text>`).join('')}</svg>`;
      return { kind: 'order', promptHtml: `${svg}<span class="rule">Budget: ${budget} km (best possible ${bl.toFixed(1)} km)</span>`, items: range(k).map((i) => ({ label: L[i], value: i })), answer: best, pts, depot, budget, prompt: 'Tap stops in visiting order' };
    },
    check: (t, r) => r.length === t.pts.length && routeLen(t.pts, t.depot, r) <= t.budget + 1e-9,
    hint: 'Any route within budget counts.' }),
  std({ num: 122, title: 'Calendar Tetris', max: 12,
    how: ['Your day already has some fixed appointments (grey).', 'Choose a start time for each new appointment so nothing overlaps.', 'More appointments and, later, 30-minute travel gaps between places.'],
    makeTrial(rng, lv) {
      const day = range(9).map((i) => 9 + i), fixed = new Set(rng.sample(range(8), Math.min(3, 1 + Math.floor(lv / 4)))), k = Math.min(4, 2 + Math.floor(lv / 4)), gap = lv >= 8;
      const N = ['Dentist', 'Haircut', 'Call with Juno', 'Gym', 'Lunch with Rhea', 'Bank'].slice(0, 6);
      for (let tries = 0; tries < 200; tries++) {
        const appts = rng.sample(N, k).map((n) => ({ n, d: rng.pick(lv >= 5 ? [1, 2] : [1]) })), free = range(8).filter((h_) => !fixed.has(h_));
        const sol = {}, used = new Set(fixed);
        const fits = (s, d) => s + d <= 8 && range(d).every((x) => !used.has(s + x)) && (!gap || (!used.has(s - 1) && !used.has(s + d)));
        const bt = (i) => { if (i === appts.length) return true; for (const s of rng.shuffle(free)) if (fits(s, appts[i].d)) { range(appts[i].d).forEach((x) => used.add(s + x)); sol[i] = s; if (bt(i + 1)) return true; range(appts[i].d).forEach((x) => used.delete(s + x)); } return false; };
        if (!bt(0)) continue;
        const cal = `<span class="cal">${range(8).map((h_) => `<span class="${fixed.has(h_) ? 'busy' : ''}"><small>${9 + h_}:00</small>${fixed.has(h_) ? 'Busy' : ''}</span>`).join('')}</span><span class="pack">${appts.map((a) => tok(`${a.n} · ${a.d}h`, 200)).join('')}</span>${gap ? '<span class="rule">Leave a free hour before and after each new appointment.</span>' : ''}`;
        const answer = {}; appts.forEach((a, i) => (answer[JSON.stringify(a.n)] = 9 + sol[i]));
        return { kind: 'assign', left: appts.map((a) => ({ label: `${a.n} (${a.d}h)`, value: a.n, html: cal })), right: day.slice(0, 8).map((x) => ({ label: `${x}:00`, value: x })), answer, prompt: 'Start time for', cols: 4, appts, fixed: [...fixed], gap };
      }
      return this.makeTrial(rng, Math.max(1, lv - 2));
    },
    check(t, resp) {
      const used = new Set(t.fixed); const blocks = [];
      for (const a of t.appts) { const s = resp[JSON.stringify(a.n)] - 9; if (!(s >= 0) || s + a.d > 8) return false; for (let x = 0; x < a.d; x++) { if (used.has(s + x)) return false; used.add(s + x); } blocks.push([s, a.d]); }
      if (t.gap) for (const [s, d] of blocks) { const others = new Set(t.fixed); blocks.forEach(([s2, d2]) => { if (s2 !== s) for (let x = 0; x < d2; x++) others.add(s2 + x); }); if (others.has(s - 1) || others.has(s + d)) return false; }
      return true;
    } }),
  std({ num: 123, title: 'Kitchen Conductor', max: 12,
    how: ['Several dishes must all be ready at exactly 6:00 pm.', 'Each card shows prep time and cooking time; from level 6 some dishes also need resting time after cooking.', 'Choose when to START the dish asked about.'],
    makeTrial(rng, lv) {
      const D = ['Soup', 'Roast', 'Rice', 'Pie', 'Greens', 'Bread'], k = Math.min(4, 2 + Math.floor(lv / 4)), T = 18 * 60;
      const dishes = rng.sample(D, k).map((n) => ({ n, p: rng.pick([5, 10, 15, 20]), c: rng.pick([10, 15, 20, 30, 40, 45, 60, 75]), r: lv >= 6 && rng.chance(0.5) ? rng.pick([5, 10, 15]) : 0 }));
      const q = rng.int(0, k - 1), d = dishes[q], ans = T - d.p - d.c - d.r, opts = [...new Set([ans, ans + d.p, ans + d.r || ans - 5, T - d.c, ans - 10])].slice(0, 4);
      return { kind: 'choice', promptHtml: `<span class="rule">Everything must be ready at 6:00 pm</span><span class="cards">${dishes.map((x, i) => card(x.n, `prep ${x.p} · cook ${x.c}${x.r ? ` · rest ${x.r}` : ''} min`, HUES[i * 2])).join('')}</span>`, prompt: `When should you start the ${d.n}?`,
        options: opts.map((m) => ({ label: hm(m - 12 * 60) + ' pm', value: m })), answer: ans, cols: 2, explain: `6:00 pm minus ${d.p + d.c + d.r} minutes = ${hm(ans - 12 * 60)} pm.` };
    } }),
  std({ num: 124, title: 'Limited Moves', max: 12, practiceTrials: 1,
    how: ['The puck slides on ice until it hits a rock or the wall. It cannot stop in the middle.', 'Get it to STOP on the gold target.', 'You get exactly the minimum number of moves (plus one at low levels). Think before you slide.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 5 : lv <= 8 ? 6 : 7;
      for (let tries = 0; tries < 300; tries++) {
        const rocks = new Set(rng.sample(range(n * n), Math.floor(n * n * 0.18))), start = rng.pick(range(n * n).filter((i) => !rocks.has(i)));
        const slide = (i, d) => { const D = [[-1, 0], [1, 0], [0, -1], [0, 1]][d]; let r = Math.floor(i / n), c = i % n; for (;;) { const nr = r + D[0], nc = c + D[1]; if (nr < 0 || nc < 0 || nr >= n || nc >= n || rocks.has(nr * n + nc)) break; r = nr; c = nc; } return r * n + c; };
        const dd = new Map([[start, 0]]), q = [start]; while (q.length) { const x = q.shift(); for (let d = 0; d < 4; d++) { const y = slide(x, d); if (!dd.has(y)) { dd.set(y, dd.get(x) + 1); q.push(y); } } }
        const want = Math.min(7, 2 + Math.floor(lv / 2)), goals = [...dd].filter(([, v]) => v === want); if (!goals.length) continue;
        const [goal, m] = rng.pick(goals);
        return { kind: 'choice', n, rocks: [...rocks].sort((a, b) => a - b), start, goal, min: m, budget: m + (lv <= 3 ? 1 : 0), prompt: '', options: [{ label: 'a', value: 0 }, { label: 'b', value: 1 }], answer: 0 };
      }
      throw new Error('ice gen');
    },
    async play(t, ctx) {
      const { n } = t, rocks = new Set(t.rocks); let pos = t.start, moves = 0;
      const cells = range(n * n).map((i) => h('span', { class: 'mz ice' + (rocks.has(i) ? ' wall rock' : '') + (i === t.goal ? ' goal' : '') }));
      const status = h('div', { class: 'status' }); const draw = () => { cells.forEach((c, i) => c.classList.toggle('me', i === pos)); status.textContent = `Moves: ${moves} / ${t.budget}`; };
      let done; const slide = (d) => { const D = [[-1, 0], [1, 0], [0, -1], [0, 1]][d]; let r = Math.floor(pos / n), c = pos % n; for (;;) { const nr = r + D[0], nc = c + D[1]; if (nr < 0 || nc < 0 || nr >= n || nc >= n || rocks.has(nr * n + nc)) break; r = nr; c = nc; } pos = r * n + c; moves++; audio.tone(500, 0.12, 'sine', 0.1); draw(); if (pos === t.goal) done(true); else if (moves >= t.budget) done(false); };
      const btn = (d, l) => h('button', { class: 'key fn', type: 'button', onclick: () => slide(d) }, l);
      const onKey = (e) => { const m = { ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3 }[e.key]; if (m != null) { e.preventDefault(); slide(m); } };
      document.addEventListener('keydown', onKey);
      ctx.stage.replaceChildren(h('div', { class: 'trial' }, status, h('div', { class: 'maze', style: { '--n': n } }, cells), h('div', { class: 'dpad' }, h('span'), btn(0, '▲'), h('span'), btn(2, '◀'), btn(1, '▼'), btn(3, '▶')), ctx.practice ? h('p', { class: 'hint' }, `Shortest solution: ${t.min} moves.`) : null));
      draw(); const ok = await new Promise((r) => (done = r)); document.removeEventListener('keydown', onKey); await ctx.sleep(ok ? 500 : 900);
      return { correct: ok, rt: null, tags: { movesUsed: moves }, explain: ok ? '' : `It can be done in ${t.min} moves. Plan the whole path before the first slide.` };
    } }),
  std({ num: 125, title: 'Priority Desk', max: 12,
    how: ['Each task shows how long it takes and how much value it loses for every hour it waits.', 'Order the tasks to lose as little value as possible in total.', 'More tasks as you improve. Any order that matches the best total counts.'],
    makeTrial(rng, lv) {
      const N = ['Invoice', 'Report', 'Calls', 'Emails', 'Design', 'Review', 'Backup'], k = Math.min(6, 3 + Math.floor(lv / 3)), tasks = rng.sample(N, k).map((n) => ({ n, p: rng.int(1, 4), w: rng.int(1, 6) }));
      const cost = (o) => { let t = 0, c = 0; for (const i of o) { t += tasks[i].p; c += t * tasks[i].w; } return c; };
      const best = [...range(k)].sort((a, b) => tasks[b].w / tasks[b].p - tasks[a].w / tasks[a].p);
      return { kind: 'order', textItems: true, items: tasks.map((x, i) => ({ label: `${x.n} · ${x.p}h · loses ${x.w}/h`, value: i })), answer: best, tasks, best: cost(best), prompt: 'First task first. Total loss = Σ (finish hour × loss per hour)' };
    },
    check(t, r) { let tt = 0, c = 0; for (const i of r) { tt += t.tasks[i].p; c += tt * t.tasks[i].w; } return r.length === t.tasks.length && c <= t.best; },
    hint: 'Tip: compare loss per hour divided by hours needed.' }),
  std({ num: 126, title: 'Warehouse Stack', max: 12,
    how: ['Crates are stacked in one tall pile. You can only lift the top crate.', 'To reach a crate, crates above it are lifted off and put back on top in the same order.', 'Count how many crate lifts the whole pick list needs (taking the picked crate itself counts as one).'],
    makeTrial(rng, lv) {
      const k = Math.min(7, 3 + Math.floor(lv / 2)), stack = rng.shuffle(L.slice(0, k).split('')), picks = rng.sample(stack, Math.min(k, 2 + Math.floor(lv / 3)));
      let s = [...stack], lifts = 0; for (const p of picks) { const i = s.indexOf(p), above = s.slice(i + 1); lifts += above.length + 1; s = [...s.slice(0, i), ...above]; }
      return { kind: 'numeric', promptHtml: `<span class="stackv">${[...stack].reverse().map((c) => `<b>${c}</b>`).join('')}</span><span class="rule">Pick list: ${picks.join(' → ')}</span>`, prompt: 'Total lifts?', answer: lifts };
    } }),
  std({ num: 127, title: 'Battery Expedition', max: 12,
    how: ['Your rover’s battery holds a fixed charge. Each leg of a route uses some charge.', '⚡ stations recharge it to full.', 'Pick the only route that reaches the summit without running out.'],
    makeTrial(rng, lv) {
      const B = rng.int(8, 12), legs = Math.min(6, 3 + Math.floor(lv / 3)), mk = () => { const r = []; for (let i = 0; i < legs; i++) { r.push(rng.int(2, B - 2)); if (i < legs - 1 && rng.chance(0.35)) r.push('⚡'); } return r; };
      const ok = (r) => { let c = B; for (const x of r) { if (x === '⚡') c = B; else { c -= x; if (c < 0) return false; } } return true; };
      let good = null, bad = []; for (let g = 0; g < 2000 && (!good || bad.length < 3); g++) { const r = mk(); if (ok(r)) { if (!good) good = r; } else if (bad.length < 3 && !bad.some((b) => b.join() === r.join())) bad.push(r); }
      const lab = (r) => r.map((x) => (x === '⚡' ? '⚡' : `−${x}`)).join('  ');
      return { kind: 'choice', promptHtml: `<span class="rule">Battery: ${B} units, starts full</span>`, prompt: 'Which route makes it?', options: rng.shuffle([good, ...bad]).map((r, i) => ({ label: lab(r), value: lab(r) })), answer: lab(good), cols: 1 };
    } }),
  std({ num: 128, title: 'Dependency Builder', max: 12,
    how: ['Each project task lists what must be finished before it.', 'Tap the tasks in an order that respects every requirement.', 'More tasks and parallel branches as you improve. Any valid order counts.'],
    makeTrial(rng, lv) {
      const T = ['Survey site', 'Pour foundation', 'Frame walls', 'Install wiring', 'Install plumbing', 'Hang drywall', 'Paint', 'Lay flooring', 'Fit kitchen', 'Final inspection'];
      const k = Math.min(8, 4 + Math.floor(lv / 2)), names = rng.sample(T, k), order = rng.shuffle(range(k)), pre = range(k).map(() => []);
      for (let j = 1; j < k; j++) { const t = order[j], m = rng.int(1, Math.min(2, j)); rng.sample(order.slice(0, j), m).forEach((x) => pre[t].push(x)); }
      return { kind: 'order', textItems: true, items: rng.shuffle(range(k)).map((i) => ({ label: `${names[i]}${pre[i].length ? `  ⟵ needs ${pre[i].map((x) => names[x]).join(', ')}` : ''}`, value: i })), answer: order, pre, prompt: 'Tap tasks in a valid build order' };
    },
    check(t, r) { const done = new Set(); for (const i of r) { if (!t.pre[i].every((x) => done.has(x))) return false; done.add(i); } return done.size === t.pre.length; } }),
  std({ num: 129, title: 'Travel Buffer', max: 12,
    how: ['You must arrive by the meeting time. The bus takes a set time but can be delayed; the chances are shown.', 'Choose the LATEST departure that still gets you there on time with at least the required chance.', 'More delay possibilities as you improve.'],
    makeTrial(rng, lv) {
      const ride = rng.pick([20, 25, 30, 35, 40]), meet = 9 * 60 + rng.pick([0, 15, 30]), need = rng.pick(lv <= 4 ? [0.8, 0.9] : [0.85, 0.9, 0.95]);
      const delays = lv <= 4 ? [[0, 0.7], [10, 0.2], [25, 0.1]] : [[0, 0.5], [5, 0.2], [15, 0.15], [30, 0.1], [45, 0.05]];
      const deps = range(8).map((i) => meet - ride - 50 + i * 10), pOn = (d) => sum(delays.filter(([x]) => d + ride + x <= meet).map(([, p]) => p));
      const okD = deps.filter((d) => pOn(d) >= need - 1e-9), ans = Math.max(...okD), opts = [...new Set([ans, ans + 10, ans - 10, ans + 20])].filter((d) => deps.includes(d));
      return { kind: 'choice', promptHtml: `<span class="rule">Meeting at ${hm(meet)} · bus ride ${ride} min · need ≥ ${Math.round(need * 100)}% chance</span><span class="memo list">${delays.map(([x, p]) => `<span>Delay ${x} min: ${Math.round(p * 100)}%</span>`).join('')}</span>`, prompt: 'Latest safe departure?', options: opts.map((d) => ({ label: hm(d), value: d })), answer: ans, cols: 2 };
    } }),
  std({ num: 130, title: 'Packing Constraints', max: 12,
    how: ['Your pack has a weight limit. Items marked ★ must come.', 'Choose the packing list that fits, includes every ★ item, and carries the MOST value.', 'More items and tighter limits as you improve.'],
    makeTrial(rng, lv) {
      const N = ['Tent', 'Stove', 'Rope', 'Camera', 'Book', 'Lantern', 'Water filter', 'Fleece', 'Map'], k = Math.min(8, 4 + Math.floor(lv / 2)), it = rng.sample(N, k).map((n) => ({ n, w: rng.int(1, 6), v: rng.int(1, 9) })), req = new Set(rng.sample(range(k), lv >= 4 ? 1 : 0));
      const cap = Math.max(...it.map((x) => x.w), Math.round(sum(it.map((x) => x.w)) * 0.5)), sets = [];
      for (let m = 0; m < 1 << k; m++) { const s = range(k).filter((i) => m & (1 << i)); sets.push({ s, w: sum(s.map((i) => it[i].w)), v: sum(s.map((i) => it[i].v)), ok: [...req].every((r) => s.includes(r)) }); }
      const valid = sets.filter((x) => x.w <= cap && x.ok), bestV = Math.max(...valid.map((x) => x.v)), bests = valid.filter((x) => x.v === bestV), best = bests[0];
      const lab = (x) => x.s.map((i) => it[i].n).join(', ') || '(nothing)';
      const ds = rng.shuffle([...valid.filter((x) => x.v < bestV && x.v >= bestV - 6), ...sets.filter((x) => x.w > cap && x.v > bestV).slice(0, 20), ...sets.filter((x) => !x.ok && x.w <= cap && x.v >= bestV)]).slice(0, 3);
      return { kind: 'choice', promptHtml: `<span class="rule">Limit: ${cap} kg</span><span class="pack">${it.map((x, i) => tok(`${req.has(i) ? '★ ' : ''}${x.n} · ${x.w}kg · value ${x.v}`, HUES[i % 9])).join('')}</span>`, prompt: 'Best valid packing?', options: mc(rng, { label: lab(best), value: lab(best) }, ds.map((x) => ({ label: lab(x), value: lab(x) })), 4), answer: lab(best), cols: 1 };
    } }),
  std({ num: 131, title: 'Rescue Sequence', max: 12,
    how: ['Hikers must cross a river in a small boat with a weight limit. Someone must be in the boat to row it, including on the way back.', 'Work out the MINIMUM number of crossings (each trip one way counts as one).', 'More hikers and tighter limits as you improve.'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 200; g++) {
        const n = Math.min(5, 3 + Math.floor(lv / 4)), w = range(n).map(() => rng.pick([40, 50, 60, 70, 80, 90])), cap = rng.pick([100, 120, 130, 140, 150]); if (Math.max(...w) > cap) continue;
        const full = (1 << n) - 1, start = full * 2 + 0, seen = new Map([[start, 0]]), q = [start]; let res = null;
        while (q.length) { const st = q.shift(), left = st >> 1, boatLeft = !(st & 1); if (left === 0) { res = seen.get(st); break; }
          const side = boatLeft ? left : full & ~left; for (let m = side; m; m = (m - 1) & side) { const wt = sum(range(n).filter((i) => m & (1 << i)).map((i) => w[i])); if (wt > cap) continue; const nl = boatLeft ? left & ~m : left | m, ns = (nl << 1) | (boatLeft ? 1 : 0); if (!seen.has(ns)) { seen.set(ns, seen.get(st) + 1); q.push(ns); } } }
        if (res == null || res < 3) continue;
        return { kind: 'choice', promptHtml: `<span class="rule">Boat limit: ${cap} kg</span><span class="pack">${w.map((x, i) => tok(`${String.fromCharCode(65 + i)} · ${x} kg`, HUES[i * 2])).join('')}</span>`, prompt: 'Minimum crossings to get everyone across?', options: numOpts(rng, res, 4, 2), answer: res, cols: 4 };
      }
      throw new Error('rescue gen');
    } }),
  std({ num: 132, title: 'Maintenance Window', max: 12,
    how: ['Each machine needs one hour of maintenance during the shift.', 'At least the required number of machines must keep running every hour, and a machine cannot be serviced during its busy hour (✕).', 'Pick the only schedule that works.'],
    makeTrial(rng, lv) {
      const m = Math.min(5, 3 + Math.floor(lv / 4)), H = Math.min(5, m), need = m - 1 - (lv >= 8 ? 0 : 0), busy = range(m).map(() => rng.int(0, H - 1));
      const valid = (s) => s.every((x, i) => x !== busy[i]) && range(H).every((hh) => s.filter((x) => x === hh).length <= m - need);
      const all = []; const rec = (acc) => { if (acc.length === m) { all.push(acc); return; } for (let x = 0; x < H; x++) rec([...acc, x]); }; rec([]);
      const good = all.filter(valid), bad = all.filter((s) => !valid(s)); if (!good.length) return this.makeTrial(rng, lv);
      const g = rng.pick(good), ds = rng.sample(bad.filter((s) => s.filter((x, i) => x !== g[i]).length <= 2), 3);
      const lab = (s) => s.map((x, i) => `M${i + 1}@${x + 1}`).join(' · ');
      return { kind: 'choice', promptHtml: `<span class="rule">${m} machines, ${H} hours · at least ${need} must run every hour</span><span class="cal grid2" style="--h:${H}">${range(m).map((i) => `<span><b>M${i + 1}</b>${range(H).map((hh) => `<i>${hh === busy[i] ? '✕' : hh + 1}</i>`).join('')}</span>`).join('')}</span>`, prompt: 'Which schedule works? (machine@hour)', options: rng.shuffle([g, ...ds]).map((s) => ({ label: lab(s), value: lab(s) })), answer: lab(g), cols: 1 };
    } }),
  std({ num: 133, title: 'Goal Decomposer', max: 10,
    how: ['A goal is broken into possible steps, some needed and some not.', 'Select only the steps that are actually REQUIRED to reach the goal.', 'More tempting extras as you improve.'],
    makeTrial(rng, lv) {
      const GOALS = [['Host a picnic in the park', ['Pick a date', 'Invite guests', 'Prepare food', 'Pack blankets'], ['Buy a new car', 'Repaint the house', 'Learn French', 'Book a hotel']],
        ['Mail a birthday card abroad', ['Buy a card', 'Write the message', 'Address the envelope', 'Buy international postage'], ['Bake a cake', 'Call the bank', 'Book a flight', 'Buy wrapping paper']],
        ['Plant a vegetable bed', ['Choose a sunny spot', 'Prepare the soil', 'Buy seeds', 'Water the seeds'], ['Build a greenhouse', 'Hire a gardener', 'Buy a lawnmower', 'Paint the fence']],
        ['Cook pasta for dinner', ['Boil water', 'Add the pasta', 'Make or heat a sauce', 'Drain the pasta'], ['Preheat the oven', 'Knead dough', 'Marinate overnight', 'Set the table for ten']],
        ['Run a 5 km race', ['Register for the race', 'Train regularly', 'Get running shoes', 'Arrive at the start line'], ['Buy a treadmill', 'Hire a coach', 'Run a marathon first', 'Join a gym']],
        ['Make a short video', ['Plan the shots', 'Record the footage', 'Edit the clips', 'Export the video'], ['Buy a cinema camera', 'Rent a studio', 'Hire actors', 'Write a novel']]];
      const [g, req, extra] = rng.pick(GOALS), ex = rng.sample(extra, Math.min(4, 2 + Math.floor(lv / 3)));
      return { kind: 'multi', promptHtml: `<span class="rule">Goal: ${g}</span>`, items: rng.shuffle([...req, ...ex]).map((x) => ({ label: x, value: x })), answer: req, prompt: 'Select every required step', cols: 2 };
    } }),
  std({ num: 134, title: 'Replanning Storm', max: 12,
    how: ['You were driving the planned route when a storm closed a road (red ✕).', 'Choose the SHORTEST route from S to G that avoids the closure.', 'More closures as you improve.'],
    makeTrial(rng, lv) {
      const n = lv <= 5 ? 5 : 6;
      for (let g = 0; g < 300; g++) {
        const walls = new Set(rng.sample(range(n * n), Math.floor(n * n * 0.15))), s = rng.pick(range(n * n).filter((i) => !walls.has(i))), goal = rng.pick(range(n * n).filter((i) => !walls.has(i) && i !== s));
        const p0 = bfsPath(n, s, goal, walls); if (!p0 || p0.length < 5) continue;
        const cut = new Set(); const closures = []; for (let c = 0; c < Math.min(3, 1 + Math.floor(lv / 4)); c++) { const k = rng.int(1, p0.length - 2), a = p0[k], b = p0[k + 1]; cut.add(Math.min(a, b) + ':' + Math.max(a, b)); closures.push([a, b]); }
        const p1 = bfsPath(n, s, goal, walls, cut); if (!p1) continue;
        const alt = bfsPath(n, s, goal, new Set([...walls, p1[Math.floor(p1.length / 2)]]), cut);
        const cand = [p1, p0, alt].filter(Boolean); if (cand.length < 3 || alt.length <= p1.length) continue;
        const marks = { [s]: 'S', [goal]: 'G' };
        const opts = [{ v: 'best', p: p1 }, { v: 'old', p: p0 }, { v: 'long', p: alt }].map((o, i) => ({ html: gridMap(n, { walls: [...walls], marks, closed: closures, paths: [[o.p, ['#7ef0ff', '#ff7ac6', '#ffd84a'][i]]] }), value: o.v, cls: 'tile', aria: `Route ${i + 1}` }));
        return { kind: 'choice', promptHtml: gridMap(n, { walls: [...walls], marks, closed: closures }), prompt: 'Shortest open route?', options: rng.shuffle(opts), answer: 'best', cols: 3 };
      }
      throw new Error('storm gen');
    } }),
  std({ num: 135, title: 'Budget Builder', max: 12,
    how: ['You have a fixed budget of tokens. Each project costs tokens and adds to Health and/or Education scores.', 'Projects are all-or-nothing. Pick the plan that meets BOTH targets without going over budget.', 'Exactly one plan works. Tighter budgets as you improve.'],
    makeTrial(rng, lv) {
      const N = ['Clinic', 'Library', 'Park', 'Clean water', 'Tutoring', 'Bike lanes', 'Lab'], k = Math.min(6, 4 + Math.floor(lv / 4)), P = rng.sample(N, k).map((n) => ({ n, c: rng.int(2, 7), h: rng.int(0, 5), e: rng.int(0, 5) }));
      const sets = []; for (let m = 1; m < 1 << k; m++) { const s = range(k).filter((i) => m & (1 << i)); sets.push({ s, c: sum(s.map((i) => P[i].c)), h: sum(s.map((i) => P[i].h)), e: sum(s.map((i) => P[i].e)) }); }
      for (let tries = 0; tries < 100; tries++) {
        const tgt = rng.pick(sets), B = tgt.c, Ht = tgt.h, Et = tgt.e; const ok = (x) => x.c <= B && x.h >= Ht && x.e >= Et;
        const goods = sets.filter(ok); if (goods.length !== 1) continue;
        const ds = rng.sample(sets.filter((x) => !ok(x)), 3), lab = (x) => x.s.map((i) => P[i].n).join(' + ');
        return { kind: 'choice', promptHtml: `<span class="rule">Budget ${B} tokens · need Health ≥ ${Ht} and Education ≥ ${Et}</span><span class="pack">${P.map((p, i) => tok(`${p.n}: ${p.c}🪙 · H+${p.h} · E+${p.e}`, HUES[i * 2 % 9])).join('')}</span>`, prompt: 'Which plan works?', options: rng.shuffle([goods[0], ...ds]).map((x) => ({ label: lab(x), value: lab(x) })), answer: lab(goods[0]), cols: 1 };
      }
      return this.makeTrial(rng, lv);
    } }),
  std({ num: 136, title: 'Queue Manager', max: 12,
    how: ['Customers are waiting for jobs of different lengths. Everyone waits until their own job is finished.', 'Order the jobs so the TOTAL waiting time is as small as possible.', 'More jobs as you improve. Any order that achieves the minimum counts.'],
    makeTrial(rng, lv) {
      const k = Math.min(7, 3 + Math.floor(lv / 2)), names = rng.sample(['Ana', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gil'], k), d = names.map(() => rng.int(1, 12)), best = [...range(k)].sort((a, b) => d[a] - d[b]);
      const tot = (o) => { let t = 0, s = 0; for (const i of o) { t += d[i]; s += t; } return s; };
      return { kind: 'order', items: names.map((n, i) => ({ label: `${n} · ${d[i]}m`, value: i })), answer: best, d, best: tot(best), prompt: 'First served first' };
    },
    check(t, r) { let tt = 0, s = 0; for (const i of r) { tt += t.d[i]; s += tt; } return r.length === t.d.length && s <= t.best; } }),
  std({ num: 137, title: 'Checkpoint Planner', max: 12,
    how: ['An expedition has several stages, each takes 1 hour and fails with the chance shown. On failure you go back to your last checkpoint.', 'Setting a checkpoint costs time. Too few means long re-runs; too many wastes time.', 'Pick the checkpoint spacing with the lowest EXPECTED total time.'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 200; g++) {
        const N = 12, p = rng.pick([0.05, 0.1, 0.15, 0.2, 0.25]), c = rng.pick([0.25, 0.5, 1, 1.5, 2]), q = 1 - p;
        const E = (k) => { const blocks = N / k, Ek = (Math.pow(q, -k) - 1) / (1 - q); return blocks * Ek + (blocks - 1) * c; };
        const ks = [1, 2, 3, 4, 6, 12], vals = ks.map(E), best = ks[vals.indexOf(Math.min(...vals))], sorted = [...vals].sort((a, b) => a - b);
        if (sorted[1] / sorted[0] < 1.03) continue;
        const opts = rng.sample(ks.filter((k) => k !== best), 3).concat([best]);
        return { kind: 'choice', promptHtml: `<span class="rule">12 stages · failure chance ${Math.round(p * 100)}% per stage · each checkpoint costs ${c} h</span>`, prompt: 'Checkpoint every… stages', options: rng.shuffle(opts).map((k) => ({ label: k === 12 ? 'No checkpoints' : `every ${k}`, value: k })), answer: best, cols: 2, explain: `Expected hours: ${ks.map((k, i) => `${k === 12 ? 'none' : 'every ' + k}: ${vals[i].toFixed(1)}`).join(', ')}.` };
      }
      throw new Error('checkpoint gen');
    } }),
  std({ num: 138, title: 'Tool Before Task', max: 12,
    how: ['You have a list of repairs to do on one trip.', 'Each repair needs certain tools. Pack exactly the tools needed for ALL of them, and nothing else.', 'More repairs and shared tools as you improve.'],
    makeTrial(rng, lv) {
      const R = { 'Fix a leaky tap': ['wrench', 'washer', 'towel'], 'Hang a shelf': ['drill', 'level', 'screws'], 'Change a light switch': ['screwdriver', 'voltage tester'], 'Patch a wall': ['putty knife', 'filler', 'sandpaper'], 'Tighten a hinge': ['screwdriver', 'screws'], 'Bleed a radiator': ['radiator key', 'towel'], 'Replace a tyre tube': ['tyre levers', 'pump', 'new tube'], 'Paint a door': ['brush', 'paint', 'sandpaper'] };
      const k = Math.min(4, 1 + Math.floor(lv / 3)), reps = rng.sample(Object.keys(R), k), need = [...new Set(reps.flatMap((r) => R[r]))];
      const decoys = rng.sample([...new Set(Object.values(R).flat())].filter((x) => !need.includes(x)), Math.min(5, 2 + Math.floor(lv / 3)));
      return { kind: 'multi', promptHtml: `<span class="memo list">${reps.map((r) => `<span>🔧 ${r}</span>`).join('')}</span>`, items: rng.shuffle([...need, ...decoys]).map((x) => ({ label: x, value: x })), answer: need, need: need.length, prompt: `Pack exactly ${need.length} tools`, cols: 2 };
    } }),
  std({ num: 139, title: 'Time Estimate Lab', max: 12, practiceTrials: 1,
    how: ['First, predict how long the next sorting puzzle will take you.', 'Then solve it; the clock runs.', 'You score when the puzzle is right AND your estimate was in the right range.'],
    makeTrial(rng, lv) { const n = Math.min(9, 4 + Math.floor(lv / 2)), vals = rng.sample(range(99).map((x) => x + 1), n); return { kind: 'order', items: vals.map((v) => ({ label: String(v), value: v })), answer: [...vals].sort((a, b) => a - b), prompt: 'Sort smallest to largest' }; },
    async play(t, ctx) {
      const B = [[0, 8, 'under 8 s'], [8, 15, '8–15 s'], [15, 25, '15–25 s'], [25, 1e9, 'over 25 s']];
      const e = await runTrial({ kind: 'choice', prompt: `How long will it take you to sort ${t.items.length} numbers?`, options: B.map((b, i) => ({ label: b[2], value: i })), answer: undefined, reveal: false, flashMs: 200 }, ctx);
      const t0 = now(), r = await runTrial(t, ctx), secs = (now() - t0) / 1000, actual = B.findIndex((b) => secs >= b[0] && secs < b[1]), hit = e.picked === actual;
      return { correct: r.correct && hit, rt: secs * 1000, tags: { estimateTotal: 1, estimateRight: hit ? 1 : 0, exactTotal: 1, exactRight: r.correct ? 1 : 0 }, explain: `You took ${secs.toFixed(1)} s (${B[actual][2]}) and estimated ${e.picked != null ? B[e.picked][2] : 'nothing'}.${r.correct ? '' : ' The sort had a mistake.'}` };
    } }),
  std({ num: 140, title: 'Plan–Do–Review', max: 12, practiceTrials: 1,
    how: ['Choose a command plan to drive the robot from S to the goal G, avoiding blocks.', 'Watch the plan run.', 'If it fails, review where it went wrong and pick a revised plan. You score if the robot gets there.'],
    makeTrial(rng, lv) {
      const n = lv <= 5 ? 5 : 6;
      for (let g = 0; g < 300; g++) {
        const walls = new Set(rng.sample(range(n * n), Math.floor(n * n * (0.15 + lv * 0.01)))), s = rng.pick(range(n * n).filter((i) => !walls.has(i))), goal = rng.pick(range(n * n).filter((i) => !walls.has(i) && i !== s)), p = bfsPath(n, s, goal, walls);
        if (!p || p.length < 4 + Math.floor(lv / 3)) continue;
        const cmd = (path) => path.slice(1).map((x, i) => (x - path[i] === 1 ? '→' : x - path[i] === -1 ? '←' : x - path[i] === n ? '↓' : '↑')).join('');
        const good = cmd(p), mut = (str) => { const a = str.split(''), i = rng.int(0, a.length - 1); a[i] = rng.pick(['→', '←', '↓', '↑'].filter((x) => x !== a[i])); return a.join(''); };
        const run = (c) => { let x = s; for (const ch of c) { const r = Math.floor(x / n), cc = x % n, [dr, dc] = { '→': [0, 1], '←': [0, -1], '↓': [1, 0], '↑': [-1, 0] }[ch], nr = r + dr, nc = cc + dc; if (nr < 0 || nc < 0 || nr >= n || nc >= n || walls.has(nr * n + nc)) return -1; x = nr * n + nc; } return x; };
        const bads = new Set(); for (let k = 0; k < 40 && bads.size < 4; k++) { const m = mut(good); if (run(m) !== goal) bads.add(m); } if (bads.size < 4) continue;
        const b = [...bads];
        return { kind: 'choice', n, walls: [...walls], s, goal, good, bads: b, prompt: '', options: [good, ...b].map((c) => ({ label: c, value: c })), answer: good };
      }
      throw new Error('pdr gen');
    },
    async play(t, ctx) {
      const { n, s, goal } = t, walls = new Set(t.walls), marks = { [s]: 'S', [goal]: 'G' };
      const run = (c) => { let x = s; const path = [s]; for (const ch of c) { const r = Math.floor(x / n), cc = x % n, [dr, dc] = { '→': [0, 1], '←': [0, -1], '↓': [1, 0], '↑': [-1, 0] }[ch], nr = r + dr, nc = cc + dc; if (nr < 0 || nc < 0 || nr >= n || nc >= n || walls.has(nr * n + nc)) return { path, end: x, crash: true }; x = nr * n + nc; path.push(x); } return { path, end: x, crash: false }; };
      const opts1 = ctx.rng.shuffle([t.good, t.bads[0], t.bads[1]]);
      const r1 = await runTrial({ kind: 'choice', promptHtml: gridMap(n, { walls: [...walls], marks }), prompt: 'Choose a plan', options: opts1.map((c) => ({ label: c, value: c, cls: 'cmd' })), answer: t.good, cols: 1, quiet: true, reveal: false }, ctx);
      const pick = r1.picked ?? t.bads[0], res = run(pick), ok1 = !res.crash && res.end === goal;
      ctx.stage.replaceChildren(h('div', { class: 'trial' }, h('div', { class: 'status' }, ok1 ? '✅ The plan worked!' : res.crash ? '💥 The robot hit a block.' : '❌ The robot stopped in the wrong place.'), h('span', { class: 'rich big', html: gridMap(n, { walls: [...walls], marks, paths: [[res.path, ok1 ? '#2fd38a' : '#ff5d6c']] }) })));
      await ctx.sleep(1800);
      if (ok1) return { correct: true, rt: null, tags: { firstPlanTotal: 1, firstPlanRight: 1 } };
      const r2 = await runTrial({ kind: 'choice', promptHtml: gridMap(n, { walls: [...walls], marks, paths: [[res.path, '#ff5d6c']] }), prompt: 'Review: pick a revised plan', options: ctx.rng.shuffle([t.good, t.bads[2], t.bads[3]]).map((c) => ({ label: c, value: c, cls: 'cmd' })), answer: t.good, cols: 1 }, ctx);
      return { correct: r2.correct, rt: null, tags: { firstPlanTotal: 1, firstPlanRight: 0, revisionTotal: 1, revisionRight: r2.correct ? 1 : 0 } };
    } }),
];
