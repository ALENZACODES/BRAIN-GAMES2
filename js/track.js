// Usage tracking. Nothing is sent unless the player has allowed it AND a PostHog project key is set in config.js.
// Every event is also kept in a short in-memory log (globalThis.__TRACK_LOG) so automated tests can check it.
import { CONFIG } from './config.js';

const LOG = (globalThis.__TRACK_LOG = []);
const A = CONFIG.analytics || {};
let allowed = false, loading = null, ready = false, queue = [], context = () => ({});

const base = () => ({
  app: CONFIG.appId || CONFIG.key,
  install_mode: matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'installed' : 'browser',
  screen_w: screen.width, screen_h: screen.height, lang: navigator.language,
  ...safe(context),
});
function safe(fn) { try { return fn() || {}; } catch { return {}; } }

function load() {
  if (loading || !A.posthogKey) return loading;
  const assets = (A.host || 'https://us.i.posthog.com').replace('.i.posthog.com', '-assets.i.posthog.com');
  loading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.async = true; s.src = `${assets}/static/array.js`;
    s.onload = () => {
      try {
        window.posthog.init(A.posthogKey, {
          api_host: A.host || 'https://us.i.posthog.com',
          persistence: 'localStorage',      // no cookies
          person_profiles: 'always',        // needed for return-rate (retention) charts on anonymous players
          capture_pageview: false,          // screens are sent by the app (hash routes)
          capture_pageleave: true,
          autocapture: true,                // taps on buttons and links
          mask_all_text: false,
          session_recording: { maskAllInputs: true },
          loaded: () => { ready = true; flush(); resolve(true); },
        });
      } catch { resolve(false); }
    };
    s.onerror = () => { loading = null; resolve(false); };
    document.head.append(s);
  });
  return loading;
}
function flush() {
  if (!ready || !allowed) return;
  for (const [name, props] of queue.splice(0)) window.posthog.capture(name, props);
}

export const track = {
  /** Called once at boot. consent: true | false | null (not asked yet). ctx: () => extra properties added to every event. */
  init(consent, ctx) {
    if (ctx) context = ctx;
    allowed = consent === true;
    if (allowed) load();
    addEventListener('error', (e) => track.event('app_error', { message: String(e.message).slice(0, 200), source: String(e.filename || '').split('/').pop(), line: e.lineno }));
    addEventListener('unhandledrejection', (e) => track.event('app_error', { message: String(e.reason?.message || e.reason).slice(0, 200), kind: 'promise' }));
  },
  get allowed() { return allowed; },
  get connected() { return !!A.posthogKey; },
  setConsent(on) {
    allowed = !!on;
    if (allowed) { load(); try { window.posthog?.opt_in_capturing(); } catch {} track.event('stats_allowed'); }
    else { queue = []; try { window.posthog?.opt_out_capturing(); } catch {} }
  },
  event(name, props = {}) {
    const p = { ...base(), ...props };
    LOG.push([name, p]); if (LOG.length > 400) LOG.shift();
    if (!allowed) return;
    queue.push([name, p]); if (queue.length > 300) queue.shift();
    if (ready) flush(); else load();
  },
  screen(route) { track.event('$pageview', { $current_url: location.href, route }); },
  /** Anonymous ID shown in Settings so a player can ask for their data to be deleted. */
  id() { try { return window.posthog?.get_distinct_id?.() || ''; } catch { return ''; } },
  forget() { queue = []; try { window.posthog?.reset(true); window.posthog?.opt_out_capturing(); } catch {} allowed = false; },
};
