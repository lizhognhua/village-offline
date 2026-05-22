@echo off
chcp 65001 >nul
title 驻村帮扶管理系统
cd /d "%~dp0"

:: 检查 Node.js
set NODE=node
if exist "%~dp0nodejs\node.exe" set NODE="%~dp0nodejs\node.exe"

:: 首次运行初始化
if not exist "%~dp0data\village.db" (
    echo ========================================
    echo   首次运行 - 正在初始化系统...
    echo   请稍候，这可能需要 30 秒到 1 分钟
    echo ========================================
    echo.
    %NODE% scripts\setup.js
    if %errorlevel% neq 0 (
        echo.
        echo ⚠ 初始化失败，请检查是否有杀毒软件拦截
        echo 按任意键退出...
        pause >nul
        exit /b 1
    )
    echo.
    echo 初始化完成！系统即将启动...
    echo.
)

:: 启动服务
echo 正在启动驻村帮扶管理系统...
start http://localhost:3000
%NODE% server.js

pause
