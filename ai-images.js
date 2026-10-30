// AI 生成的写实动作示范图。图片放在 ai-img/ 目录，命名为 <文件名>-a.jpg（起始）和 <文件名>-b.jpg（完成）。
// 图片放好后，把动作名加进 AI_READY，讲解卡就会用 AI 图；没加的动作继续用插画示意图。
const AI_IMG = {
  "杠铃深蹲": "squat",
  "哑铃卧推": "db-bench",
  "杠铃俯身划船": "bb-row",
  "高位下拉": "lat-pulldown",
  "传统硬拉": "deadlift",
  "杠铃肩推": "ohp",
  "杠铃弯举": "bb-curl",
  "绳索下压": "pushdown",
  "臀推": "hip-thrust",
  "平板支撑": "plank"
};

const AI_READY = [];

function aiPhotos(moveName) {
  const f = AI_IMG[moveName];
  if (!f || !AI_READY.includes(moveName)) return null;
  return [`ai-img/${f}-a.jpg`, `ai-img/${f}-b.jpg`];
}
