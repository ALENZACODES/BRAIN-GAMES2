# BRAIN GAMES · Logic & Reasoning

Logic, planning, spatial reasoning, language & numbers, and judgment (concepts 101–200). A fast, installable web app with adaptive difficulty, saved progress, daily challenges, and two-player duels.
It has no server, no accounts, and no build step.

**Status:** 6 games are playable now. The other 94 concepts from the catalogue appear in the app as "In development" and run on the same engine, so they can be added next. The companion app is BRAIN-GAMES1 (memory & focus).

## Playable games
| Game | Concept | What you do |
|---|---|---|
| Number Lock | #111 | Crack a code from right-place / wrong-place clues |
| Circuit Path | #103 | Rotate wires to power the socket within a turn budget |
| Mirror Maze | #145 | Trace a light beam through mirrors |
| Rotation Match | #141 | Find the rotated shape, avoid mirror-image traps |
| Number Line Navigator | #171 | Place numbers, decimals, negatives, fractions on a line |
| Fraction Duel | #173 | Which fraction is larger, or are they equal? |

Every game has: a practice round on the first play, **adaptive difficulty** (2 right in a row = level up, 1 miss = level down), 3 lives per run, combo scoring, a results screen with concrete numbers (e.g. "remembered 7 lit windows at once"), and per-game history.

## Why people come back
- **Daily Workout:** 3 games picked by date, with the same puzzles for everyone that day, plus bonus XP.
- **Day streak** (🔥), **XP and player levels** with titles, **12 badges**, and **themes** unlocked by level.
- **Personal bests** and a progress page with a 4-week activity grid and level trend per game.
- **Challenge a friend:** sends a link with the same seed and your score to beat.
- **2-player duel:** same puzzles, pass the phone, a winner screen and rematch.

## Put it on a phone (no app store)
1. In the GitHub repo go to **Settings → Pages**, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, then Save.
2. After about a minute it is live at `https://alenzacodes.github.io/BRAIN-GAMES2/`.
3. Open that link on the phone. **Android/Chrome:** tap *Install*. **iPhone/Safari:** Share → *Add to Home Screen*.
It then opens full-screen and works offline. Progress stays on the phone; Settings has backup and restore.

## Run locally
```
python3 -m http.server 8080      # then open http://localhost:8080
node tests/run.mjs               # logic tests (no browser needed)
```

## Artwork
The app draws its own cinematic poster for every game, so it looks finished with no downloads.
To upgrade to studio-style art, use **`MASTER_IMAGE_PROMPT.md`** (paste it once into the image generator) and then the per-game prompts in **`art-prompts/prompts.md`**. Save images to `assets/art/<game-id>.webp` and list the id in `assets/art/manifest.json`.

## Adding a game from the catalogue
1. Copy any file in `js/games/` and keep its shape: `makeTrial(rng, level)` builds a puzzle from a seed (pure, testable); `play(trial, ctx)` shows it and returns `{correct, rt, tags, metric, explain}`; `summary()` writes the concrete results line.
2. Register it in `js/games/index.js`. The id must be the title in kebab-case (e.g. `Parcel Sequence` → `parcel-sequence`).
3. Add logic tests in `tests/run.mjs`. Add the file to `CORE` in `sw.js` and bump `VERSION`.

## Files
`js/engine.js` seeded RNG, difficulty staircase, session loop, scoring, local saves, XP/streak/badges, synthesised sound · `js/app.js` hub, game pages, runs, results, duel, progress, settings · `js/kit.js` timed choices, confetti, fruit sprites · `js/art.js` procedural posters and artwork loader · `js/catalog.json` all 200 concepts · `sw.js` offline cache.

## Honest notes
- Scores describe performance in these games on this device. The app does not give an IQ or "brain age", and it does not claim the skills transfer outside the games.
- Timed trials are replayed if the app is backgrounded mid-trial. Untimed mode is available in Settings; untimed runs do not change personal bests.
