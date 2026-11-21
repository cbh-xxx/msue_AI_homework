from pathlib import Path
from PIL import Image

out = Path(__file__).parent / 'assets'
out.mkdir(exist_ok=True)
sources = [
 ('C:/WINDOWS/TEMP/codex-clipboard-cf4980bb-7067-4f07-98cd-a04850a305ec.jpg', (126,314,1140,1328), 'birthday-original.jpg'),
 ('C:/WINDOWS/TEMP/codex-clipboard-d3614089-9338-4529-b769-b81fab3128ea.jpg', (111,540,498,927), 'birthday-a.jpg'),
 ('C:/WINDOWS/TEMP/codex-clipboard-d3614089-9338-4529-b769-b81fab3128ea.jpg', (684,540,1072,927), 'birthday-b.jpg'),
 ('C:/WINDOWS/TEMP/codex-clipboard-d3614089-9338-4529-b769-b81fab3128ea.jpg', (37,1582,623,2169), 'inspiration-train.jpg'),
 ('C:/WINDOWS/TEMP/codex-clipboard-d3614089-9338-4529-b769-b81fab3128ea.jpg', (641,1582,1228,2169), 'inspiration-song.jpg'),
]
for source, box, name in sources:
    image = Image.open(source).crop(box)
    image.thumbnail((800,800))
    image.save(out/name, quality=92, comment=b'Source: user-provided Muse AI screenshots. Cropped for this interview demo.')
