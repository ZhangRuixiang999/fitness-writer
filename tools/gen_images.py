"""生成讲解卡的 AI 示范图。密钥从环境变量 OPENAI_API_KEY / OPENAI_BASE_URL 读取，不写进代码。

做法：把 free-exercise-db 的真人示范照片（起始、完成两张）作为参考图，
让模型在一张图里画出两个并排的画面（左起始/右完成，或上起始/下完成），再切开。
这样两张图是同一个人、同一套器械，画风统一（白背景、亚洲男性、光上身、黑短裤）。

用法：python3 tools/gen_images.py squat [bench ...] [--model doubao-seedream-5-0-pro]
      python3 tools/gen_images.py --list
"""
import base64, json, os, subprocess, sys, urllib.request, uuid

KEY = os.environ.get("OPENAI_API_KEY", "")
BASE = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "ai-img")
REF_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/"
PROXY = os.environ.get("REF_PROXY", "http://127.0.0.1:7897")

STYLE = ("Semi-realistic fitness instruction illustration, high-detail CG digital painting (not a photo). "
         "Pure white seamless studio background, only a faint soft floor shadow, no gym clutter and no other people. "
         "One 25-year-old East Asian man, short black hair, clear handsome features, focused expression, shirtless, "
         "low body fat, well-defined but natural athletic muscles (not a bodybuilder), black athletic shorts, black sneakers. "
         "Entire body and all equipment in frame, nothing cropped. Soft studio lighting. No text, no watermark, no logo.")

# layout: lr = 左右两格（站姿动作），tb = 上下两格（躺、趴、坐着的横向动作）
MOVES = {
    "pushdown": {
        "ref": "Triceps_Pushdown_-_Rope_Attachment", "layout": "lr",
        "scene": ("The man stands on the left facing right toward a clean dark-grey cable tower on the right, very close, half a step away. "
                  "A short arm at the top of the tower sticks out toward him, so the pulley is high above his head and EXACTLY above his hands; "
                  "the cable drops PERFECTLY VERTICALLY from the pulley down to a black braided triceps rope with ball ends; he holds one rope strand in each hand."),
        "a": "upper arms pinned vertically to his sides, elbows bent 90 degrees, forearms horizontal, both fists holding the rope at lower-chest height.",
        "b": ("upper arms still pinned to his sides, elbows fully straightened, arms pointing straight down, BOTH fists still holding the rope, "
              "fists in front of his upper thighs, rope ends spread slightly apart, triceps contracted."),
    },
    "squat": {
        "ref": "Barbell_Squat", "layout": "lr",
        "scene": ("Both panels use the exact same strict side profile view, the man faces right. An Olympic barbell with black bumper plates rests across his upper back BEHIND his neck, his face is in front of the bar; the bar is perfectly horizontal and level, seen end-on so the near plate covers the far plate; "
                  "both hands gripping the bar just outside his shoulders. Feet flat, slightly wider than shoulder width. No squat rack."),
        "a": "standing tall at the top of a back squat, hips and knees fully extended, chest up, eyes forward.",
        "b": ("bottom of the back squat: hips pushed back and down until thighs are parallel to the floor, knees forward over the toes, "
              "back straight and leaning forward about 40 degrees, heels flat on the floor, bar stays directly over the middle of the feet."),
    },
    "db-bench": {
        "ref": "Dumbbell_Bench_Press", "layout": "tb",
        "scene": ("Strict side view. A flat black weight bench runs horizontally across the panel; the man lies on his back on it, head on the right end, "
                  "feet flat on the floor at the left end, knees bent. He holds one black hexagonal dumbbell in each hand."),
        "a": "arms straight up, dumbbells pressed directly above his chest, elbows almost locked.",
        "b": ("both dumbbells lowered to the same height, one on each side of his chest at nipple level, symmetrical, the far dumbbell mostly hidden behind his chest; "
              "elbows bent about 90 degrees, slightly below bench level, tucked about 45 degrees from his torso, chest stretched. No dumbbell floats above him."),
    },
    "bb-row": {
        "ref": "Bent_Over_Barbell_Row", "layout": "lr",
        "scene": ("Strict side view, the man faces right. He holds an Olympic barbell with black bumper plates with an overhand grip, "
                  "hinged forward at the hips about 45 degrees, back perfectly straight, knees slightly bent, feet hip-width apart."),
        "a": "arms hanging straight down, barbell just below his knees.",
        "b": "barbell pulled up to his lower ribs / belly button, elbows driven back behind his torso, shoulder blades squeezed, torso angle unchanged.",
    },
    "lat-pulldown": {
        "ref": "Wide-Grip_Lat_Pulldown", "layout": "lr",
        "scene": ("Three-quarter rear side view. The man sits on a dark-grey lat pulldown machine, thighs locked under the knee pads, "
                  "gripping a long straight lat bar wider than shoulder width; the cable runs vertically up from the bar to a pulley at the top of the machine."),
        "a": "arms fully extended overhead holding the bar, torso upright, slight lean back.",
        "b": "bar pulled down to the top of his chest just under the chin, elbows driven down and back, chest lifted, lats clearly contracted.",
    },
    "deadlift": {
        "ref": "Barbell_Deadlift", "layout": "lr",
        "scene": ("Strict side view, the man faces right. An Olympic barbell with large black bumper plates sits on the floor over the middle of his feet, "
                  "close to his shins; he grips it with both hands just outside his legs."),
        "a": "setup at the bottom: hips hinged, knees bent, back flat, shoulders slightly in front of the bar, arms straight, bar on the floor.",
        "b": "lockout at the top: standing tall, hips and knees fully extended, shoulders back, bar resting against the front of his thighs, no leaning back.",
    },
    "ohp": {
        "ref": "Barbell_Shoulder_Press", "layout": "lr",
        "scene": ("Strict side view, the man faces right, standing, feet hip-width apart. He holds an Olympic barbell with black bumper plates, "
                  "hands slightly wider than his shoulders. Strict side profile view in both panels; the bar stays perfectly horizontal and level, seen end-on so the near plate covers the far plate. No rack."),
        "a": "barbell resting at the front of his shoulders at collarbone height, forearms vertical, elbows slightly in front of the bar.",
        "b": "barbell pressed straight overhead with arms fully extended, bar directly above the middle of his feet, head slightly through the arms, torso not leaning back.",
    },
    "bb-curl": {
        "ref": "Barbell_Curl", "layout": "lr",
        "scene": ("Strict side view, the man faces right, standing tall. He holds a straight barbell with small black plates using an underhand grip "
                  "(palms facing forward), hands shoulder-width apart, upper arms pinned to his sides."),
        "a": "arms fully extended, barbell hanging in front of his thighs.",
        "b": "barbell curled up to chest height, forearms close to vertical, elbows still at his sides and not moving forward, biceps clearly contracted.",
    },
    "hip-thrust": {
        "ref": "Barbell_Hip_Thrust", "layout": "tb",
        "scene": ("Strict side view, the man's head is on the right. His upper back rests on the edge of a flat black bench placed on the right, "
                  "feet flat on the floor on the left, knees bent. An Olympic barbell with black bumper plates and a thick foam pad lies across his hip crease, "
                  "both hands holding the bar."),
        "a": ("hips sunk LOW, buttocks only a few centimetres above the floor, torso sloping steeply down from the bench edge to the hips, "
              "knees bent more than 90 degrees, bar resting on the hips near the floor."),
        "b": ("hips driven up so shoulders, hips and knees form one straight horizontal line, shins vertical, knees at 90 degrees, "
              "chin tucked, glutes squeezed, lower back not over-arched."),
    },
    "plank": {
        "ref": "Plank", "layout": "tb",
        "scene": "The man holds a forearm plank on a black yoga mat on the floor.",
        "a": ("strict side view, head on the right: forearms on the mat with elbows directly under the shoulders, on his toes, "
              "body in one straight line from head to heels, hips neither sagging nor raised."),
        "b": ("the same forearm plank seen from a front three-quarter view slightly from above, showing the braced abs and shoulders, "
              "body still in one straight line."),
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
        raise RuntimeError(f"HTTP {e.code}: {e.read()[:300].decode(errors='ignore')}")


def save(resp, path):
    item = resp["data"][0]
    data = base64.b64decode(item["b64_json"]) if item.get("b64_json") else urllib.request.urlopen(item["url"], timeout=120).read()
    with open(path, "wb") as f:
        f.write(data)


def build_prompt(m):
    if m["layout"] == "lr":
        grid, p1, p2 = "split exactly down the middle into a LEFT panel and a RIGHT panel of equal width", "LEFT panel (start)", "RIGHT panel (finish)"
    else:
        grid, p1, p2 = "split exactly across the middle into a TOP panel and a BOTTOM panel of equal height", "TOP panel (start)", "BOTTOM panel (finish)"
    return ("The two reference photos show the start and the finish of the exercise; use them only for the poses, the equipment and "
            "where the man is relative to the equipment. " + STYLE + f" A two-panel instructional image {grid}, separated by a thin empty white gap. "
            "Both panels show the SAME man and the SAME identical equipment from the SAME camera angle and scale; only the movement phase differs. "
            + m["scene"] + f" {p1}: " + m["a"] + f" {p2}: " + m["b"])


def split(pair, name, layout):
    """按画面里的白色中缝切开（sips 的偏移裁切不可靠，曾把两格中间切成一张）。需要 Pillow：
    python3 -m venv /tmp/imgenv && /tmp/imgenv/bin/pip install pillow"""
    py = os.environ.get("PIL_PYTHON", "/tmp/imgenv/bin/python")
    subprocess.run([py, os.path.join(ROOT, "tools", "split_pairs.py"), pair, os.path.join(OUT, name), layout], check=True)


def gen(name, model, tag=""):
    m = MOVES[name]
    size = "2048x1536" if m["layout"] == "lr" else "1536x2048"
    pair = f"/tmp/{name}-pair{tag}.jpg"
    save(post("/images/edits", {"model": model, "prompt": build_prompt(m), "size": size, "n": 1, "watermark": "false"},
              [fetch_ref(m["ref"], 0), fetch_ref(m["ref"], 1)]), pair)
    return pair


def main():
    if "--list" in sys.argv:
        print("\n".join(MOVES)); return
    model = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else "doubao-seedream-5-0-pro"
    names = [a for a in sys.argv[1:] if a in MOVES]
    os.makedirs(OUT, exist_ok=True)
    for name in names:
        try:
            pair = gen(name, model)
            print("双拼图", name, pair, flush=True)
            if "--split" in sys.argv:
                split(pair, name, MOVES[name]["layout"])
        except Exception as e:
            print("失败", name, e, flush=True)


if __name__ == "__main__":
    main()
