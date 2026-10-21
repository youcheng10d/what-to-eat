# ============================================================
# build-data.ps1 — 将采集的原始 LCSW API 数据清洗为前端可用结构
# 输入：data/raw/cqcst-shops.json + cqcst-menus.json
# 输出：what-to-eat/data.js（与 mock.js 同构，前端优先加载）
# ============================================================

param(
  [string]$SchoolShops = "..\what-to-eat\data\raw\cqcst-shops.json",
  [string]$SchoolMenus = "..\what-to-eat\data\raw\cqcst-menus.json",
  [string]$OutPath     = "..\what-to-eat\data\data.js",
  [string]$School      = "重庆城市科技学院"
)

$ErrorActionPreference = "Stop"
$shops = Get-Content (Join-Path $PSScriptRoot $SchoolShops) -Raw -Encoding UTF8 | ConvertFrom-Json
$menus = Get-Content (Join-Path $PSScriptRoot $SchoolMenus) -Raw -Encoding UTF8 | ConvertFrom-Json

# ---------- 1) 筛选可食用分组（排除便利店非食品等） ----------
$NON_FOOD = @("饮用水","苏打水","茶饮","碳酸饮料","康师傅饮料","统一饮料","功能饮料","啤酒","家居日用","口香糖","香烟")
$drinkKeywords = @("水","茶","可乐","雪碧","康师傅","统一","脉动","红牛","啤酒","口香糖","雪糕")
$junkEmojis = "🔥|⭐|✨|👍|🎉|👏"

# ---------- 2) 类别映射：菜名关键词优先，分组名兜底 ----------
$catMap = @{
  "炒菜"="家常小炒"; "炒饭"="盖浇饭"; "拌饭"="盖浇饭"; "盖饭"="盖浇饭"
  "拌面"="面食"; "拌粉"="面食"; "米线"="面食"; "面食"="面食"; "面条"="面食"
  "小炒"="家常小炒"; "小吃"="早餐小吃"; "快餐"="盖浇饭"
  "沙拉"="轻食沙拉"; "甜品"="甜品饮品"; "饮品"="甜品饮品"; "奶茶"="甜品饮品"
  "面包"="早餐小吃"; "粥"="汤粥"; "汤"="汤粥"
  "烧烤"="烧烤"; "铁板"="烧烤"; "麻辣烫"="麻辣系列"; "麻辣"="麻辣系列"; "香锅"="麻辣系列"; "冒菜"="麻辣系列"
  "早餐"="早餐小吃"; "煎饺"="早餐小吃"; "手抓饼"="早餐小吃"; "煎饼"="早餐小吃"; "包子"="早餐小吃"
  "方便速食"="方便速食"; "休闲零食"="休闲零食"
  "水果"="水果"; "牛奶"="甜品饮品"; "酸奶"="甜品饮品"; "新品"="其他"; "推荐"="其他"; "热销"="其他"; "折扣"="其他"
}
function mapCategory($group, $name) {
  # 菜名优先（更准）
  if ($name -match "盖饭|拌饭|炒饭|煲仔|木桶饭|铁板饭|焗饭|抓饭") { return "盖浇饭" }
  if ($name -match "米线|面条|拉面|小面|拌面|汤面|炒面|粉$|米粉|河粉|酸辣粉|馄饨|抄手|水饺|云吞|饵丝") { return "面食" }
  if ($name -match "麻辣烫|冒菜|香锅|串串香") { return "麻辣系列" }
  if ($name -match "沙拉|轻食") { return "轻食沙拉" }
  if ($name -match "粥$|羹$|汤$|汤面|炖汤") { return "汤粥" }
  if ($name -match "包子|馒头|花卷|饼$|煎饺|烧麦|茶叶蛋|鸡蛋饼|手抓饼|烤肠|肉肠|玉米$|饭团|三明治") { return "早餐小吃" }
  if ($name -match "奶茶|牛奶|酸奶|豆浆|豆花|糖水|甜品|蛋糕|面包|咖啡|果汁|冰粉|凉虾|西米露") { return "甜品饮品" }
  if ($name -match "烤串|烧烤|炸串|炸鸡|铁板|烤鸡|烤腿|鸡排|鸡柳") { return "烧烤" }
  if ($name -match "炒|烧|炖|焖|蒸|煮|煲|干锅|小炒") { return "家常小炒" }
  # 分组名兜底
  foreach ($key in $catMap.Keys) { if ($group -like "*$key*") { return $catMap[$key] } }
  return "其他"
}

# ---------- 3) 辣味推断 ----------
function inferSpicy($name, $desc) {
  $s = "$name $desc"
  if ($s -match "特辣|变态辣|地狱辣|魔鬼辣") { return 3 }
  if ($s -match "麻辣|中辣|辣度3|重辣")      { return 2 }
  if ($s -match "微辣|中微辣|少辣|轻辣")     { return 1 }
  if ($s -match "不辣|免辣|原汤|清汤")       { return 0 }
  if ($s -match "辣")                        { return 1 }  # 笼统含辣兜底
  return 0
}

# ---------- 4) 素食推断（保守：仅明确关键词才标素） ----------
function inferVeg($name) {
  $vegKeywords = "素|菠菜|青菜|白菜|土豆丝|西兰花|豆腐|番茄|鸡蛋|蛋|玉米|南瓜|银耳|莲子|粥|沙拉|水果|牛奶|酸奶|豆花|豆浆|馒头|花卷|包子（素）"
  return ($name -match $vegKeywords)
}

# ---------- 5) 图标映射 ----------
$iconMap = @{
  "盖浇饭"="utensils"; "面食"="wheat"; "麻辣系列"="cooking-pot"; "家常小炒"="beef"
  "轻食沙拉"="salad"; "汤粥"="soup"; "早餐小吃"="croissant"; "甜品饮品"="cup"
  "烧烤"="flame"; "水果"="apple"; "方便速食"="package"; "休闲零食"="cookie"
  "推荐"="star"; "热销"="trending-up"; "折扣"="percent"; "其他"="utensils"
}

# ---------- 6) 卡路里估算（无真实数据，按品类粗略估算，带标注） ----------
$calMap = @{
  "盖浇饭"=700; "面食"=600; "麻辣系列"=750; "家常小炒"=450
  "轻食沙拉"=280; "汤粥"=200; "早餐小吃"=400; "甜品饮品"=350
  "烧烤"=650; "水果"=120; "方便速食"=550; "休闲零食"=350
  "推荐"=550; "热销"=550; "折扣"=550; "其他"=500
}

$dishes = @()
$id = 10000
foreach ($mKey in $menus.PSObject.Properties.Name) {
  $m = $menus.$mKey
  $stallName = $m.shop_name
  $canteen = "商业街"
  if ($stallName -match "_(.+)$") { $canteen = $Matches[1] + "餐厅" }

  foreach ($f in $m.foods) {
    if (-not $f) { continue }
    $group = $f.group_name
    # 过滤非食品分组/单品
    $isNonFoodGroup = $NON_FOOD | Where-Object { $group -like "*$_*" }
    $isDrinkItem = $drinkKeywords | Where-Object { $f.food_name -like "*$_*" }
    if ($isNonFoodGroup) { continue }
    # 便利店档口整体排除出推荐池（SKU 不是菜品，且用户明确：便利店食品不进推荐列表）
    if ($stallName -like "*便利店*") { continue }
    # 非便利店的饮品单品（散在食品分组里的饮料）排除
    if ($stallName -notlike "*便利店*" -and $isDrinkItem -and $f.food_name -notmatch "奶茶|豆浆|牛奶|酸奶") { continue }
    if ($f.food_status -and $f.food_status -ne 0) { continue }

    $rawName = $f.food_name
    $cleanName = $rawName -replace $junkEmojis, "" -replace "^\s+|\s+$", ""
    if ($cleanName.Length -eq 0) { continue }

    $priceCent = if ($f.food_discount_price) { $f.food_discount_price } else { $f.food_price }
    $price = [math]::Round($priceCent / 100, 2)
    if ($price -le 0 -or $price -gt 60) { continue }

    $cat = mapCategory $group $cleanName
    $spicy = inferSpicy $cleanName $f.food_introduce
    $veg = inferVeg $cleanName
    $icon = $iconMap[$cat]; if (-not $icon) { $icon = "utensils" }
    $cal = $calMap[$cat]; if (-not $cal) { $cal = 500 }

    $tasteTags = @()
    if ($spicy -eq 1) { $tasteTags += "微辣" }
    if ($spicy -eq 2) { $tasteTags += "中辣" }
    if ($spicy -eq 3) { $tasteTags += "麻辣" }
    if ($f.food_introduce) {
      if ($f.food_introduce -match "酸")  { $tasteTags += "微酸" }
      if ($f.food_introduce -match "甜")  { $tasteTags += "甜" }
      if ($f.food_introduce -match "咸")  { $tasteTags += "咸香" }
      if ($f.food_introduce -match "鲜")  { $tasteTags += "鲜香" }
      if ($f.food_introduce -match "清淡"){ $tasteTags += "清淡" }
    }
    if ($tasteTags.Count -eq 0) { $tasteTags = @("咸香") }

    $autoTags = @()
    if ($price -le 8) { $autoTags += "性价比" }
    if ($group -eq "推荐" -or $group -eq "热销") { $autoTags += "人气" }
    if ($f.food_discount_price -and $f.food_discount_price -lt $f.food_price) { $autoTags += "折扣" }
    if ($cal -le 350) { $autoTags += "低卡" }
    if ($veg) { $autoTags += "素食友好" }
    if ($cal -ge 500) { $autoTags += "管饱" }

    $descBase = if ($f.food_introduce) { $f.food_introduce } else { "「$group」之选" }
    $desc = $descBase + "，约 $cal kcal"

    $dishes += [PSCustomObject]@{
      id        = $id
      name      = $cleanName
      category  = $cat
      icon      = $icon
      taste     = $tasteTags
      price     = $price
      cal       = $cal
      tags      = $autoTags
      desc      = $desc
      veg       = $veg
      spicy     = $spicy
      # 扩展字段（前端可用）
      stall     = $stallName
      canteen   = $canteen
      img       = $f.food_img_url
      rawGroup  = $group
    }
    $id++
  }
}

# 去重（同名同价）
$seen = @{}
$uniq = @()
foreach ($d in $dishes) {
  $key = "$($d.name)_$($d.price)_$($d.stall)"
  if (-not $seen.ContainsKey($key)) { $seen[$key] = $true; $uniq += $d }
}
$dishes = $uniq

# ---------- 7) 输出 JS ----------
$jsBody = $dishes | ConvertTo-Json -Depth 10
$js = @"
// data.js — 真实食堂菜品（自动从 LCSW API 清洗生成）
// Source: $School ｜ Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm")
(function () {
  window.DB_REAL = {
    school: "$School",
    dishes: $jsBody
  };
})();
"@
$outFull = Join-Path $PSScriptRoot $OutPath
New-Item -ItemType Directory -Force -Path (Split-Path $outFull) | Out-Null
[System.IO.File]::WriteAllText($outFull, $js, (New-Object System.Text.UTF8Encoding($true)))

Write-Host "输出：$outFull" -ForegroundColor Green
Write-Host "档口：$($shops.Count) ｜ 原始菜品：$($dishes.Count + $seen.Count - $dishes.Count) ｜ 去重后：$($dishes.Count)" -ForegroundColor Cyan
$dishes | Group-Object category | Sort-Object Count -Descending | Format-Table -AutoSize
