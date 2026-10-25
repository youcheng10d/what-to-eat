// 数据契约校验：在 CI 中运行，防止 data.js 重建后结构漂移
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../what-to-eat/data/data.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const db = sandbox.window.DB_REAL;

const fail = (msg) => {
  console.error("数据校验失败：" + msg);
  process.exit(1);
};

if (!db) fail("window.DB_REAL 不存在");
if (!Array.isArray(db.dishes)) fail("dishes 不是数组");
if (db.dishes.length < 1000) fail(`菜品数量异常：${db.dishes.length}`);
if (!db.stallMeta || typeof db.stallMeta !== "object") fail("stallMeta 缺失");

const required = ["name", "stall", "price", "category", "main", "spicy", "cal"];
let bad = 0;
for (const d of db.dishes) {
  for (const k of required) {
    if (d[k] === undefined || d[k] === null || d[k] === "") {
      bad++;
      if (bad <= 3) console.error(`缺字段 ${k}：${d.name || "(无名)"}`);
      break;
    }
  }
}
if (bad) fail(`${bad} 道菜缺必要字段`);

const stalls = new Set(db.dishes.map((d) => d.stall));
for (const s of stalls) {
  if (!db.stallMeta[s]) fail(`stallMeta 缺档口：${s}`);
}

console.log(`数据校验通过：${db.dishes.length} 道菜 / ${stalls.size} 个档口`);
