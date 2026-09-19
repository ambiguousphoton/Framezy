"""Regenerates app icons from the source logo.

Usage: python3 scripts/make-icons.py [source.png]

The source art is a full-bleed square plate with rounded corners on an opaque
black margin. iOS and Android apply their own corner masks, so shipping the
rounded plate as-is leaves dark fringing. This detects the plate's exact edge
per row, erodes it a few pixels to drop the anti-aliased rim, and composites the
result onto a solid plate-coloured square.
"""

import sys
from PIL import Image, ImageDraw

SOURCE = sys.argv[1] if len(sys.argv) > 1 else 'Framezy.png'
PLATE = (252, 94, 151)  # sampled from the source plate
# Anything this dark is the margin outside the plate. The darkest real artwork
# (the navy timeline bar) is far lighter, so this does not eat the illustration.
DARK_CUTOFF = 60
# Pixels of anti-aliased rim to discard along the plate edge.
ERODE = 5
# Android crops adaptive icons to a circle/squircle; keep art inside the safe zone.
ADAPTIVE_SCALE = 0.68


def build_plate(path):
    """Returns a full-bleed square with the rounded corners filled in."""
    im = Image.open(path).convert('RGB')
    px = im.load()
    w, h = im.size

    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    rows = 0
    for y in range(h):
        xs = [x for x in range(w) if sum(px[x, y]) >= DARK_CUTOFF]
        if not xs:
            continue
        left, right = min(xs) + ERODE, max(xs) - ERODE
        if left <= right:
            draw.line([(left, y), (right, y)], fill=255)
            rows += 1

    # Trim the eroded band off the top and bottom edges too.
    mask = mask.crop((0, ERODE, w, h - ERODE))
    art = im.crop((0, ERODE, w, h - ERODE))

    out = Image.new('RGB', art.size, PLATE)
    out.paste(art, (0, 0), mask)
    print(f'{path}: {w}x{h} -> plate {out.size[0]}x{out.size[1]} from {rows} rows')
    return out


def save(im, path, size):
    im.resize((size, size), Image.LANCZOS).save(path)
    print(f'  wrote {path} ({size}x{size})')


plate = build_plate(SOURCE)

save(plate, 'assets/icon.png', 1024)
save(plate, 'assets/splash-icon.png', 1024)
save(plate, 'assets/favicon.png', 64)

Image.new('RGB', (1024, 1024), PLATE).save('assets/android-icon-background.png')
print('  wrote assets/android-icon-background.png (1024x1024, solid)')

inset = int(1024 * ADAPTIVE_SCALE)
foreground = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
art = plate.resize((inset, inset), Image.LANCZOS).convert('RGBA')
offset = (1024 - inset) // 2
foreground.paste(art, (offset, offset), art)
foreground.save('assets/android-icon-foreground.png')
print(f'  wrote assets/android-icon-foreground.png (1024x1024, art at {int(ADAPTIVE_SCALE*100)}%)')
