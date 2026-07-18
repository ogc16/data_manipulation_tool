from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
img = Image.new("RGB", (W, H), "#ffffff")
draw = ImageDraw.Draw(img)

# accent bar
draw.rectangle([0, 0, W, 6], fill="#3b82f6")

# title
try:
    title_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 96)
    sub_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 32)
    small_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22)
except OSError:
    title_font = ImageFont.load_default()
    sub_font = title_font
    small_font = title_font

title = "Data Tools"
bbox = draw.textbbox((0, 0), title, font=title_font)
tw = bbox[2] - bbox[0]
draw.text(((W - tw) // 2, 200), title, fill="#0f172a", font=title_font)

subtitle = "Excel · CSV · PDF · ZIP · Encrypt · Analyze"
bbox2 = draw.textbbox((0, 0), subtitle, font=sub_font)
sw = bbox2[2] - bbox2[0]
draw.text(((W - sw) // 2, 340), subtitle, fill="#475569", font=sub_font)

domain = "dt.techgaetano.com"
bbox3 = draw.textbbox((0, 0), domain, font=small_font)
dw = bbox3[2] - bbox3[0]
draw.text(((W - dw) // 2, 420), domain, fill="#64748b", font=small_font)

out = os.path.join(os.path.dirname(__file__), "..", "public", "og-image.png")
img.save(out, "PNG")
print(f"Saved {out} ({W}x{H})")
