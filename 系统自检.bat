@echo off
chcp 65001 >nul
title 驻村帮扶管理系统 — 系统自检
cd /d "%~dp0"

echo ==============================================
echo   驻村帮扶管理系统 — 系统环境自检
echo ==============================================
echo.
echo 正在检测系统环境，请稍候...
echo.

:: Check if powershell is available
powershell -Command "Write-Host ''" >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 系统不支持 PowerShell，无法运行自检。
    echo 请使用 Windows 7 或更高版本的操作系统。
    echo.
    pause
    exit /b 1
)

:: Run the PowerShell self-check script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\系统自检.ps1"

:: If ps1 not found in scripts, try current directory
if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0系统自检.ps1" 2>nul
)

echo.
echo ==============================================
echo   自检完成。
echo   详细报告请查看「安装建议.txt」
echo ==============================================
echo.
pause
