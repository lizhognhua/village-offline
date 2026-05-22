import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { createBackup } from "@/lib/backup";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "缺少下载地址" }, { status: 400 });
    }

    // 1. 自动备份数据
    const backupDir = join(process.cwd(), "data", "backups");
    await mkdir(backupDir, { recursive: true });
    const backupBuf = await createBackup();
    const backupName = `auto-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    await writeFile(join(backupDir, backupName), backupBuf);

    // 2. 下载新版本
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);
    const fullUrl = url.startsWith("http") ? url : `https://zc.lizhonghua.vip:8002${url}`;
    const resp = await fetch(fullUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      return NextResponse.json({ error: "下载新版本失败" }, { status: 500 });
    }

    const zipBuf = Buffer.from(await resp.arrayBuffer());
    const tmpZip = join(process.cwd(), "data", "_update.zip");
    await writeFile(tmpZip, zipBuf);

    // 3. 生成 update.bat
    const batContent = `@echo off
chcp 65001 >nul
title 驻村帮扶管理系统 — 升级中...
echo.
echo   驻村帮扶管理系统 — 在线升级
echo   ================================
echo.
echo   正在等待系统退出...
timeout /t 3 /nobreak >nul

cd /d "%~dp0"

echo   正在解压更新包...
:: Use PowerShell to extract
powershell -NoProfile -Command "Expand-Archive -Force -Path '%~dp0data\\_update.zip' -DestinationPath '%~dp0_update_tmp'" 2>nul

if not exist "%~dp0_update_tmp" (
    echo   解压失败！请手动解压 data\\_update.zip 覆盖系统文件
    echo   然后重新运行 启动系统.bat
    pause
    exit /b 1
)

echo   正在替换文件（保留数据）...

:: Copy new files, excluding data and the update temp
xcopy /e /i /y "%~dp0_update_tmp\\*" "%~dp0" 2>nul

:: Clean up
rmdir /s /q "%~dp0_update_tmp" 2>nul
del "%~dp0data\\_update.zip" 2>nul

echo   升级完成！正在启动系统...
timeout /t 1 /nobreak >nul

start "" "%~dp0启动系统.bat"

:: Self-delete
del "%~f0" 2>nul
exit
`;

    await writeFile(join(process.cwd(), "update.bat"), batContent);

    return NextResponse.json({
      success: true,
      message: `升级包已下载（${(zipBuf.length / 1024 / 1024).toFixed(1)}MB），备份已保存。系统即将退出并开始升级。`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "升级失败: " + (e.message || "未知错误") }, { status: 500 });
  }
}
