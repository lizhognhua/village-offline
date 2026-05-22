@echo off
chcp 65001 >nul
title 驻村帮扶管理系统 — 系统自检
cd /d "%~dp0"

:: 检查 PowerShell 是否可用
powershell -Command "Write-Host ''" >nul 2>&1
if %errorlevel% neq 0 (
    echo 系统不支持 PowerShell，无法运行自检。
    echo Windows XP 或精简版系统请手动检查磁盘空间。
    pause
    exit /b 1
)

:: 运行自检脚本
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0系统自检.ps1"
