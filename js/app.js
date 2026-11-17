import { $, h, slug, hashStr, dateKey, store, configureStore, getProfile, saveProfile, getGameRec, recordRun, runSession, dailyPicks, playerLevel, xpForLevel, titleFor, starThresholds, totalStars, getMissions, daysBetween, RNG,
  THEMES, ACHIEVEMENTS, audio, defaultSummary, median } from './engine.js';
import { CONFIG } from './config.js';
import { music, SOUND_STYLES } from './audio.js';
import { LIVE } from './games/index.js';
import { posterEl, CAT_SHORT, catHue, artManifest } from './art.js';
import { burst } from './kit.js';
import { track } from './track.js';
import { Room, cleanCode } from './online.js';

const fmt = (n) => Math.round(n).toLocaleString();
let GAMES = [], BY_ID = {}, SESSION = { alive: false }, deferredInstall = null;
const QA = new URLSearchParams(location.search); // test hook: ?qa=3&lv=max shortens runs for automated checks
if (QA.get('qa')) window.__QA = {};
const root = () => $('#app');

// ---------- boot ----------
async function boot() {
  configureStore(CONFIG.key);
  const cat = await (await fetch('js/catalog.json')).json();
  GAMES = cat.filter((g) => g.n >= CONFIG.range[0] && g.n <= CONFIG.range[1]).map((g) => ({ ...g, id: slug(g.title), live: !!LIVE[slug(g.title)] }));
  BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  music.setTracks(CONFIG.music || []);
  applySettings();
  const p0 = getProfile();
  track.init(QA.get('qa') ? false : p0.settings.analytics, () => { const p = getProfile(); return { player_level: playerLevel(p.xp), streak: p.streak.count, total_runs: p.totals.runs, theme: p.settings.theme, sound_on: !!p.settings.sound, music_on: p.settings.music !== false }; });
  track.event('app_open', { days_since_last: p0.lastPlayed ? daysBetween(p0.lastPlayed, dateKey()) : null, new_player: p0.totals.runs === 0, entry: location.hash.split('?')[0] || '#/' });
  try { const m = await artManifest(); if (m.sprites?.length) globalThis.__SPRITES = new Set(m.sprites); globalThis.__UI = new Set(m.ui || []); globalThis.__BADGES = new Set(m.badges || []); } catch {}
  const unlock = () => { audio.unlock(); music.start(); };
  addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });
  try { navigator.storage?.persist?.(); } catch {}
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; track.event('install_prompt_available'); if (location.hash === '' || location.hash === '#/') render(); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; track.event('app_installed'); toast('Installed. Find it on your home screen.'); });
  window.addEventListener('hashchange', () => { SESSION.alive = false; render(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  $('#splash')?.remove();
  if (!QA.get('qa')) setTimeout(consentBanner, 1500);
}
function applySettings() {
  const p = getProfile(), s = p.settings, t = THEMES.find((x) => x.id === s.theme) || THEMES[0];
  document.documentElement.style.setProperty('--h', t.id === 'aurora' ? CONFIG.hue : t.hue);
  document.documentElement.classList.toggle('reduce', !!s.reduceMotion);
  audio.on = s.sound; audio.haptics = s.haptics; audio.setStyle(s.soundStyle || 'glass');
  if (music.on !== (s.music !== false)) music.setOn(s.music !== false);
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
      h('a', { href: '#/', class: 'brand', 'aria-label': 'Home' }, h('span', { class: 'logo' }, h('img', { src: 'icons/icon-192.png', alt: '', width: 34, height: 34 })),
        h('span', { class: 'wm' }, h('b', {}, CONFIG.brand), h('small', {}, CONFIG.sub))),
      h('div', { class: 'chips' },
        h('span', { class: 'chip flame' + (streakLive ? '' : ' cold'), title: `Day streak${p.freezes ? ` · ${p.freezes} streak freeze${p.freezes > 1 ? 's' : ''}` : ''}` }, ic('flame', '🔥 '), streakLive ? p.streak.count : 0, p.freezes ? h('small', { class: 'frz' }, ' ', ic('freeze', '❄'), p.freezes) : null),
        h('a', { class: 'chip star', href: '#/progress', title: 'Mastery stars' }, ic('star', '★ '), totalStars(GAMES.map((g) => g.id)), h('small', {}, `/${GAMES.length * 3}`)),
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
  if (parts[0] !== 'online' && ON.room && !ON_ACTIVE.includes(ON.phase)) onLeave();
  track.screen(parts[0] || 'home');
  if (!parts.length) return hub();
  if (parts[0] === 'g' && BY_ID[parts[1]]) return gamePage(BY_ID[parts[1]], q);
  if (parts[0] === 'progress') return progress();
  if (parts[0] === 'settings') return settings();
  if (parts[0] === 'online') return onlineView(q);
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
      g.live ? h('span', { class: 'gsub' }, rec.plays ? starsEl(rec.stars || 0) : h('span', { class: 'newtag' }, 'NEW'), best ? ` Lv ${best}` : '', (rec.mastery || 0) >= 3 ? tierPill(rec.mastery) : null) : h('span', { class: 'gsub' }, 'In development')),
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
  const hero = newbie ? h('section', { class: 'hero-start' }, h('h1', {}, 'Quick puzzle games that adapt to you'), h('p', {}, `${live().length} games that adapt to you. Start with today’s three-game workout: about five minutes.`), h('a', { class: 'btn big', href: `#/g/${picks[0]}?daily=1` }, '▶ Start my first workout'))
    : away >= 3 && p.comebackFor !== today ? h('div', { class: 'banner win' }, `👋 Welcome back! Your next run earns DOUBLE XP.${p.freezes ? '' : ''}`) : null;
  const dailyCard = h('section', { class: 'daily' },
    h('div', { class: 'dhead' }, h('div', {}, h('h2', {}, 'Today’s Workout'), h('p', { class: 'muted' }, nDone === 3 ? 'All done. Come back tomorrow for a new set.' : 'Three games, same puzzles for everyone today. +100 XP for all three.')),
      h('div', { class: 'ring', style: { '--p': nDone / 3 } }, h('span', {}, h('b', {}, nDone), '/3'))),
    h('div', { class: 'dgames' }, picks.map((id, i) => h('a', { class: 'dg' + (done[i] ? ' done' : ''), href: `#/g/${id}?daily=1` }, posterEl(BY_ID[id]), h('span', {}, BY_ID[id].title), done[i] ? h('i', { class: 'tick' }, '✓') : null))),
    h('div', { class: 'actions' }, nDone < 3 ? h('a', { class: 'btn', href: `#/g/${picks[done.indexOf(false)]}?daily=1` }, nDone ? 'Next daily game' : 'Start workout') : h('button', { class: 'btn', onclick: shareWorkout }, '📣 Share today’s result'),
      h('button', { class: 'link', onclick: reminderSheet }, '⏰ Remind me daily')));
  const m = missionsToday(), mDone = m.list.filter((x) => x.prog >= x.goal).length;
  const missions = h('section', { class: 'missions' }, h('div', { class: 'dhead' }, h('h2', {}, 'Daily missions'), h('span', { class: 'mchest' + (m.done ? ' open' : '') }, ic('chest', '🎁 '), m.done ? ' Claimed +150' : ` ${mDone}/3`)),
    m.list.map((x) => h('div', { class: 'mission' + (x.prog >= x.goal ? ' done' : '') }, h('span', {}, x.prog >= x.goal ? '✅ ' : '◻️ ', x.text), h('small', {}, `${Math.min(x.prog, x.goal)}/${x.goal} · +50 XP`), h('i', { class: 'mbar' }, h('u', { style: { width: (100 * Math.min(x.prog, x.goal)) / x.goal + '%' } })))));
  const recent = live().filter((g) => getGameRec(g.id).plays).sort((a, b) => (getGameRec(b.id).last || 0) - (getGameRec(a.id).last || 0)).slice(0, 6);
  const next = recommend(6, recent.map((g) => g.id));
  const cats = catsAll();
  const chip = (id, label) => h('button', { class: 'fchip' + (FILTER === id ? ' on' : ''), onclick: () => { FILTER = id; hub(); } }, label);
  const list = GAMES.filter((g) => FILTER === 'all' || g.cat === FILTER);
  frame(h('div', {}, installBanner(), hero, recapCard(), dailyCard, missions, seasonCard(), onlineCard(),
    recent.length ? rowOf('Jump back in', '', recent) : null,
    rowOf(newbie ? 'Good first games' : 'Try next', newbie ? '' : 'picked from your least-practised area', next),
    h('h2', { class: 'sec' }, 'All games ', h('small', {}, `${live().length} games · `, ic('star', '★ '), ` ${totalStars(GAMES.map((g) => g.id))}/${GAMES.length * 3} stars`)),
    h('div', { class: 'filters', role: 'tablist' }, chip('all', 'All'), cats.map((c) => chip(c, CAT_SHORT[c]))),
    h('div', { class: 'grid' }, list.map(gameCard)),
    siblingLink(),
    h('p', { class: 'foot' }, 'Your scores and progress are saved on this device. They are results from these games, not a measure of intelligence or “brain age”.'), legalLinks()), 'play');
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
  track.event('game_view', { game: meta.id, cat: meta.cat, plays: rec.plays, daily, from_challenge: !!from });
  frame(h('div', { class: 'gpage' },
    h('div', { class: 'bhero' }, posterEl(meta, 'banner'), h('a', { href: '#/', class: 'back' }, '← All games'), h('div', { class: 'bover' },
      h('span', { class: 'gcat', style: { '--c': catHue(meta.cat) } }, CAT_SHORT[meta.cat]), h('h1', {}, meta.title))),
    h('p', { class: 'lede' }, meta.play), h('p', { class: 'muted' }, h('b', {}, 'Trains: '), meta.skill),
    from ? h('div', { class: 'banner' }, ic('missions', '🎯'), ` ${from} challenged you${target ? ` to beat ${fmt(target)} points` : ''}. Same puzzles, same start. Go!`) : null,
    daily ? h('div', { class: 'banner' }, hasDaily ? `Today’s run done: ${fmt(rec.daily[today])}. You can still beat it.` : [ic('daily', '📅'), ' Today’s seed: everyone gets the same puzzles.']) : null,
    h('div', { class: 'actions' },
      h('button', { class: 'btn big', onclick: () => solo(game, meta, { daily, seed: seedQ, from, target }) }, daily ? '▶ Play today’s seed' : seedQ ? '▶ Accept challenge' : '▶ Play'),
      h('a', { class: 'btn ghost', href: `#/online?g=${meta.id}` }, ic('duel', '⚔'), ' Play a friend online'),
      h('button', { class: 'btn ghost', onclick: () => duelSetup(game, meta) }, '👥 Pass & play'),
      !daily && !seedQ ? h('a', { class: 'btn ghost', href: `#/g/${meta.id}?daily=1` }, ic('daily', '📅'), ' Daily seed') : null),
    h('section', { class: 'cols' },
      h('div', { class: 'panel' }, h('h3', {}, 'How to play'), h('ol', {}, game.how.map((t) => h('li', {}, t))),
        h('button', { class: 'link', onclick: () => solo(game, meta, { forcePractice: true }) }, 'Replay the practice round')),
      h('div', { class: 'panel' }, h('h3', {}, 'Your record ', starsEl(rec.stars || 0, 'stars big')),
        h('p', { class: 'muted' }, (rec.stars || 0) < 3 ? `Reach level ${starThresholds(game.max)[rec.stars || 0]} for ${'★'.repeat((rec.stars || 0) + 1)}.` : 'All three stars earned. Chase your best score.'), masteryLine(meta.id, game.max),
        rec.plays ? h('div', { class: 'stats' }, h('div', {}, h('b', {}, rec.best.level), h('small', {}, 'best level')), h('div', {}, h('b', {}, fmt(rec.best.score)), h('small', {}, 'best score')), h('div', {}, h('b', {}, rec.plays), h('small', {}, 'runs'))) : h('p', { class: 'muted' }, 'No runs yet. Your first run starts with a short practice round.'),
        hist.length > 1 ? h('div', { class: 'sparkrow' }, spark(hist.map((x) => x.level)), h('small', { class: 'muted' }, 'level reached, last runs')) : null))), 'play');
}

// ---------- running a game ----------
function sessionScreen(meta, label) {
  const stage = h('div', { class: 'stage' }), hud = h('div', { class: 'hud' }), overlay = h('div', { class: 'overlay', 'aria-live': 'polite' });
  const mBtn = h('button', { class: 'x mus' + (music.on ? ' on' : ''), 'aria-label': 'Music on or off', title: 'Music', onclick: () => { const p = getProfile(); p.settings.music = !music.on; saveProfile(p); applySettings(); mBtn.classList.toggle('on', music.on); } }, '♪');
  const sess = h('div', { class: 'session', style: { '--h2': catHue(meta.cat) } },
    h('div', { class: 'stop' }, h('button', { class: 'x', 'aria-label': 'Quit this run', onclick: () => { SESSION.alive = false; location.hash = `#/g/${meta.id}`; } }, '✕'), h('b', {}, meta.title), label ? h('span', { class: 'ribbon' }, label) : null, mBtn), hud, h('div', { class: 'stagewrap' }, stage, overlay));
  root().replaceChildren(sess);
  const bgId = slug(CAT_SHORT[meta.cat] || ''); artManifest().then((m) => { if ((m.bg || []).includes(bgId)) sess.style.setProperty('--bgimg', `url("${new URL(`assets/bg/${bgId}.webp`, document.baseURI).href}")`); });
  return { stage, hud, overlay };
}
// ---------- art icons (fall back to emoji / text when an image is missing) ----------
function ic(name, fb = '') { return globalThis.__UI?.has(name) ? h('img', { class: 'uic', src: `assets/ui/${name}.webp`, alt: '', draggable: 'false' }) : fb; }
function starsEl(n, cls = 'stars') {
  if (!globalThis.__UI?.has('star')) return h('span', { class: cls }, '★'.repeat(n), h('i', {}, '★'.repeat(3 - n)));
  return h('span', { class: cls + ' img', 'aria-label': `${n} of 3 stars` }, [0, 1, 2].map((i) => h('img', { class: 'uic' + (i < n ? '' : ' off'), src: 'assets/ui/star.webp', alt: '' })));
}
function achCard(a, on) {
  const B = globalThis.__BADGES;
  if (!B?.has(a.id)) return h('div', { class: 'ach' + (on ? ' on' : '') }, h('b', {}, (on ? '🏅 ' : '🔒 ') + a.title), h('small', {}, a.desc));
  return h('div', { class: 'ach wimg' + (on ? ' on' : '') },
    h('span', { class: 'bwrap' }, h('img', { class: 'bdg', src: `assets/badges/${a.id}.webp`, alt: '', loading: 'lazy' }), !on && B.has('locked') ? h('img', { class: 'blk', src: 'assets/badges/locked.webp', alt: 'Locked' }) : null),
    h('div', {}, h('b', {}, a.title), h('small', {}, a.desc)));
}
function callout(text, cls = '') { const el = h('div', { class: 'callout ' + cls, role: 'status' }, text); document.body.append(el); setTimeout(() => el.remove(), 1500); }
function makeHost(meta, ui, settings, game) {
  const sess = SESSION;
  let practiceRibbon = null, starsNow = getGameRec(meta.id).stars || 0;
  const th = game ? starThresholds(game.max) : [99, 99, 99];
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
      const bigWin = ok && !o.practice && (res.rt || 0) > 8000;
      if (ok) { (bigWin ? audio.big() : audio.ok(o.stats.streak)); audio.buzz(bigWin ? [20, 40, 30] : 12); } else { audio.bad(); audio.buzz(60); }
      const r0 = ui.stage.getBoundingClientRect();
      if (bigWin) { music.duck(); callout(['Brilliant!', 'Nailed it!', 'Solved!', 'Masterful!'][o.stats.correct % 4], 'big'); burst(r0.left + r0.width / 2, r0.top + r0.height / 3, 46, settings.reduceMotion); }
      else if (ok && !o.practice && [3, 5, 10, 15, 20, 25].includes(o.stats.streak)) { setTimeout(() => audio.streak(), 120); callout([ic('flame', '🔥'), ` ${o.stats.streak} in a row!`], o.stats.streak >= 10 ? 'big' : ''); }
      if (!o.practice && o.change === 1 && !settings.untimed) { while (starsNow < 3 && o.level >= th[starsNow]) { starsNow++; const n = starsNow; setTimeout(() => { audio.star(); music.duck(); callout([...Array.from({ length: n }, () => ic('star', '★')), ` Star ${n} unlocked!`], 'star'); burst(innerWidth / 2, innerHeight / 3, 50, settings.reduceMotion); }, 450); } }
      const chip = h('div', { class: 'fb ' + (ok ? 'good' : 'bad') },
        h('b', {}, ok ? (o.practice ? 'Correct' : `+${fmt(o.gained)}`) : (res.timedOut ? 'Time' : 'Missed')),
        res.explain ? h('span', {}, res.explain) : null,
        !o.practice && o.change === 1 ? h('em', { class: 'up' }, `Level ${o.level} ▲`) : !o.practice && o.change === -1 ? h('em', { class: 'dn' }, `Level ${o.level} ▼`) : null);
      ui.overlay.replaceChildren(chip);
      if (!o.practice && o.change === 1) { audio.level(); const r = ui.stage.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 60, 22, settings.reduceMotion); }
      const wait = ok ? (o.practice ? 900 : bigWin ? 1100 : 380) : (res.explain ? 1900 : 900);
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
let CUR = null;
async function execute(game, meta, o) {
  SESSION = { alive: true }; const sess = SESSION;
  const ui = sessionScreen(meta, o.label), settings = o.online ? { ...getProfile().settings, untimed: false } : getProfile().settings;
  const host = makeHost(meta, ui, settings, game);
  const mode = o.online ? 'online' : o.duel ? 'duel' : o.daily ? 'daily' : o.from ? 'challenge' : 'solo';
  CUR = { game: meta.id, mode, trials: 0, t0: Date.now() };
  let lastHud = { max: 30 };
  const hud0 = host.hud; host.hud = (st) => { lastHud = st; hud0(st); };
  const pace = o.pace && o.pace.length > 3 ? h('div', { class: 'pace' }, 'Racing your best run') : null;
  if (pace) ui.hud.after(pace);
  if (o.online) { ON.bar = h('div', { class: 'oppbar' }); ui.hud.after(ON.bar); updateOppBar(); }
  const fb0 = host.feedback;
  host.feedback = async (res, x) => {
    if (!x.practice) {
      CUR.trials = x.stats.trials;
      track.event('trial', { game: meta.id, cat: meta.cat, mode, index: x.stats.trials, level: x.level, correct: !!res.correct, timed_out: !!res.timedOut, rt_ms: res.rt != null ? Math.round(res.rt) : null, streak: x.stats.streak, score: x.stats.score, level_change: x.change || 0 });
      if (pace) { const n = x.stats.trials, d = x.stats.score - o.pace[Math.min(n, o.pace.length) - 1];
        pace.className = 'pace ' + (n > o.pace.length || d >= 0 ? 'ahead' : 'behind');
        pace.textContent = n > o.pace.length ? `Past your best run · best was ${fmt(o.pace[o.pace.length - 1])}` : d >= 0 ? `▲ ${fmt(d)} ahead of your best` : `▼ ${fmt(-d)} behind your best`; }
      if (o.online) ON.room?.send('prog', { score: x.stats.score, level: x.level, strikes: x.stats.strikes, trial: x.stats.trials, max: lastHud.max });
    }
    return fb0(res, x);
  };
  audio.start();
  const rec = getGameRec(meta.id);
  const fixed = o.daily || o.seed || o.fixedStart;
  const startLevel = fixed ? game.min : Math.max(game.min, Math.min(game.max, Math.round(rec.best.level * 0.55)));
  const practice = o.forcePractice || (!rec.seen && !o.skipPractice);
  let stats;
  const qaN = +QA.get('qa') || 0, qaLv = QA.get('lv');
  track.event('run_start', { game: meta.id, cat: meta.cat, mode, start_level: startLevel, practice, plays_before: rec.plays });
  try { stats = await runSession(game, { seed: o.seed, startLevel: qaLv ? (qaLv === 'max' ? game.max : +qaLv) : startLevel, practice: qaLv ? false : practice, maxTrials: qaN || undefined }, host); }
  catch (e) { console.error(e); track.event('app_error', { message: String(e?.message || e).slice(0, 200), game: meta.id, kind: 'game' }); toast('Something went wrong in that game. Your progress is safe.'); location.hash = `#/g/${meta.id}`; return null; }
  if (!stats || sess !== SESSION || !sess.alive) { track.event('run_quit', { game: meta.id, mode, trials_done: CUR.trials, seconds: Math.round((Date.now() - CUR.t0) / 1000) }); return null; }
  if (practice && !rec.seen) { rec.seen = true; store.set('g:' + meta.id, rec); track.event('practice_complete', { game: meta.id }); }
  stats.seconds = Math.round((Date.now() - CUR.t0) / 1000);
  return { stats, settings };
}
async function solo(game, meta, o = {}) {
  const seed = o.seed || `${CONFIG.key}:${meta.id}:${o.daily ? dateKey() : Math.random().toString(36).slice(2, 9)}`;
  const out = await execute(game, meta, { ...o, seed, label: o.daily ? 'Daily' : o.from ? 'Challenge' : '', pace: o.daily || o.from ? null : getGameRec(meta.id).bestCurve });
  if (!out) return;
  const { stats, settings } = out;
  const ids = picksToday(), res = recordRun(meta, stats, { daily: !!o.daily, picks: ids, allIds: live().map((g) => g.id), untimed: settings.untimed, max: game.max, cat: meta.cat, cats: catsAll(), catLabel: (c) => CAT_SHORT[c] });
  const extra = afterRun(game, meta, stats, res, settings, o.daily ? 'daily' : o.from ? 'challenge' : 'solo');
  results(game, meta, stats, res, { seed, daily: o.daily, from: o.from, target: o.target, untimed: settings.untimed, ...extra });
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
async function share(text, url, what = 'challenge') {
  try { if (navigator.share) { await navigator.share({ text, url }); track.event('share', { what, method: 'native' }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); track.event('share', { what, method: 'clipboard' }); toast('Copied. Paste it to a friend.'); } catch { prompt('Copy this link', url); }
}
function results(game, meta, stats, res, o) {
  const p = getProfile(), lvl = playerLevel(p.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1), acc = stats.trials ? Math.round((100 * stats.correct) / stats.trials) : 0;
  const prev = res.rec.history.slice(-6, -1).filter((x) => !x.u);
  const recent = prev.length >= 3 ? prev.reduce((a, x) => a + x.level, 0) / prev.length : null;
  const sum = (game.summary ? game.summary(meta, stats) : '') || defaultSummary(meta, stats);
  const scoreEl = h('b', { class: 'big' }, '0');
  let versus = null;
  if (o.target) versus = h('div', { class: 'banner ' + (stats.score >= o.target ? 'win' : '') }, stats.score >= o.target ? [ic('trophy', '🏆'), ` You beat ${o.from}: ${fmt(stats.score)} vs ${fmt(o.target)}`] : `${o.from} still leads: ${fmt(o.target)} vs your ${fmt(stats.score)}. Rematch?`);
  frame(h('div', { class: 'results' },
    h('div', { class: 'rhead rb' }, posterEl(meta, 'banner'), h('div', { class: 'bover' }, h('span', { class: 'muted' }, o.daily ? 'Daily run' : 'Run complete'), h('h1', {}, meta.title), scoreEl, h('small', {}, 'points'),
      res.newBest ? h('span', { class: 'badge gold' }, ic('trophy', '★'), ' New personal best') : res.firstRun ? h('span', { class: 'badge' }, 'First run!') : null,
      stats.cleared ? h('span', { class: 'badge' }, 'Full clear +' + fmt(500 * stats.maxLevel)) : null)),
    versus,
    h('div', { class: 'tiles' },
      h('div', {}, h('b', {}, stats.maxLevel), h('small', {}, 'level reached')), h('div', {}, h('b', {}, acc + '%'), h('small', {}, 'correct')), h('div', {}, h('b', {}, stats.bestStreak), h('small', {}, 'best streak')),
      stats.rts.length ? h('div', {}, h('b', {}, (median(stats.rts) / 1000).toFixed(1) + 's'), h('small', {}, 'median time (correct)')) : null),
    h('div', { class: 'starrow' }, [0, 1, 2].map((i) => h('i', { class: 'bigstar' + (i < res.stars ? ' on' : '') + (i >= res.stars - res.newStars && i < res.stars ? ' new' : '') }, ic('star', '★'))),
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
      res.missionChest ? h('p', { class: 'up' }, ic('chest', '🎁'), ' All three missions done: +150 XP') : null,
      res.freezeEarned ? h('p', { class: 'up' }, ic('freeze', '❄'), ` Streak freeze earned (${res.freezes}/2). It protects your streak if you miss one day.`) : null,
      res.freezeUsed ? h('p', { class: 'up' }, ic('freeze', '❄'), ' A streak freeze saved your streak!') : null,
      o.tierUp ? h('p', { class: 'up' }, tierPill(o.mastery), ` ${o.tierUp} tier reached on this game!`) : null,
      o.seasonGem ? h('p', { class: 'up' }, o.seasonGem.done ? `Season complete! All ${o.seasonGem.total} gems: +300 XP` : `Season gem earned: ${o.seasonGem.got}/${o.seasonGem.total} this week`) : null),
    res.newAch.length ? h('div', { class: 'achs' }, res.newAch.map((a) => achCard(a, true))) : null,
    h('div', { class: 'actions' },
      h('button', { class: 'btn big', onclick: () => solo(game, meta, o.daily ? { daily: true } : {}) }, '↻ Play again'),
      h('button', { class: 'btn ghost', onclick: () => share(`I scored ${fmt(stats.score)} on ${meta.title} (level ${stats.maxLevel}). Beat me:`, challengeUrl(meta, o.seed, stats.score)) }, ic('missions', '🎯'), ' Challenge a friend'),
      res.dailyBonus ? h('button', { class: 'btn ghost', onclick: shareWorkout }, '📣 Share today’s result') : null,
      h('a', { class: 'btn ghost', href: '#/' }, 'All games')),
    upNext(meta, o)), 'play');
  countUp(scoreEl, stats.score);
  if (res.newStars) setTimeout(() => audio.star(), 500); else if (res.newAch.length) audio.badge(); else if (res.newBest || res.levelUp) audio.win();
  if (o.tierUp || o.seasonGem?.done) setTimeout(() => callout(o.tierUp ? `◆ ${o.tierUp} tier!` : 'Season complete!', 'star'), 700);
  if (res.newBest || res.levelUp || res.newAch.length || res.newStars) { music.duck(2000); setTimeout(() => burst(innerWidth / 2, 180, 60, getProfile().settings.reduceMotion), 300); }
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
  const dlg = h('dialog', { class: 'sheet' }, h('h3', {}, ic('duel', '⚔'), ' 2-player duel'), h('p', { class: 'muted' }, 'Same puzzles for both. Play one after the other on this device, highest score wins.'),
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
    const out = await execute(game, meta, { seed, fixedStart: true, label: names[i], skipPractice: i === 1, duel: true });
    if (!out) return; rs.push(out.stats);
  }
  const p = getProfile(); p.totals.duels++; p.xp += 40;
  const ach = ACHIEVEMENTS.find((x) => x.id === 'duel'); if (!p.ach.duel && ach) p.ach.duel = Date.now(); saveProfile(p);
  const [s1, s2] = rs, w = s1.score === s2.score ? -1 : s1.score > s2.score ? 0 : 1;
  track.event('duel_end', { game: meta.id, winner: w, score_1: s1.score, score_2: s2.score });
  const col = (i) => h('div', { class: 'dcol' + (w === i ? ' win' : '') }, w === i ? h('span', { class: 'crown' }, ic('trophy', '👑')) : null, h('h3', {}, names[i]), h('b', { class: 'big' }, fmt(rs[i].score)), h('small', {}, `Level ${rs[i].maxLevel} · ${rs[i].correct}/${rs[i].trials} correct`));
  frame(h('div', { class: 'results' }, h('h1', {}, w < 0 ? 'A tie!' : `${names[w]} wins!`), h('div', { class: 'duelrow' }, col(0), col(1)),
    h('div', { class: 'actions' }, h('button', { class: 'btn big', onclick: () => duel(game, meta, names) }, '↻ Rematch'), h('a', { class: 'btn ghost', href: `#/g/${meta.id}` }, 'Back'))), 'play');
  audio.win(); burst(innerWidth / 2, 200, 70, getProfile().settings.reduceMotion);
}

// ---------- come-back features ----------
const TIERS = [[50, 'Diamond'], [25, 'Gold'], [10, 'Silver'], [3, 'Bronze']];
const tierOf = (n) => (TIERS.find(([k]) => n >= k) || [0, ''])[1];
const nextTierAt = (n) => [...TIERS].reverse().find(([k]) => n < k) || null;
function tierPill(n) { const t = tierOf(n); return t ? h('span', { class: 'tier t-' + t.toLowerCase() }, '◆ ' + t) : null; }
function masteryOf(id, max) { const rec = getGameRec(id); if (rec.mastery != null) return rec.mastery; const t = starThresholds(max)[2]; return rec.history.filter((x) => !x.u && x.level >= t).length; }
function masteryAfterRun(id, max, stats, untimed) {
  const rec = getGameRec(id), t = starThresholds(max)[2];
  const before = rec.mastery ?? rec.history.slice(0, -1).filter((x) => !x.u && x.level >= t).length;
  const after = before + (!untimed && stats.trials && stats.maxLevel >= t ? 1 : 0);
  rec.mastery = after; store.set('g:' + id, rec); return { before, after };
}
function masteryLine(id, max) {
  const n = masteryOf(id, max), nx = nextTierAt(n);
  if (!n && (getGameRec(id).stars || 0) < 3) return null;
  return h('p', { class: 'muted' }, tierOf(n) ? [tierPill(n), ' '] : null, nx ? `${n}/${nx[0]} mastery runs (level ${starThresholds(max)[2]}+) for ${nx[1]}` : 'Diamond: the top tier.');
}
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function season() {
  const wk = weekKey(), ids = new RNG(`season:${CONFIG.key}:${wk}`).sample(live().map((g) => g.id), Math.min(6, live().length));
  const st = store.get('season:' + wk, null) || { gems: {}, done: false };
  const got = ids.reduce((a, id) => a + Math.min(3, st.gems[id] || 0), 0);
  return { wk, ids, st, got, total: ids.length * 3 };
}
function seasonAward(id) {
  const s = season();
  if (!s.ids.includes(id) || (s.st.gems[id] || 0) >= 3) return null;
  s.st.gems[id] = (s.st.gems[id] || 0) + 1;
  const got = s.got + 1, done = !s.st.done && got >= s.total;
  if (done) { s.st.done = true; const p = getProfile(); p.xp += 300; p.seasons = (p.seasons || 0) + 1; saveProfile(p); }
  store.set('season:' + s.wk, s.st);
  return { got, total: s.total, done };
}
function seasonCard() {
  const s = season(); if (!s.ids.length) return null;
  const daysLeft = 7 - ((new Date().getDay() + 6) % 7);
  const shapes = ['diamond', 'heart', 'star', 'hexagon', 'circle', 'triangle'], cols = ['purple', 'blue', 'teal', 'green', 'yellow', 'orange', 'pink', 'red'];
  const slots = [];
  s.ids.forEach((id, gi) => { const n = Math.min(3, s.st.gems[id] || 0); for (let k = 0; k < 3; k++) { const key = `${shapes[gi % shapes.length]}-${cols[(gi + k) % cols.length]}`;
    slots.push(globalThis.__SPRITES?.has(key) ? h('img', { class: 'sgem' + (k < n ? ' on' : ''), src: `assets/sprites/gem-${key}.webp`, alt: '' }) : h('i', { class: 'sgem txt' + (k < n ? ' on' : '') }, '◆')); } });
  return h('section', { class: 'season' },
    h('div', { class: 'dhead' }, h('div', {}, h('h2', {}, 'This week’s season'), h('p', { class: 'muted' }, s.st.done ? 'Complete! +300 XP earned. A new season starts Monday.' : `Play the ${s.ids.length} featured games to fill your bracelet, 3 gems each. ${daysLeft} day${daysLeft > 1 ? 's' : ''} left · +300 XP.`)),
      h('span', { class: 'chip' }, `${s.got}/${s.total}`)),
    h('div', { class: 'bracelet', 'aria-label': `${s.got} of ${s.total} gems` }, slots),
    h('div', { class: 'hrow' }, s.ids.map((id) => { const g = BY_ID[id], n = Math.min(3, s.st.gems[id] || 0); return h('a', { class: 'sg' + (n >= 3 ? ' done' : ''), href: `#/g/${id}` }, posterEl(g), h('span', {}, g.title), h('small', {}, `${n}/3 gems`)); })));
}
let RECAP_LOGGED = false;
function lastWeekRecap() {
  const p = getProfile(), wk = weekKey(); if (p.recapSeen === wk) return null;
  const dow = (new Date().getDay() + 6) % 7, keys = [];
  for (let i = dow + 1; i <= dow + 7; i++) { const x = new Date(); x.setDate(x.getDate() - i); keys.push(dateKey(x)); }
  const days = keys.filter((k) => p.days[k]?.runs); if (!days.length) return null;
  const runs = days.reduce((a, k) => a + p.days[k].runs, 0), xp = keys.reduce((a, k) => a + (p.days[k]?.xp || 0), 0), per = {};
  live().forEach((g) => getGameRec(g.id).history.forEach((x) => { if (keys.includes(x.date)) (per[g.id] ||= []).push(x); }));
  const top = Object.entries(per).sort((a, b) => b[1].length - a[1].length)[0];
  let imp = null; for (const [id, xs] of Object.entries(per)) if (xs.length >= 2) { const d = xs[xs.length - 1].level - xs[0].level; if (d > 0 && (!imp || d > imp[1])) imp = [id, d]; }
  return { wk, runs, days: days.length, xp, top: top ? BY_ID[top[0]] : null, topN: top ? top[1].length : 0, imp: imp ? [BY_ID[imp[0]], imp[1]] : null };
}
function recapCard() {
  const r = lastWeekRecap(); if (!r) return null;
  if (!RECAP_LOGGED) { RECAP_LOGGED = true; track.event('recap_shown', { runs: r.runs, days: r.days }); }
  return h('section', { class: 'recap' },
    h('div', { class: 'dhead' }, h('h2', {}, 'Your week in review'), h('button', { class: 'x', 'aria-label': 'Dismiss', onclick: () => { const p = getProfile(); p.recapSeen = r.wk; saveProfile(p); hub(); } }, '×')),
    h('div', { class: 'tiles' }, h('div', {}, h('b', {}, r.runs), h('small', {}, 'runs')), h('div', {}, h('b', {}, `${r.days}/7`), h('small', {}, 'days played')), h('div', {}, h('b', {}, fmt(r.xp)), h('small', {}, 'XP earned'))),
    r.top ? h('p', {}, 'Most played: ', h('a', { href: `#/g/${r.top.id}` }, r.top.title), ` (${r.topN} run${r.topN > 1 ? 's' : ''})`) : null,
    r.imp ? h('p', { class: 'up' }, `Biggest climb: ${r.imp[0].title}, up ${r.imp[1]} level${r.imp[1] > 1 ? 's' : ''} during the week.`) : null);
}
function shareWorkout() {
  const today = dateKey(), sq = CONFIG.key === 'bg2' ? '🟦' : '🟪', p = getProfile();
  const rows = picksToday().map((id) => { const last = getGameRec(id).history.filter((x) => x.date === today).slice(-1)[0], lv = last ? last.level : 0, n = lv ? Math.max(1, Math.min(5, Math.ceil((lv * 5) / 12))) : 0;
    return `${sq.repeat(n)}${'⬜'.repeat(5 - n)} ${BY_ID[id].title} · L${lv}`; });
  const label = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  share(`${CONFIG.brandName} Daily · ${label}\n${rows.join('\n')}\n🔥 ${p.streak.count}-day streak`, `${location.origin}${location.pathname}#/`, 'daily_result');
}
function reminderIcs(time) {
  const [hh, mm] = (time || '19:00').split(':').map(Number), d = new Date(); d.setHours(hh, mm, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0'), start = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hh)}${pad(mm)}00`, url = `${location.origin}${location.pathname}`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ALENZA CODES//Prismind//EN', 'BEGIN:VEVENT', `UID:prismind-${CONFIG.key}-${Date.now()}@prismind`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${start}`, 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
    `SUMMARY:${CONFIG.brandName}: today’s workout`, `DESCRIPTION:Three quick games. ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${CONFIG.brandName}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
function addReminder(time) {
  const a = h('a', { href: URL.createObjectURL(new Blob([reminderIcs(time)], { type: 'text/calendar' })), download: 'prismind-daily-reminder.ics' });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  track.event('reminder_added', { time }); toast('Open the downloaded file to add the reminder to your calendar.');
}
function reminderSheet() {
  const t = h('input', { type: 'time', value: getProfile().settings.reminder || '19:00', 'aria-label': 'Reminder time' });
  const dlg = h('dialog', { class: 'sheet' }, h('h3', {}, '⏰ Daily reminder'), h('p', { class: 'muted' }, 'Adds a repeating event to your phone’s calendar at the time you pick. Nothing is sent to us.'),
    h('label', {}, 'Time', t), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { const p = getProfile(); p.settings.reminder = t.value || '19:00'; saveProfile(p); addReminder(p.settings.reminder); dlg.close(); } }, 'Add to my calendar'), h('button', { class: 'btn ghost', onclick: () => dlg.close() }, 'Cancel')));
  dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
}
function afterRun(game, meta, stats, res, settings, mode) {
  const counted = !settings.untimed && stats.trials > 0;
  if (counted && (res.newBest || res.firstRun) && stats.curve?.length) { const r = getGameRec(meta.id); r.bestCurve = stats.curve; store.set('g:' + meta.id, r); }
  const m = masteryAfterRun(meta.id, game.max, stats, settings.untimed), tierUp = tierOf(m.after) !== tierOf(m.before) ? tierOf(m.after) : '';
  const seasonGem = counted ? seasonAward(meta.id) : null;
  track.event('run_end', { game: meta.id, cat: meta.cat, mode, score: stats.score, max_level: stats.maxLevel, start_level: stats.startLevel, trials: stats.trials, correct: stats.correct,
    accuracy: stats.trials ? +(stats.correct / stats.trials).toFixed(3) : 0, best_streak: stats.bestStreak, strikes: stats.strikes, cleared: !!stats.cleared, seconds: stats.seconds, replayed: stats.replayed,
    median_rt_ms: stats.rts.length ? Math.round(median(stats.rts)) : null, new_best: !!res.newBest, first_run: !!res.firstRun, stars: res.stars, new_stars: res.newStars, xp: res.xp, untimed: !!settings.untimed, mastery_runs: m.after });
  res.newAch.forEach((a) => track.event('badge_earned', { badge: a.id }));
  if (res.levelUp) track.event('player_level_up', { level: res.levelUp });
  res.missionsDone.forEach((x) => track.event('mission_complete', { mission: x.text }));
  if (res.missionChest) track.event('mission_chest');
  if (res.dailyBonus) track.event('daily_workout_complete');
  if (res.freezeEarned) track.event('streak_freeze_earned');
  if (res.freezeUsed) track.event('streak_freeze_used');
  if (res.comeback) track.event('comeback_bonus');
  if (res.newStars) track.event('stars_earned', { game: meta.id, stars: res.stars });
  if (tierUp) track.event('tier_up', { game: meta.id, tier: tierUp });
  if (seasonGem) track.event('season_gem', { got: seasonGem.got, total: seasonGem.total, done: seasonGem.done });
  return { tierUp, mastery: m.after, seasonGem };
}
function consentBanner() {
  if (getProfile().settings.analytics != null || document.querySelector('.consent')) return;
  const set = (v) => { const p = getProfile(); p.settings.analytics = v; saveProfile(p); track.setConsent(v); el.remove(); };
  const el = h('div', { class: 'consent', role: 'dialog', 'aria-label': 'Usage stats' },
    h('p', {}, h('b', {}, `Help make ${CONFIG.brandName} better. `), 'Allow anonymous usage stats: what you play, scores, timings, taps and device type. No ads, never sold. ', h('a', { href: 'privacy.html' }, 'Privacy Policy')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => set(true) }, 'Allow'), h('button', { class: 'btn ghost', onclick: () => set(false) }, 'No thanks')));
  document.body.append(el);
}
function legalLinks() {
  return h('p', { class: 'legal' }, h('a', { href: 'privacy.html' }, 'Privacy Policy'), ' · ', h('a', { href: 'terms.html' }, 'Terms of Use'), ` · © 2026 ${CONFIG.operator || 'ALENZA CODES'}`);
}
function siblingLink() {
  return CONFIG.sibling ? h('a', { class: 'olcard sib', href: CONFIG.sibling.url }, h('span', { class: 'olic' }, '◆'), h('div', {}, h('b', {}, `More ${CONFIG.brandName}: ${CONFIG.sibling.sub}`), h('small', {}, '100 more games in the companion app')), h('span', { class: 'go' }, '▶')) : null;
}

// ---------- live online 2-player ----------
const ON = { room: null, phase: 'idle', opp: '', gameId: '', game: null, seed: '', meReady: false, oppReady: false, oppProg: null, oppDone: null, myDone: null, myRes: null, oppQuit: false, bar: null, err: '', want: '', busy: '' };
const ON_ACTIVE = ['countdown', 'playing', 'waitdone'];
function rivalOf(name) { return (getProfile().rivals || {})[name] || { w: 0, l: 0, t: 0 }; }
function rivalLine(name) { const r = rivalOf(name); return r.w + r.l + r.t ? `Your record vs ${name}: ${r.w} win${r.w === 1 ? '' : 's'}, ${r.l} loss${r.l === 1 ? '' : 'es'}${r.t ? `, ${r.t} tie${r.t === 1 ? '' : 's'}` : ''}` : `First match vs ${name}`; }
function recordRival(o) { const p = getProfile(); p.rivals ||= {}; const r = (p.rivals[ON.opp || 'Friend'] ||= { w: 0, l: 0, t: 0 }); r[o]++; r.last = Date.now(); saveProfile(p); }
const inviteUrl = (code) => `${location.origin}${location.pathname}#/online?join=${code}`;
function netErr(e) {
  const m = String(e?.message || e);
  if (m === 'not-found') return `No room with that code. Check the code, and that you both opened ${CONFIG.brandName} · ${CONFIG.sub}.`;
  if (m === 'full') return 'That room already has two players.';
  if (m === 'browser-incompatible') return 'This browser can’t do live play. Try Chrome or Safari.';
  return 'Couldn’t reach the online service. Check your internet connection and try again.';
}
function resetMatch() { Object.assign(ON, { meReady: false, oppReady: false, oppProg: null, oppDone: null, myDone: null, myRes: null, oppQuit: false, seed: '' }); }
async function onLeave(quiet) {
  const r = ON.room; Object.assign(ON, { room: null, phase: 'idle', opp: '', gameId: '', game: null, busy: '' }); resetMatch();
  if (r) { if (!quiet) track.event('online_leave'); await r.close(); }
}
function onlineRefresh() { if (location.hash.startsWith('#/online') && !ON_ACTIVE.includes(ON.phase) && ON.phase !== 'results') onlineView(new URLSearchParams(location.hash.split('?')[1] || '')); }
function onBind(room) {
  ON.room = room;
  room.addEventListener('peer', (e) => {
    ON.opp = e.detail; ON.phase = 'paired'; ON.err = ''; track.event('online_paired', { role: room.role }); audio.level();
    if (room.role === 'host' && ON.want && BY_ID[ON.want]) sendPick(ON.want); else onlineRefresh();
  });
  room.addEventListener('lost', (e) => {
    track.event('online_disconnect', { reason: e.detail, phase: ON.phase });
    if (ON.room !== room) return;
    ON.room = null;
    if (ON.phase === 'playing' || ON.phase === 'countdown') { ON.oppQuit = true; updateOppBar(); return; }
    if (ON.phase === 'waitdone') { ON.oppQuit = true; finishOnline(); return; }
    if (ON.phase === 'results') return;
    ON.phase = 'idle'; ON.err = `${ON.opp || 'Your friend'} left the room.`; ON.opp = ''; onlineRefresh();
  });
  room.listen(onMsg);
}
function onMsg(d) {
  if (d.t === 'pick' && BY_ID[d.id]) { resetMatch(); Object.assign(ON, { gameId: d.id, game: null, phase: 'picked' }); preloadOnlineGame(); return onlineRefresh(); }
  if (d.t === 'unpick') { resetMatch(); ON.phase = 'paired'; return onlineRefresh(); }
  if (d.t === 'ready') { ON.oppReady = true; if (ON.room?.role === 'host' && ON.meReady && ON.phase === 'picked') return hostGo(); return onlineRefresh(); }
  if (d.t === 'go' && ON.phase === 'picked') { ON.seed = String(d.seed); return startMatch(); }
  if (d.t === 'prog') { ON.oppProg = d; return updateOppBar(); }
  if (d.t === 'done') { ON.oppDone = d; updateOppBar(); if (ON.phase === 'waitdone') finishOnline(); return; }
  if (d.t === 'quit') { ON.oppQuit = true; updateOppBar(); if (ON.phase === 'waitdone') finishOnline(); return; }
  if (d.t === 'again' && ON.room?.role === 'host' && ON.gameId) sendPick(ON.gameId);
}
function preloadOnlineGame() { const id = ON.gameId; loadGame(BY_ID[id]).then((g) => { if (ON.gameId === id && !ON.game) { ON.game = g; onlineRefresh(); } }).catch(() => {}); }
function sendPick(id) { resetMatch(); Object.assign(ON, { gameId: id, game: null, phase: 'picked' }); ON.room?.send('pick', { id }); track.event('online_pick', { game: id }); preloadOnlineGame(); onlineRefresh(); }
function hostGo() { ON.seed = `${CONFIG.key}:online:${ON.gameId}:${Math.random().toString(36).slice(2, 9)}`; ON.room?.send('go', { seed: ON.seed }); startMatch(); }
function markReady() { ON.meReady = true; ON.room?.send('ready'); track.event('online_ready'); if (ON.room?.role === 'host' && ON.oppReady) return hostGo(); onlineRefresh(); }
function countdown(meta) {
  const num = h('b', { class: 'cd' }, '3');
  root().replaceChildren(h('div', { class: 'session' }, h('div', { class: 'card center handoff' }, h('small', { class: 'muted' }, meta.title), num, h('p', {}, `vs ${ON.opp}`))));
  return new Promise((resolve) => { let n = 3; audio.tap?.(); const t = setInterval(() => { n--; if (n <= 0) { clearInterval(t); resolve(); return; } num.textContent = n; audio.tap?.(); }, 800); });
}
async function startMatch() {
  ON.oppProg = null; ON.oppDone = null; ON.myDone = null; ON.myRes = null; ON.oppQuit = false; ON.phase = 'countdown';
  const meta = BY_ID[ON.gameId], game = ON.game || await loadGame(meta);
  track.event('online_match_start', { game: meta.id, role: ON.room?.role || 'gone' });
  await countdown(meta);
  if (ON.phase !== 'countdown') return;
  ON.phase = 'playing';
  const out = await execute(game, meta, { seed: ON.seed, fixedStart: true, skipPractice: true, label: 'vs ' + ON.opp, online: true });
  ON.bar = null;
  if (!out) {
    ON.room?.send('quit'); track.event('online_quit', { game: meta.id }); recordRival('l');
    await onLeave(true); ON.err = 'You left the match, so it counts as a loss.'; location.hash = '#/online'; onlineRefresh(); return;
  }
  const { stats, settings } = out;
  ON.myDone = { score: stats.score, maxLevel: stats.maxLevel, trials: stats.trials, correct: stats.correct, strikes: stats.strikes, cleared: !!stats.cleared };
  ON.room?.send('done', ON.myDone);
  const res = recordRun(meta, stats, { picks: picksToday(), allIds: live().map((g) => g.id), untimed: false, max: game.max, cat: meta.cat, cats: catsAll(), catLabel: (c) => CAT_SHORT[c] });
  ON.myRes = { res, extra: afterRun(game, meta, stats, res, settings, 'online'), meta };
  if (ON.oppDone || ON.oppQuit || !ON.room) return finishOnline();
  ON.phase = 'waitdone';
  ON.bar = h('div', { class: 'oppbar' });
  root().replaceChildren(h('div', { class: 'session' }, h('div', { class: 'card center handoff' }, h('h2', {}, `You scored ${fmt(ON.myDone.score)}`), h('p', {}, `Waiting for ${ON.opp} to finish…`), ON.bar,
    h('button', { class: 'link', onclick: () => { onLeave(); location.hash = '#/'; } }, 'Leave'))));
  updateOppBar();
}
function updateOppBar() {
  if (!ON.bar) return; const d = ON.oppProg;
  const parts = ON.oppDone ? [h('span', {}, `finished · ${fmt(ON.oppDone.score)}`)]
    : ON.oppQuit ? [h('span', { class: 'gone' }, 'left the match')]
      : d ? [h('span', {}, fmt(d.score)), h('span', {}, `Lv ${d.level}`), h('span', { class: 'hrt' }, '♥'.repeat(Math.max(0, 3 - d.strikes))), h('span', {}, `${d.trial}/${d.max}`)]
        : [h('span', {}, 'starting…')];
  ON.bar.replaceChildren(h('b', {}, ON.opp || 'Friend'), ...parts);
}
function finishOnline() {
  if (ON.phase === 'results' || !ON.myDone) return; ON.phase = 'results';
  const me = ON.myDone, op = ON.oppDone, forfeit = !op, outcome = forfeit ? 'w' : me.score > op.score ? 'w' : me.score < op.score ? 'l' : 't';
  recordRival(outcome);
  const p = getProfile(); p.totals.duels = (p.totals.duels || 0) + 1; p.xp += outcome === 'w' ? 60 : 40; if (!p.ach.duel && ACHIEVEMENTS.some((x) => x.id === 'duel')) p.ach.duel = Date.now(); saveProfile(p);
  track.event('online_match_end', { game: ON.gameId, outcome, forfeit, my_score: me.score, opp_score: op ? op.score : null });
  const R = ON.myRes;
  const col = (who, d, win) => h('div', { class: 'dcol' + (win ? ' win' : '') }, win ? h('span', { class: 'crown' }, ic('trophy', '👑')) : null, h('h3', {}, who), h('b', { class: 'big' }, d ? fmt(d.score) : '—'), h('small', {}, d ? `Level ${d.maxLevel} · ${d.correct}/${d.trials} correct` : 'left the match'));
  frame(h('div', { class: 'results' }, h('span', { class: 'muted' }, `Online match · ${R.meta.title}`),
    h('h1', {}, forfeit ? `${ON.opp} left. You win!` : outcome === 'w' ? 'You win!' : outcome === 'l' ? `${ON.opp} wins!` : 'A tie!'),
    h('div', { class: 'duelrow' }, col(getProfile().name || 'You', me, outcome === 'w'), col(ON.opp, op, outcome === 'l')),
    h('p', { class: 'muted center' }, rivalLine(ON.opp)),
    h('div', { class: 'xp' }, h('b', {}, `+${fmt(R.res.xp + (outcome === 'w' ? 60 : 40))} XP`),
      R.res.newBest ? h('p', { class: 'up' }, 'New personal best on this game!') : null,
      R.res.newStars ? h('p', { class: 'up' }, `+${R.res.newStars} star${R.res.newStars > 1 ? 's' : ''}`) : null,
      R.extra.seasonGem ? h('p', { class: 'up' }, `Season gem: ${R.extra.seasonGem.got}/${R.extra.seasonGem.total}`) : null),
    h('div', { class: 'actions' },
      h('button', { class: 'btn big', 'data-qa': 'rematch', onclick: () => { if (!ON.room) { toast(`${ON.opp} has left the room.`); return; } track.event('online_rematch'); if (ON.room.role === 'host') sendPick(ON.gameId); else { ON.room.send('again'); toast(`Asked ${ON.opp} for a rematch…`); } } }, '↻ Rematch'),
      ON.room?.role === 'host' ? h('button', { class: 'btn ghost', onclick: () => { resetMatch(); ON.phase = 'paired'; ON.room?.send('unpick'); onlineRefresh(); } }, 'Pick another game') : null,
      h('button', { class: 'btn ghost', onclick: () => { onLeave(); location.hash = '#/'; } }, 'Leave room'))), 'play');
  if (outcome === 'w') { audio.win(); burst(innerWidth / 2, 200, 70, getProfile().settings.reduceMotion); }
}
async function onCreate(name) {
  ON.busy = 'Opening a room…'; ON.err = ''; onlineRefresh();
  try { const room = await Room.create(name); ON.busy = ''; onBind(room); ON.phase = 'waiting'; track.event('online_room_create', { with_game: !!ON.want }); }
  catch (e) { ON.busy = ''; ON.err = netErr(e); track.event('online_error', { step: 'create', reason: String(e.message || e) }); }
  onlineRefresh();
}
async function onJoin(code, name) {
  ON.busy = `Joining room ${code}…`; ON.err = ''; onlineRefresh();
  try { const room = await Room.join(code, name); ON.busy = ''; onBind(room); ON.opp = room.oppName; ON.phase = 'paired'; track.event('online_join'); }
  catch (e) { ON.busy = ''; ON.err = netErr(e); track.event('online_error', { step: 'join', reason: String(e.message || e) }); }
  onlineRefresh();
}
function onlineCard() {
  return h('a', { class: 'olcard', href: '#/online' }, h('span', { class: 'olic' }, ic('duel', '⚔')), h('div', {}, h('b', {}, 'Play a friend online'), h('small', {}, 'Same puzzles, live, on two phones')), h('span', { class: 'go' }, '▶'));
}
function onlineView(q) {
  if (ON_ACTIVE.includes(ON.phase)) return;
  if (ON.phase === 'results') ON.phase = ON.room ? 'paired' : 'idle';
  if (q.get('g') && BY_ID[q.get('g')] && !ON.room) ON.want = q.get('g');
  const p = getProfile(), me = p.name && p.name !== 'Player' ? p.name : '';
  const leave = h('button', { class: 'link', onclick: () => { onLeave().then(onlineRefresh); } }, 'Leave room');
  const vs = () => h('div', { class: 'vs' }, h('b', {}, getProfile().name || 'You'), h('i', {}, 'vs'), h('b', {}, ON.opp));
  let body;
  if (ON.busy) body = h('div', { class: 'panel center' }, h('div', { class: 'spin' }), h('p', {}, ON.busy));
  else if (!ON.room) {
    const name = h('input', { value: me, maxlength: 14, placeholder: 'Your name', 'aria-label': 'Your name', name: 'olname' });
    const code = h('input', { value: cleanCode(q.get('join')), maxlength: 5, placeholder: 'CODE', class: 'codein', 'aria-label': 'Room code', autocapitalize: 'characters', autocomplete: 'off', name: 'olcode', oninput: (e) => { e.target.value = cleanCode(e.target.value); } });
    const nm = () => { const n = name.value.trim().slice(0, 14) || 'Player'; const pp = getProfile(); pp.name = n; saveProfile(pp); return n; };
    body = h('div', { class: 'olbox' },
      h('label', { class: 'field' }, 'Your name (your friend sees it)', name),
      h('div', { class: 'panel' }, h('h3', {}, 'Start a room'), h('p', { class: 'muted' }, ON.want ? `You’ll play ${BY_ID[ON.want].title}. You get a 5-letter code to send to a friend.` : 'You get a 5-letter code to send to a friend, then pick the game.'),
        h('button', { class: 'btn big', 'data-qa': 'create', onclick: () => onCreate(nm()) }, 'Create a room')),
      h('div', { class: 'panel' }, h('h3', {}, 'Join a room'), h('div', { class: 'joinrow' }, code, h('button', { class: 'btn', 'data-qa': 'join', onclick: () => (code.value.length === 5 ? onJoin(code.value, nm()) : toast('Enter the 5-letter code.')) }, 'Join'))));
  } else if (!ON.opp) {
    body = h('div', { class: 'panel center' }, h('p', { class: 'muted' }, 'Your room code'), h('div', { class: 'bigcode', 'data-code': ON.room.code }, ON.room.code),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => share(`Play ${ON.want && BY_ID[ON.want] ? BY_ID[ON.want].title : CONFIG.brandName} with me live! Room code ${ON.room.code}:`, inviteUrl(ON.room.code), 'online_invite') }, 'Send invite link'),
        h('button', { class: 'btn ghost', onclick: async () => { try { await navigator.clipboard.writeText(ON.room.code); toast('Code copied.'); } catch { toast(ON.room.code); } } }, 'Copy code')),
      h('p', { class: 'muted' }, h('span', { class: 'dot' }), ' Waiting for a friend to join…'), leave);
  } else if (ON.phase === 'picked' && BY_ID[ON.gameId]) {
    const meta = BY_ID[ON.gameId], g = ON.game;
    body = h('div', {}, vs(),
      h('div', { class: 'bhero' }, posterEl(meta, 'banner'), h('div', { class: 'bover' }, h('span', { class: 'gcat', style: { '--c': catHue(meta.cat) } }, CAT_SHORT[meta.cat]), h('h1', {}, meta.title))),
      h('p', { class: 'lede' }, meta.play),
      g ? h('div', { class: 'panel' }, h('h3', {}, 'How to play'), h('ol', {}, g.how.map((t) => h('li', {}, t)))) : null,
      h('div', { class: 'readyrow' }, h('div', { class: 'rd' + (ON.meReady ? ' on' : '') }, h('b', {}, 'You'), h('span', {}, ON.meReady ? 'Ready ✓' : 'Not ready')),
        h('div', { class: 'rd' + (ON.oppReady ? ' on' : '') }, h('b', {}, ON.opp), h('span', {}, ON.oppReady ? 'Ready ✓' : 'Not ready'))),
      h('div', { class: 'actions' }, ON.meReady ? h('p', { class: 'muted' }, `Starts when ${ON.opp} is ready…`) : h('button', { class: 'btn big', 'data-qa': 'ready', onclick: markReady }, 'I’m ready'),
        ON.room.role === 'host' ? h('button', { class: 'btn ghost', onclick: () => { resetMatch(); ON.phase = 'paired'; ON.room.send('unpick'); onlineRefresh(); } }, 'Change game') : null), leave);
  } else if (ON.room.role === 'host') {
    const games = live().slice().sort((a, b) => (getGameRec(b.id).last || 0) - (getGameRec(a.id).last || 0) || a.title.localeCompare(b.title));
    const grid = h('div', { class: 'pickgrid' });
    const fill = (s) => grid.replaceChildren(...games.filter((g) => !s || g.title.toLowerCase().includes(s)).map((g) => h('button', { class: 'pick', 'data-id': g.id, onclick: () => sendPick(g.id) }, posterEl(g), h('span', {}, g.title))));
    fill('');
    body = h('div', {}, vs(), h('p', { class: 'muted center' }, rivalLine(ON.opp)), h('h2', { class: 'sec' }, 'Pick a game'),
      h('div', { class: 'pickbar' }, h('input', { placeholder: 'Search games', 'aria-label': 'Search games', oninput: (e) => fill(e.target.value.trim().toLowerCase()) }),
        h('button', { class: 'btn', onclick: () => sendPick(games[Math.floor(Math.random() * games.length)].id) }, '🎲 Surprise me')), grid, leave);
  } else {
    body = h('div', {}, vs(), h('p', { class: 'muted center' }, rivalLine(ON.opp)), h('div', { class: 'panel center' }, h('div', { class: 'spin' }), h('p', {}, `${ON.opp} is picking a game…`)), leave);
  }
  frame(h('div', { class: 'online' },
    h('div', { class: 'olhead' }, h('h1', {}, ic('duel', '⚔'), ' Play a friend online'), h('p', { class: 'muted' }, `Same puzzles at the same time on two phones. Highest score wins. You both need ${CONFIG.brandName} · ${CONFIG.sub}.`)),
    ON.err ? h('div', { class: 'banner' }, ON.err) : null, body,
    h('p', { class: 'foot' }, 'Your devices connect directly to each other. ', h('a', { href: 'privacy.html#online' }, 'How online play works'))), 'play');
  ON.err = '';
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
      return h('a', { class: 'skill', href: '#/', onclick: () => { FILTER = c; } }, h('span', {}, CAT_SHORT[c]), h('i', { class: 'mbar', style: { '--c': catHue(c) } }, h('u', { style: { width: pct + '%' } })), h('small', {}, `${st}/${3 * gs.length} `, ic('star', '★'))); })),
    h('h2', { class: 'sec' }, 'Last 4 weeks'), h('div', { class: 'heat' }, days.map(([k, n]) => h('i', { title: `${k}: ${n} run${n === 1 ? '' : 's'}`, class: 'd' + Math.min(4, n) }))),
    h('h2', { class: 'sec' }, 'Your games'), played.length ? h('div', { class: 'plist' }, played.map(row)) : h('p', { class: 'muted' }, 'Play a game and your results appear here.'),
    h('h2', { class: 'sec' }, 'Badges ', h('small', {}, `${Object.keys(p.ach).length}/${ACHIEVEMENTS.length}`)),
    h('div', { class: 'achs' }, ACHIEVEMENTS.map((a) => achCard(a, !!p.ach[a.id]))),
    h('p', { class: 'foot' }, 'These numbers describe how you did in these games on this device. They are not an IQ, a “brain age”, or evidence of improvement outside the games.')), 'progress');
}

// ---------- settings ----------
function settings() {
  const p = getProfile(), s = p.settings, lvl = playerLevel(p.xp);
  const sw = (key, label, desc) => h('label', { class: 'switch' }, h('span', {}, h('b', {}, label), desc ? h('small', {}, desc) : null), h('input', { type: 'checkbox', checked: s[key], onchange: (e) => { const pp = getProfile(); pp.settings[key] = e.target.checked; saveProfile(pp); applySettings(); track.event('setting_change', { key, value: e.target.checked }); } }), h('i'));
  const name = h('input', { value: p.name, maxlength: 14, 'aria-label': 'Your name', onchange: (e) => { const pp = getProfile(); pp.name = e.target.value.trim() || 'Player'; saveProfile(pp); } });
  const data = h('textarea', { rows: 3, placeholder: 'Paste a backup here to restore', 'aria-label': 'Backup data' });
  const remT = h('input', { type: 'time', value: s.reminder || '19:00', 'aria-label': 'Reminder time' }), anon = track.id();
  frame(h('div', { class: 'settings' }, h('h1', {}, 'Settings'),
    h('label', { class: 'field' }, 'Your name', name),
    sw('sound', 'Sound effects'), sw('music', 'Music', 'Calm background tracks (CC0).'), sw('haptics', 'Vibration on phones'),
    h('h3', {}, 'Sound style'), h('div', { class: 'themes' }, SOUND_STYLES.map((st) => h('button', { class: 'theme' + ((s.soundStyle || 'glass') === st.id ? ' on' : ''), style: { '--th': 200 }, onclick: () => { const pp = getProfile(); pp.settings.soundStyle = st.id; saveProfile(pp); applySettings(); audio.unlock(); setTimeout(() => { audio.ok(); setTimeout(() => audio.level(), 450); }, 250); settings(); } }, st.name, h('small', {}, st.desc)))),
    sw('reduceMotion', 'Reduce motion', 'Fewer animations and no confetti.'), sw('untimed', 'Untimed mode', 'Turns off countdown timers. Runs then do not change personal bests.'),
    h('h3', {}, 'Themes'), h('div', { class: 'themes' }, THEMES.map((t) => h('button', { class: 'theme' + (s.theme === t.id ? ' on' : ''), disabled: lvl < t.at, style: { '--th': t.id === 'aurora' ? CONFIG.hue : t.hue }, onclick: () => { const pp = getProfile(); pp.settings.theme = t.id; saveProfile(pp); applySettings(); settings(); } }, t.name, lvl < t.at ? h('small', {}, `Lv ${t.at}`) : null))),
    h('h3', {}, 'On your phone'), h('p', { class: 'muted' }, 'This is a web app. Open this page in your phone’s browser, then use “Install” (Android/Chrome) or Share → Add to Home Screen (iPhone). It then opens full-screen and works offline.'),
    deferredInstall ? h('button', { class: 'btn', onclick: async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; settings(); } }, 'Install now') : null,
    h('h3', {}, 'Daily reminder'), h('p', { class: 'muted' }, 'Adds a repeating event to your phone’s calendar. Nothing is sent to us.'),
    h('div', { class: 'joinrow' }, remT, h('button', { class: 'btn ghost', onclick: () => { const pp = getProfile(); pp.settings.reminder = remT.value || '19:00'; saveProfile(pp); addReminder(pp.settings.reminder); } }, 'Add to my calendar')),
    h('h3', {}, 'Privacy'),
    h('label', { class: 'switch' }, h('span', {}, h('b', {}, 'Share anonymous usage stats'), h('small', {}, 'What you play, scores, timings, taps and device type. Helps us fix and improve the games. No ads, never sold.')),
      h('input', { type: 'checkbox', checked: s.analytics === true, onchange: (e) => { const pp = getProfile(); pp.settings.analytics = e.target.checked; saveProfile(pp); track.setConsent(e.target.checked); } }), h('i')),
    anon ? h('p', { class: 'muted small' }, `Your anonymous ID: ${anon}. Send it to us if you want your stats deleted.`) : null,
    h('h3', {}, 'Your data'), h('p', { class: 'muted' }, 'Your progress is stored on this device only. Back it up if you might clear your browser data.'),
    h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: async () => { const dump = JSON.stringify(Object.fromEntries(store.keys().map((k) => [k, store.get(k)]))); try { await navigator.clipboard.writeText(dump); toast('Backup copied to clipboard.'); } catch { data.value = dump; toast('Copy the text from the box.'); } } }, 'Copy backup'),
      h('button', { class: 'btn ghost', onclick: () => { try { const o = JSON.parse(data.value); if (!o || typeof o !== 'object' || !o.profile) throw 0; Object.entries(o).forEach(([k, v]) => store.set(k, v)); applySettings(); toast('Backup restored.'); settings(); } catch { toast('That does not look like a backup.'); } } }, 'Restore from box')),
    data,
    h('button', { class: 'btn danger', onclick: () => { if (confirm('Delete all progress on this device?')) { track.forget(); store.keys().forEach((k) => store.del(k)); applySettings(); toast('Progress deleted.'); location.hash = '#/'; render(); } } }, 'Delete all progress'), legalLinks()), 'settings');
}

boot();
