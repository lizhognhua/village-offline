@echo off
chcp 65001 >nul
title Village Assistance System - Environment Check
cd /d "%~dp0"

powershell -Command "Write-Host ''" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PowerShell is not supported on this system.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0system-check.ps1"
