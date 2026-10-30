// 文案生成逻辑。依赖前面所有 library/details/regions/body-shapes/muscle-map/move-meta/pose-engine/pose-lib。
// 第二页的表单事件在这里，和 app.js 互不干扰。

const muscleSelect = document.getElementById("f-muscle");
const moveSelect = document.getElementById("f-move");

function syncWriteSelects(regionId, moveName) {
  if (regionId) muscleSelect.value = regionId;
  const r = regionById[muscleSelect.value] || REGIONS[0];
  moveSelect.innerHTML = r.moves.map((mv) => `<option>${mv.name}</option>`).join("");
  if (moveName) moveSelect.value = moveName;
}

// 初始化下拉菜单
muscleSelect.innerHTML = REGIONS.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
muscleSelect.addEventListener("change", () => syncWriteSelects());
syncWriteSelects("chest", "哑铃卧推");

// ---- 生成封面图：正反面人体 + 局部肌肉放大 + 色块图例 ----
function coverFigure(regionId, moveNames) {
  const r = REGIONS.find((x) => x.id === regionId);
  if (!r) return "";
  const names = moveNames.slice(0, 2);
  const pList = names.map((n) => paintList(n)).flat();
  const seen = new Set();
  const muscles = [];
  pList.forEach((m) => { if (!seen.has(m.name)) { muscles.push(m); seen.add(m.name); } });
  if (muscles.length === 0) return "";
  const colors = muscles.map((m) => m.color);
  const mnames = muscles.map((m) => m.name);
  const l1 = FIG.regionLayers(regionId, "front", FIG.COLORS[0]);
  const l2 = FIG.regionLayers(regionId, "back", FIG.COLORS[0]);
  const FULL = [0, -2, 100, 224]; // 完整人体，保证正反两面都有图（不论该肌群在哪一面）
  const whole = `<div class="cover-row"><div class="cover-fig">${FIG.svg(l1, FULL)}<span>正面</span></div><div class="cover-fig">${FIG.svg(l2, FULL)}<span>背面</span></div></div>`;
  const partLayers = FIG.layers(mnames, { colors });
  const vbp = FIG.view(partLayers, 0.7, 1.55, 52);
  const parts = `<div class="cover-parts">${FIG.svg(partLayers, vbp)}</div>`;
  const tags = muscles.map((m, i) => `<span class="chip" style="color:${m.color};border-color:${m.color}">${m.name}</span>`).join("");
  return `${whole}${parts}<div class="cover-legend">${tags}</div>`;
}

// ---- 生成文案内容（不含渲染） ----
function regionMovesPost(region, moveName, scene, tone, withAI, platform, seed, withDiet) {
  const r = REGIONS.find((x) => x.id === region);
  const move = r && r.moves.find((m) => m.name === moveName);
  if (!r || !move) return { error: "找不到动作。" };
  const mm = moveMeta(moveName);
  const figures = moveFigureSVGs(moveName) || {};
  const hasAction = figures.a && figures.b;
  const poseFig = hasAction ? `<div class="post-poses"><div class="post-pose-col">${figures.a}<span>起始</span></div><div class="post-pose-col">${figures.b}<span>发力</span></div></div>` : "";
  const poseNote = figures.note ? `<p class="pose-note">${figures.note}</p>` : "";
  const legend = (figures.muscles || []).map((m) => `<span class="chip" style="color:${m.color};border-color:${m.color}">${m.color === "#14916d" ? "主练" : "协同"} · ${m.name}</span>`).join("");

  const c = copyContext(region, moveName, scene, seed || Date.now());
  if (!c) return { error: "找不到动作。" };
  const body = platform === "douyin" ? buildDouyin(c).text : buildXhs(c, tone);
  const diet = withDiet ? `\n\n${dietAdviceText(document.getElementById("d-goal").value)}` : "";
  const titles = makeTitles(c);
  const tags = makeTags(c, platform);
  const aiNote = withAI ? "\n\n由肌理助手生成，动作要看真人示范视频，请按自身情况调整。" : "";
  return { body: body + diet + aiNote, tags, poseFig, poseNote, legend, titles };
}

// ---- 渲染完整的文案卡片 ----
let globalSeed = Date.now();
function renderPost(region, moveName, scene, tone, withAI, platform, withDiet) {
  const r = REGIONS.find((x) => x.id === region);
  const move = r && r.moves.find((m) => m.name === moveName);
  if (!r || !move) return "<p>找不到动作。</p>";
  const post = regionMovesPost(region, moveName, scene, tone, withAI, platform, globalSeed, withDiet);
  if (post.error) return `<p>${post.error}</p>`;
  const p = posterData(region, moveName);
  return `<article class="note-post" id="note-post">
      ${posterHTML(p)}
      ${withDiet ? posterExtraHTML(p, true) : ""}
      <pre class="post-body">${post.body}</pre>
      <p class="tags">${post.tags}</p>
    </article>
    <div class="alts">
      <p class="rail-title">另外两个标题</p>
      <ul>${post.titles.slice(1).map((t) => `<li>${t}</li>`).join("")}</ul>
      <div class="export-row">
        <button type="button" class="ghost" id="copy">复制正文</button>
        <button type="button" class="ghost" id="reseed">换一版</button>
        <button type="button" class="ghost" id="export-text">导出文案</button>
        <button type="button" class="ghost" id="export-img">导出图片</button>
      </div>
      <p class="copied" id="copied" hidden>已复制。到小红书或抖音 App 里粘贴，自己发。</p>
    </div>`;
}

// ---- 表单提交事件 ----
function showPost() {
  const r = muscleSelect.value;
  const m = moveSelect.value;
  const sc = document.getElementById("f-scene").value.trim() || "健身房";
  const t = document.getElementById("f-tone").value;
  const ai = document.getElementById("f-ai").checked;
  const diet = document.getElementById("f-diet").checked;
  const pf = document.getElementById("f-platform").value;
  const out = document.getElementById("output");
  out.innerHTML = renderPost(r, m, sc, t, ai, pf, diet);
  out.hidden = false;
  const data = regionMovesPost(r, m, sc, t, ai, pf, globalSeed, diet);
  if (data.error) return;
  const full = `${data.titles[0]}\n\n${data.body}\n\n${data.tags}`;
  document.getElementById("copy").onclick = async () => {
    await navigator.clipboard.writeText(full);
    document.getElementById("copied").hidden = false;
  };
  document.getElementById("reseed").onclick = () => { globalSeed = Date.now(); showPost(); };
  document.getElementById("export-text").onclick = () => {
    const blob = new Blob([full], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${m}-文案.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  document.getElementById("export-img").onclick = () => exportPosters(m);
}

document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  globalSeed = Date.now();
  showPost();
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});

// 把讲解卡片按原样导出成图片。卡片本身就是按导出尺寸排的，一张放不下时页面上已经拆成两张。
function exportPosters(moveName) {
  const cards = [...document.querySelectorAll("#note-post .poster")];
  const btn = document.getElementById("export-img");
  btn.disabled = true;
  btn.textContent = "正在导出…";
  Promise.all(cards.map((card, i) => cardToPNG(card).then((url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${moveName}-讲解${cards.length > 1 ? i + 1 : ""}.png`;
    a.click();
  }))).finally(() => { btn.disabled = false; btn.textContent = "导出图片"; });
}

function cardToPNG(card) {
  return html2canvas(card, { scale: 2, backgroundColor: "#f4f7fb", useCORS: true }).then((c) => c.toDataURL("image/png"));
}
