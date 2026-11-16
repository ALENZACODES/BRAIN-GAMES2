import { $, h, slug, hashStr, dateKey, store, configureStore, getProfile, saveProfile, getGameRec, recordRun, runSession, dailyPicks, playerLevel, xpForLevel, titleFor, starThresholds, totalStars, getMissions, daysBetween, RNG,
  THEMES, ACHIEVEMENTS, audio, defaultSummary, median } from './engine.js';
import { CONFIG } from './config.js';
import { LIVE } from './games/index.js';
import { posterEl, CAT_SHORT, catHue } from './art.js';
import { burst } from './kit.js';

const fmt = (n) => Math.round(n).toLocaleString();
let GAMES = [], BY_ID = {}, SESSION = { alive: false }, deferredInstall = null;
const QA = new URLSearchParams(location.search); // test hook: ?qa=3&lv=max shortens runs for automated checks
const root = () => $('#app');

// ---------- boot ----------
async function boot() {
  configureStore(CONFIG.key);
  const cat = await (await fetch('js/catalog.json')).json();
  GAMES = cat.filter((g) => g.n >= CONFIG.range[0] && g.n <= CONFIG.range[1]).map((g) => ({ ...g, id: slug(g.title), live: !!LIVE[slug(g.title)] }));
  BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  applySettings();
  try { navigator.storage?.persist?.(); } catch {}
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (location.hash === '' || location.hash === '#/') render(); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; toast('Installed. Find it on your home screen.'); });
  window.addEventListener('hashchange', () => { SESSION.alive = false; render(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  $('#splash')?.remove();
}
function applySettings() {
  const p = getProfile(), s = p.settings, t = THEMES.find((x) => x.id === s.theme) || THEMES[0];
  document.documentElement.style.setProperty('--h', t.id === 'aurora' ? CONFIG.hue : t.hue);
  document.documentElement.classList.toggle('reduce', !!s.reduceMotion);
  audio.on = s.sound; audio.haptics = s.haptics;
}
function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t);
  setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
}
const live = () => GAMES.filter((g) => g.live);
const picksToday = () => dailyPicks(live().map((g) => g.id), `${CONFIG.key}:${dateKey()}`);

// ---------- layout ----------
function frame(content, active) {
  const p = getProfile(), lvl = playerLevel(p.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1), pct = Math.round(((p.xp - lo) / (hi - lo)) * 100);
  const streakLive = p.streak.last === dateKey() || p.streak.last === (() => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); })();
  const nav = (id, label, href, icon) => h('a', { href, class: 'tab' + (active === id ? ' on' : ''), 'aria-current': active === id ? 'page' : null }, h('span', { class: 'ico', html: icon }), h('span', {}, label));
  root().replaceChildren(
    h('header', { class: 'top' },
      h('a', { href: '#/', class: 'brand', 'aria-label': 'Home' }, h('span', { class: 'logo', html: '<svg viewBox="0 0 40 40" width="34" height="34"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="hsl(var(--h) 90% 65%)"/></linearGradient></defs><path d="M20 3 36 12v16L20 37 4 28V12z" fill="none" stroke="url(#lg)" stroke-width="2.6"/><circle cx="20" cy="20" r="5.5" fill="url(#lg)"/><path d="M20 14.5V6M25 17l7-4M25 23l7 4M20 25.5V34M15 23l-7 4M15 17l-7-4" stroke="url(#lg)" stroke-width="2" stroke-linecap="round"/></svg>' }),
        h('span', { class: 'wm' }, h('b', {}, CONFIG.brand), h('small', {}, CONFIG.sub))),
      h('div', { class: 'chips' },
        h('span', { class: 'chip flame' + (streakLive ? '' : ' cold'), title: `Day streak${p.freezes ? ` · ${p.freezes} streak freeze${p.freezes > 1 ? 's' : ''}` : ''}` }, '🔥 ', streakLive ? p.streak.count : 0, p.freezes ? h('small', { class: 'frz' }, ' ❄' + p.freezes) : null),
        h('a', { class: 'chip star', href: '#/progress', title: 'Mastery stars' }, '★ ', totalStars(GAMES.map((g) => g.id)), h('small', {}, `/${GAMES.length * 3}`)),
        h('a', { class: 'chip lvl', href: '#/progress', title: `${titleFor(lvl)} · ${fmt(p.xp)} XP` }, `Lv ${lvl}`, h('i', { class: 'xpbar' }, h('u', { style: { width: pct + '%' } }))))),
    h('main', { class: 'main' }, content),
    h('nav', { class: 'tabs', 'aria-label': 'Main' },
      nav('play', 'Play', '#/', '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'),
      nav('progress', 'Progress', '#/progress', '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 19V9M10 19V5M16 19v-8M22 19V12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>'),
      nav('settings', 'Settings', '#/settings', '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>')));
  window.scrollTo(0, 0);
}

function render() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?'), parts = path.split('/').filter(Boolean), q = new URLSearchParams(qs || '');
  if (!parts.length) return hub();
  if (parts[0] === 'g' && BY_ID[parts[1]]) return gamePage(BY_ID[parts[1]], q);
  if (parts[0] === 'progress') return progress();
  if (parts[0] === 'settings') return settings();
  location.hash = '#/';
}

// ---------- hub ----------
let FILTER = 'all';
function gameCard(g) {
  const rec = getGameRec(g.id), best = rec.best.level;
  return h('a', { class: 'gcard' + (g.live ? '' : ' soon'), href: g.live ? `#/g/${g.id}` : null, role: g.live ? null : 'button', tabindex: 0,
    onclick: g.live ? null : () => soonSheet(g), onkeydown: g.live ? null : (e) => { if (e.key === 'Enter') soonSheet(g); } },
    posterEl(g),
    h('div', { class: 'gmeta' },
      h('span', { class: 'gcat', style: { '--c': catHue(g.cat) } }, CAT_SHORT[g.cat]),
      h('b', {}, g.title),
      g.live ? h('span', { class: 'gsub' }, rec.plays ? h('span', { class: 'stars' }, '★'.repeat(rec.stars || 0), h('i', {}, '★'.repeat(3 - (rec.stars || 0)))) : h('span', { class: 'newtag' }, 'NEW'), best ? ` Lv ${best}` : '') : h('span', { class: 'gsub' }, 'In development')),
    g.live ? null : h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒'));
}
function soonSheet(g) {
  const dlg = h('dialog', { class: 'sheet' }, h('h3', {}, g.title), h('p', { class: 'muted' }, CAT_SHORT[g.cat], ' · #', g.n), h('p', {}, h('b', {}, 'Concept: '), g.play), h('p', {}, h('b', {}, 'Trains: '), g.skill),
    h('p', { class: 'muted' }, 'Not built yet. It is in the catalogue and uses the same engine, so it can be added next.'), h('button', { class: 'btn', onclick: () => dlg.close() }, 'Close'));
  dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
}
function installBanner() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone, standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone || store.get('hideInstall', false)) return null;
  if (!deferredInstall && !ios) return null;
  return h('div', { class: 'install' }, h('div', {}, h('b', {}, 'Put it on your phone'), h('p', {}, ios ? 'Tap Share, then “Add to Home Screen”. No app store needed.' : 'Installs in a few seconds, works offline, no app store.')),
    deferredInstall ? h('button', { class: 'btn sm', onclick: async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); } }, 'Install') : null,
    h('button', { class: 'x', 'aria-label': 'Dismiss', onclick: () => { store.set('hideInstall', true); render(); } }, '×'));
}
const catsAll = () => [...new Set(GAMES.map((g) => g.cat))];
const missionsToday = () => getMissions(dateKey(), catsAll(), (c) => CAT_SHORT[c]);
function recommend(n = 4, exclude = []) {
  // Weakest area first: the category with the lowest share of stars earned, then games not yet played there.
  const cats = catsAll().map((c) => { const gs = live().filter((g) => g.cat === c); return { c, gs, share: gs.reduce((a, g) => a + (getGameRec(g.id).stars || 0), 0) / (3 * gs.length || 1) }; }).sort((x, y) => x.share - y.share);
  const out = [], r = new RNG('rec:' + dateKey());
  for (const { gs } of cats) { for (const g of r.shuffle(gs.filter((g) => !getGameRec(g.id).plays && !exclude.includes(g.id)))) { if (out.length < n) out.push(g); } if (out.length >= n) break; }
  if (out.length < n) live().filter((g) => !out.includes(g) && !exclude.includes(g.id)).sort((x, y) => (getGameRec(x.id).stars || 0) - (getGameRec(y.id).stars || 0)).slice(0, n - out.length).forEach((g) => out.push(g));
  return out;
}
const rowOf = (title, sub, games) => h('section', {}, h('h2', { class: 'sec' }, title, sub ? h('small', {}, sub) : null), h('div', { class: 'hrow' }, games.map(gameCard)));
function hub() {
  const p = getProfile(), today = dateKey(), picks = picksToday(), done = picks.map((id) => getGameRec(id).daily[today] != null), nDone = done.filter(Boolean).length;
  const newbie = p.totals.runs === 0, away = p.lastPlayed ? daysBetween(p.lastPlayed, today) : 0;
  const hero = newbie ? h('section', { class: 'hero-start' }, h('h1', {}, 'Train your brain, one quick game at a time'), h('p', {}, `${live().length} games that adapt to you. Start with today’s three-game workout: about five minutes.`), h('a', { class: 'btn big', href: `#/g/${picks[0]}?daily=1` }, '▶ Start my first workout'))
    : away >= 3 && p.comebackFor !== today ? h('div', { class: 'banner win' }, `👋 Welcome back! Your next run earns DOUBLE XP.${p.freezes ? '' : ''}`) : null;
  const dailyCard = h('section', { class: 'daily' },
    h('div', { class: 'dhead' }, h('div', {}, h('h2', {}, 'Today’s Workout'), h('p', { class: 'muted' }, nDone === 3 ? 'All done. Come back tomorrow for a new set.' : 'Three games, same puzzles for everyone today. +100 XP for all three.')),
      h('div', { class: 'ring', style: { '--p': nDone / 3 } }, h('span', {}, h('b', {}, nDone), '/3'))),
    h('div', { class: 'dgames' }, picks.map((id, i) => h('a', { class: 'dg' + (done[i] ? ' done' : ''), href: `#/g/${id}?daily=1` }, posterEl(BY_ID[id]), h('span', {}, BY_ID[id].title), done[i] ? h('i', { class: 'tick' }, '✓') : null))),
    nDone < 3 ? h('a', { class: 'btn', href: `#/g/${picks[done.indexOf(false)]}?daily=1` }, nDone ? 'Next daily game' : 'Start workout') : null);
  const m = missionsToday(), mDone = m.list.filter((x) => x.prog >= x.goal).length;
  const missions = h('section', { class: 'missions' }, h('div', { class: 'dhead' }, h('h2', {}, 'Daily missions'), h('span', { class: 'chest' + (m.done ? ' open' : '') }, m.done ? '🎁 Claimed +150' : `🎁 ${mDone}/3`)),
    m.list.map((x) => h('div', { class: 'mission' + (x.prog >= x.goal ? ' done' : '') }, h('span', {}, x.prog >= x.goal ? '✅ ' : '◻️ ', x.text), h('small', {}, `${Math.min(x.prog, x.goal)}/${x.goal} · +50 XP`), h('i', { class: 'mbar' }, h('u', { style: { width: (100 * Math.min(x.prog, x.goal)) / x.goal + '%' } })))));
  const recent = live().filter((g) => getGameRec(g.id).plays).sort((a, b) => (getGameRec(b.id).last || 0) - (getGameRec(a.id).last || 0)).slice(0, 6);
  const next = recommend(6, recent.map((g) => g.id));
  const cats = catsAll();
  const chip = (id, label) => h('button', { class: 'fchip' + (FILTER === id ? ' on' : ''), onclick: () => { FILTER = id; hub(); } }, label);
  const list = GAMES.filter((g) => FILTER === 'all' || g.cat === FILTER);
  frame(h('div', {}, installBanner(), hero, dailyCard, missions,
    recent.length ? rowOf('Jump back in', '', recent) : null,
    rowOf(newbie ? 'Good first games' : 'Try next', newbie ? '' : 'picked from your least-practised area', next),
    h('h2', { class: 'sec' }, 'All games ', h('small', {}, `${live().length} games · ★ ${totalStars(GAMES.map((g) => g.id))}/${GAMES.length * 3} stars`)),
    h('div', { class: 'filters', role: 'tablist' }, chip('all', 'All'), cats.map((c) => chip(c, CAT_SHORT[c]))),
    h('div', { class: 'grid' }, list.map(gameCard)),
    h('p', { class: 'foot' }, 'Your scores and progress are saved on this device. They are results from these games, not a measure of intelligence or “brain age”.')), 'play');
}

// ---------- game page ----------
function spark(vals, w = 120, hh = 32) {
  if (vals.length < 2) return h('span', { class: 'muted' }, '—');
  const mx = Math.max(...vals, 1), mn = Math.min(...vals, 0), pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${hh - 3 - ((v - mn) / (mx - mn || 1)) * (hh - 6)}`).join(' ');
  return h('svg', { viewBox: `0 0 ${w} ${hh}`, width: w, height: hh, 'aria-hidden': 'true', html: `<polyline points="${pts}" fill="none" stroke="hsl(var(--h) 90% 70%)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` });
}
async function loadGame(g) { const m = await LIVE[g.id](); return { ...m.default }; }
async function gamePage(meta, q) {
  if (!meta.live) { location.hash = '#/'; return; }
  const game = await loadGame(meta), rec = getGameRec(meta.id), p = getProfile();
  const daily = q.get('daily') === '1', seedQ = q.get('seed'), from = q.get('from'), target = +q.get('s') || 0, today = dateKey();
  const hist = rec.history.filter((x) => !x.u).slice(-10);
  const hasDaily = rec.daily[today] != null;
  frame(h('div', { class: 'gpage' },
    h('div', { class: 'bhero' }, posterEl(meta, 'banner'), h('a', { href: '#/', class: 'back' }, '← All games'), h('div', { class: 'bover' },
      h('span', { class: 'gcat', style: { '--c': catHue(meta.cat) } }, CAT_SHORT[meta.cat]), h('h1', {}, meta.title))),
    h('p', { class: 'lede' }, meta.play), h('p', { class: 'muted' }, h('b', {}, 'Trains: '), meta.skill),
    from ? h('div', { class: 'banner' }, `🎯 ${from} challenged you${target ? ` to beat ${fmt(target)} points` : ''}. Same puzzles, same start. Go!`) : null,
    daily ? h('div', { class: 'banner' }, hasDaily ? `Today’s run done: ${fmt(rec.daily[today])}. You can still beat it.` : '📅 Today’s seed: everyone gets the same puzzles.') : null,
    h('div', { class: 'actions' },
      h('button', { class: 'btn big', onclick: () => solo(game, meta, { daily, seed: seedQ, from, target }) }, daily ? '▶ Play today’s seed' : seedQ ? '▶ Accept challenge' : '▶ Play'),
      h('button', { class: 'btn ghost', onclick: () => duelSetup(game, meta) }, '⚔ 2-player duel'),
      !daily && !seedQ ? h('a', { class: 'btn ghost', href: `#/g/${meta.id}?daily=1` }, '📅 Daily seed') : null),
    h('section', { class: 'cols' },
      h('div', { class: 'panel' }, h('h3', {}, 'How to play'), h('ol', {}, game.how.map((t) => h('li', {}, t))),
        h('button', { class: 'link', onclick: () => solo(game, meta, { forcePractice: true }) }, 'Replay the practice round')),
      h('div', { class: 'panel' }, h('h3', {}, 'Your record ', h('span', { class: 'stars big' }, '★'.repeat(rec.stars || 0), h('i', {}, '★'.repeat(3 - (rec.stars || 0))))),
        h('p', { class: 'muted' }, (rec.stars || 0) < 3 ? `Reach level ${starThresholds(game.max)[rec.stars || 0]} for ${'★'.repeat((rec.stars || 0) + 1)}.` : 'All three stars earned. Chase your best score.'),
        rec.plays ? h('div', { class: 'stats' }, h('div', {}, h('b', {}, rec.best.level), h('small', {}, 'best level')), h('div', {}, h('b', {}, fmt(rec.best.score)), h('small', {}, 'best score')), h('div', {}, h('b', {}, rec.plays), h('small', {}, 'runs'))) : h('p', { class: 'muted' }, 'No runs yet. Your first run starts with a short practice round.'),
        hist.length > 1 ? h('div', { class: 'sparkrow' }, spark(hist.map((x) => x.level)), h('small', { class: 'muted' }, 'level reached, last runs')) : null))), 'play');
}

// ---------- running a game ----------
function sessionScreen(meta, label) {
  const stage = h('div', { class: 'stage' }), hud = h('div', { class: 'hud' }), overlay = h('div', { class: 'overlay', 'aria-live': 'polite' });
  root().replaceChildren(h('div', { class: 'session' },
    h('div', { class: 'stop' }, h('button', { class: 'x', 'aria-label': 'Quit this run', onclick: () => { SESSION.alive = false; location.hash = `#/g/${meta.id}`; } }, '✕'), h('b', {}, meta.title), label ? h('span', { class: 'ribbon' }, label) : null), hud, h('div', { class: 'stagewrap' }, stage, overlay)));
  return { stage, hud, overlay };
}
function makeHost(meta, ui, settings) {
  const sess = SESSION;
  let practiceRibbon = null;
  return {
    stage: ui.stage, settings, alive: () => sess.alive && SESSION === sess,
    toast,
    hud(s) {
      ui.hud.replaceChildren(h('span', { class: 'lv' }, 'Level ', h('b', {}, s.level)),
        h('span', { class: 'hearts', 'aria-label': `${3 - s.strikes} lives left` }, [0, 1, 2].map((i) => h('i', { class: i < 3 - s.strikes ? 'on' : '' }, '♥'))),
        h('span', { class: 'pts' }, fmt(s.score), s.streak > 1 ? h('em', {}, ' ×', Math.min(s.streak, 10)) : null),
        h('span', { class: 'cnt' }, `${s.trial}/${s.max}`));
    },
    setPractice(on) { practiceRibbon = on; ui.hud.replaceChildren(h('span', { class: 'ribbon wide' }, on ? 'Practice round · not scored' : '')); },
    async feedback(res, o) {
      const ok = !!res.correct;
      if (ok) { audio.ok(o.stats.streak); audio.buzz(12); } else { audio.bad(); audio.buzz(60); }
      const chip = h('div', { class: 'fb ' + (ok ? 'good' : 'bad') },
        h('b', {}, ok ? (o.practice ? 'Correct' : `+${fmt(o.gained)}`) : (res.timedOut ? 'Time' : 'Missed')),
        res.explain ? h('span', {}, res.explain) : null,
        !o.practice && o.change === 1 ? h('em', { class: 'up' }, `Level ${o.level} ▲`) : !o.practice && o.change === -1 ? h('em', { class: 'dn' }, `Level ${o.level} ▼`) : null);
      ui.overlay.replaceChildren(chip);
      if (!o.practice && o.change === 1) { audio.level(); const r = ui.stage.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 60, 22, settings.reduceMotion); }
      const wait = ok ? (o.practice ? 900 : 350) : (res.explain ? 1900 : 900);
      await new Promise((r) => { const t = setTimeout(r, wait), skip = () => { clearTimeout(t); r(); }; ui.overlay.addEventListener('click', skip, { once: true }); });
      ui.overlay.replaceChildren();
    },
    practiceDone() {
      return new Promise((resolve) => {
        ui.overlay.replaceChildren(h('div', { class: 'card center' }, h('h2', {}, 'Practice complete'), h('p', {}, 'Now it counts. Three misses end the run, and difficulty adapts to you.'), h('button', { class: 'btn big', onclick: () => { ui.overlay.replaceChildren(); resolve(); } }, 'Start')));
      });
    },
  };
}
async function execute(game, meta, o) {
  SESSION = { alive: true }; const sess = SESSION;
  const ui = sessionScreen(meta, o.label), settings = getProfile().settings;
  const host = makeHost(meta, ui, settings);
  const rec = getGameRec(meta.id);
  const fixed = o.daily || o.seed || o.fixedStart;
  const startLevel = fixed ? game.min : Math.max(game.min, Math.min(game.max, Math.round(rec.best.level * 0.55)));
  const practice = o.forcePractice || (!rec.seen && !o.skipPractice);
  let stats;
  const qaN = +QA.get('qa') || 0, qaLv = QA.get('lv');
  try { stats = await runSession(game, { seed: o.seed, startLevel: qaLv ? (qaLv === 'max' ? game.max : +qaLv) : startLevel, practice: qaLv ? false : practice, maxTrials: qaN || undefined }, host); }
  catch (e) { console.error(e); toast('Something went wrong in that game. Your progress is safe.'); location.hash = `#/g/${meta.id}`; return null; }
  if (!stats || sess !== SESSION || !sess.alive) return null;
  if (practice && !rec.seen) { rec.seen = true; store.set('g:' + meta.id, rec); }
  return { stats, settings };
}
async function solo(game, meta, o = {}) {
  const seed = o.seed || `${CONFIG.key}:${meta.id}:${o.daily ? dateKey() : Math.random().toString(36).slice(2, 9)}`;
  const out = await execute(game, meta, { ...o, seed, label: o.daily ? 'Daily' : o.from ? 'Challenge' : '' });
  if (!out) return;
  const { stats, settings } = out;
  const ids = picksToday(), res = recordRun(meta, stats, { daily: !!o.daily, picks: ids, allIds: live().map((g) => g.id), untimed: settings.untimed, max: game.max, cat: meta.cat, cats: catsAll(), catLabel: (c) => CAT_SHORT[c] });
  results(game, meta, stats, res, { seed, daily: o.daily, from: o.from, target: o.target, untimed: settings.untimed });
}

// ---------- results ----------
function countUp(el, to, ms = 900) {
  if (getProfile().settings.reduceMotion) { el.textContent = fmt(to); return; }
  const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
function challengeUrl(meta, seed, score) {
  const name = getProfile().name || 'A friend';
  return `${location.origin}${location.pathname}#/g/${meta.id}?seed=${encodeURIComponent(seed)}&from=${encodeURIComponent(name)}&s=${score}`;
}
async function share(text, url) {
  try { if (navigator.share) { await navigator.share({ text, url }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Link copied. Paste it to a friend.'); } catch { prompt('Copy this link', url); }
}
function results(game, meta, stats, res, o) {
  const p = getProfile(), lvl = playerLevel(p.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1), acc = stats.trials ? Math.round((100 * stats.correct) / stats.trials) : 0;
  const prev = res.rec.history.slice(-6, -1).filter((x) => !x.u);
  const recent = prev.length >= 3 ? prev.reduce((a, x) => a + x.level, 0) / prev.length : null;
  const sum = (game.summary ? game.summary(meta, stats) : '') || defaultSummary(meta, stats);
  const scoreEl = h('b', { class: 'big' }, '0');
  let versus = null;
  if (o.target) versus = h('div', { class: 'banner ' + (stats.score >= o.target ? 'win' : '') }, stats.score >= o.target ? `🏆 You beat ${o.from}: ${fmt(stats.score)} vs ${fmt(o.target)}` : `${o.from} still leads: ${fmt(o.target)} vs your ${fmt(stats.score)}. Rematch?`);
  frame(h('div', { class: 'results' },
    h('div', { class: 'rhead rb' }, posterEl(meta, 'banner'), h('div', { class: 'bover' }, h('span', { class: 'muted' }, o.daily ? 'Daily run' : 'Run complete'), h('h1', {}, meta.title), scoreEl, h('small', {}, 'points'),
      res.newBest ? h('span', { class: 'badge gold' }, '★ New personal best') : res.firstRun ? h('span', { class: 'badge' }, 'First run!') : null,
      stats.cleared ? h('span', { class: 'badge' }, 'Full clear +' + fmt(500 * stats.maxLevel)) : null)),
    versus,
    h('div', { class: 'tiles' },
      h('div', {}, h('b', {}, stats.maxLevel), h('small', {}, 'level reached')), h('div', {}, h('b', {}, acc + '%'), h('small', {}, 'correct')), h('div', {}, h('b', {}, stats.bestStreak), h('small', {}, 'best streak')),
      stats.rts.length ? h('div', {}, h('b', {}, (median(stats.rts) / 1000).toFixed(1) + 's'), h('small', {}, 'median time (correct)')) : null),
    h('div', { class: 'starrow' }, [0, 1, 2].map((i) => h('i', { class: 'bigstar' + (i < res.stars ? ' on' : '') + (i >= res.stars - res.newStars && i < res.stars ? ' new' : '') }, '★')),
      h('small', {}, res.newStars ? `+${res.newStars} new star${res.newStars > 1 ? 's' : ''}!` : res.stars < 3 ? `Reach level ${starThresholds(game.max)[res.stars]} for the next star` : 'Mastered')),
    nearMiss(stats, res, game) ? h('div', { class: 'banner' }, nearMiss(stats, res, game)) : null,
    h('p', { class: 'summary' }, sum),
    recent != null ? h('p', { class: 'muted' }, `Your recent runs averaged level ${recent.toFixed(1)}; this one reached ${stats.maxLevel}.`) : null,
    o.untimed ? h('p', { class: 'muted' }, 'Untimed mode: this run does not change your personal bests.') : null,
    stats.replayed ? h('p', { class: 'muted' }, `${stats.replayed} trial(s) were replayed because you switched away mid-trial.`) : null,
    h('div', { class: 'xp' }, h('div', { class: 'xrow' }, h('b', {}, `+${fmt(res.xp)} XP`), h('span', {}, `Lv ${lvl} · ${titleFor(lvl)}`)), h('i', { class: 'xpbar wide' }, h('u', { style: { width: Math.round(((p.xp - lo) / (hi - lo)) * 100) + '%' } })),
      res.levelUp ? h('p', { class: 'up' }, `Level up! You are now level ${res.levelUp}.${THEMES.find((t) => t.at === res.levelUp) ? ' New theme unlocked.' : ''}`) : null,
      res.dailyBonus ? h('p', { class: 'up' }, 'Daily Workout complete: +100 XP') : null,
      res.comeback ? h('p', { class: 'up' }, 'Welcome back: double XP on this run!') : null,
      res.missionsDone.map((x) => h('p', { class: 'up' }, `✅ Mission done: ${x.text} (+50 XP)`)),
      res.missionChest ? h('p', { class: 'up' }, '🎁 All three missions done: +150 XP') : null,
      res.freezeEarned ? h('p', { class: 'up' }, `❄ Streak freeze earned (${res.freezes}/2). It protects your streak if you miss one day.`) : null,
      res.freezeUsed ? h('p', { class: 'up' }, '❄ A streak freeze saved your streak!') : null),
    res.newAch.length ? h('div', { class: 'achs' }, res.newAch.map((a) => h('div', { class: 'ach on' }, h('b', {}, '🏅 ', a.title), h('small', {}, a.desc)))) : null,
    h('div', { class: 'actions' },
      h('button', { class: 'btn big', onclick: () => solo(game, meta, o.daily ? { daily: true } : {}) }, '↻ Play again'),
      h('button', { class: 'btn ghost', onclick: () => share(`I scored ${fmt(stats.score)} on ${meta.title} (level ${stats.maxLevel}). Beat me:`, challengeUrl(meta, o.seed, stats.score)) }, '🎯 Challenge a friend'),
      h('a', { class: 'btn ghost', href: '#/' }, 'All games')),
    upNext(meta, o)), 'play');
  countUp(scoreEl, stats.score);
  if (res.newBest || res.levelUp || res.newAch.length) { audio.win(); setTimeout(() => burst(innerWidth / 2, 180, 60, getProfile().settings.reduceMotion), 300); }
}

function nearMiss(stats, res, game) {
  if (res.newBest || res.firstRun || !res.prevBestScore) return '';
  const gap = res.prevBestScore - stats.score;
  if (gap > 0 && gap <= res.prevBestScore * 0.2) return `So close: only ${fmt(gap)} points short of your best (${fmt(res.prevBestScore)}). One more run?`;
  const t = starThresholds(game.max)[res.stars]; if (res.stars < 3 && t && t - stats.maxLevel === 1) return `One level away from your next star: reach level ${t}.`;
  return '';
}
function upNext(meta, o) {
  const today = dateKey(), picks = picksToday(), left = picks.filter((id) => getGameRec(id).daily[today] == null);
  const g = o.daily && left.length ? BY_ID[left[0]] : recommend(1, [meta.id])[0];
  if (!g) return null;
  return h('a', { class: 'upnext', href: `#/g/${g.id}${o.daily && left.length ? '?daily=1' : ''}` }, posterEl(g), h('div', {}, h('small', {}, o.daily && left.length ? 'Next in today’s workout' : 'Up next for you'), h('b', {}, g.title), h('span', {}, CAT_SHORT[g.cat])), h('span', { class: 'go' }, '▶'));
}

// ---------- two-player duel (same seed, pass the phone) ----------
function duelSetup(game, meta) {
  const p = getProfile(), a = h('input', { value: p.name, maxlength: 14, 'aria-label': 'Player 1 name' }), b = h('input', { value: p.settings.name2, maxlength: 14, 'aria-label': 'Player 2 name' });
  const dlg = h('dialog', { class: 'sheet' }, h('h3', {}, '⚔ 2-player duel'), h('p', { class: 'muted' }, 'Same puzzles for both. Play one after the other on this device, highest score wins.'),
    h('label', {}, 'Player 1', a), h('label', {}, 'Player 2', b),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { const pp = getProfile(); pp.name = a.value.trim() || 'Player 1'; pp.settings.name2 = b.value.trim() || 'Player 2'; saveProfile(pp); dlg.close(); duel(game, meta, [pp.name, pp.settings.name2]); } }, 'Start'), h('button', { class: 'btn ghost', onclick: () => dlg.close() }, 'Cancel')));
  dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
}
function handoff(name, meta) {
  return new Promise((resolve) => { root().replaceChildren(h('div', { class: 'session' }, h('div', { class: 'card center handoff' }, h('h2', {}, `Pass to ${name}`), h('p', {}, `${meta.title}: same puzzles, three misses end your turn.`), h('button', { class: 'btn big', onclick: resolve }, `${name}, I’m ready`)))); });
}
async function duel(game, meta, names) {
  const seed = `${CONFIG.key}:duel:${meta.id}:${Math.random().toString(36).slice(2, 8)}`, rs = [];
  for (let i = 0; i < 2; i++) {
    await handoff(names[i], meta);
    const out = await execute(game, meta, { seed, fixedStart: true, label: names[i], skipPractice: i === 1 });
    if (!out) return; rs.push(out.stats);
  }
  const p = getProfile(); p.totals.duels++; p.xp += 40;
  const ach = ACHIEVEMENTS.find((x) => x.id === 'duel'); if (!p.ach.duel && ach) p.ach.duel = Date.now(); saveProfile(p);
  const [s1, s2] = rs, w = s1.score === s2.score ? -1 : s1.score > s2.score ? 0 : 1;
  const col = (i) => h('div', { class: 'dcol' + (w === i ? ' win' : '') }, w === i ? h('span', { class: 'crown' }, '👑') : null, h('h3', {}, names[i]), h('b', { class: 'big' }, fmt(rs[i].score)), h('small', {}, `Level ${rs[i].maxLevel} · ${rs[i].correct}/${rs[i].trials} correct`));
  frame(h('div', { class: 'results' }, h('h1', {}, w < 0 ? 'A tie!' : `${names[w]} wins!`), h('div', { class: 'duelrow' }, col(0), col(1)),
    h('div', { class: 'actions' }, h('button', { class: 'btn big', onclick: () => duel(game, meta, names) }, '↻ Rematch'), h('a', { class: 'btn ghost', href: `#/g/${meta.id}` }, 'Back'))), 'play');
  audio.win(); burst(innerWidth / 2, 200, 70, getProfile().settings.reduceMotion);
}

// ---------- progress ----------
function progress() {
  const p = getProfile(), lvl = playerLevel(p.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1);
  const days = []; for (let i = 27; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dateKey(d); days.push([k, p.days[k]?.runs || 0]); }
  const played = live().map((g) => ({ g, rec: getGameRec(g.id) })).filter((x) => x.rec.plays > 0);
  const row = ({ g, rec }) => {
    const hs = rec.history.filter((x) => !x.u), lv = hs.map((x) => x.level);
    let delta = null;
    if (lv.length >= 6) { const early = lv.slice(0, 3).reduce((a, b) => a + b, 0) / 3, late = lv.slice(-3).reduce((a, b) => a + b, 0) / 3; delta = late - early; }
    return h('a', { class: 'prow', href: `#/g/${g.id}` }, posterEl(g), h('div', {}, h('b', {}, g.title), h('small', {}, `Best level ${rec.best.level} · ${rec.plays} run${rec.plays > 1 ? 's' : ''}`),
      delta != null ? h('small', { class: delta >= 0 ? 'up' : 'muted' }, `Last 3 runs avg level ${(lv.slice(-3).reduce((a, b) => a + b, 0) / 3).toFixed(1)} vs first 3: ${(lv.slice(0, 3).reduce((a, b) => a + b, 0) / 3).toFixed(1)}`) : null), spark(lv.slice(-12)));
  };
  frame(h('div', { class: 'prog' }, h('h1', {}, 'Your progress'),
    h('div', { class: 'tiles' }, h('div', {}, h('b', {}, `Lv ${lvl}`), h('small', {}, titleFor(lvl))), h('div', {}, h('b', {}, fmt(p.xp)), h('small', {}, `XP · ${fmt(hi - p.xp)} to next`)), h('div', {}, h('b', {}, p.streak.count), h('small', {}, `day streak · best ${p.bestStreak}${p.freezes ? ` · ❄${p.freezes}` : ''}`)), h('div', {}, h('b', {}, `★ ${totalStars(GAMES.map((g) => g.id))}`), h('small', {}, `of ${GAMES.length * 3} stars`)), h('div', {}, h('b', {}, fmt(p.totals.trials)), h('small', {}, 'trials played'))),
    h('h2', { class: 'sec' }, 'Skill map ', h('small', {}, 'share of mastery stars earned in each area')),
    h('div', { class: 'skillmap' }, catsAll().map((c) => { const gs = live().filter((g) => g.cat === c), st = gs.reduce((a, g) => a + (getGameRec(g.id).stars || 0), 0), pct = Math.round((100 * st) / (3 * gs.length));
      return h('a', { class: 'skill', href: '#/', onclick: () => { FILTER = c; } }, h('span', {}, CAT_SHORT[c]), h('i', { class: 'mbar', style: { '--c': catHue(c) } }, h('u', { style: { width: pct + '%' } })), h('small', {}, `${st}/${3 * gs.length} ★`)); })),
    h('h2', { class: 'sec' }, 'Last 4 weeks'), h('div', { class: 'heat' }, days.map(([k, n]) => h('i', { title: `${k}: ${n} run${n === 1 ? '' : 's'}`, class: 'd' + Math.min(4, n) }))),
    h('h2', { class: 'sec' }, 'Your games'), played.length ? h('div', { class: 'plist' }, played.map(row)) : h('p', { class: 'muted' }, 'Play a game and your results appear here.'),
    h('h2', { class: 'sec' }, 'Badges ', h('small', {}, `${Object.keys(p.ach).length}/${ACHIEVEMENTS.length}`)),
    h('div', { class: 'achs' }, ACHIEVEMENTS.map((a) => h('div', { class: 'ach' + (p.ach[a.id] ? ' on' : '') }, h('b', {}, (p.ach[a.id] ? '🏅 ' : '🔒 ') + a.title), h('small', {}, a.desc)))),
    h('p', { class: 'foot' }, 'These numbers describe how you did in these games on this device. They are not an IQ, a “brain age”, or evidence of improvement outside the games.')), 'progress');
}

// ---------- settings ----------
function settings() {
  const p = getProfile(), s = p.settings, lvl = playerLevel(p.xp);
  const sw = (key, label, desc) => h('label', { class: 'switch' }, h('span', {}, h('b', {}, label), desc ? h('small', {}, desc) : null), h('input', { type: 'checkbox', checked: s[key], onchange: (e) => { const pp = getProfile(); pp.settings[key] = e.target.checked; saveProfile(pp); applySettings(); } }), h('i'));
  const name = h('input', { value: p.name, maxlength: 14, 'aria-label': 'Your name', onchange: (e) => { const pp = getProfile(); pp.name = e.target.value.trim() || 'Player'; saveProfile(pp); } });
  const data = h('textarea', { rows: 3, placeholder: 'Paste a backup here to restore', 'aria-label': 'Backup data' });
  frame(h('div', { class: 'settings' }, h('h1', {}, 'Settings'),
    h('label', { class: 'field' }, 'Your name', name),
    sw('sound', 'Sound', 'Synthesised in the app. Nothing to download.'), sw('haptics', 'Vibration on phones'),
    sw('reduceMotion', 'Reduce motion', 'Fewer animations and no confetti.'), sw('untimed', 'Untimed mode', 'Turns off countdown timers. Runs then do not change personal bests.'),
    h('h3', {}, 'Themes'), h('div', { class: 'themes' }, THEMES.map((t) => h('button', { class: 'theme' + (s.theme === t.id ? ' on' : ''), disabled: lvl < t.at, style: { '--th': t.id === 'aurora' ? CONFIG.hue : t.hue }, onclick: () => { const pp = getProfile(); pp.settings.theme = t.id; saveProfile(pp); applySettings(); settings(); } }, t.name, lvl < t.at ? h('small', {}, `Lv ${t.at}`) : null))),
    h('h3', {}, 'On your phone'), h('p', { class: 'muted' }, 'This is a web app. Open this page in your phone’s browser, then use “Install” (Android/Chrome) or Share → Add to Home Screen (iPhone). It then opens full-screen and works offline.'),
    deferredInstall ? h('button', { class: 'btn', onclick: async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; settings(); } }, 'Install now') : null,
    h('h3', {}, 'Your data'), h('p', { class: 'muted' }, 'Everything is stored on this device only. Back it up if you may clear browser data.'),
    h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: async () => { const dump = JSON.stringify(Object.fromEntries(store.keys().map((k) => [k, store.get(k)]))); try { await navigator.clipboard.writeText(dump); toast('Backup copied to clipboard.'); } catch { data.value = dump; toast('Copy the text from the box.'); } } }, 'Copy backup'),
      h('button', { class: 'btn ghost', onclick: () => { try { const o = JSON.parse(data.value); if (!o || typeof o !== 'object' || !o.profile) throw 0; Object.entries(o).forEach(([k, v]) => store.set(k, v)); applySettings(); toast('Backup restored.'); settings(); } catch { toast('That does not look like a backup.'); } } }, 'Restore from box')),
    data,
    h('button', { class: 'btn danger', onclick: () => { if (confirm('Delete all progress on this device?')) { store.keys().forEach((k) => store.del(k)); applySettings(); toast('Progress deleted.'); location.hash = '#/'; render(); } } }, 'Delete all progress')), 'settings');
}

boot();
