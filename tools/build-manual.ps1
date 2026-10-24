# ============================================================
# build-manual.ps1 — 将线下拍照 OCR 的 staging JSON 清洗为前端结构
# 输入：tools/staging/huibaiwei-part*.json + beishanyuan-part*.json
# 输出：tools/staging/manual-dishes.json（与 build-data.ps1 产物同构）
# 规则（2026-10-22 用户确认）：
#   1. 同一道菜多规格只保留常规档（盖饭/二两/小份），其他档位写进 desc
#   2. 排除加菜/加料/卤味小吃/米饭单点/饮品（推荐主食，不推荐勾兑饮品）
# ============================================================

param(
  [string]$StagingDir = ".\staging",
  [string]$OutPath    = ".\staging\manual-dishes.json",
  [int]$StartId       = 20000
)
$ErrorActionPreference = "Stop"
$dir = Join-Path $PSScriptRoot $StagingDir

$floorMap = @{ "huibaiwei" = "汇百味"; "beishanyuan" = "北山苑" }
$stallNorm = @{
  "小炒·公社食堂"        = "公社食堂小炒"
  "椰子鸡黄焖鸡北山苑"   = "椰子鸡黄焖鸡"
  "一万家干锅_北山苑"    = "一万家干锅"
  "你过来鸭烤鸭饭"       = "你过来鸭"
  "煎扒档法式铁板烧"     = "兴旺法式铁板烧"
  "兰州拉面西北风味"     = "兰州拉面"
  "章尚村麻辣烫麻辣拌"   = "章尚村麻辣烫"
}
# 档口招牌里识别不出名字的（宁可重拍不进池）：占位/怀疑性命名
$uncertainStallPattern = "疑为|疑似|未标|未标注|画面无招牌|相邻档口"
$excludeGroupKeys = @("加菜","加料","加小料","卤味","饮品","饮料")
$excludeNoteKeys  = @("加料","饮品","主食米饭","非餐食")
$excludeNames     = @("米饭","打包盒","打包费","餐盒","打包袋","餐具","打包","整只","荤素同价（称重计价）")

# ---------- 推断函数（与 build-data.ps1 同规则） ----------
function mapCategory($group, $name) {
  if ($name -match "盖饭|拌饭|炒饭|煲仔|木桶饭|铁板饭|焗饭|抓饭|焖饭|擂饭|烤盘饭|烧腊饭|饭$") { return "盖浇饭" }
  if ($name -match "焖面|焖饼") { return "面食" }
  if ($name -match "石锅") { return "盖浇饭" }  # 石锅xx 都是带饭套餐（焖面已在上一行归面食）
  if ($name -match "米线|面条|拉面|小面|拌面|汤面|炒面|面$|面块|粉$|米粉|河粉|酸辣粉|螺蛳粉|馄饨|抄手|水饺|云吞|饵丝|铺盖面") { return "面食" }
  if ($name -match "麻辣烫|冒菜|香锅|串串香|干锅|麻辣拌|毛血旺|麻辣鱼|麻辣什锦") { return "麻辣系列" }
  if ($name -match "沙拉|轻食") { return "轻食沙拉" }
  if ($name -match "粥$|羹$|汤$|炖汤|汤包") { return "汤粥" }
  if ($name -match "包子|小笼包|豆沙包|粉丝包|紫薯包|馒头|花卷|饼$|煎饺|烧麦|茶叶蛋|鸡蛋饼|手抓饼|掉渣饼|烤肠|肉肠|玉米$|饭团|三明治|蒸饺|锅贴|糕$|糕（") { return "早餐小吃" }
  # 荤豆花/鸡哈豆花是川味咸口菜，不能进甜品
  if ($name -match "荤豆花|鸡哈豆花") { return "家常小炒" }
  if ($name -match "奶茶|牛奶|酸奶|豆浆|豆花|糖水|甜品|蛋糕|面包|咖啡|果汁|冰粉|凉虾|西米露") { return "甜品饮品" }
  if ($name -match "烤串|烧烤|炸串|炸鸡|铁板|烤鸡|烤腿|鸡排|鸡柳|汉堡|薯条|烤堡") { return "烧烤" }
  if ($name -match "炒|烧|炖|焖|蒸|煮|煲|干锅|小炒|套餐|酸菜鱼|蚂蚁上树|小锅|健康餐") { return "家常小炒" }
  if ($group -match "盖饭|拌饭|炒饭|套餐") { return "盖浇饭" }
  if ($group -match "面|粉|馄饨|抄手|云吞") { return "面食" }
  if ($group -match "麻辣|香锅|干锅") { return "麻辣系列" }
  if ($group -match "轻食|沙拉") { return "轻食沙拉" }
  if ($group -match "小吃|早餐|饼") { return "早餐小吃" }
  if ($group -match "焖|炒|烧|蒸") { return "家常小炒" }
  if ($group -match "套餐") { return "盖浇饭" }
  # 主料兜底：含肉禽水产/素料但上面都没归类的，按家常小炒处理，尽量不留「其他」
  if ($name -match "鸡|鸭|鹅|鱼|虾|牛|羊|肉|排骨|翅|腿|丸|蛋|豆腐|菌|菇|藕|茄|菜") { return "家常小炒" }
  return "其他"
}
function inferSpicy($name) {
  if ($name -match "特辣|变态辣|地狱辣|魔鬼辣") { return 3 }
  if ($name -match "毛血旺|水煮|麻婆|夫妻肺片|香水鱼|冒菜|干锅") { return 2 }  # 经典川菜，名无辣字也中辣
  if ($name -match "麻辣|中辣|重辣|香辣|剁椒|泡椒|辣子") { return 2 }
  if ($name -match "微辣|少辣|轻辣") { return 1 }
  if ($name -match "不辣|免辣|原汤|清汤") { return 0 }
  if ($name -match "辣") { return 1 }  # 笼统含辣兜底（辣番茄等）
  if ($name -match "番茄|三鲜") { return 0 }  # 放在辣之后，避免"辣番茄"被短路
  return 0
}
$vegKeywords = "素|菠菜|青菜|小白菜|上海青|鸡毛菜|生菜|油麦菜|空心菜|包菜|紫甘蓝|白菜|西兰花|花菜|菜花|土豆|马铃薯|藕|莲藕|山药|冬瓜|南瓜|黄瓜|丝瓜|苦瓜|西葫芦|萝卜|胡萝卜|茄子|番茄|西红柿|玉米|青豆|豌豆|毛豆|豆角|四季豆|豇豆|荷兰豆|芹菜|西芹|韭菜|蒜苔|蒜苗|青椒|尖椒|彩椒|莴笋|竹笋|芦笋|豆芽|豆苗|菌|菇|木耳|银耳|海带|紫菜|粉条|粉丝|面筋|腐竹|豆皮|千叶豆腐|豆腐|豆花|豆浆|牛奶|酸奶|苕皮|凉皮|凉粉|腰果|牛油果|牛蒡|鱼腥草|蔬菜|时蔬|地三鲜|水果|沙拉|粥|莲子|馒头|花卷|包子（素）"
function inferVeg($name) {
  return ($name -match $vegKeywords)
}
# 主料推断（只分荤/素，蛋算荤——用户规则）
# 先删「名字像荤、其实是素」的食材，再判荤，最后才看素关键词。
$vegLookalikes = "鸡腿菇|鸡枞菌|牛肝菌|羊肚菌|蟹味菇|贝贝南瓜|鱼腥草|面筋|腰果|牛油果|牛蒡|鸡毛菜"
function inferMain($name) {
  $n = $name -replace "鱼香", ""
  if ($n -match "荤") { return "荤" }  # 一荤两素/两荤两素等套餐
  if ($n -match "素鸡|素鸭|素肉|素丸子|素肠|素火腿|素排") { return "素" }
  $m = $n -replace $vegLookalikes, ""
  if ($m -match "蛋|卵") { return "荤" }
  if ($m -match "肉|猪|牛|羊|鸡|鸭|鹅|鱼|虾|蟹|贝|丸|肠|排骨|火腿|培根|腊|翅|腿|蹄|肚|肝|腰|筋|鱿|蚝|蛤|螺|蛙|鳝|泥鳅|花甲|蛏|蚬|蚌|渔") { return "荤" }
  if ($n -match "素") { return "素" }  # 名字明确写了「素」的馅料/菜品（素三鲜水饺、素包子）
  if ($m -match "抄手|馄饨|云吞|水饺|饺子|锅贴|烧麦") { return "荤" }  # 默认肉馅，名字没写素就不当素菜
  if (inferVeg $n) { return "素" }
  return "荤"
}
# 分量推断（小份/常规/大份）
function inferPortion($name, $note) {
  $s = "$name $note"
  if ($s -match "小份|半份|小碗|一两|mini") { return "small" }
  if ($s -match "大份|加大|加量|大碗|三两") { return "large" }
  return "regular"
}
# 六味标签（v2.0 用户定义：辣 / 麻 / 酸甜 / 咸鲜 / 清淡 / 甜，可多选）
# 咸鲜按做法严格标（卤/酱/蒸/炖/烧/白灼），不用「咸香」兜底；烧麦不算烧。
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
  return @($fl | Select-Object -Unique)
}
$iconMap = @{
  "盖浇饭"="utensils"; "面食"="wheat"; "麻辣系列"="cooking-pot"; "家常小炒"="beef"
  "轻食沙拉"="salad"; "汤粥"="soup"; "早餐小吃"="croissant"; "甜品饮品"="cup"
  "烧烤"="flame"; "其他"="utensils"
}
$calMap = @{
  "盖浇饭"=700; "面食"=600; "麻辣系列"=750; "家常小炒"=450
  "轻食沙拉"=280; "汤粥"=200; "早餐小吃"=400; "甜品饮品"=350
  "烧烤"=650; "其他"=500
}

# ---------- 读取全部 staging ----------
$raw = @()
foreach ($prefix in $floorMap.Keys) {
  $floor = $floorMap[$prefix]
  foreach ($f in (Get-ChildItem $dir -Filter "$prefix-part*.json")) {
    $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($p in $j.photos) {
      $qual = [string]$p.quality
      foreach ($s in $p.sections) {
        $stallRaw = [string]$s.stall
        # 清洗招牌后缀：括号宣传语、英文、多余空白
        $stall = $stallRaw -replace "（[^）]*）", "" -replace "\([^)]*\)", "" -replace "[A-Za-z]", "" -replace "\s+", ""
        $stall = $stall.Trim()
        if ($stallNorm.ContainsKey($stall)) { $stall = $stallNorm[$stall] }
        if ($stall -notmatch "_") { $stall = "$stall`_$floor" }
        foreach ($i in $s.items) {
          if (-not $i.name) { continue }
          $raw += [pscustomobject]@{
            photo = $p.file; qual = $qual; stall = $stall; stallRaw = [string]$s.stall
            grp   = [string]$s.group
            name  = ([string]$i.name).Trim(); price = [double]$i.price
            ptext = [string]$i.priceText;    note = [string]$i.note
            spicyOv = $i.spicy;              mainOv = [string]$i.main
          }
        }
      }
    }
  }
}
Write-Host "原始条目：$($raw.Count)"

# ---------- 排除规则 ----------
$kept = @()
$rejected = @()
foreach ($r in $raw) {
  $why = ""
  if ($r.qual -eq "unusable") { $why = "照片不可用" }
  elseif ($r.stallRaw -match $uncertainStallPattern) { $why = "档口名不确定" }
  elseif ($excludeNames -contains $r.name) { $why = "非菜品（米饭/打包）" }
  elseif ($r.name -match "□") { $why = "OCR未识别（残字）" }
  else {
    foreach ($k in $excludeGroupKeys) { if ($r.grp -like "*$k*") { $why = "排除分组:$k"; break } }
    if (-not $why) { foreach ($k in $excludeNoteKeys) { if ($r.note -like "*$k*") { $why = "排除备注:$k"; break } } }
    if (-not $why -and ($r.price -le 0 -or $r.price -gt 60)) { $why = "价格异常" }
  }
  if ($why) { $r | Add-Member -NotePropertyName reason -NotePropertyValue $why -Force; $rejected += $r }
  else { $kept += $r }
}
Write-Host "排除后：$($kept.Count)（剔除 $($rejected.Count) 条）"
# 档口名不确定的单独存证，供重拍核对
$rejected | Where-Object { $_.reason -eq "档口名不确定" -or $_.reason -eq "照片不可用" } |
  Select-Object photo, stallRaw, name, ptext, reason |
  ConvertTo-Json -Depth 5 | Out-File (Join-Path $PSScriptRoot ".\staging\uncertain-dishes.json") -Encoding utf8

# ---------- 同菜多规格合并：保留常规档，其余写进 desc ----------
function variantScore($r) {
  $sc = 0
  if ($r.grp  -match "盖饭|拌饭")            { $sc -= 10 }
  if ($r.note -match "二两|小份|标准|小碗")   { $sc -= 5 }
  if ($r.note -match "三两|中份|大碗")        { $sc += 3 }
  if ($r.note -match "大份|加大")             { $sc += 6 }
  if ($r.grp  -match "炒菜")                  { $sc += 5 }
  return $sc + $r.price / 100.0
}
$dishes = @()
$id = $StartId
foreach ($g in ($kept | Group-Object stall, name)) {
  $cands = @($g.Group | Sort-Object { variantScore $_ })
  $canon = $cands[0]
  $alt = @()
  foreach ($c in $cands[1..($cands.Count-1)]) {
    if (-not $c) { continue }
    $spec = (($c.grp, $c.note | Where-Object { $_ }) -join "")
    $alt += (($spec, $c.ptext | Where-Object { $_ }) -join "")
  }
  $altText = ($alt | Select-Object -Unique) -join "；"

  $cat   = mapCategory $canon.grp $canon.name
  # staging 可显式指定 spicy / main 覆盖推断（如称重档口味可选）
  $spicy = if ($null -ne $canon.spicyOv) { [int]$canon.spicyOv } else { inferSpicy $canon.name }
  $mainV = if ($canon.mainOv) { $canon.mainOv } else { inferMain $canon.name }
  $veg   = ($mainV -eq "素")   # 与主料保持一致（蛋算荤）
  $icon  = $iconMap[$cat]; if (-not $icon) { $icon = "utensils" }
  $cal   = $calMap[$cat];  if (-not $cal)  { $cal = 500 }

  $taste = @()
  if ($spicy -eq 1) { $taste += "微辣" }
  if ($spicy -eq 2) { $taste += "中辣" }
  if ($spicy -eq 3) { $taste += "麻辣" }
  if ($canon.name -match "酸") { $taste += "微酸" }
  # 菜名口味关键词：甜味系（含鱼香/糖醋/宫保/蜜汁等咸甜口）与甜品饮品兜底
  if ($canon.name -match "鱼香|糖醋|宫保|蜜汁|茄汁|拔丝|甜|双皮奶|龟苓膏|汤圆|布丁|冰粉|西米露|糖水|蛋糕|红豆沙|绿豆沙|银耳") {
    if (-not ($taste -contains "甜")) { $taste += "甜" }
  }
  if ($cat -eq "甜品饮品" -and -not ($taste -contains "甜") -and $canon.name -notmatch "咸|卤|辣") { $taste += "甜" }
  if ($canon.name -match "番茄|三鲜|清汤") { $taste += "清淡" }
  if ($taste.Count -eq 0) { $taste = @("咸香") }

  $tags = @()
  if ($canon.price -le 8) { $tags += "性价比" }
  if ($cal -le 350) { $tags += "低卡" }
  if ($veg) { $tags += "素食友好" }
  if ($cal -ge 500) { $tags += "管饱" }

  $grpLabel = if ($canon.grp) { $canon.grp } else { "招牌" }
  $desc = "「$grpLabel」之选"
  if ($altText) { $desc += "（另有：$altText）" }
  $desc += "，约 $cal kcal"

  $dishes += [PSCustomObject]@{
    id = $id; name = $canon.name; category = $cat; icon = $icon
    taste = $taste; flavors = (inferFlavors $canon.name $spicy $cat $taste)
    price = $canon.price; cal = $cal; tags = $tags
    desc = $desc; veg = $veg; spicy = $spicy
    main = $mainV; portion = (inferPortion $canon.name $canon.note)
    stall = $canon.stall; canteen = ($canon.stall -replace "^.*_", "") + "餐厅"
    img = ""; rawGroup = $canon.grp
  }
  $id++
}

$outFull = Join-Path $PSScriptRoot $OutPath
# PowerShell 5.1 的 ConvertTo-Json 会把单元素数组压成字符串、空数组写成 {}，
# 这里把 flavors 统一修回数组，前端可以直接做包含判断。
$jsonOut = ($dishes | ConvertTo-Json -Depth 10)
$jsonOut = $jsonOut -replace '"flavors":\s*\{\s*\}', '"flavors": []'
$jsonOut = $jsonOut -replace '"flavors":\s*"([^"]*)"', '"flavors": ["$1"]'
[IO.File]::WriteAllText($outFull, $jsonOut, [Text.UTF8Encoding]::new($true))
Write-Host "合并规格后菜品：$($dishes.Count) ｜ 输出：$outFull" -ForegroundColor Green
$dishes | Group-Object stall | Sort-Object Count -Descending | Format-Table Name, Count -AutoSize
