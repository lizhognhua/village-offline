const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;
  const check = (name, condition) => {
    if (condition) { passed++; console.log(`  [PASS] ${name}`); }
    else { failed++; console.log(`  [FAIL] ${name}`); }
  };

  try {
    // 1. Login
    console.log('\n=== Test: Login ===');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    check('Login redirects to dashboard', page.url().includes('/dashboard'));

    // 2. Dashboard name
    console.log('\n=== Test: Dashboard ===');
    await page.waitForTimeout(2000);
    // Get text from the welcome card specifically
    const welcomeCard = page.locator('.bg-gradient-to-br.from-blue-900').first();
    const welcomeText = await welcomeCard.textContent().catch(() => '');
    console.log('  Welcome:', welcomeText?.substring(0, 100));
    check('Dashboard welcome card shows name', (welcomeText || '').includes('同志'));

    // 3. Village page cards
    console.log('\n=== Test: Village Page ===');
    await page.goto('http://localhost:3000/village', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    check('Shows 脱贫户 card', body.includes('脱贫户'));
    check('Shows 监测户 card', body.includes('监测户'));
    check('Shows 低保户 card (NEW)', body.includes('低保户'));
    check('Shows 异地搬迁户 card (NEW)', body.includes('异地搬迁户'));
    check('Shows 户籍户数 card', body.includes('户籍户数'));
    check('Shows 耕地 card', body.includes('耕地'));
    check('Shows 集体收入 card', body.includes('集体收入'));

    // 4. Card click → filter
    console.log('\n=== Test: Card Click Navigation ===');
    await page.locator('text=脱贫户').first().click();
    await page.waitForTimeout(600);
    const activeBtns = await page.$$eval('button.bg-primary-600', els => els.map(e => e.textContent));
    check('脱贫户 card click switches filter', activeBtns.some(t => t?.includes('脱贫户')));

    // 5. Settings - password tab
    console.log('\n=== Test: Settings - Password ===');
    await page.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    const tabs = await page.$$eval('button', els => els.map(e => e.textContent?.trim()).filter(Boolean));
    console.log('  Tabs found:', tabs.filter(t => t && t.length < 10).join(', '));
    check('Has 修改密码 tab', tabs.some(t => t === '修改密码'));

    // Click password tab
    await page.locator('button').filter({ hasText: '修改密码' }).click();
    await page.waitForTimeout(800);
    const pwdForm = await page.textContent('body');
    check('Has 当前密码 field', pwdForm.includes('当前密码'));
    check('Has 新密码 field', pwdForm.includes('新密码'));
    check('Has 确认新密码 field', pwdForm.includes('确认新密码'));

    // 6. Village Profile settings
    console.log('\n=== Test: Village Profile Settings ===');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('button').filter({ hasText: '村情概况' }).click();
    await page.waitForTimeout(1500);
    // Scroll to see all fields
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    const formText = await page.textContent('body');
    check('Has 异地搬迁户户数 field', formText.includes('异地搬迁户户数'));
    check('Has 异地搬迁户人数 field', formText.includes('异地搬迁户人数'));

    // 7. Group settings
    console.log('\n=== Test: Group Settings ===');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: '屯组管理' }).click();
    await page.waitForTimeout(1000);
    const groupText = await page.textContent('body');
    check('Shows groups list', groupText.includes('靠山屯'));

  } catch (e) {
    console.error('Test error:', e.message);
    failed++;
  } finally {
    console.log(`\n========================================`);
    console.log(`Results: ${passed} passed, ${failed} failed of ${passed + failed}`);
    console.log(`========================================`);
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
