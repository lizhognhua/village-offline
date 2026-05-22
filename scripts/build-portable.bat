@echo off
chcp 65001 >nul
echo ========================================
echo   驻村帮扶管理系统 — 打包脚本
echo ========================================
echo.

set "ROOT=%~dp0"
set "DIST=%ROOT%dist\village-system"

:: 1. 清理旧构建
echo [1/5] 清理旧文件...
if exist "%ROOT%.next" rmdir /s /q "%ROOT%.next"
if exist "%ROOT%dist" rmdir /s /q "%ROOT%dist"

:: 2. 安装依赖
echo [2/5] 安装依赖...
call npm install
if %errorlevel% neq 0 ( echo 依赖安装失败 && pause && exit /b 1 )

:: 3. 构建
echo [3/5] 构建项目...
call npx next build
if %errorlevel% neq 0 ( echo 构建失败 && pause && exit /b 1 )

:: 4. 复制文件到 dist
echo [4/5] 整理发布文件...
mkdir "%DIST%" 2>nul

:: standalone 输出
xcopy /e /i /y "%ROOT%.next\standalone\*" "%DIST%\"
:: static 资源
xcopy /e /i /y "%ROOT%.next\static" "%DIST%\.next\static"

:: 额外文件
copy /y "%ROOT%prisma\schema.prisma" "%DIST%\prisma\schema.prisma" >nul
copy /y "%ROOT%prisma\seed.js" "%DIST%\prisma\seed.js" >nul
xcopy /e /i /y "%ROOT%scripts" "%DIST%\scripts"
copy /y "%ROOT%启动系统.bat" "%DIST%\" >nul
copy /y "%ROOT%.env" "%DIST%\.env.example" >nul
xcopy /e /i /y "%ROOT%public" "%DIST%\public"

:: 5. 打包
echo [5/5] 创建压缩包...
powershell -Command "Compress-Archive -Path '%DIST%\*' -DestinationPath '%ROOT%dist\village-system-portable.zip' -Force"

echo.
echo ========================================
echo   打包完成！
echo   %ROOT%dist\village-system-portable.zip
echo ========================================
echo.
echo 使用说明：
echo 1. 解压到任意文件夹
echo 2. 安装 Node.js（如未安装）
echo 3. 双击 启动系统.bat
echo ========================================

pause
