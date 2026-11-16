# BRAIN GAMES · Logic & Reasoning

100 brain games for logic, planning, spatial reasoning, language & numbers, and judgment (concepts 101–200). An installable web app with adaptive difficulty, saved progress, daily goals and two-player modes. No server, no accounts, no build step. Companion app: BRAIN-GAMES1 (memory & focus, concepts 1–100).

**All 100 games in this repo are playable.** Areas: Logic · Planning · Spatial · Language & numbers · Judgment.

## What keeps people coming back
- **Adaptive difficulty** in every game: 2 right in a row moves you up a level, a miss moves you down. Runs have 3 lives.
- **Mastery stars:** 1–3 stars per game for reaching set levels (300 to collect per app). Cards, the header and the Progress page show them.
- **Daily Workout:** 3 games picked by date (same puzzles for everyone that day) and +100 XP for finishing all three.
- **3 daily missions** (e.g. “Play 3 different games”, “Earn a new star”), +50 XP each and a +150 XP bonus for all three.
- **Day streak** with **streak freezes**: one is earned every 7-day streak (hold up to 2); a freeze covers a single missed day.
- **Comeback bonus:** double XP on the first run after 3+ days away.
- **XP, player levels, 19 badges, unlockable colour themes.**
- **Personal recommendations:** “Jump back in” (recent games) and “Try next” (unplayed games from your least-practised area), plus an “Up next” card after every run.
- **Close-call messages:** “only 120 points short of your best”, “one level from your next star”.
- **Results with real numbers** (e.g. “remembered 7 lit windows at once”) and a per-area skill map. No IQ or “brain age” claims.
- **Multiplayer:** challenge links (same puzzles plus your score to beat) and 2-player pass-the-phone duels in every game.

## Put it on a phone (no app store)
1. GitHub repo → **Settings → Pages** → Source: **Deploy from a branch**, Branch **main**, folder **/ (root)** → Save.
2. After a minute it is live at `https://alenzacodes.github.io/BRAIN-GAMES2/`.
3. Open it on the phone. **Android/Chrome:** tap *Install*. **iPhone/Safari:** Share → *Add to Home Screen*. It opens full-screen and works offline. Progress stays on the phone (Settings has backup and restore).

## How it is built
| File | What it does |
|---|---|
| `js/engine.js` | seeded random puzzles, difficulty staircase, run loop, scoring, saves, streaks and freezes, stars, missions, badges, synthesised sound |
| `js/play.js` | shared trial templates: multiple choice, sequence/order, multi-select, number pad, stimulus stream, matching, multi-step, typing, plus study and distraction phases |
| `js/gfx.js` | SVG glyphs, icons, charts and small content banks |
| `js/games/*.js` | the games: 6 hand-built single files plus 5 packs of about 19 games each |
| `js/app.js` | hub, game pages, results, duel, progress, settings |
| `js/art.js` | procedural key art for every game, auto-replaced by your images |
| `sw.js` | offline cache (bump `VERSION` after changes) |

## Testing
```
python3 -m http.server 8080        # play at http://localhost:8080
node tests/run.mjs                 # engine + determinism tests for every game
node tests/validate.mjs            # every game, every level, 30 seeds: answer present, unique, accepted by the game's own checker
node tests/retention.mjs           # streaks, freezes, stars, missions, comeback
node tools/gen-index.mjs           # regenerate the game registry; confirms all catalogue games are present
```
Add `?qa=3` (or `?qa=3&lv=max`) to the URL to make runs 3 trials long, for quick manual checks.

## Artwork
Use **`MASTER_IMAGE_PROMPT.md`** (paste it once into the image generator), then the per-game prompts in **`art-prompts/prompts.md`**. Save as `assets/art/<game-id>.webp` and list the id in `assets/art/manifest.json`.

## Honest notes
- Scores describe performance in these games on this device. The app does not claim the skills transfer to everyday life.
- Some concepts are simplified to fit a phone screen; each game’s *How to play* describes exactly what it does.
- Games that rely on written content (vocabulary, passages, word lists) draw from small built-in banks, so items repeat after many runs.
- Retention features are built and tested for correctness. Whether they make people return can only be measured with real players.

## Project structure

```text
BRAIN-GAMES2/
├── .github/
│   └── workflows/          # CI workflows (1 file)
├── art-prompts/            # Artwork prompts and import script (4 files)
├── assets/                 # Game artwork
│   └── art/                # 203 files
├── css/                    # Styles (1 file)
├── icons/                  # App icons (4 files)
├── js/                     # Application code
│   ├── games/              # The games (12 files)
│   ├── app.js              # Hub, game pages, results and settings
│   ├── art.js              # Procedural key art
│   ├── catalog.json        # Game catalogue
│   ├── config.js
│   ├── engine.js           # Puzzles, scoring, saves and streaks
│   ├── gfx.js              # SVG glyphs, icons and charts
│   ├── kit.js
│   └── play.js             # Shared trial templates
├── tests/                  # Automated tests
│   ├── retention.mjs
│   ├── run.mjs
│   └── validate.mjs
├── tools/                  # Registry generator (1 file)
├── .nojekyll
├── index.html              # App shell
├── manifest.webmanifest    # Web app manifest
├── MASTER_IMAGE_PROMPT.md  # Artwork style brief
├── package.json            # npm scripts and dependencies
├── README.md               # This file
└── sw.js                   # Service worker for offline use
```

## Sound and music
- Sound effects: UI SFX by Yuki Capital (npm `uisfx`), CC0 public domain, in `assets/sfx/` (5 styles; switch in Settings → Sound style).
- Music: CC0 tracks from OpenGameArt (cynicmusic, Kistol, Komiku / Loyalty Freak Music), in `assets/music/`. Toggle with the ♪ button while playing or in Settings.
- In-game art (gem pieces, play backgrounds): see `IN_GAME_ART_PROMPT.md`; drop PNGs in `art-inbox/` and run `python3 tools/import-art.py`.
