// Structural validation of every generated trial in every pack game, at every level.
// node tests/validate.mjs [packFile ...]
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { RNG } from '../js/engine.js';
import { KINDS } from '../js/play.js';

const J = (x) => JSON.stringify(x);
export function validate(t, g, path = 'trial') {
  assert.ok(KINDS[t.kind], `${path}: unknown kind ${t.kind}`);
  const frames = t.study ? t.study.frames || [t.study] : [];
  frames.forEach((f, i) => assert.ok(f.html != null || f.label != null, `${path}: study frame ${i} empty`));
  const vals = (arr) => arr.map((o) => J(o.value));
  const hasFace = (o) => o.html != null || (o.label != null && o.label !== undefined);
  if (t.distract) { assert.ok(vals(t.distract.options).includes(J(t.distract.answer)), `${path}: distract answer missing`); }
  if (t.kind === 'choice') {
    assert.ok(t.options.length >= 2, `${path}: <2 options`);
    assert.equal(new Set(vals(t.options)).size, t.options.length, `${path}: duplicate option values ${vals(t.options)}`);
    assert.ok(['string', 'number', 'boolean'].includes(typeof t.answer), `${path}: answer must be primitive`);
    assert.equal(t.options.filter((o) => o.value === t.answer).length, 1, `${path}: answer ${J(t.answer)} not among options ${vals(t.options)}`);
    t.options.forEach((o) => assert.ok(hasFace(o), `${path}: option without label/html`));
    if (!t.options.some((o) => /cellbtn/.test(o.cls || ''))) { const face = (o) => J(o.label ?? o.html), af = face(t.options.find((o) => o.value === t.answer)); assert.equal(t.options.filter((o) => face(o) === af).length, 1, `${path}: another option looks identical to the answer`); }
  } else if (t.kind === 'sequence' || t.kind === 'order') {
    const pal = t.palette || t.items, pv = vals(pal);
    assert.equal(new Set(pv).size, pv.length, `${path}: duplicate palette values`);
    t.answer.forEach((a) => assert.ok(pv.includes(J(a)), `${path}: answer item ${J(a)} not in palette`));
    if (!t.repeat) assert.equal(new Set(t.answer.map(J)).size, t.answer.length, `${path}: repeated item in no-repeat answer`);
    assert.ok(t.answer.length >= 1);
  } else if (t.kind === 'multi') {
    const iv = vals(t.items); assert.equal(new Set(iv).size, iv.length, `${path}: duplicate items`);
    t.answer.forEach((a) => assert.ok(iv.includes(J(a)), `${path}: multi answer ${J(a)} not in items`));
    if (t.need) assert.equal(t.need, t.answer.length, `${path}: need != answer length`);
  } else if (t.kind === 'numeric') {
    assert.ok(Number.isFinite(t.answer), `${path}: numeric answer not finite`);
    if (t.answer < 0) assert.ok(t.allowNeg, `${path}: negative answer without allowNeg`);
    if (!Number.isInteger(t.answer) && !t.tol) assert.ok(t.allowDec, `${path}: decimal answer without allowDec`);
  } else if (t.kind === 'stream') {
    assert.equal(t.items.length, t.targets.length, `${path}: items/targets length`);
    assert.ok(t.targets.some(Boolean), `${path}: stream has no targets`);
  } else if (t.kind === 'assign') {
    const lv = vals(t.left), rv = vals(t.right);
    assert.equal(new Set(lv).size, lv.length, `${path}: duplicate left`); assert.equal(new Set(rv).size, rv.length, `${path}: duplicate right`);
    for (const l of t.left) { const a = t.answer[J(l.value)]; assert.ok(a !== undefined, `${path}: no answer for ${J(l.value)}`); assert.ok(rv.includes(J(a)), `${path}: answer ${J(a)} not on right`); }
    if (t.unique) { const av = t.left.map((l) => J(t.answer[J(l.value)])); assert.equal(new Set(av).size, av.length, `${path}: unique assign has repeated answers`); }
  } else if (t.kind === 'steps') {
    assert.ok(t.steps.length >= 1); t.steps.forEach((s, i) => validate(s, {}, `${path}.step${i}`));
  } else if (t.kind === 'typing') {
    assert.ok(t.need >= 1 && t.accept.length >= t.need, `${path}: typing accept list too small`);
  }
  if (g.check && t.kind !== 'steps') {
    const canon = t.kind === 'assign' ? Object.fromEntries(t.left.map((l) => [J(l.value), t.answer[J(l.value)]])) : t.answer;
    assert.ok(g.check(t, canon), `${path}: game.check rejects the canonical answer`);
  }
  if (g.verify) g.verify(t);
}

const dir = new URL('../js/games/', import.meta.url);
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.startsWith('pack-'));
let games = 0, trials = 0, fails = 0;
for (const f of files) {
  const { G } = await import(new URL(f, dir));
  for (const g of G) {
    games++;
    try {
      assert.ok(g.id && g.num && g.title && g.how?.length >= 2, 'metadata');
      for (let lv = g.min; lv <= g.max; lv++) for (let s = 0; s < 30; s++) {
        const a = g.makeTrial(new RNG(`v${s}:${lv}`), lv, {}), b = g.makeTrial(new RNG(`v${s}:${lv}`), lv, {});
        assert.deepEqual(a, b, `level ${lv} seed ${s}: not deterministic`);
        validate(a, g, `level ${lv} seed ${s}`); trials++;
      }
    } catch (e) { fails++; console.log(`FAIL ${g.num} ${g.title}: ${e.message.split('\n')[0]}`); }
  }
}
console.log(`${games} games, ${trials} trials validated, ${fails} failing games`);
process.exit(fails ? 1 : 0);
