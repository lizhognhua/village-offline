// 飞书多维表格 → Docker 系统 导入脚本
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "https://ksc.lizhonghua.vip:8002";
const REPORT_DIR = path.join(__dirname, "..", "test-reports", "feishu-import");
fs.mkdirSync(REPORT_DIR, { recursive: true });

// Load records data
const recordsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "test-reports", "feishu", "all_records.json"), "utf-8")
);
const records = recordsData.recordMap || {};

async function main() {
  const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // ====== LOGIN ======
  console.log("═══ 登录 Docker 系统 ═══");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 20000 });
  await page.fill('input[type="text"]', "18504519501");
  await page.fill('input[type="password"]', "Szgjj12329!@#");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);
  await page.waitForLoadState("networkidle").catch(() => {});
  console.log("登录成功:", page.url());

  // ====== IMPORT EACH RECORD ======
  let imported = 0, skipped = 0, errors = 0;
  const results = [];

  for (const [recordId, record] of Object.entries(records)) {
    const name = getText(record.fldDXR83JX);
    if (!name) { skipped++; continue; }

    console.log(`\n📋 ${name} (${imported + skipped + errors + 1}/${Object.keys(records).length})`);

    try {
      // Build family data
      const familyData = {
        headName: name,
        headIdCard: getText(record.fld4PQxoNt)?.replace(/\s/g, ""),
        headPhone: getText(record.fld5qbNXCM)?.replace(/\s/g, ""),
        population: record.fld5QkRe9R?.value || 1,
        familyAttr: (record.fld1YvC0FC?.value || []).join(","),
        groupName: record.fld22CcgAV?.value || "",
        address: "",
        notes: getText(record.fld5il3L2h) || getText(record.fldfiUJndj) || "",
      };

      // Import family via API
      const familyResult = await page.evaluate(async (data) => {
        const r = await fetch("/api/village/families", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { status: r.status, data: await r.json() };
      }, familyData);

      if (familyResult.status === 201 || familyResult.status === 200) {
        const familyId = familyResult.data.id;
        console.log("  ✅ 创建成功, ID:", familyId?.slice(0, 12));

        // Import spouse as family member
        const spouseName = getText(record.fld4IEyItv);
        const spouseIdCard = getText(record.flddlSz9ua);
        const spousePhone = getText(record.fld1QOma2O);

        if (spouseName && familyId) {
          try {
            await page.evaluate(async (args) => {
              await fetch(`/api/village/families/${args.fid}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: args.name,
                  relationship: "配偶",
                  idCard: args.idCard || "",
                  phone: args.phone || "",
                }),
              });
            }, { fid: familyId, name: spouseName, idCard: spouseIdCard || "", phone: spousePhone || "" });
            console.log("  ✅ 配偶:", spouseName);
          } catch (e) {
            console.log("  ⚠️ 配偶导入失败:", e.message.slice(0, 60));
          }
        }

        // Import children/other family members from fldJq96euU
        const familyDesc = getText(record.fldJq96euU);
        if (familyDesc && familyId) {
          const members = parseFamilyMembers(familyDesc);
          for (const m of members) {
            try {
              await page.evaluate(async (args) => {
                await fetch(`/api/village/families/${args.fid}/members`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(args.member),
                });
              }, { fid: familyId, member: m });
              console.log("  ✅ 家庭成员:", m.name);
            } catch (e) {
              console.log("  ⚠️ 成员导入失败:", e.message.slice(0, 50));
            }
          }
        }

        results.push({ name, status: "imported", familyId });
        imported++;
      } else {
        console.log("  ❌ 创建失败:", JSON.stringify(familyResult.data).slice(0, 100));
        results.push({ name, status: "failed", error: familyResult.data });
        errors++;
      }
    } catch (e) {
      console.log("  ❌ 异常:", e.message.slice(0, 100));
      results.push({ name, status: "error", error: e.message });
      errors++;
    }
  }

  // ====== SUMMARY ======
  console.log("\n\n══════════════════════════════");
  console.log("  导入完成");
  console.log("══════════════════════════════");
  console.log(`  ✅ 导入: ${imported}  ❌ 失败: ${errors}  ⏭️ 跳过: ${skipped}`);
  console.log("══════════════════════════════");

  fs.writeFileSync(
    path.join(REPORT_DIR, "import-results.json"),
    JSON.stringify({ summary: { imported, errors, skipped }, results }, null, 2)
  );

  await browser.close();
}

function getText(field) {
  if (!field?.value) return null;
  if (Array.isArray(field.value)) return field.value[0]?.text || null;
  if (typeof field.value === "string") return field.value;
  return String(field.value);
}

function parseFamilyMembers(text) {
  if (!text) return [];
  const members = [];
  const lines = text.split(/[\n-]/).filter((l) => l.trim());
  for (const line of lines) {
    const cleaned = line.replace(/^[-\s•]+/, "").trim();
    if (!cleaned || cleaned.length < 3) continue;
    // Pattern: "女儿：姚志鑫" or "儿子：赵航"
    const match = cleaned.match(/^(\S+)：(\S+)/);
    if (match) {
      members.push({
        name: match[2].trim(),
        relationship: match[1].replace(/[：:]/g, "").trim(),
        phone: "",
        idCard: "",
      });
    } else {
      members.push({ name: cleaned, relationship: "家庭成员", phone: "", idCard: "" });
    }
  }
  return members;
}

main();
