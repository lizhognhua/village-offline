@echo off
chcp 65001 >nul 2>&1
set NODE_SKIP_PLATFORM_CHECK=1
cd /d "%~dp0"
set L=%~dp0startup.log
echo Village System V2.0 - Startup Log > %L%
echo ======================================== >> %L%
echo Time: 2026/05/25 周一 10:39:19.89 >> %L%
for /f "tokens=2 delims=[]" %%A in ('ver') do echo Windows: %%A >> %L%
echo ======================================== >> %L%
echo. >> %L%
echo [1/4] Checking Node.js...
echo [CHECK] Node.js runtime >> %L%
set NODE=node
if exist "%~dp0nodejs\node.exe" set NODE="%~dp0nodejs\node.exe"
%NODE% --version >nul 2>&1 || (echo [FAIL] Node.js not found >> %L% & echo ERROR: Node.js not found! & pause & exit /b 1)
for /f "tokens=*" %%A in ('%NODE% --version') do echo [PASS] Node.js %%A >> %L%
echo   [OK] Node.js ready
echo [2/4] Checking port 3000...
echo [CHECK] Port 3000 >> %L%
netstat -ano 2>nul | findstr ":3000" >nul && (echo [INFO] Port 3000 occupied, freeing... >> %L% & for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":3000"') do taskkill /PID %%P /F >nul 2>&1 & timeout /t 2 /nobreak >nul)
echo [PASS] Port 3000 available >> %L%
echo   [OK] Port 3000 available
echo [3/4] Getting network address...
echo [CHECK] Network >> %L%
set LOCAL_IP=127.0.0.1
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4" 2^>nul') do for /f "tokens=1" %%B in ("%%A") do set LOCAL_IP=%%B & goto :gotip
:gotip
echo [INFO] LAN IP: %LOCAL_IP% >> %L%
echo   [OK] IP: %LOCAL_IP%
echo [4/4] Checking database...
echo [CHECK] Database >> %L%
if not exist "%~dp0data\village.db" (
    echo   First run - initializing...
    echo [INIT] First run >> %L%
    %NODE% scripts\setup.js >> %L% 2>&1 || (echo [FAIL] Init failed >> %L% & echo ERROR: Init failed! Check startup.log for details. & pause & exit /b 1)
    echo [PASS] Init complete >> %L%
) else (echo [PASS] DB exists >> %L%)
echo   [OK] Database ready
set "DB_PATH=%~dp0data\village.db"
set "DB_PATH=%DB_PATH:\=/%"
set "DATABASE_URL=file:%DB_PATH%"
echo [INFO] DB URL: %DATABASE_URL% >> %L%
echo.
echo ==============================================
echo   Village System V2.0
echo   LAN : http://%LOCAL_IP%:3000
echo   Local: http://localhost:3000
echo   Log : startup.log
echo ==============================================
echo.
echo Starting... Close this window to stop.
echo.
echo [START] http://%LOCAL_IP%:3000 >> %L%
echo Status: STARTUP SUCCESS >> %L%
title Village V2.0 - http://%LOCAL_IP%:3000
set HOSTNAME=0.0.0.0
REM Create desktop shortcut on first run
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\create-shortcut.ps1" >nul 2>&1
start http://localhost:3000
%NODE% server.js
echo.
echo System stopped.
pause
