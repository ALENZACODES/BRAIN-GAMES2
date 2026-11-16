import { h, now, audio, clamp } from '../engine.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const logic = {
  params(level) {
    const kind = level <= 3 ? 'int10' : level <= 6 ? 'int100' : level <= 9 ? 'dec' : level <= 12 ? 'neg' : 'frac';
    return { kind, tolPct: Math.max(2.5, 14 - level) };
  },
  makeTrial(rng, level) {
    const p = logic.params(level); let min = 0, max = 10, target, label;
    if (p.kind === 'int10') { target = rng.int(1, 9); label = String(target); }
    else if (p.kind === 'int100') { max = 100; target = rng.int(3, 97); label = String(target); }
    else if (p.kind === 'dec') { max = 1; target = rng.int(3, 97) / 100; label = target.toFixed(2); }
    else if (p.kind === 'neg') { min = -50; max = 50; target = rng.int(-47, 47); label = String(target); }
    else { max = rng.chance(0.5) ? 1 : 2; const d = rng.pick([3, 4, 5, 6, 8, 10, 12]), n = rng.int(1, d * max - 1), g = gcd(n, d); target = n / d; label = `${n / g}/${d / g}`; }
    return { ...p, min, max, target, label };
  },
  /** Error as a share of the whole line. */
  check(trial, placed) { const err = Math.abs(placed - trial.target) / (trial.max - trial.min); return { err, correct: err <= trial.tolPct / 100 }; },
};
const fmtEnd = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

export default {
  id: 'number-line-navigator', num: 171, title: 'Number Line Navigator', min: 1, max: 15, start: 1, mode: 'both', practiceTrials: 2, maxTrials: 14,
  how: ['You are given a number and a line with only its two end values.', 'Tap or drag along the line to place the number where it belongs, then press Lock in. Arrow keys nudge the marker.', 'The allowed error shrinks as you improve. Whole numbers, then decimals, negatives and fractions.'],
  makeTrial: logic.makeTrial,
  async play(trial, ctx) {
    let pos = null, t0 = now(), locked = false;
    const status = h('div', { class: 'status' }, 'Tap the line to place the number'), tol = trial.tolPct / 100;
    const marker = h('div', { class: 'marker', hidden: true }, h('b', {}, ''));
    const truth = h('div', { class: 'truth', hidden: true }, h('b', {}, trial.label));
    const band = h('div', { class: 'band', hidden: true, style: { left: '0%', width: '0%' } });
    const line = h('div', { class: 'nline', tabindex: 0, role: 'slider', 'aria-label': `Place ${trial.label}`, 'aria-valuemin': trial.min, 'aria-valuemax': trial.max }, band, h('i', { class: 'lend l' }, fmtEnd(trial.min)), h('i', { class: 'lend r' }, fmtEnd(trial.max)), marker, truth);
    const btn = h('button', { class: 'btn big', type: 'button', disabled: true }, 'Lock in');
    const set = (frac) => { pos = clamp(frac, 0, 1); marker.hidden = false; marker.style.left = pos * 100 + '%'; btn.disabled = false; const v = trial.min + pos * (trial.max - trial.min); marker.firstChild.textContent = Math.abs(v) >= 100 || Number.isInteger(trial.min) && trial.kind !== 'frac' && trial.kind !== 'dec' ? Math.round(v) : v.toFixed(2); line.setAttribute('aria-valuenow', v.toFixed(2)); };
    const at = (e) => { const r = line.getBoundingClientRect(); set((e.clientX - r.left) / r.width); };
    let drag = false;
    line.addEventListener('pointerdown', (e) => { if (locked) return; drag = true; line.setPointerCapture(e.pointerId); at(e); audio.tap(); });
    line.addEventListener('pointermove', (e) => { if (drag && !locked) at(e); }); line.addEventListener('pointerup', () => (drag = false));
    line.addEventListener('keydown', (e) => { if (locked) return; const stepK = e.shiftKey ? 0.05 : 0.01; if (e.key === 'ArrowRight') { set((pos ?? 0.5) + stepK); e.preventDefault(); } else if (e.key === 'ArrowLeft') { set((pos ?? 0.5) - stepK); e.preventDefault(); } else if (e.key === 'Enter' && pos != null) btn.click(); });
    const prompt = h('div', { class: 'prompt numtarget' }, trial.label);
    ctx.stage.replaceChildren(h('div', { class: 'trial' }, status, prompt, h('div', { class: 'nlwrap' }, line), btn,
      ctx.practice ? h('p', { class: 'hint' }, `Practice: your marker must land within ${trial.tolPct}% of the line’s length from the true spot.`) : null));
    t0 = now(); await new Promise((r) => btn.addEventListener('click', r, { once: true })); locked = true; btn.disabled = true;
    const placed = trial.min + pos * (trial.max - trial.min), r = logic.check(trial, placed), tp = (trial.target - trial.min) / (trial.max - trial.min);
    band.hidden = false; band.style.left = Math.max(0, (tp - tol) * 100) + '%'; band.style.width = Math.min(100, (tp + tol) * 100) - Math.max(0, (tp - tol) * 100) + '%';
    truth.hidden = false; truth.style.left = tp * 100 + '%'; marker.classList.add(r.correct ? 'right' : 'wrong');
    status.textContent = r.correct ? `Great: off by ${(r.err * 100).toFixed(1)}% of the line` : `Off by ${(r.err * 100).toFixed(1)}% (allowed ${trial.tolPct}%)`;
    await ctx.sleep(r.correct ? 1000 : 2000);
    return { correct: r.correct, rt: now() - t0, speed: r.correct ? 1 - r.err / tol : 0, tags: { placed: 1, errPct10: Math.round(r.err * 1000) }, metric: { name: 'kind', value: ['int10', 'int100', 'dec', 'neg', 'frac'].indexOf(trial.kind) + 1 },
      explain: r.correct ? '' : `The true position is shown on the line.` };
  },
  summary: (g, s) => { const n = s.tags.placed || 0, avg = n ? (s.tags.errPct10 || 0) / 10 / n : 0; const kinds = ['whole numbers to 10', 'whole numbers to 100', 'decimals', 'negative numbers', 'fractions']; return `${s.best.kind ? `Furthest line type placed correctly: ${kinds[s.best.kind - 1]}. ` : ''}Average error ${avg.toFixed(1)}% of the line over ${n} placements.`; },
};
