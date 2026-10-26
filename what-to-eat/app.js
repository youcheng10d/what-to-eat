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
  };
  const state = {
    loading: false,
    profile: loadJSON("wte.profile", null),
    feedback: loadJSON("wte.feedback", { stalls: {}, flavors: {}, categories: {}, clickedStalls: [] }),
    recentStalls: loadJSON("wte.recentStalls", []),
    favorites: loadJSON("wte.favorites", []),
    eatenToday: loadJSON("wte.eatenToday", { date: "", ids: [] }),
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
      state.favorites.splice(idx, 1);
    } else {
      state.favorites.push({
        id: dish.id,
        name: dish.name,
        stall: dish.stall || "",
        canteen: dish.canteen || "",
        price: dish.price,
        category: dish.category || "",
        time: Date.now(),
      });
    }
    saveJSON("wte.favorites", state.favorites);
    updateFavFab();
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
          <button class="ghost-btn compact" data-action="fav-rec" data-id="${f.id}">推荐这个</button>
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
  function openProfile() {
    fillProfileForm();
    els.modal.hidden = false;
    requestAnimationFrame(() => els.modal.classList.add("is-open"));
    document.body.classList.add("modal-open");
  }
  function closeProfile() {
    els.modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    setTimeout(() => { els.modal.hidden = true; }, 180);
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
    if (e.target.closest("[data-close]")) { localStorage.setItem("wte.profileSeen", "1"); closeProfile(); }
    const pick = e.target.closest("#flavorChips .pick");
    if (pick) pick.setAttribute("aria-pressed", String(pick.getAttribute("aria-pressed") !== "true"));
    const seg = e.target.closest(".seg-btn");
    if (seg) setPick(`#${seg.closest(".seg").id}`, seg.dataset.value);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.modal.hidden) { localStorage.setItem("wte.profileSeen", "1"); closeProfile(); }
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

  function cardHTML(card, idx, total) {
    const { dish: d, matched, reason, relaxed, relaxedNote } = card;
    const tastes = Array.isArray(d.taste) ? d.taste : [];
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
          <div class="stat">${icon("wallet")}<b class="price">¥${d.price}</b><small>元</small></div>
          <div class="stat">${icon("flame")}<b>${d.cal}</b><small>kcal</small></div>
        </div>
        ${d.stall ? `<div class="dish-stall">${icon("pin", 14)}<span>${d.stall}${d.canteen ? ` · ${d.canteen}` : ""}</span></div>` : ""}
        ${relaxed ? `<p class="relaxed-note">${relaxedNote}</p>` : ""}
        <div class="reason">
          <span class="reason-label">${icon("sparkles", 15)}推荐理由</span>
          <p>${reason}</p>
        </div>
        ${matched.length ? `<div class="match">${matched.map((m) => `<span class="mchip">${icon("check", 13)}${m}</span>`).join("")}</div>` : ""}
        <div class="dish-actions">
          <button class="ghost-btn pick-btn" data-action="pick" data-idx="${idx}">${icon("check", 16)}就这个</button>
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
      ${multi ? `<p class="swipe-hint">← 左右滑动，看看另外两张 →</p>` : ""}
      <div class="group-actions">
        <button class="ghost-btn" data-action="reroll">${icon("refresh-cw", 16)}${multi ? "整组换一个" : "换一个"}</button>
      </div>`;
    focusResult();
    state.lastCards = cards;
    cards.forEach((c) => {
      if (c.dish && c.dish.stall) state.recentStalls.push(c.dish.stall);
    });
    state.recentStalls = state.recentStalls.slice(-10);
    saveJSON("wte.recentStalls", state.recentStalls);
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
    const btn = els.result.querySelector(`[data-action="pick"][data-idx="${idx}"]`);
    if (btn) { btn.classList.add("is-picked"); btn.disabled = true; btn.innerHTML = `${icon("check", 16)}已记下`; }
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
    renderLoading(mode);
    try {
      const res = await window.API.recommend({
        text: els.pref.value.trim(),
        profile: state.profile,
        feedback: state.feedback,
        excludeIds,
        recentStalls: state.recentStalls,
        mode,
        novelty,
      });
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
    renderLoading(1);
    const args = {
      text: els.pref.value.trim(),
      profile: state.profile,
      feedback: state.feedback,
      excludeIds: [],
      recentStalls: state.recentStalls,
      mode: 1,
    };
    try {
      const [a, b] = await Promise.all([
        window.API.recommend({ ...args, override: { main: "veg" } }),
        window.API.recommend({ ...args, override: { main: "meat" } }),
      ]);
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
    const pick = e.target.closest('[data-action="pick"]');
    if (pick) { recordPick(Number(pick.dataset.idx)); return; }
    const favToggle = e.target.closest('[data-action="fav-toggle"]');
    if (favToggle) {
      const idx = Number(favToggle.dataset.idx);
      const card = state.lastCards[idx];
      if (card && card.dish) {
        toggleFavorite(card.dish);
        // 同步更新这张卡的按钮
        const btn = els.result.querySelector(`[data-action="fav-toggle"][data-idx="${idx}"]`);
        if (btn) {
          const faved = isFavorite(card.dish.id);
          btn.classList.toggle("is-faved", faved);
          btn.innerHTML = icon(faved ? "heartFilled" : "heart", 16);
          btn.setAttribute("aria-label", faved ? "取消收藏" : "收藏");
        }
      }
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
      state.favorites = state.favorites.filter((f) => f.id !== id);
      saveJSON("wte.favorites", state.favorites);
      updateFavFab();
      renderFavoritesPanel();
      // 如果当前卡片正在显示这道菜的❤️按钮，也更新状态
      els.result.querySelectorAll('[data-action="fav-toggle"]').forEach((btn) => {
        const cardIdx = Number(btn.dataset.idx);
        const c = state.lastCards[cardIdx];
        if (c && c.dish && c.dish.id === id) {
          btn.classList.remove("is-faved");
          btn.innerHTML = icon("heart", 16);
          btn.setAttribute("aria-label", "收藏");
        }
      });
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

  initHeader();
  initDraft();
  checkDayReset();
  updateFavFab();
  updateProfileUI();
  if (!state.profile && !localStorage.getItem("wte.profileSeen")) {
    setTimeout(openProfile, 450);
  }
})();
