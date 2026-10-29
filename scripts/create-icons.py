from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root = Path(__file__).resolve().parent.parent
font = ImageFont.truetype(str(root / 'public/fonts/bodoni-moda-4.ttf'), 330)
im = Image.new('RGB', (512, 512), '#4C4743')
d = ImageDraw.Draw(im)
d.text((132, 7), 'A', font=font, fill='#FAFAF9')
for box in [(58, 58, 170, 58), (58, 58, 58, 170), (342, 58, 454, 58), (454, 58, 454, 170), (58, 342, 58, 454), (58, 454, 170, 454), (454, 342, 454, 454), (342, 454, 454, 454)]:
 d.line(box, fill='#AB9387', width=3)
for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
 im.resize((size, size), Image.Resampling.LANCZOS).save(root / 'public' / name)
