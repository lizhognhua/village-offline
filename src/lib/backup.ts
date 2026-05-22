// 数据备份/恢复核心逻辑
import { readdir, readFile, stat, mkdir, copyFile, unlink, rmdir as rmDir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";
import AdmZip from "adm-zip";

const DATA_DIR = join(process.cwd(), "data");
const BACKUP_DIR = join(DATA_DIR, "backups");

// 需要备份的目录（相对于 data/）
const INCLUDE_DIRS = ["uploads", "photos", "files"];
const DB_FILE = "village.db";

/**
 * 获取备份信息
 */
export async function getBackupInfo() {
  const info: any = {
    dbSize: 0,
    fileCount: 0,
    totalSize: 0,
    lastBackup: null,
  };

  // 数据库大小
  const dbPath = join(DATA_DIR, DB_FILE);
  if (existsSync(dbPath)) {
    const s = await stat(dbPath);
    info.dbSize = s.size;
    info.totalSize += s.size;
  }

  // 统计上传文件
  for (const dir of INCLUDE_DIRS) {
    const p = join(DATA_DIR, dir);
    if (existsSync(p)) {
      await countFiles(p, info);
    }
  }

  // 上次备份时间
  if (existsSync(BACKUP_DIR)) {
    const backups = await readdir(BACKUP_DIR).catch(() => [] as string[]);
    const zipFiles = backups.filter(f => f.endsWith(".zip")).sort().reverse();
    if (zipFiles.length > 0) {
      info.lastBackup = zipFiles[0].replace(".zip", "").replace("backup-", "");
    }
  }

  return info;
}

async function countFiles(dir: string, info: any) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      await countFiles(p, info);
    } else {
      const s = await stat(p);
      info.fileCount++;
      info.totalSize += s.size;
    }
  }
}

/**
 * 创建备份 zip，返回 Buffer
 */
export async function createBackup(): Promise<Buffer> {
  const zip = new AdmZip();

  // 添加数据库
  const dbPath = join(DATA_DIR, DB_FILE);
  if (existsSync(dbPath)) {
    zip.addLocalFile(dbPath, "", "data");
  }

  // 添加上传文件目录
  for (const dir of INCLUDE_DIRS) {
    const p = join(DATA_DIR, dir);
    if (existsSync(p)) {
      await addDirToZip(zip, p, `data/${dir}`);
    }
  }

  return zip.toBuffer();
}

async function addDirToZip(zip: AdmZip, dir: string, zipPath: string) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    const zp = join(zipPath, e.name).replace(/\\/g, "/");
    if (e.isDirectory()) {
      await addDirToZip(zip, full, zp);
    } else {
      const buf = await readFile(full);
      zip.addFile(zp, buf);
    }
  }
}

/**
 * 从 zip Buffer 恢复数据
 * 1. 解压到临时目录
 * 2. 校验 village.db 存在
 * 3. 替换 data/ 目录下的文件
 */
export async function restoreBackup(zipBuffer: Buffer): Promise<{ success: boolean; error?: string }> {
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    return { success: false, error: "备份文件损坏，无法解压" };
  }

  const entries = zip.getEntries();

  // 校验必须包含 village.db
  const hasDb = entries.some(e => e.entryName.includes("village.db") || e.entryName.endsWith("/village.db"));
  if (!hasDb) {
    return { success: false, error: "备份文件中未找到数据库" };
  }

  // 解压到临时目录
  const tmpDir = join(DATA_DIR, "_restore_tmp");
  await mkdir(tmpDir, { recursive: true });

  try {
    zip.extractAllTo(tmpDir, true);

    // 查找解压后的 data 目录
    const tmpData = join(tmpDir, "data");
    const srcDir = existsSync(tmpData) ? tmpData : tmpDir;

    // 复制 village.db
    const srcDb = join(srcDir, "village.db");
    if (!existsSync(srcDb)) {
      return { success: false, error: "解压后未找到数据库文件" };
    }

    // 替换数据库
    await copyFile(srcDb, join(DATA_DIR, DB_FILE));

    // 替换上传目录
    for (const dir of INCLUDE_DIRS) {
      const srcDirPath = join(srcDir, dir);
      const dstDirPath = join(DATA_DIR, dir);
      if (existsSync(srcDirPath)) {
        await rmRF(dstDirPath);
        await copyDir(srcDirPath, dstDirPath);
      }
    }

    return { success: true };
  } finally {
    // 清理临时目录
    await rmRF(tmpDir);
  }
}

async function copyDir(src: string, dst: string) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = join(src, e.name);
    const d = join(dst, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else {
      await copyFile(s, d);
    }
  }
}

async function rmRF(dir: string) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await rmRF(p);
      else await unlink(p);
    }
    await rmDir(dir);
  } catch {}
}
