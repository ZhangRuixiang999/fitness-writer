"""把双拼图从中缝切成起始、完成两张。先找画面中部最亮的白缝；切完检查切口上没有人物或器械。
用法：/tmp/imgenv/bin/python tools/split_pairs.py pair.jpg 输出前缀 lr|tb"""
import sys
from PIL import Image, ImageOps


def darkest(g, i, axis):
    w, h = g.size
    box = (i, 0, i + 1, h) if axis == "x" else (0, i, w, i + 1)
    return g.crop(box).getextrema()[0]


def find_gap(g, axis):
    n = g.size[0 if axis == "x" else 1]
    lo, hi = int(n * 0.40), int(n * 0.60)
    vals = [(i, darkest(g, i, axis)) for i in range(lo, hi)]
    top = max(v for _, v in vals)
    runs, cur = [], []
    for i, v in vals:
        if v >= top - 6:
            cur.append(i)
        elif cur:
            runs.append(cur); cur = []
    if cur:
        runs.append(cur)
    best = max(runs, key=len)
    return best[0], best[-1], top


def main():
    src, prefix, layout = sys.argv[1:4]
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    g = im.convert("L")
    axis = "x" if layout == "lr" else "y"
    s, e, top = find_gap(g, axis)
    w, h = im.size
    pad = 2
    boxes = ((0, 0, s - pad, h), (e + pad, 0, w, h)) if axis == "x" else ((0, 0, w, s - pad), (0, e + pad, w, h))
    for side, box in zip("ab", boxes):
        p = im.crop(box)
        p.thumbnail((1100, 1100))
        p.save(f"{prefix}-{side}.jpg", quality=86, optimize=True)
    edge = [darkest(g, max(s - pad, 0) - 1, axis), darkest(g, min(e + pad, g.size[0 if axis == "x" else 1] - 1), axis)]
    print(f"{prefix.split('/')[-1]:14} 缝 {s}-{e} 宽{e - s + 1} 缝亮度{top} 切口最暗{edge}")


main()
