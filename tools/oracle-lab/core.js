/* 共用：抽签语义 + 结果卡渲染。签文与 seed 全部复用线上 ai.js，不另造一套。 */
(function () {
  const LAB = (window.LAB = window.LAB || {});

  LAB.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  };

  LAB.ready = function () {
    return !!(window.DB_REAL || window.DB) && window.AI && typeof window.AI.localOracle === "function";
  };

  LAB.kcal = function (dish) {
    try {
      const v = window.AI && window.AI.calOf ? window.AI.calOf(dish) : dish.cal;
      return Math.round(v || 0);
    } catch (e) {
      return Math.round(dish.cal || 0);
    }
  };

  // 与 app.js 的 oraclePool 同规则：先按约束收窄，收不动就退回全池；seed 取模定菜。
  function pickDish(constraints, seed) {
    const all = ((window.DB_REAL && window.DB_REAL.dishes) || (window.DB && window.DB.dishes) || []).filter(
      (d) => d && d.name
    );
    if (!all.length) return null;
    let pool = all;
    const c = constraints || {};
    const narrow = (fn) => {
      const next = pool.filter(fn);
      if (next.length) pool = next;
    };
    if (c.avoid && c.avoid.length) narrow((d) => !c.avoid.some((k) => d.name.includes(k)));
    if (c.category) narrow((d) => d.category === c.category);
    if (c.tags && c.tags.length) narrow((d) => (d.tags || []).some((t) => c.tags.includes(t)));
    if (!pool.length) pool = all;
    return pool[seed % pool.length];
  }

  LAB.draw = function (text) {
    const r = window.AI.localOracle(text);
    return { r, dish: pickDish(r.constraints, r.seed) };
  };

  LAB.traceBits = function (r) {
    const c = r.constraints || {};
    const bits = [];
    if (c.category) bits.push(c.category);
    (c.flavors || []).forEach((f) => bits.push(f));
    (c.tags || []).forEach((t) => bits.push(t));
    (c.avoid || []).forEach((a) => bits.push("避开" + a));
    return bits;
  };

  LAB.renderResult = function (r, dish) {
    const box = document.getElementById("result");
    if (!box || !dish) return;
    const bits = LAB.traceBits(r);
    const price = dish.price == null ? "?" : dish.price;
    const weight = dish.pricing === "weight" ? "（称重估）" : "";
    box.innerHTML = `
      <div class="result-card">
        <p class="sign-quote">「${LAB.esc(r.sign)}」</p>
        ${r.why ? `<p class="why">${LAB.esc(r.why)}</p>` : ""}
        <div class="dish-row">
          <div>
            <span class="kicker">落到这道</span>
            <h3>${LAB.esc(dish.name)}</h3>
            <p class="meta">¥${LAB.esc(price)}${weight} · ${LAB.kcal(dish)} kcal · ${LAB.esc(dish.stall || dish.category || "")}</p>
          </div>
          <button type="button" class="fav" data-act="fav" aria-label="收藏">♡</button>
        </div>
        <p class="trace">条件：${LAB.esc(bits.length ? bits.join(" / ") : "不加限制")}<br />seed ${r.seed} · 本地签文 · 今天同一句话结果固定</p>
        <div class="result-actions">
          <button type="button" class="ghost" data-act="again">换个说法</button>
          <button type="button" class="primary" data-act="pick">就吃这个</button>
        </div>
      </div>`;
    box.hidden = false;
  };

  LAB.toast = function (msg) {
    let el = document.getElementById("lab-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "lab-toast";
      el.setAttribute("role", "status");
      el.style.cssText =
        "position:fixed;left:50%;bottom:86px;transform:translate(-50%,10px);background:rgba(43,26,16,.92);color:#fff;" +
        "font:13px/1.5 var(--font-body);padding:9px 15px;border-radius:999px;opacity:0;transition:.2s;z-index:99;pointer-events:none;max-width:82vw;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    el.style.transform = "translate(-50%,0)";
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translate(-50%,10px)";
    }, 2200);
  };

  // 结果卡上的通用动作，两个方案共用
  LAB.bindResult = function (onAgain) {
    const box = document.getElementById("result");
    if (!box || box._bound) return;
    box._bound = true;
    box.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      if (btn.dataset.act === "again") {
        const input = document.getElementById("ask");
        input.value = "";
        box.hidden = true;
        input.focus();
      } else if (btn.dataset.act === "pick") {
        btn.textContent = "记下了 ✓";
        btn.disabled = true;
        LAB.toast("原型不写数据；线上这一步会记进「今天吃过」");
      } else if (btn.dataset.act === "fav") {
        btn.classList.toggle("is-on");
        btn.textContent = btn.classList.contains("is-on") ? "♥" : "♡";
        LAB.toast(btn.classList.contains("is-on") ? "已收藏（原型内假动作）" : "已取消收藏");
      }
      if (btn.dataset.act === "again" && typeof onAgain === "function") onAgain();
    });
  };
})();
