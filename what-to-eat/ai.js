// ai.js — AI 胶水层
//
// 设计原则：AI 只负责「理解」，不负责「挑选」和「计算」。
//   · 营养拆解：模型只返回原料与克数，热量由 ingredients.js 的成分表在本地相乘求和；
//   · 状态观察：模型只返回可见标签，标签到筛选条件的映射写在 MAPPING 里，可复核；
//   · 食堂罗盘：模型只把荒诞问题翻译成签文与约束，最终抽哪道菜由 seed 在本地算。
// 这样做的直接好处：可复现、可解释、断网能降级，且 API 契约上就不允许模型编造热量。
(function () {
  const CACHE_KEY = "wte.aiCache";
  const CFG_KEY = "wte.aiCfg";
  const CACHE_VERSION = 1;
  const NUTRI_LIMIT = 400;
  // 罗盘要等结果才能落盘，等待时间直接体现在转盘上，给 2.5s 上限；
  // 营养拆解是后台校准——本地算式已经秒出，用户可以边看边等，超时放宽到 15s。
  const TIMEOUT = 2500;
  const TIMEOUT_CAL = 15000;

  // 食材名 → 筛选关键词。表里没有的标签一律不进推荐条件，避免模型自由发挥。
  const MAPPING = {
    痘: { avoid: ["辣", "油炸", "烧烤", "麻辣"], prefer: ["清淡"], text: "不吃辣、少油" },
    油腻: { avoid: ["油炸", "烧烤", "麻辣"], prefer: ["清淡"], text: "清淡、少油" },
    上火: { avoid: ["辣", "麻辣", "烧烤"], prefer: ["清淡", "汤粥"], text: "清淡、不吃辣" },
    干燥: { prefer: ["汤粥", "清淡"], text: "想喝汤" },
    浮肿: { avoid: ["辣", "酸菜", "榨菜"], prefer: ["清淡"], text: "清淡、少盐" },
    气色暗: { prefer: ["高蛋白", "清淡"], text: "高蛋白、清淡" },
    疲惫: { prefer: ["高蛋白", "管饱"], text: "想吃肉" },
    黑眼圈: { prefer: ["清淡", "汤粥"], text: "清淡、想喝汤" },
    泛红: { avoid: ["辣", "麻辣"], prefer: ["清淡"], text: "不吃辣" },
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 隐私模式忽略 */ }
  }

  function config() {
    const extra = window.WTE_AI_CONFIG || {};
    const local = load(CFG_KEY, {});
    return {
      worker: (local.worker || extra.worker || "").replace(/\/+$/, ""),
      key: local.key || extra.key || "",
      textModel: local.textModel || extra.textModel || "",
      visionModel: local.visionModel || extra.visionModel || "",
    };
  }
  function enabled() {
    const c = config();
    return !!(c.worker);
  }
  function setConfig(patch) {
    save(CFG_KEY, Object.assign(load(CFG_KEY, {}), patch || {}));
  }

  // —— 缓存 ——
  function cache() {
    const c = load(CACHE_KEY, null);
    if (!c || c.v !== CACHE_VERSION) return { v: CACHE_VERSION, nutrition: {}, oracle: {} };
    return c;
  }
  function cachePut(bucket, key, value) {
    const c = cache();
    c[bucket] = c[bucket] || {};
    c[bucket][key] = value;
    const keys = Object.keys(c.nutrition);
    if (keys.length > NUTRI_LIMIT) delete c.nutrition[keys[0]];
    save(CACHE_KEY, c);
  }
  function cacheGet(bucket, key) {
    const c = cache();
    return (c[bucket] && c[bucket][key]) || null;
  }

  // —— 唯一的热量入口：所有 kcal 都必须经过这里 ——
  function compute(items) {
    const rows = [];
    const missing = [];
    (items || []).forEach((it) => {
      const grams = Math.max(0, Math.round(Number(it.g) || 0));
      if (!grams) return;
      const food = window.FOOD.match(it.name);
      if (!food) { missing.push(it.name); return; }
      rows.push({
        name: food.name,
        g: grams,
        per100: food.kcal,
        kcal: Math.round((food.kcal * grams) / 100),
        protein: +(food.protein * grams / 100).toFixed(1),
        fat: +(food.fat * grams / 100).toFixed(1),
        carb: +(food.carb * grams / 100).toFixed(1),
      });
    });
    const total = rows.reduce((s, r) => s + r.kcal, 0);
    rows.forEach((r) => { r.share = total ? r.kcal / total : 0; });
    // 同名列合并（模型偶尔把“食用油”写两次）
    const merged = {};
    rows.forEach((r) => {
      if (!merged[r.name]) merged[r.name] = Object.assign({}, r);
      else {
        merged[r.name].g += r.g;
        merged[r.name].kcal += r.kcal;
        merged[r.name].protein = +(merged[r.name].protein + r.protein).toFixed(1);
        merged[r.name].fat = +(merged[r.name].fat + r.fat).toFixed(1);
        merged[r.name].carb = +(merged[r.name].carb + r.carb).toFixed(1);
      }
    });
    const list = Object.values(merged).sort((a, b) => b.kcal - a.kcal);
    const sum = list.reduce((s, r) => s + r.kcal, 0);
    list.forEach((r) => { r.share = sum ? r.kcal / sum : 0; });
    return {
      rows: list,
      total: sum,
      protein: +list.reduce((s, r) => s + r.protein, 0).toFixed(1),
      fat: +list.reduce((s, r) => s + r.fat, 0).toFixed(1),
      carb: +list.reduce((s, r) => s + r.carb, 0).toFixed(1),
      missing,
    };
  }

  // —— Worker 调用 ——
  async function call(path, payload, budget) {
    const c = config();
    if (!c.worker) throw new Error("NO_WORKER");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), budget || TIMEOUT);
    try {
      const res = await fetch(c.worker + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("HTTP_" + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // —— 本地估算：只在没有 Worker 或请求失败时使用，UI 会明确标注来源 ——
  const MAIN_HINTS = [
    [/回锅肉|红烧肉|五花|扣肉|把子肉/, "五花肉"],
    [/排骨/, "猪里脊"],
    [/牛肉|牛柳|牛腩|肥牛|牛杂/, "牛肉"],
    [/鸡胸/, "鸡胸"],
    [/鸡腿|鸡排|鸡块|宫保鸡/, "鸡腿"],
    [/鸡翅/, "鸡翅"],
    [/鸡/, "鸡肉"],
    [/鸭/, "鸭肉"],
    [/鱼|酸菜鱼|水煮鱼/, "草鱼"],
    [/虾/, "虾"],
    [/里脊|肉丝|肉片|肉末|肉沫|小炒肉/, "猪肉"],
    [/腊肠|腊肉/, "腊肠"],
    [/火腿/, "火腿肠"],
    [/蛋/, "鸡蛋"],
    [/豆腐|豆花|麻婆/, "豆腐"],
    [/豆干|香干/, "豆干"],
  ];
  const VEG_HINTS = [
    ["番茄", 120], ["西红柿", 120], ["青椒", 80], ["尖椒", 60], ["土豆", 120],
    ["茄子", 120], ["大白菜", 120], ["小白菜", 100], ["菠菜", 100], ["西兰花", 100],
    ["花菜", 100], ["豆角", 100], ["四季豆", 100], ["木耳", 50], ["香菇", 60],
    ["金针菇", 60], ["莲藕", 90], ["山药", 90], ["南瓜", 100], ["黄瓜", 80],
    ["胡萝卜", 60], ["洋葱", 60], ["芹菜", 80], ["韭菜", 60], ["豆芽", 80],
    ["酸菜", 60], ["海带", 50], ["冬瓜", 100], ["丝瓜", 100], ["莴笋", 90],
  ];
  const STAPLE = {
    "盖浇饭": [["米饭", 250]],
    "面食": [["面条", 300]],
    "汤粥": [["米饭", 40]],
    "早餐小吃": [],
    "麻辣系列": [["米饭", 0]],
    "家常小炒": [],
    "烧烤": [],
    "甜品饮品": [],
    "其他": [],
  };

  function localRecipe(dish) {
    const cat = dish.category || "其他";
    const name = dish.name || "";
    const flavors = Array.isArray(dish.flavors) ? dish.flavors : [];
    const items = [];
    (STAPLE[cat] || []).forEach(([n, g]) => { if (g > 0) items.push({ name: n, g }); });

    const main = MAIN_HINTS.find(([re]) => re.test(name));
    const proteinG = cat === "汤粥" ? 50 : cat === "早餐小吃" ? 80 : /荤/.test(dish.main || "") || dish.veg === false ? 110 : 90;
    if (main) items.push({ name: main[1], g: proteinG });
    else if (dish.veg === false) items.push({ name: "猪肉", g: 90 });

    VEG_HINTS.forEach(([k, g]) => {
      if (name.includes(k) && !items.some((x) => x.name === k)) items.push({ name: k, g });
    });

    // 油量按品类与口味给：清淡档口少油，麻辣档口多油 —— 这一步是规则，不是模型，写进文档可复核
    const OIL_BASE = { "面食": 12, "盖浇饭": 16, "家常小炒": 18, "麻辣系列": 22, "烧烤": 12, "早餐小吃": 8, "汤粥": 3, "其他": 12 };
    let oil = OIL_BASE[cat] == null ? 12 : OIL_BASE[cat];
    if (flavors.includes("清淡")) oil = Math.max(3, Math.round(oil * 0.5));
    else if (flavors.includes("辣") || flavors.includes("麻辣")) oil = Math.round(oil * 1.4);
    items.push({ name: "食用油", g: oil });
    if (cat === "麻辣系列") items.push({ name: "火锅底料", g: 25 });
    return items;
  }

  function localNutrition(dish) {
    const calc = compute(localRecipe(dish));
    return {
      source: "local",
      items: calc.rows.map((r) => ({ name: r.name, g: r.g })),
      rows: calc.rows,
      total: calc.total,
      protein: calc.protein,
      fat: calc.fat,
      carb: calc.carb,
      missing: calc.missing,
      menuCal: dish.cal || null,
      delta: dish.cal ? calc.total - dish.cal : null,
    };
  }

  // 卡片、筛选、拆解共用同一个估算值：卡片上写的热量必须和「AI 拆解」算出来的对得上
  const calCache = new Map();
  function calOf(dish) {
    if (!dish) return 0;
    if (calCache.has(dish.id)) return calCache.get(dish.id);
    let v = Number(dish.cal) || 0;
    try {
      const est = localNutrition(dish).total;
      if (est > 0) v = est;
    } catch (e) { /* 成分表缺项时回落到数据里的品类值 */ }
    calCache.set(dish.id, v);
    return v;
  }

  // —— 功能一：营养拆解 ——
  async function nutrition(dish, opts) {
    const force = opts && opts.force;
    const key = "n:" + dish.id;
    if (!force) {
      const hit = cacheGet("nutrition", key);
      if (hit) return Object.assign({}, hit, { source: hit.source + "-cache" });
    }
    if (enabled()) {
      try {
        const res = await call("/nutrition", {
          dish: {
            name: dish.name,
            category: dish.category,
            stall: dish.stall,
            price: dish.price,
            menuCal: dish.cal,
          },
        }, TIMEOUT_CAL);
        const calc = compute(res.items);
        // 一条原料都没对上成分表，说明模型给的名字跑偏了，宁可降级也不展示假数据
        if (!calc.rows.length) throw new Error("NO_MATCH");
        // 质量闸门：菜名里点名的食材（番茄、牛肉、鸡蛋…）AI 至少命中一个。
        // 实测小模型会套通用模板（兰州牛肉面拆成猪五花），这种结果直接退回本地估算。
        const nm = dish.name || "";
        const named = [];
        const mainHit = MAIN_HINTS.find(([re]) => re.test(nm));
        if (mainHit) named.push(mainHit[1]);
        VEG_HINTS.forEach(([k]) => { if (nm.includes(k)) named.push(k); });
        if (named.length) {
          const aiNames = calc.rows.map((r) => r.name).concat(res.items.map((x) => String(x.name || "")));
          const hit = named.some((n) => aiNames.some((x) => x.includes(n) || n.includes(x)));
          if (!hit) throw new Error("OFF_TOPIC");
        }
        const out = {
          source: "ai",
          items: res.items,
          rows: calc.rows,
          total: calc.total,
          protein: calc.protein,
          fat: calc.fat,
          carb: calc.carb,
          missing: calc.missing,
          menuCal: dish.cal || null,
          delta: dish.cal ? calc.total - dish.cal : null,
        };
        cachePut("nutrition", key, out);
        return out;
      } catch (e) { /* 落到本地 */ }
    }
    const local = localNutrition(dish);
    // 本地结果不入缓存：配了 Worker 却超时的话，下次展开还有机会拿到 AI 校准
    if (!enabled()) cachePut("nutrition", key, local);
    return local;
  }

  // —— 功能二：状态观察（拍照）——
  function mappingFor(tags) {
    const avoid = new Set();
    const prefer = new Set();
    const texts = [];
    (tags || []).forEach((t) => {
      const m = MAPPING[t];
      if (!m) return;
      (m.avoid || []).forEach((x) => avoid.add(x));
      (m.prefer || []).forEach((x) => prefer.add(x));
      if (m.text) texts.push(m.text);
    });
    return { avoid: [...avoid], prefer: [...prefer], text: [...new Set(texts)].join("、") };
  }

  async function portrait(dataUrl) {
    if (!enabled()) return { source: "off", observations: [], tags: [], summary: "" };
    try {
      const res = await call("/portrait", { image: dataUrl });
      const tags = (res.observations || []).map((o) => o.label).filter(Boolean);
      return {
        source: "ai",
        observations: res.observations || [],
        tags,
        summary: res.summary || "",
        mapping: mappingFor(tags),
      };
    } catch (e) {
      return { source: "error", observations: [], tags: [], summary: "" };
    }
  }

  // —— 功能三：食堂罗盘 ——
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  const LOCAL_SIGNS = [
    { topic: "考试", re: /考试|考|高数|挂科|复习|论文|作业|学习|背书/,
      signs: ["先吃饱，再谈及格", "胃里有粮，笔下不慌", "这一顿，是给大脑的补给"], category: "盖浇饭", tags: ["管饱"], flavors: [] },
    { topic: "感冒", re: /感冒|喉咙|咳嗽|发烧|不舒服|生病|上火/, 
      signs: ["清淡一点，身体记得你的好", "今天这顿，让胃先休息", "热汤下肚，人就活过来一半"], category: "汤粥", tags: [], flavors: ["清淡"] },
    { topic: "没钱", re: /穷|没钱|月底|生活费|吃土|便宜|省/,
      signs: ["钱包薄的时候，饭要厚", "便宜不等于将就", "十块钱也有十块钱的体面"], category: "", tags: ["性价比"], flavors: [] },
    { topic: "恋爱", re: /喜欢|恋爱|对象|约会|表白|心动|女朋友|男朋友/,
      signs: ["吃甜一点，说话会软一点", "带着糖味去见人", "先把自己喂好，再去见想见的人"], category: "甜品饮品", tags: [], flavors: ["甜"] },
    { topic: "疲惫", re: /累|困|熬夜|睡|没精神|疲惫|军训/,
      signs: ["累了就吃点热的", "先补一口，再撑一会儿", "身体的账，迟早要还"], category: "", tags: ["暖胃"], flavors: [] },
    { topic: "减脂", re: /胖|减肥|减脂|健身|体重|卡路里/,
      signs: ["吃得对，比吃得少重要", "轻一点，不代表委屈自己", "这顿不算热量，算投资"], category: "轻食沙拉", tags: ["低卡"], flavors: [] },
    { topic: "想家", re: /家|想家|妈|爸|故乡|回家/,
      signs: ["有些味道，是替你回家的", "想家的时候，吃点热的", "这一口，像家里那口锅"], category: "家常小炒", tags: [], flavors: [] },
    { topic: "手相", re: /手相|看手|算命|转圈|点烟|玄学|大师/,
      signs: ["掌纹说：该吃饭了", "命里缺一顿热乎的", "天机不可泄露，菜可以"], category: "", tags: [], flavors: [] },
  ];

  function localOracle(text) {
    const seed = hash(text + "|" + today());
    const bucket = LOCAL_SIGNS.find((b) => b.re.test(text)) || {
      topic: "随缘", signs: ["既然都行，那就交给罗盘", "不知道吃什么的时候，答案是热乎的", "先转一圈，再认命"], category: "", tags: [], flavors: [],
    };
    return {
      source: "local",
      sign: bucket.signs[seed % bucket.signs.length],
      topic: bucket.topic,
      constraints: { category: bucket.category, tags: bucket.tags, flavors: bucket.flavors, avoid: [] },
      seed,
      why: "",
    };
  }

  async function oracle(text) {
    const key = "o:" + hash(text + "|" + today());
    const hit = cacheGet("oracle", key);
    if (hit) return Object.assign({}, hit, { source: hit.source + "-cache" });
    // 离线时不撞超时，直接把本地签文端上来
    if (typeof navigator !== "undefined" && navigator.onLine === false) return localOracle(text);
    if (enabled()) {
      try {
        const res = await call("/oracle", { text });
        const out = {
          source: "ai",
          sign: res.sign || "",
          topic: res.topic || "",
          constraints: {
            category: res.category || "",
            tags: Array.isArray(res.tags) ? res.tags : [],
            flavors: Array.isArray(res.flavors) ? res.flavors : [],
            avoid: Array.isArray(res.avoid) ? res.avoid : [],
          },
          why: res.why || "",
          seed: hash(text + "|" + today()),
        };
        cachePut("oracle", key, out);
        return out;
      } catch (e) { /* 落到本地 */ }
    }
    const local = localOracle(text);
    cachePut("oracle", key, local);
    return local;
  }

  window.AI = {
    enabled, config, setConfig,
    compute, nutrition, localNutrition, localRecipe, calOf,
    portrait, mappingFor,
    oracle, localOracle, hash, today,
  };
})();
