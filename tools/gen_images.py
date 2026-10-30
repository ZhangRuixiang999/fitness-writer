"""生成讲解卡的 AI 示范图。密钥从环境变量 OPENAI_API_KEY / OPENAI_BASE_URL 读取，不写进代码。

用法：python3 tools/gen_images.py pushdown            # 生成起始图，再以起始图为参考生成完成图
      python3 tools/gen_images.py pushdown --model doubao-seedream-5-0-pro
"""
import base64, json, os, sys, urllib.request, uuid

KEY = os.environ["OPENAI_API_KEY"]
BASE = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OUT = os.path.join(os.path.dirname(__file__), "..", "ai-img")

STYLE = ("Realistic fitness instruction illustration, high-detail semi-realistic CG digital painting (not a photo). "
         "Pure white background with only a faint soft floor shadow. One 25-year-old East Asian man, short black hair, "
         "clear handsome features, focused expression, shirtless, low body fat, well-defined but natural athletic muscles "
         "(not a bodybuilder), black athletic shorts, black sneakers. Entire body in frame, hands and feet not cropped. "
         "Soft studio lighting, accurate gym equipment. No text, no watermark, no logo, no other people.")

MOVES = {
    "pushdown": {
        "size": "1024x1536",
        "a": ("Strict side profile view, the man faces right. A cable pulley is mounted high on a tall black post that stands IN FRONT of him, "
              "about one step ahead of his body, at the right side of the image. The steel cable runs straight down vertically from the pulley "
              "to a double-ended black rope attachment just in front of his chest. Starting position of a triceps rope pushdown: "
              "both upper arms hang vertically and are pinned tightly against the sides of his torso, elbows bent at 90 degrees right beside his ribs, "
              "forearms horizontal pointing forward, fists holding the rope ends at lower-chest height. Torso upright, slight forward lean, "
              "feet hip-width apart. The cable never passes near his face."),
        "b": ("Edit the reference image: keep the same man, same face, same outfit, same tall black post with the high pulley on the right side, "
              "same strict side profile view facing right, same background. Change only his arms to the finish position of a triceps rope pushdown: "
              "BOTH hands still firmly grip the two rope ends together, the cable stays attached and is taut, running straight from the high pulley down to his hands. "
              "Upper arms stay vertical and pinned against his sides, elbows fully straightened, forearms pointing straight down, "
              "both fists right in front of his upper thighs, rope ends pulled slightly apart, triceps clearly contracted."),
    },
}


def post(path, payload=None, files=None):
    url = f"{BASE}{path}"
    if files:
        bd = uuid.uuid4().hex
        parts = []
        for k, v in payload.items():
            parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        for k, (name, data) in files.items():
            parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"; filename="{name}"\r\nContent-Type: image/png\r\n\r\n'.encode() + data + b"\r\n")
        parts.append(f"--{bd}--\r\n".encode())
        body, ctype = b"".join(parts), f"multipart/form-data; boundary={bd}"
    else:
        body, ctype = json.dumps(payload).encode(), "application/json"
    req = urllib.request.Request(url, data=body, headers={"Authorization": f"Bearer {KEY}", "Content-Type": ctype})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read()[:500].decode(errors='ignore')}")


def save(resp, path):
    item = resp["data"][0]
    if item.get("b64_json"):
        data = base64.b64decode(item["b64_json"])
    else:
        data = urllib.request.urlopen(item["url"], timeout=120).read()
    with open(path, "wb") as f:
        f.write(data)
    return data


def main():
    name = sys.argv[1]
    model = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else "gpt-image-2"
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else "ab"
    m = MOVES[name]
    os.makedirs(OUT, exist_ok=True)
    pa, pb = os.path.join(OUT, f"{name}-a.png"), os.path.join(OUT, f"{name}-b.png")
    if "a" in only:
        save(post("/images/generations", {"model": model, "prompt": f"{STYLE} {m['a']}", "size": m["size"], "n": 1}), pa)
        print("起始图", pa)
    if "b" in only:
        ref = open(pa, "rb").read()
        prompt = f"{STYLE} Keep exactly the same man, face, body, outfit, lighting and camera angle as the reference image. {m['b']}"
        save(post("/images/edits", {"model": model, "prompt": prompt, "size": m["size"], "n": 1}, {"image": ("ref.png", ref)}), pb)
        print("完成图", pb)


if __name__ == "__main__":
    main()
