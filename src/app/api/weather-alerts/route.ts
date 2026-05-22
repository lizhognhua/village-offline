import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const where: any = {};
    const alerts = await prisma.weatherAlert.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { effectiveAt: "desc" }],
    });
    return NextResponse.json({ alerts });
  } catch (error) {
    return NextResponse.json({ error: "获取预警失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    let body = await req.json()
    body = sanitizeObject(body);
    const alert = await prisma.weatherAlert.create({
      data: {
        title: body.title,
        level: body.level || "黄色",
        content: body.content || "",
        source: body.source || "系统发布",
        effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : new Date(),
        expireAt: body.expireAt ? new Date(body.expireAt) : null,
      },
    });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建预警失败" }, { status: 500 });
  }
}
