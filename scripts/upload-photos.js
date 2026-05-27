// Upload photos via SCP + update DB via JSON API
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const records = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "test-reports", "feishu", "all_records.json"), "utf-8")).recordMap || {};
function getText(f) { if (!f?.value) return null; if (Array.isArray(f.value)) return f.value[0]?.text || null; return String(f.value); }

(async () => {
  const b = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
  const ctx = await b.newContext({ ignoreHTTPSErrors: true });
  const p = await ctx.newPage();

  await p.goto("https://ksc.lizhonghua.vip:8002/login", { waitUntil: "networkidle", timeout: 20000 });
  await p.fill('input[type="text"]', "18504519501");
  await p.fill('input[type="password"]', "Szgjj12329!@#");
  await p.click('button[type="submit"]');
  await p.waitForTimeout(6000);
  await p.waitForLoadState("networkidle").catch(() => {});

  // Find family IDs
  const nameToId = {};
  for (const [rid, rec] of Object.entries(records)) {
    const name = getText(rec.fldDXR83JX);
    if (!name) continue;
    const fid = await p.evaluate(async (n) => {
      const r = await fetch("/api/village/families?search=" + encodeURIComponent(n) + "&limit=5");
      const d = await r.json();
      return (d.families || []).find(f => f.headName === n)?.id || null;
    }, name);
    if (fid) nameToId[name] = fid;
  }
  console.log("找到 " + Object.keys(nameToId).length + " 户");

  // SCP photos to NAS
  const zipPhotosDir = "C:/Users/27139/Desktop/监测户脱贫户名单（2025年） 副本_附件/数据表/照片";
  const NAS_UPLOADS = "/tmp/zfsv3/sata11/18504519501/data/Docker/village-system/data/uploads/";
  let scpCount = 0;
  const updateOps = [];

  if (fs.existsSync(zipPhotosDir)) {
    const files = fs.readdirSync(zipPhotosDir).filter(f => f.endsWith(".jpg"));
    console.log("桌面照片: " + files.length + " 张");

    for (const file of files) {
      const nameFromFile = file.replace(/\(1\)|\.jpg/gi, "").trim();
      const fid = nameToId[nameFromFile];
      if (!fid) { console.log("  ⚠️ 未匹配: " + nameFromFile); continue; }

      try {
        const localPath = path.join(zipPhotosDir, file);
        const safeName = "feishu_" + scpCount + "_" + Date.now() + ".jpg";
        const remotePath = NAS_UPLOADS + safeName;

        execSync(`scp -P 10010 "${localPath}" root@222.171.139.234:"${remotePath}"`, { stdio: "pipe", timeout: 30000 });
        updateOps.push({ fid, url: "/uploads/" + safeName });
        scpCount++;
        if (scpCount % 5 === 0) console.log("  SCP " + scpCount + "/" + files.length);
      } catch(e) {
        console.log("  ❌ SCP " + nameFromFile + ": " + e.message.slice(0, 60));
      }
    }
  }
  console.log("SCP: " + scpCount + " 张");

  // Update DB
  const familyPhotos = {};
  updateOps.forEach(op => {
    if (!familyPhotos[op.fid]) familyPhotos[op.fid] = [];
    familyPhotos[op.fid].push(op.url);
  });

  const cookies = await ctx.cookies();
  const cookieStr = cookies.map(c => c.name + "=" + c.value).join("; ");

  let updated = 0;
  for (const [fid, urls] of Object.entries(familyPhotos)) {
    try {
      const resp = await ctx.request.put("https://ksc.lizhonghua.vip:8002/api/village/families/" + fid, {
        headers: { "Content-Type": "application/json", cookie: cookieStr },
        data: { existingPhotos: JSON.stringify(urls) },
      });
      if (resp.ok()) updated++;
      else console.log("  ⚠️ DB " + fid.slice(0, 12) + ": " + (await resp.text()).slice(0, 60));
    } catch(e) {
      console.log("  ❌ DB " + fid.slice(0, 12) + ": " + e.message.slice(0, 50));
    }
  }
  console.log("DB更新: " + updated + " 户, 照片: " + scpCount + " 张");
  await b.close();
})();
