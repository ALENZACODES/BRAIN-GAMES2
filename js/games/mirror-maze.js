import { h, now, audio } from '../engine.js';
import { timerBar } from '../kit.js';

export const logic = {
  params(level) { return { n: Math.min(8, 4 + Math.floor((level - 1) / 3)), density: Math.min(0.5, 0.26 + level * 0.025), minBounces: Math.min(8, 2 + Math.floor(level / 2)), timeMs: Math.max(9000, 26000 - level * 1100) }; },
  /** Port i (clockwise from top-left): top 0..n-1, right n..2n-1, bottom 2n..3n-1 (right to left), left 3n..4n-1 (bottom to top). */
  portStart(n, p) {
    if (p < n) return { r: 0, c: p, dr: 1, dc: 0 };
    if (p < 2 * n) return { r: p - n, c: n - 1, dr: 0, dc: -1 };
    if (p < 3 * n) return { r: n - 1, c: n - 1 - (p - 2 * n), dr: -1, dc: 0 };
    return { r: n - 1 - (p - 3 * n), c: 0, dr: 0, dc: 1 };
  },
  portOf(n, r, c, dr, dc) { // port the beam leaves through
    if (dr === -1) return c; if (dc === 1) return n + r; if (dr === 1) return 2 * n + (n - 1 - c); return 3 * n + (n - 1 - r);
  },
  /** Trace a beam; returns exit port, bounce count, and the polyline in cell units. */
  trace(grid, n, port) {
    let { r, c, dr, dc } = logic.portStart(n, port), bounces = 0;
    const pts = [[c + 0.5 - dc * 0.5, r + 0.5 - dr * 0.5]]; // boundary point where the beam enters
    for (let guard = 0; guard < 1000; guard++) {
      const m = grid[r * n + c];
      if (m) { pts.push([c + 0.5, r + 0.5]); bounces++; if (m === '/') [dr, dc] = [-dc, -dr]; else [dr, dc] = [dc, dr]; }
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) { pts.push([c + 0.5 + dc * 0.5, r + 0.5 + dr * 0.5]); return { exit: logic.portOf(n, r, c, dr, dc), bounces, pts }; }
      r = nr; c = nc;
    }
    throw new Error('beam did not terminate');
  },
  makeTrial(rng, level) {
    const p = logic.params(level), n = p.n; let best = null;
    for (let t = 0; t < 300; t++) {
      const grid = Array.from({ length: n * n }, () => (rng.chance(p.density) ? (rng.chance(0.5) ? '/' : '\\') : null)), port = rng.int(0, 4 * n - 1), tr = logic.trace(grid, n, port);
      if (!best || tr.bounces > best.tr.bounces) best = { grid, port, tr };
      if (tr.bounces >= p.minBounces) break;
    }
    return { ...p, grid: best.grid, entry: best.port, exit: best.tr.exit, bounces: best.tr.bounces, pts: best.tr.pts };
  },
  check: (trial, port) => port === trial.exit,
};

export default {
  id: 'mirror-maze', num: 145, title: 'Mirror Maze', min: 1, max: 14, start: 1, mode: 'both', practiceTrials: 1, maxTrials: 14,
  how: ['A beam of light enters the maze at the glowing arrow.', 'Every diagonal mirror bounces it 90 degrees. Follow it in your head.', 'Tap the numbered gate where you think the beam leaves.'],
  makeTrial: logic.makeTrial,
  async play(trial, ctx) {
    const { n } = trial, cs = 100, W = n * cs, pad = 70, vb = W + pad * 2, ns = 'http://www.w3.org/2000/svg';
    const tb = timerBar(ctx, trial.timeMs), status = h('div', { class: 'status' }, 'Where does the beam leave?');
    let g = '';
    for (let i = 0; i <= n; i++) g += `<path d="M${pad + i * cs} ${pad}V${pad + W}M${pad} ${pad + i * cs}H${pad + W}" stroke="rgba(255,255,255,.08)" stroke-width="2"/>`;
    trial.grid.forEach((m, i) => { if (!m) return; const r = Math.floor(i / n), c = i % n, x = pad + c * cs, y = pad + r * cs; g += m === '/' ? `<path class="mir" d="M${x + 18} ${y + cs - 18}L${x + cs - 18} ${y + 18}"/>` : `<path class="mir" d="M${x + 18} ${y + 18}L${x + cs - 18} ${y + cs - 18}"/>`; });
    const portPos = (p) => { const s = logic.portStart(n, p); return { x: pad + s.c * cs + cs / 2 - s.dc * (cs / 2 + 34) , y: pad + s.r * cs + cs / 2 - s.dr * (cs / 2 + 34), s }; };
    const svg = h('svg', { viewBox: `0 0 ${vb} ${vb}`, class: 'mazesvg', role: 'group', 'aria-label': 'Mirror maze', html: `<rect x="${pad}" y="${pad}" width="${W}" height="${W}" rx="10" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.25)" stroke-width="3"/>${g}` });
    const gates = [];
    for (let p = 0; p < 4 * n; p++) {
      const { x, y } = portPos(p), isIn = p === trial.entry;
      const el = document.createElementNS(ns, 'g'); el.setAttribute('class', 'gate' + (isIn ? ' in' : '')); el.setAttribute('tabindex', isIn ? '-1' : '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', isIn ? 'Entry' : `Gate ${p + 1}`);
      el.innerHTML = `<circle cx="${x}" cy="${y}" r="${isIn ? 24 : 21}"/><text x="${x}" y="${y + 7}" text-anchor="middle">${isIn ? '▶' : p + 1}</text>`;
      if (!isIn) { el.addEventListener('click', () => pick(p)); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(p); } }); }
      svg.append(el); gates.push(el);
    }
    // rotate the entry arrow to the beam direction
    { const s = logic.portStart(n, trial.entry), a = Math.atan2(s.dr, s.dc) * 180 / Math.PI, { x, y } = portPos(trial.entry); gates[trial.entry].querySelector('text').setAttribute('transform', `rotate(${a} ${x} ${y})`); }
    ctx.stage.replaceChildren(h('div', { class: 'trial' }, tb.bar, status, h('div', { class: 'mazewrap' }, svg), ctx.practice ? h('p', { class: 'hint' }, 'Practice: a "/" mirror turns a beam heading right into one heading up.') : null));
    let t0 = now(), resolve, to, done = false;
    const pick = (p) => { if (done) return; done = true; clearTimeout(to); tb.stop(); audio.tap(); resolve(p); };
    await new Promise((r) => requestAnimationFrame(r));
    t0 = now(); tb.start();
    const choice = await new Promise((r) => { resolve = r; to = setTimeout(() => { done = true; r(null); }, ctx.settings.untimed ? 1e9 : trial.timeMs); });
    const rt = now() - t0, correct = choice === trial.exit;
    const poly = trial.pts.map(([x, y]) => `${pad + x * cs},${pad + y * cs}`).join(' ');
    const path = document.createElementNS(ns, 'polyline'); path.setAttribute('points', poly); path.setAttribute('class', 'beam'); svg.insertBefore(path, svg.querySelector('.gate'));
    const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.getBoundingClientRect(); path.style.transition = `stroke-dashoffset ${ctx.settings.reduceMotion ? 0 : 900}ms linear`; path.style.strokeDashoffset = 0;
    gates[trial.exit].classList.add(correct ? 'right' : 'truth'); if (choice != null && !correct) gates[choice].classList.add('wrong');
    status.textContent = correct ? `Yes! ${trial.bounces} bounce${trial.bounces === 1 ? '' : 's'}.` : choice == null ? 'Time is up.' : 'Not that gate. Watch the beam.';
    await ctx.sleep(correct ? 1100 : 1900);
    return { correct, rt, speed: correct ? Math.max(0, 1 - rt / trial.timeMs) : 0, tags: { ...(correct ? { bouncesTraced: trial.bounces } : {}), ...(choice == null ? { omission: 1 } : {}) }, metric: { name: 'bounces', value: trial.bounces },
      explain: correct ? '' : choice == null ? `Time ran out. The beam left at gate ${trial.exit + 1}.` : `The beam left at gate ${trial.exit + 1}.` };
  },
  summary: (g, s) => `${s.best.bounces ? `Most bounces followed correctly in one beam: ${s.best.bounces}. ` : ''}${s.tags.bouncesTraced || 0} bounces traced correctly in total.`,
};
