// V2.3 离线版 — 数据导入功能测试
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:3000";
const DOWNLOAD_DIR = path.join(__dirname, "..", "test-reports", "import-test");
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await ctx.newPage();

  let pass = 0, fail = 0;
  const ok = (msg) => { console.log("✅ " + msg); pass++; };
  const no = (msg) => { console.log("❌ " + msg); fail++; };

  // ====== Login ======
  console.log("\n── 登录 ──");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.waitForLoadState("networkidle").catch(() => {});
  page.url().includes("/dashboard") ? ok("登录成功") : no("登录失败");

  // ====== Navigate to import ======
  console.log("\n── 进入数据导入 ──");
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(4000);
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  // Find and click "数据导入" tab
  const importTab = page.locator("text=数据导入").first();
  if (await importTab.count() > 0) {
    await importTab.click();
    await page.waitForTimeout(3000);
    ok("找到数据导入标签");
  } else {
    no("未找到数据导入标签");
    await browser.close();
    process.exit(1);
  }

  // Take screenshot
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, "01-import-page.png"), fullPage: true });

  // ====== Download template ======
  console.log("\n── 下载导入模板 ──");
  // Click "下载模板" or "样表下载" button for 村民户
  const downloadBtn = page.locator("text=下载模板").or(page.locator("text=样表下载")).or(page.locator("text=下载样表")).first();
  if (await downloadBtn.count() > 0) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
      downloadBtn.click(),
    ]);
    if (download) {
      const filePath = path.join(DOWNLOAD_DIR, download.suggestedFilename());
      await download.saveAs(filePath);
      ok("模板下载成功: " + download.suggestedFilename());
    } else {
      no("模板下载超时");
    }
  } else {
    // Try API approach
    console.log("  通过 API 下载模板...");
    try {
      const resp = await page.evaluate(async () => {
        const r = await fetch("/api/import/template?type=family");
        if (!r.ok) throw new Error("HTTP " + r.status);
        const blob = await r.blob();
        return { ok: true, size: blob.size };
      });
      resp.ok ? ok("API模板下载成功: " + resp.size + " bytes") : no("API下载失败");
    } catch (e) {
      no("模板下载失败: " + e.message);
    }
  }

  // ====== Upload file ======
  console.log("\n── 上传导入文件 ──");
  // Find file input
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() > 0) {
    // Create a simple test CSV/Excel data? Let's check what format the import accepts
    ok("找到文件上传控件");
  } else {
    no("未找到文件上传控件");
  }

  // Check for the upload section text
  const pageText = await page.textContent("body");
  console.log("\n  页面内容摘要:", pageText.slice(0, 300).replace(/\s+/g, " "));

  // Check if there are import sections
  const sections = ["村民户", "家庭成员", "党员信息"];
  for (const s of sections) {
    const el = page.locator(`text=${s}`).first();
    if (await el.count() > 0) ok(`导入区块: ${s}`); else console.log(`  ⚠️ 未找到区块: ${s}`);
  }

  await page.screenshot({ path: path.join(DOWNLOAD_DIR, "02-import-sections.png"), fullPage: true });

  // ====== Try upload via API ======
  console.log("\n── API导入测试 ──");
  try {
    // Get session token
    const cookies = await ctx.cookies();
    const sessionToken = cookies.find(c => c.name.includes("session-token"))?.value;
    if (!sessionToken) {
      no("无法获取 session token");
    } else {
      // First check how many families exist
      const beforeCount = await page.evaluate(async () => {
        const r = await fetch("/api/village/families?page=1");
        const d = await r.json();
        return d.total || d.families?.length || 0;
      });
      console.log("  导入前农户数:", beforeCount);

      // Create test data matching the import format
      // The import API expects { rows, mappings, type }
      const testData = {
        type: "family",
        rows: [
          {
            headName: "导入测试户主",
            headPhone: "13800009999",
            headIdCard: "220102198506012345",
            population: 3,
            familyAttr: "一般农户",
            groupName: "靠山屯",
            address: "测试地址1号",
          },
        ],
        mappings: {
          headName: "headName",
          headPhone: "headPhone",
          headIdCard: "headIdCard",
          population: "population",
          familyAttr: "familyAttr",
          groupName: "groupName",
          address: "address",
        },
      };

      const importResult = await page.evaluate(async (data) => {
        const r = await fetch("/api/import/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return await r.json();
      }, testData);

      console.log("  导入结果:", JSON.stringify(importResult).slice(0, 200));
      if (importResult.imported > 0) {
        ok(`API导入成功: ${importResult.imported} 条`);
      } else if (importResult.errors?.length > 0) {
        console.log("  导入错误:", importResult.errors);
        no("API导入有错误");
      } else {
        no("API导入返回异常: " + JSON.stringify(importResult));
      }
    }
  } catch (e) {
    no("API导入异常: " + e.message.slice(0, 100));
  }

  // ====== Summary ======
  console.log("\n\n═══════════════════════");
  console.log(`  导入功能测试: ✅${pass} ❌${fail}`);
  console.log("═══════════════════════");

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
}

main();
