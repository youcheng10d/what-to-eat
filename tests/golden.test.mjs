// 金文件测试：固定随机种子，把推荐结果快照下来做逐轮比对
// 用法：node tests/golden.test.mjs            —— 比对（CI 用）
//       node tests/golden.test.mjs --update   —— 确认改动后重新生成基准
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../what-to-eat");
const GOLDEN = path.resolve(HERE, "golden/recommend-golden.json");
const UPDATE = process.argv.includes("--update");

const dataSrc = fs.readFileSync(path.join(ROOT, "data/data.js"), "utf8");
const apiSrc = fs.readFileSync(path.join(ROOT, "api.js"), "utf8");

function makeSandbox(seed) {
  let s = seed >>> 0;
  const random = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const M = Object.create(Math);
  M.random = random;
  const sb = { window: { __WTE_FAST__: true }, Math: M, console };
  vm.runInNewContext(dataSrc, sb);
  vm.runInNewContext(apiSrc, sb);
  return sb;
}

const CASES = [
  { key: "plain-single", seed: 7, rounds: 3, args: { text: "", mode: 1 } },
  { key: "plain-three", seed: 11, rounds: 3, args: { text: "", mode: 3 } },
  { key: "spicy-profile", seed: 23, rounds: 3, args: { text: "", mode: 3, profile: { flavors: ["辣", "咸鲜"], main: "any", budget: "any", mode: 3 } } },
  { key: "no-noodle", seed: 31, rounds: 3, args: { text: "不吃面", mode: 3 } },
  { key: "avoid-stall", seed: 41, rounds: 3, args: { text: "", mode: 3, profile: { flavors: [], main: "any", budget: "any", avoid: "兰州拉面", mode: 3 } } },
  { key: "budget-meat", seed: 53, rounds: 3, args: { text: "预算15元、要吃肉", mode: 3 } },
];

async function snapshot() {
  const out = {};
  for (const c of CASES) {
    const sb = makeSandbox(c.seed);
    const rounds = [];
    for (let i = 0; i < c.rounds; i++) {
      const r = await sb.window.API.recommend(c.args);
      rounds.push(
        r.data.cards.map((x) => `${x.dish.name}@${x.dish.stall}¥${x.dish.price}`)
      );
    }
    out[c.key] = rounds;
  }
  return out;
}

const next = await snapshot();

if (!fs.existsSync(GOLDEN) || UPDATE) {
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(`已生成金文件：${GOLDEN}${UPDATE ? "（--update 覆盖）" : ""}`);
  console.log("金文件已更新，请人工确认新基准符合预期后再提交。");
} else {
  const base = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  let failed = 0;
  for (const key of Object.keys(base)) {
    const a = JSON.stringify(base[key]);
    const b = JSON.stringify(next[key]);
    const ok = a === b;
    console.log((ok ? "PASS  " : "FAIL  ") + `金文件 ${key}`);
    if (!ok) {
      failed++;
      console.log("  期望:", a);
      console.log("  实际:", b);
    }
  }
  if (failed) {
    console.error(`\n${failed} 项金文件不一致。若本轮改动是有意的，请跑 --update 并人工复核。`);
    process.exit(1);
  }
  console.log("\n金文件测试全部一致");
}
