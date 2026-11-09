// 冒烟测试：数据可加载、字段契约完整、三种推荐模式都能出卡
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "what-to-eat") + path.sep;
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
// v2.3 清洗掉约 330 条“加菜/小料/元区/必选”条目，并把自选档口折叠成虚拟菜
check("菜品总数 ≥ 2500", DB.dishes.length >= 2500);
const stalls = new Set(DB.dishes.map((d) => d.stall));
check("档口总数 ≥ 59", stalls.size >= 59);

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

// 2.1) 数据卫生：加菜数据是用户实测反馈的头号问题，必须守住
const ADDON_GROUP = /(加菜|加料|小料|必选|锅底|汤底|蘸料|调料包|餐具|打包盒|餐盒|温馨提示|点餐前|辣度|味型|选酱|加配菜|加量|单点|元区|撸串|关东煮)/;
const addonLeft = DB.dishes.filter((d) => ADDON_GROUP.test((d.rawGroup || "").replace(/\s/g, "")) && !/不含米饭/.test(d.rawGroup || ""));
check(`无加菜分组残留（${addonLeft.length} 条）`, addonLeft.length === 0);
const BARE = /^(番茄|西红柿|土豆|藕片|莲藕|金针菇|香菇|平菇|木耳|豆干|豆皮|腐竹|宽粉|粉丝|苕皮|年糕|生菜|白菜|娃娃菜|油麦菜|豆芽|海带|洋葱|青椒|芹菜|花菜|西兰花|山药|玉米|南瓜|黄瓜|茄子|竹笋|莴笋|煎蛋|卤蛋|卤鸡蛋|茶叶蛋|鹌鹑蛋|火腿肠|午餐肉|蟹排|鱼豆腐|虾饺|牛肉丸|鱼丸|甜不辣|油条|麻花|锁骨|鸭翅|鸭血|包菜|土豆片|土豆粉|千叶豆腐|方便面|肥牛|酥肉|鱿鱼)$/;
const bareLeft = DB.dishes.filter((d) => BARE.test(d.name) && d.price <= 8);
check(`无低价纯原料条目（${bareLeft.length} 条）`, bareLeft.length === 0);
const noFlavor = DB.dishes.filter((d) => !Array.isArray(d.flavors) || d.flavors.length === 0);
check(`口味标签覆盖 ≥ 95%（缺失 ${noFlavor.length} 条）`, noFlavor.length <= DB.dishes.length * 0.05);

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
