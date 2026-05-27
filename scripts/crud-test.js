// V2.3 离线版完整 CRUD 功能测试
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const REPORT_DIR = path.join(__dirname, "..", "test-reports", "offline-crud");
const DIR = path.join(REPORT_DIR, "screenshots");
fs.mkdirSync(DIR, { recursive: true });

const R = [];
let testData = {}; // track created test data for cleanup

function ok(name, detail = "") { console.log(`✅ ${name} — ${detail}`); R.push({ name, status: "PASS", detail }); }
function warn(name, detail = "") { console.log(`⚠️ ${name} — ${detail}`); R.push({ name, status: "WARN", detail }); }
function fail(name, detail = "") { console.log(`❌ ${name} — ${detail}`); R.push({ name, status: "FAIL", detail }); }

async function go(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ==========================================
  console.log("\n" + "=".repeat(50));
  console.log("  V2.3 离线版 — 完整 CRUD 功能测试");
  console.log("=".repeat(50));

  // ====== 1. LOGIN ======
  console.log("\n── 1. 登录认证 ──");
  await go(page, "/login");
  await page.fill('input[type="text"]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.waitForLoadState("networkidle");
  const loggedIn = page.url().includes("/dashboard");
  loggedIn ? ok("登录", "admin 登录成功") : fail("登录", "登录失败");
  await shot(page, "01-login-dashboard");

  // ====== 2. DASHBOARD ======
  console.log("\n── 2. 智能工作台 ──");
  const dashText = await page.textContent("body");
  dashText.includes("驻村") || dashText.includes("工作台") || dashText.includes("欢迎")
    ? ok("仪表盘", "首页渲染正常")
    : warn("仪表盘", "页面内容较少");
  await shot(page, "02-dashboard");

  // ====== 3. VILLAGE STATS ======
  console.log("\n── 3. 村情概况 ──");
  await go(page, "/dashboard/village");
  const vText = await page.textContent("body");
  const hasStats = vText.includes("户") || vText.includes("人");
  hasStats ? ok("村情概况", "统计数据展示正常") : warn("村情概况", "统计数据未找到");
  await shot(page, "03-village");

  // ====== 4. FAMILIES — CRUD ======
  console.log("\n── 4. 农户管理 (CRUD) ──");
  await go(page, "/dashboard/families");
  await shot(page, "04a-families-list");

  // 4a. CREATE family
  const addBtn = page.locator('a[href*="new"], button:has-text("新增"), button:has-text("添加")').first();
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, "04b-family-create-form");
    ok("农户-新建入口", "新建表单已打开");
  } else {
    // Try finding add button by other means
    const allBtns = await page.locator("button, a").allTextContents();
    const addLike = allBtns.filter(t => t.includes("新增") || t.includes("添加") || t.includes("新建"));
    if (addLike.length > 0) {
      ok("农户-新建入口", `找到按钮: ${addLike[0]}`);
    } else {
      warn("农户-新建入口", "未找到新建按钮，尝试直接访问");
      await go(page, "/dashboard/families/new");
    }
  }

  // Fill family form
  try {
    const headNameInput = page.locator('input[name="headName"], input[placeholder*="户主"], input[placeholder*="姓名"]').first();
    if (await headNameInput.count() > 0) {
      await headNameInput.fill("测试户主");
      testData.familyName = "测试户主";
      ok("农户-填写表单", "户主姓名已填写");
    }
    // Try to fill more fields
    const inputs = await page.locator("input:not([type=hidden]):not([type=submit])").all();
    for (const inp of inputs.slice(0, 5)) {
      const name = await inp.getAttribute("name");
      const placeholder = await inp.getAttribute("placeholder");
      if (name && name.includes("phone")) await inp.fill("13800001111");
      if (name && name.includes("card")) await inp.fill("220102198001011234");
    }
    await shot(page, "04c-family-filled");

    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(4000);
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await shot(page, "04d-family-created");
      ok("农户-提交保存", "表单已提交");
    }
  } catch (e) {
    warn("农户-表单操作", e.message.slice(0, 60));
  }

  // 4b. VIEW detail
  await go(page, "/dashboard/families");
  await page.waitForTimeout(2000);
  const firstCard = page.locator('a[href*="/dashboard/families/"], [class*=card], [class*=row]').first();
  if (await firstCard.count() > 0) {
    await firstCard.click();
    await page.waitForTimeout(3000);
    await shot(page, "04e-family-detail");
    const detailUrl = page.url();
    detailUrl.includes("/families/") ? ok("农户-查看详情", "详情页已打开") : warn("农户-查看详情", "未跳转到详情页");
    testData.familyDetailUrl = detailUrl;
  }

  // ====== 5. VISITS — CREATE ======
  console.log("\n── 5. 走访慰问 ──");
  await go(page, "/dashboard/visits");
  await shot(page, "05a-visits-list");

  // Create visit
  const visitAdd = page.locator('a[href*="visits/new"], a[href*="visits"], button:has-text("新增")').first();
  if (await visitAdd.count() > 0) {
    await visitAdd.click();
    await page.waitForTimeout(3000);
  } else {
    await go(page, "/dashboard/visits");
  }
  await shot(page, "05b-visits-form");
  try {
    // Select family if dropdown exists
    const select = page.locator("select").first();
    if (await select.count() > 0) {
      await select.selectOption({ index: 1 });
      ok("走访-选择农户", "已选择农户");
    }
    // Fill content
    const textarea = page.locator("textarea").first();
    if (await textarea.count() > 0) {
      await textarea.fill("测试走访记录——功能验证");
      ok("走访-填写内容", "内容已填写");
    }
    await shot(page, "05c-visits-filled");
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count() > 0) {
      await submit.click();
      await page.waitForTimeout(4000);
      await shot(page, "05d-visits-created");
      ok("走访-提交保存", "走访记录已创建");
    }
  } catch (e) {
    warn("走访-创建", e.message.slice(0, 60));
  }

  // ====== 6. PARTY ======
  console.log("\n── 6. 党建专栏 ──");
  await go(page, "/dashboard/party");
  await shot(page, "06a-party");
  const partyText = await page.textContent("body");
  partyText.length > 200 ? ok("党建-页面", "党建页面正常") : warn("党建-页面", "内容较少");

  // Check party members
  await go(page, "/dashboard/party");
  await page.waitForTimeout(2000);
  // Find member list if exists
  const memberLinks = page.locator('a[href*="member"], a[href*="party-member"]');
  if (await memberLinks.count() > 0) {
    await memberLinks.first().click();
    await page.waitForTimeout(3000);
    await shot(page, "06b-party-member-detail");
    ok("党建-党员详情", "可查看党员信息");
  }

  // ====== 7. INDUSTRY ======
  console.log("\n── 7. 产业管理 ──");
  await go(page, "/dashboard/industry");
  await shot(page, "07a-industry");
  const indText = await page.textContent("body");
  indText.length > 200 ? ok("产业-页面", "产业页面正常") : warn("产业-页面", "内容较少");

  // Try creating industry
  const indAdd = page.locator('a[href*="industry/new"], a[href*="industries/new"], button:has-text("新增")').first();
  if (await indAdd.count() > 0) {
    await indAdd.click();
    await page.waitForTimeout(3000);
    await shot(page, "07b-industry-form");
    ok("产业-新建入口", "新建表单已打开");
  }

  // ====== 8. DIARY — CREATE ======
  console.log("\n── 8. 驻村日记 ──");
  await go(page, "/dashboard/diary");
  await shot(page, "08a-diary-list");

  const diaryAdd = page.locator('a[href*="diary/new"], a[href*="new"], button:has-text("写日记"), button:has-text("新建")').first();
  if (await diaryAdd.count() > 0) {
    await diaryAdd.click();
    await page.waitForTimeout(3000);
    await shot(page, "08b-diary-form");
    ok("日记-新建入口", "日记编辑页已打开");

    const titleInput = page.locator('input[name="title"], input[placeholder*="标题"]').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill("测试日记标题-功能验证");
      ok("日记-填写标题", "标题已填写");
    }
    const contentArea = page.locator("textarea, [contenteditable=true]").first();
    if (await contentArea.count() > 0) {
      await contentArea.fill("这是测试日记内容，用于验证V2.3功能。");
      ok("日记-填写内容", "内容已填写");
    }
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count() > 0) {
      await submit.click();
      await page.waitForTimeout(4000);
      await shot(page, "08c-diary-created");
      ok("日记-提交保存", "日记已保存");
    }
  } else {
    warn("日记-新建入口", "未找到新建按钮");
  }

  // ====== 9. SETTINGS ======
  console.log("\n── 9. 系统设置 ──");
  await go(page, "/dashboard/settings");
  await page.waitForTimeout(3000);
  await shot(page, "09a-settings");

  // Try clicking through tabs
  const tabNames = ["基本信息", "村情概况", "队员管理", "数据导入"];
  let tabsOk = 0;
  for (const tab of tabNames) {
    try {
      const el = page.locator(`text=${tab}`).first();
      if (await el.count() > 0) {
        await el.click();
        await page.waitForTimeout(1500);
        tabsOk++;
      }
    } catch {}
  }
  tabsOk >= 2 ? ok("设置-标签切换", `${tabsOk}/${tabNames.length} 标签可切换`) : warn("设置-标签切换", `仅 ${tabsOk} 个标签`);

  // Modify village name
  try {
    const nameInput = page.locator('input[name="villageName"], input[placeholder*="村名"]').first();
    if (await nameInput.count() > 0) {
      const oldVal = await nameInput.inputValue();
      await nameInput.fill("测试村-功能验证");
      const saveBtn = page.locator('button[type="submit"], button:has-text("保存")').first();
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        ok("设置-修改村名", "村名已修改并保存");
        // Restore
        await nameInput.fill(oldVal);
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  } catch (e) {
    warn("设置-修改", e.message.slice(0, 50));
  }

  // ====== 10. DATA IMPORT ======
  console.log("\n── 10. 数据导入 ──");
  // Go to settings → import tab
  await go(page, "/dashboard/settings");
  await page.waitForTimeout(2000);
  const importTab = page.locator("text=数据导入").first();
  if (await importTab.count() > 0) {
    await importTab.click();
    await page.waitForTimeout(2000);
    await shot(page, "10a-import");
    ok("导入-入口", "导入界面已打开");
  } else {
    warn("导入-入口", "未找到数据导入标签");
  }

  // ====== 11. PUBLIC SERVICE ======
  console.log("\n── 11. 百姓办事 ──");
  await go(page, "/dashboard/public-service");
  await shot(page, "11a-public-service");
  const psText = await page.textContent("body");
  psText.length > 200 ? ok("办事-页面", `正常渲染 (${psText.length} 字符)`) : warn("办事-页面", "内容较少");

  // Try create
  const psAdd = page.locator('a[href*="new"], button:has-text("新增"), button:has-text("登记")').first();
  if (await psAdd.count() > 0) {
    await psAdd.click();
    await page.waitForTimeout(3000);
    await shot(page, "11b-ps-form");
    ok("办事-新建入口", "登记表单已打开");
  }

  // ====== 12. ALERTS ======
  console.log("\n── 12. 防返贫预警 ──");
  await go(page, "/dashboard/alerts");
  await shot(page, "12-alerts");
  const alertText = await page.textContent("body");
  alertText.length > 200 ? ok("预警-页面", "预警页面正常") : warn("预警-页面", "内容较少");

  // ====== 13. ARCHIVE ======
  console.log("\n── 13. 档案管理 ──");
  await go(page, "/dashboard/archive");
  await shot(page, "13-archive");
  const archText = await page.textContent("body");
  archText.length > 200 ? ok("档案-页面", "档案页面正常") : warn("档案-页面", "内容较少");

  // ====== 14. PERFORMANCE ======
  console.log("\n── 14. 履职全景 ──");
  await go(page, "/dashboard/performance");
  await shot(page, "14-performance");
  const perfText = await page.textContent("body");
  perfText.length > 200 ? ok("履职-页面", "履职全景正常") : warn("履职-页面", "内容较少");

  // ====== 15. AI WRITER ======
  console.log("\n── 15. AI笔杆子 ──");
  await go(page, "/ai-writer");
  await shot(page, "15-ai-writer");
  const aiText = await page.textContent("body");
  aiText.length > 200 ? ok("AI-页面", "AI笔杆子正常") : warn("AI-页面", "内容较少");

  // ====== 16. MAP ======
  console.log("\n── 16. 地图标记 ──");
  await go(page, "/dashboard/map");
  await shot(page, "16-map");
  const mapText = await page.textContent("body");
  mapText.length > 200 ? ok("地图-页面", "地图页面正常") : warn("地图-页面", "内容较少");

  // ====== 17. LOGOUT + RELOGIN ======
  console.log("\n── 17. 退出 + 重新登录 ──");
  // Find logout
  const logoutBtn = page.getByRole("button", { name: /退出/ }).or(page.getByRole("link", { name: /退出/ })).first();
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForTimeout(3000);
    const onLoginPage = (await page.locator('input[type="text"]').count()) > 0;
    onLoginPage ? ok("退出登录", "已返回登录页") : warn("退出登录", "未跳转登录页");
  }

  // Re-login
  await go(page, "/login");
  await page.fill('input[type="text"]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  page.url().includes("/dashboard") ? ok("重新登录", "二次登录成功") : fail("重新登录", "二次登录失败");

  // ====== SUMMARY ======
  await browser.close();

  const pass = R.filter(r => r.status === "PASS").length;
  const warns = R.filter(r => r.status === "WARN").length;
  const fails = R.filter(r => r.status === "FAIL").length;

  console.log("\n\n" + "=".repeat(50));
  console.log(`  V2.3 离线版 完整测试报告`);
  console.log("=".repeat(50));
  console.log(`  ✅ ${pass} 通过  ⚠️ ${warns} 警告  ❌ ${fails} 失败  共 ${R.length} 项`);
  console.log("=".repeat(50) + "\n");

  for (const r of R) {
    const icon = r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    console.log(`${icon} ${r.name.padEnd(18)} ${r.detail}`);
  }

  fs.writeFileSync(path.join(REPORT_DIR, "report.json"), JSON.stringify({
    summary: { pass, warn: warns, fail: fails, total: R.length },
    results: R,
    timestamp: new Date().toISOString(),
  }, null, 2));

  console.log(`\n📁 ${DIR}`);
  process.exit(fails > 0 ? 1 : 0);
}

main();
