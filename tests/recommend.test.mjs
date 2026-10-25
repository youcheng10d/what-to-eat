// 推荐引擎回归：用小规模 mock 数据验证核心规则，CI 中运行
import fs from "node:fs";
import vm from "node:vm";

const apiSrc = fs.readFileSync(new URL("../what-to-eat/api.js", import.meta.url), "utf8");

const mkDish = (o) => ({
  id: o.name,
  spicy: 0,
  cal: 500,
  category: "家常小炒",
  main: "荤",
  tags: [],
  ...o,
});

const sandbox = {
  window: {
    __WTE_FAST__: true,
    DB: {
      dishes: [
        mkDish({ name: "鸡胸肉沙拉", stall: "四季轻食", price: 14, main: "素", cal: 350, taste: ["清淡"] }),
        mkDish({ name: "红烧肉盖饭", stall: "公社小炒", price: 13, cal: 780 }),
        mkDish({ name: "白粥", stall: "早餐铺", price: 2, category: "汤粥", main: "素", cal: 120 }),
        mkDish({ name: "麻辣香锅", stall: "香锅居", price: 18, spicy: 3, cal: 900 }),
        mkDish({ name: "素炒时蔬", stall: "公社小炒", price: 8, main: "素", cal: 300 }),
      ],
    },
  },
};
vm.runInNewContext(apiSrc, sandbox);
const API = sandbox.window.API;

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "PASS  " : "FAIL  ") + name);
  if (!cond) failed++;
};

// 1) 轻食意图：不应推包子粥，应落到轻食档
{
  const r = await API.recommend({ text: "减肥 想瘦一点", mode: 1 });
  check("轻食意图命中轻食菜", r.data.cards[0].dish.name === "鸡胸肉沙拉");
}

// 2) 冲突裁决：识别并按后写优先执行
{
  const r = await API.recommend({ text: "我不喜欢肉肉，想吃肉", mode: 1 });
  check("荤素冲突被识别", r.data.conflicts.length === 1 && r.data.conflicts[0].type === "荤素");
  check("按后写的“想吃肉”执行", r.data.cards[0].dish.main === "荤");
}

// 3) 预算硬过滤
{
  const r = await API.recommend({ text: "预算2元", mode: 1 });
  const c = r.data.cards[0];
  check("预算 2 元不超限", c.dish.price <= 2 || c.relaxed);
}

// 4) 忌辣硬过滤
{
  const r = await API.recommend({ text: "不能吃辣", mode: 1 });
  const c = r.data.cards[0];
  check("忌辣不推辣菜", c.dish.spicy === 0 || c.relaxed);
}

// 5) “两种都看看”override
{
  const [veg, meat] = await Promise.all([
    API.recommend({ text: "不吃肉，想吃肉", mode: 1, override: { main: "veg" } }),
    API.recommend({ text: "不吃肉，想吃肉", mode: 1, override: { main: "meat" } }),
  ]);
  check("override 按不吃肉挑", veg.data.cards[0].dish.main === "素");
  check("override 按想吃肉挑", meat.data.cards[0].dish.main === "荤");
  check("override 卡片带标签", !!veg.data.cards[0].label && !!meat.data.cards[0].label);
}

if (failed) {
  console.error(`\n${failed} 项回归失败`);
  process.exit(1);
}
console.log("\n全部回归用例通过");
