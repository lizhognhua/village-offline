import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { rules, clean } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const profile = await prisma.villageProfile.findFirst({
      where: {},
      orderBy: { updatedAt: "desc" },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "村情数据尚未录入" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: "获取村情数据失败" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    let body = await req.json()
    body = sanitizeObject(body);

    // 条件校验
    const vErr = rules.villageProfile(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    // 清理
    if (body.secretaryPhone) body.secretaryPhone = clean.phone(body.secretaryPhone);
    if (body.fillPersonPhone) body.fillPersonPhone = clean.phone(body.fillPersonPhone);
    if (body.villageSecretary) body.villageSecretary = clean.name(body.villageSecretary);
    if (body.fillPerson) body.fillPerson = clean.name(body.fillPerson);
    
    const existing = await prisma.villageProfile.findFirst({
      where: {},
      orderBy: { updatedAt: "desc" },
    });

    const profile = existing
      ? await prisma.villageProfile.update({
          where: { id: existing.id },
          data: body,
        })
      : await prisma.villageProfile.create({ data: body });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("更新村情数据失败:", error);
    return NextResponse.json(
      { error: "更新村情数据失败" },
      { status: 500 }
    );
  }
}
