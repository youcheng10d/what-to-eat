#!/usr/bin/env node
/* 自检 + 出图：node tools/oracle-lab/preview.mjs → tools/oracle-lab/shots/*.png */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SHOTS = path.join(HERE, "shots");
const PORT = 4175;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function loadPlaywright() {
  for (const dir of [HERE, ROOT, "D:/Github/video-showcase"]) {
    try {
      return createRequire(path.join(dir, "noop.js"))("playwright");
    } catch {}
  }
  throw new Error("找不到 playwright");
}

fs.mkdirSync(SHOTS, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent((req.url || "/").split("?")[0]);
  const target = path.join(ROOT, p);
  if (!target.startsWith(ROOT)) return res.writeHead(403).end();
  fs.readFile(target, (err, buf) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "zh-CN" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto(`${BASE}/tools/oracle-lab/`, { waitUntil: "load" });
await page.waitForFunction(() => !!(window.DB_REAL || window.DB) && window.LAB_APP, { timeout: 15000 });
await page.screenshot({ path: path.join(SHOTS, "a-idle.png"), fullPage: true });

const t0 = Date.now();
await page.fill("#ask", "高数要挂了，吃啥");
await page.click("#go");
await page.waitForSelector("#result .result-card", { timeout: 8000 });
const qianMs = Date.now() - t0;
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(SHOTS, "a-result.png"), fullPage: true });

await page.click('.tab[data-variant="wheel"]');
await page.waitForTimeout(300);
await page.fill("#ask", "月底只剩十块钱");
const t1 = Date.now();
await page.click("#go");
await page.waitForSelector("#result .result-card", { timeout: 8000 });
const wheelMs = Date.now() - t1;
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(SHOTS, "b-result.png"), fullPage: true });

console.log(`A 签筒：出结果 ${qianMs}ms`);
console.log(`B 罗盘：出结果 ${wheelMs}ms`);
console.log(errors.length ? "错误：\n" + errors.join("\n") : "控制台无错误");
await browser.close();
server.close();
