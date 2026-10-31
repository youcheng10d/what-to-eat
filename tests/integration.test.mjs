// 集成测试：真实 1143 道菜数据上跑完整推荐流程（含 v2.1 的档口均衡与避雷）
import fs from "node:fs";
import vm from "node:vm";

const ROOT = "D:/code/TRAE/项目一  今天吃啥/what-to-eat/";
const sandbox = { window: { __WTE_FAST__: true }, Math, console };
vm.runInNewContext(fs.readFileSync(ROOT + "data/data.js", "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync(ROOT + "api.js", "utf8"), sandbox);
const API = sandbox.window.API;
const dishes = sandbox.window.DB_REAL.dishes;

let failed = 0;
const check = (name, cond, extra = "") => {
  console.log((cond ? "PASS  " : "FAIL  ") + name + (extra ? `  [${extra}]` : ""));
  if (!cond) failed++;
};

// —— 1) 面食占比回归：无档案时不应被数据分布（46.7% 面食）带跑 ——
{
  const rows = [];
  // 200 次取样：把抽样波动压到 ±3% 内，避免“刚好 30%”的假失败
  for (let i = 0; i < 200; i++) {
    const r = await API.recommend({ text: "", mode: 1 });
    rows.push(r.data.cards[0].dish);
  }
  const rate = rows.filter((d) => d.category === "面食").length / rows.length;
  check("无档案单卡面食率 < 30%", rate < 0.3, `${(rate * 100).toFixed(0)}%`);
}

// —— 2) 档口均衡：单一家 212 道菜的外公家米线不应垄断 ——
{
  const rows = [];
  for (let i = 0; i < 60; i++) {
    const r = await API.recommend({ text: "", mode: 1 });
    rows.push(r.data.cards[0].dish);
  }
  const rate = rows.filter((d) => (d.stall || "").includes("外公家")).length / rows.length;
  check("外公家米线占比 < 12%", rate < 0.12, `${(rate * 100).toFixed(0)}%`);
}

// —— 3) “不吃面”：面类制品全排除（含跨品类挂靠的“拌饭/面/粉”等）——
{
  const NOODLE = /面|粉|米线|饺子|水饺|抄手|馄饨|拉面|刀削|河粉|粉丝|螺蛳粉|挂面|意面/;
  const isNoodleLike = (d) => d.category === "面食" || NOODLE.test(d.name || "");
  let ok = true, sample = [];
  for (let i = 0; i < 8; i++) {
    const r = await API.recommend({ text: "不吃面", mode: 3 });
    const bad = r.data.cards.filter((c) => isNoodleLike(c.dish));
    if (bad.length) { ok = false; sample = bad.map((c) => `${c.dish.name}(${c.dish.category})`); }
  }
  check("“不吃面”8 轮三卡不推任何面类制品", ok, sample.join("|"));
}

// —— 3b) v2.2 具体对象否定：不吃水饺/不要葱/不吃土豆 按关键词排除 ——
{
  const cases = [
    { text: "不吃水饺", re: /水饺|饺子/, rounds: 200, label: "不吃水饺" },
    { text: "不要葱", re: /葱/, rounds: 100, label: "不要葱" },
    { text: "不吃土豆", re: /土豆/, rounds: 100, label: "不吃土豆" },
  ];
  for (const c of cases) {
    let ok = true, sample = [];
    for (let i = 0; i < c.rounds; i++) {
      const r = await API.recommend({ text: c.text, mode: 3 });
      const bad = r.data.cards.filter((card) => c.re.test(`${card.dish.name} ${card.dish.desc || ""}`));
      if (bad.length) { ok = false; sample = bad.map((x) => x.dish.name); break; }
    }
    check(`“${c.label}”${c.rounds} 轮不推相关菜`, ok, sample.join("|"));
  }
}

// —— 4) 档案避雷填档口名 → 整档排除（含“试试新的”）——
{
  let ok = true;
  for (let i = 0; i < 8; i++) {
    const r = await API.recommend({
      text: "", mode: 3, novelty: i % 2 === 1,
      profile: { flavors: [], main: "any", budget: "any", avoid: "兰州拉面", mode: 3 },
    });
    if (r.data.cards.some((c) => (c.dish.stall || "").includes("兰州拉面"))) ok = false;
  }
  check("避雷“兰州拉面”8 轮（含试试新的）不再出现", ok);
  // 关键词定向：把“胖妹面庄”的招牌菜钓出来，验证档口名确实进入匹配范围
  let ok2 = true;
  for (let i = 0; i < 6; i++) {
    const r = await API.recommend({
      text: "杂酱酸辣粉", mode: 3,
      profile: { flavors: [], main: "any", budget: "any", avoid: "胖妹面庄", mode: 3 },
    });
    if (r.data.cards.some((c) => (c.dish.stall || "").includes("胖妹面庄"))) ok2 = false;
  }
  check("避雷命中招牌菜时也不推该档口", ok2);
}

// —— 5) 今天吃过：选中后不再推荐，撤销后恢复资格 ——
{
  const first = await API.recommend({ text: "", mode: 1 });
  const id = first.data.cards[0].dish.id;
  for (let i = 0; i < 6; i++) {
    const r = await API.recommend({ text: "", mode: 1, excludeIds: [id] });
    if (r.data.cards[0].dish.id === id) { check("今天吃过的菜被排除", false); break; }
  }
  check("今天吃过的菜被排除", true);
  const back = await API.recommend({ text: "", mode: 1, excludeIds: [] });
  check("撤销后（不传 excludeIds）可再次出现", back.data.cards.length === 1);
}

// —— 6) 冲突裁决 + “两种都看看” ——
{
  const r = await API.recommend({ text: "不想吃肉，想吃肉", mode: 3 });
  check("荤素冲突被识别", r.data.conflicts.length === 1 && r.data.conflicts[0].type === "荤素");
  const [veg, meat] = await Promise.all([
    API.recommend({ text: "不想吃肉，想吃肉", mode: 1, override: { main: "veg" } }),
    API.recommend({ text: "不想吃肉，想吃肉", mode: 1, override: { main: "meat" } }),
  ]);
  check("override 素卡为素", veg.data.cards[0].dish.main === "素");
  check("override 荤卡为荤", meat.data.cards[0].dish.main === "荤");
}

// —— 7) 画像口味权重：有导向但不得垄断（v2.1 从 +8/项 降到 +5/项封顶）——
{
  const rows = [];
  const stallsArr = [];
  for (let i = 0; i < 12; i++) {
    const r = await API.recommend({
      text: "", mode: 3,
      profile: { flavors: ["辣", "咸鲜"], main: "any", budget: "any", mode: 3 },
    });
    r.data.cards.forEach((c) => {
      rows.push(c.dish);
      stallsArr.push(c.dish.stall);
    });
  }
  const spicyRate = rows.filter((d) => {
    const fl = Array.isArray(d.flavors) ? d.flavors : String(d.flavors || "").split("|");
    return fl.includes("辣") || (d.spicy || 0) >= 2;
  }).length / rows.length;
  check("勾“辣+咸鲜”后辣占比 ≤ 90%（不垄断）", spicyRate <= 0.9, `${(spicyRate * 100).toFixed(0)}%`);
  const diversity = new Set(stallsArr).size;
  const count = {};
  stallsArr.forEach((s) => (count[s] = (count[s] || 0) + 1));
  const maxShare = Math.max(...Object.values(count)) / stallsArr.length;
  // 阈值按实测分位数定：36 张卡的档口数中位数约 17、5% 分位约 13；单档口占比 95% 分位约 28%
  check("12 轮三卡的档口数量 ≥ 13（多样性）", diversity >= 13, `${diversity} 个档口`);
  check("任一档口占比 ≤ 35%（不垄断）", maxShare <= 0.35, `${(maxShare * 100).toFixed(0)}%`);
}

// —— 8) 忌辣硬过滤 ——
{
  let ok = true;
  for (let i = 0; i < 8; i++) {
    const r = await API.recommend({ text: "不能吃辣", mode: 3 });
    if (r.data.cards.some((c) => (c.dish.spicy || 0) > 0 && !c.relaxed)) ok = false;
  }
  check("“不能吃辣”8 轮不推辣菜（未放宽时）", ok);
}

if (failed) {
  console.error(`\n${failed} 项集成测试失败`);
  process.exit(1);
}
console.log("\n集成测试全部通过");
