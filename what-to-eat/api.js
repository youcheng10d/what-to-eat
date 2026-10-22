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
    // 预算分两档：说了「便宜/省钱」按 10 元档；写了「10-15 元」取上限，避免只取到 10 变成过严
    const range = s.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*(?:元|块|rmb|￥|¥)/);
    const budget = s.match(/(\d+(?:\.\d+)?)\s*(?:元|块|rmb|￥|¥)/);
    if (range) p.maxPrice = parseFloat(range[2]);
    else if (budget) p.maxPrice = parseFloat(budget[1]);
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
    if (/甜|甜品|下午茶|奶茶|糖水|饮料|想喝|喝点/.test(s)) { p.preferCat.push("甜品饮品"); p.preferTaste.push("甜"); }
    if (/早餐|早上/.test(s)) p.preferCat.push("早餐小吃");
    if (/清淡|养生|健康/.test(s)) { p.preferTaste.push("清淡"); if (p.maxCal == null) p.maxCal = 600; }
    if (/高蛋白|健身|增肌/.test(s)) p.preferTag.push("高蛋白");
    if (/性价比|实惠|划算/.test(s)) p.preferTag.push("性价比");
    // 菜名关键词：先删含否定的片段（防「不想吃辣」提取出「辣」），再删虚词取核心词匹配菜名。
    // 已经交给硬过滤/软偏好的意图词（肉、素、辣、甜、清淡…）要从 core 里剔除，否则
    // 「想吃肉」会被收窄成菜名带「肉」的 355 道，「吃素」只剩 28 道——都不是用户的本意。
    const core = s
      .replace(/[^，,。、\s！？]*(?:不想|不吃|不喝|不要|别|忌)[^，,。、\s！？]*/g, "")
      .replace(/\d+(?:\.\d+)?\s*(?:元|块|rmb|￥|¥)|预算|减肥|减脂|瘦身|降重/g, "")
      .replace(/想吃肉|无肉不欢|荤一点|大口吃肉|吃素|素食|素一点|无辣不欢|能吃辣|爱吃辣|辣一点|重口|清淡|养生|健康|低卡|低脂|高蛋白|健身|增肌|性价比|实惠|划算|便宜|省钱/g, "")
      .replace(/想吃|想喝|喝点|来碗|来份|来个|来点|吃点|给我|替我|帮我|决定|早餐|午餐|晚餐|宵夜|今天|明天|一下|一点|随便|都行|什么|啥|口味/g, "")
      .replace(/[，,。、\s！？]/g, "")
      .replace(/[吃喝]/g, "")
      .replace(/的$/, "");
    // 单字意图词留在 core 里会误当菜名（例如「辣」「面」），统一走偏好层，不再锁关键词
    const GENERIC = /^(?:肉|素|辣|甜|面|面食|饭|汤|粥|菜|早餐|午餐|晚餐|宵夜|清淡|健康|饮料|甜品)$/;
    if (core.length >= 1 && core.length <= 6 && !GENERIC.test(core) && !/^[的了吧呢吗]?$/.test(core)) p.keyword = core;
    return p;
  }

  // —— 2) 硬过滤层：只放有明确边界的条件（预算 / 热量 / 忌辣 / 荤素）——
  // 口味、分类、关键词都是软偏好，留给下一层打分；「都行」不产生任何硬条件。
  const isMeat = (d) => (d.main ? d.main === "荤" : !d.veg);
  const isVeg = (d) => (d.main ? d.main === "素" : !!d.veg);

  function hardFilter(p, pool) {
    return pool.filter((d) =>
      (p.maxPrice == null || d.price <= p.maxPrice) &&
      (p.maxCal == null || d.cal <= p.maxCal) &&
      (!p.noSpicy || d.spicy === 0) &&
      (!p.wantVeg || isVeg(d)) &&
      (!p.wantMeat || isMeat(d))
    );
  }

  function filterPool(text, excludeIds) {
    const prefs = parsePreferences(text);
    const all = (window.DB_REAL && window.DB_REAL.dishes) || window.DB.dishes;
    const base = all.filter((d) => !excludeIds.includes(d.id));
    // 关键词放宽：全词在菜名里无命中时去掉末字再试（烤鸭饭→烤鸭），命中即锁定；
    // 全词本有命中但被排除（如「换一个」避重）时保留原词，不在矮子里拔将军
    if (prefs.keyword) {
      const fullHit = all.some((d) => d.name.includes(prefs.keyword));
      if (!fullHit) {
        let kw = prefs.keyword;
        while (kw.length > 1 && !base.some((d) => d.name.includes(kw))) kw = kw.slice(0, -1);
        if (base.some((d) => d.name.includes(kw))) prefs.keyword = kw;
      }
    }
    // 无解时逐级放宽：先让热量，再让荤素，预算和忌辣最后动（这两项用户最在意）
    const droppedKeys = new Set();
    let pool = hardFilter(prefs, base);
    for (const key of ["maxCal", "wantMeat", "wantVeg", "maxPrice", "noSpicy"]) {
      if (pool.length) break;
      const val = prefs[key];
      if (val == null || val === false) continue;
      const trial = { ...prefs, [key]: (key === "maxPrice" || key === "maxCal") ? null : false };
      pool = hardFilter(trial, base);
      if (pool.length) { prefs[key] = trial[key]; droppedKeys.add(key); }
    }
    if (!pool.length) pool = base.slice(); // 兜底：全库随机
    return { prefs, pool, droppedKeys };
  }

  // —— 3) 软偏好打分 + 随机抖动，取 top5 加权随机（保证多样性与命中感）——
  function scoreDish(d, p) {
    let sc = Math.random() * 6;
    if (p.wantSpicy && d.spicy >= 2) sc += 12;
    if (p.wantMeat && isMeat(d)) sc += 12;
    if (p.preferCat.includes(d.category)) sc += 14;
    if (p.preferTaste.some((t) => d.taste.includes(t))) sc += 10;
    if (p.preferTag.some((t) => d.tags.includes(t))) sc += 8;
    if (p.keyword && d.name.includes(p.keyword)) sc += 16;
    if (d.tags.includes("人气")) sc += 2;
    // 糖水/甜品饮品不当正餐推：用户没表达甜品意图时降权
    const wantDessert = p.preferCat.includes("甜品饮品") || p.preferTaste.includes("甜");
    if (d.category === "甜品饮品" && !wantDessert) sc -= 8;
    return sc;
  }
  function weightedTopPick(pool, p) {
    // 用户明确点名了菜品（关键词命中候选池）时，只在命中菜里抽签，意图优先
    let cand = pool;
    if (p.keyword) {
      const hits = pool.filter((d) => d.name.includes(p.keyword));
      if (hits.length) cand = hits;
    }
    const top = cand
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
    if (p.wantMeat && isMeat(d)) m.push("有肉，解馋过瘾");
    if (p.wantSpicy && d.spicy >= 2) m.push("够辣够味");
    if (p.preferCat.includes(d.category)) m.push(`正是你想吃的${d.category}`);
    if (p.keyword && d.name.includes(p.keyword)) m.push(`名字里就有「${p.keyword}」`);
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
    const labels = { maxCal: "低卡", maxPrice: "预算", wantVeg: "素食", wantMeat: "荤菜", noSpicy: "忌辣" };
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
