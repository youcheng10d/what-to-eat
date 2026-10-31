// 冒烟测试：数据可加载、字段契约完整、三种推荐模式都能出卡
import fs from "node:fs";
import vm from "node:vm";

const ROOT = "D:/code/TRAE/项目一  今天吃啥/what-to-eat/";
const sandbox = { window: { __WTE_FAST__: true }, Math, console };
vm.runInNewContext(fs.readFileSync(ROOT + "data/data.js", "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync(ROOT + "api.js", "utf8"), sandbox);
const API = sandbox.window.API;
const DB = sandbox.window.DB_REAL;

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "PASS  " : "FAIL  ") + name);
  if (!cond) failed++;
};

// 1) 数据加载
check("数据加载成功", !!DB && Array.isArray(DB.dishes));
check("菜品总数 1143", DB.dishes.length === 1143);
const stalls = new Set(DB.dishes.map((d) => d.stall));
check("档口总数 49", stalls.size === 49);

// 2) 字段契约
const required = ["id", "name", "price", "cal", "category", "stall"];
const missing = DB.dishes.filter((d) => required.some((k) => d[k] == null || d[k] === ""));
check(`必填字段无缺失（缺失 ${missing.length} 条）`, missing.length === 0);
const badPrice = DB.dishes.filter((d) => !(typeof d.price === "number" && d.price >= 0 && d.price <= 100));
check(`价格区间合理（异常 ${badPrice.length} 条）`, badPrice.length === 0);
const badCal = DB.dishes.filter((d) => !(typeof d.cal === "number" && d.cal >= 0 && d.cal <= 3000));
check(`热量区间合理（异常 ${badCal.length} 条）`, badCal.length === 0);
const idDup = DB.dishes.length - new Set(DB.dishes.map((d) => d.id)).size;
check(`id 唯一（重复 ${idDup} 条）`, idDup === 0);

// 3) API 就位
check("API 三个方法齐全", typeof API.recommend === "function" && typeof API.inspect === "function" && typeof API.recommendDish === "function");

// 4) 三种模式出卡且结构完整
for (const mode of [1, 3]) {
  const r = await API.recommend({ text: "", mode });
  const cards = r.data.cards;
  check(`mode=${mode} 出卡数量正确`, cards.length === mode);
  check(`mode=${mode} 卡片结构完整`, cards.every((c) => c.dish && typeof c.reason === "string" && c.reason.length > 0 && Array.isArray(c.matched)));
  check(`mode=${mode} 卡片餐品字段可渲染`, cards.every((c) => c.dish.name && c.dish.stall && c.dish.category));
  if (mode === 3) check("三卡档口互不相同", new Set(cards.map((c) => c.dish.stall)).size === 3);
}

// 5) 实时预检不报错
check("inspect 正常返回", Array.isArray(API.inspect("不想吃肉，想吃肉", null).conflicts));

if (failed) {
  console.error(`\n${failed} 项冒烟失败`);
  process.exit(1);
}
console.log("\n冒烟测试全部通过");
