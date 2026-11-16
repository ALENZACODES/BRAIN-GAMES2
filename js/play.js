// Generic trial renderers. A game describes each trial as plain data ({kind, ...});
// these functions turn it into UI and return {correct, rt, tags, explain}.
import { h, now, audio, slug } from './engine.js';
import { timerBar, choiceTrial } from './kit.js';

export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const rich = (x, cls = 'rich') => (x == null ? null : x.nodeType ? x : h('span', { class: cls, html: String(x) }));
const optNode = (o) => (o.html != null ? rich(o.html) : null);
const mkOpt = (o) => ({ label: o.label, node: optNode(o) || (o.label != null ? h('span', { class: 'olabel' }, o.label) : null), value: o.value, cls: o.cls, aria: o.aria || o.label });
const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').trim();
const labelOf = (o) => (o ? (o.label != null ? String(o.label) : strip(o.html) || null) : null);

function wait(ctx, ms, skipEl) {
  return new Promise((r) => {
    let t = setTimeout(() => ctx.alive() && r(), ms);
    skipEl?.addEventListener('click', () => { clearTimeout(t); r(); }, { once: true });
  });
}

export function playTones(tones, gap = 0.26) {
  (tones || []).forEach((t, i) => {
    const f = typeof t === 'number' ? t : t?.f, d = typeof t === 'number' ? 0.18 : t?.d || 0.18;
    if (f) audio.tone(f, d, (t && t.type) || 'triangle', 0.16, i * gap);
  });
}
// Visual stand-in for a tone sequence (used when sound is off): bar height = pitch.
export function toneBars(tones) {
  const fs = tones.map((t) => (typeof t === 'number' ? t : t?.f || 0)), mx = Math.max(...fs, 1), mn = Math.min(...fs.filter(Boolean), mx);
  return `<svg viewBox="0 0 ${tones.length * 24} 60" class="tonebars">${fs.map((f, i) => (f ? `<rect x="${i * 24 + 4}" y="${54 - (10 + 40 * ((f - mn) / (mx - mn || 1)))}" width="16" height="${10 + 40 * ((f - mn) / (mx - mn || 1))}" rx="4"/>` : '')).join('')}</svg>`;
}

export function speak(text, ctx) {
  try { if (!ctx.settings.sound || !window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(String(text)); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
}
// ---------- phases ----------
async function runStudy(ctx, s) {
  if (!s) return;
  const frames = s.frames || [s];
  const status = h('div', { class: 'status' }, s.title || 'Memorise this');
  const box = h('div', { class: 'studybox' + (s.wide ? ' wide' : '') });
  const ready = frames.length === 1 && !s.noSkip ? h('button', { class: 'btn ghost sm', type: 'button' }, 'Ready ▸') : null;
  const dots = frames.length > 1 ? h('div', { class: 'progress-dots' }, frames.map(() => h('i'))) : null;
  ctx.stage.replaceChildren(h('div', { class: 'trial' }, status, box, dots, ready, ctx.practice && s.hint ? h('p', { class: 'hint' }, s.hint) : null));
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (dots) dots.children[i].classList.add('good');
    box.replaceChildren(...[rich(f.html ?? f.label ?? '', 'rich big'), f.caption ? h('p', { class: 'cap' }, f.caption) : null].filter(Boolean));
    box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
    if (f.tones) playTones(f.tones, f.toneGap);
    if (f.say) speak(f.say, ctx);
    if (f.tones && !ctx.settings.sound) box.append(rich(toneBars(f.tones)));
    const ms = f.ms ?? s.ms ?? 1200;
    await wait(ctx, ready && ctx.settings.untimed ? 6e5 : ms, ready);
    if (s.blank) { box.replaceChildren(); await wait(ctx, s.blank); }
  }
  if (s.after) { box.replaceChildren(h('p', { class: 'cap' }, s.after)); await wait(ctx, s.afterMs || 1200); }
}
async function runDistract(ctx, d) {
  const r = await choiceTrial(ctx, { promptNode: h('div', { class: 'qbox' }, h('small', { class: 'muted' }, 'Quick side task'), d.html ? rich(d.html, 'rich big') : null, h('div', { class: 'q' }, d.prompt)),
    options: d.options.map(mkOpt), answer: d.answer, cols: d.cols, flashMs: 350 });
  return r.correct;
}
function qNode(t, ctx) {
  const kids = [];
  if (t.promptHtml) kids.push(rich(t.promptHtml, 'rich big'));
  if (t.prompt) kids.push(h('div', { class: 'q' + (t.promptHtml ? '' : ' solo') + (String(t.prompt).length > 60 ? ' long' : '') }, t.prompt));
  if (t.tones) {
    kids.push(h('button', { class: 'btn ghost sm', type: 'button', onclick: () => playTones(t.tones, t.toneGap) }, '🔊 Play again'));
    if (!ctx.settings.sound) kids.push(rich(toneBars(t.tones)));
  }
  return h('div', { class: 'qbox' }, kids);
}

// ---------- kinds ----------
async function kChoice(t, ctx) {
  if (t.tones) setTimeout(() => ctx.alive() && playTones(t.tones, t.toneGap), 350);
  const r = await choiceTrial(ctx, { promptNode: qNode(t, ctx), options: t.options.map(mkOpt), answer: t.answer, timeMs: t.timeMs, cols: t.cols, reveal: t.reveal !== false, quiet: !!t.confidence, hint: t.hint, flashMs: t.flashMs ?? (t.confidence ? 120 : 420) });
  if (t.confidence && !r.timedOut) {
    const c = await choiceTrial(ctx, { prompt: 'How sure are you?', options: [50, 70, 90, 100].map((v) => ({ label: v + '%', value: v })), answer: undefined, quiet: true, flashMs: 150, cols: 4 });
    r.tags = { ['conf' + c.picked]: 1, ['conf' + c.picked + 'Right']: r.correct ? 1 : 0 };
  }
  return r;
}

// sequence + order: tap items into slots in order
function kSequence(t, ctx, game) {
  return new Promise((resolve) => {
    const need = t.answer.length, picks = [], pal = t.palette || t.items, repeat = !!t.repeat;
    const slots = h('div', { class: 'seqslots' + (t.textItems ? ' text' : '') }, t.answer.map((_, i) => h('i', { 'data-n': i + 1 })));
    const status = h('div', { class: 'status' }, t.prompt || `Tap the ${need} items in order`);
    const btns = pal.map((o, i) => h('button', { class: 'opt pal' + (t.textItems ? ' text' : ''), type: 'button', 'aria-label': o.aria || labelOf(o) || `Item ${i + 1}` }, optNode(o) || h('span', { class: 'olabel' }, o.label), pal.length <= 9 && !t.textItems ? h('kbd', {}, i + 1) : null));
    const undo = h('button', { class: 'opt pal fn', type: 'button', 'aria-label': 'Undo' }, '⌫');
    const t0 = now(); let done = false;
    const show = (i) => optNode(pal[i]) || h('span', { class: 'olabel' }, pal[i].label);
    const draw = () => [...slots.children].forEach((el, i) => { el.replaceChildren(picks[i] != null ? show(picks[i]) : ''); el.classList.toggle('on', i === picks.length); });
    const finish = () => {
      done = true; document.removeEventListener('keydown', onKey); btns.forEach((b) => (b.disabled = true)); undo.disabled = true;
      const resp = picks.map((i) => pal[i].value), correct = game.check ? !!game.check(t, resp) : same(resp, t.answer);
      if (!game.check) [...slots.children].forEach((el, i) => el.classList.add(same(resp[i], t.answer[i]) ? 'good' : 'bad')); else slots.classList.add(correct ? 'good' : 'bad');
      let run = 0; while (run < need && same(resp[run], t.answer[run])) run++;
      setTimeout(() => resolve({ correct, rt: now() - t0, response: resp, tags: { itemsInPlace: run } }), correct ? 450 : 900);
    };
    const press = (i) => {
      if (done || (!repeat && picks.includes(i))) return;
      picks.push(i); audio.tap(); if (pal[i].tone) audio.tone(pal[i].tone, 0.2, 'triangle', 0.14);
      if (!repeat) btns[i].classList.add('used'); draw(); if (picks.length === need) finish();
    };
    const back = () => { if (done) return; const i = picks.pop(); if (i != null) btns[i].classList.remove('used'); draw(); };
    const onKey = (e) => { if (e.repeat) return; if (/^[1-9]$/.test(e.key) && +e.key <= pal.length && pal.length <= 9 && !t.textItems) press(+e.key - 1); else if (e.key === 'Backspace') back(); };
    btns.forEach((b, i) => b.addEventListener('click', () => press(i))); undo.addEventListener('click', back); document.addEventListener('keydown', onKey);
    ctx.stage.replaceChildren(h('div', { class: 'trial' }, status, slots, h('div', { class: 'palette' + (t.textItems ? ' text' : ''), style: { '--cols': t.cols || (t.textItems ? 1 : Math.min(5, pal.length + 1)) } }, btns, undo),
      ctx.practice && t.hint ? h('p', { class: 'hint' }, t.hint) : null));
    draw();
  });
}

function kMulti(t, ctx, game) {
  return new Promise((resolve) => {
    const sel = new Set(), ans = new Set(t.answer.map((v) => JSON.stringify(v)));
    const status = h('div', { class: 'status' }, t.prompt || 'Select all that apply');
    const tb = timerBar(ctx, t.timeMs);
    const btns = t.items.map((o, i) => h('button', { class: 'opt tog' + (o.html != null && o.label == null ? ' tile' : ''), type: 'button', 'aria-pressed': 'false', 'aria-label': o.aria || labelOf(o) || `Item ${i + 1}` }, optNode(o) || h('span', { class: 'olabel' }, o.label)));
    const go = h('button', { class: 'btn big', type: 'button', disabled: true }, t.need ? `Done (0/${t.need})` : 'Done');
    let done = false, to = 0; const t0 = now();
    const upd = () => { go.disabled = t.need ? sel.size !== t.need : sel.size === 0; if (t.need) go.textContent = `Done (${sel.size}/${t.need})`; };
    btns.forEach((b, i) => b.addEventListener('click', () => {
      if (done) return;
      if (sel.has(i)) sel.delete(i); else { if (t.need && sel.size >= t.need) return; sel.add(i); }
      b.classList.toggle('sel', sel.has(i)); b.setAttribute('aria-pressed', sel.has(i)); audio.tap(); upd();
    }));
    const finish = (timedOut) => {
      if (done) return; done = true; clearTimeout(to); tb.stop(); btns.forEach((b) => (b.disabled = true)); go.disabled = true;
      const resp = [...sel].map((i) => t.items[i].value), rs = new Set(resp.map((v) => JSON.stringify(v)));
      let hit = 0, fa = 0; rs.forEach((k) => (ans.has(k) ? hit++ : fa++));
      const miss = ans.size - hit, correct = !timedOut && (game.check ? !!game.check(t, resp) : fa === 0 && miss === 0);
      btns.forEach((b, i) => { const k = JSON.stringify(t.items[i].value); if (sel.has(i)) b.classList.add(ans.has(k) || game.check ? (correct ? 'right' : ans.has(k) ? 'right' : 'wrong') : 'wrong'); else if (ans.has(k) && !game.check) b.classList.add('missed'); });
      setTimeout(() => resolve({ correct, rt: now() - t0, timedOut, response: resp, tags: { hit, miss, falseAlarm: fa } }), correct ? 500 : 1300);
    };
    go.addEventListener('click', () => finish(false));
    ctx.stage.replaceChildren(h('div', { class: 'trial' }, tb.bar, t.promptHtml ? rich(t.promptHtml, 'rich big') : null, status, h('div', { class: 'opts', style: { '--cols': t.cols || 3 } }, btns), go, ctx.practice && t.hint ? h('p', { class: 'hint' }, t.hint) : null));
    requestAnimationFrame(() => { if (t.timeMs && !ctx.settings.untimed) { tb.start(); to = setTimeout(() => finish(true), t.timeMs); } });
  });
}

function kNumeric(t, ctx) {
  return new Promise((resolve) => {
    let v = '', done = false, to = 0; const t0 = now();
    const tb = timerBar(ctx, t.timeMs);
    const disp = h('div', { class: 'numdisp', 'aria-live': 'polite' });
    const draw = () => disp.replaceChildren(h('span', { class: 'pre' }, t.prefix || ''), v || h('span', { class: 'ph' }, '?'), h('span', { class: 'pre' }, t.suffix || ''));
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', t.allowNeg ? '−' : '', '0', t.allowDec ? '.' : ''];
    const add = (k) => { if (done) return; if (k === '−') v = v.startsWith('-') ? v.slice(1) : '-' + v; else if (k === '.' ? !v.includes('.') : v.replace(/[-.]/g, '').length < 7) v += k; audio.tap(); draw(); };
    const back = () => { if (!done) { v = v.slice(0, -1); draw(); } };
    const finish = (timedOut) => {
      if (done) return; done = true; clearTimeout(to); tb.stop(); document.removeEventListener('keydown', onKey);
      const num = parseFloat(v), correct = !timedOut && Number.isFinite(num) && Math.abs(num - t.answer) <= (t.tol || 0) + 1e-9;
      disp.classList.add(correct ? 'good' : 'bad');
      setTimeout(() => resolve({ correct, rt: now() - t0, timedOut, response: num, tags: { absErr: Number.isFinite(num) ? Math.abs(num - t.answer) : 0 } }), correct ? 400 : 700);
    };
    const onKey = (e) => { if (/^\d$/.test(e.key)) add(e.key); else if (e.key === '-' && t.allowNeg) add('−'); else if (e.key === '.' && t.allowDec) add('.'); else if (e.key === 'Backspace') back(); else if (e.key === 'Enter' && v) finish(false); };
    document.addEventListener('keydown', onKey);
    const pad = h('div', { class: 'keypad num' }, keys.map((k) => (k ? h('button', { class: 'key fn', type: 'button', onclick: () => add(k) }, k) : h('span'))),
      h('button', { class: 'key fn', type: 'button', 'aria-label': 'Delete', onclick: back }, '⌫'), h('button', { class: 'key fn go', type: 'button', style: { gridColumn: 'span 2' }, onclick: () => v && finish(false) }, 'Enter'));
    ctx.stage.replaceChildren(h('div', { class: 'trial' }, tb.bar, qNode(t, ctx), disp, pad, ctx.practice && t.hint ? h('p', { class: 'hint' }, t.hint) : null));
    draw();
    requestAnimationFrame(() => { if (t.timeMs && !ctx.settings.untimed) { tb.start(); to = setTimeout(() => finish(true), t.timeMs); } });
  });
}

// stream: items appear one by one; press when the item is a target
async function kStream(t, ctx) {
  const slot = h('div', { class: 'streamslot' }), ring = h('div', { class: 'beat' });
  const btn = h('button', { class: 'btn big match', type: 'button' }, t.button || 'PRESS', h('kbd', {}, 'Space'));
  const strip = h('div', { class: 'progress-dots' }, t.items.map(() => h('i')));
  const pressed = []; let cur = -1;
  const press = () => { if (cur < 0 || pressed[cur]) return; pressed[cur] = true; audio.tap(); btn.classList.add('pressed'); };
  const onKey = (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); press(); } };
  btn.addEventListener('click', press); document.addEventListener('keydown', onKey);
  ctx.stage.replaceChildren(h('div', { class: 'trial' }, h('div', { class: 'status' }, t.prompt), t.promptHtml ? rich(t.promptHtml, 'rich ref') : null, h('div', { class: 'tray wide' }, ring, slot), strip, btn, ctx.practice && t.hint ? h('p', { class: 'hint' }, t.hint) : null));
  await wait(ctx, 700);
  const show = t.showMs || t.intervalMs;
  for (let i = 0; i < t.items.length; i++) {
    cur = i; btn.classList.remove('pressed');
    const it = t.items[i];
    slot.replaceChildren(...[rich(it.html ?? '', 'rich big'), it.label != null ? h('b', { class: 'slabel' }, it.label) : null].filter(Boolean));
    if (it.tones) playTones(it.tones, it.toneGap); if (it.tones && !ctx.settings.sound) slot.append(rich(toneBars(it.tones)));
    ring.style.animation = 'none'; void ring.offsetWidth; ring.style.animation = `beat ${t.intervalMs}ms linear`;
    await wait(ctx, show); if (show < t.intervalMs) { slot.replaceChildren(); await wait(ctx, t.intervalMs - show); }
    slot.replaceChildren(); strip.children[i].classList.add(!!pressed[i] === !!t.targets[i] ? 'good' : 'bad');
    await wait(ctx, 140);
  }
  document.removeEventListener('keydown', onKey);
  let hit = 0, miss = 0, fa = 0, cr = 0;
  t.targets.forEach((isT, i) => { const p = !!pressed[i]; if (isT && p) hit++; else if (isT) miss++; else if (p) fa++; else cr++; });
  const errors = miss + fa, correct = errors <= (t.allowed ?? 1);
  return { correct, rt: null, tags: { hit, miss, falseAlarm: fa, correctRejection: cr }, explain: correct ? '' : `${miss} missed, ${fa} false alarm${fa === 1 ? '' : 's'} (limit ${t.allowed ?? 1} mistakes).` };
}

// assign: for each left item pick its partner on the right
async function kAssign(t, ctx, game) {
  const resp = {}; let right = 0; const t0 = now();
  const order = t.ask || t.left.map((l) => l.value);
  for (let k = 0; k < order.length; k++) {
    const L = t.left.find((l) => same(l.value, order[k]));
    const used = Object.values(resp).map((v) => JSON.stringify(v));
    const opts = t.right.filter((r) => !t.unique || !used.includes(JSON.stringify(r.value)));
    const r = await choiceTrial(ctx, { promptNode: h('div', { class: 'qbox' }, h('small', { class: 'muted' }, `${t.prompt || 'Match'} · ${k + 1}/${order.length}`), optNode(L) ? rich(L.html, 'rich big') : null, L.label != null ? h('div', { class: 'q' }, L.label) : null),
      options: opts.map(mkOpt), answer: t.answer[JSON.stringify(L.value)], quiet: true, flashMs: 160, cols: t.cols });
    resp[JSON.stringify(L.value)] = r.picked; if (r.correct) right++;
  }
  const correct = game.check ? !!game.check(t, resp) : right >= (t.need ?? order.length);
  const wrong = order.filter((v) => !same(resp[JSON.stringify(v)], t.answer[JSON.stringify(v)])).map((v) => { const L = t.left.find((l) => same(l.value, v)), R = t.right.find((r) => same(r.value, t.answer[JSON.stringify(v)])); return `${labelOf(L)} → ${labelOf(R)}`; });
  return { correct, rt: now() - t0, tags: { pairsRight: right, pairsTotal: order.length }, explain: correct ? '' : `Correct: ${wrong.slice(0, 3).join('; ')}${wrong.length > 3 ? '…' : ''}` };
}

async function kSteps(t, ctx, game) {
  const res = []; const t0 = now();
  for (const s of t.steps) {
    if (s.banner) {
      ctx.stage.replaceChildren(h('div', { class: 'trial' }, h('div', { class: 'card center bannercard' }, h('h3', {}, s.banner), s.bannerSub ? h('p', { class: 'muted' }, s.bannerSub) : null)));
      await wait(ctx, s.bannerMs || 1600);
    }
    const r = await runTrial(s, ctx, {});
    res.push(r);
    const wrong = res.filter((x) => !x.correct).length;
    if (!t.scoreLast && wrong > (t.allowed || 0)) break;
  }
  const wrong = res.filter((x) => !x.correct).length;
  const correct = t.scoreLast ? res.length === t.steps.length && res[res.length - 1].correct : res.length === t.steps.length && wrong <= (t.allowed || 0);
  const first = res.find((x) => !x.correct);
  const tags = { stepsRight: res.length - wrong, stepsTotal: res.length }; res.forEach((x) => Object.entries(x.tags || {}).forEach(([k, v]) => (tags[k] = (tags[k] || 0) + v)));
  return { correct, rt: now() - t0, tags, explain: correct ? '' : t.explain || first?.explain || `${wrong} step(s) wrong.` };
}

function kTyping(t, ctx) {
  return new Promise((resolve) => {
    const got = new Set(); let done = false, to = 0; const t0 = now();
    const norm = (s) => s.toLowerCase().trim().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
    const accept = new Set(t.accept.map(norm)), tb = timerBar(ctx, t.timeMs);
    const inp = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Type a word', placeholder: 'Type a word, press Enter' });
    const list = h('div', { class: 'typed' }), status = h('div', { class: 'status' }, `0 / ${t.need}`);
    const submit = () => {
      const raw = norm(inp.value); inp.value = ''; if (!raw || done) return;
      const w = accept.has(raw) ? raw : accept.has(raw.replace(/s$/, '')) ? raw.replace(/s$/, '') : accept.has(raw.replace(/es$/, '')) ? raw.replace(/es$/, '') : null;
      let cls = 'bad', msg = raw;
      if (w && got.has(w)) { cls = 'dup'; msg = raw + ' (already)'; } else if (w) { got.add(w); cls = 'good'; audio.ok(got.size); } else audio.bad();
      list.prepend(h('span', { class: 'tw ' + cls }, msg)); status.textContent = `${got.size} / ${t.need}`;
      if (got.size >= t.need) finish(false);
    };
    const finish = (timedOut) => { if (done) return; done = true; clearTimeout(to); tb.stop(); inp.disabled = true; setTimeout(() => resolve({ correct: got.size >= t.need, rt: now() - t0, tags: { wordsFound: got.size }, explain: got.size >= t.need ? '' : `${got.size} of ${t.need} valid words. Some accepted answers: ${t.accept.filter((a) => !got.has(norm(a))).slice(0, 4).join(', ')}.` }), 500); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    ctx.stage.replaceChildren(h('div', { class: 'trial' }, tb.bar, qNode(t, ctx), status, h('div', { class: 'typerow' }, inp, h('button', { class: 'btn', type: 'button', onclick: submit }, 'Add')), list, ctx.practice && t.hint ? h('p', { class: 'hint' }, t.hint) : null));
    setTimeout(() => inp.focus(), 50);
    requestAnimationFrame(() => { if (t.timeMs && !ctx.settings.untimed) { tb.start(); to = setTimeout(() => finish(true), t.timeMs); } });
  });
}

export const KINDS = { choice: kChoice, sequence: kSequence, order: kSequence, multi: kMulti, numeric: kNumeric, stream: kStream, assign: kAssign, steps: kSteps, typing: kTyping };

function autoExplain(t) {
  if (t.kind === 'choice') { const o = t.options.find((x) => x.value === t.answer), l = labelOf(o); return l && l.length < 60 ? `Answer: ${l}.` : 'The correct answer is highlighted.'; }
  if (t.kind === 'numeric') return `Answer: ${t.prefix || ''}${t.answer}${t.suffix || ''}.`;
  if (t.kind === 'sequence' || t.kind === 'order') { const pal = t.palette || t.items, ls = t.answer.map((v) => labelOf(pal.find((p) => same(p.value, v)))); return ls.every(Boolean) && ls.join(' ').length < 90 ? `Answer: ${ls.join(t.textItems ? ' / ' : ' ')}` : ''; }
  if (t.kind === 'multi') return 'Correct items are outlined.';
  return '';
}

export async function runTrial(t, ctx, game = {}) {
  await runStudy(ctx, t.study);
  let side = null;
  if (t.distract) side = await runDistract(ctx, t.distract);
  const r = await KINDS[t.kind](t, ctx, game);
  r.tags = { ...(r.tags || {}) };
  if (side != null) r.tags[side ? 'sideRight' : 'sideWrong'] = 1;
  if (r.timedOut) r.tags.omission = 1;
  if (t.tag) { r.tags[t.tag + 'Total'] = 1; if (r.correct) r.tags[t.tag + 'Right'] = 1; }
  if (!r.correct && !r.explain) r.explain = r.timedOut ? 'Time ran out. ' + (t.explain || autoExplain(t)) : t.explain || autoExplain(t);
  return r;
}

const TAGNAME = { conflict: 'Conflict trials', plain: 'Plain trials', repeat: 'Rule repeats', switch: 'Rule switches', go: 'Go trials', stop: 'Stop trials', same: '“Same” trials', diff: '“Different” trials', congruent: 'Matching trials', incongruent: 'Mismatched trials',
  recog: 'Recognition', recall: 'Recall', apply: 'Applying', early: 'Short delay', late: 'Long delay', grouping: 'Grouping strategy', repetition: 'Repetition strategy', estimate: 'Estimates', exact: 'Exact answers', yes: '“Yes” trials', no: '“No” trials' };
export function genericSummary(g, s) {
  const parts = [];
  for (const k of Object.keys(s.tags)) if (k.endsWith('Total')) { const b = k.slice(0, -5); if (b === 'steps' || b === 'pairs') continue; parts.push(`${TAGNAME[b] || b}: ${s.tags[b + 'Right'] || 0}/${s.tags[k]}`); }
  if (s.tags.pairsTotal) parts.push(`pairs matched ${s.tags.pairsRight || 0}/${s.tags.pairsTotal}`);
  if (s.tags.hit != null || s.tags.miss != null) parts.push(`targets caught ${s.tags.hit || 0}, missed ${s.tags.miss || 0}, false alarms ${s.tags.falseAlarm || 0}`);
  const conf = [50, 70, 90, 100].filter((c) => s.tags['conf' + c]).map((c) => `said ${c}% sure: right ${Math.round((100 * (s.tags['conf' + c + 'Right'] || 0)) / s.tags['conf' + c])}% (n=${s.tags['conf' + c]})`);
  if (conf.length) parts.push('Confidence check: ' + conf.join('; '));
  if (s.tags.sideRight != null || s.tags.sideWrong != null) parts.push(`side task ${s.tags.sideRight || 0}/${(s.tags.sideRight || 0) + (s.tags.sideWrong || 0)}`);
  if (s.tags.omission) parts.push(`${s.tags.omission} timed out`);
  const acc = s.trials ? Math.round((100 * s.correct) / s.trials) : 0;
  return `Reached level ${s.maxLevel}, ${s.correct}/${s.trials} correct (${acc}%).${parts.length ? ' ' + parts.join(' · ') + '.' : ''}`;
}

/** Wraps a game definition so it plays through the generic renderers. */
export function std(def) {
  const g = { min: 1, max: 12, mode: 'both', practiceTrials: 2, id: slug(def.title), ...def };
  if (!g.play) g.play = (t, ctx) => runTrial(t, ctx, g);
  if (!g.summary) g.summary = genericSummary;
  return g;
}
