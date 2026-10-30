// 动作讲解卡片：参考「起始 / 完成并排 + 要点 + 易错 + 口诀」的版式。
// 一张放不下就拆成两张。示范照片来自 free-exercise-db，没有照片的动作不硬配。

function posterData(region, moveName) {
  const r = REGIONS.find((x) => x.id === region);
  const move = r && r.moves.find((m) => m.name === moveName);
  if (!r || !move) return null;
  const d = DETAILS[moveName] || {};
  const mm = moveMeta(moveName);
  const imgId = IMAGE_ID[moveName];
  const points = move.steps.slice(0, 3);
  const mistakes = (d.mistakes || []).slice(0, 3);
  const motto = (GROUP_COPY[region] && GROUP_COPY[region].fix) || points[0] || "";
  return {
    name: moveName, group: r.group, dose: move.dose, gear: move.gear,
    start: mm.start, tempo: mm.tempo.split("；")[0],
    main: mm.main.slice(0, 3), points, mistakes, motto,
    photos: imgId ? [0, 1].map((i) => `${IMG_BASE}${imgId}/${i}.jpg`) : null
  };
}

function posterHTML(p) {
  const ai = typeof aiPhotos === "function" ? aiPhotos(p.name) : null;
  const figs = ai ? {} : moveFigureSVGs(p.name) || {};
  const frame = (svg, cap) => `<figure class="pp-photo pp-draw"><figcaption>${cap}</figcaption>${svg}</figure>`;
  const aiFrame = (src, cap) => `<figure class="pp-photo pp-ai"><figcaption>${cap}</figcaption><img src="${src}" alt="${p.name} ${cap}"></figure>`;
  const photos = ai
    ? `<div class="pp-photos">${aiFrame(ai[0], "起始")}${aiFrame(ai[1], "动作完成")}</div>`
    : figs.a
    ? `<div class="pp-photos">${frame(figs.a, "起始")}${figs.b ? frame(figs.b, "动作完成") : ""}</div>`
    : `<p class="pp-nophoto">这个动作暂无示意图，请看动作卡片里的视频搜索。</p>`;
  const nums = ["一", "二", "三"];
  return `<section class="poster" id="poster">
    <header class="pp-head">
      <p>健身动作精讲 · ${p.group}</p>
      <h2>${p.name}</h2>
    </header>
    ${photos}
    <div class="pp-row">
      <div class="pp-box">
        <h3>主要参与</h3>
        <ul>${p.main.map((m) => `<li>${m}</li>`).join("") || "<li>—</li>"}</ul>
      </div>
      <div class="pp-box pp-wide">
        <h3>${p.points.length} 个关键点</h3>
        <ol>${p.points.map((s, i) => `<li><b>${nums[i]}</b><span>${s}</span></li>`).join("")}</ol>
      </div>
      <div class="pp-box pp-bad">
        <h3>常见错误</h3>
        <ul>${p.mistakes.map((m) => `<li><b>×</b><span>${m}</span></li>`).join("") || "<li>按步骤做，动作不变形</li>"}</ul>
      </div>
    </div>
    <div class="pp-motto"><span>记住这句</span><strong>${p.motto}</strong></div>
    <footer class="pp-foot">
      <span>${p.dose}</span><span>入门 ${p.start}</span><span>${p.tempo}</span>
    </footer>
    <p class="pp-credit">示意图为统一画风的动作示意，标色处是主要参与的肌肉。动作要对照真人示范视频，疼痛时停止并调整。</p>
  </section>`;
}

// 第二张：安排和饮食，第一张放不下的内容放这里
function posterExtraHTML(p, withDiet) {
  const diet = withDiet ? dietAdviceText(document.getElementById("d-goal").value).split("\n").slice(1) : [];
  return `<section class="poster" id="poster-extra">
    <header class="pp-head">
      <p>${p.name} · 怎么安排</p>
      <h2>组次、重量和吃法</h2>
    </header>
    <div class="pp-plan">
      <div><b>组次</b><span>${p.dose}</span></div>
      <div><b>器械</b><span>${p.gear}</span></div>
      <div><b>入门重量</b><span>${p.start}</span></div>
      <div><b>节奏</b><span>${p.tempo}</span></div>
    </div>
    ${diet.length ? `<div class="pp-box"><h3>练前练后怎么吃</h3><ul>${diet.map((s) => `<li>${s.replace(/^· /, "")}</li>`).join("")}</ul></div>` : ""}
    <p class="pp-credit">热量和吃法是估算，不是处方。有基础病或在减重，先问医生或营养师。</p>
  </section>`;
}
