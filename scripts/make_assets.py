#!/usr/bin/env python3
"""Generate the share card and touch icon. Usage: python scripts/make_assets.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

BG, LINE = (17, 19, 16), (52, 56, 46)
TEXT, MUTED, LIME = (239, 239, 234), (162, 167, 154), (210, 248, 155)

BOLD = ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf")
REGULAR = ("C:/Windows/Fonts/arial.ttf",)


def load(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for path in (BOLD if bold else REGULAR):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def og_card() -> None:
    width, height = 1200, 630
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)

    draw.rectangle([(40, 40), (width - 40, height - 40)], outline=LINE, width=2)
    draw.text((88, 88), "MN", font=load(58, bold=True), fill=TEXT)
    draw.text((88, 168), "IT SUPPORT / SYSTEMS / AUTOMATION", font=load(19), fill=MUTED)

    draw.text((88, 244), "Milad", font=load(92, bold=True), fill=TEXT)
    draw.text((88, 344), "Nasrollahi", font=load(92, bold=True), fill=TEXT)

    draw.line([(90, 476), (390, 476)], fill=LIME, width=3)
    draw.text((88, 500), "IT support · Studio systems · Python automation", font=load(23), fill=MUTED)

    small = load(18)
    place = "TEHRAN, IRAN"
    draw.text((width - 88 - draw.textlength(place, font=small), height - 104), place, font=small, fill=LIME)

    image.save(ASSETS / "og-image.png", optimize=True)
    print("wrote assets/og-image.png 1200x630")


def touch_icon(size: int = 180) -> None:
    image = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=int(size * 0.16), fill=BG)

    font = load(int(size * 0.40), bold=True)
    text = "MN"
    draw.text(
        ((size - draw.textlength(text, font=font)) / 2, size * 0.30),
        text, font=font, fill=TEXT,
    )
    draw.line([(size * 0.31, size * 0.70), (size * 0.69, size * 0.70)],
              fill=LIME, width=max(2, size // 60))

    image.save(ASSETS / "apple-touch-icon.png", optimize=True)
    print("wrote assets/apple-touch-icon.png %dx%d" % (size, size))


def portrait() -> None:
    # profile.jpg is not tracked (private source image); skip rather than fail.
    if not (ASSETS / "profile.jpg").exists():
        print("skipped assets/profile.webp (no assets/profile.jpg to derive it from)")
        return
    source = Image.open(ASSETS / "profile.jpg").convert("RGB")
    width = 776
    height = round(source.height * width / source.width)
    resized = source.resize((width, height), Image.LANCZOS)
    resized.save(ASSETS / "profile.webp", "WEBP", quality=82, method=6)
    print("wrote assets/profile.webp %dx%d" % (width, height))


if __name__ == "__main__":
    og_card()
    touch_icon()
    portrait()
