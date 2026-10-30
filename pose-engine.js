// 动作示意图引擎：用关节角度画灰色人形（侧视，面朝右），再把主练/协同肌肉涂上颜色。
// 角度约定（度）：
//   四肢 ua/fa（上臂/前臂）、th/sh（大腿/小腿）、ft（脚）：0=垂直向下，90=水平向前，180=向上，负数=向后。
//   躯干 tr：0=直立向上，90=水平朝前（头在右），-90=水平朝后（头在左，仰卧）。
//   带 2 的（ua2 fa2 th2 sh2 ft2）是远侧的手臂/腿，不写则与近侧相同。
//   hd=头相对躯干的偏转，su=肩膀上提（耸肩）。
// 一个姿势：{ a:起始, b:结束, mode, r, prop, static }
//   mode: ground（默认，每帧最低点落地）｜hip（髋位置固定）｜anchor（手固定，悬挂/双杠）

const PL = { t: 30, u: 16, f: 15, th: 25, sh: 24, ft: 9, nk: 5, hr: 6.5 };
const PDEF = { tr: 0, ua: 0, fa: 0, th: 0, sh: 0, ft: 90, hd: 0, su: 0 };
const r2 = (d) => (d * Math.PI) / 180;
const dnv = (a) => [Math.sin(r2(a)), Math.cos(r2(a))];
const upv = (a) => [Math.sin(r2(a)), -Math.cos(r2(a))];
const mvp = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function poseJoints(raw) {
  const p = { ...PDEF, ...raw };
  ["ua", "fa", "th", "sh", "ft"].forEach((k) => { if (p[k + "2"] === undefined) p[k + "2"] = p[k]; });
  const H = [0, 0];
  const S = mvp(H, upv(p.tr), PL.t); S[1] -= p.su;
  const arm = (ua, fa) => { const E = mvp(S, dnv(ua), PL.u); return [E, mvp(E, dnv(fa), PL.f)]; };
  const leg = (th, sh, ft) => { const K = mvp(H, dnv(th), PL.th); const A = mvp(K, dnv(sh), PL.sh); return [K, A, mvp(A, dnv(ft), PL.ft)]; };
  const [E, W] = arm(p.ua, p.fa), [E2, W2] = arm(p.ua2, p.fa2);
  const [K, A, T] = leg(p.th, p.sh, p.ft), [K2, A2, T2] = leg(p.th2, p.sh2, p.ft2);
  const N = mvp(S, upv(p.tr + p.hd), PL.nk);
  const C = mvp(N, upv(p.tr + p.hd), PL.hr + 0.5);
  return { H, S, E, W, E2, W2, K, A, T, K2, A2, T2, N, C };
}

const shiftJ = (j, d) => Object.fromEntries(Object.entries(j).map(([k, v]) => [k, [v[0] + d[0], v[1] + d[1]]]));

function poseFrames(pose) {
  const R = pose.r === undefined ? 4 : pose.r;
  const low = (j) => Math.max(...Object.entries(j).map(([k, v]) => v[1] + (k === "T" || k === "T2" || k === "W" || k === "W2" ? 2 : k === "C" ? PL.hr : R)));
  const ja = poseJoints(pose.a), jb = poseJoints(pose.b || pose.a);
  const fx = pose.fix || "A";
  let da, db;
  if (pose.mode === "anchor") { da = [-ja.W[0], -ja.W[1]]; db = [-jb.W[0], -jb.W[1]]; }
  else { da = [-ja[fx][0], -low(ja)]; db = [-jb[fx][0], -low(jb)]; }
  const A = shiftJ(ja, da), B = shiftJ(jb, db);
  const ground = pose.mode === "anchor" ? null : Math.max(low(A), low(B));
  // 取景框
  const pts = [];
  [A, B].forEach((j) => Object.values(j).forEach((v) => pts.push(v)));
  if (ground !== null) pts.push([0, ground]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  const m = 15;
  x0 -= m + 6; x1 += m + 6; y0 -= m; y1 += m;
  const aspect = 1.12;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < aspect) { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; y0 -= (nh - h) / 2; h = nh; }
  return { a: A, b: B, ground, vb: [x0, y0, w, h] };
}

// ---- 形状 ----
function capEls(A, B, ra, rb, at) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const f = (n) => +n.toFixed(2);
  return `<polygon points="${f(A[0] + nx * ra)},${f(A[1] + ny * ra)} ${f(B[0] + nx * rb)},${f(B[1] + ny * rb)} ${f(B[0] - nx * rb)},${f(B[1] - ny * rb)} ${f(A[0] - nx * ra)},${f(A[1] - ny * ra)}" ${at}/>` +
    `<circle cx="${f(A[0])}" cy="${f(A[1])}" r="${ra}" ${at}/><circle cx="${f(B[0])}" cy="${f(B[1])}" r="${rb}" ${at}/>`;
}
const circEl = (c, r, at) => `<circle cx="${+c[0].toFixed(2)}" cy="${+c[1].toFixed(2)}" r="${r}" ${at}/>`;

// 一层：先画描边底，再画填色，得到整体外轮廓
function layerSVG(build, fill) {
  return build('fill="#7d7468" stroke="#7d7468" stroke-width="1.5" stroke-linejoin="round"') + build(`fill="${fill}"`);
}

// 部位 → [起点, 终点, 起点半径, 终点半径, 是否躯干类]
function segs(j) {
  return {
    T: [j.H, j.S, 7.5, 8.5, true], Nk: [j.S, j.N, 3, 2.6, true],
    U: [j.S, j.E, 4.2, 3.4], F: [j.E, j.W, 3.3, 2.5],
    Th: [j.H, j.K, 6.5, 4.6], Sh: [j.K, j.A, 4.4, 3]
  };
}

// 肌肉色块：先画一段贴合肢体的形状，再用肢体本身裁剪，颜色不会溢出轮廓
function patchEl(seg, t0, t1, side, wf, color, clip) {
  const [A, B, ra, rb, trunk] = seg;
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const n = trunk ? [-dy / L, dx / L] : [dy / L, -dx / L];
  const f = (n2) => +n2.toFixed(2);
  const c0 = lerp2(A, B, t0), r0 = ra + (rb - ra) * t0;
  const c1 = lerp2(A, B, t1), r1 = ra + (rb - ra) * t1;
  const pad = 2.4;
  const rect = `x="${f(Math.min(c0[0], c1[0]) - Math.max(r0, r1) - pad)}" y="${f(Math.min(c0[1], c1[1]) - Math.max(r0, r1) - pad)}" width="${f(L + (Math.max(r0, r1) + pad) * 2)}" height="${f((Math.max(r0, r1) + pad) * 2)}"`;
  if (Math.abs(side) < 0.35) {
    return `<rect ${rect} rx="${f(Math.max(r0, r1))}" fill="${color}" fill-opacity=".55" clip-path="url(#${clip})"/>`;
  }
  const o0 = side * r0 * (1 - wf), o1 = side * r1 * (1 - wf);
  const p = (c, r, o, k) => [c[0] + n[0] * (o + k), c[1] + n[1] * (o + k)];
  const q = [p(c0, r0, o0, r0 * wf), p(c1, r1, o1, r1 * wf), p(c1, r1, o1, -r1 * wf), p(c0, r0, o0, -r0 * wf)];
  const pts = q.map((pt) => `${f(pt[0])},${f(pt[1])}`).join(" ");
  return `<polygon points="${pts}" fill="${color}" fill-opacity=".62" clip-path="url(#${clip})"/>`;
}

function propsSVG(pose, j, ground, when) {
  const out = [];
  const list = pose.prop || [];
  const f = (n) => +n.toFixed(2);
  list.forEach((pr) => {
    const [kind, arg] = pr.split(":");
    const tru = [j.S[0] - j.H[0], j.S[1] - j.H[1]], L = Math.hypot(...tru) || 1;
    const u = [tru[0] / L, tru[1] / L], back = [u[1], -u[0]];
    if (when === "under") {
      if (kind === "bench" || kind === "seat") {
        const o = 10;
        const s0 = kind === "bench" ? mvp(mvp(j.S, u, 9), back, o) : mvp(mvp(j.H, u, -2), back, 0);
        const e0 = mvp(mvp(j.H, u, -13), back, o);
        if (kind === "bench") {
          out.push(`<line x1="${f(s0[0])}" y1="${f(s0[1])}" x2="${f(e0[0])}" y2="${f(e0[1])}" stroke="#bdb4a6" stroke-width="4.5" stroke-linecap="round"/>`);
          [s0, e0].forEach((p) => ground !== null && out.push(`<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(p[0])}" y2="${f(ground)}" stroke="#d3cbbf" stroke-width="2.4"/>`));
        } else {
          const y = j.H[1] + 9.5;
          out.push(`<line x1="${f(j.H[0] - 13)}" y1="${f(y)}" x2="${f(j.H[0] + 15)}" y2="${f(y)}" stroke="#bdb4a6" stroke-width="4.5" stroke-linecap="round"/>`);
          if (ground !== null) out.push(`<line x1="${f(j.H[0])}" y1="${f(y)}" x2="${f(j.H[0])}" y2="${f(ground)}" stroke="#d3cbbf" stroke-width="2.4"/>`);
          const b0 = mvp(j.H, back, 10.5), b1 = mvp(mvp(j.S, back, 10.5), u, 4);
          out.push(`<line x1="${f(b0[0])}" y1="${f(b0[1])}" x2="${f(b1[0])}" y2="${f(b1[1])}" stroke="#d3cbbf" stroke-width="3.2" stroke-linecap="round"/>`);
        }
      }
      if (kind === "post") out.push(`<line x1="${f(j.W[0])}" y1="${f(j.W[1])}" x2="${f(j.W[0])}" y2="${f(j.W[1] + 62)}" stroke="#cfc8bc" stroke-width="3"/>`);
      if (kind === "hangbar") out.push(`<line x1="${f(j.W[0] - 15)}" y1="${f(j.W[1])}" x2="${f(j.W[0] + 15)}" y2="${f(j.W[1])}" stroke="#a49c8e" stroke-width="2.4" stroke-linecap="round"/>`);
      if (kind === "cable") {
        const [dx, dy] = arg.split(",").map(Number), l = Math.hypot(dx, dy);
        const e = [j.W[0] + (dx / l) * 42, j.W[1] + (dy / l) * 42];
        out.push(`<line x1="${f(j.W[0])}" y1="${f(j.W[1])}" x2="${f(e[0])}" y2="${f(e[1])}" stroke="#a49c8e" stroke-width="1" stroke-dasharray="2.5 1.5"/>`);
      }
    } else {
      const bar = (c, r) => `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${r}" fill="#3d3d3d" stroke="#222" stroke-width=".6"/><circle cx="${f(c[0])}" cy="${f(c[1])}" r="${r * 0.28}" fill="#9a9a9a"/>`;
      if (kind === "db") out.push(`<rect x="${f(j.W[0] - 4.2)}" y="${f(j.W[1] - 2.2)}" width="8.4" height="4.4" rx="1.4" fill="#3d3d3d"/>`);
      if (kind === "plateW") out.push(bar(j.W, 7));
      if (kind === "plateS") out.push(bar(mvp(j.S, back, 3), 8));
      if (kind === "plateH") out.push(bar(mvp(j.H, [-back[0], -back[1]], 12), 8));
    }
  });
  return out.join("");
}

function poseSVG(pose, frames, which, muscles, extra) {
  const j = frames[which];
  const fr = frames;
  const FAR = "#c9c0b2", NEAR = "#efe8dd";
  const far = layerSVG((at) => capEls(j.S, j.E2, 4.2, 3.4, at) + capEls(j.E2, j.W2, 3.3, 2.5, at) + capEls(j.H, j.K2, 6.5, 4.6, at) + capEls(j.K2, j.A2, 4.4, 3, at) + capEls(j.A2, j.T2, 2.6, 2, at), FAR);
  const body = layerSVG((at) => capEls(j.H, j.S, 7.5, 8.5, at) + capEls(j.S, j.N, 3, 2.6, at) + circEl(j.C, PL.hr, at) +
    capEls(j.H, j.K, 6.5, 4.6, at) + capEls(j.K, j.A, 4.4, 3, at) + capEls(j.A, j.T, 2.6, 2, at), NEAR);
  const arm = layerSVG((at) => capEls(j.S, j.E, 4.2, 3.4, at) + capEls(j.E, j.W, 3.3, 2.5, at) + circEl(j.W, 2.8, at), NEAR);
  const sg = segs(j);
  const limb = (at) => capEls(j.H, j.S, 7.5, 8.5, at) + capEls(j.S, j.N, 3, 2.6, at) + circEl(j.C, PL.hr, at) +
    capEls(j.H, j.K, 6.5, 4.6, at) + capEls(j.K, j.A, 4.4, 3, at) + capEls(j.A, j.T, 2.6, 2, at) +
    capEls(j.S, j.E, 4.2, 3.4, at) + capEls(j.E, j.W, 3.3, 2.5, at) + circEl(j.W, 2.8, at);
  const uid = "pc" + Math.random().toString(36).slice(2, 8);
  const patches = (muscles || []).map((m) => (PATCH[m.name] || []).map(([s, t0, t1, side, wf]) => patchEl(sg[s], t0, t1, side, wf, m.color, uid)).join("")).join("");
  const g = fr.ground;
  const cx = fr.vb[0] + fr.vb[2] / 2;
  const gl = g === null ? "" : `<ellipse cx="${+cx.toFixed(2)}" cy="${+(g + 1.6).toFixed(2)}" rx="${+(fr.vb[2] * 0.3).toFixed(2)}" ry="2.6" fill="#e4dccf" fill-opacity=".9"/>`;
  const defs = `<defs><clipPath id="${uid}">${limb('fill="#000"')}</clipPath></defs>`;
  const vb = fr.vb.map((n) => +n.toFixed(2)).join(" ");
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" ${extra || ""}>${defs}${gl}${propsSVG(pose, j, g, "under")}${far}${body}${arm}${patches}${propsSVG(pose, j, g, "over")}</svg>`;
}
