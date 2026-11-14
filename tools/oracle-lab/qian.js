/* 方案 A：签筒翻签 —— 摇筒 0.46s → 一签跳出 0.26s → 签条长成卡 0.3s → 翻面 0.48s → 结果 0.3s，约 1.5s */
(function () {
  const LAB = window.LAB;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = (ms) => (reduce ? Math.min(ms, 60) : ms);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const tube = document.getElementById("tube");
  const sticksBox = document.getElementById("sticks");
  const draw = document.getElementById("draw");
  const drawInner = document.getElementById("drawInner");
  const result = document.getElementById("result");
  const STICK_COUNT = 9;

  function buildSticks() {
    sticksBox.innerHTML = "";
    for (let i = 0; i < STICK_COUNT; i++) {
      const s = document.createElement("div");
      s.className = "stick";
      const off = (i - (STICK_COUNT - 1) / 2) * 9;
      const rot = (i - (STICK_COUNT - 1) / 2) * 2.6;
      s.style.left = `calc(50% + ${off}px)`;
      s.style.transform = `translateX(-50%) rotate(${rot}deg)`;
      sticksBox.appendChild(s);
    }
  }

  function reset() {
    draw.hidden = true;
    draw.classList.remove("is-in", "is-card", "is-flipped");
    draw.style.width = "36px";
    draw.style.height = "210px";
    draw.style.borderRadius = "8px";
    sticksBox.querySelectorAll(".stick").forEach((s) => s.classList.remove("is-drawn"));
    result.hidden = true;
    result.innerHTML = "";
    tube.classList.remove("is-shaking");
    drawInner.setAttribute("aria-hidden", "true");
  }

  async function run(text) {
    reset();
    const { r, dish } = LAB.draw(text);
    const sticks = [...sticksBox.querySelectorAll(".stick")];
    const pick = sticks[r.seed % sticks.length];

    // 1. 摇筒
    tube.classList.add("is-shaking");
    if (navigator.vibrate) navigator.vibrate([12, 40, 18]);
    await wait(T(460));
    tube.classList.remove("is-shaking");

    // 2. 一签跳出
    pick.classList.add("is-drawn");
    await wait(T(260));

    // 3. 签条长成卡
    document.getElementById("signText").textContent = r.sign;
    document.getElementById("signTopic").textContent = r.topic || "随缘";
    document.getElementById("backName").textContent = dish.name;
    document.getElementById("backMeta").textContent =
      `¥${dish.price}${dish.pricing === "weight" ? "（称重估）" : ""} · ${LAB.kcal(dish)} kcal · ${
        dish.stall || dish.category || ""
      }`;

    draw.hidden = false;
    draw.style.width = "36px";
    draw.style.height = "210px";
    draw.style.borderRadius = "8px";
    void draw.offsetWidth;
    draw.classList.add("is-in");
    await wait(T(140));
    draw.style.width = "252px";
    draw.style.height = "332px";
    draw.style.borderRadius = "16px";
    await wait(T(330));

    // 4. 翻面见菜
    draw.classList.add("is-flipped");
    await wait(T(520));

    // 5. 结果与解释
    LAB.renderResult(r, dish);
    result.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  buildSticks();
  window.Qian = { run, reset };
})();
