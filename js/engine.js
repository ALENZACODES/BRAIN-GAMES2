// Core engine: seeded RNG, adaptive difficulty, session loop, local progress, audio.
// No DOM access at import time, so game logic can be unit-tested in Node.

export const $ = (s, r = document) => r.querySelector(s);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function h(tag, props, ...kids) {
  const e = tag === 'svg' || tag.startsWith('svg:')
    ? document.createElementNS('http://www.w3.org/2000/svg', tag.replace('svg:', ''))
    : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.setAttribute('class', v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) e.style.setProperty(sk, sv); else e.style[sk] = sv; } }
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(3)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

// ---------- Seeded randomness (reproducible puzzles) ----------
export function hashStr(s) {
  let x = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class RNG {
  constructor(seed) { this.f = mulberry32(typeof seed === 'string' ? hashStr(seed) : seed >>> 0); }
  next() { return this.f(); }
  int(a, b) { return a + Math.floor(this.f() * (b - a + 1)); }
  float(a, b) { return a + this.f() * (b - a); }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(p) { return this.f() < p; }
  shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = this.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  sample(arr, n) { return this.shuffle(arr).slice(0, n); }
}

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); }

// ---------- Difficulty: change ONE parameter (level) at a time; 2-up / 1-down ----------
export class Staircase {
  constructor(min, max, start) { this.min = min; this.max = max; this.level = clamp(start, min, max); this.run = 0; }
  update(correct) {
    if (correct) {
      this.run++;
      if (this.run >= 2) { this.run = 0; if (this.level < this.max) { this.level++; return 1; } }
    } else {
      this.run = 0;
      if (this.level > this.min) { this.level--; return -1; }
    }
    return 0;
  }
}

export function points(level, streak, speed = 0) {
  return Math.round(100 * level * (1 + Math.min(streak, 10) * 0.1) * (1 + clamp(speed, 0, 1) * 0.5));
}

// ---------- Local storage (memory) ----------
let NS = 'bg:';
export function configureStore(ns) { NS = ns + ':'; }
export const store = {
  get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(NS + k); } catch {} },
  keys() { try { return Object.keys(localStorage).filter((k) => k.startsWith(NS)).map((k) => k.slice(NS.length)); } catch { return []; } },
};

const DEFAULT_PROFILE = () => ({
  v: 1, name: 'Player', created: Date.now(), xp: 0,
  streak: { count: 0, last: '' }, bestStreak: 0,
  days: {}, ach: {}, totals: { runs: 0, trials: 0, duels: 0 },
  settings: { sound: true, haptics: true, reduceMotion: false, untimed: false, theme: 'aurora', name2: 'Player 2' },
});
export function getProfile() {
  const p = store.get('profile', null) || DEFAULT_PROFILE();
  const d = DEFAULT_PROFILE();
  p.settings = { ...d.settings, ...(p.settings || {}) };
  p.totals = { ...d.totals, ...(p.totals || {}) };
  return p;
}
export function saveProfile(p) { store.set('profile', p); }
export const emptyGameRec = () => ({ plays: 0, best: { score: 0, level: 0 }, history: [], daily: {}, seen: false });
export function getGameRec(id) { return { ...emptyGameRec(), ...(store.get('g:' + id, null) || {}) }; }
export function saveGameRec(id, r) { store.set('g:' + id, r); }

export function playerLevel(xp) { return Math.floor((Math.sqrt(1 + (8 * xp) / 150) - 1) / 2) + 1; }
export function xpForLevel(l) { return Math.round((150 * (l - 1) * l) / 2); }
export const TITLES = ['Rookie', 'Apprentice', 'Sharp', 'Keen', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Legend'];
export const titleFor = (lvl) => TITLES[Math.min(TITLES.length - 1, Math.floor((lvl - 1) / 4))];
export const THEMES = [
  { id: 'aurora', name: 'Aurora', hue: 265, at: 1 },
  { id: 'ember', name: 'Ember', hue: 18, at: 3 },
  { id: 'ocean', name: 'Ocean', hue: 195, at: 6 },
  { id: 'neon', name: 'Neon', hue: 150, at: 10 },
  { id: 'gold', name: 'Gold', hue: 42, at: 15 },
];

export const ACHIEVEMENTS = [
  { id: 'first', title: 'First Run', desc: 'Finish any game.', test: (c) => c.p.totals.runs >= 1 },
  { id: 'streak3', title: 'Three Days Running', desc: 'Play 3 days in a row.', test: (c) => c.p.streak.count >= 3 },
  { id: 'streak7', title: 'Week Warrior', desc: 'Play 7 days in a row.', test: (c) => c.p.streak.count >= 7 },
  { id: 'lvl8', title: 'Climber', desc: 'Reach level 8 in any game.', test: (c) => c.stats.maxLevel >= 8 },
  { id: 'lvl15', title: 'Summit', desc: 'Reach level 15 in any game.', test: (c) => c.stats.maxLevel >= 15 },
  { id: 'combo10', title: 'Ten in a Row', desc: 'Ten correct answers in a row.', test: (c) => c.stats.bestStreak >= 10 },
  { id: 'clear', title: 'Full Clear', desc: 'Finish a run without a single strike.', test: (c) => c.stats.strikes === 0 && c.stats.trials >= 10 },
  { id: 'trials100', title: 'Century', desc: '100 trials played in total.', test: (c) => c.p.totals.trials >= 100 },
  { id: 'trials1000', title: 'Thousand Club', desc: '1,000 trials played in total.', test: (c) => c.p.totals.trials >= 1000 },
  { id: 'daily3', title: 'Daily Workout', desc: 'Finish all three Daily Workout games in one day.', test: (c) => c.dailyBonus },
  { id: 'duel', title: 'Face-Off', desc: 'Finish a two-player duel.', test: (c) => c.p.totals.duels >= 1 },
  { id: 'explorer', title: 'Explorer', desc: 'Play 5 different games.', test: (c) => c.playedGames >= 5 },
];

/** Persist one finished run. `meta` = {daily, liveIds}. Returns what changed for the results screen. */
export function recordRun(game, stats, meta = {}) {
  const p = getProfile();
  const rec = getGameRec(game.id);
  const today = dateKey();
  const acc = stats.trials ? stats.correct / stats.trials : 0;
  const newBest = !meta.untimed && stats.score > rec.best.score;
  const beforeLevel = playerLevel(p.xp);
  const prevBestLevel = rec.best.level;

  rec.plays++; rec.seen = true;
  if (newBest) rec.best.score = stats.score;
  if (!meta.untimed && stats.maxLevel > rec.best.level) rec.best.level = stats.maxLevel;
  rec.history.push({ t: Date.now(), date: today, level: stats.maxLevel, score: stats.score, acc: +acc.toFixed(3), trials: stats.trials, u: meta.untimed ? 1 : 0 });
  rec.history = rec.history.slice(-40);
  let dailyFirst = false;
  if (meta.daily) { dailyFirst = rec.daily[today] == null; if (dailyFirst || stats.score > rec.daily[today]) rec.daily[today] = stats.score; rec.daily = Object.fromEntries(Object.entries(rec.daily).slice(-14)); }
  saveGameRec(game.id, rec);

  let xp = Math.floor(stats.score / 25) + stats.trials * 2 + (newBest && rec.plays > 1 ? 50 : 0) + (dailyFirst ? 30 : 0);
  p.xp += xp;
  p.totals.runs++; p.totals.trials += stats.trials;
  const y = yesterdayKey();
  if (p.streak.last !== today) { p.streak.count = p.streak.last === y ? p.streak.count + 1 : 1; p.streak.last = today; }
  p.bestStreak = Math.max(p.bestStreak, p.streak.count);
  const day = (p.days[today] ||= { runs: 0, xp: 0 });
  day.runs++; day.xp += xp;
  p.days = Object.fromEntries(Object.entries(p.days).slice(-60));

  let dailyBonus = false;
  if (meta.daily && meta.picks) {
    const done = meta.picks.every((id) => getGameRec(id).daily[today] != null);
    const key = 'dailyBonus:' + today;
    if (done && !store.get(key, false)) { store.set(key, true); dailyBonus = true; p.xp += 100; xp += 100; }
  }
  const playedGames = (meta.allIds || []).filter((id) => getGameRec(id).plays > 0).length;
  const newAch = [];
  for (const a of ACHIEVEMENTS) {
    if (!p.ach[a.id] && a.test({ p, stats, dailyBonus, playedGames })) { p.ach[a.id] = Date.now(); newAch.push(a); }
  }
  saveProfile(p);
  const afterLevel = playerLevel(p.xp);
  return { xp, newBest: newBest && rec.plays > 1, firstRun: rec.plays === 1, levelUp: afterLevel > beforeLevel ? afterLevel : 0, newAch, dailyBonus,
    newBestLevel: stats.maxLevel > prevBestLevel && prevBestLevel > 0, rec, streak: p.streak.count };
}

export function dailyPicks(ids, key = dateKey(), n = 3) { return new RNG('daily:' + key).sample(ids, Math.min(n, ids.length)); }

// ---------- Audio + haptics (synthesised; no files to download) ----------
let AC = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
export const audio = {
  on: true, haptics: true,
  tone(f, d = 0.12, type = 'sine', vol = 0.14, delay = 0) {
    if (!this.on) return; const c = ac(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.03);
  },
  tap() { this.tone(520, 0.05, 'triangle', 0.09); },
  ok(streak = 0) { const b = 523 * Math.pow(2, Math.min(streak, 12) / 12); this.tone(b, 0.1, 'sine', 0.13); this.tone(b * 1.5, 0.16, 'sine', 0.11, 0.07); },
  bad() { this.tone(170, 0.22, 'sawtooth', 0.09); this.tone(120, 0.26, 'sawtooth', 0.07, 0.08); },
  level() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.13, i * 0.07)); },
  win() { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.14, i * 0.09)); },
  note(i) { const pent = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0]; this.tone(pent[i % pent.length], 0.28, 'sine', 0.16); },
  buzz(ms = 18) { if (this.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch {} } },
};

// ---------- Session loop ----------
/**
 * game: {id,min,max,makeTrial(rng,level,{practice}),play(trial,ctx)=>Promise<result>}
 * result: {correct:boolean, rt?:ms, speed?:0..1, tags?:{k:n}, explain?:string, invalid?:bool}
 * host: DOM bridge supplied by the app (stage, hud, feedback, alive).
 */
export async function runSession(game, opts, host) {
  const { seed, startLevel = game.min, practice = false } = opts;
  const st = new Staircase(game.min, game.max, startLevel);
  const MAX_TRIALS = opts.maxTrials ?? game.maxTrials ?? 30, MAX_STRIKES = 3;
  const stats = { trials: 0, correct: 0, streak: 0, bestStreak: 0, score: 0, strikes: 0, maxLevel: st.level, startLevel: st.level,
    tags: {}, rts: [], replayed: 0, levels: [], best: {} };
  const trialCtx = (base) => ({
    ...base, stage: host.stage, settings: host.settings, alive: host.alive, now, sleep: (ms) => new Promise((r) => setTimeout(() => host.alive() && r(), ms)),
    hidden: typeof document !== 'undefined' && document.hidden, audio, host,
  });
  const play = async (trial, base) => {
    const ctx = trialCtx(base);
    const onVis = () => { if (document.hidden) ctx.hidden = true; };
    document.addEventListener('visibilitychange', onVis);
    host.stage.replaceChildren();
    try { return await game.play(trial, ctx); } finally { document.removeEventListener('visibilitychange', onVis); if (ctx.hidden) ctx.wasHidden = true; base._ctx = ctx; }
  };

  if (practice) {
    host.setPractice(true);
    for (let p = 0; p < (game.practiceTrials ?? 2) && host.alive(); p++) {
      const rng = new RNG(`${seed}:practice:${p}`);
      const trial = game.makeTrial(rng, game.min, { practice: true });
      const res = await play(trial, { level: game.min, practice: true, index: p, rng });
      if (!host.alive()) return null;
      await host.feedback(res, { practice: true, stats });
    }
    host.setPractice(false);
    await host.practiceDone();
  }

  let seedN = 0;
  while (stats.strikes < MAX_STRIKES && stats.trials < MAX_TRIALS && host.alive()) {
    const level = st.level;
    const rng = new RNG(`${seed}:${seedN++}`);
    const trial = game.makeTrial(rng, level, { practice: false });
    host.hud({ level, score: stats.score, streak: stats.streak, strikes: stats.strikes, trial: stats.trials + 1, max: MAX_TRIALS });
    const base = { level, practice: false, index: stats.trials, rng };
    const res = await play(trial, base);
    if (!host.alive()) return null;
    if (base._ctx?.wasHidden && !res.noReplay) { stats.replayed++; host.toast('You switched away, so that trial was replayed.'); continue; }
    stats.trials++; stats.levels.push(level);
    if (res.rt != null && res.correct) stats.rts.push(res.rt);
    for (const [k, v] of Object.entries(res.tags || {})) stats.tags[k] = (stats.tags[k] || 0) + v;
    if (res.correct && res.metric) stats.best[res.metric.name] = Math.max(stats.best[res.metric.name] || 0, res.metric.value);
    let gained = 0;
    if (res.correct) {
      stats.correct++; stats.streak++; stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
      gained = points(level, stats.streak, res.speed || 0); stats.score += gained;
    } else { stats.streak = 0; stats.strikes++; }
    const change = st.update(!!res.correct);
    stats.maxLevel = Math.max(stats.maxLevel, st.level);
    host.hud({ level: st.level, score: stats.score, streak: stats.streak, strikes: stats.strikes, trial: stats.trials, max: MAX_TRIALS });
    await host.feedback(res, { practice: false, gained, change, stats, level: st.level });
  }
  stats.cleared = stats.trials >= MAX_TRIALS && stats.strikes < MAX_STRIKES;
  if (stats.cleared) stats.score += 500 * stats.maxLevel; // full-clear bonus
  return stats;
}

export function median(a) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
export function defaultSummary(g, s) {
  const acc = s.trials ? Math.round((100 * s.correct) / s.trials) : 0;
  return `Reached level ${s.maxLevel}, ${s.correct} of ${s.trials} correct (${acc}%), longest streak ${s.bestStreak}.`;
}
