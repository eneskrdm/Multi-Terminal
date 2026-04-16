"""Generate assets/social-preview.png (1280x640) for GitHub social preview."""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))

IMG_W, IMG_H = 1280, 640

# Tokyo Night-adjacent palette to match the app.
BG_TOP = (26, 27, 38)     # #1a1b26
BG_BOT = (15, 16, 24)     # deeper
ACCENT = (122, 162, 247)  # #7aa2f7
FG_PRIMARY = (220, 226, 250)
FG_MUTED = (120, 130, 170)

# --- background: vertical gradient ---
img = Image.new("RGB", (IMG_W, IMG_H), BG_BOT)
px = img.load()
for y in range(IMG_H):
    t = y / (IMG_H - 1)
    r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
    g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
    b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
    row = (r, g, b)
    for x in range(IMG_W):
        px[x, y] = row

draw = ImageDraw.Draw(img, "RGBA")

# --- subtle accent stripe on the left ---
stripe_w = 6
draw.rectangle([0, 160, stripe_w, IMG_H - 160], fill=(*ACCENT, 255))

# --- logo ---
logo_src = os.path.join(ROOT, "src-tauri", "icons", "icon.png")
logo = Image.open(logo_src).convert("RGBA").resize((220, 220), Image.LANCZOS)
logo_x = 120
logo_y = (IMG_H - 220) // 2 - 20
img.paste(logo, (logo_x, logo_y), logo)

# --- text: try Segoe UI family, fall back to default ---
def load_font(size: int, bold: bool = False):
    candidates = []
    if bold:
        candidates += [
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
        ]
    candidates += [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

title_font = load_font(112, bold=True)
tagline_font = load_font(34, bold=False)
meta_font = load_font(22, bold=False)

text_x = logo_x + 220 + 72
title_y = logo_y + 10
draw.text((text_x, title_y), "Multi-Terminal", font=title_font, fill=FG_PRIMARY)

# horizontal accent underline below the title
title_bbox = draw.textbbox((text_x, title_y), "Multi-Terminal", font=title_font)
underline_y = title_bbox[3] + 16
draw.rectangle(
    [text_x, underline_y, text_x + 260, underline_y + 4],
    fill=(*ACCENT, 255),
)

tagline_y = underline_y + 36
draw.text(
    (text_x, tagline_y),
    "Tabs · tmux-style splits · themes · command palette",
    font=tagline_font,
    fill=FG_MUTED,
)

meta_y = tagline_y + 70
draw.text(
    (text_x, meta_y),
    "Tauri 2   ·   React   ·   Rust   ·   Windows / macOS / Linux",
    font=meta_font,
    fill=FG_MUTED,
)

# --- footer attribution ---
footer_font = load_font(22, bold=False)
footer_text = "by Enes Karademir"
fb = draw.textbbox((0, 0), footer_text, font=footer_font)
fw = fb[2] - fb[0]
draw.text(
    (IMG_W - fw - 44, IMG_H - 48),
    footer_text,
    font=footer_font,
    fill=FG_MUTED,
)

out = os.path.join(ROOT, "assets", "social-preview.png")
img.save(out, optimize=True)
print(f"wrote {out} ({os.path.getsize(out)} bytes)")
