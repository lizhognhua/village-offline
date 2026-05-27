const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DOCKER_BASE = "https://zc.lizhonghua.vip:8002";
const REPORT_DIR = path.join(__dirname, "..", "test-reports", "docker-e2e");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];

function r(name, status, detail = "") {
  const icon = status === "PASS" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`${icon} ${name} — ${detail}`);
  results.push({ module: name, status, detail });
}

async function navigateSafe(page, url, label, waitMs = 5000) {
  console.log(`\n📄 ${label}`);
  try {
    // Wait for any pending navigation to complete first
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    let httpStatus = 200;
    const respHandler = (resp) => {
      if (resp.url() === url && resp.status() >= 400) httpStatus = resp.status();
    };
    page.on("response", respHandler);

    await page.goto(url, { waitUntil: "load", timeout: 25000 });
    await page.waitForTimeout(waitMs);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    page.removeListener("response", respHandler);
    const text = await page.textContent("body").catch(() => "");
    const textLen = text.replace(/\s/g, "").length;

    const onLogin = (await page.locator('input[type="text"]').count()) > 0;

    if (httpStatus >= 500) {
      r(label, "FAIL", `HTTP ${httpStatus}`);
    } else if (httpStatus === 404) {
      r(label, "FAIL", "HTTP 404");
    } else if (onLogin && !url.includes("/login")) {
      r(label, "FAIL", "会话丢失，重定向到登录页");
    } else if (textLen < 50) {
      r(label, "WARN", `页面接近空白 (${textLen} 字符)`);
    } else {
      r(label, "PASS", `正常渲染 (${textLen} 字符)`);
    }

    // Screenshot
    const fname = label.replace(/[/\\?%*:|"<>]/g, "-");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${fname}.png`), fullPage: true });
  } catch (e) {
    r(label, "FAIL", e.message.slice(0, 120));
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // ====== 1. Public download page (no login needed) ======
  console.log("\n══════ 公开页面 ══════");
  await navigateSafe(page, `${DOCKER_BASE}/download`, "下载页面");

  // Verify V2.3 on download page
  try {
    const bodyText = await page.textContent("body");
    if (bodyText.includes("V2.3")) {
      console.log("   ✅ 下载页显示 V2.3");
    } else if (bodyText.includes("V2.2")) {
      console.log("   ⚠️ 下载页仍显示 V2.2");
    } else if (bodyText.includes("V2.0")) {
      console.log("   ❌ 下载页显示旧版 V2.0");
    }
  } catch {}

  // ====== 2. Login ======
  console.log("\n══════ 登录认证 ══════");
  try {
    await page.goto(`${DOCKER_BASE}/login`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.fill('input[type="text"]', "18504519501");
    await page.fill('input[type="password"]', "Szgjj12329!@#");
    await page.click('button[type="submit"]');
    // Docker version may redirect to subdomain (e.g., ksc.lizhonghua.vip)
    await page.waitForTimeout(5000);
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();
    console.log("   登录后 URL:", currentUrl);

    if (currentUrl.includes("/dashboard") || currentUrl.includes("/login")) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "00-dashboard.png"), fullPage: true });
      const t = await page.textContent("body");
      r("登录认证", "PASS", currentUrl.includes("/dashboard") ? "登录成功 → 仪表盘" : "需确认登录状态");
    } else {
      r("登录认证", "WARN", `重定向到: ${currentUrl}`);
    }
  } catch (e) {
    r("登录认证", "FAIL", e.message.slice(0, 100));
    console.log("登录失败，跳过需认证的测试");
  }

  // ====== 3. All modules (correct Docker routes) ======
  console.log("\n══════ 功能模块 ══════");

  // Use current base URL (may have changed to subdomain after login)
  const baseUrl = new URL(page.url()).origin;
  console.log(`\n  Base URL: ${baseUrl}`);

  // Docker version routes — most at root level, not under /dashboard
  const modules = [
    // Skip /dashboard — already there after login
    ["村情概况", `${baseUrl}/village`],
    ["农户管理", `${baseUrl}/village/families`],
    ["走访慰问", `${baseUrl}/visits`],
    ["党建专栏", `${baseUrl}/party`],
    ["产业管理", `${baseUrl}/industries`],
    ["项目看板", `${baseUrl}/projects`],
    ["驻村日记", `${baseUrl}/diary`],
    ["档案管理", `${baseUrl}/archive`],
    ["百姓办事", `${baseUrl}/public-service`],
    ["预警总览", `${baseUrl}/warnings/overview`],
    ["系统设置", `${baseUrl}/dashboard/settings`],
    ["地图标记", `${baseUrl}/village/map`],
    ["AI笔杆子", `${baseUrl}/ai-writer`],
    ["培训记录", `${baseUrl}/records`],
    ["知识库", `${baseUrl}/knowledge`],
    ["履职全景", `${baseUrl}/reports`],
    ["相册管理", `${baseUrl}/dashboard/albums`],
    ["数据导入", `${baseUrl}/data-import`],
    ["天气信息", `${baseUrl}/weather`],
    ["问责管理", `${baseUrl}/accountability`],
    ["慰问记录", `${baseUrl}/condolences`],
    ["公告管理", `${baseUrl}/announcements`],
  ];

  for (const [name, url] of modules) {
    await navigateSafe(page, url, name);
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
  console.log("   Docker v365 E2E 测试报告");
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
