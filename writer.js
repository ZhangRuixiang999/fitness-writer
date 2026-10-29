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
function regionMovesPost(region, moveName, scene, tone, withAI, platform) {
  const r = REGIONS.find((x) => x.id === region);
  const move = r && r.moves.find((m) => m.name === moveName);
  if (!r || !move) return { error: "找不到动作。" };
  const mm = moveMeta(moveName);
  const figures = moveFigureSVGs(moveName) || {};
  const hasAction = figures.a && figures.b;
  const poseFig = hasAction ? `<div class="post-poses"><div class="post-pose-col">${figures.a}<span>起始</span></div><div class="post-pose-col">${figures.b}<span>发力</span></div></div>` : "";
  const poseNote = figures.note ? `<p class="pose-note">${figures.note}</p>` : "";
  
  const gc = GROUP_COPY[r.id] || {};
  const cc = CAT_COPY[mm.cat] || {};
  const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)].replace("{move}", moveName).replace("{region}", r.name).replace("{scene}", scene);
  const closer = CLOSERS[Math.floor(Math.random() * CLOSERS.length)];
  const tips = move.steps.slice(0, 4);
  
  let body;
  if (tone === "plain") {
    body = `${opener}\n\n做对的感觉：${gc.feel || "目标肌肉在发力"}。\n\n${tips.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n${cc.why || ""}，${cc.progress || ""}。\n\n入门重量：${mm.start}。${gc.tip || ""}\n\n${closer}`;
  } else if (tone === "coach") {
    body = `${gc.pain || `${r.name}练不到位`}？看${moveName}这几步。\n\n${tips.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n${mm.tempo}\n\n${gc.fix || "慢一点，稳一点。"}\n\n${move.dose}，${mm.start}。`;
  } else {
    body = `${scene}｜${r.name}\n\n主打：${moveName}，${move.dose}\n\n${tips.join("\n")}\n\n${mm.rest}\n入门：${mm.start}\n推荐 ${stars(mm.rec)}，难度 ${stars(mm.diff)}\n\n${gc.ask || ""}`;
  }
  if (platform === "douyin") {
    const shots = tips.map((s, i) => `镜头${i + 2}：${s}`).join("\n");
    body = `【口播脚本 · 约 45 秒】\n镜头1（开场，2 秒内抛问题）：${gc.pain || `${r.name}练不到`}？${moveName}先看这一步。\n${shots}\n镜头${tips.length + 2}（收尾）：4 组 × 8–10 次，入门重量 ${mm.start}。${gc.fix || ""}\n\n字幕要点：${gc.feel || "目标肌肉在发力"}`;
  }
  if (withAI) body += `\n\n由肌理助手生成，动作要看真人示范视频，请按自身情况调整。`;
  const tags = platform === "douyin" ? `#${r.name} #${moveName} #健身教学 #跟练` : `#${r.name} #${moveName} #健身干货 #训练记录`;
  const titles = {
    plain: [`${gc.pain ? gc.pain.split("，")[0] : r.name + "别只看镜子"}`, `${moveName}，${gc.fix || "这 1 步别漏"}`, `${scene ? scene.split("，")[0] : "健身房"}练${r.group}`],
    coach: [`${moveName}，${gc.fix || "先把动作做对"}`, `${r.name}${gc.tip ? "：" + gc.tip.split("，")[0] : "发力这 3 点"}`, `${r.group}怎么练才有效`],
    note: [`训练｜${moveName}`, `${r.name} · ${move.dose}`, `${scene ? scene.split("，")[0] : "健身房"}的${r.group}课`]
  }[tone];
  return { body, tags, poseFig, poseNote, titles };
}

// ---- 渲染完整的文案卡片 ----
function renderPost(region, moveName, scene, tone, withAI, platform) {
  const r = REGIONS.find((x) => x.id === region);
  const move = r && r.moves.find((m) => m.name === moveName);
  if (!r || !move) return "<p>找不到动作。</p>";
  const cover = coverFigure(region, [moveName]);
  const post = regionMovesPost(region, moveName, scene, tone, withAI, platform);
  if (post.error) return `<p>${post.error}</p>`;
  return `<article class="note-post">
      <div class="cover-wrap"><h2 class="cover-title">${post.titles[0]}</h2>${cover}</div>
      ${post.poseFig}${post.poseNote}
      <pre class="post-body">${post.body}</pre>
      <p class="tags">${post.tags}</p>
    </article>
    <div class="alts">
      <p class="rail-title">另外两个标题</p>
      <ul>${post.titles.slice(1).map((t) => `<li>${t}</li>`).join("")}</ul>
      <button type="button" class="ghost" id="copy">复制正文</button>
      <p class="copied" id="copied" hidden>已复制。到小红书或抖音 App 里粘贴，自己发。</p>
    </div>`;
}

// ---- 表单提交事件 ----
document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = muscleSelect.value;
  const m = moveSelect.value;
  const sc = document.getElementById("f-scene").value.trim() || "健身房";
  const t = document.getElementById("f-tone").value;
  const ai = document.getElementById("f-ai").checked;
  const pf = document.getElementById("f-platform").value;
  const out = document.getElementById("output");
  out.innerHTML = renderPost(r, m, sc, t, ai, pf);
  out.hidden = false;
  const data = regionMovesPost(r, m, sc, t, ai, pf);
  if (data.error) return;
  document.getElementById("copy").onclick = async () => {
    await navigator.clipboard.writeText(`${data.titles[0]}\n\n${data.body}\n\n${data.tags}`);
    document.getElementById("copied").hidden = false;
  };
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});
