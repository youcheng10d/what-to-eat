/* 方案 B：罗盘提速版 —— 1.6s 转停、指针严格对准扇区中心、落点后高亮 + 结果卡 */
(function () {
  const LAB = window.LAB;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const CATS = ["面食", "盖浇饭", "家常小炒", "麻辣系列", "烧烤", "早餐小吃", "甜品饮品", "汤粥"];
  const wheel = document.getElementById("wheel");
  const labelsBox = document.getElementById("wheelLabels");
  const result = document.getElementById("result");
  let spins = 0;

  function build() {
    labelsBox.innerHTML = CATS.map(
      (c, i) => `<div class="wheel-label" style="--i:${i}" data-cat="${c}">${c}</div>`
    ).join("");
  }

  function reset() {
    labelsBox.querySelectorAll(".wheel-label").forEach((l) => l.classList.remove("is-hit"));
    wheel.classList.remove("is-hit");
    result.hidden = true;
    result.innerHTML = "";
  }

  async function run(text) {
    reset();
    const { r, dish } = LAB.draw(text);
    let idx = CATS.indexOf(dish.category);
    if (idx < 0) idx = r.seed % CATS.length;

    spins += 1;
    const deg = 360 * (3 + spins) - idx * 45;
    wheel.style.transform = `rotate(${deg}deg)`;
    if (navigator.vibrate) navigator.vibrate(10);

    await wait(reduce ? 80 : 1620);

    const hit = labelsBox.querySelector(`.wheel-label[data-cat="${CATS[idx]}"]`);
    if (hit) hit.classList.add("is-hit");
    wheel.classList.add("is-hit");
    if (navigator.vibrate) navigator.vibrate([8, 30, 12]);
    await wait(280);

    LAB.renderResult(r, dish);
    result.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  build();
  window.Wheel = { run, reset };
})();
