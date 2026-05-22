@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: Find Node.js
set NODE=node
if exist "%~dp0nodejs\node.exe" set NODE="%~dp0nodejs\node.exe"

:: Verify Node.js
%NODE% --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================
    echo   未检测到 Node.js 运行环境
    echo   请先运行「系统自检.bat」排查问题
    echo ========================================
    pause
    exit /b 1
)

:: Get local IP for LAN access
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4" 2^>nul') do (
    for /f "tokens=1" %%B in ("%%A") do set LOCAL_IP=%%B
    goto :gotip
)
:gotip
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo ==============================================
echo   驻村帮扶管理系统 V1.0
echo ==============================================
echo.
echo   局域网访问地址（其他电脑用浏览器打开）:
echo.
echo        http://%LOCAL_IP%:3000
echo.
echo   本机访问: http://localhost:3000
echo ==============================================
echo.

:: First run initialization
if not exist "%~dp0data\village.db" (
    echo ========================================
    echo   首次运行 — 正在初始化系统...
    echo   请稍候（约30秒到1分钟）
    echo ========================================
    echo.
    %NODE% scripts\setup.js
    if %errorlevel% neq 0 (
        echo.
        echo ⚠ 初始化失败！请检查磁盘空间和写入权限。
        echo 如有问题请先运行「系统自检.bat」
        pause
        exit /b 1
    )
    echo.
    echo ✓ 初始化完成！
    echo.
)

:: Start server with LAN support
title 驻村帮扶管理系统 — http://%LOCAL_IP%:3000
echo 正在启动系统...
echo 浏览器将自动打开，其他电脑请访问 http://%LOCAL_IP%:3000
echo.
echo ★ 首次启动如果弹出 Windows 防火墙提示，请点击「允许访问」
echo.

:: Set host to 0.0.0.0 for LAN access
set HOSTNAME=0.0.0.0
start http://localhost:3000
%NODE% server.js

pause
