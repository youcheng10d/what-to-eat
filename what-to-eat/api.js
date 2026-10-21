// api.js — 推荐服务层（mock 实现，接口形状即未来真实后端）
// POST /api/recommend  { preferences: string, excludeIds?: number[] }
//   ← { code: 0, data: { dish, matched: string[], reason: string, relaxed: boolean, relaxedNote?: string } }
// TODO: 接入真实后端时，将内部实现替换为 fetch('/api/recommend')，入参与返回结构保持不变。
(function () {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // —— 1) 偏好解析：把自然语言拆成结构化条件 ——
  function parsePreferences(text) {
    const s = (text || "").toLowerCase();
    const p = {
      maxPrice: null, maxCal: null,
      noSpicy: false, wantSpicy: false, wantVeg: false, wantMeat: false,
      preferCat: [], preferTaste: [], preferTag: [],
    };
    const budget = s.match(/(\d+(?:\.\d+)?)\s*(?:元|块|rmb|￥|¥)/);
    if (budget) p.maxPrice = parseFloat(budget[1]);
    if (/便宜|省钱|预算.{0,4}(紧|少)|生活费不多/.test(s)) p.maxPrice = Math.min(p.maxPrice ?? 10, 10);
    if (/减肥|减脂|瘦身|轻食|低卡|卡路里|热量/.test(s)) { p.maxCal = 500; p.preferTag.push("低卡"); }
    if (/不想吃辣|不吃辣|忌辣|不能吃辣|别太辣|不要辣|免辣|怕辣/.test(s)) p.noSpicy = true;
    if (!p.noSpicy && /想吃辣|无辣不欢|能吃辣|爱吃辣|辣一点|重口/.test(s)) p.wantSpicy = true;
    if (/吃素|素食|不吃肉|不想吃肉|素一点/.test(s)) p.wantVeg = true;
    if (/想吃肉|无肉不欢|荤一点|大口吃肉/.test(s)) p.wantMeat = true;
    if (/面|饺子/.test(s)) p.preferCat.push("面食");
    if (/米饭|盖饭|盖浇饭|拌饭/.test(s)) p.preferCat.push("盖浇饭");
    if (/麻辣烫|冒菜|香锅/.test(s)) p.preferCat.push("麻辣系列");
    if (/炒菜|小炒|家常菜|下饭/.test(s)) p.preferCat.push("家常小炒");
    if (/沙拉|轻食/.test(s)) p.preferCat.push("轻食沙拉");
    if (/汤|粥|暖胃/.test(s)) p.preferCat.push("汤粥");
    if (/甜|甜品|下午茶/.test(s)) { p.preferCat.push("甜品饮品"); p.preferTaste.push("甜"); }
    if (/早餐|早上/.test(s)) p.preferCat.push("早餐小吃");
    if (/清淡|养生|健康/.test(s)) { p.preferTaste.push("清淡"); if (p.maxCal == null) p.maxCal = 600; }
    if (/高蛋白|健身|增肌/.test(s)) p.preferTag.push("高蛋白");
    if (/性价比|实惠|划算/.test(s)) p.preferTag.push("性价比");
    return p;
  }

  // —— 2) 硬过滤（预算 / 卡路里 / 忌辣 / 素食），无解时逐级放宽 ——
  function filterPool(text, excludeIds) {
    const prefs = parsePreferences(text);
    const all = (window.DB_REAL && window.DB_REAL.dishes) || window.DB.dishes;
    const base = all.filter((d) => !excludeIds.includes(d.id));
    const hard = (p, pool) => pool.filter((d) =>
      (p.maxPrice == null || d.price <= p.maxPrice) &&
      (p.maxCal == null || d.cal <= p.maxCal) &&
      (!p.noSpicy || d.spicy === 0) &&
      (!p.wantVeg || d.veg)
    );
    const droppedKeys = new Set();
    let pool = hard(prefs, base);
    for (const key of ["maxCal", "maxPrice", "wantVeg", "noSpicy"]) {
      if (pool.length) break;
      const val = prefs[key];
      if (val == null || val === false) continue;
      const trial = { ...prefs, [key]: (key === "maxPrice" || key === "maxCal") ? null : false };
      pool = hard(trial, base);
      if (pool.length) { prefs[key] = trial[key]; droppedKeys.add(key); }
    }
    if (!pool.length) pool = base.slice(); // 兜底：全库随机
    return { prefs, pool, droppedKeys };
  }

  // —— 3) 软偏好打分 + 随机抖动，取 top5 加权随机（保证多样性与命中感）——
  function scoreDish(d, p) {
    let sc = Math.random() * 6;
    if (p.wantSpicy && d.spicy >= 2) sc += 12;
    if (p.wantMeat && !d.veg) sc += 12;
    if (p.preferCat.includes(d.category)) sc += 14;
    if (p.preferTaste.some((t) => d.taste.includes(t))) sc += 10;
    if (p.preferTag.some((t) => d.tags.includes(t))) sc += 8;
    if (d.tags.includes("人气")) sc += 2;
    return sc;
  }
  function weightedTopPick(pool, p) {
    const top = pool
      .map((d) => ({ d, sc: scoreDish(d, p) }))
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 5);
    const weights = top.map((_, i) => top.length - i);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < top.length; i++) { r -= weights[i]; if (r < 0) return top[i].d; }
    return top[0].d;
  }

  // —— 4) 命中说明 + 推荐理由 ——
  const OPENERS = ["纠结的时候，交给手感准没错！", "闭眼选也不会错的人气之选。", "这顿就交给命运抽签吧——"];
  const CLOSINGS = ["今天就让它治愈你的胃！", "食堂阿姨已经为你打好饭啦。", "别纠结了，就它了！", "干饭人，冲！", "这一口下去，值回饭钱。"];

  function buildMatched(d, p, dropped) {
    const m = [];
    if (p.maxPrice != null && !dropped.has("maxPrice")) m.push(`预算 ${p.maxPrice} 元内`);
    if (p.maxCal != null && !dropped.has("maxCal")) m.push(`热量仅 ${d.cal} kcal`);
    if (p.noSpicy && !dropped.has("noSpicy")) m.push("完全不辣");
    if (p.wantVeg && !dropped.has("wantVeg")) m.push("素食友好");
    if (p.wantMeat && !d.veg) m.push("有肉，解馋过瘾");
    if (p.wantSpicy && d.spicy >= 2) m.push("够辣够味");
    if (p.preferCat.includes(d.category)) m.push(`正是你想吃的${d.category}`);
    const ts = p.preferTaste.filter((t) => d.taste.includes(t));
    if (ts.length) m.push(`口味${ts.join("、")}，很对你的胃口`);
    const tg = p.preferTag.filter((t) => d.tags.includes(t));
    if (tg.length) m.push(`主打「${tg.join("、")}」`);
    return m;
  }
  function buildReason(d, m) {
    const head = m.length ? m.slice(0, 3).join("，") + "。" : rand(OPENERS);
    const desc = String(d.desc || "").replace(/[，,。；;、\s]*$/, "") + "。";
    return head + desc + rand(CLOSINGS);
  }

  async function recommendDish(preferences = "", { excludeIds = [] } = {}) {
    await delay(650); // 模拟网络延迟，保证 loading 态可见
    // TODO: replace with:
    // const res = await fetch("/api/recommend", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ preferences, excludeIds }),
    // });
    // return await res.json();
    const { prefs, pool, droppedKeys } = filterPool(preferences, excludeIds);
    const dish = weightedTopPick(pool, prefs);
    const matched = buildMatched(dish, prefs, droppedKeys);
    const relaxed = droppedKeys.size > 0;
    const labels = { maxCal: "低卡", maxPrice: "预算", wantVeg: "素食", noSpicy: "忌辣" };
    const relaxedNote = relaxed
      ? `完全匹配的菜有点难找，放宽了${[...droppedKeys].map((k) => labels[k]).join("、")}要求，这碗最接近～`
      : "";
    return {
      code: 0,
      data: { dish, matched, reason: buildReason(dish, matched), relaxed, relaxedNote },
    };
  }

  window.API = { recommendDish };
})();
