#!/usr/bin/env node
/**
 * 吃嘛 · 交互与页面切换体检
 *
 * 用法（在仓库根目录或本目录运行）：
 *   node tools/ui-audit/audit.mjs            # 无头
 *   node tools/ui-audit/audit.mjs --headed   # 有头，肉眼看
 *   node tools/ui-audit/audit.mjs --base https://youcheng10d.github.io/what-to-eat   # 打线上
 *
 * 产出：tools/ui-audit/report/ui-audit-<时间戳>.md / .json / shots/*.png
 *
 * 说明：
 * - 默认起一个本地静态服务器托管 what-to-eat/，保证 localStorage 有正常 origin；
 * - 拦截一切外部请求，模拟断网，顺带验证「无 AI 服务时降级」是否成立；
 * - 只读检查，不改任何业务代码。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const WEB = path.join(ROOT, "what-to-eat");
const OUT = path.join(HERE, "report");
const SHOTS = path.join(OUT, "shots");

const argv = process.argv.slice(2);
const headed = argv.includes("--headed");
const baseArgIdx = argv.indexOf("--base");
const remoteBase = baseArgIdx > -1 ? argv[baseArgIdx + 1] : "";

function loadPlaywright() {
  const candidates = [HERE, ROOT, "D:/Github/video-showcase"];
  for (const dir of candidates) {
    try {
      const req = createRequire(path.join(dir, "resolve-playwright.js"));
      return req("playwright");
    } catch {
      /* 换下一个候选路径 */
    }
  }
  throw new Error(
    "没找到 playwright。任选其一：\n" +
      "  1) 在 tools/ui-audit 里 npm install\n" +
      "  2) 复用 D:/Github/video-showcase 里已装的 playwright"
  );
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const target = path.join(WEB, urlPath === "/" ? "index.html" : urlPath);
      if (!target.startsWith(WEB)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      fs.readFile(target, (err, buf) => {
        if (err) {
          res.writeHead(404).end("not found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        res.end(buf);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const results = [];
function add(id, title, status, detail) {
  results.push({ id, title, status, detail: String(detail || "") });
  console.log(`[${status}] ${title} :: ${detail}`);
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { chromium } = loadPlaywright();

  let localServer = null;
  let base = remoteBase;
  if (!base) {
    const started = await startServer();
    localServer = started.server;
    base = `http://127.0.0.1:${started.port}`;
  }

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const blockedRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    blockedRequests.push(url);
    return route.abort();
  });

  const ready = async () => {
    await page.waitForFunction(
      () => {
        const hasData = !!(window.DB_REAL || window.DB);
        const hasBtn = !!document.getElementById("decide");
        return hasData && hasBtn;
      },
      { timeout: 15000 }
    );
  };

  const stamp = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stampText = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(
    stamp.getHours()
  )}${pad(stamp.getMinutes())}`;

  try {
    await page.goto(`${base}/index.html`, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "load" });
    await ready();

    // ---------- 1. 首次进入：口味档案弹窗 ----------
    await page.waitForTimeout(800);
    const firstRun = await page.evaluate(() => {
      const m = document.getElementById("profileModal");
      if (!m) return { missing: true };
      return {
        hidden: m.hidden,
        isOpen: m.classList.contains("is-open"),
        sheet: !!m.querySelector(".modal-sheet"),
      };
    });
    add(
      "first-run.modal",
      "首次进入自动打开口味档案",
      firstRun.missing ? "FAIL" : firstRun.hidden ? "FAIL" : "PASS",
      firstRun.missing ? "HTML 里找不到 #profileModal" : `hidden=${firstRun.hidden} is-open=${firstRun.isOpen}`
    );

    // ---------- 2. 打开后焦点是否进入弹窗 ----------
    const focusOnOpen = await page.evaluate(() => {
      const a = document.activeElement;
      return {
        tag: a ? a.tagName : "NONE",
        id: a ? a.id : "",
        cls: a ? String(a.className) : "",
        inDialog: !!(a && a.closest && a.closest(".modal-sheet")),
      };
    });
    add(
      "a11y.focus-on-open",
      "弹窗打开后焦点进入对话框",
      focusOnOpen.inDialog ? "PASS" : "WARN",
      `activeElement=<${focusOnOpen.tag}> id="${focusOnOpen.id}" class="${focusOnOpen.cls}" inDialog=${focusOnOpen.inDialog}`
    );

    // ---------- 3. Tab 焦点是否被困在弹窗内 ----------
    let escapedAt = -1;
    for (let i = 1; i <= 14; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const a = document.activeElement;
        return !!(a && a.closest && a.closest("#profileModal .modal-sheet"));
      });
      if (!inside && escapedAt === -1) escapedAt = i;
    }
    add(
      "a11y.focus-trap",
      "Tab 键不会跑出弹窗",
      escapedAt === -1 ? "PASS" : "FAIL",
      escapedAt === -1 ? "连续 14 次 Tab 均停留在对话框内" : `第 ${escapedAt} 次 Tab 就跑到了弹窗外`
    );

    // ---------- 4. ESC 关闭 ----------
    await page.keyboard.press("Escape");
    await page.waitForTimeout(320);
    const closedByEsc = await page.evaluate(() => document.getElementById("profileModal").hidden);
    add("modal.esc", "ESC 关闭口味档案", closedByEsc ? "PASS" : "FAIL", `hidden=${closedByEsc}`);

    // ---------- 5. 重开 → 改一半 → 点蒙层：脏数据是否被直接丢弃 ----------
    await page.locator("#profileBtn").click();
    await page.waitForTimeout(300);
    await page.locator('#flavorChips .pick[data-value="辣"]').click();
    const dirtyBefore = await page.locator('#flavorChips .pick[data-value="辣"]').getAttribute("aria-pressed");
    await page.locator("#profileModal .modal-backdrop").click({ position: { x: 12, y: 12 }, force: true });
    await page.waitForTimeout(320);
    const afterBackdrop = await page.evaluate(() => ({
      hidden: document.getElementById("profileModal").hidden,
      summary: (document.getElementById("profileSummary") || {}).textContent || "",
      seen: localStorage.getItem("wte.profileSeen"),
    }));
    add(
      "modal.backdrop-close-form",
      "表单类弹窗点蒙层即关闭（有未保存选择）",
      afterBackdrop.hidden ? "WARN" : "PASS",
      `点蒙层前「辣」=${dirtyBefore}；关闭=${afterBackdrop.hidden}，档案摘要="${afterBackdrop.summary}"，profileSeen=${afterBackdrop.seen}。表单未保存就关闭，属误触丢数据风险`
    );
    // 新策略是「蒙层不关表单弹窗」，这一步要显式关掉，否则下面的点击会被弹窗挡住
    if (!afterBackdrop.hidden) {
      await page.locator("#profileModal .modal-x").click({ force: true });
      await page.waitForTimeout(340);
    }

    // ---------- 6. 关闭后焦点是否回到触发按钮 ----------
    await page.locator("#profileBtn").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(320);
    const focusAfterClose = await page.evaluate(() => {
      const a = document.activeElement;
      return { id: a ? a.id : "", tag: a ? a.tagName : "" };
    });
    add(
      "a11y.focus-restore",
      "关闭后焦点回到触发按钮",
      focusAfterClose.id === "profileBtn" ? "PASS" : "WARN",
      `activeElement=<${focusAfterClose.tag}> id="${focusAfterClose.id}"，期望 "profileBtn"`
    );

    // ---------- 7. 页面切换：正经推荐 ↔ 食堂罗盘 是否有过渡 ----------
    const modeSwitch = await page.evaluate(async () => {
      const normal = document.getElementById("normalView");
      const oracle = document.getElementById("oracleView");
      window.scrollTo(0, 620);
      const beforeScroll = window.scrollY;
      const tab = document.querySelector('.mode-tab[data-mode="oracle"]');
      tab.click();
      const t0 = {
        oracleHidden: oracle.hidden,
        normalHidden: normal.hidden,
        opacity: getComputedStyle(oracle).opacity,
        transform: getComputedStyle(oracle).transform,
        transitionDuration: getComputedStyle(oracle).transitionDuration,
        animationName: getComputedStyle(oracle).animationName,
        scrollY: window.scrollY,
      };
      await new Promise((r) => setTimeout(r, 120));
      const t120 = { opacity: getComputedStyle(oracle).opacity, scrollY: window.scrollY };
      return { beforeScroll, t0, t120 };
    });
    const noTransition =
      modeSwitch.t0.transitionDuration === "0s" &&
      (modeSwitch.t0.animationName === "none" || !modeSwitch.t0.animationName) &&
      modeSwitch.t0.opacity === modeSwitch.t120.opacity;
    add(
      "motion.mode-switch",
      "两个引擎之间切换有过渡动画",
      noTransition ? "WARN" : "PASS",
      noTransition
        ? `瞬时切换：transition=${modeSwitch.t0.transitionDuration}、animation=${modeSwitch.t0.animationName}、120ms 后 opacity 仍=${modeSwitch.t120.opacity}；滚动位置 ${modeSwitch.beforeScroll}→${modeSwitch.t0.scrollY}`
        : `检测到过渡：duration=${modeSwitch.t0.transitionDuration}, animation=${modeSwitch.t0.animationName}`
    );

    // ---------- 8. 主流程：点「替我决定」 ----------
    await page.locator('.mode-tab[data-mode="normal"]').click();
    await page.waitForTimeout(200);
    const decideStart = Date.now();
    await page.locator("#decide").click();
    let decideOk = true;
    try {
      await page.waitForSelector(".dish-card", { timeout: 12000 });
    } catch {
      decideOk = false;
    }
    const decideMs = Date.now() - decideStart;
    add(
      "flow.decide",
      "「替我决定」能出卡片",
      decideOk ? "PASS" : "FAIL",
      decideOk ? `首卡出现耗时 ${decideMs}ms` : "12 秒内没有出现 .dish-card"
    );
    await page.screenshot({ path: path.join(SHOTS, "01-result.png") });

    // ---------- 9. 连点两次「换一个」，是否出现双份卡片 ----------
    if (decideOk) {
      await page.locator('[data-action="reroll"]').click();
      await page.locator('[data-action="reroll"]').click().catch(() => {});
      await page.waitForTimeout(1500);
      const cardCount = await page.locator(".dish-card").count();
      const loadingLeft = await page.locator(".dish-card.is-loading").count();
      add(
        "flow.reroll-double",
        "连点「换一个」不会叠出多组结果",
        cardCount <= 3 && loadingLeft === 0 ? "PASS" : "FAIL",
        `卡片数=${cardCount}（单卡模式应为 1），残留骨架=${loadingLeft}`
      );
    }

    // ---------- 10. 收藏：点击 → 计数 → 面板 → ESC ----------
    if (decideOk) {
      await page.locator('[data-action="fav-toggle"]').first().click();
      await page.waitForTimeout(200);
      const favState = await page.evaluate(() => ({
        count: (document.getElementById("favCount") || {}).textContent || "",
        hidden: (document.getElementById("favCount") || {}).hidden,
        toast: (document.getElementById("toast") || {}).textContent || "",
      }));
      add(
        "flow.favorite",
        "收藏后有计数与轻提示",
        favState.count === "1" && favState.toast ? "PASS" : "WARN",
        `计数="${favState.count}" 隐藏=${favState.hidden} toast="${favState.toast}"`
      );

      await page.locator("#favFab").click();
      await page.waitForTimeout(250);
      const panelOpen = await page.evaluate(() => !document.getElementById("favPanel").hidden);
      add("flow.fav-panel-open", "收藏面板可展开", panelOpen ? "PASS" : "FAIL", `hidden=${!panelOpen}`);

      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const panelAfterEsc = await page.evaluate(() => document.getElementById("favPanel").hidden);
      if (!panelAfterEsc) {
        await page.locator("#favClose").click();
        await page.waitForTimeout(150);
      }
      add(
        "modal.fav-panel-esc",
        "ESC 可关闭收藏面板",
        panelAfterEsc ? "PASS" : "WARN",
        panelAfterEsc ? "ESC 已关闭" : "面板不受 ESC 控制，只能点「关闭」"
      );

      // ---------- 11. 删除收藏是否有确认或撤销 ----------
      await page.locator("#favFab").click();
      await page.waitForTimeout(250);
      const delBtn = page.locator('.fav-del').first();
      if (await delBtn.count()) {
        await delBtn.click();
        await page.waitForTimeout(300);
        const delState = await page.evaluate(() => ({
          toast: (document.getElementById("toast") || {}).textContent || "",
          items: document.querySelectorAll(".fav-item").length,
        }));
        add(
          "flow.favorite-delete",
          "取消收藏有确认或撤销入口",
          /撤销|确定|确认/.test(delState.toast) ? "PASS" : "WARN",
          `剩余条目=${delState.items}，toast="${delState.toast}"；一步删除、无撤销，属破坏性操作裸奔`
        );
        await page.locator("#favClose").click();
        await page.waitForTimeout(150);
      }
    }

    // ---------- 12. AI 设置弹窗：ESC / 蒙层 / 输入丢失 ----------
    await page.evaluate(() => document.getElementById("aiBtn").click());
    await page.waitForTimeout(300);
    const aiOpen = await page.evaluate(() => !document.getElementById("aiModal").hidden);
    await page.locator("#aiWorker").fill("https://example.invalid");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const aiClosed = await page.evaluate(() => document.getElementById("aiModal").hidden);
    add(
      "modal.ai-esc",
      "AI 设置弹窗 ESC 可关",
      aiOpen && aiClosed ? "PASS" : "FAIL",
      `打开=${aiOpen} 关闭=${aiClosed}`
    );

    // ---------- 13. 可点区域尺寸（移动端 >= 44px 为宜） ----------
    const tap = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll("button, .chip, .pick, .seg-btn, label.shot-act")];
      const small = [];
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || r.width === 0) continue;
        if (r.height < 40 || r.width < 40) {
          small.push({
            text: (el.textContent || el.getAttribute("aria-label") || el.id || el.className).trim().slice(0, 16),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
      return { total: nodes.length, small: small.slice(0, 10), smallCount: small.length };
    });
    add(
      "a11y.tap-targets",
      "可点区域不小于 40×40",
      tap.smallCount === 0 ? "PASS" : "WARN",
      `${tap.smallCount}/${tap.total} 个偏小：` + tap.small.map((s) => `${s.text}(${s.w}×${s.h})`).join("、")
    );

    // ---------- 14. 截图：罗盘 ----------
    await page.locator('.mode-tab[data-mode="oracle"]').click();
    await page.waitForTimeout(500);
    await page.locator("#oracleText").fill("高数要挂了");
    await page.locator("#oracleGo").click();
    // 轮盘先起转再落位，总时长随 AI 响应变化（最坏约 4.7s），等卡片而不是等固定时长
    await page.waitForSelector("#oracleResult .oracle-card", { timeout: 9000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, "02-oracle.png") });
    const oracleHas = await page.evaluate(() => !!document.querySelector("#oracleResult .oracle-card, #oracleResult .dish-card, #oracleResult *"));
    add("flow.oracle", "食堂罗盘能出结果", oracleHas ? "PASS" : "FAIL", `oracleResult 有内容=${oracleHas}`);

    // ---------- 15. 健康度 ----------
    add("health.console", "控制台错误", consoleErrors.length === 0 ? "PASS" : "WARN", consoleErrors.slice(0, 5).join(" | ") || "无");
    add("health.pageerror", "未捕获异常", pageErrors.length === 0 ? "PASS" : "FAIL", pageErrors.slice(0, 5).join(" | ") || "无");
    add(
      "health.external",
      "外部请求拦截（断网模拟）",
      "INFO",
      blockedRequests.length ? `${blockedRequests.length} 条：${[...new Set(blockedRequests)].slice(0, 5).join(", ")}` : "无外部请求"
    );

    // ---------- 写报告 ----------
    const counts = results.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
    const lines = [];
    lines.push(`# 吃嘛 · 交互与页面切换体检报告`);
    lines.push("");
    lines.push(`- 时间：${stamp.toLocaleString("zh-CN")}`);
    lines.push(`- 目标：${base}`);
    lines.push(`- 视口：390×844 @2x（移动端）`);
    lines.push(`- 结果：PASS ${counts.PASS || 0} · WARN ${counts.WARN || 0} · FAIL ${counts.FAIL || 0}`);
    lines.push("");
    lines.push("| 状态 | 检查项 | 证据 |");
    lines.push("| --- | --- | --- |");
    for (const r of results) {
      lines.push(`| ${r.status} | ${r.title} | ${r.detail.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
    lines.push("## 截图");
    lines.push("");
    lines.push("- `shots/01-result.png` 推荐结果");
    lines.push("- `shots/02-oracle.png` 食堂罗盘");
    lines.push("");
    const mdPath = path.join(OUT, `ui-audit-${stampText}.md`);
    fs.writeFileSync(mdPath, lines.join("\n"), "utf8");
    fs.writeFileSync(
      path.join(OUT, `ui-audit-${stampText}.json`),
      JSON.stringify({ base, viewport: "390x844@2x", at: stamp.toISOString(), results, consoleErrors, pageErrors, blockedRequests }, null, 2),
      "utf8"
    );
    console.log(`\n报告：${mdPath}`);
  } finally {
    await browser.close();
    if (localServer) localServer.close();
  }
}

main().catch((e) => {
  console.error("体检脚本自身报错：", e);
  process.exit(1);
});
