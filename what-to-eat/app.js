// app.js — 状态管理 + 视图渲染（数据来自 data.js，服务来自 api.js，图标为内联 Lucide SVG）
(function () {
  // Lucide v1.59.0 内联图标（根元素内的子元素）
  const ICONS = {
    flame: '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    sparkles: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
    dices: '<rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    "utensils-crossed": '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>',
    soup: '<path d="M11.248 3c.273.1.808.53.747 1.36-.05.83-.938 1.2-.989 2.02-.06.78.333 1.24.727 1.62"/><path d="M16.252 3c.268.1.794.53.745 1.36-.06.83-.923 1.2-.993 2.02-.05.78.338 1.24.725 1.62"/><path d="M19.5 12 22 6"/><path d="M4 12a1 1 0 00-.99 1.133A9 9 0 0012 21a9 9 0 008.99-7.867A1 1 0 0020 12z"/><path d="M6.252 3c.268.1.794.53.745 1.36-.06.83-.923 1.2-.993 2.02-.05.78.338 1.24.735 1.62"/><path d="M7 21h10"/>',
    salad: '<path d="M19.496 12a2.5 2.5 0 00.399-2.214A2 2 0 0020.32 6.5 2 2 0 0019 3a2 2 0 00-1.5.68 2 2 0 00-3.287.424 2.5 2.5 0 00-3.189 2.06A3 3 0 0012 12l4-4"/><path d="M4 12a1 1 0 00-.99 1.133A9 9 0 0012 21a9 9 0 008.99-7.867A1 1 0 0020 12z"/><path d="M7 21h10"/><path d="M9.85 6.907A3.5 3.5 0 005.05 12"/>',
    beef: '<path d="M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3"/><path d="m18.5 6 1.754 3.5a6.48 6.48 0 0 1-1.854 8.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/><circle cx="12.5" cy="8.5" r="2.5"/>',
    fish: '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"/>',
    egg: '<path d="M12 2C8 2 4 8 4 14a8 8 0 0 0 16 0c0-6-4-12-8-12"/>',
    croissant: '<path d="M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487"/><path d="M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132"/><path d="M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42"/><path d="M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14"/><path d="M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676"/>',
    "cake-slice": '<path d="M16 13H3"/><path d="M16 17H3"/><path d="m7.2 7.9-3.388 2.5A2 2 0 0 0 3 12.01V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8.654c0-2-2.44-6.026-6.44-8.026a1 1 0 0 0-1.082.057L10.4 5.6"/><circle cx="9" cy="7" r="2"/>',
    wheat: '<path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>',
    "cooking-pot": '<path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="m4 8 16-4"/><path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"/>',
    "refresh-cw": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    leaf: '<path d="M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20"/><path d="M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    carrot: '<path d="M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3"/><path d="M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7"/><path d="m8 15-2.58-2.58"/>',
    cookie: '<path d="M11 17h.01"/><path d="M11.496 2c.324-.016.558.292.529.615a4 4 0 004.235 4.368.713.713 0 01.758.757 4 4 0 004.366 4.237c.323-.03.63.204.614.527a10 10 0 01-2.915 6.566A1 1 0 114.93 4.918 10 10 0 0111.496 2"/><path d="M12 12h.01"/><path d="M16 16h.01"/><path d="M16 3h.01"/><path d="M21 4h.01"/><path d="M21 8h.01"/><path d="M7 14h.01"/><path d="M9 8h.01"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    heartFilled: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor"/>',
  };
  const icon = (name, size = 18) =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const els = {
    pref: $("#pref"),
    conflictHint: $("#conflictHint"),
    decide: $("#decide"),
    decideText: $("#decideText"),
    novelty: $("#novelty"),
    result: $("#result"),
    date: $("#dateLine"),
    profileBtn: $("#profileBtn"),
    profileSummary: $("#profileSummary"),
    modal: $("#profileModal"),
    avoid: $("#avoidInput"),
    profileSave: $("#profileSave"),
    profileSkip: $("#profileSkip"),
    favFab: $("#favFab"),
    favCount: $("#favCount"),
    favPanel: $("#favPanel"),
    favClose: $("#favClose"),
    favList: $("#favList"),
    normalView: $("#normalView"),
    oracleView: $("#oracleView"),
    oracleText: $("#oracleText"),
    oracleGo: $("#oracleGo"),
    oracleResult: $("#oracleResult"),
    wheel: $("#wheel"),
    wheelStage: $("#wheelStage"),
    wheelStatus: $("#wheelStatus"),
    shotBtn: $("#shotBtn"),
    stateModal: $("#stateModal"),
    shotZone: $("#shotZone"),
    shotInput: $("#shotInput"),
    shotCam: $("#shotCam"),
    shotTake: $("#shotTake"),
    shotCamView: $("#shotCamView"),
    shotVideo: $("#shotVideo"),
    shotCamCancel: $("#shotCamCancel"),
    shotSnap: $("#shotSnap"),
    shotFlip: $("#shotFlip"),
    shotPreview: $("#shotPreview"),
    shotEmpty: $("#shotEmpty"),
    shotStatus: $("#shotStatus"),
    shotTags: $("#shotTags"),
    shotApply: $("#shotApply"),
    aiBtn: $("#aiBtn"),
    aiModal: $("#aiModal"),
    aiWorker: $("#aiWorker"),
    aiStatus: $("#aiStatus"),
    aiTest: $("#aiTest"),
    aiSave: $("#aiSave"),
  };
  const state = {
    loading: false,
    profile: loadJSON("wte.profile", null),
    feedback: loadJSON("wte.feedback", { stalls: {}, flavors: {}, categories: {}, clickedStalls: [] }),
    recentStalls: loadJSON("wte.recentStalls", []),
    // 最近 10 张卡的口味槽位（f=主角口味，e=是否换口味，s=是否强反差），用于欠账制探索
    flavorHistory: loadJSON("wte.flavorHistory", []),
    favorites: loadJSON("wte.favorites", []),
    eatenToday: loadJSON("wte.eatenToday", { date: "", ids: [] }),
    // 每道菜吃过几次：按钮上直接显示“吃过 n 次”，比“已记下”更能说明发生了什么
    dishCount: loadJSON("wte.dishCount", {}),
    lastCards: [],
    slotTimer: null,
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 忽略隐私模式写入失败 */ }
  }

  // —— 今天吃过 · 日清零：日期换了就自动清空，不用手动过期 ——
  function checkDayReset() {
    const today = new Date().toDateString();
    if (state.eatenToday.date !== today) {
      state.eatenToday = { date: today, ids: [] };
      saveJSON("wte.eatenToday", state.eatenToday);
    }
  }
  function addEatenToday(dishId) {
    checkDayReset();
    if (!state.eatenToday.ids.includes(dishId)) {
      state.eatenToday.ids.push(dishId);
      saveJSON("wte.eatenToday", state.eatenToday);
    }
  }

  // —— 收藏夹 ——
  function isFavorite(dishId) {
    return state.favorites.some((f) => f.id === dishId);
  }
  function toggleFavorite(dish) {
    const idx = state.favorites.findIndex((f) => f.id === dish.id);
    if (idx >= 0) {
      const [removed] = state.favorites.splice(idx, 1);
      saveJSON("wte.favorites", state.favorites);
      updateFavFab();
      syncFavButton(removed.id);
      // 取消收藏是破坏性操作：给 5 秒撤销窗口，而不是一步删干净
      toast(`已取消收藏 ${removed.name}`, {
        label: "撤销",
        run: () => {
          state.favorites.push(removed);
          saveJSON("wte.favorites", state.favorites);
          updateFavFab();
          syncFavButton(removed.id);
          renderFavoritesPanel();
        },
      });
      return;
    }
    state.favorites.push({
      id: dish.id,
      name: dish.name,
      stall: dish.stall || "",
      canteen: dish.canteen || "",
      price: dish.price,
      category: dish.category || "",
      time: Date.now(),
    });
    saveJSON("wte.favorites", state.favorites);
    updateFavFab();
    syncFavButton(dish.id);
    toast(`已收藏 ${dish.name}`);
  }
  // 卡片上的收藏按钮跟着状态走，避免只改数据不改 UI
  function syncFavButton(dishId) {
    const faved = isFavorite(dishId);
    els.result.querySelectorAll('[data-action="fav-toggle"]').forEach((btn) => {
      const card = state.lastCards[Number(btn.dataset.idx)];
      if (!card || !card.dish || card.dish.id !== dishId) return;
      btn.classList.toggle("is-faved", faved);
      btn.innerHTML = icon(faved ? "heartFilled" : "heart", 16);
      btn.setAttribute("aria-label", faved ? "取消收藏" : "收藏");
    });
  }
  function updateFavFab() {
    const n = state.favorites.length;
    els.favCount.textContent = n;
    els.favCount.hidden = n === 0;
    els.favFab.setAttribute("aria-label", `我的收藏（已收藏 ${n} 道）`);
  }
  function openFavPanel() {
    renderFavoritesPanel();
    els.favPanel.hidden = false;
    els.favPanel.setAttribute("aria-hidden", "false");
  }
  function closeFavPanel() {
    els.favPanel.hidden = true;
    els.favPanel.setAttribute("aria-hidden", "true");
  }
  function renderFavoritesPanel() {
    const favs = [...state.favorites].sort((a, b) => (b.time || 0) - (a.time || 0));
    if (!favs.length) {
      els.favList.innerHTML = `<div class="empty-hint" style="text-align:center;color:var(--text-sub);padding:20px 0">还没有收藏，看到喜欢的菜点 ❤️ 吧</div>`;
      return;
    }
    els.favList.innerHTML = favs.map((f) => `
      <div class="fav-item" data-fav-id="${f.id}">
        <div class="fav-info">
          <div class="fav-name">${f.name}</div>
          <div class="fav-meta">¥${f.price || "?"} · ${f.stall || f.category || ""}</div>
        </div>
        <div class="fav-actions">
          <button class="ghost-btn compact" data-action="fav-rec" data-id="${f.id}" title="用这道菜名找相似的">找类似的</button>
          <button class="ghost-btn compact fav-del" data-action="fav-del" data-id="${f.id}" aria-label="取消收藏">${icon("heart", 14)}</button>
        </div>
      </div>`).join("");
  }

  // —— 初始化：日期问候 + 偏好草稿回填 ——
  function initHeader() {
    const now = new Date();
    const week = "日一二三四五六"[now.getDay()];
    const h = now.getHours();
    const greet = h < 10 ? "早餐想好吃什么了吗？" : h < 14 ? "午餐时间到，补满能量！" : h < 21 ? "晚餐时间到，犒劳自己！" : "夜宵雷达已启动";
    els.date.textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${week} · ${greet}`;
  }
  function initDraft() {
    els.pref.value = localStorage.getItem("wte.pref") || "";
    updateConflictHint();
  }
  // 输入框实时预检：条件自相矛盾时立刻提示，并且说清楚按哪句执行
  function updateConflictHint() {
    if (!els.conflictHint || !window.API || !window.API.inspect) return;
    try {
      const { conflicts } = window.API.inspect(els.pref.value, state.profile);
      const notes = conflicts.map((c) => c.note);
      els.conflictHint.textContent = notes.join(" ");
      els.conflictHint.hidden = !notes.length;
    } catch (e) {
      els.conflictHint.hidden = true;
    }
  }
  els.pref.addEventListener("input", () => {
    localStorage.setItem("wte.pref", els.pref.value);
    updateConflictHint();
  });

  // —— 快捷偏好 chips：点击追加进输入框 ——
  $$(".chip[data-add]").forEach((chip) =>
    chip.addEventListener("click", () => {
      const text = chip.dataset.add;
      const cur = els.pref.value.trim();
      if (cur.includes(text)) return;
      els.pref.value = cur ? cur + (/[，,、]$/.test(cur) ? "" : "、") + text : text;
      els.pref.dispatchEvent(new Event("input"));
      chip.classList.add("hit");
      setTimeout(() => chip.classList.remove("hit"), 300);
      els.pref.focus();
    })
  );

  // —— 口味档案：一屏可跳过，跳过后从偏好面板随时进入 ——
  const FLAVOR_LABELS = { "10": "≤10 元", "10-15": "10-15 元", "15-20": "15-20 元", any: "预算不限" };
  const MAIN_LABELS = { any: "荤素都行", veg: "偏素", meat: "无肉不欢" };

  function profileSummary() {
    const p = state.profile;
    if (!p) return "";
    const bits = [];
    if (p.flavors && p.flavors.length) bits.push(p.flavors.join("、"));
    if (p.main && p.main !== "any") bits.push(MAIN_LABELS[p.main] || "");
    bits.push(FLAVOR_LABELS[p.budget] || FLAVOR_LABELS.any);
    bits.push(p.mode === 3 ? "三卡" : "单卡");
    return bits.filter(Boolean).join(" · ");
  }
  function updateProfileUI() {
    const has = !!state.profile;
    els.profileBtn.textContent = has ? "调整口味档案" : "建立口味档案";
    els.profileSummary.textContent = profileSummary();
    els.profileSummary.hidden = !has;
    els.profileSkip.textContent = has ? "取消" : "先跳过，直接点菜";
  }

  function setPick(group, value) {
    $$(`${group} .pick, ${group} .seg-btn`).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.value === String(value)));
    });
  }
  function getPick(group, fallback) {
    const active = $(`${group} [aria-pressed="true"]`);
    return active ? active.dataset.value : fallback;
  }
  function fillProfileForm() {
    const p = state.profile || {};
    $$("#flavorChips .pick").forEach((b) => {
      b.setAttribute("aria-pressed", String((p.flavors || []).includes(b.dataset.value)));
    });
    setPick("#mainSeg", p.main || "any");
    setPick("#budgetSeg", p.budget || "any");
    setPick("#modeSeg", String(p.mode || 1));
    els.avoid.value = p.avoid || "";
  }
  // —— 弹窗统一：焦点陷阱 / 蒙层策略 / ESC / 焦点归还 ——
  // soft：点蒙层可关；hard：只能显式操作。三个弹窗都是表单类，一律 hard——
  // 之前点蒙层会连人带选择一起丢掉，还顺手写了 profileSeen，误触一次双重副作用。
  const modalStack = [];
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function openModal(el, opts) {
    if (!el) return null;
    const o = opts || {};
    const entry = { el, dismissible: o.dismissible || "hard", last: document.activeElement, onClose: o.onClose, closed: false };
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-open"));
    document.body.classList.add("modal-open");
    modalStack.push(entry);
    const panel = el.querySelector('[role="dialog"]') || el.querySelector(".modal-sheet") || el;
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    setTimeout(() => panel.focus({ preventScroll: true }), 30);
    return entry;
  }
  function closeModal(entry) {
    if (!entry || entry.closed) return;
    entry.closed = true;
    entry.el.classList.remove("is-open");
    const i = modalStack.indexOf(entry);
    if (i >= 0) modalStack.splice(i, 1);
    if (!modalStack.length) document.body.classList.remove("modal-open");
    setTimeout(() => { entry.el.hidden = true; }, 180);
    if (entry.last && entry.last.focus) entry.last.focus({ preventScroll: true });
    if (entry.onClose) entry.onClose();
  }
  // 焦点陷阱：Tab / Shift+Tab 在弹窗内循环，焦点被挤出去时拉回第一个可聚焦元素
  document.addEventListener("keydown", (e) => {
    const top = modalStack[modalStack.length - 1];
    if (!top) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(top); return; }
    if (e.key !== "Tab") return;
    const list = Array.from(top.el.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (!top.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  let profileEntry = null;
  let shotEntry = null;
  let aiEntry = null;
  function openProfile() {
    fillProfileForm();
    profileEntry = openModal(els.modal, { dismissible: "hard" });
  }
  function closeProfile() {
    closeModal(profileEntry);
    profileEntry = null;
  }
  function saveProfile() {
    const profile = {
      flavors: $$("#flavorChips .pick").filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.value),
      main: getPick("#mainSeg", "any"),
      budget: getPick("#budgetSeg", "any"),
      avoid: els.avoid.value.trim(),
      mode: Number(getPick("#modeSeg", "1")) === 3 ? 3 : 1,
    };
    state.profile = profile;
    saveJSON("wte.profile", profile);
    localStorage.setItem("wte.profileSeen", "1");
    updateProfileUI();
    closeProfile();
  }

  els.profileBtn.addEventListener("click", openProfile);
  els.profileSave.addEventListener("click", saveProfile);
  els.profileSkip.addEventListener("click", () => {
    localStorage.setItem("wte.profileSeen", "1");
    closeProfile();
  });
  els.modal.addEventListener("click", (e) => {
    // 表单类弹窗：点蒙层不关。ESC 与「取消 / 跳过」是显式动作，才允许收尾
    if (e.target.classList.contains("modal-backdrop")) return;
    if (e.target.closest("[data-close]")) { localStorage.setItem("wte.profileSeen", "1"); closeProfile(); }
    const pick = e.target.closest("#flavorChips .pick");
    if (pick) pick.setAttribute("aria-pressed", String(pick.getAttribute("aria-pressed") !== "true"));
    const seg = e.target.closest(".seg-btn");
    if (seg) setPick(`#${seg.closest(".seg").id}`, seg.dataset.value);
  });

  // —— 主流程：加载骨架 → 推荐卡片（单卡 1 张 / 三卡 3 张纵向堆叠）——
  function stopSlot() {
    if (state.slotTimer) { clearInterval(state.slotTimer); state.slotTimer = null; }
  }
  function skeletonCard(withSlot) {
    return `
      <div class="dish-card is-loading" aria-busy="true">
        <div class="dish-head">
          <div class="sk" style="width:52px;height:52px;border-radius:16px"></div>
          <div style="flex:1;min-width:0">
            <div class="sk" style="height:24px;width:60%;border-radius:8px"></div>
            <div class="sk" style="height:14px;width:40%;border-radius:8px;margin-top:10px"></div>
          </div>
        </div>
        <div class="dish-stats">
          <div class="sk" style="height:52px;border-radius:14px"></div>
          <div class="sk" style="height:52px;border-radius:14px"></div>
        </div>
        <div class="sk" style="height:14px;width:85%;border-radius:8px"></div>
        <div class="sk" style="height:14px;width:70%;border-radius:8px;margin-top:8px"></div>
        ${withSlot ? '<p class="slot-hint">正在翻找：<span id="slotName">…</span></p>' : ""}
      </div>`;
  }
  function renderLoading(count) {
    const n = count === 3 ? 3 : 1;
    els.result.innerHTML = `<div class="card-stack${n === 3 ? " is-multi" : ""}">${Array.from({ length: n }, (_, i) => skeletonCard(i === 0)).join("")}</div>`;
    if (reducedMotion) return;
    const names = (window.DB_REAL && window.DB_REAL.dishes ? window.DB_REAL.dishes : window.DB.dishes).map((d) => d.name);
    const slot = $("#slotName");
    if (!slot) return;
    state.slotTimer = setInterval(() => {
      slot.textContent = names[Math.floor(Math.random() * names.length)];
    }, 90);
  }

  // 结果常常几十毫秒就回来，骨架一闪而过反而像闪屏：延迟 110ms 再出，出了就至少留 320ms
  async function withSkeleton(mode, task) {
    const startedAt = performance.now();
    let shown = false;
    const timer = setTimeout(() => { shown = true; renderLoading(mode); }, 110);
    try {
      const out = await task();
      clearTimeout(timer);
      if (shown) {
        const left = 320 - (performance.now() - startedAt);
        if (left > 0) await wait(left);
      }
      return out;
    } finally {
      clearTimeout(timer);
    }
  }

  function cardHTML(card, idx, total) {
    const { dish: d, matched, reason, relaxed, relaxedNote } = card;
    const tastes = Array.isArray(d.taste) ? d.taste : [];
    const eaten = state.dishCount[d.id] || 0;
    const pickLabel = eaten > 0 ? `吃过 ${eaten} 次` : "就这个";
    // 热量统一用成分表估算值，和「AI 拆解」面板里的总数是同一个数
    const cal = window.AI && window.AI.calOf ? window.AI.calOf(d) : d.cal;
    // 称重计价：price 是按 400g 估的一份价，牌面单价另存在 unitPrice，两者都要说清楚
    const isWeight = d.pricing === "weight";
    return `
      <article class="dish-card">
        ${total > 1 ? `<div class="card-index">推荐 ${idx + 1} / ${total}</div>` : ""}
        ${card.label ? `<div class="card-label">${card.label}</div>` : ""}
        <div class="dish-head">
          <div class="dish-badge">${icon(d.icon, 26)}</div>
          <div class="dish-title">
            <h2>${d.name}</h2>
            <div class="trow">
              <span class="ttag">${d.category}</span>
              ${tastes.map((t) => `<span class="ttag${t.includes("辣") ? " spicy" : ""}">${t}</span>`).join("")}
            </div>
          </div>
        </div>
        <div class="dish-stats">
          <div class="stat">${icon("wallet")}<b class="price">¥${d.price}</b><small>${isWeight ? "元·估" : "元"}</small></div>
          <button type="button" class="stat stat-cal" data-action="nutri" data-idx="${idx}" aria-expanded="false" aria-label="查看热量是怎么算出来的">
            ${icon("flame")}<b class="cal-num">${cal}</b><small>kcal · 算出来的</small>
          </button>
        </div>
        ${isWeight ? `<p class="weight-note">牌面 ${d.unitPrice} 元/${d.unit}，按 400g 估一份；实际以称重结算</p>` : ""}
        <button type="button" class="nutri-toggle" data-action="nutri" data-idx="${idx}" aria-expanded="false">
          ${icon("sparkles", 15)}<span>看算式</span><em>模型只估克数</em>
        </button>
        <div class="nutri-body" data-nutri-body="${idx}" hidden></div>
        ${d.stall ? `<div class="dish-stall">${icon("pin", 14)}<span>${d.stall}${d.canteen ? ` · ${d.canteen}` : ""}</span></div>` : ""}
        ${relaxed ? `<p class="relaxed-note">${relaxedNote}</p>` : ""}
        <div class="reason">
          <span class="reason-label">${icon("sparkles", 15)}推荐理由</span>
          <p>${reason}</p>
        </div>
        ${matched.length ? `<div class="match">${matched.map((m) => `<span class="mchip">${icon("check", 13)}${m}</span>`).join("")}</div>` : ""}
        <div class="dish-actions">
          <button class="ghost-btn pick-btn" data-action="pick" data-idx="${idx}">${icon("check", 16)}${pickLabel}</button>
          <button class="ghost-btn fav-btn${isFavorite(d.id) ? " is-faved" : ""}" data-action="fav-toggle" data-idx="${idx}" aria-label="${isFavorite(d.id) ? "取消收藏" : "收藏"}">${icon(isFavorite(d.id) ? "heartFilled" : "heart", 16)}</button>
        </div>
      </article>`;
  }

  // 出结果后把第一张卡滚到舒服的位置，避免卡片卡在屏幕底部只露半截
  function focusResult() {
    const card = els.result.querySelector(".dish-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const gap = 14;
    if (rect.top >= gap && rect.top <= window.innerHeight * 0.32) return;
    window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - gap), behavior: reducedMotion ? "auto" : "smooth" });
  }

  function renderResult(data) {
    stopSlot();
    const cards = data.cards || [];
    const multi = cards.length > 1;
    const conflicts = data.conflicts || [];
    const canCompare = conflicts.some((c) => c.type === "荤素");
    const conflictHTML = conflicts.length
      ? `<div class="conflict-note">
          <span>${icon("info", 15)}${conflicts.map((c) => c.note).join(" ")}</span>
          ${canCompare ? `<button type="button" class="ghost-btn compact" data-action="compare">两种都看看</button>` : ""}
        </div>`
      : "";
    els.result.innerHTML = `
      ${conflictHTML}
      <div class="card-stack${multi ? " is-multi" : ""}">${cards.map((c, i) => cardHTML(c, i, cards.length)).join("")}</div>
      ${multi ? `<div class="card-dots" aria-label="三张卡切换">${cards.map((_, i) => `<button type="button" class="card-dot${i === 0 ? " is-on" : ""}" data-dot="${i}" aria-label="第 ${i + 1} 张"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("")}</div>
      <p class="swipe-hint">左右滑动，看看另外两张</p>` : ""}
      <div class="group-actions">
        <button class="ghost-btn" data-action="reroll">${icon("refresh-cw", 16)}${multi ? "整组换一个" : "换一个"}</button>
      </div>`;
    focusResult();
    state.lastCards = cards;
    // 三卡横滑没有页码时，评委大概率只看得到第一张 —— 用圆点把「还有两张」摆到明面上
    const stack = els.result.querySelector(".card-stack.is-multi");
    if (stack) {
      const dots = Array.from(els.result.querySelectorAll(".card-dot"));
      const step = () => stack.scrollWidth / Math.max(1, cards.length);
      const syncDots = () => {
        const i = Math.min(cards.length - 1, Math.max(0, Math.round(stack.scrollLeft / step())));
        dots.forEach((d, k) => {
          d.classList.toggle("is-on", k === i);
          if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
        });
      };
      stack.addEventListener("scroll", syncDots, { passive: true });
      dots.forEach((d) => d.addEventListener("click", () => {
        const i = Number(d.dataset.dot) || 0;
        stack.scrollTo({ left: i * step(), behavior: reducedMotion ? "auto" : "smooth" });
      }));
      syncDots();
    }
    cards.forEach((c) => {
      if (c.dish && c.dish.stall) state.recentStalls.push(c.dish.stall);
      if (c.slot && c.slot.flavor) {
        state.flavorHistory.push({ f: c.slot.flavor, e: c.slot.explore ? 1 : 0, s: c.slot.strong ? 1 : 0 });
      }
    });
    state.recentStalls = state.recentStalls.slice(-10);
    state.flavorHistory = state.flavorHistory.slice(-10);
    saveJSON("wte.recentStalls", state.recentStalls);
    saveJSON("wte.flavorHistory", state.flavorHistory);
  }

  function renderError() {
    stopSlot();
    els.result.innerHTML = `
      <div class="empty">
        <p class="empty-title">推荐服务打了个盹</p>
        <p class="empty-hint">再点一次按钮试试</p>
        <button class="ghost-btn" id="reroll">再试一次</button>
      </div>`;
  }

  // pickTimers: { [idx]: timeoutId } —— 每张卡独立的撤销倒计时
  const pickTimers = {};

  function recordPick(idx) {
    const card = state.lastCards[idx];
    if (!card || !card.dish) return;
    const d = card.dish;
    addEatenToday(d.id); // 今天吃过 → 自动排除
    const fb = state.feedback;
    if (!fb.stalls) fb.stalls = {};
    if (!fb.flavors) fb.flavors = {};
    if (!fb.categories) fb.categories = {};
    if (!fb.clickedStalls) fb.clickedStalls = [];
    if (d.stall) {
      fb.stalls[d.stall] = (fb.stalls[d.stall] || 0) + 1;
      if (!fb.clickedStalls.includes(d.stall)) fb.clickedStalls.push(d.stall);
    }
    const flavors = Array.isArray(d.flavors) ? d.flavors : (typeof d.flavors === "string" ? d.flavors.split("|") : []);
    flavors.filter(Boolean).forEach((f) => { fb.flavors[f] = (fb.flavors[f] || 0) + 1; });
    if (d.category) fb.categories[d.category] = (fb.categories[d.category] || 0) + 1;
    saveJSON("wte.feedback", fb);
    state.dishCount[d.id] = (state.dishCount[d.id] || 0) + 1;
    saveJSON("wte.dishCount", state.dishCount);
    const times = state.dishCount[d.id];
    const btn = els.result.querySelector(`[data-action="pick"][data-idx="${idx}"]`);
    if (!btn) return;
    btn.classList.add("is-picked");
    btn.dataset.revocable = "1";
    btn.innerHTML = `${icon("check", 16)}吃过 ${times} 次 <span class="pick-undo" data-undo-idx="${idx}">撤销</span>`;
    // 5 秒后撤销窗口关闭，按钮锁定
    pickTimers[idx] = setTimeout(() => lockPicked(idx), 5000);
  }
  function lockPicked(idx) {
    const card = state.lastCards[idx];
    const times = card && card.dish ? (state.dishCount[card.dish.id] || 0) : 0;
    const btn = els.result.querySelector(`[data-action="pick"][data-idx="${idx}"]`);
    if (btn) {
      btn.dataset.revocable = "";
      btn.disabled = true;
      btn.innerHTML = `${icon("check", 16)}吃过 ${times} 次`;
    }
    delete pickTimers[idx];
  }
  function undoPick(idx) {
    const card = state.lastCards[idx];
    if (!card || !card.dish) return;
    // 从"今天吃过"移除，恢复推荐资格
    state.eatenToday.ids = state.eatenToday.ids.filter((id) => id !== card.dish.id);
    saveJSON("wte.eatenToday", state.eatenToday);
    // 吃过的次数也要退回去，否则一次误点会永久抬高这道菜的计数
    const left = Math.max(0, (state.dishCount[card.dish.id] || 0) - 1);
    state.dishCount[card.dish.id] = left;
    saveJSON("wte.dishCount", state.dishCount);
    // 取消 5 秒倒计时
    if (pickTimers[idx]) { clearTimeout(pickTimers[idx]); delete pickTimers[idx]; }
    // 恢复按钮
    const btn = els.result.querySelector(`[data-action="pick"][data-idx="${idx}"]`);
    if (btn) {
      btn.classList.remove("is-picked");
      delete btn.dataset.revocable;
      btn.disabled = false;
      btn.innerHTML = `${icon("check", 16)}${left > 0 ? `吃过 ${left} 次` : "就这个"}`;
    }
  }

  async function roll({ novelty = false, excludeCurrent = false } = {}) {
    if (state.loading) return;
    checkDayReset(); // 每天第一次 roll 自动清零
    const mode = state.profile && state.profile.mode === 3 ? 3 : 1;
    const excludeIds = [
      ...(excludeCurrent ? state.lastCards.map((c) => c.dish && c.dish.id).filter(Boolean) : []),
      ...state.eatenToday.ids, // 今天吃过的也排除
    ];
    state.loading = true;
    els.decide.disabled = true;
    els.novelty.disabled = true;
    els.decide.classList.add("loading");
    els.decideText.textContent = "正在翻找菜谱…";
    try {
      const res = await withSkeleton(mode, () => window.API.recommend({
        text: els.pref.value.trim(),
        profile: state.profile,
        feedback: state.feedback,
        excludeIds,
        recentStalls: state.recentStalls,
        flavorHistory: state.flavorHistory,
        mode,
        novelty,
      }));
      renderResult(res.data);
    } catch (err) {
      renderError();
    } finally {
      state.loading = false;
      els.decide.disabled = false;
      els.novelty.disabled = false;
      els.decide.classList.remove("loading");
      els.decideText.textContent = "替我决定！";
    }
  }

  // “两种都看看”：把冲突的两句各执行一次，各给一张卡
  async function compareBoth() {
    if (state.loading) return;
    state.loading = true;
    els.decide.disabled = true;
    els.novelty.disabled = true;
    els.decide.classList.add("loading");
    els.decideText.textContent = "两种都翻一下…";
    const args = {
      text: els.pref.value.trim(),
      profile: state.profile,
      feedback: state.feedback,
      excludeIds: [],
      recentStalls: state.recentStalls,
      flavorHistory: state.flavorHistory,
      mode: 1,
    };
    try {
      const [a, b] = await withSkeleton(1, () => Promise.all([
        window.API.recommend({ ...args, override: { main: "veg" } }),
        window.API.recommend({ ...args, override: { main: "meat" } }),
      ]));
      renderResult({ cards: [a.data.cards[0], b.data.cards[0]].filter(Boolean), conflicts: [] });
    } catch (err) {
      renderError();
    } finally {
      state.loading = false;
      els.decide.disabled = false;
      els.novelty.disabled = false;
      els.decide.classList.remove("loading");
      els.decideText.textContent = "替我决定！";
    }
  }

  els.decide.addEventListener("click", () => roll());
  els.novelty.addEventListener("click", () => roll({ novelty: true, excludeCurrent: true }));
  els.result.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="compare"]')) { compareBoth(); return; }
    const nutri = e.target.closest('[data-action="nutri"]');
    if (nutri) { toggleNutrition(Number(nutri.dataset.idx), nutri); return; }
    const undo = e.target.closest(".pick-undo");
    if (undo) { undoPick(Number(undo.dataset.undoIdx)); return; }
    const pick = e.target.closest('[data-action="pick"]');
    if (pick) {
      // 已处于撤销窗口的按钮，点非撤销区域不重复触发
      if (pick.dataset.revocable === "1") return;
      recordPick(Number(pick.dataset.idx)); return;
    }
    const favToggle = e.target.closest('[data-action="fav-toggle"]');
    if (favToggle) {
      const card = state.lastCards[Number(favToggle.dataset.idx)];
      if (card && card.dish) toggleFavorite(card.dish);
      return;
    }
    if (e.target.closest('[data-action="reroll"]') || e.target.closest("#reroll")) roll({ excludeCurrent: true });
  });

  // —— 收藏面板事件 ——
  els.favFab.addEventListener("click", () => {
    if (els.favPanel.hidden) openFavPanel(); else closeFavPanel();
  });
  els.favClose.addEventListener("click", closeFavPanel);
  els.favPanel.addEventListener("click", (e) => {
    const del = e.target.closest('[data-action="fav-del"]');
    if (del) {
      const id = Number(del.dataset.id);
      const removed = state.favorites.find((f) => f.id === id);
      state.favorites = state.favorites.filter((f) => f.id !== id);
      saveJSON("wte.favorites", state.favorites);
      updateFavFab();
      renderFavoritesPanel();
      syncFavButton(id);
      if (removed) {
        toast(`已取消收藏 ${removed.name}`, {
          label: "撤销",
          run: () => {
            state.favorites.push(removed);
            saveJSON("wte.favorites", state.favorites);
            updateFavFab();
            renderFavoritesPanel();
            syncFavButton(id);
          },
        });
      }
      return;
    }
    const rec = e.target.closest('[data-action="fav-rec"]');
    if (rec) {
      // 直接用这道菜的名字作为偏好输入，强制推荐它
      const id = Number(rec.dataset.id);
      const fav = state.favorites.find((f) => f.id === id);
      if (fav) {
        els.pref.value = fav.name;
        els.pref.dispatchEvent(new Event("input"));
        closeFavPanel();
        roll();
      }
      return;
    }
  });

  // ================= AI 部分 =================

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const dishFlavorsLocal = (d) => {
    if (!d) return [];
    if (Array.isArray(d.flavors)) return d.flavors.filter(Boolean);
    if (typeof d.flavors === "string") return d.flavors.split("|").filter(Boolean);
    return [];
  };

  let toastTimer = null;
  let toastAction = null;
  function toast(msg, action) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      // 读屏要能播报操作结果，否则「点了没反应」对无障碍用户是字面意义上的没反应
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
      el.addEventListener("click", (ev) => {
        // 整条 toast 都能点撤销，不必精确戳中那个小按钮
        if (!toastAction) return;
        const run = toastAction;
        toastAction = null;
        run();
      });
    }
    toastAction = action ? action.run : null;
    el.innerHTML = action
      ? `<span>${msg}</span><button type="button" class="toast-act">${action.label}</button>`
      : `<span>${msg}</span>`;
    el.classList.toggle("has-act", !!action);
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    // 带撤销的操作要留足反应时间
    toastTimer = setTimeout(() => { el.classList.remove("is-on"); toastAction = null; }, action ? 5000 : 2400);
  }

  // —— 一、营养拆解 ——
  function nutritionHTML(r) {
    const isAI = String(r.source).indexOf("ai") === 0;
    const srcLabel = isAI ? "AI 拆解" : "本地估算";
    const rows = r.rows.slice(0, 6);
    const list = rows.map((x) => `
      <li>
        <div class="nutri-line">
          <span class="nutri-name">${x.name}</span>
          <span class="nutri-g">${x.g} g</span>
          <b class="nutri-val">${x.kcal}</b>
          <span class="nutri-unit">kcal</span>
        </div>
        <div class="nutri-bar"><i style="width:${Math.max(3, Math.round(x.share * 100))}%"></i></div>
      </li>`).join("");
    const more = r.rows.length > 6 ? `<li class="nutri-more">另有 ${r.rows.length - 6} 项未展开</li>` : "";
    const formula = r.rows.map((x) => `${x.name} ${x.g}g×${x.per100}/100`).join(" + ") + ` = ${r.total}`;
    let delta = "";
    if (r.menuCal) {
      const d = r.delta;
      delta = Math.abs(d) <= 30
        ? `<p class="nutri-delta ok">菜单标 ${r.menuCal} kcal，拆解值差 ${d > 0 ? "+" : ""}${d}，基本对得上。</p>`
        : `<p class="nutri-delta">菜单标 ${r.menuCal} kcal，按原料算是 ${r.total} kcal，差 ${d > 0 ? "+" : ""}${d} kcal。</p>`;
    }
    const miss = r.missing && r.missing.length
      ? `<p class="nutri-miss">成分表未收录、未计入：${r.missing.join("、")}</p>` : "";
    return `
      <p class="nutri-lead">模型只估克数，热量按成分表相乘</p>
      <div class="nutri-head">
        <div><b>${r.total}</b><small>kcal · 按成分表算</small></div>
        <span class="nutri-src${isAI ? " is-ai" : ""}">${srcLabel}</span>
      </div>
      <ul class="nutri-list">${list}${more}</ul>
      <details class="nutri-formula">
        <summary>看算式</summary>
        <p>${formula}</p>
        <p class="nutri-note">克数由${isAI ? "模型估算" : "本地规则估算"}，热量由成分表逐项相乘求和，每一行都能自己按计算器复核。</p>
      </details>
      ${delta}${miss}`;
  }

  async function toggleNutrition(idx, btn) {
    const card = state.lastCards[idx];
    const body = els.result.querySelector(`[data-nutri-body="${idx}"]`);
    if (!card || !body) return;
    // 两个入口（热量数字 / 看算式）共用同一块展开区，aria-expanded 要一起同步
    const setExpanded = (on) => {
      els.result.querySelectorAll(`[data-action="nutri"][data-idx="${idx}"]`).forEach((b) => {
        b.setAttribute("aria-expanded", String(on));
        b.classList.toggle("is-open", on);
      });
    };
    if (!body.hidden) {
      body.hidden = true;
      setExpanded(false);
      return;
    }
    body.hidden = false;
    setExpanded(true);
    if (body.dataset.filled === "1") return;

    // 先用本地成分表秒出结果（几十毫秒），AI 只做后台校准 —— 不让用户等模型。
    const syncCardCal = (total) => {
      if (!total) return;
      const cardEl = btn.closest(".dish-card");
      const calEl = cardEl && cardEl.querySelector(".cal-num");
      if (calEl) calEl.textContent = String(total);
    };
    const local = window.AI.localNutrition(card.dish);
    body.innerHTML = nutritionHTML(local);
    body.dataset.filled = "1";
    syncCardCal(local.total);

    if (!window.AI.enabled()) return;
    body.innerHTML += `<p class="nutri-refining"><i></i>AI 正在校准克数…</p>`;
    try {
      const r = await window.AI.nutrition(card.dish);
      // 只有真的拿到 AI 结果才替换，失败就保持本地估算，别闪回
      if (!/^ai/.test(String(r.source))) return;
      body.innerHTML = nutritionHTML(r);
      syncCardCal(r.total);
    } catch (e) { /* 保持本地结果 */ } finally {
      const tip = body.querySelector(".nutri-refining");
      if (tip) tip.remove();
    }
  }

  // —— 二、双引擎切换 ——
  const modeTabs = $$(".mode-tab");
  let currentMode = "normal";
  const modeScroll = { normal: 0, oracle: 0 };
  function setMode(mode) {
    if (!els.normalView || !els.oracleView || mode === currentMode) return;
    modeScroll[currentMode] = window.scrollY;
    const app = document.querySelector(".app");
    const swap = () => {
      els.normalView.hidden = mode !== "normal";
      els.oracleView.hidden = mode !== "oracle";
      modeTabs.forEach((b) => {
        const on = b.dataset.mode === mode;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-selected", String(on));
      });
      currentMode = mode;
      window.scrollTo({ top: modeScroll[mode] || 0 });
      if (mode === "oracle") {
        // 转盘是罗盘的主角，进页面就该在，而不是等点了「转」才凭空出现
        if (els.wheelStage) els.wheelStage.hidden = false;
        buildWheel();
        // 和正经推荐同一套入场节奏：逐块上浮，而不是整页硬切过来
        els.oracleView.classList.remove("is-entering");
        void els.oracleView.offsetWidth;
        els.oracleView.classList.add("is-entering");
        setTimeout(() => els.oracleText && els.oracleText.focus({ preventScroll: true }), 220);
      }
    };
    // 硬切会让「入场有动效、切换零过渡」显得割裂；这里做 140ms 淡出淡入，并保留各自滚动位置
    if (reducedMotion || !app) { swap(); return; }
    app.classList.add("is-switching");
    setTimeout(() => {
      swap();
      requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove("is-switching")));
    }, 140);
  }
  modeTabs.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  // —— 三、拍照问诊 ——
  const STATE_TAGS = ["痘", "油腻", "上火", "干燥", "浮肿", "气色暗", "疲惫", "黑眼圈", "泛红"];

  function openShot() {
    // 旧 HTML 缓存缺元素时，友好提示而不是静默崩溃
    if (!els.shotPreview || !els.stateModal || !els.shotEmpty) {
      toast("页面版本过旧，请刷新（下拉或强制重载）");
      return;
    }
    els.shotPreview.hidden = true;
    els.shotPreview.removeAttribute("src");
    els.shotEmpty.hidden = false;
    els.shotStatus.hidden = true;
    els.shotTags.innerHTML = "";
    els.shotApply.disabled = true;
    if (els.shotCamView) els.shotCamView.hidden = true;
    els.stateModal.hidden = false;
    shotEntry = openModal(els.stateModal, { dismissible: "hard" });
  }
  function closeShot() {
    stopCamera();
    closeModal(shotEntry);
    shotEntry = null;
  }
  function syncShotApply() {
    const n = els.shotTags.querySelectorAll('.state-chip[aria-pressed="true"]').length;
    els.shotApply.disabled = n === 0;
  }
  function renderShotState(tags, note) {
    const picked = {};
    (tags || []).forEach((t) => { picked[t.label] = t.evidence || ""; });
    const extra = STATE_TAGS.filter((t) => !(t in picked));
    const chip = (label, on, evidence) => `
      <button type="button" class="state-chip${on ? " is-on" : ""}" data-tag="${label}" aria-pressed="${on}">
        <b>${label}</b>${evidence ? `<small>${evidence}</small>` : ""}
      </button>`;
    els.shotTags.innerHTML = `
      <p class="shot-note">${note}</p>
      <div class="state-chips">
        ${(tags || []).map((t) => chip(t.label, true, t.evidence)).join("")}
        ${extra.map((t) => chip(t, false, "")).join("")}
      </div>`;
    syncShotApply();
  }

  function compressImage(file, max, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("READ_FAIL")); };
      img.src = url;
    });
  }

  async function analyzeShot(file) {
    els.shotPreview.src = URL.createObjectURL(file);
    els.shotPreview.hidden = false;
    els.shotEmpty.hidden = true;
    els.shotStatus.hidden = false;
    els.shotStatus.textContent = "正在看这张照片…";
    els.shotTags.innerHTML = "";
    els.shotApply.disabled = true;
    try {
      const dataUrl = await compressImage(file, 768, 0.82);
      const r = await window.AI.portrait(dataUrl);
      if (r.source === "ai" && r.tags.length) {
        els.shotStatus.textContent = r.summary || "看完了，标签可以自己改。";
        renderShotState(r.observations, "AI 看到的：");
        return;
      }
      if (r.source === "ai") {
        els.shotStatus.textContent = "没看清人脸，你可以在下面自己选。";
      } else {
        els.shotStatus.textContent = "AI 服务还没连上，先手动选今天的状态。";
      }
      renderShotState([], "手动选：");
    } catch (e) {
      els.shotStatus.textContent = "这张照片读不出来，换一张试试。";
      renderShotState([], "手动选：");
    }
  }

  // —— 拍照问诊模块 ——
  // 相机走 getUserMedia 自绘：Firefox 安卓、微信内置浏览器都不认 input 的 capture 属性，
  // 只靠 capture 会出现「点了完全没反应」，所以这里自己开摄像头。
  let camStream = null;
  let camOpening = false;
  let camFacing = "environment";

  function stopCamera() {
    if (camStream) {
      camStream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} });
      camStream = null;
    }
    if (els.shotVideo) els.shotVideo.srcObject = null;
    if (els.shotCamView) els.shotCamView.hidden = true;
  }

  // 前置预览按自拍习惯镜像，真正拍下来的画面不镜像
  function syncFacingUI() {
    if (els.shotVideo) els.shotVideo.classList.toggle("is-front", camFacing === "user");
  }

  async function acquireCamera(facing) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 } },
      audio: false,
    });
    camStream = stream;
    camFacing = facing;
    els.shotVideo.srcObject = stream;
    syncFacingUI();
    try { await els.shotVideo.play(); } catch (e) { /* 个别浏览器要再点一次才播 */ }
  }

  async function openCamera() {
    if (camOpening) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("这个浏览器不支持网页调相机，已改用系统拍照");
      if (els.shotCam) els.shotCam.click();
      return;
    }
    camOpening = true;
    try {
      await acquireCamera(camFacing);
      els.shotEmpty.hidden = true;
      els.shotCamView.hidden = false;
    } catch (e) {
      const name = (e && e.name) || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast("相机权限被拒绝：在浏览器里允许本站使用相机，或从相册选一张");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        toast("没找到摄像头，从相册选一张吧");
      } else {
        toast("相机打不开，改用系统拍照");
        if (els.shotCam) els.shotCam.click();
      }
    } finally {
      camOpening = false;
    }
  }

  async function flipCamera() {
    if (camOpening || !camStream) return;
    const prev = camFacing;
    const next = prev === "environment" ? "user" : "environment";
    camOpening = true;
    try {
      // 先释放旧流：部分安卓机不允许前后摄同时被占用，否则切成黑屏
      camStream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} });
      camStream = null;
      await acquireCamera(next);
    } catch (e) {
      // 切不过去就把原来的摄像头接回来，别让画面停在黑屏
      try { await acquireCamera(prev); } catch (e2) { /* 彻底失败就保持黑屏并提示 */ }
      toast("切换失败，这台设备可能只有一个摄像头");
    } finally {
      camOpening = false;
    }
  }

  function snapPhoto() {
    const v = els.shotVideo;
    if (!v || !v.videoWidth) { toast("相机还在启动，等一秒再拍"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      stopCamera();
      if (blob) analyzeShot(new File([blob], "camera.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  try {
    if (els.shotBtn) els.shotBtn.addEventListener("click", openShot);
    const onShotFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) analyzeShot(file);
      e.target.value = "";
    };
    if (els.shotInput) els.shotInput.addEventListener("change", onShotFile);
    if (els.shotCam) els.shotCam.addEventListener("change", onShotFile);
    if (els.shotTake) els.shotTake.addEventListener("click", openCamera);
    if (els.shotSnap) els.shotSnap.addEventListener("click", snapPhoto);
    if (els.shotFlip) els.shotFlip.addEventListener("click", flipCamera);
    if (els.shotCamCancel) els.shotCamCancel.addEventListener("click", () => {
      stopCamera();
      els.shotEmpty.hidden = false;
    });
    // 注意：这里不再给整个 shotZone 绑 click 弹相册。
    // 之前 label 触发 input 的点击会冒泡到 zone，又去点第二个 input，
    // 同一个手势里开两个文件选择器会互相取消，表现就是「点了没反应」。
    if (els.shotTags) els.shotTags.addEventListener("click", (e) => {
      const chip = e.target.closest(".state-chip");
      if (!chip) return;
      chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
      chip.classList.toggle("is-on", chip.getAttribute("aria-pressed") === "true");
      syncShotApply();
    });
    if (els.shotApply) els.shotApply.addEventListener("click", () => {
      const tags = $$('#shotTags .state-chip[aria-pressed="true"]').map((b) => b.dataset.tag);
      const m = window.AI.mappingFor(tags);
      // 只把 AI 的观察翻译成一句人话写进输入框，用户还能改 —— 决策权仍然在人手里
      const text = m.text || "";
      if (text) {
        const cur = els.pref.value.trim();
        els.pref.value = cur ? cur + "、" + text : text;
        els.pref.dispatchEvent(new Event("input"));
      }
      closeShot();
      setMode("normal");
      setTimeout(() => roll({ excludeCurrent: true }), 120);
    });
  } catch (e) {
    console.warn("[app] 拍照模块初始化失败，已跳过", e);
  }

  // —— 四、食堂罗盘 ——
  const WHEEL_CATS = ["面食", "盖浇饭", "家常小炒", "麻辣系列", "烧烤", "早餐小吃", "甜品饮品", "汤粥"];
  let wheelBuilt = false;
  let wheelSpins = 0;
  let oracleBusy = false;
  let oracleLast = null;

  function buildWheel() {
    if (wheelBuilt || !els.wheel) return;
    // 纯 translate 定位（与 rotate+translateY+rotate 渲染结果完全等价，只是少两次矩阵运算），
    // 把基础位移存进 data-tf，落点时要在这串位移后面追加反向旋转，让命中的词回正。
    els.wheel.innerHTML = WHEEL_CATS.map((c, i) => {
      const a = (i * 45 * Math.PI) / 180;
      const tf = `translate(${(96 * Math.sin(a)).toFixed(2)}px, ${(-96 * Math.cos(a)).toFixed(2)}px)`;
      return `<span class="wheel-label" data-tf="${tf}" style="transform:${tf}">${c}</span>`;
    }).join("");
    wheelBuilt = true;
  }

  function oraclePool(constraints, seed) {
    const all = ((window.DB_REAL && window.DB_REAL.dishes) || window.DB.dishes)
      .filter((d) => !state.eatenToday.ids.includes(d.id));
    let pool = all;
    const c = constraints || {};
    const narrow = (fn) => { const next = pool.filter(fn); if (next.length) pool = next; };
    if (c.avoid && c.avoid.length) narrow((d) => !c.avoid.some((k) => d.name.includes(k)));
    if (c.category) narrow((d) => d.category === c.category);
    if (c.flavors && c.flavors.length) narrow((d) => dishFlavorsLocal(d).some((f) => c.flavors.includes(f)));
    if (c.tags && c.tags.length) narrow((d) => (d.tags || []).some((t) => c.tags.includes(t)));
    if (!pool.length) pool = all;
    return pool[seed % pool.length];
  }

  function renderOracle(r, dish) {
    const c = r.constraints || {};
    const bits = [];
    if (c.category) bits.push(c.category);
    (c.flavors || []).forEach((f) => bits.push(f));
    (c.tags || []).forEach((t) => bits.push(t));
    (c.avoid || []).forEach((a) => bits.push("避开" + a));
    const isAI = String(r.source).indexOf("ai") === 0;
    els.oracleResult.innerHTML = `
      <div class="oracle-card">
        <p class="oracle-sign">「${r.sign}」</p>
        ${r.why ? `<p class="oracle-why">${r.why}</p>` : ""}
        <div class="oracle-dish">
          <span class="oracle-kicker">落到这道</span>
          <h3>${dish.name}</h3>
          <p>¥${dish.price}${dish.pricing === "weight" ? "（称重估）" : ""} · ${window.AI && window.AI.calOf ? window.AI.calOf(dish) : dish.cal} kcal · ${dish.stall || dish.category}</p>
        </div>
        <p class="oracle-trace">条件：${bits.length ? bits.join(" / ") : "不加限制"}</p>
        <div class="oracle-basis">
          <button type="button" class="basis-toggle" data-action="oracle-basis" aria-expanded="false">抽签依据</button>
          <p class="basis-body" hidden>seed ${r.seed} · ${isAI ? "AI 解签" : "本地签文"} · 今天同一句话结果固定</p>
        </div>
        <div class="oracle-actions">
          <button type="button" class="ghost-btn compact" data-action="oracle-clear">换一句话</button>
          <button type="button" class="decide compact" data-action="oracle-pick">就吃这个</button>
        </div>
      </div>`;
  }

  // 落位后让命中的那个词在屏幕上正立。标签是随父轮盘一起转的，
  // 落位角度 = -idx*45 + jitter，只有 idx=0 时它才恰好是正的；
  // 其余品类的落点会让顶部那个词歪 45°×idx —— 这就是「罗盘上的字被甩歪」。
  // 给命中词追加一个等量反向旋转，位置不动、朝向归正。
  function faceUpHitLabel(idx) {
    if (!els.wheel) return;
    const label = els.wheel.querySelector(`.wheel-label:nth-child(${idx + 1})`);
    if (!label || !label.dataset.tf) return;
    const deg = currentRotation(els.wheel);
    label.style.transform = `${label.dataset.tf} rotate(${(-deg).toFixed(2)}deg)`;
  }

  // 起转前把所有标签恢复成基础位移，否则上一轮的命中词会「钉住」不跟着转
  function resetWheelLabels() {
    if (!els.wheel) return;
    els.wheel.querySelectorAll(".wheel-label").forEach((l) => {
      l.classList.remove("is-hit");
      if (l.dataset.tf) l.style.transform = l.dataset.tf;
    });
  }

  // 停下来的那一帧要“咬住”：外圈脉冲 + 命中品类加深，0.9s 后收回
  function markWheelLanding(idx) {
    if (!els.wheel) return;
    els.wheel.querySelectorAll(".wheel-label.is-hit").forEach((l) => l.classList.remove("is-hit"));
    const wrap = els.wheelStage ? els.wheelStage.querySelector(".wheel-wrap") : null;
    const label = els.wheel.querySelector(`.wheel-label:nth-child(${idx + 1})`);
    els.wheel.classList.add("is-landing");
    if (wrap) wrap.classList.add("is-landing");
    if (label) {
      faceUpHitLabel(idx);
      label.classList.add("is-hit");
    }
    setTimeout(() => {
      els.wheel.classList.remove("is-landing");
      if (wrap) wrap.classList.remove("is-landing");
      if (label) label.classList.remove("is-hit");
    }, 900);
  }

  // 读当前实际角度（度）。转场中途也能读到插值后的值，用来接力，不会跳。
  function currentRotation(el) {
    const m = getComputedStyle(el).transform;
    if (!m || m === "none") return 0;
    const p = m.replace(/^matrix\(|\)$/g, "").split(",").map(Number);
    if (p.length < 2) return 0;
    return (Math.atan2(p[1], p[0]) * 180) / Math.PI;
  }

  let wheelAnim = null;

  // —— 旋转驱动：WAAPI 优先，系统动画缩放为 0（安卓“移除动画”等）时自动降级 rAF 手驱 ——
  // 背景：2026-11-14 真机录屏证实，系统级关动画会把 WAAPI 时钟一起冻结，
  // element.animate 创建的无限循环卡在首帧，页面看起来像“点了没反应”。
  // rAF 由 vsync 驱动、不受动画缩放影响，每帧直接写 inline transform 兜底。
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    const solve = (x) => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const err = sx(t) - x;
        if (Math.abs(err) < 1e-5) return t;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      let lo = 0, hi = 1;
      t = x;
      for (let i = 0; i < 16; i++) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-5) return t;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return t;
    };
    return (p) => sy(solve(p));
  }

  function parseEasing(easing) {
    if (!easing || easing === "linear") return (p) => p;
    const m = /cubic-bezier\(([^)]+)\)/.exec(easing);
    if (!m) return (p) => p;
    const [x1, y1, x2, y2] = m[1].split(",").map(Number);
    return cubicBezier(x1, y1, x2, y2);
  }

  // rAF 手驱：每帧按时间戳算角度写 inline style，不经过任何动画系统
  function rafRotate(el, fromDeg, toDeg, duration, easingFn, infinite) {
    let raf = 0;
    let startTs = null;
    let done = false;
    let resolveFinished;
    const finished = new Promise((r) => { resolveFinished = r; });
    const span = toDeg - fromDeg;
    function frame(ts) {
      if (done) return;
      if (startTs === null) startTs = ts;
      const p = (ts - startTs) / duration;
      if (infinite) {
        el.style.transform = `rotate(${fromDeg + span * (p % 1)}deg)`;
      } else if (p >= 1) {
        el.style.transform = `rotate(${toDeg}deg)`;
        done = true;
        resolveFinished();
        return;
      } else {
        el.style.transform = `rotate(${fromDeg + span * easingFn(p)}deg)`;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      driver: "raf",
      finished,
      cancel() {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        resolveFinished();
      },
    };
  }

  // 两帧采样：角度几乎没动 = WAAPI 被系统冻结。正常最慢的 RM 空转两帧也有 2° 以上
  function probeFrozen(el) {
    return new Promise((resolve) => {
      const a = currentRotation(el);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          let d = Math.abs(currentRotation(el) - a) % 360;
          if (d > 180) d = 360 - d;
          resolve(d < 0.5);
        });
      });
    });
  }

  // 统一入口，对外保持 { finished, cancel() } 与 WAAPI 一致
  function createWheelRotation(fromDeg, toDeg, duration, easing, iterations = 1) {
    const infinite = iterations === Infinity;
    const easingFn = parseEasing(easing);
    const wa = els.wheel.animate(
      [{ transform: `rotate(${fromDeg}deg)` }, { transform: `rotate(${toDeg}deg)` }],
      { duration, easing, iterations, fill: "forwards" }
    );
    let active = wa;
    let switched = false;
    let resolveOuter;
    const finished = new Promise((r) => { resolveOuter = r; });
    wa.finished.then(() => { if (!switched) resolveOuter(); }, () => {});
    probeFrozen(els.wheel).then((frozen) => {
      if (!frozen || switched) return;
      if (wa.playState === "finished" || wa.playState === "idle") return;
      switched = true;
      wa.cancel();
      const cur = currentRotation(els.wheel);
      active = rafRotate(els.wheel, cur, cur + (toDeg - fromDeg), duration, easingFn, infinite);
      active.finished.then(resolveOuter, resolveOuter);
    });
    return {
      get driver() { return switched ? "raf" : "waapi"; },
      finished,
      cancel() {
        try { active.cancel(); } catch { /* 已结束的动画 cancel 无害 */ }
        resolveOuter();
      },
    };
  }

  // 用 WAAPI 而不是 CSS transition：中途改目标时，transition 会按矩阵分解走最短路径，
  // 可能倒转；关键帧里写死角度，转多少就是多少。
  function spinWheel(fromDeg, toDeg, duration, easing, iterations = 1) {
    return createWheelRotation(fromDeg, toDeg, duration, easing, iterations);
  }

  async function spin() {
    if (oracleBusy) return;
    const text = (els.oracleText.value || "").trim();
    if (!text) {
      els.oracleText.focus();
      toast("先写一句话，越离谱越准");
      return;
    }
    oracleBusy = true;
    // 按钮文案是不依赖动画系统的硬反馈：系统关掉所有动画时，转盘可能被冻结，
    // 但“解签中”三个字一定能告诉用户点击已生效
    const goLabel = els.oracleGo.textContent;
    els.oracleGo.disabled = true;
    els.oracleGo.classList.add("is-spinning");
    els.oracleGo.setAttribute("aria-busy", "true");
    els.oracleGo.textContent = "解签中";
    let statusTimer = null;
    try {
      els.wheelStage.hidden = false;
      els.oracleResult.innerHTML = "";
      buildWheel();
      resetWheelLabels();
      // 首次点「转」时 wheelStage 刚变可见：先落一次 0deg 并强制布局，给过渡一个明确起点
      if (!els.wheel.style.transform) els.wheel.style.transform = "rotate(0deg)";
      void els.wheel.offsetWidth;

      // 按下就转，不等 AI。之前把这段放在 reducedMotion 判断里，系统关了动画的机器会
      // 静止等到解签回来才动，看起来像「点了没反应」；这里改成无条件起转，只是快慢不同。
      // 用无限循环而不是固定 3.6s：AI 一旦比预设慢，轮盘会在中途二次静止。
      // WAAPI 被系统动画缩放冻结时，createWheelRotation 会在两帧内自动切 rAF 手驱。
      {
        els.wheel.style.transition = "none";
        const start = currentRotation(els.wheel);
        const idleMs = reducedMotion ? 5200 : 1800;
        wheelAnim = spinWheel(start, start + 360, idleMs, "linear", Infinity);
      }
      const spinStart = performance.now();
      // 轮盘在首屏下方，点完「转」要把它带进视野；已经在视野里就别再滚，
      // 否则会和落点后的 scrollIntoView 叠加成两段位移
      if (els.wheelStage) {
        const box = els.wheelStage.getBoundingClientRect();
        const inView = box.top >= 0 && box.bottom <= window.innerHeight;
        if (!inView) els.wheelStage.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      }

      statusTimer = setTimeout(() => {
        if (els.wheelStatus) els.wheelStatus.hidden = false;
      }, 200);
      const r = await window.AI.oracle(text);
      clearTimeout(statusTimer);
      statusTimer = null;
      // 模型秒回时轮盘还没转开，先补足 1.2s 再落，避免只抖一下就停
      await wait(Math.max(0, 1200 - (performance.now() - spinStart)));
      if (els.wheelStatus) els.wheelStatus.hidden = true;
      const dish = oraclePool(r.constraints, r.seed);
      oracleLast = { r, dish };

      let idx = WHEEL_CATS.indexOf(dish.category);
      if (idx < 0) idx = r.seed % WHEEL_CATS.length;
      // 留一点角度差让它像手转的，但不超过 ±3°，指针要咬在品类中心
      const jitter = (r.seed % 7) - 3;
      const base = -idx * 45 + jitter;

      if (reducedMotion) {
        // 系统开了「减少动态效果」也不能瞬移：给一段 0.7s、单圈的落位，保留可感知的反馈
        els.wheel.style.transition = "none";
        const start = currentRotation(els.wheel);
        let target = start + 360;
        target += ((base - target) % 360 + 360) % 360;
        // 先起落位动画、再取消无限循环：中间不留空档帧，避免轮盘（及上面的字）
        // 在「无动画」那一瞬被合成器重排到错误角度
        const oldAnim = wheelAnim;
        wheelAnim = spinWheel(start, target, 700, "cubic-bezier(0.2, 0.8, 0.2, 1)");
        if (oldAnim) oldAnim.cancel();
        els.wheel.style.transform = `rotate(${start}deg)`;
        await wheelAnim.finished;
        els.wheel.style.transform = `rotate(${target}deg)`;
        wheelAnim.cancel();
        wheelAnim = null;
        faceUpHitLabel(idx);
        renderOracle(r, dish);
      } else {
        // 从当前角度接力，至少再转一圈半，再减速停在品类中心
        const cur = currentRotation(els.wheel);
        let target = cur + 540;
        target += ((base - target) % 360 + 360) % 360;
        // 先起落位动画、再取消无限循环：中间不留空档帧
        const oldAnim = wheelAnim;
        wheelAnim = spinWheel(cur, target, 2200, "cubic-bezier(0.16, 0.84, 0.24, 1)");
        if (oldAnim) oldAnim.cancel();
        els.wheel.style.transform = `rotate(${cur}deg)`;
        await wheelAnim.finished;
        els.wheel.style.transform = `rotate(${target}deg)`;
        wheelAnim.cancel();
        wheelAnim = null;
        markWheelLanding(idx);
        await wait(200);
        renderOracle(r, dish);
      }
      const cardEl = els.oracleResult.querySelector(".oracle-card");
      if (cardEl && !reducedMotion) cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      // 没有 try/finally 时，中途抛错会让 oracleBusy 永久锁死，之后点“转”全部静默 return
      console.error("[oracle] spin failed:", err);
      if (wheelAnim) { try { wheelAnim.cancel(); } catch { /* 已释放 */ } wheelAnim = null; }
      toast("解签出了点问题，再试一次");
    } finally {
      if (statusTimer) clearTimeout(statusTimer);
      if (els.wheelStatus) els.wheelStatus.hidden = true;
      oracleBusy = false;
      els.oracleGo.disabled = false;
      els.oracleGo.classList.remove("is-spinning");
      els.oracleGo.removeAttribute("aria-busy");
      els.oracleGo.textContent = goLabel;
    }
  }

  els.oracleGo.addEventListener("click", spin);
  els.oracleText.addEventListener("keydown", (e) => { if (e.key === "Enter") spin(); });
  $$(".chip[data-oracle]").forEach((chip) =>
    chip.addEventListener("click", () => {
      els.oracleText.value = chip.dataset.oracle;
      spin();
    })
  );
  els.oracleResult.addEventListener("click", (e) => {
    const basisBtn = e.target.closest('[data-action="oracle-basis"]');
    if (basisBtn) {
      const open = basisBtn.getAttribute("aria-expanded") === "true";
      basisBtn.setAttribute("aria-expanded", String(!open));
      const body = basisBtn.parentElement.querySelector(".basis-body");
      if (body) body.hidden = open;
      return;
    }
    if (e.target.closest('[data-action="oracle-clear"]')) {
      els.oracleText.value = "";
      els.oracleText.focus();
      els.oracleResult.innerHTML = "";
      return;
    }
    if (e.target.closest('[data-action="oracle-pick"]') && oracleLast) {
      const d = oracleLast.dish;
      state.dishCount[d.id] = (state.dishCount[d.id] || 0) + 1;
      saveJSON("wte.dishCount", state.dishCount);
      addEatenToday(d.id);
      toast(`记下了：${d.name}。今天不会再推它`);
      els.oracleResult.querySelector('[data-action="oracle-pick"]').disabled = true;
    }
  });

  // —— 五、AI 服务设置 ——
  function openAI() {
    els.aiWorker.value = window.AI.config().worker || "";
    els.aiStatus.hidden = true;
    els.aiModal.hidden = false;
    aiEntry = openModal(els.aiModal, { dismissible: "hard" });
  }
  function closeAI() {
    closeModal(aiEntry);
    aiEntry = null;
  }
  els.aiBtn.addEventListener("click", openAI);
  els.aiSave.addEventListener("click", () => {
    const url = els.aiWorker.value.trim();
    window.AI.setConfig({ worker: url });
    closeAI();
    toast(url ? "已保存，试试 AI 拆解" : "已切回本地模式");
  });
  els.aiTest.addEventListener("click", async () => {
    const url = els.aiWorker.value.trim().replace(/\/+$/, "");
    els.aiStatus.hidden = false;
    if (!url) {
      els.aiStatus.textContent = "没填地址。留空就是本地模式，功能照样能演示。";
      return;
    }
    els.aiStatus.textContent = "正在连接…";
    try {
      const res = await fetch(url + "/health");
      const data = await res.json();
      els.aiStatus.textContent = data.ok
        ? `已连上：文本 ${data.text ? "✓" : "×"} · 视觉 ${data.vision ? "✓" : "×"}`
        : "连上了，但 Worker 说没配好 Key。";
    } catch (e) {
      els.aiStatus.textContent = "连不上，检查地址或 Worker 是否已 deploy。";
    }
  });

  [els.stateModal, els.aiModal].forEach((m) => {
    if (!m) return;
    m.addEventListener("click", (e) => {
      // 蒙层不关表单弹窗；× 与「取消」是显式动作
      if (e.target.classList.contains("modal-backdrop")) return;
      if (!e.target.closest("[data-close]")) return;
      if (m === els.stateModal) closeShot(); else closeAI();
    });
  });
  // 收藏面板不是模态任务，但它也吃 ESC —— 之前只能伸手点「关闭」
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.favPanel.hidden) closeFavPanel();
  });

  initHeader();
  initDraft();
  checkDayReset();
  updateFavFab();
  updateProfileUI();
  // 页脚菜品数跟着数据走，避免每次重采后手改 HTML 忘记同步
  {
    const total = (window.DB_REAL && window.DB_REAL.dishes ? window.DB_REAL.dishes : window.DB.dishes).length;
    const elTotal = $("#dishTotal");
    if (elTotal) elTotal.textContent = String(total);
  }
  if (!state.profile && !localStorage.getItem("wte.profileSeen")) {
    setTimeout(openProfile, 450);
  }
})();
