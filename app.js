// 依赖（按顺序加载）：library.js → details.js → regions.js → body-shapes.js → muscle-map.js → move-meta.js → app.js → writer.js

const SVG_NS = "http://www.w3.org/2000/svg";
const view = { selected: null };
const bodyEl = document.getElementById("body");
const list = document.getElementById("muscle-list");
const hint = document.getElementById("hint");
const HINT_DEFAULT = "点身体上的一块区域，或点右侧名称，下面展开训练";
const regionById = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

// ---------- 人体图：正面在左，背面在右，默认灰色 ----------
function polygons(side, dx) {
  return BODY_SHAPES[side].map(([id, pts]) => {
    const t = `translate(${dx},0)`;
    if (!id) return `<polygon class="mz-static" points="${pts}" transform="${t}"/>`;
    return `<polygon class="mz" data-id="${id}" points="${pts}" transform="${t}"><title>${regionById[id].name}</title></polygon>`;
  }).join("");
}

function drawBody() {
  bodyEl.innerHTML = `
    ${polygons("front", 6)}
    ${polygons("back", 124)}
    <text class="cap" x="56" y="209" text-anchor="middle">正面</text>
    <text class="cap" x="174" y="209" text-anchor="middle">背面</text>`;
  paintSelection();
}

function paintSelection() {
  bodyEl.querySelectorAll(".mz").forEach((p) => p.classList.toggle("on", p.dataset.id === view.selected));
  list.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.id === view.selected));
}

function drawList() {
  list.innerHTML = "";
  REGIONS.forEach((r) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = r.id;
    btn.innerHTML = `${r.name}<small>${r.moves.length} 个动作</small>`;
    li.appendChild(btn);
    list.appendChild(li);
  });
  document.querySelector(".rail-title").textContent = `共 ${REGIONS.length} 个肌群`;
}

// ---------- 细分肌肉卡片：位置图 + 作用 ----------
function renderPart(p) {
  const L = LOC[p.name];
  const deep = L.it.some((it) => it.deep);
  return `
    <article class="part">
      ${locationFigure(p.name)}
      <div class="part-body">
        <h4>${p.name} <span>${p.en}</span>${deep ? '<em class="chip deep">深层</em>' : ""}</h4>
        <p class="at">📍 ${L.at}</p>
        <p class="role-s">${p.role}</p>
        <p class="cnt">相关动作 ${p.moves.length} 个：${p.moves.map((m) => m.name).join("、")}</p>
      </div>
    </article>`;
}

// ---------- 展开某个肌群 ----------
function openRegion(id) {
  const r = regionById[id];
  if (!r) return;
  view.selected = id;
  paintSelection();
  hint.textContent = `${r.name} · ${r.en}`;
  const detail = document.getElementById("detail");
  detail.hidden = false;
  document.getElementById("d-group").textContent = r.group;
  document.getElementById("d-name").textContent = r.name;
  document.getElementById("d-en").textContent = `${r.en} · ${r.moves.length} 个动作`;
  document.getElementById("d-role").textContent = r.role;
  document.getElementById("parts").innerHTML = `
    <h3 class="parts-title">这一块包含 ${r.partInfo.length} 块肌肉，各自在哪里</h3>
    <p class="parts-note">示意图：绿色是这块肌肉的大致位置，虚线表示在深层，右上角小图是它在整个身体上的位置。</p>
    <div class="parts-grid">${r.partInfo.map(renderPart).join("")}</div>`;
  document.getElementById("moves").innerHTML = r.moves.map((mv, i) => renderMove(mv, i === 0)).join("");
  // 让文案页的下拉菜单同步更新
  if (typeof syncWriteSelects !== "undefined") syncWriteSelects(r.id, r.moves[0].name);
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function videoLinks(move) {
  const d = DETAILS[move.name] || {};
  const kw = d.kw || `${move.name} 教学`;
  return {
    bili: `https://search.bilibili.com/all?keyword=${encodeURIComponent(kw)}`,
    douyin: `https://www.douyin.com/search/${encodeURIComponent(kw)}`
  };
}

function renderMove(move, open) {
  const d = DETAILS[move.name] || {};
  const v = videoLinks(move);
  const li = (arr) => arr.map((s) => `<li>${s}</li>`).join("");
  const imgId = IMAGE_ID[move.name];
  const photos = imgId
    ? `<div class="photos">
        <figure><img loading="lazy" src="${IMG_BASE}${imgId}/0.jpg" alt="${move.name} 起始位置" /><figcaption>起始</figcaption></figure>
        <figure><img loading="lazy" src="${IMG_BASE}${imgId}/1.jpg" alt="${move.name} 结束位置" /><figcaption>结束</figcaption></figure>
      </div>`
    : `<div class="photos none">这个动作暂无示范图，请看下方视频搜索。</div>`;
  const mm = moveMeta(move.name);
  const stats = `<div class="stats">
        <span title="${REC_TEXT[mm.rec]}">推荐 <b>${stars(mm.rec)}</b></span>
        <span title="${DIFF_TEXT[mm.diff]}">难度 <b>${stars(mm.diff)}</b></span>
        <span>入门重量 <b>${mm.start}</b></span>
        <span>主练 <b>${mm.main.join("、") || "—"}</b></span>
      </div>`;
  const block = (title, body) => (body ? `<section><h4>${title}</h4>${body}</section>` : "");
  return `
    <details class="move"${open ? " open" : ""}>
      <summary class="move-head">
        <h3>${move.name}</h3>
        <span class="dose">${move.dose}</span>
      </summary>
      ${stats}
      <div class="move-body">
        ${photos}
        <div class="move-text">
          ${block("起始姿势", d.setup && `<p>${d.setup}</p>`)}
          ${block("动作步骤", `<ol class="steps">${li(move.steps)}</ol>`)}
          ${block("节奏与呼吸", d.tempo && `<p>${d.tempo}</p>`)}
        </div>
        <div class="move-text">
          ${block("常见错误", d.mistakes && `<ul class="mistakes">${li(d.mistakes)}</ul>`)}
          ${block("做不到或不舒服", d.easier && `<p>${d.easier}</p>`)}
          ${block("组间休息", d.rest && `<p>${d.rest}</p>`)}
          ${block("器械", `<p>${move.gear}。${NOTE}</p>`)}
        </div>
      </div>
      <footer class="videos">
        <span>看示范视频</span>
        <a href="${v.bili}" target="_blank" rel="noopener noreferrer">B站搜索</a>
        <a href="${v.douyin}" target="_blank" rel="noopener noreferrer">抖音搜索</a>
        <button type="button" class="ghost write-btn" data-write="${move.name}">为这个动作生成文案 →</button>
      </footer>
    </details>`;
}

// ---------- 事件 ----------
bodyEl.addEventListener("click", (e) => {
  const id = e.target.dataset && e.target.dataset.id;
  if (id) openRegion(id);
});
bodyEl.addEventListener("mouseover", (e) => {
  const id = e.target.dataset && e.target.dataset.id;
  if (id) hint.textContent = `点击查看：${regionById[id].name}`;
});
bodyEl.addEventListener("mouseleave", () => {
  const r = regionById[view.selected];
  hint.textContent = r ? `${r.name} · ${r.en}` : HINT_DEFAULT;
});
list.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) openRegion(btn.dataset.id);
});
document.getElementById("close-detail").addEventListener("click", () => {
  view.selected = null;
  document.getElementById("detail").hidden = true;
  hint.textContent = HINT_DEFAULT;
  paintSelection();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function showPage(id) {
  document.querySelectorAll("[data-nav]").forEach((n) => n.classList.toggle("on", n.dataset.nav === id));
  document.getElementById("atlas").hidden = id !== "atlas";
  document.getElementById("write").hidden = id !== "write";
  window.scrollTo({ top: 0 });
}
document.querySelectorAll("[data-nav]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    showPage(a.dataset.nav);
  });
});

// 动作卡片上的「为这个动作生成文案」
document.getElementById("moves").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-write]");
  if (!btn) return;
  e.preventDefault();
  showPage("write");
  if (typeof syncWriteSelects !== "undefined") syncWriteSelects(view.selected, btn.dataset.write);
});

drawList();
drawBody();
