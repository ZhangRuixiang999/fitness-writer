// 肌肉涂色位置 + 动作姿势库 + 动作→姿势映射。依赖 pose-engine.js、move-meta.js、muscle-map.js。
// PATCH：肌肉 → [[部位, 起点0–1, 终点0–1, 前后(+1前 / -1后 / 0侧), 宽度比例], ...]
// 部位：T 躯干（髋→肩）｜Nk 颈｜U 上臂｜F 前臂｜Th 大腿｜Sh 小腿
const PATCH = {
  胸大肌: [["T", 0.6, 0.95, 1, 0.5]], 前锯肌: [["T", 0.4, 0.7, 0.45, 0.45]], 胸小肌: [["T", 0.65, 0.9, 0.5, 0.4]],
  三角肌前束: [["U", -0.05, 0.4, 1, 0.5]], 三角肌中束: [["U", -0.05, 0.4, 0, 0.6]], 三角肌后束: [["U", -0.05, 0.4, -1, 0.5]],
  肱二头肌: [["U", 0.3, 0.85, 1, 0.5]], 肱肌: [["U", 0.55, 0.92, 0.5, 0.4]], 肱三头肌: [["U", 0.12, 0.88, -1, 0.55]],
  前臂肌群: [["F", 0.05, 0.75, 0, 0.75]], 前臂伸肌群: [["F", 0.05, 0.75, -0.6, 0.55]], 肱桡肌: [["F", 0.05, 0.6, 0.6, 0.45]],
  桡侧腕屈肌: [["F", 0.2, 0.8, 0.6, 0.4]], 尺侧腕屈肌: [["F", 0.2, 0.8, -0.2, 0.4]], 掌长肌: [["F", 0.2, 0.8, 0.2, 0.35]], 旋前圆肌: [["F", 0.0, 0.4, 0.5, 0.4]],
  腹直肌: [["T", 0.08, 0.5, 1, 0.5]], 腹外斜肌: [["T", 0.15, 0.55, 0.35, 0.55]], 腹内斜肌: [["T", 0.05, 0.4, 0.2, 0.5]],
  斜方肌: [["T", 0.6, 1.0, -1, 0.5], ["Nk", 0, 1, -1, 0.7]], 背阔肌: [["T", 0.12, 0.7, -1, 0.65]], 大圆肌: [["T", 0.66, 0.84, -0.5, 0.4]],
  菱形肌: [["T", 0.6, 0.86, -0.75, 0.4]], 冈下肌: [["T", 0.72, 0.95, -0.4, 0.4]], 小圆肌: [["T", 0.7, 0.85, -0.3, 0.3]], 竖脊肌: [["T", 0.0, 0.62, -1, 0.35]],
  胸锁乳突肌: [["Nk", 0, 1, 0.6, 0.7]],
  臀大肌: [["T", -0.12, 0.2, -1, 0.65]], 臀中肌: [["T", -0.05, 0.14, -0.1, 0.6]], 阔筋膜张肌: [["Th", 0, 0.22, 0.6, 0.45]],
  髂腰肌: [["T", -0.05, 0.2, 0.8, 0.4]], 缝匠肌: [["Th", 0.1, 0.9, 0.6, 0.25]],
  股四头肌: [["Th", 0.15, 0.88, 1, 0.55]], 股直肌: [["Th", 0.15, 0.85, 0.9, 0.35]], 股内侧肌: [["Th", 0.5, 0.92, 0.85, 0.35]], 股外侧肌: [["Th", 0.2, 0.8, 0.5, 0.4]], 股中间肌: [["Th", 0.25, 0.8, 0.8, 0.4]],
  腘绳肌: [["Th", 0.15, 0.88, -1, 0.55]], 股二头肌: [["Th", 0.2, 0.88, -0.85, 0.4]], 半腱肌: [["Th", 0.2, 0.85, -0.7, 0.35]], 半膜肌: [["Th", 0.35, 0.9, -0.6, 0.35]],
  长收肌: [["Th", 0.1, 0.55, 0.1, 0.4]], 股薄肌: [["Th", 0.1, 0.8, -0.1, 0.25]], 耻骨肌: [["Th", 0, 0.25, 0.3, 0.4]],
  腓肠肌: [["Sh", 0.04, 0.55, -1, 0.6]], 比目鱼肌: [["Sh", 0.45, 0.92, -0.8, 0.45]], 胫骨前肌: [["Sh", 0.1, 0.85, 1, 0.5]], 腓骨肌: [["Sh", 0.1, 0.7, 0.1, 0.4]]
};

// 姿势：a 起始｜b 结束｜fix 对齐的关节｜mode｜prop 器械
const POSES = {
  squat: { a: { ua: 0 }, b: { tr: 38, th: 100, sh: -18, ft: 90, ua: 90, fa: 90 } },
  goblet: { a: { ua: 15, fa: 120 }, b: { tr: 25, th: 100, sh: -18, ua: 15, fa: 120 }, prop: ["db"] },
  backsquat: { a: { ua: -45, fa: 70 }, b: { tr: 40, th: 100, sh: -18, ua: -45, fa: 70 }, prop: ["plateS"] },
  lunge: { a: { th: 14, sh: 0, th2: -14, sh2: -6, ft2: 60 }, b: { th: 80, sh: -5, th2: -14, sh2: -80, ft2: 20 } },
  hipflex: { a: { th: 85, sh: 0, th2: 0, sh2: -90, ft2: -20 }, b: { th: 85, sh: 0, th2: 0, sh2: -90, ft2: -20 } },
  rdl: { a: { ua: 0 }, b: { tr: 75, th: 14, sh: 0, ua: 0, fa: 0 }, prop: ["db"] },
  rdlbar: { a: { ua: 0 }, b: { tr: 75, th: 14, sh: 0, ua: 0, fa: 0 }, prop: ["plateW"] },
  deadlift: { a: { tr: 55, th: 70, sh: -10, ua: 0, fa: 0 }, b: { ua: 0, fa: 0 }, prop: ["plateW"] },
  goodmorning: { a: { ua: -45, fa: 70 }, b: { tr: 70, th: 14, sh: 0, ua: -45, fa: 70 }, prop: ["plateS"] },
  pushup: { a: { tr: 74, th: -74, sh: -74, ft: -10, ua: 0, fa: 0 }, b: { tr: 84, th: -84, sh: -84, ft: -10, ua: -80, fa: 0 }, fix: "W" },
  plank: { a: { tr: 85, th: -85, sh: -85, ft: -10, ua: 0, fa: 90 }, fix: "W" },
  bench: { a: { tr: -90, th: 125, sh: 0, ft: 90, ua: 100, fa: 180 }, b: { tr: -90, th: 125, sh: 0, ft: 90, ua: 180, fa: 180 }, fix: "H", prop: ["bench", "plateW"] },
  benchdb: { a: { tr: -90, th: 125, sh: 0, ft: 90, ua: 100, fa: 180 }, b: { tr: -90, th: 125, sh: 0, ft: 90, ua: 180, fa: 180 }, fix: "H", prop: ["bench", "db"] },
  pullup: { a: { ua: 180, fa: 180, th: 0, sh: 10 }, b: { ua: 20, fa: 160, th: 0, sh: 10 }, mode: "anchor", prop: ["hangbar"] },
  hangleg: { a: { ua: 180, fa: 180, th: 0, sh: 0 }, b: { ua: 180, fa: 180, th: 88, sh: 88, ft: 120 }, mode: "anchor", prop: ["hangbar"] },
  pulldown: { a: { th: 80, sh: 5, ua: 175, fa: 175 }, b: { th: 80, sh: 5, ua: 12, fa: 168 }, fix: "H", prop: ["seat"] },
  rowseat: { a: { th: 90, sh: 78, ua: 90, fa: 90 }, b: { th: 90, sh: 78, ua: -35, fa: 78 }, fix: "H", prop: ["seat", "cable:1,0"] },
  rowbent: { a: { tr: 65, th: 20, sh: -8, ua: 0, fa: 0 }, b: { tr: 65, th: 20, sh: -8, ua: -70, fa: 0 }, prop: ["db"] },
  rowbar: { a: { tr: 65, th: 20, sh: -8, ua: 0, fa: 0 }, b: { tr: 65, th: 20, sh: -8, ua: -70, fa: 0 }, prop: ["plateW"] },
  curl: { a: { ua: 0, fa: 0 }, b: { ua: 0, fa: 155 }, prop: ["db"] },
  curlbar: { a: { ua: 0, fa: 0 }, b: { ua: 0, fa: 155 }, prop: ["plateW"] },
  pushdown: { a: { ua: 6, fa: 95 }, b: { ua: 6, fa: 4 }, prop: ["cable:0,-1"] },
  pressseat: { a: { th: 85, sh: 5, ua: 20, fa: 170 }, b: { th: 85, sh: 5, ua: 175, fa: 178 }, fix: "H", prop: ["seat", "db"] },
  pressmach: { a: { th: 85, sh: 5, ua: 20, fa: 170 }, b: { th: 85, sh: 5, ua: 175, fa: 178 }, fix: "H", prop: ["seat"] },
  pressbar: { a: { ua: 20, fa: 170 }, b: { ua: 175, fa: 178 }, prop: ["plateW"] },
  frontraise: { a: { ua: 0, fa: 0 }, b: { ua: 90, fa: 90 }, prop: ["db"] },
  facepull: { a: { ua: 90, fa: 90 }, b: { ua: -75, fa: 150 }, prop: ["cable:1,0"] },
  revfly: { a: { tr: 62, th: 14, sh: 0, ua: 0, fa: 0 }, b: { tr: 62, th: 14, sh: 0, ua: -78, fa: -78 }, prop: ["db"] },
  shrug: { a: { ua: 0, fa: 0 }, b: { ua: 0, fa: 0, su: 4 }, prop: ["db"] },
  shrugbar: { a: { ua: 0, fa: 0 }, b: { ua: 0, fa: 0, su: 4 }, prop: ["plateW"] },
  bridge: { a: { tr: -90, th: 130, sh: 0, ua: 90, fa: 90 }, b: { tr: -110, th: 110, sh: 0, ua: 90, fa: 90 } },
  bridge1: { a: { tr: -90, th: 130, sh: 0, ua: 90, fa: 90, th2: 130, sh2: 130, ft2: 160 }, b: { tr: -110, th: 110, sh: 0, ua: 90, fa: 90, th2: 110, sh2: 110, ft2: 160 } },
  thrust: { a: { tr: -90, th: 130, sh: 0, ua: 90, fa: 90 }, b: { tr: -110, th: 110, sh: 0, ua: 90, fa: 90 }, prop: ["plateH"] },
  kickback: { a: { tr: 78, th: 0, sh: -90, ft: -30, ua: 0, fa: 0, th2: 0, sh2: -90, ft2: -30 }, b: { tr: 78, th: -62, sh: -62, ft: -30, ua: 0, fa: 0, th2: 0, sh2: -90, ft2: -30 }, fix: "W" },
  birddog: { a: { tr: 78, th: 0, sh: -90, ft: -30, ua: 0, fa: 0, th2: 0, sh2: -90, ft2: -30 }, b: { tr: 78, th: 0, sh: -90, ft: -30, ua: 0, fa: 0, th2: -85, sh2: -85, ft2: -30, ua2: 90, fa2: 90 }, fix: "W" },
  sidelift: { a: { tr: -90, th: 90, sh: 90, ft: 160, ua: 90, fa: 90, th2: 90, sh2: 90, ft2: 160 }, b: { tr: -90, th: 60, sh: 60, ft: 130, ua: 90, fa: 90, th2: 90, sh2: 90, ft2: 160 }, fix: "H" },
  calf: { a: { ft: 90 }, b: { ft: 35 } },
  calfseat: { a: { th: 88, sh: 0, ft: 90, ua: 70, fa: 90 }, b: { th: 88, sh: 0, ft: 35, ua: 70, fa: 90 }, fix: "A", prop: ["seat"] },
  legext: { a: { th: 88, sh: 0, ft: 90, ua: 30, fa: 70 }, b: { th: 88, sh: 88, ft: 130, ua: 30, fa: 70 }, fix: "H", prop: ["seat"] },
  legcurlseat: { a: { th: 88, sh: 88, ft: 120, ua: 30, fa: 70 }, b: { th: 88, sh: -20, ft: 70, ua: 30, fa: 70 }, fix: "H", prop: ["seat"] },
  legcurlprone: { a: { tr: -90, th: 90, sh: 90, ft: 140, ua: 0, fa: 0 }, b: { tr: -90, th: 90, sh: 165, ft: 220, ua: 0, fa: 0 }, fix: "H" },
  legcurlstand: { a: { th: 0, sh: 0, ft: 90 }, b: { th: 0, sh: -100, ft: 20 }, fix: "A" },
  crunch: { a: { tr: -90, th: 130, sh: 0, ua: -140, fa: 30 }, b: { tr: -60, th: 130, sh: 0, ua: -110, fa: 40 }, fix: "H" },
  deadbug: { a: { tr: -90, th: 180, sh: 90, ua: 180, fa: 180, th2: 180, sh2: 90 }, b: { tr: -90, th: 180, sh: 90, ua: 180, fa: 180, th2: 90, sh2: 90, ua2: -90, fa2: -90 }, fix: "H" },
  farmer: { a: { th: 12, sh: 0, th2: -12, sh2: -4, ua: 0, fa: 0 }, b: { th: -12, sh: -4, th2: 12, sh2: 0, ua: 0, fa: 0 }, fix: "H", prop: ["db"] },
  dorsi: { a: { tr: 0, th: 90, sh: 90, ft: 120, ua: 90, fa: 90 }, b: { tr: 0, th: 90, sh: 90, ft: 175, ua: 90, fa: 90 }, fix: "H" }
};

// 动作 → 姿势；title 可选覆盖标签，note 补充说明
const MOVE_POSE = {
  自重深蹲: "squat", 高脚杯深蹲: "goblet", 杠铃深蹲: "backsquat", 弓步蹲: "lunge", 分腿蹲: "lunge", 半跪髋屈肌拉伸: "hipflex",
  罗马尼亚硬拉: "rdlbar", "直腿硬拉（哑铃）": "rdl", 早安式: "goodmorning", 传统硬拉: "deadlift",
  标准俯卧撑: "pushup", 窄距俯卧撑: "pushup", 平板支撑: "plank",
  杠铃卧推: "bench", 哑铃卧推: "benchdb",
  引体向上: "pullup", 辅助引体: "pullup", 悬垂举腿: "hangleg", 高位下拉: "pulldown", 坐姿绳索划船: "rowseat",
  单臂哑铃划船: "rowbent", 杠铃俯身划船: "rowbar", "T 杠划船": "rowbar",
  哑铃弯举: "curl", 锤式弯举: "curl", 杠铃弯举: "curlbar", 绳索下压: "pushdown",
  坐姿哑铃推举: "pressseat", 阿诺德推举: "pressseat", 器械推肩: "pressmach", 杠铃肩推: "pressbar",
  哑铃前平举: "frontraise", 哑铃侧平举: "frontraise", 弹力带面拉: "facepull", 俯身哑铃反向飞鸟: "revfly",
  哑铃耸肩: "shrug", 杠铃耸肩: "shrugbar",
  臀桥: "bridge", 单腿臀桥: "bridge1", 臀推: "thrust", 臀部后踢: "kickback", 鸟狗式: "birddog", 侧卧抬腿: "sidelift",
  站姿提踵: "calf", 坐姿提踵: "calfseat", 单腿坐姿提踵: "calfseat", 腿伸展: "legext", 坐姿腿伸展: "legext",
  坐姿腿弯举: "legcurlseat", 腿弯举: "legcurlprone", 俯卧腿弯举: "legcurlprone", 站姿腿弯举: "legcurlstand",
  卷腹: "crunch", 死虫: "deadbug", 死虫对侧伸展: "deadbug", 农夫行走: "farmer", 坐姿勾脚: "dorsi"
};
const POSE_NOTE = {
  哑铃侧平举: "侧平举是手臂向身体两侧抬起，此图为侧面视角，只示意抬起的高度。",
  俯身哑铃反向飞鸟: "实际是向身体两侧打开，此图为侧面视角，只示意抬起的高度。",
  阿诺德推举: "推起的同时手腕外转，此图只示意推举的起止位置。",
  窄距俯卧撑: "双手距离比标准俯卧撑更窄，肘贴近身体。",
  辅助引体: "此图画的是自重引体，辅助机或弹力带的辅助不在图中。",
  单腿坐姿提踵: "单腿做，另一条腿放松。",
  单腿臀桥: "一只脚踩地，另一条腿伸直抬起。"
};

const COL_MAIN = "#14916d", COL_SYN = "#f0a030";

// 为一个动作选出要涂色的肌肉：主练 + 协同（只取我们能画的）
function paintList(name) {
  const m = moveMeta(name);
  const out = [];
  [...m.main, ...m.syn].forEach((n) => { if (PATCH[n] && !out.some((o) => o.name === n)) out.push({ name: n, role: m.main.includes(n) ? "主练" : "协同" }); });
  return out.slice(0, 6).map((o) => ({ ...o, color: o.role === "主练" ? COL_MAIN : COL_SYN }));
}

function hasPose(name) { return !!MOVE_POSE[name]; }

// 动作示意图（起始 / 发力）。返回 {a, b, muscles}，a/b 是 svg 字符串
function moveFigureSVGs(name, extra) {
  const id = MOVE_POSE[name];
  if (!id) return null;
  const def = POSES[id];
  const pose = { a: def.a, b: def.b || def.a, fix: def.fix, mode: def.mode, prop: def.prop, r: def.r };
  const fr = poseFrames(pose);
  const muscles = paintList(name);
  const attr = extra || 'class="pose-svg"';
  const svgA = poseSVG(pose, fr, "a", muscles, attr);
  const svgB = def.b ? poseSVG(pose, fr, "b", muscles, attr) : null;
  return { a: svgA, b: svgB, muscles, note: POSE_NOTE[name] || "" };
}
