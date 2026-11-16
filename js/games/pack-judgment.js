// Concepts 181–200: decision-making, behavioural habits and metacognition. All scenarios are fictional.
import { std, runTrial } from '../play.js';
import { h, now, audio } from '../engine.js';
import { tok, card, mc, numOpts, yesNo, HUES, NAMES, OBJECTS, range, sum } from '../gfx.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const bucketOpts = (rng, val, step = 0.1) => { const c = Math.round(val / step) * step, set = new Set([c]); while (set.size < 4) { const d = c + step * rng.pick([-3, -2, -1, 1, 2, 3]); if (d >= 0 && d <= 1) set.add(+d.toFixed(2)); } return [...set].sort((a, b) => a - b).map((v) => ({ label: pct(v), value: +v.toFixed(2) })); };
const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const CATS = { fruit: ['apple', 'mango', 'pear', 'plum', 'kiwi', 'fig'], tools: ['hammer', 'saw', 'drill', 'wrench', 'chisel', 'pliers'], birds: ['owl', 'robin', 'heron', 'finch', 'crane', 'swift'], fabric: ['linen', 'denim', 'silk', 'wool', 'satin', 'tweed'] };

export const G = [
  std({ num: 181, title: 'Confidence Compass', max: 12,
    how: ['Answer a quick comparison question.', 'BEFORE you find out if you were right, say how sure you are.', 'Your results compare how sure you said you were with how often you were right.'],
    makeTrial(rng, lv) {
      const kind = rng.pick(['mul', 'time', 'frac']); let A, B, a, b;
      if (kind === 'mul') { const x = rng.int(11, 29 + lv * 2), y = rng.int(11, 29); a = x * y; b = a + rng.int(-Math.max(3, 60 - lv * 5), Math.max(3, 60 - lv * 5)); if (a === b) b++; A = `${x} × ${y}`; B = String(b); }
      else if (kind === 'time') { const d = rng.int(2, 9), hh = d * 24 + rng.int(-20, 20); a = d * 24; b = hh === a ? hh + 1 : hh; A = `${d} days`; B = `${b} hours`; }
      else { const n1 = rng.int(2, 8), d1 = rng.int(n1 + 1, 12), n2 = rng.int(2, 8), d2 = rng.int(n2 + 1, 12); a = n1 / d1; b = n2 / d2; if (Math.abs(a - b) < 1e-9) return this.makeTrial(rng, lv); A = `${n1}/${d1}`; B = `${n2}/${d2}`; }
      return { kind: 'choice', confidence: true, prompt: 'Which is larger?', options: [{ label: A, value: 'A' }, { label: B, value: 'B' }], answer: a > b ? 'A' : 'B', timeMs: Math.max(3000, 8000 - lv * 300) };
    } }),
  std({ num: 182, title: 'Evidence Updater', max: 12,
    how: ['A parcel came from Warehouse A or Warehouse B. You know how common each is.', 'Then a clue arrives, and you know how often each warehouse produces that clue.', 'Pick the best updated chance that it came from A.'],
    makeTrial(rng, lv) {
      let prior, lA, lB, post; do { prior = rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]); lA = rng.pick([0.6, 0.7, 0.8, 0.9]); lB = rng.pick([0.1, 0.2, 0.3, 0.4]); post = (prior * lA) / (prior * lA + (1 - prior) * lB); } while (Math.abs(post * 10 - Math.round(post * 10)) > 0.3);
      const clue = rng.pick(['a blue label', 'a dented corner', 'a handwritten note']);
      const counts = lv <= 4 ? `<span class="memo list"><span>Of 100 parcels: ${prior * 100} from A, ${100 - prior * 100} from B.</span><span>${lA * 100}% of A’s parcels have ${clue}; ${lB * 100}% of B’s do.</span></span>` : `<span class="memo list"><span>P(from A) = ${pct(prior)}</span><span>P(${clue} | A) = ${pct(lA)} · P(${clue} | B) = ${pct(lB)}</span></span>`;
      return { kind: 'choice', promptHtml: counts, prompt: `This parcel has ${clue}. Closest chance it came from A?`, options: bucketOpts(rng, post), answer: +(Math.round(post / 0.1) * 0.1).toFixed(2), cols: 2, explain: `Exactly ${(post * 100).toFixed(1)}%: ${prior * 100}×${lA * 100} ÷ (${prior * 100}×${lA * 100} + ${100 - prior * 100}×${lB * 100}).` };
    } }),
  std({ num: 183, title: 'Base-Rate Detective', max: 12,
    how: ['A scanner checks robots for a rare fault. It is good, but not perfect.', 'Use how common the fault is AND how accurate the scanner is.', 'Of the robots the scanner flags, what share really have the fault?'],
    makeTrial(rng, lv) {
      const N = 1000; let base, sens, fp, tp, fpn, share; do { base = rng.pick([0.01, 0.02, 0.05, 0.1, 0.2]); sens = rng.pick([0.8, 0.9, 0.95]); fp = rng.pick([0.05, 0.1, 0.2]); tp = N * base * sens; fpn = N * (1 - base) * fp; share = tp / (tp + fpn); } while (Math.abs(share * 10 - Math.round(share * 10)) > 0.3);
      return { kind: 'choice', promptHtml: `<span class="memo list"><span>1,000 robots; ${N * base} have the fault.</span><span>The scanner flags ${pct(sens)} of faulty robots, and wrongly flags ${pct(fp)} of healthy ones.</span>${lv <= 4 ? `<span>So it flags ${tp} faulty + ${fpn} healthy robots.</span>` : ''}</span>`, prompt: 'A robot is flagged. Closest chance it is faulty?', options: bucketOpts(rng, share, 0.1), answer: +(Math.round(share / 0.1) * 0.1).toFixed(2), cols: 2, explain: `${tp} true flags out of ${tp + fpn} flags = ${(share * 100).toFixed(1)}%.` };
    } }),
  std({ num: 184, title: 'Sample-Size Studio', max: 12,
    how: ['Two tests were run on coins suspected of landing heads too often.', 'One test used fewer flips with a more extreme result; the other more flips with a milder result.', 'Which result is STRONGER evidence that its coin really is biased?'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 200; g++) { const n1 = rng.pick([10, 12, 20]), k1 = rng.int(Math.ceil(n1 * 0.6), n1 - 1), n2 = rng.pick([100, 200, 400]), k2 = rng.int(Math.ceil(n2 * 0.53), Math.ceil(n2 * 0.62)); const z = (k, n) => (k - n / 2) / Math.sqrt(n / 4), z1 = z(k1, n1), z2 = z(k2, n2); if (Math.abs(z1 - z2) < 0.8 - lv * 0.03) continue;
        const swap = rng.chance(0.5), A = swap ? [n2, k2] : [n1, k1], B = swap ? [n1, k1] : [n2, k2], zA = z(A[1], A[0]), zB = z(B[1], B[0]);
        return { kind: 'choice', prompt: 'Which result is stronger evidence of bias?', options: [{ label: `Coin A: ${A[1]} heads in ${A[0]} flips (${pct(A[1] / A[0])})`, value: 'A' }, { label: `Coin B: ${B[1]} heads in ${B[0]} flips (${pct(B[1] / B[0])})`, value: 'B' }], answer: zA > zB ? 'A' : 'B', cols: 1, explain: `Distance from 50% in “standard errors”: A ${zA.toFixed(1)}, B ${zB.toFixed(1)}. Bigger samples make a smaller lean more convincing.` }; }
      throw new Error('sample gen');
    } }),
  std({ num: 185, title: 'Confirmation Trap', max: 12,
    how: ['Two explanations of a machine’s behaviour fit everything seen so far.', 'You may test ONE input number.', 'Pick the test whose result would tell the two explanations apart.'],
    makeTrial(rng, lv) {
      const RU = [['lights for even numbers', (x) => x % 2 === 0], ['lights for numbers above 5', (x) => x > 5], ['lights for multiples of 3', (x) => x % 3 === 0], ['lights for numbers below 8', (x) => x < 8], ['lights for odd numbers', (x) => x % 2 === 1], ['lights for numbers with a 1 in them', (x) => String(x).includes('1')]];
      for (let g = 0; g < 200; g++) { const [a, b] = rng.sample(RU, 2), xs = range(12).map((i) => i + 1), diff = xs.filter((x) => a[1](x) !== b[1](x)), same = xs.filter((x) => a[1](x) === b[1](x)); if (!diff.length || same.length < 3) continue;
        const seen = rng.sample(same, 2).map((x) => `${x} → ${a[1](x) ? 'ON' : 'off'}`), d = rng.pick(diff), opts = [d, ...rng.sample(same, 3)];
        return { kind: 'choice', promptHtml: `<span class="memo list"><span>Explanation 1: it ${a[0]}.</span><span>Explanation 2: it ${b[0]}.</span><span>Seen so far: ${seen.join(', ')}</span></span>`, prompt: 'Which number should you test?', options: rng.shuffle(opts).map((x) => ({ label: String(x), value: x })), answer: d, cols: 4, explain: `For ${d}, explanation 1 predicts ${a[1](d) ? 'ON' : 'off'} and explanation 2 predicts ${b[1](d) ? 'ON' : 'off'}. The others give the same prediction either way.` }; }
      throw new Error('confirm gen');
    } }),
  std({ num: 186, title: 'Sunk-Cost Expedition', max: 12,
    how: ['Your expedition has already spent a lot. That money is gone whatever you choose.', 'Compare only what happens FROM NOW ON: future costs and expected rewards.', 'Choose the option with the better expected outcome from here.'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 100; g++) { const spent = rng.int(20, 90) * 10, c = rng.int(5, 40) * 10, p = rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]), V = rng.int(30, 120) * 10, alt = rng.int(5, 50) * 10, evC = p * V - c; if (Math.abs(evC - alt) < 40) continue;
        const story = lv >= 5 ? ' The crew has worked so hard, and turning back now would feel like wasting everything.' : '';
        return { kind: 'choice', promptHtml: `<span class="memo list"><span>Already spent: <b>${spent} coins</b>.${story}</span><span>Continue: costs ${c} more; ${pct(p)} chance of finding treasure worth ${V}.</span><span>Switch: take a sure contract worth ${alt} instead.</span></span>`, prompt: 'Better choice from here?', options: [{ label: 'Continue', value: 'C' }, { label: 'Switch', value: 'S' }], answer: evC > alt ? 'C' : 'S', explain: `Continue is worth ${p}×${V} − ${c} = ${evC.toFixed(0)} on average; switching is ${alt}. The ${spent} already spent is the same either way.` }; }
      throw new Error('sunk gen');
    } }),
  std({ num: 187, title: 'Framing Mirror', max: 12,
    how: ['Two descriptions of a plan are shown, one in terms of gains and one in terms of losses.', 'Decide whether they describe EXACTLY the same outcome.', 'Wording tricks get subtler as you improve.'],
    makeTrial(rng, lv) {
      const total = rng.pick([600, 800, 1000, 1200]), saved = rng.int(2, 8) * total / 10, same = rng.chance(0.5), lost = same ? total - saved : total - saved + rng.pick([-1, 1]) * rng.pick([total / 20, total / 10]);
      const T = rng.pick([['trees', 'survive', 'are lost'], ['jobs', 'are kept', 'are cut'], ['crates', 'are rescued', 'are ruined']]);
      return { kind: 'choice', promptHtml: `<span class="memo list"><span>Plan X: of ${total} ${T[0]}, <b>${saved} ${T[1]}</b>.</span><span>Plan Y: of ${total} ${T[0]}, <b>${lost} ${T[2]}</b>.</span></span>`, prompt: 'Same outcome?', options: yesNo('Equivalent', 'Different'), answer: same, tag: same ? 'same' : 'diff', explain: `${saved} + ${lost} ${same ? '=' : '≠'} ${total}.` };
    } }),
  std({ num: 188, title: 'Forecast Tournament', max: 12,
    how: ['A transparent game of chance is described: dice or coins, all fair.', 'Forecast the chance of the event.', 'Pick the range that contains the true probability. Harder events as you improve.'],
    makeTrial(rng, lv) {
      const B = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.0001]];
      for (let g = 0; g < 200; g++) { let p, txt; const k = rng.pick(lv <= 4 ? ['die', 'sum'] : ['sum', 'coins', 'atleast']);
        if (k === 'die') { const t = rng.int(2, 6); p = (7 - t) / 6; txt = `Roll one die. Chance of ${t} or more?`; }
        else if (k === 'sum') { const t = rng.int(4, 11); let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= t) c++; p = c / 36; txt = `Roll two dice. Chance the total is ${t} or more?`; }
        else if (k === 'coins') { const n = rng.int(3, 6), m = rng.int(1, n - 1); p = sum(range(n - m + 1).map((i) => comb(n, m + i))) / 2 ** n; txt = `Flip ${n} coins. Chance of at least ${m} heads?`; }
        else { const n = rng.int(2, 5); p = 1 - (5 / 6) ** n; txt = `Roll ${n} dice. Chance at least one shows a 6?`; }
        if (B.some(([a]) => Math.abs(p - a) < 0.025) || Math.abs(p - 1) < 0.01) continue;
        const bi = B.findIndex(([a, b]) => p >= a && p < b);
        return { kind: 'choice', prompt: txt, options: B.map(([a, b], i) => ({ label: `${Math.round(a * 100)}–${Math.min(100, Math.round(b * 100))}%`, value: i })), answer: bi, cols: 3, explain: `Exact chance: ${(p * 100).toFixed(1)}%.` }; }
      throw new Error('forecast gen');
    } }),
  std({ num: 189, title: 'Information Value', max: 12,
    how: ['You must choose an action without knowing the weather. A forecast is for sale.', 'Compare your expected payoff with and without it, minus its price.', 'Is the forecast worth buying? Unreliable forecasts appear later.'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 200; g++) { const p = rng.pick([0.3, 0.4, 0.5, 0.6, 0.7]), pay = { open: [rng.int(60, 100), rng.int(-40, 0)], shut: [rng.int(10, 30), rng.int(10, 30)] }, price = rng.int(2, 25);
        const ev = (a) => p * pay[a][0] + (1 - p) * pay[a][1], noInfo = Math.max(ev('open'), ev('shut')), withInfo = p * Math.max(pay.open[0], pay.shut[0]) + (1 - p) * Math.max(pay.open[1], pay.shut[1]), gain = withInfo - noInfo;
        if (Math.abs(gain - price) < 4) continue;
        return { kind: 'choice', promptHtml: `<span class="memo list"><span>Chance of sun: ${pct(p)}.</span><span>Open the stall: earn ${pay.open[0]} if sunny, ${pay.open[1]} if rainy.</span><span>Stay shut: earn ${pay.shut[0]} if sunny, ${pay.shut[1]} if rainy.</span><span>A perfect forecast costs <b>${price}</b>.</span></span>`, prompt: 'Buy the forecast?', options: yesNo('Buy it', 'Skip it'), answer: gain > price, explain: `Without it you expect ${noInfo.toFixed(1)}; with it ${withInfo.toFixed(1)}. It adds ${gain.toFixed(1)}, vs a price of ${price}.` }; }
      throw new Error('info gen');
    } }),
  std({ num: 190, title: 'Stop-Searching Challenge', max: 12, practiceTrials: 1,
    how: ['Offers arrive one at a time, worth between 1 and 100. You cannot go back to an offer you passed.', 'Accept one. If you never accept, you get the last offer.', 'You score if your pick is among the top quarter of all the offers in that round.'],
    makeTrial(rng, lv) { const n = Math.min(12, 5 + Math.floor(lv / 2)); return { kind: 'choice', n, vals: range(n).map(() => rng.int(1, 100)), prompt: '', options: [{ label: 'a', value: 0 }, { label: 'b', value: 1 }], answer: 0 }; },
    async play(t, ctx) {
      const box = h('div', { class: 'offer' }), status = h('div', { class: 'status' }), seen = h('div', { class: 'typed' }); let pick = -1, i = 0;
      const acc = h('button', { class: 'btn big', type: 'button' }, 'Accept'), pass = h('button', { class: 'btn ghost', type: 'button' }, 'Pass →');
      ctx.stage.replaceChildren(h('div', { class: 'trial' }, status, box, h('div', { class: 'actions' }, acc, pass), seen));
      await new Promise((done) => { const show = () => { status.textContent = `Offer ${i + 1} of ${t.n}${i === t.n - 1 ? ' (last one)' : ''}`; box.textContent = t.vals[i]; box.classList.remove('in'); void box.offsetWidth; box.classList.add('in'); audio.tap(); pass.disabled = i === t.n - 1; };
        acc.onclick = () => { pick = i; done(); }; pass.onclick = () => { seen.append(h('span', { class: 'tw' }, t.vals[i])); i++; if (i >= t.n) { pick = t.n - 1; done(); } else show(); }; show(); });
      const sorted = [...t.vals].sort((a, b) => b - a), cut = sorted[Math.max(0, Math.ceil(t.n / 4) - 1)], v = t.vals[pick], ok = v >= cut;
      seen.replaceChildren(...t.vals.map((x, k) => h('span', { class: 'tw ' + (k === pick ? (ok ? 'good' : 'bad') : x >= cut ? 'dup' : '') }, x)));
      await ctx.sleep(1800);
      return { correct: ok, rt: null, tags: { position: pick + 1 }, explain: ok ? '' : `You took ${v}. The top-quarter cutoff this round was ${cut}; the best offer was ${sorted[0]}.` };
    } }),
  std({ num: 191, title: 'If–Then Builder', max: 10,
    how: ['Turn a good intention into a plan you would actually follow.', 'The best plan names a specific moment (WHEN/WHERE) and a concrete action (WHAT).', 'Pick the strongest plan. Subtler weak plans appear as you improve.'],
    makeTrial(rng, lv) {
      const G_ = [['drink more water', 'When I sit down at my desk after lunch', 'I will fill my bottle at the tap', 'drink more water'], ['read more', 'When I get into bed', 'I will read five pages before turning off the light', 'read more'], ['stretch daily', 'When I finish brushing my teeth in the morning', 'I will do two minutes of stretches', 'stretch'],
        ['practise guitar', 'When I get home from work and drop my bag', 'I will play scales for ten minutes', 'practise more'], ['call family more', 'When I start my Sunday dinner', 'I will phone my sister', 'keep in touch more'], ['tidy up', 'When the kettle is boiling each evening', 'I will clear the kitchen counter', 'be tidier']];
      const [goal, cue, act, vague] = rng.pick(G_), opts = [`${cue}, ${act}.`, `I will really try to ${vague}.`, `${cue}, I will think about ${goal.split(' ')[0]}ing.`, `Sometime this week, ${act}.`];
      if (lv >= 6) opts[3] = `When I feel motivated, ${act}.`;
      return { kind: 'choice', promptHtml: `<span class="rule">Goal: ${goal}</span>`, prompt: 'Strongest plan?', options: rng.shuffle(opts).map((x) => ({ label: x, value: x })), answer: opts[0], cols: 1 };
    } }),
  std({ num: 192, title: 'Distraction Budget', max: 12,
    how: ['You need to finish a task that takes a set amount of focused time.', 'Each kind of interruption costs time whenever it happens. You can silence some, but you must not miss URGENT calls.', 'Pick the setup that finishes soonest while keeping urgent calls on.'],
    makeTrial(rng, lv) {
      const task = rng.pick([60, 90, 120]), src = [['Chat pings', rng.int(4, 10), rng.int(1, 3)], ['Email alerts', rng.int(2, 6), rng.int(1, 2)], ['Social media', rng.int(3, 8), rng.int(2, 5)], ['Urgent calls', rng.int(0, 2), rng.int(3, 6)]];
      const cost = (on) => task + sum(src.map(([, per, c], i) => (on.includes(i) ? (per * c * task) / 60 : 0)));
      const sets = [[3], [0, 3], [1, 3], [0, 1, 2, 3], [0, 1], []].filter((s, i, a) => a.findIndex((x) => x.join() === s.join()) === i);
      const valid = sets.filter((s) => s.includes(3)), best = valid.reduce((a, b) => (cost(a) <= cost(b) ? a : b)), lab = (s) => (s.length ? 'Keep on: ' + s.map((i) => src[i][0]).join(', ') : 'Silence everything');
      const ds = rng.sample(sets.filter((s) => s !== best), 3);
      return { kind: 'choice', promptHtml: `<span class="rule">Task: ${task} focused minutes</span><span class="memo list">${src.map(([n, per, c]) => `<span>${n}: ${per}/hour, each costs ${c} min</span>`).join('')}</span>`, prompt: 'Best setup?', options: rng.shuffle([best, ...ds]).map((s) => ({ label: lab(s), value: s.join(',') || 'none' })), answer: best.join(',') || 'none', cols: 1 };
    } }),
  std({ num: 193, title: 'Error Detective', max: 12,
    how: ['A worked solution is shown step by step. Exactly one step contains an error.', 'Later steps carry the mistake forward, so they may look consistent.', 'Find the FIRST wrong step.'],
    makeTrial(rng, lv) {
      const a = rng.int(3, 19), b = rng.int(3, 19), c = rng.int(2, 9), d = rng.int(1, 30), e = rng.int(2, 5), vals = [], steps = [];
      const ops = [['a + b', (x) => a + b], ['× c', (x) => x * c], ['− d', (x) => x - d], ...(lv >= 5 ? [['÷ e (whole part)', (x) => Math.floor(x / e)]] : [])];
      const bad = rng.int(0, ops.length - 1); let cur = 0, right = 0;
      ops.forEach(([lab, f], i) => { right = i === 0 ? a + b : f(right); cur = i === 0 ? a + b : f(cur); if (i === bad) cur += rng.pick([-2, -1, 1, 2, 10]); vals.push(cur); steps.push(i === 0 ? `${a} + ${b} = ${cur}` : `${vals[i - 1]} ${lab.split(' ')[0]} ${lab.includes('c') ? c : lab.includes('d') ? d : e} = ${cur}`); });
      return { kind: 'choice', promptHtml: `<span class="rule">Work out (${a} + ${b}) × ${c} − ${d}${lv >= 5 ? `, then divide by ${e} (whole part)` : ''}</span>`, prompt: 'First wrong step?', options: steps.map((s, i) => ({ label: `${i + 1}. ${s}`, value: i })), answer: bad, cols: 1 };
    } }),
  std({ num: 194, title: 'Strategy Selector', max: 10,
    how: ['A puzzle type is described.', 'Choose the method that best suits it BEFORE solving.', 'Similar-sounding puzzles that need different methods appear as you improve.'],
    makeTrial(rng, lv) {
      const M = [['Find which number from 1 to 100 is missing in a long jumbled list', 'Add them all and subtract from 5,050'], ['Find a word in a paper dictionary', 'Open near the middle and halve the search each time'], ['Check if a big number is divisible by 9', 'Add its digits and check that sum'], ['Count handshakes when 20 people each shake hands once', 'Use 20 × 19 ÷ 2'],
        ['Multiply any number by 25 in your head', 'Multiply by 100, then divide by 4'], ['Find one heavier coin among 9 using a balance', 'Split into three groups of three'], ['Add all numbers from 1 to 100', 'Pair the ends: 1+100, 2+99, …'], ['Guess a secret number from 1 to 1,000 with higher/lower hints', 'Always guess the middle of what is left']];
      const [p, s] = rng.pick(M), ds = rng.sample(M.filter((x) => x[1] !== s), 3).map((x) => x[1]);
      return { kind: 'choice', promptHtml: `<span class="rule">${p}</span>`, prompt: 'Best method?', options: rng.shuffle([s, ...ds]).map((x) => ({ label: x, value: x })), answer: s, cols: 1 };
    } }),
  std({ num: 195, title: 'Breakpoint Planner', max: 12,
    how: ['In this FICTIONAL work model, output starts high and drops each hour you work without a break.', 'A break resets your output but costs work time.', 'Pick the break plan that produces the most in the day. (A game model, not health advice.)'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 100; g++) { const H = 8, start = rng.int(8, 12), drop = rng.int(1, 3), brk = rng.pick([0.25, 0.5, 0.75]); const out = (k) => { let t = 0, tot = 0, run = 0; while (t < H - 1e-9) { if (k && run === k) { t += brk; run = 0; continue; } const w = Math.min(1, H - t); tot += Math.max(0, start - drop * run) * w; t += w; run++; } return tot; };
        const ks = [0, 1, 2, 3, 4], v = ks.map(out), best = ks[v.indexOf(Math.max(...v))]; if ([...v].sort((a, b) => b - a)[1] > Math.max(...v) - 1.5) continue;
        return { kind: 'choice', promptHtml: `<span class="memo list"><span>8-hour day. First hour after a rest: ${start} units.</span><span>Each further hour without a break: ${drop} fewer units.</span><span>A break takes ${brk * 60} minutes and resets you.</span></span>`, prompt: 'Best plan?', options: ks.map((k) => ({ label: k ? `Break every ${k} h` : 'No breaks', value: k })), answer: best, cols: 2, explain: `Units: ${ks.map((k, i) => `${k ? 'every ' + k + 'h' : 'none'} ${v[i].toFixed(1)}`).join(', ')}.` }; }
      throw new Error('break gen');
    } }),
  std({ num: 196, title: 'Alternative Explanation', max: 10,
    how: ['Something happened, and two explanations both fit.', 'Before deciding, pick the check that would actually tell them APART.', 'Checks that only confirm what you already know do not help.'],
    makeTrial(rng, lv) {
      const S = [['The office plants died during the holiday.', 'No one watered them', 'The heating broke and they froze', 'Check the building’s temperature log', ['Check whether the plants are dead', 'Ask if anyone likes plants', 'Count the plants']],
        ['Fewer customers came to the café this month.', 'The new menu is less popular', 'Road works blocked the entrance', 'Compare sales on days with and without road works', ['Count this month’s customers again', 'Ask the chef if the menu is good', 'Check last year’s weather']],
        ['The robot keeps stopping in the hallway.', 'Its battery is failing', 'A sensor is dirty', 'Clean the sensor and see if it still stops', ['Watch it stop again', 'Measure the hallway', 'Paint the robot']],
        ['The bread came out flat.', 'The yeast was old', 'The kitchen was too cold', 'Bake two loaves in a warm kitchen, one with fresh yeast', ['Taste the flat bread', 'Buy a new oven', 'Read the recipe title']],
        ['The team’s website traffic jumped on Tuesday.', 'A newsletter went out', 'A famous blog linked to the site', 'Look at where Tuesday’s visitors came from', ['Check that traffic went up', 'Redesign the homepage', 'Count the team members']]];
      const [ev, a, b, good, bad] = rng.pick(S);
      return { kind: 'choice', promptHtml: `<span class="memo list"><span>${ev}</span><span>Explanation 1: ${a}.</span><span>Explanation 2: ${b}.</span></span>`, prompt: 'Most useful check?', options: rng.shuffle([good, ...bad]).map((x) => ({ label: x, value: x })), answer: good, cols: 1 };
    } }),
  std({ num: 197, title: 'Perspective Switch', max: 12,
    how: ['Follow a short story about who saw what.', 'Answer from a character’s point of view, using only what THEY know.', 'More characters and partial views as you improve.'],
    makeTrial(rng, lv) {
      const [A, B, C] = rng.sample(NAMES, 3), obj = rng.pick(OBJECTS), [p1, p2, p3] = rng.sample(['the red box', 'the blue tin', 'the drawer', 'the basket'], 3), watched = lv >= 4 && rng.chance(0.4), third = lv >= 7 && rng.chance(0.5);
      const lines = [`${A} puts the ${obj} in ${p1} and leaves the room.`, `${B} moves the ${obj} to ${p2}.`];
      if (watched) lines.push(`${A} was watching through the window the whole time.`);
      if (third) lines.push(`After ${A} comes back and leaves again, ${C} moves it to ${p3}.`);
      const ans = third ? (watched ? p2 : p1) : watched ? p2 : p1;
      return { kind: 'choice', study: { title: 'Read the story', html: `<span class="memo list">${lines.map((l) => `<span>${l}</span>`).join('')}</span>`, ms: 2500 + 1800 * lines.length, wide: true }, prompt: `Where will ${A} look for the ${obj} first?`, options: rng.shuffle([p1, p2, p3]).map((x) => ({ label: x, value: x })), answer: ans, cols: 1 };
    } }),
  std({ num: 198, title: 'Decision Journal', max: 12,
    how: ['A wheel-spin bet is offered: pay to play, win a prize with the chance shown.', 'Decide PLAY or PASS, then see what happens.', 'You score for good DECISIONS (positive expected value), not for lucky outcomes.'],
    makeTrial(rng, lv) {
      for (let g = 0; g < 100; g++) { const p = rng.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]), P = rng.int(2, 20) * 10, c = rng.int(1, 12) * 5, ev = p * P - c; if (Math.abs(ev) < 4) continue;
        return { kind: 'choice', p, P, c, win: rng.next() < p, promptHtml: `<span class="wheel" style="--p:${p * 100}%"></span><span class="memo"><b>${pct(p)}</b> chance to win <b>${P}</b> · costs <b>${c}</b> to play</span>`, prompt: 'Play or pass?', options: [{ label: 'Play', value: true }, { label: 'Pass', value: false }], answer: ev > 0 }; }
      throw new Error('journal gen');
    },
    async play(t, ctx) {
      const r = await runTrial({ ...t, reveal: false, quiet: true }, ctx), ev = t.p * t.P - t.c;
      ctx.stage.replaceChildren(h('div', { class: 'trial' }, h('div', { class: 'card center' }, h('h3', {}, r.picked ? (t.win ? '🎉 The wheel says WIN' : '😶 The wheel says LOSE') : 'You passed', ''), h('p', {}, r.picked ? `Outcome: ${t.win ? '+' + (t.P - t.c) : '−' + t.c}.` : `If you had played, the wheel would have said ${t.win ? 'WIN' : 'LOSE'}.`), h('p', { class: 'muted' }, `Expected value of playing: ${ev > 0 ? '+' : ''}${ev.toFixed(1)}. Your decision was ${r.correct ? 'sound' : 'not sound'}${(r.picked && t.win && !r.correct) || (r.picked && !t.win && r.correct) ? ', whatever the luck this time' : ''}.`))));
      await ctx.sleep(2600);
      return { ...r, tags: { luckyTotal: r.picked ? 1 : 0, luckyRight: r.picked && t.win ? 1 : 0 } };
    },
    summary: (g, s) => `${s.correct}/${s.trials} sound decisions (level ${s.maxLevel}). When you played, the wheel paid out ${s.tags.luckyRight || 0} of ${s.tags.luckyTotal || 0} times. Good decisions and good luck are different things.` }),
  std({ num: 199, title: 'Transfer Mission', max: 12,
    how: ['The same skill, comparing rates, shows up in different disguises: prices, speeds, flows, scores.', 'Each round uses a new setting. Spot which option is better per unit.', 'Settings and numbers get less familiar as you improve.'],
    makeTrial(rng, lv) {
      const S = [['price', 'Which is the better deal?', (q, v) => `${q} apples for $${v}`, 'lower'], ['speed', 'Which runner is faster?', (q, v) => `${q} km in ${v} min`, 'higher'], ['flow', 'Which tap fills a tank faster?', (q, v) => `${q} L in ${v} min`, 'higher'], ['score', 'Which player scores more per game?', (q, v) => `${q} points in ${v} games`, 'higher'], ['fuel', 'Which car uses less fuel per km?', (q, v) => `${v} L for ${q} km`, 'lower']];
      for (let g = 0; g < 200; g++) { const [tg, q, f, dir] = rng.pick(lv <= 3 ? S.slice(0, 2) : S), q1 = rng.int(2, 9 + lv), v1 = rng.int(2, 12 + lv), q2 = rng.int(2, 9 + lv), v2 = rng.int(2, 12 + lv), r1 = q1 / v1, r2 = q2 / v2; if (Math.abs(r1 - r2) / Math.max(r1, r2) < Math.max(0.04, 0.2 - lv * 0.015)) continue;
        const better = dir === 'higher' ? (r1 > r2 ? 'A' : 'B') : r1 > r2 ? 'A' : 'B';
        return { kind: 'choice', prompt: q, options: [{ label: `A: ${f(q1, v1)}`, value: 'A' }, { label: `B: ${f(q2, v2)}`, value: 'B' }], answer: better, cols: 1, tag: tg, explain: `Per unit: A ${(dir === 'higher' ? r1 : 1 / r1).toFixed(2)}, B ${(dir === 'higher' ? r2 : 1 / r2).toFixed(2)}.` }; }
      throw new Error('transfer gen');
    } }),
  std({ num: 200, title: 'Personal Experiment Lab', max: 12,
    how: ['Run a fair experiment on yourself: does GROUPING items by category help your memory more than simple REPETITION?', 'Each round randomly uses one study strategy on a matched list. Then recall the items.', 'Your results compare the two strategies, with how many rounds each.'],
    makeTrial(rng, lv) {
      const cats = rng.sample(Object.keys(CATS), 3), per = Math.min(4, 2 + Math.floor(lv / 4)), items = cats.flatMap((c) => rng.sample(CATS[c], per)), lures = rng.sample(cats.flatMap((c) => CATS[c]).filter((x) => !items.includes(x)), Math.min(6, 3 + Math.floor(lv / 3))), strat = rng.chance(0.5) ? 'grouping' : 'repetition';
      const study = strat === 'grouping' ? { title: 'Strategy: GROUPING', html: `<span class="groups">${cats.map((c, i) => `<span><b>${c}</b>${items.slice(i * per, i * per + per).map((x) => tok(x, HUES[i * 3])).join('')}</span>`).join('')}</span>`, ms: 1400 * items.length, wide: true }
        : { title: 'Strategy: REPETITION', frames: [...rng.shuffle(items), ...rng.shuffle(items)].map((x) => ({ html: tok(x, 210, 'big') })), ms: 700, blank: 0 };
      return { kind: 'multi', study, items: rng.shuffle([...items, ...lures]).map((x) => ({ label: x, value: x })), answer: items, prompt: 'Select every item you studied', cols: 3, tag: strat };
    },
    summary(g, s) { const a = (k) => (s.tags[k + 'Total'] ? `${Math.round((100 * (s.tags[k + 'Right'] || 0)) / s.tags[k + 'Total'])}% perfect rounds (n=${s.tags[k + 'Total']})` : 'no rounds yet'); return `Grouping: ${a('grouping')}. Repetition: ${a('repetition')}. With so few rounds the difference may be chance; keep running sessions to see if it holds.`; } }),
];
