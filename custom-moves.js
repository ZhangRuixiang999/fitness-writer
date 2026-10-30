// 把「动作检索」里加入的动作并入动作库。数据存在浏览器 localStorage，只在这台设备上有效。
// 必须在 app.js 之前加载（那时才会画肌群列表）。

const CUSTOM_KEY = "jili.customMoves.v1";

function loadCustomMoves() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); } catch (e) { return []; }
}
function saveCustomMoves(list) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

// item: {region, id, name, dose, gear, steps, imgId, diff, cat, mistakes?}
function applyCustomMove(item) {
  const r = REGIONS.find((x) => x.id === item.region);
  if (!r || r.moves.some((m) => m.name === item.name)) return false;
  r.moves.push({ name: item.name, dose: item.dose, gear: item.gear, steps: item.steps });
  DETAILS[item.name] = { ...(DETAILS[item.name] || {}), setup: item.setup || "", kw: item.kw || `${item.name} 教学`, mistakes: item.mistakes || [], easier: item.easier || "" };
  if (item.imgId) IMAGE_ID[item.name] = item.imgId;
  META[item.name] = [3, item.diff || 3, item.gear, item.cat || "C", "", ""];
  return true;
}

loadCustomMoves().forEach(applyCustomMove);
