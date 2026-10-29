from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
root=Path(__file__).resolve().parent.parent
font=ImageFont.truetype(str(root/'public/fonts/font-4.ttf'),380)
im=Image.new('RGB',(512,512),'#752F38');d=ImageDraw.Draw(im)
d.text((95,-4),'a',font=font,fill='#F3EBDD')
d.ellipse((344,99,409,164),fill='#C5A04A')
for size,name in [(512,'icon-512.png'),(192,'icon-192.png'),(180,'apple-touch-icon.png')]:im.resize((size,size),Image.Resampling.LANCZOS).save(root/'public'/name)
