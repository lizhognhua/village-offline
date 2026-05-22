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

:: Check port 3000
netstat -ano 2>nul | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ========================================
    echo   端口 3000 已被占用！
    echo   可能是上次系统没有正常关闭。
    echo   请关闭所有命令行窗口后重试，
    echo   或重启电脑后重新运行。
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
echo   驻村帮扶管理系统
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
        echo 初始化失败！请检查磁盘空间和写入权限。
        pause
        exit /b 1
    )
    echo.
    echo 初始化完成！
    echo.
)

:: Start server with LAN support
title 驻村帮扶管理系统 — http://%LOCAL_IP%:3000
echo 正在启动系统...
echo 本机浏览器将自动打开，其他电脑请访问 http://%LOCAL_IP%:3000
echo.
echo ★ 首次弹出防火墙提示请点击「允许访问」
echo ★ 请勿直接双击 server.js 文件
echo ★ 关闭此窗口即停止系统
echo.

:: Set host to 0.0.0.0 for LAN access
set HOSTNAME=0.0.0.0
start http://localhost:3000
%NODE% server.js

echo.
echo 系统已停止。再次使用请双击「启动系统.bat」
pause
