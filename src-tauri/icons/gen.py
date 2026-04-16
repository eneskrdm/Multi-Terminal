from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# Tokyo Night inspired palette for the logo.
BG = (26, 27, 38, 255)        # #1a1b26
ACCENT = (122, 162, 247, 255) # #7aa2f7
GLYPH = (192, 202, 245, 255)  # #c0caf5


def make_square(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = max(1, size // 6)
    # Rounded-square background
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG, outline=ACCENT, width=max(1, size // 32))
    # Terminal prompt glyph ">_"
    inset = size // 4
    gw = max(1, size // 16)
    # > chevron
    d.line([(inset, inset + size // 10), (inset + size // 4, size // 2), (inset, size - inset - size // 10)], fill=GLYPH, width=gw, joint="curve")
    # underline cursor
    d.rectangle([size // 2, size - inset, size - inset, size - inset + max(2, size // 16)], fill=ACCENT)
    return img


def main() -> None:
    sizes_png = [32, 128, 256]
    images = {s: make_square(s) for s in sizes_png}

    # Standard Tauri PNGs
    images[32].save(os.path.join(OUT, "32x32.png"))
    images[128].save(os.path.join(OUT, "128x128.png"))
    images[256].save(os.path.join(OUT, "128x128@2x.png"))
    images[256].save(os.path.join(OUT, "icon.png"))

    # Windows .ico (multi-resolution)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base = make_square(256)
    base.save(os.path.join(OUT, "icon.ico"), sizes=ico_sizes)

    # macOS .icns — also multi-size PNG encoded.
    # Pillow supports icns writing on any platform via the ICNS plugin.
    try:
        base.save(os.path.join(OUT, "icon.icns"), format="ICNS")
    except Exception as exc:
        # Fall back to writing the raw PNG under the .icns name — tauri-build
        # does not strictly require this file on Windows, but we keep a file
        # there to satisfy path existence checks.
        print(f"icns write failed: {exc} — writing PNG fallback")
        base.save(os.path.join(OUT, "icon.icns"), format="PNG")

    print("icons generated in", OUT)


if __name__ == "__main__":
    main()
