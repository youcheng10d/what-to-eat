# 参与贡献

感谢你愿意为“吃嘛”出一份力。

## 本地运行

纯前端项目，无需安装依赖：

```bash
cd what-to-eat
python -m http.server 8765
# 浏览器打开 http://localhost:8765
```

## 提交前请自检

```bash
node --check what-to-eat/api.js
node --check what-to-eat/app.js
node tools/validate-data.mjs
node tests/recommend.test.mjs
```

修改了 js / css / 数据文件时，记得同步 bump `index.html` 里的 `?v=` 缓存参数。

## 菜品数据怎么更新

数据来自两条链路，改完都要重跑校验：

- 学府 e 生活 API：`tools/` 下的采集与清洗脚本
- 线下实拍：`线下菜品采集/` 流程，详见仓库内说明

## 提 Issue

- Bug：请带上你的输入原话、期望推荐、实际推荐
- 菜品纠错：请写清档口名、菜名和正确信息（价格/辣度/荤素）
- 新想法：直接描述场景即可，不必写成正式需求文档
