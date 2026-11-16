// Concepts 101–120: logic and problem-solving. Generators verify uniqueness by brute force where it matters.
import { std, runTrial, rich } from '../play.js';
import { h, now, audio } from '../engine.js';
import { choiceTrial } from '../kit.js';
import { glyph, tok, mc, numOpts, yesNo, NAMES, HUES, COLORS, SHAPES, range, permutations, sum } from '../gfx.js';

const C4 = ['red', 'blue', 'green', 'yellow'], S4 = ['circle', 'triangle', 'square', 'star'], P2 = ['solid', 'stripes'];
const objStr = (o) => `${o.pattern === 'stripes' ? 'striped ' : ''}${o.color} ${o.shape}`;
const RULES = [
  ...C4.map((c) => [`It is ${c}`, (o) => o.color === c]), ...S4.map((s) => [`It is a ${s}`, (o) => o.shape === s]), ['It is striped', (o) => o.pattern === 'stripes'],
  ...C4.map((c) => [`It is NOT ${c}`, (o) => o.color !== c]),
  ...C4.flatMap((c) => S4.map((s) => [`It is ${c} OR a ${s}`, (o) => o.color === c || o.shape === s])),
  ...C4.flatMap((c) => S4.map((s) => [`It is ${c} AND a ${s}`, (o) => o.color === c && o.shape === s])),
  ...S4.map((s) => [`It is a striped ${s}`, (o) => o.shape === s && o.pattern === 'stripes']),
];
const randObj = (rng) => ({ color: rng.pick(C4), shape: rng.pick(S4), pattern: rng.pick(P2) });
const ALL_OBJ = C4.flatMap((color) => S4.flatMap((shape) => P2.map((pattern) => ({ color, shape, pattern }))));

function housesPuzzle(rng, n, lv) {
  const people = rng.sample(NAMES, n), pets = rng.sample(['cat', 'dog', 'bird', 'fish', 'rabbit'], n), sol = { p: rng.shuffle(range(n)), q: rng.shuffle(range(n)) }; // p[i]=house of person i, q[j]=house of pet j
  const facts = [];
  for (let i = 0; i < n; i++) { facts.push({ t: `${people[i]} lives in house ${sol.p[i] + 1}.`, f: (P) => P.p[i] === sol.p[i] }); facts.push({ t: `${people[i]} does not live in house ${((sol.p[i] + 1) % n) + 1}.`, f: (P) => P.p[i] !== (sol.p[i] + 1) % n }); }
  for (let j = 0; j < n; j++) facts.push({ t: `The ${pets[j]} lives in house ${sol.q[j] + 1}.`, f: (P) => P.q[j] === sol.q[j] });
  for (let i = 0; i < n; i++) { const j = sol.q.indexOf(sol.p[i]); facts.push({ t: `${people[i]} owns the ${pets[j]}.`, f: (P) => P.q[j] === P.p[i] }); }
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b && sol.p[a] + 1 === sol.p[b]) facts.push({ t: `${people[a]} lives directly left of ${people[b]}.`, f: (P) => P.p[a] + 1 === P.p[b] });
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.abs(sol.p[i] - sol.q[j]) === 1) facts.push({ t: `The ${pets[j]} lives next door to ${people[i]}.`, f: (P) => Math.abs(P.p[i] - P.q[j]) === 1 });
  const perms = permutations(range(n)), space = []; for (const p of perms) for (const q of perms) space.push({ p, q });
  const pool = rng.shuffle(facts.filter((f) => lv < 5 || !/lives in house/.test(f.t) || rng.chance(0.35))); const chosen = []; let cand = space;
  for (const f of pool) { const nc = cand.filter(f.f); if (nc.length < cand.length) { chosen.push(f); cand = nc; } if (cand.length === 1) break; }
  if (cand.length !== 1) for (const f of facts) { if (cand.length === 1) break; const nc = cand.filter(f.f); if (nc.length < cand.length) { chosen.push(f); cand = nc; } }
  return { people, pets, sol, clues: rng.shuffle(chosen.map((c) => c.t)), unique: cand.length === 1 };
}
function robots(rng, n) {
  const R = ['A', 'B', 'C', 'D'].slice(0, n);
  for (let g = 0; g < 400; g++) {
    const st = R.map((_, i) => { const k = rng.int(0, 3), j = rng.pick(range(n).filter((x) => x !== i)), j2 = rng.pick(range(n).filter((x) => x !== i && x !== j));
      return k === 0 ? [`${R[j]} is a liar.`, (T) => !T[j]] : k === 1 ? [`${R[j]} is truthful.`, (T) => T[j]] : k === 2 ? [`${R[j]} and ${n > 2 ? R[j2] : R[i]} are the same type.`, (T) => T[j] === T[n > 2 ? j2 : i]] : [`Exactly one of us is truthful.`, (T) => T.filter(Boolean).length === 1]; });
    const sols = []; for (let m = 0; m < 1 << n; m++) { const T = R.map((_, i) => !!(m & (1 << i))); if (st.every(([, f], i) => f(T) === T[i])) sols.push(T); }
    if (sols.length === 1) return { R, st: st.map((s) => s[0]), T: sols[0] };
  }
  return null;
}
const truthLabel = (R, T) => { const t = R.filter((_, i) => T[i]); return t.length === 0 ? 'None are truthful' : t.length === R.length ? 'All are truthful' : `Only ${t.join(' and ')}`; };

export const G = [
  std({ num: 101, title: 'Rule Detective', max: 12,
    how: ['Objects are stamped ✓ ACCEPTED or ✗ REJECTED by a secret rule.', 'Study the examples and work out the rule.', 'Pick the rule that fits every example. Trickier rules as you improve.'],
    makeTrial(rng, lv) {
      const pool = lv <= 3 ? RULES.slice(0, 9) : lv <= 7 ? RULES.slice(0, 13 + 16) : RULES;
      for (let g = 0; g < 200; g++) {
        const truth = rng.pick(pool), dis = rng.sample(RULES.filter((r) => r !== truth), 3), ex = [];
        const need = Math.min(10, 5 + Math.floor(lv / 3)); let tries = 0;
        while (ex.length < need && tries++ < 300) { const o = randObj(rng); if (!ex.some((e) => objStr(e) === objStr(o))) ex.push(o); }
        if (!ex.some(truth[1]) || ex.every(truth[1])) continue;
        if (!dis.every((d) => ex.some((o) => d[1](o) !== truth[1](o)))) continue;
        return { kind: 'choice', promptHtml: `<span class="examples">${ex.map((o) => `<span class="${truth[1](o) ? 'acc' : 'rej'}">${glyph(o)}<b>${truth[1](o) ? '✓' : '✗'}</b></span>`).join('')}</span>`, prompt: 'Which rule decides?', options: rng.shuffle([truth, ...dis]).map((r) => ({ label: r[0], value: r[0] })), answer: truth[0], cols: 1 };
      }
      throw new Error('rule detective generation failed');
    } }),
  std({ num: 102, title: 'Mini Logic Houses', max: 12,
    how: ['People and pets live in a row of houses, numbered from the left.', 'Use the clues to work out who lives where with which pet.', 'Answer the question. More houses and less direct clues as you improve.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 3 : 4; let P; do { P = housesPuzzle(rng, n, lv); } while (!P.unique);
      const qPet = rng.chance(0.5), j = rng.int(0, n - 1);
      const ans = qPet ? P.people[P.sol.p.indexOf(P.sol.q[j])] : P.people[P.sol.p.indexOf(j)];
      return { kind: 'choice', promptHtml: `<span class="houses">${range(n).map((i) => `<span>🏠<b>${i + 1}</b></span>`).join('')}</span><span class="memo list">${P.clues.map((c) => `<span>• ${c}</span>`).join('')}</span>`,
        prompt: qPet ? `Who owns the ${P.pets[j]}?` : `Who lives in house ${j + 1}?`, options: P.people.map((p) => ({ label: p, value: p })), answer: ans, cols: n > 3 ? 2 : 3 };
    } }),
  std({ num: 104, title: 'Balance Mystery', max: 12, practiceTrials: 1,
    how: ['One coin is a fake: it is HEAVIER than the rest (from level 6 it may be heavier OR lighter).', 'Tap coins to put them on the left pan, tap again for the right pan, again to remove. Then press Weigh.', 'Use your limited weighings well, then name the fake.'],
    makeTrial(rng, lv) { const n = lv <= 2 ? 3 : lv <= 5 ? 6 : lv <= 8 ? 8 : 9, both = lv >= 6, fake = rng.int(0, n - 1), heavy = both ? rng.chance(0.5) : true, w = Math.ceil(Math.log(both ? 2 * n : n) / Math.log(3)) + (lv >= 9 ? 0 : 1); return { kind: 'choice', n, fake, heavy, both, weighs: w, prompt: '', options: range(n).map((i) => ({ label: String(i + 1), value: i })), answer: fake }; },
    async play(t, ctx) {
      const side = Array(t.n).fill(0), coins = range(t.n).map((i) => h('button', { class: 'coin', type: 'button' }, String(i + 1))); let left = t.weighs; const log = h('div', { class: 'memo list' });
      const beam = h('div', { class: 'beam' }), lp = h('div', { class: 'pan' }), rp = h('div', { class: 'pan' }), status = h('div', { class: 'status' });
      const weigh = h('button', { class: 'btn', type: 'button' }, '⚖ Weigh'), guess = h('button', { class: 'btn ghost', type: 'button' }, 'I know the fake →');
      const draw = () => { coins.forEach((c, i) => { c.className = 'coin' + (side[i] === 1 ? ' L' : side[i] === 2 ? ' R' : ''); }); lp.textContent = side.map((s, i) => (s === 1 ? i + 1 : null)).filter(Boolean).join(' '); rp.textContent = side.map((s, i) => (s === 2 ? i + 1 : null)).filter(Boolean).join(' '); status.textContent = `Weighings left: ${left}`; weigh.disabled = left <= 0; };
      coins.forEach((c, i) => (c.onclick = () => { side[i] = (side[i] + 1) % 3; audio.tap(); draw(); }));
      weigh.onclick = () => { if (left <= 0) return; left--; const wt = (k) => (k === t.fake ? (t.heavy ? 1.1 : 0.9) : 1); const L = sum(range(t.n).filter((i) => side[i] === 1).map(wt)), R = sum(range(t.n).filter((i) => side[i] === 2).map(wt));
        const res = Math.abs(L - R) < 1e-9 ? 0 : L > R ? 1 : -1; beam.style.transform = `rotate(${res * 10}deg)`; audio.tone(300 + res * 60, 0.2, 'triangle', 0.12);
        log.append(h('span', { class: 'in' }, `${lp.textContent || '—'}  ${res === 0 ? '=' : res > 0 ? '>' : '<'}  ${rp.textContent || '—'}`)); side.fill(0); draw(); };
      ctx.stage.replaceChildren(h('div', { class: 'trial' }, status, h('div', { class: 'scale' }, h('div', { class: 'beamwrap' }, beam), h('div', { class: 'pans' }, lp, rp)), h('div', { class: 'coins' }, coins), h('div', { class: 'actions' }, weigh, guess), log));
      draw(); await new Promise((r) => (guess.onclick = r));
      const r1 = await runTrial({ kind: 'choice', prompt: 'Which coin is fake?', options: range(t.n).map((i) => ({ label: String(i + 1), value: i })), answer: t.fake, cols: Math.min(5, t.n) }, ctx);
      if (!t.both || !r1.correct) return { ...r1, tags: { weighsUsed: t.weighs - left } };
      const r2 = await runTrial({ kind: 'choice', prompt: 'Heavier or lighter?', options: [{ label: 'Heavier', value: true }, { label: 'Lighter', value: false }], answer: t.heavy }, ctx);
      return { ...r2, tags: { weighsUsed: t.weighs - left } };
    } }),
  std({ num: 105, title: 'Sequence Laboratory', max: 12,
    how: ['A sequence follows a hidden rule.', 'Work out the rule and choose what comes next.', 'Alternating and interleaved rules appear as you improve.'],
    makeTrial(rng, lv) {
      const fams = lv <= 3 ? ['add', 'sub'] : lv <= 6 ? ['add', 'mul', 'sq', 'grow'] : ['mul', 'alt', 'inter', 'fib', 'grow', 'sq'];
      const f = rng.pick(fams), s = []; let a = rng.int(1, 9), k = rng.int(2, 6), k2 = rng.int(1, 5);
      for (let i = 0; i < 6; i++) { if (f === 'add') s.push(a + i * k); else if (f === 'sub') s.push(60 + a - i * k); else if (f === 'mul') s.push(a * Math.pow(Math.min(k, 3), i)); else if (f === 'sq') s.push((i + a % 4 + 1) ** 2); else if (f === 'grow') s.push(i ? s[i - 1] + k + i - 1 : a); else if (f === 'alt') s.push(i ? s[i - 1] + (i % 2 ? k : -k2) : a + 10); else if (f === 'inter') s.push(i % 2 ? 2 + k2 * ((i - 1) / 2 + 1) : a + k * (i / 2)); else s.push(i < 2 ? [a, k][i] : s[i - 1] + s[i - 2]); }
      const shown = s.slice(0, 5), ans = s[5], naive = shown[4] + (shown[4] - shown[3]);
      const o = new Set([ans, naive, ans + 1, ans - 1, ans + (shown[4] - shown[3]), ans * 2]); o.delete(undefined);
      return { kind: 'choice', promptHtml: `<span class="countline">${shown.map((x) => `<b>${x}</b>`).join('')}<b>?</b></span>`, prompt: 'Next number?', options: rng.shuffle([...o].filter((x) => x !== ans).slice(0, 3).concat([ans])).map((x) => ({ label: String(x), value: x })), answer: ans, cols: 4 };
    } }),
  std({ num: 106, title: 'Truthful Robots', max: 12,
    how: ['Each robot is either TRUTHFUL (always tells the truth) or a LIAR (always lies).', 'Read what each robot says.', 'Work out which robots are truthful. Every puzzle has exactly one solution.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 2 : lv <= 8 ? 3 : 4; let P; do { P = robots(rng, n); } while (!P);
      const all = []; for (let m = 0; m < 1 << n; m++) all.push(P.R.map((_, i) => !!(m & (1 << i))));
      const ans = truthLabel(P.R, P.T), opts = mc(rng, { label: ans, value: ans }, all.map((T) => ({ label: truthLabel(P.R, T), value: truthLabel(P.R, T) })), 4);
      return { kind: 'choice', promptHtml: `<span class="robots">${P.R.map((r, i) => `<span class="robot"><b>🤖 ${r}</b><i>“${P.st[i]}”</i></span>`).join('')}</span>`, prompt: 'Who is truthful?', options: opts, answer: ans, cols: 2 };
    } }),
  std({ num: 107, title: 'Constraint Garden', max: 12,
    how: ['Plants must go in a row of beds, following every gardening rule.', 'Exactly one of the layouts shown breaks no rule.', 'Find it. More plants and rules as you improve.'],
    makeTrial(rng, lv) {
      const n = lv <= 4 ? 4 : 5, pl = rng.sample(['Rose', 'Fern', 'Lily', 'Tulip', 'Sage', 'Iris', 'Mint'], n), sol = rng.shuffle(range(n)), pos = (p, a) => a.indexOf(p);
      const RU = [];
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) { if (pos(a, sol) < pos(b, sol)) RU.push([`${pl[a]} is somewhere left of ${pl[b]}.`, (x) => pos(a, x) < pos(b, x)]); if (Math.abs(pos(a, sol) - pos(b, sol)) === 1) RU.push([`${pl[a]} is next to ${pl[b]}.`, (x) => Math.abs(pos(a, x) - pos(b, x)) === 1]); else RU.push([`${pl[a]} is NOT next to ${pl[b]}.`, (x) => Math.abs(pos(a, x) - pos(b, x)) !== 1]); }
      for (let a = 0; a < n; a++) { const p = pos(a, sol); if (p !== 0 && p !== n - 1) RU.push([`${pl[a]} is not at either end.`, (x) => pos(a, x) !== 0 && pos(a, x) !== n - 1]); RU.push([`${pl[a]} is in bed ${p + 1}.`, (x) => pos(a, x) === p]); }
      const all = permutations(range(n)); let cand = all; const rules = [];
      for (const r of rng.shuffle(RU)) { if (/in bed/.test(r[0]) && rules.filter((x) => /in bed/.test(x[0])).length >= 1) continue; const nc = cand.filter(r[1]); if (nc.length < cand.length) { rules.push(r); cand = nc; } if (cand.length === 1) break; }
      const wrong = rng.sample(all.filter((x) => !rules.every((r) => r[1](x))), 3);
      const lay = (x) => x.map((i) => pl[i]).join(' · ');
      return { kind: 'choice', promptHtml: `<span class="memo list">${rules.map((r) => `<span>🌱 ${r[0]}</span>`).join('')}</span>`, prompt: 'Which layout follows every rule?', options: rng.shuffle([cand[0], ...wrong]).map((x) => ({ label: lay(x), value: lay(x) })), answer: lay(cand[0]), cols: 1 };
    } }),
  std({ num: 108, title: 'Cause-and-Effect Machine', max: 12,
    how: ['A machine has switches and lamps. Flip the switches and watch the lamps.', 'Experiment until you understand what controls the marked lamp.', 'Then choose the rule. Interacting switches appear as you improve.'],
    makeTrial(rng, lv) {
      const ns = lv <= 3 ? 2 : lv <= 7 ? 3 : 4, S = ['S1', 'S2', 'S3', 'S4'].slice(0, ns);
      const LIB = [...S.map((s, i) => [`${s} is ON`, (v) => v[i]]), ...S.map((s, i) => [`${s} is OFF`, (v) => !v[i]])];
      for (let i = 0; i < ns; i++) for (let j = i + 1; j < ns; j++) LIB.push([`${S[i]} AND ${S[j]} are ON`, (v) => v[i] && v[j]], [`${S[i]} OR ${S[j]} is ON`, (v) => v[i] || v[j]], ...(lv >= 6 ? [[`exactly one of ${S[i]}, ${S[j]} is ON`, (v) => v[i] !== v[j]]] : []));
      const pool = lv <= 3 ? LIB.filter((r) => !/AND|OR|exactly/.test(r[0])) : LIB, truth = rng.pick(lv >= 4 ? pool.filter((r) => /AND|OR|exactly/.test(r[0])) : pool);
      const inputs = range(1 << ns).map((m) => S.map((_, i) => !!(m & (1 << i)))), sig = (r) => inputs.map((v) => +r[1](v)).join('');
      const dis = []; for (const r of rng.shuffle(LIB)) { if (dis.length >= 3) break; if (sig(r) !== sig(truth) && !dis.some((d) => sig(d) === sig(r))) dis.push(r); }
      const other = rng.pick(LIB.filter((r) => sig(r) !== sig(truth)));
      return { kind: 'choice', S, truthIdx: LIB.indexOf(truth), otherIdx: LIB.indexOf(other), ns, lv, prompt: 'The GOLD lamp lights when…', options: rng.shuffle([truth, ...dis]).map((r) => ({ label: r[0], value: r[0] })), answer: truth[0], cols: 1 };
    },
    async play(t, ctx) {
      const S = t.S, ns = t.ns, LIB = [...S.map((s, i) => [`${s} is ON`, (v) => v[i]]), ...S.map((s, i) => [`${s} is OFF`, (v) => !v[i]])];
      for (let i = 0; i < ns; i++) for (let j = i + 1; j < ns; j++) LIB.push([`${S[i]} AND ${S[j]} are ON`, (v) => v[i] && v[j]], [`${S[i]} OR ${S[j]} is ON`, (v) => v[i] || v[j]], ...(t.lv >= 6 ? [[`exactly one of ${S[i]}, ${S[j]} is ON`, (v) => v[i] !== v[j]]] : []));
      const f = LIB[t.truthIdx][1], g = LIB[t.otherIdx][1], v = S.map(() => false); let flips = 0;
      const gold = h('i', { class: 'mlamp gold' }), blue = h('i', { class: 'mlamp blue' });
      const sw = S.map((s, i) => h('button', { class: 'switch2', type: 'button', onclick: (e) => { v[i] = !v[i]; flips++; e.currentTarget.classList.toggle('on', v[i]); audio.tone(400 + i * 80, 0.06, 'square', 0.06); upd(); } }, s));
      const upd = () => { gold.classList.toggle('lit', f(v)); blue.classList.toggle('lit', g(v)); };
      upd();
      const panel = h('div', { class: 'machine' }, h('div', { class: 'lamps' }, h('span', {}, gold, 'gold'), h('span', {}, blue, 'blue')), h('div', { class: 'switches' }, sw));
      const r = await choiceTrial(ctx, { promptNode: h('div', { class: 'qbox' }, panel, h('div', { class: 'q' }, t.prompt)), options: t.options, answer: t.answer, cols: 1 });
      return { ...r, tags: { experiments: flips } };
    } }),
  std({ num: 109, title: 'Minimal Clue', max: 12,
    how: ['One of the suspects is the hidden target.', 'Buy yes/no clues to narrow it down, but each clue costs a token and you have few.', 'Pick the target. Choose clues that split the suspects evenly.'],
    makeTrial(rng, lv) {
      const n = Math.min(12, 4 + lv), objs = rng.sample(ALL_OBJ, n), tgt = rng.int(0, n - 1), budget = Math.ceil(Math.log2(n)) + (lv >= 8 ? 0 : 1);
      return { kind: 'choice', objs, tgt, budget, prompt: 'Which one is it?', options: objs.map((o, i) => ({ html: glyph(o), value: i, cls: 'tile', aria: objStr(o) })), answer: tgt, cols: 4 };
    },
    async play(t, ctx) {
      const Q = [...C4.map((c) => [`${c}?`, (o) => o.color === c]), ...S4.map((s) => [`${s}?`, (o) => o.shape === s]), ['striped?', (o) => o.pattern === 'stripes']];
      let spent = 0; const out = h('div', { class: 'cluelog' }), bud = h('b', {}, `${t.budget} tokens`);
      const btns = Q.map(([q, f]) => h('button', { class: 'chipbtn', type: 'button', onclick: (e) => { if (spent >= t.budget || e.currentTarget.disabled) return; spent++; e.currentTarget.disabled = true; const yes = f(t.objs[t.tgt]); out.append(h('span', { class: yes ? 'yes' : 'no' }, `${q} ${yes ? 'YES' : 'NO'}`)); bud.textContent = `${t.budget - spent} tokens`; audio.tap(); if (spent >= t.budget) btns.forEach((b) => (b.disabled = true)); } }, 'Is it ' + q));
      const r = await choiceTrial(ctx, { promptNode: h('div', { class: 'qbox' }, h('div', { class: 'status' }, 'Clue tokens: ', bud), h('div', { class: 'chips2' }, btns), out, h('div', { class: 'q' }, 'Which one is it?')), options: t.options.map((o) => ({ ...o, node: rich(o.html) })), answer: t.tgt, cols: 4 });
      return { ...r, tags: { cluesUsed: spent } };
    } }),
  std({ num: 110, title: 'Counterexample Hunt', max: 12,
    how: ['Someone makes a claim about a group of objects.', 'Exactly one object proves the claim wrong.', 'Find that counterexample. Subtler claims as you improve.'],
    makeTrial(rng, lv) {
      const kind = lv <= 4 ? 'all' : rng.pick(['all', 'no', 'if']), c = rng.pick(C4), s = rng.pick(S4);
      let claim, bad, good;
      if (kind === 'all') { claim = `Every ${c} object is a ${s}.`; bad = (o) => o.color === c && o.shape !== s; }
      else if (kind === 'no') { claim = `No ${s} is ${c}.`; bad = (o) => o.shape === s && o.color === c; }
      else { const p = rng.pick(P2); claim = `If it is a ${s}, then it is ${p === 'stripes' ? 'striped' : 'solid'}.`; bad = (o) => o.shape === s && o.pattern !== p; }
      const bads = ALL_OBJ.filter(bad), goods = ALL_OBJ.filter((o) => !bad(o)), tempting = goods.filter((o) => o.color === c || o.shape === s);
      const cex = rng.pick(bads), others = rng.sample(lv >= 6 ? tempting : goods, 3);
      return { kind: 'choice', prompt: `Claim: “${claim}” Which object disproves it?`, options: rng.shuffle([cex, ...others]).map((o) => ({ html: glyph(o), value: objStr(o), cls: 'tile', aria: objStr(o) })), answer: objStr(cex), cols: 4 };
    } }),
  std({ num: 112, title: 'Bridge Limits', max: 12,
    how: ['Vehicles show their weight in tonnes. The bridge shows its limit.', 'Pick the group that can cross TOGETHER without going over the limit, and that includes every vehicle marked ★.', 'More vehicles and closer totals as you improve.'],
    makeTrial(rng, lv) {
      const V = ['Van', 'Truck', 'Bus', 'Car', 'Tractor', 'Lorry', 'Jeep'], k = Math.min(7, 4 + Math.floor(lv / 3)), names = rng.sample(V, k), w = names.map(() => rng.int(2, 9 + lv)), size = lv >= 6 ? 3 : 2, star = lv >= 4 ? rng.int(0, k - 1) : -1;
      const groups = []; const rec = (st, acc) => { if (acc.length === size) { groups.push(acc); return; } for (let i = st; i < k; i++) rec(i + 1, [...acc, i]); }; rec(0, []);
      const valid = groups.filter((g) => star < 0 || g.includes(star)), tot = (g) => sum(g.map((i) => w[i]));
      for (let tries = 0; tries < 50; tries++) {
        const good = rng.pick(valid), lim = tot(good) + rng.int(0, Math.max(0, 3 - Math.floor(lv / 4))), okAll = valid.filter((g) => tot(g) <= lim);
        const bads = groups.filter((g) => tot(g) > lim || (star >= 0 && !g.includes(star))); if (bads.length < 3) continue;
        const ds = rng.sample(bads, 3), lab = (g) => g.map((i) => names[i]).join(' + ');
        const others = okAll.filter((g) => g !== good); if (others.some((g) => ds.includes(g))) continue;
        return { kind: 'choice', promptHtml: `<span class="rule">Bridge limit: ${lim} t</span><span class="pack">${names.map((nm, i) => `<span class="tok" style="--th:${HUES[i]}">${i === star ? '★ ' : ''}${nm} · ${w[i]} t</span>`).join('')}</span>`, prompt: 'Which group can cross together?', options: rng.shuffle([good, ...ds]).map((g) => ({ label: lab(g), value: lab(g) })), answer: lab(good), cols: 1 };
      }
      return this.makeTrial(rng, Math.max(1, lv - 1));
    } }),
  std({ num: 113, title: 'Tile Equation', max: 12,
    how: ['Use number tiles and operator tiles to build an expression that equals the target.', 'Each number tile can be used only once. × is done before + and −.', 'Longer expressions as you improve.'],
    makeTrial(rng, lv) {
      const len = lv <= 4 ? 3 : 5, ops = lv <= 2 ? ['+'] : lv <= 6 ? ['+', '−'] : ['+', '−', '×'], nn = (len + 1) / 2, nums = rng.sample(range(9).map((x) => x + 1), nn + (lv >= 5 ? 2 : 1));
      const use = nums.slice(0, nn), expr = []; use.forEach((x, i) => { expr.push('n' + x); if (i < nn - 1) expr.push(rng.pick(ops)); });
      const val = evalExpr(expr); if (val < 0 || !Number.isFinite(val)) return this.makeTrial(rng, lv);
      return { kind: 'sequence', repeat: true, promptHtml: `<span class="target">Target <b>${val}</b></span>`, palette: [...rng.shuffle(nums).map((x) => ({ label: String(x), value: 'n' + x })), ...ops.map((o) => ({ label: o, value: o }))], answer: expr, target: val, prompt: `Build ${len} tiles: number, operator, number…`, cols: 5 };
    },
    check(t, resp) { if (resp.length !== t.answer.length) return false; for (let i = 0; i < resp.length; i++) if ((i % 2 === 0) !== resp[i].startsWith('n')) return false; const ns = resp.filter((x) => x.startsWith('n')); if (new Set(ns).size !== ns.length) return false; return Math.abs(evalExpr(resp) - t.target) < 1e-9; },
    hint: 'Any expression that hits the target counts.' }),
  std({ num: 114, title: 'Hidden Transformation', max: 12,
    how: ['A machine changes shapes. See what it does to a couple of examples.', 'Work out its transformation.', 'Pick what it would output for the new input. Combined transformations appear later.'],
    makeTrial(rng, lv) {
      const TF = [['rot90', (o) => ({ ...o, rot: (o.rot + 90) % 360 })], ['rot180', (o) => ({ ...o, rot: (o.rot + 180) % 360 })], ['recolor', (o) => ({ ...o, color: C4[(C4.indexOf(o.color) + 1) % 4] })], ['reshape', (o) => ({ ...o, shape: S4[(S4.indexOf(o.shape) + 1) % 4] })], ['stripe', (o) => ({ ...o, pattern: o.pattern === 'solid' ? 'stripes' : 'solid' })]];
      const k = lv >= 7 ? 2 : 1, chosen = rng.sample(TF, k), apply = (o) => chosen.reduce((a, [, f]) => f(a), o);
      const mk = () => ({ shape: rng.pick(['triangle', 'heart', 'star']), color: rng.pick(C4), pattern: 'solid', rot: 0 });
      const ex = [mk(), mk()], inp = mk(), out = apply(inp), key = (o) => `${o.shape}${o.color}${o.pattern}${o.rot}`;
      const ds = TF.filter((tf) => !chosen.includes(tf)).map(([, f]) => f(inp)).concat([inp, TF[0][1](out), TF[2][1](out)]).filter((o) => key(o) !== key(out));
      const opts = [{ html: glyph(out), value: key(out), cls: 'tile' }]; for (const d of rng.shuffle(ds)) { if (opts.length >= 4) break; if (!opts.some((o) => o.value === key(d))) opts.push({ html: glyph(d), value: key(d), cls: 'tile' }); }
      return { kind: 'choice', promptHtml: `<span class="xforms">${ex.map((e) => `<span>${glyph(e)}<i>→</i>${glyph(apply(e))}</span>`).join('')}<span class="new">${glyph(inp)}<i>→</i><b>?</b></span></span>`, prompt: '', options: rng.shuffle(opts), answer: key(out), cols: 4 };
    } }),
  std({ num: 115, title: 'Necessary or Sufficient', max: 12,
    how: ['Read the rule that governs a fictional machine.', 'Decide whether one condition is NECESSARY, SUFFICIENT, BOTH or NEITHER for another.', 'Chained rules appear as you improve.'],
    makeTrial(rng, lv) {
      const P = rng.sample(['the gate is open', 'the lever is up', 'the fan is on', 'the dial is green', 'the bell rings', 'the door unlocks', 'the light flashes', 'the pump runs'], 3), [A, B, Cc] = P;
      const forms = [['If A, then B.', 'S'], ['B happens only if A.', 'N'], ['A happens if and only if B.', 'BOTH'], ['If A, then B. If B, then C.', 'S_AC']];
      const f = rng.pick(lv >= 7 ? forms : forms.slice(0, 3)); let rule = f[0].replace(/A/g, A).replace(/B/g, B).replace(/C/g, Cc), x = A, y = B, ans;
      if (f[1] === 'S') ans = rng.chance(0.5) ? ['sufficient', A, B] : ['necessary', B, A];
      else if (f[1] === 'N') ans = rng.chance(0.5) ? ['necessary', A, B] : ['sufficient', B, A];
      else if (f[1] === 'BOTH') ans = ['both', A, B];
      else ans = rng.chance(0.5) ? ['sufficient', A, Cc] : ['necessary', Cc, A];
      if (lv >= 4 && rng.chance(0.2)) { rule = `If ${A}, then ${B}.`; ans = ['neither', Cc, B]; }
      [, x, y] = ans;
      return { kind: 'choice', promptHtml: `<span class="rule">${rule[0].toUpperCase() + rule.slice(1)}</span>`, prompt: `“${x}” is ___ for “${y}”.`, options: ['necessary', 'sufficient', 'both', 'neither'].map((v) => ({ label: v === 'both' ? 'both necessary and sufficient' : v === 'neither' ? 'neither (the rule doesn’t say)' : v, value: v })), answer: ans[0], cols: 1 };
    } }),
  std({ num: 116, title: 'Puzzle Repair', max: 12,
    how: ['Each row and column of the grid has a total written beside it.', 'Exactly one of those totals is wrong, which makes the puzzle impossible.', 'Find the broken clue.'],
    makeTrial(rng, lv) {
      const n = lv <= 5 ? 3 : 4, g = range(n * n).map(() => rng.int(1, 9)), rs = range(n).map((r) => sum(g.slice(r * n, r * n + n))), cs = range(n).map((c) => sum(range(n).map((r) => g[r * n + c])));
      const clues = [...rs.map((v, i) => ({ id: 'R' + (i + 1), v })), ...cs.map((v, i) => ({ id: 'C' + (i + 1), v }))], bad = rng.int(0, clues.length - 1); clues[bad].v += rng.pick([-3, -2, -1, 1, 2, 3].slice(lv >= 8 ? 2 : 0, lv >= 8 ? 4 : 6));
      const row = (r) => `<span class="pr">${range(n).map((c) => `<b>${g[r * n + c]}</b>`).join('')}<em>${clues[r].v}</em></span>`;
      return { kind: 'choice', promptHtml: `<span class="sumgrid">${range(n).map(row).join('')}<span class="pr cols">${range(n).map((c) => `<em>${clues[n + c].v}</em>`).join('')}<em></em></span></span>`, prompt: 'Which total is wrong?', options: clues.map((c, i) => ({ label: `${c.id[0] === 'R' ? 'Row' : 'Col'} ${c.id.slice(1)} = ${c.v}`, value: i })), answer: bad, cols: n };
    } }),
  std({ num: 117, title: 'Set Builder', max: 12,
    how: ['A set is described with AND, OR and NOT.', 'Select every object that belongs to the set, then press Done.', 'More complex descriptions as you improve.'],
    makeTrial(rng, lv) {
      const c = rng.pick(C4), s = rng.pick(S4), s2 = rng.pick(S4.filter((x) => x !== s)), forms = [[`${c}`, (o) => o.color === c], [`${c} AND NOT ${s}`, (o) => o.color === c && o.shape !== s], [`${s} OR ${s2}`, (o) => o.shape === s || o.shape === s2],
        [`(${s} OR ${s2}) AND striped`, (o) => (o.shape === s || o.shape === s2) && o.pattern === 'stripes'], [`NOT ${c} AND NOT ${s}`, (o) => o.color !== c && o.shape !== s], [`${c} OR (${s} AND striped)`, (o) => o.color === c || (o.shape === s && o.pattern === 'stripes')]];
      const [txt, f] = rng.pick(forms.slice(0, lv <= 3 ? 2 : lv <= 7 ? 4 : 6)); let items;
      do { items = rng.sample(ALL_OBJ, Math.min(16, 8 + lv)); } while (!items.some(f) || items.every(f));
      return { kind: 'multi', promptHtml: `<span class="rule">Set: ${txt.replace(/ AND /g, ' <b>AND</b> ').replace(/ OR /g, ' <b>OR</b> ').replace(/NOT /g, '<b>NOT</b> ')}</span>`, prompt: 'Select every member', items: items.map((o) => ({ html: glyph(o), value: objStr(o), aria: objStr(o) })), answer: items.filter(f).map(objStr), cols: 4 };
    } }),
  std({ num: 118, title: 'Invariant Hunt', max: 12,
    how: ['Watch a board change through several legal moves.', 'Something always stays the same, no matter which moves are made.', 'Spot what never changes. Less obvious properties as you improve.'],
    makeTrial(rng, lv) {
      const n = 6, kinds = lv <= 4 ? ['swap', 'pile'] : ['swap', 'pile', 'flip2', 'rotate'], k = rng.pick(kinds);
      let st = range(n).map(() => (k === 'flip2' ? rng.chance(0.5) : rng.int(0, 3))); const states = [st];
      for (let m = 0; m < 3; m++) { let x = [...st]; const i = rng.int(0, n - 2);
        if (k === 'swap') { const j = rng.pick(range(n).filter((y) => x[y] !== x[i])); [x[i], x[j]] = [x[j], x[i]]; } else if (k === 'flip2') { x[i] = !x[i]; x[i + 1] = !x[i + 1]; } else if (k === 'pile') { const a = rng.pick(range(n).filter((y) => x[y] > 0)), b = rng.pick(range(n).filter((y) => y !== a)); x[a]--; x[b]++; } else x = [...x.slice(1), x[0]];
        states.push(x); st = x; }
      const PROPS = { swap: 'How many of each colour there are', flip2: 'Whether the number of lit coins is even or odd', pile: 'The total number of stones', rotate: 'The order of colours going around the ring' };
      const T = { swap: 'Two tiles swap places', flip2: 'Two neighbouring coins flip', pile: 'One stone moves to another pile', rotate: 'Everything shifts one place around the ring' };
      const EV = { 'The colour of the first tile': ['swap', 'rotate', (x) => x[0]], 'Which pile is the biggest': ['pile', null, (x) => x.indexOf(Math.max(...x))], 'The number of lit coins': ['flip2', null, (x) => x.filter(Boolean).length], 'The position of the yellow tile': ['swap', 'rotate', (x) => x.indexOf(3)], 'How many piles are empty': ['pile', null, (x) => x.filter((v) => v === 0).length], 'The colour of the last tile': ['swap', 'rotate', (x) => x[x.length - 1]], 'The size of the first pile': ['pile', null, (x) => x[0]], 'Whether the first coin is lit': ['flip2', null, (x) => x[0]] };
      const changes = (f) => new Set(states.map((x) => JSON.stringify(f(x)))).size > 1;
      const others = Object.entries(EV).filter(([, [k1, k2, f]]) => (k1 === k || k2 === k) && changes(f)).map(([n]) => n);
      const filler = Object.keys(EV).filter((n) => !others.includes(n)).filter((n) => EV[n][0] !== k && EV[n][1] !== k);
      while (others.length < 3) others.push(filler.splice(rng.int(0, filler.length - 1), 1)[0]);
      const col = ['#ff5a5f', '#4d94ff', '#2fd38a', '#ffd84a'];
      const draw = (x) => `<span class="ivrow">${x.map((v) => (k === 'flip2' ? `<i class="coin2 ${v ? 'on' : ''}"></i>` : k === 'pile' ? `<i class="pile">${'●'.repeat(v) || '·'}</i>` : `<i class="tile2" style="background:${col[v]}"></i>`)).join('')}</span>`;
      return { kind: 'choice', promptHtml: `<span class="rule">Legal move: ${T[k]}</span><span class="ivstates">${states.map(draw).join('<b>↓</b>')}</span>`, prompt: 'What can never change?', options: rng.shuffle([PROPS[k], ...rng.sample(others, 3)]).map((x) => ({ label: x, value: x })), answer: PROPS[k], cols: 1 };
    } }),
  std({ num: 119, title: 'Analogy Workshop', max: 10,
    how: ['Complete the relationship: A is to B as C is to ?', 'Look for the RELATION between A and B, not for words that merely go together.', 'Concrete relations first, abstract ones later.'],
    makeTrial(rng, lv) {
      const BANK = [
        ['rotation', 'orientation', 'resizing', 'size', ['shape', 'rotation', 'colour']], ['thermometer', 'temperature', 'scale', 'weight', ['kitchen', 'fish', 'height']], ['seed', 'tree', 'egg', 'bird', ['nest', 'shell', 'yolk']],
        ['author', 'novel', 'composer', 'symphony', ['orchestra', 'piano', 'audience']], ['map', 'territory', 'recipe', 'dish', ['chef', 'kitchen', 'ingredient']], ['drought', 'thirst', 'famine', 'hunger', ['rain', 'harvest', 'food']],
        ['key', 'lock', 'password', 'account', ['keyboard', 'secret', 'letters']], ['lens', 'focus', 'filter', 'purity', ['coffee', 'camera', 'water']], ['caterpillar', 'butterfly', 'tadpole', 'frog', ['pond', 'fish', 'lily']],
        ['brake', 'speed', 'thermostat', 'temperature', ['heat', 'house', 'winter']], ['index', 'book', 'menu', 'restaurant', ['food', 'waiter', 'price']], ['cell', 'organism', 'brick', 'wall', ['cement', 'house', 'clay']],
        ['prologue', 'story', 'overture', 'opera', ['singer', 'stage', 'music']], ['vaccine', 'disease', 'firewall', 'intrusion', ['computer', 'fire', 'network']],
      ];
      const [a, b, c, d, ds] = rng.pick(lv <= 4 ? BANK.slice(2, 9) : BANK);
      return { kind: 'choice', promptHtml: `<span class="analogy"><b>${a}</b> : <b>${b}</b> :: <b>${c}</b> : <b>?</b></span>`, prompt: '', options: rng.shuffle([d, ...ds]).map((x) => ({ label: x, value: x })), answer: d, cols: 2 };
    } }),
  std({ num: 120, title: 'Proof Path', max: 12,
    how: ['An equation is solved step by step, but the steps are shuffled.', 'Put the steps in a valid order, so each follows from the one before.', 'Longer derivations as you improve.'],
    makeTrial(rng, lv) {
      const x = rng.int(1, 9), a = rng.int(2, 6); let steps;
      if (lv <= 5) { const b = rng.int(1, 15), c = a * x + b; steps = [`${a}x + ${b} = ${c}`, `${a}x = ${c} − ${b}`, `${a}x = ${c - b}`, `x = ${c - b} ÷ ${a}`, `x = ${x}`]; }
      else { const d = rng.int(1, a - 1), b = rng.int(1, 12), e = (a - d) * x + b; steps = [`${a}x + ${b} = ${d}x + ${e}`, `${a}x − ${d}x + ${b} = ${e}`, `${a - d}x + ${b} = ${e}`, `${a - d}x = ${e - b}`, `x = ${e - b} ÷ ${a - d}`, `x = ${x}`]; }
      return { kind: 'order', textItems: true, items: rng.shuffle(steps).map((s) => ({ label: s, value: s })), answer: steps, prompt: 'Order the steps from the original equation to the answer' };
    } }),
];
function evalExpr(tokens) {
  const v = tokens.map((t) => (t.startsWith('n') ? +t.slice(1) : t)), st = [v[0]];
  for (let i = 1; i < v.length; i += 2) { const op = v[i], n = v[i + 1]; if (op === '×') st[st.length - 1] *= n; else st.push(op === '+' ? n : -n); }
  return sum(st);
}
