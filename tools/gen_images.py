"""生成讲解卡的 AI 示范图。密钥从环境变量 OPENAI_API_KEY / OPENAI_BASE_URL 读取，不写进代码。

做法：以 free-exercise-db 的真人示范照片为参考图，保留动作姿势和器械结构，
把人物和背景重画成统一画风（白背景、亚洲男性、光上身、黑短裤）。
完成图同时参考真人完成照片和刚生成的起始图，保证是同一个人、同一台器械。

用法：python3 tools/gen_images.py pushdown [--model doubao-seedream-5-0-pro]
"""
import base64, json, os, sys, urllib.request, uuid

KEY = os.environ["OPENAI_API_KEY"]
BASE = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "ai-img")
REF_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/"
PROXY = os.environ.get("REF_PROXY", "http://127.0.0.1:7897")

STYLE = ("Semi-realistic fitness instruction illustration, high-detail CG digital painting (not a photo). "
         "Pure white seamless studio background, only a faint soft floor shadow, no gym clutter and no other people. "
         "One 25-year-old East Asian man, short black hair, clear handsome features, focused expression, shirtless, "
         "low body fat, well-defined but natural athletic muscles (not a bodybuilder), black athletic shorts, black sneakers. "
         "Entire body and the full machine in frame, nothing cropped. Soft studio lighting. No text, no watermark, no logo.")

MOVES = {
    "pushdown": {
        "ref": "Triceps_Pushdown_-_Rope_Attachment",
        "machine": ("In each panel: the man stands on the left facing right toward a clean dark-grey cable tower on the right, very close, half a step away. "
                    "A short arm at the top of the tower sticks out toward him, so the pulley is high above his head and EXACTLY above his hands; "
                    "the cable drops PERFECTLY VERTICALLY (a straight plumb line, not slanted) from the pulley down to a black braided triceps rope "
                    "with ball ends; he holds one rope strand in each hand."),
        "a": ("Start of a triceps rope pushdown: upper arms pinned vertically to his sides, elbows bent 90 degrees, forearms horizontal, "
              "both fists holding the rope at lower-chest height."),
        "b": ("Finish: upper arms still pinned to his sides, elbows fully straightened, arms pointing straight down, BOTH fists still holding the rope, "
              "one strand in each hand, fists in front of his upper thighs, rope ends spread slightly apart, cable still perfectly vertical, triceps contracted."),
    },
}


def fetch_ref(ref_id, i):
    path = f"/tmp/ref-{ref_id}-{i}.jpg"
    if not os.path.exists(path):
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({"https": PROXY, "http": PROXY}))
        with open(path, "wb") as f:
            f.write(opener.open(f"{REF_BASE}{ref_id}/{i}.jpg", timeout=60).read())
    return open(path, "rb").read()


def post(path, payload, images=None):
    url = f"{BASE}{path}"
    if images:
        bd = uuid.uuid4().hex
        parts = [f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in payload.items()]
        for idx, data in enumerate(images):
            parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="image"; filename="ref{idx}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode() + data + b"\r\n")
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
    data = base64.b64decode(item["b64_json"]) if item.get("b64_json") else urllib.request.urlopen(item["url"], timeout=120).read()
    with open(path, "wb") as f:
        f.write(data)


def arg(flag, default):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def main():
    """一次生成左右双拼图（左起始、右完成），再从中间切开，保证两张是同一个人、同一台器械。"""
    import subprocess
    name = sys.argv[1]
    model = arg("--model", "doubao-seedream-5-0-pro")
    m = MOVES[name]
    os.makedirs(OUT, exist_ok=True)
    prompt = ("Use the reference photo only for the exercise pose and how close he stands to the machine. " + STYLE +
              " A two-panel instructional image split exactly down the middle into a LEFT panel and a RIGHT panel of equal width, "
              "separated by a thin empty white gap. Both panels show the SAME man and the SAME identical equipment from the SAME camera angle, "
              "same scale, same positions; only the movement phase differs. " + m["machine"] +
              " LEFT panel: " + m["a"] + " RIGHT panel: " + m["b"])
    pair = f"/tmp/{name}-pair.jpg"
    save(post("/images/edits", {"model": model, "prompt": prompt, "size": "2048x1536", "n": 1, "watermark": "false"},
              [fetch_ref(m["ref"], 0)]), pair)
    for side, off in (("a", 0), ("b", 1038)):
        out = os.path.join(OUT, f"{name}-{side}.jpg")
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "84", "-c", "1536", "1010",
                        "--cropOffset", "0", str(off), pair, "--out", out], check=True, capture_output=True)
        subprocess.run(["sips", "-Z", "1100", out], check=True, capture_output=True)
        print(side, out)


if __name__ == "__main__":
    main()
