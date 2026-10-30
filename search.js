// 动作检索：联网读取开源动作库 free-exercise-db（800+ 个动作，公共领域），可按肌肉、器械、难度筛选，
// 一键加入自己的动作库。动作步骤是英文原文；中文关键词会换成对应的英文词再搜。

const FED_URLS = [
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json",
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
];
const FED_MUSCLE = {
  abdominals: ["腹肌", "abs"], abductors: ["髋外展肌", "glutes"], adductors: ["大腿内侧", "adductor"], biceps: ["肱二头肌", "biceps"],
  calves: ["小腿", "calves"], chest: ["胸", "chest"], forearms: ["前臂", "forearm"], glutes: ["臀", "glutes"], hamstrings: ["大腿后侧", "hamstring"],
  lats: ["背阔肌", "back"], "lower back": ["下背", "lowerback"], "middle back": ["中背", "back"], neck: ["颈", "neck"], quadriceps: ["大腿前侧", "quads"],
  shoulders: ["肩", "shoulder"], traps: ["斜方肌", "traps"], triceps: ["肱三头肌", "triceps"]
};
const FED_EQUIP = {
  "body only": "自重", barbell: "杠铃", dumbbell: "哑铃", cable: "绳索", machine: "器械", kettlebells: "壶铃", bands: "弹力带",
  "e-z curl bar": "曲杆", "exercise ball": "健身球", "foam roll": "泡沫轴", "medicine ball": "药球", other: "其他", None: "不限"
};
const FED_LEVEL = { beginner: "入门", intermediate: "中级", expert: "高级" };
// 中文关键词 → 英文搜索词
const ZH_WORDS = {
  深蹲: "squat", 卧推: "bench press", 硬拉: "deadlift", 划船: "row", 弯举: "curl", 俯卧撑: "push-up", 引体: "pull-up", 推举: "press",
  飞鸟: "fly", 平举: "raise", 下拉: "pulldown", 臀桥: "bridge", 提踵: "calf raise", 卷腹: "crunch", 平板: "plank", 弓步: "lunge",
  耸肩: "shrug", 腿举: "leg press", 腿弯举: "leg curl", 腿伸展: "leg extension", 臂屈伸: "dip", 下压: "pushdown", 面拉: "face pull",
  仰卧起坐: "sit-up", 登山: "mountain climber", 拉伸: "stretch", 俯身: "bent over", 单臂: "one arm", 侧: "side", 壶铃: "kettlebell"
};

let fedData = null;
let fedPromise = null;
function loadFed() {
  if (fedData) return Promise.resolve(fedData);
  if (!fedPromise) {
    fedPromise = (async () => {
      let lastErr;
      for (const u of FED_URLS) {
        try {
          const res = await fetch(u);
          if (!res.ok) throw new Error("HTTP " + res.status);
          fedData = await res.json();
          return fedData;
        } catch (e) { lastErr = e; }
      }
      fedPromise = null;
      throw lastErr;
    })();
  }
  return fedPromise;
}

const sEl = {
  q: document.getElementById("s-q"), muscle: document.getElementById("s-muscle"), equip: document.getElementById("s-equip"),
  level: document.getElementById("s-level"), status: document.getElementById("s-status"), out: document.getElementById("s-out"), form: document.getElementById("s-form")
};
sEl.muscle.innerHTML = `<option value="">全部肌肉</option>` + Object.entries(FED_MUSCLE).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("");
sEl.equip.innerHTML = `<option value="">全部器械</option>` + Object.entries(FED_EQUIP).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
sEl.level.innerHTML = `<option value="">全部难度</option>` + Object.entries(FED_LEVEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");

function expandQuery(q) {
  let s = q.trim().toLowerCase();
  Object.keys(ZH_WORDS).sort((a, b) => b.length - a.length).forEach((zh) => { s = s.split(zh).join(" " + ZH_WORDS[zh] + " "); });
  return s.split(/\s+/).filter(Boolean);
}

function searchFed(data) {
  const words = expandQuery(sEl.q.value);
  const m = sEl.muscle.value, e = sEl.equip.value, l = sEl.level.value;
  const hit = data.filter((x) => {
    if (m && !x.primaryMuscles.includes(m) && !x.secondaryMuscles.includes(m)) return false;
    if (e && x.equipment !== e) return false;
    if (l && x.level !== l) return false;
    const hay = `${x.name} ${x.equipment} ${x.primaryMuscles.join(" ")}`.toLowerCase().replace(/[-_]/g, " ");
    return words.every((w) => hay.includes(w.replace(/-/g, " ")));
  });
  // 主练命中的排前面
  hit.sort((a, b) => (m ? Number(b.primaryMuscles.includes(m)) - Number(a.primaryMuscles.includes(m)) : 0) || a.name.length - b.name.length);
  return hit;
}

function addedNames() { return new Set(loadCustomMoves().map((x) => x.name)); }

function fedCard(x, idx, have) {
  const prim = x.primaryMuscles.map((k) => (FED_MUSCLE[k] || [k])[0]);
  const sec = x.secondaryMuscles.map((k) => (FED_MUSCLE[k] || [k])[0]);
  const img = (i) => `<img loading="lazy" src="${IMG_BASE}${x.images[i]}" alt="${x.name} ${i ? "结束" : "起始"}" />`;
  const kw = encodeURIComponent(x.name + " 教学");
  const ytKw = encodeURIComponent(x.name + " exercise form");
  const added = have.has(x.name);
  return `<article class="fed">
    <div class="fed-photos">${x.images[0] ? img(0) : ""}${x.images[1] ? img(1) : ""}</div>
    <div class="fed-body">
      <h3>${x.name}</h3>
      <p class="fed-tags"><span class="chip">${FED_LEVEL[x.level] || x.level}</span> <span class="chip">${FED_EQUIP[x.equipment] || x.equipment}</span> <span class="chip">${x.mechanic === "isolation" ? "孤立动作" : x.mechanic === "compound" ? "复合动作" : x.category}</span></p>
      <p class="fed-line">主练：<b>${prim.join("、") || "—"}</b>${sec.length ? `　协同：${sec.join("、")}` : ""}</p>
      <details><summary>动作步骤（英文原文，${x.instructions.length} 步）</summary><ol class="steps">${x.instructions.map((s) => `<li>${s}</li>`).join("")}</ol></details>
      <div class="fed-actions">
        <a href="https://search.bilibili.com/all?keyword=${kw}" target="_blank" rel="noopener noreferrer">B站搜索</a>
        <a href="https://www.douyin.com/search/${kw}" target="_blank" rel="noopener noreferrer">抖音搜索</a>
        <a href="https://www.youtube.com/results?search_query=${ytKw}" target="_blank" rel="noopener noreferrer">YouTube</a>
        <button type="button" class="ghost" data-add="${idx}"${added ? " disabled" : ""}>${added ? "已在动作库" : "加入动作库"}</button>
      </div>
    </div>
  </article>`;
}

let lastHit = [];
let shown = 0;
const PAGE = 12;
function renderMore() {
  const have = addedNames();
  const slice = lastHit.slice(shown, shown + PAGE);
  sEl.out.insertAdjacentHTML("beforeend", slice.map((x, i) => fedCard(x, shown + i, have)).join(""));
  shown += slice.length;
  const more = document.getElementById("s-more");
  more.hidden = shown >= lastHit.length;
}

async function runSearch() {
  sEl.status.textContent = "正在联网读取动作库…";
  sEl.out.innerHTML = "";
  try {
    const data = await loadFed();
    lastHit = searchFed(data);
    shown = 0;
    sEl.status.textContent = lastHit.length ? `在 ${data.length} 个动作里找到 ${lastHit.length} 个` : `在 ${data.length} 个动作里没找到。试试换个词，或只选肌肉和器械。`;
    renderMore();
  } catch (e) {
    sEl.status.textContent = "联网失败：" + e.message + "。检查网络后再点一次搜索。";
  }
}

sEl.form.addEventListener("submit", (e) => { e.preventDefault(); runSearch(); });
["muscle", "equip", "level"].forEach((k) => sEl[k].addEventListener("change", runSearch));
document.getElementById("s-more").addEventListener("click", renderMore);

// 加入动作库：按主练肌肉归到对应肌群，存到本机
sEl.out.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn || btn.disabled) return;
  const x = lastHit[Number(btn.dataset.add)];
  const region = (FED_MUSCLE[x.primaryMuscles[0]] || [])[1];
  if (!region) { btn.textContent = "暂不支持该肌群"; return; }
  const cat = x.category === "stretching" ? "S" : x.equipment === "body only" ? "B" : x.mechanic === "isolation" ? "I" : "C";
  const item = {
    region, name: x.name, kw: x.name + " 教学",
    dose: cat === "S" ? "每侧 30 秒 × 2 组" : "3 组 × 8–12 次",
    gear: FED_EQUIP[x.equipment] || x.equipment,
    steps: x.instructions, imgId: x.images[0] ? x.images[0].split("/")[0] : "",
    diff: x.level === "beginner" ? 2 : x.level === "intermediate" ? 3 : 4, cat,
    setup: "步骤来自开源动作库，为英文原文，请对照示范图和视频学习。"
  };
  const list = loadCustomMoves();
  if (!list.some((m) => m.name === item.name)) { list.push(item); saveCustomMoves(list); }
  applyCustomMove(item);
  btn.textContent = "已在动作库";
  btn.disabled = true;
  drawList();
  paintSelection();
  if (typeof syncWriteSelects !== "undefined") syncWriteSelects();
  sEl.status.textContent = `已把「${x.name}」加到「${REGIONS.find((r) => r.id === region).name}」。回到首页点这个肌群就能看到。`;
});
