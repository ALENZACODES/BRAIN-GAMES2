
// Per-app settings. The companion app only changes this file, the games list and the catalogue range.
export const CONFIG = {
  key: 'bg2', brand: 'PRISMIND', brandName: 'Prismind', sub: 'Logic & Reasoning', appId: 'logic-reasoning',
  range: [101, 200], hue: 185, repo: 'brain-games-logic',
  music: ["crystal-cave", "calm-synthwave", "balance"],
  sibling: { sub: 'Memory & Focus', url: 'https://alenzacodes.github.io/brain-games-memory/' },
  operator: 'ALENZA CODES',
  contact: '', // public contact email for the Privacy Policy and Terms; leave '' until it exists
  analytics: { posthogKey: '', host: 'https://us.i.posthog.com' }, // paste the PostHog project API key here to start collecting stats
};
