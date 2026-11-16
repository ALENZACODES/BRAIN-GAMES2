// Logic tests: determinism, answer correctness, puzzle validity. No browser needed. Run: node tests/run.mjs
import assert from 'node:assert/strict';
import { RNG, Staircase, points, dailyPicks, playerLevel, xpForLevel } from '../js/engine.js';
import { LIVE } from '../js/games/index.js';

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ', name); } catch (e) { failed++; console.log('  FAIL', name, '\n       ', e.message.split('\n')[0]); } };
const seeds = (n) => Array.from({ length: n }, (_, i) => 's' + i);

console.log('engine');
test('RNG is deterministic per seed and differs across seeds', () => {
  const a = new RNG('x'), b = new RNG('x'), c = new RNG('y');
  const sa = Array.from({ length: 8 }, () => a.next()), sb = Array.from({ length: 8 }, () => b.next()), sc = Array.from({ length: 8 }, () => c.next());
  assert.deepEqual(sa, sb); assert.notDeepEqual(sa, sc);
});
test('Staircase: 2 correct = up, 1 wrong = down, clamped', () => {
  const s = new Staircase(1, 3, 1); assert.equal(s.update(true), 0); assert.equal(s.update(true), 1); assert.equal(s.level, 2);
  assert.equal(s.update(false), -1); assert.equal(s.level, 1); assert.equal(s.update(false), 0); assert.equal(s.level, 1);
  const t = new Staircase(1, 2, 2); t.update(true); assert.equal(t.update(true), 0); assert.equal(t.level, 2);
});
test('points rise with level and streak, streak capped', () => { assert.ok(points(5, 3) > points(2, 3)); assert.ok(points(3, 5) > points(3, 0)); assert.equal(points(3, 10), points(3, 99)); });
test('dailyPicks is stable for a date and varies by date', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']; assert.deepEqual(dailyPicks(ids, '2026-11-15'), dailyPicks(ids, '2026-11-15'));
  assert.equal(new Set(dailyPicks(ids, '2026-11-15')).size, 3); assert.ok(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].some((d) => dailyPicks(ids, d).join() !== dailyPicks(ids, '2026-11-15').join()));
});
test('player level curve is monotone and invertible', () => { for (let l = 1; l < 30; l++) { assert.equal(playerLevel(xpForLevel(l)), l); assert.ok(xpForLevel(l + 1) > xpForLevel(l)); } });

const mods = {}; for (const [id, load] of Object.entries(LIVE)) mods[id] = await load();
console.log('\ngeneric, every live game');
for (const [id, m] of Object.entries(mods)) {
  const g = m.default;
  test(`${id}: id/num/how present and levels sane`, () => { assert.equal(g.id, id); assert.ok(g.num > 0 && g.min >= 1 && g.max > g.min); assert.ok(g.how.length >= 3); assert.equal(typeof g.play, 'function'); });
  test(`${id}: makeTrial is deterministic for every level`, () => { for (let lv = g.min; lv <= g.max; lv++) for (const s of seeds(5)) assert.deepEqual(g.makeTrial(new RNG(s), lv, {}), g.makeTrial(new RNG(s), lv, {})); });
}

console.log('\nspecific');
const L = (id) => mods[id]?.logic, has = (id) => !!mods[id];
if (has('window-watch')) {
  test('window-watch: unique in-range targets; check() exact/partial', () => {
    for (let lv = 1; lv <= 14; lv++) for (const s of seeds(20)) { const t = L('window-watch').makeTrial(new RNG(s), lv); assert.equal(new Set(t.targets).size, t.targets.length); assert.ok(t.targets.every((x) => x >= 0 && x < t.size ** 2)); assert.ok(L('window-watch').check(t, t.targets).correct); }
    const t = { targets: [1, 2, 3] }; assert.deepEqual(L('window-watch').check(t, [1, 2, 9]), { hit: 2, fa: 1, miss: 1, correct: false });
  });
}
if (has('echo-grid')) {
  test('echo-grid: route is connected, right length; check() ordered', () => {
    for (let lv = 1; lv <= 14; lv++) for (const s of seeds(20)) { const t = L('echo-grid').makeTrial(new RNG(s), lv); assert.equal(t.route.length, t.len); for (let i = 1; i < t.route.length; i++) assert.ok(L('echo-grid').neighbours(t.route[i - 1], t.size).includes(t.route[i])); assert.ok(L('echo-grid').check(t.route, t.route).correct); }
    assert.equal(L('echo-grid').check([1, 2, 3], [1, 2, 4]).steps, 2); assert.equal(L('echo-grid').check([1, 2, 3], [1, 2, 4]).firstWrong, 2);
  });
}
if (has('two-back-orchard')) {
  test('two-back: labels follow history[t]===history[t-n]; score() counts hits/misses/FA/CR', () => {
    for (let lv = 1; lv <= 12; lv++) for (const s of seeds(15)) { const t = L('two-back-orchard').makeTrial(new RNG(s), lv); t.seq.forEach((f, i) => assert.equal(t.labels[i], i >= t.n && f === t.seq[i - t.n])); }
    const r = L('two-back-orchard').score([false, false, true, false, true], 2, [0, 0, 1, 1, 0]); assert.deepEqual(r, { hit: 1, miss: 1, fa: 1, cr: 0 });
    assert.ok(Array.from({ length: 30 }, (_, i) => L('two-back-orchard').makeTrial(new RNG('t' + i), 5).labels.filter(Boolean).length).every((n) => n >= 1));
  });
}
if (has('ink-interpreter')) {
  test('ink-interpreter: incongruent trials really differ; answer is the ink', () => {
    for (let lv = 1; lv <= 16; lv++) for (const s of seeds(30)) { const t = L('ink-interpreter').makeTrial(new RNG(s), lv); assert.equal(t.incong, t.ink !== t.word); assert.ok(t.names.includes(t.ink) && t.names.includes(t.word)); assert.ok(L('ink-interpreter').check(t, t.ink)); }
  });
}
if (has('one-different')) {
  test('one-different: exactly one item differs from the rest', () => {
    for (let lv = 1; lv <= 14; lv++) for (const s of seeds(20)) { const t = L('one-different').makeTrial(new RNG(s), lv), k = t.items.map((x) => JSON.stringify(x)); assert.equal(k.filter((x, i) => i !== t.odd && x === k[t.odd]).length, 0); assert.equal(new Set(k.filter((_, i) => i !== t.odd)).size, 1); assert.ok(L('one-different').check(t, t.odd)); }
  });
}
if (has('rapid-equation-check')) {
  test('rapid-equation: isTrue iff shown equals exact arithmetic; no negatives; balanced', () => {
    let trues = 0, n = 0;
    for (let lv = 1; lv <= 15; lv++) for (const s of seeds(40)) { const t = L('rapid-equation-check').makeTrial(new RNG(s), lv); const real = L('rapid-equation-check').compute(t.a, t.op, t.b); assert.equal(real, t.real); assert.equal(t.isTrue, t.shown === real); assert.ok(t.shown >= 0); trues += t.isTrue; n++; }
    assert.ok(trues / n > 0.4 && trues / n < 0.6);
  });
}
if (has('number-lock')) {
  const NL = L('number-lock');
  test('number-lock: duplicate-aware feedback', () => {
    assert.deepEqual(NL.feedback([1, 2, 3], [1, 2, 3]), { exact: 3, misplaced: 0 }); assert.deepEqual(NL.feedback([1, 2, 3], [3, 1, 2]), { exact: 0, misplaced: 3 });
    assert.deepEqual(NL.feedback([1, 1, 2], [1, 2, 2]), { exact: 2, misplaced: 0 }); assert.deepEqual(NL.feedback([1, 1, 2, 3], [1, 2, 1, 1]), { exact: 1, misplaced: 2 });
  });
  test('number-lock: codes valid; a consistent-guess strategy always solves within the guess limit', () => {
    let worst = 0;
    for (let lv = 1; lv <= 14; lv += 1) for (const s of seeds(12)) {
      const t = NL.makeTrial(new RNG(s), lv); assert.equal(t.code.length, t.len); if (!t.dup) assert.equal(new Set(t.code).size, t.len);
      const all = []; const gen = (p) => { if (p.length === t.len) { all.push(p); return; } for (let x = 0; x < t.symbols; x++) if (t.dup || !p.includes(x)) gen([...p, x]); }; gen([]);
      let cands = all, hist = [], n = 0;
      for (;;) { const guess = cands[Math.floor(cands.length / 2)]; n++; const f = NL.feedback(t.code, guess); if (f.exact === t.len) break; hist.push([guess, f]); cands = cands.filter((c) => NL.consistent(hist, c)); assert.ok(cands.length > 0); }
      worst = Math.max(worst, n - t.maxGuesses); assert.ok(n <= t.maxGuesses, `level ${lv}: needed ${n} > ${t.maxGuesses}`);
    }
  });
}
if (has('circuit-path')) {
  const CP = L('circuit-path');
  test('circuit-path: intended solution powers the target; start is unsolved; par = taps needed', () => {
    for (let lv = 1; lv <= 14; lv++) for (const s of seeds(25)) {
      const t = CP.makeTrial(new RNG(s), lv);
      assert.ok(CP.power(t.solution, t.size, t.r0, t.r1).solved, 'solution must be solved');
      assert.ok(!CP.power(t.tiles, t.size, t.r0, t.r1).solved, 'puzzle must start unsolved');
      let par = 0; t.tiles.forEach((m, i) => { par += CP.taps(m, t.solution[i]); }); assert.equal(par, t.par); assert.ok(t.budget > t.par);
    }
  });
}
if (has('mirror-maze')) {
  const MM = L('mirror-maze');
  test('mirror-maze: every beam exits; reversing from the exit returns to the entry port', () => {
    for (let lv = 1; lv <= 14; lv++) for (const s of seeds(25)) {
      const t = MM.makeTrial(new RNG(s), lv), fwd = MM.trace(t.grid, t.n, t.entry); assert.equal(fwd.exit, t.exit); assert.notEqual(t.exit, t.entry);
      assert.equal(MM.trace(t.grid, t.n, t.exit).exit, t.entry, 'light paths are reversible');
    }
  });
  test('mirror-maze: hand-checked cases', () => {
    const n = 4, empty = Array(16).fill(null);
    assert.equal(MM.trace(empty, n, 0).exit, 2 * n + (n - 1), 'straight down column 0 leaves bottom-left = port 11');
    const g = [...empty]; g[0] = '/'; // beam going down hits "/" and turns left, leaving the left edge of row 0
    const r = MM.trace(g, n, 0); assert.equal(r.exit, 3 * n + (n - 1)); assert.equal(r.bounces, 1);
    const g2 = [...empty]; g2[0] = '\\'; assert.equal(MM.trace(g2, n, 0).exit, n + 0, '"\\" turns a downward beam right, leaving the right edge of row 0');
  });
}
if (has('rotation-match')) {
  const RM = L('rotation-match');
  test('rotation-match: exactly one option is a pure rotation; mirror images never are', () => {
    for (let lv = 1; lv <= 14; lv++) for (const s of seeds(25)) {
      const t = RM.makeTrial(new RNG(s), lv), rots = t.options.map((o) => RM.isRotation(t.target, o, 1e-5)); assert.equal(rots.filter(Boolean).length, 1); assert.equal(rots.indexOf(true), t.answer);
      assert.ok(!RM.isRotation(t.target, RM.mirror(t.target), 0.05));
    }
  });
}
if (has('number-line-navigator')) {
  const NN = L('number-line-navigator');
  test('number-line: target inside line; check() uses share of line length', () => {
    for (let lv = 1; lv <= 15; lv++) for (const s of seeds(25)) { const t = NN.makeTrial(new RNG(s), lv); assert.ok(t.target > t.min && t.target < t.max); assert.ok(NN.check(t, t.target).correct); }
    const r = NN.check({ min: 0, max: 100, target: 50, tolPct: 5 }, 54); assert.ok(r.correct && Math.abs(r.err - 0.04) < 1e-9); assert.ok(!NN.check({ min: 0, max: 100, target: 50, tolPct: 5 }, 56).correct);
  });
}
if (has('fraction-duel')) {
  const FD = L('fraction-duel');
  test('fraction-duel: exact comparison; answer matches true order; equal trials really equal', () => {
    assert.equal(FD.cmp({ n: 1, d: 3 }, { n: 2, d: 6 }), 0); assert.equal(FD.cmp({ n: 3, d: 7 }, { n: 4, d: 9 }), -1);
    let eq = 0; for (let lv = 1; lv <= 14; lv++) for (const s of seeds(40)) { const t = FD.makeTrial(new RNG(s), lv), c = FD.cmp(t.a, t.b); assert.equal(t.answer, c === 0 ? 'eq' : c > 0 ? 'a' : 'b'); if (t.answer === 'eq') { eq++; assert.ok(t.allowEqual); } }
    assert.ok(eq > 0);
  });
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
