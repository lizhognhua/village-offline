# 驻村帮扶管理系统 — 创建桌面快捷方式
# 由 启动系统.bat 在首次启动时调用

$ErrorActionPreference = "SilentlyContinue"

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutName = "驻村工作队管理系统.lnk"
$shortcutPath = Join-Path $desktop $shortcutName

# 已存在则跳过
if (Test-Path $shortcutPath) {
    exit 0
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$batPath = Join-Path $rootDir "启动系统.bat"
$iconPath = Join-Path $rootDir "public\favicon.ico"

if (-not (Test-Path $batPath)) {
    exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $rootDir
$shortcut.Description = "驻村工作队管理系统"
$shortcut.WindowStyle = 7

if (Test-Path $iconPath) {
    $shortcut.IconLocation = $iconPath
}

$shortcut.Save()

Write-Output "桌面快捷方式已创建: $shortcutPath"
