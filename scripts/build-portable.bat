@echo off
chcp 65001 >nul
echo ========================================
echo   Village System — Build Script
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%.."
set "DIST=%ROOT%\dist\village-system"

:: 1. Clean old build
echo [1/6] Cleaning old build...
if exist "%ROOT%\.next" rmdir /s /q "%ROOT%\.next"
if exist "%ROOT%\dist" rmdir /s /q "%ROOT%\dist"

:: 2. Install dependencies
echo [2/6] Installing dependencies...
cd /d "%ROOT%"
call npm install
if %errorlevel% neq 0 ( echo npm install failed && pause && exit /b 1 )

:: 3. Generate init-db.sql from Prisma schema (must be done before build)
echo [3/6] Generating database SQL...
call npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "%SCRIPT_DIR%init-db.sql" 2>&1
if %errorlevel% neq 0 ( echo SQL generation failed && pause && exit /b 1 )
echo SQL generated: scripts/init-db.sql

:: 4. Build
echo [4/6] Building project...
call npx next build
if %errorlevel% neq 0 ( echo Build failed && pause && exit /b 1 )

:: 5. Copy files to dist
echo [5/6] Assembling package...
mkdir "%DIST%" 2>nul

:: standalone output
xcopy /e /i /y "%ROOT%\.next\standalone\*" "%DIST%\"

:: .next static files
xcopy /e /i /y "%ROOT%\.next\static" "%DIST%\.next\static"

:: .next required files (BUILD_ID, manifests, server chunks)
copy /y "%ROOT%\.next\BUILD_ID" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\build-manifest.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\routes-manifest.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\prerender-manifest.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\react-loadable-manifest.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\required-server-files.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\app-build-manifest.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\app-path-routes-manifest.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\images-manifest.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\export-marker.json" "%DIST%\.next\" >nul
copy /y "%ROOT%\.next\package.json" "%DIST%\.next\" >nul
xcopy /e /i /y "%ROOT%\.next\server" "%DIST%\.next\server"

:: prisma files
mkdir "%DIST%\prisma" 2>nul
copy /y "%ROOT%\prisma\schema.prisma" "%DIST%\prisma\schema.prisma" >nul
copy /y "%ROOT%\prisma\seed.js" "%DIST%\prisma\seed.js" >nul

:: scripts (including init-db.sql generated in step 3)
xcopy /e /i /y "%SCRIPT_DIR%" "%DIST%\scripts"

:: bcryptjs — required by seed.js (standalone bundles it into server chunks)
xcopy /e /i /y "%ROOT%\node_modules\bcryptjs" "%DIST%\node_modules\bcryptjs"

:: root-level files
copy /y "%ROOT%\启动系统.bat" "%DIST%\" >nul
copy /y "%ROOT%\系统自检.bat" "%DIST%\" >nul
copy /y "%ROOT%\安装须知.txt" "%DIST%\" >nul
copy /y "%ROOT%\★使用说明-请先读我★.txt" "%DIST%\" >nul
copy /y "%ROOT%\.env" "%DIST%\.env.example" >nul
xcopy /e /i /y "%ROOT%\public" "%DIST%\public"

:: 6. Create password-protected zip
echo [6/6] Creating zip package...
python -c "
import zipfile, os
zip_path = r'%ROOT%\dist\驻村帮扶管理系统-V1.3.zip'
src_dir = r'%DIST%'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.setpassword(b'2026')
    for root, dirs, files in os.walk(src_dir):
        for f in files:
            fp = os.path.join(root, f)
            an = os.path.relpath(fp, src_dir)
            zf.write(fp, an)
print('Zip created with password')
" 2>&1

if %errorlevel% neq 0 (
    echo Python zip failed, using PowerShell fallback...
    powershell -Command "Compress-Archive -Path '%DIST%\*' -DestinationPath '%ROOT%\dist\驻村帮扶管理系统-V1.3.zip' -Force"
)

echo.
echo ========================================
echo   Build complete!
echo   %ROOT%\dist\驻村帮扶管理系统-V1.3.zip
echo   Password: 2026
echo ========================================
echo.

pause
