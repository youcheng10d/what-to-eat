// 把 what-to-eat 目录打包成一个可离线双击打开的 HTML。
// 用途：国内没有备案域名，pages.dev 需要梯子才能访问，这个单文件可以
// 直接通过微信/网盘发给评委或同学，双击即用（AI 相关功能自动降级）。
// 用法：node tools/build-single.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "what-to-eat");
const OUT = path.join(ROOT, "dist", "chima-offline.html");

let html = fs.readFileSync(path.join(SRC, "index.html"), "utf8");

// 1) 内联样式
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"?]+)(?:\?[^"]*)?"[^>]*>/g, (_m, href) => {
  const css = fs.readFileSync(path.join(SRC, href), "utf8");
  return `<style>\n${css}\n</style>`;
});

// 2) 内联脚本（保持文档顺序；原本靠 defer 保证 DOM 就绪，这里脚本都在 body 末尾，顺序执行等价）
const inlined = [];
html = html.replace(/<script[^>]*src="([^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g, (_m, src) => {
  const file = path.join(SRC, src);
  const js = fs.readFileSync(file, "utf8");
  // JS 里若出现 </script> 会提前闭合标签，这里做转义（字符串内等价）
  const safe = js.replace(/<\/script>/gi, "<\\/script>");
  inlined.push(`${src} (${(js.length / 1024).toFixed(0)} KB)`);
  return `<script>\n${safe}\n</script>`;
});

// 3) 离线版不连 AI：请求不到 workers.dev，留着只会让按钮卡 20 秒超时
html = html.replace(/window\.WTE_AI_CONFIG\s*=\s*\{[^}]*\}/, 'window.WTE_AI_CONFIG = { worker: "" }');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");

const size = fs.statSync(OUT).size / 1024 / 1024;
console.log(`已生成 ${OUT}`);
console.log(`体积 ${size.toFixed(2)} MB`);
console.log(`内联资源：\n  ${inlined.join("\n  ")}`);
if (/src="[^"]+\.js/.test(html)) console.log("警告：仍有外部 script 引用未内联");
if (/href="[^"]+\.css/.test(html)) console.log("警告：仍有外部样式引用未内联");
