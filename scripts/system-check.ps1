# Village Assistance System — Environment Check
# Called by system-check.bat

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path $ScriptDir -Parent
$ReportPath = Join-Path $RootDir "install-guide.txt"
$Issues = 0
$BestDrive = "C:\"
$BestFree = 0.0

# 删除旧报告
Remove-Item $ReportPath -ErrorAction SilentlyContinue

function Write-Report($line) {
    Add-Content $ReportPath $line -Encoding UTF8
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  驻村帮扶管理系统 — 系统环境自检" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$now = Get-Date -Format "yyyy-MM-dd HH:mm"
Write-Report "=============================================="
Write-Report "  驻村帮扶管理系统 — 安装建议报告"
Write-Report "  生成时间: $now"
Write-Report "=============================================="
Write-Report ""

# ========== 1. 磁盘空间 ==========
Write-Host "[1/4] 检测磁盘可用空间..." -ForegroundColor Yellow
Write-Report "─── 磁盘空间检测 ───"

Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $free = [math]::Round($_.FreeSpace / 1GB, 1)
    $total = [math]::Round($_.Size / 1GB, 1)
    $pct = if ($total -gt 0) { [math]::Round($_.FreeSpace / $_.Size * 100, 0) } else { 0 }
    $line = "  $($_.DeviceID) 可用: ${free}GB / 总计: ${total}GB (${pct}% 可用)"
    Write-Host $line
    Write-Report $line

    if ($free -lt 1) {
        Write-Host "    !! 空间严重不足，不建议安装在此盘" -ForegroundColor Red
        Write-Report "    !! 空间严重不足，不建议安装在此盘"
        $script:Issues++
    }
    if ($free -gt $script:BestFree) {
        $script:BestFree = $free
        $script:BestDrive = $_.DeviceID
    }
}

# ========== 2. 端口检测 ==========
Write-Host ""
Write-Host "[2/4] 检测端口 3000..." -ForegroundColor Yellow
Write-Report ""
Write-Report "─── 端口检测 ───"

$portUsed = netstat -ano 2>$null | Select-String ":3000 .*LISTENING"
if ($portUsed) {
    $line = "  !! 端口 3000 已被占用！请关闭占用程序后重试"
    Write-Host $line -ForegroundColor Red
    Write-Report $line
    $Issues++
} else {
    $line = "  ✓ 端口 3000 可用"
    Write-Host $line -ForegroundColor Green
    Write-Report $line
}

# ========== 3. 内存检测 ==========
Write-Host ""
Write-Host "[3/4] 检测系统内存..." -ForegroundColor Yellow
Write-Report ""
Write-Report "─── 内存检测 ───"

$ram = Get-CimInstance Win32_ComputerSystem
$ramGB = [math]::Round($ram.TotalPhysicalMemory / 1GB, 1)
$line = "  系统内存: ${ramGB} GB"
Write-Host $line
Write-Report $line
if ($ramGB -lt 4) {
    Write-Report "  内存低于 4GB，系统运行可能较慢"
    $Issues++
}

# ========== 4. 运行环境 ==========
Write-Host ""
Write-Host "[4/4] 检测运行环境..." -ForegroundColor Yellow
Write-Report ""
Write-Report "─── 运行环境 ───"

$NodeExe = if (Test-Path (Join-Path $RootDir "nodejs\node.exe")) {
    Join-Path $RootDir "nodejs\node.exe"
} else { "node" }

try {
    $nv = & $NodeExe --version 2>$null
    $line = "  ✓ Node.js $nv"
    Write-Host $line -ForegroundColor Green
    Write-Report $line
} catch {
    $line = "  !! 未检测到 Node.js 运行时"
    Write-Host $line -ForegroundColor Red
    Write-Report $line
    $Issues++
}

# ========== 综合评估 ==========
Write-Host ""
$rating = if ($Issues -eq 0) { "优秀" } elseif ($Issues -le 2) { "良好" } else { "需注意" }

Write-Report ""
Write-Report "─── 综合评估 ───"
Write-Report "  健康度: $rating (检测到 $Issues 个问题)"
Write-Report ""
Write-Report "─── 安装建议 ───"
Write-Report "  推荐安装位置: ${BestDrive} 目录"
Write-Report "  路径示例: ${BestDrive}village-system\"
Write-Report "  确保文件夹路径不含中文或空格"
Write-Report ""
Write-Report "─── 局域网共享说明 ───"
Write-Report "  系统启动后会自动显示本机局域网 IP 地址"
Write-Report "  同一 WiFi/网线下的其他电脑通过浏览器访问"
Write-Report "  格式: http://主机IP:3000"
Write-Report "  （启动脚本会在窗口标题栏显示完整地址）"
Write-Report ""
Write-Report "─── 操作步骤 ───"
Write-Report "  1. 将此文件夹移动到推荐磁盘"
Write-Report "  2. 双击「启动系统.bat」"
Write-Report "  3. 首次运行自动初始化（约30秒）"
Write-Report "  4. 浏览器自动打开 http://localhost:3000"
Write-Report "  5. 登录: admin / admin123"
Write-Report ""
Write-Report "─── 注意事项 ──"
Write-Report "  • 首次启动需在 Windows 防火墙弹窗中点击「允许访问」"
Write-Report "  • 数据文件存储在 data\ 目录，请定期备份"
Write-Report "  • 系统关机后会自动停止，下次使用需重新双击启动"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  系统健康度: $rating  |  检测到 $Issues 个问题" -ForegroundColor $(if($Issues -eq 0){'Green'}elseif($Issues -le 2){'Yellow'}else{'Red'})
Write-Host "  推荐安装位置: $BestDrive" -ForegroundColor White
Write-Host "  详细报告: install-guide.txt" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
