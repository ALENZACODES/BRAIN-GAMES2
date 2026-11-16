// Live games. Everything else in the catalogue shows as "in development".
export const LIVE = {
  'number-lock': () => import('./number-lock.js'),
  'circuit-path': () => import('./circuit-path.js'),
  'mirror-maze': () => import('./mirror-maze.js'),
  'rotation-match': () => import('./rotation-match.js'),
  'number-line-navigator': () => import('./number-line-navigator.js'),
  'fraction-duel': () => import('./fraction-duel.js'),
};
