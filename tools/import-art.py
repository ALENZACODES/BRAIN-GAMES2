#!/usr/bin/env python3
"""Imports art dropped in art-inbox/ (see IN_GAME_ART_PROMPT.md and ART_BRIEF_2.md). Needs Pillow.
  gems-<colour>.png            4x2 sheet -> assets/sprites/gem-<shape>-<colour>.webp
  gems-<colour>-<pattern>.png  4x2 sheet -> assets/sprites/gem-<shape>-<colour>-<pattern>.webp  (stripes, dots, outline)
  bg-<category>.png            portrait  -> assets/bg/<category>.webp
  badges-1..5.png              2x2 sheets -> assets/badges/<achievement id>.webp (+ locked)
  ui-icons.png                 4x2 sheet -> assets/ui/<icon>.webp
  app-icon.png                 square    -> icons/icon-192.png, icon-512.png, icon-maskable-512.png
Registers everything in assets/art/manifest.json.  Usage: python3 tools/import-art.py"""
import json, os, re, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX, MAN = os.path.join(ROOT, 'art-inbox'), os.path.join(ROOT, 'assets/art/manifest.json')
SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'heart', 'cross']
COLOURS = {'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'}
PATTERNS = {'stripes', 'dots', 'outline'}
BADGES = ['first', 'streak3', 'streak7', 'streak30', 'lvl8', 'lvl12', 'combo10', 'clear', 'trials100', 'trials1000',
          'daily3', 'missions', 'duel', 'explorer', 'voyager', 'stars25', 'stars100', 'stars300', 'comeback', 'locked']
UI = ['star', 'freeze', 'chest', 'flame', 'daily', 'missions', 'duel', 'trophy']
if not os.path.isdir(INBOX): sys.exit('No art-inbox/ folder found.')
for d in ('assets/sprites', 'assets/bg', 'assets/badges', 'assets/ui', 'icons'): os.makedirs(os.path.join(ROOT, d), exist_ok=True)
man = json.load(open(MAN))
sets = {k: set(man.get(k, [])) for k in ('sprites', 'bg', 'badges', 'ui')}

def cells(path, cols, rows):
    im = Image.open(path).convert('RGBA'); cw, ch = im.width // cols, im.height // rows
    for r in range(rows):
        for c in range(cols): yield im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))

def square(cell, size):
    """Crop to the solid part of the art (ignores faint glows and sparkles), add a small margin, centre on a square."""
    box = cell.getchannel('A').point(lambda a: 255 if a > 100 else 0).getbbox()
    if not box: return None
    m = round(max(box[2] - box[0], box[3] - box[1]) * 0.04)
    box = (max(0, box[0] - m), max(0, box[1] - m), min(cell.width, box[2] + m), min(cell.height, box[3] + m))
    cell = cell.crop(box); s = max(cell.size); sq = Image.new('RGBA', (s, s))
    sq.paste(cell, ((s - cell.width) // 2, (s - cell.height) // 2))
    return sq.resize((size, size), Image.LANCZOS)

def save(im, rel, q=86): im.save(os.path.join(ROOT, rel), 'WEBP', quality=q, method=6)

done = 0
for f in sorted(os.listdir(INBOX)):
    p, name = os.path.join(INBOX, f), f.lower()
    if m := re.match(r'gems?-([a-z]+)(?:-([a-z]+))?\.(png|webp|jpg)$', name):
        colour, pat = m.group(1), m.group(2)
        if colour in COLOURS and (pat is None or pat in PATTERNS):
            suffix = f'-{pat}' if pat else ''
            for shape, cell in zip(SHAPES, cells(p, 4, 2)):
                sq = square(cell, 256)
                if sq is None: print('  empty cell', shape, 'in', f); continue
                save(sq, f'assets/sprites/gem-{shape}-{colour}{suffix}.webp'); sets['sprites'].add(f'{shape}-{colour}{suffix}')
            print('gems', colour, pat or 'solid'); done += 1; continue
    if m := re.match(r'bg-([a-z0-9-]+)\.(png|webp|jpg|jpeg)$', name):
        im = Image.open(p).convert('RGB'); im.thumbnail((1024, 1536), Image.LANCZOS)
        save(im, f'assets/bg/{m.group(1)}.webp', 78); sets['bg'].add(m.group(1)); print('background', m.group(1)); done += 1; continue
    if m := re.match(r'badges-([1-5])\.(png|webp)$', name):
        k = (int(m.group(1)) - 1) * 4
        for bid, cell in zip(BADGES[k:k + 4], cells(p, 2, 2)):
            sq = square(cell, 192)
            if sq is None: print('  empty badge', bid); continue
            save(sq, f'assets/badges/{bid}.webp'); sets['badges'].add(bid)
        print('badges', ', '.join(BADGES[k:k + 4])); done += 1; continue
    if name in ('ui-icons.png', 'ui-icons.webp'):
        for icon, cell in zip(UI, cells(p, 4, 2)):
            sq = square(cell, 128)
            if sq is None: print('  empty icon', icon); continue
            save(sq, f'assets/ui/{icon}.webp'); sets['ui'].add(icon)
        print('screen icons'); done += 1; continue
    if name == 'app-icon.png':
        im = Image.open(p).convert('RGB'); s = min(im.size)
        im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
        for size, out in ((512, 'icon-512.png'), (192, 'icon-192.png'), (512, 'icon-maskable-512.png'), (180, 'apple-touch-icon.png'), (48, 'favicon-48.png')):
            im.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, 'icons', out), optimize=True)
        print('app icon'); done += 1; continue
    print('  skipped (name not recognised):', f)

for k, v in sets.items(): man[k] = sorted(v)
with open(MAN, 'w') as fh: json.dump(man, fh, indent=2); fh.write('\n')
print(f'{done} file(s) imported. Bump VERSION in sw.js so installed apps fetch the new art.')
