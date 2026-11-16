// Unit tests for streaks, freezes, missions, stars and comeback logic (Node, with an in-memory localStorage).
import assert from 'node:assert/strict';
const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => (mem[k] = String(v)), removeItem: (k) => delete mem[k] };
Object.defineProperty(globalThis.localStorage, 'length', { get: () => Object.keys(mem).length });
const E = await import('../js/engine.js');
let passed = 0, failed = 0; const test = (n, f) => { try { f(); passed++; console.log('  ok  ', n); } catch (e) { failed++; console.log('  FAIL', n, e.message); } };
const reset = () => { for (const k of Object.keys(mem)) delete mem[k]; };
const run = (id, today, stats = {}, meta = {}) => E.recordRun({ id }, { trials: 10, correct: 8, score: 1000, maxLevel: 5, bestStreak: 4, strikes: 1, ...stats }, { today, max: 12, cats: ['A', 'B'], cat: 'A', allIds: ['g1', 'g2', 'g3'], picks: ['g1', 'g2', 'g3'], ...meta });

test('date helpers', () => { assert.equal(E.addDays('2026-02-28', 1), '2026-03-01'); assert.equal(E.daysBetween('2026-11-14', '2026-11-16'), 2); assert.equal(E.daysBetween('2026-03-07', '2026-03-09'), 2); });
test('streak grows on consecutive days, resets after a 2-day gap with no freeze', () => {
  reset(); run('g1', '2026-11-01'); run('g1', '2026-11-02'); assert.equal(E.getProfile().streak.count, 2);
  run('g1', '2026-11-02'); assert.equal(E.getProfile().streak.count, 2, 'same day does not double count');
  run('g1', '2026-11-05'); assert.equal(E.getProfile().streak.count, 1);
});
test('7-day streak earns a freeze; a single missed day then uses it', () => {
  reset(); for (let d = 1; d <= 7; d++) run('g1', `2026-11-0${d}`); assert.equal(E.getProfile().freezes, 1); assert.equal(E.getProfile().streak.count, 7);
  const r = run('g1', '2026-11-09'); assert.ok(r.freezeUsed); assert.equal(E.getProfile().streak.count, 8); assert.equal(E.getProfile().freezes, 0);
});
test('stars come from best level relative to the game max (untimed runs excluded)', () => {
  reset(); assert.deepEqual(E.starThresholds(12), [4, 7, 10]);
  let r = run('g1', '2026-11-01', { maxLevel: 7 }); assert.equal(r.stars, 2); assert.equal(r.newStars, 2);
  r = run('g1', '2026-11-01', { maxLevel: 12 }, { untimed: true }); assert.equal(r.stars, 2);
  r = run('g1', '2026-11-01', { maxLevel: 10 }); assert.equal(r.stars, 3); assert.equal(r.newStars, 1);
});
test('missions are stable per day, progress, and pay a chest once', () => {
  reset(); const m1 = E.getMissions('2026-11-20', ['A', 'B']), m2 = E.getMissions('2026-11-20', ['A', 'B']); assert.deepEqual(m1, m2); assert.equal(m1.list.length, 3);
  let chests = 0; for (let i = 0; i < 12; i++) { const r = run(['g1', 'g2', 'g3'][i % 3], '2026-11-20', { maxLevel: 4 + i, bestStreak: 10, score: 1000 + i * 500 }, { daily: true, cat: i % 2 ? 'A' : 'B' }); chests += r.missionChest ? 1 : 0; }
  const m = E.getMissions('2026-11-20', ['A', 'B']); assert.ok(m.list.every((x) => x.prog >= x.goal), JSON.stringify(m.list.map((x) => [x.id, x.prog, x.goal]))); assert.equal(chests, 1);
});
test('comeback doubles XP once after 3+ days away', () => {
  reset(); run('g1', '2026-11-01'); const a = run('g1', '2026-11-05'); assert.ok(a.comeback); const b = run('g1', '2026-11-05'); assert.ok(!b.comeback);
});
test('first run is not reported as a personal best; later higher score is', () => {
  reset(); assert.ok(!run('g1', '2026-11-01').newBest); assert.ok(run('g1', '2026-11-01', { score: 5000 }).newBest); assert.ok(!run('g1', '2026-11-01', { score: 10 }).newBest);
});
console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
