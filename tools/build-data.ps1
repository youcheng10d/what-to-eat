# ============================================================
# build-data.ps1 — 将采集的原始 LCSW API 数据清洗为前端可用结构
# 输入：data/raw/cqcst-shops.json + cqcst-menus.json
# 输出：what-to-eat/data.js（与 mock.js 同构，前端优先加载）
# ============================================================

param(
  [string]$SchoolShops = "..\what-to-eat\data\raw\cqcst-shops.json",
  [string]$SchoolMenus = "..\what-to-eat\data\raw\cqcst-menus.json",
  [string]$OutPath     = "..\what-to-eat\data\data.js",
  [string]$School      = "重庆城市科技学院",
  [string]$ManualJson  = ".\staging\manual-dishes.json"
)

$ErrorActionPreference = "Stop"
$shops = Get-Content (Join-Path $PSScriptRoot $SchoolShops) -Raw -Encoding UTF8 | ConvertFrom-Json
$menus = Get-Content (Join-Path $PSScriptRoot $SchoolMenus) -Raw -Encoding UTF8 | ConvertFrom-Json

# ---------- 1) 筛选可食用分组（排除便利店非食品等） ----------
$NON_FOOD = @("饮用水","苏打水","茶饮","碳酸饮料","康师傅饮料","统一饮料","功能饮料","啤酒","家居日用","口香糖","香烟")
$drinkKeywords = @("水","茶","可乐","雪碧","康师傅","统一","脉动","红牛","啤酒","口香糖","雪糕")
# 菜名里的装饰符号与 emoji：只清开头会漏掉“《老板力推😋》人气套餐”“❤️小炒肉”“新品🥩干锅培根🥓”
$junkEmojis = "[\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u2190-\u21FF\u2300-\u23FF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]"

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
  if ($name -match "盖饭|拌饭|炒饭|煲仔|木桶饭|铁板饭|焗饭|抓饭|饭$") { return "盖浇饭" }
  if ($name -match "焖面|焖饼") { return "面食" }
  if ($name -match "石锅") { return "盖浇饭" }  # 石锅xx 都是带饭套餐（焖面已在上一行归面食）
  if ($name -match "米线|面条|拉面|小面|拌面|汤面|炒面|面$|面块|粉$|米粉|河粉|酸辣粉|螺蛳粉|馄饨|抄手|水饺|云吞|饵丝") { return "面食" }
  if ($name -match "麻辣烫|冒菜|香锅|串串香|干锅|麻辣拌|毛血旺|麻辣鱼|麻辣什锦") { return "麻辣系列" }
  if ($name -match "沙拉|轻食") { return "轻食沙拉" }
  if ($name -match "粥$|羹$|汤$|汤面|炖汤") { return "汤粥" }
  if ($name -match "包子|小笼包|豆沙包|粉丝包|紫薯包|馒头|花卷|饼$|煎饺|烧麦|茶叶蛋|鸡蛋饼|手抓饼|烤肠|肉肠|玉米$|饭团|三明治|糕$|糕（") { return "早餐小吃" }
  # 荤豆花/鸡哈豆花是川味咸口菜，不能进甜品
  if ($name -match "荤豆花|鸡哈豆花") { return "家常小炒" }
  if ($name -match "奶茶|牛奶|酸奶|豆浆|豆花|糖水|甜品|蛋糕|面包|咖啡|果汁|冰粉|凉虾|西米露|双皮奶|龟苓膏|汤圆|布丁") { return "甜品饮品" }
  if ($name -match "烤串|烧烤|炸串|炸鸡|铁板|烤鸡|烤腿|鸡排|鸡柳") { return "烧烤" }
  if ($name -match "炒|烧|炖|焖|蒸|煮|煲|干锅|小炒") { return "家常小炒" }
  # 主料兜底：含肉禽水产/素料但上面都没归类的，按家常小炒处理，尽量不留“其他”
  if ($name -match "鸡|鸭|鹅|鱼|虾|牛|羊|肉|排骨|翅|腿|丸|蛋|豆腐|菌|菇|藕|茄|菜") { return "家常小炒" }
  # 分组名兜底
  foreach ($key in $catMap.Keys) { if ($group -like "*$key*") { return $catMap[$key] } }
  return "其他"
}

# ---------- 3) 辣味推断 ----------
function inferSpicy($name, $desc) {
  $s = "$name $desc"
  if ($s -match "甜不辣")                    { return 0 }  # 日式食材，非辣味
  if ($s -match "特辣|变态辣|地狱辣|魔鬼辣") { return 3 }
  if ($s -match "毛血旺|水煮|麻婆|夫妻肺片|香水鱼|冒菜|干锅") { return 2 }  # 经典川菜，名无辣字也中辣
  if ($s -match "麻辣|中辣|辣度3|重辣")      { return 2 }
  if ($s -match "微辣|中微辣|少辣|轻辣")     { return 1 }
  if ($s -match "不辣|免辣|原汤|清汤")       { return 0 }
  if ($s -match "辣")                        { return 1 }  # 笼统含辣兜底（辣番茄等）
  if ($s -match "番茄|三鲜")                 { return 0 }  # 放在辣之后，避免"辣番茄"被短路
  return 0
}

# ---------- 4) 素食推断（明确素食材关键词；荤食材优先级更高，见 inferMain） ----------
$vegKeywords = "素|菠菜|青菜|小白菜|上海青|鸡毛菜|生菜|油麦菜|空心菜|包菜|紫甘蓝|白菜|西兰花|花菜|菜花|土豆|马铃薯|藕|莲藕|山药|冬瓜|南瓜|黄瓜|丝瓜|苦瓜|西葫芦|萝卜|胡萝卜|茄子|番茄|西红柿|玉米|青豆|豌豆|毛豆|豆角|四季豆|豇豆|荷兰豆|芹菜|西芹|韭菜|蒜苔|蒜苗|青椒|尖椒|彩椒|莴笋|竹笋|芦笋|豆芽|豆苗|菌|菇|木耳|银耳|海带|紫菜|粉条|粉丝|面筋|腐竹|豆皮|千叶豆腐|豆腐|豆花|豆浆|牛奶|酸奶|苕皮|凉皮|凉粉|腰果|牛油果|牛蒡|鱼腥草|蔬菜|时蔬|地三鲜|水果|沙拉|粥|莲子|馒头|花卷|包子（素）"
function inferVeg($name) {
  return ($name -match $vegKeywords)
}

# ---------- 4.1) 主料推断（只分荤/素，蛋算荤——用户规则） ----------
# 先删“名字像荤、其实是素”的食材，再判荤，最后才看素关键词。
# 否则“白菜猪肉水饺”会被“白菜”抢先判素（2026-10-22 审计出 54 道误标）。
$vegLookalikes = "鸡腿菇|鸡枞菌|牛肝菌|羊肚菌|蟹味菇|贝贝南瓜|鱼腥草|面筋|腰果|牛油果|牛蒡|鸡毛菜"
function inferMain($name) {
  $n = $name -replace "鱼香", ""      # 川菜味型，不含鱼
  if ($n -match "荤") { return "荤" }  # 一荤两素/两荤两素等套餐
  if ($n -match "素鸡|素鸭|素肉|素丸子|素肠|素火腿|素排") { return "素" }
  $m = $n -replace $vegLookalikes, ""
  if ($m -match "蛋|卵") { return "荤" }
  if ($m -match "肉|猪|牛|羊|鸡|鸭|鹅|鱼|虾|蟹|贝|丸|肠|排骨|火腿|培根|腊|翅|腿|蹄|肚|肝|腰|筋|鱿|蚝|蛤|螺|蛙|鳝|泥鳅|花甲|蛏|蚬|蚌|渔") { return "荤" }
  if ($n -match "素") { return "素" }  # 名字明确写了“素”的馅料/菜品（素三鲜水饺、素包子）
  if ($m -match "抄手|馄饨|云吞|水饺|饺子|锅贴|烧麦") { return "荤" }  # 默认肉馅，名字没写素就不当素菜
  if (inferVeg $n) { return "素" }
  return "荤"
}

# ---------- 4.2) 分量推断（小份/常规/大份，为“预算→份量”推荐留结构位） ----------
function inferPortion($name, $note) {
  $s = "$name $note"
  if ($s -match "小份|半份|小碗|一两|mini") { return "small" }
  if ($s -match "大份|加大|加量|大碗|三两") { return "large" }
  return "regular"
}

# ---------- 4.3) 六味标签（v2.0：辣/麻/酸甜/咸鲜/清淡/甜，可多选） ----------
# 咸鲜按做法严格标（卤/酱/蒸/炖/烧/白灼），不用“咸香”兜底；烧麦不算烧。
function inferFlavors($name, $spicy, $cat, $taste) {
  $fl = @()
  if ($spicy -ge 1) { $fl += "辣" }
  if ($name -match "麻辣|麻婆|花椒|藤椒|椒麻|水煮|夫妻肺片") {
    if ($fl -notcontains "辣") { $fl += "辣" }
    $fl += "麻"
  }
  $sweet = ($taste -contains "甜") -or ($cat -eq "甜品饮品" -and $name -notmatch "咸|卤|辣") -or
           ($name -match "鱼香|糖醋|宫保|蜜汁|茄汁|拔丝|甜|双皮奶|龟苓膏|汤圆|布丁|冰粉|西米露|糖水|蛋糕|红豆沙|绿豆沙|银耳|咕咾|菠萝")
  if ($sweet) { $fl += "甜" }
  if ($name -match "糖醋|酸甜|咕咾|茄汁|番茄|西红柿|菠萝|山楂|酸梅|柠檬|百香果|酸奶") { $fl += "酸甜" }
  if ($name -match "卤|酱|蒸|炖|烧(?!麦|烤)|白灼") { $fl += "咸鲜" }
  if (($taste -contains "清淡") -or ($name -match "清汤|白汤|清蒸|白灼|粥")) { $fl += "清淡" }
  # v2.3 口味默认兜底：此前 68% 的菜没有口味标签，勾了口味后只有那一小撮有标签的菜
  # 在响应，表现为“选了酸甜就反复那几道、不选的口味永远不出现”。按品类补默认主味。
  if ($fl.Count -eq 0) {
    switch ($cat) {
      "汤粥"       { $fl += "清淡" }
      "甜品饮品"   { $fl += "甜" }
      "麻辣系列"   { $fl += "辣" }
      "轻食沙拉"   { $fl += "清淡" }
      default      { $fl += "咸鲜" }
    }
  }
  return @($fl | Select-Object -Unique)
}

# ---------- 4.4) 加菜/小料/原料分组判定（v2.3） ----------
# 采集菜单里混着“加菜/加料/元区/口味必选/单点”等选项分组，它们不是菜。
# 例：冒菜的“口味必选”里有一份 ¥1 的番茄，会被当成“酸甜家常小炒”推给用户。
# 分组名里的换行要先去掉（采集数据里有“特色撸\n串素”这种）。
$addonGroupRe = '(加菜|加料|小料|必选|锅底|汤底|蘸料|调料包|餐具|打包盒|餐盒|温馨提示|点餐前|辣度|味型|选酱|加配菜|加量|臊子单点|小吃单点|饮料单点|^单点|单点\(|^\d+元区?$|另加|加饭|自选酱|免费小料|加购)'
# 自选称重档口的原料分组：单价 2-4 元的“素菜/肉食”条目，不是一道菜
$ingredientGroupRe = '^(素菜|肉食|来点肉食|这是素菜|特色撸.?串(素|荤)|关东煮)$'
function Test-AddonGroup($group) {
  $g = ($group -replace "\s", "")
  if ($g -match "不含米饭") { return $false }  # “小炒系列（不含米饭需要单点米饭）”是正餐
  return ($g -match $addonGroupRe) -or ($g -match $ingredientGroupRe)
}
function Get-Median($nums) {
  $a = @($nums | Sort-Object)
  if (-not $a.Count) { return 0 }
  return [math]::Round($a[[int][math]::Floor($a.Count / 2)], 1)
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
$stallStats = @{}
$id = 10000
foreach ($mKey in $menus.PSObject.Properties.Name) {
  $m = $menus.$mKey
  $stallName = $m.shop_name
  $canteen = "商业街"
  if ($stallName -match "_(.+)$") { $canteen = $Matches[1] + "餐厅" }
  # 仅保留汇百味 / 北山苑（2026-10-22 用户决定：商业街的古茗、古春堂等全部不进推荐池）
  if ($canteen -notmatch "汇百味|北山苑") { continue }

  foreach ($f in $m.foods) {
    if (-not $f) { continue }
    $group = $f.group_name
    if (-not $stallStats.ContainsKey($stallName)) { $stallStats[$stallName] = @{ total = 0; addon = 0; canteen = $canteen } }
    $stallStats[$stallName].total++
    # 加菜/小料/元区/必选/单点等选项分组不是菜，直接不进推荐池
    if (Test-AddonGroup $group) { $stallStats[$stallName].addon++; continue }
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
    # 米饭单点不是菜（用户既定规则：只推荐主食菜品）；带备注的纯米饭 SKU 同样排除
    if ($cleanName -match "^\s*[★☆]?\s*(白|紫|珍珠)?米饭") {
      $riceRest = ($cleanName -replace "^\s*[★☆]?\s*(白|紫|珍珠)?米饭", "") -replace "（|\(|）|\)|\s", ""
      if ($riceRest -eq "" -or $riceRest -match "(单点|不送|套餐里面有一份)$") { continue }
    }
    # 蘸料/餐具/打包耗材不是菜品（新采集数据里出现“饺子蘸料”“打包盒”等条目）
    if ($cleanName -match "蘸料|蘸水|调料|小料|锅底料|餐盒|打包盒|打包袋|餐巾|纸巾|湿巾|筷子|餐具|塑料袋") { continue }

    $priceCent = if ($f.food_discount_price) { $f.food_discount_price } else { $f.food_price }
    $price = [math]::Round($priceCent / 100, 2)
    if ($price -le 0 -or $price -gt 60) { continue }
    # 低价的纯酱/汁小料（“甜辣酱 ¥1.5”“塔塔酱 ¥1.5”）不是菜；按“整名以酱/汁结尾 + 低价”判定
    if ($price -le 5 -and $cleanName.Length -le 8 -and $cleanName -match "(酱|汁)$") { continue }

    $cat = mapCategory $group $cleanName
    # 糖水铺/奶茶店档口残留的“其他”类菜品兜底为甜品饮品（名字多为杨枝甘露等无关键词甜点）
    if ($cat -eq "其他" -and ($stallName -match "古春堂|糖水铺|古茗")) { $cat = "甜品饮品" }
    $spicy = inferSpicy $cleanName $f.food_introduce
    $main  = inferMain $cleanName
    $veg   = ($main -eq "素")   # 与主料保持一致（蛋算荤）
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
    # 菜名口味关键词：甜味系（含鱼香/糖醋/宫保/蜜汁等咸甜口）与甜品饮品兜底
    if ($cleanName -match "鱼香|糖醋|宫保|蜜汁|茄汁|拔丝|甜|双皮奶|龟苓膏|汤圆|布丁|冰粉|西米露|糖水|蛋糕|红豆沙|绿豆沙|银耳") {
      if (-not ($tasteTags -contains "甜")) { $tasteTags += "甜" }
    }
    if ($cat -eq "甜品饮品" -and -not ($tasteTags -contains "甜") -and $cleanName -notmatch "咸|卤|辣") { $tasteTags += "甜" }
    if ($tasteTags.Count -eq 0) { $tasteTags = @("咸香") }

    $autoTags = @()
    if ($price -le 8) { $autoTags += "性价比" }
    if ($group -eq "推荐" -or $group -eq "热销") { $autoTags += "人气" }
    if ($f.food_discount_price -and $f.food_discount_price -lt $f.food_price) { $autoTags += "折扣" }
    if ($cal -le 350) { $autoTags += "低卡" }
    if ($veg) { $autoTags += "素食友好" }
    if ($cal -ge 500) { $autoTags += "管饱" }

    $descBase = if ($f.food_introduce -and $f.food_introduce -notmatch "此处为菜品描述") { $f.food_introduce } else { ([char]0x201C + $group + [char]0x201D + '之选') }
    $descBase = $descBase -replace "[，,。；;、\s]+$", ""  # 去掉结尾标点，避免“，，约 xx kcal”
    $desc = $descBase + "，约 $cal kcal"

    $dishes += [PSCustomObject]@{
      id        = $id
      name      = $cleanName
      category  = $cat
      icon      = $icon
      taste     = $tasteTags
      flavors   = (inferFlavors $cleanName $spicy $cat $tasteTags)
      price     = $price
      cal       = $cal
      tags      = $autoTags
      desc      = $desc
      veg       = $veg
      spicy     = $spicy
      main      = $main
      portion   = (inferPortion $cleanName "")
      # 扩展字段（前端可用）
      stall     = $stallName
      canteen   = $canteen
      img       = $f.food_img_url
      rawGroup  = $group
      # 数据来源：api = 小程序接口采集，manual = 线下拍照录入，mecca = 会长数据补充
      src       = "api"
    }
    $id++
  }
}

# ---------- 5.5) 自选称重档口：原料条目折叠成一条虚拟菜（v2.3） ----------
# 麻辣烫/冒菜/炸串整份菜单都是 2-4 元的原料，全删会让档口消失，全留会推出“生菜 ¥2”。
# 规则：加菜/原料条目占比 ≥ 60% 的档口，折叠成一条“自选 XX”，价格取该档口真菜中位价。
$mergedStalls = @()
foreach ($stallName in $stallStats.Keys) {
  $st = $stallStats[$stallName]
  # 只折叠整份菜单都是原料的自选档口；鸡公煲这类有正经煲仔的档口只丢加菜，不造虚拟菜
  if ($stallName -notmatch "麻辣烫|冒菜|炸串") { continue }
  if ($st.total -lt 8 -or $st.addon -lt 8) { continue }
  if ($st.addon / $st.total -lt 0.5) { continue }
  $real = @($dishes | Where-Object { $_.stall -eq $stallName })
  $price = Get-Median @($real | ForEach-Object { $_.price })
  if ($price -lt 8) { $price = 8 }
  $name = if ($stallName -match "麻辣烫") { "自选麻辣烫" } elseif ($stallName -match "冒菜") { "自选冒菜" } elseif ($stallName -match "炸串") { "自选炸串" } else { "自选称重" }
  $cat  = if ($stallName -match "炸串") { "烧烤" } else { "麻辣系列" }
  $dishes += [PSCustomObject]@{
    id        = $id
    name      = $name
    category  = $cat
    icon      = $iconMap[$cat]
    taste     = @("微辣")
    flavors   = @("辣", "咸鲜")
    price     = $price
    cal       = $calMap[$cat]
    tags      = @("管饱")
    desc      = "自选称重，按实际取量结算，参考约 $price 元"
    veg       = $false
    spicy     = 1
    main      = "荤"
    portion   = "regular"
    stall     = $stallName
    canteen   = $st.canteen
    img       = ""
    rawGroup  = "自选称重"
    src       = "api"
  }
  $id++
  $mergedStalls += "$stallName（$($st.addon) 条原料 → 1 条自选）"
}
if ($mergedStalls.Count) { Write-Host "自选档口合并：$($mergedStalls -join '；')" -ForegroundColor Cyan }

# 去重（同名同价）
$seen = @{}
$uniq = @()
foreach ($d in $dishes) {
  $key = "$($d.name)_$($d.price)_$($d.stall)"
  if (-not $seen.ContainsKey($key)) { $seen[$key] = $true; $uniq += $d }
}
$dishes = $uniq

# ---------- 6.5) 合并线下拍照手工录入数据（stall+name 冲突时以线下为准） ----------
$manualPath = Join-Path $PSScriptRoot $ManualJson
if (Test-Path $manualPath) {
  $manual = Get-Content $manualPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $byKey = @{}
  foreach ($d in $dishes) { $byKey["$($d.stall)|$($d.name)"] = $d }
  foreach ($md in $manual) {
    $md | Add-Member -NotePropertyName src -NotePropertyValue "manual" -Force
    $byKey["$($md.stall)|$($md.name)"] = $md
  }
  $dishes = @($byKey.Values)
  $id = 10000
  foreach ($d in $dishes) { $d.id = $id; $id++ }
  Write-Host "合并线下录入：$($manual.Count) 道，合并后总计 $($dishes.Count) 道" -ForegroundColor Cyan
}

# ---------- 6.6) 合并会长 mecca-eat 数据补充（只补缺失，不覆盖现有） ----------
$meccaPath = Join-Path $PSScriptRoot ".\staging\mecca-supplement.json"
if (Test-Path $meccaPath) {
  $mecca = Get-Content $meccaPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $byKey = @{}
  foreach ($d in $dishes) { $byKey["$($d.stall)|$($d.name)"] = $d }
  $added = 0
  foreach ($md in $mecca) {
    $key = "$($md.stall)|$($md.name)"
    if (-not $byKey.ContainsKey($key)) {
      $md | Add-Member -NotePropertyName src -NotePropertyValue "mecca" -Force
      $byKey[$key] = $md; $added++
    }
  }
  $dishes = @($byKey.Values)
  $id = 10000
  foreach ($d in $dishes) { $d.id = $id; $id++ }
  Write-Host "合并会长补充：$added 道，合并后总计 $($dishes.Count) 道" -ForegroundColor Cyan
}

# ---------- 6.8) 档口名显示清理：去掉“_食堂”后缀（canteen 字段已单独存食堂名） ----------
foreach ($d in $dishes) {
  if ($d.stall -match "^([^_]+)_") { $d.stall = $Matches[1] }
}

# ---------- 6.9) 档口名校正 / 合并（2026-11-04 用户确认） ----------
$stallRename = @{
  "抄手馄饨大王" = "小火锅抄手水饺"   # 汇百味的实际档口名
  "汤萌"        = "锅庐三汁焖锅"      # 汤萌的小锅并入锅庐焖锅
}
$renameHits = 0
foreach ($d in $dishes) {
  if ($stallRename.ContainsKey($d.stall)) { $d.stall = $stallRename[$d.stall]; $renameHits++ }
}
Write-Host "档口名校正：命中 $renameHits 道" -ForegroundColor Cyan

# ---------- 6.95) 终检：补充数据里的加菜兜底过滤 + 口味补全（v2.3） ----------
# 线下录入与会长补充是两份独立 JSON，不走前面的菜名清洗，先统一去一次 emoji 与首尾空白
# 营销标签和主观评价不是菜名的一部分：“《老板力推》人气套餐”“【新品】干锅…”“招牌汉堡套餐三”
$marketingWord = '老板力推|优惠多多|超级吃货|吃的过瘾|CP组合|新品|招牌|特惠|超值|严选|必点|爆款|镇店之宝|好吃'
$bracketRe     = '[《【〖（(]([^》】〗）)]*)[》】〗）)]'
$stripAnywhere = '招牌|特色|新品|特惠|超值|严选|老板力推|优惠多多|超级吃货|吃的过瘾|好吃'
foreach ($d in $dishes) {
  $n = [string]$d.name
  $n = [regex]::Replace($n, $junkEmojis, "")
  # 括号内是营销/主观评价就整块去掉；《辣》《8个》《笼》这类信息性括号保留
  $n = [regex]::Replace($n, $bracketRe, { param($m) if ($m.Groups[1].Value -match $marketingWord) { '' } else { $m.Value } })
  $n = $n -replace $stripAnywhere, ''
  $n = $n -replace '[‼！!]+', ''
  # 名称末尾的落单括号：“豌杂汤面/河粉/刀削（” 这种是原始数据截断，去掉
  $n = ($n -replace '[（(【\[《]+$', '').Trim()
  $n = ($n -replace '\s{2,}', ' ').Trim()
  if ($n) { $d.name = $n }
}
# 线下录入与会长补充是两份独立 JSON，不走前面的分组过滤，必须在合并后再扫一遍。
$bareIngredient = '^(番茄|西红柿|土豆|藕片|莲藕|金针菇|香菇|平菇|木耳|豆干|豆皮|腐竹|宽粉|粉丝|苕皮|年糕|生菜|白菜|娃娃菜|油麦菜|豆芽|海带|海带丝|洋葱|青椒|蒜苔|芹菜|花菜|西兰花|山药|玉米|南瓜|冬瓜|黄瓜|茄子|竹笋|莴笋|鸡蛋|煎蛋|卤蛋|卤鸡蛋|茶叶蛋|鹌鹑蛋|火腿肠|午餐肉|蟹排|鱼豆腐|虾饺|牛肉丸|鱼丸|甜不辣|油条|麻花|锁骨|鸡翅尖|鸭翅|鸭血|包菜|土豆片|土豆粉|千叶豆腐|方便面|里脊肉|肥牛|酥肉|鱿鱼)$'
$beforeHygiene = $dishes.Count
$dishes = @($dishes | Where-Object {
  $g = ([string]$_.rawGroup -replace "\s", "")
  $n = [string]$_.name
  if ((Test-AddonGroup $g) -and ($g -notmatch "不含米饭")) { return $false }
  if ($n -match "^\s*[+＋★☆]|单加|不单卖|不可单点|放入干锅|加一两|^加醋|另加米饭") { return $false }
  # “麻辣肉片5片 ¥4”“素豆肠3个 ¥2”是按份加的原料，不是一道菜
  if (($n -match "\d+\s*(片|串|根|只|个)$") -and ($_.price -le 5)) { return $false }
  # 纯原料名 + 低价 = 加菜/浇头（“番茄 ¥8”“煎蛋 ¥2”），不是一顿饭
  if (($n -match $bareIngredient) -and ($_.price -le 8)) { return $false }
  # 加料/加菜：名字整个就是“加牛肉”“加粉”“加羊杂”，不是一道菜（“加州鸡排”“加拿大”不算）
  if ($n -match '^加(?!州|拿大|勒比)[\u4e00-\u9fa5]{1,3}$') { return $false }
  # 试吃装/福利价不是正常售卖的一份（“鸡翅尖试吃 ¥0.6”“福利翅根 ¥1.2”）
  if ($n -match '试吃|福利|1人1单') { return $false }
  # 包装/蘸料/分装说明不是菜（“汤和抄手分开装 ¥1”“油碟 包含小米辣 ¥2.5”）
  if ($n -match '分开装|油碟|餐盒|打包盒|（单买）|\(单买\)|（单点）|\(单点\)') { return $false }
  # 单品小食：低于 5 元的粥/包子/馒头/蛋/饼/寿司/土豆泥不是一顿饭；称重价（麻辣烫/冒菜/自选）例外
  $singleSuffix = '(粥|蛋|包|馒头|花卷|糕|饼|卷|串|丸|肠|饺|酥|条|块|片|麦|卖|司|泥|棒|腿|烧)$'
  $snackWord    = '(糯米鸡|热狗|鱼籽烧|卤豆干|卤豆皮|卤豆腐|狮子头|虾皮鸡柳|琅琊土豆|鸭翅|鸡翅尖|翅根|里脊串)$'
  $weighName    = '麻辣烫|麻辣拌|冒菜|香锅|自选|称重|按重|自助'
  if (($_.price -lt 5) -and ($n -match $weighName)) { return $true }
  if (($_.price -lt 5) -and (($n -match $singleSuffix) -or ($n -match $snackWord))) { return $false }
  return $true
})
Write-Host "终检过滤加菜条目：$($beforeHygiene - $dishes.Count) 道" -ForegroundColor Cyan

$flavorFilled = 0
foreach ($d in $dishes) {
  $fl = @($d.flavors | Where-Object { $_ })
  if ($fl.Count -eq 0) {
    $spicy = if ($null -ne $d.spicy) { [int]$d.spicy } else { 0 }
    $taste = @($d.taste | Where-Object { $_ })
    $newFl = @(inferFlavors ([string]$d.name) $spicy ([string]$d.category) $taste)
    if ($d.PSObject.Properties.Name -contains "flavors") { $d.flavors = $newFl }
    else { $d | Add-Member -NotePropertyName flavors -NotePropertyValue $newFl }
    $flavorFilled++
  }
}
Write-Host "口味补全：$flavorFilled 道" -ForegroundColor Cyan

# ---------- 6.99) 来源标记兜底：没有 src 的一律算接口采集 ----------
foreach ($d in $dishes) {
  if (-not ($d.PSObject.Properties.Name -contains "src")) {
    $d | Add-Member -NotePropertyName src -NotePropertyValue "api" -Force
  }
}
$srcStat = $dishes | Group-Object src | ForEach-Object { "$($_.Name) $($_.Count)" }
Write-Host ("来源分布：" + ($srcStat -join " ｜ ")) -ForegroundColor Cyan

# ---------- 6.97) 重复收敛：同名同档口同价只保留信息最全的一条 ----------
# 库里有近 200 组菜被两个来源各录了一次（api 带图 / 线下补录），
# 它们在上游哈希表里谁被留下取决于枚举顺序，导致同一份输入两次构建结果不同
# （实测 195 条菜的描述与 id 来回抖动）。这里用固定优先级收敛，结果与顺序无关。
$pool = @{}
foreach ($d in $dishes) {
  $k = "$($d.stall)|$($d.name)"
  if (-not $pool.ContainsKey($k)) { $pool[$k] = $d; continue }
  $old = $pool[$k]
  $ns = 0; $os = 0
  if ("$($d.img)" -ne "") { $ns += 100 }
  if ("$($old.img)" -ne "") { $os += 100 }
  if ("$($d.src)" -eq "api") { $ns += 10 }
  if ("$($old.src)" -eq "api") { $os += 10 }
  $ns += [math]::Min(9, [int](("$($d.desc)").Length / 10))
  $os += [math]::Min(9, [int](("$($old.desc)").Length / 10))
  if ($ns -gt $os) { $pick = $d }
  elseif ($ns -lt $os) { $pick = $old }
  elseif ([string]::CompareOrdinal("$($d.desc)", "$($old.desc)") -le 0) { $pick = $d }
  else { $pick = $old }
  # 标签取并集：不能因为收敛把「人气」这类属性弄丢
  $tags = @(@($old.tags) + @($d.tags) | Where-Object { $_ } | Sort-Object -Unique)
  if ($tags.Count) { $pick | Add-Member -NotePropertyName tags -NotePropertyValue $tags -Force }
  $pool[$k] = $pick
}
$dishes = @($pool.Values | Sort-Object { "$($_.stall)|$($_.name)" })
Write-Host "重复收敛：$($dishes.Count) 道（$($pool.Count) 组）" -ForegroundColor Cyan

# ---------- 6.98) 稳定 id：内容哈希，重建数据时不再整体漂移 ----------
# 旧实现从 10000 顺序发号，任何一次增删都会让后面所有菜的 id 平移，
# 用户 localStorage 里的收藏与“今天吃过”就指到别的菜上（实测重建后 200 条漂移）。
# 6.97 已经把「档口+菜名」收敛为唯一，这里直接哈希该键，零碰撞、零漂移；
# 价格不参与，调价不会让用户的收藏失效。
$used = @{}
foreach ($d in $dishes) {
  $key = "$($d.stall)|$($d.name)"
  $md5 = [System.Security.Cryptography.MD5]::Create()
  $hash = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($key))
  $newId = [int]([BitConverter]::ToUInt32($hash, 0) % 900000000) + 100000000
  while ($used.ContainsKey($newId)) { $newId++ }
  $used[$newId] = $true
  $d.id = $newId
}
Write-Host "稳定 id：$($used.Count) 条（复合键哈希，重复 id 0）" -ForegroundColor Cyan

# ---------- 6.10) 档口级元数据：人气菜占比（v2.0 推荐加成 = 2 × hotRate） ----------
$stallMeta = @{}
foreach ($g in ($dishes | Group-Object stall)) {
  $cnt = $g.Count
  $hot = @($g.Group | Where-Object { $_.tags -contains "人气" }).Count
  $canteen = [string]($g.Group | Select-Object -First 1).canteen
  $floor = if ($canteen -match "汇百味") { "2楼" } elseif ($canteen -match "北山苑") { "3楼" } else { "" }
  $stallMeta[$g.Name] = [PSCustomObject]@{
    dishCount = $cnt
    hotCount  = $hot
    hotRate   = if ($cnt) { [math]::Round($hot / $cnt, 3) } else { 0 }
    canteen   = $canteen
    floor     = $floor
  }
}

# ---------- 6.95) 称重计价：把「元/50克」的单价换算成每份估价（v2.4.1） ----------
# 问题：OCR 把牌面上的「1.98 元/50 克」当成了菜品售价，卡片上显示 ¥1.98，
# 既误导用户，也会让预算过滤把麻辣烫当成一块九的菜放进 5 元预算里。
# 处理：保留原始单价 unitPrice 供展示，price 改为按 400g 估算的每份价，供预算过滤使用。
$weightFixed = 0
foreach ($d in $dishes) {
  $text = "$($d.name) $($d.desc)"
  if ($text -notmatch '(\d+(?:\.\d+)?)\s*元?\s*/\s*50\s*克') { continue }
  $unit = [double]$Matches[1]
  if ($unit -le 0) { continue }
  $est = [math]::Round($unit * 8, 1)
  $d | Add-Member -NotePropertyName pricing   -NotePropertyValue "weight" -Force
  $d | Add-Member -NotePropertyName unitPrice -NotePropertyValue $unit -Force
  $d | Add-Member -NotePropertyName unit      -NotePropertyValue "50g" -Force
  $d | Add-Member -NotePropertyName estPrice  -NotePropertyValue $est -Force
  $d.price = $est
  if (@($d.tags) -notcontains "称重") { $d.tags = @($d.tags) + "称重" }
  $weightFixed++
}
Write-Host "称重计价换算：$weightFixed 道" -ForegroundColor Cyan

# ---------- 7) 输出 JS ----------
$jsBody = $dishes | ConvertTo-Json -Depth 10
# PS 5.1 的 ConvertTo-Json 会把单元素数组压成字符串、空数组写成 {}，flavors 统一修回数组
$jsBody = $jsBody -replace '"flavors":\s*\{\s*\}', '"flavors": []'
$jsBody = $jsBody -replace '"flavors":\s*"([^"]*)"', '"flavors": ["$1"]'
$metaBody = $stallMeta | ConvertTo-Json -Depth 5
$js = @"
// data.js — 真实食堂菜品（自动从 LCSW API 清洗生成）
// Source: $School ｜ Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm")
(function () {
  window.DB_REAL = {
    school: "$School",
    stallMeta: $metaBody,
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
