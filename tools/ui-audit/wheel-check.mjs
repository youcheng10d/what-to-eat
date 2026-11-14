#!/usr/bin/env node
/* 转盘专项复测：node tools/ui-audit/wheel-check.mjs
   量三件事：点「转」到出结果的耗时、指针与品类中心的偏差、落点高亮是否出现。 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const WEB = path.join(ROOT, "what-to-eat");
const OUT = path.join(HERE, "report", "shots");
const PORT = 4177;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function loadPlaywright() {
  for (const dir of [HERE, ROOT, "D:/Github/video-showcase"]) {
    try {
      return createRequire(path.join(dir, "noop.js"))("playwright");
    } catch {}
  }
  throw new Error("找不到 playwright");
}

fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent((req.url || "/").split("?")[0]);
  const target = path.join(WEB, p === "/" ? "index.html" : p);
  if (!target.startsWith(WEB)) return res.writeHead(403).end();
  fs.readFile(target, (err, buf) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "zh-CN",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});

const base = `http://127.0.0.1:${PORT}`;
await page.goto(base + "/index.html", { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => !!(window.DB_REAL || window.DB) && document.getElementById("decide"), { timeout: 15000 });
await page.waitForTimeout(700);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

await page.click('.mode-tab[data-mode="oracle"]');
await page.waitForTimeout(400);
await page.fill("#oracleText", "高数要挂了，吃啥");

const t0 = Date.now();
await page.click("#oracleGo");
if (process.argv.includes("--shot")) {
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT, "wheel-spinning.png"), fullPage: false });
}
await page.waitForSelector("#oracleResult .oracle-card", { timeout: 12000 });
const elapsed = Date.now() - t0;

const probe = await page.evaluate(() => {
  const wheel = document.getElementById("wheel");
  const m = getComputedStyle(wheel).transform;
  let deg = 0;
  if (m && m.startsWith("matrix")) {
    const parts = m.replace(/^matrix\(|\)$/g, "").split(",").map(Number);
    deg = (Math.atan2(parts[1], parts[0]) * 180) / Math.PI;
  }
  const norm = ((deg % 360) + 360) % 360;
  const off = Math.min(norm % 45, 45 - (norm % 45));
  return {
    deg: Number(norm.toFixed(2)),
    offset: Number(off.toFixed(2)),
    landing: wheel.classList.contains("is-landing"),
    hitLabels: wheel.querySelectorAll(".wheel-label.is-hit").length,
  };
});

await page.screenshot({ path: path.join(OUT, "wheel-landing.png"), fullPage: false });
console.log(`出结果耗时：${elapsed}ms`);
console.log(`指针偏差：${probe.offset}°（应 ≤3°）`);
console.log(`落点高亮：is-landing=${probe.landing}，命中标签=${probe.hitLabels}`);
console.log(errors.length ? "错误：\n" + errors.join("\n") : "控制台无错误");

await browser.close();
server.close();
