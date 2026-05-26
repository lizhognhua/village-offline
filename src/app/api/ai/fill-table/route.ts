import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProvider, buildChatRequest } from "@/lib/ai-models";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const dataSourcesStr = formData.get("dataSources") as string | null;
    const userPrompt = (formData.get("prompt") as string) || "";

    if (!file) return NextResponse.json({ error: "请上传模板文件" }, { status: 400 });

    const dataSources: string[] = dataSourcesStr ? JSON.parse(dataSourcesStr) : [];
    if (dataSources.length === 0) {
      return NextResponse.json({ error: "请至少选择一个数据来源" }, { status: 400 });
    }

    // 读 AI 配置
    const [providerCfg, apiKeyCfg, modelCfg] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: `ai_provider` } }),
      prisma.systemConfig.findUnique({ where: { key: `ai_api_key` } }),
      prisma.systemConfig.findUnique({ where: { key: `ai_model` } }),
    ]);
    const providerId = providerCfg?.value || "";
    const apiKey = apiKeyCfg?.value || "";
    const model = modelCfg?.value || getProvider(providerId)?.defaultModel || "";

    if (!providerId || !apiKey) {
      return NextResponse.json({ error: "请先在系统设置中配置 AI API Key" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    // 查询数据库数据
    const dbContext: string[] = [];
    await gatherData(dataSources, dbContext);

    if (isExcel) {
      return handleExcel(buffer, file.name, dbContext, providerId, apiKey, model, userPrompt);
    } else {
      return handleDocx(buffer, file.name, dbContext, providerId, apiKey, model, userPrompt);
    }
  } catch (e) {
    return NextResponse.json({ error: `填表失败: ${(e as Error).message}` }, { status: 500 });
  }
}

// ====== Excel 填表 ======

async function handleExcel(
  buffer: Buffer,
  fileName: string,
  dbContext: string[],
  providerId: string,
  apiKey: string,
  model: string,
  userPrompt: string
) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetDescriptions: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const rows = raw.slice(0, Math.min(raw.length, 100));
    const lines: string[] = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row.some((c: any) => String(c).trim() !== "")) continue;
      const cells: string[] = [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim();
        if (val) cells.push(`${XLSX.utils.encode_cell({ r, c })}(${val})`);
      }
      if (cells.length > 0) lines.push(cells.join(", "));
    }
    sheetDescriptions.push(`【Sheet: ${sheetName}】\n${lines.join("\n")}`);
  }

  const systemPrompt = `你是一个精通 Excel 填表的助手。根据系统数据库的真实数据，填写政府工作表格模板。
表格模板内容格式为"单元格地址(当前文本)"，例如 A1(村名) B1((空)) 表示 A1 写着"村名"，B1 是空的需填入村名。
请返回 JSON 对象，键是单元格地址（如 "B1"），值是要填入的内容。只填有数据可填的，不编造。只返回 JSON。`;

  const userMessage = `${sheetDescriptions.join("\n\n")}\n\n【系统数据】\n${dbContext.join("\n\n")}\n\n【要求】\n${userPrompt || "根据模板标签含义，用系统数据填写所有空单元格。"}`;

  const fillMap = await callLLM(providerId, apiKey, model, systemPrompt, userMessage);
  if (!fillMap) return NextResponse.json({ error: "AI 解析失败" }, { status: 502 });

  // 填入 Excel
  for (const [addr, value] of Object.entries(fillMap)) {
    try {
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet[addr]) {
        sheet[addr] = { t: typeof value === "number" ? "n" : "s", v: value };
      } else {
        sheet[addr].v = value;
        if (typeof value === "number") sheet[addr].t = "n";
      }
    } catch { /* skip invalid addresses */ }
  }

  const outBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(outBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName.replace(/\.(xlsx|xls)$/, "_已填写.xlsx"))}"`,
    },
  });
}

// ====== Docx 填模板 ======

async function handleDocx(
  buffer: Buffer,
  fileName: string,
  dbContext: string[],
  providerId: string,
  apiKey: string,
  model: string,
  userPrompt: string
) {
  // 提取 .docx 中的文本内容
  let templateText = "";
  try {
    const zip = new AdmZip(buffer);
    const docXml = zip.readAsText("word/document.xml");
    // 提取 <w:t> 标签中的文本
    const matches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (matches) {
      templateText = matches
        .map((m) => m.replace(/<w:t[^>]*>/, "").replace(/<\/w:t>/, ""))
        .join("");
    }
  } catch {
    templateText = "(无法解析模板文本，请根据文件名推断格式)";
  }

  const systemPrompt = `你是一名驻村第一书记。你要根据系统数据库的真实数据，按照用户提供的文档模板格式，生成一份完整的报告或材料。
模板文本包含标题、段落标题和需要填充的内容区域。请参照模板结构，用系统真实数据填充所有需要填写的内容，保持模板的章节结构不变。
返回完整的文档内容，用 Markdown 格式，保留模板中的章节标题和结构。`;

  const userMessage = `【文档模板内容】\n${templateText.substring(0, 3000)}\n\n【系统数据】\n${dbContext.join("\n\n")}\n\n【要求】\n${userPrompt || "参照模板格式，用系统数据填充所有内容区域。保持原模板的章节结构。"}`;

  const request = buildChatRequest(providerId, model, systemPrompt, userMessage);
  request.headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  let llmResponse: Response;
  try {
    llmResponse = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ error: "大模型调用超时" }, { status: 504 });
  }
  clearTimeout(timeout);

  if (!llmResponse.ok) {
    return NextResponse.json({ error: `大模型返回错误 (${llmResponse.status})` }, { status: 502 });
  }

  const result = await llmResponse.json();
  const content = result?.choices?.[0]?.message?.content || "";

  // 生成 .docx（HTML → Word）
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:SimSun,serif;line-height:1.8;padding:40px 60px;font-size:15px;color:#000;}
    h1{text-align:center;font-size:22px;font-weight:bold;margin-bottom:24px;}
    h2{font-size:16px;font-weight:bold;margin:20px 0 10px;}
    h3{font-size:15px;font-weight:bold;margin:16px 0 8px;}
    p{text-indent:2em;margin:8px 0;}
    table{width:100%;border-collapse:collapse;margin:12px 0;}
    td,th{border:1px solid #000;padding:6px 12px;text-align:center;}
    th{background:#f0f0f0;font-weight:bold;}
  </style></head><body>${content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>").replace(/^# (.*$)/gm, "<h1>$1</h1>").replace(/^## (.*$)/gm, "<h2>$1</h2>").replace(/^### (.*$)/gm, "<h3>$1</h3>").replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/\|.*\|/g, (match) => {
    const cells = match.split("|").filter(c => c.trim());
    return "<tr>" + cells.map(c => `<td>${c.trim()}</td>`).join("") + "</tr>";
  })}</body></html>`;

  const outBuffer = Buffer.from(html, "utf-8");
  return new NextResponse(outBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName.replace(/\.(docx|doc)$/, "_已填写.doc"))}"`,
    },
  });
}

// ====== 大模型调用 ======

async function callLLM(
  providerId: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<Record<string, any> | null> {
  const request = buildChatRequest(providerId, model, systemPrompt, userMessage);
  request.headers.Authorization = `Bearer ${apiKey}`;
  request.body.response_format = { type: "json_object" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  let llmResponse: Response;
  try {
    llmResponse = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return null;
  }
  clearTimeout(timeout);

  if (!llmResponse.ok) return null;

  const result = await llmResponse.json();
  const raw = result?.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
  } catch {
    return null;
  }
}

// ====== 数据采集 ======

async function gatherData(dataSources: string[], dbContext: string[]) {
  if (dataSources.includes("village")) {
    const vp = await prisma.villageProfile.findFirst({ where: {} });
    if (vp) {
      dbContext.push(
        `【村情概况】行政面积: ${vp.administrativeArea || "—"} 亩, 耕地: ${vp.cultivatedLand || "—"} 亩, ` +
        `户籍: ${vp.registeredHouseholds || 0} 户 ${vp.registeredPopulation || 0} 人, ` +
        `常住: ${vp.residentPopulation || 0} 人, 党员: ${vp.partyMembers || 0}, 劳动力: ${vp.laborForce || 0}, ` +
        `脱贫户: ${vp.poorHouseholds || 0}, 监测户: ${vp.monitoredHouseholds || 0}, ` +
        `低保户: ${vp.dibaoHouseholds || 0}, 五保户: ${vp.wubaoHouseholds || 0}, ` +
        `村集体收入: ${vp.villageIncome != null ? vp.villageIncome + " 万元" : "—"}`
      );
    }
  }
  if (dataSources.includes("families")) {
    const [total, poorCount, monitorCount, dibaoCount, wubaoCount] = await Promise.all([
      prisma.family.count({ where: {} }),
      prisma.family.count({ where: { familyAttr: { contains: "脱贫户" } } }),
      prisma.family.count({ where: { familyAttr: { contains: "监测户" } } }),
      prisma.family.count({ where: { familyAttr: { contains: "低保户" } } }),
      prisma.family.count({ where: { familyAttr: { contains: "五保户" } } }),
    ]);
    const allFams = await prisma.family.findMany({ where: {}, select: { population: true } });
    const totalPop = allFams.reduce((s, f) => s + (f.population || 0), 0);
    dbContext.push(`【村民户情】总户数: ${total}, 总人口: ${totalPop}, 脱贫户: ${poorCount}, 监测户: ${monitorCount}, 低保户: ${dibaoCount}, 五保户: ${wubaoCount}`);
  }
  if (dataSources.includes("industries")) {
    const inds = await prisma.industry.findMany({ where: {}, select: { name: true, status: true, scale: true, benefit: true } });
    if (inds.length > 0) dbContext.push(`【产业项目】${inds.map(i => `${i.name}(${i.status}, 规模:${i.scale || "—"}, 效益:${i.benefit || "—"})`).join("; ")}`);
  }
  if (dataSources.includes("visits")) {
    const [vc, vcm] = await Promise.all([
      prisma.visit.count({ where: {} }),
      prisma.visit.count({ where: { visitDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    ]);
    dbContext.push(`【走访记录】累计 ${vc} 次, 本月 ${vcm} 次`);
  }
  if (dataSources.includes("alerts")) {
    const [ac, ap] = await Promise.all([
      prisma.alertRecord.count({ where: {} }),
      prisma.alertRecord.count({ where: { status: "待处理" } }),
    ]);
    dbContext.push(`【预警信息】共 ${ac} 条, 待处理 ${ap} 条`);
  }
  if (dataSources.includes("party")) {
    const [pm, pa] = await Promise.all([
      prisma.partyMember.count({ where: { isActive: true } }),
      prisma.partyActivity.count({ where: {} }),
    ]);
    dbContext.push(`【党建数据】党员 ${pm} 人, 活动 ${pa} 次`);
  }
  if (dataSources.includes("projects")) {
    const [pt, pa, pd] = await Promise.all([
      prisma.project.count({ where: {} }),
      prisma.project.count({ where: { status: "active" } }),
      prisma.project.count({ where: { status: "completed" } }),
    ]);
    dbContext.push(`【项目看板】共 ${pt} 个(进行中:${pa}, 已完成:${pd})`);
  }
  if (dataSources.includes("condolences")) {
    const [ct, cm] = await Promise.all([
      prisma.condolence.count({ where: {} }),
      prisma.condolence.count({ where: { condolenceDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    ]);
    dbContext.push(`【慰问记录】累计 ${ct} 次, 本月 ${cm} 次`);
  }
  if (dataSources.includes("diaries")) {
    const [dt, dy] = await Promise.all([
      prisma.workDiary.count({ where: {} }),
      prisma.workDiary.count({ where: { date: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
    ]);
    dbContext.push(`【工作日记】共 ${dt} 篇, 本年 ${dy} 篇`);
  }
  if (dataSources.includes("team")) {
    const mbrs = await prisma.teamMember.findMany({ where: { isActive: true }, select: { name: true, title: true } });
    if (mbrs.length > 0) dbContext.push(`【村委/工作队】${mbrs.map(m => `${m.name}(${m.title || "成员"})`).join(", ")}`);
  }
  if (dataSources.includes("training")) {
    const tc = await prisma.trainingRecord.count({ where: {} });
    dbContext.push(`【培训记录】共 ${tc} 次`);
  }
  if (dataSources.includes("accountability")) {
    const ac = await prisma.accountabilityRecord.count({ where: {} });
    dbContext.push(`【履职全景】共 ${ac} 条记录`);
  }
  if (dataSources.includes("mapmarkers")) {
    const mc = await prisma.mapMarker.count({ where: {} });
    const groups = await prisma.mapMarker.groupBy({ by: ["category"], where: {}, _count: true });
    dbContext.push(`【卫星地图标记】共 ${mc} 个(${groups.map(g => `${g.category}:${g._count}`).join(", ")})`);
  }
  if (dataSources.includes("announcements")) {
    dbContext.push(`【公告】共 ${await prisma.announcement.count({ where: {} })} 条`);
  }
  if (dataSources.includes("members")) {
    dbContext.push(`【家庭成员】共 ${await prisma.familyMember.count({ where: { family: {} } })} 人`);
  }
  if (dataSources.includes("paperless")) {
    try {
      const pu = process.env.PAPERLESS_URL || "http://paperless-web:8000";
      const tk = process.env.PAPERLESS_TOKEN || "";
      const r = await fetch(`${pu}/api/documents/?page_size=1`, { headers: { Authorization: `Token ${tk}` }, signal: AbortSignal.timeout(5000) });
      if (r.ok) dbContext.push(`【电子档案】共 ${(await r.json()).count || 0} 份`);
    } catch { /* skip */ }
  }
}
