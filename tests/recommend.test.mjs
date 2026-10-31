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
        // 面食两条：用于验证“不吃面”与面食意图
        mkDish({ name: "重庆小面", stall: "胖妹面庄", price: 9, category: "面食", main: "素", cal: 520, flavors: ["辣"], taste: ["辣"] }),
        mkDish({ name: "清汤抄手", stall: "抄手馄饨大王", price: 8, category: "面食", main: "荤", cal: 480, taste: ["清淡"] }),
        // v2.2 靶子：水饺（验证“不吃水饺”关键词排除）
        mkDish({ name: "韭菜鸡蛋水饺", stall: "惠芯意鲜饺坊", price: 10, category: "面食", main: "荤", cal: 450, taste: ["咸鲜"] }),
        // v2.2 靶子：跨品类面类泄漏（品类是盖浇饭、名字带面）
        mkDish({ name: "番茄鸡蛋盖浇面", stall: "沈大爷", price: 12, category: "盖浇饭", main: "荤", cal: 620, taste: ["酸甜"] }),
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

// 6) v2.1/v2.2 修复：“不吃面”不能被当成“想吃面”，且面类制品（含跨品类挂靠的）都要排除
{
  const isNoodleLike = (d) => d.category === "面食" || /面|粉|米线|饺子|水饺|抄手|馄饨|拉面|刀削/.test(d.name || "");
  for (let i = 0; i < 6; i++) {
    const r = await API.recommend({ text: "不吃面", mode: 3 });
    check(`不吃面不推面类制品（第${i + 1}轮）`, r.data.cards.every((c) => !isNoodleLike(c.dish)));
  }
}

// 7) v2.1 修复：面食意图仍然可用（“来碗面”应推面类制品）
{
  const r = await API.recommend({ text: "来碗面", mode: 1 });
  const d = r.data.cards[0].dish;
  const isNoodleLike = d.category === "面食" || /面|粉|米线|饺子|水饺|抄手|馄饨|拉面|刀削/.test(d.name || "");
  check("“来碗面”命中面类制品", isNoodleLike);
}

// 9) v2.2：具体对象否定按关键词排除——“不吃水饺”不得推水饺
{
  for (let i = 0; i < 6; i++) {
    const r = await API.recommend({ text: "不吃水饺", mode: 3 });
    check(`不吃水饺不推水饺（第${i + 1}轮）`, r.data.cards.every((c) => !/水饺|饺子/.test(c.dish.name || "")));
  }
}

// 8) v2.1 新增：档案避雷填档口名 → 整档排除
{
  let ok = true;
  for (let i = 0; i < 8; i++) {
    const r = await API.recommend({
      text: "", mode: 3,
      profile: { flavors: [], main: "any", budget: "any", avoid: "公社小炒", mode: 3 },
    });
    if (r.data.cards.some((c) => (c.dish.stall || "").includes("公社小炒"))) ok = false;
  }
  check("档案避雷档口名 → 不再推该档口", ok);
}

if (failed) {
  console.error(`\n${failed} 项回归失败`);
  process.exit(1);
}
console.log("\n全部回归用例通过");
