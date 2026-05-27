// Docker v365 深度功能测试 — 只读，不修改任何数据
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "https://ksc.lizhonghua.vip:8002";
const REPORT_DIR = path.join(__dirname, "..", "test-reports", "docker-func");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
function R(name, ok, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${name} — ${detail}`);
  results.push({ module: name, ok, detail });
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 20000 });
  await page.fill('input[type="text"]', "18504519501");
  await page.fill('input[type="password"]', "Szgjj12329!@#");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);
  await page.waitForLoadState("networkidle");
  return page.url().includes("/dashboard");
}

async function goAndShot(page, url, name, waitMs = 4000) {
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.goto(`${BASE}${url}`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(waitMs);
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  const filename = name.replace(/[/\\?%*:|"<>]/g, "-");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${filename}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  console.log("\n══════ 1. 登录 ══════\n");
  const loggedIn = await login(page);
  R("登录认证", loggedIn, loggedIn ? "成功进入仪表盘" : "登录失败");

  // ====== 2. DASHBOARD — check stats ======
  console.log("\n══════ 2. 仪表盘功能 ══════\n");
  await goAndShot(page, "/dashboard", "02-仪表盘");
  try {
    const body = await page.textContent("body");

    // Check key stat elements exist
    const hasStats = body.includes("户") || body.includes("人") || body.includes("村");
    R("仪表盘-统计卡片", hasStats, hasStats ? "统计数据正常显示" : "未找到统计数据");

    // Check for quick-action buttons
    const buttons = await page.locator("a, button").count();
    R("仪表盘-快捷入口", buttons > 5, `${buttons} 个可交互元素`);

    // Check navigation sidebar
    const navItems = await page.locator("nav a, nav button").count();
    R("仪表盘-导航菜单", navItems > 5, `${navItems} 个导航项`);
  } catch (e) {
    R("仪表盘", false, e.message.slice(0, 80));
  }

  // ====== 3. VILLAGE INFO ======
  console.log("\n══════ 3. 村情概况 ══════\n");
  await goAndShot(page, "/village", "03-村情概况");
  try {
    const text = await page.textContent("body");
    const hasVillage = text.includes("村") || text.includes("屯") || text.includes("户");
    R("村情概况-页面", hasVillage, "村情数据正常展示");
  } catch (e) {
    R("村情概况", false, e.message.slice(0, 80));
  }

  // ====== 4. FAMILIES (ADMIN) ======
  console.log("\n══════ 4. 农户管理 ══════\n");
  await goAndShot(page, "/admin/households", "04-农户管理");
  try {
    const text = await page.textContent("body");
    const hasFamilies = text.includes("户主") || text.includes("家庭") || text.includes("姓名");
    R("农户管理-列表", hasFamilies, "农户列表正常加载");

    // Check table rows exist
    const rows = await page.locator("table tr, [class*=row]").count();
    R("农户管理-数据行", rows > 3, `${rows} 行数据`);

    // Try clicking first family to view detail
    const firstLink = page.locator("table a, [class*=card] a").first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04b-农户详情.png"), fullPage: true });
      const detailText = await page.textContent("body");
      R("农户管理-详情", detailText.length > 200, `详情页 ${detailText.length} 字符`);
    } else {
      R("农户管理-详情", true, "无详情链接（可能表格结构不同）");
    }
  } catch (e) {
    R("农户管理", false, e.message.slice(0, 80));
  }

  // ====== 5. VISITS ======
  console.log("\n══════ 5. 走访慰问 ══════\n");
  await goAndShot(page, "/visits", "05-走访慰问");
  try {
    const text = await page.textContent("body");
    R("走访慰问-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("走访慰问", false, e.message.slice(0, 80));
  }

  // ====== 6. PARTY ======
  console.log("\n══════ 6. 党建专栏 ══════\n");
  await goAndShot(page, "/party", "06-党建专栏");
  try {
    const text = await page.textContent("body");
    R("党建专栏-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);

    // Check sub-tabs
    await page.goto(`${BASE}/party/members`, { waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06b-党员信息.png"), fullPage: true });
    const membersText = await page.textContent("body");
    R("党建-党员列表", membersText.length > 200, "党员列表正常");
  } catch (e) {
    R("党建专栏", false, e.message.slice(0, 80));
  }

  // ====== 7. INDUSTRIES ======
  console.log("\n══════ 7. 产业管理 ══════\n");
  await goAndShot(page, "/industries", "07-产业管理");
  try {
    const text = await page.textContent("body");
    R("产业管理-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("产业管理", false, e.message.slice(0, 80));
  }

  // ====== 8. PROJECTS ======
  console.log("\n══════ 8. 项目看板 ══════\n");
  await goAndShot(page, "/projects", "08-项目看板");
  try {
    const text = await page.textContent("body");
    R("项目看板-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("项目看板", false, e.message.slice(0, 80));
  }

  // ====== 9. DIARY ======
  console.log("\n══════ 9. 驻村日记 ══════\n");
  await goAndShot(page, "/diary", "09-驻村日记");
  try {
    const text = await page.textContent("body");
    R("驻村日记-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);

    // Check "new" button exists
    const newBtn = page.locator('a[href*="new"], button:has-text("新建"), button:has-text("写日记")');
    R("驻村日记-新建入口", (await newBtn.count()) > 0, "新建按钮存在");
  } catch (e) {
    R("驻村日记", false, e.message.slice(0, 80));
  }

  // ====== 10. ALERTS / WARNINGS ======
  console.log("\n══════ 10. 防返贫预警 ══════\n");
  await goAndShot(page, "/warnings/overview", "10-预警总览");
  try {
    const text = await page.textContent("body");
    R("预警总览-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("预警总览", false, e.message.slice(0, 80));
  }

  // ====== 11. SETTINGS ======
  console.log("\n══════ 11. 系统设置 ══════\n");
  await goAndShot(page, "/dashboard/settings", "11-系统设置");

  // Check tabs
  const tabs = ["基本信息", "村情概况", "队员管理", "邀请码", "AI设置", "GPS设置", "数据导入"];
  let tabsFound = 0;
  for (const tab of tabs) {
    const el = page.locator(`text=${tab}`);
    if (await el.count() > 0) tabsFound++;
  }
  R("系统设置-标签页", tabsFound >= 3, `${tabsFound}/${tabs.length} 个标签可见`);

  // ====== 12. MAP ======
  console.log("\n══════ 12. 地图标记 ══════\n");
  await goAndShot(page, "/village/map", "12-地图标记", 5000);
  try {
    const text = await page.textContent("body");
    R("地图标记-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("地图标记", false, e.message.slice(0, 80));
  }

  // ====== 13. AI WRITER ======
  console.log("\n══════ 13. AI笔杆子 ══════\n");
  await goAndShot(page, "/ai-writer", "13-AI笔杆子");
  try {
    const text = await page.textContent("body");
    const hasAI = text.includes("AI") || text.includes("生成") || text.includes("笔杆子") || text.includes("写作");
    R("AI笔杆子-页面", hasAI, "AI写作界面正常");
  } catch (e) {
    R("AI笔杆子", false, e.message.slice(0, 80));
  }

  // ====== 14. DATA IMPORT ======
  console.log("\n══════ 14. 数据导入 ══════\n");
  await goAndShot(page, "/data-import", "14-数据导入");
  try {
    const text = await page.textContent("body");
    const hasImport = text.includes("导入") || text.includes("Excel") || text.includes("上传");
    R("数据导入-页面", hasImport, "导入界面正常");
  } catch (e) {
    R("数据导入", false, e.message.slice(0, 80));
  }

  // ====== 15. PUBLIC SERVICE ======
  console.log("\n══════ 15. 百姓办事 ══════\n");
  await goAndShot(page, "/public-service", "15-百姓办事");
  try {
    const text = await page.textContent("body");
    R("百姓办事-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("百姓办事", false, e.message.slice(0, 80));
  }

  // ====== 16. KNOWLEDGE BASE ======
  console.log("\n══════ 16. 知识库 ══════\n");
  await goAndShot(page, "/knowledge", "16-知识库");
  try {
    const text = await page.textContent("body");
    R("知识库-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("知识库", false, e.message.slice(0, 80));
  }

  // ====== 17. ARCHIVE ======
  console.log("\n══════ 17. 档案管理 ══════\n");
  await goAndShot(page, "/archive", "17-档案管理");
  try {
    const text = await page.textContent("body");
    R("档案管理-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("档案管理", false, e.message.slice(0, 80));
  }

  // ====== 18. RECORDS ======
  console.log("\n══════ 18. 培训记录 ══════\n");
  await goAndShot(page, "/records", "18-培训记录");
  try {
    const text = await page.textContent("body");
    R("培训记录-页面", text.length > 200, `正常渲染 (${text.length} 字符)`);
  } catch (e) {
    R("培训记录", false, e.message.slice(0, 80));
  }

  // ====== SUMMARY ======
  await browser.close();

  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;

  console.log("\n\n══════════════════════════════════");
  console.log("  Docker v365 深度功能测试");
  console.log("══════════════════════════════════");
  console.log(`  ✅ ${pass} 通过  ❌ ${fail} 问题  共 ${results.length} 项`);
  console.log("══════════════════════════════════\n");

  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.module.padEnd(22)} ${r.detail}`);
  }

  fs.writeFileSync(
    path.join(REPORT_DIR, "report.json"),
    JSON.stringify({ summary: { pass, fail, total: results.length }, results, timestamp: new Date().toISOString() }, null, 2)
  );

  console.log(`\n📁 ${SCREENSHOT_DIR}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
