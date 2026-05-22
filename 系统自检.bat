@echo off
chcp 65001 >nul
title Village Assistance System - Environment Check
cd /d "%~dp0"

echo ==============================================
echo   Village Assistance System
echo   Environment Check
echo ==============================================
echo.
echo Checking system environment, please wait...
echo.

powershell -Command "Write-Host ''" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PowerShell is not supported on this system.
    echo Please use Windows 7 or later.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\system-check.ps1"

if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0system-check.ps1" 2>nul
)

echo.
echo ==============================================
echo   Check complete.
echo   See install-guide.txt for details.
echo ==============================================
echo.
pause
