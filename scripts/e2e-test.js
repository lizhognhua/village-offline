const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const REPORT_DIR = path.join(__dirname, "..", "test-reports", "v23-final");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];

function result(name, status, detail = "") {
  const icon = status === "PASS" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`${icon} ${name} — ${detail}`);
  results.push({ module: name, status, detail });
}

async function testModule(page, name, url, expectedText = null) {
  try {
    // Navigate with full wait
    await page.goto(`${BASE}${url}`, { waitUntil: "load", timeout: 20000 });
    // Wait for React to render
    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Screenshot
    const filename = name.replace(/[/\\?%*:|"<>]/g, "-");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${filename}.png`),
      fullPage: true,
    });

    // Check if we're on login page (session lost)
    const onLoginPage = await page.locator('input[type="text"]').count();
    if (onLoginPage > 0 && url !== "/login") {
      result(name, "FAIL", "会话丢失，被重定向到登录页");
      return;
    }

    // Check for error indicators
    const bodyText = await page.textContent("body").catch(() => "");
    const hasError = bodyText.includes("Error") || bodyText.includes("500") || bodyText.includes("404");

    if (hasError && !bodyText.includes("404: This page could not be found")) {
      // Check if it's a 404 page specifically (Next.js 404)
      if (bodyText.includes("This page could not be found")) {
        result(name, "FAIL", "页面不存在 (404)");
      } else {
        result(name, "WARN", "页面含错误信息");
      }
      return;
    }

    // Check if page has meaningful content
    const textLen = bodyText.replace(/\s/g, "").length;
    if (textLen < 50) {
      result(name, "WARN", `页面几乎为空 (${textLen} 字符)`);
    } else if (expectedText) {
      const found = bodyText.includes(expectedText);
      result(name, found ? "PASS" : "WARN", found ? "内容验证通过" : `未找到关键词 "${expectedText}"`);
    } else {
      result(name, "PASS", `页面正常渲染 (${textLen} 字符)`);
    }
  } catch (e) {
    result(name, "FAIL", e.message.slice(0, 100));
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // ====== LOGIN ======
  console.log("\n🔐 登录\n");
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="text"]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "00-dashboard.png"), fullPage: true });

    const text = await page.textContent("body");
    if (text.includes("仪表") || text.includes("工作台") || text.includes("欢迎") || text.includes("驻村")) {
      result("登录", "PASS", "登录成功，仪表盘渲染正常");
    } else {
      result("登录", "WARN", "登录成功但仪表盘内容异常");
    }
  } catch (e) {
    result("登录", "FAIL", e.message.slice(0, 100));
    await browser.close();
    process.exit(1);
  }

  // ====== TEST ALL MODULES ======
  const tests = [
    ["村情概况", "/dashboard/village", "屯"],
    ["农户管理", "/dashboard/families", "户主"],
    ["走访慰问", "/dashboard/visits", null],
    ["党建专栏", "/dashboard/party", null],
    ["产业管理", "/dashboard/industry", null],
    ["履职全景", "/dashboard/performance", null],
    ["驻村日记", "/dashboard/diary", null],
    ["档案管理", "/dashboard/archive", null],
    ["百姓办事", "/dashboard/public-service", null],
    ["防返贫预警", "/dashboard/alerts", null],
    ["系统设置", "/dashboard/settings", "admin"],
    ["地图标记", "/dashboard/map", null],
    ["AI笔杆子", "/ai-writer", null],
    ["培训记录", "/dashboard/training-records", null],
  ];

  for (const [name, url, keyword] of tests) {
    console.log(`\n📄 ${name}`);
    await testModule(page, name, url, keyword);
  }

  // ====== IMPORT TAB ======
  console.log("\n📄 数据导入\n");
  try {
    await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    const importTab = page.locator("text=数据导入");
    if (await importTab.count() > 0) {
      await importTab.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "15-数据导入.png"), fullPage: true });
      const t = await page.textContent("body");
      result("数据导入", t.includes("导入") ? "PASS" : "WARN", "导入界面测试");
    } else {
      result("数据导入", "WARN", "未找到导入标签");
    }
  } catch (e) {
    result("数据导入", "FAIL", e.message.slice(0, 80));
  }

  await browser.close();

  // ====== REPORT ======
  const summary = {
    total: results.length,
    pass: results.filter(r => r.status === "PASS").length,
    warn: results.filter(r => r.status === "WARN").length,
    fail: results.filter(r => r.status === "FAIL").length,
  };

  console.log("\n\n═════════════════════════════════════");
  console.log("   V2.3 E2E 功能测试报告");
  console.log("═════════════════════════════════════");
  console.log(`  ✅ ${summary.pass} 通过  ⚠️ ${summary.warn} 警告  ❌ ${summary.fail} 失败  共 ${summary.total} 项`);
  console.log("═════════════════════════════════════\n");

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    console.log(`${icon} ${r.module.padEnd(14)} ${r.detail}`);
  }

  fs.writeFileSync(
    path.join(REPORT_DIR, "report.json"),
    JSON.stringify({ summary, results, timestamp: new Date().toISOString() }, null, 2)
  );

  console.log(`\n📁 ${SCREENSHOT_DIR}`);
  console.log(`📄 ${path.join(REPORT_DIR, "report.json")}`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main();
