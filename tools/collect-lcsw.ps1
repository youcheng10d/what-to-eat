# ============================================================
# 学府e生活（LCSW SaaS）菜单采集脚本 v2（P0 版）
# 项目：今天吃啥 what-to-eat ｜ 详见 docs/api-recon.md
#
# 用法：
#   1. PC 微信打开「学府e生活」小程序，用 Reqable 抓一次请求
#   2. 从请求头复制新的 Authorization(JWT) 和 OpenID
#   3. 先跑分页探针（只读，不采菜单）：
#      powershell -File tools\collect-lcsw.ps1 -Token "..." -OpenId "..." -Probe
#   4. 确认 page 起点后再全量采集：
#      powershell -File tools\collect-lcsw.ps1 -Token "..." -OpenId "..." -Resume
#
# 相对旧版：
#   - 店铺分页结束条件改为 is_last_page=1 或本页为空
#   - close_flag=0 / 1 两组都采，按 shop_code 去重
#   - 401 立即停止；普通失败重试 3 次，指数退避
#   - 每店独立落盘，支持 -Resume 断点续采
#   - 错误写入 errors.json，分页探针写入 probe.json
# ============================================================

param(
  [string]$Token  = "",
  [string]$OpenId = "",
  [string]$AreaCode = "10169588",
  [double]$Lng = 106.55072784423828,
  [double]$Lat = 29.56471061706543,
  [string]$School = "cqcst",
  [switch]$SkipMenu,
  [switch]$Resume,
  [switch]$Probe,
  [int]$StartPage = 0,
  [int]$DelayMs = 1500,
  [int]$MaxRetries = 3,
  [int]$PageSize = 50,
  [int]$EatType = 2
)

$ErrorActionPreference = "Stop"
$AppId = "wx5b480af3c73f466f"
$Base  = "https://api-order.lcsw.cn"
$OutDir  = Join-Path $PSScriptRoot "..\what-to-eat\data\raw"
$WorkDir = Join-Path $OutDir $School
$MenuDir = Join-Path $WorkDir "menus"
if (-not $Token -or -not $OpenId) {
  Write-Host "缺少 -Token 或 -OpenId。请先从小程序请求头复制这两个值。" -ForegroundColor Yellow
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir  | Out-Null
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
New-Item -ItemType Directory -Force -Path $MenuDir | Out-Null

$Headers = @{
  "Authorization" = $Token
  "OpenID"        = $OpenId
  "Appid"         = $AppId
  "Content-Type"  = "application/json;charset=UTF-8"
  "User-Agent"    = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541d3f) XWEB/25558"
  "Referer"       = "https://servicewechat.com/$AppId/59/page-frame.html"
}

# 解析 JWT 到期时间，避免拿着过期 token 跑半天
function Get-TokenExpiry([string]$jwt) {
  try {
    $parts = $jwt.Split(".")
    if ($parts.Count -lt 2) { return $null }
    $p = $parts[1].Replace("-", "+").Replace("_", "/")
    $mod = $p.Length % 4
    if ($mod -eq 2) { $p += "==" } elseif ($mod -eq 3) { $p += "=" }
    $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p)) | ConvertFrom-Json
    if (-not $json.exp) { return $null }
    return ([datetime]"1970-01-01T00:00:00Z").AddSeconds([double]$json.exp).ToLocalTime()
  } catch {
    return $null
  }
}

$tokenExp = Get-TokenExpiry $Token
if ($tokenExp) {
  $leftMin = [math]::Round(($tokenExp - (Get-Date)).TotalMinutes, 0)
  Write-Host ("Token 到期：{0}（剩余约 {1} 分钟）" -f $tokenExp, $leftMin) -ForegroundColor DarkCyan
  if ($leftMin -lt 10) { Write-Host "Token 即将过期，建议重新抓一次。" -ForegroundColor Yellow }
}

# PS5.1 对无 charset 的 UTF-8 响应会乱码，统一走字节流 + UTF8 解码
function Invoke-Api {
  param(
    [string]$Path,
    [hashtable]$Body,
    [int]$Retries = $MaxRetries
  )
  $json = $Body | ConvertTo-Json -Compress -Depth 10
  $attempt = 0
  while ($true) {
    try {
      $resp = Invoke-WebRequest -Uri "$Base$Path" -Method Post -Headers $Headers `
              -Body ([Text.Encoding]::UTF8.GetBytes($json)) -UseBasicParsing -TimeoutSec 30
      $text = [Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray())
      $obj = $text | ConvertFrom-Json
      break
    } catch {
      $status = 0
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      if ($status -eq 401) {
        throw "AUTH401: Token 已失效（HTTP 401）"
      }
      $attempt++
      if ($attempt -gt $Retries) {
        throw ("请求失败（HTTP {0}）：{1}" -f $status, $_.Exception.Message)
      }
      $wait = [int][math]::Min(10000, 800 * [math]::Pow(2, $attempt - 1))
      Write-Host ("    重试 {0}/{1}（HTTP {2}），等待 {3}ms" -f $attempt, $Retries, $status, $wait) -ForegroundColor DarkYellow
      Start-Sleep -Milliseconds $wait
    }
  }
  if (-not $obj.success) {
    throw ("接口业务失败：{0}" -f ($obj | ConvertTo-Json -Compress -Depth 2))
  }
  return $obj
}

function Get-ShopPage([int]$Flag, [int]$Page) {
  return Invoke-Api "/mini/shop/queryShopList" @{
    longitude  = $Lng
    latitude   = $Lat
    page_num   = $Page
    area_code  = $AreaCode
    query_type = 0
    activity_type_list = @()
    close_flag = $Flag
    show_type  = 0
    wave_time  = ""
    phone      = ""
    mini_type  = 1
  }
}

# ============ 探针：确认分页起点、页大小和结束标记 ============
if ($Probe) {
  Write-Host "== 分页探针（只读，不采菜单）==" -ForegroundColor Cyan
  $rows = @()
  foreach ($flag in 0, 1) {
    foreach ($p in 0, 1, 2) {
      try {
        $r = Get-ShopPage $flag $p
        $list = @($r.data.list)
        $first = ""
        if ($list.Count -gt 0) { $first = "$($list[0].shop_name)" }
        $row = [PSCustomObject]@{
          close_flag   = $flag
          page_num     = $p
          count        = $list.Count
          is_last_page = [int]$r.data.is_last_page
          first_shop   = $first
        }
        $rows += $row
        Write-Host ("  close_flag={0} page={1}：{2} 条，is_last_page={3}，首条={4}" -f $flag, $p, $list.Count, $row.is_last_page, $first)
      } catch {
        Write-Host ("  close_flag={0} page={1}：失败 {2}" -f $flag, $p, $_.Exception.Message) -ForegroundColor Yellow
      }
      Start-Sleep -Milliseconds $DelayMs
    }
  }
  $probeFile = Join-Path $WorkDir "probe.json"
  [IO.File]::WriteAllText($probeFile, (ConvertTo-Json -InputObject @($rows) -Depth 5), [Text.Encoding]::UTF8)
  Write-Host "探针结果已保存：$probeFile" -ForegroundColor Green
  exit 0
}

# ============ 阶段 1：店铺列表（close_flag 两组 + 双保险分页） ============
Write-Host "== 阶段 1：店铺列表 ==" -ForegroundColor Cyan
$shopMap = @{}
try {
  foreach ($flag in 0, 1) {
    $page = $StartPage
    while ($true) {
      $r = Get-ShopPage $flag $page
      $list = @($r.data.list)
      $isLast = ([int]$r.data.is_last_page -eq 1)
      foreach ($s in $list) {
        $key = "$($s.shop_code)"
        if ([string]::IsNullOrWhiteSpace($key)) { $key = "$($s.merchant_no)" }
        if (-not $shopMap.ContainsKey($key)) {
          $s | Add-Member -NotePropertyName close_flag -NotePropertyValue $flag -Force
          $shopMap[$key] = $s
        }
      }
      Write-Host ("  close_flag={0} 第 {1} 页：{2} 条，累计 {3}" -f $flag, $page, $list.Count, $shopMap.Count)
      if ($list.Count -eq 0 -or $isLast) { break }
      $page++
      if ($page -gt $StartPage + 200) { throw "分页超过 200 页安全上限，已停止" }
      Start-Sleep -Milliseconds $DelayMs
    }
  }
} catch {
  if ($_.Exception.Message -like "AUTH401*") {
    Write-Host "Token 已失效（HTTP 401）。请重新打开小程序抓新 token 后重试。" -ForegroundColor Red
    exit 1
  }
  throw
}

$shops = @($shopMap.Values | Sort-Object shop_name)
$shopsFile = Join-Path $OutDir "$School-shops.json"
[IO.File]::WriteAllText($shopsFile, (ConvertTo-Json -InputObject @($shops) -Depth 20), [Text.Encoding]::UTF8)
Write-Host ("店铺总数（去重后）：{0}，已保存：{1}" -f $shops.Count, $shopsFile) -ForegroundColor Green

if ($SkipMenu) { Write-Host "跳过菜单采集。"; exit 0 }

# ============ 阶段 2：逐店采集菜单（断点 + 错误记录） ============
Write-Host "`n== 阶段 2：完整菜单 ==" -ForegroundColor Cyan
$menus = @{}
$errors = @()
$foodTotal = 0
$authFailed = $false
$total = $shops.Count
$i = 0

foreach ($s in $shops) {
  $i++
  $scode = "$($s.shop_code)"
  $mno   = "$($s.merchant_no)"
  $name  = "$($s.shop_name)"
  $menuFile = Join-Path $MenuDir "$scode.json"

  if ($Resume -and (Test-Path $menuFile)) {
    $cached = Get-Content $menuFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $cachedCount = @($cached.foods).Count
    if ($cachedCount -gt 0) {
      $menus[$scode] = $cached
      $foodTotal += $cachedCount
      Write-Host ("  [{0}/{1}] {2}：断点已有 {3} 道，跳过" -f $i, $total, $name, $cachedCount) -ForegroundColor DarkGray
      continue
    }
  }

  try {
    # 2a. 菜品分组
    $g = Invoke-Api "/api/merchant/getGoodsGroupList" @{
      api_version = "103"
      code_type   = 2
      desk_code   = $scode
      eat_type    = $EatType
      shop_code   = $scode
      merchant_no = $mno
      openid      = $OpenId
      mini_type   = 1
      wave_time   = $null
    }
    $groups = @($g.data)
    Start-Sleep -Milliseconds $DelayMs

    # 2b. 逐分组翻页
    $foods = @()
    $foodSeen = @{}
    foreach ($grp in $groups) {
      $gid = $grp.group_id
      $mpage = 1
      while ($true) {
        $r = Invoke-Api "/api/merchant/getMchGoodsListV2" @{
          api_version = "103"
          code_type   = 2
          desk_code   = $scode
          eat_type    = $EatType
          groupId     = $gid
          wave_time   = $null
          page_size   = $PageSize
          page_num    = $mpage
          shop_code   = $scode
          merchant_no = $mno
          food_code   = ""
          openid      = $OpenId
          mini_type   = 1
        }
        $flist = @($r.data.food_list)
        $isLast = ([int]$r.data.is_last_page -eq 1)
        foreach ($f in $flist) {
          $fk = "$scode|$($f.food_code)"
          if (-not $foodSeen.ContainsKey($fk)) {
            $foodSeen[$fk] = $true
            $f | Add-Member -NotePropertyName group_name -NotePropertyValue $grp.group_name -Force
            $foods += $f
          }
        }
        if ($flist.Count -eq 0 -or $isLast) { break }
        $mpage++
        if ($mpage -gt 50) { throw "菜单分页超过 50 页：$($grp.group_name)" }
        Start-Sleep -Milliseconds $DelayMs
      }
      Start-Sleep -Milliseconds $DelayMs
    }

    $item = [PSCustomObject]@{
      shop_name   = $name
      shop_code   = $scode
      merchant_no = $mno
      groups      = $groups
      foods       = $foods
      collectedAt = (Get-Date).ToString("s")
    }
    [IO.File]::WriteAllText($menuFile, (ConvertTo-Json -InputObject $item -Depth 20), [Text.Encoding]::UTF8)
    $menus[$scode] = $item
    $foodTotal += @($foods).Count
    Write-Host ("  [{0}/{1}] {2}：{3} 个分组，{4} 道菜" -f $i, $total, $name, $groups.Count, @($foods).Count)
  } catch {
    $msg = $_.Exception.Message
    $errors += [PSCustomObject]@{
      shop_code   = $scode
      shop_name   = $name
      stage       = "menu"
      message     = $msg
      at          = (Get-Date).ToString("s")
    }
    $errFile = Join-Path $WorkDir "errors.json"
    [IO.File]::WriteAllText($errFile, (ConvertTo-Json -InputObject @($errors) -Depth 5), [Text.Encoding]::UTF8)
    if ($msg -like "AUTH401*") {
      Write-Host ("  [{0}/{1}] {2}：Token 失效，停止采集" -f $i, $total, $name) -ForegroundColor Red
      $authFailed = $true
      break
    }
    Write-Host ("  [{0}/{1}] {2}：失败（{3}）" -f $i, $total, $name, $msg) -ForegroundColor Yellow
  }
  Start-Sleep -Milliseconds $DelayMs
}

# ============ 收尾：合并菜单、写错误与元信息 ============
$menuOut = Join-Path $OutDir "$School-menus.json"
[IO.File]::WriteAllText($menuOut, (ConvertTo-Json -InputObject $menus -Depth 20), [Text.Encoding]::UTF8)

$errFile = Join-Path $WorkDir "errors.json"
[IO.File]::WriteAllText($errFile, (ConvertTo-Json -InputObject @($errors) -Depth 5), [Text.Encoding]::UTF8)

$tokenExpStr = ""
if ($tokenExp) { $tokenExpStr = $tokenExp.ToString("s") }
$meta = [PSCustomObject]@{
  school      = $School
  areaCode    = $AreaCode
  startPage   = $StartPage
  delayMs     = $DelayMs
  eatType     = $EatType
  shops       = $shops.Count
  menus       = @($menus.Keys).Count
  foods       = $foodTotal
  errors      = @($errors).Count
  tokenExpiry = $tokenExpStr
  finishedAt  = (Get-Date).ToString("s")
}
$metaFile = Join-Path $WorkDir "meta.json"
[IO.File]::WriteAllText($metaFile, (ConvertTo-Json -InputObject $meta -Depth 5), [Text.Encoding]::UTF8)

Write-Host ("`n合并菜单：{0} 家店，{1} 道菜 → {2}" -f @($menus.Keys).Count, $foodTotal, $menuOut) -ForegroundColor Green
if ($errors.Count -gt 0) {
  Write-Host ("失败店铺 {0} 家，明细：{1}" -f @($errors).Count, $errFile) -ForegroundColor Yellow
}
if ($authFailed) {
  Write-Host "因 401 提前停止。重新抓 token 后加 -Resume 续采即可。" -ForegroundColor Red
  exit 1
}
Write-Host "采集完成。" -ForegroundColor Green
