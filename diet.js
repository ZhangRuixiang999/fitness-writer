// 饮食页：热量估算 + 练前练后建议。数字是估算，页面上写明不是处方。

const DIET_TIPS = [
  { t: "练前 1–2 小时", d: "吃一顿正餐：米饭、面条这类主食配鸡蛋或瘦肉。别空腹去练，也别练前十分钟才吃，容易胃里顶着。" },
  { t: "来不及吃正餐", d: "练前 30 分钟吃一根香蕉，或一片面包加一杯牛奶。量小一点，顶住就行。" },
  { t: "练后 1 小时内", d: "补一份蛋白质加一点主食。比如鸡胸肉配米饭、希腊酸奶配水果、鸡蛋配馒头。这时候吃，恢复会快一些。" },
  { t: "减脂的人", d: "缺口放在平时，不要放在练后那一餐。练后该吃还是吃，少吃的是零食和含糖饮料。" },
  { t: "增肌的人", d: "一天吃不够，练得再好也长不起来。正餐吃饱，两餐之间加一顿，牛奶、鸡蛋、坚果都行。" },
  { t: "水", d: "练前喝一杯，练中小口喝，练后别一次灌太多。出汗多的天，可以喝一点淡盐水或运动饮料。" }
];

const GOAL_TEXT = { cut: "减脂", keep: "维持", bulk: "增肌" };
const GOAL_DELTA = { cut: -400, keep: 0, bulk: 300 };
const GOAL_NOTE = {
  cut: "每天比消耗少约 400 千卡，一周大约轻 0.3–0.5 公斤",
  keep: "和每天消耗持平，体重应基本不动",
  bulk: "每天比消耗多约 300 千卡，体重会慢慢涨"
};

function dietEstimate(sex, age, h, w, act, goal) {
  const bmr = sex === "m" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
  const tdee = bmr * act;
  const target = Math.round(tdee + GOAL_DELTA[goal]);
  const protein = Math.round(w * (goal === "bulk" ? 1.8 : goal === "cut" ? 2 : 1.6));
  const carb = Math.round((target * 0.45) / 4);
  const fat = Math.round((target * 0.28) / 9);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), target, protein, carb, fat };
}

function renderDiet(r, goal) {
  const rows = [
    ["基础代谢", `${r.bmr} 千卡`, "躺着不动一天也要消耗的量"],
    ["每天消耗", `${r.tdee} 千卡`, "算上你平时的活动量"],
    [`${GOAL_TEXT[goal]}目标`, `${r.target} 千卡`, GOAL_NOTE[goal]],
    ["蛋白质", `${r.protein} 克`, "分到三餐，每餐一个拳头大小的肉或两三个蛋"],
    ["碳水", `${r.carb} 克`, "米饭、面条、土豆，练的那天多放在练前和练后"],
    ["脂肪", `${r.fat} 克`, "烹调用油、鸡蛋黄、坚果，别完全不吃"]
  ];
  return `<div class="diet-result">
    <p class="diet-main">一天大约吃 <b>${r.target}</b> 千卡</p>
    <ul>${rows.map(([k, v, n]) => `<li><span>${k}</span><b>${v}</b><em>${n}</em></li>`).join("")}</ul>
    <p class="diet-note">用的是 Mifflin–St Jeor 公式估算，误差通常在一两百千卡。体重两周没按预期变化，再调 200 千卡，比一上来就砍很多更稳。</p>
  </div>`;
}

function dietAdviceText(goal) {
  const g = GOAL_TEXT[goal] || "维持";
  const lines = {
    cut: [
      "减脂期别空腹练，练前一小时吃一点主食垫一下，比如半根香蕉或一片面包。",
      "练后照常吃一餐，蛋白质和主食都要有。缺口从零食和饮料里扣，别从这一餐扣。",
      "一天的量按上面算出来的吃，饿了先喝水，再决定是不是真的要加餐。"
    ],
    bulk: [
      "增肌吃不够是最常见的原因。正餐吃到饱，两餐之间再加一顿牛奶或酸奶。",
      "练前 1–2 小时吃一顿有主食的正餐，练后一小时内补蛋白质加主食，比如鸡胸肉配米饭。",
      "体重两周没涨，每天再加 200 千卡，别一次加很多。"
    ],
    keep: [
      "维持的话，吃到不饿、训练状态稳定就行，不用天天称。",
      "练前 1–2 小时吃正餐，练后正常吃下一餐，有蛋白质有主食。",
      "体重连续两周往一个方向走，再考虑每天加减 200 千卡。"
    ]
  };
  return `饮食（${g}）\n` + lines[goal].map((s) => `· ${s}`).join("\n");
}

document.getElementById("d-tips").innerHTML = DIET_TIPS.map((x) => `<article><h3>${x.t}</h3><p>${x.d}</p></article>`).join("");

document.getElementById("d-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const num = (id) => Number(document.getElementById(id).value);
  const goal = document.getElementById("d-goal").value;
  const r = dietEstimate(document.getElementById("d-sex").value, num("d-age"), num("d-h"), num("d-w"), num("d-act"), goal);
  const out = document.getElementById("d-out");
  out.innerHTML = renderDiet(r, goal);
  out.hidden = false;
});
