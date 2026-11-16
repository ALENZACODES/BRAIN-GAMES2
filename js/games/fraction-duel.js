import { h } from '../engine.js';
import { choiceTrial } from '../kit.js';

export const logic = {
  params(level) { return { maxDen: Math.min(16, 4 + level), close: Math.max(0.02, 0.5 - level * 0.035), allowEqual: level >= 6, timeMs: Math.max(2300, 6800 - level * 300) }; },
  /** Exact comparison through integer cross-multiplication (no floating point). */
  cmp(a, b) { const x = a.n * b.d - b.n * a.d; return x > 0 ? 1 : x < 0 ? -1 : 0; },
  frac(rng, maxDen) { const d = rng.int(2, maxDen); return { n: rng.int(1, d - 1), d }; },
  makeTrial(rng, level) {
    const p = logic.params(level);
    if (p.allowEqual && rng.chance(0.2)) {
      const base = logic.frac(rng, Math.max(3, Math.floor(p.maxDen / 2))), k = rng.int(2, Math.max(2, Math.floor(p.maxDen / base.d))), a = { n: base.n, d: base.d }, b = { n: base.n * k, d: base.d * k };
      if (b.d <= p.maxDen * 2) return { ...p, a: rng.chance(0.5) ? a : b, b: rng.chance(0.5) ? b : a, answer: 'eq' };
    }
    for (let guard = 0; guard < 400; guard++) {
      const a = logic.frac(rng, p.maxDen), b = logic.frac(rng, p.maxDen), c = logic.cmp(a, b);
      if (c === 0) continue;
      if (Math.abs(a.n / a.d - b.n / b.d) <= p.close || guard > 300) return { ...p, a, b, answer: c > 0 ? 'a' : 'b' };
    }
    return { ...p, a: { n: 1, d: 2 }, b: { n: 1, d: 3 }, answer: 'a' };
  },
  check: (trial, pick) => pick === trial.answer,
};
const fr = (f) => h('span', { class: 'frac' }, h('i', {}, f.n), h('u'), h('i', {}, f.d));
const bar = (f) => h('span', { class: 'fbar' }, h('em', { style: { width: (f.n / f.d) * 100 + '%' } }));

export default {
  id: 'fraction-duel', num: 173, title: 'Fraction Duel', min: 1, max: 14, start: 1, mode: 'both', practiceTrials: 3,
  how: ['Two fractions face off.', 'Tap the larger one. When they are worth exactly the same, tap EQUAL (it appears from level 6).', 'Denominators grow and the fractions get closer together.'],
  makeTrial: logic.makeTrial,
  async play(trial, ctx) {
    const options = [{ node: fr(trial.a), value: 'a', cls: 'frbtn', aria: `${trial.a.n} over ${trial.a.d}` }, ...(trial.allowEqual ? [{ label: 'EQUAL', value: 'eq', cls: 'eqbtn' }] : []), { node: fr(trial.b), value: 'b', cls: 'frbtn', aria: `${trial.b.n} over ${trial.b.d}` }];
    const r = await choiceTrial(ctx, { prompt: 'Which is larger?', options, answer: trial.answer, timeMs: trial.timeMs, cols: options.length, flashMs: 520, hint: 'Practice: cross-multiply if you need to: n₁×d₂ against n₂×d₁.',
      keys: { ArrowLeft: 0, ArrowRight: options.length - 1 } });
    return { ...r, tags: { ...(r.correct ? { right: 1 } : { wrong: 1 }), ...(r.timedOut ? { omission: 1 } : {}) }, metric: { name: 'denominator', value: trial.maxDen },
      explain: r.correct ? '' : `${trial.a.n}/${trial.a.d} vs ${trial.b.n}/${trial.b.d}: ${trial.answer === 'eq' ? 'they are equal' : (trial.answer === 'a' ? trial.a : trial.b).n + '/' + (trial.answer === 'a' ? trial.a : trial.b).d + ' is larger'}.` };
  },
  summary: (g, s) => `${s.tags.right || 0} duels won, ${s.tags.wrong || 0} lost, ${s.tags.omission || 0} timed out${s.best.denominator ? `. Hardest tier cleared used denominators up to ${s.best.denominator}` : ''}.`,
};
