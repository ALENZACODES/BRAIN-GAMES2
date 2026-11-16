import { h } from '../engine.js';
import { choiceTrial } from '../kit.js';

const rotate = (pts, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]); };
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);

export const logic = {
  params(level) { return { verts: Math.min(10, 5 + Math.floor(level / 2)), options: Math.min(5, 3 + Math.floor(level / 4)), maxAngle: Math.min(180, 70 + level * 9), subtle: Math.max(0.1, 0.4 - level * 0.022), timeMs: Math.max(5500, 16000 - level * 750) }; },
  rotate, mirror,
  /** True when b is exactly a rotated about the origin (vertex order preserved). Mirror images are NOT rotations. */
  isRotation(a, b, eps = 1e-6) {
    if (a.length !== b.length) return false;
    const th = Math.atan2(b[0][1], b[0][0]) - Math.atan2(a[0][1], a[0][0]), r = rotate(a, (th * 180) / Math.PI);
    return r.every(([x, y], i) => Math.abs(x - b[i][0]) < eps && Math.abs(y - b[i][1]) < eps);
  },
  makeShape(rng, verts) {
    for (;;) {
      const off = rng.float(0, 360), pts = Array.from({ length: verts }, (_, i) => { const a = ((off + (i * 360) / verts + rng.float(-14, 14)) * Math.PI) / 180, r = rng.float(0.42, 1); return [Math.cos(a) * r, Math.sin(a) * r]; });
      if (!logic.isRotation(pts, mirror(pts), 0.05)) return pts; // must be visibly chiral
    }
  },
  bend(rng, pts, amt) { const i = rng.int(0, pts.length - 1), [x, y] = pts[i], k = 1 + (rng.chance(0.5) ? 1 : -1) * amt; return pts.map((p, j) => (j === i ? [x * k + (rng.chance(0.5) ? amt * 0.3 : -amt * 0.3), y * k] : p)); },
  makeTrial(rng, level) {
    const p = logic.params(level), target = logic.makeShape(rng, p.verts), ang = rng.float(35, p.maxAngle) * (rng.chance(0.5) ? 1 : -1);
    const correct = rotate(target, ang), opts = [{ pts: correct, ok: true }];
    opts.push({ pts: rotate(mirror(target), rng.float(0, 360)), ok: false }); // always one mirror image
    while (opts.length < p.options) {
      let d = rng.chance(0.5) ? mirror(target) : target; d = logic.bend(rng, d, p.subtle);
      d = rotate(d, rng.float(0, 360)); if (!logic.isRotation(target, d, 0.04)) opts.push({ pts: d, ok: false });
    }
    const order = rng.shuffle(opts);
    return { ...p, target, options: order.map((o) => o.pts), answer: order.findIndex((o) => o.ok) };
  },
  check: (trial, idx) => idx === trial.answer,
};
function shapeSVG(pts, size, hue) {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(50 + x * 38).toFixed(2)} ${(50 + y * 38).toFixed(2)}`).join('') + 'Z';
  return h('svg', { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': 'true', html: `<defs><linearGradient id="rg${hue}${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 90% 72%)"/><stop offset="1" stop-color="hsl(${hue + 30} 80% 48%)"/></linearGradient></defs><path d="${d}" fill="url(#rg${hue}${size})" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-linejoin="round"/><circle cx="${(50 + pts[0][0] * 38).toFixed(1)}" cy="${(50 + pts[0][1] * 38).toFixed(1)}" r="4.5" fill="#fff"/>` });
}

export default {
  id: 'rotation-match', num: 141, title: 'Rotation Match', min: 1, max: 14, start: 1, mode: 'both', practiceTrials: 2,
  how: ['A shape is shown at the top, with one corner marked by a white dot.', 'Pick the option that is the SAME shape, just turned. Mirror images and shapes with a bent corner are traps.', 'Shapes get more complex and the clock tightens as you improve.'],
  makeTrial: logic.makeTrial,
  async play(trial, ctx) {
    const node = h('div', { class: 'refshape' }, h('small', {}, 'Turn this…'), shapeSVG(trial.target, 150, 200));
    const r = await choiceTrial(ctx, { promptNode: node, options: trial.options.map((pts, i) => ({ node: shapeSVG(pts, 120, 30 + i * 40), value: i, cls: 'tile', aria: `Option ${i + 1}` })), answer: trial.answer, timeMs: trial.timeMs, cols: trial.options.length === 3 ? 3 : trial.options.length === 4 ? 2 : 3,
      hint: 'Practice: find the one you could get by only rotating, never flipping.' });
    return { ...r, tags: { ...(r.correct ? { right: 1 } : { wrong: 1 }), ...(r.timedOut ? { omission: 1 } : {}) }, metric: { name: 'corners', value: trial.verts },
      explain: r.correct ? '' : r.timedOut ? 'Time ran out. The matching shape is outlined in green.' : 'The green-outlined option is the true rotation.' };
  },
  summary: (g, s) => `${s.best.corners ? `Matched shapes with up to ${s.best.corners} corners. ` : ''}${s.tags.right || 0} rotations matched, ${s.tags.wrong || 0} misses, ${s.tags.omission || 0} timeouts.`,
};
