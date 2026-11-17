# In-game art brief (game pieces + play backgrounds)

The posters and banners are the key art. This file is for the art you see **while playing**:
1. **Gem pieces:** the coloured shapes used in about 40 games (Target Harbour, Feature Binding, One Different and others).
2. **Play backgrounds:** one atmospheric backdrop per skill area, shown behind the game board.

Everything is optional. The app draws its own version until your images arrive, and then switches to them automatically.

## How to use it
1. In a new chat with your image generator, paste the **master command** below once.
2. Send the requests in the two lists below, one at a time.
3. Download each PNG **at full size** and name it exactly as shown.
4. Upload the PNGs to the repo folder **`art-inbox/`** (GitHub → Add file → Upload files) and run `python3 tools/import-art.py`.
   It cuts the gem sheets into pieces, compresses everything to WebP, registers it, and tests the games.

---

## Master command (paste once)

```
You are the lead in-game artist for PRISMIND, a premium puzzle series whose key art is high-end cinematic 3D
(volumetric light, glass, polished metal, deep shadows). For the rest of this chat, follow these rules exactly.

GEM PIECES
- Each gem is a chunky, glossy, slightly rounded 3D game piece, like a collectible from a top mobile puzzle game:
  faceted glass or candy-like resin, strong soft top-left key light, crisp specular highlight, subtle inner glow,
  thin bright rim. Readable at 48 px.
- Shapes, always in this order, left to right, top to bottom, in a 4-column x 2-row grid:
  1 circle (sphere/disc), 2 square, 3 triangle, 4 diamond (rhombus), 5 five-point star, 6 hexagon, 7 heart, 8 plus/cross.
- Every gem in one sheet has the SAME colour, given in my request. Shapes must be instantly distinguishable by outline.
- Sheet: 2048 x 1024 px, perfectly TRANSPARENT background (no floor, no shadow plate, no scene), each gem centred in its
  512 x 512 cell, filling about 75% of the cell, nothing touching cell edges, front-facing, no perspective tilt.
- No text, numbers, labels, borders or watermarks.

PLAY BACKGROUNDS
- Portrait 1024 x 1536. Atmospheric, cinematic, very DARK overall (it sits behind bright game pieces and white text).
- Keep the centre 70% calm, low-contrast and empty of objects; put detail and light only at the edges and corners.
- One dominant hue (given per request) with subtle complementary accents. Soft depth of field, gentle film grain.
- No text, no characters, no UI, no logos.

Never copy existing games, brands or artworks. Reply with only the image. Say "Ready" to confirm.
```

---

## Requests: gem sheets (8 images)
Send each line as its own message. Save the PNG with the file name shown.

| Send this | Save as |
|---|---|
| `GEM SHEET — colour: ruby red (#ff5a5f)` | `gems-red.png` |
| `GEM SHEET — colour: sapphire blue (#4d94ff)` | `gems-blue.png` |
| `GEM SHEET — colour: emerald green (#2fd38a)` | `gems-green.png` |
| `GEM SHEET — colour: citrine yellow (#ffd84a)` | `gems-yellow.png` |
| `GEM SHEET — colour: amethyst purple (#b57bff)` | `gems-purple.png` |
| `GEM SHEET — colour: amber orange (#ff9f1c)` | `gems-orange.png` |
| `GEM SHEET — colour: rose pink (#ff7ac6)` | `gems-pink.png` |
| `GEM SHEET — colour: aquamarine teal (#2ee6d6)` | `gems-teal.png` |

## Requests: play backgrounds (10 images, 5 per app)
| Send this | Save as |
|---|---|
| `PLAY BACKGROUND — Working memory: a night city of glowing windows seen through mist; hue violet` | `bg-working-memory.png` |
| `PLAY BACKGROUND — Learning: an ancient library with floating pages and soft magenta light; hue magenta` | `bg-learning.png` |
| `PLAY BACKGROUND — Attention: a dark observatory with a single focused beam; hue deep blue and cyan` | `bg-attention.png` |
| `PLAY BACKGROUND — Flexibility: a hall of turning mirrors and ember light; hue ember orange` | `bg-flexibility.png` |
| `PLAY BACKGROUND — Speed: streaks of golden light in a dark tunnel; hue gold on indigo` | `bg-speed.png` |
| `PLAY BACKGROUND — Logic: a dim vault of brass mechanisms and teal glow; hue teal` | `bg-logic.png` |
| `PLAY BACKGROUND — Planning: lantern-lit map table in a quiet war room; hue emerald` | `bg-planning.png` |
| `PLAY BACKGROUND — Spatial: floating crystal geometry in a cobalt void; hue cobalt` | `bg-spatial.png` |
| `PLAY BACKGROUND — Language & numbers: a scriptorium of glowing glyphs and numerals as abstract shapes, no readable text; hue rose` | `bg-language-numbers.png` |
| `PLAY BACKGROUND — Judgment: a candle-lit study with balance scales in shadow; hue copper` | `bg-judgment.png` |

The first five backgrounds go in **brain-games-memory**, the last five in **brain-games-logic**. Upload all 8 gem sheets to **both** repos.

## Sound and music (already included)
- **Sound effects:** UI SFX by Yuki Capital, CC0 public domain (`assets/sfx/`). You can switch the style in Settings → Sound style.
- **Music:** CC0 tracks from OpenGameArt by cynicmusic (Crystal Cave, Calm Ambient 2 and 3), Kistol (Snowfall) and Komiku / Loyalty Freak Music (Balance). No attribution is legally required; credits are listed here as a courtesy.
