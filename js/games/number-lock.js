import { h, now, audio } from '../engine.js';

export const logic = {
  params(level) {
    const len = Math.min(6, 3 + Math.floor((level - 1) / 3)), dup = level >= 7;
    const symbols = Math.min(10, 5 + Math.floor(level / 2));
    return { len, symbols, dup, maxGuesses: len + 7 };
  },
  makeTrial(rng, level) {
    const p = logic.params(level), pool = [...Array(p.symbols).keys()];
    const code = p.dup ? Array.from({ length: p.len }, () => rng.pick(pool)) : rng.sample(pool, p.len);
    return { ...p, code };
  },
  /** Duplicate-aware: exact = right symbol, right place; misplaced = right symbol, wrong place (each code symbol counted once). */
  feedback(code, guess) {
    let exact = 0; const cc = {}, gc = {};
    for (let i = 0; i < code.length; i++) { if (code[i] === guess[i]) exact++; else { cc[code[i]] = (cc[code[i]] || 0) + 1; gc[guess[i]] = (gc[guess[i]] || 0) + 1; } }
    let misplaced = 0; for (const k of Object.keys(gc)) misplaced += Math.min(gc[k], cc[k] || 0);
    return { exact, misplaced };
  },
  consistent(history, cand) { return history.every(([g, f]) => { const r = logic.feedback(cand, g); return r.exact === f.exact && r.misplaced === f.misplaced; }); },
};
const HUES = [350, 28, 52, 140, 175, 205, 250, 290, 320, 90];

export default {
  id: 'number-lock', num: 111, title: 'Number Lock', min: 1, max: 14, start: 1, mode: 'both', practiceTrials: 1, maxTrials: 12,
  how: ['A hidden code is locked in the vault. Enter a guess of the same length.', 'Each guess tells you how many symbols are right and in the right place, and how many are right but in the wrong place.', 'Use every clue. Crack the code within the guess limit.'],
  makeTrial: logic.makeTrial,
  async play(trial, ctx) {
    const { len, symbols, maxGuesses, code, dup } = trial, rows = [], cur = [];
    const status = h('div', { class: 'status' });
    const board = h('div', { class: 'vault' });
    const slotsEl = h('div', { class: 'slots', style: { '--len': len } }, Array.from({ length: len }, (_, i) => h('div', { class: 'slot' + (i === 0 ? ' on' : '') })));
    const chip = (s, small) => h('span', { class: 'sym' + (small ? ' s' : ''), style: { '--sh': HUES[s] } }, s);
    const pegs = (f) => h('span', { class: 'pegs' }, [...Array(f.exact).fill('x'), ...Array(f.misplaced).fill('m'), ...Array(len - f.exact - f.misplaced).fill('n')].map((k) => h('i', { class: 'peg ' + k })));
    const keys = Array.from({ length: symbols }, (_, s) => h('button', { class: 'key', type: 'button', 'aria-label': 'Symbol ' + s, style: { '--sh': HUES[s] }, onclick: () => add(s) }, s));
    const back = h('button', { class: 'key fn', type: 'button', 'aria-label': 'Delete', onclick: () => del() }, '⌫');
    const go = h('button', { class: 'key fn go', type: 'button', disabled: true, onclick: () => submit() }, 'TRY');
    const history = [];
    let done = false, resolveRound, t0 = now(), left = maxGuesses;
    const draw = () => {
      [...slotsEl.children].forEach((el, i) => { el.replaceChildren(cur[i] != null ? chip(cur[i]) : ''); el.classList.toggle('on', i === cur.length); });
      go.disabled = cur.length !== len;
      status.textContent = `${left} guess${left === 1 ? '' : 'es'} left · ${len} symbols from 0–${symbols - 1}${dup ? ', repeats allowed' : ', no repeats'}`;
    };
    const add = (s) => { if (done || cur.length >= len) return; if (!dup && cur.includes(s)) { audio.bad(); return; } cur.push(s); audio.tap(); draw(); };
    const del = () => { if (done) return; cur.pop(); draw(); };
    function submit() {
      if (done || cur.length !== len) return;
      const guess = [...cur], f = logic.feedback(code, guess); history.push([guess, f]); left--; cur.length = 0;
      board.append(h('div', { class: 'vrow' }, h('span', { class: 'n' }, history.length), h('span', { class: 'gs' }, guess.map((s) => chip(s, true))), pegs(f)));
      board.scrollTop = board.scrollHeight; audio.tone(300 + f.exact * 120, 0.18, 'triangle', 0.12);
      if (f.exact === len) { done = true; audio.win(); resolveRound(true); } else if (left <= 0) { done = true; resolveRound(false); }
      draw();
    }
    const onKey = (e) => { if (/^\d$/.test(e.key) && +e.key < symbols) add(+e.key); else if (e.key === 'Backspace') del(); else if (e.key === 'Enter') submit(); };
    document.addEventListener('keydown', onKey);
    ctx.stage.replaceChildren(h('div', { class: 'trial lock' }, status, board, slotsEl, h('div', { class: 'keypad', style: { '--k': Math.min(6, Math.ceil((symbols + 2) / 2)) } }, keys, back, go),
      ctx.practice ? h('p', { class: 'hint' }, 'Practice: green pegs = right symbol, right place. Gold pegs = right symbol, wrong place.') : null,
      h('p', { class: 'legend' }, h('i', { class: 'peg x' }), ' right place  ', h('i', { class: 'peg m' }), ' wrong place')));
    draw();
    const solved = await new Promise((r) => { resolveRound = r; });
    document.removeEventListener('keydown', onKey);
    const used = history.length;
    await ctx.sleep(solved ? 700 : 400);
    if (!solved) { status.textContent = 'Locked! The code was:'; slotsEl.replaceChildren(...code.map((s) => h('div', { class: 'slot on' }, chip(s)))); await ctx.sleep(1500); }
    return { correct: solved, rt: now() - t0, speed: solved ? (maxGuesses - used) / maxGuesses : 0, tags: { guesses: used, cracked: solved ? 1 : 0 }, metric: { name: 'codeLength', value: len },
      explain: solved ? '' : `Out of guesses. The code was ${code.join(' ')}.` };
  },
  summary: (g, s) => `${s.best.codeLength ? `Longest code cracked: ${s.best.codeLength} symbols. ` : ''}${s.tags.cracked || 0} vault${(s.tags.cracked || 0) === 1 ? '' : 's'} opened using ${s.tags.guesses || 0} guesses in total.`,
};
