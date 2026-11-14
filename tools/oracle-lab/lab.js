/* 实验页控制：A/B 切换、输入、动作绑定 */
(function () {
  const LAB = window.LAB;
  const ask = document.getElementById("ask");
  const go = document.getElementById("go");
  const hint = document.getElementById("hint");
  const stageQian = document.getElementById("stageQian");
  const stageWheel = document.getElementById("stageWheel");
  let variant = "qian";
  let busy = false;
  let lastText = "";

  function setVariant(v) {
    if (busy) return;
    variant = v;
    document.querySelectorAll(".tab").forEach((b) => {
      const on = b.dataset.variant === v;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
    stageQian.hidden = v !== "qian";
    stageWheel.hidden = v !== "wheel";
    go.textContent = v === "qian" ? "摇一签" : "转一下";
    hint.textContent =
      v === "qian"
        ? "摇筒 0.46s → 一签跳出 → 长成卡 → 翻面见菜，全程约 1.5 秒"
        : "转 1.6 秒，指针严格停在品类中心；同一句话今天只落这一道";
    window.Qian.reset();
    window.Wheel.reset();
  }

  async function run() {
    if (busy) return;
    const text = (ask.value || "").trim();
    if (!text) {
      ask.focus();
      LAB.toast("先写一句话，越离谱越准");
      return;
    }
    busy = true;
    go.disabled = true;
    const repeated = text === lastText;
    try {
      if (variant === "qian") await window.Qian.run(text);
      else await window.Wheel.run(text);
      if (repeated) LAB.toast("同一句话，今天就这一签");
      lastText = text;
    } finally {
      busy = false;
      go.disabled = false;
    }
  }

  document.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => setVariant(b.dataset.variant))
  );
  go.addEventListener("click", run);
  ask.addEventListener("keydown", (e) => {
    if (e.key === "Enter") run();
  });
  document.querySelectorAll(".chip[data-fill]").forEach((chip) =>
    chip.addEventListener("click", () => {
      ask.value = chip.dataset.fill;
      chip.classList.add("is-hit");
      setTimeout(() => chip.classList.remove("is-hit"), 240);
      run();
    })
  );
  LAB.bindResult();

  window.LAB_APP = { setVariant, run, get variant() { return variant; } };
  setVariant("qian");
})();
