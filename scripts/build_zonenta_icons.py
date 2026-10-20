"""Generate PWA, Apple and browser icons from one Zonenta SVG source."""
from io import BytesIO
from pathlib import Path
import shutil
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public"
ICONS = ROOT / "icons"
SOURCE = ICONS / "zonenta-brand-icon.svg"
ART = cairosvg.svg2png(bytestring=SOURCE.read_bytes(), output_width=1024, output_height=1024)
BASE = Image.open(BytesIO(ART)).convert("RGB")

def png(name, size, source=BASE):
    dest = ICONS / name
    image = source.resize((size, size), Image.Resampling.LANCZOS)
    image.save(dest, format="PNG", optimize=True)
    print(f"{name}: {size}px ({dest.stat().st_size} bytes)")

for size in (192, 512):
    png(f"zonenta-z-{size}.png", size)
png("zonenta-z-maskable-512.png", 512)
png("zonenta-z-180.png", 180)
favicon_source = BASE.crop((140, 140, 884, 884))
for size in (16, 32, 48):
    png(f"zonenta-z-{size}.png", size, favicon_source)
favicon_source.save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
for previous, current in (
    ("icon-192.png", "zonenta-z-192.png"),
    ("icon-512.png", "zonenta-z-512.png"),
    ("zonenta-192.png", "zonenta-z-192.png"),
    ("zonenta-512.png", "zonenta-z-512.png"),
    ("zonenta-maskable-512.png", "zonenta-z-maskable-512.png"),
):
    shutil.copyfile(ICONS / current, ICONS / previous)
