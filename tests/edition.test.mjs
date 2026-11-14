// 版本隔离校验：普通版快照里不能夹带 AI 代码。
// 这条用例存在的理由很具体——比赛要求「AI 创新应用」的普通版必须真的是普通版，
// 如果 what-to-eat/standard/ 里混进了 ai.js 或 AI 接口，答辩时一句话就被问穿。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const STD = path.join(ROOT, "what-to-eat", "standard");

let failed = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : "  → " + detail));
  if (!ok) failed++;
};

check(fs.existsSync(STD), "普通版快照目录存在");

if (fs.existsSync(STD)) {
  const banned = ["ai.js", path.join("data", "ingredients.js")];
  banned.forEach((f) => {
    check(!fs.existsSync(path.join(STD, f)), `普通版不含 ${f}`);
  });

  const html = fs.readFileSync(path.join(STD, "index.html"), "utf8");
  check(!/ai\.js/.test(html), "普通版页面没有引用 ai.js");
  check(!/id="aiBtn"/.test(html), "普通版页面没有 AI 服务入口");
  check(!/mode-tab/.test(html), "普通版没有食堂罗盘入口");
  check(!/WTE_AI_CONFIG/.test(html), "普通版没有硬编码 Worker 地址");

  const js = ["app.js", "api.js"]
    .map((f) => fs.readFileSync(path.join(STD, f), "utf8"))
    .join("\n");
  check(!/getUserMedia/.test(js), "普通版没有摄像头调用");
  check(!/window\.AI\b/.test(js), "普通版没有调用 window.AI");

  // 数据只允许一份：普通版快照必须与主数据逐字节一致，避免两套菜品池漂移
  const a = fs.readFileSync(path.join(STD, "data", "data.js"));
  const b = fs.readFileSync(path.join(ROOT, "what-to-eat", "data", "data.js"));
  check(a.equals(b), "普通版数据与主数据逐字节一致");
}

if (failed) {
  console.error(`\n版本隔离校验失败 ${failed} 项`);
  process.exit(1);
}
console.log("\n版本隔离校验通过");
