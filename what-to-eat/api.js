// api.js — 推荐服务层（v2.0 mock 实现，接口形状即未来真实后端）
// API.recommend({ text, profile, feedback, excludeIds, recentStalls, mode, novelty })
//   → { code: 0, data: { cards: [{ dish, matched, reason, relaxed, relaxedNote }], windowRelaxed, notes } }
// TODO: 接入真实后端时，把内部实现替换为 fetch('/api/recommend')，入参与返回结构保持不变。
(function () {
  const delay = (ms) => (window.__WTE_FAST__ ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const FLAVORS = ["辣", "麻", "酸甜", "咸鲜", "清淡", "甜"];
  const BUDGET_MAX = { "10": 10, "10-15": 15, "15-20": 20 };
  const WINDOW = 10;          // 滑窗长度：最近 10 张卡
  const MODE_LIMIT = { 1: 1, 3: 3 }; // 单卡同档口 ≤1；3 卡同档口 ≤3

  // 数据兼容：flavors 可能是数组、单字符串或以 | 分隔的字符串
  function dishFlavors(d) {
    const raw = d.flavors;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string" && x);
    if (typeof raw === "string") return raw.split("|").filter(Boolean);
    return [];
  }
  function dishTaste(d) {
    return Array.isArray(d.taste) ? d.taste : d.taste ? [d.taste] : [];
  }

  // —— 1) 偏好解析：把自然语言拆成结构化条件 ——
  function parsePreferences(text) {
    const s = (text || "").toLowerCase();
    const p = {
      maxPrice: null, maxCal: null,
      noSpicy: false, wantSpicy: false, wantVeg: false, wantMeat: false, lightIntent: false,
      preferCat: [], preferTaste: [], preferTag: [], avoid: [],
      keyword: "",
    };
    // 预算分两档：说了「便宜/省钱」按 10 元档；写了「10-15 元」取上限，避免只取到 10 变成过严
    const range = s.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*(?:元|块|rmb|￥|¥)/);
    const budget = s.match(/(\d+(?:\.\d+)?)\s*(?:元|块|rmb|￥|¥)/);
    if (range) p.maxPrice = parseFloat(range[2]);
    else if (budget) p.maxPrice = parseFloat(budget[1]);
    if (/便宜|省钱|预算.{0,4}(紧|少)|生活费不多/.test(s)) p.maxPrice = Math.min(p.maxPrice ?? 10, 10);
    // 减脂/轻食意图：不是「热量低就是轻食」（那样只会推出包子粥），而是优先轻食档口与轻食菜
    if (/减肥|减脂|瘦身|轻食|低卡|低脂|沙拉|卡路里|热量|控卡|轻负担|健身餐/.test(s)) {
      p.lightIntent = true;
      p.maxCal = 700;
    }
    if (/不想吃辣|不吃辣|忌辣|不能吃辣|别太辣|不要辣|免辣|怕辣/.test(s)) p.noSpicy = true;
    if (!p.noSpicy && /想吃辣|无辣不欢|能吃辣|爱吃辣|辣一点|重口/.test(s)) p.wantSpicy = true;
    if (/吃素|素食|不吃肉|不想吃肉|素一点/.test(s)) p.wantVeg = true;
    if (/想吃肉|无肉不欢|荤一点|大口吃肉/.test(s)) p.wantMeat = true;
    if (/面|饺子/.test(s)) p.preferCat.push("面食");
    if (/米饭|盖饭|盖浇饭|拌饭/.test(s)) p.preferCat.push("盖浇饭");
    if (/麻辣烫|冒菜|香锅/.test(s)) p.preferCat.push("麻辣系列");
    if (/炒菜|小炒|家常菜|下饭/.test(s)) p.preferCat.push("家常小炒");

    if (/汤|粥|暖胃/.test(s)) p.preferCat.push("汤粥");
    if (/甜|甜品|下午茶|奶茶|糖水|饮料|想喝|喝点/.test(s)) { p.preferCat.push("甜品饮品"); p.preferTaste.push("甜"); }
    if (/早餐|早上/.test(s)) p.preferCat.push("早餐小吃");
    if (/清淡|养生|健康/.test(s)) { p.preferTaste.push("清淡"); if (p.maxCal == null) p.maxCal = 600; }
    if (/高蛋白|健身|增肌/.test(s)) p.preferTag.push("高蛋白");
    if (/性价比|实惠|划算/.test(s)) p.preferTag.push("性价比");
    // 菜名关键词：先删含否定的片段（防「不想吃辣」提取出「辣」），再删虚词取核心词匹配菜名。
    // 已经交给硬过滤/软偏好的意图词（肉、素、辣、甜、清淡…）要从 core 里剔除，
    // 否则「想吃肉」会被收窄成菜名带「肉」的 355 道，「吃素」只剩 28 道——都不是用户的本意。
    const core = s
      .replace(/[^，,。、\s！？]*(?:不想|不吃|不喝|不要|别|忌)[^，,。、\s！？]*/g, "")
      .replace(/\d+(?:\.\d+)?\s*(?:元|块|rmb|￥|¥)|预算|减肥|减脂|瘦身|降重/g, "")
      .replace(/想吃肉|无肉不欢|荤一点|大口吃肉|吃素|素食|素一点|无辣不欢|能吃辣|爱吃辣|辣一点|重口|清淡|养生|健康|低卡|低脂|轻食|控卡|轻负担|健身餐|高蛋白|健身|增肌|性价比|实惠|划算|便宜|省钱/g, "")
      .replace(/想吃|想喝|喝点|来碗|来份|来个|来点|吃点|给我|替我|帮我|决定|早餐|午餐|晚餐|宵夜|今天|明天|一下|一点|随便|都行|什么|啥|口味/g, "")
      .replace(/[，,。、\s！？]/g, "")
      .replace(/[吃喝]/g, "")
      .replace(/的$/, "");
    // 单字意图词留在 core 里会误当菜名（例如「辣」「面」），统一走偏好层，不再锁关键词
    const GENERIC = /^(?:肉|素|辣|甜|面|面食|饭|汤|粥|菜|早餐|午餐|晚餐|宵夜|清淡|健康|饮料|甜品)$/;
    if (core.length >= 1 && core.length <= 6 && !GENERIC.test(core) && !/^[的了吧呢吗]?$/.test(core)) p.keyword = core;
    return p;
  }

  // —— 2) 画像融合：不冲突维度合并，用户即时输入覆盖画像同名维度 ——
  function buildPreferences(text, profile) {
    const p = parsePreferences(text);
    const prof = profile || {};
    const pf = Array.isArray(prof.flavors) ? prof.flavors.filter((f) => FLAVORS.includes(f)) : [];

    // 文本没写预算时才用画像预算（文本优先）
    if (p.maxPrice == null && prof.budget && BUDGET_MAX[prof.budget] != null) {
      p.maxPrice = BUDGET_MAX[prof.budget];
    }
    // 文本没表达荤素意图时才用画像倾向（软打分，不硬过滤）
    p.mainPref = "any";
    if (!p.wantVeg && !p.wantMeat) {
      if (prof.main === "veg") p.mainPref = "veg";
      if (prof.main === "meat") p.mainPref = "meat";
    }
    // 忌口自由填：按标点/空白拆词，命中菜名或描述即过滤
    if (typeof prof.avoid === "string") {
      p.avoid = prof.avoid.split(/[，,、\s;；]+/).map((x) => x.trim()).filter((x) => x.length >= 1);
    }
    // 口味多选：画像勾选 + 文本口味合并
    const wanted = new Set(pf);
    p.preferTaste.forEach((t) => { if (t === "清淡" || t === "甜") wanted.add(t); });
    if (p.wantSpicy) wanted.add("辣");
    p.wantFlavors = [...wanted];
    return p;
  }

  const isMeat = (d) => (d.main ? d.main === "荤" : !d.veg);
  const isVeg = (d) => (d.main ? d.main === "素" : !!d.veg);

  // 轻食判定：轻食档口全量算轻食；其他档口看菜名（沙拉/鸡胸/健康餐等）
  const LIGHT_NAME = /轻食|沙拉|鸡胸|健康餐|糙米|紫米|藜麦|全麦|低脂|魔芋/;
  const isLightDish = (d) => /轻食/.test(d.stall || "") || LIGHT_NAME.test(d.name || "");

  // —— 3) 硬过滤层：预算 / 热量 / 忌辣 / 文本荤素 / 忌口 ——
  function hardFilter(p, pool) {
    return pool.filter((d) => {
      if (p.maxPrice != null && d.price > p.maxPrice) return false;
      if (p.maxCal != null && d.cal > p.maxCal) return false;
      if (p.noSpicy && d.spicy > 0) return false;
      if (p.wantVeg && !isVeg(d)) return false;
      if (p.wantMeat && !isMeat(d)) return false;
      if (p.lightIntent && !isLightDish(d)) return false;
      if (p.avoid.length) {
        const hay = `${d.name} ${d.desc || ""} ${dishTaste(d).join("")} ${dishFlavors(d).join("")}`;
        if (p.avoid.some((k) => hay.includes(k))) return false;
      }
      return true;
    });
  }

  // 关键词放宽：全词没有命中时逐字去尾（烤鸭饭→烤鸭）；被排除时保留原词，不在矮子里拔将军
  function relaxKeyword(p, all, base) {
    if (!p.keyword) return;
    const fullHit = all.some((d) => d.name.includes(p.keyword));
    if (fullHit) return;
    let kw = p.keyword;
    while (kw.length > 1 && !base.some((d) => d.name.includes(kw))) kw = kw.slice(0, -1);
    if (base.some((d) => d.name.includes(kw))) p.keyword = kw;
  }

  // 无解时逐级放宽：热量 → 荤素 → 预算 → 忌辣 → 忌口（滑窗约束在选卡时最后放宽）
  function filterWithRelax(p, base, droppedKeys) {
    let pool = hardFilter(p, base);
    const order = [
      ["maxCal", null],
      ["wantMeat", false],
      ["wantVeg", false],
      ["maxPrice", null],
      ["noSpicy", false],
      ["avoid", []],
      ["lightIntent", false],
    ];
    for (const [key, fallback] of order) {
      if (pool.length) break;
      const val = p[key];
      if (val == null || val === false || (Array.isArray(val) && !val.length)) continue;
      p[key] = fallback;
      droppedKeys.add(key);
      pool = hardFilter(p, base);
    }
    return pool;
  }

  // —— 4) 软打分：口味 / 荤素倾向 / 分类 / 关键词 / 人气归一 / 正反馈 ——
  function scoreDish(d, p, ctx) {
    let sc = Math.random() * 1.2;
    const fl = dishFlavors(d);
    const hits = p.wantFlavors.filter((f) => fl.includes(f));
    sc += hits.length * 8;
    if (p.wantSpicy && (d.spicy >= 2 || fl.includes("辣"))) sc += 12;
    if (p.mainPref === "veg" && isVeg(d)) sc += 10;
    if (p.mainPref === "meat" && isMeat(d)) sc += 10;
    if (p.preferCat.includes(d.category)) sc += 14;
    if (p.preferTag.some((t) => dishTaste(d).includes(t) || (d.tags || []).includes(t))) sc += 8;
    if (p.keyword && d.name.includes(p.keyword)) sc += 16;
    // 人气归一：档口人气菜占比 ×2（公社 37/112 → +0.66，不再是固定 +2）
    const meta = ctx.meta[d.stall];
    if (meta) sc += 2 * (meta.hotRate || 0);
    // 正反馈：档口 +3 / 口味 +1 / 品类 +0.6，单维度累计封顶 +4
    const fb = ctx.feedback || {};
    if (d.stall && fb.stalls && fb.stalls[d.stall]) sc += Math.min(4, fb.stalls[d.stall] * 3);
    if (fb.flavors) {
      let sum = 0;
      fl.forEach((f) => { if (fb.flavors[f]) sum += fb.flavors[f]; });
      sc += Math.min(4, sum);
    }
    if (fb.categories && fb.categories[d.category]) sc += Math.min(4, fb.categories[d.category] * 0.6);
    // 糖水/甜品饮品不当正餐推：用户没表达甜品意图时降权
    const wantDessert = p.preferCat.includes("甜品饮品") || p.wantFlavors.includes("甜");
    if (d.category === "甜品饮品" && !wantDessert) sc -= 8;
    // 轻食意图：轻食档口/轻食菜强加权；包子粥等低卡早餐不再冒充轻食
    if (p.lightIntent) {
      if (isLightDish(d)) sc += 30;
      else if (d.category === "早餐小吃" || d.category === "汤粥") sc -= 14;
      else if (/包|粥|馒头|花卷|油条|豆浆|煎饼/.test(d.name)) sc -= 8;
    }
    // 「试试新的！」：没点过「就这个」的档口优先，近期出现过的档口降权
    if (ctx.novelty) {
      const clicked = (fb.clickedStalls || []);
      if (d.stall && !clicked.includes(d.stall)) sc += 20;
      if (ctx.recentStalls.includes(d.stall)) sc -= 10;
    }
    return sc;
  }

  // 全池 softmax 抽样：不截 top5。截断会让「档口加成」变成最大值的优势
  // （菜多的档口 max(随机分+加成) 几乎必然排第一，公社 10 次 7 次就是这么来的）。
  function weightedPick(pool, p, ctx) {
    // 点名了菜品（关键词命中候选池）时只在命中菜里抽签，意图优先
    let cand = pool;
    if (p.keyword) {
      const hits = pool.filter((d) => d.name.includes(p.keyword));
      if (hits.length) cand = hits;
    }
    const T = 1.5;
    const scored = cand.map((d) => ({ d, sc: scoreDish(d, p, ctx) }));
    const top = Math.max(...scored.map((x) => x.sc));
    const weights = scored.map((x) => Math.exp((x.sc - top) / T));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < scored.length; i++) {
      r -= weights[i];
      if (r < 0) return scored[i].d;
    }
    return scored[scored.length - 1].d;
  }

  // —— 5) 命中说明 + 推荐理由 ——
  const OPENERS = ["纠结的时候，交给手感准没错！", "闭眼选也不会错的人气之选。", "这顿就交给命运抽签吧——"];
  const CLOSINGS = ["今天就让它治愈你的胃！", "食堂阿姨已经为你打好饭啦。", "别纠结了，就它了！", "干饭人，冲！", "这一口下去，值回饭钱。"];

  function buildMatched(d, p, dropped) {
    const m = [];
    if (p.maxPrice != null && !dropped.has("maxPrice")) m.push(`预算 ${p.maxPrice} 元内`);
    if (p.maxCal != null && !dropped.has("maxCal")) m.push(`热量仅 ${d.cal} kcal`);
    if (p.noSpicy && !dropped.has("noSpicy")) m.push("完全不辣");
    if (p.wantVeg && !dropped.has("wantVeg")) m.push("素食友好");
    if (p.wantMeat && !dropped.has("wantMeat") && isMeat(d)) m.push("有肉，解馋过瘾");
    if (p.mainPref === "veg" && isVeg(d)) m.push("偏素，吃着清爽");
    if (p.mainPref === "meat" && isMeat(d)) m.push("有肉，跟着直觉走");
    if (p.wantSpicy && (d.spicy >= 2 || dishFlavors(d).includes("辣"))) m.push("够辣够味");
    if (p.preferCat.includes(d.category)) m.push(`正是你想吃的${d.category}`);
    if (p.keyword && d.name.includes(p.keyword)) m.push(`名字里就有「${p.keyword}」`);
    const fhits = p.wantFlavors.filter((f) => dishFlavors(d).includes(f));
    if (fhits.length) m.push(`口味${fhits.join("、")}，很对你的胃口`);
    const tg = p.preferTag.filter((t) => dishTaste(d).includes(t) || (d.tags || []).includes(t));
    if (tg.length) m.push(`主打「${tg.join("、")}」`);
    if (p.lightIntent && isLightDish(d)) m.push("轻食档口，减脂友好");
    return m;
  }
  function buildReason(d, m) {
    const head = m.length ? m.slice(0, 3).join("，") + "。" : rand(OPENERS);
    const desc = String(d.desc || "").replace(/[，,。；;、\s]*$/, "") + "。";
    return head + desc + rand(CLOSINGS);
  }

  function recentWindow(recentStalls) {
    const counts = {};
    (recentStalls || []).slice(-WINDOW).forEach((s) => { if (s) counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }

  // —— 6) 对外接口：一次返回 1 张或 3 张卡（3 张强制不同档口，并遵守 10 次滑窗）——
  async function recommend({ text = "", profile = null, feedback = null, excludeIds = [], recentStalls = [], mode = 1, novelty = false } = {}) {
    await delay(650); // 模拟网络延迟，保证 loading 态可见
    // TODO: replace with fetch('/api/recommend', { method: "POST", ... })
    const all = ((window.DB_REAL && window.DB_REAL.dishes) || window.DB.dishes);
    const meta = (window.DB_REAL && window.DB_REAL.stallMeta) || {};
    const cardCount = mode === 3 ? 3 : 1;
    const limit = MODE_LIMIT[cardCount] || 1;
    const prefs = buildPreferences(text, profile);

    const base = all.filter((d) => !excludeIds.includes(d.id));
    relaxKeyword(prefs, all, base);

    const droppedKeys = new Set();
    const usedStalls = new Set();
    const windowCounts = recentWindow(recentStalls);
    const cards = [];
    let windowRelaxed = false;

    for (let i = 0; i < cardCount; i++) {
      const candBase = base.filter((d) => !usedStalls.has(d.stall));
      let pool = filterWithRelax(prefs, candBase, droppedKeys);
      if (!pool.length) pool = candBase.slice();
      // 滑窗约束：单卡最近 10 次同档口 ≤1；3 卡模式 ≤3
      const winPool = pool.filter((d) => (windowCounts[d.stall] || 0) < limit);
      let finalPool = winPool;
      if (!finalPool.length) { finalPool = pool; windowRelaxed = true; }
      if (!finalPool.length) break;

      const dish = weightedPick(finalPool, prefs, { meta, feedback, novelty, recentStalls });
      if (!dish) break;
      usedStalls.add(dish.stall);
      windowCounts[dish.stall] = (windowCounts[dish.stall] || 0) + 1;

      const matched = buildMatched(dish, prefs, droppedKeys);
      const relaxed = droppedKeys.size > 0 || windowRelaxed;
      const labels = { maxCal: "低卡", maxPrice: "预算", wantVeg: "素食", wantMeat: "荤菜", noSpicy: "忌辣", avoid: "忌口", lightIntent: "轻食" };
      let relaxedNote = "";
      if (droppedKeys.size) {
        relaxedNote = `完全匹配的菜有点难找，放宽了${[...droppedKeys].map((k) => labels[k] || k).join("、")}要求，这碗最接近～`;
      } else if (windowRelaxed) {
        relaxedNote = "最近这几种档口推荐得有点频繁，这次稍微放宽了档口重复限制～";
      }
      cards.push({
        dish,
        matched,
        reason: buildReason(dish, matched),
        relaxed,
        relaxedNote,
      });
    }

    if (!cards.length) {
      // 极端兜底：全库随机一张，保证页面不空
      const dish = rand(all);
      cards.push({
        dish,
        matched: [],
        reason: buildReason(dish, []),
        relaxed: true,
        relaxedNote: "条件有点苛刻，这次先给你一张随机卡～",
      });
    }

    return { code: 0, data: { cards, windowRelaxed } };
  }

  // 兼容旧调用（单卡）
  async function recommendDish(preferences = "", opts = {}) {
    const res = await recommend({ text: preferences, excludeIds: opts.excludeIds || [], mode: 1 });
    const card = res.data.cards[0];
    return { code: 0, data: { ...card, relaxed: card.relaxed } };
  }

  window.API = { recommend, recommendDish };
})();
