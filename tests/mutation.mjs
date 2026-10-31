// 变异测试：向推荐引擎注入 8 个典型缺陷，看测试断言能否全部"杀死"这些变异体
// 用法：node tests/mutation.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../what-to-eat");
const dataSrc = fs.readFileSync(path.join(ROOT, "data/data.js"), "utf8");
const apiSrc = fs.readFileSync(path.join(ROOT, "api.js"), "utf8");

const MUTANTS = [
  { name: "M1 删除面类制品硬过滤", from: "      if (p.avoidCats && p.avoidCats.includes(\"面食\") && isNoodleLike(d)) return false;\n", to: "" },
  { name: "M2 否定宾语剥词失效（“吃水饺”永远匹配不上菜名）", from: '.replace(/^(?:吃|喝|点|放|来|整|搞|太|非常|很|超级|特别|有点)+/, "")', to: "" },
  { name: "M3 避雷匹配范围去掉档口名", from: '${d.stall || ""} ', to: "" },
  { name: "M4 预算上限整体放宽 5 元", from: "if (p.maxPrice != null && d.price > p.maxPrice) return false;", to: "if (p.maxPrice != null && d.price > p.maxPrice + 5) return false;" },
  { name: "M5 忌辣硬过滤失效", from: "if (p.noSpicy && d.spicy > 0) return false;", to: "if (p.noSpicy && d.spicy > 99) return false;" },
  { name: "M6 画像口味权重翻倍并放开封顶", from: "sc += Math.min(12, hits.length * 5);", to: "sc += Math.min(24, hits.length * 12);" },
  { name: "M7 档口分层退化为按菜品等权", from: "      if (!byStall.has(key)) byStall.set(key, []);\n      byStall.get(key).push(x);", to: "      byStall.set(key + Math.random(), [x]);" },
  { name: "M8 去掉品类规模归一", from: "w: Math.exp((gTop - top) / T) * catW", to: "w: Math.exp((gTop - top) / T)" },
  { name: "M9 面类判定退化：丢掉跨品类名字兜底", from: "const isNoodleLike = (d) => d.category === \"面食\" || NOODLE_NAME.test(d.name || \"\");", to: "const isNoodleLike = (d) => d.category === \"面食\";" },
  { name: "M10 通用否定提取失效（不吃水饺/不要葱 全落空）", from: "      while ((m = NEG_RE.exec(s))) {", to: "      while ((m = null)) {" },
];

function makeSandbox(src) {
  const sb = { window: { __WTE_FAST__: true }, Math, console };
  vm.runInNewContext(dataSrc, sb);
  vm.runInNewContext(src, sb);
  return sb.window.API;
}

// 断言集：任一失败即视为该变异体被杀死
// 面类制品判定与 api.js 的 isNoodleLike 一致（品类或名字带面/粉类字样）
const NOODLE_RE = /面|粉|米线|饺子|水饺|抄手|馄饨|拉面|刀削|河粉|粉丝|螺蛳粉|挂面|意面/;
const isNoodleLike = (d) => d.category === "面食" || NOODLE_RE.test(d.name || "");

async function runAssertions(API) {
  const fails = [];

  // K1 “不吃面 / 不想吃面”都不得推任何面类制品（40 轮×3 张，跨品类泄漏也逃不掉）
  for (let i = 0; i < 40; i++) {
    const r = await API.recommend({ text: "不吃面", mode: 3 });
    if (r.data.cards.some((c) => isNoodleLike(c.dish))) { fails.push("K1 不吃面仍推面类制品"); break; }
  }
  for (let i = 0; i < 20; i++) {
    const r = await API.recommend({ text: "不想吃面", mode: 3 });
    if (r.data.cards.some((c) => isNoodleLike(c.dish))) { fails.push("K1b 不想吃面仍推面类制品"); break; }
  }
  // K2 预算 5 元不得越界（未放宽时）
  for (let i = 0; i < 6; i++) {
    const r = await API.recommend({ text: "预算5元", mode: 3 });
    if (r.data.cards.some((c) => !c.relaxed && c.dish.price > 5)) { fails.push("K2 预算越界"); break; }
  }
  // K3 忌辣不得推辣（未放宽时）
  for (let i = 0; i < 8; i++) {
    const r = await API.recommend({ text: "不能吃辣", mode: 3 });
    if (r.data.cards.some((c) => !c.relaxed && (c.dish.spicy || 0) > 0)) { fails.push("K3 忌辣失效"); break; }
  }
  // K4 避雷档口名：用菜名关键词定向把该档口的菜钓出来，避免靠随机抽样碰运气
  for (let i = 0; i < 6; i++) {
    const r = await API.recommend({ text: "杂酱酸辣粉", mode: 3, profile: { flavors: [], main: "any", budget: "any", avoid: "胖妹面庄", mode: 3 } });
    if (r.data.cards.some((c) => (c.dish.stall || "").includes("胖妹面庄"))) { fails.push("K4 档口避雷失效"); break; }
  }
  // K5 单一大档口不得垄断
  const row5 = [];
  for (let i = 0; i < 60; i++) {
    const r = await API.recommend({ text: "", mode: 1 });
    row5.push(r.data.cards[0].dish);
  }
  if (row5.filter((d) => (d.stall || "").includes("外公家")).length / row5.length >= 0.12) fails.push("K5 大档口垄断");
  // K6 画像口味不得垄断
  let spicy = 0, all6 = 0;
  for (let i = 0; i < 12; i++) {
    const r = await API.recommend({ text: "", mode: 3, profile: { flavors: ["辣", "咸鲜"], main: "any", budget: "any", mode: 3 } });
    r.data.cards.forEach((c) => {
      const fl = Array.isArray(c.dish.flavors) ? c.dish.flavors : String(c.dish.flavors || "").split("|");
      all6++;
      if (fl.includes("辣") || (c.dish.spicy || 0) >= 2) spicy++;
    });
  }
  if (spicy / all6 > 0.9) fails.push("K6 画像口味垄断");
  // K7 面食占比回归：基线实测约 16%，M8 变异体约 33%；取 300 次取样降低波动
  const row7 = [];
  for (let i = 0; i < 300; i++) {
    const r = await API.recommend({ text: "", mode: 1 });
    row7.push(r.data.cards[0].dish);
  }
  if (row7.filter((d) => d.category === "面食").length / row7.length >= 0.24) fails.push("K7 面食占比超标");
  // K8 override 卡带标签
  const ov = await API.recommend({ text: "不想吃肉，想吃肉", mode: 1, override: { main: "veg" } });
  if (!ov.data.cards[0].label) fails.push("K8 override 标签缺失");
  // K9 通用否定提取：不吃土豆/不要葱 不得推相关菜（土豆全库 49 道，40 轮×3 张必现形）
  for (let i = 0; i < 40; i++) {
    const r = await API.recommend({ text: "不吃土豆", mode: 3 });
    if (r.data.cards.some((c) => /土豆/.test(`${c.dish.name} ${c.dish.desc || ""}`))) { fails.push("K9 否定提取失效"); break; }
  }
  for (let i = 0; i < 40; i++) {
    const r = await API.recommend({ text: "不要葱", mode: 3 });
    if (r.data.cards.some((c) => /葱/.test(`${c.dish.name} ${c.dish.desc || ""}`))) { fails.push("K9 否定提取失效(葱)"); break; }
  }

  return fails;
}

const baseFails = await runAssertions(makeSandbox(apiSrc));
if (baseFails.length) {
  console.error("原始代码未通过断言集，无法进行变异测试：", baseFails);
  process.exit(1);
}
console.log("原始代码：断言集全过，可以开始变异\n");

let killed = 0;
for (const m of MUTANTS) {
  if (!apiSrc.includes(m.from)) {
    console.log(`SKIP  ${m.name}（未找到目标代码，可能已改动）`);
    continue;
  }
  const mutated = apiSrc.replace(m.from, m.to);
  let fails;
  try {
    fails = await runAssertions(makeSandbox(mutated));
  } catch (e) {
    fails = ["运行异常: " + e.message];
  }
  if (fails.length) {
    killed++;
    console.log(`KILLED  ${m.name}  ← ${fails[0]}`);
  } else {
    console.log(`SURVIVED  ${m.name}  ← 未被任何断言发现`);
  }
}

const rate = (killed / MUTANTS.length) * 100;
console.log(`\n变异体 ${MUTANTS.length} 个，杀死 ${killed} 个，杀死率 ${rate.toFixed(0)}%`);
if (killed < MUTANTS.length) process.exit(1);
