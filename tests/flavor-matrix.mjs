// 口味矩阵试验（v2.3）
// 6 个口味共 63 种非空搭配（C6,1+C6,2+…+C6,6）；每种搭配跑两段：
//
// 口径 A（主）——自然采样 20 次，检验前端唯一存在的交互：
//   勾选 k 个“喜欢口味”后，推荐卡是否命中已选口味；没命中的卡是不是探索位，
//   以及探索卡是否真的不含任何已选口味（纯度）。同时验证稳态换口味 ≈3/10。
//
// 口径 B（辅）——自由输入框的否定语义 12 次（6 次正向 / 6 次“不想吃 X”，随机交错）：
//   前端没有“禁止口味”控件，但用户可以在输入框直接打字，这条路径同样要可靠。
//
// 跑完输出逐组明细与汇总，供下一步调参。
import fs from "node:fs";
import vm from "node:vm";

const FLAVORS = ["辣", "麻", "酸甜", "咸鲜", "清淡", "甜"];
const HIT = 6;
const AVOID = 6;

// 固定种子，保证每次跑出来的结论可复现
let seed = 20261109;
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

const sandbox = { window: { __WTE_FAST__: true }, Math, console };
vm.runInNewContext(fs.readFileSync("what-to-eat/data/data.js", "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync("what-to-eat/api.js", "utf8"), sandbox);
const API = sandbox.window.API;

function combos() {
  const out = [];
  for (let mask = 1; mask < 1 << FLAVORS.length; mask++) {
    out.push(FLAVORS.filter((_, i) => mask & (1 << i)));
  }
  return out.sort((a, b) => a.length - b.length || a.join().localeCompare(b.join()));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const flavorsOf = (d) => (Array.isArray(d.flavors) ? d.flavors : d.flavors ? [d.flavors] : []);
const inter = (a, b) => a.filter((x) => b.includes(x));

const rows = [];
const details = { hitMiss: [], avoidBad: [] };

for (const combo of combos()) {
  const plan = shuffle([...Array(HIT).fill("hit"), ...Array(AVOID).fill("avoid")]);
  const history = [];
  const stat = {
    combo,
    hitRuns: 0, hits: 0, explores: 0, strongs: 0, slotHonored: 0,
    avoidRuns: 0, avoids: 0,
    dishIds: new Set(), stalls: new Set(), flavorSeen: new Set(),
    seq: [],
  };

  for (const mode of plan) {
    let r;
    if (mode === "hit") {
      r = await API.recommend({
        text: "", mode: 1,
        profile: { flavors: combo, main: "any", budget: "any" },
        flavorHistory: history,
      });
      const c = r.data.cards[0];
      const d = c.dish;
      const fl = flavorsOf(d);
      const hit = inter(fl, combo);
      stat.hitRuns++;
      if (hit.length) { stat.hits++; stat.seq.push("H"); }
      else {
        stat.explores++; stat.seq.push("E");
        details.hitMiss.push({ combo, name: d.name, fl, slot: c.slot });
      }
      if (c.slot && c.slot.explore) { stat.explores += 0; if (c.slot.strong) stat.strongs++; }
      if (c.slot && fl.includes(c.slot.flavor)) stat.slotHonored++;
      if (c.slot) {
        history.push({ f: c.slot.flavor, e: c.slot.explore ? 1 : 0, s: c.slot.strong ? 1 : 0 });
        history.splice(0, Math.max(0, history.length - 10));
      }
      stat.dishIds.add(d.id);
      stat.stalls.add(d.stall);
      fl.forEach((f) => stat.flavorSeen.add(f));
    } else {
      const text = combo.map((f) => `不想吃${f}`).join(" ");
      r = await API.recommend({ text, mode: 1 });
      const d = r.data.cards[0].dish;
      const fl = flavorsOf(d);
      const bad = inter(fl, combo);
      stat.avoidRuns++;
      if (!bad.length) stat.avoids++;
      else details.avoidBad.push({ combo, name: d.name, fl, bad });
      stat.dishIds.add(d.id);
      stat.stalls.add(d.stall);
      fl.forEach((f) => stat.flavorSeen.add(f));
    }
  }

  // 已选口味的覆盖情况：这 12 道菜里实际出现过哪些已选口味
  stat.covered = combo.filter((f) => stat.flavorSeen.has(f)).length;
  rows.push(stat);
}

// ---------- 口径 A：自然采样（前端真实交互）----------
const NAT = 20;
const natural = [];
for (const combo of combos()) {
  const history = [];
  const st = {
    combo, n: 0, hit: 0, explore: 0, explorePure: 0, silentMiss: 0, strong: 0,
    warmExplore: 0, steadyExplore: 0, stalls: new Set(), ids: new Set(),
  };
  for (let i = 0; i < NAT; i++) {
    const r = await API.recommend({
      text: "", mode: 1,
      profile: { flavors: combo, main: "any", budget: "any" },
      flavorHistory: history,
    });
    const c = r.data.cards[0];
    const fl = flavorsOf(c.dish);
    const hit = inter(fl, combo).length > 0;
    st.n++;
    if (hit) st.hit++;
    if (c.slot && c.slot.explore) {
      st.explore++;
      if (!hit) st.explorePure++; // 探索卡完全不含已选口味 = 干净
      if (c.slot.strong) st.strong++;
      if (i < 10) st.warmExplore++; else st.steadyExplore++;
    } else if (!hit) {
      st.silentMiss++; // 既没命中、也不是探索位 = 静默漏配
    }
    if (c.slot) history.push({ f: c.slot.flavor, e: c.slot.explore ? 1 : 0, s: c.slot.strong ? 1 : 0 });
    history.splice(0, Math.max(0, history.length - 10));
    st.stalls.add(c.dish.stall);
    st.ids.add(c.dish.id);
  }
  natural.push(st);
}

// ---------- 输出 ----------
const pad = (s, n) => String(s).padEnd(n, " ");

console.log("\n== 口径 A：自然采样 20 次（只勾“喜欢口味”，前端真实交互）==");
console.log(pad("组合", 16) + pad("命中", 8) + pad("探索", 8) + pad("纯净", 10) + pad("静默漏配", 10) + pad("前10探索", 10) + "后10探索");
for (const r of natural) {
  console.log(
    pad(r.combo.join("+"), 16) +
    pad(`${r.hit}/${r.n}`, 8) +
    pad(r.explore, 8) +
    pad(`${r.explorePure}/${r.explore}`, 10) +
    pad(r.silentMiss, 10) +
    pad(r.warmExplore, 10) +
    r.steadyExplore
  );
}
{
  const n = natural.reduce((s, r) => s + r.n, 0);
  const hit = natural.reduce((s, r) => s + r.hit, 0);
  const ex = natural.reduce((s, r) => s + r.explore, 0);
  const pure = natural.reduce((s, r) => s + r.explorePure, 0);
  const silent = natural.reduce((s, r) => s + r.silentMiss, 0);
  const steadyN = natural.reduce((s, r) => s + (r.n - 10), 0);
  const steadyEx = natural.reduce((s, r) => s + r.steadyExplore, 0);
  console.log(`\n合计 ${n} 张：命中 ${hit} (${(hit / n * 100).toFixed(1)}%)，探索 ${ex} (${(ex / n * 100).toFixed(1)}%)，`
    + `探索纯净 ${pure}/${ex} (${(pure / Math.max(1, ex) * 100).toFixed(1)}%)，静默漏配 ${silent}`);
  console.log(`稳态（第 11-20 张）探索率 ${steadyEx}/${steadyN} = ${(steadyEx / steadyN * 100).toFixed(1)}%（设计目标 30%）`);
  console.log("\n按口味数分层：");
  for (let k = 1; k <= 6; k++) {
    const sub = natural.filter((r) => r.combo.length === k);
    const sn = sub.reduce((s, r) => s + r.n, 0);
    const sh = sub.reduce((s, r) => s + r.hit, 0);
    const se = sub.reduce((s, r) => s + r.explore, 0);
    const ssp = sub.reduce((s, r) => s + r.steadyExplore, 0);
    const ssn = sub.reduce((s, r) => s + (r.n - 10), 0);
    const sp = sub.reduce((s, r) => s + r.explorePure, 0);
    console.log(`  ${k} 个口味（${sub.length} 组）：命中 ${(sh / sn * 100).toFixed(1)}% ｜ 探索 ${(se / sn * 100).toFixed(1)}%`
      + ` ｜ 稳态探索 ${(ssp / ssn * 100).toFixed(1)}% ｜ 探索纯净 ${(sp / Math.max(1, se) * 100).toFixed(0)}%`);
  }
}

console.log("\n== 口径 B：自由输入框否定语义（6 正向 / 6 “不想吃 X”，随机交错）==");
console.log(pad("组合", 16) + pad("命中", 10) + pad("避开", 10) + pad("覆盖", 8) + pad("档口", 6) + pad("唯一菜", 8) + "序列");
for (const r of rows) {
  console.log(
    pad(r.combo.join("+"), 16) +
    pad(`${r.hits}/${r.hitRuns}`, 10) +
    pad(`${r.avoids}/${r.avoidRuns}`, 10) +
    pad(`${r.covered}/${r.combo.length}`, 8) +
    pad(r.stalls.size, 6) +
    pad(r.dishIds.size, 8) +
    r.seq.join("")
  );
}

function agg(list) {
  const h = list.reduce((s, r) => s + r.hits, 0);
  const hr = list.reduce((s, r) => s + r.hitRuns, 0);
  const a = list.reduce((s, r) => s + r.avoids, 0);
  const ar = list.reduce((s, r) => s + r.avoidRuns, 0);
  return { h, hr, a, ar, rate: (h / hr * 100).toFixed(1), arate: (a / ar * 100).toFixed(1) };
}
const all = agg(rows);
console.log("\n== 汇总 ==");
console.log(`命中方向：${all.h}/${all.hr} = ${all.rate}%`);
console.log(`避开方向：${all.a}/${all.ar} = ${all.arate}%`);
for (let k = 1; k <= 6; k++) {
  const sub = rows.filter((r) => r.combo.length === k);
  const s = agg(sub);
  console.log(`  ${k} 个口味（${sub.length} 组）：命中 ${s.rate}% ｜ 避开 ${s.arate}%`);
}

const missByFlavor = {};
for (const m of details.hitMiss) for (const f of m.combo) missByFlavor[f] = (missByFlavor[f] || 0) + 1;
console.log("\n命中方向的探索样本（不属于已选口味）：", details.hitMiss.length);
console.log(Object.entries(missByFlavor).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}:${n}`).join("  "));
console.log("\n避开方向的违例样本：", details.avoidBad.length);
const badByFlavor = {};
for (const m of details.avoidBad) for (const f of m.bad) badByFlavor[f] = (badByFlavor[f] || 0) + 1;
console.log(Object.entries(badByFlavor).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}:${n}`).join("  ") || "无");
if (details.avoidBad.length) {
  console.log(details.avoidBad.slice(0, 12).map((m) => `${m.combo.join("+")} → ${m.name}[${m.fl.join("/")}]`).join("\n"));
}
