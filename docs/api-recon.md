# API 侦察笔记 · 学府e生活（LCSW SaaS）

> 侦察日期：2026-10-20 ｜ 方式：PC 微信 + Reqable 抓包 ｜ 状态：可行性已验证

## 结论

**抓包路线可行。** 四点验证：① 明文 JSON ✅ ② 需要 token（JWT）⚠️ ③ 无请求签名 ✅ ④ 可分页遍历 ✅

## 平台架构

- SaaS 服务商域名：`api-order.lcsw.cn`（订单/商家）、`api-waimai.lcsw.cn`（外卖）、`open-mkt.lcsw.cn`（营销）
- 图片 CDN：`img.lcsw.cn`、`img-lib.saobei.cn`（可直接引用，无需下载）
- **商圈隔离**：每所学校 = 一个 `area_code` / `districtid`。城科 = `area_code: 10169588`、`districtid: 457`。**切换学校 = 换 area_code**——共性平台复用的直接证据。

## 鉴权机制

三个关键请求头（从 Reqable 抓得）：

| 头 | 值（脱敏） | 来源 |
|---|---|---|
| `Authorization` | `eyJ0eXAiOiJKV1QiL...`（JWT） | 小程序启动时用微信登录 code 经 `/api/merchant/getOpenID?mini_code=xxx` 换取 |
| `OpenID` | `o5YjG5QLfV4l6ZtP...` | 同上 |
| `Appid` | `wx5b480af3c73f466f` | 小程序固定 appid |

- **无请求签名**：body 与 URL 中均无 sign/timestamp/nonce 参数。
- **token 有效期 = 3 小时**（实测 JWT payload：`{"exp":1792506304,"iat":1792495504,"openid":"...","iss":"lcsw"}`，exp-iat=10800s）。
- **长期方案**：每次采集前手动打开一次小程序（微信自动登录）→ 抓新 token → 3 小时内跑完脚本。因此 GitHub Actions 全自动不可行，采集脚本在本地跑。
- 防护：响应头有 `aliyungf_tc` / `acw_tc`（阿里云 WAF cookie），脚本须控制频率、带正常 UA。

## 核心端点

| 功能 | 方法 | 端点 | 关键参数 |
|---|---|---|---|
| 档口列表（**自带每档口 4 个推荐菜**） | POST | `/mini/shop/queryShopList` | body: `longitude/latitude/page_num/area_code/query_type=0` |
| 档口详情 | GET | `/api/shop/searchShopDetail` | `?merchant_no=xxx` |
| 推荐菜品 | GET | `/api/shop/searchRecommendFood` | `?merchant_no=xxx` |
| 完整菜单分组 | POST | `/api/merchant/getGoodsGroupList` | 待确认 |
| 完整菜单列表 | POST | `/api/merchant/getMchGoodsListV2` | body: `merchant_no/shop_code/groupId/page_num/page_size/eat_type=2` |

### getMchGoodsListV2 请求体模板（已实测）

```json
{
  "api_version": "103", "code_type": 2,
  "desk_code": "<shop_code>", "eat_type": 2,
  "groupId": 297079, "wave_time": null,
  "page_size": 10, "page_num": 1,
  "shop_code": "<shop_code>", "merchant_no": "<merchant_no>",
  "food_code": "", "openid": "<openid>", "mini_type": 1
}
```

- `groupId` 为菜品分组 id，需先调 `getGoodsGroupList` 拿分组列表逐组翻页（或试 groupId=0/-1 是否返回全部，待验证）
- `eat_type: 2` 推测为外卖；堂食菜单可能是 `eat_type: 1`（待验证）
| 店铺评价 | POST | `/api/homepage/getShopEval` | 待确认 |

### queryShopList 请求体模板

```json
{
  "longitude": 106.55072784423828,
  "latitude": 29.56471061706543,
  "page_num": 0,
  "area_code": "10169588",
  "query_type": 0,
  "activity_type_list": [],
  "close_flag": 0,
  "show_type": 0,
  "wave_time": "",
  "phone": "",
  "mini_type": 1
}
```

分页：`page_num` 从 0 递增，直到响应 `is_last_page: 1`。

### queryShopList 响应体字段（已实测）

档口级：`merchant_no`、`shop_name`（含食堂后缀如 `_北山苑`）、`shop_code`、`shop_grade`（评分）、`sale_num`（销量）、`business_begin_time/end_time`、`shop_address`、`distribution_business_time`、`bright_kitchen_status`、`tag_bean.special_tag`（如"店铺打5折"）、`districtid`

菜品级（`food_list[]`，每档口 4 条推荐菜）：`food_name`、`food_price`（**单位：分**）、`food_discount_price`、`food_img_url`、`food_code`、`group_id`

## 采集策略

1. **第一阶段（全量骨架）**：分页遍历 `queryShopList` → 拿到所有档口 + 每档口 4 个推荐菜
2. **第二阶段（菜单补全）**：对每个 `shop_code` 调 `getMchGoodsListV2` → 完整菜单
3. **更新策略**：每周手动开一次小程序拿新 token → 重跑脚本 → diff 更新

## 合规边界

- 只采集事实信息（菜名/价格/档口名/营业时间），不碰用户评论内容（`getShopEval` 仅可用其评分统计，不抓评论文本）
- 请求频率限制（建议 ≥1s/次），夜间低峰执行
- 数据用于比赛作品演示，明确标注来源
