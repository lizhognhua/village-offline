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
    echo   Node.js not found!
    echo   Please run system-check.bat first
    echo   to diagnose the problem.
    echo ========================================
    pause
    exit /b 1
)

:: Check port 3000
netstat -ano 2>nul | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ========================================
    echo   Port 3000 is already in use!
    echo   The system may not have shut down
    echo   properly. Please close all command
    echo   prompt windows and try again,
    echo   or restart your computer.
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
echo   Village Assistance System
echo ==============================================
echo.
echo   LAN access (other computers on same network):
echo.
echo        http://%LOCAL_IP%:3000
echo.
echo   This computer: http://localhost:3000
echo ==============================================
echo.

:: First run initialization
if not exist "%~dp0data\village.db" (
    echo ========================================
    echo   First run - initializing system...
    echo   Please wait (about 30-60 seconds)
    echo ========================================
    echo.
    %NODE% scripts\setup.js
    if %errorlevel% neq 0 (
        echo.
        echo Initialization failed! Please check
        echo disk space and write permissions.
        pause
        exit /b 1
    )
    echo.
    echo Initialization complete!
    echo.
)

:: Start server with LAN support
title Village Assistance System - http://%LOCAL_IP%:3000
echo Starting system...
echo Your browser will open automatically.
echo Other computers please visit http://%LOCAL_IP%:3000
echo.
echo * Allow firewall access if prompted
echo * Do NOT double-click server.js directly
echo * Close this window to stop the system
echo.

set HOSTNAME=0.0.0.0
:: Set absolute DATABASE_URL for SQLite
set "DB_PATH=%CD%\data\village.db"
set "DB_PATH=%DB_PATH:\=/%"
set "DATABASE_URL=file:%DB_PATH%"
start http://localhost:3000
%NODE% server.js

echo.
echo System stopped. Double-click start.bat to run again.
pause
