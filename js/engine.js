import { audio, music } from './audio.js';
// Core engine: seeded RNG, adaptive difficulty, session loop, local progress, audio.
// No DOM access at import time, so game logic can be unit-tested in Node.

export const $ = (s, r = document) => r.querySelector(s);
export const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
  /** warm = true: until the first miss, every correct answer moves up a level (fast start), then the usual 2-up / 1-down. */
  constructor(min, max, start, warm = false) { this.min = min; this.max = max; this.level = clamp(start, min, max); this.run = 0; this.warm = warm; }
  update(correct) {
    if (correct && this.warm && this.level < Math.ceil(this.max * 0.5)) { this.level++; return 1; }
    if (!correct) this.warm = false;
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
  streak: { count: 0, last: '' }, bestStreak: 0, freezes: 0, lastPlayed: '',
  days: {}, ach: {}, totals: { runs: 0, trials: 0, duels: 0 },
  settings: { sound: true, music: true, soundStyle: 'glass', haptics: true, reduceMotion: false, untimed: false, theme: 'aurora', name2: 'Player 2' },
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
  { id: 'streak30', title: 'Habit Formed', desc: 'Play 30 days in a row.', test: (c) => c.p.streak.count >= 30 },
  { id: 'lvl8', title: 'Climber', desc: 'Reach level 8 in any game.', test: (c) => c.stats.maxLevel >= 8 },
  { id: 'lvl12', title: 'Summit', desc: 'Reach level 12 in any game.', test: (c) => c.stats.maxLevel >= 12 },
  { id: 'combo10', title: 'Ten in a Row', desc: 'Ten correct answers in a row.', test: (c) => c.stats.bestStreak >= 10 },
  { id: 'clear', title: 'Full Clear', desc: 'Finish a run without a single strike.', test: (c) => c.stats.strikes === 0 && c.stats.trials >= 10 },
  { id: 'trials100', title: 'Century', desc: '100 trials played in total.', test: (c) => c.p.totals.trials >= 100 },
  { id: 'trials1000', title: 'Thousand Club', desc: '1,000 trials played in total.', test: (c) => c.p.totals.trials >= 1000 },
  { id: 'daily3', title: 'Daily Workout', desc: 'Finish all three Daily Workout games in one day.', test: (c) => c.dailyBonus },
  { id: 'missions', title: 'Mission Complete', desc: 'Finish all three daily missions in one day.', test: (c) => c.missionChest },
  { id: 'duel', title: 'Face-Off', desc: 'Finish a two-player duel.', test: (c) => c.p.totals.duels >= 1 },
  { id: 'explorer', title: 'Explorer', desc: 'Play 10 different games.', test: (c) => c.playedGames >= 10 },
  { id: 'voyager', title: 'Voyager', desc: 'Play 50 different games.', test: (c) => c.playedGames >= 50 },
  { id: 'stars25', title: 'Star Collector', desc: 'Earn 25 mastery stars.', test: (c) => c.totalStars >= 25 },
  { id: 'stars100', title: 'Constellation', desc: 'Earn 100 mastery stars.', test: (c) => c.totalStars >= 100 },
  { id: 'stars300', title: 'Galaxy', desc: 'Earn all 300 mastery stars.', test: (c) => c.totalStars >= 300 },
  { id: 'comeback', title: 'Welcome Back', desc: 'Return after a few days away.', test: (c) => c.comeback },
];

// ---------- mastery stars ----------
export const starThresholds = (max) => [Math.ceil(max * 0.3), Math.ceil(max * 0.55), Math.ceil(max * 0.8)];
export const starsFor = (level, max) => starThresholds(max).filter((t) => level >= t).length;
export function totalStars(ids) { return ids.reduce((a, id) => a + (getGameRec(id).stars || 0), 0); }

// ---------- dates ----------
export function addDays(key, n) { const [y, m, d] = key.split('-').map(Number), dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n); return dateKey(dt); }
export function daysBetween(a, b) { const f = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((f(b) - f(a)) / 864e5); }

/** Streak rules: a day in a row extends it; missing exactly one day is covered by a freeze if you have one. Every 7th day earns a freeze (max 2). */
export function advanceStreak(p, today) {
  const out = { freezeUsed: false, freezeEarned: false };
  if (p.streak.last === today) return out;
  const gap = p.streak.last ? daysBetween(p.streak.last, today) : 99;
  if (gap === 1) p.streak.count++;
  else if (gap === 2 && (p.freezes || 0) > 0) { p.freezes--; p.streak.count++; out.freezeUsed = true; }
  else p.streak.count = 1;
  p.streak.last = today;
  if (p.streak.count % 7 === 0 && (p.freezes || 0) < 2) { p.freezes = (p.freezes || 0) + 1; out.freezeEarned = true; }
  p.bestStreak = Math.max(p.bestStreak, p.streak.count);
  return out;
}

// ---------- daily missions ----------
const MISSIONS = [
  { id: 'play3', kind: 'distinct', goal: 3, text: 'Play 3 different games' },
  { id: 'star', kind: 'stars', goal: 1, text: 'Earn a new mastery star' },
  { id: 'streak8', kind: 'combo', goal: 8, text: 'Get 8 right in a row in one run' },
  { id: 'cat', kind: 'cat', goal: 1, text: 'Finish a {cat} game' },
  { id: 'workout', kind: 'daily', goal: 3, text: 'Finish today’s Daily Workout' },
  { id: 'level6', kind: 'level', goal: 6, text: 'Reach level 6 in any game' },
  { id: 'new', kind: 'newgame', goal: 1, text: 'Try a game you have never played' },
  { id: 'runs4', kind: 'runs', goal: 4, text: 'Finish 4 runs' },
  { id: 'best', kind: 'pb', goal: 1, text: 'Beat one of your personal bests' },
];
export function getMissions(today, cats, label = (c) => c) {
  const k = 'missions:' + today; let m = store.get(k, null);
  if (!m) {
    const r = new RNG('missions:' + today), pick = r.sample(MISSIONS, 3), cat = r.pick(cats);
    m = { date: today, done: false, list: pick.map((x) => ({ ...x, text: x.text.replace('{cat}', label(cat)), cat, prog: 0 })) };
    store.set(k, m);
  }
  return m;
}
function updateMissions(today, ev) {
  const k = 'missions:' + today, m = store.get(k, null); if (!m) return { completed: [], chest: false };
  const completed = [];
  for (const x of m.list) {
    if (x.prog >= x.goal) continue;
    const before = x.prog;
    if (x.kind === 'distinct') x.prog = ev.distinctToday;
    else if (x.kind === 'stars') x.prog += ev.newStars;
    else if (x.kind === 'combo') x.prog = Math.max(x.prog, ev.bestStreak);
    else if (x.kind === 'cat') x.prog += ev.cat === x.cat ? 1 : 0;
    else if (x.kind === 'daily') x.prog = ev.dailyDone;
    else if (x.kind === 'level') x.prog = Math.max(x.prog, ev.maxLevel);
    else if (x.kind === 'newgame') x.prog += ev.firstRun ? 1 : 0;
    else if (x.kind === 'runs') x.prog += 1;
    else if (x.kind === 'pb') x.prog += ev.newBest ? 1 : 0;
    x.prog = Math.min(x.goal, x.prog);
    if (before < x.goal && x.prog >= x.goal) completed.push(x);
  }
  let chest = false; if (!m.done && m.list.every((x) => x.prog >= x.goal)) { m.done = true; chest = true; }
  store.set(k, m);
  return { completed, chest };
}

/** Persist one finished run. meta = {daily, picks, allIds, untimed, max, cat, cats}. Returns everything the results screen needs. */
export function recordRun(game, stats, meta = {}) {
  const p = getProfile(), rec = getGameRec(game.id), today = meta.today || dateKey();
  const acc = stats.trials ? stats.correct / stats.trials : 0, beforeLevel = playerLevel(p.xp), prevBestLevel = rec.best.level, prevBestScore = rec.best.score;
  const firstRun = rec.plays === 0, counted = !meta.untimed && stats.trials > 0;
  const newBest = counted && stats.score > rec.best.score && !firstRun;
  const lastPlayed = p.lastPlayed || '', gapDays = lastPlayed ? daysBetween(lastPlayed, today) : 0, comeback = gapDays >= 3 && p.comebackFor !== today;
  rec.plays++; rec.seen = true; rec.last = Date.now();
  if (counted && stats.score > rec.best.score) rec.best.score = stats.score;
  if (counted && stats.maxLevel > rec.best.level) rec.best.level = stats.maxLevel;
  const starsBefore = rec.stars || 0; if (meta.max && counted) rec.stars = Math.max(starsBefore, starsFor(rec.best.level, meta.max));
  const newStars = (rec.stars || 0) - starsBefore;
  rec.history.push({ t: Date.now(), date: today, level: stats.maxLevel, score: stats.score, acc: +acc.toFixed(3), trials: stats.trials, u: meta.untimed ? 1 : 0 });
  rec.history = rec.history.slice(-40);
  let dailyFirst = false;
  if (meta.daily) { dailyFirst = rec.daily[today] == null; if (dailyFirst || stats.score > rec.daily[today]) rec.daily[today] = stats.score; rec.daily = Object.fromEntries(Object.entries(rec.daily).slice(-14)); }
  saveGameRec(game.id, rec);

  let xp = Math.floor(stats.score / 25) + stats.trials * 2 + (newBest ? 50 : 0) + (dailyFirst ? 30 : 0) + newStars * 40;
  if (comeback) { xp *= 2; p.comebackFor = today; }
  p.totals.runs++; p.totals.trials += stats.trials;
  const streakEv = advanceStreak(p, today);
  p.lastPlayed = today;
  const day = (p.days[today] ||= { runs: 0, xp: 0, games: [] });
  day.runs++; if (!(day.games ||= []).includes(game.id)) day.games.push(game.id);
  p.days = Object.fromEntries(Object.entries(p.days).slice(-60));

  let dailyBonus = false, dailyDone = 0;
  if (meta.picks) { dailyDone = meta.picks.filter((id) => getGameRec(id).daily[today] != null).length;
    const key = 'dailyBonus:' + today; if (meta.daily && dailyDone === meta.picks.length && !store.get(key, false)) { store.set(key, true); dailyBonus = true; xp += 100; } }
  if (meta.cats) getMissions(today, meta.cats, meta.catLabel);
  const mis = updateMissions(today, { distinctToday: day.games.length, newStars, bestStreak: stats.bestStreak, cat: meta.cat, dailyDone, maxLevel: stats.maxLevel, firstRun, newBest });
  xp += mis.completed.length * 50 + (mis.chest ? 150 : 0);
  p.xp += xp; day.xp += xp;

  const ids = meta.allIds || [], playedGames = ids.filter((id) => getGameRec(id).plays > 0).length, stars = totalStars(ids);
  const newAch = [];
  for (const a of ACHIEVEMENTS) if (!p.ach[a.id] && a.test({ p, stats, dailyBonus, playedGames, totalStars: stars, missionChest: mis.chest, comeback })) { p.ach[a.id] = Date.now(); newAch.push(a); }
  saveProfile(p);
  const afterLevel = playerLevel(p.xp);
  return { xp, newBest, firstRun, levelUp: afterLevel > beforeLevel ? afterLevel : 0, newAch, dailyBonus, comeback, newStars, stars: rec.stars || 0, totalStars: stars,
    missionsDone: mis.completed, missionChest: mis.chest, ...streakEv, prevBestScore, prevBestLevel, newBestLevel: counted && stats.maxLevel > prevBestLevel && prevBestLevel > 0, rec, streak: p.streak.count, freezes: p.freezes || 0 };
}

export function dailyPicks(ids, key = dateKey(), n = 3) { return new RNG('daily:' + key).sample(ids, Math.min(n, ids.length)); }

// ---------- Audio: see audio.js (CC0 samples, synth, music) ----------
export { audio, music };

// ---------- Session loop ----------
/**
 * game: {id,min,max,makeTrial(rng,level,{practice}),play(trial,ctx)=>Promise<result>}
 * result: {correct:boolean, rt?:ms, speed?:0..1, tags?:{k:n}, explain?:string, invalid?:bool}
 * host: DOM bridge supplied by the app (stage, hud, feedback, alive).
 */
export async function runSession(game, opts, host) {
  const { seed, startLevel = game.min, practice = false } = opts;
  const st = new Staircase(game.min, game.max, startLevel, opts.warm ?? true);
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
    if (res.endRun) break;
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
  game.onEnd?.(stats);
  stats.cleared = stats.trials >= MAX_TRIALS && stats.strikes < MAX_STRIKES;
  if (stats.cleared) stats.score += 500 * stats.maxLevel; // full-clear bonus
  return stats;
}

export function median(a) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
export function defaultSummary(g, s) {
  const acc = s.trials ? Math.round((100 * s.correct) / s.trials) : 0;
  return `Reached level ${s.maxLevel}, ${s.correct} of ${s.trials} correct (${acc}%), longest streak ${s.bestStreak}.`;
}
