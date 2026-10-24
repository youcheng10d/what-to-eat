# ============================================================
# 学府e生活（LCSW SaaS）菜单采集脚本
# 项目：今天吃啥 what-to-eat ｜ 详见 docs/api-recon.md
#
# 用法（每次采集前必做）：
#   1. PC 微信打开“学府e生活”小程序，Reqable 抓包
#   2. 从任意 API 请求头复制新的 Authorization(JWT) 和 OpenID
#   3. 填入下方配置区，运行：powershell -File tools\collect-lcsw.ps1
#   注意：JWT 有效期仅 3 小时
# ============================================================

param(
  # ---------- 配置区：每次采集前从 Reqable 复制新值粘贴到这里 ----------
  [string]$Token  = "",   # Authorization 头的 JWT（有效期仅 3 小时）
  [string]$OpenId = "",   # OpenID 头
  # ---------- 学校配置：换学校改这两个值 ----------
  [string]$AreaCode = "10169588",   # 重庆城市科技学院
  [double]$Lng = 106.55072784423828,
  [double]$Lat = 29.56471061706543,
  [string]$School = "cqcst",        # 输出文件名前缀
  # ---------- 行为开关 ----------
  [switch]$SkipMenu,                # 只采档口骨架，跳过完整菜单
  [int]$DelayMs = 1200              # 请求间隔，防 WAF
)

$ErrorActionPreference = "Stop"
$AppId = "wx5b480af3c73f466f"
$Base  = "https://api-order.lcsw.cn"
$OutDir = Join-Path $PSScriptRoot "..\what-to-eat\data\raw"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Headers = @{
  "Authorization" = $Token
  "OpenID"        = $OpenId
  "Appid"         = $AppId
  "Content-Type"  = "application/json;charset=UTF-8"
  "User-Agent"    = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541d3f) XWEB/25558"
  "Referer"       = "https://servicewechat.com/$AppId/59/page-frame.html"
}

# PS5.1 对无 charset 的 UTF-8 响应会乱码，统一走字节流 + UTF8 解码
function Invoke-Api($path, $bodyObj) {
  $body = $bodyObj | ConvertTo-Json -Compress -Depth 10
  $resp = Invoke-WebRequest -Uri "$Base$path" -Method Post -Headers $Headers `
          -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
  $text = [System.Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray())
  return ($text | ConvertFrom-Json)
}

# ============ 阶段 1：分页采集档口列表（自带每档口 4 个推荐菜） ============
Write-Host "== 阶段 1：档口列表 ==" -ForegroundColor Cyan
$shops = @()
$seen = @{}
$page = 0
$staleStreak = 0
do {
  $resp = Invoke-Api "/mini/shop/queryShopList" @{
    longitude = $Lng; latitude = $Lat; page_num = $page
    area_code = $AreaCode; query_type = 0
    activity_type_list = @(); close_flag = 0; show_type = 0
    wave_time = ""; phone = ""; mini_type = 1
  }
  if (-not $resp.success) { throw "queryShopList 失败：$($resp | ConvertTo-Json -Compress -Depth 3)" }
  $list = @($resp.data.list)
  $newCount = 0
  foreach ($s in $list) {
    if (-not $seen.ContainsKey("$($s.merchant_no)")) { $seen["$($s.merchant_no)"] = $true; $shops += $s; $newCount++ }
  }
  if ($newCount -eq 0) { $staleStreak++ } else { $staleStreak = 0 }
  Write-Host ("  第 {0} 页：{1} 条，新增 {2}（累计 {3}）" -f $page, $list.Count, $newCount, $shops.Count)
  $page++
  Start-Sleep -Milliseconds $DelayMs
} while ($staleStreak -lt 2 -and $page -lt 30)

Write-Host ("档口总数（去重后）：{0}" -f $shops.Count) -ForegroundColor Green

$shopsFile = Join-Path $OutDir "$School-shops.json"
[System.IO.File]::WriteAllText($shopsFile, ($shops | ConvertTo-Json -Depth 10), [System.Text.Encoding]::UTF8)
Write-Host "已保存：$shopsFile"

if ($SkipMenu) { Write-Host "跳过菜单采集。"; exit 0 }

# ============ 阶段 2：逐档口采集完整菜单 ============
# 链路：getGoodsGroupList(拿分组) → 逐分组 getMchGoodsListV2(翻页)
Write-Host "`n== 阶段 2：完整菜单 ==" -ForegroundColor Cyan
$menus = @{}
$fail = @()
$i = 0
foreach ($s in $shops) {
  $i++
  $mno = "$($s.merchant_no)"; $scode = "$($s.shop_code)"; $name = $s.shop_name
  try {
    # 2a. 拿菜品分组
    $gresp = Invoke-Api "/api/merchant/getGoodsGroupList" @{
      api_version = "103"; code_type = 2; desk_code = $scode; eat_type = 2
      shop_code = $scode; merchant_no = $mno
      openid = $OpenId; mini_type = 1; wave_time = $null
    }
    if (-not $gresp.success) { throw "getGoodsGroupList 失败" }
    $groups = @($gresp.data)
    Start-Sleep -Milliseconds $DelayMs

    # 2b. 逐分组翻页采菜品
    $foods = @()
    $foodSeen = @{}
    foreach ($g in $groups) {
      $gid = $g.group_id
      $mpage = 1
      do {
        $resp = Invoke-Api "/api/merchant/getMchGoodsListV2" @{
          api_version = "103"; code_type = 2
          desk_code = $scode; eat_type = 2
          groupId = $gid; wave_time = $null
          page_size = 50; page_num = $mpage
          shop_code = $scode; merchant_no = $mno
          food_code = ""; openid = $OpenId; mini_type = 1
        }
        if (-not $resp.success) { break }
        $flist = @($resp.data.food_list)
        foreach ($f in $flist) {
          $fk = "$($f.food_code)"
          if (-not $foodSeen.ContainsKey($fk)) { $foodSeen[$fk] = $true; $f | Add-Member -NotePropertyName group_name -NotePropertyValue $g.group_name -Force; $foods += $f }
        }
        $more = ([int]$resp.data.is_last_page -eq 0) -and ($flist.Count -gt 0) -and ($mpage -lt 10)
        $mpage++
        if ($more) { Start-Sleep -Milliseconds $DelayMs }
      } while ($more)
      Start-Sleep -Milliseconds $DelayMs
    }
    $menus[$mno] = @{ shop_name = $name; shop_code = $scode; groups = $groups; foods = $foods }
    Write-Host ("  [{0}/{1}] {2}：{3} 个分组，{4} 个菜品" -f $i, $shops.Count, $name, $groups.Count, $foods.Count)
  } catch {
    $fail += $name
    Write-Host ("  [{0}/{1}] {2}：失败（{3}）" -f $i, $shops.Count, $name, $_.Exception.Message) -ForegroundColor Yellow
  }
  Start-Sleep -Milliseconds $DelayMs
}

$menuFile = Join-Path $OutDir "$School-menus.json"
[System.IO.File]::WriteAllText($menuFile, ($menus | ConvertTo-Json -Depth 10), [System.Text.Encoding]::UTF8)
Write-Host "已保存：$menuFile" -ForegroundColor Green
if ($fail.Count -gt 0) {
  Write-Host ("失败档口 {0} 个：{1}" -f $fail.Count, ($fail -join "、")) -ForegroundColor Yellow
  Write-Host "若大量失败，需补抓 getGoodsGroupList 的 cURL 确认分组参数。"
}
Write-Host "`n采集完成。"
