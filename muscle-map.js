// 每一块细分肌肉在人体图上的大致位置，用来画「这块肌肉在哪里」的示意图。
// 依赖：body-shapes.js（BODY_SHAPES）、regions.js（REGIONS）。
// v：在正面还是背面看得最清楚。
// at：一句话说明位置。
// it：高亮范围，坐标系和 BODY_SHAPES 相同（宽 100），只写人体左半边，右半边自动镜像。
//   { r:"chest" }                      整个肌群的所有块
//   { r:"quads", i:[2,3] }             只取该肌群的第几块（按 BODY_SHAPES 里出现的顺序，0 起）
//   { r:"calves", rect:[x0,x1,y0,y1] } 只取矩形范围内的部分
//   { p:"x,y x,y ...", deep:true }     自己画的形状；deep 表示在深层，用虚线表示
// 这是示意图，位置是大致范围，不是解剖精确图。

const ALL_X = [-5, 105];
const LOC = {
  胸锁乳突肌: { v: "front", at: "颈部两侧，从耳后下方斜着连到胸骨和锁骨内侧", it: [{ p: "42,24 45,24 50,37 48,40 45,33" }] },
  斜方肌: { v: "back", at: "从后脑和颈后一直铺到肩上，再向下收窄到背中间，像一块菱形的披肩", it: [{ r: "traps" }] },
  三角肌前束: { v: "front", at: "肩膀前侧，锁骨外端往下", it: [{ r: "shoulder", rect: [25, 31, 35, 55] }] },
  三角肌中束: { v: "front", at: "肩膀最外侧，手臂侧抬时鼓起来的那一块", it: [{ r: "shoulder", rect: [15, 25.5, 35, 55] }] },
  胸大肌: { v: "front", at: "整个胸前，从锁骨下方、胸骨两侧一直到腋前", it: [{ r: "chest" }] },
  胸小肌: { v: "front", at: "在胸大肌下面一层，从第 3–5 根肋骨斜向外上方连到肩胛前端", it: [{ p: "33,46 41,50 44,56 38,57 33,52", deep: true }] },
  前锯肌: { v: "front", at: "胸廓侧面、腋窝下方，像锯齿一样贴在肋骨上", it: [{ p: "31,58 38,59 40,63 36,65 40,69 34,71 31,65", deep: true }] },
  腹直肌: { v: "front", at: "肚子正中，从胸骨下缘竖着连到耻骨，就是「腹肌」", it: [{ r: "abs" }] },
  腹外斜肌: { v: "front", at: "腹部两侧最表层，沿肋骨斜向前下方", it: [{ r: "obliques" }] },
  腹内斜肌: { v: "front", at: "在腹外斜肌下面一层，走向和它交叉，位置偏下腹两侧", it: [{ p: "34,70 41,66 41,82 36,83", deep: true }] },
  前臂肌群: { v: "front", at: "手肘到手腕之间的整条前臂", it: [{ r: "forearm" }] },
  肱二头肌: { v: "front", at: "上臂前侧，肩膀到手肘之间鼓起的那一块", it: [{ r: "biceps" }] },
  肱肌: { v: "front", at: "在肱二头肌下面一层，靠近手肘上方", it: [{ p: "18.5,69 22,63 27.5,56 28.5,58 23,66 18.2,70.5", deep: true }] },
  肱桡肌: { v: "front", at: "前臂靠拇指一侧，靠近手肘的上半段", it: [{ r: "forearm", i: [0, 1], rect: [ALL_X[0], ALL_X[1], 68, 86] }] },
  旋前圆肌: { v: "front", at: "前臂内侧靠近手肘处，斜着走向前臂中段", it: [{ r: "forearm", i: [2, 3], rect: [ALL_X[0], ALL_X[1], 70, 82] }] },
  桡侧腕屈肌: { v: "front", at: "前臂掌侧，偏拇指一侧，中段到手腕", it: [{ r: "forearm", i: [0, 1], rect: [ALL_X[0], ALL_X[1], 84, 102] }] },
  掌长肌: { v: "front", at: "前臂掌侧正中的一条细肌，到手腕变成肌腱（有人天生没有）", it: [{ r: "forearm", i: [2, 3], rect: [ALL_X[0], ALL_X[1], 80, 92] }] },
  尺侧腕屈肌: { v: "front", at: "前臂掌侧，偏小指一侧，靠近手腕", it: [{ r: "forearm", i: [2, 3], rect: [ALL_X[0], ALL_X[1], 90, 102] }] },
  缝匠肌: { v: "front", at: "大腿前面斜着走的一条长带，从髋外侧到膝盖内侧", it: [{ p: "33,95 36,94 46,138 44,144" }] },
  股四头肌: { v: "front", at: "整个大腿前侧，由四块肌肉组成", it: [{ r: "quads" }] },
  股直肌: { v: "front", at: "大腿前面正中，最表层的一块，上端连到髋骨", it: [{ r: "quads", i: [0, 1] }] },
  股内侧肌: { v: "front", at: "大腿前面靠内侧、膝盖上方，鼓出来像一滴水", it: [{ r: "quads", i: [2, 3] }] },
  股外侧肌: { v: "front", at: "大腿外侧，最厚的一块，站直时侧面看最明显", it: [{ r: "quads", i: [4, 5] }] },
  股中间肌: { v: "front", at: "在股直肌下面，紧贴大腿骨，从表面看不到", it: [{ p: "30,102 36,102 36,132 31,132", deep: true }] },
  长收肌: { v: "front", at: "大腿内侧上半部，从耻骨斜向下连到大腿骨", it: [{ r: "adductor", rect: [34, 49, 100, 126] }] },
  股薄肌: { v: "front", at: "大腿最内侧一条细长的肌肉，一直到膝盖内侧", it: [{ p: "45,102 48,102 48,112 46,121 44.5,125 44,116" }] },
  耻骨肌: { v: "front", at: "大腿根部内侧，腹股沟附近，在内收肌群最上方", it: [{ r: "adductor", rect: [34, 49, 91, 102] }] },
  髂腰肌: { v: "front", at: "髋前深处，从腰椎和髂骨内侧穿过腹股沟连到大腿骨", it: [{ p: "38,91 44,92 47,104 44,108 40,100", deep: true }] },
  阔筋膜张肌: { v: "front", at: "髋部外侧偏前，连着大腿外侧的髂胫束", it: [{ p: "29,93 35,93 35,106 30,105" }] },
  胫骨前肌: { v: "front", at: "小腿前面，紧挨着胫骨外侧，勾脚尖时能看到绷起来", it: [{ r: "calves", i: [2, 3] }] },
  腓骨肌: { v: "front", at: "小腿外侧，从膝外侧到外脚踝", it: [{ r: "calves", i: [0, 1], rect: [ALL_X[0], ALL_X[1], 150, 182] }] },
  拇长伸肌: { v: "front", at: "小腿前侧深处，肌腱一直连到大脚趾", it: [{ p: "31,172 33,172 33,192 31.5,192", deep: true }] },
  趾长伸肌: { v: "front", at: "小腿前侧偏外，肌腱分成四条连到第 2–5 脚趾", it: [{ p: "28.5,166 30.5,166 31,190 29,190", deep: true }] },
  背阔肌: { v: "back", at: "背部两侧下半部，像一对翅膀，从腋下一直收到腰", it: [{ r: "back", rect: [26, 50, 54, 78] }] },
  大圆肌: { v: "back", at: "肩胛骨外下角，靠近腋窝后侧的一小块", it: [{ p: "31,50 37,49 39,54 33,55" }] },
  菱形肌: { v: "back", at: "两侧肩胛骨和脊柱之间，在斜方肌下面一层", it: [{ p: "42,43 49,45 49,58 43,54", deep: true }] },
  冈下肌: { v: "back", at: "肩胛骨后面的下半部，肩袖肌之一", it: [{ p: "35,46 45,45 46,52 38,54 34,50", deep: true }] },
  小圆肌: { v: "back", at: "冈下肌下方一条细肌，贴着肩胛骨外侧缘", it: [{ p: "31,45 36,44 37,47 32,48", deep: true }] },
  三角肌后束: { v: "back", at: "肩膀后侧，手臂向后摆时发力的那一块", it: [{ r: "reardelt" }] },
  肱三头肌: { v: "back", at: "上臂后侧，从肩到手肘，占上臂的大部分", it: [{ r: "triceps" }] },
  竖脊肌: { v: "back", at: "脊柱两侧竖着的两条肌肉，从骶骨一直到后脑", it: [{ r: "lowerback" }] },
  前臂伸肌群: { v: "back", at: "前臂后侧（手背一侧），肘到手腕", it: [{ r: "forearm" }] },
  臀大肌: { v: "back", at: "屁股上最大最表层的一块，决定臀部的形状", it: [{ r: "glutes" }] },
  臀中肌: { v: "back", at: "臀部外上方，在臀大肌上缘外侧，单脚站立时稳住骨盆", it: [{ r: "glutes", rect: [28, 46, 98, 111] }] },
  腘绳肌: { v: "back", at: "整个大腿后侧，由三块肌肉组成", it: [{ r: "hamstring" }] },
  股二头肌: { v: "back", at: "大腿后侧偏外的一条", it: [{ r: "hamstring", i: [0, 1] }] },
  半腱肌: { v: "back", at: "大腿后侧偏内的浅层肌肉，下端变成细长的肌腱", it: [{ r: "hamstring", i: [2, 3], rect: [ALL_X[0], ALL_X[1], 120, 148] }] },
  半膜肌: { v: "back", at: "大腿后侧偏内，在半腱肌下面一层，更靠近膝盖", it: [{ r: "hamstring", i: [2, 3], rect: [ALL_X[0], ALL_X[1], 138, 170] }] },
  腓肠肌: { v: "back", at: "小腿后侧鼓起的两个头，是「小腿肚」最明显的部分", it: [{ r: "calves", i: [0, 1, 2, 3] }] },
  比目鱼肌: { v: "back", at: "在腓肠肌深层，小腿后侧偏下，膝弯曲时更能感觉到", it: [{ r: "calves", i: [4, 5] }, { p: "26,176 29,175 33,184 34,196 30,198 27,190", deep: true }] },
  屈趾肌: { v: "back", at: "小腿后侧深处，肌腱绕过内脚踝连到脚底和脚趾", it: [{ p: "31,186 35,186 33,205 30,205", deep: true }] }
};

// 每个肌群默认从哪一面看
const REGION_VIEW = {
  chest: "front", shoulder: "front", reardelt: "back", biceps: "front", triceps: "back", forearm: "front",
  abs: "front", obliques: "front", quads: "front", adductor: "front", calves: "back", neck: "front",
  traps: "back", back: "back", lowerback: "back", glutes: "back", hamstring: "back"
};

const PART_REGION = {};
REGIONS.forEach((r) => r.parts && r.parts.forEach((p) => { if (!PART_REGION[p]) PART_REGION[p] = r.id; }));

const FIG = {
  PAL: { base: "#ece7e0", ctx: "#cfc9c1", line: "#ffffff", hi: "#1f6f5b" },
  COLORS: ["#1f6f5b", "#d9822b", "#3b6fb6", "#b24a7a", "#7a5cb0", "#5b8f2e"],

  parse(str) {
    const n = str.trim().split(/[\s,]+/).map(Number);
    const out = [];
    for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
    return out;
  },
  mirror(pts) { return pts.map(([x, y]) => [100 - x, y]); },
  shapes(side) { return BODY_SHAPES[side].map(([id, p]) => ({ id, pts: FIG.parse(p) })); },

  // 一块肌肉的高亮形状列表：[{pts, clip, deep}]
  items(name) {
    const L = LOC[name];
    const polys = FIG.shapes(L.v);
    const out = [];
    L.it.forEach((it) => {
      const deep = !!it.deep;
      if (it.r) {
        const rp = polys.filter((p) => p.id === it.r);
        const pick = it.i ? it.i.map((k) => rp[k]).filter(Boolean) : rp;
        let clips = [null];
        if (it.rect) {
          const [x0, x1, y0, y1] = it.rect;
          clips = it.i ? [it.rect] : [it.rect, [100 - x1, 100 - x0, y0, y1]];
        }
        clips.forEach((clip) => pick.forEach((p) => out.push({ pts: p.pts, clip, deep })));
      } else {
        const pts = FIG.parse(it.p);
        out.push({ pts, clip: null, deep });
        out.push({ pts: FIG.mirror(pts), clip: null, deep });
      }
    });
    return out;
  },

  // names：要高亮的肌肉；colors：对应颜色；ctxRegions：用中灰色衬出来的肌群
  layers(names, opt = {}) {
    const side = LOC[names[0]].v;
    const ctx = new Set(opt.ctxRegions || names.map((n) => PART_REGION[n]));
    const layers = FIG.shapes(side).map((s) => ({ pts: s.pts, kind: s.id && ctx.has(s.id) ? "ctx" : "base" }));
    names.forEach((n, k) => {
      if (LOC[n].v !== side) return;
      FIG.items(n).forEach((it) => layers.push({ ...it, kind: it.deep ? "deep" : "hi", color: (opt.colors || [])[k] || FIG.PAL.hi, tag: k }));
    });
    return { side, layers };
  },

  // 整个肌群在正反面都高亮（用于封面）
  regionLayers(regionId, side, color) {
    const layers = FIG.shapes(side).map((s) => ({ pts: s.pts, kind: s.id === regionId ? "hi" : "base", color: color || FIG.PAL.hi }));
    return { side, layers };
  },

  bbox(layers, kinds) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    layers.forEach((l) => {
      if (!kinds.includes(l.kind)) return;
      let lx0 = 1e9, ly0 = 1e9, lx1 = -1e9, ly1 = -1e9;
      l.pts.forEach(([x, y]) => { lx0 = Math.min(lx0, x); lx1 = Math.max(lx1, x); ly0 = Math.min(ly0, y); ly1 = Math.max(ly1, y); });
      if (l.clip) { lx0 = Math.max(lx0, l.clip[0]); lx1 = Math.min(lx1, l.clip[1]); ly0 = Math.max(ly0, l.clip[2]); ly1 = Math.min(ly1, l.clip[3]); }
      if (lx0 > lx1 || ly0 > ly1) return;
      x0 = Math.min(x0, lx0); x1 = Math.max(x1, lx1); y0 = Math.min(y0, ly0); y1 = Math.max(y1, ly1);
    });
    return [x0, y0, x1, y1];
  },

  // 取景框：围住所有高亮和肌群，按给定宽高比留边
  view(layerObj, aspect = 1, pad = 1.45, minSide = 52) {
    const [x0, y0, x1, y1] = FIG.bbox(layerObj.layers, ["hi", "deep"]);
    let w = (x1 - x0) * pad, h = (y1 - y0) * pad;
    w = Math.max(w, minSide * aspect); h = Math.max(h, minSide);
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
  },

  // 高亮的中心点（用来放编号标记）：优先取人体左半边
  center(layers, tag) {
    const sel = layers.filter((l) => (l.kind === "hi" || l.kind === "deep") && l.tag === tag);
    const left = sel.filter((l) => { const b = FIG.bbox([l], ["hi", "deep"]); return (b[0] + b[2]) / 2 < 50; });
    const b = FIG.bbox(left.length ? left : sel, ["hi", "deep"]);
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  },

  uid: 0,
  svg(layerObj, vb, extra = "") {
    const id = "c" + (++FIG.uid) + "_";
    let defs = "";
    const clipIds = new Map();
    const clipOf = (c) => {
      if (!c) return "";
      const key = c.join(",");
      if (!clipIds.has(key)) {
        const cid = id + clipIds.size;
        clipIds.set(key, cid);
        defs += `<clipPath id="${cid}"><rect x="${c[0]}" y="${c[2]}" width="${c[1] - c[0]}" height="${c[3] - c[2]}"/></clipPath>`;
      }
      return ` clip-path="url(#${clipIds.get(key)})"`;
    };
    const body = layerObj.layers.map((l) => {
      const pts = l.pts.map((p) => p.join(",")).join(" ");
      if (l.kind === "base") return `<polygon points="${pts}" fill="${FIG.PAL.base}" stroke="#fff" stroke-width=".5" stroke-linejoin="round"/>`;
      if (l.kind === "ctx") return `<polygon points="${pts}" fill="${FIG.PAL.ctx}" stroke="#fff" stroke-width=".5" stroke-linejoin="round"/>`;
      if (l.kind === "hi") return `<polygon points="${pts}" fill="${l.color}" stroke="#fff" stroke-width=".5" stroke-linejoin="round"${clipOf(l.clip)}/>`;
      return `<polygon points="${pts}" fill="${l.color}" fill-opacity=".5" stroke="${l.color}" stroke-width="1.4" stroke-dasharray="3 2" vector-effect="non-scaling-stroke" stroke-linejoin="round"${clipOf(l.clip)}/>`;
    }).join("");
    return `<svg viewBox="${vb.map((n) => +n.toFixed(2)).join(" ")}" xmlns="http://www.w3.org/2000/svg" ${extra}><defs>${defs}</defs>${body}</svg>`;
  },

  // 画到 canvas：box = {x,y,w,h}（像素），vb = 取景框
  draw(ctx, layerObj, vb, box) {
    const s = Math.min(box.w / vb[2], box.h / vb[3]);
    const ox = box.x + (box.w - vb[2] * s) / 2, oy = box.y + (box.h - vb[3] * s) / 2;
    const P = ([x, y]) => [ox + (x - vb[0]) * s, oy + (y - vb[1]) * s];
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    layerObj.layers.forEach((l) => {
      ctx.save();
      if (l.clip) {
        const [a, b] = P([l.clip[0], l.clip[2]]), [c, d] = P([l.clip[1], l.clip[3]]);
        ctx.beginPath(); ctx.rect(a, b, c - a, d - b); ctx.clip();
      }
      ctx.beginPath();
      l.pts.forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.lineJoin = "round";
      if (l.kind === "base" || l.kind === "ctx" || l.kind === "hi") {
        ctx.fillStyle = l.kind === "base" ? FIG.PAL.base : l.kind === "ctx" ? FIG.PAL.ctx : l.color;
        ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, s * 0.5); ctx.stroke();
      } else {
        ctx.globalAlpha = 0.5; ctx.fillStyle = l.color; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = l.color; ctx.lineWidth = Math.max(2, s * 0.35); ctx.setLineDash([s * 1.6, s * 1.1]); ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
    return { s, P };
  }
};

// 卡片用的完整示意图：放大的局部 + 右上角整张人体缩略图
function locationFigure(name) {
  const L = LOC[name];
  const obj = FIG.layers([name]);
  const vb = FIG.view(obj, 1);
  const full = FIG.svg(obj, [0, -2, 100, 224], 'class="fig-thumb-svg"');
  const sideTxt = L.v === "front" ? "正面" : "背面";
  const deep = FIG.items(name).some((it) => it.deep);
  return `<div class="loc-fig">${FIG.svg(obj, vb, 'class="fig-main-svg" role="img" aria-label="' + name + '在人体' + sideTxt + '的位置"')}
    <div class="thumb">${full}<span>${sideTxt}</span></div>${deep ? '<em class="deep-tag">虚线 = 深层</em>' : ""}</div>`;
}
