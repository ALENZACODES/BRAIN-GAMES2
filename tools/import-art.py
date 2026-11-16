#!/usr/bin/env python3
"""Imports in-game art dropped in art-inbox/ (see IN_GAME_ART_PROMPT.md).
  gems-<colour>.png  (2048x1024, 4x2 grid, transparent) -> assets/sprites/gem-<shape>-<colour>.webp (256 px)
  bg-<category>.png  (portrait)                         -> assets/bg/<category>.webp (max 1024 px tall)
Then registers them in assets/art/manifest.json ("sprites", "bg"). Needs Pillow.  Usage: python3 tools/import-art.py"""
import json, os, re, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX, MAN = os.path.join(ROOT, 'art-inbox'), os.path.join(ROOT, 'assets/art/manifest.json')
SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'heart', 'cross']
COLOURS = {'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'}
os.makedirs(os.path.join(ROOT, 'assets/sprites'), exist_ok=True); os.makedirs(os.path.join(ROOT, 'assets/bg'), exist_ok=True)
man = json.load(open(MAN)); sprites, bgs = set(man.get('sprites', [])), set(man.get('bg', []))
if not os.path.isdir(INBOX): sys.exit('No art-inbox/ folder found.')
done = 0
for f in sorted(os.listdir(INBOX)):
    p = os.path.join(INBOX, f); name = f.lower()
    m = re.match(r'gems?-([a-z]+)\.(png|webp|jpg)$', name)
    if m and m.group(1) in COLOURS:
        im = Image.open(p).convert('RGBA'); W, H = im.size; cw, ch = W // 4, H // 2
        for i, shape in enumerate(SHAPES):
            cell = im.crop(((i % 4) * cw, (i // 4) * ch, (i % 4 + 1) * cw, (i // 4 + 1) * ch))
            bbox = cell.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
            if not bbox: print('  empty cell', shape, 'in', f); continue
            cell = cell.crop(bbox); s = max(cell.size); sq = Image.new('RGBA', (s, s)); sq.paste(cell, ((s - cell.width) // 2, (s - cell.height) // 2))
            sq.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, f'assets/sprites/gem-{shape}-{m.group(1)}.webp'), 'WEBP', quality=86, method=6)
            sprites.add(f'{shape}-{m.group(1)}')
        print('gems', m.group(1)); done += 1; continue
    m = re.match(r'bg-([a-z0-9-]+)\.(png|webp|jpg|jpeg)$', name)
    if m:
        im = Image.open(p).convert('RGB'); im.thumbnail((1024, 1024 if im.width > im.height else 1536), Image.LANCZOS)
        im.save(os.path.join(ROOT, f'assets/bg/{m.group(1)}.webp'), 'WEBP', quality=78, method=6); bgs.add(m.group(1))
        print('background', m.group(1)); done += 1; continue
    print('  skipped (name not recognised):', f)
man['sprites'], man['bg'] = sorted(sprites), sorted(bgs)
json.dump(man, open(MAN, 'w'), indent=2); open(MAN, 'a').write('\n')
print(f'{done} file(s) imported. Bump VERSION in sw.js so phones fetch the new art.')
