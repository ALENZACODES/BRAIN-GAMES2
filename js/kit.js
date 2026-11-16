// Reusable UI pieces for games.
import { h, now, audio } from './engine.js';

export function timerBar(ctx, ms) {
  const fill = h('i');
  const bar = h('div', { class: 'timebar', 'aria-hidden': 'true' }, fill);
  if (ctx.settings.untimed || !ms) { bar.style.visibility = 'hidden'; return { bar, start() {}, stop() {} }; }
  return {
    bar,
    start() {
      fill.style.transition = 'none'; fill.style.transform = 'scaleX(1)';
      void fill.offsetWidth;
      fill.style.transition = `transform ${ms}ms linear`; fill.style.transform = 'scaleX(0)';
    },
    stop() { const w = getComputedStyle(fill).transform; fill.style.transition = 'none'; fill.style.transform = w; },
  };
}

/**
 * One prompt, several answer buttons, optional time limit.
 * options: [{label|node, value, cls}] ; answer: value that is correct.
 * Returns {correct, rt, timedOut, picked, speed}.
 */
export function choiceTrial(ctx, { prompt, promptNode, options, answer, timeMs = 0, cols, flashMs = 420, hint, keys }) {
  return new Promise((resolve) => {
    let done = false;
    const limited = timeMs > 0 && !ctx.settings.untimed;
    const tb = timerBar(ctx, limited ? timeMs : 0);
    const n = options.length;
    const btns = options.map((o, i) =>
      h('button', { class: 'opt ' + (o.cls || ''), type: 'button', 'data-i': i, 'aria-label': o.aria || (typeof o.label === 'string' ? o.label : `Option ${i + 1}`) },
        o.node || o.label, (n > 2 && n <= 9) ? h('kbd', {}, i + 1) : null));
    const grid = h('div', { class: 'opts', style: { '--cols': cols || (n <= 3 ? n : n === 4 ? 2 : 3) } }, btns);
    ctx.stage.replaceChildren(
      h('div', { class: 'trial' }, tb.bar, promptNode || h('div', { class: 'prompt' }, prompt), hint && ctx.practice ? h('p', { class: 'hint' }, hint) : null, grid));
    let to = 0, t0 = 0;
    const finish = (idx, timedOut) => {
      if (done) return; done = true; clearTimeout(to); tb.stop();
      document.removeEventListener('keydown', onKey);
      const rt = now() - t0;
      const picked = timedOut ? null : options[idx].value;
      const correct = !timedOut && picked === answer;
      btns.forEach((b, i) => { b.disabled = true; if (options[i].value === answer) b.classList.add('right'); });
      if (!timedOut && !correct) btns[idx].classList.add('wrong');
      if (!timedOut) btns[idx].classList.add('picked');
      setTimeout(() => resolve({ correct, rt, timedOut, picked, speed: limited ? Math.max(0, 1 - rt / timeMs) : 0 }), flashMs);
    };
    const onKey = (e) => {
      if (e.repeat) return;
      let idx = -1;
      if (/^[1-9]$/.test(e.key)) idx = +e.key - 1;
      else if (n === 2 && e.key === 'ArrowLeft') idx = 0; else if (n === 2 && e.key === 'ArrowRight') idx = 1;
      else if (keys && keys[e.key] != null) idx = keys[e.key];
      if (idx >= 0 && idx < n) { e.preventDefault(); audio.tap(); finish(idx, false); }
    };
    btns.forEach((b, i) => b.addEventListener('click', () => { audio.tap(); finish(i, false); }));
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => { t0 = now(); if (limited) { tb.start(); to = setTimeout(() => finish(-1, true), timeMs); } });
  });
}

export function burst(x, y, n = 28, reduce = false) {
  if (reduce) return;
  const cols = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#c77dff', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const p = h('i', { class: 'confetti' });
    p.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % cols.length]};`;
    document.body.append(p);
    const ang = Math.random() * Math.PI * 2, d = 80 + Math.random() * 180;
    p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d + 120}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
      { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
  }
}

// ---- Fruit sprites (SVG, shaded so they read as objects, not emoji) ----
const FR = {
  apple: ['#ff5a5f', '#b3121f', 'M50 30c-14-10-34-2-34 22 0 22 14 40 34 34 20 6 34-12 34-34 0-24-20-32-34-22z', '#4caf50'],
  pear: ['#d4e157', '#7a9a10', 'M50 18c-10 0-14 10-14 18 0 8-18 16-18 36 0 14 14 22 32 22s32-8 32-22c0-20-18-28-18-36 0-8-4-18-14-18z', '#6d4c41'],
  cherry: ['#ff4d6d', '#8d0a2b', 'M32 60a18 18 0 1 0 .1 0zM68 66a16 16 0 1 0 .1 0z', '#43a047'],
  lemon: ['#ffee58', '#c6a700', 'M12 54c0-18 18-30 38-30s38 12 38 30-18 30-38 30S12 72 12 54z', '#7cb342'],
  grape: ['#9d4edd', '#4a0a82', 'M50 38a13 13 0 1 0 .1 0zM30 52a13 13 0 1 0 .1 0zM70 52a13 13 0 1 0 .1 0zM40 70a13 13 0 1 0 .1 0zM60 70a13 13 0 1 0 .1 0zM50 86a12 12 0 1 0 .1 0z', '#558b2f'],
  orange: ['#ffa726', '#c25e00', 'M50 20a38 38 0 1 0 .1 0z', '#388e3c'],
  plum: ['#7b5cff', '#2c1a8c', 'M50 22c-24 0-36 20-36 40 0 18 16 26 36 26s36-8 36-26c0-20-12-40-36-40z', '#2e7d32'],
  kiwi: ['#9ccc65', '#3e6b1a', 'M50 20c-22 0-38 14-38 34s16 32 38 32 38-12 38-32S72 20 50 20z', '#5d4037'],
};
export const FRUITS = Object.keys(FR);
export function fruit(name, size = 84) {
  const [c1, c2, d, leaf] = FR[name], id = 'f' + name + size;
  return h('svg', { viewBox: '0 0 100 100', width: size, height: size, 'aria-label': name, role: 'img',
    html: `<defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".22" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
<ellipse cx="50" cy="94" rx="30" ry="4" fill="#000" opacity=".28"/><path d="${d}" fill="url(#${id})"/>
<path d="M50 22c0-8 4-12 10-14" stroke="${leaf}" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="62" cy="16" rx="9" ry="4.5" fill="${leaf}" transform="rotate(-25 62 16)"/>` });
}
export const SHAPE_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#52d1dc'];
