# ============================================================
# 数据清洗脚本：原始 API 数据 → 前端统一 Schema
# 项目：今天吃啥 what-to-eat
# 输入：data/raw/cqcst-shops.json + data/raw/cqcst-menus.json
# 输出：data/cqcst.json
# ============================================================

param(
  [string]$School = "重庆城市科技学院",
  [string]$AreaCode = "10169588",
  [string]$Prefix = "cqcst"
)

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "..\what-to-eat"
$raw  = Join-Path $root "data\raw"
$out  = Join-Path $root "data"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$EXCLUDED_GROUPS = @("家居日用", "啤酒", "饮用水")

# ---- 加载原始数据 ----
$shops = Get-Content (Join-Path $raw "$Prefix-shops.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$menus = Get-Content (Join-Path $raw "$Prefix-menus.json") -Raw -Encoding UTF8 | ConvertFrom-Json

# ---- 辅助函数 ----
function Split-Canteen($shopName) {
  if ($shopName -match '^(.*)_(.+)$') {
    return @{ stall = $matches[1]; canteen = $matches[2] }
  }
  return @{ stall = $shopName; canteen = "独立档口" }
}

function F2Y($fen) {
  if ($null -eq $fen) { return $null }
  return [math]::Round([double]$fen / 100, 1)
}

# ---- 逐档口清洗 ----
$stallMap = @{}
$totals = @{ stalls = 0; dishes = 0; canteens = 0 }

foreach ($s in $shops) {
  $mno = "$($s.merchant_no)"
  $menu = $menus.$mno
  $sp = Split-Canteen $s.shop_name
  $canteenName = $sp.canteen
  $stallName   = $sp.stall

  # 标签：从 tag_bean 抽取
  $tags = @()
  if ($s.tag_bean -and $s.tag_bean.special_tag) { $tags += @($s.tag_bean.special_tag) }
  if ($s.bright_kitchen_status -eq 1) { $tags += "明厨亮灶" }

  # 菜品清洗
  $dishes = @()
  if ($menu -and $menu.foods) {
    foreach ($f in $menu.foods) {
      $gn = "$($f.group_name)"
      if ($EXCLUDED_GROUPS -contains $gn) { continue }

      $price = F2Y $f.food_price
      $disc  = F2Y $f.food_discount_price
      $orig  = if ($disc -and $disc -ne $price -and $disc -lt $price) { $price } else { $null }
      $pay   = if ($disc -and $disc -lt $price) { $disc } else { $price }

      $dishes += @{
        name         = $f.food_name
        price        = $pay
        originalPrice = $orig
        desc         = $f.food_introduce
        img          = $f.food_img_url
        group        = $gn
        unit         = $f.unit_type
        packFee      = F2Y $f.pack_fee
        sales        = $f.sell_num
        code         = $f.food_code
        isSignature  = ($f.rank -eq 1)
      }
    }
  }

  $stall = @{
    id      = $mno
    name    = $stallName
    code    = "$($s.shop_code)"
    rating  = [double]$s.shop_grade
    sales   = [int]$s.sale_num
    hours   = "$($s.business_begin_time)-$($s.business_end_time)"
    address = $s.shop_address
    logo    = $s.logo_img_url
    tags    = $tags
    dishes  = $dishes
  }

  if (-not $stallMap.ContainsKey($canteenName)) { $stallMap[$canteenName] = @() }
  $stallMap[$canteenName] += $stall
  $totals.stalls++
  $totals.dishes += $dishes.Count
}

# ---- 组装输出 ----
$canteens = @()
foreach ($name in $stallMap.Keys) {
  $canteens += @{ name = $name; stalls = $stallMap[$name] }
}
$totals.canteens = $canteens.Count

$result = @{
  school      = $School
  areaCode    = $AreaCode
  generatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
  source      = "lcsw-api"
  canteens    = $canteens
  stats       = $totals
}

$outPath = Join-Path $out "$Prefix.json"
[System.IO.File]::WriteAllText($outPath, ($result | ConvertTo-Json -Depth 10), [System.Text.Encoding]::UTF8)
Write-Host "已输出: $outPath" -ForegroundColor Green
Write-Host "  食堂 $($totals.canteens) 个，档口 $($totals.stalls) 个，菜品 $($totals.dishes) 条" -ForegroundColor Cyan
