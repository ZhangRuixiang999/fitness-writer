// 抖音口播脚本：每个镜头给出「画面 / 口播 / 字幕」，按口播字数估算每段时长。

function buildDouyin(c) {
  const { r, mv, gc, cc, mm, d, pick } = c;
  const hook = pick([
    `${headClause(gc.pain)}？先别急着加重量。`,
    `${r.name}怎么练都没感觉？看这个动作。`,
    `${mv}，别再这样做了。`,
    `${mv}做对了，${r.group}自己会告诉你。`
  ]);
  const shots = [];
  shots.push({ name: "开场", visual: `直接拍${mv}的起始姿势，镜头推近`, say: hook, sub: `${mv}｜${r.group}` });
  shots.push({ name: "准备", visual: "侧面全身，停在起始位置", say: `先把姿势摆好。${cut(d.setup || c.steps[0])}。`, sub: "起始姿势" });
  const doing = c.steps.slice(d.setup ? 0 : 1, 4);
  shots.push({ name: "示范", visual: "侧面慢动作做完整一次，再正面补一次", say: doing.length ? `${doing.join("，")}。${cut(mm.tempo.split("；")[0])}。` : `${cut(mm.tempo)}。`, sub: "发力要点" });
  if (c.mist.length) shots.push({ name: "易错", visual: "把错误动作做一遍，再做正确的对比", say: `最容易错的是${c.mist[0]}。${c.mist[1] ? "还有，" + c.mist[1] + "。" : ""}${cut(gc.fix)}。`, sub: "别这样做" });
  shots.push({ name: "感觉", visual: "近景，手指点出发力的位置", say: `做对的时候，${cut(gc.feel)}。`, sub: "对的感觉" });
  shots.push({ name: "收尾", visual: "站直，面对镜头", say: `${cut(c.move.dose)}，入门重量${cut(mm.start.split(/[；，。]/)[0])}。${pick([cut(gc.ask || "你练过吗"), "觉得有用就先收藏", "照着练两周，回来告诉我"])}？`.replace(/？？$/, "？"), sub: "收藏起来练" });
  let t = 0;
  const lines = shots.map((s, i) => {
    const sec = Math.max(3, Math.round(s.say.replace(/[，。？！、\s]/g, "").length / 4.5));
    const text = `【镜头${i + 1}｜${s.name}｜${t}–${t + sec} 秒】\n画面：${s.visual}\n口播：${s.say}\n字幕：${s.sub}`;
    t += sec;
    return text;
  });
  return { text: lines.join("\n\n") + `\n\n合计约 ${t} 秒。`, seconds: t };
}
