import { h, now, audio } from '../engine.js';

const N = 1, E = 2, S = 4, W = 8;
export const DIRS = [{ bit: N, dr: -1, dc: 0, opp: S }, { bit: E, dr: 0, dc: 1, opp: W }, { bit: S, dr: 1, dc: 0, opp: N }, { bit: W, dr: 0, dc: -1, opp: E }];
export const rot = (m) => ((m << 1) | (m >> 3)) & 15; // 90 degrees clockwise
export const rotN = (m, k) => { for (let i = 0; i < k; i++) m = rot(m); return m; };

export const logic = {
  params(level) {
    const size = level <= 2 ? 3 : level <= 5 ? 4 : level <= 8 ? 5 : level <= 11 ? 6 : 7;
    return { size, slack: Math.max(3, 9 - level), blockers: level >= 3 ? Math.min(0.3, 0.05 * level) : 0, tees: level >= 4, minLen: size + Math.floor(level / 2) };
  },
  /** Randomised self-avoiding walk from the left edge to the right edge. */
  walk(rng, size, r0, r1) {
    const seen = new Set(), path = [];
    const dfs = (r, c) => {
      seen.add(r * size + c); path.push([r, c]);
      if (r === r1 && c === size - 1) return true;
      const order = rng.shuffle([0, 1, 1, 1, 2]); // bias east
      for (const di of order) {
        const d = DIRS[di], nr = r + d.dr, nc = c + d.dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size || seen.has(nr * size + nc)) continue;
        if (dfs(nr, nc)) return true;
      }
      seen.delete(r * size + c); path.pop(); return false;
    };
    return dfs(r0, 0) ? path : null;
  },
  makeTrial(rng, level) {
    const p = logic.params(level), size = p.size;
    let best = null;
    for (let t = 0; t < 40; t++) {
      const r0 = rng.int(0, size - 1), r1 = rng.int(0, size - 1), path = logic.walk(rng, size, r0, r1);
      if (path && (!best || path.length > best.path.length)) best = { path, r0, r1 };
      if (best && best.path.length >= p.minLen) break;
    }
    const { path, r0, r1 } = best, sol = Array(size * size).fill(0), onPath = new Set();
    path.forEach(([r, c], i) => {
      let m = 0; const prev = path[i - 1], next = path[i + 1];
      m |= prev ? DIRS.find((d) => d.dr === prev[0] - r && d.dc === prev[1] - c).bit : W;
      m |= next ? DIRS.find((d) => d.dr === next[0] - r && d.dc === next[1] - c).bit : E;
      sol[r * size + c] = m; onPath.add(r * size + c);
    });
    const tiles = [...sol], solution = [...sol];
    for (let i = 0; i < size * size; i++) {
      if (!onPath.has(i)) {
        if (rng.chance(p.blockers)) { tiles[i] = 0; solution[i] = 0; continue; }
        const kind = rng.pick(p.tees ? [5, 3, 3, 7] : [5, 3, 3]); tiles[i] = rotN(kind, rng.int(0, 3)); solution[i] = tiles[i];
      }
    }
    let par = 0;
    for (const i of onPath) { const k = rng.int(0, 3); tiles[i] = rotN(sol[i], k); }
    for (const i of onPath) par += logic.taps(tiles[i], sol[i]);
    if (par === 0) { const i = [...onPath][0]; tiles[i] = rot(sol[i]); par = logic.taps(tiles[i], sol[i]); if (par === 0) { tiles[i] = rot(rot(tiles[i])); par = logic.taps(tiles[i], sol[i]); } }
    return { ...p, r0, r1, tiles, solution, par, budget: par + p.slack };
  },
  taps(m, target) { for (let k = 0; k < 4; k++) if (rotN(m, k) === target) return k; return 0; },
  /** Which cells are powered from the left-edge source, and is the right-edge target lit? */
  power(tiles, size, r0, r1) {
    const on = new Set(), q = [];
    if (tiles[r0 * size] & W) { on.add(r0 * size); q.push([r0, 0]); }
    while (q.length) {
      const [r, c] = q.shift(), m = tiles[r * size + c];
      for (const d of DIRS) {
        if (!(m & d.bit)) continue; const nr = r + d.dr, nc = c + d.dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const ni = nr * size + nc; if (on.has(ni) || !(tiles[ni] & d.opp)) continue; on.add(ni); q.push([nr, nc]);
      }
    }
    const t = r1 * size + size - 1;
    return { on, solved: on.has(t) && !!(tiles[t] & E) };
  },
};

function pipeSVG(m) {
  const c = 50, seg = [[N, `M50 50V4`], [E, `M50 50H96`], [S, `M50 50V96`], [W, `M50 50H4`]];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${m ? `<g class="pipe">${seg.filter(([b]) => m & b).map(([, d]) => `<path d="${d}"/>`).join('')}<circle cx="${c}" cy="${c}" r="9"/></g>` : '<g class="rubble"><circle cx="30" cy="62" r="9"/><circle cx="58" cy="40" r="12"/><circle cx="68" cy="68" r="7"/></g>'}</svg>`;
}

export default {
  id: 'circuit-path', num: 103, title: 'Circuit Path', min: 1, max: 14, start: 1, mode: 'both', practiceTrials: 1, maxTrials: 12,
  how: ['Power enters at the left. Tap a tile to rotate it a quarter turn.', 'Connect a continuous line of wire from the left source to the glowing socket on the right.', 'You have a limited number of turns, so look ahead before you tap.'],
  makeTrial: logic.makeTrial,
  async play(trial, ctx) {
    const { size, r0, r1 } = trial, tiles = [...trial.tiles], angles = Array(size * size).fill(0);
    let moves = 0, t0 = now(), done = false;
    const status = h('div', { class: 'status' });
    const cells = tiles.map((m, i) => { const b = h('button', { class: 'cell' + (m ? '' : ' blocked'), type: 'button', 'aria-label': `Tile row ${Math.floor(i / size) + 1} column ${(i % size) + 1}`, disabled: !m, html: pipeSVG(m) }); b.addEventListener('click', () => turn(i)); return b; });
    const board = h('div', { class: 'cgrid', style: { '--n': size } }, cells);
    const src = h('div', { class: 'port src', style: { '--r': r0, '--n': size }, 'aria-hidden': 'true' }, '⚡'), dst = h('div', { class: 'port dst', style: { '--r': r1, '--n': size }, 'aria-hidden': 'true' }, '◉');
    const wrap = h('div', { class: 'cwrap' }, src, board, dst);
    let finish;
    const refresh = () => {
      const { on, solved } = logic.power(tiles, size, r0, r1);
      cells.forEach((el, i) => el.classList.toggle('on', on.has(i))); src.classList.add('live'); dst.classList.toggle('live', solved);
      status.textContent = `Turns left: ${trial.budget - moves}  ·  par ${trial.par}`;
      return solved;
    };
    function turn(i) {
      if (done || !tiles[i]) return;
      tiles[i] = rot(tiles[i]); angles[i] += 90; cells[i].firstChild.style.transform = `rotate(${angles[i]}deg)`; moves++; audio.tone(280 + (moves % 5) * 30, 0.06, 'square', 0.05);
      const solved = refresh();
      if (solved) { done = true; audio.win(); finish(true); } else if (moves >= trial.budget) { done = true; audio.bad(); finish(false); }
    }
    ctx.stage.replaceChildren(h('div', { class: 'trial' }, status, wrap, ctx.practice ? h('p', { class: 'hint' }, 'Practice: wires only link when both tiles have an opening facing each other.') : null));
    refresh();
    const ok = await new Promise((r) => { finish = r; });
    await ctx.sleep(ok ? 800 : 500);
    if (!ok) { // show a working layout
      trial.solution.forEach((m, i) => { tiles[i] = m; if (cells[i].firstChild) { cells[i].firstChild.style.transform = ''; cells[i].innerHTML = pipeSVG(m); } }); refresh(); status.textContent = 'Out of turns. One working layout:'; await ctx.sleep(1700);
    }
    const spare = trial.budget - moves;
    return { correct: ok, rt: now() - t0, speed: ok ? Math.min(1, spare / trial.slack) : 0, tags: { turns: moves, extraTurns: ok ? Math.max(0, moves - trial.par) : 0, solved: ok ? 1 : 0 }, metric: { name: 'grid', value: size },
      explain: ok ? '' : `You used all ${trial.budget} turns (a shortest route needs about ${trial.par}).` };
  },
  summary: (g, s) => `${s.best.grid ? `Largest circuit completed: ${s.best.grid}×${s.best.grid}. ` : ''}${s.tags.solved || 0} circuits powered; ${s.tags.extraTurns || 0} extra turns beyond par in total.`,
};
