// 文案生成器（小红书三种语气）。依赖 copy-data.js、move-meta.js、details.js。
// 同一个 seed 得到同一版；点「换一版」换 seed，句式、标题、结尾都会变。

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cut = (s) => String(s || "").replace(/[。；;，,.\s]+$/, "");
const headClause = (s) => cut(String(s || "").split(/[，。；]/)[0]);

// 把一次生成需要的素材收在一起
function copyContext(region, moveName, scene, seed) {
  const r = REGIONS.find((x) => x.id === region);
  const move = r && r.moves.find((m) => m.name === moveName);
  if (!r || !move) return null;
  const rand = makeRng(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const mm = moveMeta(moveName);
  const d = DETAILS[moveName] || {};
  return {
    r, move, mm, d, pick, rand, mv: moveName, scene,
    gc: GROUP_COPY[region] || {}, cc: CAT_COPY[mm.cat] || CAT_COPY.C,
    steps: move.steps.map(cut), mist: (d.mistakes || []).map(cut)
  };
}

function makeTitles(c) {
  const { r, mv, gc, mm, pick, scene } = c;
  const pool = [
    gc.pain && `${headClause(gc.pain)}？先看${mv}`,
    `${mv}，${gc.fix || "细节比重量重要"}`,
    `${r.name}不长，可能是${mv}没做对`,
    `${mv}怎么做才练得到${r.group}`,
    `${mm.start.split(/[；，、]/)[0]}就够了，${mv}入门`,
    `${headClause(scene)}练${r.name}，我只做${mv}`,
    c.mist[0] && `${mv}别这样做：${headClause(c.mist[0])}`,
    gc.tip && `练${r.group}：${headClause(gc.tip)}`
  ].filter(Boolean).map((t) => (t.length > 24 ? t.slice(0, 23) + "…" : t));
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(c.rand() * pool.length), 1)[0]);
  return out;
}

function makeTags(c, platform) {
  const base = [c.r.name, c.mv, `${c.r.group}训练`];
  const more = platform === "douyin" ? ["健身教学", "跟练", "健身小白"] : ["健身干货", "训练记录", "健身小白"];
  return [...base, ...more].map((t) => `#${t}`).join(" ");
}

function xhsPlain(c) {
  const { r, mv, gc, cc, mm, d, pick, scene } = c;
  const L = [];
  L.push(pick([
    `${mv}这个动作，我刚开始练的时候做错了好几个月。`,
    `${cut(gc.pain)}。如果你也是，先看看你的${mv}是不是这样做的。`,
    `今天在${scene}练${r.name}，顺手把${mv}的要点记下来。`,
    `${mv}看着简单，真做起来很容易做偏。`,
    `练${r.name}的话，${mv}我基本每周都会排上。`
  ]));
  L.push(`${cut(cc.why)}。`);
  if (d.setup) L.push(`准备姿势：${cut(d.setup)}。`);
  L.push(pick(["具体怎么做：", "我拆成几步：", "动作就这几步："]) + "\n" + c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
  if (c.mist.length) L.push(pick(["最容易出问题的地方：", "做错的人通常是这样：", "几个常见的错："]) + "\n" + c.mist.slice(0, 3).map((m) => `· ${m}`).join("\n"));
  L.push(`做对的时候，感觉是${cut(gc.feel)}。感觉不对，就想想这句：${cut(gc.fix)}。`);
  L.push(`我一般这样排：${cut(c.move.dose)}。器械：${cut(c.move.gear)}。入门重量：${cut(mm.start)}。${cut(cc.progress)}。${mm.rest}`);
  if (d.easier) L.push(`做不动，或者哪里不舒服：${cut(d.easier)}。`);
  if (gc.tip) L.push(`${cut(gc.tip)}。`);
  L.push(pick([gc.ask, "觉得有用就先收藏，练的时候再翻出来对一下。", "先照着做两周，再回来看有没有变化。"]).trim());
  return L.join("\n\n");
}

function xhsCoach(c) {
  const { r, mv, gc, cc, mm, d } = c;
  const L = [`【${mv}】${cut(gc.fix)}。\n${cut(gc.pain)}，多半是这里没做对。`];
  if (d.setup) L.push(`【准备】\n${cut(d.setup)}。`);
  L.push("【步骤】\n" + c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
  if (c.mist.length) L.push("【别这样】\n" + c.mist.slice(0, 3).map((m) => `× ${m}`).join("\n"));
  L.push(`【对的感觉】\n${cut(gc.feel)}。`);
  L.push(`【安排】\n${cut(c.move.dose)}\n入门重量：${cut(mm.start)}\n${mm.tempo}\n${mm.rest}`);
  if (d.easier) L.push(`【做不了】\n${cut(d.easier)}。`);
  L.push(`${cut(cc.fail)}。`);
  return L.join("\n\n");
}

function xhsNote(c) {
  const { r, mv, gc, cc, mm, d, scene } = c;
  const now = new Date();
  const L = [`${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${r.name}日\n地点：${scene}`];
  L.push(`${mv}　${cut(c.move.dose)}\n器械：${cut(c.move.gear)}\n重量：${cut(mm.start)}`);
  L.push("今天盯的几个点\n" + c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
  if (c.mist.length) L.push("容易犯的\n" + c.mist.slice(0, 2).map((m) => `· ${m}`).join("\n"));
  L.push(`目标感受：${cut(gc.feel)}。\n提醒自己：${cut(gc.fix)}。`);
  L.push(`下次：${cut(cc.progress)}。\n${mm.rest}`);
  if (gc.ask) L.push(gc.ask);
  return L.join("\n\n");
}

function buildXhs(c, tone) {
  return tone === "coach" ? xhsCoach(c) : tone === "note" ? xhsNote(c) : xhsPlain(c);
}
