"""Builds the app icon, Android adaptive icon layers, splash image and web favicon in
apps/mobile/assets from the YALLA brand logo (assets/yalla-cinema-logo-transparent.png at the
repository root). The logo artwork is only scaled and placed, never redrawn.

Run from anywhere with Pillow installed:  python3 apps/mobile/scripts/make-app-icons.py
app.json points at the files written here; the colours below match its splash and adaptive icon
background colours.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

MOBILE = Path(__file__).resolve().parents[1]
ASSETS = MOBILE / 'assets'
LOGO = MOBILE.parents[1] / 'assets' / 'yalla-cinema-logo-transparent.png'

# Brand colours from the web prototype's pages.css ("black and gold lead"), as in src/theme.ts.
BLACK = '#11100e'  # page background; also the splash and adaptive icon background colour
GLOW = '#231e16'  # warm centre of the icon background, between the bg and the panel (#1c1914)
EDGE = '#0b0a09'  # icon corners

# Every ink pixel of the logo lies within 1.014 x half its width of the centre of its box (the
# Y's left tip is the farthest), so a logo W wide fits a circle of diameter 1.014 * W.
# Share of the visible icon the logo spans: leaves a 10% margin each side, and keeps the logo
# inside the circle that legacy round Android icons (cut from icon.png) and round launcher masks crop to.
LOGO_WIDTH = 0.80
# Adaptive layers are 108dp, of which launchers show the middle 72dp (masked to a circle, squircle
# etc.) and only the middle 66dp circle is guaranteed. 0.8 x 72dp = 57.6dp, inside 66 / 1.014 = 65dp.
ADAPTIVE_VISIBLE = 72 / 108
FAVICON_LOGO_WIDTH = 0.90  # the favicon is tiny, so the logo gets as much of it as the tile allows


def rgb(hex_colour):
    h = hex_colour.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(size, visible=1.0):
    """Black with a faint warm glow in the middle. `visible` is the share of the image a launcher
    shows (2/3 for an adaptive layer), so the glow looks the same on iOS and Android."""
    centre, middle, edge = rgb(GLOW), rgb(BLACK), rgb(EDGE)
    n = 256
    img = Image.new('RGB', (n, n))
    px = img.load()
    radius = n / 2 * visible
    for y in range(n):
        for x in range(n):
            t = math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / radius
            if t < 1:
                px[x, y] = mix(centre, middle, t * t * (3 - 2 * t))
            else:
                px[x, y] = mix(middle, edge, min(1.0, (t - 1) / 0.42))
    return img.resize((size, size), Image.Resampling.BICUBIC)


def logo_at(width):
    logo = Image.open(LOGO).convert('RGBA')
    height = round(logo.height * width / logo.width)
    # Resize premultiplied so the transparent edge pixels do not bleed dark fringes.
    return logo.convert('RGBa').resize((width, height), Image.Resampling.LANCZOS).convert('RGBA')


def centred(size, logo_width, base=None):
    canvas = base.convert('RGBA') if base is not None else Image.new('RGBA', (size, size), (0, 0, 0, 0))
    logo = logo_at(round(size * logo_width))
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas


def rounded_mask(size, radius):
    scale = 4
    mask = Image.new('L', (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * scale - 1, size * scale - 1), radius * scale, fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def save(img, name):
    img.save(ASSETS / name, optimize=True)
    print(f'{name}: {img.size[0]}x{img.size[1]} {img.mode}')


def main():
    # iOS and general icon (also Android 7's square and round icons): opaque; iOS and launchers
    # add their own corner mask.
    save(centred(1024, LOGO_WIDTH, background(1024)).convert('RGB'), 'icon.png')

    # Android adaptive icon (Android 8+). Expo scales each layer to 108dp (432px at xxxhdpi).
    size = 512
    save(background(size, visible=ADAPTIVE_VISIBLE), 'android-icon-background.png')
    foreground = centred(size, LOGO_WIDTH * ADAPTIVE_VISIBLE)
    save(foreground, 'android-icon-foreground.png')
    # Themed icon (Android 13+): only the alpha counts; the launcher picks the colour.
    white = Image.new('RGBA', foreground.size, (255, 255, 255, 255))
    white.putalpha(foreground.getchannel('A'))
    save(white, 'android-icon-monochrome.png')

    # Splash: the logo alone on transparent, with a little room so resizing never clips its edges.
    # expo-splash-screen fits it into an imageWidth square on the splash background colour.
    logo = Image.open(LOGO).convert('RGBA')
    pad = 8
    splash = Image.new('RGBA', (logo.width + 2 * pad, logo.height + 2 * pad), (0, 0, 0, 0))
    splash.alpha_composite(logo, (pad, pad))
    save(splash, 'splash-icon.png')

    # Favicon: a rounded black tile, so the gold reads on light and dark browser tabs alike.
    # Expo turns it into favicon.ico (48, 32 and 16px), so it is drawn at 48px to stay sharp.
    size = 48
    tile = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    tile.paste(background(size), (0, 0), rounded_mask(size, round(size * 0.2)))
    save(centred(size, FAVICON_LOGO_WIDTH, tile), 'favicon.png')


if __name__ == '__main__':
    main()
