import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sanitizeObject } from "@/lib/sanitize";

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || "";
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || "";

async function getFeishuToken(): Promise<string> {
  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });
  const data = await res.json();
  return data.tenant_access_token;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const token = await getFeishuToken();
    const { app_token, table_id } = await req.json();

    if (!app_token || !table_id) {
      return NextResponse.json({ error: "请提供 app_token 和 table_id" }, { status: 400 });
    }

    // 从飞书多维表格读取数据
    const listRes = await fetch(
      "https://open.feishu.cn/open-apis/bitable/v1/apps/" + app_token + "/tables/" + table_id + "/records?page_size=500",
      { headers: { "Authorization": "Bearer " + token } }
    );
    const listData = await listRes.json();

    if (!listData.data?.items) {
      return NextResponse.json({ error: "飞书返回数据为空" }, { status: 400 });
    }

    const records = listData.data.items;
    let updated = 0;
    let created = 0;

    for (const item of records) {
      const fields = item.fields;

      const data: any = {};
      if (fields.行政面积) data.administrativeArea = parseFloat(fields.行政面积) || null;
      if (fields.耕地面积) data.cultivatedLand = parseFloat(fields.耕地面积) || null;
      if (fields.户籍户数) data.registeredHouseholds = parseInt(fields.户籍户数) || null;
      if (fields.户籍人口) data.registeredPopulation = parseInt(fields.户籍人口) || null;
      if (fields.常住户数) data.residentHouseholds = parseInt(fields.常住户数) || null;
      if (fields.常住人口) data.residentPopulation = parseInt(fields.常住人口) || null;
      if (fields.党员人数) data.partyMembers = parseInt(fields.党员人数) || null;
      if (fields.劳动力) data.laborForce = parseInt(fields.劳动力) || null;
      if (fields.村集体收入) data.villageIncome = parseFloat(fields.村集体收入) || null;
      if (fields.经营性收入) data.operatingIncome = parseFloat(fields.经营性收入) || null;
      if (fields.五保户) data.wubaoHouseholds = parseInt(fields.五保户) || null;
      if (fields.重病人数) data.severeIllness = parseInt(fields.重病人数) || null;
      if (fields.高龄老人) data.elderlyCount = parseInt(fields.高龄老人) || null;
      if (fields.脱贫户数) data.poorHouseholds = parseInt(fields.脱贫户数) || null;
      if (fields.监测户数) data.monitoredHouseholds = parseInt(fields.监测户数) || null;
      if (fields.低保户数) data.dibaoHouseholds = parseInt(fields.低保户数) || null;
      if (fields.村书记) data.villageSecretary = String(fields.村书记 || "");
      if (fields.村书记电话) data.secretaryPhone = String(fields.村书记电话 || "");
      if (fields.填报人) data.fillPerson = String(fields.填报人 || "肖慧军");
      if (fields.填报人电话) data.fillPersonPhone = String(fields.填报人电话 || "");

      const existing = await prisma.villageProfile.findFirst({ where: {}, orderBy: { updatedAt: "desc" } });

      if (existing) {
        await prisma.villageProfile.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.villageProfile.create({ data });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "同步完成",
      stats: { total: records.length, created, updated },
    });
  } catch (error) {
    console.error("飞书同步失败:", error);
    return NextResponse.json({ error: "飞书同步失败" }, { status: 500 });
  }
}
