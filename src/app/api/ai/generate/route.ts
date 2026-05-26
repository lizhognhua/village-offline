import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProvider, buildChatRequest } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  

  try {
    const { taskType, dataSources, prompt: userPrompt } = await req.json();

    if (!taskType || !Array.isArray(dataSources)) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 读取这个队的 AI 配置
    const [providerCfg, apiKeyCfg, modelCfg] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: `ai_provider` } }),
      prisma.systemConfig.findUnique({ where: { key: `ai_api_key` } }),
      prisma.systemConfig.findUnique({ where: { key: `ai_model` } }),
    ]);

    const providerId = providerCfg?.value || "";
    const apiKey = apiKeyCfg?.value || "";
    const model = modelCfg?.value || getProvider(providerId)?.defaultModel || "";

    if (!providerId || !apiKey) {
      return NextResponse.json(
        { error: "请先在系统设置中配置 AI 模型和 API Key" },
        { status: 400 }
      );
    }

    // 根据用户选择的数据源，查询数据库（全部限定 teamId）
    const dbContext: string[] = [];

    if (dataSources.includes("village")) {
      const vp = await prisma.villageProfile.findFirst({ where: {} });
      if (vp) {
        dbContext.push(
          `【村情概况】` +
          `行政面积: ${vp.administrativeArea || "—"} 亩, ` +
          `耕地: ${vp.cultivatedLand || "—"} 亩, ` +
          `户籍户数: ${vp.registeredHouseholds || 0} 户, ` +
          `户籍人口: ${vp.registeredPopulation || 0} 人, ` +
          `常住人口: ${vp.residentPopulation || 0} 人, ` +
          `党员: ${vp.partyMembers || 0} 人, ` +
          `劳动力: ${vp.laborForce || 0} 人, ` +
          `脱贫户: ${vp.poorHouseholds || 0} 户, ` +
          `监测户: ${vp.monitoredHouseholds || 0} 户, ` +
          `低保户: ${vp.dibaoHouseholds || 0} 户, ` +
          `五保户: ${vp.wubaoHouseholds || 0} 户, ` +
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
      const allFamilies = await prisma.family.findMany({
        where: {},
        select: { population: true },
      });
      const totalPop = allFamilies.reduce((s, f) => s + (f.population || 0), 0);
      dbContext.push(
        `【村民户情】总户数: ${total} 户, 总人口: ${totalPop} 人, ` +
        `脱贫户: ${poorCount} 户, 监测户: ${monitorCount} 户, ` +
        `低保户: ${dibaoCount} 户, 五保户: ${wubaoCount} 户`
      );
    }

    if (dataSources.includes("members")) {
      const memberCount = await prisma.familyMember.count({
        where: { family: {} },
      });
      const genderGroups = await prisma.familyMember.groupBy({
        by: ["gender"],
        where: { family: {} },
        _count: true,
      });
      const healthGroups = await prisma.familyMember.groupBy({
        by: ["healthStatus"],
        where: { family: {} },
        _count: true,
      });
      const parts: string[] = [`家庭成员总数: ${memberCount} 人`];
      for (const g of genderGroups) {
        if (g.gender) parts.push(`${g.gender}: ${g._count} 人`);
      }
      for (const h of healthGroups) {
        if (h.healthStatus) parts.push(`${h.healthStatus}: ${h._count} 人`);
      }
      dbContext.push(`【家庭成员】${parts.join(", ")}`);
    }

    if (dataSources.includes("team")) {
      const members = await prisma.teamMember.findMany({
        where: { isActive: true },
        select: { name: true, title: true, intro: true },
        orderBy: { sortOrder: "asc" },
      });
      if (members.length > 0) {
        const lines = members.map((m) => `${m.name}（${m.title || "成员"}）${m.intro ? `— ${m.intro}` : ""}`);
        dbContext.push(`【村委/工作队】共 ${members.length} 人:\n${lines.join("\n")}`);
      } else {
        dbContext.push("【村委/工作队】暂无数据");
      }
    }

    if (dataSources.includes("projects")) {
      const [projTotal, projActive, projDone] = await Promise.all([
        prisma.project.count({ where: {} }),
        prisma.project.count({ where: { status: "active" } }),
        prisma.project.count({ where: { status: "completed" } }),
      ]);
      const projects = await prisma.project.findMany({
        where: {},
        select: { title: true, status: true, progress: true, budget: true, category: true },
        take: 20,
        orderBy: { updatedAt: "desc" },
      });
      const lines = projects.map(
        (p) => `${p.title}（类型: ${p.category}, 状态: ${p.status}, 进度: ${p.progress}%, 预算: ${p.budget != null ? p.budget + "万元" : "—"}）`
      );
      dbContext.push(
        `【项目看板】共 ${projTotal} 个项目（进行中: ${projActive}, 已完成: ${projDone}）:\n${lines.join("\n")}`
      );
    }

    if (dataSources.includes("condolences")) {
      const [condTotal, condThisMonth] = await Promise.all([
        prisma.condolence.count({ where: {} }),
        prisma.condolence.count({
          where: { condolenceDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        }),
      ]);
      dbContext.push(`【慰问记录】累计慰问 ${condTotal} 次, 本月慰问 ${condThisMonth} 次`);
    }

    if (dataSources.includes("diaries")) {
      const [diaryTotal, diaryThisYear] = await Promise.all([
        prisma.workDiary.count({ where: {} }),
        prisma.workDiary.count({
          where: { date: { gte: new Date(new Date().getFullYear(), 0, 1) } },
        }),
      ]);
      dbContext.push(`【工作日记】共 ${diaryTotal} 篇, 本年新增 ${diaryThisYear} 篇`);
    }

    if (dataSources.includes("training")) {
      const trainCount = await prisma.trainingRecord.count({ where: {} });
      const trainings = await prisma.trainingRecord.findMany({
        where: {},
        select: { title: true, time: true, location: true },
        take: 10,
        orderBy: { time: "desc" },
      });
      const lines = trainings.map((t) => `${t.title || "培训"}（时间: ${t.time?.toISOString().slice(0, 10)}, 地点: ${t.location}）`);
      dbContext.push(`【培训记录】共 ${trainCount} 次:\n${lines.join("\n")}`);
    }

    if (dataSources.includes("accountability")) {
      const accCount = await prisma.accountabilityRecord.count({ where: {} });
      const taskGroups = await prisma.accountabilityRecord.groupBy({
        by: ["taskType"],
        where: {},
        _count: true,
      });
      const taskLabels: Record<number, string> = { 1: "建强组织", 2: "强村富民", 3: "加强治理", 4: "为民服务" };
      const parts = taskGroups.map((g) => `${taskLabels[g.taskType] || "其他"}: ${g._count} 条`);
      dbContext.push(`【履职全景】共 ${accCount} 条履职记录（${parts.join(", ")}）`);
    }

    if (dataSources.includes("mapmarkers")) {
      const markerTotal = await prisma.mapMarker.count({ where: {} });
      const categoryGroups = await prisma.mapMarker.groupBy({
        by: ["category"],
        where: {},
        _count: true,
      });
      const catLabels: Record<string, string> = {
        general: "通用标记", farmer: "农户", infrastructure: "基础设施",
        industry: "产业", public: "公共场所", party: "党建", other: "其他",
      };
      const parts = categoryGroups.map(
        (g) => `${catLabels[g.category] || g.category}: ${g._count} 个`
      );
      dbContext.push(
        `【卫星地图标记】共标记 ${markerTotal} 个点位（${parts.join(", ")}）`
      );
    }

    if (dataSources.includes("announcements")) {
      const [annTotal, annActive, annPinned] = await Promise.all([
        prisma.announcement.count({ where: {} }),
        prisma.announcement.count({ where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] } }),
        prisma.announcement.count({ where: { pinned: true } }),
      ]);
      dbContext.push(
        `【公告信息】共 ${annTotal} 条公告（活跃: ${annActive}, 置顶: ${annPinned}）`
      );
    }

    if (dataSources.includes("paperless")) {
      try {
        const paperlessUrl = process.env.PAPERLESS_URL || "http://paperless-web:8000";
        const paperlessToken = process.env.PAPERLESS_TOKEN || "";
        const ph = { Authorization: `Token ${paperlessToken}` };

        const [docRes, typeRes] = await Promise.all([
          fetch(`${paperlessUrl}/api/documents/?page_size=1`, { headers: ph, signal: AbortSignal.timeout(8000) }),
          fetch(`${paperlessUrl}/api/document_types/?page_size=50`, { headers: ph, signal: AbortSignal.timeout(8000) }),
        ]);

        if (docRes.ok) {
          const docData = await docRes.json();
          const totalDocs = docData.count || 0;
          const parts: string[] = [`文档总数: ${totalDocs} 份`];

          if (typeRes.ok) {
            const typeData = await typeRes.json();
            const types = typeData.results || [];
            if (types.length > 0) {
              for (const t of types) {
                if (t.document_count > 0) parts.push(`${t.name}: ${t.document_count} 份`);
              }
            }
          }
          dbContext.push(`【电子档案】${parts.join(", ")}`);
        }
      } catch {
        // Paperless 不可用时静默跳过
      }
    }

    if (dataSources.includes("industries")) {
      const industries = await prisma.industry.findMany({
        where: {},
        select: { name: true, status: true, scale: true, benefit: true },
      });
      if (industries.length > 0) {
        const lines = industries.map(
          (ind) => `${ind.name}（状态: ${ind.status}, 规模: ${ind.scale || "—"}, 效益: ${ind.benefit || "—"}）`
        );
        dbContext.push(`【产业项目】共 ${industries.length} 个:\n${lines.join("\n")}`);
      } else {
        dbContext.push("【产业项目】暂无数据");
      }
    }

    if (dataSources.includes("visits")) {
      const [visitCount, thisMonthCount] = await Promise.all([
        prisma.visit.count({ where: {} }),
        prisma.visit.count({
          where: {
            
            visitDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
      ]);
      dbContext.push(
        `【走访记录】累计走访 ${visitCount} 次, 本月走访 ${thisMonthCount} 次`
      );
    }

    if (dataSources.includes("alerts")) {
      const alertCount = await prisma.alertRecord.count({ where: {} });
      const pendingCount = await prisma.alertRecord.count({
        where: { status: "待处理" },
      });
      dbContext.push(
        `【预警信息】共 ${alertCount} 条预警, 待处理 ${pendingCount} 条`
      );
    }

    if (dataSources.includes("party")) {
      const [partyMemberCount, activityCount] = await Promise.all([
        prisma.partyMember.count({ where: { isActive: true } }),
        prisma.partyActivity.count({ where: {} }),
      ]);
      dbContext.push(
        `【党建数据】党员 ${partyMemberCount} 人, 党建活动 ${activityCount} 次`
      );
    }

    // 拼装系统提示词
    const taskTypeLabels: Record<string, string> = {
      summary: "撰写一份驻村帮扶工作总结或汇报材料",
      report: "生成一份防返贫监测分析报告",
      table: "以表格形式整理数据，输出为可粘贴到 Excel 的格式",
      speech: "起草一份会议发言或宣讲稿件",
      village_brief: "生成一份村情简报，涵盖全村基本情况和近期工作动态",
      custom: "根据用户问题和系统数据，进行自由问答",
    };
    const taskLabel = taskTypeLabels[taskType] || taskType;

    const systemPrompt = `你是一名经验丰富的驻村第一书记，正在使用"驻村帮扶管理系统"。
请根据以下系统数据库中提取的真实数据，${taskLabel}。

写作要求：
1. 语言严谨、数据准确、逻辑清晰
2. 使用规范的公文用语
3. 数据必须引用上面提供的真实数字，不得编造
4. 结构合理，层次分明
5. 如数据不足请如实说明，不得胡编乱造`;

    const contextBlock = dbContext.length > 0
      ? `\n\n【系统数据库数据】\n${dbContext.join("\n\n")}`
      : "\n\n【系统数据库数据】暂无相关数据，请根据用户描述撰写。";

    const userMessage = `${contextBlock}\n\n【用户具体要求】\n${userPrompt || "请根据数据撰写材料"}`;

    // 调用大模型
    const request = buildChatRequest(providerId, model, systemPrompt, userMessage);
    request.headers.Authorization = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let llmResponse: Response;
    try {
      llmResponse = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        return NextResponse.json({ error: "大模型响应超时，请重试" }, { status: 504 });
      }
      return NextResponse.json(
        { error: `调用大模型失败: ${(e as Error).message}` },
        { status: 502 }
      );
    }
    clearTimeout(timeout);

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => "");
      let errMsg = `大模型返回错误 (${llmResponse.status})`;
      if (llmResponse.status === 401) errMsg = "API Key 无效，请在设置中检查";
      else if (llmResponse.status === 429) errMsg = "调用频率超限，请稍后重试";
      else if (errText) {
        try {
          const ej = JSON.parse(errText);
          errMsg = ej.error?.message || errMsg;
        } catch { /* ignore */ }
      }
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const result = await llmResponse.json();
    const content =
      result?.choices?.[0]?.message?.content ||
      result?.output?.text ||
      "";

    return NextResponse.json({
      content,
      wordCount: content.length,
    });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
